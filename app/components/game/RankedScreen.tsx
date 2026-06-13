"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useGame } from "@/lib/game/store.js";
import { useTegPool } from "@/hooks/useTegPool.js";
import { useI18n } from "@/lib/i18n/I18nProvider.js";
import { startRanked, submitRanked, type SubmitResult } from "@/lib/ranked/client.js";
import { selectableTerritories, resolveTap } from "@/lib/game/interaction.js";
import { findTradeableSet } from "@teg/engine";
import { WorldBoard } from "@/components/board/WorldBoard.js";
import { ActionPanel } from "@/components/game/ActionPanel.js";
import { StatusBar } from "@/components/game/StatusBar.js";
import { CombatResult } from "@/components/game/CombatResult.js";

type Status = "idle" | "starting" | "playing" | "submitting" | "done" | "error";

export function RankedScreen() {
  const { t } = useI18n();
  const { address } = useAccount();
  const p = useTegPool();
  const store = useGame();
  const { state, selected, aiThinking, ranked, actionLog } = store;

  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const startedRef = useRef(false);
  const submittedRef = useRef(false);

  const joined = p.view.cta === "joinedWaiting"; // joined + tournament OPEN/LOCKED/ENDED
  const playable = joined && (p.view.phase === "OPEN" || p.view.phase === "LOCKED");
  const pool = p.addresses.pool;

  // Start exactly once, when a connected participant lands here.
  useEffect(() => {
    if (startedRef.current || !address || !pool || !playable) return;
    startedRef.current = true;
    setStatus("starting");
    startRanked(pool, address)
      .then(({ seed, gameId }) => {
        store.startRankedGame(seed, gameId);
        setStatus("playing");
      })
      .catch(() => setStatus("error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, pool, playable]);

  // Submit exactly once, when the ranked game ends.
  useEffect(() => {
    if (submittedRef.current || status !== "playing" || !state || !ranked || state.winnerId === null) return;
    submittedRef.current = true;
    setStatus("submitting");
    submitRanked(ranked.gameId, actionLog)
      .then((r) => {
        setResult(r);
        setStatus("done");
      })
      .catch(() => setStatus("error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, state?.winnerId, ranked]);

  if (!address) return <Centered>{t("ranked.connectFirst")}<LobbyLink t={t} /></Centered>;
  if (!playable) return <Centered>{t("ranked.notJoined")}<LobbyLink t={t} /></Centered>;
  if (status === "error") return <Centered>{t("ranked.error")}<LobbyLink t={t} /></Centered>;
  if (!state || status === "idle" || status === "starting") return <Centered>{t("ranked.starting")}</Centered>;

  const humanTurn = state.players[state.currentPlayerIndex]!.id === "you" && !aiThinking && !state.winnerId;
  const selectable = humanTurn ? selectableTerritories(state, "you", selected) : [];
  const youPlayer = state.players.find((pl) => pl.id === "you")!;
  const tradeSet = state.phase === "reinforce" && humanTurn ? findTradeableSet(youPlayer.cards) : null;

  function onSelect(territoryId: string) {
    if (!humanTurn || !state) return;
    if (!selectable.includes(territoryId) && selected !== territoryId) return;
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
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-[var(--color-text)]" style={{ fontFamily: "var(--font-saira-cond)" }}>
          {t("ranked.title")}
        </h1>
        <Link
          href="/"
          className="rounded-lg border border-[var(--color-hairline-2)] px-3 py-[6px] text-[11px] font-bold uppercase tracking-[.08em] text-[var(--color-text)]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {t("lobby.backToLobby")}
        </Link>
      </header>

      <StatusBar state={state} aiThinking={aiThinking} />
      <WorldBoard state={state} selectable={selectable} selected={selected} onSelect={onSelect} />
      <CombatResult combat={state.lastCombat} />

      {status === "submitting" && <p className="text-sm text-[var(--color-signal)]">{t("ranked.submitting")}</p>}

      {status === "done" && result && (
        <div className="rounded-xl border border-[var(--color-hairline-2)] p-4 text-center">
          <p className="text-sm font-bold text-[var(--color-you)]">
            {result.won ? t("ranked.youWon") : t("ranked.youLost")}
          </p>
          <p className="mt-1 text-lg" style={{ fontFamily: "var(--font-mono)" }}>
            {t("ranked.score", { score: result.score })}
          </p>
          <Link href="/" className="mt-3 inline-block text-xs uppercase tracking-[.08em] text-[var(--color-muted)]">
            {t("lobby.backToLobby")}
          </Link>
        </div>
      )}

      {humanTurn && status === "playing" && (
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

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center text-sm text-[var(--color-muted)]">
      {children}
    </main>
  );
}

function LobbyLink({ t }: { t: (k: string, vars?: Record<string, string | number>) => string }) {
  return (
    <Link href="/" className="text-[var(--color-you)] underline">
      {t("lobby.backToLobby")}
    </Link>
  );
}
