"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useI18n } from "@/lib/i18n/I18nProvider.js";
import { useTegPool } from "@/hooks/useTegPool.js";
import { TxButton } from "./TxButton.js";
import { MintTestUsdtButton } from "./MintTestUsdtButton.js";

function usd(amount: bigint): string {
  return formatUnits(amount, 6);
}

export function TournamentCard() {
  const { t } = useI18n();
  // 1s tick: the hook derives the phase from Date.now(); re-render each second so the
  // CTA flips at lockTime/endTime without needing another state change.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const p = useTegPool();

  if (!p.configured) {
    return (
      <div className="rounded-2xl border border-[var(--color-hairline-2)] p-5 text-sm text-[var(--color-muted)]">
        {t("tournament.noPool")}
      </div>
    );
  }

  const depositStr = usd(p.deposit);
  const a = p.actions;

  function cta() {
    switch (p.view.cta) {
      case "connect":
        return null; // the WalletButton in the lobby handles connecting
      case "switchNetwork":
        return <TxButton variant="ghost" label={t("cta.switchNetwork")} onRun={a.switchNetwork} />;
      case "needUsdt":
        return p.isTestnet ? (
          <MintTestUsdtButton onRun={a.mintTestUsdt} onDone={p.refetchAll} />
        ) : (
          <p className="text-sm text-[var(--color-muted)]">{t("cta.needUsdt")}</p>
        );
      case "approve":
        return <TxButton label={t("cta.approve", { amount: depositStr })} onRun={a.approve} onDone={p.refetchAll} />;
      case "join":
        return <TxButton label={t("cta.join", { amount: depositStr })} onRun={a.join} onDone={p.refetchAll} />;
      case "joinedWaiting":
        return <p className="text-sm font-semibold text-[var(--color-you)]">{t("tournament.joinedWaiting")}</p>;
      case "claim":
        return <TxButton variant="prize" label={t("cta.claim", { amount: usd(p.prizeAmount) })} onRun={a.claimPrize} onDone={p.refetchAll} />;
      case "withdraw":
        return <TxButton label={t("cta.withdraw")} onRun={a.withdrawDeposit} onDone={p.refetchAll} />;
      case "emergencyWithdraw":
        return <TxButton variant="ghost" label={t("cta.emergencyWithdraw")} onRun={a.emergencyUserWithdraw} onDone={p.refetchAll} />;
      case "done":
        return <p className="text-sm text-[var(--color-muted)]">{t("tournament.done")}</p>;
      default:
        return null;
    }
  }

  function phaseLine() {
    if (p.view.phase === "LOCKED") return t("tournament.phase.locked");
    if (p.view.phase === "ENDED") return t("tournament.phase.ended");
    if (p.view.phase === "EMERGENCY") return t("tournament.phase.emergency");
    return null;
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-hairline-2)] bg-white/[.02] p-5">
      <div>
        <h2 className="text-lg font-bold text-[var(--color-text)]" style={{ fontFamily: "var(--font-saira-cond)" }}>
          {p.label || t("tournament.title")}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{t("tournament.deposit", { amount: depositStr })}</p>
        <p className="text-xs text-[var(--color-muted)]">{t("tournament.fee", { pct: p.platformFeeBps / 100 })}</p>
        <p className="mt-1 text-xs text-[var(--color-muted)]" style={{ fontFamily: "var(--font-mono)" }}>
          {t("tournament.participants", { n: p.participants })}
        </p>
      </div>
      {phaseLine() && <p className="text-sm text-[var(--color-signal)]">{phaseLine()}</p>}
      <div>{cta()}</div>
    </div>
  );
}
