import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";

const getOpenGame = vi.fn();
const appendAction = vi.fn();
const replayWithEvents = vi.fn();
const redactState = vi.fn();

vi.mock("@/lib/db/rankedGames.js", () => ({
  getOpenGame: (...a: unknown[]) => getOpenGame(...a),
  appendAction: (...a: unknown[]) => appendAction(...a),
}));
vi.mock("@teg/engine", () => ({
  replayWithEvents: (...a: unknown[]) => replayWithEvents(...a),
  redactState: (...a: unknown[]) => redactState(...a),
}));

import { POST } from "./route.js";

const TOKEN = "f".repeat(64);
const TOKEN_HASH = crypto.createHash("sha256").update(TOKEN).digest("hex");

function req(body: unknown) {
  return new Request("http://t/api/ranked/action", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}
function openGame(over: Record<string, unknown> = {}) {
  return { id: "g", seed: 5, version: 0, actions: [], sessionTokenHash: TOKEN_HASH, ...over };
}
const place = { type: "place", territoryId: "t1", armies: 1 };

beforeEach(() => {
  getOpenGame.mockReset();
  appendAction.mockReset();
  replayWithEvents.mockReset();
  redactState.mockReset();
  // Default: a legal action that ends with the human still to move (no AI frames).
  replayWithEvents.mockReturnValue({
    ok: true,
    finalState: { winnerId: null },
    events: [{ actor: "human", action: place, state: { winnerId: null } }],
  });
  redactState.mockImplementation(() => ({ view: true }));
});

describe("POST /api/ranked/action", () => {
  it("404 when the open game is missing", async () => {
    getOpenGame.mockResolvedValue(null);
    const res = await POST(req({ gameId: "x", sessionToken: TOKEN, version: 0, action: place }));
    expect(res.status).toBe(404);
  });

  it("401 on a wrong session token", async () => {
    getOpenGame.mockResolvedValue(openGame());
    const res = await POST(req({ gameId: "g", sessionToken: "0".repeat(64), version: 0, action: place }));
    expect(res.status).toBe(401);
    expect(appendAction).not.toHaveBeenCalled();
  });

  it("400 when replay rejects the action", async () => {
    getOpenGame.mockResolvedValue(openGame());
    replayWithEvents.mockReturnValue({ ok: false, error: "illegal" });
    const res = await POST(req({ gameId: "g", sessionToken: TOKEN, version: 0, action: { type: "endAttack" } }));
    expect(res.status).toBe(400);
    expect(appendAction).not.toHaveBeenCalled();
  });

  it("200 appends under the version lock and returns version/view/frames", async () => {
    getOpenGame.mockResolvedValue(openGame());
    appendAction.mockResolvedValue(1);
    const res = await POST(req({ gameId: "g", sessionToken: TOKEN, version: 0, action: place }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.version).toBe(1);
    expect(json.view).toEqual({ view: true });
    expect(json.frames).toEqual([]);
    expect(appendAction).toHaveBeenCalledWith("g", 0, [place]);
  });

  it("200 idempotent retry: client one version behind, replaying the last stored action", async () => {
    getOpenGame.mockResolvedValue(openGame({ version: 1, actions: [place] }));
    const res = await POST(req({ gameId: "g", sessionToken: TOKEN, version: 0, action: place }));
    expect(res.status).toBe(200);
    expect(appendAction).not.toHaveBeenCalled(); // no double-apply
  });

  it("409 on a genuine version conflict", async () => {
    getOpenGame.mockResolvedValue(openGame({ version: 3, actions: [place] }));
    const res = await POST(req({ gameId: "g", sessionToken: TOKEN, version: 0, action: { type: "endReinforce" } }));
    expect(res.status).toBe(409);
    expect(appendAction).not.toHaveBeenCalled();
  });

  it("409 when the CAS loses the race (appendAction returns null)", async () => {
    getOpenGame.mockResolvedValueOnce(openGame()).mockResolvedValueOnce(openGame({ version: 1, actions: [place] }));
    appendAction.mockResolvedValue(null);
    const res = await POST(req({ gameId: "g", sessionToken: TOKEN, version: 0, action: place }));
    expect(res.status).toBe(409);
  });

  it("409 when the tournament has ended (endTime passed)", async () => {
    getOpenGame.mockResolvedValue(openGame({ endTime: Math.floor(Date.now() / 1000) - 3600 }));
    const res = await POST(req({ gameId: "g", sessionToken: TOKEN, version: 0, action: place }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "tournament ended" });
    expect(appendAction).not.toHaveBeenCalled();
  });

  it("409 at the exact endTime boundary (now === endTime)", async () => {
    getOpenGame.mockResolvedValue(openGame({ endTime: Math.floor(Date.now() / 1000) }));
    const res = await POST(req({ gameId: "g", sessionToken: TOKEN, version: 0, action: place }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "tournament ended" });
    expect(appendAction).not.toHaveBeenCalled();
  });

  it("200 proceeds when endTime is in the future", async () => {
    getOpenGame.mockResolvedValue(openGame({ endTime: Math.floor(Date.now() / 1000) + 3600 }));
    appendAction.mockResolvedValue(1);
    const res = await POST(req({ gameId: "g", sessionToken: TOKEN, version: 0, action: place }));
    expect(res.status).toBe(200);
    expect(appendAction).toHaveBeenCalled();
  });

  it("429 when actions come too fast (last_action_at within the min interval)", async () => {
    getOpenGame.mockResolvedValue(openGame({ lastActionAt: new Date() }));
    const res = await POST(req({ gameId: "g", sessionToken: TOKEN, version: 0, action: place }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "too fast, slow down" });
    expect(appendAction).not.toHaveBeenCalled();
  });

  it("200 proceeds when the last action is old enough", async () => {
    getOpenGame.mockResolvedValue(openGame({ lastActionAt: new Date(Date.now() - 10_000) }));
    appendAction.mockResolvedValue(1);
    const res = await POST(req({ gameId: "g", sessionToken: TOKEN, version: 0, action: place }));
    expect(res.status).toBe(200);
    expect(appendAction).toHaveBeenCalled();
  });
});
