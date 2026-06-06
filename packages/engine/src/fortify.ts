import type { GameState } from "./types.js";
import { territoryById } from "./map/lookup.js";

export function fortify(state: GameState, from: string, to: string, armies: number): GameState {
  if (state.phase !== "fortify") throw new Error("Can only fortify in the fortify phase");
  if (armies <= 0) throw new Error("Must move a positive number of armies");

  const fromTs = state.territories[from];
  const toTs = state.territories[to];
  if (!fromTs || !toTs) throw new Error("Unknown territory");

  const current = state.players[state.currentPlayerIndex]!;
  if (fromTs.ownerId !== current.id || toTs.ownerId !== current.id) {
    throw new Error("Both territories must be owned by the current player");
  }
  if (fromTs.armies - armies < 1) throw new Error("Must leave at least 1 army behind");

  const fromDef = territoryById(state.map, from);
  if (!fromDef.adjacentTo.includes(to)) throw new Error(`${from} and ${to} are not adjacent`);

  return {
    ...state,
    territories: {
      ...state.territories,
      [from]: { ...fromTs, armies: fromTs.armies - armies },
      [to]: { ...toTs, armies: toTs.armies + armies },
    },
  };
}
