"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { initAnalytics } from "@/lib/analytics/posthog.js";
import { trackPageview } from "@/lib/analytics/events.js";

/** Initializes PostHog once on mount and emits a manual $pageview on each route
 *  change (autocapture pageviews are disabled). No-ops entirely when the key is unset. */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (pathname) trackPageview(pathname);
  }, [pathname]);

  return <>{children}</>;
}
