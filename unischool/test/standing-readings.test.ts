// ---------------------------------------------------------------------
// Plan 15's terms (see prestigeSystem.ts's "PLAN 15's TERMS" block and
// systems/techtree/instructionCapacity.ts): welfare, concentration and
// crowding — written as readings in PR A and promoted to inputs and a
// penalty in PR B — and the instruction capacity crowding reads, which
// stays a reading. This pins each one's arithmetic, and the rule readings
// keep: nothing in `readings` is in `inputs`. The summer model that
// grades them is test/report-card.test.ts's.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { programs } from '../src/data/techData';
import { foundingCourseIds } from '../src/state/actions';
import { HEALTH_CENTER_TIER1_POPULATION_GATE } from '../src/data/facilitiesData';
import {
  computePrestigeTarget, concentrationScore, crowdingCoverages, crowdingScore, crowdingShortfallNow,
  prestigeBreakdown, prestigeReadings, researchStandingBreakdown, socialStandingBreakdown, welfareScore,
} from '../src/systems/prestige/prestigeSystem';
import {
  instructionCapacity, instructionCapacityDetail, instructionCoverage, SEATS_PER_COURSE,
} from '../src/systems/techtree/instructionCapacity';
import { schoolFoundedKey } from '../src/systems/techtree/schools';
import { totalEnrolled } from '../src/state/types';
import type { GameState } from '../src/state/types';

let seed = 91;
Math.random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
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
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

function fresh(): GameState {
  return createInitialState('Readings');
}

// A hall standing, placed and empty, so a program can be housed in it.
function withHall(s: GameState, id: string): void {
  s.tech.find((t) => t.id === id)!.status = 'done';
  s.placements[id] = { row: 10 + 10 * Number(id.slice(-1)), col: 10, w: 7, h: 5 };
  s.halls[id] = Array.from({ length: 6 }, () => ({ programId: null }));
}

function finish(s: GameState, ids: string[]): void {
  for (const id of ids) s.tech.find((t) => t.id === id)!.status = 'done';
}

// A year's worth of satisfaction at one level, as the accumulator would hold it.
function withYearAverage(s: GameState, average: number): void {
  s.students.satisfactionYearSum = average * 30;
  s.students.satisfactionYearWeeks = 30;
}

const majorsOf = (school: string) => programs().filter((p) => p.kind === 'major' && p.school === school);

console.log('standing readings tests');

// ---- three inputs, one penalty, one reading ----
{
  const s = fresh();
  const made = prestigeBreakdown(s);
  const keys = made.inputs.map((i) => i.key);
  assert(keys.includes('concentration') && keys.includes('welfare'), 'concentration and welfare are inputs');
  const crowding = made.inputs.find((i) => i.key === 'crowding')!;
  assert(crowding.penalty === true, 'crowding is the penalty');
  assert(crowding.contribution <= 0, 'and subtracts');
  assert(made.inputs.filter((i) => i.key !== 'crowding').every((i) => !i.penalty), 'nothing else does');
  assert(made.readings.map((r) => r.key).join(',') === 'capacity', 'instruction capacity is the one reading left');
  const inputKeys = new Set(keys);
  assert(made.readings.every((r) => !inputKeys.has(r.key)), 'no reading is also an input');
  const summed = made.inputs.reduce((sum, input) => sum + input.contribution, made.baseline);
  assert(near(Math.max(made.min, Math.min(made.max, summed)), computePrestigeTarget(s)), 'the target is the inputs alone');
  const capacity = made.readings[0];
  assert(capacity.weight === undefined, 'instruction capacity is a ceiling, not a future input — it carries no weight');
  assert(capacity.detail.length > 0, 'and says what it read');
}

// ---- welfare: (sat − 40) / 40, on the year's average ----
{
  const s = fresh();
  for (const [average, expected] of [[20, 0], [40, 0], [60, 0.5], [80, 1], [95, 1]] as const) {
    withYearAverage(s, average);
    assert(near(welfareScore(s), expected), `a year averaging ${average} reads welfare ${expected}`);
  }
  // Before any week has accumulated the trailing average falls back to the
  // headline number, so a freshly loaded save does not read 0/0.
  s.students.satisfactionYearSum = 0;
  s.students.satisfactionYearWeeks = 0;
  s.students.satisfaction = 70;
  assert(near(welfareScore(s), 0.75), 'with nothing accumulated welfare reads off today\'s satisfaction');
  withYearAverage(s, 60);
  s.students.satisfaction = 100;
  assert(near(welfareScore(s), 0.5), 'and once a year is accumulating, today\'s number is not what is read');
}

