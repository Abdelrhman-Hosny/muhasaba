import { useMemo } from 'react';
import { ScorecardStructureSection } from '@/state/deedStore';

/**
 * Custom hook to extract all active deed definition IDs from the user's scorecard structure.
 */
export function useActiveDefinitionIds(scorecardStructure: ScorecardStructureSection[]): Set<string> {
  return useMemo(() => {
    const ids = new Set<string>();
    for (const sec of scorecardStructure) {
      for (const d of sec.deeds) {
        if (d.definitionId) {
          ids.add(d.definitionId);
        }
      }
    }
    return ids;
  }, [scorecardStructure]);
}
