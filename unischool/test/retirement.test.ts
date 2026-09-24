// Retirement (src/systems/faculty/facultySystem.ts): a career of 25 to 40
// years at the college, read from the id; a year's notice, then gone, and
// their courses wait for a new instructor.

import { createInitialState } from '../src/state/actions';
import { CAREER_MIN_YEARS, CAREER_SPAN_YEARS, careerWeeks, tickFaculty } from '../src/systems/faculty/facultySystem';
import { bindScriptStream } from '../src/engine/random';
import { WEEKS_PER_YEAR } from '../src/state/types';

bindScriptStream(2930);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('retirement tests');

{
  const careers = Array.from({ length: 2000 }, (_, i) => careerWeeks(`p${i}`) / WEEKS_PER_YEAR);
  assert(careers.every((y) => y >= CAREER_MIN_YEARS && y <= CAREER_MIN_YEARS + CAREER_SPAN_YEARS && Number.isInteger(y)), `every career is ${CAREER_MIN_YEARS} to ${CAREER_MIN_YEARS + CAREER_SPAN_YEARS} whole years`);
  assert(new Set(careers).size === CAREER_SPAN_YEARS + 1, 'and every length turns up');
  assert(careerWeeks('p1') === careerWeeks('p1'), 'the same id, the same career');
}

{
  const s = createInitialState('Retirement');
  const f = s.faculty[0];
  const career = careerWeeks(f.id);
  const taught = Object.entries(s.courseFaculty).filter(([, id]) => id === f.id).map(([course]) => course);
  f.tenureWeeks = career - WEEKS_PER_YEAR - 1;
  tickFaculty(s);
  assert(s.log[0]?.message.includes('will retire a year from now'), 'a year out, the log gives notice');
  f.tenureWeeks = career - 1;
  tickFaculty(s);
  assert(!s.faculty.some((x) => x.id === f.id), 'at the end of the career they retire');
  assert(s.log.some((l) => l.message.startsWith(`${f.name} retires`)), 'and the log says so');
  assert(taught.every((course) => s.courseFaculty[course] === undefined), 'their courses wait for a new instructor');
  const young = s.faculty[0];
  young.tenureWeeks = 0;
  const before = s.faculty.length;
  for (let i = 0; i < WEEKS_PER_YEAR; i++) tickFaculty(s);
  assert(s.faculty.length === before, 'nobody retires in their first years');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
