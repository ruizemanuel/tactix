import { describe, it, expect, vi, beforeEach } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { buildSubmitMessage } from "@/lib/ranked/submitMessage.js";
import { CONFIGURED_CHAIN_ID } from "@/lib/contracts/addresses.js";

const getOpenGame = vi.fn();
const markScored = vi.fn();
const replayGame = vi.fn();
const computeScore = vi.fn();

vi.mock("@/lib/db/rankedGames.js", () => ({
  getOpenGame: (...a: unknown[]) => getOpenGame(...a),
  markScored: (...a: unknown[]) => markScored(...a),
}));
vi.mock("@teg/engine", () => ({
  replayGame: (...a: unknown[]) => replayGame(...a),
  computeScore: (...a: unknown[]) => computeScore(...a),
}));

import { POST } from "./route.js";

// Universally-known hardhat default keys (public, not secrets).
const PLAYER = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const OTHER = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
const POOL = "0x1Ca0585d07c9D6B07Fe67326689AF874BE9B8207";

function req(body: unknown) {
  return new Request("http://t/api/ranked/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

function openGame(over: Record<string, unknown> = {}) {
  return { id: "g", seed: 5, player: PLAYER.address.toLowerCase(), poolAddress: POOL.toLowerCase(), ...over };
}
function sign(account: typeof PLAYER, gameId = "g", pool = POOL) {
  return account.signMessage({ message: buildSubmitMessage({ pool, gameId, chainId: CONFIGURED_CHAIN_ID }) });
}

beforeEach(() => {
  getOpenGame.mockReset();
  markScored.mockReset();
  replayGame.mockReset();
  computeScore.mockReset();
});

describe("POST /api/ranked/submit", () => {
  it("404 when the open game is not found", async () => {
    getOpenGame.mockResolvedValue(null);
    const res = await POST(req({ gameId: "x", actions: [] }));
    expect(res.status).toBe(404);
  });

  it("401 when the signature is missing", async () => {
    getOpenGame.mockResolvedValue(openGame());
    const res = await POST(req({ gameId: "g", actions: [] }));
    expect(res.status).toBe(401);
    expect(markScored).not.toHaveBeenCalled();
  });

  it("401 when the signature is malformed", async () => {
    getOpenGame.mockResolvedValue(openGame());
    const res = await POST(req({ gameId: "g", actions: [], signature: "0xnothex" }));
    expect(res.status).toBe(401);
  });

  it("401 when the signature is from a different signer", async () => {
    getOpenGame.mockResolvedValue(openGame());
    const res = await POST(req({ gameId: "g", actions: [], signature: await sign(OTHER) }));
    expect(res.status).toBe(401);
    expect(markScored).not.toHaveBeenCalled();
  });

  it("401 when the signature is over a different game", async () => {
    getOpenGame.mockResolvedValue(openGame());
    const res = await POST(req({ gameId: "g", actions: [], signature: await sign(PLAYER, "OTHER") }));
    expect(res.status).toBe(401);
  });

  it("400 when replay rejects the log (with a valid signature)", async () => {
    getOpenGame.mockResolvedValue(openGame());
    replayGame.mockReturnValue({ ok: false, error: "illegal action at index 0: nope" });
    const res = await POST(req({ gameId: "g", actions: [{ type: "endAttack" }], signature: await sign(PLAYER) }));
    expect(res.status).toBe(400);
    expect(markScored).not.toHaveBeenCalled();
  });

  it("200 + persists the recomputed score on a valid log + signature", async () => {
    const breakdown = { won: true, continents: 1, territories: 18, turnsUsed: 7 };
    getOpenGame.mockResolvedValue(openGame());
    replayGame.mockReturnValue({ ok: true, finalState: {}, breakdown });
    computeScore.mockReturnValue(1076);
    markScored.mockResolvedValue(true);
    const res = await POST(req({ gameId: "g", actions: [{ type: "endReinforce" }], signature: await sign(PLAYER) }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ score: 1076, breakdown, won: true });
    expect(markScored).toHaveBeenCalledWith("g", { actions: [{ type: "endReinforce" }], score: 1076, breakdown });
  });

  it("409 when the game was scored concurrently (markScored updates 0 rows)", async () => {
    const breakdown = { won: true, continents: 1, territories: 18, turnsUsed: 7 };
    getOpenGame.mockResolvedValue(openGame());
    replayGame.mockReturnValue({ ok: true, finalState: {}, breakdown });
    computeScore.mockReturnValue(1076);
    markScored.mockResolvedValue(false);
    const res = await POST(req({ gameId: "g", actions: [{ type: "endReinforce" }], signature: await sign(PLAYER) }));
    expect(res.status).toBe(409);
  });
});
