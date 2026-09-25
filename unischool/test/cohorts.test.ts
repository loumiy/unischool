// ---------------------------------------------------------------------
// Student cohorts (see src/systems/admissions/cohorts.ts): a second,
// additive lens on the applicant pool, orthogonal to admissionsSystem.ts's
// own prestige/price/quality-band funnel. Two kinds of check live here:
//   - PURE MATH on cohortDemandFactor/cohortBreakdown, driven entirely by
//     hand-built CohortSignals objects — no GameState, no randomness,
//     mirroring admissions-pricing.test.ts's own style for the same reason.
//   - EXTRACTION checks on deriveCohortSignals against a real (if mostly
//     empty) GameState, since that half of the module is the one place
//     this system touches GameState shape at all.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import {
  COHORTS, cohortDemandFactor, cohortBreakdown, deriveCohortSignals, gradBoundShare, NEUTRAL_COHORT_SIGNALS,
  type CohortSignals,
} from '../src/systems/admissions/cohorts';
import { priceTolerance } from '../src/systems/admissions/admissionsSystem';
import { createInitialState } from '../src/state/actions';
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

const PRESTIGE = 50;
const TOLERANCE = priceTolerance(PRESTIGE);

function withSignal(overrides: Partial<CohortSignals>): CohortSignals {
  return { ...NEUTRAL_COHORT_SIGNALS, ...overrides };
}

// =====================================================================
// 1. BASE SHARES SUM TO 1 — cohortDemandFactor is a weighted blend; if the
// weights don't sum to 1, "every cohort neutral" stops meaning "no
// effect", silently.
// =====================================================================
{
  const total = COHORTS.reduce((sum, c) => sum + c.baseShare, 0);
  assert(Math.abs(total - 1) < 1e-9, `COHORTS' baseShares sum to 1 (got ${total})`);
}

// =====================================================================
// 2. NEUTRAL IS ACTUALLY NEUTRAL — every structural signal at 0 and net
// price priced exactly at tolerance gives a blended factor of exactly 1.0.
// =====================================================================
{
  const factor = cohortDemandFactor(NEUTRAL_COHORT_SIGNALS, TOLERANCE, TOLERANCE);
  assert(Math.abs(factor - 1) < 1e-9, `cohortDemandFactor is exactly 1.0 at neutral signals + price-at-tolerance (got ${factor})`);
}

// =====================================================================
// 3. EACH GROWTH-DRIVEN COHORT'S SIGNAL MOVES THE BLEND UP, MONOTONICALLY
// — building more of the thing that cohort cares about never makes the
// blended pool smaller. Held at a fixed, on-tolerance price throughout so
// only the structural signal under test varies.
// =====================================================================
{
  const factorAt = (signals: CohortSignals) => cohortDemandFactor(signals, TOLERANCE, TOLERANCE);
  const cases: Array<{ label: string; low: CohortSignals; high: CohortSignals }> = [
    { label: 'distinguishedDepth (high achievers)', low: withSignal({ distinguishedDepth: 0 }), high: withSignal({ distinguishedDepth: 12 }) },
    { label: 'professionalPrograms (pre-professional)', low: withSignal({ professionalPrograms: 0 }), high: withSignal({ professionalPrograms: 18 }) },
    { label: 'researchRate+labCount (research-oriented)', low: withSignal({ researchRate: 0, labCount: 0 }), high: withSignal({ researchRate: 80, labCount: 8 }) },
    { label: 'socialOrgCount (social)', low: withSignal({ socialOrgCount: 0 }), high: withSignal({ socialOrgCount: 25 }) },
    { label: 'artsPrograms+artsFacilities (arts-focused)', low: withSignal({ artsPrograms: 0, artsFacilities: 0 }), high: withSignal({ artsPrograms: 6, artsFacilities: 2 }) },
    { label: 'activeTeams x athleticsQuality (athletes)', low: withSignal({ activeTeams: 0, athleticsQuality: 0 }), high: withSignal({ activeTeams: 4, athleticsQuality: 80 }) },
  ];
  for (const c of cases) {
    const lowFactor = factorAt(c.low);
    const highFactor = factorAt(c.high);
    assert(highFactor > lowFactor, `${c.label}: more of the driving signal raises the blended factor (low ${lowFactor.toFixed(4)}, high ${highFactor.toFixed(4)})`);
    assert(lowFactor >= 1 - 1e-9, `${c.label}: zero signal never pulls the blend BELOW neutral (got ${lowFactor.toFixed(4)})`);
  }
}

