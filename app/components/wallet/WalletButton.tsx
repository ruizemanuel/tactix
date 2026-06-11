"use client";

import { useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { isMiniPay } from "@/lib/web3/minipay.js";
import { useI18n } from "@/lib/i18n/I18nProvider.js";
import { cn } from "@/lib/utils.js";

function truncate(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WalletButton() {
  const { t } = useI18n();
  const { address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Auto-connect the injected provider inside MiniPay.
  useEffect(() => {
    if (address) return;
    if (!isMiniPay()) return;
    const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];
    if (injected) connect({ connector: injected });
  }, [address, connect, connectors]);

  const pill = cn(
    "inline-flex items-center gap-2 rounded-lg border border-[var(--color-hairline-2)] px-3 py-[6px]",
    "text-[11px] font-bold uppercase tracking-[.08em] transition-colors",
    "text-[var(--color-text)] hover:bg-white/10",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-signal)]",
  );

  if (!address) {
    const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];
    return (
      <button
        type="button"
        className={pill}
        style={{ fontFamily: "var(--font-mono)" }}
        onClick={() => injected && connect({ connector: injected })}
      >
        {t("wallet.connect")}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={pill}
      style={{ fontFamily: "var(--font-mono)" }}
      onClick={() => disconnect()}
      title={t("wallet.disconnect")}
    >
      <span className="h-2 w-2 rounded-full bg-[var(--color-you)]" aria-hidden />
      {truncate(address)}
    </button>
  );
}
