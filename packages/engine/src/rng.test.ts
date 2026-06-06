import { describe, expect, test } from "vitest";
import { nextUint32, rollDice } from "./rng.js";

describe("rng", () => {
  test("is deterministic for a given seed", () => {
    const a = nextUint32(123);
    const b = nextUint32(123);
    expect(a).toEqual(b);
    expect(a.state).not.toBe(123);
  });

  test("advances state across calls", () => {
    const first = nextUint32(1);
    const second = nextUint32(first.state);
    expect(second.value).not.toBe(first.value);
  });

  test("rollDice returns n dice in 1..6 sorted descending", () => {
    const { dice, state } = rollDice(42, 3);
    expect(dice).toHaveLength(3);
    for (const d of dice) {
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(6);
    }
    expect([...dice].sort((x, y) => y - x)).toEqual(dice);
    expect(state).not.toBe(42);
  });
});
