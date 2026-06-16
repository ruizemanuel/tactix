"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useAccount, useSignMessage } from "wagmi";
import { useGame } from "@/lib/game/store.js";
import { useTegPool } from "@/hooks/useTegPool.js";
import { useI18n } from "@/lib/i18n/I18nProvider.js";
import { startRanked, finalizeRanked, type SubmitResult } from "@/lib/ranked/client.js";
import { buildSubmitMessage } from "@/lib/ranked/submitMessage.js";
import { CONFIGURED_CHAIN_ID } from "@/lib/contracts/addresses.js";
import { GameView } from "@/components/game/GameView.js";
import { track } from "@/lib/analytics/events.js";

type Status = "idle" | "starting" | "playing" | "submitting" | "needsSig" | "done" | "error";

export function RankedScreen() {
  const { t } = useI18n();
  const { address } = useAccount();
  const p = useTegPool();
  const { signMessageAsync } = useSignMessage();
  const store = useGame();
  const { state, ranked } = store;

  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const startedRef = useRef(false);
  const submittedRef = useRef(false);
  const signRejectedRef = useRef(false);

  const joined = p.view.cta === "joinedWaiting"; // joined + tournament OPEN/LOCKED/ENDED
  const playable = joined && (p.view.phase === "OPEN" || p.view.phase === "LOCKED");
  const pool = p.addresses.pool;

  // Start exactly once, when a connected participant lands here.
  useEffect(() => {
    if (startedRef.current || !address || !pool || !playable) return;
    startedRef.current = true;
    setStatus("starting");
    startRanked(pool, address)
      .then((start) => {
        store.startRankedGame(start);
        setStatus("playing");
        track("ranked_started");
      })
      .catch(() => {
        setStatus("error");
        track("ranked_start_failed");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, pool, playable]);

  // Sign the canonical message (personal_sign) and finalize the score. The server
  // already holds the full action log, so finalize only needs the signature.
  // On signature rejection we land in "needsSig" so the player can retry without
  // losing the game (the gameId stays open).
  async function signAndFinalize() {
    if (!ranked || !pool) return;
    setStatus("submitting");
    let signature: string;
    try {
      const message = buildSubmitMessage({ pool, gameId: ranked.gameId, chainId: CONFIGURED_CHAIN_ID });
      signature = await signMessageAsync({ message });
    } catch {
      setStatus("needsSig");
      if (!signRejectedRef.current) {
        signRejectedRef.current = true;
        track("sign_rejected");
      }
      return;
    }
    try {
      const r = await finalizeRanked(ranked.gameId, signature);
      setResult(r);
      setStatus("done");
      track("score_finalized", {
        won: r.won,
        score: r.score,
        continents: r.breakdown.continents,
        territories: r.breakdown.territories,
        turns_used: r.breakdown.turnsUsed,
      });
    } catch {
      setStatus("error");
    }
  }

  // Finalize exactly once, when the ranked game ends (winnerId flips on the view).
  useEffect(() => {
    if (submittedRef.current || status !== "playing" || !state || !ranked || state.winnerId === null) return;
    submittedRef.current = true;
    track("ranked_finished", { won: state.winnerId === "you" });
    void signAndFinalize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, state?.winnerId, ranked]);

  if (!address) return <Centered>{t("ranked.connectFirst")}<LobbyLink t={t} /></Centered>;
  if (!playable) return <Centered>{t("ranked.notJoined")}<LobbyLink t={t} /></Centered>;
  if (status === "error") return <Centered>{t("ranked.error")}<LobbyLink t={t} /></Centered>;
  if (!state || status === "idle" || status === "starting") return <Centered>{t("ranked.starting")}</Centered>;

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

      <GameView interactive={status === "playing"} />

      {status === "submitting" && <p className="text-sm text-[var(--color-signal)]">{t("ranked.submitting")}</p>}

      {status === "needsSig" && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--color-hairline-2)] p-4 text-center">
          <p className="text-sm text-[var(--color-muted)]">{t("ranked.signPrompt")}</p>
          <button
            type="button"
            onClick={() => void signAndFinalize()}
            className="rounded-xl bg-[var(--color-you)] px-4 py-2 text-sm font-bold uppercase tracking-[.06em] text-black transition hover:brightness-110"
          >
            {t("ranked.signAndSubmit")}
          </button>
        </div>
      )}

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
