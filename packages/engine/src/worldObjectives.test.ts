import { describe, expect, test } from "vitest";
import { WORLD_OBJECTIVES, assignObjectives } from "./worldObjectives.js";
import { worldMap } from "./map/worldMap.js";

describe("WORLD_OBJECTIVES", () => {
  test("every objective references real continents and has a description", () => {
    const continentIds = new Set(worldMap.continents.map((c) => c.id));
    expect(WORLD_OBJECTIVES.length).toBeGreaterThanOrEqual(6);
    for (const o of WORLD_OBJECTIVES) {
      expect(o.description.length).toBeGreaterThan(0);
      if (o.kind === "conquer-continents") {
        for (const cid of o.continentIds) expect(continentIds.has(cid)).toBe(true);
      }
    }
  });
});

describe("assignObjectives", () => {
  test("assigns one distinct objective per player, deterministically by seed", () => {
    const a = assignObjectives(["you", "ai"], 42);
    expect(a).toHaveLength(2);
    expect(a[0]!.id).not.toBe(a[1]!.id);
    const b = assignObjectives(["you", "ai"], 42);
    expect(b.map((o) => o.id)).toEqual(a.map((o) => o.id)); // deterministic
  });

  test("throws if more players than available objectives", () => {
    const tooMany = Array.from({ length: WORLD_OBJECTIVES.length + 1 }, (_, i) => `p${i}`);
    expect(() => assignObjectives(tooMany, 1)).toThrow(/not enough/i);
  });
});
