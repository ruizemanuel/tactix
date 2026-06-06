import { describe, expect, test } from "vitest";
import { HeuristicPlayer } from "./heuristic.js";
import { RandomPlayer, runGame } from "../player.js";
import { createGame } from "../setup.js";
import { fixtureMap } from "../map/fixture.js";
import type { Objective } from "../types.js";

const objectives: Objective[] = [
  { id: "o-a", kind: "conquer-count", description: "own 6", targetCount: 6 },
  { id: "o-b", kind: "conquer-count", description: "own 6", targetCount: 6 },
];

describe("HeuristicPlayer", () => {
  test("plays only legal actions and games terminate (50 seeds, H vs H)", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const players = [new HeuristicPlayer("A"), new HeuristicPlayer("B")];
      const final = runGame(createGame(fixtureMap, ["A", "B"], objectives, seed), players, 5000);
      expect(final.winnerId, `seed ${seed} did not terminate`).not.toBeNull();
    }
  });

  test("is deterministic (same seed → same winner and turnNumber)", () => {
    const run = () =>
      runGame(createGame(fixtureMap, ["A", "B"], objectives, 99), [new HeuristicPlayer("A"), new HeuristicPlayer("B")], 5000);
    const a = run();
    const b = run();
    expect(b.winnerId).toBe(a.winnerId);
    expect(b.turnNumber).toBe(a.turnNumber);
  });

  test("trades a valid card set during the reinforce phase before placing", () => {
    let s = createGame(fixtureMap, ["A", "B"], objectives, 3);
    s = {
      ...s,
      players: s.players.map((p, i) =>
        i === 0
          ? {
              ...p,
              cards: [
                { id: "c1", territoryId: "n1", symbol: "globo" as const },
                { id: "c2", territoryId: "n2", symbol: "canon" as const },
                { id: "c3", territoryId: "n3", symbol: "barco" as const },
              ],
            }
          : p,
      ),
    };
    const action = new HeuristicPlayer("A").decide(s);
    expect(action).toEqual({ type: "tradeCards", cardIds: ["c1", "c2", "c3"] });
  });

  // Competence gate. A naive "H wins >= X of N alternating games" threshold is
  // misleading on the tiny 9-territory fixture: the common objective (own 6 of 9)
  // is reachable in a single opening turn, so whoever moves first has a huge
  // structural edge (measured: H wins ~98% moving first, ~15% moving second). So
  // we assert competence two ways that are robust to first-mover luck:
  //   (1) given the first move, H exploits it near-perfectly — isolates skill
  //       from the coin-flip of who starts.
  //   (2) over symmetric swapped pairs (each seed played both ways), H wins the
  //       clear majority — head-to-head superiority with first-mover neutralized.
  // If these fall, IMPROVE the heuristic (analysis.ts); do not weaken the gates.
  test("dominates RandomPlayer (first-mover-controlled competence)", () => {
    const N = 100;
    let hFirst = 0; // H is player 0 (moves first)
    let hSecond = 0; // R is player 0 (H moves second)
    for (let seed = 1; seed <= N; seed++) {
      const a = runGame(
        createGame(fixtureMap, ["H", "R"], objectives, seed),
        [new HeuristicPlayer("H"), new RandomPlayer("R")],
        5000,
      );
      if (a.winnerId === "H") hFirst++;
      const b = runGame(
        createGame(fixtureMap, ["R", "H"], objectives, seed),
        [new HeuristicPlayer("H"), new RandomPlayer("R")],
        5000,
      );
      if (b.winnerId === "H") hSecond++;
    }
    expect(hFirst, `H won only ${hFirst}/100 when moving first`).toBeGreaterThanOrEqual(90);
    expect(hFirst + hSecond, `H won only ${hFirst + hSecond}/200 symmetric`).toBeGreaterThanOrEqual(105);
  });
});
