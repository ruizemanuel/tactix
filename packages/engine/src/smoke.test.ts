import { expect, test } from "vitest";
import { ENGINE_VERSION } from "./index.js";

test("engine package builds and imports", () => {
  expect(ENGINE_VERSION).toBe("0.0.1");
});
