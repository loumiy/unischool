// ---------------------------------------------------------------------
// The offer queue (Plan 14's PR B — see systems/techtree/programOffers.ts).
// Two promises worth pinning, each across several schools (the draw is
// seeded from the school's name and the week, not from Math.random —
// see the module's note on why):
//
//   1. Founding all forty-two majors in sequence, taking whatever is
//      offered, the offer is always three until fewer than three remain,
//      never repeats a founded program, never offers a gated one, and
//      completes one school at a time (Plan 68): while a started school
//      has majors left, every offer is from a school under way; once none
//      has, an unstarted school is represented.
//   2. A player who only ever takes the same school's offers still sees
//      every school eventually: the weighting toward started schools
//      never starves discovery.
//   3. New majors come at a pace (Plan 68): the offer never holds more than
//      the college may yet found, and one more opens every
//      WEEKS_PER_NEW_MAJOR.
//
// Founding is simulated by writing a program into a hall slot directly and
// asking for a refill — PR C's FOUND_PROGRAM is this plus the entry course
// and its instructor, and it is the draw under test here, not the action.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { graduatePrograms, majorPrefixes, programById, programs, schoolCurriculumIds } from '../src/data/techData';
import { FOUNDING_PROGRAMS } from '../src/data/foundingData';
import { FOUNDING_OFFER_GUARANTEE } from '../src/state/actions';
import {
  hostOffers, isHoused, majorAllowance, majorsHoused, majorsOpen, offerablePrograms, OPENING_MAJORS, PROGRAM_OFFER_COUNT,
  refillOffers, startedSchools, WEEKS_PER_NEW_MAJOR,
} from '../src/systems/techtree/programOffers';
import type { GameState } from '../src/state/types';
import { bindScriptStream, drawsSoFar } from '../src/engine/random';

