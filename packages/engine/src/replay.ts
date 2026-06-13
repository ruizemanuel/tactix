import { createGame } from "./setup.js";
import { applyAction } from "./turn.js";
import { HeuristicPlayer } from "./ai/heuristic.js";
import { assignObjectives } from "./worldObjectives.js";
import { worldMap } from "./map/worldMap.js";
import { ownedTerritoryIds, continentsControlledBy } from "./reinforce.js";
import type { ScoreBreakdown } from "./score.js";
import type { Action, GameMap, GameState } from "./types.js";

export interface ReplayOpts {
  humanId: string;
  aiId: string;
  map?: GameMap;
}

export type ReplayResult =
  | { ok: true; finalState: GameState; breakdown: ScoreBreakdown }
  | { ok: false; error: string };

const MAX_STEPS = 200_000;

/**
 * Deterministically re-walk a ranked game from a server-issued `seed` and the human's
 * recorded `Action[]`. The AI (seat `aiId`) and every die roll are reproduced from the
 * seed via `@teg/engine`, so the score the server computes here IS the authoritative
 * outcome of the submitted line of play. Illegal / truncated / over-long logs are rejected.
 */
export function replayGame(seed: number, humanActions: Action[], opts: ReplayOpts): ReplayResult {
  const { humanId, aiId, map = worldMap } = opts;
  const objectives = assignObjectives([humanId, aiId], seed);
  let state = createGame(map, [humanId, aiId], objectives, seed);
  const ai = new HeuristicPlayer(aiId);

  let cursor = 0;
  let turnsUsed = 0;
  let lastHumanTurn = -1;
  let steps = 0;

  while (state.winnerId === null) {
    if (++steps > MAX_STEPS) return { ok: false, error: "replay exceeded step cap" };
    const current = state.players[state.currentPlayerIndex]!.id;
    if (current === humanId) {
      // Each distinct turnNumber on which the human is the current player == one human turn.
      if (state.turnNumber !== lastHumanTurn) {
        turnsUsed++;
        lastHumanTurn = state.turnNumber;
      }
      const action = humanActions[cursor++];
      if (action === undefined) {
        return { ok: false, error: "human action log exhausted before game end" };
      }
      try {
        state = applyAction(state, action);
      } catch (e) {
        return { ok: false, error: `illegal action at index ${cursor - 1}: ${(e as Error).message}` };
      }
    } else {
      state = applyAction(state, ai.decide(state));
    }
  }

  if (cursor < humanActions.length) {
    return { ok: false, error: "extra actions after game end" };
  }

  const breakdown: ScoreBreakdown = {
    won: state.winnerId === humanId,
    continents: continentsControlledBy(state, humanId).length,
    territories: ownedTerritoryIds(state, humanId).length,
    turnsUsed,
  };
  return { ok: true, finalState: state, breakdown };
}
