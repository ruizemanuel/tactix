import { bestAttack, bestFortify, bestReinforceTarget } from "./analysis.js";
import { findTradeableSet } from "../cards.js";
import type { Action, GameState, PlayerId } from "../types.js";
import type { Player } from "../player.js";

// `Player` is a type-only import from player.js (erased at compile time → no
// runtime circular dependency, even though player.ts imports from turn.ts).

/**
 * Deterministic rule-based AI. Reinforce: trade a card set if held, else mass
 * reinforcements on the best frontier, else end. Attack: take the best favorable
 * attack, else end the phase. Fortify: push an interior garrison to the front,
 * else end the turn. Beats RandomPlayer comfortably (see competence test).
 */
export class HeuristicPlayer implements Player {
  constructor(public readonly id: PlayerId) {}

  decide(state: GameState): Action {
    if (state.pendingOccupation) {
      return { type: "occupy", armies: state.pendingOccupation.max };
    }
    const me = this.id;
    const player = state.players.find((p) => p.id === me)!;

    if (state.phase === "reinforce") {
      const set = findTradeableSet(player.cards);
      if (set) return { type: "tradeCards", cardIds: set };
      if (state.pendingReinforcements > 0) {
        return { type: "place", territoryId: bestReinforceTarget(state, me), armies: state.pendingReinforcements };
      }
      return { type: "endReinforce" };
    }

    if (state.phase === "attack") {
      const atk = bestAttack(state, me);
      if (atk) return { type: "attack", from: atk.from, to: atk.to };
      return { type: "endAttack" };
    }

    const f = bestFortify(state, me);
    if (f) return { type: "fortify", from: f.from, to: f.to, armies: f.armies };
    return { type: "endTurn" };
  }
}
