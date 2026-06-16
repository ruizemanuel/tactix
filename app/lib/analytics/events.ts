import { getPosthog } from "./posthog.js";

/** Every product event we emit — the single source of truth for event names so
 *  call sites stay typed and consistent. */
export type AnalyticsEvent =
  | "wallet_connected"
  | "pool_joined"
  | "pool_join_failed"
  | "deposit_withdrawn"
  | "prize_claimed"
  | "ranked_started"
  | "ranked_start_failed"
  | "ranked_finished"
  | "sign_rejected"
  | "score_finalized"
  | "practice_started";

type Props = Record<string, string | number | boolean>;

/** Fire-and-forget product event. No-op when analytics is disabled; never throws
 *  into the app. No PII — never pass a wallet address. */
export function track(event: AnalyticsEvent, props?: Props): void {
  const ph = getPosthog();
  if (!ph) return;
  try {
    ph.capture(event, props);
  } catch {
    // analytics must never break the app
  }
}

/** Manual pageview (autocapture pageviews are disabled). */
export function trackPageview(path: string): void {
  const ph = getPosthog();
  if (!ph) return;
  try {
    ph.capture("$pageview", { $current_url: path });
  } catch {
    // ignore
  }
}
