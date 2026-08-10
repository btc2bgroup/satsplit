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
    verifiable: false,
    verified: false,
    preimage: null,
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
    verifiable: false,
    verified: false,
    preimage: null,
    created_at: "2025-01-01T00:00:00Z",
  },
];

function participant(overrides: Partial<ParticipantOut> = {}): ParticipantOut {
  return { ...participants[0], ...overrides };
}

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

describe("ParticipantList LUD-21 verification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "verifyParticipant").mockResolvedValue(participant());
  });

  it("shows a Check payment button for unpaid verifiable participants", () => {
    render(
      <ParticipantList
        shortCode="abc"
        participants={[participant({ verifiable: true })]}
        onStatusChanged={() => {}}
      />,
    );
    expect(screen.getByText("Check payment")).toBeInTheDocument();
    expect(screen.queryByText("Mark Paid")).not.toBeInTheDocument();
  });

  it("falls back to the manual toggle when verification is unsupported", () => {
    render(
      <ParticipantList
        shortCode="abc"
        participants={[participant({ verifiable: false })]}
        onStatusChanged={() => {}}
      />,
    );
    expect(screen.getByText("Mark Paid")).toBeInTheDocument();
    expect(
      screen.getByText("This wallet doesn't support automatic payment verification."),
    ).toBeInTheDocument();
  });

  it("marks the participant paid when verification confirms settlement", async () => {
    const onStatusChanged = vi.fn();
    vi.spyOn(api, "verifyParticipant").mockResolvedValue(
      participant({ status: "paid", verified: true, verifiable: true }),
    );

    render(
      <ParticipantList
        shortCode="abc"
        participants={[participant({ verifiable: true })]}
        onStatusChanged={onStatusChanged}
      />,
    );

    fireEvent.click(screen.getByText("Check payment"));

    await waitFor(() => {
      expect(api.verifyParticipant).toHaveBeenCalledWith("abc", "p1");
      expect(onStatusChanged).toHaveBeenCalled();
    });
  });

  it("reports when no payment has arrived yet", async () => {
    render(
      <ParticipantList
        shortCode="abc"
        participants={[participant({ verifiable: true })]}
        onStatusChanged={() => {}}
      />,
    );

    fireEvent.click(screen.getByText("Check payment"));

    expect(await screen.findByText("No payment received yet.")).toBeInTheDocument();
  });

  it("surfaces verification errors inline", async () => {
    vi.spyOn(api, "verifyParticipant").mockRejectedValue(new Error("Not found"));

    render(
      <ParticipantList
        shortCode="abc"
        participants={[participant({ verifiable: true })]}
        onStatusChanged={() => {}}
      />,
    );

    fireEvent.click(screen.getByText("Check payment"));

    expect(await screen.findByText("Not found")).toBeInTheDocument();
  });

  it("shows a verified badge and no un-mark toggle for verified payments", () => {
    render(
      <ParticipantList
        shortCode="abc"
        participants={[participant({ status: "paid", verified: true, verifiable: true })]}
        onStatusChanged={() => {}}
      />,
    );
    expect(screen.getByText("Paid ✓ verified")).toBeInTheDocument();
    expect(screen.queryByText("Mark Unpaid")).not.toBeInTheDocument();
  });

  it("distinguishes a manually marked payment from a verified one", () => {
    render(
      <ParticipantList
        shortCode="abc"
        participants={[participant({ status: "paid", verified: false })]}
        onStatusChanged={() => {}}
      />,
    );
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.getByText("Mark Unpaid")).toBeInTheDocument();
  });
});
