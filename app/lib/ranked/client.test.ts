import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startRanked, submitRanked } from "./client.js";

const POOL = "0x1111111111111111111111111111111111111111";
const PLAYER = "0x2222222222222222222222222222222222222222";

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());

describe("ranked client", () => {
  it("startRanked posts pool/player and returns the issued game", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ gameId: "g1", seed: 42, commitHash: "0xabc" }),
    });
    const out = await startRanked(POOL, PLAYER);
    expect(out).toEqual({ gameId: "g1", seed: 42, commitHash: "0xabc" });
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toBe("/api/ranked/start");
    expect(JSON.parse(init.body)).toEqual({ pool: POOL, player: PLAYER });
  });

  it("submitRanked throws on a non-ok response", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 400, text: async () => "illegal" });
    await expect(submitRanked("g1", [])).rejects.toThrow(/400/);
  });
});
