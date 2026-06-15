import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const startRanked = vi.fn();
vi.mock("@/lib/ranked/client.js", () => ({ startRanked: (...a: unknown[]) => startRanked(...a), submitRanked: vi.fn() }));
vi.mock("wagmi", () => ({ useAccount: () => ({ address: undefined }), useSignMessage: () => ({ signMessageAsync: vi.fn() }) }));
vi.mock("@/hooks/useTegPool.js", () => ({ useTegPool: () => ({ connected: false, addresses: {}, view: { cta: "connect", phase: "OPEN" } }) }));
vi.mock("@/lib/i18n/I18nProvider.js", () => ({ useI18n: () => ({ t: (k: string) => k }) }));

import { RankedScreen } from "./RankedScreen.js";

describe("RankedScreen", () => {
  it("prompts to connect and never starts a game when no wallet", () => {
    render(<RankedScreen />);
    expect(screen.getByText("ranked.connectFirst")).toBeInTheDocument();
    expect(startRanked).not.toHaveBeenCalled();
  });
});
