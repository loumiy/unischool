// ---------------------------------------------------------------------
// The offer queue (Plan 14's PR B — see systems/techtree/programOffers.ts).
// Two promises worth pinning, each across several schools (the draw is
// seeded from the school's name and the week, not from Math.random —
// see the module's note on why):
//
//   1. Founding all forty-two majors in sequence, taking whatever is
//      offered, the offer is always three until fewer than three remain,
//      never repeats a founded program, never offers a gated one, and —
//      while a school the player has not started still has programs to
//      offer — always includes one from such a school.
//   2. A player who only ever takes the same school's offers still sees
//      every school eventually: the weighting toward started schools
//      never starves discovery.
//
// Founding is simulated by writing a program into a hall slot directly and
// asking for a refill — PR C's FOUND_PROGRAM is this plus the entry course
// and its instructor, and it is the draw under test here, not the action.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { graduatePrograms, majorPrefixes, programById, programs } from '../src/data/techData';
import {
  isHoused, offerablePrograms, PROGRAM_OFFER_COUNT, refillOffers, startedSchools,
} from '../src/systems/techtree/programOffers';
import type { GameState } from '../src/state/types';

let seed = 1;
function seedRandom(n: number): void {
  seed = n;
  Math.random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
}
seedRandom(12345);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
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

const MAJOR_COUNT = majorPrefixes().length;

// A school with the gen-ed core just finished: every tier-1 course
// revealed, the first three programs on offer. Driven through the real
// reducer so the refill fires where it fires in play.
function coreComplete(name = 'Offers'): GameState {
  let s = createInitialState(name);
  s.finance.cash = 500_000_000;
  for (const id of ['GE110', 'GE120', 'GE130', 'GE140', 'GE150', 'GE160']) {
    s = reducer(s, { type: 'START_DEVELOPMENT', nodeId: id });
  }
  for (let i = 0; i < 12 && s.programOffers.length === 0; i += 1) {
    s = s.pendingInterrupt ? reducer(s, { type: 'RESOLVE_REPORT' }) : reducer(s, { type: 'TICK' });
  }
  return s;
}

// House a program somewhere — a fresh six-slot hall per six programs — and
// draw its replacement. The halls here are fixtures, not built ones; what
// is under test is the draw, and hallOf/isHoused read only s.halls.
function take(s: GameState, programId: string): void {
  assert(s.programOffers.includes(programId), `${programId} was on offer when taken`);
  const hallIds = Object.keys(s.halls).filter((id) => id.startsWith('FIXTURE-'));
  let hall = hallIds.map((id) => s.halls[id]).find((slots) => slots.some((slot) => slot.programId === null));
  if (!hall) {
    hall = Array.from({ length: 6 }, () => ({ programId: null }));
    s.halls[`FIXTURE-${hallIds.length + 1}`] = hall;
  }
  hall.find((slot) => slot.programId === null)!.programId = programId;
  s.programOffers = s.programOffers.filter((id) => id !== programId);
  refillOffers(s);
}

function schoolOf(programId: string): string {
  return programById(programId)!.school;
}

// ---- 1. Found everything, taking the first offer each time ----
for (const rngSeed of ['Ashgrove', 'Blackmoor', 'Calderwood']) {
  const s = coreComplete(rngSeed);
  assert(s.programOffers.length === PROGRAM_OFFER_COUNT, `seed ${rngSeed}: three on offer once the core completes`);
  assert(s.programOffers.every((id) => programById(id)?.kind === 'major'), `seed ${rngSeed}: the first offer is all majors`);

  const founded: string[] = [];
  let unstartedRuleHeld = true;
  let neverRepeated = true;
  let neverGated = true;
  let alwaysFull = true;

  while (s.programOffers.length > 0) {
    // The discovery rule, checked BEFORE taking: while some unstarted
    // school still has an offerable program, one of the three is from
    // such a school.
    const started = startedSchools(s);
    const unstartedRemains = offerablePrograms(s).some((p) => !started.has(p.school));
    if (unstartedRemains && !s.programOffers.some((id) => !started.has(schoolOf(id)))) unstartedRuleHeld = false;

    const remaining = offerablePrograms(s).length;
    if (remaining >= PROGRAM_OFFER_COUNT && s.programOffers.length !== PROGRAM_OFFER_COUNT) alwaysFull = false;
    if (remaining < PROGRAM_OFFER_COUNT && s.programOffers.length !== remaining) alwaysFull = false;

    for (const id of s.programOffers) {
      if (founded.includes(id) || isHoused(s, id)) neverRepeated = false;
      const program = programById(id);
      if (!program || program.kind === 'core') neverGated = false;
      if (program?.kind === 'graduate') neverGated = false; // no gate is open this early
    }

    const id = s.programOffers[0];
    take(s, id);
    founded.push(id);
  }

  assert(founded.length === MAJOR_COUNT, `seed ${rngSeed}: every major is eventually offered and founded (${founded.length} of ${MAJOR_COUNT})`);
  assert(new Set(founded).size === founded.length, `seed ${rngSeed}: no program was founded twice`);
  assert(alwaysFull, `seed ${rngSeed}: the offer is always three until fewer than three remain`);
  assert(neverRepeated, `seed ${rngSeed}: a founded program is never offered again`);
  assert(neverGated, `seed ${rngSeed}: a gated program is never offered`);
  assert(unstartedRuleHeld, `seed ${rngSeed}: an unstarted school is always represented while one remains`);
  assert(s.programOffers.length === 0, `seed ${rngSeed}: nothing is left to offer once every major is housed`);
  assert(offerablePrograms(s).length === 0, `seed ${rngSeed}: and nothing is offerable`);
}

