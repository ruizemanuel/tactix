import { createPublicClient, createWalletClient, http, type Chain } from "viem";
import { readTransport } from "./rpc.js";
import { celo, celoSepolia, hardhat } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

export function chainForId(id: number): Chain {
  switch (id) {
    case celo.id:
      return celo;
    case celoSepolia.id:
      return celoSepolia;
    case hardhat.id:
      return hardhat;
    default:
      throw new Error(`Unsupported chain id ${id}`);
  }
}

// Optional RPC override. The public forno endpoint can 403 under load (see 5b backlog);
// set RPC_URL to a dedicated endpoint in production.
const RPC_URL = process.env.RPC_URL;
const RPC_URL_FALLBACK = process.env.RPC_URL_FALLBACK;

export function getServerPublicClient(chainId: number) {
  return createPublicClient({ chain: chainForId(chainId), transport: readTransport(RPC_URL, RPC_URL_FALLBACK) });
}

export function getOracleWalletClient(chainId: number) {
  const key = process.env.ORACLE_PRIVATE_KEY;
  if (!key) throw new Error("ORACLE_PRIVATE_KEY not set");
  const account = privateKeyToAccount(key as `0x${string}`);
  return createWalletClient({ chain: chainForId(chainId), account, transport: http(RPC_URL) });
}
