import { describe, expect, test } from "vitest";
import { applyAction } from "./turn.js";
import { createGame } from "./setup.js";
import { fixtureMap } from "./map/fixture.js";
import { ownedTerritoryIds } from "./reinforce.js";
import type { GameState, Objective, Card } from "./types.js";

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

describe("forced trade (max 5 cards)", () => {
  function reinforceWithCards(hand: GameState["players"][number]["cards"]): GameState {
    const s = freshReinforceState();
    const players = s.players.map((p, i) => (i === 0 ? { ...p, cards: hand } : p));
    // pendingReinforcements must be 0 so endReinforce's only blocker is the forced trade.
    return { ...s, players, pendingReinforcements: 0 };
  }

  test("endReinforce is blocked with 5+ cards and a valid set", () => {
    const hand = [
      { id: "a", territoryId: "n1", symbol: "globo" as const },
      { id: "b", territoryId: "n2", symbol: "globo" as const },
      { id: "c", territoryId: "n3", symbol: "globo" as const },
      { id: "d", territoryId: "s1", symbol: "canon" as const },
      { id: "e", territoryId: "s2", symbol: "barco" as const },
    ];
    const s = reinforceWithCards(hand);
    expect(() => applyAction(s, { type: "endReinforce" })).toThrow(/trade/i);
  });

  test("endReinforce is allowed with fewer than 5 cards and no valid set", () => {
    // With only 3 non-joker symbols (globo/canon/barco), 5+ cards always contain a valid set
    // (pigeonhole: ≥3 of one symbol, or at least one globo+canon+barco trio).
    // Test the no-set branch with 4 cards using only 2 symbols (no trio possible).
    const hand = [
      { id: "a", territoryId: "n1", symbol: "globo" as const },
      { id: "b", territoryId: "n2", symbol: "globo" as const },
      { id: "c", territoryId: "n3", symbol: "canon" as const },
      { id: "d", territoryId: "s1", symbol: "canon" as const },
    ];
    // 2 globo + 2 canon: no trio (2+1 or 1+2 only) and no 3-diff → no valid set.
    const s = reinforceWithCards(hand);
    const next = applyAction(s, { type: "endReinforce" });
    expect(next.phase).toBe("attack");
  });

  test("endReinforce is allowed with fewer than 5 cards even with a set", () => {
    const hand = [
      { id: "a", territoryId: "n1", symbol: "globo" as const },
      { id: "b", territoryId: "n2", symbol: "globo" as const },
      { id: "c", territoryId: "n3", symbol: "globo" as const },
    ];
    const s = reinforceWithCards(hand);
    const next = applyAction(s, { type: "endReinforce" });
    expect(next.phase).toBe("attack");
  });

  test("forced trade: endReinforce throws at 5 cards with a set, succeeds after trading", () => {
    const card = (id: string, symbol: Card["symbol"]): Card => ({ id, territoryId: id, symbol });
    const base = createGame(fixtureMap, ["you", "ai"], objectives, 7);
    const cards = [card("a", "globo"), card("b", "canon"), card("c", "barco"), card("d", "globo"), card("e", "globo")];
    const state = {
      ...base,
      phase: "reinforce" as const,
      pendingReinforcements: 0,
      players: base.players.map((p, i) => (i === base.currentPlayerIndex ? { ...p, cards } : p)),
    };

    // 5 cards + a set + 0 pending → must trade before ending reinforce.
    expect(() => applyAction(state, { type: "endReinforce" })).toThrow(/trade a card set/i);

    // Trade the first valid set → reinforcements granted.
    const traded = applyAction(state, { type: "tradeCards", cardIds: ["a", "b", "c"] });
    expect(traded.pendingReinforcements).toBeGreaterThan(0);

    // Place them, then endReinforce now succeeds (hand back under 5).
    const owned = ownedTerritoryIds(traded, "you")[0]!;
    const placed = applyAction(traded, { type: "place", territoryId: owned, armies: traded.pendingReinforcements });
    const ended = applyAction(placed, { type: "endReinforce" });
    expect(ended.phase).toBe("attack");
  });
});
