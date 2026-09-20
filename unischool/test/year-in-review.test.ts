// ---------------------------------------------------------------------
// The year in review (Plan 16's PR B): the summer's first beat, generated
// from the closing year's log and the state against last summer's row
// (src/state/yearInReview.ts), and the year's own figures the snapshot
// records at the boundary (src/state/history.ts).
//
// What is pinned: that the review reads the log by TOPIC rather than by
// message text, so a reworded line still files where it belongs; that the
// year's figures on the snapshot are the figures the boundary actually
// produced; and that the review's two forward-looking lines — who will not
// return, what the year graded — are the same readings the last beat
// commits, so the review cannot promise a summer the boundary does not
// deliver.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { buildYearInReview, projectedAttrition, yearLog } from '../src/state/yearInReview';
import { FOUNDING_PRESET } from '../src/data/foundingData';
import type { GameState } from '../src/state/types';
import { LOG_CAP, WEEKS_PER_YEAR } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

function section(s: GameState, key: string) {
  const found = buildYearInReview(s).sections.find((x) => x.key === key);
  if (!found) throw new Error(`no ${key} section`);
  return found;
}
const text = (s: GameState, key: string) => section(s, key).lines.map((l) => l.text).join(' | ');

// Ticks to the summer, answering everything else with the shared defaults.
function toSummer(start: GameState): GameState {
  let s = start;
  for (let i = 0; i < WEEKS_PER_YEAR * 2; i += 1) {
    if (s.pendingInterrupt?.type === 'summer') return s;
    const answer = defaultAnswer(s);
    s = answer ? reducer(s, answer) : reducer(s, { type: 'TICK' });
  }
  throw new Error('no summer inside two years');
}

console.log('year in review tests');

// --- a year of play files under the right sections ------------------------
{
  let s = createInitialState('Review');
  // Start every open course in week 1, so the year has courses to finish
  // (the founding programs' next courses are open from day one — Plan 19;
  // the founding faculty have one free slot among the three fields, so
  // two departments get a fixture hire).
  for (const field of ['History', 'Philosophy']) {
    s.faculty.push({
      id: `test-${field}`, name: `Dr. Test ${field}`, field,
      teaching: 80, research: 60, teachingPotential: 90, researchPotential: 70,
      tenureWeeks: 0, weeksListed: 0, acclaim: 0, salary: 0, courseSlots: 10,
      nationality: 'United States', flag: '🇺🇸', bio: 'A test fixture, not a character.', gender: 'male', heritage: 'Anglo/Western European',
    });
  }
  for (const id of s.tech.filter((t) => t.kind === 'course' && t.status === 'available').map((t) => t.id)) {
    s = reducer(s, { type: 'START_DEVELOPMENT', nodeId: id, facultyId: undefined });
  }
  const developing = Object.keys(s.developing).length;
  assert(developing > 0, `the founding faculty can start a founding program's next course (${developing} developing)`);
  // Appoint the first candidate on the market and dismiss them again: an
  // appointment and a departure in the same year.
  const candidate = s.candidates[0];
  s = reducer(s, { type: 'HIRE_FACULTY', facultyId: candidate.id });
  s = reducer(s, { type: 'FIRE_FACULTY', facultyId: candidate.id });

  s = toSummer(s);
  const entries = yearLog(s);
  assert(entries.length > 0 && entries.every((e) => e.year === 1), 'the year log is the closing year and nothing else');
  assert(entries[0].week <= entries[entries.length - 1].week, 'oldest first');

  const built = section(s, 'built');
  const finished = entries.filter((e) => e.topic === 'course').length;
  assert(finished === developing, `every course that finished carries the course topic (${finished} of ${developing})`);
  assert(built.lines[0]?.text === `${developing} courses finished`, `and the Built section counts them (${built.lines[0]?.text})`);
  assert(built.lines.some((l) => l.text.includes('Social Sciences & Humanities') || l.text.includes('in ')), 'grouped by school');

  const people = text(s, 'people');
  assert(people.includes(`Appointed ${candidate.name}`), `the appointment is listed (${people})`);
  assert(people.includes(`${candidate.name} (${candidate.field}) has left`), 'and the departure');

  assert(section(s, 'research').lines.length === 0, 'a school with no lab has an empty Research section');
  assert(section(s, 'research').empty.length > 0, 'which still says something');

  const students = text(s, 'students');
  assert(/Satisfaction averaged \d+ this year/.test(students), `the students section leads with the year's average (${students})`);

  const moneyLines = text(s, 'money');
  const net = s.finance.cash - FOUNDING_PRESET.startingCash;
  assert(moneyLines.includes(`${net >= 0 ? '+' : '−'}$${Math.abs(Math.round(net)).toLocaleString()}`), `the first year's net is measured from the founding cash (${moneyLines})`);

  const standing = text(s, 'standing');
  assert(/graded \d+: prestige [\d.]+ → [\d.]+/.test(standing), `the standing section reads the report card before it is applied (${standing})`);
  assert(standing.includes('Curriculum breadth'), 'and lists the inputs by name');
  assert(!buildYearInReview(s).truncated, 'a quiet founding year fits inside the log');
}

