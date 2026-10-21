// ---------------------------------------------------------------------
// Plain words at first use (Plan 78F). The readings behind three of the
// plan's word fixes, each one pure function the UI prints:
//   - courseHoldReason (programProgress.ts): the reason a course cell's
//     tooltip and the course drawer both give for a course that cannot
//     start, its unmet prerequisites marked cross-listed or built on the map;
//   - crowdingLabel and poolChange (yearOverYear.ts): the reveal's crowding
//     part says its direction, "crowding eased" or "crowding grew";
//   - admitRateOpening (yearOverYear.ts): why the admit rate opens where it
//     does, and the beds only when admitting more would crowd them.
// The class names are pinned in alumni.test.ts.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { teachingCollege } from './fixtures/teaching';
import type { Buildable, FunnelRecord } from '../src/state/types';
import { courseHoldReason, crossMajorPrereqs } from '../src/systems/techtree/programProgress';
import { admitRateOpening, poolChange } from '../src/systems/admissions/yearOverYear';
import { projectAdmissions } from '../src/systems/admissions/admissionsSystem';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('plain words tests');

// --- a course's reason --------------------------------------------------
{
  const s = teachingCollege('Words');
  const find = (id: string): Buildable => s.tech.find((t) => t.id === id)!;

  // International Finance needs FINA 101 and, from Economics, ECON 110.
  const fina140 = find('FINA140');
  assert(crossMajorPrereqs(fina140, (id) => s.tech.find((t) => t.id === id)).join() === 'ECON110', 'ECON 110 is the cross-listed prerequisite of FINA 140');
  find('FINA101').status = 'done';
  find('ECON110').status = 'available';
  assert(courseHoldReason(s, fina140) === 'Needs ECON 110, cross-listed', `one cross-listed prerequisite reads as the review asked (${courseHoldReason(s, fina140)})`);
  find('FINA101').status = 'available';
  assert(courseHoldReason(s, fina140) === 'Needs FINA 101 and ECON 110 (cross-listed)', `several are listed, the cross-listed one marked (${courseHoldReason(s, fina140)})`);

  // A lab is built on the map, not developed.
  const econ210 = find('ECON210');
  const reason = courseHoldReason(s, econ210) ?? '';
  assert(reason.startsWith('Needs ') && reason.includes('(built on the map)') && !reason.includes('cross-listed'), `a lab prerequisite says where it comes from (${reason})`);

  // What holds a course that is open but cannot start.
  const engl120 = find('ENGL120');
  assert(engl120.status === 'available' && courseHoldReason(s, engl120) === null, 'an open course nothing holds has no reason');
  const cash = s.finance.cash;
  s.finance.cash = engl120.cost - 1_000;
  assert(courseHoldReason(s, engl120) === '$1,000 short of the development cost', `the cash it is short, as the drawer says it (${courseHoldReason(s, engl120)})`);
  s.finance.cash = cash;
  // A fresh college: its one economist teaches a full load.
  const fresh = teachingCollege('Words');
  const econ130 = fresh.tech.find((t) => t.id === 'ECON130')!;
  assert(econ130.status === 'available' && courseHoldReason(fresh, econ130) === 'Needs Economics faculty', `a full department reads as the faculty it needs (${courseHoldReason(fresh, econ130)})`);

  // Done and developing courses are not held.
  assert(courseHoldReason(s, find('ENGL101')) === null, 'a course taught has no reason');
}

// --- crowding is no part of the pool (Plan 107E) --------------------------
{
  const now = projectAdmissions(50, 16_000, 350, 70);
  assert(now.factors.crowding === undefined, 'the funnel records no crowding factor');
  const last: FunnelRecord = {
    year: 1, applicants: now.applicants, cohorts: {} as FunnelRecord['cohorts'],
    factors: { ...now.factors, crowding: 0.25 },
  };
  assert(!(poolChange(now, last)?.parts ?? []).some((p) => p.label.includes('crowding')), "and the reveal names none, against an old save's");
}

// --- why the admit rate opens where it does ------------------------------
{
  assert(admitRateOpening(true, 0.21, 0, 688) === 'The admit rate opens at the founding rate, 21%.', 'the first summer opens at the founding rate');
  assert(admitRateOpening(false, 0.38, 0, 688) === 'The admit rate opens where last summer set it, 38%.', 'later summers open at last summer\'s');
  assert(admitRateOpening(false, 0.38, 350, 688) === 'The admit rate opens where last summer set it, 38%; admitting more crowds 350 beds.', 'beds already full are named as what admitting more does');
  assert(admitRateOpening(false, 0.38, 1_200, 688) === 'The admit rate opens where last summer set it, 38%.', 'beds to spare are not named');
  assert(admitRateOpening(true, 0.86, 0, 688, 0.62) === 'The admit rate opens at 62%, the most the seats left will hold (the founding rate is 86%).', 'a founding rate above the room opens at the room');
  assert(admitRateOpening(false, 0.5, 0, 688, 0.62) === 'The admit rate opens where last summer set it, 50%.', 'a rate inside the room opens where it was');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
