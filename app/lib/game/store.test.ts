import { beforeEach, expect, test } from "vitest";
import { useGame } from "./store.js";
import { ownedTerritoryIds } from "@teg/engine";

function fresh() {
  useGame.getState().newGame(42);
}

beforeEach(() => fresh());

test("newGame starts a 2-player game with you to move in reinforce", () => {
  const s = useGame.getState();
  expect(s.state).not.toBeNull();
  expect(s.state!.players.map((p) => p.id)).toEqual(["you", "ai"]);
  expect(s.state!.phase).toBe("reinforce");
  expect(s.state!.currentPlayerIndex).toBe(0);
  expect(s.state!.pendingReinforcements).toBeGreaterThanOrEqual(3);
});

test("place reduces pending and adds armies to an owned territory", () => {
  const g = useGame.getState();
  const owned = ownedTerritoryIds(g.state!, "you")[0]!;
  const before = g.state!.pendingReinforcements;
  g.place(owned, before);
  expect(useGame.getState().state!.pendingReinforcements).toBe(0);
  expect(useGame.getState().state!.territories[owned]!.armies).toBeGreaterThan(1);
});

test("ending the human turn runs the AI turn and returns control to you (or ends the game)", async () => {
  const g = useGame.getState();
  // Spend reinforcements, then walk through the phases.
  const owned = ownedTerritoryIds(g.state!, "you")[0]!;
  g.place(owned, g.state!.pendingReinforcements);
  g.endReinforce();
  g.endAttack();
  await g.endTurn(0); // stepDelayMs = 0 → AI plays synchronously
  const after = useGame.getState().state!;
  // After the AI's full turn, it's the human's reinforce turn again, or someone won.
  expect(after.winnerId !== null || (after.currentPlayerIndex === 0 && after.phase === "reinforce")).toBe(true);
});

test("a full game played by auto-ending human turns terminates with a winner", async () => {
  // Drive the human trivially (place all on first owned, skip attacks/fortify) and let the AI play.
  for (let i = 0; i < 500 && useGame.getState().state!.winnerId === null; i++) {
    const g = useGame.getState();
    const st = g.state!;
    if (st.currentPlayerIndex !== 0) break; // safety; AI runs inside endTurn
    if (st.phase === "reinforce") {
      if (st.pendingReinforcements > 0) g.place(ownedTerritoryIds(st, "you")[0]!, st.pendingReinforcements);
      else g.endReinforce();
    } else if (st.phase === "attack") {
      g.endAttack();
    } else {
      await g.endTurn(0);
    }
  }
  expect(useGame.getState().state!.winnerId).not.toBeNull();
});
