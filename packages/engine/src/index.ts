export const ENGINE_VERSION = "0.0.1";

export * from "./types.js";
export { validateMap, gameMapSchema } from "./map/schema.js";
export { fixtureMap } from "./map/fixture.js";
export { worldMap } from "./map/worldMap.js";
export { nextUint32, nextInt, rollDie, rollDice } from "./rng.js";
export { createGame } from "./setup.js";
export { reinforcementsFor, placeReinforcement, ownedTerritoryIds } from "./reinforce.js";
export { isValidSet, tradeBonus, tradeCards } from "./cards.js";
export { resolveAttack } from "./combat.js";
export { fortify } from "./fortify.js";
export { checkObjective, checkWin, commonTarget } from "./objectives.js";
export { applyAction } from "./turn.js";
export { type Player, RandomPlayer, runGame } from "./player.js";
export { territoryById, neighborsOf } from "./map/lookup.js";
export {
  borderTerritories,
  bestReinforceTarget,
  bestAttack,
  bestFortify,
  findTradeableSet,
} from "./ai/analysis.js";
export { HeuristicPlayer } from "./ai/heuristic.js";
export { WORLD_OBJECTIVES, assignObjectives } from "./worldObjectives.js";
