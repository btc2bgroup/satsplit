import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ShareLink from "../components/ShareLink";

describe("ShareLink", () => {
  it("copies URL to clipboard on click", () => {
    const spy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<ShareLink shortCode="xyz789" />);
    fireEvent.click(screen.getByText("Copy Link"));

    expect(spy).toHaveBeenCalledWith(expect.stringContaining("/bill/xyz789"));
    spy.mockRestore();
  });

  it("QR code is hidden by default and shown after clicking Show QR", () => {
    const { container } = render(<ShareLink shortCode="qr1" />);
    expect(container.querySelector("svg")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Show QR"));
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
