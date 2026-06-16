import {
  pgTable,
  uuid,
  serial,
  text,
  integer,
  bigint,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import type { Action } from "@teg/engine";

// One ranked game = one row. start -> 'open' (seed + session token + growing action log);
// each action appends under an optimistic version lock; finalize -> 'scored'.
export const rankedGames = pgTable(
  "ranked_games",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    poolAddress: text("pool_address").notNull(), // lowercased
    player: text("player").notNull(), // lowercased
    seed: bigint("seed", { mode: "number" }).notNull(), // [0, 2^31)
    commitHash: text("commit_hash").notNull(),
    endTime: bigint("end_time", { mode: "number" }), // pool endTime (immutable), unix seconds; nullable for any pre-migration row
    status: text("status").notNull().default("open"), // 'open' | 'scored'
    version: integer("version").notNull().default(0),
    sessionTokenHash: text("session_token_hash"),
    actions: jsonb("actions").$type<Action[]>(),
    lastActionAt: timestamp("last_action_at", { withTimezone: true }), // nullable; throttles /action
    score: integer("score"),
    won: boolean("won"),
    continents: integer("continents"),
    territories: integer("territories"),
    turnsUsed: integer("turns_used"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    scoredAt: timestamp("scored_at", { withTimezone: true }),
  },
  (t) => ({
    poolStatusIdx: index("ranked_games_pool_status_idx").on(t.poolAddress, t.status),
    poolPlayerIdx: index("ranked_games_pool_player_idx").on(t.poolAddress, t.player),
  }),
);

// Audit trail for the oracle settlement (submitScores / finalizeAndDistribute).
export const settleRuns = pgTable("settle_runs", {
  id: serial("id").primaryKey(),
  poolAddress: text("pool_address").notNull(),
  status: text("status").notNull(), // 'submitted' | 'finalized' | 'failed'
  txHash: text("tx_hash"),
  error: text("error"),
  randomSeed: text("random_seed"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
