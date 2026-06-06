import { isValidSet } from "../cards.js";
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
 * Where to drop reinforcements: pick the border territory that maximises the
 * expected attack value AFTER the reinforcement is placed. Score:
 *
 *   (ownArmies + pending) - minEnemyArmies * 2  ← breakthrough potential weighted
 *                                                   heavily toward weak enemy fronts
 *   + continentCompletionBonus on best adjacent enemy
 *   + objectiveBonus on best adjacent enemy
 *
 * Weighting minEnemy × 2 vs (ownArmies + pending) × 1 directs the mass to the
 * front where the enemy is weakest rather than where we already dominate — the
 * correct "attack the soft spot" heuristic for a massing strategy.
 *
 * Falls back to any owned territory if the player holds no border (game won).
 */
export function bestReinforceTarget(state: GameState, me: PlayerId): string {
  const borders = borderTerritories(state, me);
  if (borders.length === 0) return ownedTerritoryIds(state, me)[0]!;
  const pending = state.pendingReinforcements;
  let best = borders[0]!;
  let bestScore = -Infinity;
  for (const tid of borders) {
    const ownArmies = state.territories[tid]!.armies;
    const enemyNeighbors = neighborsOf(state.map, tid).filter(
      (n) => state.territories[n]!.ownerId !== me,
    );
    const minEnemy = Math.min(...enemyNeighbors.map((n) => state.territories[n]!.armies));
    // Best strategic bonus available from any adjacent enemy territory.
    const stratBonus = enemyNeighbors.reduce((acc, to) => {
      return Math.max(acc, continentCompletionBonus(state, me, to) + objectiveBonus(state, me, to));
    }, 0);
    const score = (ownArmies + pending) - minEnemy * 2 + stratBonus + ownArmies * 0.001;
    if (score > bestScore) {
      bestScore = score;
      best = tid;
    }
  }
  return best;
}

/** First 3 cards in the hand forming a valid set (3 same OR 3 distinct symbols). */
export function findTradeableSet(cards: Card[]): string[] | null {
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      for (let k = j + 1; k < cards.length; k++) {
        const trio = [cards[i]!, cards[j]!, cards[k]!];
        if (isValidSet(trio)) return trio.map((c) => c.id);
      }
    }
  }
  return null;
}

/**
 * Move armies toward the strongest attack front. Two-pass strategy:
 *
 * Pass 1 (preferred): move an interior garrison (no enemy neighbor, >=2 armies)
 *   fully forward into an adjacent owned frontier territory, leaving 1 behind.
 *
 * Pass 2 (fallback): if no interior→border move exists, redistribute along the
 *   front — move excess armies from a border territory that is locally dominant
 *   (own armies >= 2 × weakest adjacent enemy) to an adjacent border territory
 *   that is locally weaker, leaving 2 behind. This avoids stranding armies on a
 *   won front while another front is thin.
 *
 * Returns null if no beneficial move exists.
 */
export function bestFortify(
  state: GameState,
  me: PlayerId,
): { from: string; to: string; armies: number } | null {
  const borders = new Set(borderTerritories(state, me));

  // Pass 1: interior → adjacent frontier.
  for (const from of ownedTerritoryIds(state, me)) {
    const fromArmies = state.territories[from]!.armies;
    if (fromArmies < 2 || borders.has(from)) continue;
    for (const to of neighborsOf(state.map, from)) {
      if (state.territories[to]!.ownerId === me && borders.has(to)) {
        return { from, to, armies: fromArmies - 1 };
      }
    }
  }

  // Pass 2: redistribute between border territories (dominant → thin front).
  let best: { from: string; to: string; armies: number } | null = null;
  let bestGain = 0;
  for (const from of borders) {
    const fromArmies = state.territories[from]!.armies;
    if (fromArmies < 3) continue; // must be able to leave >=2 and still move >=1
    const fromMinEnemy = Math.min(
      ...neighborsOf(state.map, from)
        .filter((n) => state.territories[n]!.ownerId !== me)
        .map((n) => state.territories[n]!.armies),
    );
    if (fromArmies < 2 * fromMinEnemy) continue; // still contested, don't strip
    for (const to of neighborsOf(state.map, from)) {
      if (state.territories[to]!.ownerId !== me || !borders.has(to)) continue;
      const toMinEnemy = Math.min(
        ...neighborsOf(state.map, to)
          .filter((n) => state.territories[n]!.ownerId !== me)
          .map((n) => state.territories[n]!.armies),
      );
      const toArmies = state.territories[to]!.armies;
      const gain = toMinEnemy - toArmies; // positive = target is outnumbered
      if (gain > bestGain) {
        bestGain = gain;
        best = { from, to, armies: fromArmies - 2 };
      }
    }
  }
  return best;
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
 * defender's, or equal with a strategic bonus >= 5), or null if none.
 *
 * Score = army margin + continent-completion bonus + objective bonus.
 * Ties resolve to the first found (deterministic).
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
      const stratBonus = continentCompletionBonus(state, me, to) + objectiveBonus(state, me, to);
      const margin = fromArmies - toTs.armies;
      if (margin < 0 && stratBonus === 0) continue; // skip hopeless unfavorable attacks
      if (margin < 1 && stratBonus < 5) continue;   // need advantage or strong strategic reason
      const score = margin + stratBonus;
      if (score > bestScore) {
        bestScore = score;
        best = { from, to };
      }
    }
  }
  return best;
}
