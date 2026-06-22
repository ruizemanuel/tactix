"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, usePublicClient, useSwitchChain } from "wagmi";
import { erc20Abi } from "viem";
import type { config } from "@/lib/web3/wagmi.js";
import { tegPoolAbi } from "@/lib/contracts/tegPool.js";
import { mockUsdtMintAbi } from "@/lib/contracts/erc20.js";
import { ADDRESSES, CONFIGURED_CHAIN_ID, isConfigured, isTestnet } from "@/lib/contracts/addresses.js";
import { deriveTournamentView, applyOptimistic, reconcileOptimistic, type TournamentInput, type OptimisticJoinState } from "@/lib/tournament/state.js";

// Wagmi infers chain IDs as a literal union from the registered config.
// CONFIGURED_CHAIN_ID is typed as `number`; we need to cast it so wagmi's
// generic constraints are satisfied. This is safe because the config only
// includes chains whose IDs are exactly the values in CONFIGURED_CHAIN_ID.
type RegisteredChainId = (typeof config)["chains"][number]["id"];

export function useTegPool() {
  const chainId = CONFIGURED_CHAIN_ID as RegisteredChainId;
  const pool = ADDRESSES.tegPool;
  const usdt = ADDRESSES.usdt;
  const configured = isConfigured();

  const { address, chainId: connectedChainId } = useAccount();
  const connected = Boolean(address);
  const wrongNetwork = connected && connectedChainId !== chainId;
  const poolEnabled = configured && Boolean(pool);
  const userEnabled = poolEnabled && connected;

  const POLL_MS = 6_000;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const read = (functionName: string, args?: readonly unknown[], enabled = poolEnabled, dynamic = false) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useReadContract({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi: tegPoolAbi as any,
      address: pool,
      chainId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      functionName: functionName as any,
      args,
      query: { enabled, refetchInterval: dynamic && enabled ? POLL_MS : false },
    });

  const deposit = read("deposit");
  const lockTime = read("lockTime");
  const endTime = read("endTime");
  const label = read("label");
  const platformFeeBps = read("platformFeeBps");
  const participantsLength = read("participantsLength", undefined, poolEnabled, true);
  const seedAmount = read("seedAmount");
  const scoresSubmitted = read("scoresSubmitted", undefined, poolEnabled, true);
  const finalized = read("finalized", undefined, poolEnabled, true);
  const winner = read("winner", undefined, poolEnabled, true);
  const prizeAmount = read("prizeAmount", undefined, poolEnabled, true);
  const emergencyActive = read("emergencyActive", undefined, poolEnabled, true);
  const hasJoined = read("hasJoined", address ? [address] : undefined, userEnabled, true);
  const prizeClaimed = read("prizeClaimed", undefined, poolEnabled, true);
  const depositWithdrawn = read("depositWithdrawn", address ? [address] : undefined, userEnabled, true);
  const emergencyWithdrawn = read("emergencyWithdrawn", address ? [address] : undefined, userEnabled, true);
  const paused = read("paused", undefined, poolEnabled, true);
  const maxParticipants = read("MAX_PARTICIPANTS");

  const allowance = useReadContract({
    abi: erc20Abi,
    address: usdt,
    chainId,
    functionName: "allowance",
    args: address && pool ? [address, pool] : undefined,
    query: { enabled: userEnabled && Boolean(usdt), refetchInterval: userEnabled && Boolean(usdt) ? POLL_MS : false },
  });
  const usdtBalance = useReadContract({
    abi: erc20Abi,
    address: usdt,
    chainId,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: userEnabled && Boolean(usdt), refetchInterval: userEnabled && Boolean(usdt) ? POLL_MS : false },
  });

  const { writeContractAsync, isPending } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId });

  const [optimistic, setOptimistic] = useState<OptimisticJoinState>({});

  // Reset the optimistic overlay when the connected account changes, so flags from
  // one account never leak to another (in-place wallet account switch).
  useEffect(() => {
    setOptimistic({});
  }, [address]);

  const depositWei = (deposit.data as bigint | undefined) ?? 0n;
  const readAllowance = (allowance.data as bigint | undefined) ?? 0n;
  const readHasJoined = Boolean(hasJoined.data);
  const effective = applyOptimistic({ allowance: readAllowance, hasJoined: readHasJoined }, depositWei, optimistic);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setOptimistic((o) => reconcileOptimistic(o, { allowance: readAllowance, hasJoined: readHasJoined }, depositWei));
  }, [readAllowance, readHasJoined, depositWei]);

  const winnerAddr = winner.data as `0x${string}` | undefined;
  const isWinner = Boolean(address && winnerAddr && winnerAddr.toLowerCase() === address.toLowerCase());

  const participantsNum = Number((participantsLength.data as bigint | undefined) ?? 0n);
  const maxNum = Number((maxParticipants.data as bigint | undefined) ?? 0n);
  const poolFull = maxNum > 0 && participantsNum >= maxNum;

  const input: TournamentInput = {
    connected,
    wrongNetwork,
    nowSec: Math.floor(Date.now() / 1000),
    lockTime: (lockTime.data as bigint | undefined) ?? 0n,
    endTime: (endTime.data as bigint | undefined) ?? 0n,
    deposit: depositWei,
    allowance: effective.allowance,
    usdtBalance: (usdtBalance.data as bigint | undefined) ?? 0n,
    hasJoined: effective.hasJoined,
    paused: Boolean(paused.data),
    poolFull,
    finalized: Boolean(finalized.data),
    scoresSubmitted: Boolean(scoresSubmitted.data),
    isWinner,
    prizeClaimed: Boolean(prizeClaimed.data),
    depositWithdrawn: Boolean(depositWithdrawn.data),
    emergencyActive: Boolean(emergencyActive.data),
    emergencyWithdrawn: Boolean(emergencyWithdrawn.data),
  };

  const view = deriveTournamentView(input);

  async function write(args: Parameters<typeof writeContractAsync>[0]) {
    const hash = await writeContractAsync({ ...args, chainId } as Parameters<typeof writeContractAsync>[0]);
    if (publicClient) {
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("transaction reverted");
    }
    return hash;
  }

  async function refetchAll() {
    await Promise.all([
      hasJoined.refetch(),
      allowance.refetch(),
      usdtBalance.refetch(),
      finalized.refetch(),
      prizeClaimed.refetch(),
      depositWithdrawn.refetch(),
      emergencyWithdrawn.refetch(),
      participantsLength.refetch(),
      // settlement state that gates money CTAs (winner/claim, prize amount, emergency
      // phase) — refetch too so the lobby reflects an oracle finalize/emergency that
      // landed between the user's actions.
      winner.refetch(),
      prizeAmount.refetch(),
      emergencyActive.refetch(),
      scoresSubmitted.refetch(),
      paused.refetch(),
    ]);
  }

  return {
    configured,
    chainId,
    connected,
    wrongNetwork,
    isTestnet: isTestnet(chainId),
    addresses: { pool, usdt },
    view,
    label: (label.data as string | undefined) ?? "",
    deposit: depositWei,
    lockTime: input.lockTime,
    endTime: input.endTime,
    platformFeeBps: Number((platformFeeBps.data as bigint | number | undefined) ?? 0),
    participants: Number((participantsLength.data as bigint | undefined) ?? 0n),
    seedAmount: (seedAmount.data as bigint | undefined) ?? 0n,
    prizeAmount: (prizeAmount.data as bigint | undefined) ?? 0n,
    winner: winnerAddr,
    prizeClaimed: Boolean(prizeClaimed.data),
    usdtBalance: input.usdtBalance,
    isPending,
    actions: {
      switchNetwork: () => switchChainAsync({ chainId }),
      mintTestUsdt: () =>
        write({ abi: mockUsdtMintAbi, address: usdt!, functionName: "mint", args: [address!, depositWei * 10n] }),
      approve: async () => {
        await write({ abi: erc20Abi, address: usdt!, functionName: "approve", args: [pool!, depositWei] });
        setOptimistic((o) => ({ ...o, approved: true }));
      },
      join: async () => {
        await write({ abi: tegPoolAbi, address: pool!, functionName: "join" });
        setOptimistic((o) => ({ ...o, joined: true, approved: undefined })); // join consumes the allowance
      },
      withdrawDeposit: async () => {
        await write({ abi: tegPoolAbi, address: pool!, functionName: "withdrawDeposit" });
        setOptimistic((o) => ({ ...o, joined: false }));
      },
      claimPrize: () => write({ abi: tegPoolAbi, address: pool!, functionName: "claimPrize" }),
      emergencyUserWithdraw: async () => {
        await write({ abi: tegPoolAbi, address: pool!, functionName: "emergencyUserWithdraw" });
        setOptimistic((o) => ({ ...o, joined: false }));
      },
    },
    refetchAll,
  };
}
