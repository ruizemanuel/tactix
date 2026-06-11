import { describe, it, expect } from "vitest";
import { deriveTournamentView, type TournamentInput } from "./state.js";

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
});
