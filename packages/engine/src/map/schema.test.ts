import { describe, expect, test } from "vitest";
import { validateMap } from "./schema.js";
import { fixtureMap } from "./fixture.js";

describe("validateMap", () => {
  test("accepts the fixture map", () => {
    expect(() => validateMap(fixtureMap)).not.toThrow();
  });

  test("rejects asymmetric adjacency", () => {
    const broken = structuredClone(fixtureMap);
    broken.territories[0]!.adjacentTo = ["n2", "n3", "i3"]; // n1->i3 but not i3->n1
    expect(() => validateMap(broken)).toThrow(/symmetric/);
  });

  test("rejects a disconnected graph", () => {
    const broken = structuredClone(fixtureMap);
    broken.territories[5]!.adjacentTo = ["s1", "s2"];
    broken.territories[6]!.adjacentTo = ["i2"];
    expect(() => validateMap(broken)).toThrow(/connected/);
  });

  test("rejects a territory in two continents", () => {
    const broken = structuredClone(fixtureMap);
    broken.continents[0]!.territoryIds = ["n1", "n2", "n3", "s1"];
    expect(() => validateMap(broken)).toThrow(/two continents/);
  });
});
