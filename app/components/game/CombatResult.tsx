"use client";

import { useI18n } from "@/lib/i18n/I18nProvider.js";
import type { CombatResult as Combat } from "@teg/engine";

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

export function CombatResult({ combat }: { combat: Combat | null }) {
  const { t } = useI18n();
  if (!combat) return null;

  const conquText = combat.conquered ? t("combat.conquered") : "";

  return (
    <div
      className="flex items-center gap-[9px] rounded-[10px] border border-[var(--color-ai)] px-[11px] py-[8px]"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        letterSpacing: ".02em",
        color: "var(--color-text)",
        background: "rgba(255,59,84,.07)",
      }}
    >
      <BoltIcon />
      <span>
        {t("combat.result", {
          from: combat.from,
          to: combat.to,
          al: combat.attackerLosses,
          dl: combat.defenderLosses,
          conq: conquText,
        })}
      </span>
      {combat.conquered && (
        <span
          className="ml-auto text-[9.5px] font-bold uppercase tracking-[.1em] text-[var(--color-you)]"
          aria-hidden="true"
        >
          {t("combat.conquered").replace(" — ", "")}
        </span>
      )}
    </div>
  );
}
