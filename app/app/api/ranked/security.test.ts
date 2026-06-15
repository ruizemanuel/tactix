import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";
import { assignObjectives, createGame, worldMap, ownedTerritoryIds } from "@teg/engine";

// Real engine (NOT mocked) so redaction actually runs. Mock only the DB + chain.
const insertOpenGame = vi.fn();
const getOpenGame = vi.fn();
const appendAction = vi.fn();
const readContract = vi.fn();

vi.mock("@/lib/db/rankedGames.js", () => ({
  insertOpenGame: (...a: unknown[]) => insertOpenGame(...a),
  getOpenGame: (...a: unknown[]) => getOpenGame(...a),
  appendAction: (...a: unknown[]) => appendAction(...a),
}));
vi.mock("@/lib/web3/server.js", () => ({
  getServerPublicClient: () => ({ readContract: (...a: unknown[]) => readContract(...a) }),
}));

import { POST as START } from "./start/route.js";
import { POST as ACTION } from "./action/route.js";

const POOL = "0x1111111111111111111111111111111111111111";
const PLAYER = "0x2222222222222222222222222222222222222222";
const TOKEN = "a".repeat(64);
const TOKEN_HASH = crypto.createHash("sha256").update(TOKEN).digest("hex");
const SEED = 1234567;

function reqTo(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

// Collect every object key and every primitive value anywhere in a JSON tree.
function walk(o: unknown, keys: Set<string>, vals: unknown[]) {
  if (Array.isArray(o)) {
    o.forEach((x) => walk(x, keys, vals));
    return;
  }
  if (o && typeof o === "object") {
    for (const [k, v] of Object.entries(o)) {
      keys.add(k);
      walk(v, keys, vals);
    }
    return;
  }
  vals.push(o);
}

function noSecretKeys(json: unknown): { keys: Set<string>; vals: unknown[] } {
  const keys = new Set<string>();
  const vals: unknown[] = [];
  walk(json, keys, vals);
  expect(keys.has("rngState")).toBe(false);
  expect(keys.has("deck")).toBe(false);
  expect(keys.has("seed")).toBe(false);
  return { keys, vals };
}

// Allowlist: the redacted view (and each AI frame) must contain ONLY these keys.
// A new engine secret leaking into the wire shape fails here loudly, even if its
// key name isn't in the denylist above.
const VIEW_KEYS = new Set([
  "map", "players", "territories", "objectives", "currentPlayerIndex", "phase",
  "turnNumber", "pendingReinforcements", "conquestsThisTurn", "deckCount", "lastCombat", "winnerId",
]);
const PLAYER_KEYS = new Set(["id", "alive", "cardTradeIns", "cardCount", "cards", "objectiveId"]);

function expectViewShape(view: Record<string, unknown>) {
  for (const k of Object.keys(view)) expect(VIEW_KEYS.has(k), `unexpected view key: ${k}`).toBe(true);
  for (const p of view.players as Record<string, unknown>[]) {
    for (const k of Object.keys(p)) expect(PLAYER_KEYS.has(k), `unexpected player key: ${k}`).toBe(true);
  }
}

beforeEach(() => {
  insertOpenGame.mockReset();
  getOpenGame.mockReset();
  appendAction.mockReset();
  readContract.mockReset();
  readContract.mockImplementation(({ functionName }: { functionName: string }) => {
    if (functionName === "hasJoined") return Promise.resolve(true);
    if (functionName === "emergencyActive") return Promise.resolve(false);
    if (functionName === "endTime") return Promise.resolve(BigInt(Math.floor(Date.now() / 1000) + 3600));
    throw new Error(`unexpected read ${functionName}`);
  });
});

describe("ranked endpoints never leak server secrets", () => {
  it("start: no seed/rng/deck key, only the viewer's objective, opponent hidden", async () => {
    insertOpenGame.mockResolvedValue("g");
    const res = await START(reqTo("http://t/api/ranked/start", { pool: POOL, player: PLAYER }));
    expect(res.status).toBe(200);
    const json = await res.json();
    noSecretKeys(json);
    expect(JSON.stringify(json)).not.toContain("rngState");
    expect(Object.keys(json.view.objectives)).toHaveLength(1); // exactly the viewer's objective
    const ai = json.view.players.find((p: { id: string }) => p.id === "ai");
    expect(ai.cards).toBeUndefined();
    expect(ai.objectiveId).toBeUndefined();
    expectViewShape(json.view);
  });

  it("action: no seed/rng/deck/AI-objective in the response (seed known → check the value too)", async () => {
    // We control the seed via the getOpenGame mock, so we know the AI's secret objective.
    const aiObjective = assignObjectives(["you", "ai"], SEED)[1]!; // seat "ai"
    getOpenGame.mockResolvedValue({ id: "g", seed: SEED, version: 0, actions: [], sessionTokenHash: TOKEN_HASH });
    appendAction.mockResolvedValue(1);
    // A guaranteed-legal first action: place all pending reinforcements on an owned territory.
    const g0 = createGame(worldMap, ["you", "ai"], assignObjectives(["you", "ai"], SEED), SEED);
    const owned = ownedTerritoryIds(g0, "you")[0]!;
    const action = { type: "place", territoryId: owned, armies: g0.pendingReinforcements };
    const res = await ACTION(reqTo("http://t/api/ranked/action", { gameId: "g", sessionToken: TOKEN, version: 0, action }));
    expect(res.status).toBe(200);
    const json = await res.json();
    const { vals } = noSecretKeys(json);
    expect(vals).not.toContain(SEED); // the seed value must not appear anywhere
    expect(JSON.stringify(json)).not.toContain(aiObjective.description);
    expect(JSON.stringify(json)).not.toContain(aiObjective.id);
    expectViewShape(json.view);
    for (const frame of json.frames as Record<string, unknown>[]) expectViewShape(frame);
  });
});
