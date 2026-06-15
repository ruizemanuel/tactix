import { NextResponse, type NextRequest } from "next/server";
import { verifyMessage } from "viem";
import { replayGame, computeScore, type Action } from "@teg/engine";
import { CONFIGURED_CHAIN_ID } from "@/lib/contracts/addresses.js";
import { buildSubmitMessage } from "@/lib/ranked/submitMessage.js";
import { getOpenGame, markScored } from "@/lib/db/rankedGames.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HUMAN_ID = "you";
const AI_ID = "ai";

export async function POST(req: NextRequest) {
  let body: { gameId?: string; actions?: unknown; signature?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!body.gameId || !Array.isArray(body.actions)) {
    return NextResponse.json({ error: "gameId and actions[] required" }, { status: 400 });
  }

  const game = await getOpenGame(body.gameId);
  if (!game) return NextResponse.json({ error: "game not found or already scored" }, { status: 404 });

  // Ownership proof: the request must carry a personal_sign signature, by the
  // game's player, over the canonical message bound to this single-use game.
  const signature = body.signature;
  if (typeof signature !== "string" || !signature) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  const message = buildSubmitMessage({
    pool: game.poolAddress,
    gameId: game.id,
    chainId: CONFIGURED_CHAIN_ID,
  });
  let ok = false;
  try {
    ok = await verifyMessage({
      address: game.player as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    ok = false; // malformed signature → unauthorized, not a 500
  }
  if (!ok) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  const actions = body.actions as Action[];
  const result = replayGame(Number(game.seed), actions, { humanId: HUMAN_ID, aiId: AI_ID });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const score = computeScore(result.breakdown);
  const scored = await markScored(game.id, { actions, score, breakdown: result.breakdown });
  if (!scored) return NextResponse.json({ error: "already scored" }, { status: 409 });
  return NextResponse.json({ score, breakdown: result.breakdown, won: result.breakdown.won });
}
