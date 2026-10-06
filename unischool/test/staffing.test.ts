// ---------------------------------------------------------------------
// Staff for the A (Plan 95S, the second review's B4-5): the Provost's
// teaching policy, and a Dean's for its school when there is no Provost
// (systems/delegation/seats.ts's staffForTheA and tickStaffing). What is
// worth pinning:
//
//   - a course below A moves to the best free instructor in its field only
//     when they would teach it a full letter or more better;
//   - never past the newcomer's course slots;
//   - at most one move a course a week, and no churn the week after;
//   - only a seat on the policy acts: the Provost for every course, a Dean
//     for its own school and only with no Provost;
//   - the policy saves;
//   - History › Prestige's teaching line links to the Curriculum's Below A,
//     with the count Below A lists.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { teachingCollege, teachingCourseIds } from './fixtures/teaching';
import { reducer } from '../src/engine/reducer';
import { staffForTheA, staffingCovers, staffingSeats, tickStaffing } from '../src/systems/delegation/seats';
import { STAFFING_POLICY } from '../src/data/seatData';
import { instructorQuality, projectedQuality, facultyLoads } from '../src/systems/faculty/facultyAssignment';
import { effectiveCourseSlots } from '../src/systems/techtree/techSystem';
import { lettersBetter } from '../src/data/courseQuality';
import { programById, programOfCourse } from '../src/data/techData';
import { schoolFoundedKey } from '../src/systems/techtree/schools';
import { loadGame, saveGame } from '../src/state/persistence';
import { bindScriptStream } from '../src/engine/random';
import { BELOW_A_FILTERS, BELOW_A_TARGET, belowACount, matchesFilters, targetFilters } from '../src/tabs/curriculumFilter';
import HistoryTab from '../src/tabs/HistoryTab';
import type { Buildable, Faculty, GameState } from '../src/state/types';

bindScriptStream(9595);
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

console.log('staffing tests');

function fresh(): GameState {
  const s = teachingCollege('Staffing');
  s.pendingInterrupt = null;
  s.finance.cash = 50_000_000;
  s.finance.weeklyOpEx = 1_000_000;
  return s;
}

const course = (s: GameState, id: string): Buildable => s.tech.find((t) => t.id === id)!;
const teacherOf = (s: GameState, id: string): Faculty => s.faculty.find((f) => f.id === s.courseFaculty[id])!;
const schoolOf = (id: string) => programById(programOfCourse(id)!)!.school;

// A newcomer in `f`'s field: a copy of them with their own id, name,
// teaching and slots, teaching nothing yet.
function newcomer(s: GameState, f: Faculty, id: string, teaching: number, courseSlots = 3): Faculty {
  const n: Faculty = { ...f, id, name: `Dr. ${id} Test`, teaching, teachingPotential: teaching, acclaim: 0, courseSlots };
  s.faculty.push(n);
  return n;
}

// The two courses a founding professor teaches, and that professor, made weak.
function weakPair(s: GameState, teaching: number): { ids: string[]; teacher: Faculty } {
  const ids = teachingCourseIds().slice(0, 2);
  const teacher = teacherOf(s, ids[0]);
  assert(ids.every((id) => s.courseFaculty[id] === teacher.id), 'the fixture\'s first professor teaches its first two courses');
  teacher.teaching = teaching;
  teacher.acclaim = 0;
  return { ids, teacher };
}

// ---- The policy, as data ----
{
  const s = fresh();
  assert(staffingSeats(s).length === 0, 'no seats, no staffing');
  const { ids, teacher } = weakPair(s, 30);
  newcomer(s, teacher, 'quinn', 95);
  const before = { ...s.courseFaculty };
  tickStaffing(s);
  assert(JSON.stringify(before) === JSON.stringify(s.courseFaculty), 'with no seat on the policy, nobody is moved');
  assert(!staffingCovers(s, course(s, ids[0])), 'and no course is covered');
}

// ---- The full-letter rule ----
{
  const s = fresh();
  const { ids, teacher } = weakPair(s, 50);
  const t = course(s, ids[0]);
  const now = instructorQuality(s, t)!;
  assert(now.grade !== 'A', `the weak course is below A (${now.grade})`);
  // The strongest newcomer who still teaches it in the same letter, and the
  // weakest who teaches it a letter better.
  const q = newcomer(s, teacher, 'quinn', teacher.teaching, 1);
  const grades = (teaching: number) => { q.teaching = teaching; return projectedQuality(s, t, q, facultyLoads(s)); };
  let same = teacher.teaching;
  while (same < 100 && lettersBetter(now.grade, grades(same + 1).grade) < 1) same += 1;
  const better = same + 1;
  assert(grades(same).score > now.score && grades(same).grade === now.grade, `at ${same} the newcomer teaches it better, in the same letter`);
  q.teaching = same;
  assert(staffForTheA(s, null).length === 0, 'better in the same letter: no move, so the seat does not churn');
  q.teaching = better;
  const moves = staffForTheA(s, null);
  assert(moves.some((m) => m.courseId === t.id && m.facultyId === q.id), `a full letter better (${now.grade} to ${grades(better).grade}): the course moves`);
}

