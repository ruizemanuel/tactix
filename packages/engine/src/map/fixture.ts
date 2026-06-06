import type { GameMap } from "../types.js";

/**
 * Complete 9-territory test map: 3 continents.
 *  north (bonus 2): n1-n2-n3 (triangle)
 *  south (bonus 2): s1-s2-s3 (triangle)
 *  islands (bonus 1): i1-i2-i3 (chain)
 * Bridges: n3<->s1, s3<->i1. Connected & symmetric.
 */
export const fixtureMap: GameMap = {
  continents: [
    { id: "north", name: "North", bonus: 2, territoryIds: ["n1", "n2", "n3"] },
    { id: "south", name: "South", bonus: 2, territoryIds: ["s1", "s2", "s3"] },
    { id: "islands", name: "Islands", bonus: 1, territoryIds: ["i1", "i2", "i3"] },
  ],
  territories: [
    { id: "n1", name: "N1", continentId: "north", adjacentTo: ["n2", "n3"] },
    { id: "n2", name: "N2", continentId: "north", adjacentTo: ["n1", "n3"] },
    { id: "n3", name: "N3", continentId: "north", adjacentTo: ["n1", "n2", "s1"] },
    { id: "s1", name: "S1", continentId: "south", adjacentTo: ["s2", "s3", "n3"] },
    { id: "s2", name: "S2", continentId: "south", adjacentTo: ["s1", "s3"] },
    { id: "s3", name: "S3", continentId: "south", adjacentTo: ["s1", "s2", "i1"] },
    { id: "i1", name: "I1", continentId: "islands", adjacentTo: ["i2", "s3"] },
    { id: "i2", name: "I2", continentId: "islands", adjacentTo: ["i1", "i3"] },
    { id: "i3", name: "I3", continentId: "islands", adjacentTo: ["i2"] },
  ],
};
