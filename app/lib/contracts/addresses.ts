// One active tournament == one deployed TegPool. Configure via NEXT_PUBLIC_* env
// (app/.env.local). When unset, the lobby shows a "no tournament configured" state.
export const CONFIGURED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 11142220); // Celo Sepolia

const tegPool = process.env.NEXT_PUBLIC_TEGPOOL_ADDRESS as `0x${string}` | undefined;
const usdt = process.env.NEXT_PUBLIC_USDT_ADDRESS as `0x${string}` | undefined;

export const ADDRESSES: { tegPool?: `0x${string}`; usdt?: `0x${string}` } = { tegPool, usdt };

/** True only on a Celo testnet (Sepolia) or a local node — gates the "mint test USDT" helper. */
export function isTestnet(chainId: number): boolean {
  return chainId === 11142220 || chainId === 31337;
}

export function isConfigured(): boolean {
  return Boolean(ADDRESSES.tegPool) && Boolean(ADDRESSES.usdt);
}
