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

import { teachingCollege } from './fixtures/teaching';
import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { REVIEW_LIST_CAP, buildYearInReview, projectedAttrition, reviewGroup, yearLog } from '../src/state/yearInReview';
import { FOUNDING_PRESET } from '../src/data/foundingData';
import type { GameState } from '../src/state/types';
import { EVENT_CATALOGUE } from '../src/data/eventCatalogue';
import { LOG_CAP, WEEKS_PER_YEAR } from '../src/state/types';
import { prestigeBreakdown, standingDetailLine } from '../src/systems/prestige/prestigeSystem';

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
  let s = teachingCollege('Review');
  // Start every open course in week 1, so the year has courses to finish
  // (the founding programs' next courses are open from day one — Plan 19;
  // the founding faculty have one free slot among the three fields, so
  // two departments get a fixture hire).
  for (const field of ['Mathematics', 'Economics']) {
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
  // The schools are the group's members (Plan 95I), not lines of their own.
  assert((built.lines[0]?.items ?? []).length > 0 && built.lines[0].items!.every((x) => / in /.test(x)), `grouped by school (${built.lines[0]?.items?.join(', ')})`);

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
  assert(['Academics', 'Research', 'Student life', 'Athletics'].every((p) => standing.includes(p)), 'and lists the four pillars by name');
  assert(!buildYearInReview(s).truncated, 'a quiet founding year fits inside the log');

  // Every term carries its "what moves it" (Plan 78C), and it is the line
  // History › Prestige shows for that term, from the one function.
  const inputs = prestigeBreakdown(s).inputs;
  const termLines = section(s, 'standing').lines.filter((l) => inputs.some((i) => l.text.startsWith(`${i.label}: `)));
  assert(termLines.length >= 5, `the review lists the grade's terms: the pillars and the endowment at least (${termLines.length})`);
  for (const line of termLines) {
    const input = inputs.find((i) => line.text.startsWith(`${i.label}: `))!;
    assert(!!line.detail && line.detail.trim().length > 0, `${input.label} has a detail line`);
    assert(line.detail === standingDetailLine(input), `${input.label}'s detail is History's line`);
  }
  const academics = termLines.find((l) => l.text.startsWith('Academics: '));
  assert(!!academics?.detail?.includes('35%'), 'a pillar says what share of prestige it is');
  assert(section(s, 'standing').lines.filter((l) => l.detail).length === termLines.length, 'and only the terms carry a detail');
}

// --- the review reads topics, not sentences -------------------------------
{
  const s = toSummer(teachingCollege('Topics'));
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
  const s = toSummer(teachingCollege('Forward'));
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
  const s = toSummer(teachingCollege('Snapshot'));
  const before = s.finance.cash;
  const after = reducer(s, { type: 'RESOLVE_ADMISSIONS', tuition: 17_500, admitRate: 0.25, approvedPetitionIds: [] });
  const row = after.history[0];
  assert(row.net === after.finance.cash - FOUNDING_PRESET.startingCash, 'year one\'s net is cash less the founding cash');
  assert(row.applicants === after.students.applicantPool, 'the pool the funnel drew');
  assert(Math.abs(row.admitRate - 0.25) < 1e-9, 'the share chosen');
  assert(row.incomingQuality === after.students.incomingQuality, 'the class\'s quality');
  assert(row.coursesFinished === 6 && row.coursesDone === 6, 'a college founded with no course counts every course it teaches as finished in year one (Plan 80D)');
  void before;

  // A second year measures from the first row.
  let second = toSummer(after);
  const net2 = second.finance.cash - row.cash;
  second = reducer(second, { type: 'RESOLVE_ADMISSIONS', tuition: 17_500, admitRate: 0.25, approvedPetitionIds: [] });
  assert(Math.abs(second.history[1].net - net2) < 1e-6, 'year two\'s net is measured from the row filed at year one');
}

// --- a year busier than the log says so -------------------------------------
{
  const s = toSummer(teachingCollege('Busy'));
  for (let i = 0; i < LOG_CAP + 5; i += 1) {
    s.log.unshift({ year: s.clock.year, week: 20, message: `Line ${i}`, kind: 'info' });
  }
  s.log.length = LOG_CAP;
  assert(buildYearInReview(s).truncated, 'a year that filled the log reports its earliest weeks gone');
}

