export interface ScoreBreakdown {
  won: boolean;
  continents: number;
  territories: number;
  turnsUsed: number;
}

/** Per design §6.6: (won?1000) + continents*100 + territories*5 - turnsUsed*2, floored at 0. */
export function computeScore(b: ScoreBreakdown): number {
  const raw = (b.won ? 1000 : 0) + b.continents * 100 + b.territories * 5 - b.turnsUsed * 2;
  return Math.max(0, raw);
}
