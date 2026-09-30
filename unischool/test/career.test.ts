// ---------------------------------------------------------------------
// The career record (Plan 84C, systems/faculty/career.ts). What is worth
// pinning: a save from before it loads with each professor's arrival read
// from tenure and nothing else invented; a course's span opens when it is
// theirs, runs on week to week as one span, and closes when it moves; a
// project and a prize land on the record; a year's mark is taken once a
// year; nobody who has left keeps one; and keeping it moves nothing.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readSave } from '../src/state/persistence';
import { recordProject } from '../src/systems/faculty/career';
import { eligibleInstructors } from '../src/systems/techtree/techSystem';
import { generateCandidate, FOUNDING_TENURE_WEEKS } from '../src/data/facultyData';
import { FOUNDING_MARKET } from '../src/data/foundingData';
import { foundGame, playWeek, playYears, type Game, type Player } from '../sim/harness/game';
import { createGuidedPlayer } from '../sim/harness/guided';
import { brokenRules } from '../sim/harness/invariants';
import { WEEKS_PER_YEAR, type Faculty, type GameState, type Initiative } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('career record tests');

const now = (s: GameState) => (s.clock.year - 1) * WEEKS_PER_YEAR + s.clock.week;
const idle: Player = { name: 'idle', act() {} };

// The version-86 fixture: a year-9 college written before the record.
const raw = readFileSync(join(process.cwd(), 'test/fixtures/save-v86.json'), 'utf8');
const before = JSON.parse(raw) as { version: number; state: GameState };
const read = readSave(raw);
if ('refused' in read) throw new Error(`the version-86 fixture is refused: ${read.refused}`);
const loaded = read.state;

// ---- The migration: arrival from tenure, and nothing else ----
{
  assert(before.version === 86 && before.state.faculty.every((f) => !('career' in f)), 'the version-86 fixture has no career records');
  assert(loaded.faculty.length > 0 && loaded.faculty.every((f) => f.career !== undefined), `every professor loads with a record (${loaded.faculty.length})`);
  assert(loaded.candidates.every((c) => c.career === undefined), 'and no candidate has one');
  const founders = new Set(FOUNDING_MARKET.map((p) => p.id));
  const week = now(loaded);
  const right = loaded.faculty.every((f) => {
    const here = f.tenureWeeks - (founders.has(f.id) ? FOUNDING_TENURE_WEEKS : 0);
    return f.career!.arrivedWeek === Math.max(1, week - here);
  });
  assert(right, 'each arrived as many weeks ago as their tenure at the college');
  assert(loaded.faculty.some((f) => founders.has(f.id)), 'the fixture has a founding professor');
  assert(loaded.faculty.every((f) => f.career!.arrivedWeek >= 1 && f.career!.arrivedWeek <= week), 'nobody arrived before the founding or after today');
  const empty = loaded.faculty.every((f) => {
    const c = f.career!;
    return c.courses.length === 0 && c.research.length === 0 && c.prizes.length === 0 && c.years.length === 0;
  });
  assert(empty, 'and the history begins empty');
  assert(brokenRules(loaded).length === 0, `the loaded college holds every rule: ${brokenRules(loaded).join('; ')}`);

  // A record that is malformed on load is started over, not refused.
  const bent = JSON.parse(raw) as { version: number; state: GameState };
  bent.version = 87;
  bent.state.faculty[0].career = { arrivedWeek: 'soon' } as unknown as Faculty['career'];
  const back = readSave(JSON.stringify(bent));
  assert(!('refused' in back) && back.state.faculty[0].career!.arrivedWeek === now(back.state), 'a malformed record loads as a fresh one');
}

