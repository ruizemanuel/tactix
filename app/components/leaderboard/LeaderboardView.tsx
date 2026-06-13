"use client";

import { useAccount } from "wagmi";
import { useI18n } from "@/lib/i18n/I18nProvider.js";

export interface LeaderboardRow {
  player: string;
  bestScore: number;
  rank: number;
}

function truncate(addr: string) {
  return addr.length <= 12 ? addr : `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function LeaderboardView({ rows }: { rows: LeaderboardRow[] }) {
  const { t } = useI18n();
  const { address } = useAccount();
  const me = address?.toLowerCase();

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-[var(--color-text)]" style={{ fontFamily: "var(--font-saira-cond)" }}>
        {t("leaderboard.title")}
      </h2>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-[var(--color-hairline-2)] p-5 text-sm text-[var(--color-muted)]">
          {t("leaderboard.empty")}
        </p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {rows.map((r) => {
            const isMe = me && r.player.toLowerCase() === me;
            return (
              <li
                key={r.player}
                className={`flex items-center justify-between rounded-xl border px-3 py-3 ${
                  isMe ? "border-[var(--color-you)]/50 bg-[var(--color-you)]/5" : "border-[var(--color-hairline-2)] bg-white/[.02]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-7 shrink-0 text-right text-base tabular-nums text-[var(--color-muted)]" style={{ fontFamily: "var(--font-mono)" }}>
                    {r.rank}
                  </span>
                  <span className="truncate text-xs text-[var(--color-text)]" style={{ fontFamily: "var(--font-mono)" }}>
                    {truncate(r.player)}
                  </span>
                </div>
                <span className="text-base tabular-nums text-[var(--color-text)]" style={{ fontFamily: "var(--font-mono)" }}>
                  {r.bestScore}
                  <span className="ml-1 text-[9px] uppercase tracking-wider text-[var(--color-muted)]">{t("leaderboard.pts")}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
