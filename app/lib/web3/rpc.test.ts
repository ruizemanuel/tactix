import { describe, expect, test } from "vitest";
import { resolveRpcUrls } from "./rpc.js";

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
