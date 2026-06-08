import { describe, expect, test } from "vitest";
import { worldMap } from "./worldMap.js";
import { validateMap } from "./schema.js";

describe("worldMap", () => {
  test("passes structural validation (symmetric + connected + full continent coverage)", () => {
    expect(() => validateMap(worldMap)).not.toThrow();
  });
  test("has 32 territories across 6 continents", () => {
    expect(worldMap.territories).toHaveLength(32);
    expect(worldMap.continents).toHaveLength(6);
  });
  test("declares a common objective target", () => {
    expect(worldMap.commonObjectiveTarget).toBe(20);
  });
});
