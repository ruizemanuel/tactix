import { describe, expect, test } from "vitest";
import { formatUsd } from "./format.js";

describe("formatUsd", () => {
  test("whole numbers have no decimals", () => {
    expect(formatUsd(1_000_000n)).toBe("1");
    expect(formatUsd(10_000_000n)).toBe("10");
    expect(formatUsd(0n)).toBe("0");
  });
  test("trims trailing zeros", () => {
    expect(formatUsd(1_500_000n)).toBe("1.5");
    expect(formatUsd(1_200_000n)).toBe("1.2");
  });
  test("truncates (never rounds up) to maxDecimals", () => {
    expect(formatUsd(9_999_999n)).toBe("9.9999"); // 9.999999 -> 9.9999
    expect(formatUsd(1_234_567n)).toBe("1.2345"); // 1.234567 -> 1.2345
  });
  test("respects an explicit maxDecimals", () => {
    expect(formatUsd(1_234_567n, 2)).toBe("1.23");
    expect(formatUsd(1_000_000n, 0)).toBe("1");
  });
  test("maxDecimals beyond the 6 stored decimals shows all available, no padding", () => {
    expect(formatUsd(1_234_567n, 8)).toBe("1.234567"); // only 6 real decimals exist
    expect(formatUsd(1_200_000n, 8)).toBe("1.2"); // trailing zeros still trimmed
  });
});
