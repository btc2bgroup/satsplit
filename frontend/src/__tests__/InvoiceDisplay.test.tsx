import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InvoiceDisplay from "../components/InvoiceDisplay";
import { api } from "../api";

const defaultProps = {
  bolt11: "lnbc1234",
  fiatAmount: 25,
  currency: "USD",
  msats: 50000000,
};

describe("InvoiceDisplay", () => {
  it("shows copy button and open wallet link", () => {
    render(<InvoiceDisplay {...defaultProps} />);
    expect(screen.getByText("Copy Invoice")).toBeInTheDocument();
    expect(screen.getByText("Open Wallet")).toHaveAttribute("href", "lightning:lnbc1234");
  });

  it("copies invoice to clipboard", async () => {
    const spy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<InvoiceDisplay {...defaultProps} bolt11="lnbc5678" />);
    fireEvent.click(screen.getByText("Copy Invoice"));

    expect(spy).toHaveBeenCalledWith("lnbc5678");
    spy.mockRestore();
  });

  it("displays fiat and sats amounts", () => {
    render(<InvoiceDisplay {...defaultProps} fiatAmount={12.5} currency="EUR" msats={75000000} />);
    expect(screen.getByText("12.50 EUR")).toBeInTheDocument();
    expect(screen.getByText("75,000 sats")).toBeInTheDocument();
  });
});

describe("InvoiceDisplay LUD-21 auto-confirm", () => {
  const paid = {
    id: "p1",
    name: "Alice",
    share_amount_msats: 50000000,
    share_amount_fiat: 25,
    status: "paid",
    bolt11_invoice: null,
    payment_hash: null,
    verifiable: true,
    verified: true,
    preimage: "ab",
    created_at: "2025-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not poll when verification is unsupported", async () => {
    const spy = vi.spyOn(api, "verifyParticipant").mockResolvedValue(paid);
    render(<InvoiceDisplay {...defaultProps} shortCode="abc" participantId="p1" />);

    await new Promise((r) => setTimeout(r, 10));
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByText("Copy Invoice")).toBeInTheDocument();
  });

  it("shows a waiting hint while verification is possible", () => {
    vi.spyOn(api, "verifyParticipant").mockResolvedValue({ ...paid, status: "invoice_created" });
    render(<InvoiceDisplay {...defaultProps} shortCode="abc" participantId="p1" verifiable />);

    expect(screen.getByText("Waiting for payment — this updates automatically.")).toBeInTheDocument();
  });

  it("switches to a confirmation once the payment settles", async () => {
    vi.spyOn(api, "verifyParticipant").mockResolvedValue(paid);
    render(<InvoiceDisplay {...defaultProps} shortCode="abc" participantId="p1" verifiable />);

    expect(await screen.findByText("Payment received")).toBeInTheDocument();
    expect(screen.getByText("25.00 USD")).toBeInTheDocument();
    expect(screen.queryByText("Copy Invoice")).not.toBeInTheDocument();
  });
});
