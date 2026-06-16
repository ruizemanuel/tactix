"use client";

import { useQuery } from "@tanstack/react-query";
import { ADDRESSES } from "@/lib/contracts/addresses.js";
import { LeaderboardView, type LeaderboardRow } from "./LeaderboardView.js";

export function Leaderboard() {
  const pool = ADDRESSES.tegPool;
  const { data } = useQuery({
    queryKey: ["leaderboard", pool],
    enabled: !!pool,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<{ rows: LeaderboardRow[] }> => {
      const r = await fetch(`/api/leaderboard?pool=${pool}`);
      if (!r.ok) throw new Error(`leaderboard ${r.status}`);
      return r.json();
    },
  });

  if (!pool) return null;
  return <LeaderboardView rows={data?.rows ?? []} />;
}
