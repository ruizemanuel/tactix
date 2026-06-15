import { and, eq, sql } from "drizzle-orm";
import { getDb } from "./index.js";
import { rankedGames } from "./schema.js";
import type { Action, ScoreBreakdown } from "@teg/engine";
import type { RawScore } from "@/lib/leaderboard/rank.js";

export async function insertOpenGame(v: {
  poolAddress: string;
  player: string;
  seed: number;
  commitHash: string;
}): Promise<string> {
  const db = getDb();
  const [row] = await db
    .insert(rankedGames)
    .values({
      poolAddress: v.poolAddress.toLowerCase(),
      player: v.player.toLowerCase(),
      seed: v.seed,
      commitHash: v.commitHash,
      status: "open",
    })
    .returning({ id: rankedGames.id });
  return row!.id;
}

export async function getOpenGame(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(rankedGames)
    .where(and(eq(rankedGames.id, id), eq(rankedGames.status, "open")));
  return row ?? null;
}

export async function markScored(
  id: string,
  v: { actions: Action[]; score: number; breakdown: ScoreBreakdown },
): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .update(rankedGames)
    .set({
      status: "scored",
      actions: v.actions,
      score: v.score,
      won: v.breakdown.won,
      continents: v.breakdown.continents,
      territories: v.breakdown.territories,
      turnsUsed: v.breakdown.turnsUsed,
      scoredAt: new Date(),
    })
    .where(and(eq(rankedGames.id, id), eq(rankedGames.status, "open")))
    .returning({ id: rankedGames.id });
  return rows.length > 0;
}

export async function bestScores(poolAddress: string): Promise<RawScore[]> {
  const db = getDb();
  const rows = await db
    .select({
      player: rankedGames.player,
      bestScore: sql<number>`max(${rankedGames.score})::int`,
    })
    .from(rankedGames)
    .where(and(eq(rankedGames.poolAddress, poolAddress.toLowerCase()), eq(rankedGames.status, "scored")))
    .groupBy(rankedGames.player);
  return rows.map((r) => ({ player: r.player, bestScore: Number(r.bestScore) }));
}

export async function bestScoresMap(poolAddress: string): Promise<Map<string, number>> {
  const rows = await bestScores(poolAddress);
  return new Map(rows.map((r) => [r.player.toLowerCase(), r.bestScore]));
}
