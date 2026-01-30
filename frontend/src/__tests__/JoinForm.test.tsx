import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JoinForm from "../components/JoinForm";

describe("JoinForm", () => {
  it("calls onJoin with trimmed name", async () => {
    const user = userEvent.setup();
    const onJoin = vi.fn().mockResolvedValue(undefined);
    render(<JoinForm onJoin={onJoin} />);

    await user.type(screen.getByLabelText("Your name"), "  Alice  ");
    await user.click(screen.getByText("Join & Get Invoice"));

    expect(onJoin).toHaveBeenCalledWith("Alice");
  });

  it("shows error on failure", async () => {
    const user = userEvent.setup();
    const onJoin = vi.fn().mockRejectedValue(new Error("Already joined"));
    render(<JoinForm onJoin={onJoin} />);

    await user.type(screen.getByLabelText("Your name"), "Bob");
    await user.click(screen.getByText("Join & Get Invoice"));

    expect(await screen.findByText("Already joined")).toBeInTheDocument();
  });
});
