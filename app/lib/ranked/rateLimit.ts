/** Tunable rate-limit constants (Neon-backed limits live in the routes/db layer). */
export const START_LIMIT = 10; // max /start per (pool, player) per window
export const START_WINDOW_MS = 10 * 60_000; // 10 minutes
export const ACTION_MIN_INTERVAL_MS = 250; // min gap between two /action calls per game

/** True when this /action call arrives too soon after the game's previous action.
 *  `lastActionAt` is the game's stored timestamp (null before the first action). */
export function isActionThrottled(lastActionAt: Date | null, nowMs: number): boolean {
  if (!lastActionAt) return false;
  return nowMs - lastActionAt.getTime() < ACTION_MIN_INTERVAL_MS;
}
