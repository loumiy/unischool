// ---------------------------------------------------------------------
// The Faculty tab's sort and filter (Plan 72F, tabs/facultySort.ts): each
// order is the one it names, ties go by name so a week's growth never
// shuffles equals, years left counts to retirement, and the department
// filter and the short-staffed toggle show what they say.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { bindScriptStream } from '../src/engine/random';
import { generateCandidate } from '../src/data/facultyData';
import { FACULTY_SORTS, compareFaculty, showsDepartment, yearsLeft } from '../src/tabs/facultySort';
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
  ...generateCandidate('History'), id: `f-${i}`, name: `Prof ${String.fromCharCode(76 - i)}`, tenureWeeks: i * 90,
}));
// Two exact ties, to see the name decide.
people[3].teaching = people[4].teaching;

{
  assert(FACULTY_SORTS.map((o) => o.id).join() === 'teaching,research,salary,years,name', 'five orders, teaching first');
  const sorted = (key: Parameters<typeof compareFaculty>[0]) => [...people].sort(compareFaculty(key));
  const descending = (xs: number[]) => xs.every((x, i) => i === 0 || xs[i - 1] >= x);
  assert(descending(sorted('teaching').map((f) => f.teaching)), 'teaching: strongest first');
  assert(descending(sorted('research').map((f) => f.research)), 'research: strongest first');
  assert(descending(sorted('salary').map((f) => f.salary)), 'salary: dearest first');
  assert(descending(sorted('years').map(yearsLeft)), 'years left: longest first');
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

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
