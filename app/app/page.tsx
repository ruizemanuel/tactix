"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider.js";
import { WalletButton } from "@/components/wallet/WalletButton.js";
import { TournamentCard } from "@/components/tournament/TournamentCard.js";
import { LanguageSwitcher } from "@/components/LanguageSwitcher.js";

export default function Home() {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]" style={{ fontFamily: "var(--font-saira-cond)" }}>
            {t("app.title")}
          </h1>
          <p className="text-xs text-[var(--color-muted)]">{t("app.tagline")}</p>
        </div>
        <WalletButton />
      </header>

      <p className="text-sm text-[var(--color-muted)]">{t("lobby.subtitle")}</p>

      <TournamentCard />

      <Link
        href="/play"
        className="w-full rounded-xl bg-[var(--color-you)] px-4 py-3 text-center text-sm font-bold uppercase tracking-[.06em] text-black transition hover:brightness-110"
      >
        {t("lobby.play")}
      </Link>

      <div className="mt-auto flex justify-center">
        <LanguageSwitcher />
      </div>
    </main>
  );
}
