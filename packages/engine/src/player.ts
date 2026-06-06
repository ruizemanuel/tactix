import { applyAction } from "./turn.js";
import { nextInt } from "./rng.js";
import { ownedTerritoryIds } from "./reinforce.js";
import type { Action, GameState, PlayerId } from "./types.js";
import { territoryById } from "./map/lookup.js";

export interface Player {
  id: PlayerId;
  decide(state: GameState): Action;
}

/** Deterministic 32-bit FNV-1a hash of a string, to seed a player's own rng stream. */
function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

/** First legal attack: an owned territory with >=2 armies adjacent to an enemy. */
function findAttack(state: GameState, me: PlayerId): { from: string; to: string } | null {
  for (const tid of ownedTerritoryIds(state, me)) {
    const ts = state.territories[tid]!;
    if (ts.armies < 2) continue;
    const def = territoryById(state.map, tid);
    for (const adj of def.adjacentTo) {
      if (state.territories[adj]!.ownerId !== me) return { from: tid, to: adj };
    }
  }
  return null;
}

/**
 * Deterministic, always-legal player driven by its OWN rng stream (seeded from
 * its id plus an optional seed), INDEPENDENT of the game's combat rng. Decoupling
 * is essential: reusing the game's rngState — which only advances on combat —
 * freezes placement choices on stalled turns and livelocks the game. Places all
 * reinforcements on a (varying) random owned territory, attacks whenever a legal
 * attack exists, and never fortifies. Construct a fresh instance per game for
 * reproducibility.
 */
export class RandomPlayer implements Player {
  private rng: number;

  constructor(public readonly id: PlayerId, seed = 0) {
    this.rng = (hashSeed(id) ^ seed) | 0;
  }

  decide(state: GameState): Action {
    const me = this.id;
    if (state.phase === "reinforce") {
      if (state.pendingReinforcements > 0) {
        const owned = ownedTerritoryIds(state, me);
        const r = nextInt(this.rng, owned.length);
        this.rng = r.state;
        return { type: "place", territoryId: owned[r.value]!, armies: state.pendingReinforcements };
      }
      return { type: "endReinforce" };
    }

    if (state.phase === "attack") {
      const atk = findAttack(state, me);
      if (atk) return { type: "attack", from: atk.from, to: atk.to };
      return { type: "endAttack" };
    }

    // fortify phase — never fortifies.
    return { type: "endTurn" };
  }
}

/**
 * Drive a game to completion. THROWS if `maxTurns` actions pass without a winner
 * (no silent caps: a stalled game is surfaced as an error, never returned as a
 * silently half-played state).
 */
export function runGame(state: GameState, players: Player[], maxTurns = 5000): GameState {
  const byId = new Map(players.map((p) => [p.id, p]));
  let current = state;
  let safety = 0;
  while (current.winnerId === null) {
    if (safety >= maxTurns) {
      throw new Error(`runGame exceeded maxTurns (${maxTurns}) without a winner`);
    }
    const active = current.players[current.currentPlayerIndex]!;
    const player = byId.get(active.id);
    if (!player) throw new Error(`No Player implementation for ${active.id}`);
    current = applyAction(current, player.decide(current));
    safety++;
  }
  return current;
}
