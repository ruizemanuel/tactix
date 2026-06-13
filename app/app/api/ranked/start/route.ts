import { NextResponse, type NextRequest } from "next/server";
import { isAddress, keccak256, toHex } from "viem";
import crypto from "node:crypto";
import { CONFIGURED_CHAIN_ID } from "@/lib/contracts/addresses.js";
import { tegPoolAbi } from "@/lib/contracts/tegPool.js";
import { getServerPublicClient } from "@/lib/web3/server.js";
import { insertOpenGame } from "@/lib/db/rankedGames.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const seed = crypto.randomInt(0, 2 ** 31);
  const commitHash = keccak256(toHex(seed));
  const gameId = await insertOpenGame({ poolAddress: pool, player, seed, commitHash });
  return NextResponse.json({ gameId, seed, commitHash });
}
