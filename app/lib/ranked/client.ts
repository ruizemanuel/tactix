import type { Action, ScoreBreakdown } from "@teg/engine";

export interface StartResult {
  gameId: string;
  seed: number;
  commitHash: string;
}

export interface SubmitResult {
  score: number;
  breakdown: ScoreBreakdown;
  won: boolean;
}

export async function startRanked(pool: string, player: string): Promise<StartResult> {
  const res = await fetch("/api/ranked/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pool, player }),
  });
  if (!res.ok) throw new Error(`start failed: ${res.status}`);
  return res.json();
}

export async function submitRanked(gameId: string, actions: Action[]): Promise<SubmitResult> {
  const res = await fetch("/api/ranked/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ gameId, actions }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`submit failed: ${res.status} ${detail}`);
  }
  return res.json();
}
