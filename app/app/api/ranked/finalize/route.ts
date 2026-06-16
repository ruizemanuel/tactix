import { NextResponse, type NextRequest } from "next/server";
import { verifyMessage } from "viem";
import { replayGame, computeScore, type Action } from "@teg/engine";
import { CONFIGURED_CHAIN_ID } from "@/lib/contracts/addresses.js";
import { buildSubmitMessage } from "@/lib/ranked/submitMessage.js";
import { getOpenGame, markScored } from "@/lib/db/rankedGames.js";
import { tegPoolAbi } from "@/lib/contracts/tegPool.js";
import { getServerPublicClient } from "@/lib/web3/server.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HUMAN_ID = "you";
const AI_ID = "ai";

export async function POST(req: NextRequest) {
  let body: { gameId?: string; signature?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!body.gameId) {
    return NextResponse.json({ error: "gameId required" }, { status: 400 });
  }

  const game = await getOpenGame(body.gameId);
  if (!game) return NextResponse.json({ error: "game not found or already scored" }, { status: 404 });

  // Ownership proof: a personal_sign signature by the game's player over the
  // canonical message bound to this single-use game (same as the old submit).
  const signature = body.signature;
  if (typeof signature !== "string" || !signature) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  const message = buildSubmitMessage({ pool: game.poolAddress, gameId: game.id, chainId: CONFIGURED_CHAIN_ID });
  let ok = false;
  try {
    ok = await verifyMessage({ address: game.player as `0x${string}`, message, signature: signature as `0x${string}` });
  } catch {
    ok = false;
  }
  if (!ok) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  // Tournament deadline (hard): block scoring once the pool's immutable endTime has passed
  // (stored at /start, zero RPC). This is the money gate where a score enters the leaderboard.
  if (game.endTime != null && Math.floor(Date.now() / 1000) >= game.endTime) {
    return NextResponse.json({ error: "tournament ended" }, { status: 409 });
  }
  // Emergency: read the mutable flag fresh. Fail-open on RPC error — endTime (above) is the
  // authoritative gate and an active emergency disables on-chain payout anyway, so a transient
  // RPC blip must not block a legitimate finalize.
  let emergencyActive = false;
  try {
    const client = getServerPublicClient(CONFIGURED_CHAIN_ID);
    emergencyActive = (await client.readContract({
      address: game.poolAddress as `0x${string}`,
      abi: tegPoolAbi,
      functionName: "emergencyActive",
    })) as boolean;
  } catch (e) {
    console.warn("[ranked/finalize] emergencyActive read failed; proceeding (fail-open)", e);
  }
  if (emergencyActive) return NextResponse.json({ error: "emergency active" }, { status: 409 });

  // The server already holds the full log. replayGame rejects a not-yet-finished
  // game (the human log won't reach a winner) -> 400.
  const log = (game.actions ?? []) as Action[];
  const result = replayGame(Number(game.seed), log, { humanId: HUMAN_ID, aiId: AI_ID });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const score = computeScore(result.breakdown);
  const scored = await markScored(game.id, { actions: log, score, breakdown: result.breakdown }, game.version);
  if (!scored) return NextResponse.json({ error: "already scored" }, { status: 409 });
  return NextResponse.json({ score, breakdown: result.breakdown, won: result.breakdown.won });
}
