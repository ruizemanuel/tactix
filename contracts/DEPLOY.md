# TegPool Deploy Runbook

## Prerequisites

Create `contracts/.env` (gitignored — copy from `.env.example`) with:

```
DEPLOYER_PRIVATE_KEY=0x<your_funded_key>
CELOSCAN_API_KEY=<your_etherscan_v2_unified_key>
PLATFORM_WALLET=0x<optional_platform_wallet>   # defaults to deployer
```

**Never commit `.env`.** The `.gitignore` already excludes it.  
The `CELOSCAN_API_KEY` is an Etherscan v2 unified key (one key works across Celo mainnet and Alfajores). Get one at https://etherscan.io/myapikey.

---

## Local Smoke Test

Deploys mocks + TegPool on the in-memory Hardhat network (no real funds, no RPC needed):

```sh
pnpm -C contracts exec hardhat run scripts/deploy.ts
```

Expected output: mock addresses for USDT/aUSDT/AavePool, then a TegPool address, then the constructor args JSON. No errors.

---

## Alfajores (Testnet)

Deploys MockUSDT + MockAUsdt + MockAavePool + TegPool on Alfajores and auto-verifies on alfajores.celoscan.io.

```sh
pnpm -C contracts run deploy:alfajores
```

**Notes:**
- Fund the deployer with test CELO from the [Celo faucet](https://faucet.celo.org).
- Aave V3 is mainnet-only on Celo, so testnet uses the mock contracts — **there is no real yield on testnet**.
- To simulate yield for manual QA, mint aUSDT directly via the `MockAUsdt` contract after deploy.

---

## Mainnet (USER-GATED)

> This step requires a funded deployer key and must be performed by the operator.

Before running:

1. **Re-verify** the mainnet addresses in `scripts/deploy.ts` against Celoscan and/or Celopedia:
   - USDT: `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e`
   - aUSDT: `0xDeE98402A302e4D707fB9bf2bac66fAEEc31e8Df`
   - Aave V3 Pool: `0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402`
2. Set `PLATFORM_WALLET` in `.env` to the real platform wallet address.
3. Fund the deployer with CELO (for gas) and optionally a USDT seed amount.
4. **Tune** `lockTime`, `endTime`, `deposit`, and `feeBps` in `scripts/deploy.ts` for the specific tournament before deploying.

```sh
pnpm -C contracts run deploy:celo
```

Post-deploy steps (run via a script or via Hardhat console):

```ts
// 1. Set the oracle (backend signer that will call declareWinner)
await pool.setOracle("<backend_signer_address>");

// 2. Approve USDT to the pool, then seed it
await usdt.approve(pool.address, seedAmount);
await pool.seedPool(seedAmount);
```

---

## Constructor Args Reference

Order matters for manual verification on Celoscan if auto-verify fails:

| # | Parameter | Type | Description |
|---|-----------|------|-------------|
| 0 | `_usdt` | `address` | USDT token contract |
| 1 | `_aavePool` | `address` | Aave V3 Pool contract |
| 2 | `_aUsdt` | `address` | aUSDT (Aave receipt token) |
| 3 | `_platformWallet` | `address` | Receives the platform fee on claim |
| 4 | `_lockTime` | `uint256` | Unix timestamp — joins close after this |
| 5 | `_endTime` | `uint256` | Unix timestamp — winner can be declared after this |
| 6 | `_deposit` | `uint256` | Entry fee in USDT atomic units (1 USDT = 1,000,000) |
| 7 | `_tournamentId` | `uint256` | Numeric tournament identifier |
| 8 | `_label` | `string` | Human-readable label (e.g. `"TACTIX-1"`) |
| 9 | `_platformFeeBps` | `uint16` | Platform fee in basis points (1000 = 10%; max 2000) |
| 10 | `_owner` | `address` | Initial contract owner (should be a multisig in production) |

The `Verify args:` line printed by the deploy script contains all 11 values in this order, JSON-serialized. Use it with:

```sh
npx hardhat verify --network celo <TegPool_address> <arg0> <arg1> ... <arg10>
```

---

## Security & Trust Assumptions

*(From the Plan 5a security review — read before deploying real funds.)*

**No-loss guarantee holds** even against a compromised oracle and a normal or paused owner. Participant deposits are always recoverable: `pause` only blocks `join` — withdrawals, claims, and emergency sweeps are never blocked.

**Oracle is trusted** to report final scores. A compromised oracle can misassign the *prize* (yield + seed) and grind the tie-break seed, but **cannot touch principal**. Use a hardened, rotatable backend signer for the oracle key. Rotate it via `setOracle` if compromised.

**Owner should be a multisig / timelock in production.** Owner privileges are:
- Set the platform fee (capped at ≤20%, applies to yield only).
- Set/rotate the oracle address.
- Pause `join` (withdrawals/claims remain open).
- After a **60-day emergency window**, sweep only the **surplus** (seed + yield) — never unwithdrawn participant deposits. (This was fixed in the security pass; the contract enforces it on-chain.)

**Aave systemic tail-risk:** all deposited USDT sits in Aave V3. An Aave insolvency or bad-debt event on USDT is an inherent risk of any yield-bearing no-loss design and is outside the contract's control.

**Gitignored paths** — these must never be committed:
- `contracts/.env` and any `contracts/.env.*` (except `.env.example`)
- `contracts/artifacts/`
- `contracts/cache/`
- `contracts/typechain-types/`
- `contracts/coverage/` and `contracts/coverage.json`
