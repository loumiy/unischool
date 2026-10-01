// ---------------------------------------------------------------------
// The faculty training program (Plan 85E, systems/faculty/training.ts).
// What is worth pinning:
//
//   - a pick raises teaching by its grade's width on the course-grade
//     bands, and the teaching potential by as much, and the gain lasts as
//     the professor keeps growing;
//   - the picks scale with the faculty (one for every 15, at least 2), are
//     spent one a professor a year, and lapse at the year's end: a new year
//     brings a full allowance and nothing carried, and the log says so;
//   - the institute opens only to a college specialized in academics, and
//     training needs it standing;
//   - for a term the trainee teaches one course fewer: a course that no
//     longer fits moves to a colleague with room, or waits;
//   - the academics pillar's specialization term reads the share of the
//     faculty trained, full at TRAINED_SHARE_FOR_FULL, and nothing without
//     the institute, and says so;
//   - a save round trip keeps it all, and the version-89 fixture migrates;
//   - the harness picks the untrained professor below A with the most
//     potential.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Faculty, GameState } from '../src/state/types';
import { WEEKS_PER_YEAR } from '../src/state/types';
import { exportSave, readSave, SAVE_VERSION } from '../src/state/persistence';
import { reduceInPlace } from '../src/engine/reducer';
import { GRADE_A, GRADE_B, GRADE_C, gradeFor, gradeWidth, oneGradeUp } from '../src/data/courseQuality';
import {
  FACULTY_PER_TRAINING_PICK, MIN_TRAINING_PICKS, TRAINED_SHARE_FOR_FULL, TRAINING_INSTITUTE_ID, TRAINING_WEEKS,
  picksFor, trainingReading,
} from '../src/data/trainingData';
import { picksLeft, trainingPicks, whyNotTrain } from '../src/systems/faculty/training';
import { effectiveCourseSlots, facultyLoad, unlockAvailable } from '../src/systems/techtree/techSystem';
import { pillarBreakdown } from '../src/systems/prestige/prestigeSystem';
import { SPECIALIZATION_CARDS, opensLine } from '../src/data/specializationData';
import { trainingLines } from '../src/tabs/facultyCareer';
import { brokenRules } from '../sim/harness/invariants';
import { trainingPick } from '../sim/harness/training';
import { foundGame, playUntil, playWeek, type Player } from '../sim/harness/game';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('training tests');

const FIXTURES = join(process.cwd(), 'test/fixtures');
function launch(): GameState {
  const read = readSave(readFileSync(join(FIXTURES, 'save-launch.json'), 'utf8'));
  if ('refused' in read) throw new Error(`the launch fixture is refused: ${read.refused}`);
  return read.state;
}
const institute = (s: GameState) => s.tech.find((t) => t.id === TRAINING_INSTITUTE_ID)!;
// A college specialized in academics, its institute standing.
function program(): GameState {
  const s = launch();
  s.specialization = 'academics';
  s.specializationYear = s.clock.year;
  institute(s).status = 'done';
  return s;
}
const belowA = (s: GameState) => s.faculty.filter((f) => oneGradeUp(f.teaching) !== null);
// Plays on, answering what comes up as the game's defaults would, with a
// player that does nothing and spends no pick.
const still: Player = { name: 'still', act() {}, trains: false, specialization: 'never' };
function weeks(s: GameState, n: number): GameState {
  const g = foundGame({ from: s });
  for (let i = 0; i < n; i += 1) playWeek(g, still);
  return g.s;
}
function toNextYear(s: GameState): GameState {
  const g = foundGame({ from: s });
  const year = g.s.clock.year;
  playUntil(g, still, 2, (x) => x.clock.year > year);
  return g.s;
}

