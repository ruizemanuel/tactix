import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { replayWithEvents, redactState, type Action, type RedactedGameState } from "@teg/engine";
import { getOpenGame, appendAction } from "@/lib/db/rankedGames.js";
import { isActionThrottled } from "@/lib/ranked/rateLimit.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HUMAN_ID = "you";
const AI_ID = "ai";
const MAX_ACTIONS = 5000; // bounds the O(n^2) replay per game

function tokenOk(provided: string, expectedHash: string | null): boolean {
  if (!expectedHash) return false;
  const a = Buffer.from(crypto.createHash("sha256").update(provided).digest("hex"), "hex");
  const b = Buffer.from(expectedHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Canonical, key-order-independent compare so the idempotent-retry decision
// can't drift if the client serializes an action with a different key order.
// Array values (e.g. tradeCards cardIds) keep their order — that order is meaningful.
function canonAction(a: Action): string {
  const o = a as Record<string, unknown>;
  return JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));
}

function sameAction(a: Action, b: Action): boolean {
  return canonAction(a) === canonAction(b);
}

type Built =
  | { ok: true; view: RedactedGameState; frames: RedactedGameState[] }
  | { ok: false; error: string };

function buildState(seed: number, log: Action[]): Built {
  const r = replayWithEvents(seed, log, { humanId: HUMAN_ID, aiId: AI_ID });
  if (!r.ok) return { ok: false, error: r.error };
  const view = redactState(r.finalState, HUMAN_ID);
  let lastHuman = -1;
  for (let i = r.events.length - 1; i >= 0; i--) {
    if (r.events[i]!.actor === "human") {
      lastHuman = i;
      break;
    }
  }
  const frames = r.events
    .slice(lastHuman + 1)
    .filter((e) => e.actor === "ai")
    .map((e) => redactState(e.state, HUMAN_ID));
  return { ok: true, view, frames };
}

export async function POST(req: NextRequest) {
  let body: { gameId?: string; sessionToken?: unknown; version?: unknown; action?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const { gameId } = body;
  if (
    !gameId ||
    typeof body.sessionToken !== "string" ||
    typeof body.version !== "number" ||
    !body.action ||
    typeof body.action !== "object"
  ) {
    return NextResponse.json({ error: "gameId, sessionToken, version, action required" }, { status: 400 });
  }
  const sessionToken = body.sessionToken;
  const version = body.version;
  const action = body.action as Action;

  const game = await getOpenGame(gameId);
  if (!game) return NextResponse.json({ error: "game not found or already scored" }, { status: 404 });
  if (!tokenOk(sessionToken, game.sessionTokenHash)) {
    return NextResponse.json({ error: "bad session" }, { status: 401 });
  }

  // Tournament deadline (hard): endTime is the pool's immutable end, persisted at /start.
  // Once it passes, no action does anything useful -> 409 (covers the new-append AND the
  // version-mismatch read/retry branch below). Zero RPC: server clock vs the stored value.
  if (game.endTime != null && Math.floor(Date.now() / 1000) >= game.endTime) {
    return NextResponse.json({ error: "tournament ended" }, { status: 409 });
  }

  if (isActionThrottled(game.lastActionAt, Date.now())) {
    return NextResponse.json({ error: "too fast, slow down" }, { status: 429 });
  }

  const storedLog = (game.actions ?? []) as Action[];

  // Version mismatch → idempotent retry (client one behind, same last action) or conflict.
  if (version !== game.version) {
    const isRetry =
      version === game.version - 1 &&
      storedLog.length > 0 &&
      sameAction(storedLog[storedLog.length - 1]!, action);
    // storedLog is bounded to <= MAX_ACTIONS by the append guard below, and this
    // branch is only reached after the session-token check, so the replay cost
    // here is bounded and authenticated. Per-participant rate-limiting is deferred
    // to the hardening backlog.
    const built = buildState(Number(game.seed), storedLog);
    if (!built.ok) return NextResponse.json({ error: built.error }, { status: 400 });
    return NextResponse.json(
      { version: game.version, view: built.view, frames: isRetry ? built.frames : [] },
      { status: isRetry ? 200 : 409 },
    );
  }

  const newLog = [...storedLog, action];
  if (newLog.length > MAX_ACTIONS) return NextResponse.json({ error: "too many actions" }, { status: 400 });

  const built = buildState(Number(game.seed), newLog);
  if (!built.ok) return NextResponse.json({ error: built.error }, { status: 400 });

  const newVersion = await appendAction(gameId, version, newLog);
  if (newVersion === null) {
    const fresh = await getOpenGame(gameId);
    const cur = fresh ? buildState(Number(fresh.seed), (fresh.actions ?? []) as Action[]) : null;
    return NextResponse.json(
      cur && cur.ok ? { version: fresh!.version, view: cur.view, frames: [] } : { error: "conflict" },
      { status: 409 },
    );
  }

  return NextResponse.json({ version: newVersion, view: built.view, frames: built.frames }, { status: 200 });
}
