import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ActionPanel } from "./ActionPanel.js";
import { I18nProvider } from "@/lib/i18n/I18nProvider.js";
import { createGame, fixtureMap, ownedTerritoryIds, type Objective } from "@teg/engine";

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

test("occupy prompt shows 'Move N' buttons and dispatches the chosen count", () => {
  const base = createGame(fixtureMap, ["you", "ai"], objectives, 7);
  const state = { ...base, phase: "attack" as const, pendingOccupation: { from: "x", to: "y", max: 3 } };
  const onOccupy = vi.fn();
  renderPanel({ state, onEndReinforce: () => {}, onEndAttack: () => {}, onEndTurn: () => {}, onTradeCards: () => {}, onOccupy, tradeSet: null });
  fireEvent.click(screen.getByRole("button", { name: /Move 2/ }));
  expect(onOccupy).toHaveBeenCalledWith(2);
});

test("the disabled prop disables the action buttons", () => {
  const base = createGame(fixtureMap, ["you", "ai"], objectives, 7);
  const state = { ...base, phase: "attack" as const };
  renderPanel({ state, disabled: true, onEndReinforce: () => {}, onEndAttack: () => {}, onEndTurn: () => {}, onTradeCards: () => {}, onOccupy: () => {}, tradeSet: null });
  expect(screen.getByRole("button", { name: /Move to fortify/ })).toBeDisabled();
});

test("reinforce with a selected territory shows the stepper and places the chosen amount", () => {
  const state = createGame(fixtureMap, ["you", "ai"], objectives, 7);
  const owned = ownedTerritoryIds(state, "you")[0]!;
  const onPlace = vi.fn();
  renderPanel({
    state,
    selected: owned,
    onPlace,
    onEndReinforce: () => {},
    onEndAttack: () => {},
    onEndTurn: () => {},
    onTradeCards: () => {},
    onOccupy: () => {},
    tradeSet: null,
  });
  expect(screen.getByTestId("reinforce-stepper")).toBeInTheDocument();
  fireEvent.click(screen.getByTestId("reinforce-place"));
  expect(onPlace).toHaveBeenCalledWith(1);
});
