// ---------------------------------------------------------------------
// The harness's choice of a specialization (Plan 85D). When the milestone
// offers it (src/systems/prestige/milestone.ts), a harness player chooses
// by a rule:
//
//   'strongest'  its strongest pillar: the highest value on the prestige
//                scale (as the guide's columns print it); on a tie, which
//                is common at the unspecialized limits, the better rank in
//                that pillar's standing; then the pillars' own order
//   a pillar     that one, whatever the college's standing (the hook for
//                Plan 85I's specialized Guided players)
//   'never'      puts it off every time: the unspecialized player, to
//                measure what a college reaches without one
//
// Every player takes 'strongest' unless it names another (game.ts's
// answerAll asks here before the game's own default, which puts the
// choice off). What each chose, and when, is the state's own
// (s.specialization, s.specializationYear), which the report prints.
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import type { Action } from '../../src/state/actions';
import type { GameState, Pillar } from '../../src/state/types';
import { specializationOptions, type SpecializationOption } from '../../src/systems/prestige/milestone';

export type SpecializationRule = 'strongest' | 'never' | Pillar;

// Values within this of each other are level (the limits hold several
// pillars at one figure).
const LEVEL = 0.5;

export function strongestPillar(s: GameState): Pillar {
  return strongestOf(specializationOptions(s));
}

// The rule on the choice's own figures (each pillar's value and rank).
export function strongestOf(options: ReadonlyArray<Pick<SpecializationOption, 'pillar' | 'value' | 'rank'>>): Pillar {
  const top = Math.max(...options.map((o) => o.value));
  // The sort is stable: level on rank too, the pillars' order.
  return options.filter((o) => top - o.value <= LEVEL).sort((a, b) => a.rank - b.rank)[0].pillar;
}

export function chooseSpecialization(s: GameState, rule: SpecializationRule): Pillar | null {
  return rule === 'strongest' ? strongestPillar(s) : rule === 'never' ? null : rule;
}

// The answer to a standing choice, or null when none stands.
export function specializationAnswer(s: GameState, rule: SpecializationRule = 'strongest'): Action | null {
  if (s.pendingInterrupt?.type !== 'specialization') return null;
  return { type: 'RESOLVE_SPECIALIZATION', pillar: chooseSpecialization(s, rule) };
}
