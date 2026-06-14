import { describe, it, expect, vi, beforeEach } from "vitest";

const readContract = vi.fn();
const writeContract = vi.fn();
const waitForTransactionReceipt = vi.fn();
const bestScoresMap = vi.fn();
const recordSettleRun = vi.fn();

vi.mock("@/lib/web3/server.js", () => ({
  getServerPublicClient: () => ({
    readContract: (...a: unknown[]) => readContract(...a),
    waitForTransactionReceipt: (...a: unknown[]) => waitForTransactionReceipt(...a),
  }),
  getOracleWalletClient: () => ({ writeContract: (...a: unknown[]) => writeContract(...a) }),
}));
vi.mock("@/lib/db/rankedGames.js", () => ({ bestScoresMap: (...a: unknown[]) => bestScoresMap(...a) }));
vi.mock("@/lib/db/settleRuns.js", () => ({ recordSettleRun: (...a: unknown[]) => recordSettleRun(...a) }));
vi.mock("@/lib/contracts/addresses.js", () => ({
  CONFIGURED_CHAIN_ID: 11142220,
  ADDRESSES: { tegPool: "0x9999999999999999999999999999999999999999" },
}));

import { GET, POST } from "./route.js";

const A = "0xAAa0000000000000000000000000000000000001";
const B = "0xBbB0000000000000000000000000000000000002";

function req(secret?: string) {
  return new Request("http://t/api/settle", {
    method: "POST",
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  }) as unknown as import("next/server").NextRequest;
}
function get(secret?: string, pool?: string) {
  const url = pool ? `http://t/api/settle?pool=${pool}` : "http://t/api/settle";
  return new Request(url, {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  }) as unknown as import("next/server").NextRequest;
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("CRON_SECRET", "s3cret");
  readContract.mockReset();
  writeContract.mockReset();
  waitForTransactionReceipt.mockReset();
  bestScoresMap.mockReset();
  recordSettleRun.mockReset();
});

function liveReads() {
  readContract.mockImplementation(({ functionName, args }: { functionName: string; args?: unknown[] }) => {
    switch (functionName) {
      case "scoresSubmitted": return Promise.resolve(false);
      case "finalized": return Promise.resolve(false);
      case "emergencyActive": return Promise.resolve(false);
      case "endTime": return Promise.resolve(BigInt(Math.floor(Date.now() / 1000) - 3600));
      case "participantsLength": return Promise.resolve(2n);
      case "participants": return Promise.resolve((args![0] as bigint) === 0n ? A : B);
      default: throw new Error(`unexpected read ${functionName}`);
    }
  });
}

describe("POST /api/settle", () => {
  it("401 without the cron secret", async () => {
    const res = await POST(req("wrong"));
    expect(res.status).toBe(401);
  });

  it("submits participant-ordered points (0 for non-players) then finalizes", async () => {
    liveReads();
    bestScoresMap.mockResolvedValue(new Map([[A.toLowerCase(), 250]])); // B never played
    writeContract.mockResolvedValueOnce("0xsubmit").mockResolvedValueOnce("0xfinal");
    waitForTransactionReceipt.mockResolvedValue({ status: "success" });

    const res = await POST(req("s3cret"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);

    const submitCall = writeContract.mock.calls.find((c) => c[0].functionName === "submitScores")![0];
    expect(submitCall.args[0]).toEqual([A, B]); // users == participants in order
    expect(submitCall.args[1]).toEqual([250n, 0n]); // points aligned, absent => 0
    expect(writeContract.mock.calls.some((c) => c[0].functionName === "finalizeAndDistribute")).toBe(true);
  });

  it("500s and records failed when the submit tx reverts on-chain", async () => {
    liveReads();
    bestScoresMap.mockResolvedValue(new Map([[A.toLowerCase(), 250]]));
    writeContract.mockResolvedValue("0xsubmit");
    waitForTransactionReceipt.mockResolvedValue({ status: "reverted" });

    const res = await POST(req("s3cret"));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.phase).toBe("submit");
    expect(recordSettleRun).toHaveBeenCalledWith(expect.objectContaining({ status: "failed" }));
    // finalize must NOT run after a failed submit
    expect(writeContract.mock.calls.some((c) => c[0].functionName === "finalizeAndDistribute")).toBe(false);
  });

  it("skips when already finalized", async () => {
    readContract.mockImplementation(({ functionName }: { functionName: string }) => {
      if (functionName === "scoresSubmitted") return Promise.resolve(true);
      if (functionName === "finalized") return Promise.resolve(true);
      if (functionName === "emergencyActive") return Promise.resolve(false);
      if (functionName === "endTime") return Promise.resolve(BigInt(Math.floor(Date.now() / 1000) - 3600));
      throw new Error(`unexpected ${functionName}`);
    });
    const res = await POST(req("s3cret"));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(writeContract).not.toHaveBeenCalled();
  });

  it("GET (the Vercel cron verb) settles like POST", async () => {
    liveReads();
    bestScoresMap.mockResolvedValue(new Map([[A.toLowerCase(), 250]]));
    writeContract.mockResolvedValueOnce("0xsubmit").mockResolvedValueOnce("0xfinal");
    waitForTransactionReceipt.mockResolvedValue({ status: "success" });
    const res = await GET(get("s3cret"));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("401 on GET without the cron secret", async () => {
    const res = await GET(get());
    expect(res.status).toBe(401);
  });

  it("400 on a malformed ?pool=", async () => {
    const res = await GET(get("s3cret", "not-an-address"));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toMatch(/invalid pool/i);
  });
});
