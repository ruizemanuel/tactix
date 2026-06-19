import { expect, test } from "vitest";
import { WORLD_GEOMETRY } from "./worldGeometry.js";
import { worldMap } from "@teg/engine";

test("every territory has geometry and vice versa (1:1)", () => {
  const geoIds = new Set(Object.keys(WORLD_GEOMETRY));
  const mapIds = new Set(worldMap.territories.map((t) => t.id));
  expect(geoIds).toEqual(mapIds);
});

test("each geometry has a non-empty path and a numeric label anchor", () => {
  for (const t of worldMap.territories) {
    const g = WORLD_GEOMETRY[t.id]!;
    expect(typeof g.path).toBe("string");
    expect(g.path.length).toBeGreaterThan(0);
    expect(Number.isFinite(g.labelAt.x) && Number.isFinite(g.labelAt.y)).toBe(true);
  }
});

test("every territory label anchor stays inside the cropped viewBox (110..1000)", () => {
  for (const t of worldMap.territories) {
    const g = WORLD_GEOMETRY[t.id]!;
    expect(g.labelAt.x, t.id).toBeGreaterThanOrEqual(110);
    expect(g.labelAt.x, t.id).toBeLessThanOrEqual(1000);
  }
});
