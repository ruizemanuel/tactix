import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n/I18nProvider.js";

const hook = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("@/hooks/useTegPool.js", () => ({ useTegPool: () => hook.value }));
vi.mock("@/lib/analytics/events.js", () => ({ track: vi.fn() }));

import { TournamentCard } from "./TournamentCard.js";

function base() {
  return {
    configured: true,
    isTestnet: true,
    deposit: 1_000_000n,
    prizeAmount: 11_800_000n,
    prizeClaimed: false,
    platformFeeBps: 1000,
    participants: 3,
    label: "TACTIX-1",
    view: { phase: "OPEN", cta: "approve" },
    actions: {
      switchNetwork: vi.fn(),
      mintTestUsdt: vi.fn(),
      approve: vi.fn(),
      join: vi.fn(),
      withdrawDeposit: vi.fn(),
      claimPrize: vi.fn(),
      emergencyUserWithdraw: vi.fn(),
    },
    refetchAll: vi.fn(),
  };
}

function renderIt() {
  return render(
    <I18nProvider initialLocale="en">
      <TournamentCard />
    </I18nProvider>,
  );
}

describe("TournamentCard CTA", () => {
  beforeEach(() => {
    hook.value = base();
  });

  it("not configured → noPool message", () => {
    hook.value = { ...base(), configured: false };
    renderIt();
    expect(screen.getByText(/no active tournament/i)).toBeInTheDocument();
  });

  it("approve CTA shows the deposit amount", () => {
    renderIt();
    expect(screen.getByRole("button", { name: /approve 1 usdt/i })).toBeInTheDocument();
  });

  it("join CTA", () => {
    hook.value = { ...base(), view: { phase: "OPEN", cta: "join" } };
    renderIt();
    expect(screen.getByRole("button", { name: /join · 1 usdt/i })).toBeInTheDocument();
  });

  it("claim CTA shows the prize amount", () => {
    hook.value = { ...base(), view: { phase: "FINALIZED", cta: "claim" } };
    renderIt();
    expect(screen.getByRole("button", { name: /claim prize · 11\.8 usdt/i })).toBeInTheDocument();
  });

  it("needUsdt on testnet → mint test USDT button", () => {
    hook.value = { ...base(), view: { phase: "OPEN", cta: "needUsdt" } };
    renderIt();
    expect(screen.getByRole("button", { name: /mint test usdt/i })).toBeInTheDocument();
  });

  it("joinedWaiting + live tournament → Play-ranked link to /play/ranked", () => {
    hook.value = { ...base(), view: { phase: "OPEN", cta: "joinedWaiting" } };
    renderIt();
    const link = screen.getByRole("link", { name: /play ranked/i });
    expect(link).toHaveAttribute("href", "/play/ranked");
  });

  it("joinedWaiting but ENDED → no ranked link", () => {
    hook.value = { ...base(), view: { phase: "ENDED", cta: "joinedWaiting" } };
    renderIt();
    expect(screen.queryByRole("link", { name: /play ranked/i })).toBeNull();
  });

  it("FINALIZED + prize claimed → 'Tournament finished' + prize awarded", () => {
    hook.value = { ...base(), view: { phase: "FINALIZED", cta: "none" }, prizeClaimed: true };
    renderIt();
    expect(screen.getByText(/tournament finished/i)).toBeInTheDocument();
    expect(screen.getByText(/prize awarded: 11\.8 usdt/i)).toBeInTheDocument();
  });

  it("FINALIZED without claim → finished line, no prize-awarded line", () => {
    hook.value = { ...base(), view: { phase: "FINALIZED", cta: "claim" }, prizeClaimed: false };
    renderIt();
    expect(screen.getByText(/tournament finished/i)).toBeInTheDocument();
    expect(screen.queryByText(/prize awarded/i)).toBeNull();
  });

  it("FINALIZED + done → no redundant 'nothing left to do' (the finished line covers it)", () => {
    hook.value = { ...base(), view: { phase: "FINALIZED", cta: "done" }, prizeClaimed: true };
    renderIt();
    expect(screen.getByText(/tournament finished/i)).toBeInTheDocument();
    expect(screen.queryByText(/nothing left to do/i)).toBeNull();
  });

  it("EMERGENCY + done → still shows 'nothing left to do'", () => {
    hook.value = { ...base(), view: { phase: "EMERGENCY", cta: "done" } };
    renderIt();
    expect(screen.getByText(/nothing left to do/i)).toBeInTheDocument();
  });
});