// ---- instruction capacity: developed courses in housed, settled programs ----
{
  const s = fresh();
  assert(instructionCapacity(s) === foundingCourseIds().length * SEATS_PER_COURSE, 'the founding college is seated from founding — its six courses are developed and housed in Founders Hall');
  assert(near(instructionCoverage(s), 1), 'and it holds the founding body');

  const core = instructionCapacityDetail(s);
  assert(core.courses === foundingCourseIds().length, 'six developed courses in housed, settled programs');
  assert(core.seats === foundingCourseIds().length * SEATS_PER_COURSE, 'at SEATS_PER_COURSE each');
  assert(core.seats >= totalEnrolled(s.students), 'which holds the founding body');
  assert(near(instructionCoverage(s), 1), 'so instruction coverage reads full');

  // A major finished but never housed teaches nobody.
  const [finance, marketing] = majorsOf('Business');
  finish(s, finance.courseIds);
  assert(instructionCapacity(s) === core.seats, 'a developed program with no slot adds nothing');

  withHall(s, 'HALL-01');
  s.halls['HALL-01'][0] = { programId: finance.id };
  assert(
    instructionCapacity(s) === core.seats + finance.courseIds.length * SEATS_PER_COURSE,
    'housing it counts every developed course in it',
  );

  // Depth buys seats: a shallow program contributes what it has developed.
  s.halls['HALL-01'][1] = { programId: marketing.id };
  finish(s, marketing.courseIds.slice(0, 2));
  assert(
    instructionCapacity(s) === core.seats + (finance.courseIds.length + 2) * SEATS_PER_COURSE,
    'a founded-but-shallow program contributes only its developed courses',
  );

  // A course still developing is not yet a seat.
  s.tech.find((t) => t.id === marketing.courseIds[2])!.status = 'developing';
  assert(
    instructionCapacity(s) === core.seats + (finance.courseIds.length + 2) * SEATS_PER_COURSE,
    'a developing course is not a seat yet',
  );

  // A program in transit teaches nobody this term.
  s.halls['HALL-01'][0] = { programId: finance.id, transitWeeks: 4 };
  assert(
    instructionCapacity(s) === core.seats + 2 * SEATS_PER_COURSE,
    'a program in transit counts nothing until it arrives',
  );

  // Coverage is against the enrolled body, and full for an empty one.
  s.halls['HALL-01'][0] = { programId: finance.id };
  const seats = instructionCapacity(s);
  s.students.classes = { freshman: seats, sophomore: seats, junior: 0, senior: 0 };
  assert(near(instructionCoverage(s), 0.5), 'twice the seats enrolled reads half covered');
  s.students.classes = { freshman: 0, sophomore: 0, junior: 0, senior: 0 };
  assert(near(instructionCoverage(s), 1), 'nobody enrolled is fully covered rather than divided by zero');
}

