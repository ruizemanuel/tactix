import { describe, expect, test } from "vitest";
import { resolveAttack } from "./combat.js";
import type { GameState } from "./types.js";
import { fixtureMap } from "./map/fixture.js";

function attackState(fromArmies: number, toArmies: number, seed: number): GameState {
  const territories = Object.fromEntries(
    fixtureMap.territories.map((t) => [t.id, { ownerId: "B", armies: 1 }]),
  );
  territories.n3 = { ownerId: "A", armies: fromArmies };
  territories.s1 = { ownerId: "B", armies: toArmies }; // n3<->s1 are adjacent
  return {
    map: fixtureMap,
    players: [
      { id: "A", alive: true, cards: [], objectiveId: "x", cardTradeIns: 0 },
      { id: "B", alive: true, cards: [], objectiveId: "y", cardTradeIns: 0 },
    ],
    territories,
    objectives: {},
    currentPlayerIndex: 0,
    phase: "attack",
    turnNumber: 1,
    pendingReinforcements: 0,
    conquestsThisTurn: 0,
    deck: [],
    rngState: seed,
    lastCombat: null,
    winnerId: null,
  };
}

describe("resolveAttack", () => {
  test("losses are conserved and bounded by dice compared", () => {
    const s = attackState(5, 3, 99);
    const next = resolveAttack(s, "n3", "s1");
    const lc = next.lastCombat!;
    const pairs = Math.min(lc.attackerDice.length, lc.defenderDice.length);
    expect(lc.attackerLosses + lc.defenderLosses).toBe(pairs);
    const totalBefore = s.territories.n3!.armies + s.territories.s1!.armies;
    const totalAfter = next.territories.n3!.armies + next.territories.s1!.armies;
    expect(totalAfter).toBe(totalBefore - pairs);
  });

  test("conquest transfers ownership and moves armies in", () => {
    let s = attackState(8, 1, 7);
    let guard = 0;
    while (s.territories.s1!.ownerId === "B" && guard < 50) {
      s = resolveAttack(s, "n3", "s1");
      guard++;
    }
    expect(s.territories.s1!.ownerId).toBe("A");
    expect(s.territories.s1!.armies).toBeGreaterThanOrEqual(1);
    expect(s.lastCombat!.conquered).toBe(true);
  });

  test("is deterministic for a given seed", () => {
    const a = resolveAttack(attackState(5, 3, 1234), "n3", "s1");
    const b = resolveAttack(attackState(5, 3, 1234), "n3", "s1");
    expect(a.territories).toEqual(b.territories);
    expect(a.lastCombat).toEqual(b.lastCombat);
  });

  test("throws when attacking with fewer than 2 armies", () => {
    expect(() => resolveAttack(attackState(1, 3, 1), "n3", "s1")).toThrow(/at least 2/);
  });

  test("throws when territories are not adjacent", () => {
    const s = attackState(5, 3, 1);
    expect(() => resolveAttack(s, "n3", "i3")).toThrow(/adjacent/);
  });

  test("throws when attacking own territory", () => {
    const s = attackState(5, 3, 1);
    s.territories.s1 = { ownerId: "A", armies: 3 };
    expect(() => resolveAttack(s, "n3", "s1")).toThrow(/own territory/);
  });

  test("throws outside the attack phase", () => {
    const s = { ...attackState(5, 3, 1), phase: "reinforce" as const };
    expect(() => resolveAttack(s, "n3", "s1")).toThrow(/attack phase/);
  });
});
