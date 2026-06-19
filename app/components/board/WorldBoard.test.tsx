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

test("uses the left-cropped viewBox (no far-left empty ocean / lone island)", () => {
  const state = createGame(worldMap, ["you", "ai"], objectives, 7);
  render(<WorldBoard state={state} selectable={[]} selected={null} onSelect={() => {}} />);
  expect(screen.getByRole("group", { name: "World board" }).getAttribute("viewBox")).toBe("110 0 890 560");
});

test("draws adjacency flow lines from the selected territory in attack, but not in reinforce", () => {
  const base = createGame(worldMap, ["you", "ai"], objectives, 7);
  const territories = Object.fromEntries(worldMap.territories.map((t) => [t.id, { ownerId: "ai", armies: 1 }]));
  territories.usa = { ownerId: "you", armies: 5 };
  const attackState = { ...base, territories, phase: "attack" as const };
  const { rerender, container } = render(<WorldBoard state={attackState} selectable={[]} selected="usa" onSelect={() => {}} />);
  expect(container.querySelectorAll('[data-testid="flow-line"]').length).toBeGreaterThan(0);
  rerender(<WorldBoard state={{ ...attackState, phase: "reinforce" as const }} selectable={[]} selected="usa" onSelect={() => {}} />);
  expect(container.querySelectorAll('[data-testid="flow-line"]')).toHaveLength(0);
});
