# TACTIX — `@teg/app`

> **Conquer. Never lose.**

TACTIX is a TEG-inspired, turn-based war-strategy game built on the no-loss concept. This package is the MVP playable UI: single-player vs a heuristic AI, running fully client-side on a 9-territory fixture map, bilingual ES/EN (English default).

## Run

```bash
# dev server (http://localhost:3000)
pnpm --filter @teg/app dev

# production build
pnpm --filter @teg/app build

# tests (16 app-level tests)
pnpm --filter @teg/app test
```

## Bundler note

The `dev` and `build` scripts pass `--webpack` intentionally. Next 16 defaults to Turbopack, but Turbopack does not yet honor `experimental.extensionAlias`, so it cannot resolve the project's `.js`→`.ts`/`.tsx` ESM import specifiers used by `@/...` paths and the raw-TS `@teg/engine` workspace package. Webpack honors it. Revisit when Turbopack gains an equivalent.

## Architecture

| Layer | Package | Role |
|---|---|---|
| Game engine + AI | `@teg/engine` | Pure TS — game rules, state machine, heuristic AI (`decide`) |
| State / glue | `@teg/app` `lib/game/store.ts` | Zustand store: human actions → `applyAction`; AI turn loops `decide`→`applyAction` |
| Board UI | `@teg/app` `components/board/` | `<Board>` interface; `SchematicBoard` renders the 9-territory fixture map |
| Game UI | `@teg/app` `components/game/` | `PlayScreen`, `ActionPanel`, `StatusBar`, `CombatResult` |

The `<Board>` interface is stable — an illustrated ~40-territory map is a later plan and drops in behind the same interface without touching game logic.

## Known limitations (MVP)

1. **Hidden information** — the full `GameState` (including both players' secret objectives/cards) lives in the browser store. A `redactFor` projection for true hidden info is deferred to the on-chain/backend plan; the AI does not read the opponent's objective.
2. **Objective copy** — objective text is sourced from the engine's English description; localized objective copy is a later follow-up.
3. **No web3 / on-chain / leaderboard** — wallet integration, Celo contracts, and a persistent leaderboard are a later plan.
