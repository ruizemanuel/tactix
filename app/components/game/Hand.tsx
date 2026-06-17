"use client";

import type { Card, GameMap } from "@teg/engine";
import { useI18n } from "@/lib/i18n/I18nProvider.js";
import { CardSuitIcon } from "./CardSuitIcon.js";

export function Hand({ cards, map }: { cards: Card[]; map: GameMap }) {
  const { t } = useI18n();
  if (cards.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <span
        className="text-[9.5px] font-bold uppercase tracking-[.16em] text-[var(--color-muted-2)]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {t("card.hand")} · {cards.length}
      </span>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {cards.map((c) => {
          const isJoker = c.symbol === "joker";
          const suitName = t(`card.suit.${c.symbol}`);
          const country = isJoker
            ? suitName
            : map.territories.find((tt) => tt.id === c.territoryId)?.name ?? "";
          const label = isJoker ? suitName : `${suitName} · ${country}`;
          return (
            <div
              key={c.id}
              role="img"
              aria-label={label}
              className="flex h-16 w-[58px] flex-none flex-col items-center justify-between rounded-lg border border-[var(--color-hairline-2)] bg-[var(--color-surface-2)] px-1 pb-1 pt-[3px]"
              style={{ borderTop: `2px solid ${isJoker ? "var(--color-signal)" : "var(--color-you)"}` }}
            >
              <CardSuitIcon symbol={c.symbol} className="mt-1 h-[22px] w-[22px]" />
              <span className="w-full truncate text-center text-[9px] leading-tight text-[var(--color-muted)]">
                {country}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
