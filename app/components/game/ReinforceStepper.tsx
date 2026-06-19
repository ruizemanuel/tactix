"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider.js";

const STEP_BTN =
  "h-10 w-10 flex-none rounded-xl border border-[var(--color-hairline-2)] bg-[var(--color-surface-2)] text-lg font-bold text-[var(--color-text)] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-signal)]";

/**
 * Quantity picker for placing reinforcements into one selected territory.
 * Mount with key={selectedTerritoryId} so it resets to 1 when the selection
 * changes. Each "Place" dispatches a single place(territory, n) action.
 */
export function ReinforceStepper({
  territoryName,
  max,
  onPlace,
  disabled = false,
}: {
  territoryName: string;
  max: number;
  onPlace: (armies: number) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [amount, setAmount] = useState(1);
  const n = Math.min(Math.max(amount, 1), max);

  return (
    <div data-testid="reinforce-stepper" className="flex flex-col gap-[10px]">
      <p
        className="text-[12.5px] leading-[1.45] text-[var(--color-muted)]"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {t("reinforce.placeOn", { country: territoryName })}
      </p>
      <div className="flex items-center gap-[9px]">
        <button
          type="button"
          data-testid="reinforce-dec"
          aria-label={t("reinforce.decrement")}
          disabled={disabled || n <= 1}
          onClick={() => setAmount(Math.max(1, n - 1))}
          className={STEP_BTN}
        >
          −
        </button>
        <span
          data-testid="reinforce-amount"
          className="min-w-[2ch] text-center text-lg font-bold"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {n}
        </span>
        <button
          type="button"
          data-testid="reinforce-inc"
          aria-label={t("reinforce.increment")}
          disabled={disabled || n >= max}
          onClick={() => setAmount(Math.min(max, n + 1))}
          className={STEP_BTN}
        >
          +
        </button>
        <button
          type="button"
          data-testid="reinforce-all"
          disabled={disabled || n >= max}
          onClick={() => setAmount(max)}
          className="flex-none rounded-xl border border-[var(--color-hairline-2)] bg-[var(--color-surface-2)] px-3 py-2 text-[13px] font-bold uppercase tracking-[.05em] text-[var(--color-text)] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-signal)]"
          style={{ fontFamily: "var(--font-display-cond)" }}
        >
          {t("reinforce.all")}
        </button>
        <button
          type="button"
          data-testid="reinforce-place"
          disabled={disabled}
          onClick={() => onPlace(n)}
          className="flex-1 cursor-pointer rounded-xl px-3 py-[14px] text-[15px] font-bold uppercase tracking-[.05em] text-[#04130d] shadow-[0_10px_24px_-10px_var(--color-you)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-signal)]"
          style={{ fontFamily: "var(--font-display-cond)", background: "linear-gradient(180deg,var(--color-you),var(--color-you-dim))" }}
        >
          {t("reinforce.place", { n })}
        </button>
      </div>
    </div>
  );
}
