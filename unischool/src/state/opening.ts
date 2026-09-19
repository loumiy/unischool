import type { GameState, OpeningStage } from './types';
import { GENED_BUILDING_ID } from '../data/techData';
import { centredPlacement, footprintOf } from './campusMap';
import { fellTrees } from '../data/treeData';

// ---------------------------------------------------------------------
// THE OPENING WALKTHROUGH: the first three clicks of a new school, forced.
//
// The letters (data/eventData.ts's OPENING_LETTERS) are a script the player
// can ignore: each says one thing to do and the toolbar carries it, but
// nothing stops the clock until they do it. The September review's first
// finding was that a new player did not know how to do the first thing at
// all — where a building comes from, what a course is, who teaches it — and
// a letter that says "develop the core" to somebody who has not found the
// Curriculum is a letter that says nothing. So the first minute is not a
// letter. It is a walk: the clock is HELD, the shell opens the right screen
// at each step, the one control that matters is ringed, and the walk only
// moves on when the thing was actually done.
//
// Five stages, in order, and the stage is STATE (s.events.opening.stage)
// rather than something the shell remembers, so a refresh in the middle
// resumes on the same step and a save from mid-walk loads mid-walk:
//
//   welcome       the board's welcome, with Next — and the one place to
//                 decline the whole walk ("I know the way"), which also
//                 declines the letters, since a player who knows the way
//                 knows it.
//   site-hall     Founders Hall is NOT pre-placed in a guided founding (see
//                 actions.ts's createInitialState): the build menu is opened
//                 for the player, the hall's tile is ringed, and the step is
//                 done when the hall stands on the map. Siting it is free —
//                 the ground came with the charter (see campusMap.ts's
//                 sitingFeeOf).
//   classes       "a college needs classes", with Next, which opens the
//                 Curriculum.
//   first-course  the General Education row is ringed and the step is done
//                 when any course is in development — which is also the
//                 step that teaches hiring, because the course drawer is
//                 where a professor is picked and, when no one in the field
//                 is on the payroll, where one is appointed.
//   play          the walk is over, the clock runs (App.tsx starts it), and
//                 the letters carry on from the second: the first letter's
//                 content is this walk, so a guided founding marks it read
//                 and its ask ("develop the six") becomes the next-step line
//                 the moment the walk ends.
//
// The transitions are READINGS of the same state the build menu and the
// Curriculum read, never a flag the UI sets: settleOpening below runs after
// the two actions that can complete a step (PLACE_BUILDABLE and
// START_DEVELOPMENT), and advanceOpening answers the two Next buttons. A
// headless founding — the tests, the sim, a scenario file — opens at 'play'
// with the hall pre-placed, exactly as it always has; the walk is what a
// HUMAN founding gets (START_GAME's `guided`).
//
// This lives in state/ beside campusMap.ts and not in systems/, on purpose:
// it is a reducer-side helper that reads WHERE the hall stands, and
// systems/ is held to never reading the map (test/invariants.test.ts) so
// that no tick can quietly make the picture load-bearing. The walk is not a
// tick and does not score anything; it asks one yes/no of the map, the
// same question the build menu asks. The copy is data/openingData.ts.
// ---------------------------------------------------------------------

export type { OpeningStage };

// Whether the walk is holding the clock. Read by the reducer's TICK (a
// no-op while true) and by useGame's sampler (which does not even
// accumulate), the same two gates a pending interrupt closes.
export function openingHoldsClock(s: GameState): boolean {
  return s.events.opening.stage !== 'play';
}

// The two Next buttons. Any other stage is unchanged — the ones that end on
// a reading of the campus are settled by settleOpening, never by a click.
export function advanceOpening(s: GameState): void {
  const stage = s.events.opening.stage;
  if (stage === 'welcome') s.events.opening.stage = 'site-hall';
  else if (stage === 'classes') s.events.opening.stage = 'first-course';
}

// The two steps that end when the thing was done. Called after every
// action that could have done it. 'classes' also yields to a course being
// developed: a player who found the Curriculum by its hotkey before
// pressing Next has done the step, and is not made to press Next about it.
export function settleOpening(s: GameState): void {
  const stage = s.events.opening.stage;
  if (stage === 'site-hall' && GENED_BUILDING_ID in s.placements) {
    s.events.opening.stage = 'classes';
  } else if ((stage === 'classes' || stage === 'first-course') && anyCourseDeveloping(s)) {
    s.events.opening.stage = 'play';
  }
}

function anyCourseDeveloping(s: GameState): boolean {
  return s.tech.some((t) => t.kind === 'course' && (t.status === 'developing' || t.status === 'done'));
}

// "I know the way": the walk is declined, and so are the letters. The
// campus is put in the state a headless founding opens in — Founders Hall
// at the centre of the grid, where createInitialState pre-places it — so a
// player who skips is never left with an unsited founding hall to find.
export function skipOpening(s: GameState): void {
  const hall = s.tech.find((t) => t.id === GENED_BUILDING_ID);
  if (hall && !(hall.id in s.placements)) {
    const placement = centredPlacement(footprintOf(hall));
    s.placements[hall.id] = placement;
    fellTrees(s.trees, placement);
  }
  s.events.opening.stage = 'play';
  s.events.opening.skipped = true;
}
