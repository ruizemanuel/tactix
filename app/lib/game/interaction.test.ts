import { expect, test } from "vitest";
import { selectableTerritories, resolveTap } from "./interaction.js";
import { createGame, fixtureMap, ownedTerritoryIds, type Objective, type GameState } from "@teg/engine";

const objectives: Objective[] = [
  { id: "a", kind: "conquer-count", description: "", targetCount: 6 },
  { id: "b", kind: "conquer-count", description: "", targetCount: 6 },
];
const game = (): GameState => createGame(fixtureMap, ["you", "ai"], objectives, 7);

test("reinforce: your territories are selectable; a tap selects (placement is via the panel)", () => {
  const s = game();
  const owned = new Set(ownedTerritoryIds(s, "you"));
  expect(new Set(selectableTerritories(s, "you", null))).toEqual(owned);
  const first = ownedTerritoryIds(s, "you")[0]!;
  expect(resolveTap(s, "you", null, first)).toEqual({ kind: "select", territoryId: first });
  expect(resolveTap(s, "you", first, first)).toEqual({ kind: "select", territoryId: null });
});

test("reinforce with 0 pending reinforcements: nothing is selectable (a tap can't dispatch place(0))", () => {
  const s = { ...game(), pendingReinforcements: 0 };
  expect(selectableTerritories(s, "you", null)).toEqual([]);
});

test("attack with no selection: only your territories with 2+ armies adjacent to an enemy are selectable", () => {
  let s = game();
  // Force a known attack-phase board: you own n3 with 5 armies next to ai's s1.
  const territories = Object.fromEntries(fixtureMap.territories.map((t) => [t.id, { ownerId: "ai", armies: 1 }]));
  territories.n3 = { ownerId: "you", armies: 5 };
  territories.n1 = { ownerId: "you", armies: 1 };
  s = { ...s, territories, phase: "attack" };
  expect(selectableTerritories(s, "you", null)).toEqual(["n3"]); // n1 has 1 army → not selectable
  const tap = resolveTap(s, "you", null, "n3");
  expect(tap).toEqual({ kind: "select", territoryId: "n3" });
});

test("attack with a selected 'from': adjacent enemies are selectable and a tap is an 'attack' intent", () => {
  let s = game();
  const territories = Object.fromEntries(fixtureMap.territories.map((t) => [t.id, { ownerId: "ai", armies: 1 }]));
  territories.n3 = { ownerId: "you", armies: 5 };
  s = { ...s, territories, phase: "attack" };
  expect(new Set(selectableTerritories(s, "you", "n3"))).toEqual(new Set(["n1", "n2", "s1"]));
  expect(resolveTap(s, "you", "n3", "s1")).toEqual({ kind: "attack", from: "n3", to: "s1" });
  // Tapping the selected node again deselects.
  expect(resolveTap(s, "you", "n3", "n3")).toEqual({ kind: "select", territoryId: null });
});
