import { describe, expect, it, test } from "vitest";
import { continentsControlledBy, placeReinforcement, reinforcementsFor } from "./reinforce.js";
import type { GameState } from "./types.js";
import { fixtureMap } from "./map/fixture.js";

function baseState(owner: Record<string, string>): GameState {
  const territories = Object.fromEntries(
    Object.entries(owner).map(([id, ownerId]) => [id, { ownerId, armies: 1 }]),
  );
  return {
    map: fixtureMap,
    players: [
      { id: "A", alive: true, cards: [], objectiveId: "x", cardTradeIns: 0 },
      { id: "B", alive: true, cards: [], objectiveId: "y", cardTradeIns: 0 },
    ],
    territories,
    objectives: {},
    currentPlayerIndex: 0,
    phase: "reinforce",
    turnNumber: 1,
    pendingReinforcements: 0,
    conquestsThisTurn: 0,
    deck: [],
    rngState: 1,
    lastCombat: null,
    winnerId: null,
  };
}

const allToA = Object.fromEntries(fixtureMap.territories.map((t) => [t.id, "A"]));

describe("reinforcementsFor", () => {
  test("minimum is 3", () => {
    const s = baseState({ n1: "A", n2: "B", n3: "B", s1: "B", s2: "B", s3: "B", i1: "B", i2: "B", i3: "B" });
    expect(reinforcementsFor(s, "A")).toBe(3);
  });

  test("adds continent bonus when fully owned", () => {
    const s = baseState({ ...allToA, s1: "B", s2: "B", s3: "B", i1: "B", i2: "B", i3: "B" });
    expect(reinforcementsFor(s, "A")).toBe(5);
  });

  test("owning everything: floor(9/2)=4 (>=3) + 2+2+1 bonuses = 9", () => {
    const s = baseState(allToA);
    expect(reinforcementsFor(s, "A")).toBe(9);
  });
});

describe("placeReinforcement", () => {
  test("adds armies to an owned territory and decrements pending", () => {
    const s = { ...baseState(allToA), pendingReinforcements: 3 };
    const next = placeReinforcement(s, "n1", 2);
    expect(next.territories.n1!.armies).toBe(3);
    expect(next.pendingReinforcements).toBe(1);
  });

  test("throws when placing on a non-owned territory", () => {
    const s = { ...baseState({ ...allToA, s2: "B" }), pendingReinforcements: 3 };
    expect(() => placeReinforcement(s, "s2", 1)).toThrow(/not owned/);
  });

  test("throws when placing more than pending", () => {
    const s = { ...baseState(allToA), pendingReinforcements: 1 };
    expect(() => placeReinforcement(s, "n1", 2)).toThrow(/pending|enough/i);
  });
});

import { createGame } from "./setup.js";
import { assignObjectives } from "./worldObjectives.js";
import { worldMap } from "./map/worldMap.js";

describe("continentsControlledBy", () => {
  it("lists only fully-owned continents", () => {
    const seed = 1;
    const base = createGame(worldMap, ["you", "ai"], assignObjectives(["you", "ai"], seed), seed);
    const cont = worldMap.continents[0]!;
    const territories = { ...base.territories };
    for (const tid of cont.territoryIds) territories[tid] = { ownerId: "you", armies: 1 };
    const state = { ...base, territories };
    expect(continentsControlledBy(state, "you")).toContain(cont.id);
  });

  it("returns [] when the player owns no full continent", () => {
    const seed = 2;
    const state = createGame(worldMap, ["you", "ai"], assignObjectives(["you", "ai"], seed), seed);
    // Fresh game alternates ownership, so no continent is fully held.
    expect(continentsControlledBy(state, "you")).toEqual([]);
  });
});
