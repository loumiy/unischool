import type { GameState, OpeningStage } from './types';
import { FOUNDERS_HALL_ID, programs } from '../data/techData';
import { housedPrograms, NEEDS_LETTER_ID } from '../data/openingData';
import { awaitsSite } from './campusMap';

// The opening walkthrough: the first clicks of a new school, with the clock
// held until each step is actually done. The stage lives in state
// (s.events.opening.stage) so a refresh or a mid-walk save resumes on the
// same step. Since Plan 80D the college opens with nothing to teach, and
// since Plan 107A with its founding faculty on the payroll (Dr. Grace
// Bennett, Dr. Priya Iyer and Dr. John Okafor, foundingData.ts), so the
// walk founds its first program:
//
//   welcome    the chair's opening letter, and the start of the walk (Plan
//              112H). Next, or "Skip the walkthrough" ("and the letters"
//              in a run without chapters, which still has them). Every
//              later card can skip the rest, letters kept. Either skip
//              asks first (Plan 104C, components/OpeningCoach.tsx).
//   site-hall  Founders Hall is not pre-placed in a guided founding; done
//              when the hall stands on the map (siting is free).
//   found      choose any of the three programs on offer and found it into
//              Founders Hall; done when a program is housed. Its entry
//              course goes to the committee. (Plan 104L's separate
//              appointing step went with Plan 107A; a save held on it is
//              carried to this one on load, persistence.ts.)
//   play       the clock runs. The objectives take over (Plan 106 PR C,
//              state/chapters.ts): the next course, somewhere to sleep, a
//              place for every student. The "Somewhere to sleep" letter is
//              counted read, since its chapter says the same; so is the
//              first letter. In a guided run no letter after them is sent
//              either (Plan 112H): each one's chapter says it.
//
// Plans 103B and 103C's steps after the founding (the wait for the first
// course, the next course, the needs, a residence hall, a dining hall) are
// retired: a save on one of them moves on to 'play' when it is next settled.
//
// Transitions are readings of state, not UI flags: settleOpening runs after
// PLACE_BUILDABLE, HIRE_FACULTY, FOUND_PROGRAM and START_DEVELOPMENT, and at
// the top of each TICK, and moves on through every step already done;
// advanceOpening answers the welcome's Next. A headless founding opens at
// 'play' with the hall pre-placed.
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

// The first three steps keep the screen quiet (Plan 104F, from R10–R11):
// the toolbar's tabs are shut and its figures dimmed but readable, all but
// the door the step needs: the build menu to site the hall, the map
// (Founders Hall's panel) to found. Null once the walk is
// done or skipped.
export type QuietDoor = 'build' | 'campus';
export function openingQuietDoor(s: GameState): QuietDoor | null {
  switch (s.events.opening.stage) {
    case 'site-hall': return 'build';
    case 'found': return 'campus';
    default: return null;
  }
}

// The welcome's Next; other stages are settled by settleOpening.
export function advanceOpening(s: GameState): void {
  if (s.events.opening.stage === 'welcome') s.events.opening.stage = 'site-hall';
  settleOpening(s);
}

// Every program's first course: the walk's second course is any other.
let entryIds: Set<string> | null = null;
export function laterCourseStarted(s: GameState): boolean {
  entryIds ??= new Set(programs().map((p) => p.entryCourseId));
  return s.tech.some((t) => t.kind === 'course' && (t.status === 'developing' || t.status === 'done') && !entryIds!.has(t.id));
}

// Whether a step's reading holds.
function stepDone(s: GameState, stage: OpeningStage): boolean {
  switch (stage) {
    case 'site-hall': return !foundersHallUnsited(s);
    case 'found': return housedPrograms(s).length > 0;
    default: return false;
  }
}

const NEXT_STAGE: Partial<Record<OpeningStage, OpeningStage>> = { 'site-hall': 'found', found: 'play' };
const LIVE_STAGES: ReadonlySet<string> = new Set<OpeningStage>(['welcome', 'site-hall', 'found', 'play']);

// The steps that end when the thing was done, called after every action
// that could do one. Moves on through every step already done. A walk
// that ends on its program founded counts the needs letter read: the
// chapter "Somewhere to sleep" asks for the same buildings (Plan 106 PR C).
export function settleOpening(s: GameState): void {
  const o = s.events.opening;
  if (!LIVE_STAGES.has(o.stage)) o.stage = 'play';
  const from = o.stage;
  for (let stage = o.stage; NEXT_STAGE[stage] !== undefined && stepDone(s, stage); stage = o.stage) {
    o.stage = NEXT_STAGE[stage]!;
  }
  if (from !== 'play' && o.stage === 'play' && !o.read.includes(NEEDS_LETTER_ID)) o.read.push(NEEDS_LETTER_ID);
}

// Skipping: declines the rest of the walk (and, from the welcome, the
// letters). Every card offers it, so a step the player cannot finish never
// holds the clock for good — bar the hall: an unsited Founders Hall stays
// unsited, and the clock waits for it.
export function skipOpening(s: GameState, declineLetters = true): void {
  s.events.opening.stage = 'play';
  if (declineLetters) s.events.opening.skipped = true;
}