// ---- 2. Taking only one school's offers still shows every school ----
{
  const s = coreComplete('Dunmore');
  const home = schoolOf(s.programOffers[0]);
  const seen = new Set<string>();
  let takes = 0;
  // Take from `home` whenever it is offered; otherwise take the first offer
  // (some school has to be taken for the game to move). Count how many
  // distinct schools appear on the table over the run.
  while (s.programOffers.length > 0 && takes < MAJOR_COUNT) {
    for (const id of s.programOffers) seen.add(schoolOf(id));
    const preferred = s.programOffers.find((id) => schoolOf(id) === home) ?? s.programOffers[0];
    take(s, preferred);
    takes += 1;
  }
  const schools = new Set(programs().filter((p) => p.kind === 'major').map((p) => p.school));
  assert(seen.size === schools.size, `a player who only takes ${home} still sees every school on the table (${seen.size} of ${schools.size})`);
}

// ---- 3. The weighting is real: a started school is offered more ----
{
  // Same starting state, many refills: with one school started, its
  // programs should turn up more often than a flat draw would give.
  const base = coreComplete('Eastwick');
  const homeId = base.programOffers[0];
  const home = schoolOf(homeId);
  let homeOffers = 0;
  let trials = 0;
  for (let t = 0; t < 300; t += 1) {
    const s = JSON.parse(JSON.stringify(base)) as GameState;
    // The seed reads the week, so each trial is the same take a week later.
    s.clock.week = 1 + (t % 52);
    s.clock.year = 2 + Math.floor(t / 52);
    take(s, homeId);
    // Everything in the two other offered slots was drawn before `home`
    // was started; only the replacement was drawn after. Count it.
    const replacement = s.programOffers[s.programOffers.length - 1];
    if (schoolOf(replacement) === home) homeOffers += 1;
    trials += 1;
  }
  // Flat odds: 5 of the 39 unoffered programs remaining are `home`'s. With
  // the discovery rule satisfied by the two standing offers, the
  // replacement is a free weighted draw: 5x3 against 34x1, i.e. ~30%.
  const share = homeOffers / trials;
  assert(share > 0.2, `a started school's programs are drawn more often than flat odds (${(share * 100).toFixed(0)}% of replacements, flat would be ~13%)`);
  assert(share < 0.5, `but not so often that discovery is crowded out (${(share * 100).toFixed(0)}%)`);
}

// ---- 4. Idempotent, deterministic, and off the global dice entirely ----
{
  const s = coreComplete('Fairhaven');
  const before = [...s.programOffers];
  refillOffers(s);
  refillOffers(s);
  assert(JSON.stringify(s.programOffers) === JSON.stringify(before), 'a full offer is left exactly as it is');

  // The draw never touches Math.random: the balance sim's seeded stream
  // must not move by one because a program was offered. Counted on a
  // refill that really draws — one offer removed, so one is drawn back.
  let draws = 0;
  const real = Math.random;
  Math.random = () => { draws += 1; return real(); };
  s.programOffers = s.programOffers.slice(1);
  refillOffers(s);
  Math.random = real;
  assert(s.programOffers.length === PROGRAM_OFFER_COUNT, 'a short offer is topped back up');
  assert(draws === 0, `and drawing consumed no global dice (${draws})`);
  const again = coreComplete('Fairhaven');
  assert(JSON.stringify(again.programOffers) === JSON.stringify(before), 'and the same school at the same week draws the same three');
  assert(JSON.stringify(coreComplete('Greymoor').programOffers) !== JSON.stringify(before), 'while a different school draws differently');

  // An offer that has become unofferable (housed by some other path) is
  // dropped and replaced.
  const housedId = s.programOffers[1];
  s.halls['FIXTURE-1'] = [{ programId: housedId }, ...Array.from({ length: 5 }, () => ({ programId: null }))];
  refillOffers(s);
  assert(!s.programOffers.includes(housedId), 'an offer whose program was housed elsewhere is dropped');
  assert(s.programOffers.length === PROGRAM_OFFER_COUNT, 'and replaced');
}

// ---- 5. Graduate programs join the pool when their gate opens ----
{
  const s = coreComplete('Hollowell');
  assert(offerablePrograms(s).every((p) => p.kind === 'major'), 'no graduate program is offerable before its gate opens');
  // Open every doctorate's gate the way the game does — a finished lab in
  // its school — by marking the milestones and labs directly.
  const doctorate = graduatePrograms().find((p) => p.type === 'doctoral')!;
  for (const t of s.tech) {
    if (t.kind === 'facility' && t.facilityType === 'lab') t.status = 'done';
  }
  const opened = offerablePrograms(s).filter((p) => p.kind === 'graduate');
  assert(opened.some((p) => p.id === doctorate.id), `${doctorate.name} becomes offerable once its gate reads true`);
}

console.log('program offer tests');
if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
