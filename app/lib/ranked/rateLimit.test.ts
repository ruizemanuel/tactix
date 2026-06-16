import { describe, it, expect } from "vitest";
import { isActionThrottled, ACTION_MIN_INTERVAL_MS, START_LIMIT, START_WINDOW_MS } from "./rateLimit.js";

describe("rateLimit constants", () => {
  it("exposes sane tunable defaults", () => {
    expect(START_LIMIT).toBe(10);
    expect(START_WINDOW_MS).toBe(10 * 60_000);
    expect(ACTION_MIN_INTERVAL_MS).toBe(250);
  });
});

describe("isActionThrottled", () => {
  it("allows the first action (no prior timestamp)", () => {
    expect(isActionThrottled(null, 1_000_000)).toBe(false);
  });
  it("throttles a call within the min interval", () => {
    const now = 1_000_000;
    const last = new Date(now - (ACTION_MIN_INTERVAL_MS - 1));
    expect(isActionThrottled(last, now)).toBe(true);
  });
  it("allows a call at exactly the min interval", () => {
    const now = 1_000_000;
    const last = new Date(now - ACTION_MIN_INTERVAL_MS);
    expect(isActionThrottled(last, now)).toBe(false);
  });
  it("allows a call well beyond the min interval", () => {
    const now = 1_000_000;
    const last = new Date(now - 10_000);
    expect(isActionThrottled(last, now)).toBe(false);
  });
});
