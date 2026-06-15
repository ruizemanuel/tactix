import { describe, expect, test } from "vitest";
import { borderTerritories, bestReinforceTarget, findTradeableSet, bestAttack, bestFortify } from "./analysis.js";
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
    conquestsThisTurn: 0,
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

describe("bestAttack", () => {
  test("returns null when no attack is favorable", () => {
    // A owns only n3 (2 armies); every neighbor is an enemy with 3 armies.
    const s = makeState({
      n3: { owner: "A", armies: 2 },
      n1: { owner: "B", armies: 3 },
      n2: { owner: "B", armies: 3 },
      s1: { owner: "B", armies: 3 },
    });
    expect(bestAttack(s, "A")).toBeNull();
  });

  test("prefers the attack that completes a continent over a larger raw margin", () => {
    // A owns n1,n2 (north needs n3) and a huge stack on s1.
    // s1→n3 wins north (margin 8 + continent 10 = 18) and beats s1→s2 (margin 8).
    const s = makeState({
      n1: { owner: "A", armies: 2 },
      n2: { owner: "A", armies: 2 },
      s1: { owner: "A", armies: 9 },
    });
    expect(bestAttack(s, "A")).toEqual({ from: "s1", to: "n3" });
  });

  test("biases toward the player's secret objective continent", () => {
    // A owns n3 (5). Equal margins to n1/n2 (north) and s1 (south).
    // Objective targets 'south' → s1 gets the objective bonus and wins.
    const objectives: Objective[] = [
      { id: "oa", kind: "conquer-continents", description: "south", continentIds: ["south"], extraTerritories: 0 },
      { id: "ob", kind: "conquer-count", description: "", targetCount: 99 },
    ];
    const s = makeState({ n3: { owner: "A", armies: 5 } }, { objectives, objByPlayer: { A: "oa", B: "ob" } });
    expect(bestAttack(s, "A")).toEqual({ from: "n3", to: "s1" });
  });
});

describe("bestFortify", () => {
  test("moves armies from a safe interior territory to an adjacent frontier", () => {
    // n1 (4, interior — neighbors n2,n3 both A) is adjacent to n3 (frontier — touches enemy s1).
    const s = makeState({
      n1: { owner: "A", armies: 4 },
      n2: { owner: "A", armies: 1 },
      n3: { owner: "A", armies: 2 },
    });
    expect(bestFortify(s, "A")).toEqual({ from: "n1", to: "n3", armies: 3 });
  });

  test("returns null when the player has no safe interior to drain", () => {
    // A owns only n3, which is itself a frontier.
    const s = makeState({ n3: { owner: "A", armies: 5 } });
    expect(bestFortify(s, "A")).toBeNull();
  });

  test("returns null when a safe interior is not adjacent to any frontier", () => {
    // A owns islands i1,i2,i3. Only i1 touches an enemy (s3) → i1 is the lone
    // frontier. The interior stack is i3 (5 armies), whose only neighbor i2 is
    // also interior — so there is no interior→frontier move.
    const s = makeState({
      i1: { owner: "A", armies: 1 },
      i2: { owner: "A", armies: 1 },
      i3: { owner: "A", armies: 5 },
    });
    expect(bestFortify(s, "A")).toBeNull();
  });
});
