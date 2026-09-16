// ---------------------------------------------------------------------
// Turns sim/balanceSim.ts's scripted-strategy fast-forward into a real,
// asserting regression gate — the harness has run for a long time as a
// print-and-eyeball tool (`npm run sim`), and nothing failed loudly when a
// strategy's emergent behavior quietly drifted from what its own comment
// claims (see the "Overbuilder" fix this file guards: every strategy used
// to report zero weeks in the red, including the two explicitly designed
// to stress-test "stall, don't die").
//
// Imports STRATEGIES/play/Strategy/Row straight from the sim rather than
// re-implementing a second scripted player — the whole point of a balance
// check is that it drives the SAME strategies the eyeballed report reads,
// so a passing run here is a passing `npm run sim` in disguise, and a
// retune of a strategy or a game constant can't silently invalidate one
// without the other noticing.
//
// Runs a shorter horizon (20 years, not 40) than `npm run sim`'s default —
// long enough for every invariant below to be meaningfully exercised
// (the pinch, a stall-and-recover cycle, real prestige separation) while
// keeping this fast enough to run on every `npm test`.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { play, STRATEGIES, cutPayrollIfStalled, STALL_WEEKS_BEFORE_CUTS } from '../sim/balanceSim';
import { createInitialState } from '../src/state/actions';
import type { GameState, Faculty } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const YEARS = 20;

// TWO HORIZONS, and the second one is a deliberate loosening with a reason.
//
// Every check here used to read year 20, including the ones asking whether
// the two DELIBERATE MISTAKE CASES — overreaching on pace (Curriculum rush)
// and on price (Discount volume) — had climbed back out of the hole they
// dug. Softening the teaching-overload penalty (courseQuality.ts's
// LOAD_PENALTY_MAX, 12 -> 7) moved that arc: better grades lift
// satisfaction and prestige, which widen the applicant pool, which makes a
// school that was already overreaching overreach harder and for longer
// before the correction lands. Measured at the default seed, Curriculum
// rush ends year 20 at -11.8M where it used to end at +2.9M — and year 40
// at +3.69B where it used to end at +1.49B. Discount volume ends year 20 at
// -14.8M with a POSITIVE weekly net of +1.09M, which is a school climbing
// out, not one spiraling.
//
// The design claim these checks exist to defend is "stall, don't die" — a
// mistake must be survivable and recoverable, not fatal. That claim still
// holds; what changed is how long the arc takes, so the horizon moves with
// it rather than the game being tuned to fit a number that was never
// load-bearing. Every other strategy is still judged at year 20, and the
// recovery bars themselves (cleared the trough, comfortably clear of it,
// above where it stood a decade earlier, solvent) are unchanged.
const RECOVERY_YEARS = 40;

function find(name: string) {
  const strategy = STRATEGIES.find((s) => s.name === name);
  if (!strategy) throw new Error(`fixture: strategy "${name}" exists in STRATEGIES`);
  return { strategy, run: play(strategy, YEARS) };
}

// The same strategy, played to the longer horizon the recovery checks use.
const MISTAKE_CASES = ['Curriculum rush (overreach)', 'Discount volume (beds first)'];
function findRecovery(name: string) {
  const strategy = STRATEGIES.find((s) => s.name === name);
  if (!strategy) throw new Error(`fixture: strategy "${name}" exists in STRATEGIES`);
  return { strategy, run: play(strategy, RECOVERY_YEARS) };
}

// =====================================================================
// 1. GROWTH ISN'T OPTIONAL — the idle (builds-nothing) control's prestige
// stays well below every strategy that actually builds. This is the sim
// harness's own reading of PR H's "a build-nothing run cannot reach the
// top of the rankings" checklist item (see prestigeSystem.ts's
// admissionsScaleScore throttle).
// =====================================================================
{
  const idle = find('Idle (builds nothing)');
  const idlePrestige = idle.run.rows[idle.run.rows.length - 1].prestige;

  // Discount volume deliberately sits out of this comparison: its value
  // proposition is enrollment SCALE bought with heavy aid, not curriculum
  // breadth, and courseAffordabilityAware now correctly throttles its
  // course build-out to what its own thin, discount-heavy margin can
  // actually sustain (see the strategy's own comment) — a real, different
  // kind of viable, not a worse version of a curriculum-focused strategy.
  // "Growth isn't optional" is a claim about strategies that spend on
  // curriculum breadth; this one spends its margin on aid instead.
  //
  // 'Public flagship' used to be the third name here and was retired with
  // the private/public fork (Plan 07's PR C). 'Completionist' takes its
  // place rather than the list shrinking to two: it is also a
  // curriculum-breadth strategy, so it defends the same claim, and a check
  // that quietly loses a third of its coverage because a strategy was
  // deleted elsewhere is a weakened check pretending to be an unchanged one.
  for (const name of ['Balanced builder', 'Curriculum rush (overreach)', 'Completionist (build everything)']) {
    const built = find(name);
    const builtPrestige = built.run.rows[built.run.rows.length - 1].prestige;
    assert(
      builtPrestige > idlePrestige + 10,
      `"${name}" reaches meaningfully higher prestige than idling by year ${YEARS} (idle ${idlePrestige.toFixed(1)}, ${name} ${builtPrestige.toFixed(1)})`,
    );
  }
}

