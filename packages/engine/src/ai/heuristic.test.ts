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

  test("beats RandomPlayer in a strong majority of games (100 seeds, alternating first move)", () => {
    let heuristicWins = 0;
    const N = 100;
    for (let seed = 1; seed <= N; seed++) {
      // Alternate who moves first to remove first-mover bias.
      const ids = seed % 2 === 0 ? ["H", "R"] : ["R", "H"];
      const players = [new HeuristicPlayer("H"), new RandomPlayer("R")];
      const final = runGame(createGame(fixtureMap, ids, objectives, seed), players, 5000);
      if (final.winnerId === "H") heuristicWins++;
    }
    // The heuristic (card trading + frontier massing + favorable-only attacks +
    // continent priority + fortify) should dominate a random driver. If this is
    // below 70, IMPROVE the heuristic — do NOT lower the gate. Levers: trade more
    // aggressively, mass harder on the single best front, weight objective higher.
    expect(heuristicWins).toBeGreaterThanOrEqual(70);
  });
});
