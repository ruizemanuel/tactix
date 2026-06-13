import { describe, it, expect } from "vitest";
import { chainForId } from "./server.js";

describe("chainForId", () => {
  it("maps the configured Celo chains", () => {
    expect(chainForId(42220).id).toBe(42220); // celo
    expect(chainForId(11142220).id).toBe(11142220); // celoSepolia
    expect(chainForId(31337).id).toBe(31337); // hardhat
  });
  it("throws on an unsupported chain", () => {
    expect(() => chainForId(999999)).toThrow();
  });
});