// ---- A grade's width up, on the bands (the owner's decision, 2026-10-01) ----
{
  assert(gradeWidth(77) === GRADE_A - GRADE_B && oneGradeUp(77) === 93, `a B's 77 rises a B's width, ${GRADE_A - GRADE_B}, to 93 (${oneGradeUp(77)})`);
  assert(gradeWidth(62) === 16 && oneGradeUp(62) === 78, 'the bottom of B goes to the bottom of A');
  assert(gradeWidth(50) === GRADE_B - GRADE_C && oneGradeUp(50) === 68, `a C's 50 rises a C's width, ${GRADE_B - GRADE_C}, to 68`);
  assert(gradeWidth(35) === GRADE_C - 30 && oneGradeUp(35) === 49, 'a D rises a D\'s width, 14');
  assert(gradeWidth(20) === 14 && oneGradeUp(20) === 34, 'an F, with no floor of its own, rises a D\'s width');
  for (const score of [16, 29, 30, 43, 44, 61, 62, 77]) {
    const up = oneGradeUp(score)!;
    assert(up - score === gradeWidth(score) && up <= 100 && 'FDCBA'.indexOf(gradeFor(up)) > 'FDCBA'.indexOf(gradeFor(score)), `${score} (${gradeFor(score)}) rises its band's width, to ${up} (${gradeFor(up)})`);
  }
  assert(oneGradeUp(78) === null && oneGradeUp(100) === null && gradeWidth(90) === null, 'an A has no grade above it');
}

// ---- The institute is the academics specialization's ----
{
  const s = launch();
  const node = institute(s);
  assert(node !== undefined && node.facilityType === 'project' && node.project?.specialization === 'academics', 'the Faculty Training Institute is a capital project for academics');
  assert(node.status === 'locked', 'locked to a college with no specialization');
  unlockAvailable(s);
  assert(node.status === 'locked', 'and stays so');
  s.specialization = 'research';
  s.specializationYear = s.clock.year;
  unlockAvailable(s);
  assert(institute(s).status === 'locked', 'and to a college specialized in research');
  s.specialization = 'academics';
  unlockAvailable(s);
  assert(institute(s).status === 'available', 'it opens to one specialized in academics');
  assert(/specialized in academics/.test(node.description), `and its description says so ("${node.description}")`);
  // Training needs it standing.
  const f = belowA(s)[0];
  assert(f !== undefined && whyNotTrain(s, f) === 'no-institute' && picksLeft(s) === 0, 'with no institute standing, nothing can be trained');
  const before = JSON.stringify(s);
  const after = reduceInPlace(s, { type: 'TRAIN_FACULTY', facultyId: f.id });
  assert(JSON.stringify(after) === before, 'and a pick is refused, changing nothing');
}

// ---- Picks scale with the faculty ----
{
  assert(picksFor(0) === MIN_TRAINING_PICKS && picksFor(29) === MIN_TRAINING_PICKS, `a small faculty has ${MIN_TRAINING_PICKS}`);
  assert(picksFor(45) === 3 && picksFor(80) === 5 && picksFor(90) === 6 && picksFor(100) === 6, `one for every ${FACULTY_PER_TRAINING_PICK}: 45 have 3, 80 have 5, 90 and 100 have 6`);
  const s = program();
  assert(trainingPicks(s) === picksFor(s.faculty.length) && picksLeft(s) === trainingPicks(s), `the college's ${s.faculty.length} have ${trainingPicks(s)}, all left`);
}

// ---- A pick: a grade's width up, the potential with it, and it lasts ----
{
  let s = program();
  const f = belowA(s).sort((a, b) => a.teaching - b.teaching)[0];
  assert(f !== undefined, 'the launch fixture has a professor below A');
  const { teaching, teachingPotential } = f;
  const to = oneGradeUp(teaching)!;
  const left = picksLeft(s);
  const slots = effectiveCourseSlots(s, f);
  s = reduceInPlace(s, { type: 'TRAIN_FACULTY', facultyId: f.id });
  const g = s.faculty.find((x) => x.id === f.id)!;
  const gain = to - teaching;
  assert(g.teaching === to && to === Math.min(100, teaching + gradeWidth(teaching)!), `teaching rises its grade's width, ${teaching} (${gradeFor(teaching)}) to ${g.teaching} (${gradeFor(g.teaching)})`);
  assert(g.teachingPotential === Math.min(100, teachingPotential + gain), `the potential rises as much, ${teachingPotential} to ${g.teachingPotential}`);
  assert(g.training?.points === gain && g.training.potential === teachingPotential, 'the record holds the points and the potential before');
  assert(picksLeft(s) === left - 1 && s.training.trained.includes(f.id), 'one pick is spent');
  assert(effectiveCourseSlots(s, g) === Math.max(0, slots - 1), 'for the term the professor supplies one course slot fewer');
  assert(g.career?.training?.length === 1 && g.career.training[0].from === teaching && g.career.training[0].to === to, 'the career record notes it');
  assert(trainingLines(g).length === 1 && /Faculty Training Institute in Year/.test(trainingLines(g)[0]), `and says so ("${trainingLines(g)[0]}")`);
  assert(s.log[0].topic === 'training' && s.log[0].subject === f.id, `the log says so ("${s.log[0].message}")`);
  assert(whyNotTrain(s, g) !== null, 'not twice in a year');
  assert(brokenRules(s).length === 0, `the rules hold (${brokenRules(s).join('; ')})`);
  // A year on, the gain holds: teaching is what it grew to plus the points.
  s = weeks(s, WEEKS_PER_YEAR);
  const later = s.faculty.find((x) => x.id === f.id);
  if (later) {
    assert(later.teaching >= to, `a year on it has not fallen back (${later.teaching})`);
    assert(later.teachingPotential === g.teachingPotential, 'and the potential stays raised');
    assert(effectiveCourseSlots(s, later) >= slots, 'and the course slot is back');
  }
  assert(brokenRules(s).length === 0, `the rules hold a year on (${brokenRules(s).join('; ')})`);
}

