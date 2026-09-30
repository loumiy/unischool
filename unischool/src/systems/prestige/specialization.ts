import type { GameState, Pillar } from '../../state/types';

// The college's specialization (Plan 85): the one pillar it may be the very
// best at, chosen once at the milestone and kept (Plan 85D saves it as
// s.specialization; systems/prestige/milestone.ts offers it). Until then,
// and for every pillar but the chosen one, each keeps to its unspecialized
// ceiling (prestigeSystem.ts's UNSPECIALIZED_CEILINGS). Without the
// athletics specialization no program plays above the unspecialized team
// ceiling (studentLifeData.ts) and the big stage stands against every
// program (playoffs.ts's STAGE_EDGE). Its own module, with no imports but
// types, so the data files that read it join no import cycle.
export function specializationOf(s: GameState): Pillar | null {
  const chosen = s.specialization;
  return chosen === 'academics' || chosen === 'research' || chosen === 'studentLife' || chosen === 'athletics' ? chosen : null;
}

// The athletics specialization's lift (Plan 85D): with it, the team ceiling
// (studentLifeData.ts's teamCeiling) rises to the full 100 and the big stage
// (playoffs.ts's stageEdge) stands down. The one hook both read, which the
// athletic performance complex (Plan 85G) extends.
export function athleticsLifted(s: GameState): boolean {
  return specializationOf(s) === 'athletics';
}
