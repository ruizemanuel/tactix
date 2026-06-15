import { validateMap } from "./map/schema.js";
import { nextInt } from "./rng.js";
import { reinforcementsFor } from "./reinforce.js";
import type {
  Card,
  CardSymbol,
  GameMap,
  GameState,
  Objective,
  PlayerId,
  PlayerState,
  TerritoryState,
} from "./types.js";

const SYMBOLS = ["globo", "canon", "barco"] as const satisfies readonly CardSymbol[];

function shuffle<T>(items: T[], state: number): { items: T[]; state: number } {
  const out = [...items];
  let s = state;
  for (let i = out.length - 1; i > 0; i--) {
    const r = nextInt(s, i + 1);
    s = r.state;
    const tmp = out[i]!;
    out[i] = out[r.value]!;
    out[r.value] = tmp;
  }
  return { items: out, state: s };
}

export function createGame(
  map: GameMap,
  playerIds: PlayerId[],
  objectives: Objective[],
  seed: number,
): GameState {
  validateMap(map);
  if (playerIds.length < 2) throw new Error("Need at least 2 players");
  if (playerIds.length !== objectives.length) {
    throw new Error("Each player needs exactly one objective");
  }

  const shuffled = shuffle(map.territories, seed);
  let rngState = shuffled.state;

  const territories: Record<string, TerritoryState> = {};
  shuffled.items.forEach((t, idx) => {
    territories[t.id] = { ownerId: playerIds[idx % playerIds.length]!, armies: 1 };
  });

  const players: PlayerState[] = playerIds.map((id, idx) => ({
    id,
    alive: true,
    cards: [],
    objectiveId: objectives[idx]!.id,
    cardTradeIns: 0,
  }));

  const objectiveMap: Record<string, Objective> = {};
  for (const o of objectives) objectiveMap[o.id] = o;

  const deck: Card[] = map.territories.map((t, idx) => ({
    id: `card-${t.id}`,
    territoryId: t.id,
    symbol: SYMBOLS[idx % SYMBOLS.length]!,
  }));
  const shuffledDeck = shuffle(deck, rngState);
  rngState = shuffledDeck.state;

  const state: GameState = {
    map,
    players,
    territories,
    objectives: objectiveMap,
    currentPlayerIndex: 0,
    phase: "reinforce",
    turnNumber: 1,
    pendingReinforcements: 0,
    conquestsThisTurn: 0,
    deck: shuffledDeck.items,
    rngState,
    lastCombat: null,
    pendingOccupation: null,
    winnerId: null,
  };
  return { ...state, pendingReinforcements: reinforcementsFor(state, players[0]!.id) };
}
