"use client";

import { useEffect } from "react";
import { useGame } from "@/lib/game/store.js";
import { selectableTerritories, resolveTap } from "@/lib/game/interaction.js";
import { findTradeableSet } from "@teg/engine";
import { SchematicBoard } from "@/components/board/SchematicBoard.js";
import { ActionPanel } from "@/components/game/ActionPanel.js";
import { StatusBar } from "@/components/game/StatusBar.js";
import { CombatResult } from "@/components/game/CombatResult.js";
import { LanguageSwitcher } from "@/components/LanguageSwitcher.js";
import { useI18n } from "@/lib/i18n/I18nProvider.js";

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
  const { state, selected, aiThinking } = store;

  useEffect(() => {
    if (!state) store.newGame();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state) return null;

  const humanTurn =
    state.players[state.currentPlayerIndex]!.id === "you" && !aiThinking && !state.winnerId;
  const selectable = humanTurn ? selectableTerritories(state, "you", selected) : [];
  const youPlayer = state.players.find((p) => p.id === "you")!;
  const tradeSet =
    state.phase === "reinforce" && humanTurn ? findTradeableSet(youPlayer.cards) : null;

  function onSelect(territoryId: string) {
    if (!humanTurn || !state) return;
    if (!selectable.includes(territoryId) && !(selected === territoryId)) return;
    const tap = resolveTap(state, "you", selected, territoryId);
    switch (tap.kind) {
      case "select":
        store.select(tap.territoryId);
        break;
      case "place":
        store.place(tap.territoryId, state.pendingReinforcements);
        break;
      case "attack":
        store.attack(tap.from, tap.to);
        break;
      case "fortify":
        store.fortify(tap.from, tap.to, state.territories[tap.from]!.armies - 1);
        break;
    }
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-3 p-4">
      {/* ── Top bar: TACTIX wordmark + New game + LanguageSwitcher ── */}
      <header className="flex items-center justify-between gap-2">
        {/* Left: wordmark + tagline */}
        <div className="flex flex-col gap-[2px]">
          {/* Wordmark: "TACTI" + crosshair X */}
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
            {/* CrosshairX sized to ~0.92em to match the cap-height of the wordmark */}
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
          {/* Tagline: amber mono uppercase */}
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

        {/* Right: New game button + language switcher */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => store.newGame()}
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
          <LanguageSwitcher />
        </div>
      </header>

      <StatusBar state={state} aiThinking={aiThinking} />

      <SchematicBoard state={state} selectable={selectable} selected={selected} onSelect={onSelect} />

      <CombatResult combat={state.lastCombat} />

      {humanTurn && (
        <ActionPanel
          state={state}
          tradeSet={tradeSet}
          onTradeCards={(ids) => store.tradeCards(ids)}
          onEndReinforce={() => store.endReinforce()}
          onEndAttack={() => store.endAttack()}
          onEndTurn={() => void store.endTurn()}
        />
      )}
    </main>
  );
}
