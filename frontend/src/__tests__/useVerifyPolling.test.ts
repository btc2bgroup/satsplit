import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useVerifyPolling } from "../hooks/useVerifyPolling";
import { ApiError, api, type ParticipantOut } from "../api";

const base: ParticipantOut = {
  id: "p1",
  name: "Alice",
  share_amount_msats: 50000,
  share_amount_fiat: 50,
  status: "invoice_created",
  bolt11_invoice: null,
  payment_hash: null,
  verifiable: true,
  verified: false,
  preimage: null,
  created_at: "2025-01-01T00:00:00Z",
};

describe("useVerifyPolling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function flush() {
    // Let the awaited API promise inside the tick settle.
    await vi.advanceTimersByTimeAsync(0);
  }

  it("polls immediately and on each interval", async () => {
    const spy = vi.spyOn(api, "verifyParticipant").mockResolvedValue(base);

    renderHook(() => useVerifyPolling("abc", ["p1"], () => {}, { intervalMs: 1000 }));
    await flush();
    expect(spy).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(spy).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1000);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("stops polling and reports once the payment settles", async () => {
    const spy = vi
      .spyOn(api, "verifyParticipant")
      .mockResolvedValue({ ...base, status: "paid", verified: true });
    const onVerified = vi.fn();

    renderHook(() => useVerifyPolling("abc", ["p1"], onVerified, { intervalMs: 1000 }));
    await flush();

    expect(onVerified).toHaveBeenCalledWith(expect.objectContaining({ status: "paid" }));

    await vi.advanceTimersByTimeAsync(5000);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("stops polling a participant the backend cannot verify (409)", async () => {
    const spy = vi
      .spyOn(api, "verifyParticipant")
      .mockRejectedValue(new ApiError("unsupported", 409));

    renderHook(() => useVerifyPolling("abc", ["p1"], () => {}, { intervalMs: 1000 }));
    await flush();

    await vi.advanceTimersByTimeAsync(5000);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("keeps polling through transient errors", async () => {
    const spy = vi
      .spyOn(api, "verifyParticipant")
      .mockRejectedValue(new ApiError("boom", 500));

    renderHook(() => useVerifyPolling("abc", ["p1"], () => {}, { intervalMs: 1000 }));
    await flush();

    await vi.advanceTimersByTimeAsync(2000);
    expect(spy.mock.calls.length).toBeGreaterThan(1);
  });

  it("polls every listed participant", async () => {
    const spy = vi.spyOn(api, "verifyParticipant").mockResolvedValue(base);

    renderHook(() => useVerifyPolling("abc", ["p1", "p2"], () => {}, { intervalMs: 1000 }));
    await flush();

    expect(spy).toHaveBeenCalledWith("abc", "p1");
    expect(spy).toHaveBeenCalledWith("abc", "p2");
  });

  it("does nothing without a short code or participants", async () => {
    const spy = vi.spyOn(api, "verifyParticipant").mockResolvedValue(base);

    renderHook(() => useVerifyPolling(undefined, ["p1"], () => {}, { intervalMs: 1000 }));
    renderHook(() => useVerifyPolling("abc", [], () => {}, { intervalMs: 1000 }));
    await vi.advanceTimersByTimeAsync(3000);

    expect(spy).not.toHaveBeenCalled();
  });

  it("stops polling on unmount", async () => {
    const spy = vi.spyOn(api, "verifyParticipant").mockResolvedValue(base);

    const { unmount } = renderHook(() =>
      useVerifyPolling("abc", ["p1"], () => {}, { intervalMs: 1000 }),
    );
    await flush();
    unmount();

    await vi.advanceTimersByTimeAsync(5000);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("gives up after the maximum duration", async () => {
    const spy = vi.spyOn(api, "verifyParticipant").mockResolvedValue(base);

    renderHook(() =>
      useVerifyPolling("abc", ["p1"], () => {}, { intervalMs: 1000, maxDurationMs: 2500 }),
    );
    await flush();

    await vi.advanceTimersByTimeAsync(10000);
    // Ticks at 0s, 1s, 2s; the 3s tick exceeds the ceiling and stops the loop.
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("pauses while the tab is hidden", async () => {
    const spy = vi.spyOn(api, "verifyParticipant").mockResolvedValue(base);
    const visibility = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("hidden");

    renderHook(() => useVerifyPolling("abc", ["p1"], () => {}, { intervalMs: 1000 }));
    await vi.advanceTimersByTimeAsync(3000);
    expect(spy).not.toHaveBeenCalled();

    visibility.mockReturnValue("visible");
    await vi.advanceTimersByTimeAsync(1000);
    expect(spy).toHaveBeenCalled();
  });
});
