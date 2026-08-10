import { useEffect, useRef } from "react";
import { ApiError, api, type ParticipantOut } from "../api";

const DEFAULT_INTERVAL_MS = 5000;
/** Stop polling eventually so an abandoned tab does not keep hitting the LN service. */
const DEFAULT_MAX_DURATION_MS = 10 * 60 * 1000;

interface Options {
  intervalMs?: number;
  maxDurationMs?: number;
}

/**
 * Poll LUD-21 verification for the given participants until each one settles.
 *
 * Participants drop out of the rotation once they settle or once the backend reports
 * that their invoice cannot be verified (409). Polling pauses while the tab is hidden
 * and stops entirely after `maxDurationMs`.
 */
export function useVerifyPolling(
  shortCode: string | undefined,
  participantIds: string[],
  onVerified: (participant: ParticipantOut) => void,
  options: Options = {},
) {
  const { intervalMs = DEFAULT_INTERVAL_MS, maxDurationMs = DEFAULT_MAX_DURATION_MS } = options;

  // Depend on a stable string so a fresh array each render does not restart the loop.
  const key = participantIds.join(",");

  // Keep the callback out of the effect deps — callers pass inline closures.
  const onVerifiedRef = useRef(onVerified);
  useEffect(() => {
    onVerifiedRef.current = onVerified;
  });

  useEffect(() => {
    if (!shortCode || !key) return;

    const pending = new Set(key.split(","));
    const startedAt = Date.now();
    let active = true;

    function stop() {
      active = false;
      clearInterval(timer);
    }

    async function tick() {
      if (!active) return;
      if (Date.now() - startedAt > maxDurationMs) {
        stop();
        return;
      }
      // Pause rather than stop: polling resumes on the next tick once visible again.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

      for (const id of Array.from(pending)) {
        if (!active) return;
        try {
          const participant = await api.verifyParticipant(shortCode!, id);
          if (!active) return;
          if (participant.status === "paid") {
            pending.delete(id);
            onVerifiedRef.current(participant);
          }
        } catch (err) {
          // 409 means this invoice has no verify URL — never worth retrying.
          if (err instanceof ApiError && err.status === 409) {
            pending.delete(id);
          }
          // Anything else is transient; keep polling.
        }
      }

      if (pending.size === 0) stop();
    }

    const timer = setInterval(tick, intervalMs);
    void tick();

    return stop;
  }, [shortCode, key, intervalMs, maxDurationMs]);
}
