import { beforeEach, expect, test } from "vitest";
import { useGame } from "./store.js";
import { ownedTerritoryIds } from "@teg/engine";
import { vi } from "vitest";
import * as client from "@/lib/ranked/client.js";

vi.mock("@/lib/ranked/client.js", () => ({
  startRanked: vi.fn(),
  sendAction: vi.fn(),
  finalizeRanked: vi.fn(),
}));

function fresh() {
  vi.clearAllMocks();
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

test("startRankedGame stores the session + renders the server view", () => {
  const view = { players: [{ id: "you", alive: true, cardTradeIns: 0, cardCount: 0, cards: [], objectiveId: "obj-asia" }, { id: "ai", alive: true, cardTradeIns: 0, cardCount: 0 }], map: useGame.getState().state!.map, territories: {}, objectives: {}, currentPlayerIndex: 0, phase: "reinforce", turnNumber: 1, pendingReinforcements: 3, conquestsThisTurn: 0, deckCount: 32, lastCombat: null, winnerId: null };
  useGame.getState().startRankedGame({ gameId: "g1", sessionToken: "tok", version: 0, view: view as never });
  expect(useGame.getState().ranked).toEqual({ gameId: "g1", sessionToken: "tok", version: 0 });
  expect(useGame.getState().state!.rngState).toBe(0); // rehydrated, no real rng
  expect(useGame.getState().state!.phase).toBe("reinforce");
});

test("a ranked action posts to the server and applies the returned view + version", async () => {
  const baseView = { players: [{ id: "you", alive: true, cardTradeIns: 0, cardCount: 0, cards: [], objectiveId: "obj-asia" }, { id: "ai", alive: true, cardTradeIns: 0, cardCount: 0 }], map: useGame.getState().state!.map, territories: {}, objectives: {}, currentPlayerIndex: 0, phase: "attack", turnNumber: 1, pendingReinforcements: 0, conquestsThisTurn: 0, deckCount: 32, lastCombat: null, winnerId: null };
  useGame.getState().startRankedGame({ gameId: "g1", sessionToken: "tok", version: 0, view: { ...baseView, phase: "reinforce", pendingReinforcements: 3 } as never });
  (client.sendAction as ReturnType<typeof vi.fn>).mockResolvedValue({ version: 1, view: baseView, frames: [] });

  await useGame.getState().endReinforce();
  expect(client.sendAction).toHaveBeenCalledWith("g1", "tok", 0, { type: "endReinforce" });
  expect(useGame.getState().ranked!.version).toBe(1);
  expect(useGame.getState().state!.phase).toBe("attack");
  expect(useGame.getState().aiThinking).toBe(false);
});

test("practice mode still applies locally with no network call", () => {
  useGame.getState().newGame(1);
  expect(useGame.getState().ranked).toBeNull();
  const st = useGame.getState().state!;
  const terr = ownedTerritoryIds(st, "you")[0]!;
  useGame.getState().place(terr, st.pendingReinforcements);
  expect(useGame.getState().state!.territories[terr]!.armies).toBeGreaterThan(1);
  expect(client.sendAction).not.toHaveBeenCalled();
});

test("a failed ranked action sets rankedError + lastFailedAction, and retryRanked re-sends it", async () => {
  const baseView = { players: [{ id: "you", alive: true, cardTradeIns: 0, cardCount: 0, cards: [], objectiveId: "obj-asia" }, { id: "ai", alive: true, cardTradeIns: 0, cardCount: 0 }], map: useGame.getState().state!.map, territories: {}, objectives: {}, currentPlayerIndex: 0, phase: "reinforce", turnNumber: 1, pendingReinforcements: 3, conquestsThisTurn: 0, deckCount: 32, lastCombat: null, winnerId: null };
  useGame.getState().startRankedGame({ gameId: "g1", sessionToken: "tok", version: 0, view: baseView as never });
  (client.sendAction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network"));

  await useGame.getState().endReinforce();
  expect(useGame.getState().rankedError).toBe(true);
  expect(useGame.getState().lastFailedAction).toEqual({ type: "endReinforce" });
  expect(client.sendAction).toHaveBeenCalledTimes(1);
  expect(useGame.getState().aiThinking).toBe(false);

  await useGame.getState().retryRanked();
  expect(client.sendAction).toHaveBeenCalledTimes(2);
  expect(client.sendAction).toHaveBeenLastCalledWith("g1", "tok", 0, { type: "endReinforce" });
});

test("retryRanked clears rankedError + lastFailedAction on a successful re-send", async () => {
  const baseView = { players: [{ id: "you", alive: true, cardTradeIns: 0, cardCount: 0, cards: [], objectiveId: "obj-asia" }, { id: "ai", alive: true, cardTradeIns: 0, cardCount: 0 }], map: useGame.getState().state!.map, territories: {}, objectives: {}, currentPlayerIndex: 0, phase: "reinforce", turnNumber: 1, pendingReinforcements: 3, conquestsThisTurn: 0, deckCount: 32, lastCombat: null, winnerId: null };
  useGame.getState().startRankedGame({ gameId: "g1", sessionToken: "tok", version: 0, view: baseView as never });
  const send = client.sendAction as ReturnType<typeof vi.fn>;

  send.mockRejectedValueOnce(new Error("network"));
  await useGame.getState().endReinforce();
  expect(useGame.getState().rankedError).toBe(true);
  expect(useGame.getState().lastFailedAction).toEqual({ type: "endReinforce" });

  send.mockResolvedValueOnce({ version: 1, view: baseView, frames: [] });
  await useGame.getState().retryRanked();
  expect(useGame.getState().rankedError).toBe(false);
  expect(useGame.getState().lastFailedAction).toBeNull();
  expect(useGame.getState().ranked!.version).toBe(1);
});

test("a ranked occupy posts the occupy action to the server", async () => {
  const baseView = { players: [{ id: "you", alive: true, cardTradeIns: 0, cardCount: 0, cards: [], objectiveId: "obj-asia" }, { id: "ai", alive: true, cardTradeIns: 0, cardCount: 0 }], map: useGame.getState().state!.map, territories: {}, objectives: {}, currentPlayerIndex: 0, phase: "attack", turnNumber: 1, pendingReinforcements: 0, conquestsThisTurn: 0, deckCount: 32, lastCombat: null, winnerId: null };
  useGame.getState().startRankedGame({ gameId: "g1", sessionToken: "tok", version: 0, view: baseView as never });
  (client.sendAction as ReturnType<typeof vi.fn>).mockResolvedValue({ version: 1, view: baseView, frames: [] });

  await useGame.getState().occupy(2);
  expect(client.sendAction).toHaveBeenCalledWith("g1", "tok", 0, { type: "occupy", armies: 2 });
  expect(useGame.getState().ranked!.version).toBe(1);
});

test("occupy dispatches an occupy action (practice applies locally)", () => {
  useGame.getState().newGame(7);
  const st = useGame.getState().state!;
  const owned = ownedTerritoryIds(st, "you");
  const from = owned[0]!;
  const to = owned[1]!;
  useGame.setState({
    state: {
      ...st,
      phase: "attack",
      territories: {
        ...st.territories,
        [from]: { ...st.territories[from]!, armies: 5 },
        [to]: { ownerId: "you", armies: 0 },
      },
      pendingOccupation: { from, to, max: 3 },
    },
  });
  void useGame.getState().occupy(2);
  const after = useGame.getState().state!;
  expect(after.pendingOccupation).toBeNull();
  expect(after.territories[to]!.armies).toBe(2);
});
