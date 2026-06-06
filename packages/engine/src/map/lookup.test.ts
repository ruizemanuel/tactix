import { describe, expect, test } from "vitest";
import { territoryById, neighborsOf } from "./lookup.js";
import { fixtureMap } from "./fixture.js";

describe("territoryById", () => {
  test("returns the territory with the given id", () => {
    expect(territoryById(fixtureMap, "n3").name).toBe("N3");
  });

  test("throws on an unknown id", () => {
    expect(() => territoryById(fixtureMap, "zz")).toThrow(/Unknown territory/);
  });

  test("returns the same memoized index object across calls (same map)", () => {
    const a = territoryById(fixtureMap, "n1");
    const b = territoryById(fixtureMap, "n1");
    expect(a).toBe(b);
  });
});

describe("neighborsOf", () => {
  test("returns a territory's adjacency list", () => {
    expect(new Set(neighborsOf(fixtureMap, "n3"))).toEqual(new Set(["n1", "n2", "s1"]));
  });
});
