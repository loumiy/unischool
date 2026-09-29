import type { GameState, OpeningStage } from './types';
import { FOUNDERS_HALL_ID } from '../data/techData';
import { awaitsSite } from './campusMap';

// The opening walkthrough: the first clicks of a new school, with the clock
// held until each step is actually done. The stage lives in state
// (s.events.opening.stage) so a refresh or a mid-walk save resumes on the
// same step. Since Plan 80D the college opens with nothing to teach — no
// professor, no course — so the walk founds its first program:
//
//   welcome    Next, or "Skip the walkthrough and the letters". Every later
//              card can skip the rest, letters kept.
//   site-hall  Founders Hall is not pre-placed in a guided founding; done
//              when the hall stands on the map (siting is free).
//   appoint    appoint the college's first professor from the founding
//              market (Dr. Grace Bennett, English, foundingData.ts); done
//              when anyone is on the payroll.
//   found      found a program into Founders Hall, English with her; done
//              when a program is housed. Its entry course goes to the
//              committee.
//   play       the clock runs; the first letter is counted read.
//
// Transitions are readings of state, not UI flags: settleOpening runs after
// PLACE_BUILDABLE, HIRE_FACULTY and FOUND_PROGRAM, and moves on through
// every step already done; advanceOpening answers the welcome's Next.
// A headless founding opens at 'play' with the hall pre-placed.
//
// Skipping never sites the hall (Plan 80D): a college with Founders Hall
// unsited holds the clock whatever the stage (openingHoldsClock), and the
// next-step line says to site it (nextStep.ts).
// This lives in state/ because it reads the map, which systems/ may not
// (test/invariants.test.ts). The copy is in data/openingData.ts.

export type { OpeningStage };

// Founders Hall built and waiting for its ground: a guided founding's, until
// the player sites it.
export function foundersHallUnsited(s: GameState): boolean {
  const hall = s.tech.find((t) => t.id === FOUNDERS_HALL_ID);
  return hall !== undefined && awaitsSite(s, hall);
}

// Whether the walk holds the clock: gates the reducer's TICK and useGame's
// sampler, like a pending interrupt. A skipped walk still holds it while
// Founders Hall is unsited: nothing can be taught before it stands.
export function openingHoldsClock(s: GameState): boolean {
  return s.events.opening.stage !== 'play' || foundersHallUnsited(s);
}

// The welcome's Next; other stages are settled by settleOpening.
export function advanceOpening(s: GameState): void {
  if (s.events.opening.stage === 'welcome') s.events.opening.stage = 'site-hall';
  settleOpening(s);
}

// Whether a step's reading holds.
function stepDone(s: GameState, stage: OpeningStage): boolean {
  switch (stage) {
    case 'site-hall': return !foundersHallUnsited(s);
    case 'appoint': return s.faculty.length > 0;
    case 'found': return Object.values(s.halls).some((slots) => slots.some((slot) => slot.programId !== null));
    default: return false;
  }
}

const NEXT_STAGE: Partial<Record<OpeningStage, OpeningStage>> = { 'site-hall': 'appoint', appoint: 'found', found: 'play' };

// The steps that end when the thing was done, called after every action
// that could do one. Moves on through every step already done, so a
// professor appointed before the hall stands skips the appointing.
export function settleOpening(s: GameState): void {
  for (let stage = s.events.opening.stage; NEXT_STAGE[stage] !== undefined && stepDone(s, stage); stage = s.events.opening.stage) {
    s.events.opening.stage = NEXT_STAGE[stage]!;
  }
}

// Skipping: declines the rest of the walk (and, from the welcome, the
// letters). Every card offers it, so a step the player cannot finish never
// holds the clock for good — bar the hall: an unsited Founders Hall stays
// unsited, and the clock waits for it.
export function skipOpening(s: GameState, declineLetters = true): void {
  s.events.opening.stage = 'play';
  if (declineLetters) s.events.opening.skipped = true;
}
