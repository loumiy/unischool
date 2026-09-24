import { useSyncExternalStore } from 'react';
import type { Species } from '../data/treeData';

// Which tree the plant tool plants (Plan 37, from v2's species chips): a
// choice of the session's, not the run's, so it lives here rather than in
// the save. The build menu's chips set it; the map reads it as it plants.
let current: Species | null = null;
const listeners = new Set<() => void>();

export function plantingSpecies(): Species | null {
  return current;
}

export function setPlantingSpecies(next: Species | null): void {
  current = next;
  for (const l of listeners) l();
}

export function usePlantingSpecies(): Species | null {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    plantingSpecies,
  );
}
