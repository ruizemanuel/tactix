import { rollDice } from "./rng.js";
import type { CombatResult, GameState } from "./types.js";
import { territoryById } from "./map/lookup.js";

export function resolveAttack(state: GameState, from: string, to: string): GameState {
  if (state.phase !== "attack") throw new Error("Can only attack in the attack phase");
  const fromTs = state.territories[from];
  const toTs = state.territories[to];
  if (!fromTs || !toTs) throw new Error("Unknown territory");

  const current = state.players[state.currentPlayerIndex]!;
  if (fromTs.ownerId !== current.id) throw new Error(`Attacker must own ${from}`);
  if (toTs.ownerId === current.id) throw new Error("Cannot attack own territory");
  if (fromTs.armies < 2) throw new Error("Need at least 2 armies to attack");

  const fromDef = territoryById(state.map, from);
  if (!fromDef.adjacentTo.includes(to)) throw new Error(`${from} and ${to} are not adjacent`);

  const attackerCount = Math.min(3, fromTs.armies - 1);
  const defenderCount = Math.min(3, toTs.armies);

  const a = rollDice(state.rngState, attackerCount);
  const d = rollDice(a.state, defenderCount);

  const pairs = Math.min(attackerCount, defenderCount);
  let attackerLosses = 0;
  let defenderLosses = 0;
  for (let i = 0; i < pairs; i++) {
    if (a.dice[i]! > d.dice[i]!) defenderLosses++;
    else attackerLosses++; // ties favour the defender
  }

  const newFromArmies = fromTs.armies - attackerLosses;
  const newToArmies = toTs.armies - defenderLosses;
  const territories = { ...state.territories };
  let conquered = false;

  if (newToArmies <= 0) {
    conquered = true;
    // Ownership transfers now with 0 armies; the player chooses the move via `occupy`.
    territories[from] = { ...fromTs, armies: newFromArmies };
    territories[to] = { ownerId: current.id, armies: 0 };
  } else {
    territories[from] = { ...fromTs, armies: newFromArmies };
    territories[to] = { ...toTs, armies: newToArmies };
  }

  const lastCombat: CombatResult = {
    from,
    to,
    attackerDice: a.dice,
    defenderDice: d.dice,
    attackerLosses,
    defenderLosses,
    conquered,
  };

  const max = conquered ? Math.min(3, newFromArmies - 1) : 0;
  const pendingOccupation = conquered && max >= 1 ? { from, to, max } : null;

  return {
    ...state,
    territories,
    rngState: d.state,
    lastCombat,
    conquestsThisTurn: state.conquestsThisTurn + (conquered ? 1 : 0),
    pendingOccupation,
  };
}
