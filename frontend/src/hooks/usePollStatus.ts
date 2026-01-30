import { useEffect, useState } from "react";
import { api, type BillStatus } from "../api";

export function usePollStatus(shortCode: string | undefined, intervalMs = 3000) {
  const [status, setStatus] = useState<BillStatus | null>(null);

  useEffect(() => {
    if (!shortCode) return;

    let active = true;

    async function poll() {
      try {
        const s = await api.getStatus(shortCode!);
        if (active) setStatus(s);
      } catch {
        // ignore polling errors
      }
    }

    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [shortCode, intervalMs]);

  return status;
}
