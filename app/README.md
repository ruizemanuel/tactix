# TACTIX — `@teg/app`

> **Conquer. Never lose.**

TACTIX is a TEG-inspired, turn-based war-strategy game built on the no-loss concept. The app has two surfaces:

- **`/`** — the **tournament lobby** (Plan 5b): connect a wallet (MiniPay/injected) and run the on-chain
  `TegPool` txs (approve → join, withdraw deposit, claim prize, emergency withdraw).
- **`/play`** — the game: single-player vs a heuristic AI, running fully client-side, bilingual ES/EN
  (English default).

## Run

```bash
# dev server (http://localhost:3000)
pnpm --filter @teg/app dev

# production build
pnpm --filter @teg/app build

# tests
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

## Tournament lobby (Plan 5b — on-chain)

The lobby talks to a `TegPool` no-loss pool on Celo (wagmi v2 + viem). One active tournament == one deployed
`TegPool` address, configured via `app/.env.local` (gitignored — copy `app/.env.local.example`):

```
NEXT_PUBLIC_CHAIN_ID=11142220        # Celo Sepolia
NEXT_PUBLIC_TEGPOOL_ADDRESS=0x...    # the deployed TegPool
NEXT_PUBLIC_USDT_ADDRESS=0x...       # the (mock) USDT it uses
```

If unset, the lobby renders a "No active tournament configured" card (no crash). On a Celo testnet
(Sepolia, 11142220) or local hardhat (31337) the lobby shows a **"Mint test USDT"** button so you can fund a
join without a faucet. **Never commit a real `app/.env.local`.** Ranked-game→score→leaderboard→oracle
settlement is Plan 5c (not wired here): in 5b, "Play" just launches the local game.

### Manual end-to-end test (Celo Sepolia)

Aave V3 is mainnet-only, so testnet uses mocks. You can't time-travel a live chain, so exercise the full
cycle with a short-timer tournament:

1. **Deploy a fresh short-timer instance** (needs a funded deployer + `CELOSCAN_API_KEY` in `contracts/.env`
   — see `contracts/DEPLOY.md`):
   ```bash
   LOCK_OFFSET_SEC=900 END_OFFSET_SEC=900 pnpm -C contracts exec hardhat run scripts/deploy.ts --network celo-sepolia
   ```
   Copy the printed `TegPool` + `MockUSDT` addresses into `app/.env.local`.
2. `pnpm --filter @teg/app dev`, open the lobby, connect an injected wallet on Celo Sepolia (or open inside MiniPay).
3. **Join:** 0 USDT → "Mint test USDT" → "Approve" → "Join". The participant count increments; the CTA becomes "You're in".
4. **(Optional) full cycle:** after `endTime` (+30 min), as the deployer/oracle call `submitScores` +
   `finalizeAndDistribute`, then confirm the lobby shows "Claim prize" (winner) / "Withdraw deposit" — the
   deposit always comes back in full (no-loss).

## Known limitations (MVP)

1. **Hidden information** — the full `GameState` (including both players' secret objectives/cards) lives in the browser store. A `redactFor` projection for true hidden info is deferred to the on-chain/backend plan; the AI does not read the opponent's objective.
2. **Objective copy** — objective text is sourced from the engine's English description; localized objective copy is a later follow-up.
3. **Leaderboard / oracle / ranked game** — the lobby's wallet + `TegPool` join/withdraw/claim layer is done
   (Plan 5b), but the server-authoritative ranked game, score computation, the oracle that calls
   `submitScores`, and the leaderboard are Plan 5c. In 5b, "Play" launches the local single-player game with
   no on-chain score wiring.