function seedRandom(n: number): void {
  bindScriptStream(n);
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

// A school as founded (Plan 19): three programs housed in Founders Hall,
// every other major revealed, the first three programs on offer — drawn
// by createInitialState itself, with the founding guarantee.
function foundedState(name = 'Offers'): GameState {
  const s = createInitialState(name);
  s.finance.cash = 500_000_000;
  return s;
}
const UNHOUSED_MAJOR_COUNT = MAJOR_COUNT - FOUNDING_PROGRAMS.length;

// A college old enough that the pace of new majors (Plan 68) no longer
// binds, for the tests of the draw itself.
function unpaced(s: GameState): GameState {
  s.clock.year = 80;
  refillOffers(s);
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

// ---- 0. The founding draw: three on offer, one of them staffable ----
for (const rngSeed of ['Ashgrove', 'Blackmoor', 'Calderwood', 'Dunmore', 'Eastwick', 'Fairhaven', 'Greymoor', 'Hollowell']) {
  const s = foundedState(rngSeed);
  assert(s.programOffers.length === PROGRAM_OFFER_COUNT, `seed ${rngSeed}: three on offer at founding`);
  assert(s.programOffers.some((id) => FOUNDING_OFFER_GUARANTEE.includes(id)), `seed ${rngSeed}: one of them is guaranteed staffable (${s.programOffers.join(', ')})`);
  assert(s.programOffers.every((id) => !FOUNDING_PROGRAMS.includes(id)), `seed ${rngSeed}: none of them is a founding program`);
  // Plan 68: the founding programs' schools are under way, so the first
  // offer finishes them before it discovers another.
  assert(s.programOffers.every((id) => startedSchools(s).has(schoolOf(id))), `seed ${rngSeed}: and all are from the schools the founding started`);
  // The guarantee is spent with the founding draw: a refill after it is an
  // ordinary draw, so taking the guaranteed program does not summon the
  // other one.
  const guaranteed = s.programOffers.find((id) => FOUNDING_OFFER_GUARANTEE.includes(id))!;
  const other = FOUNDING_OFFER_GUARANTEE.find((id) => id !== guaranteed)!;
  if (!s.programOffers.includes(other)) {
    let summoned = 0;
    for (let week = 1; week <= 20; week += 1) {
      const t = JSON.parse(JSON.stringify(s)) as GameState;
      t.clock.week = week;
      take(t, guaranteed);
      if (t.programOffers.includes(other)) summoned += 1;
    }
    assert(summoned < 20, `seed ${rngSeed}: the replacement draw is not rigged (${summoned} of 20 weeks drew ${other})`);
  }
}

// ---- 1. Found everything, taking the first offer each time ----
for (const rngSeed of ['Ashgrove', 'Blackmoor', 'Calderwood']) {
  const s = unpaced(foundedState(rngSeed));
  assert(s.programOffers.length === PROGRAM_OFFER_COUNT, `seed ${rngSeed}: three on offer at founding`);
  assert(s.programOffers.every((id) => programById(id)?.kind === 'major'), `seed ${rngSeed}: the first offer is all majors`);

  const founded: string[] = [];
  let unstartedRuleHeld = true;
  let neverRepeated = true;
  let neverGated = true;
  let alwaysFull = true;

  while (s.programOffers.length > 0) {

    const remaining = offerablePrograms(s).length;
    if (remaining >= PROGRAM_OFFER_COUNT && s.programOffers.length !== PROGRAM_OFFER_COUNT) alwaysFull = false;
    if (remaining < PROGRAM_OFFER_COUNT && s.programOffers.length !== remaining) alwaysFull = false;

    for (const id of s.programOffers) {
      if (founded.includes(id) || isHoused(s, id)) neverRepeated = false;
      const program = programById(id);
      if (!program) neverGated = false;
      if (program?.kind === 'graduate') neverGated = false; // no gate is open this early
    }

    const id = s.programOffers[0];
    const before = [...s.programOffers];
    take(s, id);
    founded.push(id);

    // One school at a time, then discovery, checked on what the refill drew
    // (the draw houses nothing, so the schools under way are read after
    // it): while a started school has majors left, the new draw is from
    // such a school; once none has, one of the three is from an unstarted
    // school.
    const drawn = s.programOffers.filter((x) => !before.includes(x));
    const kept = before.filter((x) => x !== id);
    const started = startedSchools(s);
    // What the draw could have picked from a school under way: its majors
    // not already on the table.
    const underWayLeft = offerablePrograms(s).filter((p) => started.has(p.school) && !kept.includes(p.id));
    const underWay = new Set(underWayLeft.map((p) => p.school));
    const unstartedRemains = offerablePrograms(s).some((p) => !started.has(p.school));
    if (underWay.size > 0 && drawn.length > 0 && !underWay.has(schoolOf(drawn[0]))) unstartedRuleHeld = false;
    if (underWayLeft.length === 0 && unstartedRemains && !s.programOffers.some((x) => !started.has(schoolOf(x)))) unstartedRuleHeld = false;
  }

  assert(founded.length === UNHOUSED_MAJOR_COUNT, `seed ${rngSeed}: every major not housed at founding is eventually offered and founded (${founded.length} of ${UNHOUSED_MAJOR_COUNT})`);
  assert(new Set(founded).size === founded.length, `seed ${rngSeed}: no program was founded twice`);
  assert(alwaysFull, `seed ${rngSeed}: the offer is always three until fewer than three remain`);
  assert(neverRepeated, `seed ${rngSeed}: a founded program is never offered again`);
  assert(neverGated, `seed ${rngSeed}: a gated program is never offered`);
  assert(unstartedRuleHeld, `seed ${rngSeed}: schools are completed one at a time, and an unstarted one is offered whenever none is under way`);
  assert(s.programOffers.length === 0, `seed ${rngSeed}: nothing is left to offer once every major is housed`);
  assert(offerablePrograms(s).length === 0, `seed ${rngSeed}: and nothing is offerable`);
}

// ---- 2. Taking only one school's offers still shows every school ----
{
  const s = unpaced(foundedState('Dunmore'));
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

// ---- 2b. New majors come at a pace (Plan 68) ----
{
  const s = foundedState('Ashgrove');
  assert(majorAllowance(s) === FOUNDING_PROGRAMS.length + OPENING_MAJORS, `a new college may house its founding programs and ${OPENING_MAJORS} more`);
  // House majors until the allowance is spent.
  while (majorsOpen(s) > 0 && s.programOffers.length > 0) take(s, s.programOffers[0]);
  assert(majorsHoused(s) === majorAllowance(s), `the allowance is spent (${majorsHoused(s)} of ${majorAllowance(s)})`);
  assert(s.programOffers.length === 0, 'and then nothing is on offer');
  const weeks = WEEKS_PER_NEW_MAJOR;
  s.clock.week += weeks % 52;
  s.clock.year += Math.floor(weeks / 52);
  if (s.clock.week > 52) { s.clock.week -= 52; s.clock.year += 1; }
  refillOffers(s);
  assert(majorsOpen(s) === 1 && s.programOffers.length === 1, `${weeks} weeks later, one more is (${s.programOffers.length} on offer)`);
}

// ---- 3. The weighting is real: a started school is offered more ----
{
  // Same starting state, many refills: with one school started, its
  // programs should turn up more often than a flat draw would give.
  const base = unpaced(foundedState('Eastwick'));
  // A school not yet started, so the count below is the weighting alone.
  // Since Plan 52 three schools are started at founding, so the offer is set
  // by hand: the program to take, and beside it a program of another
  // unstarted school, which keeps the discovery rule satisfied so the
  // replacement is a free weighted draw.
  const unstarted = programs().filter((p) => p.kind === 'major' && !startedSchools(base).has(p.school));
  const homeId = unstarted[0].id;
  const home = schoolOf(homeId);
  const other = unstarted.find((p) => p.school !== home)!.id;
  base.programOffers = [other, homeId, programs().find((p) => p.kind === 'major' && startedSchools(base).has(p.school) && !isHoused(base, p.id))!.id];
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
  // Flat odds: 5 of the 36 unoffered programs remaining are `home`'s. With
  // the discovery rule satisfied by the standing offers, the replacement is
  // a free weighted draw, `home`'s five at triple weight among the rest.
  const share = homeOffers / trials;
  assert(share > 0.2, `a started school's programs are drawn more often than flat odds (${(share * 100).toFixed(0)}% of replacements, flat would be ~13%)`);
  assert(share < 0.5, `but not so often that discovery is crowded out (${(share * 100).toFixed(0)}%)`);
}

// ---- 4. Idempotent, deterministic, and off the global dice entirely ----
{
  const s = foundedState('Fairhaven');
  const before = [...s.programOffers];
  refillOffers(s);
  refillOffers(s);
  assert(JSON.stringify(s.programOffers) === JSON.stringify(before), 'a full offer is left exactly as it is');

  // The draw never touches the game's stream: a run's dice must not move
  // by one because a program was offered. Counted on a refill that really
  // draws — one offer removed, so one is drawn back.
  const drawsBefore = drawsSoFar();
  s.programOffers = s.programOffers.slice(1);
  refillOffers(s);
  const draws = drawsSoFar() - drawsBefore;
  assert(s.programOffers.length === PROGRAM_OFFER_COUNT, 'a short offer is topped back up');
  assert(draws === 0, `and drawing consumed no global dice (${draws})`);
  const again = foundedState('Fairhaven');
  assert(JSON.stringify(again.programOffers) === JSON.stringify(before), 'and the same school at the same week draws the same three');
  assert(JSON.stringify(foundedState('Greymoor').programOffers) !== JSON.stringify(before), 'while a different school draws differently');

  // An offer that has become unofferable (housed by some other path) is
  // dropped and replaced.
  const housedId = s.programOffers[1];
  s.halls['FIXTURE-1'] = [{ programId: housedId }, ...Array.from({ length: 5 }, () => ({ programId: null }))];
  refillOffers(s);
  assert(!s.programOffers.includes(housedId), 'an offer whose program was housed elsewhere is dropped');
  assert(s.programOffers.length === PROGRAM_OFFER_COUNT, 'and replaced');
}

// ---- 5. Graduate programs are never drawn; their host offers them (Plan 51) ----
{
  const s = foundedState('Hollowell');
  const done = (id: string) => { const t = s.tech.find((x) => x.id === id); if (t) t.status = 'done'; };
  const doctorate = graduatePrograms().find((p) => p.id === 'PHDE')!;
  assert(hostOffers(s, 'PROJ-GRADUATE').length === 0, 'nothing is earned at founding');
  for (const id of schoolCurriculumIds(doctorate.homeSchool)) done(id);
  assert(!hostOffers(s, 'PROJ-GRADUATE').some((p) => p.id === doctorate.id), 'the curriculum alone is not enough');
  done('PROJ-GRADUATE');
  assert(hostOffers(s, 'PROJ-GRADUATE').some((p) => p.id === doctorate.id), `${doctorate.name} is offered once Engineering is taught and the Graduate College stands`);
  assert(!hostOffers(s, 'PROJ-GRADUATE').some((p) => p.id === 'PHDS'), 'and only it: Science is not');
  assert(offerablePrograms(s).every((p) => p.kind === 'major'), 'a graduate program is never in the drawn offers');
}

console.log('program offer tests');
if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
