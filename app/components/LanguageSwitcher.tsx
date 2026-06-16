"use client";

import { useI18n } from "@/lib/i18n/I18nProvider.js";
import { cn } from "@/lib/utils.js";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div
      className="inline-flex overflow-hidden rounded-lg border border-[var(--color-hairline-2)]"
      style={{ fontFamily: "var(--font-mono)" }}
      role="group"
      aria-label={t("a11y.language")}
    >
      {(["es", "en"] as const).map((l, i) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={cn(
            "cursor-pointer px-3 py-[5px] text-[10px] font-bold uppercase tracking-[.1em] transition-colors",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-signal)]",
            i > 0 && "border-l border-[var(--color-hairline-2)]",
            locale === l
              ? "bg-white/14 text-[var(--color-text)]"
              : "bg-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]",
          )}
          aria-pressed={locale === l}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
