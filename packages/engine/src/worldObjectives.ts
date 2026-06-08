import { nextInt } from "./rng.js";
import type { Objective } from "./types.js";

/** Tailored secret objectives for the 32-territory worldMap (6 continents). */
export const WORLD_OBJECTIVES: Objective[] = [
  { id: "obj-americas", kind: "conquer-continents", description: "Hold all of North and South America", continentIds: ["n-america", "s-america"], extraTerritories: 0 },
  { id: "obj-sa-africa", kind: "conquer-continents", description: "Hold all of South America and Africa", continentIds: ["s-america", "africa"], extraTerritories: 0 },
  { id: "obj-asia", kind: "conquer-continents", description: "Hold all of Asia", continentIds: ["asia"], extraTerritories: 0 },
  { id: "obj-na-plus", kind: "conquer-continents", description: "Hold North America and 4 more territories", continentIds: ["n-america"], extraTerritories: 4 },
  { id: "obj-eu-oce", kind: "conquer-continents", description: "Hold Europe, Oceania and 2 more territories", continentIds: ["europe", "oceania"], extraTerritories: 2 },
  { id: "obj-af-oce", kind: "conquer-continents", description: "Hold Africa, Oceania and 4 more territories", continentIds: ["africa", "oceania"], extraTerritories: 4 },
  { id: "obj-hold-18", kind: "conquer-count", description: "Hold 18 territories anywhere", targetCount: 18 },
];

/** Seeded shuffle (Fisher–Yates using the engine's nextInt) → distinct objective per player. */
export function assignObjectives(playerIds: string[], seed: number): Objective[] {
  if (playerIds.length > WORLD_OBJECTIVES.length) {
    throw new Error("Not enough world objectives for the number of players");
  }
  const pool = [...WORLD_OBJECTIVES];
  let s = seed;
  for (let i = pool.length - 1; i > 0; i--) {
    const r = nextInt(s, i + 1);
    s = r.state;
    const tmp = pool[i]!;
    pool[i] = pool[r.value]!;
    pool[r.value] = tmp;
  }
  return playerIds.map((_, i) => pool[i]!);
}
