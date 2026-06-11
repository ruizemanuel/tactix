"use client";

import { useI18n } from "@/lib/i18n/I18nProvider.js";
import { TxButton } from "./TxButton.js";

export function MintTestUsdtButton({ onRun, onDone }: { onRun: () => Promise<unknown>; onDone?: () => void }) {
  const { t } = useI18n();
  return <TxButton variant="ghost" label={t("cta.mintTestUsdt")} onRun={onRun} onDone={onDone} />;
}
