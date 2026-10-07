// ---------------------------------------------------------------------
// The person, expanded (Plan 84E, tabs/facultyCareer.ts): the page a tile
// opens into, read off the career record. What is worth pinning: the
// arrival reads as the plan writes it; the courses come out as a timeline
// by course, with the one taught now marked; recognition is exactly the
// three things the plan names (prizes, a distinguished program taught in,
// 25 years of service) and nothing invented; the chart ends today; a quirk
// is explained in words; and a candidate has no history at all.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readSave } from '../src/state/persistence';
import { institutionName, WEEKS_PER_YEAR, type Faculty } from '../src/state/types';
import { programOfCourse } from '../src/data/techData';
import { quirkById } from '../src/data/quirkData';
import { CAREER_WORDS, LONG_SERVICE_YEARS, quirkExplained } from '../src/data/careerWords';
import {
  courseTimeline, joinedLine, recognitions, researchLines, statSeries, weekNow, yearsHere,
} from '../src/tabs/facultyCareer';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('faculty person tests');

const read = readSave(readFileSync(join(process.cwd(), 'test/fixtures/save-v86.json'), 'utf8'));
if ('refused' in read) throw new Error('the version-86 fixture is refused');
const s = read.state;
s.clock = { year: 20, week: 10 };
const now = weekNow(s);
const college = institutionName(s.self);
const week = (year: number, w: number) => (year - 1) * WEEKS_PER_YEAR + w;

// Two courses of one program, and a professor who taught them.
const courses = s.tech.filter((t) => t.kind === 'course' && programOfCourse(t.id) !== undefined);
const [c1, c2] = courses;
const program = programOfCourse(c1.id)!;
const f: Faculty = {
  ...s.faculty[0],
  acclaim: 1,
  career: {
    arrivedWeek: week(3, 40),
    courses: [
      { courseId: c1.id, from: week(3, 45), to: week(10, 20) },
      { courseId: c2.id, from: week(4, 1), to: now - 1 },
      { courseId: c1.id, from: week(12, 1), to: week(14, 52) },
    ],
    research: [
      { topicId: 'unknown-topic', depth: 'project', year: 9, years: 1.5, publications: 3, breakthroughs: 1 },
      { topicId: 'unknown-topic', depth: 'pilot', year: 11, years: 0.3, publications: 0, breakthroughs: 0, cancelled: true },
    ],
    prizes: [{ name: 'the Test Medal', year: 9, topicId: 'unknown-topic' }],
    years: [[3, 40, 30], [4, 45, 35], [5, 50, 40]],
  },
};

// ---- The arrival ----
{
  assert(joinedLine(college, f) === `Joined ${college} in Year 3, spring term.`, `the arrival reads as the plan writes it (${joinedLine(college, f)})`);
  assert(joinedLine(college, { ...f, career: { ...f.career!, arrivedWeek: week(5, 2) } }) === `Joined ${college} in Year 5, fall term.`, 'a fall arrival says so');
  assert(yearsHere(s, f) === Math.floor((now - week(3, 40)) / WEEKS_PER_YEAR), `years here count from the arrival (${yearsHere(s, f)})`);
}

// ---- The timeline ----
{
  const t = courseTimeline(s, f)!;
  assert(t.start === week(3, 40) && t.end === now - 1, 'the timeline runs from the arrival to the week just played');
  assert(t.rows.length === 2 && t.rows[0].courseId === c1.id && t.rows[1].courseId === c2.id, 'one row a course, by the first week taught');
  assert(t.rows[0].spans.length === 2, 'a course taught twice has both spans on its row');
  assert(!t.rows[0].now && t.rows[1].now, 'and only the course taught now is marked so');
  assert(t.rows[0].code.length > 0 && !t.rows[0].code.includes(' · '), `a row carries the course code (${t.rows[0].code})`);
}

// ---- Research ----
{
  const lines = researchLines(f);
  assert(lines.length === 2 && lines[0].year === 11 && lines[0].cancelled && lines[0].outcome === CAREER_WORDS.woundUp, 'newest first, and one wound up early says so');
  assert(lines[1].outcome === CAREER_WORDS.outcome(3, 1) && lines[1].depth === 'Funded Project', 'a finished one gives its depth and outcome');
}

// ---- Recognition: the three things, and nothing else ----
{
  const without = recognitions(s, f);
  assert(without.length === 1 && without[0].kind === 'prize', `a prize is recognized (${without.map((r) => r.kind).join()})`);
  assert(without[0].text.startsWith('The Test Medal, Year 9'), `by name and year (${without[0].text})`);

  s.milestones[`program-distinguished:${program}`] = true;
  s.milestoneYears = { ...s.milestoneYears, [`program-distinguished:${program}`]: 20 };
  const withProgram = recognitions(s, f);
  assert(withProgram.some((r) => r.kind === 'program' && r.text.includes('since Year 20')), 'a distinguished program they taught in is recognized, dated');
  assert(withProgram.filter((r) => r.kind === 'program').length === 1, 'once, however many of its courses they taught');

  assert(!withProgram.some((r) => r.kind === 'service'), `no long service before ${LONG_SERVICE_YEARS} years`);
  const veteran = { ...f, career: { ...f.career!, arrivedWeek: now - LONG_SERVICE_YEARS * WEEKS_PER_YEAR } };
  assert(recognitions(s, veteran).some((r) => r.kind === 'service'), `${LONG_SERVICE_YEARS} years of service is recognized`);

  const none = { ...f, career: { ...f.career!, prizes: [], courses: [] } };
  assert(recognitions(s, none).length === 0, 'nothing is recognized that did not happen');
}

// ---- The chart ends today ----
{
  const marks = statSeries(s, f);
  assert(marks.length === 4 && marks[3][0] === s.clock.year && marks[3][1] === Math.round(f.teaching), 'the marks end with today');
}

// ---- A quirk, explained ----
{
  const q = quirkById('grant-magnet')!;
  const words = quirkExplained(q.effects);
  assert(words === 'research potential +12, pay +10%', `a quirk's effects as numbers (${words})`);
  assert(quirkExplained(quirkById('harsh-grader')!.effects) === 'teaching potential +4, morale −2', 'morale is a number too');
  assert(quirkExplained({}) === '', 'and one with none says nothing');
}

// ---- A candidate has no history ----
{
  const candidate = { ...s.candidates[0] };
  assert(candidate.career === undefined, 'a candidate carries no record');
  assert(joinedLine(college, candidate) === null && courseTimeline(s, candidate) === null, 'and has no arrival and no timeline');
  assert(researchLines(candidate).length === 0 && recognitions(s, candidate).length === 0 && statSeries(s, candidate).length === 0, 'no research, recognition or chart');
  assert(CAREER_WORDS.candidate(candidate.name, college).includes('no history here yet'), 'which the page says plainly');
}

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
