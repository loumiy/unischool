import type { GameState, Pillar } from '../../state/types';

// The college's specialization (Plan 85): the one pillar it may be the very
// best at. None until Plan 85D saves the choice (s.specialization), so every
// pillar keeps to its unspecialized ceiling (prestigeSystem.ts's
// UNSPECIALIZED_CEILINGS), no program plays above the unspecialized team
// ceiling (studentLifeData.ts) and the big stage stands against every
// program (playoffs.ts's STAGE_EDGE). Its own module, with no imports but
// types, so the data files that read it join no import cycle.
export function specializationOf(_s: GameState): Pillar | null {
  return null;
}
