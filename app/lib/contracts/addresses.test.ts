import { describe, it, expect } from "vitest";
import { isTestnet } from "./addresses.js";

describe("addresses", () => {
  it("isTestnet true for Celo Sepolia + local hardhat, false for mainnet", () => {
    expect(isTestnet(11142220)).toBe(true);
    expect(isTestnet(31337)).toBe(true);
    expect(isTestnet(42220)).toBe(false);
  });
});