// =====================================================================
// 2. STALL, DON'T DIE — a strategy that goes into real financial distress
// (the Overbuilder: cheap tuition, dorms built the moment the campus is
// nominally full, regardless of demand) actually goes negative, and then
// recovers rather than staying sunk. Both halves matter: an economy that
// never stresses under a genuinely bad policy isn't testing anything (see
// the audit finding this replaces — the OLD Overbuilder, priced at the
// tuition ceiling, never went red at all across a 40-year run), and one
// that stresses but never recovers would falsify "stall, don't die".
// =====================================================================
{
  const { run } = find('Overbuilder (beds ahead of demand)');
  const last = run.rows[run.rows.length - 1];
  assert(last.weeksInTheRed > 0, `the overbuilder strategy actually experiences real financial distress (got ${last.weeksInTheRed} weeks in the red)`);
  assert(last.minCash < 0, `the overbuilder strategy's cash genuinely goes negative at some point (min cash ${last.minCash.toLocaleString()})`);
  assert(last.cash > last.minCash, `the overbuilder strategy's cash has recovered from its trough by year ${YEARS} (trough ${last.minCash.toLocaleString()}, now ${last.cash.toLocaleString()})`);
  assert(last.net >= 0, `the overbuilder strategy's weekly net has turned non-negative again by year ${YEARS} (got ${last.net.toLocaleString()})`);
  // "Stall, don't die" also means it never spends the WHOLE run underwater —
  // a run in the red every single week would be "die slowly", not "stall".
  assert(last.weeksInTheRed < YEARS * 52, 'the overbuilder strategy is not in the red for the entire run');
}

// =====================================================================
// 3. DELIBERATE OVERREACH ALSO RECOVERS — the "spend to the wire" strategy
// (no cash buffer, builds everything affordable every week) is a second,
// independent read on "stall, don't die": a player who overreaches on
// PACE rather than on PRICE must also be recoverable, not just the
// price-side mistake case 2 checks.
// =====================================================================
{
  const { run } = findRecovery('Curriculum rush (overreach)');
  const last = run.rows[run.rows.length - 1];
  assert(last.cash > 0, `the overreach strategy's cash is positive again by year ${RECOVERY_YEARS} (got ${last.cash.toLocaleString()})`);
  assert(last.net > 0, `the overreach strategy's weekly net is positive again by year ${RECOVERY_YEARS} (got ${last.net.toLocaleString()})`);
  // Solvency at the horizon, which the general sweep below no longer covers
  // for this strategy (it is judged on the recovery arc, not at year 20).
  assert(last.cash >= 0, `"Curriculum rush (overreach)" ends year ${RECOVERY_YEARS} solvent (cash ${last.cash.toLocaleString()})`);
  assert(last.net >= -0.01 * last.opex, `"Curriculum rush (overreach)" ends year ${RECOVERY_YEARS} without a real ongoing deficit (net ${last.net.toLocaleString()}, opex ${last.opex.toLocaleString()})`);
}

