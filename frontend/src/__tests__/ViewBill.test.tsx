import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ViewBill from "../pages/ViewBill";
import { api } from "../api";

const fakeBill = {
  id: "uuid-1",
  short_code: "abc123",
  amount: 100,
  currency: "USD",
  num_people: 2,
  lightning_address: "test@ln.com",
  description: null,
  created_at: "2026-01-01T00:00:00Z",
  participants: [],
};

function renderWithRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/bill/:shortCode" element={<ViewBill />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ViewBill donation banner", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.spyOn(api, "getBill").mockResolvedValue(fakeBill);
  });

  it("shows donation banner when ?donated=1 is present", async () => {
    renderWithRoute("/bill/abc123?donated=1");

    expect(await screen.findByText("Thanks for the donation!")).toBeInTheDocument();
  });

  it("does not show donation banner without query param", async () => {
    renderWithRoute("/bill/abc123");

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(screen.queryByText("Thanks for the donation!")).not.toBeInTheDocument();
  });

  it("dismisses donation banner when close button is clicked", async () => {
    renderWithRoute("/bill/abc123?donated=1");

    const banner = await screen.findByText("Thanks for the donation!");
    expect(banner).toBeInTheDocument();

    fireEvent.click(screen.getByText("×"));
    expect(screen.queryByText("Thanks for the donation!")).not.toBeInTheDocument();
  });
});
