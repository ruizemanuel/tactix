import { createConfig, http } from "wagmi";
import { celo, celoSepolia, hardhat } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Injected only (MiniPay injects an EIP-1193 provider). WalletConnect is a future add.
// `hardhat` (31337) is included so local-node / mock-connector flows resolve a chain.
export const config = createConfig({
  chains: [celo, celoSepolia, hardhat],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [celo.id]: http(),
    [celoSepolia.id]: http(),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