// =====================================================================
// 4. PRICE-SENSITIVE RESPONDS TO NET PRICE, NOT JUST STRUCTURE — cheaper
// than tolerance pulls the blend up, pricier pushes it down, holding every
// structural signal at neutral throughout.
// =====================================================================
{
  const cheap = cohortDemandFactor(NEUTRAL_COHORT_SIGNALS, TOLERANCE, TOLERANCE * 0.3);
  const fair = cohortDemandFactor(NEUTRAL_COHORT_SIGNALS, TOLERANCE, TOLERANCE);
  const pricey = cohortDemandFactor(NEUTRAL_COHORT_SIGNALS, TOLERANCE, TOLERANCE * 2);
  assert(cheap > fair, `pricing well under tolerance pulls price-sensitive families in (cheap ${cheap.toFixed(4)} > fair ${fair.toFixed(4)})`);
  assert(fair > pricey, `pricing well over tolerance pushes price-sensitive families away (fair ${fair.toFixed(4)} > pricey ${pricey.toFixed(4)})`);
  // There is one price to read now (Plan 05's PR B). The check that used
  // to sit here — that a discount pulls this cohort back the same way a
  // lower sticker does — cannot be written without two prices, and it was
  // only ever asserting that the curve read NET rather than sticker.
}

// =====================================================================
// 5. THE BLEND STAYS SANE UNDER EXTREME INPUTS — never zero or negative
// (a multiplier admissionsSystem.ts's applicantVolume is multiplied BY),
// and never so large a single cohort maxing out dwarfs the other six.
// =====================================================================
{
  const maxedOut = withSignal({
    distinguishedDepth: 1000, professionalPrograms: 1000, researchRate: 1000, labCount: 1000,
    socialOrgCount: 1000, artsPrograms: 1000, artsFacilities: 1000, activeTeams: 1000, athleticsQuality: 100,
  });
  const factor = cohortDemandFactor(maxedOut, TOLERANCE, 0); // net price 0: price-sensitive also maxed
  assert(factor > 0, `cohortDemandFactor stays positive even at absurd signal values (got ${factor})`);
  assert(factor < 3, `cohortDemandFactor stays bounded even at absurd signal values, no single cohort runs away (got ${factor})`);

  const zeroedOutAndExpensive = withSignal({});
  const worstCase = cohortDemandFactor(zeroedOutAndExpensive, TOLERANCE, TOLERANCE * 10);
  assert(worstCase > 0, `cohortDemandFactor stays positive even at a reckless sticker with nothing built (got ${worstCase})`);
}

// =====================================================================
// 6. cohortBreakdown AND cohortDemandFactor NEVER DRIFT APART — the UI
// reads cohortBreakdown for the per-cohort detail and admissionsSystem.ts
// reads cohortDemandFactor for the actual funnel effect; if they ever
// compute a different number for the same cohort, the UI would be lying
// about what's actually driving enrollment.
// =====================================================================
//
// Run WITH graduate courses built, deliberately. Graduate students are the
// one cohort whose weight is a share rather than baseShare x pull, so a
// reconstruction that assumed baseShare x pull for all eight would agree
// with the direct total at any school that has no graduate programs and
// silently disagree at every school that does — which is to say this
// section would keep passing while testing nothing about the case it
// exists to protect.
{
  const signals = withSignal({ distinguishedDepth: 5, professionalPrograms: 8, researchRate: 30, labCount: 3, socialOrgCount: 10, artsPrograms: 2, artsFacilities: 1, activeTeams: 2, athleticsQuality: 60, gradCourseDepth: 20 });
  const tuition = TOLERANCE * 1.2;
  const details = cohortBreakdown(signals, TOLERANCE, tuition, 5_000);
  assert(details.length === COHORTS.length, `cohortBreakdown returns exactly the ${COHORTS.length} cohorts (got ${details.length})`);
  const reconstructed = details.reduce((sum, d) => {
    const cohort = COHORTS.find((c) => c.id === d.id)!;
    return sum + (d.id === 'gradBound' ? gradBoundShare(signals) : cohort.baseShare * d.pull);
  }, 0);
  const actual = cohortDemandFactor(signals, TOLERANCE, tuition);
  assert(Math.abs(reconstructed - actual) < 1e-9, `cohortBreakdown's per-cohort weights reconstruct cohortDemandFactor's own total exactly (breakdown ${reconstructed.toFixed(6)}, direct ${actual.toFixed(6)})`);

  // The graduate cohort is REAL PEOPLE in that breakdown, not a weight that
  // rounds to nobody.
  const grads = details.find((d) => d.id === 'gradBound')!;
  assert(grads.applicants > 0, `a school with 20 graduate courses draws graduate applicants (got ${grads.applicants})`);
}

