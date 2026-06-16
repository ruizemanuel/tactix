import { neighborsOf } from "../map/lookup.js";
import { ownedTerritoryIds } from "../reinforce.js";
import type { Card, GameState, PlayerId } from "../types.js";

/** Owned territories that have at least one enemy neighbor (the front line). */
export function borderTerritories(state: GameState, me: PlayerId): string[] {
  return ownedTerritoryIds(state, me).filter((tid) =>
    neighborsOf(state.map, tid).some((n) => state.territories[n]!.ownerId !== me),
  );
}

/**
 * Where to drop reinforcements: the border territory closest to a breakthrough,
 * scored as (own armies − weakest adjacent enemy's armies). Falls back to any
 * owned territory if the player somehow holds no border (shouldn't happen in a
 * live game — that would mean the game is already won).
 */
export function bestReinforceTarget(state: GameState, me: PlayerId): string {
  const borders = borderTerritories(state, me);
  if (borders.length === 0) return ownedTerritoryIds(state, me)[0]!;
  let best = borders[0]!;
  let bestScore = -Infinity;
  for (const tid of borders) {
    const enemyArmies = neighborsOf(state.map, tid)
      .filter((n) => state.territories[n]!.ownerId !== me)
      .map((n) => state.territories[n]!.armies);
    const score = state.territories[tid]!.armies - Math.min(...enemyArmies);
    if (score > bestScore) {
      bestScore = score;
      best = tid;
    }
  }
  return best;
}

/**
 * Move the garrison of a safe interior territory (no enemy neighbor, >=2 armies)
 * forward into an adjacent owned frontier territory, leaving 1 behind. Null if
 * there is no such interior→frontier move. Deterministic (first match).
 */
export function bestFortify(
  state: GameState,
  me: PlayerId,
): { from: string; to: string; armies: number } | null {
  const borders = new Set(borderTerritories(state, me));
  for (const from of ownedTerritoryIds(state, me)) {
    const fromArmies = state.territories[from]!.armies;
    if (fromArmies < 2 || borders.has(from)) continue; // keep frontier garrisons in place
    for (const to of neighborsOf(state.map, from)) {
      if (state.territories[to]!.ownerId === me && borders.has(to)) {
        return { from, to, armies: fromArmies - 1 };
      }
    }
  }
  return null;
}

/** +10 if capturing `to` would complete the continent `to` belongs to. */
function continentCompletionBonus(state: GameState, me: PlayerId, to: string): number {
  const cont = state.map.continents.find((c) => c.territoryIds.includes(to));
  if (!cont) return 0;
  const ownsRest = cont.territoryIds
    .filter((t) => t !== to)
    .every((t) => state.territories[t]!.ownerId === me);
  return ownsRest ? 10 : 0;
}

/** +5 if capturing `to` advances the player's secret objective. */
function objectiveBonus(state: GameState, me: PlayerId, to: string): number {
  const player = state.players.find((p) => p.id === me);
  const obj = player ? state.objectives[player.objectiveId] : undefined;
  if (!obj) return 0;
  if (obj.kind === "conquer-continents") {
    const cont = state.map.continents.find((c) => c.territoryIds.includes(to));
    return cont && obj.continentIds.includes(cont.id) ? 5 : 0;
  }
  if (obj.kind === "destroy-player") {
    return state.territories[to]!.ownerId === obj.targetPlayerId ? 5 : 0;
  }
  return 0;
}

/**
 * Highest-scoring FAVORABLE attack (attacker armies strictly greater than the
 * defender's), or null if none. Score = army margin + continent-completion bonus
 * + objective bonus. Ties resolve to the first found (deterministic).
 */
export function bestAttack(state: GameState, me: PlayerId): { from: string; to: string } | null {
  let best: { from: string; to: string } | null = null;
  let bestScore = -Infinity;
  for (const from of ownedTerritoryIds(state, me)) {
    const fromArmies = state.territories[from]!.armies;
    if (fromArmies < 2) continue;
    for (const to of neighborsOf(state.map, from)) {
      const toTs = state.territories[to]!;
      if (toTs.ownerId === me) continue;
      if (fromArmies <= toTs.armies) continue; // only attack at an advantage
      const score =
        fromArmies - toTs.armies + continentCompletionBonus(state, me, to) + objectiveBonus(state, me, to);
      if (score > bestScore) {
        bestScore = score;
        best = { from, to };
      }
    }
  }
  return best;
}
