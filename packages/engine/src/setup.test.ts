import { describe, expect, test } from "vitest";
import { createGame } from "./setup.js";
import { fixtureMap } from "./map/fixture.js";
import type { Objective } from "./types.js";

const objectives: Objective[] = [
  { id: "o-a", kind: "conquer-count", description: "Own 6", targetCount: 6 },
  { id: "o-b", kind: "conquer-count", description: "Own 6", targetCount: 6 },
];

describe("createGame", () => {
  test("assigns every territory to a player with 1 army", () => {
    const s = createGame(fixtureMap, ["A", "B"], objectives, 7);
    const states = Object.values(s.territories);
    expect(states).toHaveLength(9);
    for (const ts of states) expect(ts.armies).toBe(1);
    expect(states.filter((t) => t.ownerId === "A").length).toBeGreaterThan(0);
    expect(states.filter((t) => t.ownerId === "B").length).toBeGreaterThan(0);
  });

  test("is deterministic for a given seed", () => {
    const a = createGame(fixtureMap, ["A", "B"], objectives, 7);
    const b = createGame(fixtureMap, ["A", "B"], objectives, 7);
    expect(a.territories).toEqual(b.territories);
  });

  test("builds a deck with one card per territory and assigns objectives", () => {
    const s = createGame(fixtureMap, ["A", "B"], objectives, 7);
    expect(s.deck).toHaveLength(9);
    expect(s.players.map((p) => p.objectiveId).sort()).toEqual(["o-a", "o-b"]);
    expect(s.phase).toBe("reinforce");
    expect(s.currentPlayerIndex).toBe(0);
    expect(s.winnerId).toBeNull();
  });

  test("throws if players and objectives count mismatch", () => {
    expect(() => createGame(fixtureMap, ["A", "B"], [objectives[0]!], 7)).toThrow();
  });
});
