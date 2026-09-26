// "Worth taking" (systems/faculty/hiringNext.ts, Plan 70E): the Faculty
// tab's strip recommends only a listing that would teach its waiting course
// at a C or better. Read on the launch fixture, a year-25 college with a
// market of thirty listings.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readSave } from '../src/state/persistence';
import { waitingCourses, worthTaking } from '../src/systems/faculty/hiringNext';
import { neededFacultyFields } from '../src/systems/techtree/techSystem';
import { projectedQuality } from '../src/systems/faculty/facultyAssignment';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('worth taking tests');

const read = readSave(readFileSync(join(process.cwd(), 'test/fixtures/save-launch.json'), 'utf8'));
if ('refused' in read) {
  assert(false, `the launch fixture loads (${read.refused})`);
} else {
  const s = read.state;
  const listings = worthTaking(s);
  assert(listings.every((l) => l.grade !== 'D' && l.grade !== 'F'), 'no D or F listing is recommended');
  // Every candidate in a short department who would teach at C or better is
  // still recommended.
  let good = 0;
  for (const field of neededFacultyFields(s)) {
    const course = waitingCourses(s, field)[0];
    for (const c of s.candidates.filter((x) => x.field === field)) {
      const grade = course ? projectedQuality(s, course, c).grade : null;
      if (grade === null || (grade !== 'D' && grade !== 'F')) good += 1;
    }
  }
  assert(listings.length === good, `every C-or-better listing in a short department is kept (${listings.length} of ${good})`);
}

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
