import { describe, it, expect } from "vitest";
import { render, screen, render as render2, screen as screen2 } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n/I18nProvider.js";
import { createGame, fixtureMap, type GameState, type Objective } from "@teg/engine";
import { StatusBar } from "./StatusBar.js";

const objectives: Objective[] = [
  { id: "a", kind: "conquer-count", description: "Take 6", targetCount: 6 },
  { id: "b", kind: "conquer-count", description: "Take 6", targetCount: 6 },
];

function withAiCards(n: number): GameState {
  const base = createGame(fixtureMap, ["you", "ai"], objectives, 7);
  return {
    ...base,
    players: base.players.map((p) =>
      p.id === "ai"
        ? { ...p, cards: Array.from({ length: n }, (_, i) => ({ id: `x${i}`, territoryId: "n1", symbol: "globo" as const })) }
        : p,
    ),
  };
}

describe("StatusBar opponent card count", () => {
  it("shows the opponent's card count", () => {
    render(
      <I18nProvider initialLocale="en">
        <StatusBar state={withAiCards(3)} aiThinking={false} />
      </I18nProvider>,
    );
    expect(screen.getByLabelText("AI cards: 3")).toBeInTheDocument();
  });

  it("does not render the count on the winner banner", () => {
    const state = { ...withAiCards(3), winnerId: "you" as const };
    render(
      <I18nProvider initialLocale="en">
        <StatusBar state={state} aiThinking={false} />
      </I18nProvider>,
    );
    expect(screen.queryByLabelText(/AI cards/)).not.toBeInTheDocument();
  });
});

const LONG_OBJECTIVE =
  "Control all of North America and South America plus four more territories anywhere on the map";

describe("StatusBar objective text", () => {
  it("renders the full objective text without truncation", () => {
    const base = createGame(fixtureMap, ["you", "ai"], objectives, 7);
    const you = base.players.find((p) => p.id === "you")!;
    const state: GameState = {
      ...base,
      objectives: {
        ...base.objectives,
        [you.objectiveId]: { ...base.objectives[you.objectiveId]!, description: LONG_OBJECTIVE },
      },
    };
    render2(
      <I18nProvider initialLocale="en">
        <StatusBar state={state} aiThinking={false} />
      </I18nProvider>,
    );
    const span = screen2.getByText(`Your objective: ${LONG_OBJECTIVE}`);
    expect(span).toBeInTheDocument();
    expect(span.className).not.toContain("truncate");
  });
});
