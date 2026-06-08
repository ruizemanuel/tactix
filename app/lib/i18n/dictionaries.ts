export type Locale = "en" | "es";

export const DEFAULT_LOCALE: Locale = "en";

// Flat key→string dictionaries. `{n}` style placeholders are filled by t().
export const dictionaries: Record<Locale, Record<string, string>> = {
  en: {
    "app.title": "TACTIX",
    "app.tagline": "Conquer. Never lose.",
    "game.you": "You",
    "game.ai": "AI",
    "phase.reinforce": "Reinforce",
    "phase.attack": "Attack",
    "phase.fortify": "Fortify",
    "action.place": "Place {n} armies",
    "action.endReinforce": "Start attacking",
    "action.endAttack": "Move to fortify",
    "action.endTurn": "End turn",
    "action.tradeCards": "Trade cards (+{n})",
    "action.cancel": "Cancel",
    "prompt.place": "Tap one of your territories to place {n} armies.",
    "prompt.attackFrom": "Tap a territory of yours (2+ armies) to attack from.",
    "prompt.attackTo": "Tap an adjacent enemy territory to attack.",
    "prompt.fortifyFrom": "Tap a territory to move armies from.",
    "prompt.fortifyTo": "Tap an adjacent territory of yours to move into.",
    "status.turn": "{name}'s turn — {phase}",
    "status.yourObjective": "Your objective: {obj}",
    "status.winner": "{name} wins!",
    "status.aiThinking": "AI is moving…",
    "combat.result": "{from} → {to}: you lost {al}, enemy lost {dl}{conq}",
    "combat.conquered": " — conquered!",
    "newGame": "New game",
  },
  es: {
    "app.title": "TACTIX",
    "app.tagline": "Conquistá sin perder",
    "game.you": "Vos",
    "game.ai": "IA",
    "phase.reinforce": "Refuerzo",
    "phase.attack": "Ataque",
    "phase.fortify": "Reagrupe",
    "action.place": "Colocar {n} ejércitos",
    "action.endReinforce": "Empezar a atacar",
    "action.endAttack": "Pasar a reagrupe",
    "action.endTurn": "Terminar turno",
    "action.tradeCards": "Canjear cartas (+{n})",
    "action.cancel": "Cancelar",
    "prompt.place": "Tocá un territorio tuyo para colocar {n} ejércitos.",
    "prompt.attackFrom": "Tocá un territorio tuyo (2+ ejércitos) para atacar desde ahí.",
    "prompt.attackTo": "Tocá un territorio enemigo adyacente para atacar.",
    "prompt.fortifyFrom": "Tocá un territorio para mover ejércitos.",
    "prompt.fortifyTo": "Tocá un territorio tuyo adyacente para reforzar.",
    "status.turn": "Turno de {name} — {phase}",
    "status.yourObjective": "Tu objetivo: {obj}",
    "status.winner": "¡Ganó {name}!",
    "status.aiThinking": "La IA está jugando…",
    "combat.result": "{from} → {to}: perdiste {al}, el enemigo perdió {dl}{conq}",
    "combat.conquered": " — ¡conquistado!",
    "newGame": "Nueva partida",
  },
};

/** Look up a key in a locale, fall back to English, then to the key itself; fill {placeholders}. */
export function translate(locale: Locale, key: string, vars: Record<string, string | number> = {}): string {
  const template = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}
