import { WEEKS_PER_YEAR, type GameState } from '../state/types';
import { districtStep } from '../data/downtownData';

// One look at the downtown (Plan 95C, the second review's B1-7). The
// district stands in the ring along the road, outside the opening view, so
// the map eases its view to it once on each of two edges seen in the
// session:
// - the player chooses the student-life specialization;
// - the district first grows from step 0 to step 1.
// Both are read from what the map saw last (DistrictSeen), never from the
// save, so loading a game never pans: the first sighting has nothing before
// it, and a load of another college, or of this one at another week, is not
// an edge. Needs no state.
export interface DistrictSeen {
  name: string;
  // The week, counted from the founding.
  week: number;
  studentLife: boolean;
  step: number;
}

export function districtSeen(s: GameState): DistrictSeen {
  return {
    name: s.self.name,
    week: s.clock.year * WEEKS_PER_YEAR + s.clock.week,
    studentLife: s.specialization === 'studentLife',
    step: districtStep(s),
  };
}

// Whether the map looks at the district, going from `prev` to `next`: the
// same college, at the same week or the next, on one of the two edges.
export function districtLookDue(prev: DistrictSeen | null, next: DistrictSeen): boolean {
  if (!prev || prev.name !== next.name) return false;
  const weeks = next.week - prev.week;
  if (weeks < 0 || weeks > 1) return false;
  return (!prev.studentLife && next.studentLife) || (prev.step === 0 && next.step > 0);
}
