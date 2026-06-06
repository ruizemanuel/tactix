import { applyAction } from "./turn.js";
import { nextInt } from "./rng.js";
import { ownedTerritoryIds } from "./reinforce.js";
import type { Action, GameState, PlayerId } from "./types.js";

export interface Player {
  id: PlayerId;
  decide(state: GameState): Action;
}

/** Find a legal attack (owned territory with >=2 armies adjacent to an enemy). */
function findAttack(state: GameState, me: PlayerId): { from: string; to: string } | null {
  for (const tid of ownedTerritoryIds(state, me)) {
    const ts = state.territories[tid]!;
    if (ts.armies < 2) continue;
    const def = state.map.territories.find((t) => t.id === tid)!;
    for (const adj of def.adjacentTo) {
      if (state.territories[adj]!.ownerId !== me) return { from: tid, to: adj };
    }
  }
  return null;
}

/**
 * Deterministic, always-legal player. Uses the game's own rngState only to pick
 * where to place reinforcements (it does not mutate game state). Attacks whenever
 * a legal attack exists — this concentrates territories and guarantees the game
 * converges (someone hits the common objective or eliminates the other).
 */
export class RandomPlayer implements Player {
  constructor(public readonly id: PlayerId) {}

  decide(state: GameState): Action {
    const me = this.id;
    if (state.phase === "reinforce") {
      if (state.pendingReinforcements > 0) {
        const owned = ownedTerritoryIds(state, me);
        const pick = owned[nextInt(state.rngState, owned.length).value]!;
        return { type: "place", territoryId: pick, armies: state.pendingReinforcements };
      }
      return { type: "endReinforce" };
    }

    if (state.phase === "attack") {
      const atk = findAttack(state, me);
      if (atk) return { type: "attack", from: atk.from, to: atk.to };
      return { type: "endAttack" };
    }

    // fortify phase — RandomPlayer never fortifies; just ends the turn.
    return { type: "endTurn" };
  }
}

export function runGame(state: GameState, players: Player[], maxTurns = 2000): GameState {
  const byId = new Map(players.map((p) => [p.id, p]));
  let current = state;
  let safety = 0;
  while (current.winnerId === null && safety < maxTurns) {
    const active = current.players[current.currentPlayerIndex]!;
    const player = byId.get(active.id);
    if (!player) throw new Error(`No Player implementation for ${active.id}`);
    current = applyAction(current, player.decide(current));
    safety++;
  }
  return current;
}
