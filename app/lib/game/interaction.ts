import { neighborsOf, ownedTerritoryIds, type GameState, type PlayerId } from "@teg/engine";

export type Tap =
  | { kind: "select"; territoryId: string | null }
  | { kind: "attack"; from: string; to: string }
  | { kind: "fortify"; from: string; to: string };

/** Territories the human may tap right now, given phase + current selection. */
export function selectableTerritories(state: GameState, me: PlayerId, selected: string | null): string[] {
  const owned = ownedTerritoryIds(state, me);
  // Only selectable while reinforcements remain — at 0 pending nothing is
  // placeable, so keep territories unselectable (no selection → no stepper).
  if (state.phase === "reinforce") return state.pendingReinforcements > 0 ? owned : [];

  if (state.phase === "attack") {
    if (selected === null) {
      return owned.filter(
        (tid) =>
          state.territories[tid]!.armies >= 2 &&
          neighborsOf(state.map, tid).some((n) => state.territories[n]!.ownerId !== me),
      );
    }
    return neighborsOf(state.map, selected).filter((n) => state.territories[n]!.ownerId !== me);
  }

  // fortify
  if (selected === null) {
    return owned.filter(
      (tid) =>
        state.territories[tid]!.armies >= 2 &&
        neighborsOf(state.map, tid).some((n) => state.territories[n]!.ownerId === me),
    );
  }
  return neighborsOf(state.map, selected).filter((n) => state.territories[n]!.ownerId === me);
}

/** Translate a tap on `territoryId` into an intent the UI hands to the store. */
export function resolveTap(state: GameState, me: PlayerId, selected: string | null, territoryId: string): Tap {
  if (state.phase === "reinforce") {
    return selected === territoryId ? { kind: "select", territoryId: null } : { kind: "select", territoryId };
  }

  if (selected === territoryId) return { kind: "select", territoryId: null }; // toggle off
  if (selected === null) return { kind: "select", territoryId };

  if (state.phase === "attack") return { kind: "attack", from: selected, to: territoryId };
  return { kind: "fortify", from: selected, to: territoryId };
}
