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
import { rehydrateView } from "@/lib/game/rehydrate.js";
import { sendAction, type StartResult } from "@/lib/ranked/client.js";

const YOU = "you";
const AI = "ai";
const RANKED_STEP_MS = 450;

const sleep = (ms: number) => (ms > 0 ? new Promise<void>((r) => setTimeout(r, ms)) : Promise.resolve());

interface RankedSession {
  gameId: string;
  sessionToken: string;
  version: number;
}

interface GameStore {
  state: GameState | null;
  selected: string | null;
  aiThinking: boolean;
  ranked: RankedSession | null;
  rankedError: boolean;
  newGame: (seed?: number) => void;
  startRankedGame: (start: StartResult) => void;
  select: (territoryId: string | null) => void;
  place: (territoryId: string, armies: number) => Promise<void>;
  tradeCards: (cardIds: string[]) => Promise<void>;
  endReinforce: () => Promise<void>;
  attack: (from: string, to: string) => Promise<void>;
  endAttack: () => Promise<void>;
  fortify: (from: string, to: string, armies: number) => Promise<void>;
  occupy: (armies: number) => Promise<void>;
  endTurn: (stepDelayMs?: number) => Promise<void>;
}

export const useGame = create<GameStore>((set, get) => {
  const ai = new HeuristicPlayer(AI);

  function applyLocal(action: Action) {
    const st = get().state;
    if (!st) return;
    set({ state: applyAction(st, action), selected: null });
  }

  async function runAiTurn(stepDelayMs: number) {
    set({ aiThinking: true });
    for (let guard = 0; guard < 5000; guard++) {
      const st = get().state!;
      if (st.winnerId !== null) break;
      if (st.players[st.currentPlayerIndex]!.id !== AI) break;
      set({ state: applyAction(st, ai.decide(st)) });
      await sleep(stepDelayMs);
    }
    set({ aiThinking: false });
  }

  // Ranked: POST the action, animate the AI frames, land on the authoritative view.
  // The aiThinking guard makes this a no-op if a round-trip/animation is already in
  // flight, so overlapping requests (which would 409) can't be started.
  async function sendRanked(action: Action) {
    const ranked = get().ranked;
    if (!ranked || get().aiThinking) return;
    set({ aiThinking: true, selected: null });
    try {
      const r = await sendAction(ranked.gameId, ranked.sessionToken, ranked.version, action);
      for (const frame of r.frames) {
        set({ state: rehydrateView(frame) });
        await sleep(RANKED_STEP_MS);
      }
      set({
        state: rehydrateView(r.view),
        ranked: { ...get().ranked!, version: r.version },
        aiThinking: false,
        rankedError: false,
      });
    } catch {
      set({ aiThinking: false, rankedError: true });
    }
  }

  // Route an action to the server (ranked) or the local engine (practice).
  function dispatch(action: Action): Promise<void> {
    if (get().ranked) return sendRanked(action);
    applyLocal(action);
    return Promise.resolve();
  }

  return {
    state: null,
    selected: null,
    aiThinking: false,
    ranked: null,
    rankedError: false,

    newGame: (seed = Math.floor(Math.random() * 2 ** 31)) => {
      const objectives = assignObjectives([YOU, AI], seed);
      set({
        state: createGame(worldMap, [YOU, AI], objectives, seed),
        selected: null,
        aiThinking: false,
        ranked: null,
        rankedError: false,
      });
    },

    startRankedGame: (start) => {
      set({
        state: rehydrateView(start.view),
        selected: null,
        aiThinking: false,
        ranked: { gameId: start.gameId, sessionToken: start.sessionToken, version: start.version },
        rankedError: false,
      });
    },

    select: (territoryId) => set({ selected: territoryId }),
    place: (territoryId, armies) => dispatch({ type: "place", territoryId, armies }),
    tradeCards: (cardIds) => dispatch({ type: "tradeCards", cardIds }),
    endReinforce: () => dispatch({ type: "endReinforce" }),
    attack: (from, to) => dispatch({ type: "attack", from, to }),
    endAttack: () => dispatch({ type: "endAttack" }),
    fortify: (from, to, armies) => dispatch({ type: "fortify", from, to, armies }),
    occupy: (armies) => dispatch({ type: "occupy", armies }),

    endTurn: async (stepDelayMs = 450) => {
      if (get().ranked) {
        await sendRanked({ type: "endTurn" });
        return;
      }
      applyLocal({ type: "endTurn" });
      await runAiTurn(stepDelayMs);
    },
  };
});
