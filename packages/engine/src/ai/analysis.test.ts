import { describe, expect, test } from "vitest";
import { borderTerritories, bestReinforceTarget, findTradeableSet } from "./analysis.js";
import { fixtureMap } from "../map/fixture.js";
import type { Card, GameState, Objective, TurnPhase } from "../types.js";

/** Build a full-map state: every territory defaults to B/1, then apply overrides. */
function makeState(
  overrides: Record<string, { owner: string; armies: number }>,
  opts: { phase?: TurnPhase; objectives?: Objective[]; objByPlayer?: Record<string, string> } = {},
): GameState {
  const territories = Object.fromEntries(
    fixtureMap.territories.map((t) => [t.id, { ownerId: "B", armies: 1 }]),
  );
  for (const [id, v] of Object.entries(overrides)) {
    territories[id] = { ownerId: v.owner, armies: v.armies };
  }
  const objectives = opts.objectives ?? [];
  const objByPlayer = opts.objByPlayer ?? {};
  return {
    map: fixtureMap,
    players: [
      { id: "A", alive: true, cards: [], objectiveId: objByPlayer.A ?? "x", cardTradeIns: 0 },
      { id: "B", alive: true, cards: [], objectiveId: objByPlayer.B ?? "y", cardTradeIns: 0 },
    ],
    territories,
    objectives: Object.fromEntries(objectives.map((o) => [o.id, o])),
    currentPlayerIndex: 0,
    phase: opts.phase ?? "attack",
    turnNumber: 1,
    pendingReinforcements: 0,
    conqueredThisTurn: false,
    deck: [],
    rngState: 1,
    lastCombat: null,
    winnerId: null,
  };
}

describe("borderTerritories", () => {
  test("returns owned territories adjacent to an enemy", () => {
    const s = makeState({
      n1: { owner: "A", armies: 1 },
      n2: { owner: "A", armies: 1 },
      n3: { owner: "A", armies: 1 },
      s1: { owner: "A", armies: 1 },
    });
    expect(borderTerritories(s, "A")).toEqual(["s1"]);
  });
});

describe("bestReinforceTarget", () => {
  test("picks the border closest to a breakthrough (own armies − weakest adjacent enemy)", () => {
    const s = makeState({ n3: { owner: "A", armies: 5 }, s3: { owner: "A", armies: 2 } });
    expect(bestReinforceTarget(s, "A")).toBe("n3");
  });
});

describe("findTradeableSet", () => {
  const card = (id: string, symbol: Card["symbol"]): Card => ({ id, territoryId: id, symbol });

  test("finds three distinct symbols", () => {
    const hand = [card("a", "globo"), card("b", "canon"), card("c", "barco")];
    expect(findTradeableSet(hand)).toEqual(["a", "b", "c"]);
  });

  test("finds three of the same symbol among a larger hand", () => {
    const hand = [card("a", "globo"), card("b", "canon"), card("c", "globo"), card("d", "globo")];
    expect(findTradeableSet(hand)).toEqual(["a", "c", "d"]);
  });

  test("returns null when no valid set exists", () => {
    const hand = [card("a", "globo"), card("b", "globo"), card("c", "canon")];
    expect(findTradeableSet(hand)).toBeNull();
  });
});
