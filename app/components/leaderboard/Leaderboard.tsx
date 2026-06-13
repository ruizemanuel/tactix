"use client";

import { useEffect, useState } from "react";
import { ADDRESSES } from "@/lib/contracts/addresses.js";
import { LeaderboardView, type LeaderboardRow } from "./LeaderboardView.js";

export function Leaderboard() {
  const pool = ADDRESSES.tegPool;
  const [rows, setRows] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    if (!pool) return;
    let active = true;
    fetch(`/api/leaderboard?pool=${pool}`)
      .then((r) => (r.ok ? r.json() : { rows: [] }))
      .then((d) => {
        if (active) setRows(d.rows ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pool]);

  if (!pool) return null;
  return <LeaderboardView rows={rows} />;
}
