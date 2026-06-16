import { describe, it, test, expect } from "vitest";
import { deriveTournamentView, applyOptimistic, reconcileOptimistic, type TournamentInput } from "./state.js";

const base: TournamentInput = {
  connected: true,
  wrongNetwork: false,
  nowSec: 1000,
  lockTime: 2000n,
  endTime: 3000n,
  deposit: 1_000_000n,
  allowance: 0n,
  usdtBalance: 5_000_000n,
  hasJoined: false,
  paused: false,
  poolFull: false,
  finalized: false,
  scoresSubmitted: false,
  isWinner: false,
  prizeClaimed: false,
  depositWithdrawn: false,
  emergencyActive: false,
  emergencyWithdrawn: false,
};

describe("deriveTournamentView — phase", () => {
  it("OPEN before lockTime", () => {
    expect(deriveTournamentView({ ...base, nowSec: 1500 }).phase).toBe("OPEN");
  });
  it("LOCKED between lock and end", () => {
    expect(deriveTournamentView({ ...base, nowSec: 2500 }).phase).toBe("LOCKED");
  });
  it("ENDED after endTime when not finalized", () => {
    expect(deriveTournamentView({ ...base, nowSec: 3500 }).phase).toBe("ENDED");
  });
  it("FINALIZED when finalized", () => {
    expect(deriveTournamentView({ ...base, nowSec: 3500, finalized: true }).phase).toBe("FINALIZED");
  });
  it("EMERGENCY overrides everything", () => {
    expect(deriveTournamentView({ ...base, nowSec: 3500, emergencyActive: true }).phase).toBe("EMERGENCY");
  });
});

describe("deriveTournamentView — CTA", () => {
  it("disconnected → connect", () => {
    expect(deriveTournamentView({ ...base, connected: false }).cta).toBe("connect");
  });
  it("wrong network → switchNetwork", () => {
    expect(deriveTournamentView({ ...base, wrongNetwork: true }).cta).toBe("switchNetwork");
  });
  it("OPEN, not joined, no allowance → approve", () => {
    expect(deriveTournamentView({ ...base, nowSec: 1500, allowance: 0n }).cta).toBe("approve");
  });
  it("OPEN, not joined, allowance >= deposit → join", () => {
    expect(deriveTournamentView({ ...base, nowSec: 1500, allowance: 1_000_000n }).cta).toBe("join");
  });
  it("OPEN, not joined, insufficient USDT → needUsdt", () => {
    expect(deriveTournamentView({ ...base, nowSec: 1500, usdtBalance: 0n }).cta).toBe("needUsdt");
  });
  it("OPEN, already joined → joinedWaiting", () => {
    expect(deriveTournamentView({ ...base, nowSec: 1500, hasJoined: true }).cta).toBe("joinedWaiting");
  });
  it("LOCKED, joined → joinedWaiting", () => {
    expect(deriveTournamentView({ ...base, nowSec: 2500, hasJoined: true }).cta).toBe("joinedWaiting");
  });
  it("FINALIZED, winner not claimed → claim", () => {
    expect(deriveTournamentView({ ...base, nowSec: 3500, finalized: true, hasJoined: true, isWinner: true }).cta).toBe("claim");
  });
  it("FINALIZED, joined non-winner not withdrawn → withdraw", () => {
    expect(deriveTournamentView({ ...base, nowSec: 3500, finalized: true, hasJoined: true }).cta).toBe("withdraw");
  });
  it("FINALIZED, winner already claimed but deposit not withdrawn → withdraw", () => {
    expect(deriveTournamentView({ ...base, nowSec: 3500, finalized: true, hasJoined: true, isWinner: true, prizeClaimed: true }).cta).toBe("withdraw");
  });
  it("FINALIZED, everything done → done", () => {
    expect(deriveTournamentView({ ...base, nowSec: 3500, finalized: true, hasJoined: true, depositWithdrawn: true }).cta).toBe("done");
  });
  it("FINALIZED, never joined → none", () => {
    expect(deriveTournamentView({ ...base, nowSec: 3500, finalized: true, hasJoined: false }).cta).toBe("none");
  });
  it("EMERGENCY, joined not withdrawn → emergencyWithdraw", () => {
    expect(deriveTournamentView({ ...base, emergencyActive: true, hasJoined: true }).cta).toBe("emergencyWithdraw");
  });
  it("EMERGENCY, already emergency-withdrawn → done", () => {
    expect(deriveTournamentView({ ...base, emergencyActive: true, hasJoined: true, emergencyWithdrawn: true }).cta).toBe("done");
  });
  it("OPEN, approved but insufficient balance → needUsdt (balance beats allowance)", () => {
    expect(deriveTournamentView({ ...base, nowSec: 1500, allowance: 1_000_000n, usdtBalance: 0n }).cta).toBe("needUsdt");
  });
  it("ENDED, joined → joinedWaiting", () => {
    expect(deriveTournamentView({ ...base, nowSec: 3500, hasJoined: true }).cta).toBe("joinedWaiting");
  });
  it("OPEN, not joined, paused → paused", () => {
    expect(deriveTournamentView({ ...base, nowSec: 1500, paused: true }).cta).toBe("paused");
  });
  it("OPEN, not joined, pool full → full", () => {
    expect(deriveTournamentView({ ...base, nowSec: 1500, poolFull: true }).cta).toBe("full");
  });
  it("OPEN, already joined, paused → joinedWaiting (pause doesn't affect a joined user)", () => {
    expect(deriveTournamentView({ ...base, nowSec: 1500, hasJoined: true, paused: true }).cta).toBe("joinedWaiting");
  });
  it("OPEN, paused takes precedence over full", () => {
    expect(deriveTournamentView({ ...base, nowSec: 1500, paused: true, poolFull: true }).cta).toBe("paused");
  });
  it("OPEN, not joined, within 60s of lockTime → joinClosing (don't offer a Join that reverts)", () => {
    expect(deriveTournamentView({ ...base, nowSec: 1970, allowance: 1_000_000n }).cta).toBe("joinClosing");
  });
  it("OPEN, not joined, exactly at the margin edge (now+60 == lockTime) → joinClosing", () => {
    expect(deriveTournamentView({ ...base, nowSec: 1940, allowance: 1_000_000n }).cta).toBe("joinClosing");
  });
  it("OPEN, not joined, just before the margin (now+60 < lockTime) → join", () => {
    expect(deriveTournamentView({ ...base, nowSec: 1939, allowance: 1_000_000n }).cta).toBe("join");
  });
  it("OPEN, already joined, within margin → joinedWaiting (margin only gates new joins)", () => {
    expect(deriveTournamentView({ ...base, nowSec: 1970, hasJoined: true }).cta).toBe("joinedWaiting");
  });
});