// =====================================================================
// 6b. GRADUATE STUDENTS ARE ABSENT UNTIL THERE IS SOMETHING TO ENROLL IN,
// and are ADDITIVE rather than a redistribution of the other seven. This
// is the pair of properties no baseShare can express, and the reason this
// cohort is modeled differently from every other one.
// =====================================================================
{
  const bare = withSignal({ labCount: 2, socialOrgCount: 5 });
  const withGrad = withSignal({ labCount: 2, socialOrgCount: 5, gradCourseDepth: 37 });

  assert(gradBoundShare(bare) === 0, `no graduate courses means no graduate share (got ${gradBoundShare(bare)})`);
  assert(cohortBreakdown(bare, TOLERANCE, TOLERANCE, 5_000).find((d) => d.id === 'gradBound')!.applicants === 0,
    'a school with no graduate programs draws exactly zero graduate applicants');

  // Additive: founding a graduate school GROWS the pool rather than moving
  // undergraduates into it. If this ever inverts, the share is being carved
  // out of the other seven instead of added alongside them.
  const before = cohortDemandFactor(bare, TOLERANCE, TOLERANCE);
  const after = cohortDemandFactor(withGrad, TOLERANCE, TOLERANCE);
  assert(after > before, `building the graduate schools grows total demand (${before.toFixed(4)} -> ${after.toFixed(4)})`);

  // And it does not do so by taking undergraduates: every other cohort's
  // head count out of the same pool is unchanged, because their weights are
  // untouched and only the normalizing total moved... which DOES shift the
  // apportionment, so the honest check is that none of them grew and the
  // graduate cohort accounts for the difference.
  const bareRows = cohortBreakdown(bare, TOLERANCE, TOLERANCE, 5_000);
  const gradRows = cohortBreakdown(withGrad, TOLERANCE, TOLERANCE, 5_000);
  const gradCount = gradRows.find((d) => d.id === 'gradBound')!.applicants;
  const undergradLost = COHORTS
    .filter((c) => c.id !== 'gradBound')
    .reduce((t, c) => t + (bareRows.find((d) => d.id === c.id)!.applicants - gradRows.find((d) => d.id === c.id)!.applicants), 0);
  assert(Math.abs(undergradLost - gradCount) <= COHORTS.length,
    `within one fixed pool the graduate cohort's ${gradCount} come out of the apportionment, not out of thin air (undergrad delta ${undergradLost})`);
}

// =====================================================================
// 7. deriveCohortSignals ON A FOUNDING SCHOOL READS ALL-ZERO — a fresh
// school has no labs, no established majors beyond gen-ed, no clubs, no
// arts venues, no varsity teams, so every structural signal should read
// exactly what NEUTRAL_COHORT_SIGNALS assumes. A future seed change that
// silently pre-builds one of these would otherwise never be caught.
// =====================================================================
{
  const s = createInitialState('Cohort Test');
  const signals = deriveCohortSignals(s);
  assert(signals.distinguishedDepth === 0, `a founding school has zero distinguished depth (got ${signals.distinguishedDepth})`);
  assert(signals.professionalPrograms === 0, `a founding school has zero established professional programs (got ${signals.professionalPrograms})`);
  assert(signals.researchRate === 0, `a founding school has zero research rate (got ${signals.researchRate})`);
  assert(signals.labCount === 0, `a founding school has zero labs (got ${signals.labCount})`);
  assert(signals.socialOrgCount === 0, `a founding school has zero clubs/chapters (got ${signals.socialOrgCount})`);
  assert(signals.artsPrograms === 0, `a founding school has zero established arts programs (got ${signals.artsPrograms})`);
  assert(signals.artsFacilities === 0, `a founding school has zero arts facilities built (got ${signals.artsFacilities})`);
  assert(signals.activeTeams === 0, `a founding school has zero active varsity teams (got ${signals.activeTeams})`);
  assert(signals.athleticsQuality === 0, `a founding school with no teams has zero athletics quality (got ${signals.athleticsQuality})`);
}

