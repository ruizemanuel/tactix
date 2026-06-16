import { and, eq, gt, sql } from "drizzle-orm";
import { getDb } from "./index.js";
import { rankedGames } from "./schema.js";
import type { Action, ScoreBreakdown } from "@teg/engine";
import type { RawScore } from "@/lib/leaderboard/rank.js";

export async function insertOpenGame(v: {
  poolAddress: string;
  player: string;
  seed: number;
  commitHash: string;
  sessionTokenHash: string;
  endTime: number;
}): Promise<string> {
  const db = getDb();
  const [row] = await db
    .insert(rankedGames)
    .values({
      poolAddress: v.poolAddress.toLowerCase(),
      player: v.player.toLowerCase(),
      seed: v.seed,
      commitHash: v.commitHash,
      sessionTokenHash: v.sessionTokenHash,
      endTime: v.endTime,
      actions: [],
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

/** Count games created by (poolAddress, player) since `since` — backs the /start rate-limit. */
export async function countRecentGames(poolAddress: string, player: string, since: Date): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(rankedGames)
    .where(
      and(
        eq(rankedGames.poolAddress, poolAddress.toLowerCase()),
        eq(rankedGames.player, player.toLowerCase()),
        gt(rankedGames.createdAt, since),
      ),
    );
  return row?.n ?? 0;
}

/**
 * Optimistic-lock append: persist the new full human log iff the row is still
 * open and at `expectedVersion`. Returns the new version, or null on a version
 * mismatch (concurrent writer / stale client) so the route can resync.
 */
export async function appendAction(
  id: string,
  expectedVersion: number,
  newLog: Action[],
): Promise<number | null> {
  const db = getDb();
  const rows = await db
    .update(rankedGames)
    .set({ actions: newLog, version: expectedVersion + 1, lastActionAt: new Date() })
    .where(
      and(
        eq(rankedGames.id, id),
        eq(rankedGames.status, "open"),
        eq(rankedGames.version, expectedVersion),
      ),
    )
    .returning({ version: rankedGames.version });
  return rows[0]?.version ?? null;
}

export async function markScored(
  id: string,
  v: { actions: Action[]; score: number; breakdown: ScoreBreakdown },
  expectedVersion: number,
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
    .where(
      and(
        eq(rankedGames.id, id),
        eq(rankedGames.status, "open"),
        eq(rankedGames.version, expectedVersion),
      ),
    )
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
