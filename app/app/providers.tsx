"use client";

import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "@/lib/web3/wagmi.js";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider.js";

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={qc}>
        <AnalyticsProvider>{children}</AnalyticsProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
