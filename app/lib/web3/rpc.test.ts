import { describe, expect, test } from "vitest";
import { resolveRpcUrls, readTransport } from "./rpc.js";

describe("resolveRpcUrls", () => {
  test("keeps primary then fallback, in order", () => {
    expect(resolveRpcUrls("https://a", "https://b")).toEqual(["https://a", "https://b"]);
  });
  test("drops empty/undefined entries", () => {
    expect(resolveRpcUrls("https://a")).toEqual(["https://a"]);
    expect(resolveRpcUrls(undefined, "https://b")).toEqual(["https://b"]);
    expect(resolveRpcUrls("", "https://b")).toEqual(["https://b"]);
    expect(resolveRpcUrls(undefined, undefined)).toEqual([]);
  });
});

describe("readTransport", () => {
  test("returns a Transport for each URL count without throwing", () => {
    expect(typeof readTransport()).toBe("function");
    expect(typeof readTransport("https://a")).toBe("function");
    expect(typeof readTransport("https://a", "https://b")).toBe("function");
  });
});