// =====================================================================
// 8. deriveCohortSignals PICKS UP REAL BUILT STATE — flip a handful of
// fields the way the real systems would over the course of a game and
// confirm each one is read into the right signal, not silently ignored or
// crossed with the wrong cohort.
// =====================================================================
{
  const s: GameState = createInitialState('Cohort Test 2');

  const lab = s.tech.find((t) => t.id === 'LAB-BIOL');
  if (lab) lab.status = 'done';
  const artsPac = s.tech.find((t) => t.id === 'ARTS-PAC');
  if (artsPac) artsPac.status = 'done';

  s.milestones['program-established:FINA'] = true; // Business — pre-professional
  s.milestones['program-established:MUSC'] = true;  // Arts & Media — arts-focused
  s.milestones['program-established:HIST'] = true;  // Social Sciences & Humanities — neither bucket
  s.milestones['program-distinguished:FINA'] = true;
  s.milestones['grad-program-complete:medicine'] = true;

  s.orgs.clubs.push({
    id: 'club-1', name: 'Test Club', foundedYear: 1, foundingMembers: 30, foundingEnrolled: 400,
    upkeepPerWeek: 100, sport: null, varsityLastAskedYear: null,
  });
  s.orgs.chapters.push({
    id: 'chapter-1', name: 'Test Chapter', foundedYear: 1, foundingMembers: 20, foundingEnrolled: 400,
    upkeepPerWeek: 150, kind: 'fraternity',
  } as unknown as GameState['orgs']['chapters'][number]);

  s.orgs.athleticsBudget = 'high';
  s.orgs.teams.push({
    id: 'team-1', name: 'Test Team', foundedYear: 1, foundingMembers: 20, foundingEnrolled: 400,
    upkeepPerWeek: 500, sport: 'soccer-m', venueCategory: 'athleticsField', status: 'active',
    headCoach: { id: 'c1', name: 'Coach A', gender: 'male', field: 'soccer-m', quality: 80, qualityPotential: 90, tenureWeeks: 10, weeksListed: 0, salary: 50_000 },
    assistantCoach: null, trainer: null,
  } as unknown as GameState['orgs']['teams'][number]);

  const signals = deriveCohortSignals(s);
  assert(signals.labCount === 1, `a done lab is counted (got ${signals.labCount})`);
  assert(signals.artsFacilities === 1, `a done ARTS-PAC is counted toward arts facilities (got ${signals.artsFacilities})`);
  assert(signals.professionalPrograms === 1, `only the professional-track established program is counted (FINA), not the Social Sciences one (got ${signals.professionalPrograms})`);
  assert(signals.artsPrograms === 1, `only the Arts & Media established program is counted (MUSC) (got ${signals.artsPrograms})`);
  assert(signals.distinguishedDepth === 1 + 2, `distinguished (1) + 2x grad-program-complete (1) = 3 (got ${signals.distinguishedDepth})`);
  assert(signals.socialOrgCount === 2, `one club + one chapter = 2 (got ${signals.socialOrgCount})`);
  assert(signals.activeTeams === 1, `one active team is counted (got ${signals.activeTeams})`);
  assert(signals.athleticsQuality > 0, `an active team with a real coach has non-zero athletics quality (got ${signals.athleticsQuality})`);
}

// =====================================================================
// 8. THE HEAD COUNTS ADD UP — the breakdown is shown directly under the
// applicant pool it decomposes (see InterruptModal.tsx's CohortRow), so a
// player can add the seven rows and get the headline figure. Whole
// applicants, never negative, summing EXACTLY to the pool at any size and
// any mix — including the degenerate pools (0, 1) where a floor-then-
// distribute apportionment is easiest to get wrong.
// =====================================================================
{
  const mixes: Array<[string, CohortSignals]> = [
    ['neutral', NEUTRAL_COHORT_SIGNALS],
    ['all-in', withSignal({ distinguishedDepth: 9, professionalPrograms: 12, researchRate: 60, labCount: 5, socialOrgCount: 20, artsPrograms: 4, artsFacilities: 2, activeTeams: 6, athleticsQuality: 95 })],
    ['one lever only', withSignal({ labCount: 4 })],
  ];
  for (const [mixLabel, signals] of mixes) {
    for (const pool of [0, 1, 7, 350, 5_000, 48_137]) {
      const details = cohortBreakdown(signals, TOLERANCE, TOLERANCE, pool);
      const sum = details.reduce((a, d) => a + d.applicants, 0);
      assert(sum === pool, `${mixLabel} @ pool ${pool}: the seven cohorts sum to the pool exactly (got ${sum})`);
      assert(details.every((d) => Number.isInteger(d.applicants) && d.applicants >= 0),
        `${mixLabel} @ pool ${pool}: every cohort is a whole, non-negative head count`);
    }
  }

  // A cohort the player has actually courted is worth MORE PEOPLE than the
  // same cohort at a school that built nothing — the whole point of showing
  // a count rather than a multiplier is that this comparison is in students.
  const built = cohortBreakdown(withSignal({ labCount: 5, researchRate: 50 }), TOLERANCE, TOLERANCE, 5_000);
  const bare = cohortBreakdown(NEUTRAL_COHORT_SIGNALS, TOLERANCE, TOLERANCE, 5_000);
  const researchBuilt = built.find((d) => d.id === 'researchOriented')!.applicants;
  const researchBare = bare.find((d) => d.id === 'researchOriented')!.applicants;
  assert(researchBuilt > researchBare,
    `labs pull more research-oriented applicants out of the same pool (${researchBuilt} vs ${researchBare})`);
}

console.log('cohorts tests');
if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
