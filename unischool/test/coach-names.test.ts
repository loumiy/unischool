// ---------------------------------------------------------------------
// The names (Plan 21's PR A — see docs/plans/21-the-department.md, Finding
// 9). Half of all coaches used to be drawn from 98 possible names, with no
// dedupe, on a market that churns ~78 candidates a year. What is worth
// pinning:
//
//   - every pool is deep, and a name is never on both sides of one (a
//     "Liang Liang" cannot be drawn), nor in both genders of one;
//   - a coach's name is kept clear of every name the department is using,
//     and the market never lists two people with one name;
//   - the dedupe takes NO extra dice: the same seed rolls the same number
//     of draws whether or not the first pair was taken, so a
//     name clash can change a name but never a balance trajectory;
//   - coaches are drawn more Anglo/American than faculty, by an override at
//     the coach call site, with faculty's own weighting untouched;
//   - a men's-sport listing is nearly always a man, and the mirror.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { NAME_POOLS, generateCandidate, rollCoachName } from '../src/data/facultyData';
import {
  TRAINER_FIELD, coachNamesInUse, generateCoachCandidate, rollAthleticDirectorCandidates,
} from '../src/data/studentLifeData';
import { createInitialState } from '../src/state/actions';
import { tickAthletics } from '../src/systems/athletics/athleticsSystem';
import { bindScriptStream, drawsSoFar } from '../src/engine/random';

const INITIAL_SEED = 20260920;
let drawBase = 0;
function reseed(): void { bindScriptStream(INITIAL_SEED); drawBase = drawsSoFar(); }
reseed();

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) { failures += 1; console.error(`  ✗ ${msg}`); }
}

function distinct(list: readonly string[]): boolean {
  return new Set(list).size === list.length;
}

// ---- The pools are deep, and a name sits on one side of one ----
function testPoolShape(): void {
  assert(NAME_POOLS.length === 10, `ten pools (got ${NAME_POOLS.length})`);
  for (const pool of NAME_POOLS) {
    const anglo = pool.origin === 'Anglo/Western European';
    const minFirst = anglo ? 80 : 25;
    const minLast = anglo ? 100 : 25;
    assert(pool.firstMale.length >= minFirst, `${pool.origin}: at least ${minFirst} male first names (got ${pool.firstMale.length})`);
    assert(pool.firstFemale.length >= minFirst, `${pool.origin}: at least ${minFirst} female first names (got ${pool.firstFemale.length})`);
    assert(pool.last.length >= minLast, `${pool.origin}: at least ${minLast} surnames (got ${pool.last.length})`);
    assert(distinct(pool.firstMale) && distinct(pool.firstFemale) && distinct(pool.last), `${pool.origin}: no list repeats a name`);
    const last = new Set(pool.last);
    const male = new Set(pool.firstMale);
    assert(!pool.firstMale.some((n) => last.has(n)) && !pool.firstFemale.some((n) => last.has(n)),
      `${pool.origin}: no name is both a first name and a surname`);
    assert(!pool.firstFemale.some((n) => male.has(n)), `${pool.origin}: no first name is in both gender lists`);
  }
}

// ---- The dedupe holds, and costs no dice ----
function testDedupeWithoutExtraDice(): void {
  const ROLLS = 3_000;

  // First pass: an empty set, so nothing is ever taken.
  reseed();
  const free: string[] = [];
  for (let i = 0; i < ROLLS; i++) free.push(rollCoachName(i % 2 ? 'male' : 'female', new Set()).name);
  const freeDraws = (drawsSoFar() - drawBase);

  // Second pass, same dice: every name the first pass produced is taken, so
  // the very first pair of every roll collides and the dedupe has to step.
  reseed();
  const taken = new Set(free);
  const stepped: string[] = [];
  for (let i = 0; i < ROLLS; i++) {
    const name = rollCoachName(i % 2 ? 'male' : 'female', taken).name;
    stepped.push(name);
    taken.add(name);
  }
  assert((drawsSoFar() - drawBase) === freeDraws, `a collision costs no extra Math.random (drawsSoFar() - drawBase) (${(drawsSoFar() - drawBase)} against ${freeDraws} for ${ROLLS} rolls)`);
  assert(stepped.every((n) => !free.includes(n)), 'and every stepped name is clear of the set it was checked against');
  assert(distinct(stepped), 'and clear of the others rolled after it');

  // A set that grows as names are minted never repeats one: the market's
  // own shape, at a size far past what a department ever carries.
  reseed();
  const used = new Set<string>();
  for (let i = 0; i < ROLLS; i++) used.add(rollCoachName('male', used).name);
  assert(used.size === ROLLS, `${ROLLS} names minted against a growing set are ${ROLLS} distinct names (got ${used.size})`);

  // Faculty share the discipline: generateCandidate's re-roll loop used to
  // cost extra draws on a clash, which meant the SIZE of a pool moved the
  // seeded stream. Same dice with every first pair taken, same draw count.
  const FACULTY = 400;
  reseed();
  const facultyFree: string[] = [];
  for (let i = 0; i < FACULTY; i++) facultyFree.push(generateCandidate('History').name);
  const facultyFreeDraws = (drawsSoFar() - drawBase);
  reseed();
  const facultyStepped: string[] = [];
  for (let i = 0; i < FACULTY; i++) facultyStepped.push(generateCandidate('History', facultyFree).name);
  assert((drawsSoFar() - drawBase) === facultyFreeDraws, `a faculty name clash costs no extra (drawsSoFar() - drawBase) either (${(drawsSoFar() - drawBase)} against ${facultyFreeDraws})`);
  assert(facultyStepped.every((n) => !facultyFree.includes(n)), 'and every faculty name is clear of the set it was checked against');
}