describe("deriveTournamentView — time boundaries (off-by-one guards)", () => {
  it("now == lockTime → LOCKED (not OPEN)", () => {
    expect(deriveTournamentView({ ...base, nowSec: 2000 }).phase).toBe("LOCKED");
  });
  it("now == endTime → ENDED (not LOCKED)", () => {
    expect(deriveTournamentView({ ...base, nowSec: 3000 }).phase).toBe("ENDED");
  });
  it("allowance exactly == deposit → join", () => {
    expect(deriveTournamentView({ ...base, nowSec: 1500, allowance: 1_000_000n, usdtBalance: 1_000_000n }).cta).toBe("join");
  });
  it("usdtBalance exactly == deposit → not needUsdt (balance is sufficient)", () => {
    expect(deriveTournamentView({ ...base, nowSec: 1500, allowance: 0n, usdtBalance: 1_000_000n }).cta).toBe("approve");
  });
});

describe("applyOptimistic", () => {
  const D = 1_000_000n;
  test("no optimistic → reads pass through", () => {
    expect(applyOptimistic({ allowance: 0n, hasJoined: false }, D, {})).toEqual({ allowance: 0n, hasJoined: false });
  });
  test("approved lifts a stale (low) allowance to the deposit", () => {
    expect(applyOptimistic({ allowance: 0n, hasJoined: false }, D, { approved: true })).toEqual({ allowance: D, hasJoined: false });
  });
  test("approved does not lower an already-sufficient allowance", () => {
    expect(applyOptimistic({ allowance: 5_000_000n, hasJoined: false }, D, { approved: true })).toEqual({ allowance: 5_000_000n, hasJoined: false });
  });
  test("joined overrides a stale hasJoined=false", () => {
    expect(applyOptimistic({ allowance: 0n, hasJoined: false }, D, { joined: true })).toEqual({ allowance: 0n, hasJoined: true });
  });
  test("joined=false overrides a stale hasJoined=true (post-withdraw)", () => {
    expect(applyOptimistic({ allowance: 0n, hasJoined: true }, D, { joined: false })).toEqual({ allowance: 0n, hasJoined: false });
  });
});

describe("reconcileOptimistic", () => {
  const D = 1_000_000n;
  test("clears approved once the allowance read reaches the deposit", () => {
    expect(reconcileOptimistic({ approved: true }, { allowance: D, hasJoined: false }, D)).toEqual({});
  });
  test("keeps approved (same ref) while the allowance read is still stale", () => {
    const o = { approved: true };
    expect(reconcileOptimistic(o, { allowance: 0n, hasJoined: false }, D)).toBe(o);
  });
  test("clears joined once the hasJoined read agrees", () => {
    expect(reconcileOptimistic({ joined: true }, { allowance: 0n, hasJoined: true }, D)).toEqual({});
  });
  test("keeps joined (same ref) while the read still disagrees", () => {
    const o = { joined: true };
    expect(reconcileOptimistic(o, { allowance: 0n, hasJoined: false }, D)).toBe(o);
  });
  test("returns the same object when nothing changes (no re-render)", () => {
    const o = {};
    expect(reconcileOptimistic(o, { allowance: 0n, hasJoined: false }, D)).toBe(o);
  });
});
