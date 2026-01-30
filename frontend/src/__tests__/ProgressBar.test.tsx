import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgressBar from "../components/ProgressBar";

describe("ProgressBar", () => {
  it("shows joined and paid counts", () => {
    render(
      <ProgressBar status={{ short_code: "abc", num_people: 4, joined: 2, paid: 1 }} />,
    );
    expect(screen.getByText("2/4")).toBeInTheDocument();
    expect(screen.getByText("1/4")).toBeInTheDocument();
  });
});
