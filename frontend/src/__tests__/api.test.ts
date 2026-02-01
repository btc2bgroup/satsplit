import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "../api";

describe("api client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("createBill sends POST and returns bill", async () => {
    const bill = { id: "1", short_code: "abc" };
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(bill),
    } as Response);

    const result = await api.createBill({
      amount: 100,
      currency: "USD",
      num_people: 4,
      lightning_address: "test@ln.com",
    });

    expect(fetch).toHaveBeenCalledWith("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: 100,
        currency: "USD",
        num_people: 4,
        lightning_address: "test@ln.com",
      }),
    });
    expect(result).toEqual(bill);
  });

  it("getBill sends GET", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ short_code: "abc" }),
    } as Response);

    await api.getBill("abc");
    expect(fetch).toHaveBeenCalledWith("/api/bills/abc", {
      headers: { "Content-Type": "application/json" },
    });
  });

  it("throws detail from JSON error response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ detail: "Bill not found" }),
    } as Response);

    await expect(api.getBill("bad")).rejects.toThrow("Bill not found");
  });

  it("throws friendly message on non-JSON 502", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error("not json")),
    } as Response);

    await expect(api.getBill("bad")).rejects.toThrow("Server is temporarily unavailable");
  });

  it("updateParticipantStatus sends PATCH with status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "p1", status: "paid" }),
    } as Response);

    await api.updateParticipantStatus("abc", "p1", "paid");
    expect(fetch).toHaveBeenCalledWith("/api/bills/abc/participants/p1/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid" }),
    });
  });

  it("createDonation sends POST with bill_short_code and amount_sats", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ checkout_url: "https://btcpay.example/checkout/123" }),
    } as Response);

    const result = await api.createDonation("abc", 210);
    expect(fetch).toHaveBeenCalledWith("/api/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bill_short_code: "abc", amount_sats: 210 }),
    });
    expect(result).toEqual({ checkout_url: "https://btcpay.example/checkout/123" });
  });

  it("joinBill sends POST with name", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ bolt11_invoice: "lnbc..." }),
    } as Response);

    await api.joinBill("abc", "Alice");
    expect(fetch).toHaveBeenCalledWith("/api/bills/abc/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice" }),
    });
  });
});
