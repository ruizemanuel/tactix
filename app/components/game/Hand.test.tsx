import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n/I18nProvider.js";
import { fixtureMap, type Card } from "@teg/engine";
import { Hand } from "./Hand.js";

function renderHand(cards: Card[]) {
  return render(
    <I18nProvider initialLocale="en">
      <Hand cards={cards} map={fixtureMap} />
    </I18nProvider>,
  );
}

const cards: Card[] = [
  { id: "c1", territoryId: "n1", symbol: "globo" },
  { id: "c2", territoryId: "n2", symbol: "canon" },
  { id: "c3", territoryId: "s1", symbol: "barco" },
  { id: "j1", territoryId: "", symbol: "joker" },
];

describe("Hand", () => {
  it("renders nothing when the hand is empty", () => {
    const { container } = renderHand([]);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a chip per card with its country name", () => {
    renderHand(cards);
    expect(screen.getByText("N1")).toBeInTheDocument();
    expect(screen.getByText("N2")).toBeInTheDocument();
    expect(screen.getByText("S1")).toBeInTheDocument();
  });

  it("shows the joker label instead of a country", () => {
    renderHand(cards);
    expect(screen.getByText("Joker")).toBeInTheDocument();
  });

  it("shows the card count in the label", () => {
    renderHand(cards);
    expect(screen.getByText(/Your cards · 4/)).toBeInTheDocument();
  });

  it("exposes an accessible label per card with the suit name", () => {
    renderHand(cards);
    expect(screen.getByRole("img", { name: "Balloon · N1" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Cannon · N2" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ship · S1" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Joker" })).toBeInTheDocument();
  });
});