// ---- One course fewer for a term ----
{
  let s = program();
  // A professor teaching to their full load, with a colleague in the field
  // with room.
  const full = s.faculty.find((f) => oneGradeUp(f.teaching) !== null && facultyLoad(s, f.id) >= effectiveCourseSlots(s, f) && facultyLoad(s, f.id) > 0);
  if (full) {
    const load = facultyLoad(s, full.id);
    s = reduceInPlace(s, { type: 'TRAIN_FACULTY', facultyId: full.id });
    assert(facultyLoad(s, full.id) === load - 1, `a full load sheds one course (${load} to ${facultyLoad(s, full.id)})`);
    assert(/moves to|without an instructor/.test(s.log[0].message), `and the log says where it went ("${s.log[0].message}")`);
    const until = s.faculty.find((x) => x.id === full.id)!.training!.untilWeek;
    const now = (s.clock.year - 1) * WEEKS_PER_YEAR + s.clock.week;
    assert(until - now === TRAINING_WEEKS, `for a term: ${TRAINING_WEEKS} weeks`);
  } else {
    assert(false, 'the launch fixture has a professor below A at full load');
  }
}

// ---- Picks run out, and lapse at the year's end ----
{
  let s = program();
  const picks = picksLeft(s);
  for (const f of belowA(s).slice(0, picks)) s = reduceInPlace(s, { type: 'TRAIN_FACULTY', facultyId: f.id });
  assert(picksLeft(s) === 0, `all ${picks} spent`);
  const another = belowA(s).find((f) => !s.training.trained.includes(f.id));
  if (another) assert(whyNotTrain(s, another) === 'no-picks', 'with none left, nobody else can be trained this year');
  // A college that spends none: at the last week the unused lapse.
  let idle = program();
  const year = idle.clock.year;
  idle = toNextYear(idle);
  assert(idle.clock.year === year + 1, 'the year turns');
  assert(idle.log.some((e) => e.topic === 'training' && /lapsed/.test(e.message) && e.year === year), 'the log says the year\'s unused picks lapsed');
  // The new year brings a full allowance, and nothing carried.
  s = toNextYear(s);
  assert(picksLeft(s) === trainingPicks(s), `a new year: ${trainingPicks(s)} picks, none carried`);
  assert(!s.log.some((e) => e.topic === 'training' && /lapsed/.test(e.message)), 'and nothing lapsed when every pick was used');
}

