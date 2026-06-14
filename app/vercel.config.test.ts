// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("vercel.json cron", () => {
  it("schedules a cron hitting /api/settle", () => {
    const cfg = JSON.parse(readFileSync(new URL("./vercel.json", import.meta.url), "utf8"));
    expect(Array.isArray(cfg.crons)).toBe(true);
    expect(cfg.crons.some((c: { path: string }) => c.path === "/api/settle")).toBe(true);
  });
});