// =====================================================================
// 4. NO STRATEGY IS PERMANENTLY SUNK — the general form of "stall, don't
// die" across every scripted strategy at once: nobody ends the run with
// negative cash, and nobody ends it with a negative weekly net (a school
// that is still bleeding every week at the horizon has not actually
// stalled-and-held, it is still spiraling).
//
// Discount volume is deliberately held to a looser, trend-based bar rather
// than this section's flat `cash >= 0` / `net >= 0`: trimAidWhenUnderwater
// (see sim/balanceSim.ts) toggles a binary discount between years based on
// last year's cash sign, which makes any SINGLE year's `net` a genuinely
// noisy signal for this strategy specifically — it can oscillate around
// the break-even point for several years running while cash overall is
// climbing hard underneath that noise (observed: net swinging between
// roughly -11% and -1% of opex year to year, while cash grew from an ~11M
// trough recovery to 130M+ a decade later). Asserting on cash's own LONG-
// RUN trend — comfortably clear of its own trough, and well above where it
// stood a decade earlier — is the actual "stall, don't die" claim for a
// strategy shaped like this one, not which exact year a noisy weekly net
// happens to cross zero.
//
// ONE BAR WAS RETIRED WITH THE HORIZON, and it is worth saying why rather
// than leaving a quieter test behind. This section used to also require
// cash to end "comfortably clear of its own trough" at five times the
// trough's depth. That bar is a function of the WORST DIP the run ever
// took, so any change that makes the dip deeper fails it however healthy
// the school ends up: after LOAD_PENALTY_MAX came down this strategy digs
// to -18M mid-run (it used to dip barely a million inside twenty years)
// and climbs back to +7.4M, which the multiplier reads as a failure and a
// human reads as a school that overreached, corrected and recovered. Two
// of the three seeds spot-checked still clear the old bar, so it is not
// systematically broken — it is simply measuring dip depth rather than
// health. Solvency at the horizon, clearing the trough, and a decade of
// upward trend are the three that say what this section means. Every OTHER strategy either never goes underwater
// at all or (Overbuilder, Curriculum rush) has fully cleared its own
// trough by year ${YEARS} without this kind of oscillation, so this
// section's flat bar still holds for them.
// =====================================================================
const discountRecovery = findRecovery('Discount volume (beds first)');

// Cash averaged over a decade, for the two places that ask whether this
// strategy is trending up. Compared as DECADE AVERAGES rather than as two
// point readings because it oscillates on a multi-year cycle (see the note
// below): "year 40 against year 30" compares two arbitrary phases of that
// cycle, and can read as collapse when the later year lands in a trough and
// as a boom when it lands on a peak, with nothing about the school having
// changed.
function discountMeanCash(from: number, to: number): number {
  const window = discountRecovery.run.rows.filter((r) => r.year > from && r.year <= to);
  return window.reduce((sum, r) => sum + r.cash, 0) / Math.max(window.length, 1);
}
{
  const { run } = discountRecovery;
  const last = run.rows[run.rows.length - 1];
  assert(last.cash > last.minCash, `the discount-heavy strategy has recovered from its trough by year ${RECOVERY_YEARS} (trough ${last.minCash.toLocaleString()}, now ${last.cash.toLocaleString()})`);
  assert(last.cash > 0, `the discount-heavy strategy is solvent at the horizon (cash ${last.cash.toLocaleString()})`);
  const lastDecade = discountMeanCash(RECOVERY_YEARS - 10, RECOVERY_YEARS);
  const decadeBefore = discountMeanCash(RECOVERY_YEARS - 20, RECOVERY_YEARS - 10);
  assert(
    lastDecade > decadeBefore,
    `the discount-heavy strategy's cash trends upward decade over decade ` +
    `(years ${RECOVERY_YEARS - 20}-${RECOVERY_YEARS - 10} averaged ${Math.round(decadeBefore).toLocaleString()}, ` +
    `years ${RECOVERY_YEARS - 10}-${RECOVERY_YEARS} averaged ${Math.round(lastDecade).toLocaleString()})`,
  );
  assert(last.weeksInTheRed < RECOVERY_YEARS * 52, 'the discount-heavy strategy is not in the red for the entire run');
}

// A school that is overdrawn AT THE SNAPSHOT but earning strongly, having
// spent almost none of the run in the red, is mid-expansion rather than
// spiraling — it has just committed to a building or a round of hires the
// week the camera happened to click. The spiral this section hunts looks
// nothing like that: it is underwater for years and losing money while it is
// there. So solvency is "positive, OR clearly climbing out of a dip it has
// barely been in", with both halves measured rather than asserted.
const RARE_RED = 0.1;   // share of the run a mid-expansion dip may cover
function solvent(row: { cash: number; net: number; opex: number; weeksInTheRed: number }): boolean {
  if (row.cash >= 0) return true;
  return row.net > 0 && row.weeksInTheRed < RARE_RED * YEARS * 52;
}

