// ---------------------------------------------------------------------
// The grade a course carries (src/data/courseQuality.ts).
//
// The module's own comment states the property any retune has to preserve:
// "D on a new department's course is normal, D on a veteran's means the
// wrong teacher for the material." Since Plan 104J a professor's load costs
// nothing (S1 appointed Dr. Iyer as a B and watched her courses sink to C
// as she took more on), so the checks here are that the load is gone, that
// the two causes of a low grade stay distinguishable without it, and that
// the factor list the drawer renders still adds up.
//
// Everything in this file is plain arithmetic on plain numbers, because
// that is what the module is, bar one reading of a college: a professor's
// first course and their last grade the same.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import * as courseQuality from '../src/data/courseQuality';
import { gradeFor, qualityOf, tierOf, tierPenalty, acclaimBonus } from '../src/data/courseQuality';
import { teachingCollege } from './fixtures/teaching';
import { facultyLoads, instructorQuality } from '../src/systems/faculty/facultyAssignment';
import { WALKTHROUGH_PROFESSOR } from '../src/data/foundingData';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

// The two people the invariant is about. A typical brand-new hire teaches
// around 55 (before Plan 96H every one arrived at 55% of their potential;
// now most still arrive near it); a matured instructor around 71 is the
// "veteran" the module's own comment picks.
const NEW_HIRE = 55;
const VETERAN = 71;

const grade = (teaching: number, tier: 1 | 2 | 3 | 4 | 'graduate') => qualityOf({ teaching, acclaim: 0, tier }).grade;

console.log('course quality tests');

// --- no teaching load (Plan 104J) -------------------------------------
{
  assert(!('loadPenalty' in courseQuality), 'the load penalty is gone');
  const q = qualityOf({ teaching: VETERAN, acclaim: 0, tier: 1 });
  assert(q.score === VETERAN && q.factors.length === 1, `an intro course is taught at the teacher's own teaching (${q.score})`);
  // The same score on every course of a tier, so a professor and the
  // courses they teach can't seem to disagree.
  for (const tier of [1, 2, 3, 4, 'graduate'] as const) {
    const score = qualityOf({ teaching: VETERAN, acclaim: 0, tier }).score;
    assert(score === VETERAN - tierPenalty(tier), `tier ${tier}: the teaching less the tier's penalty only (${score})`);
  }
  assert(grade(VETERAN, 3) === 'B', `a veteran on an advanced course reads B (${grade(VETERAN, 3)}), however many courses they hold`);
}

// --- a college: the load moves no grade -------------------------------
{
  // Dr. Bennett teaches ENGL101 and ENGL110 (fixtures/teaching.ts); a third
  // course in her name fills her slots.
  const s = teachingCollege('Load');
  const bennett = s.faculty.find((f) => f.id === WALKTHROUGH_PROFESSOR)!;
  const mine = () => s.tech.filter((t) => s.courseFaculty[t.id] === bennett.id && t.status === 'done');
  const before = new Map(mine().map((t) => [t.id, instructorQuality(s, t)!.score]));
  const third = s.tech.find((t) => t.id === 'ENGL120')!;
  third.status = 'done';
  s.courseFaculty[third.id] = bennett.id;
  const load = facultyLoads(s).get(bennett.id) ?? 0;
  assert(load === 3 && load >= bennett.courseSlots, `her slots are full (${load} of ${bennett.courseSlots})`);
  assert([...before].every(([id, score]) => instructorQuality(s, s.tech.find((t) => t.id === id)!)!.score === score), 'her first courses grade as they did before she took on the third');
  assert(mine().every((t) => instructorQuality(s, t)!.score === bennett.teaching - tierPenalty(tierOf(t.id))), 'every course of hers is her teaching less its tier');
}

// --- the invariant: whose D is whose ----------------------------------
{
  // A new department's course reads low because the person is new.
  assert(grade(NEW_HIRE, 3) === 'C', 'a fresh hire on an advanced course reads C');
  assert(grade(40, 3) === 'D', 'a weak fresh hire reads D');

  // A veteran never reaches the bottom bands, on any tier.
  let veteranBottom = 0;
  for (let teaching = VETERAN; teaching <= 100; teaching += 1) {
    for (const tier of [1, 2, 3, 4, 'graduate'] as const) {
      const g = grade(teaching, tier);
      if (g === 'D' || g === 'F') veteranBottom += 1;
    }
  }
  assert(veteranBottom === 0, `a veteran never reads D or F, whatever the tier (${veteranBottom} cases did)`);

  assert(grade(NEW_HIRE, 'graduate') === 'C', 'a fresh hire on graduate coursework reads C');
  assert(grade(34, 1) === 'D', 'and the weakest fresh hires read D on an intro course');
}

// --- the other terms are unchanged ------------------------------------
{
  assert(tierPenalty(1) === 0, 'intro material asks nothing extra of the teacher');
  assert(tierPenalty(3) > tierPenalty(2) && tierPenalty(4) > tierPenalty(3) && tierPenalty('graduate') > tierPenalty(4), 'harder material asks more');
  assert(acclaimBonus(0) === 0, 'an unprized professor gets no nod');
  assert(acclaimBonus(1) === 3 && acclaimBonus(5) === 6, 'and a prized one gets a small, capped one');

  assert(gradeFor(78) === 'A' && gradeFor(77.9) === 'B', 'the A band starts where it always did');
  assert(gradeFor(0) === 'F', 'and the floor is still F');

  // The factor list is what the drawer renders, and a grade the player
  // cannot decompose is a grade they cannot act on.
  const q = qualityOf({ teaching: VETERAN, acclaim: 2, tier: 3 });
  const { factors } = q;
  assert(factors.some((f) => f.label === 'Instructor teaching' && f.value === VETERAN), 'the base is itemized');
  assert(!factors.some((f) => /load/i.test(f.label)), 'no load is itemized');
  assert(factors.some((f) => f.label === 'Advanced course' && f.value < 0), 'the tier is, and signed');
  assert(qualityOf({ teaching: VETERAN, acclaim: 0, tier: 4 }).factors.some((f) => f.label === 'Capstone course'), 'and the capstone is named as one');
  assert(factors.some((f) => f.label === 'Prize-winning faculty'), 'and so is the prize');
  assert(q.score === factors.reduce((sum, f) => sum + f.value, 0), 'and the factors add up to the score');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
