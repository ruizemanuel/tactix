import type { Card, GameState } from "./types.js";

export function isValidSet(cards: Card[]): boolean {
  if (cards.length !== 3) return false;
  const symbols = new Set(cards.map((c) => c.symbol));
  return symbols.size === 1 || symbols.size === 3;
}

/**
 * Armies granted for a card trade-in, following the TEG progression:
 * 1st = 4, 2nd = 7, 3rd = 10, then +5 each (15, 20, 25, …).
 * `priorTradeIns` is how many trades the player has already completed (0-based).
 */
export function tradeBonus(priorTradeIns: number): number {
  return priorTradeIns <= 2 ? 4 + 3 * priorTradeIns : 10 + 5 * (priorTradeIns - 2);
}

export function tradeCards(state: GameState, cardIds: string[]): GameState {
  if (state.phase !== "reinforce") throw new Error("Can only trade cards in the reinforce phase");
  if (cardIds.length !== 3 || new Set(cardIds).size !== 3) {
    throw new Error("Must trade exactly 3 distinct cards");
  }
  const player = state.players[state.currentPlayerIndex]!;
  const hand = new Map(player.cards.map((c) => [c.id, c]));
  const chosen: Card[] = [];
  for (const id of cardIds) {
    const card = hand.get(id);
    if (!card) throw new Error(`Card ${id} not in hand`);
    chosen.push(card);
  }
  if (!isValidSet(chosen)) throw new Error("Cards are not a valid set");

  const bonus = tradeBonus(player.cardTradeIns);
  const chosenIds = new Set(chosen.map((c) => c.id));
  const updatedPlayer = {
    ...player,
    cards: player.cards.filter((c) => !chosenIds.has(c.id)),
    cardTradeIns: player.cardTradeIns + 1,
  };
  const players = state.players.map((p, i) => (i === state.currentPlayerIndex ? updatedPlayer : p));

  return { ...state, players, pendingReinforcements: state.pendingReinforcements + bonus };
}
