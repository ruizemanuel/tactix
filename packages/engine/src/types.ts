export type PlayerId = string;
export type TurnPhase = "reinforce" | "attack" | "fortify";
export type CardSymbol = "globo" | "canon" | "barco";

export interface Continent {
  id: string;
  name: string;
  bonus: number;
  territoryIds: string[];
}

export interface Territory {
  id: string;
  name: string;
  continentId: string;
  adjacentTo: string[];
}

export interface GameMap {
  continents: Continent[];
  territories: Territory[];
}

export interface Card {
  id: string;
  territoryId: string;
  symbol: CardSymbol;
}

export type Objective =
  | { id: string; kind: "conquer-count"; description: string; targetCount: number }
  | {
      id: string;
      kind: "conquer-continents";
      description: string;
      continentIds: string[];
      extraTerritories: number;
    }
  | { id: string; kind: "destroy-player"; description: string; targetPlayerId: PlayerId };

export interface TerritoryState {
  ownerId: PlayerId;
  armies: number;
}

export interface PlayerState {
  id: PlayerId;
  alive: boolean;
  cards: Card[];
  objectiveId: string;
  cardTradeIns: number;
}

export interface CombatResult {
  from: string;
  to: string;
  attackerDice: number[];
  defenderDice: number[];
  attackerLosses: number;
  defenderLosses: number;
  conquered: boolean;
}

export interface GameState {
  map: GameMap;
  players: PlayerState[];
  territories: Record<string, TerritoryState>;
  objectives: Record<string, Objective>;
  currentPlayerIndex: number;
  phase: TurnPhase;
  turnNumber: number;
  pendingReinforcements: number;
  conqueredThisTurn: boolean;
  deck: Card[];
  rngState: number;
  lastCombat: CombatResult | null;
  winnerId: PlayerId | null;
}

export type Action =
  | { type: "place"; territoryId: string; armies: number }
  | { type: "tradeCards"; cardIds: string[] }
  | { type: "endReinforce" }
  | { type: "attack"; from: string; to: string }
  | { type: "endAttack" }
  | { type: "fortify"; from: string; to: string; armies: number }
  | { type: "endTurn" };
