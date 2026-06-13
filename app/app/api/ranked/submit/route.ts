import { NextResponse, type NextRequest } from "next/server";
import { replayGame, computeScore, type Action } from "@teg/engine";
import { getOpenGame, markScored } from "@/lib/db/rankedGames.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HUMAN_ID = "you";
const AI_ID = "ai";

export async function POST(req: NextRequest) {
  let body: { gameId?: string; actions?: unknown };
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

  const actions = body.actions as Action[];
  const result = replayGame(Number(game.seed), actions, { humanId: HUMAN_ID, aiId: AI_ID });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const score = computeScore(result.breakdown);
  await markScored(game.id, { actions, score, breakdown: result.breakdown });
  return NextResponse.json({ score, breakdown: result.breakdown, won: result.breakdown.won });
}
