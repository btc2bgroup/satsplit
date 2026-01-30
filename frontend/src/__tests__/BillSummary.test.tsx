import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BillSummary from "../components/BillSummary";
import type { BillOut } from "../api";

const bill: BillOut = {
  id: "1",
  short_code: "abc123",
  amount: 100,
  currency: "USD",
  num_people: 4,
  lightning_address: "test@ln.com",
  description: "Dinner",
  created_at: "2025-01-01T00:00:00Z",
  participants: [],
};

describe("BillSummary", () => {
  it("displays bill info and per-person amount", () => {
    render(<BillSummary bill={bill} />);
    expect(screen.getByText("Dinner")).toBeInTheDocument();
    expect(screen.getByText("100 USD")).toBeInTheDocument();
    expect(screen.getByText("4 people")).toBeInTheDocument();
    expect(screen.getByText("25.00 USD")).toBeInTheDocument();
  });

  it("shows 'Bill' when no description", () => {
    render(<BillSummary bill={{ ...bill, description: null }} />);
    expect(screen.getByText("Bill")).toBeInTheDocument();
  });
});
