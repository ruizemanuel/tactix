import { formatUnits } from "viem";

/**
 * Format a 6-decimal USDT amount for display. Truncates (never rounds up) the
 * fraction to `maxDecimals` and trims trailing zeros, so we never show a prize
 * larger than what is actually claimable. e.g. 9_999_999n -> "9.9999", 1_000_000n -> "1".
 */
export function formatUsd(amount: bigint, maxDecimals = 4): string {
  const parts = formatUnits(amount, 6).split(".");
  const whole = parts[0] ?? "0";
  const frac = parts[1] ?? "";
  if (maxDecimals <= 0 || frac === "") return whole;
  const truncated = frac.slice(0, maxDecimals).replace(/0+$/, "");
  return truncated ? `${whole}.${truncated}` : whole;
}
