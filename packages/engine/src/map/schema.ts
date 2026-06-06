import { z } from "zod";
import type { GameMap } from "../types.js";

const continentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  bonus: z.number().int().nonnegative(),
  territoryIds: z.array(z.string().min(1)).min(1),
});

const territorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  continentId: z.string().min(1),
  adjacentTo: z.array(z.string().min(1)).min(1),
});

export const gameMapSchema = z.object({
  continents: z.array(continentSchema).min(1),
  territories: z.array(territorySchema).min(2),
});

/** Throws if the map violates structural invariants. Returns the map on success. */
export function validateMap(map: GameMap): GameMap {
  gameMapSchema.parse(map);

  const territoryIds = new Set(map.territories.map((t) => t.id));
  if (territoryIds.size !== map.territories.length) {
    throw new Error("Duplicate territory id");
  }

  const continentIds = new Set(map.continents.map((c) => c.id));
  if (continentIds.size !== map.continents.length) {
    throw new Error("Duplicate continent id");
  }

  for (const t of map.territories) {
    if (!continentIds.has(t.continentId)) {
      throw new Error(`Territory ${t.id} references unknown continent ${t.continentId}`);
    }
    if (new Set(t.adjacentTo).size !== t.adjacentTo.length) {
      throw new Error(`Territory ${t.id} has duplicate adjacency`);
    }
    for (const adj of t.adjacentTo) {
      if (!territoryIds.has(adj)) {
        throw new Error(`Territory ${t.id} adjacent to unknown ${adj}`);
      }
      if (adj === t.id) throw new Error(`Territory ${t.id} adjacent to itself`);
    }
  }

  const claimed = new Set<string>();
  for (const c of map.continents) {
    const seenInContinent = new Set<string>();
    for (const tid of c.territoryIds) {
      if (!territoryIds.has(tid)) throw new Error(`Continent ${c.id} references unknown ${tid}`);
      if (seenInContinent.has(tid)) throw new Error(`Continent ${c.id} lists territory ${tid} twice`);
      seenInContinent.add(tid);
      if (claimed.has(tid)) throw new Error(`Territory ${tid} claimed by two continents`);
      claimed.add(tid);
    }
  }
  if (claimed.size !== territoryIds.size) {
    throw new Error("Some territory is not assigned to a continent");
  }

  const adj = new Map(map.territories.map((t) => [t.id, new Set(t.adjacentTo)]));
  for (const t of map.territories) {
    for (const other of t.adjacentTo) {
      if (!adj.get(other)?.has(t.id)) {
        throw new Error(`Adjacency not symmetric: ${t.id}->${other}`);
      }
    }
  }

  const start = map.territories[0]!.id;
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const n of adj.get(cur) ?? []) {
      if (!seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  if (seen.size !== territoryIds.size) throw new Error("Map graph is not connected");

  return map;
}
