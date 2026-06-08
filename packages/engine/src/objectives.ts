import { ownedTerritoryIds } from "./reinforce.js";
import type { GameMap, GameState, PlayerId } from "./types.js";

export function commonTarget(map: GameMap): number {
  return map.commonObjectiveTarget ?? Math.ceil((map.territories.length * 2) / 3);
}

export function checkObjective(state: GameState, playerId: PlayerId): boolean {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return false;
  const objective = state.objectives[player.objectiveId];
  if (!objective) return false;
  const owned = new Set(ownedTerritoryIds(state, playerId));

  switch (objective.kind) {
    case "conquer-count":
      return owned.size >= objective.targetCount;
    case "conquer-continents": {
      const allContinents = objective.continentIds.every((cid) => {
        const c = state.map.continents.find((x) => x.id === cid);
        return c ? c.territoryIds.every((tid) => owned.has(tid)) : false;
      });
      const claimed = new Set(
        objective.continentIds.flatMap(
          (cid) => state.map.continents.find((x) => x.id === cid)?.territoryIds ?? [],
        ),
      );
      const extra = [...owned].filter((tid) => !claimed.has(tid)).length;
      return allContinents && extra >= objective.extraTerritories;
    }
    case "destroy-player":
      return ownedTerritoryIds(state, objective.targetPlayerId).length === 0;
  }
}

export function checkWin(state: GameState, playerId: PlayerId): boolean {
  if (checkObjective(state, playerId)) return true;
  const owned = ownedTerritoryIds(state, playerId).length;
  return owned >= commonTarget(state.map);
}
