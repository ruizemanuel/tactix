import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n/I18nProvider.js";

const mocks = vi.hoisted(() => ({
  account: { address: undefined as string | undefined, chainId: 11142220 },
  connect: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock("wagmi", () => ({
  useAccount: () => mocks.account,
  useConnect: () => ({ connect: mocks.connect, connectors: [{ id: "injected" }] }),
  useDisconnect: () => ({ disconnect: mocks.disconnect }),
}));

vi.mock("@/lib/web3/minipay.js", () => ({ isMiniPay: () => false }));

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
});
