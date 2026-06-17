"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider.js";
import { cn } from "@/lib/utils.js";
import { track } from "@/lib/analytics/events.js";
import { HowToPlayModal } from "./HowToPlayModal.js";

export function HowToPlayButton({ variant = "lobby" }: { variant?: "lobby" | "compact" }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  function openModal() {
    setOpen(true);
    track("how_to_play_opened");
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={cn(
          "cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-signal)]",
          variant === "lobby"
            ? "w-full rounded-xl border border-[var(--color-hairline-2)] px-4 py-2.5 text-center text-sm font-bold uppercase tracking-[.06em] text-[var(--color-text)] transition hover:bg-white/10"
            : "rounded-lg border border-[var(--color-hairline-2)] bg-[var(--color-surface)] px-[9px] py-[6px] text-[9.5px] font-bold uppercase tracking-[.14em] text-[var(--color-text)]",
        )}
        style={variant === "compact" ? { fontFamily: "var(--font-mono)" } : undefined}
      >
        {t("howto.open")}
      </button>
      <HowToPlayModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
