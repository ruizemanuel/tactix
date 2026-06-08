import { describe, expect, test } from "vitest";
import { checkObjective, checkWin, commonTarget } from "./objectives.js";
import type { GameState, Objective } from "./types.js";
import { fixtureMap } from "./map/fixture.js";

function stateWith(owner: Record<string, string>, objectives: Objective[], objAByPlayer: Record<string, string>): GameState {
  const territories = Object.fromEntries(Object.entries(owner).map(([id, o]) => [id, { ownerId: o, armies: 1 }]));
  const objectiveMap = Object.fromEntries(objectives.map((o) => [o.id, o]));
  return {
    map: fixtureMap,
    players: [
      { id: "A", alive: true, cards: [], objectiveId: objAByPlayer.A!, cardTradeIns: 0 },
      { id: "B", alive: true, cards: [], objectiveId: objAByPlayer.B!, cardTradeIns: 0 },
    ],
    territories,
    objectives: objectiveMap,
    currentPlayerIndex: 0,
    phase: "attack",
    turnNumber: 1,
    pendingReinforcements: 0,
    conqueredThisTurn: false,
    deck: [],
    rngState: 1,
    lastCombat: null,
    winnerId: null,
  };
}

const allToA = Object.fromEntries(fixtureMap.territories.map((t) => [t.id, "A"]));

describe("objectives", () => {
  test("conquer-continents objective met when continents fully owned", () => {
    const obj: Objective = { id: "oc", kind: "conquer-continents", description: "north+south", continentIds: ["north", "south"], extraTerritories: 0 };
    const owner = { ...allToA, i1: "B", i2: "B", i3: "B" };
    const s = stateWith(owner, [obj, { id: "ob", kind: "conquer-count", description: "", targetCount: 99 }], { A: "oc", B: "ob" });
    expect(checkObjective(s, "A")).toBe(true);
  });

  test("conquer-count objective met at threshold", () => {
    const obj: Objective = { id: "ocount", kind: "conquer-count", description: "own 5", targetCount: 5 };
    const owner = { n1: "A", n2: "A", n3: "A", s1: "A", s2: "A", s3: "B", i1: "B", i2: "B", i3: "B" };
    const s = stateWith(owner, [obj, { id: "ob", kind: "conquer-count", description: "", targetCount: 99 }], { A: "ocount", B: "ob" });
    expect(checkObjective(s, "A")).toBe(true);
  });

  test("destroy-player objective met when target owns nothing", () => {
    const obj: Objective = { id: "od", kind: "destroy-player", description: "kill B", targetPlayerId: "B" };
    const s = stateWith(allToA, [obj, { id: "ob", kind: "conquer-count", description: "", targetCount: 99 }], { A: "od", B: "ob" });
    expect(checkObjective(s, "A")).toBe(true);
  });

  test("checkWin true via common objective even if secret not met", () => {
    const farObj: Objective = { id: "ofar", kind: "destroy-player", description: "kill B", targetPlayerId: "B" };
    const owner = { ...allToA, i3: "B" };
    const s = stateWith(owner, [farObj, { id: "ob", kind: "conquer-count", description: "", targetCount: 99 }], { A: "ofar", B: "ob" });
    expect(checkObjective(s, "A")).toBe(false);
    expect(checkWin(s, "A")).toBe(true);
  });

  test("commonTarget is ceil(2/3 of territories)", () => {
    expect(commonTarget(fixtureMap)).toBe(6);
  });

  test("commonTarget uses the map's commonObjectiveTarget when present, else the 2/3 fallback", () => {
    expect(commonTarget({ continents: [], territories: [], commonObjectiveTarget: 20 })).toBe(20);
    const nine = Array.from({ length: 9 }, (_, i) => ({ id: `t${i}`, name: `t${i}`, continentId: "c", adjacentTo: [] }));
    expect(commonTarget({ continents: [], territories: nine })).toBe(6);
  });
});
