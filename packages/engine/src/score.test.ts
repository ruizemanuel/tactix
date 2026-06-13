import { describe, it, expect } from "vitest";
import { computeScore } from "./score.js";

describe("computeScore (§6.6, floored at 0)", () => {
  it("sums win + continents*100 + territories*5 - turns*2", () => {
    expect(computeScore({ won: true, continents: 2, territories: 20, turnsUsed: 10 })).toBe(1280);
  });
  it("floors a long loss at 0", () => {
    expect(computeScore({ won: false, continents: 0, territories: 1, turnsUsed: 100 })).toBe(0);
  });
  it("a loss can still score above 0", () => {
    expect(computeScore({ won: false, continents: 1, territories: 10, turnsUsed: 5 })).toBe(140);
  });
});