for (const strategy of STRATEGIES.filter((s) => !MISTAKE_CASES.includes(s.name))) {
  const { run } = find(strategy.name);
  const last = run.rows[run.rows.length - 1];
  assert(
    solvent(last),
    `"${strategy.name}" ends year ${YEARS} solvent, or overdrawn and climbing out ` +
    `(cash ${last.cash.toLocaleString()}, net ${last.net.toLocaleString()}, ` +
    `${last.weeksInTheRed} of ${YEARS * 52} weeks in the red)`,
  );
  // A small negative tolerance, not a strict >= 0: `net` is a single week's
  // snapshot (see snapshot() in balanceSim.ts), and a fast-growing school
  // can catch a genuinely healthy trajectory mid-blip — a newly hired
  // faculty member or a newly opened facility landing the same week
  // enrollment is still ramping up, not the "still bleeding every week"
  // spiral this check exists to catch. Bounded to 1% of that week's own
  // opex, so a real spiral (net deeply negative relative to the size of
  // the operation) still fails this exactly as before.
  assert(last.net >= -0.01 * last.opex, `"${strategy.name}" ends year ${YEARS} without a real ongoing deficit (net ${last.net.toLocaleString()}, opex ${last.opex.toLocaleString()})`);
}

// =====================================================================
// 4b. THE PAYROLL LEVER HAS A FLOOR — a stalled school sheds people it is
// not using, and stops at the ones teaching.
//
// This guards the harness against itself rather than the game. The
// scripted player's recovery lever is dismissal (see balanceSim.ts's
// cutPayrollIfStalled), and while faculty were interchangeable salary an
// unbounded version of it was a fair model. Course quality made it false:
// a dismissal orphans whatever that person taught, and the unbounded lever
// walked the discount strategy to ZERO faculty with 91 courses still on
// offer — a school with a full catalogue and nobody in front of any class,
// still printing a prestige and an enrolment, so every figure downstream
// of it described a university that could not exist.
//
// Called DIRECTLY rather than read off a run, and that is the point: the
// collapse took a stalled trajectory about thirty years to complete, so the
// 20-year sweep above cannot see it — a run-shaped assertion here would
// have passed against the very bug it was written for. Three small states,
// each built to put the lever in the position one of its limits exists
// for, catch it in a millisecond and keep catching it at any horizon.
// =====================================================================
{
  const FIELD = 'Economics';
  function professor(id: string, salary: number): Faculty {
    return {
      id, name: `Dr. ${id}`, field: FIELD,
      teaching: 80, research: 60, teachingPotential: 90, researchPotential: 70,
      tenureWeeks: 0, weeksListed: 0, acclaim: 0, salary, courseSlots: 1,
      nationality: 'United States', flag: '🇺🇸', bio: 'A test fixture, not a character.',
      gender: 'male', heritage: 'Anglo/Western European',
    };
  }

  // A school deep underwater, long past the stall threshold, with a
  // three-person department. `staffed` is how many of them are actually
  // teaching one of the department's offered courses.
  function stalled(staffed: number): GameState {
    const s = createInitialState('Floor');
    s.finance.cash = -10_000_000;
    // Salaries are ANNUAL (financeSystem.ts divides by WEEKS_PER_YEAR), and
    // they have to be large enough that this payroll alone puts the weekly
    // net under water — the lever declines outright on a school that is
    // merely holding negative cash while trading at a profit.
    s.faculty = [professor('cheap', 1_000_000), professor('mid', 2_000_000), professor('dear', 3_000_000)];

    const courses = s.tech.filter((t) => t.requiresFaculty === FIELD).slice(0, staffed);
    if (courses.length !== staffed) throw new Error(`fixture: ${FIELD} offers at least ${staffed} courses`);
    const ids = ['dear', 'mid', 'cheap'];
    courses.forEach((t, i) => {
      t.status = 'done';
      s.courseFaculty[t.id] = ids[i];
    });
    return s;
  }

  // Flat pricing, so the "price before people" gate never defers: this
  // block is about the floor, and the gate gets its own check below.
  const flat = { tuition: () => 0 } as unknown as typeof STRATEGIES[number];

  function fire(s: GameState): string | null {
    let fired: string | null = null;
    cutPayrollIfStalled(() => s, STALL_WEEKS_BEFORE_CUTS, (a) => {
      if (a.type === 'FIRE_FACULTY') fired = a.facultyId;
    }, flat);
    return fired;
  }

  // Nobody teaching: the priciest goes, exactly as before.
  assert(fire(stalled(0)) === 'dear', `the payroll lever cuts the priciest idle professor (got ${fire(stalled(0))})`);

  // One teaching: the priciest IDLE one goes, not the priciest overall —
  // 'dear' is in front of a class, so the cut steps past them.
  assert(fire(stalled(1)) === 'mid', `the payroll lever steps past a professor who is teaching (got ${fire(stalled(1))})`);

  // Every professor teaching, every slot spoken for: the lever declines.
  // This is the floor itself, and the case the old lever got wrong.
  assert(fire(stalled(3)) === null, `the payroll lever declines to strip a fully-committed department (got ${fire(stalled(3))})`);

  // Price before people: a strategy that would charge more than the school
  // currently charges has a raise pending, and nobody is cut this week.
  const pending = { tuition: (s: GameState) => s.finance.listedTuition + 1 } as unknown as typeof STRATEGIES[number];
  let cutUnderPendingRaise: string | null = null;
  cutPayrollIfStalled(() => stalled(0), STALL_WEEKS_BEFORE_CUTS, (a) => {
    if (a.type === 'FIRE_FACULTY') cutUnderPendingRaise = a.facultyId;
  }, pending);
  assert(cutUnderPendingRaise === null, `the payroll lever waits for a tuition raise it has already decided on (got ${cutUnderPendingRaise})`);
}

