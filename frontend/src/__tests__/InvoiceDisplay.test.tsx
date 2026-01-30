import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InvoiceDisplay from "../components/InvoiceDisplay";

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

  it("displays the bolt11 string", () => {
    render(<InvoiceDisplay {...defaultProps} bolt11="lnbc_test_invoice" />);
    expect(screen.getByText("lnbc_test_invoice")).toBeInTheDocument();
  });

  it("displays fiat and sats amounts", () => {
    render(<InvoiceDisplay {...defaultProps} fiatAmount={12.5} currency="EUR" msats={75000000} />);
    expect(screen.getByText("12.50 EUR")).toBeInTheDocument();
    expect(screen.getByText("75,000 sats")).toBeInTheDocument();
  });
});