// ---- The academics term reads the program ----
{
  const s = program();
  const term = (x: GameState) => pillarBreakdown(x, 'academics').inputs.find((i) => i.key === 'specialization')!;
  assert(term(s).score === 0 && /trained at the Faculty Training Institute/.test(term(s).detail), `untrained, it is empty, and says how it fills ("${term(s).detail}")`);
  const train = (x: GameState, share: number) => {
    const n = Math.round(x.faculty.length * share);
    x.faculty.forEach((f: Faculty, i) => { if (i < n) f.training = { points: 1, potential: f.teachingPotential - 1, untilWeek: 0 }; else delete f.training; });
    return n / x.faculty.length;
  };
  const half = train(s, TRAINED_SHARE_FOR_FULL / 2);
  assert(Math.abs(term(s).score - half / TRAINED_SHARE_FOR_FULL) < 1e-9 && term(s).score > 0 && term(s).score < 1, `a share of ${half.toFixed(2)} trained fills it ${term(s).score.toFixed(2)}`);
  train(s, TRAINED_SHARE_FOR_FULL);
  assert(trainingReading(s) === 1 || Math.abs(trainingReading(s) - 1) < 0.02, `at ${TRAINED_SHARE_FOR_FULL} it is full (${trainingReading(s)})`);
  train(s, 1);
  assert(term(s).score === 1 && /full/.test(term(s).detail), 'and stays full past it');
  // Without the institute, nothing, and the row says why.
  institute(s).status = 'available';
  assert(term(s).score === 0 && /no Faculty Training Institute stands/.test(term(s).detail), `without the institute it is empty ("${term(s).detail}")`);
  // Another specialization's college reads nothing from training.
  institute(s).status = 'done';
  s.specialization = 'research';
  assert(term(s).score === 0, 'a college specialized in another pillar gets none of it');
  // The choice's card says so.
  assert(/as professors are trained at the institute/.test(opensLine('academics', 24)), `the card says how it fills ("${opensLine('academics', 24)}")`);
  assert(SPECIALIZATION_CARDS.academics.mechanics.every((m) => m.ready), 'and its mechanics are now, not still to come');
  assert(/filling over 10 years/.test(opensLine('studentLife', 30)), 'student life still fills with the years');
}

// ---- The harness's pick ----
{
  const s = program();
  const pick = trainingPick(s)!;
  const open = s.faculty.filter((f) => whyNotTrain(s, f) === null);
  assert(pick !== undefined && open.every((f) => f.teachingPotential <= pick.teachingPotential), `the most potential below A (${pick.name}, ${pick.teachingPotential})`);
  pick.training = { points: 1, potential: pick.teachingPotential - 1, untilWeek: 0 };
  const next = trainingPick(s)!;
  assert(next.id !== pick.id && next.training === undefined, 'the untrained first');
}

// ---- A save round trip, and the migration ----
{
  let s = program();
  const f = belowA(s)[0];
  s = reduceInPlace(s, { type: 'TRAIN_FACULTY', facultyId: f.id });
  const back = readSave(exportSave(s).text);
  assert(!('refused' in back), 'the save reads');
  if (!('refused' in back)) {
    const g = back.state.faculty.find((x) => x.id === f.id)!;
    const was = s.faculty.find((x) => x.id === f.id)!;
    assert(JSON.stringify(g.training) === JSON.stringify(was.training) && g.teachingPotential === was.teachingPotential, 'it keeps the professor\'s training');
    assert(JSON.stringify(back.state.training) === JSON.stringify(s.training), 'and the year\'s list');
    assert(g.career?.training?.length === 1, 'and the career\'s line');
  }
  // A malformed training is dropped; a malformed list starts again.
  const bad = JSON.parse(exportSave(s).text) as { state: GameState };
  (bad.state.faculty.find((x) => x.id === f.id) as unknown as { training: unknown }).training = { points: 'lots' };
  (bad.state as unknown as { training: unknown }).training = 'everyone';
  const cleaned = readSave(JSON.stringify(bad));
  assert(!('refused' in cleaned) && cleaned.state.faculty.find((x) => x.id === f.id)!.training === undefined
    && Array.isArray(cleaned.state.training.trained) && cleaned.state.training.trained.length === 0, 'malformed training is dropped on load');

  const raw = readFileSync(join(FIXTURES, 'save-v89.json'), 'utf8');
  const parsed = JSON.parse(raw) as { version: number; state: GameState };
  const old = parsed.state as unknown as { training?: unknown; tech: GameState['tech'] };
  assert(parsed.version === 89 && old.training === undefined && !old.tech.some((t) => t.id === TRAINING_INSTITUTE_ID), 'the version-89 fixture predates the program');
  const read = readSave(raw);
  assert(!('refused' in read), 'it loads');
  if (!('refused' in read)) {
    assert(read.state.tech.filter((t) => t.id === TRAINING_INSTITUTE_ID).length === 1 && institute(read.state).status === 'locked', 'with the institute in the catalog, locked');
    assert(read.state.training.year === read.state.clock.year && read.state.training.trained.length === 0, 'and nobody trained');
    assert(read.state.faculty.every((x) => x.training === undefined), 'no professor carries training');
    assert(brokenRules(read.state).length === 0, `the rules hold (${brokenRules(read.state).join('; ')})`);
  }
  assert(SAVE_VERSION >= 90, `at version 90 or later (${SAVE_VERSION})`);
}

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
