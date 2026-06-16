import { describe, it, expect, vi, beforeEach } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { buildSubmitMessage } from "@/lib/ranked/submitMessage.js";
import { CONFIGURED_CHAIN_ID } from "@/lib/contracts/addresses.js";

const getOpenGame = vi.fn();
const markScored = vi.fn();
const replayGame = vi.fn();
const computeScore = vi.fn();
const readContract = vi.fn();

vi.mock("@/lib/db/rankedGames.js", () => ({
  getOpenGame: (...a: unknown[]) => getOpenGame(...a),
  markScored: (...a: unknown[]) => markScored(...a),
}));
vi.mock("@teg/engine", () => ({
  replayGame: (...a: unknown[]) => replayGame(...a),
  computeScore: (...a: unknown[]) => computeScore(...a),
}));
vi.mock("@/lib/web3/server.js", () => ({
  getServerPublicClient: () => ({ readContract: (...a: unknown[]) => readContract(...a) }),
}));

import { POST } from "./route.js";

const PLAYER = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const OTHER = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
const POOL = "0x1Ca0585d07c9D6B07Fe67326689AF874BE9B8207";

function req(body: unknown) {
  return new Request("http://t/api/ranked/finalize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}
function openGame(over: Record<string, unknown> = {}) {
  return { id: "g", seed: 5, version: 7, player: PLAYER.address.toLowerCase(), poolAddress: POOL.toLowerCase(), actions: [{ type: "endReinforce" }], ...over };
}
function sign(account: typeof PLAYER, gameId = "g", pool = POOL) {
  return account.signMessage({ message: buildSubmitMessage({ pool, gameId, chainId: CONFIGURED_CHAIN_ID }) });
}

beforeEach(() => {
  getOpenGame.mockReset();
  markScored.mockReset();
  replayGame.mockReset();
  computeScore.mockReset();
  readContract.mockReset();
  readContract.mockResolvedValue(false); // emergencyActive = false by default
});

describe("POST /api/ranked/finalize", () => {
  it("404 when the open game is not found", async () => {
    getOpenGame.mockResolvedValue(null);
    const res = await POST(req({ gameId: "x" }));
    expect(res.status).toBe(404);
  });

  it("401 when the signature is missing", async () => {
    getOpenGame.mockResolvedValue(openGame());
    const res = await POST(req({ gameId: "g" }));
    expect(res.status).toBe(401);
    expect(markScored).not.toHaveBeenCalled();
  });

  it("401 from a different signer", async () => {
    getOpenGame.mockResolvedValue(openGame());
    const res = await POST(req({ gameId: "g", signature: await sign(OTHER) }));
    expect(res.status).toBe(401);
  });

  it("400 when the game is not over (replay rejects the stored log)", async () => {
    getOpenGame.mockResolvedValue(openGame());
    replayGame.mockReturnValue({ ok: false, error: "human action log exhausted before game end" });
    const res = await POST(req({ gameId: "g", signature: await sign(PLAYER) }));
    expect(res.status).toBe(400);
    expect(markScored).not.toHaveBeenCalled();
  });

  it("200 + persists the recomputed score from the STORED log, guarded by version", async () => {
    const breakdown = { won: true, continents: 1, territories: 18, turnsUsed: 7 };
    getOpenGame.mockResolvedValue(openGame());
    replayGame.mockReturnValue({ ok: true, finalState: { winnerId: "you" }, breakdown });
    computeScore.mockReturnValue(1076);
    markScored.mockResolvedValue(true);
    const res = await POST(req({ gameId: "g", signature: await sign(PLAYER) }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ score: 1076, breakdown, won: true });
    expect(replayGame).toHaveBeenCalledWith(5, [{ type: "endReinforce" }], { humanId: "you", aiId: "ai" });
    expect(markScored).toHaveBeenCalledWith("g", { actions: [{ type: "endReinforce" }], score: 1076, breakdown }, 7);
  });

  it("409 when scored concurrently (markScored updates 0 rows)", async () => {
    const breakdown = { won: true, continents: 1, territories: 18, turnsUsed: 7 };
    getOpenGame.mockResolvedValue(openGame());
    replayGame.mockReturnValue({ ok: true, finalState: { winnerId: "you" }, breakdown });
    computeScore.mockReturnValue(1076);
    markScored.mockResolvedValue(false);
    const res = await POST(req({ gameId: "g", signature: await sign(PLAYER) }));
    expect(res.status).toBe(409);
  });

  it("409 when the tournament has ended (endTime passed)", async () => {
    getOpenGame.mockResolvedValue(openGame({ endTime: Math.floor(Date.now() / 1000) - 3600 }));
    const res = await POST(req({ gameId: "g", signature: await sign(PLAYER) }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "tournament ended" });
    expect(markScored).not.toHaveBeenCalled();
  });

  it("409 at the exact endTime boundary (now === endTime)", async () => {
    getOpenGame.mockResolvedValue(openGame({ endTime: Math.floor(Date.now() / 1000) }));
    const res = await POST(req({ gameId: "g", signature: await sign(PLAYER) }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "tournament ended" });
    expect(markScored).not.toHaveBeenCalled();
  });

  it("409 when an emergency is active", async () => {
    getOpenGame.mockResolvedValue(openGame({ endTime: Math.floor(Date.now() / 1000) + 3600 }));
    readContract.mockResolvedValue(true);
    const res = await POST(req({ gameId: "g", signature: await sign(PLAYER) }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "emergency active" });
    expect(markScored).not.toHaveBeenCalled();
  });

  it("proceeds (fail-open) when the emergencyActive read throws", async () => {
    const breakdown = { won: true, continents: 1, territories: 18, turnsUsed: 7 };
    getOpenGame.mockResolvedValue(openGame({ endTime: Math.floor(Date.now() / 1000) + 3600 }));
    readContract.mockRejectedValue(new Error("rpc down"));
    replayGame.mockReturnValue({ ok: true, finalState: { winnerId: "you" }, breakdown });
    computeScore.mockReturnValue(1076);
    markScored.mockResolvedValue(true);
    const res = await POST(req({ gameId: "g", signature: await sign(PLAYER) }));
    expect(res.status).toBe(200);
    expect(markScored).toHaveBeenCalled();
  });
});
