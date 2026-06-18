import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Die } from "./Die.js";

describe("Die", () => {
  it("renders the correct number of pips for each value 1..6", () => {
    for (let v = 1; v <= 6; v++) {
      const { container, unmount } = render(<Die value={v} tone="you" />);
      expect(container.querySelectorAll("circle")).toHaveLength(v);
      unmount();
    }
  });

  it("marks a losing die with an ✕ and data-outcome=lose", () => {
    const { getByTestId } = render(<Die value={3} tone="ai" outcome="lose" />);
    const die = getByTestId("die");
    expect(die).toHaveAttribute("data-outcome", "lose");
    expect(die.textContent).toContain("✕");
  });

  it("defaults data-outcome to neutral and exposes value/tone", () => {
    const { getByTestId } = render(<Die value={2} tone="you" />);
    const die = getByTestId("die");
    expect(die).toHaveAttribute("data-outcome", "neutral");
    expect(die).toHaveAttribute("data-value", "2");
    expect(die).toHaveAttribute("data-tone", "you");
    expect(die.textContent).not.toContain("✕");
  });

  it("sets data-outcome=win without the ✕", () => {
    const { getByTestId } = render(<Die value={6} tone="you" outcome="win" />);
    const die = getByTestId("die");
    expect(die).toHaveAttribute("data-outcome", "win");
    expect(die.textContent).not.toContain("✕");
  });
});
