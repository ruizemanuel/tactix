import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  initAnalytics: vi.fn(),
  trackPageview: vi.fn(),
  pathname: "/play",
}));

vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("@/lib/analytics/posthog.js", () => ({ initAnalytics: mocks.initAnalytics }));
vi.mock("@/lib/analytics/events.js", () => ({ trackPageview: mocks.trackPageview }));

import { AnalyticsProvider } from "./AnalyticsProvider.js";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname = "/play";
});

describe("AnalyticsProvider", () => {
  it("inits analytics once and tracks the current pathname as a pageview", () => {
    render(
      <AnalyticsProvider>
        <div>child</div>
      </AnalyticsProvider>,
    );
    expect(mocks.initAnalytics).toHaveBeenCalledTimes(1);
    expect(mocks.trackPageview).toHaveBeenCalledWith("/play");
  });

  it("renders children", () => {
    const { getByText } = render(
      <AnalyticsProvider>
        <div>hello-child</div>
      </AnalyticsProvider>,
    );
    expect(getByText("hello-child")).toBeInTheDocument();
  });

  it("re-tracks a pageview on route change but inits only once", () => {
    mocks.pathname = "/";
    const { rerender } = render(
      <AnalyticsProvider>
        <div>child</div>
      </AnalyticsProvider>,
    );
    mocks.pathname = "/play/ranked";
    rerender(
      <AnalyticsProvider>
        <div>child</div>
      </AnalyticsProvider>,
    );
    expect(mocks.trackPageview).toHaveBeenCalledWith("/");
    expect(mocks.trackPageview).toHaveBeenCalledWith("/play/ranked");
    expect(mocks.trackPageview).toHaveBeenCalledTimes(2);
    expect(mocks.initAnalytics).toHaveBeenCalledTimes(1);
  });
});
