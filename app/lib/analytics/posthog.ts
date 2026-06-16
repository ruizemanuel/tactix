import posthog from "posthog-js";

let initialized = false;

/** Initialize the PostHog browser client once. No-op if the project key is unset
 *  (local dev / CI / tests / a build before the env is configured) — analytics
 *  silently disables instead of erroring. Anonymous only: never calls identify. */
export function initAnalytics(): void {
  if (initialized) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    autocapture: false,
    capture_pageview: false,
    capture_heatmaps: false,
    disable_session_recording: true,
    person_profiles: "identified_only",
  });
  initialized = true;
}

/** The initialized client, or null when analytics is disabled. */
export function getPosthog(): typeof posthog | null {
  return initialized ? posthog : null;
}
