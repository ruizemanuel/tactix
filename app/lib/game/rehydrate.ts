import type { Card, GameState, RedactedGameState } from "@teg/engine";

/** Opaque, identity-free placeholder cards so `.length`-based UI is correct. */
function placeholders(n: number): Card[] {
  return Array.from({ length: n }, (_, i) => ({ id: `hidden-${i}`, territoryId: "", symbol: "globo" as const }));
}

/**
 * Turn a server-sent redacted view back into a `GameState` so the existing
 * board/status/panel components render unchanged. Hidden info is reconstructed
 * only for shape: an opponent's `cards` become `placeholders(cardCount)` (count-
 * accurate, identity-free) and `rngState`/`deck`/opponent `objectiveId` are
 * blanked. These are safe because ranked mode never calls `applyAction` on a
 * rehydrated state — the server is the only authority.
 */
export function rehydrateView(v: RedactedGameState): GameState {
  return {
    map: v.map,
    players: v.players.map((p) => ({
      id: p.id,
      alive: p.alive,
      cardTradeIns: p.cardTradeIns,
      cards: p.cards ?? placeholders(p.cardCount),
      objectiveId: p.objectiveId ?? "",
    })),
    territories: v.territories,
    objectives: v.objectives,
    currentPlayerIndex: v.currentPlayerIndex,
    phase: v.phase,
    turnNumber: v.turnNumber,
    pendingReinforcements: v.pendingReinforcements,
    conquestsThisTurn: v.conquestsThisTurn,
    deck: placeholders(v.deckCount),
    rngState: 0,
    lastCombat: v.lastCombat,
    pendingOccupation: v.pendingOccupation,
    winnerId: v.winnerId,
  };
}