// ---- crowding: the worst of six coverages, as a shortfall below 90% ----
{
  const s = fresh();
  // Founding: nothing built, nothing developed — every ratio but the dormant
  // one is short, and the reading says so in full.
  const coverages = crowdingCoverages(s);
  assert(coverages.length === 6, 'six ratios: five attributes and instruction');
  assert(coverages[0].coverage <= coverages[coverages.length - 1].coverage, 'sorted worst first');
  assert(totalEnrolled(s.students) < HEALTH_CENTER_TIER1_POPULATION_GATE, 'the founding body is below the health gate');
  assert(coverages.find((c) => c.label === 'health')!.coverage === 1, 'health below its gate reads covered, not short');
  assert(near(crowdingShortfallNow(s), 1), 'a campus with nothing built is as crowded as it gets');

  // Nobody enrolled: every ratio reads full, and nothing is short.
  const empty = fresh();
  empty.students.classes = { freshman: 0, sophomore: 0, junior: 0, senior: 0 };
  assert(near(crowdingShortfallNow(empty), 0), 'nobody to crowd reads no shortfall');

  // The INPUT reads the year's average, not the week: before any week has
  // accumulated it is the live reading, and after it is the mean.
  assert(near(crowdingScore(empty), 0), 'with nothing accumulated the input is the live reading');
  empty.students.crowdingYearSum = 0.5 * 10;
  empty.students.crowdingYearWeeks = 10;
  assert(near(crowdingScore(empty), 0.5), 'and once weeks have accumulated it is their average');

  // The formula, driven through the one ratio this test controls exactly:
  // give the campus enough of everything else that instruction is the worst.
  const t = fresh();
  const seats = instructionCapacity(t);
  t.students.capacity = 1_000_000;
  t.tech.push(
    { id: 'TEST-DINING', kind: 'facility', facilityType: 'diningHall', name: 'Test Dining', description: '', cost: 0, duration: 0, prereqs: [], status: 'done', effects: { satisfactionAttribute: 'basicNeeds', servesPopulation: 1_000_000 } },
    { id: 'TEST-LIB', kind: 'facility', facilityType: 'library', name: 'Test Library', description: '', cost: 0, duration: 0, prereqs: [], status: 'done', effects: { satisfactionAttribute: 'academic', servesPopulation: 1_000_000 } },
    { id: 'TEST-SOCIAL', kind: 'facility', facilityType: 'studentCenter', name: 'Test Centre', description: '', cost: 0, duration: 0, prereqs: [], status: 'done', effects: { satisfactionAttribute: 'social', servesPopulation: 1_000_000 } },
    { id: 'TEST-HEALTH', kind: 'facility', facilityType: 'healthCenter', name: 'Test Clinic', description: '', cost: 0, duration: 0, prereqs: [], status: 'done', effects: { satisfactionAttribute: 'health', servesPopulation: 1_000_000 } },
  );
  // The grace is 0.85 since PR G fitted it (the plan opened at 0.9).
  for (const [ratio, expected] of [[1, 0], [0.85, 0], [0.55, (0.85 - 0.55) / 0.85], [0.425, 0.5], [0.1, (0.85 - 0.1) / 0.85]] as const) {
    const enrolled = Math.round(seats / ratio);
    t.students.classes = { freshman: enrolled, sophomore: 0, junior: 0, senior: 0 };
    const worst = crowdingCoverages(t)[0];
    // At a full ratio every reading ties at 1, so only the value is pinned there.
    if (ratio < 1) assert(worst.label === 'instruction', `at ${ratio} instruction is the worst ratio (${worst.label})`);
    assert(near(worst.coverage, ratio, 1e-3), `and it reads ${ratio}`);
    assert(near(crowdingShortfallNow(t), expected, 1e-3), `instruction covering ${ratio} reads a shortfall of ${expected.toFixed(3)} (${crowdingShortfallNow(t).toFixed(3)})`);
  }
  t.students.classes = { freshman: Math.round(seats / 0.55), sophomore: 0, junior: 0, senior: 0 };
  const crowding = prestigeBreakdown(t).inputs.find((i) => i.key === 'crowding')!;
  assert(crowding.contribution < -8 && crowding.contribution > -10, `feeding 55% costs around nine of ${crowding.weight} (${crowding.contribution.toFixed(1)})`);
}

// ---- concentration: the deepest school, founded and distinguished ----
{
  const s = fresh();
  assert(concentrationScore(s) === 0, 'no school founded reads nothing');
  assert(
    prestigeBreakdown(s).inputs.find((r) => r.key === 'concentration')!.detail.startsWith('No school founded'),
    'and says how one is',
  );

  s.milestones[schoolFoundedKey('Business')] = true;
  assert(near(concentrationScore(s), 0.4), 'a founded school is 0.4');
  assert(
    prestigeBreakdown(s).inputs.find((r) => r.key === 'concentration')!.detail.includes('Business'),
    'the row names the school',
  );

  s.milestones[schoolFoundedKey('Engineering')] = true;
  assert(near(concentrationScore(s), 0.4), 'a second founded school is breadth, not concentration — still 0.4');

  s.milestones['school-distinguished:Business'] = true;
  assert(near(concentrationScore(s), 1), 'founded and distinguished is the whole term');

  const d = fresh();
  d.milestones['school-distinguished:Science'] = true;
  assert(near(concentrationScore(d), 0.6), 'distinguished without ever sharing a hall is 0.6');
  assert(
    prestigeBreakdown(d).inputs.find((r) => r.key === 'concentration')!.detail.includes('never founded'),
    'and the row says which half is missing',
  );

  // Reads the durable milestones, not the live dedication: a hall that
  // holds six of one school without the pass having run founds nothing yet.
  const live = fresh();
  withHall(live, 'HALL-01');
  majorsOf('Business').forEach((p, i) => { live.halls['HALL-01'][i] = { programId: p.id }; });
  assert(concentrationScore(live) === 0, 'a dedicated hall counts once the milestone is written, not before');
}

// ---- the other two standings carry no readings ----
{
  const s = fresh();
  assert(prestigeReadings(s).length === 1, 'one on the academic standing');
  assert(researchStandingBreakdown(s).readings.length === 0, 'none on research standing');
  assert(socialStandingBreakdown(s).readings.length === 0, 'none on campus life standing');
}

console.log(`standing readings: ${checks} checks, ${failures} failures`);
if (failures > 0) process.exit(1);
