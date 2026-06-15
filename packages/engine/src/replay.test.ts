import { describe, it, expect } from "vitest";
import { createGame } from "./setup.js";
import { applyAction } from "./turn.js";
import { HeuristicPlayer } from "./ai/heuristic.js";
import { assignObjectives } from "./worldObjectives.js";
import { worldMap } from "./map/worldMap.js";
import { ownedTerritoryIds, continentsControlledBy } from "./reinforce.js";
import { replayGame, replayWithEvents } from "./replay.js";
import type { Action, GameState } from "./types.js";

// Drive a full game where seat "you" is also played by the heuristic, recording ONLY
// the seat-"you" actions — the shape a real ranked client would submit.
function playAndRecord(seed: number): { log: Action[]; final: GameState } {
  const objectives = assignObjectives(["you", "ai"], seed);
  let state = createGame(worldMap, ["you", "ai"], objectives, seed);
  const human = new HeuristicPlayer("you");
  const ai = new HeuristicPlayer("ai");
  const log: Action[] = [];
  let steps = 0;
  while (state.winnerId === null && steps++ < 200_000) {
    const cur = state.players[state.currentPlayerIndex]!.id;
    if (cur === "you") {
      const a = human.decide(state);
      log.push(a);
      state = applyAction(state, a);
    } else {
      state = applyAction(state, ai.decide(state));
    }
  }
  return { log, final: state };
}

describe("replayGame", () => {
  it("reproduces a full game from the human action log", () => {
    const seed = 12345;
    const { log, final } = playAndRecord(seed);
    expect(final.winnerId).not.toBeNull(); // sanity: the seed terminates
    const r = replayGame(seed, log, { humanId: "you", aiId: "ai" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.finalState.winnerId).toBe(final.winnerId);
    expect(r.breakdown.won).toBe(final.winnerId === "you");
    expect(r.breakdown.territories).toBe(ownedTerritoryIds(final, "you").length);
    expect(r.breakdown.continents).toBe(continentsControlledBy(final, "you").length);
  });

  it("rejects an illegal action", () => {
    // First human action is in the reinforce phase; endAttack is illegal there.
    const r = replayGame(7, [{ type: "endAttack" }], { humanId: "you", aiId: "ai" });
    expect(r.ok).toBe(false);
  });

  it("rejects a truncated log (game never reaches a winner)", () => {
    const seed = 12345;
    const { log } = playAndRecord(seed);
    const r = replayGame(seed, log.slice(0, -1), { humanId: "you", aiId: "ai" });
    expect(r.ok).toBe(false);
  });
});

describe("replayWithEvents", () => {
  it("stops at the human's turn on a partial log (no winner needed)", () => {
    const r = replayWithEvents(12345, [], { humanId: "you", aiId: "ai" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.finalState.winnerId).toBeNull();
    expect(r.finalState.players[r.finalState.currentPlayerIndex]!.id).toBe("you");
    expect(r.events).toEqual([]); // nothing applied yet
  });

  it("rejects an illegal action", () => {
    const r = replayWithEvents(7, [{ type: "endAttack" }], { humanId: "you", aiId: "ai" });
    expect(r.ok).toBe(false);
  });

  it("emits AI events after the human ends their turn", () => {
    const seed = 6; // seed 12345 no longer has endTurn in "you" log after joker cards changed deck shuffle
    const { log } = playAndRecord(seed);
    // Trim to the first endTurn (inclusive) so the AI plays exactly one turn afterwards.
    const endTurnIdx = log.findIndex((a) => a.type === "endTurn");
    expect(endTurnIdx).toBeGreaterThanOrEqual(0);
    const partial = log.slice(0, endTurnIdx + 1);
    const r = replayWithEvents(seed, partial, { humanId: "you", aiId: "ai" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const lastHuman = r.events.map((e) => e.actor).lastIndexOf("human");
    const tail = r.events.slice(lastHuman + 1);
    expect(tail.length).toBeGreaterThan(0);
    expect(tail.every((e) => e.actor === "ai")).toBe(true);
  });

  it("agrees with replayGame on the final state of a complete log", () => {
    const seed = 12345;
    const { log } = playAndRecord(seed);
    const a = replayGame(seed, log, { humanId: "you", aiId: "ai" });
    const b = replayWithEvents(seed, log, { humanId: "you", aiId: "ai" });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(b.finalState).toEqual(a.finalState);
  });
});
