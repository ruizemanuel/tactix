import { describe, it, expect } from "vitest";
import { assignObjectives, createGame, redactState, ownedTerritoryIds, worldMap } from "@teg/engine";
import { rehydrateView } from "./rehydrate.js";

function red(seed = 77) {
  const objectives = assignObjectives(["you", "ai"], seed);
  const full = createGame(worldMap, ["you", "ai"], objectives, seed);
  return { full, view: redactState(full, "you") };
}

describe("rehydrateView", () => {
  it("produces a GameState that renders identically for public fields", () => {
    const { full, view } = red();
    const g = rehydrateView(view);
    expect(g.territories).toEqual(full.territories);
    expect(g.phase).toBe(full.phase);
    expect(g.turnNumber).toBe(full.turnNumber);
    expect(g.currentPlayerIndex).toBe(full.currentPlayerIndex);
    expect(g.pendingReinforcements).toBe(full.pendingReinforcements);
    expect(ownedTerritoryIds(g, "you")).toEqual(ownedTerritoryIds(full, "you"));
  });

  it("keeps the viewer's objective + cards, blanks the opponent's", () => {
    const { full, view } = red();
    const g = rehydrateView(view);
    const you = g.players.find((p) => p.id === "you")!;
    const ai = g.players.find((p) => p.id === "ai")!;
    const youFull = full.players.find((p) => p.id === "you")!;
    expect(you.objectiveId).toBe(youFull.objectiveId);
    expect(g.objectives[you.objectiveId]).toBeDefined();
    expect(ai.cards.length).toBe(full.players.find((p) => p.id === "ai")!.cards.length);
  });

  it("blanks the secrets it never received", () => {
    const { view } = red();
    const g = rehydrateView(view);
    expect(g.rngState).toBe(0);
    expect(g.deck.length).toBe(view.deckCount);
  });
});
