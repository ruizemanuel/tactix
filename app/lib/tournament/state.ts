export type TournamentPhase = "OPEN" | "LOCKED" | "ENDED" | "FINALIZED" | "EMERGENCY";

export type Cta =
  | "connect"
  | "switchNetwork"
  | "needUsdt"
  | "approve"
  | "join"
  | "joinedWaiting"
  | "claim"
  | "withdraw"
  | "emergencyWithdraw"
  | "done"
  | "none";

export interface TournamentInput {
  connected: boolean;
  wrongNetwork: boolean;
  nowSec: number;
  lockTime: bigint;
  endTime: bigint;
  deposit: bigint;
  allowance: bigint;
  usdtBalance: bigint;
  hasJoined: boolean;
  finalized: boolean;
  scoresSubmitted: boolean;
  isWinner: boolean;
  prizeClaimed: boolean;
  depositWithdrawn: boolean;
  emergencyActive: boolean;
  emergencyWithdrawn: boolean;
}

export interface TournamentView {
  phase: TournamentPhase;
  cta: Cta;
}

function derivePhase(i: TournamentInput): TournamentPhase {
  if (i.emergencyActive) return "EMERGENCY";
  if (i.finalized) return "FINALIZED";
  const now = BigInt(i.nowSec);
  if (now < i.lockTime) return "OPEN";
  if (now < i.endTime) return "LOCKED";
  return "ENDED";
}

function deriveCta(i: TournamentInput, phase: TournamentPhase): Cta {
  if (!i.connected) return "connect";
  if (i.wrongNetwork) return "switchNetwork";

  if (phase === "EMERGENCY") {
    if (!i.hasJoined) return "none";
    return i.emergencyWithdrawn ? "done" : "emergencyWithdraw";
  }

  if (phase === "FINALIZED") {
    if (!i.hasJoined) return "none";
    if (i.depositWithdrawn) return "done";
    if (i.isWinner && !i.prizeClaimed) return "claim";
    return "withdraw";
  }

  if (phase === "OPEN") {
    if (i.hasJoined) return "joinedWaiting";
    if (i.usdtBalance < i.deposit) return "needUsdt";
    return i.allowance >= i.deposit ? "join" : "approve";
  }

  // LOCKED or ENDED (results pending)
  if (i.hasJoined) return "joinedWaiting";
  return "none";
}

/** Pure: map raw on-chain + wallet state to the lobby's phase + the single primary CTA. */
export function deriveTournamentView(i: TournamentInput): TournamentView {
  const phase = derivePhase(i);
  return { phase, cta: deriveCta(i, phase) };
}
