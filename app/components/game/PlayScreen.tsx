"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useGame } from "@/lib/game/store.js";
import { LanguageSwitcher } from "@/components/LanguageSwitcher.js";
import { useI18n } from "@/lib/i18n/I18nProvider.js";
import { GameView } from "@/components/game/GameView.js";
import { HowToPlayButton } from "@/components/howto/HowToPlayButton.js";
import { track } from "@/lib/analytics/events.js";

/** The crosshair "X" — used as the final letter of the TACTIX wordmark. */
function CrosshairX({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={className}
    >
      <circle cx="20" cy="20" r="15" fill="none" stroke="var(--color-signal)" strokeWidth="3" />
      <circle cx="20" cy="20" r="3.6" fill="var(--color-signal)" />
      <line x1="20" y1="2" x2="20" y2="9" stroke="var(--color-signal)" strokeWidth="3" />
      <line x1="20" y1="31" x2="20" y2="38" stroke="var(--color-signal)" strokeWidth="3" />
      <line x1="2" y1="20" x2="9" y2="20" stroke="var(--color-signal)" strokeWidth="3" />
      <line x1="31" y1="20" x2="38" y2="20" stroke="var(--color-signal)" strokeWidth="3" />
    </svg>
  );
}

export function PlayScreen() {
  const { t } = useI18n();
  const store = useGame();
  const { state } = store;

  useEffect(() => {
    if (!state) {
      store.newGame();
      track("practice_started");
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state) return null;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-3 p-4">
      <header className="flex flex-col gap-2">
        {/* Row 1: back-to-lobby (left) · wordmark + tagline (right) */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/"
            className="rounded-lg border border-[var(--color-hairline-2)] px-3 py-[6px] text-[11px] font-bold uppercase tracking-[.08em] text-[var(--color-text)] hover:bg-white/10"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {t("lobby.backToLobby")}
          </Link>
          <div className="flex flex-col items-end gap-[2px]">
            <div
              aria-label={t("app.title")}
              className="flex items-center"
              style={{
                fontFamily: "var(--font-display-cond)",
                fontWeight: 800,
                fontSize: "clamp(20px, 5vw, 24px)",
                letterSpacing: ".05em",
                lineHeight: "1",
                color: "var(--color-text)",
              }}
            >
              <span aria-hidden="true">TACTI</span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: ".92em",
                  height: ".92em",
                  translate: "0 .04em",
                }}
              >
                <CrosshairX className="w-full h-full" />
              </span>
            </div>
            <p
              className="uppercase"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "7.5px",
                letterSpacing: ".24em",
                color: "var(--color-signal)",
                marginTop: "2px",
              }}
            >
              {t("app.tagline")}
            </p>
          </div>
        </div>

        {/* Row 2: how-to + new game (left) · language (right) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HowToPlayButton variant="compact" />
            <button
              type="button"
              onClick={() => { store.newGame(); track("practice_started"); }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9.5px",
                letterSpacing: ".14em",
                textTransform: "uppercase",
                padding: "6px 9px",
                borderRadius: "8px",
                border: "1px solid var(--color-hairline-2)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                cursor: "pointer",
              }}
            >
              {t("newGame")}
            </button>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <GameView />
    </main>
  );
}
