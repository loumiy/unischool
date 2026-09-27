import type { GameState } from '../state/types';
import { standsOnCampus, totalEnrolled } from '../state/types';
import { expectedRatio } from '../systems/satisfaction/satisfactionSystem';

// Which residences are full (Plan 72G), for the map's mark. Beds are one
// pool in the simulation (s.students.capacity), so this is a reading, not a
// record: the students who want a bed (the enrolled body at the housing
// standard satisfaction holds the college to) take them in the order the
// residences opened, oldest first, and a residence whose every bed is taken
// is full. When the college is short of beds, every one is; with room to
// spare, the newest have it.
export function fullResidences(s: GameState): Set<string> {
  const residences = s.tech
    .filter((t) => t.kind === 'dorm' && standsOnCampus(t) && (t.effects?.capacityBonus ?? 0) > 0)
    .sort((a, b) => (a.builtYear ?? 0) - (b.builtYear ?? 0) || a.id.localeCompare(b.id));
  let wanting = totalEnrolled(s.students) * expectedRatio(s, 'housing');
  const full = new Set<string>();
  for (const t of residences) {
    const beds = t.effects?.capacityBonus ?? 0;
    if (wanting < beds) break;
    full.add(t.id);
    wanting -= beds;
  }
  return full;
}
