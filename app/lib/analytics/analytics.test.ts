import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPosthog = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn() }));
vi.mock("posthog-js", () => ({ default: mockPosthog }));

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

async function load() {
  const { initAnalytics } = await import("@/lib/analytics/posthog.js");
  const { track, trackPageview } = await import("@/lib/analytics/events.js");
  return { initAnalytics, track, trackPageview };
}

describe("analytics", () => {
  it("does not init and no-ops when the key is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    const { initAnalytics, track, trackPageview } = await load();
    initAnalytics();
    track("pool_joined");
    trackPageview("/");
    expect(mockPosthog.init).not.toHaveBeenCalled();
    expect(mockPosthog.capture).not.toHaveBeenCalled();
  });

  it("inits with the privacy config when the key is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://eu.i.posthog.com");
    const { initAnalytics } = await load();
    initAnalytics();
    expect(mockPosthog.init).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({
        api_host: "https://eu.i.posthog.com",
        autocapture: false,
        capture_pageview: false,
        capture_heatmaps: false,
        disable_session_recording: true,
        person_profiles: "identified_only",
      }),
    );
  });

  it("defaults the host to us cloud", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { initAnalytics } = await load();
    initAnalytics();
    expect(mockPosthog.init).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({ api_host: "https://us.i.posthog.com" }),
    );
  });

  it("is idempotent (second init does nothing)", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { initAnalytics } = await load();
    initAnalytics();
    initAnalytics();
    expect(mockPosthog.init).toHaveBeenCalledTimes(1);
  });

  it("captures events with props once initialized", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { initAnalytics, track, trackPageview } = await load();
    initAnalytics();
    track("pool_joined");
    track("score_finalized", { won: true, score: 1076 });
    trackPageview("/play/ranked");
    expect(mockPosthog.capture).toHaveBeenCalledWith("pool_joined", undefined);
    expect(mockPosthog.capture).toHaveBeenCalledWith("score_finalized", { won: true, score: 1076 });
    expect(mockPosthog.capture).toHaveBeenCalledWith("$pageview", { $current_url: expect.stringContaining("/play/ranked") });
  });

  it("swallows a capture error (never throws into the app)", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { initAnalytics, track } = await load();
    initAnalytics();
    mockPosthog.capture.mockImplementation(() => {
      throw new Error("network");
    });
    expect(() => track("pool_joined")).not.toThrow();
  });
});
