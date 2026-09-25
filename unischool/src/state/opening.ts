import type { GameState, OpeningStage } from './types';
import { FOUNDERS_HALL_ID } from '../data/techData';
import { FOUNDING_PROGRAMS } from '../data/foundingData';
import { centredPlacement, footprintOf } from './campusMap';
import { fellTrees } from '../data/treeData';

// The opening walkthrough: the first clicks of a new school, with the clock
// held until each step is actually done. The stage lives in state
// (s.events.opening.stage) so a refresh or a mid-walk save resumes on the
// same step:
//
//   welcome    Next, or "I know the way", which also declines the letters.
//              Every later card can skip the rest, letters kept.
//   site-hall  Founders Hall is not pre-placed in a guided founding; done
//              when the hall stands on the map (siting is free).
//   teaching   the three founding programs, with Next opening the Curriculum.
//   found      found a fourth program from Founders Hall's panel, which also
//              teaches hiring; done when a fourth program is housed.
//   play       the clock runs; the first letter is marked read.
//
// Transitions are readings of state, not UI flags: settleOpening runs after
// PLACE_BUILDABLE and FOUND_PROGRAM, advanceOpening answers the Next buttons.
// A headless founding opens at 'play' with the hall pre-placed.
// This lives in state/ because it reads the map, which systems/ may not
// (test/invariants.test.ts). The copy is in data/openingData.ts.

export type { OpeningStage };

// Whether the walk holds the clock: gates the reducer's TICK and useGame's
// sampler, like a pending interrupt.
export function openingHoldsClock(s: GameState): boolean {
  return s.events.opening.stage !== 'play';
}

// The two Next buttons; other stages are settled by settleOpening.
export function advanceOpening(s: GameState): void {
  const stage = s.events.opening.stage;
  if (stage === 'welcome') s.events.opening.stage = 'site-hall';
  else if (stage === 'teaching') s.events.opening.stage = 'found';
}

// The steps that end when the thing was done, called after every action
// that could do it. 'teaching' also ends if a program is founded before Next.
export function settleOpening(s: GameState): void {
  const stage = s.events.opening.stage;
  if (stage === 'site-hall' && FOUNDERS_HALL_ID in s.placements) {
    s.events.opening.stage = 'teaching';
  } else if ((stage === 'teaching' || stage === 'found') && fourthProgramFounded(s)) {
    s.events.opening.stage = 'play';
  }
}

// A program housed beyond the founding three (see foundingData.ts).
function fourthProgramFounded(s: GameState): boolean {
  const housed = Object.values(s.halls).reduce((n, slots) => n + slots.filter((slot) => slot.programId !== null).length, 0);
  return housed > FOUNDING_PROGRAMS.length;
}

// "I know the way": declines the walk (and, from the welcome, the letters),
// and places Founders Hall at the grid centre as a headless founding would.
// Every later card offers it too, so a step the player cannot finish never
// holds the clock for good.
export function skipOpening(s: GameState, declineLetters = true): void {
  const hall = s.tech.find((t) => t.id === FOUNDERS_HALL_ID);
  if (hall && !(hall.id in s.placements)) {
    const placement = centredPlacement(footprintOf(hall));
    s.placements[hall.id] = placement;
    fellTrees(s.trees, placement);
  }
  s.events.opening.stage = 'play';
  if (declineLetters) s.events.opening.skipped = true;
}
