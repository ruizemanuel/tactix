import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { WorldBoard } from "./WorldBoard.js";
import { createGame, worldMap, type Objective } from "@teg/engine";

const objectives: Objective[] = [
  { id: "a", kind: "conquer-count", description: "", targetCount: 20 },
  { id: "b", kind: "conquer-count", description: "", targetCount: 20 },
];

test("renders a button per territory with its army count and calls onSelect on tap", () => {
  const state = createGame(worldMap, ["you", "ai"], objectives, 7);
  const onSelect = vi.fn();
  render(<WorldBoard state={state} selectable={["usa"]} selected={null} onSelect={onSelect} />);
  expect(screen.getAllByRole("button")).toHaveLength(32);
  for (const t of worldMap.territories) {
    expect(screen.getByTestId(`node-${t.id}`)).toBeInTheDocument();
  }
  fireEvent.click(screen.getByTestId("node-usa"));
  expect(onSelect).toHaveBeenCalledWith("usa");
});

test("marks selectable and selected nodes via data attributes", () => {
  const state = createGame(worldMap, ["you", "ai"], objectives, 7);
  render(<WorldBoard state={state} selectable={["usa", "canada"]} selected={"usa"} onSelect={() => {}} />);
  expect(screen.getByTestId("node-usa").getAttribute("data-selected")).toBe("true");
  expect(screen.getByTestId("node-canada").getAttribute("data-selectable")).toBe("true");
  expect(screen.getByTestId("node-mexico").getAttribute("data-selectable")).toBe("false");
});
