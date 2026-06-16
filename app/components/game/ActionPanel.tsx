"use client";

import { useI18n } from "@/lib/i18n/I18nProvider.js";
import { cn } from "@/lib/utils.js";
import { tradeBonus } from "@teg/engine";
import type { GameState } from "@teg/engine";

export interface ActionPanelProps {
  state: GameState;
  /** A valid card set the human can trade, if any. */
  tradeSet: string[] | null;
  onTradeCards: (cardIds: string[]) => void;
  onEndReinforce: () => void;
  onEndAttack: () => void;
  onEndTurn: () => void;
  onOccupy: (armies: number) => void;
}

// ── Button variants ────────────────────────────────────────────────────────────
// All buttons: Saira Condensed, uppercase, generous 14px vertical padding.
// Focus-visible: amber outline (2px, inset).
// Animations: none (purely static hover transitions; no prefers-reduced-motion concern here).

type BtnVariant = "primary" | "ghost" | "signal";

interface BtnProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: BtnVariant;
  className?: string;
}

function Btn({ children, onClick, disabled = false, variant = "ghost", className }: BtnProps) {
  const base =
    "relative flex-1 cursor-pointer rounded-xl px-3 py-[14px] text-[15px] font-bold uppercase tracking-[.05em] transition-opacity" +
    " focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-signal)]" +
    " disabled:cursor-not-allowed disabled:opacity-40";

  const variants: Record<BtnVariant, string> = {
    primary:
      "text-[#04130d] shadow-[0_10px_24px_-10px_var(--color-you)]" +
      " hover:opacity-90 active:opacity-75",
    ghost:
      "border border-[var(--color-hairline-2)] bg-[var(--color-surface-2)] text-[var(--color-text)]" +
      " hover:bg-white/10 active:bg-white/5",
    signal:
      "text-[#1a1203] shadow-[0_10px_24px_-12px_var(--color-signal)]" +
      " hover:opacity-90 active:opacity-75",
  };

  const inlineStyle: React.CSSProperties =
    variant === "primary"
      ? { fontFamily: "var(--font-display-cond)", background: "linear-gradient(180deg,var(--color-you),var(--color-you-dim))" }
      : variant === "signal"
        ? { fontFamily: "var(--font-display-cond)", background: "linear-gradient(180deg,#ffd27a,var(--color-signal))" }
        : { fontFamily: "var(--font-display-cond)" };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(base, variants[variant], className)}
      style={inlineStyle}
    >
      {children}
    </button>
  );
}

// ── ActionPanel ─────────────────────────────────────────────────────────────
export function ActionPanel({
  state,
  tradeSet,
  onTradeCards,
  onEndReinforce,
  onEndAttack,
  onEndTurn,
  onOccupy,
}: ActionPanelProps) {
  const { t } = useI18n();

  if (state.pendingOccupation) {
    const max = state.pendingOccupation.max;
    return (
      <div className="flex flex-col gap-[10px]">
        <p className="text-[12.5px] leading-[1.45] text-[var(--color-muted)]" style={{ fontFamily: "var(--font-body)" }}>
          {t("prompt.occupy")}
        </p>
        <div className="flex gap-[9px]">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <Btn key={n} variant="primary" onClick={() => onOccupy(n)}>
              {n}
            </Btn>
          ))}
        </div>
      </div>
    );
  }

  if (state.phase === "reinforce") {
    const youPlayer = state.players.find((p) => p.id === "you");
    const nextTradeBonus = tradeBonus(youPlayer?.cardTradeIns ?? 0);
    return (
      <div className="flex flex-col gap-[10px]">
        <p
          className="text-[12.5px] leading-[1.45] text-[var(--color-muted)]"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {t("prompt.place", { n: state.pendingReinforcements })}
        </p>
        <div className="flex gap-[9px]">
          {tradeSet && (
            <Btn variant="signal" onClick={() => onTradeCards(tradeSet)} className="flex-none px-[14px]">
              {t("action.tradeCards", { n: nextTradeBonus })}
            </Btn>
          )}
          <Btn
            variant="primary"
            onClick={onEndReinforce}
            disabled={state.pendingReinforcements > 0}
          >
            {t("action.endReinforce")}
          </Btn>
        </div>
      </div>
    );
  }

  if (state.phase === "attack") {
    return (
      <div className="flex flex-col gap-[10px]">
        <p
          className="text-[12.5px] leading-[1.45] text-[var(--color-muted)]"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {t("prompt.attackFrom")}
        </p>
        <div className="flex gap-[9px]">
          <Btn variant="primary" onClick={onEndAttack} className="flex-none px-[14px]">
            {t("action.endAttack")}
          </Btn>
        </div>
      </div>
    );
  }

  // fortify phase
  return (
    <div className="flex flex-col gap-[10px]">
      <p
        className="text-[12.5px] leading-[1.45] text-[var(--color-muted)]"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {t("prompt.fortifyFrom")}
      </p>
      <div className="flex gap-[9px]">
        <Btn variant="ghost" onClick={onEndTurn}>
          {t("action.endTurn")}
        </Btn>
      </div>
    </div>
  );
}
