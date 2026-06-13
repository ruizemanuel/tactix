import { describe, it, expect, vi, beforeEach } from "vitest";

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

function req(body: unknown) {
  return new Request("http://t/api/ranked/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
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

  it("400 when replay rejects the log", async () => {
    getOpenGame.mockResolvedValue({ id: "g", seed: 5 });
    replayGame.mockReturnValue({ ok: false, error: "illegal action at index 0: nope" });
    const res = await POST(req({ gameId: "g", actions: [{ type: "endAttack" }] }));
    expect(res.status).toBe(400);
    expect(markScored).not.toHaveBeenCalled();
  });

  it("200 + persists the recomputed score on a valid log", async () => {
    const breakdown = { won: true, continents: 1, territories: 18, turnsUsed: 7 };
    getOpenGame.mockResolvedValue({ id: "g", seed: 5 });
    replayGame.mockReturnValue({ ok: true, finalState: {}, breakdown });
    computeScore.mockReturnValue(1076);
    const res = await POST(req({ gameId: "g", actions: [{ type: "endReinforce" }] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ score: 1076, breakdown, won: true });
    expect(markScored).toHaveBeenCalledWith("g", { actions: [{ type: "endReinforce" }], score: 1076, breakdown });
  });
});
