export interface ScoringItem {
  deed: {
    type: string;
    target?: number | null;
  };
  log?: {
    status: string;
    value?: number | null;
  } | null;
}

/**
 * Computes the total active tasks and completed points for a list of scorecard items.
 * - Boolean deeds: 1.0 point if status is 'done', 0.0 otherwise.
 * - Measured deeds: min(1.0, value / target) points.
 */
export function computeScorecardScore(items: ScoringItem[]): { totalTasks: number; donePoints: number } {
  let total = 0;
  let score = 0;
  for (const item of items) {
    total += 1;
    const log = item.log;
    if (log) {
      if (item.deed.type === 'boolean') {
        if (log.status === 'done') {
          score += 1.0;
        }
      } else if (item.deed.type === 'measured' && item.deed.target) {
        const val = log.value ?? 0;
        score += Math.min(1.0, val / item.deed.target);
      }
    }
  }
  return { totalTasks: total, donePoints: score };
}
