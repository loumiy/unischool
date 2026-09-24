// ---------------------------------------------------------------------
// Toasts (Plan 16's PR G): which log lines become one, where a click goes,
// and how the stack behaves (src/components/toasts.ts, the pure half of
// Toasts.tsx). Also the one log line PR G adds: a candidate listed in a
// field the school is short in (facultySystem.ts's tickCandidatePool).
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { isToastable, newToasts, pushToasts, TOAST_MAX, TOAST_TOPICS, toastKey, toastTarget } from '../src/components/toasts';
import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { neededFacultyFields } from '../src/systems/techtree/techSystem';
import type { LogEntry, LogTopic } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const line = (week: number, message: string, topic?: LogTopic): LogEntry => ({ year: 3, week, message, kind: 'info', topic });

console.log('toast tests');

// --- what toasts, and what does not ------------------------------------------
{
  for (const topic of ['course', 'building', 'program', 'petition', 'publication', 'candidate', 'research-concluded'] as LogTopic[]) {
    assert(isToastable(line(1, 'x', topic)), `${topic} toasts`);
  }
  // Everything an interrupt already announces, and everything the summer sums up.
  for (const topic of ['milestone', 'research-reported', 'admissions', 'attrition', 'report-card', 'money', 'organisations', 'demand-raised'] as LogTopic[]) {
    assert(!isToastable(line(1, 'x', topic)), `${topic} does not toast — something else already says it`);
  }
  assert(!isToastable(line(1, 'untagged texture')), 'an untagged line never toasts');
  assert(TOAST_TOPICS.size === 7, 'the list is the plan\'s seven');
}

// --- where a click goes -----------------------------------------------------
{
  assert(toastTarget('course') === 'curriculum' && toastTarget('program') === 'curriculum', 'courses and programs open the Curriculum');
  assert(toastTarget('petition') === 'students', 'a petition opens the Students tab');
  assert(toastTarget('publication') === 'research' && toastTarget('research-concluded') === 'research', 'research opens Research');
  assert(toastTarget('candidate') === 'faculty', 'a candidate opens Faculty');
  assert(toastTarget('building') === null, 'a building points at the map, which is already behind the toast');
}

// --- the stack: unseen lines only, oldest first, five deep ------------------
{
  const log = [line(9, 'nine', 'course'), line(8, 'eight'), line(7, 'seven', 'petition'), line(6, 'six', 'course'), line(5, 'five', 'publication')];
  const seen = new Set([toastKey(log[3]), toastKey(log[4])]);
  const fresh = newToasts(log, seen);
  assert(fresh.map((e) => e.message).join(',') === 'seven,nine', `the unseen toastable lines, oldest first, stopping at the first seen line (${fresh.map((e) => e.message).join(', ')})`);
  assert(newToasts(log, new Set(log.map(toastKey))).length === 0, 'a fully seen log yields nothing — a resumed save opens on silence');

  const stack = pushToasts([1, 2, 3, 4], [5, 6, 7]);
  assert(stack.length === TOAST_MAX && stack.join(',') === '3,4,5,6,7', `the stack keeps the newest ${TOAST_MAX}, dropping the oldest`);
  assert(toastKey(line(1, 'same', 'course')) === toastKey(line(1, 'same', 'course')), 'identity is the stamp and the text, not the object');
}

// --- a candidate in a short field is logged; the rest of the churn is not --
{
  let s = createInitialState('Market');
  // Make one field short: a course available in a field nobody teaches.
  const course = s.tech.find((t) => t.kind === 'course' && t.status === 'locked' && t.requiresFaculty && !s.faculty.some((f) => f.field === t.requiresFaculty))!;
  course.status = 'available';
  const field = course.requiresFaculty!;
  assert(neededFacultyFields(s).has(field), `${field} reads as short once a course in it is available with nobody to teach it`);

  // Week by week: every arrival in a short field has a candidate line
  // naming them at the top of the log, and no arrival elsewhere does.
  let shortArrivals = 0;
  let otherArrivals = 0;
  let wrong = 0;
  for (let i = 0; i < 300 && s.clock.year === 1; i += 1) {
    if (s.pendingInterrupt) { s = reducer(s, { type: 'RESOLVE_REPORT' }); continue; }
    const short = neededFacultyFields(s);
    const before = new Set(s.candidates.map((c) => c.id));
    s = reducer(s, { type: 'TICK' });
    for (const c of s.candidates) {
      if (before.has(c.id)) continue;
      const announced = s.log.some((e) => e.topic === 'candidate' && e.subject === c.id);
      if (short.has(c.field)) { shortArrivals += 1; if (!announced) wrong += 1; }
      else { otherArrivals += 1; if (announced) wrong += 1; }
    }
  }
  assert(shortArrivals > 0, `somebody in a short field was listed inside the year (${shortArrivals})`);
  assert(otherArrivals > 0, `and plenty of people in fields that were not (${otherArrivals})`);
  assert(wrong === 0, `every short-field arrival was announced and no other was (${wrong} wrong)`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
