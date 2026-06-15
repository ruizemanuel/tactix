import { describe, it, expect } from "vitest";
import { createGame } from "./setup.js";
import { assignObjectives } from "./worldObjectives.js";
import { worldMap } from "./map/worldMap.js";
import { redactState } from "./redact.js";

function game(seed = 99) {
  const objectives = assignObjectives(["you", "ai"], seed);
  return createGame(worldMap, ["you", "ai"], objectives, seed);
}

describe("redactState", () => {
  it("strips rngState and the deck contents", () => {
    const red = redactState(game(), "you") as unknown as Record<string, unknown>;
    expect("rngState" in red).toBe(false);
    expect("deck" in red).toBe(false);
    expect(red.deckCount).toBe(game().deck.length);
  });

  it("keeps only the viewer's objective", () => {
    const g = game();
    const you = g.players.find((p) => p.id === "you")!;
    const ai = g.players.find((p) => p.id === "ai")!;
    const red = redactState(g, "you");
    expect(Object.keys(red.objectives)).toEqual([you.objectiveId]);
    expect(red.objectives[ai.objectiveId]).toBeUndefined();
  });

  it("hides the other players' cards and objective, keeps the viewer's", () => {
    const red = redactState(game(), "you");
    const you = red.players.find((p) => p.id === "you")!;
    const ai = red.players.find((p) => p.id === "ai")!;
    expect(you.cards).toBeDefined();
    expect(you.objectiveId).toBeDefined();
    expect(ai.cards).toBeUndefined();
    expect(ai.objectiveId).toBeUndefined();
    expect(typeof ai.cardCount).toBe("number");
  });

  it("never serializes a hidden secret", () => {
    const g = game();
    const ai = g.players.find((p) => p.id === "ai")!;
    const aiObjective = g.objectives[ai.objectiveId]!;
    const blob = JSON.stringify(redactState(g, "you"));
    expect(blob).not.toContain("rngState");
    expect(blob).not.toContain(aiObjective.description);
  });
});
