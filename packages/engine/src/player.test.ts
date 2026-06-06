import { describe, expect, test } from "vitest";
import { RandomPlayer, runGame } from "./player.js";
import { createGame } from "./setup.js";
import { fixtureMap } from "./map/fixture.js";
import type { Objective } from "./types.js";

const objectives: Objective[] = [
  { id: "o-a", kind: "conquer-count", description: "own 6", targetCount: 6 },
  { id: "o-b", kind: "conquer-count", description: "own 6", targetCount: 6 },
];

describe("runGame with RandomPlayer", () => {
  test("a full game terminates with a winner and is deterministic", () => {
    const players = [new RandomPlayer("A"), new RandomPlayer("B")];
    const a = runGame(createGame(fixtureMap, ["A", "B"], objectives, 2026), players, 2000);
    const players2 = [new RandomPlayer("A"), new RandomPlayer("B")];
    const b = runGame(createGame(fixtureMap, ["A", "B"], objectives, 2026), players2, 2000);
    expect(a.winnerId).not.toBeNull();
    expect(["A", "B"]).toContain(a.winnerId);
    expect(b.winnerId).toBe(a.winnerId);
    expect(b.turnNumber).toBe(a.turnNumber);
  });

  test("every action a RandomPlayer returns is accepted by applyAction (no throws)", () => {
    const players = [new RandomPlayer("A"), new RandomPlayer("B")];
    const final = runGame(createGame(fixtureMap, ["A", "B"], objectives, 5), players, 2000);
    expect(final.winnerId).not.toBeNull();
  });

  test("games terminate with a winner across many seeds (no livelock)", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const players = [new RandomPlayer("A"), new RandomPlayer("B")];
      const final = runGame(createGame(fixtureMap, ["A", "B"], objectives, seed), players, 5000);
      expect(final.winnerId, `seed ${seed} did not terminate`).not.toBeNull();
    }
  });

  test("runGame throws when maxTurns is exceeded without a winner", () => {
    const players = [new RandomPlayer("A"), new RandomPlayer("B")];
    expect(() => runGame(createGame(fixtureMap, ["A", "B"], objectives, 1), players, 1)).toThrow(/maxTurns/);
  });

  test("runGame throws if a player id has no implementation", () => {
    const players = [new RandomPlayer("A")]; // B missing
    expect(() => runGame(createGame(fixtureMap, ["A", "B"], objectives, 4), players, 5000)).toThrow(/No Player implementation/);
  });
});
