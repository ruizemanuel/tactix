import { describe, expect, test } from "vitest";
import { isValidSet, tradeBonus, tradeCards } from "./cards.js";
import type { Card, GameState } from "./types.js";

const cards: Card[] = [
  { id: "c1", territoryId: "n1", symbol: "globo" },
  { id: "c2", territoryId: "n2", symbol: "canon" },
  { id: "c3", territoryId: "n3", symbol: "barco" },
  { id: "c4", territoryId: "s1", symbol: "globo" },
  { id: "c5", territoryId: "s2", symbol: "globo" },
];

function stateWithCards(hand: Card[], tradeIns = 0): GameState {
  return {
    map: { continents: [], territories: [] },
    players: [{ id: "A", alive: true, cards: hand, objectiveId: "x", cardTradeIns: tradeIns }],
    territories: {},
    objectives: {},
    currentPlayerIndex: 0,
    phase: "reinforce",
    turnNumber: 1,
    pendingReinforcements: 3,
    conquestsThisTurn: 0,
    deck: [],
    rngState: 1,
    lastCombat: null,
    pendingOccupation: null,
    winnerId: null,
  };
}

describe("isValidSet", () => {
  test("all different symbols is valid", () => {
    expect(isValidSet([cards[0]!, cards[1]!, cards[2]!])).toBe(true);
  });
  test("all same symbol is valid", () => {
    expect(isValidSet([cards[0]!, cards[3]!, cards[4]!])).toBe(true);
  });
  test("two same one different is invalid", () => {
    expect(isValidSet([cards[0]!, cards[1]!, cards[3]!])).toBe(false);
  });
  test("not exactly three is invalid", () => {
    expect(isValidSet([cards[0]!, cards[1]!])).toBe(false);
  });
  test("a joker completes any pair (two same)", () => {
    const joker: Card = { id: "j", territoryId: "", symbol: "joker" };
    expect(isValidSet([cards[0]!, cards[3]!, joker])).toBe(true); // globo, globo, joker
  });
  test("a joker completes any pair (two different)", () => {
    const joker: Card = { id: "j", territoryId: "", symbol: "joker" };
    expect(isValidSet([cards[0]!, cards[1]!, joker])).toBe(true); // globo, canon, joker
  });
  test("two jokers plus one is valid", () => {
    const j1: Card = { id: "j1", territoryId: "", symbol: "joker" };
    const j2: Card = { id: "j2", territoryId: "", symbol: "joker" };
    expect(isValidSet([cards[0]!, j1, j2])).toBe(true);
  });
});

describe("tradeBonus", () => {
  test("follows the TEG progression 4, 7, 10, then +5 (15, 20, 25, …)", () => {
    expect([0, 1, 2, 3, 4, 5].map(tradeBonus)).toEqual([4, 7, 10, 15, 20, 25]);
  });
});

describe("tradeCards", () => {
  test("first trade grants 4 armies and removes the cards", () => {
    const s = stateWithCards([cards[0]!, cards[1]!, cards[2]!]);
    const next = tradeCards(s, ["c1", "c2", "c3"]);
    expect(next.pendingReinforcements).toBe(7); // 3 + 4
    expect(next.players[0]!.cards).toHaveLength(0);
    expect(next.players[0]!.cardTradeIns).toBe(1);
  });

  test("second trade grants 7 armies (TEG progression)", () => {
    const s = stateWithCards([cards[0]!, cards[3]!, cards[4]!], 1);
    const next = tradeCards(s, ["c1", "c4", "c5"]);
    expect(next.pendingReinforcements).toBe(10); // 3 + 7
  });

  test("throws on an invalid set", () => {
    const s = stateWithCards([cards[0]!, cards[1]!, cards[3]!]);
    expect(() => tradeCards(s, ["c1", "c2", "c4"])).toThrow(/valid set/);
  });

  test("throws if a card is not in hand", () => {
    const s = stateWithCards([cards[0]!, cards[1]!, cards[2]!]);
    expect(() => tradeCards(s, ["c1", "c2", "c5"])).toThrow(/not in hand/);
  });

  test("throws outside the reinforce phase", () => {
    const s = { ...stateWithCards([cards[0]!, cards[1]!, cards[2]!]), phase: "attack" as const };
    expect(() => tradeCards(s, ["c1", "c2", "c3"])).toThrow(/reinforce/);
  });

  test("does not mutate the input state", () => {
    const s = stateWithCards([cards[0]!, cards[1]!, cards[2]!]);
    const before = s.players[0]!.cards.length;
    const beforePending = s.pendingReinforcements;
    tradeCards(s, ["c1", "c2", "c3"]);
    expect(s.players[0]!.cards).toHaveLength(before);
    expect(s.pendingReinforcements).toBe(beforePending);
  });

  test("throws on duplicate card ids (cannot trade a 2-card hand as three)", () => {
    const s = stateWithCards([cards[0]!, cards[3]!]); // c1 globo, c4 globo
    expect(() => tradeCards(s, ["c1", "c1", "c4"])).toThrow(/3 distinct/i);
  });
});
