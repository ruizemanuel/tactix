import { describe, it, expect } from "vitest";
import { dictionaries } from "./dictionaries.js";

const isFeatureKey = (k: string) =>
  k.startsWith("howto.") || k.startsWith("continent.") || k.startsWith("card.") || k.startsWith("dice.") || k.startsWith("board.");

describe("dictionaries — how-to-play feature keys", () => {
  it("defines exactly the same howto.* / continent.* keys in both locales", () => {
    const en = Object.keys(dictionaries.en).filter(isFeatureKey).sort();
    const es = Object.keys(dictionaries.es).filter(isFeatureKey).sort();
    expect(en.length).toBeGreaterThan(0);
    expect(es).toEqual(en);
  });

  it("has non-empty values for every feature key in both locales", () => {
    for (const locale of ["en", "es"] as const) {
      for (const [k, v] of Object.entries(dictionaries[locale])) {
        if (isFeatureKey(k)) expect(v, `${locale}:${k}`).toBeTruthy();
      }
    }
  });

  it("includes the anchor keys", () => {
    for (const locale of ["en", "es"] as const) {
      for (const k of [
        "howto.open", "howto.title", "howto.close",
        "howto.combat.title", "howto.cards.title", "howto.objectives.title",
        "howto.continents.title", "howto.score.title",
        "howto.objectives.o1", "howto.objectives.o7",
        "continent.northAmerica", "continent.oceania",
        "card.hand", "card.rivalCards",
        "card.suit.globo", "card.suit.canon", "card.suit.barco", "card.suit.joker",
        "dice.attacker", "dice.defender",
        "board.reset",
      ]) {
        expect(dictionaries[locale][k], `${locale}:${k}`).toBeTruthy();
      }
    }
  });
});
