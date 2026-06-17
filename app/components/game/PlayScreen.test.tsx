import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n/I18nProvider.js";

const mocks = vi.hoisted(() => ({
  newGame: vi.fn(),
  track: vi.fn(),
  state: null as unknown,
}));
vi.mock("@/lib/game/store.js", () => ({
  useGame: () => ({ state: mocks.state, newGame: mocks.newGame }),
}));
vi.mock("@/lib/analytics/events.js", () => ({ track: mocks.track }));
// GameView pulls in the board + engine; stub it — these tests only exercise the header.
vi.mock("@/components/game/GameView.js", () => ({ GameView: () => null }));

import { PlayScreen } from "./PlayScreen.js";

afterEach(() => {
  mocks.state = null;
  vi.clearAllMocks();
});

function renderScreen() {
  return render(
    <I18nProvider initialLocale="en">
      <PlayScreen />
    </I18nProvider>,
  );
}

test("creates a practice game and fires practice_started on mount", () => {
  renderScreen();
  expect(mocks.newGame).toHaveBeenCalledTimes(1);
  expect(mocks.track).toHaveBeenCalledWith("practice_started");
});

test("renders the How to play trigger in the header and opens the modal", () => {
  mocks.state = {}; // truthy → PlayScreen renders the header (+ stubbed GameView)
  renderScreen();
  fireEvent.click(screen.getByRole("button", { name: /how to play/i }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
