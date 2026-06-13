import { NextResponse, type NextRequest } from "next/server";
import { isAddress } from "viem";
import { bestScores } from "@/lib/db/rankedGames.js";
import { rankRows } from "@/lib/leaderboard/rank.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // new URL(req.url) (not req.nextUrl) so the handler is testable with a plain Request.
  const pool = new URL(req.url).searchParams.get("pool");
  if (!pool || !isAddress(pool)) {
    return NextResponse.json({ error: "pool query param (address) required" }, { status: 400 });
  }
  const raw = await bestScores(pool);
  return NextResponse.json({ rows: rankRows(raw) });
}