// ---- The market, the director and the shortage hire share one set ----
function testDepartmentNames(): void {
  reseed();
  const s = createInitialState('Names Test');
  const pool = s.orgs.coachCandidates.map((c) => c.name);
  assert(distinct(pool), 'the founding market lists no name twice');

  for (let week = 0; week < 5 * 52; week++) tickAthletics(s);
  const churned = s.orgs.coachCandidates.map((c) => c.name);
  assert(distinct(churned), 'five years of churn never list a name twice at once');

  // Hire off the market into a chair, then everyone else must steer clear.
  s.orgs.athleticDirector = rollAthleticDirectorCandidates(coachNamesInUse(s))[2];
  const inUse = coachNamesInUse(s);
  assert(inUse.has(s.orgs.athleticDirector.name), 'the director counts as a name in use');
  assert(!s.orgs.coachCandidates.some((c) => c.name === s.orgs.athleticDirector!.name),
    'and was named clear of the market');

  const three = rollAthleticDirectorCandidates(inUse);
  assert(distinct(three.map((c) => c.name)), 'the three director cards carry three names');
  assert(three.every((c) => !inUse.has(c.name)), 'none of them already in the department');

  const hire = generateCoachCandidate('football', inUse);
  assert(!inUse.has(hire.name), "the director's shortage hire is named clear of the department too");
  assert(generateCoachCandidate('football').name.length > 0, 'and a caller with no state (a test fixture) still gets a name');
}

// ---- Coaches lean Anglo/American; faculty do not move ----
function testCoachWeighting(): void {
  const ROLLS = 8_000;
  reseed();
  let coachAnglo = 0;
  for (let i = 0; i < ROLLS; i++) {
    if (rollCoachName('male', new Set()).origin === 'Anglo/Western European') coachAnglo += 1;
  }
  const coachShare = coachAnglo / ROLLS;
  assert(coachShare > 0.66 && coachShare < 0.74, `a coach is Anglo/Western European about 70% of the time (got ${(coachShare * 100).toFixed(1)}%)`);

  reseed();
  let facultyAnglo = 0;
  for (let i = 0; i < ROLLS; i++) {
    if (generateCandidate('History').heritage === 'Anglo/Western European') facultyAnglo += 1;
  }
  const facultyShare = facultyAnglo / ROLLS;
  assert(facultyShare > 0.46 && facultyShare < 0.54, `faculty keep their own 50% (got ${(facultyShare * 100).toFixed(1)}%)`);
}

// ---- A men's sport's listing is nearly always a man ----
function testGenderMatch(): void {
  const ROLLS = 6_000;
  reseed();
  let men = 0;
  let women = 0;
  let trainerMen = 0;
  for (let i = 0; i < ROLLS; i++) {
    if (generateCoachCandidate('football').gender === 'male') men += 1;
    if (generateCoachCandidate('fieldHockey').gender === 'female') women += 1;
    if (generateCoachCandidate(TRAINER_FIELD).gender === 'male') trainerMen += 1;
  }
  const menShare = men / ROLLS;
  const womenShare = women / ROLLS;
  const trainerShare = trainerMen / ROLLS;
  assert(menShare > 0.93 && menShare < 0.97, `a football listing is a man ~95% of the time (got ${(menShare * 100).toFixed(1)}%)`);
  assert(womenShare > 0.93 && womenShare < 0.97, `a field hockey listing is a woman ~95% of the time (got ${(womenShare * 100).toFixed(1)}%)`);
  assert(trainerShare > 0.46 && trainerShare < 0.54, `a trainer's listing stays a coin flip (got ${(trainerShare * 100).toFixed(1)}%)`);
}

console.log('coach-names tests');
testPoolShape();
testDedupeWithoutExtraDice();
testDepartmentNames();
testCoachWeighting();
testGenderMatch();

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
