import { resolveAttack } from "./combat.js";
import { fortify } from "./fortify.js";
import { checkWin } from "./objectives.js";
import { ownedTerritoryIds, placeReinforcement, reinforcementsFor } from "./reinforce.js";
import { tradeCards } from "./cards.js";
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

  if (next.conqueredThisTurn && next.deck.length > 0) {
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
    conqueredThisTurn: false,
    lastCombat: null,
    pendingReinforcements: 0,
  };
  return { ...reinforced, pendingReinforcements: reinforcementsFor(reinforced, reinforced.players[idx]!.id) };
}

export function applyAction(state: GameState, action: Action): GameState {
  if (state.winnerId !== null) throw new Error("Game is already over");

  switch (action.type) {
    case "place":
      return placeReinforcement(state, action.territoryId, action.armies);

    case "tradeCards":
      return tradeCards(state, action.cardIds);

    case "endReinforce": {
      if (state.phase !== "reinforce") throw new Error("Not in the reinforce phase");
      if (state.pendingReinforcements !== 0) throw new Error("Must place all reinforcements first");
      return { ...state, phase: "attack" };
    }

    case "attack": {
      const after = resolveAttack(state, action.from, action.to);
      const me = after.players[after.currentPlayerIndex]!.id;
      if (checkWin(after, me)) return { ...after, winnerId: me };
      return after;
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
