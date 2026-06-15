import { describe, expect, test } from "vitest";
import { buildSubmitMessage } from "./submitMessage.js";

describe("buildSubmitMessage", () => {
  test("produces the canonical multi-line message", () => {
    expect(buildSubmitMessage({ pool: "0xabc", gameId: "game-1", chainId: 42220 })).toBe(
      "TACTIX ranked score submission\nPool: 0xabc\nGame: game-1\nChain: 42220",
    );
  });
  test("lowercases the pool address", () => {
    expect(buildSubmitMessage({ pool: "0xAbCdEf", gameId: "g", chainId: 1 })).toBe(
      "TACTIX ranked score submission\nPool: 0xabcdef\nGame: g\nChain: 1",
    );
  });
});
