"use client";

import { useI18n } from "@/lib/i18n/I18nProvider.js";
import type { CombatResult as Combat } from "@teg/engine";
import { CombatDice } from "./CombatDice.js";

/** Lightning bolt icon — carmesí accent */
function BoltIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="flex-none text-[var(--color-ai)]"
      aria-hidden="true"
    >
      <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
    </svg>
  );
}

export function CombatResult({ combat, youAreAttacker }: { combat: Combat | null; youAreAttacker: boolean }) {
  const { t } = useI18n();
  if (!combat) return null;

  return (
    <div
      className="flex flex-col gap-2 rounded-[10px] border border-[var(--color-ai)] px-[11px] py-[8px]"
      style={{ background: "rgba(255,59,84,.07)" }}
    >
      <CombatDice combat={combat} youAreAttacker={youAreAttacker} />
      <div
        className="flex items-center gap-[9px]"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: ".02em",
          color: "var(--color-text)",
        }}
      >
        <BoltIcon />
        <span>
          {t("combat.result", {
            from: combat.from,
            to: combat.to,
            al: combat.attackerLosses,
            dl: combat.defenderLosses,
            conq: "",
          })}
        </span>
        {combat.conquered && (
          <span
            className="ml-auto text-[9.5px] font-bold uppercase tracking-[.1em] text-[var(--color-you)]"
            aria-hidden="true"
          >
            {t("combat.conqueredBadge")}
          </span>
        )}
      </div>
    </div>
  );
}