// --- the year's events and the graduating class (Plan 33) ------------------
{
  const s = toSummer(teachingCollege('Events'));
  const section = (key: string) => buildYearInReview(s).sections.find((x) => x.key === key)!;
  assert(section('events').lines.length === 0, 'a year nothing reached the desk says so');
  const letter = EVENT_CATALOGUE.find((e) => e.kind === 'seismic')!;
  s.catalogue = {
    pending: [], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0,
    letters: [{ eventId: letter.id, choiceId: letter.default, year: s.clock.year }, { eventId: letter.id, choiceId: letter.default, year: s.clock.year - 1 }],
    answered: [{ year: s.clock.year, player: 2, seat: 1, timeout: 3 }],
  };
  const lines = section('events').lines.map((l) => l.text);
  assert(lines.length === 2 && lines[0].startsWith(letter.title!), `the year's letter, and only this year's (${lines.join(' | ')})`);
  // Plan 47: the catalog's letters are letters to the President; "from the board" is the distress ladder's.
  assert(lines[0].includes('a letter to the President') && !lines[0].includes('from the board'), `the letter is a letter to the President (${lines[0]})`);
  assert(lines[1].startsWith('6 matters came up') && lines[1].includes('2 answered by the President') && lines[1].includes('1 by the administration') && lines[1].includes('3 left unanswered'), `and who answered the rest (${lines[1]})`);
  const cls = section('class');
  assert(s.students.classes.senior === 0 ? cls.lines.length === 0 : cls.lines.length === 2, 'the graduating class, when there is one');
  s.students.classes.senior = 120;
  const seniors = section('class').lines.map((l) => l.text);
  const classLine = (s.alumni ?? []).some((a) => a.classYear < s.clock.year) ? `The class of Year ${s.clock.year}:` : 'The first graduating class:';
  assert(seniors.length === 2 && seniors[0].startsWith(classLine) && seniors[1].startsWith('120 seniors leave'), `how it will remember its years, and how warmly (${seniors.join(' | ')})`);
}

// --- like lines group, and every list is capped (Plan 95I) ---------------
{
  const s = toSummer(teachingCollege('Groups'));
  const year = s.clock.year;
  const staff = s.faculty.slice(0, 2);
  // Two appointments of people still on the faculty, and five more who are
  // not: seven like lines, one group.
  for (const f of staff) s.log.unshift({ year, week: 10, message: `Appointed ${f.name} to the faculty in ${f.field}, at $1/yr.`, kind: 'info', topic: 'appointment', subject: f.id });
  for (let i = 0; i < 5; i += 1) s.log.unshift({ year, week: 11 + i, message: `Appointed Dr. Gone ${i} to the faculty in History, at $1/yr.`, kind: 'info', topic: 'appointment', subject: `gone-${i}` });
  const people = section(s, 'people');
  const group = people.lines.find((l) => l.text === '7 professors appointed');
  assert(!!group, `seven appointments are one line (${people.lines.map((l) => l.text).join(' | ')})`);
  assert(group?.items?.length === 7, 'which keeps all seven, for "and N more" to open');
  assert(group?.items?.[0] === `${staff[0].name} (${staff[0].field})`, `a professor still here is named with the field (${group?.items?.[0]})`);
  assert(group?.items?.includes('Appointed Dr. Gone 0 to the faculty in History, at $1/yr') ?? false, 'one who is gone keeps the log\'s line');
  assert(REVIEW_LIST_CAP === 5, 'and a list shows five before "and N more"');

  // One of a kind stays the full sentence; none is no line.
  const one = reviewGroup(['a'], (n) => `${n} things`, (x) => x, (x) => `The thing ${x}`, 'good');
  assert(one.length === 1 && one[0].text === 'The thing a' && one[0].items === undefined && one[0].tone === 'good', 'a group of one is its own line');
  assert(reviewGroup([], (n) => `${n}`, String, String).length === 0, 'a group of none is no line');
  const two = reviewGroup(['a', 'b'], (n) => `${n} things`, (x) => x.toUpperCase(), String);
  assert(two.length === 1 && two[0].text === '2 things' && two[0].items?.join() === 'A,B', 'two or more are a head over their short forms');

  // Buildings and programs group the same way.
  for (const t of s.tech.filter((x) => x.kind !== 'course').slice(0, 3)) s.log.unshift({ year, week: 20, message: `Completed ${t.name}.`, kind: 'good', topic: 'building', subject: t.id });
  const built = section(s, 'built');
  assert(built.lines.some((l) => l.text === '3 buildings completed' && l.items?.length === 3), `three buildings are one line (${built.lines.map((l) => l.text).join(' | ')})`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
