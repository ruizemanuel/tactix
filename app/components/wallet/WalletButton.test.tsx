import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n/I18nProvider.js";

const mocks = vi.hoisted(() => ({
  account: { address: undefined as string | undefined, chainId: 11142220 },
  connect: vi.fn(),
  disconnect: vi.fn(),
  track: vi.fn(),
}));

vi.mock("wagmi", () => ({
  useAccount: () => mocks.account,
  useConnect: () => ({ connect: mocks.connect, connectors: [{ id: "injected" }] }),
  useDisconnect: () => ({ disconnect: mocks.disconnect }),
}));

vi.mock("@/lib/web3/minipay.js", () => ({ isMiniPay: () => false }));
vi.mock("@/lib/analytics/events.js", () => ({ track: mocks.track }));

import { WalletButton } from "./WalletButton.js";

function renderIt() {
  return render(
    <I18nProvider initialLocale="en">
      <WalletButton />
    </I18nProvider>,
  );
}

describe("WalletButton", () => {
  beforeEach(() => {
    mocks.account.address = undefined;
    mocks.track.mockClear();
  });

  it("shows Connect when disconnected", () => {
    renderIt();
    expect(screen.getByRole("button", { name: /connect/i })).toBeInTheDocument();
  });

  it("shows a truncated address when connected", () => {
    mocks.account.address = "0x1234567890abcdef1234567890abcdef12345678";
    renderIt();
    expect(screen.getByText(/0x1234…5678/i)).toBeInTheDocument();
  });

  it("fires wallet_connected with is_minipay + chain_id when an address is present", () => {
    mocks.account.address = "0x1234567890abcdef1234567890abcdef12345678";
    renderIt();
    expect(mocks.track).toHaveBeenCalledWith("wallet_connected", { is_minipay: false, chain_id: 11142220 });
  });
});
