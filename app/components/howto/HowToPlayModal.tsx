"use client";

import { useEffect, useId, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider.js";

/** Continent bonuses are gameplay constants — kept in code, not i18n. */
const CONTINENTS: { key: string; bonus: number }[] = [
  { key: "continent.northAmerica", bonus: 5 },
  { key: "continent.southAmerica", bonus: 3 },
  { key: "continent.europe", bonus: 5 },
  { key: "continent.africa", bonus: 3 },
  { key: "continent.asia", bonus: 7 },
  { key: "continent.oceania", bonus: 2 },
];

/** Card-trade army progression (engine `tradeBonus()`). */
const TRADE_PROGRESSION = [4, 7, 10, 15, 20, 25, 30];

const OBJECTIVE_KEYS = [
  "howto.objectives.o1",
  "howto.objectives.o2",
  "howto.objectives.o3",
  "howto.objectives.o4",
  "howto.objectives.o5",
  "howto.objectives.o6",
  "howto.objectives.o7",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="border-t border-[var(--color-hairline-2)] py-2">
      <summary
        className="cursor-pointer list-none py-1 font-bold text-[var(--color-text)] marker:hidden [&::-webkit-details-marker]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-signal)]"
        style={{ fontFamily: "var(--font-display-cond)" }}
      >
        {title}
      </summary>
      <div className="mt-1 space-y-2 text-[13px] leading-relaxed text-[var(--color-muted)]">
        {children}
      </div>
    </details>
  );
}

export function HowToPlayModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      data-testid="howto-backdrop"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[88vh] w-full max-w-md flex-col rounded-t-2xl border border-[var(--color-hairline-2)] bg-[var(--color-surface)] sm:max-h-[85vh] sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-[var(--color-hairline-2)] px-5 py-3">
          <h2
            id={titleId}
            className="text-lg font-extrabold tracking-tight text-[var(--color-text)]"
            style={{ fontFamily: "var(--font-display-cond)" }}
          >
            {t("howto.title")}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("howto.close")}
            className="cursor-pointer rounded-lg border border-[var(--color-hairline-2)] px-2 py-1 text-sm text-[var(--color-text)] hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-signal)]"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Overview */}
          <p className="text-sm text-[var(--color-text)]">
            <span className="font-bold text-[var(--color-signal)]">
              {t("howto.objectiveLabel")}:
            </span>{" "}
            {t("howto.objective")}
          </p>
          <p className="mt-3 text-[13px] font-bold uppercase tracking-[.08em] text-[var(--color-muted)]">
            {t("howto.phasesTitle")}
          </p>
          <ol className="mt-1 space-y-1 text-[13px] leading-relaxed text-[var(--color-muted)]">
            <li>
              <span className="font-bold text-[var(--color-text)]">1. {t("phase.reinforce")}</span>{" "}
              — {t("howto.phase.reinforce.desc")}
            </li>
            <li>
              <span className="font-bold text-[var(--color-text)]">2. {t("phase.attack")}</span>{" "}
              — {t("howto.phase.attack.desc")}
            </li>
            <li>
              <span className="font-bold text-[var(--color-text)]">3. {t("phase.fortify")}</span>{" "}
              — {t("howto.phase.fortify.desc")}
            </li>
          </ol>

          {/* Collapsible detail sections */}
          <div className="mt-4">
            <Section title={t("howto.combat.title")}>
              <ul className="list-disc space-y-1 pl-4">
                <li>{t("howto.combat.attack")}</li>
                <li>{t("howto.combat.dice")}</li>
                <li>{t("howto.combat.compare")}</li>
                <li>{t("howto.combat.conquer")}</li>
                <li>{t("howto.combat.occupy")}</li>
              </ul>
            </Section>

            <Section title={t("howto.cards.title")}>
              <ul className="list-disc space-y-1 pl-4">
                <li>{t("howto.cards.earn")}</li>
                <li>{t("howto.cards.set")}</li>
                <li>{t("howto.cards.bonus", { seq: TRADE_PROGRESSION.join(", ") })}</li>
                <li>{t("howto.cards.forced")}</li>
              </ul>
            </Section>

            <Section title={t("howto.objectives.title")}>
              <p>{t("howto.objectives.win")}</p>
              <p>{t("howto.objectives.intro")}</p>
              <ol className="list-decimal space-y-1 pl-4">
                {OBJECTIVE_KEYS.map((k) => (
                  <li key={k}>{t(k)}</li>
                ))}
              </ol>
            </Section>

            <Section title={t("howto.continents.title")}>
              <p>{t("howto.continents.map")}</p>
              <p>{t("howto.continents.reinforce")}</p>
              <ul className="mt-1 space-y-1">
                <li className="flex justify-between border-b border-[var(--color-hairline-2)] py-1 text-[11px] font-bold uppercase tracking-[.08em] text-[var(--color-muted)]">
                  <span>{t("howto.continents.nameLabel")}</span>
                  <span>{t("howto.continents.bonusLabel")}</span>
                </li>
                {CONTINENTS.map((c) => (
                  <li key={c.key} className="flex justify-between border-b border-[var(--color-hairline-2)] py-1">
                    <span className="text-[var(--color-text)]">{t(c.key)}</span>
                    <span className="font-bold text-[var(--color-signal)]">+{c.bonus}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title={t("howto.score.title")}>
              <p>{t("howto.score.intro")}</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>{t("howto.score.win")}</li>
                <li>{t("howto.score.continent")}</li>
                <li>{t("howto.score.territory")}</li>
                <li>{t("howto.score.turn")}</li>
                <li>{t("howto.score.floor")}</li>
              </ul>
              <p>{t("howto.score.leaderboard")}</p>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
