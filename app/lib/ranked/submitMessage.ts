/**
 * The canonical message a player signs (personal_sign / EIP-191) to authorize
 * scoring a ranked game. Built identically on the client (to sign) and the
 * server (to verify) — if these ever diverge, every legit submit fails.
 * `gameId` is the single-use nonce; `pool` is lowercased for determinism.
 */
export function buildSubmitMessage(v: { pool: string; gameId: string; chainId: number }): string {
  return [
    "TACTIX ranked score submission",
    `Pool: ${v.pool.toLowerCase()}`,
    `Game: ${v.gameId}`,
    `Chain: ${v.chainId}`,
  ].join("\n");
}
