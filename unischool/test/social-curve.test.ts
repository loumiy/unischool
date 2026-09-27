// ---------------------------------------------------------------------
// Student life's social bonus on a curve (Plan 72H, studentLifeData.ts):
// full up to STUDENT_LIFE_SOCIAL_FULL, then each point worth less than the
// last and never nothing, below FULL + SPAN; and campus-life standing still
// reads the old cap.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import {
  CLUB_SOCIAL_BONUS, STUDENT_LIFE_PRESTIGE_FULL, STUDENT_LIFE_SOCIAL_FULL, STUDENT_LIFE_SOCIAL_SPAN, studentLifeSocialCurve,
} from '../src/data/studentLifeData';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('social curve tests');

const f = studentLifeSocialCurve;
const top = STUDENT_LIFE_SOCIAL_FULL + STUDENT_LIFE_SOCIAL_SPAN;
assert(f(0) === 0 && f(10) === 10 && f(STUDENT_LIFE_SOCIAL_FULL) === STUDENT_LIFE_SOCIAL_FULL, 'full value up to the knee');
let last = f(STUDENT_LIFE_SOCIAL_FULL);
let lastStep = Infinity;
let ok = true;
for (let raw = STUDENT_LIFE_SOCIAL_FULL + 1; raw <= 150; raw += 1) {
  const step = f(raw) - last;
  if (!(step > 0 && step < lastStep && f(raw) < top)) ok = false;
  last = f(raw);
  lastStep = step;
}
assert(ok, 'past the knee: every point adds, less than the one before, and never reaches the top');
// Where the harness colleges stand (Plan 72H's probe): a sum of 40 near the
// old cap's 30, and a club past 90 still worth something.
assert(Math.abs(f(40) - 30) < 4, `a sum of 40 reads near the old cap (${f(40).toFixed(1)})`);
assert(f(90 + CLUB_SOCIAL_BONUS) - f(90) > 0.001, `a club at a sum of 90 still counts (${(f(90 + CLUB_SOCIAL_BONUS) - f(90)).toFixed(4)})`);
assert(STUDENT_LIFE_PRESTIGE_FULL === 30, 'campus-life standing keeps the old cap');

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
