export interface RawScore {
  player: string;
  bestScore: number;
}

export interface LeaderboardRow {
  player: string;
  bestScore: number;
  rank: number;
}

/** Pure: sort by bestScore desc, assign 1-based ranks where equal scores share a rank. */
export function rankRows(rows: RawScore[]): LeaderboardRow[] {
  const sorted = [...rows].sort((a, b) => b.bestScore - a.bestScore);
  let prevScore: number | null = null;
  let prevRank = 0;
  return sorted.map((r, i) => {
    const rank = prevScore !== null && r.bestScore === prevScore ? prevRank : i + 1;
    prevScore = r.bestScore;
    prevRank = rank;
    return { player: r.player, bestScore: r.bestScore, rank };
  });
}
