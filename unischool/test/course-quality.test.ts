// ---------------------------------------------------------------------
// The grade a course carries (src/data/courseQuality.ts).
//
// The module's own comment states the property any retune has to preserve,
// and states it as prose: "D on a NEW department's course is the system
// working, D on a VETERAN's course means the player overloaded them. Those
// must stay distinguishable." Softening the overload penalty (12 -> 7) is
// exactly the kind of change that can quietly break it — the penalty is the
// only thing that puts a veteran's course into the bottom bands — so the
// prose becomes checks here.
//
// Everything in this file is plain arithmetic on plain numbers, because
// that is what the module is: no GameState, no reducer, no roster.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { gradeFor, loadPenalty, qualityOf, tierPenalty, acclaimBonus } from '../src/data/courseQuality';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

// The two people the invariant is about. A brand-new hire's teaching is
// capped at 55% of their potential (facultyData.ts's grownStat), so 55 is
// the best a fresh appointment can be; a matured instructor around 71 is
// the "veteran" the module's own comment picks.
const NEW_HIRE = 55;
const VETERAN = 71;

const grade = (teaching: number, load: number, slots: number, tier: 1 | 2 | 3 | 'graduate') =>
  qualityOf({ teaching, acclaim: 0, load, slots, tier }).grade;

console.log('course quality tests');

// --- the load curve itself --------------------------------------------
{
  assert(loadPenalty(1, 3) === 0, 'teaching one course costs nothing, whatever the ceiling');
  assert(loadPenalty(2, 1) === 0, 'and a one-slot instructor has no curve to be on');
  assert(loadPenalty(3, 3) > loadPenalty(2, 3), 'each further course costs more than the last one did');
  assert(
    loadPenalty(3, 3) === loadPenalty(5, 5),
    'the curve is how full you are, not how many you hold — a full plate is a full plate',
  );

  // The retune, as a number. Anything much larger is the cliff the playtest
  // complained about: against grade bands 16-18 points wide, a penalty of
  // 12 made a full load reliably a whole letter.
  const full = loadPenalty(3, 3);
  assert(full === 7, `a full load costs 7 points (got ${full})`);
  assert(full < 16, 'which is less than the narrowest grade band, so a full load is a cost rather than an automatic demotion');

  // Over-ceiling loads cannot arise in play (a hire never sheds a slot),
  // but the curve is defined past the ceiling and should
  // still read worse than a merely full one.
  assert(loadPenalty(5, 3) > full, 'an over-stretched instructor reads worse than a full one');
  assert(loadPenalty(9, 3) === loadPenalty(5, 3), 'but the overrun is capped rather than unbounded');
}

// --- overloading is still visible -------------------------------------
{
  // The check the plan named: a matured instructor on a capstone should
  // still visibly drop when carrying a full load — just not two bands.
  const rested = grade(VETERAN, 1, 3, 3);
  const loaded = grade(VETERAN, 3, 3, 3);
  assert(rested === 'B', `a veteran teaching one capstone reads B (got ${rested})`);
  assert(loaded === 'C', `the same veteran at a full load reads C (got ${loaded})`);
  assert(rested !== loaded, 'so overloading somebody is legible in the middle of the range, where most courses live');

  // And not two bands: the complaint was that a full plate felt like a
  // punishment for expanding rather than a price for it.
  const bands = ['F', 'D', 'C', 'B', 'A'];
  assert(
    bands.indexOf(rested) - bands.indexOf(loaded) === 1,
    `the drop is one band, not two (${rested} -> ${loaded})`,
  );
}

// --- the invariant: whose D is whose ----------------------------------
{
  // A new department's course reads low because the person is new. That is
  // the system working, and it happens with no overloading at all.
  assert(grade(NEW_HIRE, 1, 3, 3) === 'C', 'a fresh hire on a capstone reads C at a single course');
  assert(grade(40, 1, 2, 3) === 'D', 'a weak fresh hire reads D without being overloaded at all');

  // A veteran only reaches the bottom bands by being piled on. Checked as
  // an implication rather than an example: for every teaching score from a
  // veteran upward, a D or F on a tier-3 course must mean a load above one.
  let veteranBottomWithoutLoad = 0;
  for (let teaching = VETERAN; teaching <= 100; teaching += 1) {
    for (const tier of [1, 2, 3, 'graduate'] as const) {
      const g = grade(teaching, 1, 3, tier);
      if (g === 'D' || g === 'F') veteranBottomWithoutLoad += 1;
    }
  }
  assert(
    veteranBottomWithoutLoad === 0,
    `a veteran teaching a single course never reads D or F, whatever the tier (${veteranBottomWithoutLoad} cases did)`,
  );

  // The other half of "distinguishable": a fresh hire can read D on merit
  // alone, so the two causes do not collapse into one.
  assert(grade(NEW_HIRE, 1, 3, 'graduate') === 'C', 'a fresh hire on graduate coursework reads C');
  assert(grade(34, 1, 3, 1) === 'D', 'and the weakest fresh hires read D on an intro course');
}

// --- the other terms are unchanged ------------------------------------
{
  assert(tierPenalty(1) === 0, 'intro material asks nothing extra of the teacher');
  assert(tierPenalty(3) > tierPenalty(2) && tierPenalty('graduate') > tierPenalty(3), 'harder material asks more');
  assert(acclaimBonus(0) === 0, 'an unprized professor gets no nod');
  assert(acclaimBonus(1) === 3 && acclaimBonus(5) === 6, 'and a prized one gets a small, capped one');

  assert(gradeFor(78) === 'A' && gradeFor(77.9) === 'B', 'the A band starts where it always did');
  assert(gradeFor(0) === 'F', 'and the floor is still F');

  // The factor list is what the drawer renders, and a grade the player
  // cannot decompose is a grade they cannot act on.
  const { factors } = qualityOf({ teaching: VETERAN, acclaim: 2, load: 3, slots: 3, tier: 3 });
  assert(factors.some((f) => f.label === 'Instructor teaching' && f.value === VETERAN), 'the base is itemized');
  assert(factors.some((f) => f.label.startsWith('Teaching load') && f.value === -7), 'the load cost is itemized, and signed');
  assert(factors.some((f) => f.label === 'Capstone tier'), 'so is the tier');
  assert(factors.some((f) => f.label === 'Prize-winning faculty'), 'and so is the prize');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
