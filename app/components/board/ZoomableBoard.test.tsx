import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n/I18nProvider.js";
import { createGame, worldMap, type Objective } from "@teg/engine";
import { ZoomableBoard } from "./ZoomableBoard.js";

const objectives: Objective[] = [
  { id: "a", kind: "conquer-count", description: "", targetCount: 20 },
  { id: "b", kind: "conquer-count", description: "", targetCount: 20 },
];

function renderBoard(onSelect = vi.fn()) {
  const state = createGame(worldMap, ["you", "ai"], objectives, 7);
  render(
    <I18nProvider initialLocale="en">
      <ZoomableBoard state={state} selectable={["usa"]} selected={null} onSelect={onSelect} />
    </I18nProvider>,
  );
  return onSelect;
}

describe("ZoomableBoard", () => {
  it("renders the world board territories", () => {
    renderBoard();
    expect(screen.getByTestId("node-usa")).toBeInTheDocument();
  });

  it("renders a reset control", () => {
    renderBoard();
    expect(screen.getByTestId("board-reset")).toBeInTheDocument();
  });

  it("preserves tap-to-select (a tap on a territory fires onSelect)", () => {
    const onSelect = renderBoard();
    fireEvent.click(screen.getByTestId("node-usa"));
    expect(onSelect).toHaveBeenCalledWith("usa");
  });
});