// --- the review reads topics, not sentences -------------------------------
{
  const s = toSummer(createInitialState('Topics'));
  s.log.unshift({ year: s.clock.year, week: 30, message: 'A line worded however the system likes.', kind: 'good', topic: 'program' });
  s.log.unshift({ year: s.clock.year, week: 31, message: 'Developed: Something.', kind: 'good' }); // untagged: texture
  const built = text(s, 'built');
  assert(built.includes('A line worded however the system likes'), 'a tagged line files by its topic whatever it says');
  assert(!built.includes('Something'), 'an untagged line is texture and is not counted');
  s.log.unshift({ year: s.clock.year - 1, week: 40, message: 'Last year.', kind: 'good', topic: 'program' });
  assert(!text(s, 'built').includes('Last year'), 'and last year\'s lines stay in last year');
}

// --- the forward-looking lines are the boundary's own readings ------------
{
  const s = toSummer(createInitialState('Forward'));
  // A miserable year: the average the funnel will read is 35.
  s.students.satisfactionYearSum = 35 * s.students.satisfactionYearWeeks;
  const leaving = projectedAttrition(s);
  assert(leaving > 0, `a year averaging 35 costs students (${leaving})`);
  assert(text(s, 'students').includes(`${leaving.toLocaleString()} students will not return`), 'the review names the number');
  const after = reducer(s, { type: 'RESOLVE_ADMISSIONS', tuition: s.finance.listedTuition, admitRate: s.students.admitRate, approvedPetitionIds: [] });
  assert(after.history[0].attrition === leaving, `and the boundary records exactly that figure (${after.history[0].attrition})`);
  assert(Math.abs(after.history[0].satisfactionAverage - 35) < 1e-9, 'with the average the year was graded on');
}

// --- the snapshot's own figures --------------------------------------------
{
  const s = toSummer(createInitialState('Snapshot'));
  const before = s.finance.cash;
  const after = reducer(s, { type: 'RESOLVE_ADMISSIONS', tuition: 17_500, admitRate: 0.25, approvedPetitionIds: [] });
  const row = after.history[0];
  assert(row.net === after.finance.cash - FOUNDING_PRESET.startingCash, 'year one\'s net is cash less the founding cash');
  assert(row.applicants === after.students.applicantPool, 'the pool the funnel drew');
  assert(Math.abs(row.admitRate - 0.25) < 1e-9, 'the share chosen');
  assert(row.incomingQuality === after.students.incomingQuality, 'the class\'s quality');
  assert(row.coursesFinished === 0 && row.coursesDone === 6, 'nothing finished in a year nothing was started — the founding six were developed before it');
  void before;

  // A second year measures from the first row.
  let second = toSummer(after);
  const net2 = second.finance.cash - row.cash;
  second = reducer(second, { type: 'RESOLVE_ADMISSIONS', tuition: 17_500, admitRate: 0.25, approvedPetitionIds: [] });
  assert(Math.abs(second.history[1].net - net2) < 1e-6, 'year two\'s net is measured from the row filed at year one');
}

// --- a year busier than the log says so -------------------------------------
{
  const s = toSummer(createInitialState('Busy'));
  for (let i = 0; i < LOG_CAP + 5; i += 1) {
    s.log.unshift({ year: s.clock.year, week: 20, message: `Line ${i}`, kind: 'info' });
  }
  s.log.length = LOG_CAP;
  assert(buildYearInReview(s).truncated, 'a year that filled the log reports its earliest weeks gone');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
