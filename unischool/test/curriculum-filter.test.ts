// ---------------------------------------------------------------------
// The Curriculum tab's filters (Plan 76B, tabs/curriculumFilter.ts): each
// returns the courses it names. Read on a college the guided player has
// run for eight years, the year the review found the tab at its heaviest.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { foundGame, playYears } from '../sim/harness/game';
import { createGuidedPlayer } from '../sim/harness/guided';
import { NO_FILTERS, filtersActive, matchesFilters, oneFromEstablished, type Filters } from '../src/tabs/curriculumFilter';
import { courseQuality, facultyLoads, instructorQuality } from '../src/systems/faculty/facultyAssignment';
import { isUnstaffed } from '../src/systems/techtree/techSystem';
import { unstaffedPrograms } from '../src/systems/techtree/darkness';
import { programOfCourse, programs } from '../src/data/techData';
import { programProgress, tierBands } from '../src/systems/techtree/programProgress';
import type { GameState } from '../src/state/types';

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
// A course taught with nobody in the post, to see the unstaffed filters: in
// a program with other courses taught, which it darkens.
const taught = s.tech.filter((t) => t.kind === 'course' && t.status === 'done');
const vacated = [...taught].reverse().find((t) => taught.filter((x) => programOfCourse(x.id) === programOfCourse(t.id)).length >= 3)!;
delete s.courseFaculty[vacated.id];
const loads = facultyLoads(s);
const courses = s.tech.filter((t) => t.kind === 'course');
const matching = (f: Partial<Filters>) => new Set(courses.filter((t) => matchesFilters(s, t, { ...NO_FILTERS, ...f }, loads)).map((t) => t.id));
const gradeOf = (id: string) => courseQuality(s, courses.find((t) => t.id === id)!, loads)?.grade;

{
  assert(!filtersActive(NO_FILTERS), 'no filter is no filter');
  assert(filtersActive({ ...NO_FILTERS, grade: 'belowA' }), 'Below A is a filter');

  const belowA = matching({ grade: 'belowA' });
  const unstaffed = matching({ status: 'unstaffed' });
  assert(belowA.size > 0, `the college has courses below an A (${belowA.size})`);
  assert(unstaffed.has(vacated.id), 'the vacated course has no instructor');
  assert([...unstaffed].every((id) => isUnstaffed(s, courses.find((t) => t.id === id)!)), 'No instructor returns only unstaffed courses');
  for (const t of courses) {
    const grade = gradeOf(t.id);
    if (grade === undefined) continue;
    assert(belowA.has(t.id) === (grade !== 'A'), `${t.id} (${grade}): Below A ${grade !== 'A' ? 'takes' : 'leaves'} it`);
  }
  assert(belowA.has(vacated.id), 'an unstaffed course is in the Below A worklist');

  // A dark program's courses have no grade (Plan 80B): Below A reads the
  // grade their instructors earn, so a weak one is still listed.
  const darkId = programOfCourse(vacated.id)!;
  assert(unstaffedPrograms(s).has(darkId), `the vacated course darkens ${darkId}`);
  const darkTaught = courses.filter((t) => programOfCourse(t.id) === darkId && t.id !== vacated.id && instructorQuality(s, t, loads) !== null);
  assert(darkTaught.length > 0, `${darkId} has courses still assigned a teacher (${darkTaught.length})`);
  for (const t of darkTaught) {
    const grade = instructorQuality(s, t, loads)!.grade;
    assert(courseQuality(s, t, loads) === null, `${t.id} has no grade while its program is dark`);
    assert(belowA.has(t.id) === (grade !== 'A'), `${t.id} (dark, ${grade} by its teacher): Below A ${grade !== 'A' ? 'takes' : 'leaves'} it`);
  }
  // And a weak one for certain: its teacher at the bottom of the scale.
  const weakDark = JSON.parse(JSON.stringify(s)) as GameState;
  const course = darkTaught[0];
  const teacher = weakDark.faculty.find((f) => f.id === weakDark.courseFaculty[course.id])!;
  teacher.teaching = 1;
  teacher.acclaim = 0;
  const weakCourse = weakDark.tech.find((t) => t.id === course.id)!;
  assert(courseQuality(weakDark, weakCourse, facultyLoads(weakDark)) === null, 'the weak course has no grade while dark');
  assert(matchesFilters(weakDark, weakCourse, { ...NO_FILTERS, grade: 'belowA' }, facultyLoads(weakDark)), `a weak course in a dark program (${instructorQuality(weakDark, weakCourse)?.grade}) is below an A`);
  assert(!matchesFilters(weakDark, { ...weakCourse, status: 'available' }, { ...NO_FILTERS, grade: 'belowA' }, facultyLoads(weakDark)), 'a course not yet offered is not');
  const both = matching({ grade: 'belowA', status: 'unstaffed' });
  assert(both.size === [...unstaffed].filter((id) => belowA.has(id)).length, `filters combine (${both.size} of ${unstaffed.size} unstaffed, ${[...unstaffed].filter((id) => belowA.has(id)).length} below A)`);
}

// One course from established (Plan 80B): the last not-done course among a
// major's entry course and tier-2 quartet, and nothing else.
{
  assert(filtersActive({ ...NO_FILTERS, nearEstablished: true }), 'One course from established is a filter');
  const lookup = new Map(s.tech.map((t) => [t.id, t]));
  const expected = new Set<string>();
  for (const program of programs()) {
    const progress = programProgress(s, program, lookup);
    if (progress.milestone !== 'established' || progress.toMilestone !== 1) continue;
    const bands = tierBands(program)!;
    for (const id of [...bands.entry, ...bands.tier2]) if (lookup.get(id)?.status !== 'done') expected.add(id);
  }
  const near = matching({ nearEstablished: true });
  assert(near.size === expected.size && [...near].every((id) => expected.has(id)), `it lists the last course of each program one from established (${near.size}, expected ${expected.size})`);

  // Made so: an established major with one tier-2 course undone again.
  const one = JSON.parse(JSON.stringify(s)) as GameState;
  const established = programs().find((p) => {
    const bands = tierBands(p);
    return bands && [...bands.entry, ...bands.tier2].every((id) => one.tech.find((t) => t.id === id)?.status === 'done');
  });
  assert(established !== undefined, 'the college has an established major');
  if (established) {
    const bands = tierBands(established)!;
    const undone = one.tech.find((t) => t.id === bands.tier2[2])!;
    undone.status = 'available';
    const oneLoads = facultyLoads(one);
    const hits = established.courseIds.filter((id) => matchesFilters(one, one.tech.find((t) => t.id === id)!, { ...NO_FILTERS, nearEstablished: true }, oneLoads));
    assert(hits.length === 1 && hits[0] === undone.id, `${established.name}: only ${undone.id} is listed (${hits.join(', ')})`);
    undone.status = 'developing';
    assert(oneFromEstablished(one, undone), 'and it stays listed once under way');
    one.tech.find((t) => t.id === bands.tier2[1])!.status = 'available';
    assert(!oneFromEstablished(one, undone), 'two courses from established is not one');
    assert(!oneFromEstablished(one, one.tech.find((t) => t.id === bands.tier3[0])!), 'a tier-3 course never is');
  }
}

console.log(`  ${failures === 0 ? '✓' : '✗'} ${checks - failures} of ${checks} checks passed`);
if (failures > 0) process.exit(1);