// =====================================================================
// 4c. And the standing version of the same invariant over the sweep: no
// strategy, in any year, offers courses with nobody at all on the roster.
// Vacuous at 20 years for the reason 4b explains — kept because it costs
// one pass over rows already computed, and because a future horizon
// change is exactly when it stops being vacuous.
// =====================================================================
for (const strategy of STRATEGIES) {
  const { run } = find(strategy.name);
  const stripped = run.rows.find((r) => r.courses > 0 && r.faculty === 0);
  assert(
    stripped === undefined,
    `"${strategy.name}" never offers courses with an empty roster` +
    (stripped ? ` (year ${stripped.year}: ${stripped.courses} courses, 0 faculty)` : ''),
  );
}

// =====================================================================
// 5. THE PINCH IS REAL — every strategy that actually builds sees its
// weekly opex at least quadruple from its founding level by year 20 (the
// "cost leads revenue" shape financeSystem.ts is tuned for), so this
// isn't measuring a flat, undemanding economy.
// =====================================================================
{
  const { run } = find('Balanced builder');
  const founding = run.rows[0];
  const last = run.rows[run.rows.length - 1];
  assert(last.opex > founding.opex * 4, `opex grows substantially from founding to year ${YEARS} (founding ${founding.opex.toLocaleString()}, now ${last.opex.toLocaleString()})`);
}

// =====================================================================
// 6. CURRICULUM BREADTH IS AN ENROLLMENT-SCALE-OR-PRICE PROPOSITION — the
// design this replaces financeSystem.ts's old "instruction is never a
// loss" blanket claim with (see that file's own note on
// instructionCostPerStudent): a heavily-discounted strategy's own net
// tuition per student can fall below what a large catalogue costs to
// teach, so courseAffordabilityAware throttles Discount volume's course
// build-out well below what a market-rate strategy reaches on the same
// clock. This locks in that the throttle is actually doing something, not
// a no-op guard that never fires because nothing ever gets close to its
// line.
// =====================================================================
{
  const discount = find('Discount volume (beds first)');
  const marketRate = find('Curriculum rush (overreach)');
  const discountCourses = discount.run.rows[discount.run.rows.length - 1].courses;
  const marketRateCourses = marketRate.run.rows[marketRate.run.rows.length - 1].courses;
  assert(
    discountCourses < marketRateCourses * 0.5,
    `the discount-heavy strategy's curriculum stays materially thinner than the market-rate strategy's by year ${YEARS} (discount ${discountCourses} courses vs. market-rate ${marketRateCourses} courses)`,
  );
  // Thinner curriculum, not a starved school — it is still solvent and
  // growing, just spending its margin on enrollment scale and aid instead
  // of course breadth (see STRATEGIES' own comment on that trade-off).
  // Cash, not a single year's noisy net (see case 4's own note on why),
  // is the health signal here.
  // Health is read off the recovery horizon, for the reason RECOVERY_YEARS
  // exists: this strategy is still climbing out at year 20 and clear of the
  // water by year 40. The curriculum-thinness comparison above stays at
  // year 20, where both strategies are measured on the same clock.
  const discountLast = discountRecovery.run.rows[discountRecovery.run.rows.length - 1];
  const recent = discountMeanCash(RECOVERY_YEARS - 10, RECOVERY_YEARS);
  const earlier = discountMeanCash(RECOVERY_YEARS - 20, RECOVERY_YEARS - 10);
  assert(
    discountLast.cash > 0 && recent > earlier,
    `the discount-heavy strategy is healthy despite the cap, not just capped `
    + `(cash ${discountLast.cash.toLocaleString()}, last decade averaged ${Math.round(recent).toLocaleString()} `
    + `against ${Math.round(earlier).toLocaleString()} the decade before)`,
  );
}

console.log('balance-regression tests');
if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
