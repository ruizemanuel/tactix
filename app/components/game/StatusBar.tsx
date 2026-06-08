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

      {/* Objective line */}
      <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
        <TargetIcon />
        <span>
          {t("status.yourObjective", {
            obj: (() => {
              const pid = current.id;
              const obj = state.objectives[state.players.find((pl) => pl.id === pid)?.objectiveId ?? ""];
              if (!obj) return "";
              if (obj.kind === "conquer-count") return obj.description || `control ${obj.targetCount} territories`;
              if (obj.kind === "conquer-continents") return obj.description || `control continents`;
              return obj.description || "";
            })(),
          })}
        </span>
      </div>
    </div>
  );
}
