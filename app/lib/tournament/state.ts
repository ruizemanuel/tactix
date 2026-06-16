export type TournamentPhase = "OPEN" | "LOCKED" | "ENDED" | "FINALIZED" | "EMERGENCY";

export type Cta =
  | "connect"
  | "switchNetwork"
  | "needUsdt"
  | "approve"
  | "join"
  | "joinClosing"
  | "joinedWaiting"
  | "paused"
  | "full"
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
  paused: boolean;
  poolFull: boolean;
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

/** Stop offering join this many seconds before lockTime, so the client clock never offers a
 *  join() the chain will revert with TournamentLocked at block.timestamp >= lockTime. */
export const JOIN_CLOSE_MARGIN_SEC = 60n;

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
    if (i.paused) return "paused";
    if (i.poolFull) return "full";
    if (BigInt(i.nowSec) + JOIN_CLOSE_MARGIN_SEC >= i.lockTime) return "joinClosing";
    // Balance is checked before allowance on purpose: an approved-but-broke user
    // still can't join, so "needUsdt" takes precedence over "join".
    if (i.usdtBalance < i.deposit) return "needUsdt";
    return i.allowance >= i.deposit ? "join" : "approve";
  }

  if (phase === "LOCKED" || phase === "ENDED") {
    // Results pending — no user action other than waiting. (The card reads `phase`
    // separately to show "in progress" vs "awaiting results" copy.)
    return i.hasJoined ? "joinedWaiting" : "none";
  }

  // Exhaustiveness guard: EMERGENCY/FINALIZED/OPEN/LOCKED/ENDED are all handled
  // above, so `phase` is `never` here. Adding a new TournamentPhase without a
  // branch becomes a COMPILE error instead of silently falling through to a CTA.
  const _exhaustive: never = phase;
  return _exhaustive;
}

/** Pure: map raw on-chain + wallet state to the lobby's phase + the single primary CTA. */
export function deriveTournamentView(i: TournamentInput): TournamentView {
  const phase = derivePhase(i);
  return { phase, cta: deriveCta(i, phase) };
}

export interface OptimisticJoinState {
  approved?: boolean;
  joined?: boolean;
}

/** Overlay a just-confirmed approve/join (optimistic) onto the laggy on-chain reads,
 *  so the lobby CTA advances immediately even when a load-balanced RPC serves a stale
 *  read right after the tx. `approved` lifts a low allowance up to the deposit;
 *  `joined` overrides hasJoined (true after join, false after withdraw). */
export function applyOptimistic(
  read: { allowance: bigint; hasJoined: boolean },
  deposit: bigint,
  o: OptimisticJoinState,
): { allowance: bigint; hasJoined: boolean } {
  return {
    allowance: o.approved && read.allowance < deposit ? deposit : read.allowance,
    hasJoined: o.joined ?? read.hasJoined,
  };
}

/** Clear an optimistic flag once the on-chain read has caught up to it (so the read
 *  becomes authoritative again). Returns the SAME object when nothing changes, so the
 *  caller can skip a state update / re-render. */
export function reconcileOptimistic(
  o: OptimisticJoinState,
  read: { allowance: bigint; hasJoined: boolean },
  deposit: bigint,
): OptimisticJoinState {
  let changed = false;
  const next: OptimisticJoinState = { ...o };
  if (o.approved !== undefined && (read.allowance >= deposit) === o.approved) {
    delete next.approved;
    changed = true;
  }
  if (o.joined !== undefined && read.hasJoined === o.joined) {
    delete next.joined;
    changed = true;
  }
  return changed ? next : o;
}
