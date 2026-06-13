import { describe, it, expect, vi, beforeEach } from "vitest";

const bestScores = vi.fn();
vi.mock("@/lib/db/rankedGames.js", () => ({ bestScores: (...a: unknown[]) => bestScores(...a) }));

import { GET } from "./route.js";

const POOL = "0x1111111111111111111111111111111111111111";

function req(url: string) {
  return new Request(url) as unknown as import("next/server").NextRequest;
}

beforeEach(() => bestScores.mockReset());

describe("GET /api/leaderboard", () => {
  it("400 without a valid pool", async () => {
    const res = await GET(req("http://t/api/leaderboard"));
    expect(res.status).toBe(400);
  });

  it("returns ranked rows", async () => {
    bestScores.mockResolvedValue([
      { player: "0xa", bestScore: 100 },
      { player: "0xb", bestScore: 300 },
    ]);
    const res = await GET(req(`http://t/api/leaderboard?pool=${POOL}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rows[0]).toEqual({ player: "0xb", bestScore: 300, rank: 1 });
    expect(json.rows[1]).toEqual({ player: "0xa", bestScore: 100, rank: 2 });
  });
});
