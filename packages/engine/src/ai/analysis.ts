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
