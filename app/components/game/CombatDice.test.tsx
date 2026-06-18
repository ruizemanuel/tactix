import { describe, it, expect } from "vitest";
import { render, within } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n/I18nProvider.js";
import type { CombatResult } from "@teg/engine";
import { CombatDice } from "./CombatDice.js";

function make(attackerDice: number[], defenderDice: number[]): CombatResult {
  return { from: "n1", to: "s1", attackerDice, defenderDice, attackerLosses: 0, defenderLosses: 0, conquered: false };
}

function renderDice(combat: CombatResult, youAreAttacker: boolean) {
  return render(
    <I18nProvider initialLocale="en">
      <CombatDice combat={combat} youAreAttacker={youAreAttacker} />
    </I18nProvider>,
  );
}

describe("CombatDice", () => {
  it("renders one die per rolled die in each row", () => {
    const { getByTestId } = renderDice(make([6, 4, 2], [3, 4]), true);
    expect(within(getByTestId("dice-row-attacker")).getAllByTestId("die")).toHaveLength(3);
    expect(within(getByTestId("dice-row-defender")).getAllByTestId("die")).toHaveLength(2);
  });

  it("marks the per-duel loser (ties favour the defender) and leaves extras neutral", () => {
    const { getByTestId } = renderDice(make([6, 4, 2], [3, 4]), true);
    const att = within(getByTestId("dice-row-attacker")).getAllByTestId("die");
    const def = within(getByTestId("dice-row-defender")).getAllByTestId("die");
    expect(att[0]).toHaveAttribute("data-outcome", "win"); // 6 > 3
    expect(def[0]).toHaveAttribute("data-outcome", "lose");
    expect(att[1]).toHaveAttribute("data-outcome", "lose"); // 4 == 4 → tie to defender
    expect(def[1]).toHaveAttribute("data-outcome", "win");
    expect(att[2]).toHaveAttribute("data-outcome", "neutral"); // unpaired extra
  });

  it("colors dice by player identity via youAreAttacker", () => {
    const { getByTestId, rerender } = renderDice(make([6], [4]), true);
    expect(within(getByTestId("dice-row-attacker")).getAllByTestId("die")[0]).toHaveAttribute("data-tone", "you");
    expect(within(getByTestId("dice-row-defender")).getAllByTestId("die")[0]).toHaveAttribute("data-tone", "ai");
    rerender(
      <I18nProvider initialLocale="en">
        <CombatDice combat={make([6], [4])} youAreAttacker={false} />
      </I18nProvider>,
    );
    expect(within(getByTestId("dice-row-attacker")).getAllByTestId("die")[0]).toHaveAttribute("data-tone", "ai");
    expect(within(getByTestId("dice-row-defender")).getAllByTestId("die")[0]).toHaveAttribute("data-tone", "you");
  });
});
