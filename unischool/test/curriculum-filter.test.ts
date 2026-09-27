// ---------------------------------------------------------------------
// The Curriculum tab's filters (Plan 76B, tabs/curriculumFilter.ts): each
// returns the courses it names. Read on a college the guided player has
// run for eight years, the year the review found the tab at its heaviest.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { foundGame, playYears } from '../sim/harness/game';
import { createGuidedPlayer } from '../sim/harness/guided';
import { NO_FILTERS, filtersActive, matchesFilters, type Filters } from '../src/tabs/curriculumFilter';
import { courseQuality, facultyLoads } from '../src/systems/faculty/facultyAssignment';
import { isUnstaffed } from '../src/systems/techtree/techSystem';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('curriculum filter tests');

const g = foundGame({ seed: 12345 });
playYears(g, createGuidedPlayer(), 8);
const s = g.s;
// A course taught with nobody in the post, to see the unstaffed filters.
const taught = s.tech.filter((t) => t.kind === 'course' && t.status === 'done');
const vacated = taught[taught.length - 1];
delete s.courseFaculty[vacated.id];
const loads = facultyLoads(s);
const courses = s.tech.filter((t) => t.kind === 'course');
const matching = (f: Partial<Filters>) => new Set(courses.filter((t) => matchesFilters(s, t, { ...NO_FILTERS, ...f }, loads)).map((t) => t.id));
const gradeOf = (id: string) => courseQuality(s, courses.find((t) => t.id === id)!, loads)?.grade;

{
  assert(!filtersActive(NO_FILTERS), 'no filter is no filter');
  assert(filtersActive({ ...NO_FILTERS, grade: 'belowA' }), 'Below A is a filter');

  const belowA = matching({ grade: 'belowA' });
  const weak = matching({ grade: 'weak' });
  const unstaffed = matching({ status: 'unstaffed' });
  assert(belowA.size > 0, `the college has courses below an A (${belowA.size})`);
  assert(unstaffed.has(vacated.id), 'the vacated course has no instructor');
  assert([...unstaffed].every((id) => isUnstaffed(s, courses.find((t) => t.id === id)!)), 'No instructor returns only unstaffed courses');
  assert([...weak].every((id) => belowA.has(id)), 'every course that needs attention is below an A');
  for (const t of courses) {
    const grade = gradeOf(t.id);
    if (grade === undefined) continue;
    assert(belowA.has(t.id) === (grade !== 'A'), `${t.id} (${grade}): Below A ${grade !== 'A' ? 'takes' : 'leaves'} it`);
    assert(weak.has(t.id) === (grade === 'D' || grade === 'F'), `${t.id} (${grade}): Needs attention ${grade === 'D' || grade === 'F' ? 'takes' : 'leaves'} it`);
  }
  assert(belowA.has(vacated.id) && weak.has(vacated.id), 'an unstaffed course is in both grade worklists');
  const both = matching({ grade: 'belowA', status: 'unstaffed' });
  assert(both.size === [...unstaffed].filter((id) => belowA.has(id)).length, `filters combine (${both.size} of ${unstaffed.size} unstaffed, ${[...unstaffed].filter((id) => belowA.has(id)).length} below A)`);
}

console.log(`  ${failures === 0 ? '✓' : '✗'} ${checks - failures} of ${checks} checks passed`);
if (failures > 0) process.exit(1);
