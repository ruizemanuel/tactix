"use client";

import { useI18n } from "@/lib/i18n/I18nProvider.js";
import type { GameState } from "@teg/engine";

const PHASES = ["reinforce", "attack", "fortify"] as const;

/** Small target-reticle SVG for the objective line */
function TargetIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-signal)"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
}

/** Small stacked-cards glyph for the opponent's hand count */
function CardStackIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="5" width="9" height="13" rx="1.5" />
      <path d="M6 8 V17.5 A1.5 1.5 0 0 0 7.5 19 H14" />
    </svg>
  );
}

export function StatusBar({ state, aiThinking }: { state: GameState; aiThinking: boolean }) {
  const { t } = useI18n();

  // ── Winner banner ──────────────────────────────────────────────
  if (state.winnerId) {
    const wname = t(state.winnerId === "you" ? "game.you" : "game.ai");
    return (
      <div
        className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface)] px-4 py-4"
        style={{ fontFamily: "var(--font-display-cond)" }}
      >
        <p
          className="text-center text-2xl font-bold uppercase tracking-widest text-[var(--color-signal)]"
          style={{ fontFamily: "var(--font-display-cond)" }}
        >
          {t("status.winner", { name: wname })}
        </p>
      </div>
    );
  }

  // ── In-game status strip ────────────────────────────────────────
  const current = state.players[state.currentPlayerIndex]!;
  const isYou = current.id === "you";
  const name = t(isYou ? "game.you" : "game.ai");
  const rivalCardCount = state.players.find((p) => p.id !== "you")?.cards.length ?? 0;

  return (
    <div className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-[11px] flex flex-col gap-[9px]">
      {/* Turn line: faction pill + phase chips + optional thinking badge */}
      <div className="flex items-center justify-between gap-2">
        {/* Faction pill */}
        <div className="flex items-center gap-2">
          {isYou ? (
            <span
              className="rounded-full px-[9px] py-1 text-[10px] font-bold uppercase tracking-[.12em]"
              style={{
                fontFamily: "var(--font-mono)",
                background: "var(--color-you)",
                color: "#04130d",
                boxShadow: "0 0 16px -2px var(--color-you)",
              }}
            >
              {name}
            </span>
          ) : (
            <span
              className="rounded-full border border-[var(--color-ai)] px-[9px] py-1 text-[10px] font-bold uppercase tracking-[.12em] text-white"
              style={{
                fontFamily: "var(--font-mono)",
                background: "var(--color-ai-dim)",
              }}
            >
              {name}
            </span>
          )}
          {aiThinking && (
            <span
              className="text-[10px] tracking-wide text-[var(--color-muted)]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {t("status.aiThinking")}
            </span>
          )}
        </div>

        {/* Phase chips */}
        <div className="flex gap-[5px]">
          {PHASES.map((p) => {
            const isActive = state.phase === p;
            return (
              <span
                key={p}
                className="rounded-md border px-[7px] py-1 text-[9px] uppercase tracking-[.1em]"
                style={
                  isActive
                    ? {
                        fontFamily: "var(--font-mono)",
                        color: "var(--color-signal)",
                        borderColor: "var(--color-signal)",
                        boxShadow:
                          "0 0 0 1px var(--color-signal) inset, 0 0 14px -4px var(--color-signal)",
                      }
                    : {
                        fontFamily: "var(--font-mono)",
                        color: "var(--color-muted-2)",
                        borderColor: "var(--color-hairline)",
                      }
                }
              >
                {t(`phase.${p}`)}
              </span>
            );
          })}
        </div>
      </div>

      {/* Objective line + opponent card count */}
      <div className="flex items-start justify-between gap-2 text-xs text-[var(--color-muted)]">
        <div className="flex min-w-0 items-start gap-2">
          <TargetIcon />
          <span className="break-words">
            {t("status.yourObjective", {
              // Always the human's ("you") objective — never the current player's
              // (else the AI's secret objective would show during its turn).
              obj: (() => {
                const you = state.players.find((pl) => pl.id === "you");
                const objectiveId = you?.objectiveId ?? "";
                const obj = state.objectives[objectiveId];
                return obj?.description || objectiveId;
              })(),
            })}
          </span>
        </div>
        <span
          className="flex flex-none items-center gap-1"
          aria-label={t("card.rivalCards", { n: rivalCardCount })}
        >
          <CardStackIcon />
          <span className="text-[11px]" style={{ fontFamily: "var(--font-mono)" }}>
            {rivalCardCount}
          </span>
        </span>
      </div>
    </div>
  );
}
