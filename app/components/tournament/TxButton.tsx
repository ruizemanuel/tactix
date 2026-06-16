"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider.js";
import { cn } from "@/lib/utils.js";

export function TxButton({
  label,
  onRun,
  onDone,
  onError,
  disabled,
  variant = "primary",
}: {
  label: string;
  onRun: () => Promise<unknown>;
  onDone?: () => void;
  onError?: () => void;
  disabled?: boolean;
  variant?: "primary" | "prize" | "ghost";
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function handle() {
    setBusy(true);
    setError(false);
    try {
      await onRun();
      onDone?.();
    } catch {
      setError(true);
      onError?.();
    } finally {
      setBusy(false);
    }
  }

  const palette =
    variant === "prize"
      ? "bg-[var(--color-signal)] text-black hover:brightness-110"
      : variant === "ghost"
        ? "border border-[var(--color-hairline-2)] text-[var(--color-text)] hover:bg-white/10"
        : "bg-[var(--color-you)] text-black hover:brightness-110";

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={handle}
        className={cn(
          "w-full cursor-pointer rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-[.06em] transition",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-signal)]",
          palette,
        )}
      >
        {busy ? t("tx.confirming") : label}
      </button>
      {error && <p className="text-xs text-[var(--color-ai)]">{t("tx.error")}</p>}
    </div>
  );
}
