import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ActionPanel } from "./ActionPanel.js";
import { I18nProvider } from "@/lib/i18n/I18nProvider.js";
import { createGame, fixtureMap, type Objective } from "@teg/engine";

const objectives: Objective[] = [
  { id: "a", kind: "conquer-count", description: "", targetCount: 6 },
  { id: "b", kind: "conquer-count", description: "", targetCount: 6 },
];

function renderPanel(props: Parameters<typeof ActionPanel>[0]) {
  return render(
    <I18nProvider initialLocale="en">
      <ActionPanel {...props} />
    </I18nProvider>,
  );
}

test("reinforce phase shows the place prompt and an end-reinforce button when pending is 0", () => {
  const state = createGame(fixtureMap, ["you", "ai"], objectives, 7);
  const onEndReinforce = vi.fn();
  renderPanel({ state, onEndReinforce, onEndAttack: () => {}, onEndTurn: () => {}, onTradeCards: () => {}, onOccupy: () => {}, tradeSet: null });
  expect(screen.getByText(/Tap one of your territories/)).toBeInTheDocument();
  // With pending > 0 at game start, end-reinforce is disabled.
  expect(screen.getByRole("button", { name: /Start attacking/ })).toBeDisabled();
});

test("attack phase shows an enabled 'move to fortify' button", () => {
  const base = createGame(fixtureMap, ["you", "ai"], objectives, 7);
  const state = { ...base, phase: "attack" as const };
  const onEndAttack = vi.fn();
  renderPanel({ state, onEndReinforce: () => {}, onEndAttack, onEndTurn: () => {}, onTradeCards: () => {}, onOccupy: () => {}, tradeSet: null });
  fireEvent.click(screen.getByRole("button", { name: /Move to fortify/ }));
  expect(onEndAttack).toHaveBeenCalled();
});

test("offers a trade-cards button when a tradeable set is available in reinforce", () => {
  const state = createGame(fixtureMap, ["you", "ai"], objectives, 7);
  const onTradeCards = vi.fn();
  renderPanel({
    state,
    onEndReinforce: () => {},
    onEndAttack: () => {},
    onEndTurn: () => {},
    onTradeCards,
    onOccupy: () => {},
    tradeSet: ["c1", "c2", "c3"],
  });
  fireEvent.click(screen.getByRole("button", { name: /Trade cards/ }));
  expect(onTradeCards).toHaveBeenCalledWith(["c1", "c2", "c3"]);
});
