import { describe, expect, test } from "vitest";
import { fortify } from "./fortify.js";
import type { GameState } from "./types.js";
import { fixtureMap } from "./map/fixture.js";

function fortifyState(): GameState {
  const territories = Object.fromEntries(
    fixtureMap.territories.map((t) => [t.id, { ownerId: "A", armies: 1 }]),
  );
  territories.n1 = { ownerId: "A", armies: 5 };
  territories.s1 = { ownerId: "B", armies: 1 };
  return {
    map: fixtureMap,
    players: [
      { id: "A", alive: true, cards: [], objectiveId: "x", cardTradeIns: 0 },
      { id: "B", alive: true, cards: [], objectiveId: "y", cardTradeIns: 0 },
    ],
    territories,
    objectives: {},
    currentPlayerIndex: 0,
    phase: "fortify",
    turnNumber: 1,
    pendingReinforcements: 0,
    conquestsThisTurn: 0,
    deck: [],
    rngState: 1,
    lastCombat: null,
    pendingOccupation: null,
    winnerId: null,
  };
}

describe("fortify", () => {
  test("moves armies between owned adjacent territories", () => {
    const next = fortify(fortifyState(), "n1", "n2", 3);
    expect(next.territories.n1!.armies).toBe(2);
    expect(next.territories.n2!.armies).toBe(4);
  });

  test("throws if it would leave zero armies behind", () => {
    expect(() => fortify(fortifyState(), "n1", "n2", 5)).toThrow(/at least 1/);
  });

  test("throws if destination is not owned", () => {
    expect(() => fortify(fortifyState(), "n3", "s1", 0)).toThrow();
  });

  test("throws if territories are not adjacent", () => {
    expect(() => fortify(fortifyState(), "n1", "i3", 1)).toThrow(/adjacent/);
  });

  test("throws outside the fortify phase", () => {
    expect(() => fortify({ ...fortifyState(), phase: "attack" }, "n1", "n2", 1)).toThrow(/fortify/);
  });
});
