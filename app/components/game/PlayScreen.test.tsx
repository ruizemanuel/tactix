import { render } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n/I18nProvider.js";

const mocks = vi.hoisted(() => ({ newGame: vi.fn(), track: vi.fn() }));
vi.mock("@/lib/game/store.js", () => ({ useGame: () => ({ state: null, newGame: mocks.newGame }) }));
vi.mock("@/lib/analytics/events.js", () => ({ track: mocks.track }));

import { PlayScreen } from "./PlayScreen.js";

test("creates a practice game and fires practice_started on mount", () => {
  render(
    <I18nProvider initialLocale="en">
      <PlayScreen />
    </I18nProvider>,
  );
  expect(mocks.newGame).toHaveBeenCalledTimes(1);
  expect(mocks.track).toHaveBeenCalledWith("practice_started");
});
