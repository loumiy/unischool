// ---------------------------------------------------------------------
// The Faculty tab's sort and filter (Plans 72F and 84D, tabs/facultySort.ts):
// each order is the one it names, ties go by name so a week's growth never
// shuffles equals, years left counts to retirement, years here reads the
// arrival, the grid's filters (field or division, retiring soon, can take a
// course, search) show what they say, and so do the department filter and
// the short-staffed toggle. A stat's letter is the course grade's.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { bindScriptStream } from '../src/engine/random';
import { generateCandidate } from '../src/data/facultyData';
import {
  FACULTY_SORTS, GROUP_SCOPE, NO_GRID_FILTER, compareFaculty, letterOf, potentialOf, retiringSoon, showsDepartment, showsPerson, yearsLeft,
} from '../src/tabs/facultySort';
import { emptyCareer } from '../src/systems/faculty/career';
import { GRADE_A, GRADE_B } from '../src/data/courseQuality';
import { careerWeeks } from '../src/systems/faculty/facultySystem';
import { WEEKS_PER_YEAR, type Faculty } from '../src/state/types';

bindScriptStream(7274);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('faculty sort tests');

const people: Faculty[] = Array.from({ length: 12 }, (_, i) => ({
  ...generateCandidate(i < 6 ? 'History' : 'Physics'), id: `f-${i}`, name: `Prof ${String.fromCharCode(76 - i)}`, tenureWeeks: i * 90,
  career: emptyCareer(1000 - i * 90),
}));
// Two exact ties, to see the name decide.
people[3].teaching = people[4].teaching;

{
  assert(FACULTY_SORTS.map((o) => o.id).join() === 'teaching,research,potential,salary,here,years,name', 'seven orders, teaching first');
  const sorted = (key: Parameters<typeof compareFaculty>[0]) => [...people].sort(compareFaculty(key));
  const descending = (xs: number[]) => xs.every((x, i) => i === 0 || xs[i - 1] >= x);
  assert(descending(sorted('teaching').map((f) => f.teaching)), 'teaching: strongest first');
  assert(descending(sorted('research').map((f) => f.research)), 'research: strongest first');
  assert(descending(sorted('salary').map((f) => f.salary)), 'salary: dearest first');
  assert(descending(sorted('years').map(yearsLeft)), 'years left: longest first');
  assert(descending(sorted('potential').map(potentialOf)), 'potential: the most to come first');
  const here = sorted('here').map((f) => f.career!.arrivedWeek);
  assert(here.every((w, i) => i === 0 || here[i - 1] <= w), 'years here: the earliest arrival first');
  const candidate = { ...people[0], id: 'c', career: undefined };
  assert([candidate, ...people].sort(compareFaculty('here'))[people.length] === candidate, 'and a candidate, who has not arrived, last');
  const names = sorted('name').map((f) => f.name);
  assert(names.join() === [...names].sort((a, b) => a.localeCompare(b)).join(), 'name: A to Z');
  const byTeaching = sorted('teaching');
  const i3 = byTeaching.indexOf(people[3]);
  const i4 = byTeaching.indexOf(people[4]);
  assert(Math.abs(i3 - i4) === 1 && byTeaching[Math.min(i3, i4)].name < byTeaching[Math.max(i3, i4)].name, 'a tie goes by name');
  const f = people[5];
  assert(yearsLeft(f) === Math.ceil((careerWeeks(f.id) - f.tenureWeeks) / WEEKS_PER_YEAR), `years left counts to retirement (${yearsLeft(f)})`);
  assert(yearsLeft({ ...f, tenureWeeks: careerWeeks(f.id) + 10 }) === 0, 'and never below zero');
}

{
  const all = { field: null, shortOnly: false };
  assert(showsDepartment(all, 'History', 'ok') && showsDepartment(all, 'Physics', 'short'), 'no filter shows every department');
  assert(showsDepartment({ field: 'History', shortOnly: false }, 'History', 'ok') && !showsDepartment({ field: 'History', shortOnly: false }, 'Physics', 'ok'), 'a department shows only itself');
  const short = { field: null, shortOnly: true };
  assert(showsDepartment(short, 'Physics', 'short') && showsDepartment(short, 'Physics', 'over'), 'short-staffed shows the short and the over-committed');
  assert(!showsDepartment(short, 'Physics', 'ok') && !showsDepartment(short, 'Physics', 'empty'), 'and not the rest');
  assert(!showsDepartment({ field: 'History', shortOnly: true }, 'History', 'ok'), 'the two together: that department, if short');
}

{
  // Letters on the course-grade bands.
  assert(letterOf(GRADE_A) === 'A' && letterOf(GRADE_A - 1) === 'B' && letterOf(GRADE_B) === 'B' && letterOf(GRADE_B - 1) === 'C', 'a stat reads as the course grade would: A from 78, B from 62');

  // The grid's filters.
  const shows = (filter: typeof NO_GRID_FILTER, canTake = false) => people.filter((f) => showsPerson(filter, f, canTake));
  assert(shows(NO_GRID_FILTER).length === people.length, 'no filter shows everybody');
  assert(shows({ ...NO_GRID_FILTER, scope: 'Physics' }).every((f) => f.field === 'Physics') && shows({ ...NO_GRID_FILTER, scope: 'Physics' }).length === 6, 'a field shows only its people');
  const sciences = shows({ ...NO_GRID_FILTER, scope: `${GROUP_SCOPE}Natural sciences & mathematics` });
  assert(sciences.length === 6 && sciences.every((f) => f.field === 'Physics'), 'a division shows the fields in it');
  const old = { ...people[0], tenureWeeks: careerWeeks(people[0].id) - 10 };
  assert(retiringSoon(old) && !retiringSoon(people[0]), 'retiring soon: the year of notice, and not before');
  assert(!retiringSoon({ ...old, career: undefined }), 'never a candidate');
  assert(showsPerson({ ...NO_GRID_FILTER, retiring: true }, old, false) && !showsPerson({ ...NO_GRID_FILTER, retiring: true }, people[0], false), 'the retiring toggle shows only them');
  assert(shows({ ...NO_GRID_FILTER, canTake: true }, false).length === 0 && shows({ ...NO_GRID_FILTER, canTake: true }, true).length === people.length, 'can take a course shows who can');
  const named = people[3];
  assert(showsPerson({ ...NO_GRID_FILTER, query: named.name.toUpperCase() }, named, false), 'search finds a name, in any case');
  assert(shows({ ...NO_GRID_FILTER, query: 'physics' }).length === 6, 'and a field');
  assert(shows({ ...NO_GRID_FILTER, query: 'no such person anywhere' }).length === 0, 'and nothing for nobody');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
