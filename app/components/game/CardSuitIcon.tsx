"use client";

import type { CardSymbol } from "@teg/engine";

/** Icon tint per suit (icon stroke only) — distinct color AND shape so sets read
 *  at a glance and stay distinguishable for color-blind players. */
export const SUIT_TINT: Record<CardSymbol, string> = {
  globo: "var(--color-north)",
  canon: "var(--color-ai)",
  barco: "var(--color-c-oceania)",
  joker: "var(--color-signal)",
};

/** Original military-themed glyphs (war-room line-icon style). */
const PATHS: Record<CardSymbol, React.ReactNode> = {
  // field cannon: wheel + angled barrel + muzzle
  canon: (
    <>
      <circle cx="7" cy="16" r="3.5" />
      <path d="M9.5 14 L19 8.5 L20 11 L10.5 16.5 Z" />
      <path d="M19 8.7 L21.5 7.4" />
    </>
  ),
  // warship: hull + superstructure + mast
  barco: (
    <>
      <path d="M3 14 L21 14 L18.5 18 L5.5 18 Z" />
      <path d="M8 14 L8 10 L14 10 L14 14" />
      <path d="M11 10 L11 6.5" />
      <path d="M11 7.4 L15 7.4" />
    </>
  ),
  // reconnaissance balloon: envelope + rigging + basket
  globo: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="M9 13.6 L10.5 17 L13.5 17 L15 13.6" />
      <rect x="10" y="17" width="4" height="2.6" rx="0.6" />
    </>
  ),
  // wildcard sparkle (NOT the brand crosshair)
  joker: (
    <path d="M12 3 C12.5 8 16 11.5 21 12 C16 12.5 12.5 16 12 21 C11.5 16 8 12.5 3 12 C8 11.5 11.5 8 12 3 Z" />
  ),
};

export function CardSuitIcon({ symbol, className }: { symbol: CardSymbol; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: SUIT_TINT[symbol] }}
      aria-hidden="true"
    >
      {PATHS[symbol]}
    </svg>
  );
}
