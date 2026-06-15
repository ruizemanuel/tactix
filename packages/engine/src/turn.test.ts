import { describe, expect, test } from "vitest";
import { applyAction } from "./turn.js";
import { createGame } from "./setup.js";
import { fixtureMap } from "./map/fixture.js";
import type { GameState, Objective } from "./types.js";

const objectives: Objective[] = [
  { id: "o-a", kind: "conquer-count", description: "own 9", targetCount: 9 },
  { id: "o-b", kind: "conquer-count", description: "own 9", targetCount: 9 },
];

function freshReinforceState(): GameState {
  return createGame(fixtureMap, ["A", "B"], objectives, 7);
}

describe("applyAction — phase transitions", () => {
  test("place then endReinforce requires zero pending and moves to attack", () => {
    let s = freshReinforceState();
    const owned = Object.entries(s.territories).find(([, t]) => t.ownerId === "A")![0];
    s = applyAction(s, { type: "place", territoryId: owned, armies: s.pendingReinforcements });
    expect(s.pendingReinforcements).toBe(0);
    s = applyAction(s, { type: "endReinforce" });
    expect(s.phase).toBe("attack");
  });

  test("endReinforce throws while reinforcements remain", () => {
    const s = freshReinforceState();
    expect(() => applyAction(s, { type: "endReinforce" })).toThrow(/place all/i);
  });

  test("endAttack moves to fortify; endTurn advances to next player and reinforces", () => {
    let s = freshReinforceState();
    const owned = Object.entries(s.territories).find(([, t]) => t.ownerId === "A")![0];
    s = applyAction(s, { type: "place", territoryId: owned, armies: s.pendingReinforcements });
    s = applyAction(s, { type: "endReinforce" });
    s = applyAction(s, { type: "endAttack" });
    expect(s.phase).toBe("fortify");
    s = applyAction(s, { type: "endTurn" });
    expect(s.phase).toBe("reinforce");
    expect(s.currentPlayerIndex).toBe(1);
    expect(s.pendingReinforcements).toBeGreaterThanOrEqual(3);
    expect(s.turnNumber).toBe(2);
  });

  test("a player who conquered draws a card on endTurn", () => {
    let s = freshReinforceState();
    s = { ...s, phase: "fortify", conquestsThisTurn: 1 };
    const handBefore = s.players[0]!.cards.length;
    const deckBefore = s.deck.length;
    s = applyAction(s, { type: "endTurn" });
    expect(s.players[0]!.cards.length).toBe(handBefore + 1);
    expect(s.deck.length).toBe(deckBefore - 1);
  });

  test("winning attack sets winnerId", () => {
    let s = freshReinforceState();
    const territories = Object.fromEntries(
      fixtureMap.territories.map((t) => [t.id, { ownerId: "A", armies: 2 }]),
    );
    territories.s1 = { ownerId: "B", armies: 1 };
    territories.n3 = { ownerId: "A", armies: 5 };
    s = { ...s, territories, phase: "attack" };
    let guard = 0;
    while (s.winnerId === null && guard < 50) {
      s = applyAction(s, { type: "attack", from: "n3", to: "s1" });
      guard++;
    }
    expect(s.winnerId).toBe("A");
  });
});

describe("card-draw threshold (2 conquests after 3 trades)", () => {
  function fortifyWith(conquests: number, tradeIns: number): GameState {
    const s = freshReinforceState();
    const players = s.players.map((p, i) => (i === 0 ? { ...p, cardTradeIns: tradeIns } : p));
    return { ...s, players, phase: "fortify", conquestsThisTurn: conquests };
  }

  test("draws with 1 conquest when fewer than 3 trades done", () => {
    const s = fortifyWith(1, 2);
    const before = s.players[0]!.cards.length;
    const next = applyAction(s, { type: "endTurn" });
    expect(next.players[0]!.cards.length).toBe(before + 1);
  });

  test("after 3 trades, 1 conquest is NOT enough to draw", () => {
    const s = fortifyWith(1, 3);
    const before = s.players[0]!.cards.length;
    const next = applyAction(s, { type: "endTurn" });
    expect(next.players[0]!.cards.length).toBe(before);
  });

  test("after 3 trades, 2 conquests draws", () => {
    const s = fortifyWith(2, 3);
    const before = s.players[0]!.cards.length;
    const next = applyAction(s, { type: "endTurn" });
    expect(next.players[0]!.cards.length).toBe(before + 1);
  });

  test("conquestsThisTurn resets to 0 after endTurn", () => {
    const s = fortifyWith(2, 0);
    const next = applyAction(s, { type: "endTurn" });
    expect(next.conquestsThisTurn).toBe(0);
  });
});

describe("occupy (conquest-move choice)", () => {
  function conqueredState(): GameState {
    let s = freshReinforceState();
    const territories = Object.fromEntries(
      Object.keys(s.territories).map((id) => [id, { ownerId: "A", armies: 2 }]),
    ) as GameState["territories"];
    territories.s1 = { ownerId: "B", armies: 1 };
    territories.n3 = { ownerId: "A", armies: 8 };
    s = { ...s, territories, phase: "attack" };
    let guard = 0;
    while (s.pendingOccupation === null && s.winnerId === null && guard < 50) {
      s = applyAction(s, { type: "attack", from: "n3", to: "s1" });
      guard++;
    }
    return s;
  }

  test("a conquest blocks every action except occupy", () => {
    const s = conqueredState();
    if (s.winnerId !== null) return;
    expect(s.pendingOccupation).not.toBeNull();
    expect(() => applyAction(s, { type: "endAttack" })).toThrow(/occupation/i);
    expect(() => applyAction(s, { type: "attack", from: "n3", to: "s2" })).toThrow(/occupation/i);
  });

  test("occupy moves the chosen armies and clears the pending state", () => {
    const s = conqueredState();
    if (s.winnerId !== null) return;
    const from = s.pendingOccupation!.from;
    const to = s.pendingOccupation!.to;
    const fromBefore = s.territories[from]!.armies;
    const next = applyAction(s, { type: "occupy", armies: 1 });
    expect(next.pendingOccupation).toBeNull();
    expect(next.territories[to]!.armies).toBe(1);
    expect(next.territories[from]!.armies).toBe(fromBefore - 1);
  });

  test("occupy rejects an out-of-range amount", () => {
    const s = conqueredState();
    if (s.winnerId !== null) return;
    const max = s.pendingOccupation!.max;
    expect(() => applyAction(s, { type: "occupy", armies: 0 })).toThrow(/occupy/i);
    expect(() => applyAction(s, { type: "occupy", armies: max + 1 })).toThrow(/occupy/i);
  });

  test("occupy with no pending occupation throws", () => {
    const s = freshReinforceState();
    expect(() => applyAction(s, { type: "occupy", armies: 1 })).toThrow(/no occupation/i);
  });
});
