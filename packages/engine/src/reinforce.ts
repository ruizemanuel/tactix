import type { GameState, PlayerId } from "./types.js";

export function ownedTerritoryIds(state: GameState, playerId: PlayerId): string[] {
  return Object.entries(state.territories)
    .filter(([, ts]) => ts.ownerId === playerId)
    .map(([id]) => id);
}

export function continentsControlledBy(state: GameState, playerId: PlayerId): string[] {
  const owned = new Set(ownedTerritoryIds(state, playerId));
  return state.map.continents
    .filter((c) => c.territoryIds.every((tid) => owned.has(tid)))
    .map((c) => c.id);
}

export function reinforcementsFor(state: GameState, playerId: PlayerId): number {
  const owned = new Set(ownedTerritoryIds(state, playerId));
  const base = Math.max(3, Math.floor(owned.size / 2));
  const controlled = new Set(continentsControlledBy(state, playerId));
  const bonus = state.map.continents
    .filter((c) => controlled.has(c.id))
    .reduce((sum, c) => sum + c.bonus, 0);
  return base + bonus;
}

export function placeReinforcement(
  state: GameState,
  territoryId: string,
  armies: number,
): GameState {
  if (armies <= 0) throw new Error("Must place a positive number of armies");
  const ts = state.territories[territoryId];
  if (!ts) throw new Error(`Unknown territory ${territoryId}`);
  const current = state.players[state.currentPlayerIndex]!;
  if (ts.ownerId !== current.id) throw new Error(`Territory ${territoryId} not owned`);
  if (armies > state.pendingReinforcements) throw new Error("Not enough pending reinforcements");

  return {
    ...state,
    pendingReinforcements: state.pendingReinforcements - armies,
    territories: {
      ...state.territories,
      [territoryId]: { ...ts, armies: ts.armies + armies },
    },
  };
}
