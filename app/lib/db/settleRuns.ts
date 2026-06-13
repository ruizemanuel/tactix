import { getDb } from "./index.js";
import { settleRuns } from "./schema.js";

export async function recordSettleRun(v: {
  poolAddress: string;
  status: string;
  txHash?: string;
  error?: string;
  randomSeed?: string;
}): Promise<void> {
  const db = getDb();
  await db.insert(settleRuns).values({
    poolAddress: v.poolAddress.toLowerCase(),
    status: v.status,
    txHash: v.txHash ?? null,
    error: v.error ?? null,
    randomSeed: v.randomSeed ?? null,
  });
}
