import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n/I18nProvider.js";
import type { CombatResult as Combat } from "@teg/engine";
import { CombatResult } from "./CombatResult.js";

const combat: Combat = {
  from: "N3", to: "S1", attackerDice: [6, 4], defenderDice: [3, 5],
  attackerLosses: 1, defenderLosses: 1, conquered: false,
};

function renderCR(c: Combat | null, youAreAttacker = true) {
  return render(
    <I18nProvider initialLocale="en">
      <CombatResult combat={c} youAreAttacker={youAreAttacker} />
    </I18nProvider>,
  );
}

describe("CombatResult", () => {
  it("renders nothing when there is no combat", () => {
    const { container } = renderCR(null);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the dice rows and the text outcome", () => {
    renderCR(combat);
    expect(screen.getByTestId("dice-row-attacker")).toBeInTheDocument();
    expect(screen.getByTestId("dice-row-defender")).toBeInTheDocument();
    expect(screen.getByText(/N3/)).toBeInTheDocument();
    expect(screen.getByText(/S1/)).toBeInTheDocument();
  });
});
