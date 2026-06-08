import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { SchematicBoard } from "./SchematicBoard.js";
import { createGame, fixtureMap, type Objective } from "@teg/engine";

const objectives: Objective[] = [
  { id: "a", kind: "conquer-count", description: "", targetCount: 6 },
  { id: "b", kind: "conquer-count", description: "", targetCount: 6 },
];

test("renders a node per territory with its army count and calls onSelect on tap", () => {
  const state = createGame(fixtureMap, ["you", "ai"], objectives, 7);
  const onSelect = vi.fn();
  render(<SchematicBoard state={state} selectable={["n1"]} selected={null} onSelect={onSelect} />);

  // 9 territory buttons.
  expect(screen.getAllByRole("button")).toHaveLength(9);
  // Each node shows its territory id label.
  for (const t of fixtureMap.territories) {
    expect(screen.getByTestId(`node-${t.id}`)).toBeInTheDocument();
  }
  fireEvent.click(screen.getByTestId("node-n1"));
  expect(onSelect).toHaveBeenCalledWith("n1");
});

test("marks selectable and selected nodes via aria/data attributes", () => {
  const state = createGame(fixtureMap, ["you", "ai"], objectives, 7);
  render(<SchematicBoard state={state} selectable={["n1", "n2"]} selected={"n1"} onSelect={() => {}} />);
  expect(screen.getByTestId("node-n1").getAttribute("data-selected")).toBe("true");
  expect(screen.getByTestId("node-n2").getAttribute("data-selectable")).toBe("true");
  expect(screen.getByTestId("node-n3").getAttribute("data-selectable")).toBe("false");
});
