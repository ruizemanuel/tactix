import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n/I18nProvider.js";
import { ReinforceStepper } from "./ReinforceStepper.js";

function setup(max = 5, onPlace = vi.fn()) {
  render(
    <I18nProvider initialLocale="en">
      <ReinforceStepper territoryName="Brazil" max={max} onPlace={onPlace} />
    </I18nProvider>,
  );
  return onPlace;
}

describe("ReinforceStepper", () => {
  it("starts at 1; decrement disabled at 1", () => {
    setup();
    expect(screen.getByTestId("reinforce-amount").textContent).toBe("1");
    expect(screen.getByTestId("reinforce-dec")).toBeDisabled();
  });

  it("increments up to max then disables +", () => {
    setup(3);
    fireEvent.click(screen.getByTestId("reinforce-inc"));
    fireEvent.click(screen.getByTestId("reinforce-inc"));
    expect(screen.getByTestId("reinforce-amount").textContent).toBe("3");
    expect(screen.getByTestId("reinforce-inc")).toBeDisabled();
  });

  it("'All' sets the amount to max", () => {
    setup(7);
    fireEvent.click(screen.getByTestId("reinforce-all"));
    expect(screen.getByTestId("reinforce-amount").textContent).toBe("7");
  });

  it("'Place' calls onPlace with the current amount", () => {
    const onPlace = setup(5);
    fireEvent.click(screen.getByTestId("reinforce-inc")); // 2
    fireEvent.click(screen.getByTestId("reinforce-place"));
    expect(onPlace).toHaveBeenCalledWith(2);
  });
});
