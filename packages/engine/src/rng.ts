/** Pure, serializable PRNG (mulberry32). State is a 32-bit int kept in GameState. */
export function nextUint32(state: number): { value: number; state: number } {
  const s = (state + 0x6d2b79f5) | 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = (t ^ (t >>> 14)) >>> 0;
  return { value, state: s };
}

/**
 * Integer in [0, max). Carries a negligible modulo bias (2^32 mod max favours the
 * low values by ~1 part in 10^8) — accepted deliberately for a casual game; do not
 * use for cryptographic purposes.
 */
export function nextInt(state: number, max: number): { value: number; state: number } {
  const r = nextUint32(state);
  return { value: r.value % max, state: r.state };
}

export function rollDie(state: number): { die: number; state: number } {
  const r = nextUint32(state);
  return { die: (r.value % 6) + 1, state: r.state };
}

/** Roll n dice, returned sorted descending (for combat pairing). */
export function rollDice(state: number, n: number): { dice: number[]; state: number } {
  const dice: number[] = [];
  let s = state;
  for (let i = 0; i < n; i++) {
    const r = rollDie(s);
    dice.push(r.die);
    s = r.state;
  }
  dice.sort((a, b) => b - a);
  return { dice, state: s };
}
