// "+80 places" (Plan 124J): the Curriculum's next Develop says what a course
// adds while class places are short (instructionCapacity.ts's
// classPlacesShort), and only then; and only on a program a hall houses,
// since a course seats nobody until its program is housed.

import { teachingCollege } from './fixtures/teaching';
import { classPlacesShort, instructionCapacity, intakeCeiling, SEATS_PER_COURSE } from '../src/systems/techtree/instructionCapacity';
import { PLACES_CHIP, showsPlaces } from '../src/tabs/CurriculumTab';
import { FOUNDING_PROGRAMS } from '../src/data/foundingData';
import { createInitialState } from '../src/state/actions';
import { totalEnrolled } from '../src/state/types';
import type { FunnelRecord, GameState } from '../src/state/types';
import { bindScriptStream } from '../src/engine/random';

bindScriptStream(124);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('places chip tests');

// A teaching college whose classes fit their places, with no summer yet.
function roomy(): GameState {
  const s = teachingCollege('Places');
  const seats = instructionCapacity(s);
  s.students.classes = { freshman: Math.floor(seats / 2), sophomore: 0, junior: 0, senior: 0 };
  s.students.lastFunnel = null;
  return s;
}
const funnel = (applicants: number): FunnelRecord => ({
  year: 1, applicants,
  factors: { prestigePool: applicants, priceFactor: 1, capacityFactor: 1, wordOfMouth: 1, cohortDemand: 1, stickerShock: 1 },
  cohorts: {} as FunnelRecord['cohorts'],
});

assert(PLACES_CHIP === `+${SEATS_PER_COURSE} places`, `the chip reads the seats a course adds (${PLACES_CHIP})`);

{
  const s = createInitialState('Opening');
  assert(instructionCapacity(s) === 0 && totalEnrolled(s.students) > 0, 'a college opens with students and no course');
  assert(classPlacesShort(s), 'so its places are short from the start');
}

{
  const s = roomy();
  assert(!classPlacesShort(s), 'a body that fits its places, before any summer, is not short');
  assert(!showsPlaces(s, FOUNDING_PROGRAMS[0]), 'and the chip stays away');

  const room = Math.max(0, intakeCeiling(s).nextSummer - intakeCeiling(s).stayingOn);
  s.students.lastFunnel = funnel(Math.max(0, room - 10));
  assert(!classPlacesShort(s), 'a pool the room can take is not short');
  s.students.lastFunnel = funnel(room + 10);
  assert(classPlacesShort(s), 'more applicants than next summer\'s room is short');
  assert(showsPlaces(s, FOUNDING_PROGRAMS[0]), 'and a housed program\'s next Develop shows the chip');
}

{
  const s = roomy();
  const seats = instructionCapacity(s);
  s.students.classes = { freshman: seats + 1, sophomore: 0, junior: 0, senior: 0 };
  assert(classPlacesShort(s), 'more students than places is short');
  assert(!showsPlaces(s, 'NOT-A-PROGRAM'), 'but a program no hall houses shows no chip: its course would seat nobody');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
