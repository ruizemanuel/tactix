import { http, fallback, type Transport } from "viem";

/** Ordered, non-empty RPC URLs from a primary + optional fallback. */
export function resolveRpcUrls(primary?: string, fallbackUrl?: string): string[] {
  return [primary, fallbackUrl].filter((u): u is string => typeof u === "string" && u.trim().length > 0);
}

/**
 * A resilient read transport: viem `fallback()` across the resolved URLs with
 * retry/backoff; the chain-default endpoint when none are given. Read-only — do
 * not use for the oracle wallet (writes stay on the primary signer path).
 */
export function readTransport(primary?: string, fallbackUrl?: string): Transport {
  const opts = { retryCount: 3, retryDelay: 300 } as const;
  const urls = resolveRpcUrls(primary, fallbackUrl);
  if (urls.length === 0) return http(undefined, opts);
  if (urls.length === 1) return http(urls[0], opts);
  return fallback(urls.map((u) => http(u, opts)));
}
