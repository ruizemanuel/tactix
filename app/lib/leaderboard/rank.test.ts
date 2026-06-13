import { describe, it, expect } from "vitest";
import { rankRows } from "./rank.js";

describe("rankRows", () => {
  it("sorts by bestScore desc and assigns dense ranks with ties", () => {
    const out = rankRows([
      { player: "0xa", bestScore: 100 },
      { player: "0xb", bestScore: 300 },
      { player: "0xc", bestScore: 300 },
      { player: "0xd", bestScore: 50 },
    ]);
    expect(out.map((r) => [r.player, r.rank])).toEqual([
      ["0xb", 1],
      ["0xc", 1],
      ["0xa", 3],
      ["0xd", 4],
    ]);
  });
  it("returns [] for no rows", () => {
    expect(rankRows([])).toEqual([]);
  });
});
