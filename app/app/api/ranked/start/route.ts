import { NextResponse, type NextRequest } from "next/server";
import { isAddress, keccak256, toHex } from "viem";
import crypto from "node:crypto";
import { assignObjectives, createGame, redactState, worldMap } from "@teg/engine";
import { CONFIGURED_CHAIN_ID } from "@/lib/contracts/addresses.js";
import { tegPoolAbi } from "@/lib/contracts/tegPool.js";
import { getServerPublicClient } from "@/lib/web3/server.js";
import { insertOpenGame, countRecentGames } from "@/lib/db/rankedGames.js";
import { START_LIMIT, START_WINDOW_MS } from "@/lib/ranked/rateLimit.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HUMAN_ID = "you";
const AI_ID = "ai";

export async function POST(req: NextRequest) {
  let body: { pool?: string; player?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const { pool, player } = body;
  if (!pool || !isAddress(pool) || !player || !isAddress(player)) {
    return NextResponse.json({ error: "pool and player must be addresses" }, { status: 400 });
  }

  // Per-participant rate-limit (Neon count) BEFORE the on-chain reads, so a rate-limited
  // caller doesn't trigger the 3 RPC reads. Bounds open-row bloat + RPC hammering.
  // Check-then-insert TOCTOU is tolerated: this is a coarse abuse bound (money is gated
  // on-chain by hasJoined + the oracle), so a tiny concurrent overshoot is harmless.
  const recent = await countRecentGames(pool, player, new Date(Date.now() - START_WINDOW_MS));
  if (recent >= START_LIMIT) {
    return NextResponse.json({ error: "too many games, slow down" }, { status: 429 });
  }

  const client = getServerPublicClient(CONFIGURED_CHAIN_ID);
  const [hasJoined, endTime, emergencyActive] = await Promise.all([
    client.readContract({ address: pool, abi: tegPoolAbi, functionName: "hasJoined", args: [player] }) as Promise<boolean>,
    client.readContract({ address: pool, abi: tegPoolAbi, functionName: "endTime" }) as Promise<bigint>,
    client.readContract({ address: pool, abi: tegPoolAbi, functionName: "emergencyActive" }) as Promise<boolean>,
  ]);

  if (!hasJoined) return NextResponse.json({ error: "not a participant" }, { status: 403 });
  if (emergencyActive) return NextResponse.json({ error: "emergency active" }, { status: 409 });
  if (BigInt(Math.floor(Date.now() / 1000)) >= endTime) {
    return NextResponse.json({ error: "tournament ended" }, { status: 409 });
  }

  // Seed never leaves the server. The session token authorizes the action loop.
  const seed = crypto.randomInt(0, 2 ** 31);
  const commitHash = keccak256(toHex(seed)); // audit commitment to the seed
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const sessionTokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");

  const objectives = assignObjectives([HUMAN_ID, AI_ID], seed);
  const initial = createGame(worldMap, [HUMAN_ID, AI_ID], objectives, seed);
  const view = redactState(initial, HUMAN_ID);

  const gameId = await insertOpenGame({ poolAddress: pool, player, seed, commitHash, sessionTokenHash, endTime: Number(endTime) });
  return NextResponse.json({ gameId, sessionToken, version: 0, view });
}
