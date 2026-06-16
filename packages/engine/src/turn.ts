import { resolveAttack } from "./combat.js";
import { fortify } from "./fortify.js";
import { checkWin } from "./objectives.js";
import { ownedTerritoryIds, placeReinforcement, reinforcementsFor } from "./reinforce.js";
import { hasTradeableSet, tradeCards } from "./cards.js";
import type { Action, GameState } from "./types.js";

function withEliminationFlags(state: GameState): GameState {
  const players = state.players.map((p) => ({
    ...p,
    alive: ownedTerritoryIds(state, p.id).length > 0,
  }));
  return { ...state, players };
}

function nextAlivePlayerIndex(state: GameState): number {
  const n = state.players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (state.currentPlayerIndex + step) % n;
    if (state.players[idx]!.alive) return idx;
  }
  return state.currentPlayerIndex;
}

function endTurn(state: GameState): GameState {
  let next = withEliminationFlags(state);

  const drawer = next.players[next.currentPlayerIndex]!;
  const required = drawer.cardTradeIns >= 3 ? 2 : 1;
  if (next.conquestsThisTurn >= required && next.deck.length > 0) {
    const [drawn, ...rest] = next.deck;
    const players = next.players.map((p, i) =>
      i === next.currentPlayerIndex ? { ...p, cards: [...p.cards, drawn!] } : p,
    );
    next = { ...next, players, deck: rest };
  }

  const idx = nextAlivePlayerIndex(next);
  const reinforced: GameState = {
    ...next,
    currentPlayerIndex: idx,
    phase: "reinforce",
    turnNumber: next.turnNumber + 1,
    conquestsThisTurn: 0,
    lastCombat: null,
    pendingReinforcements: 0,
  };
  return { ...reinforced, pendingReinforcements: reinforcementsFor(reinforced, reinforced.players[idx]!.id) };
}

export function applyAction(state: GameState, action: Action): GameState {
  if (state.winnerId !== null) throw new Error("Game is already over");
  if (state.pendingOccupation && action.type !== "occupy") {
    throw new Error("Must resolve the occupation first");
  }

  switch (action.type) {
    case "place":
      return placeReinforcement(state, action.territoryId, action.armies);

    case "tradeCards":
      return tradeCards(state, action.cardIds);

    case "endReinforce": {
      if (state.phase !== "reinforce") throw new Error("Not in the reinforce phase");
      if (state.pendingReinforcements !== 0) throw new Error("Must place all reinforcements first");
      const cur = state.players[state.currentPlayerIndex]!;
      if (cur.cards.length >= 5 && hasTradeableSet(cur.cards)) {
        throw new Error("Must trade a card set before ending reinforce (5+ cards in hand)");
      }
      return { ...state, phase: "attack" };
    }

    case "attack": {
      const after = resolveAttack(state, action.from, action.to);
      const me = after.players[after.currentPlayerIndex]!.id;
      if (checkWin(after, me)) return { ...after, winnerId: me, pendingOccupation: null };
      return after; // a conquest leaves pendingOccupation set → next action must be occupy
    }

    case "occupy": {
      if (!state.pendingOccupation) throw new Error("No occupation pending");
      const { from, to, max } = state.pendingOccupation;
      if (action.armies < 1 || action.armies > max) throw new Error("Invalid occupy amount");
      const territories = {
        ...state.territories,
        [from]: { ...state.territories[from]!, armies: state.territories[from]!.armies - action.armies },
        [to]: { ...state.territories[to]!, armies: action.armies },
      };
      return { ...state, territories, pendingOccupation: null };
    }

    case "endAttack": {
      if (state.phase !== "attack") throw new Error("Not in the attack phase");
      return { ...state, phase: "fortify" };
    }

    case "fortify":
      return fortify(state, action.from, action.to, action.armies);

    case "endTurn": {
      if (state.phase !== "fortify") throw new Error("Can only end the turn from the fortify phase");
      return endTurn(state);
    }
  }
}
