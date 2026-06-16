import { describe, it, expect, vi, beforeEach } from "vitest";

const insertOpenGame = vi.fn();
const readContract = vi.fn();
const countRecentGames = vi.fn();

vi.mock("@/lib/db/rankedGames.js", () => ({
  insertOpenGame: (...a: unknown[]) => insertOpenGame(...a),
  countRecentGames: (...a: unknown[]) => countRecentGames(...a),
}));
vi.mock("@/lib/web3/server.js", () => ({
  getServerPublicClient: () => ({ readContract: (...a: unknown[]) => readContract(...a) }),
}));

import { POST } from "./route.js";

const POOL = "0x1111111111111111111111111111111111111111";
const PLAYER = "0x2222222222222222222222222222222222222222";

function req(body: unknown) {
  return new Request("http://t/api/ranked/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

function chainReads({ hasJoined, emergency, endTimeAhead }: { hasJoined: boolean; emergency: boolean; endTimeAhead: boolean }) {
  readContract.mockImplementation(({ functionName }: { functionName: string }) => {
    if (functionName === "hasJoined") return Promise.resolve(hasJoined);
    if (functionName === "emergencyActive") return Promise.resolve(emergency);
    if (functionName === "endTime")
      return Promise.resolve(BigInt(Math.floor(Date.now() / 1000) + (endTimeAhead ? 3600 : -3600)));
    throw new Error(`unexpected read ${functionName}`);
  });
}

beforeEach(() => {
  insertOpenGame.mockReset();
  readContract.mockReset();
  countRecentGames.mockReset();
  countRecentGames.mockResolvedValue(0);
});

describe("POST /api/ranked/start", () => {
  it("429 when the player has started too many games recently (before any on-chain read)", async () => {
    countRecentGames.mockResolvedValue(10);
    const res = await POST(req({ pool: POOL, player: PLAYER }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "too many games, slow down" });
    expect(insertOpenGame).not.toHaveBeenCalled();
    expect(readContract).not.toHaveBeenCalled();
  });

  it("200 proceeds when just under the start limit (9 recent games)", async () => {
    countRecentGames.mockResolvedValue(9);
    chainReads({ hasJoined: true, emergency: false, endTimeAhead: true });
    insertOpenGame.mockResolvedValue("game-9");
    const res = await POST(req({ pool: POOL, player: PLAYER }));
    expect(res.status).toBe(200);
    expect(insertOpenGame).toHaveBeenCalledOnce();
  });

  it("400 when pool/player are not addresses", async () => {
    const res = await POST(req({ pool: "nope", player: "nope" }));
    expect(res.status).toBe(400);
  });

  it("403 when the player has not joined", async () => {
    chainReads({ hasJoined: false, emergency: false, endTimeAhead: true });
    const res = await POST(req({ pool: POOL, player: PLAYER }));
    expect(res.status).toBe(403);
    expect(insertOpenGame).not.toHaveBeenCalled();
  });

  it("200 with gameId/sessionToken/version/view — and NEVER the seed", async () => {
    chainReads({ hasJoined: true, emergency: false, endTimeAhead: true });
    insertOpenGame.mockResolvedValue("game-123");
    const res = await POST(req({ pool: POOL, player: PLAYER }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.gameId).toBe("game-123");
    expect(typeof json.sessionToken).toBe("string");
    expect(json.sessionToken.length).toBeGreaterThanOrEqual(32);
    expect(json.version).toBe(0);
    expect(json.view).toBeDefined();
    expect(json.view.players.map((p: { id: string }) => p.id)).toEqual(["you", "ai"]);
    // The seed and rng must not be anywhere in the response.
    expect("seed" in json).toBe(false);
    expect(JSON.stringify(json)).not.toContain("rngState");
    expect(insertOpenGame).toHaveBeenCalledOnce();
    // The stored token hash is sha256 hex (64 chars), not the raw token.
    const stored = insertOpenGame.mock.calls[0]![0] as { sessionTokenHash: string };
    expect(stored.sessionTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.sessionTokenHash).not.toBe(json.sessionToken);
  });

  it("persists the on-chain endTime on the new game row", async () => {
    chainReads({ hasJoined: true, emergency: false, endTimeAhead: true });
    insertOpenGame.mockResolvedValue("game-xyz");
    await POST(req({ pool: POOL, player: PLAYER }));
    const stored = insertOpenGame.mock.calls[0]![0] as { endTime: number };
    expect(typeof stored.endTime).toBe("number");
    expect(stored.endTime).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});
