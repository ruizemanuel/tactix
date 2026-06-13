import { create } from "zustand";
import {
  applyAction,
  assignObjectives,
  createGame,
  HeuristicPlayer,
  worldMap,
  type Action,
  type GameState,
} from "@teg/engine";

const YOU = "you";
const AI = "ai";

const sleep = (ms: number) => (ms > 0 ? new Promise<void>((r) => setTimeout(r, ms)) : Promise.resolve());

interface GameStore {
  state: GameState | null;
  selected: string | null; // territory selected by the human (attack/fortify "from")
  aiThinking: boolean;
  actionLog: Action[];
  ranked: { gameId: string; seed: number } | null;
  newGame: (seed?: number) => void;
  startRankedGame: (seed: number, gameId: string) => void;
  select: (territoryId: string | null) => void;
  place: (territoryId: string, armies: number) => void;
  tradeCards: (cardIds: string[]) => void;
  endReinforce: () => void;
  attack: (from: string, to: string) => void;
  endAttack: () => void;
  fortify: (from: string, to: string, armies: number) => void;
  endTurn: (stepDelayMs?: number) => Promise<void>;
}

export const useGame = create<GameStore>((set, get) => {
  const ai = new HeuristicPlayer(AI);

  function apply(action: Parameters<typeof applyAction>[1]) {
    const st = get().state;
    if (!st) return;
    const { ranked, actionLog } = get();
    set({
      state: applyAction(st, action),
      selected: null,
      actionLog: ranked ? [...actionLog, action] : actionLog,
    });
  }

  async function runAiTurn(stepDelayMs: number) {
    set({ aiThinking: true });
    // Loop the AI's decisions until it is no longer the AI's turn or the game ends.
    for (let guard = 0; guard < 5000; guard++) {
      const st = get().state!;
      if (st.winnerId !== null) break;
      if (st.players[st.currentPlayerIndex]!.id !== AI) break;
      set({ state: applyAction(st, ai.decide(st)) });
      await sleep(stepDelayMs);
    }
    set({ aiThinking: false });
  }

  return {
    state: null,
    selected: null,
    aiThinking: false,
    actionLog: [],
    ranked: null,

    newGame: (seed = Math.floor(Math.random() * 2 ** 31)) => {
      const objectives = assignObjectives([YOU, AI], seed);
      set({
        state: createGame(worldMap, [YOU, AI], objectives, seed),
        selected: null,
        aiThinking: false,
        actionLog: [],
        ranked: null,
      });
    },

    startRankedGame: (seed, gameId) => {
      const objectives = assignObjectives([YOU, AI], seed);
      set({
        state: createGame(worldMap, [YOU, AI], objectives, seed),
        selected: null,
        aiThinking: false,
        actionLog: [],
        ranked: { gameId, seed },
      });
    },

    select: (territoryId) => set({ selected: territoryId }),
    place: (territoryId, armies) => apply({ type: "place", territoryId, armies }),
    tradeCards: (cardIds) => apply({ type: "tradeCards", cardIds }),
    endReinforce: () => apply({ type: "endReinforce" }),
    attack: (from, to) => apply({ type: "attack", from, to }),
    endAttack: () => apply({ type: "endAttack" }),
    fortify: (from, to, armies) => apply({ type: "fortify", from, to, armies }),

    endTurn: async (stepDelayMs = 450) => {
      apply({ type: "endTurn" });
      await runAiTurn(stepDelayMs);
    },
  };
});