// ---- Never past the course slots ----
{
  const s = fresh();
  const { ids, teacher } = weakPair(s, 30);
  const q = newcomer(s, teacher, 'quinn', 95, 1);
  const moves = staffForTheA(s, null);
  assert(moves.length === 1, `a newcomer with one slot takes one course (${moves.length})`);
  const load = ids.filter((id) => s.courseFaculty[id] === q.id).length;
  assert(load === effectiveCourseSlots(s, q), 'and is then full');
  assert(staffForTheA(s, null).length === 0, 'a full instructor is not free: nothing more moves');
  assert(ids.some((id) => s.courseFaculty[id] === teacher.id), 'the other course keeps its teacher');
}

// ---- One move a course a week, and no churn ----
{
  const s = fresh();
  const { teacher } = weakPair(s, 30);
  newcomer(s, teacher, 'quinn', 90);
  newcomer(s, teacher, 'reyes', 96);
  const moves = staffForTheA(s, null);
  assert(moves.length > 0, 'weak courses with strong free instructors move');
  assert(new Set(moves.map((m) => m.courseId)).size === moves.length, 'each course at most once in the week');
  assert(moves.every((m) => lettersBetter(m.from, m.to) >= 1), 'each for a full letter or more');
  assert(staffForTheA(s, null).length === 0, 'and the week after, nothing more: no churn');
}

// ---- Who staffs: the Provost, or a Dean for its school ----
{
  let s = fresh();
  const [first] = teachingCourseIds();
  const other = teachingCourseIds().find((id) => schoolOf(id) !== schoolOf(first))!;
  assert(other !== undefined, 'the fixture teaches in two schools');
  for (const id of [first, other]) {
    const f = teacherOf(s, id);
    f.teaching = 30;
    f.acclaim = 0;
    newcomer(s, f, `new-${id}`, 95);
  }
  const school = schoolOf(first);
  s.milestones[schoolFoundedKey(school)] = true;
  s = reducer(s, { type: 'APPOINT_SEAT', seatId: 'dean', school });
  tickStaffing(s);
  assert(s.courseFaculty[first] !== `new-${first}`, 'a Dean on the default policy does not staff');
  s = reducer(s, { type: 'SET_SEAT_POLICY', seatId: 'dean', school, policy: STAFFING_POLICY });
  assert(staffingCovers(s, course(s, first)) && !staffingCovers(s, course(s, other)), 'a Dean on Staff for the A covers its own school only');
  tickStaffing(s);
  assert(s.courseFaculty[first] === `new-${first}`, 'and moves its school\'s course');
  assert(s.courseFaculty[other] !== `new-${other}`, 'and not another school\'s');
  assert(s.log.some((l) => l.message.includes(`Dr. new-${first} Test onto ${course(s, first).name.split(' · ')[0]}`) && l.message.includes(' moved ')), `the move is logged (${s.log[0]?.message})`);

  s = reducer(s, { type: 'APPOINT_SEAT', seatId: 'provost', school: null });
  assert(staffingSeats(s).length === 0, 'with a Provost on the default policy, the Deans stand down');
  s = reducer(s, { type: 'SET_SEAT_POLICY', seatId: 'provost', school: null, policy: STAFFING_POLICY });
  assert(staffingCovers(s, course(s, other)), 'a Provost on Staff for the A covers every school');
  // Through the week's systems, as the game runs it (the faculty's week
  // first, which regrows everyone's teaching from their potential).
  s = reducer(s, { type: 'SKIP_OPENING' });
  s.started = true;
  s.pendingInterrupt = null;
  s = reducer(s, { type: 'TICK' });
  const line = s.log.find((l) => l.message.startsWith('Provost ') && l.message.includes(' moved '));
  assert(line !== undefined && line.message.includes(`Dr. new-${other} Test onto`), `the week's systems run the Provost's staffing (${line?.message})`);

  saveGame(s);
  assert(loadGame()?.seats?.find((x) => x.seatId === 'provost')?.policy === STAFFING_POLICY, 'the policy saves');
}

// ---- The link: History › Prestige opens the Curriculum on Below A ----
{
  const s = fresh();
  weakPair(s, 30);
  const n = belowACount(s);
  const loads = facultyLoads(s);
  assert(n > 0 && n === s.tech.filter((t) => matchesFilters(s, t, BELOW_A_FILTERS, loads)).length, `the count is Below A's (${n})`);
  assert(JSON.stringify(targetFilters(BELOW_A_TARGET)) === JSON.stringify(BELOW_A_FILTERS) && BELOW_A_FILTERS.grade === 'belowA', 'the link\'s target opens the Curriculum with Below A on');
  let opened: string | undefined;
  const html = renderToStaticMarkup(createElement(HistoryTab, { s, act: () => {}, view: 'prestige', onOpenCurriculum: (target: string) => { opened = target; } }));
  const label = n === 1 ? 'Show the course below A' : `Show the ${n} courses below A`;
  assert(html.includes(label), `History › Prestige's teaching line says "${label}"`);
  const bare = renderToStaticMarkup(createElement(HistoryTab, { s, act: () => {}, view: 'prestige' }));
  assert(!bare.includes('courses below A'), 'and without a way to open the Curriculum, no link');
  assert(opened === undefined, 'drawing it opens nothing');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
