import { describe, expect, test } from "vitest";
import { validateMap } from "./schema.js";
import { fixtureMap } from "./fixture.js";
import type { GameMap } from "../types.js";

// Deep clone via JSON (the map is plain serializable data) — keeps the engine's
// type surface free of DOM/node libs that `structuredClone` would require.
const clone = (map: GameMap): GameMap => JSON.parse(JSON.stringify(map)) as GameMap;

describe("validateMap", () => {
  test("accepts the fixture map", () => {
    expect(() => validateMap(fixtureMap)).not.toThrow();
  });

  test("rejects asymmetric adjacency", () => {
    const broken = clone(fixtureMap);
    broken.territories[0]!.adjacentTo = ["n2", "n3", "i3"]; // n1->i3 but not i3->n1
    expect(() => validateMap(broken)).toThrow(/symmetric/);
  });

  test("rejects a disconnected graph", () => {
    const broken = clone(fixtureMap);
    broken.territories[5]!.adjacentTo = ["s1", "s2"];
    broken.territories[6]!.adjacentTo = ["i2"];
    expect(() => validateMap(broken)).toThrow(/connected/);
  });

  test("rejects a territory in two continents", () => {
    const broken = clone(fixtureMap);
    broken.continents[0]!.territoryIds = ["n1", "n2", "n3", "s1"];
    expect(() => validateMap(broken)).toThrow(/two continents/);
  });
});
