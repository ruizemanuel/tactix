import type { Action, RedactedGameState, ScoreBreakdown } from "@teg/engine";

/** Thrown by the ranked client on a non-ok HTTP response. `status` lets callers
 *  branch (e.g. a 409 conflict) without parsing the message string. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export interface StartResult {
  gameId: string;
  sessionToken: string;
  version: number;
  view: RedactedGameState;
}

export interface ActionResult {
  version: number;
  view: RedactedGameState;
  frames: RedactedGameState[];
}

export interface SubmitResult {
  score: number;
  breakdown: ScoreBreakdown;
  won: boolean;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new HttpError(res.status, `${url} failed: ${res.status} ${detail}`);
  }
  return res.json() as Promise<T>;
}

export function startRanked(pool: string, player: string): Promise<StartResult> {
  return postJson<StartResult>("/api/ranked/start", { pool, player });
}

export function sendAction(
  gameId: string,
  sessionToken: string,
  version: number,
  action: Action,
): Promise<ActionResult> {
  return postJson<ActionResult>("/api/ranked/action", { gameId, sessionToken, version, action });
}

export function finalizeRanked(gameId: string, signature: string): Promise<SubmitResult> {
  return postJson<SubmitResult>("/api/ranked/finalize", { gameId, signature });
}
