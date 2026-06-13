import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { CONFIGURED_CHAIN_ID, ADDRESSES } from "@/lib/contracts/addresses.js";
import { tegPoolAbi } from "@/lib/contracts/tegPool.js";
import { getServerPublicClient, getOracleWalletClient } from "@/lib/web3/server.js";
import { bestScoresMap } from "@/lib/db/rankedGames.js";
import { recordSettleRun } from "@/lib/db/settleRuns.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  // new URL(req.url) (not req.nextUrl) so the handler is testable with a plain Request.
  const pool = (new URL(req.url).searchParams.get("pool") ?? ADDRESSES.tegPool) as `0x${string}` | undefined;
  if (!pool) return NextResponse.json({ ok: false, reason: "no pool configured" }, { status: 400 });

  const client = getServerPublicClient(CONFIGURED_CHAIN_ID);
  const [scoresSubmitted, finalized, emergencyActive, endTime] = await Promise.all([
    client.readContract({ address: pool, abi: tegPoolAbi, functionName: "scoresSubmitted" }) as Promise<boolean>,
    client.readContract({ address: pool, abi: tegPoolAbi, functionName: "finalized" }) as Promise<boolean>,
    client.readContract({ address: pool, abi: tegPoolAbi, functionName: "emergencyActive" }) as Promise<boolean>,
    client.readContract({ address: pool, abi: tegPoolAbi, functionName: "endTime" }) as Promise<bigint>,
  ]);

  if (emergencyActive) return NextResponse.json({ ok: false, reason: "emergency active" });
  if (finalized) return NextResponse.json({ ok: true, reason: "already finalized" });
  if (BigInt(Math.floor(Date.now() / 1000)) < endTime) {
    return NextResponse.json({ ok: false, reason: "tournament not ended" }, { status: 409 });
  }

  const wallet = getOracleWalletClient(CONFIGURED_CHAIN_ID);
  let submitTx: `0x${string}` | undefined;

  // ── Phase 1 — submitScores (only if not already submitted) ──
  if (!scoresSubmitted) {
    const n = (await client.readContract({ address: pool, abi: tegPoolAbi, functionName: "participantsLength" })) as bigint;
    if (n === 0n) return NextResponse.json({ ok: false, reason: "no participants" });

    const participants: `0x${string}`[] = [];
    for (let i = 0n; i < n; i++) {
      participants.push(
        (await client.readContract({ address: pool, abi: tegPoolAbi, functionName: "participants", args: [i] })) as `0x${string}`,
      );
    }

    const best = await bestScoresMap(pool); // Map<lowercased addr, bestScore>
    const users = participants; // must equal participants in order (contract enforces)
    const points = participants.map((a) => BigInt(best.get(a.toLowerCase()) ?? 0));
    const randomSeed = BigInt("0x" + crypto.randomBytes(32).toString("hex"));

    try {
      submitTx = await wallet.writeContract({ address: pool, abi: tegPoolAbi, functionName: "submitScores", args: [users, points, randomSeed] });
      const submitReceipt = await client.waitForTransactionReceipt({ hash: submitTx });
      if (submitReceipt.status !== "success") throw new Error(`submitScores reverted (${submitTx})`);
      await recordSettleRun({ poolAddress: pool, status: "submitted", txHash: submitTx, randomSeed: randomSeed.toString() });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      await recordSettleRun({ poolAddress: pool, status: "failed", error: err });
      return NextResponse.json({ ok: false, phase: "submit", error: err }, { status: 500 });
    }
  }

  // ── Phase 2 — finalizeAndDistribute (permissionless; one-shot settlement) ──
  let finalizeTx: `0x${string}`;
  try {
    finalizeTx = await wallet.writeContract({ address: pool, abi: tegPoolAbi, functionName: "finalizeAndDistribute" });
    const finalizeReceipt = await client.waitForTransactionReceipt({ hash: finalizeTx });
    if (finalizeReceipt.status !== "success") throw new Error(`finalizeAndDistribute reverted (${finalizeTx})`);
    await recordSettleRun({ poolAddress: pool, status: "finalized", txHash: finalizeTx });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await recordSettleRun({ poolAddress: pool, status: "failed", error: err });
    return NextResponse.json({ ok: false, phase: "finalize", submitTx: submitTx ?? null, error: err }, { status: 500 });
  }

  return NextResponse.json({ ok: true, submitTx: submitTx ?? null, finalizeTx });
}
