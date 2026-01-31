import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BillForm from "../components/BillForm";

describe("BillForm", () => {
  it("renders all form fields", () => {
    render(<BillForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.getByLabelText("Number of people")).toBeInTheDocument();
    expect(screen.getByLabelText("Your Lightning Address")).toBeInTheDocument();
    expect(screen.getByLabelText("Description (optional)")).toBeInTheDocument();
    expect(screen.getByText("Split the Bill")).toBeInTheDocument();
  });

  it("calls onSubmit with form data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<BillForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Amount"), "50");
    await user.type(screen.getByLabelText("Number of people"), "3");
    await user.type(screen.getByLabelText("Your Lightning Address"), "test@ln.com");
    await user.type(screen.getByLabelText("Description (optional)"), "Lunch");
    await user.click(screen.getByText("Split the Bill"));

    expect(onSubmit).toHaveBeenCalledWith(
      {
        amount: 50,
        currency: "USD",
        num_people: 3,
        lightning_address: "test@ln.com",
        description: "Lunch",
      },
      null,
    );
  });

  it("shows error on submit failure", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error("Server error"));
    render(<BillForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Amount"), "50");
    await user.type(screen.getByLabelText("Number of people"), "2");
    await user.type(screen.getByLabelText("Your Lightning Address"), "a@b.com");
    await user.click(screen.getByText("Split the Bill"));

    expect(await screen.findByText("Server error")).toBeInTheDocument();
  });

  it("passes null donation when toggle is off", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<BillForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Amount"), "10");
    await user.type(screen.getByLabelText("Number of people"), "2");
    await user.type(screen.getByLabelText("Your Lightning Address"), "a@b.com");
    await user.click(screen.getByText("Split the Bill"));

    expect(onSubmit).toHaveBeenCalledWith(expect.any(Object), null);
  });

  it("passes selected donation sats when toggle is on", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<BillForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Amount"), "10");
    await user.type(screen.getByLabelText("Number of people"), "2");
    await user.type(screen.getByLabelText("Your Lightning Address"), "a@b.com");

    // Enable donation toggle
    await user.click(screen.getByLabelText("I want to support this project"));

    // Default should be 210
    await user.click(screen.getByText("Split the Bill"));
    expect(onSubmit).toHaveBeenCalledWith(expect.any(Object), 210);
  });

  it("allows selecting a different donation amount", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<BillForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Amount"), "10");
    await user.type(screen.getByLabelText("Number of people"), "2");
    await user.type(screen.getByLabelText("Your Lightning Address"), "a@b.com");

    await user.click(screen.getByLabelText("I want to support this project"));
    await user.click(screen.getByLabelText("2100 sats"));
    await user.click(screen.getByText("Split the Bill"));

    expect(onSubmit).toHaveBeenCalledWith(expect.any(Object), 2100);
  });

  it("hides donation options when toggle is off", () => {
    render(<BillForm onSubmit={vi.fn()} />);
    expect(screen.queryByLabelText("210 sats")).not.toBeInTheDocument();
    expect(screen.getByLabelText("I want to support this project")).not.toBeChecked();
  });

  it("disables button while submitting", async () => {
    const user = userEvent.setup();
    let resolve: () => void;
    const onSubmit = vi.fn().mockReturnValue(new Promise<void>((r) => (resolve = r)));
    render(<BillForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Amount"), "50");
    await user.type(screen.getByLabelText("Number of people"), "2");
    await user.type(screen.getByLabelText("Your Lightning Address"), "a@b.com");
    await user.click(screen.getByText("Split the Bill"));

    expect(screen.getByText("Creating...")).toBeDisabled();
    resolve!();
  });
});
