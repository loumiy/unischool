import type { GameState, OpeningStage } from './types';
import { FOUNDERS_HALL_ID, programById, programs } from '../data/techData';
import { canStartDevelopment } from '../systems/techtree/techSystem';
import { financingFor } from '../systems/finance/treasury';
import { housedPrograms, isDiningHall, isDorm, NEEDS_LETTER_ID, sitedAny, walkBuilding, walkProgram } from '../data/openingData';
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
//   await-course  the clock runs and no card shows while the entry course
//              is written (Plan 103B); done when a housed program's entry
//              course is taught, or no program is housed any more.
//   second-course  the Curriculum opens on that program (openingData.ts's
//              walkProgram), its row open and its next course's button
//              ringed; done when any course after a program's first is
//              under way or taught, or when none of its courses can be
//              started.
//   needs      the Students tab opens on the satisfaction breakdown, its
//              Housing and Dining cards ringed (Plan 103C); ends on Next.
//              Reaching it counts the "Somewhere to sleep" letter read: the
//              three steps are that letter.
//   site-housing  the build menu opens on Housing, the next residence hall
//              ringed; done when a residence hall is sited, or none can be.
//   site-dining   the same for a dining hall.
//   play       the clock runs; the first letter is counted read.
//
// Transitions are readings of state, not UI flags: settleOpening runs after
// PLACE_BUILDABLE, HIRE_FACULTY, FOUND_PROGRAM and START_DEVELOPMENT, and at
// the top of each TICK (a course is taught by the tick), and moves on
// through every step already done; advanceOpening answers the welcome's and
// the needs step's Next. A headless founding opens at 'play' with the hall pre-placed.
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
// Founders Hall is unsited: nothing can be taught before it stands. The
// wait for the first course is the one stage that lets the clock run.
export function openingHoldsClock(s: GameState): boolean {
  const stage = s.events.opening.stage;
  return (stage !== 'play' && stage !== 'await-course') || foundersHallUnsited(s);
}

// The welcome's Next; other stages are settled by settleOpening.
export function advanceOpening(s: GameState): void {
  if (s.events.opening.stage === 'welcome') s.events.opening.stage = 'site-hall';
  else if (s.events.opening.stage === 'needs') s.events.opening.stage = 'site-housing';
  settleOpening(s);
}

// Every program's first course: the walk's second course is any other.
let entryIds: Set<string> | null = null;
function laterCourseStarted(s: GameState): boolean {
  entryIds ??= new Set(programs().map((p) => p.entryCourseId));
  return s.tech.some((t) => t.kind === 'course' && (t.status === 'developing' || t.status === 'done') && !entryIds!.has(t.id));
}

// Whether one of the program's open courses can be started now, by
// someone on the payroll with room, the committee and the cash: the step
// never holds the clock on what can't be done.
function nextCourseStartable(s: GameState, programId: string): boolean {
  return (programById(programId)?.courseIds ?? []).some((id) => {
    const t = s.tech.find((x) => x.id === id);
    return t !== undefined && t.status === 'available' && canStartDevelopment(s, t);
  });
}

// Whether the site step's building can be put up now, paid any way the build
// menu would (finance/treasury.ts's financingFor).
function buildingStartable(s: GameState): boolean {
  const t = walkBuilding(s);
  return t !== null && financingFor((f) => canStartDevelopment(s, t, undefined, f)) !== null;
}

// Whether a step's reading holds. A program gone before its course is
// taught ends both course steps, so the walk never waits on a row that
// isn't there; so does a program none of whose courses can be started.
function stepDone(s: GameState, stage: OpeningStage): boolean {
  switch (stage) {
    case 'site-hall': return !foundersHallUnsited(s);
    case 'appoint': return s.faculty.length > 0;
    case 'found': return housedPrograms(s).length > 0;
    case 'await-course': return walkProgram(s) !== null || housedPrograms(s).length === 0;
    case 'second-course': {
      const program = walkProgram(s);
      return program === null || laterCourseStarted(s) || !nextCourseStartable(s, program);
    }
    case 'site-housing': return sitedAny(s, isDorm) || !buildingStartable(s);
    case 'site-dining': return sitedAny(s, isDiningHall) || !buildingStartable(s);
    default: return false;
  }
}

const NEXT_STAGE: Partial<Record<OpeningStage, OpeningStage>> = {
  'site-hall': 'appoint', appoint: 'found', found: 'await-course', 'await-course': 'second-course', 'second-course': 'needs',
  'site-housing': 'site-dining', 'site-dining': 'play',
};

// The steps that end when the thing was done, called after every action
// that could do one. Moves on through every step already done, so a
// professor appointed before the hall stands skips the appointing.
export function settleOpening(s: GameState): void {
  for (let stage = s.events.opening.stage; NEXT_STAGE[stage] !== undefined && stepDone(s, stage); stage = s.events.opening.stage) {
    s.events.opening.stage = NEXT_STAGE[stage]!;
  }
  if (s.events.opening.stage === 'needs' && !s.events.opening.read.includes(NEEDS_LETTER_ID)) s.events.opening.read.push(NEEDS_LETTER_ID);
}

// Skipping: declines the rest of the walk (and, from the welcome, the
// letters). Every card offers it, so a step the player cannot finish never
// holds the clock for good — bar the hall: an unsited Founders Hall stays
// unsited, and the clock waits for it.
export function skipOpening(s: GameState, declineLetters = true): void {
  s.events.opening.stage = 'play';
  if (declineLetters) s.events.opening.skipped = true;
}
