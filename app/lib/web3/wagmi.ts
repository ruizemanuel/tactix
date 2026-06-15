import { createConfig } from "wagmi";
import { celo, celoSepolia, hardhat } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { http } from "viem";
import { readTransport } from "@/lib/web3/rpc.js";

// Read RPCs are overridable via env; defaults are forno (primary) + a public
// fallback so a single endpoint hiccup doesn't break reads. Writes are unaffected.
const CELO_RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://forno.celo.org";
const CELO_RPC_FALLBACK = process.env.NEXT_PUBLIC_RPC_URL_FALLBACK ?? "https://celo.drpc.org";

export const config = createConfig({
  chains: [celo, celoSepolia, hardhat],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [celo.id]: readTransport(CELO_RPC, CELO_RPC_FALLBACK),
    [celoSepolia.id]: readTransport(process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
