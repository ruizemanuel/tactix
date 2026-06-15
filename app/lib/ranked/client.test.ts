import { describe, it, expect, vi, beforeEach } from "vitest";
import { startRanked, sendAction, finalizeRanked } from "./client.js";

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

function ok(json: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(json) } as Response);
}

describe("ranked client", () => {
  it("startRanked posts pool+player and returns the start result", async () => {
    fetchMock.mockReturnValue(ok({ gameId: "g", sessionToken: "t", version: 0, view: { players: [] } }));
    const r = await startRanked("0xpool", "0xplayer");
    expect(r).toEqual({ gameId: "g", sessionToken: "t", version: 0, view: { players: [] } });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/ranked/start");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ pool: "0xpool", player: "0xplayer" });
  });

  it("sendAction posts the gameId/token/version/action", async () => {
    fetchMock.mockReturnValue(ok({ version: 1, view: { v: 1 }, frames: [] }));
    const action = { type: "endReinforce" } as const;
    const r = await sendAction("g", "t", 0, action);
    expect(r).toEqual({ version: 1, view: { v: 1 }, frames: [] });
    expect(JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string)).toEqual({
      gameId: "g",
      sessionToken: "t",
      version: 0,
      action,
    });
  });

  it("finalizeRanked posts gameId+signature", async () => {
    fetchMock.mockReturnValue(ok({ score: 10, breakdown: {}, won: false }));
    const r = await finalizeRanked("g", "0xsig");
    expect(r.score).toBe(10);
    expect(JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string)).toEqual({ gameId: "g", signature: "0xsig" });
  });

  it("throws a typed HttpError with the status on a non-ok response", async () => {
    fetchMock.mockReturnValue(Promise.resolve({ ok: false, status: 409, text: () => Promise.resolve("conflict") } as Response));
    await expect(sendAction("g", "t", 0, { type: "endReinforce" })).rejects.toMatchObject({
      name: "HttpError",
      status: 409,
    });
  });
});
