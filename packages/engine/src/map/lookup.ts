import type { GameMap, Territory } from "../types.js";

// Memoize the id→territory index per map object (referentially transparent:
// the map is immutable, so the cache can never go stale). WeakMap lets unused
// maps be GC'd. This removes the O(n) `state.map.territories.find(...)` scans
// from the hot paths (combat, fortify, AI).
const cache = new WeakMap<GameMap, Map<string, Territory>>();

function indexOf(map: GameMap): Map<string, Territory> {
  let idx = cache.get(map);
  if (!idx) {
    idx = new Map(map.territories.map((t) => [t.id, t]));
    cache.set(map, idx);
  }
  return idx;
}

/** O(1) territory lookup by id. Throws if the id is not on the map. */
export function territoryById(map: GameMap, id: string): Territory {
  const t = indexOf(map).get(id);
  if (!t) throw new Error(`Unknown territory ${id}`);
  return t;
}

/** O(1) neighbor-id list for a territory. */
export function neighborsOf(map: GameMap, id: string): string[] {
  return territoryById(map, id).adjacentTo;
}
