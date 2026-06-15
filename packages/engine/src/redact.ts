import type {
  Card,
  CombatResult,
  GameMap,
  GameState,
  Objective,
  PlayerId,
  TerritoryState,
  TurnPhase,
} from "./types.js";

export interface RedactedPlayer {
  id: PlayerId;
  alive: boolean;
  cardTradeIns: number;
  cardCount: number;
  cards?: Card[]; // viewer only
  objectiveId?: string; // viewer only
}

/**
 * The wire contract the server sends to a ranked client. Deliberately omits
 * `rngState` (the dice predictor) and the `deck` contents (future draws), and
 * exposes only the viewer's own objective and cards. This is the security
 * boundary — `app/app/api/ranked/security.test.ts` asserts no secret ever
 * appears in any endpoint response.
 */
export interface RedactedGameState {
  map: GameMap;
  players: RedactedPlayer[];
  territories: Record<string, TerritoryState>;
  objectives: Record<string, Objective>; // viewer's only
  currentPlayerIndex: number;
  phase: TurnPhase;
  turnNumber: number;
  pendingReinforcements: number;
  conquestsThisTurn: number;
  deckCount: number;
  lastCombat: CombatResult | null;
  winnerId: PlayerId | null;
}

export function redactState(state: GameState, viewerId: PlayerId): RedactedGameState {
  const viewer = state.players.find((p) => p.id === viewerId);
  const objectives: Record<string, Objective> = {};
  if (viewer) {
    const own = state.objectives[viewer.objectiveId];
    if (own) objectives[viewer.objectiveId] = own;
  }
  return {
    map: state.map,
    players: state.players.map((p) =>
      p.id === viewerId
        ? {
            id: p.id,
            alive: p.alive,
            cardTradeIns: p.cardTradeIns,
            cardCount: p.cards.length,
            cards: p.cards,
            objectiveId: p.objectiveId,
          }
        : { id: p.id, alive: p.alive, cardTradeIns: p.cardTradeIns, cardCount: p.cards.length },
    ),
    territories: state.territories,
    objectives,
    currentPlayerIndex: state.currentPlayerIndex,
    phase: state.phase,
    turnNumber: state.turnNumber,
    pendingReinforcements: state.pendingReinforcements,
    conquestsThisTurn: state.conquestsThisTurn,
    deckCount: state.deck.length,
    lastCombat: state.lastCombat,
    winnerId: state.winnerId,
  };
}
