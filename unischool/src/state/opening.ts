import type { GameState, OpeningStage } from './types';
import { FOUNDERS_HALL_ID } from '../data/techData';
import { FOUNDING_PROGRAMS } from '../data/foundingData';
import { centredPlacement, footprintOf } from './campusMap';
import { fellTrees } from '../data/treeData';

// ---------------------------------------------------------------------
// THE OPENING WALKTHROUGH: the first clicks of a new school, forced.
//
// The letters (data/eventData.ts's OPENING_LETTERS) are a script the player
// can ignore: each says one thing to do and the toolbar carries it, but
// nothing stops the clock until they do it. The September review's first
// finding was that a new player did not know how to do the first thing at
// all — where a building comes from, what a program is, who teaches it —
// and a letter that says "found a program" to somebody who has not found
// the hall panel is a letter that says nothing. So the first minute is not
// a letter. It is a walk: the clock is HELD, the shell opens the right
// screen at each step, the one control that matters is ringed, and the
// walk only moves on when the thing was actually done.
//
// Five stages, in order, and the stage is STATE (s.events.opening.stage)
// rather than something the shell remembers, so a refresh in the middle
// resumes on the same step and a save from mid-walk loads mid-walk:
//
//   welcome    the board's welcome, with Next — and the one place to
//              decline the whole walk ("I know the way"), which also
//              declines the letters, since a player who knows the way
//              knows it.
//   site-hall  Founders Hall is NOT pre-placed in a guided founding (see
//              actions.ts's createInitialState): the build menu is opened
//              for the player, the hall's tile is ringed, and the step is
//              done when the hall stands on the map. Siting it is free —
//              the ground came with the charter (see campusMap.ts's
//              awaitsSite).
//   teaching   "the college already teaches" (Plan 19: three programs, six
//              courses, taught by the founding roster), with Next, which
//              opens the Curriculum so the player sees the three rows.
//   found      the verb the rest of the run is built on, taught on the
//              surface that owns it: Founders Hall's panel on the map, a
//              free room, one of the three offers, and who teaches its
//              first course — which is also where hiring is taught, since
//              the panel lists the market when nobody in the field is on
//              the payroll. The card offers the hall's panel as its door,
//              the panel rings the free room, and the step is done when a
//              fourth program is housed.
//   play       the walk is over, the clock runs (App.tsx starts it), and
//              the letters carry on from the second: the first letter's
//              content is this walk — its ask is the fourth program the
//              walk just founded — so a guided founding marks it read.
//
// The transitions are READINGS of the same state the build menu and the
// hall panel read, never a flag the UI sets: settleOpening below runs after
// the two actions that can complete a step (PLACE_BUILDABLE and
// FOUND_PROGRAM), and advanceOpening answers the two Next buttons. A
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
  else if (stage === 'teaching') s.events.opening.stage = 'found';
}

// The two steps that end when the thing was done. Called after every
// action that could have done it. 'teaching' also yields to a program
// being founded: a player who found the hall panel on the map before
// pressing Next has done the step, and is not made to press Next about it.
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

// "I know the way": the walk is declined, and so are the letters. The
// campus is put in the state a headless founding opens in — Founders Hall
// at the centre of the grid, where createInitialState pre-places it — so a
// player who skips is never left with an unsited founding hall to find.
export function skipOpening(s: GameState): void {
  const hall = s.tech.find((t) => t.id === FOUNDERS_HALL_ID);
  if (hall && !(hall.id in s.placements)) {
    const placement = centredPlacement(footprintOf(hall));
    s.placements[hall.id] = placement;
    fellTrees(s.trees, placement);
  }
  s.events.opening.stage = 'play';
  s.events.opening.skipped = true;
}
