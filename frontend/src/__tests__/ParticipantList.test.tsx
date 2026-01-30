import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ParticipantList from "../components/ParticipantList";
import { api, type ParticipantOut } from "../api";

const participants: ParticipantOut[] = [
  {
    id: "p1",
    name: "Alice",
    share_amount_msats: 50000,
    share_amount_fiat: 50,
    status: "invoice_created",
    bolt11_invoice: null,
    payment_hash: null,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "p2",
    name: "Bob",
    share_amount_msats: 50000,
    share_amount_fiat: 50,
    status: "paid",
    bolt11_invoice: null,
    payment_hash: null,
    created_at: "2025-01-01T00:00:00Z",
  },
];

describe("ParticipantList", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders participant names and statuses", () => {
    render(
      <ParticipantList shortCode="abc" participants={participants} onStatusChanged={() => {}} />
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Unpaid")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("shows correct button text based on status", () => {
    render(
      <ParticipantList shortCode="abc" participants={participants} onStatusChanged={() => {}} />
    );
    expect(screen.getByText("Mark Paid")).toBeInTheDocument();
    expect(screen.getByText("Mark Unpaid")).toBeInTheDocument();
  });

  it("calls API on toggle click", async () => {
    const onStatusChanged = vi.fn();
    vi.spyOn(api, "updateParticipantStatus").mockResolvedValue(participants[0]);

    render(
      <ParticipantList shortCode="abc" participants={participants} onStatusChanged={onStatusChanged} />
    );

    fireEvent.click(screen.getByText("Mark Paid"));

    await waitFor(() => {
      expect(api.updateParticipantStatus).toHaveBeenCalledWith("abc", "p1", "paid");
      expect(onStatusChanged).toHaveBeenCalled();
    });
  });
});
