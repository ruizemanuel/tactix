import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n/I18nProvider.js";
import { createGame, worldMap, type GameState, type Objective } from "@teg/engine";

const objectives: Objective[] = [
  { id: "a", kind: "conquer-count", description: "Take 20", targetCount: 20 },
  { id: "b", kind: "conquer-count", description: "Take 20", targetCount: 20 },
];

const mocks = vi.hoisted(() => ({ store: null as unknown }));
vi.mock("@/lib/game/store.js", () => ({ useGame: () => mocks.store }));

import { GameView } from "./GameView.js";

function storeFor(state: GameState) {
  return {
    state, selected: null, aiThinking: false,
    select: vi.fn(), place: vi.fn(), attack: vi.fn(), fortify: vi.fn(),
    tradeCards: vi.fn(), endReinforce: vi.fn(), endAttack: vi.fn(),
    endTurn: vi.fn(), occupy: vi.fn(),
  };
}

beforeEach(() => {
  mocks.store = null;
});

describe("GameView", () => {
  it("wraps the board in the zoomable surface (board + reset control present)", () => {
    mocks.store = storeFor(createGame(worldMap, ["you", "ai"], objectives, 7));
    render(
      <I18nProvider initialLocale="en">
        <GameView />
      </I18nProvider>,
    );
    expect(screen.getByRole("group", { name: "World board" })).toBeInTheDocument();
    expect(screen.getByTestId("board-reset")).toBeInTheDocument();
  });
});
