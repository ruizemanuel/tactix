import type { GameMap } from "../types.js";

/**
 * Original real-world map: 32 country-level territories in 6 continents.
 * Territory ids are stable keys; names are real place names. Bridges (cross-water
 * adjacencies) mirror the genre (e.g. greenland↔britain, usa↔russia, argentina↔australia).
 */
export const worldMap: GameMap = {
  commonObjectiveTarget: 20,
  continents: [
    { id: "n-america", name: "North America", bonus: 5, territoryIds: ["greenland", "canada", "usa", "mexico", "central-america", "caribbean"] },
    { id: "s-america", name: "South America", bonus: 3, territoryIds: ["colombia", "brazil", "peru", "argentina"] },
    { id: "europe", name: "Europe", bonus: 5, territoryIds: ["britain", "scandinavia", "west-europe", "central-europe", "east-europe"] },
    { id: "africa", name: "Africa", bonus: 3, territoryIds: ["north-africa", "egypt", "congo", "east-africa", "south-africa"] },
    { id: "asia", name: "Asia", bonus: 7, territoryIds: ["middle-east", "india", "central-asia", "russia", "china", "mongolia", "japan", "southeast-asia"] },
    { id: "oceania", name: "Oceania", bonus: 2, territoryIds: ["indonesia", "new-guinea", "australia", "new-zealand"] },
  ],
  territories: [
    { id: "greenland", name: "Greenland", continentId: "n-america", adjacentTo: ["canada", "britain"] },
    { id: "canada", name: "Canada", continentId: "n-america", adjacentTo: ["greenland", "usa"] },
    { id: "usa", name: "United States", continentId: "n-america", adjacentTo: ["canada", "mexico", "caribbean", "russia"] },
    { id: "mexico", name: "Mexico", continentId: "n-america", adjacentTo: ["usa", "central-america"] },
    { id: "central-america", name: "Central America", continentId: "n-america", adjacentTo: ["mexico", "caribbean", "colombia"] },
    { id: "caribbean", name: "Caribbean", continentId: "n-america", adjacentTo: ["central-america", "usa", "colombia"] },
    { id: "colombia", name: "Colombia", continentId: "s-america", adjacentTo: ["brazil", "peru", "central-america", "caribbean"] },
    { id: "brazil", name: "Brazil", continentId: "s-america", adjacentTo: ["colombia", "peru", "argentina", "north-africa"] },
    { id: "peru", name: "Peru", continentId: "s-america", adjacentTo: ["colombia", "brazil", "argentina"] },
    { id: "argentina", name: "Argentina", continentId: "s-america", adjacentTo: ["brazil", "peru", "australia"] },
    { id: "britain", name: "Britain", continentId: "europe", adjacentTo: ["greenland", "scandinavia", "west-europe"] },
    { id: "scandinavia", name: "Scandinavia", continentId: "europe", adjacentTo: ["britain", "central-europe", "east-europe"] },
    { id: "west-europe", name: "Western Europe", continentId: "europe", adjacentTo: ["britain", "central-europe", "north-africa"] },
    { id: "central-europe", name: "Central Europe", continentId: "europe", adjacentTo: ["scandinavia", "west-europe", "east-europe"] },
    { id: "east-europe", name: "Eastern Europe", continentId: "europe", adjacentTo: ["scandinavia", "central-europe", "middle-east", "central-asia"] },
    { id: "north-africa", name: "North Africa", continentId: "africa", adjacentTo: ["brazil", "west-europe", "egypt", "congo", "east-africa"] },
    { id: "egypt", name: "Egypt", continentId: "africa", adjacentTo: ["north-africa", "east-africa", "middle-east"] },
    { id: "congo", name: "Congo", continentId: "africa", adjacentTo: ["north-africa", "east-africa", "south-africa"] },
    { id: "east-africa", name: "East Africa", continentId: "africa", adjacentTo: ["north-africa", "egypt", "congo", "south-africa"] },
    { id: "south-africa", name: "South Africa", continentId: "africa", adjacentTo: ["congo", "east-africa"] },
    { id: "middle-east", name: "Middle East", continentId: "asia", adjacentTo: ["east-europe", "egypt", "india", "central-asia"] },
    { id: "india", name: "India", continentId: "asia", adjacentTo: ["middle-east", "central-asia", "china", "southeast-asia"] },
    { id: "central-asia", name: "Central Asia", continentId: "asia", adjacentTo: ["east-europe", "middle-east", "india", "russia", "china"] },
    { id: "russia", name: "Russia", continentId: "asia", adjacentTo: ["usa", "central-asia", "china", "mongolia", "japan"] },
    { id: "china", name: "China", continentId: "asia", adjacentTo: ["india", "central-asia", "russia", "mongolia", "southeast-asia"] },
    { id: "mongolia", name: "Mongolia", continentId: "asia", adjacentTo: ["russia", "china", "japan"] },
    { id: "japan", name: "Japan", continentId: "asia", adjacentTo: ["russia", "mongolia"] },
    { id: "southeast-asia", name: "Southeast Asia", continentId: "asia", adjacentTo: ["india", "china", "indonesia"] },
    { id: "indonesia", name: "Indonesia", continentId: "oceania", adjacentTo: ["southeast-asia", "new-guinea", "australia"] },
    { id: "new-guinea", name: "New Guinea", continentId: "oceania", adjacentTo: ["indonesia", "australia"] },
    { id: "australia", name: "Australia", continentId: "oceania", adjacentTo: ["argentina", "indonesia", "new-guinea", "new-zealand"] },
    { id: "new-zealand", name: "New Zealand", continentId: "oceania", adjacentTo: ["australia"] },
  ],
};