// ---- Spans: open, run on, close as the course moves ----
{
  const g: Game = foundGame({ from: loaded, seed: 7 });
  playWeek(g, idle);
  // A course taught this week, and who teaches it.
  const done = new Set(g.s.tech.filter((t) => t.kind === 'course' && t.status === 'done').map((t) => t.id));
  const [courseId, firstId] = Object.entries(g.s.courseFaculty).find(([id]) => done.has(id))!;
  const course = g.s.tech.find((t) => t.id === courseId)!;
  const first = () => g.s.faculty.find((f) => f.id === firstId)!;
  const spansOf = (f: Faculty) => f.career!.courses.filter((x) => x.courseId === courseId);

  const w1 = now(g.s) - 1; // the week just played
  assert(spansOf(first()).length === 1 && spansOf(first())[0].to === w1, 'a taught course has a span reaching the week just played');
  for (let i = 0; i < 5; i += 1) playWeek(g, idle);
  assert(spansOf(first()).length === 1 && spansOf(first())[0].to === w1 + 5, 'which runs on as one span, week after week');
  const every = g.s.faculty.every((f) => {
    const ids = f.career!.courses.map((x) => x.courseId);
    return new Set(ids).size === ids.length;
  });
  assert(every, 'no professor holds two spans of one course when nothing moved');

  // A new hire in the field takes the course over.
  const hire = generateCandidate(course.requiresFaculty!, g.s.faculty.map((f) => f.name));
  g.s.candidates.push(hire);
  g.act({ type: 'HIRE_FACULTY', facultyId: hire.id });
  const second = () => g.s.faculty.find((f) => f.id === hire.id)!;
  assert(second().career?.arrivedWeek === now(g.s), 'a hire starts a record the week they are appointed');
  assert(eligibleInstructors(g.s, course, courseId).some((f) => f.id === hire.id), 'the hire can take the course');
  g.act({ type: 'REASSIGN_COURSE_FACULTY', courseId, facultyId: hire.id });
  const moved = now(g.s);
  playWeek(g, idle);
  playWeek(g, idle);
  assert(spansOf(first()).length === 1 && spansOf(first())[0].to === moved - 1, 'the old span closes at the last week it was taught');
  assert(spansOf(second()).length === 1 && spansOf(second())[0].from === moved && spansOf(second())[0].to === moved + 1, 'the new instructor opens their own');

  // Back again, after a gap: a second span, not the first stretched.
  g.act({ type: 'REASSIGN_COURSE_FACULTY', courseId, facultyId: firstId });
  const back = now(g.s);
  playWeek(g, idle);
  const spans = spansOf(first());
  assert(spans.length === 2 && spans[1].from === back && spans[1].to === back, 'a course back after a gap opens a second span');
  assert(spansOf(second())[0].to === back - 1, "and the hire's closes");

  // Whoever leaves takes the record with them.
  g.act({ type: 'FIRE_FACULTY', facultyId: hire.id });
  assert(!g.s.faculty.some((f) => f.id === hire.id) && !g.s.candidates.some((c) => c.id === hire.id), 'a professor who leaves keeps nothing here');
  assert(brokenRules(g.s).length === 0, `and the college holds every rule: ${brokenRules(g.s).join('; ')}`);
}

// ---- A project and a prize land on the record ----
{
  const s = structuredClone(loaded);
  const [a, b] = s.faculty;
  const run: Initiative = {
    labId: 'LAB', topicId: 'TOPIC', depth: 'program', participantIds: [a.id, b.id],
    weeksTotal: 3 * WEEKS_PER_YEAR, weeksRemaining: 0, publications: 4, breakthroughs: 1, grantIncome: 0, banked: 0,
  };
  recordProject(s, run, [a, b], false, { facultyId: b.id, prizeName: 'The Test Medal' });
  assert(a.career!.research.length === 1 && b.career!.research.length === 1, 'a finished project lands on each participant');
  const line = a.career!.research[0];
  assert(line.topicId === 'TOPIC' && line.depth === 'program' && line.years === 3 && line.year === s.clock.year
    && line.publications === 4 && line.breakthroughs === 1 && !line.cancelled, 'with its topic, depth, years and outcome');
  assert(a.career!.prizes.length === 0, 'the prize lands on the winner only');
  const prize = b.career!.prizes[0];
  assert(prize?.name === 'The Test Medal' && prize.year === s.clock.year && prize.topicId === 'TOPIC', 'by name, year and project');

  const cut: Initiative = { ...run, weeksTotal: 2 * WEEKS_PER_YEAR, weeksRemaining: WEEKS_PER_YEAR };
  recordProject(s, cut, [a], true, null);
  const wound = a.career!.research[1];
  assert(wound.cancelled === true && wound.years === 1, 'a project wound up early is marked so, with the time it ran');
}

// ---- A guided run: projects, prizes and a mark a year, from the real paths ----
{
  const g = foundGame({ from: loaded, seed: 12345 });
  const acclaimAtLoad = new Map(loaded.faculty.map((f) => [f.id, f.acclaim]));
  const startYear = g.s.clock.year;
  let broken: string[] = [];
  playYears(g, createGuidedPlayer(), 6, (game) => {
    if (broken.length === 0) broken = brokenRules(game.s);
  });
  assert(broken.length === 0, `six guided years hold every rule: ${broken.join('; ')}`);
  const research = g.s.faculty.reduce((n, f) => n + f.career!.research.length, 0);
  assert(research > 0, `projects land on the record (${research} lines)`);
  const prizesRight = g.s.faculty.every((f) => f.career!.prizes.length === f.acclaim - (acclaimAtLoad.get(f.id) ?? 0));
  assert(prizesRight, 'every prize won since is on its winner, and no other');
  const marksRight = g.s.faculty.every((f) => {
    const c = f.career!;
    const firstYear = Math.max(startYear, Math.floor((c.arrivedWeek - 1) / WEEKS_PER_YEAR) + 1);
    const expected = g.s.clock.year - firstYear;
    return c.years.length === expected && c.years.every((m, i) => i === 0 || m[0] === c.years[i - 1][0] + 1);
  });
  assert(marksRight, 'each professor has one mark for every year ended on the roster');
  const spans = g.s.faculty.reduce((n, f) => n + f.career!.courses.length, 0);
  const taught = new Set(Object.values(g.s.courseFaculty)).size;
  assert(spans >= taught && taught > 0, `courses taught have spans (${spans} spans, ${taught} teaching)`);
}

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
