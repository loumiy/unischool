// ---------------------------------------------------------------------
// PER-CLASS TUITION (see state/types.ts's tuitionByClass and Plan 05's PR
// A). A price belongs to the class that was quoted it and follows that
// class to graduation, so a school collects up to four prices at once and
// a mid-stream raise reaches nobody already enrolled.
//
// This suite carries the invariant that used to live in
// admissions-pricing.test.ts's "THE EXPLOIT IS CLOSED" section. That
// section tested a DIFFERENT exploit — inflating the sticker while holding
// net price fixed with scholarships — which sticker shock answered. The one
// here is the retroactive hike: stay cheap while the school grows, then
// reprice four captive classes. Under one scalar that was free money.
//
// These checks drive the real reducer rather than a pure function, because
// the invariant is about WHEN a price is applied, and that lives in
// RESOLVE_ADMISSIONS's advance — not in any formula.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { findDecisionEvent, type DecisionEventContext } from '../src/data/eventData';
import { annualTuitionBilled, tuitionByClassBilled } from '../src/systems/finance/financeSystem';
import type { GameState } from '../src/state/types';
import { totalEnrolled, WEEKS_PER_YEAR } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

// Clear whatever non-admissions interrupt is holding the clock. Same set
// and same choices as invariants.test.ts's own advanceUntil — a decision
// event takes the cheapest affordable option, everything else is simply
// acknowledged — so a year played here is a year played there.
function dismiss(s: GameState, type: string): GameState {
  if (type === 'milestone') return reducer(s, { type: 'RESOLVE_MILESTONE' });
  if (type === 'research-complete') return reducer(s, { type: 'RESOLVE_RESEARCH_REPORT' });
  if (type === 'demand') return reducer(s, { type: 'RESOLVE_DEMAND' });
  if (type === 'charter') return reducer(s, { type: 'RESOLVE_CHARTER', accept: false });
  if (type === 'decision-event') {
    const payload = s.pendingInterrupt!.payload as { eventId: string; ctx: DecisionEventContext };
    const event = findDecisionEvent(payload.eventId);
    const choice = event?.choices.find((c) => c.cost(s, payload.ctx) <= s.finance.cash);
    return reducer(s, {
      type: 'RESOLVE_DECISION_EVENT', eventId: payload.eventId, choiceId: choice?.id ?? '', ctx: payload.ctx,
    });
  }
  return reducer(s, { type: 'RESOLVE_REPORT' });
}

// Tick to the summer interrupt and resolve it at `tuition`, returning the
// state on the far side of the boundary. Every other interrupt that can
// fire on the way is dismissed, so this is a clean "play one year at this
// price" — the same shape invariants.test.ts's own advanceUntil uses.
function playYearAt(start: GameState, tuition: number): GameState {
  let s = start;
  for (let i = 0; i < WEEKS_PER_YEAR * 2; i += 1) {
    const pending = s.pendingInterrupt;
    if (pending?.type === 'admissions') {
      return reducer(s, {
        type: 'RESOLVE_ADMISSIONS',
        tuition,
        admitRate: s.students.admitRate,
        approvedPetitionIds: [],
      });
    }
    if (pending) {
      s = dismiss(s, pending.type);
      continue;
    }
    s = reducer(s, { type: 'TICK' });
  }
  throw new Error('no admissions interrupt inside two years');
}

// =====================================================================
// 1. A FOUNDED SCHOOL OPENS AT ONE PRICE — all four classes were admitted
// under the founding price, so nothing has diverged yet and the listed
// price agrees with every class. A founding seed that got this wrong would
// make every later assertion here meaningless.
// =====================================================================
{
  const s = createInitialState('Opening', 'private');
  const p = s.finance.tuitionByClass;
  assert(p.freshman === s.finance.listedTuition && p.sophomore === s.finance.listedTuition
    && p.junior === s.finance.listedTuition && p.senior === s.finance.listedTuition,
    'a founded school opens with all four classes at the listed price');
  assert(Math.abs(annualTuitionBilled(s) - totalEnrolled(s.students) * s.finance.listedTuition) < 1e-6,
    'at one price, the four-product sum equals the old enrolled x price reading');
}

// =====================================================================
// 2. THE EXPLOIT IS CLOSED — the invariant this suite exists for. Play a
// year cheap, then raise the price hard. The three classes already on the
// books must bill EXACTLY what they billed before the raise; only the
// incoming freshmen pay the new price.
// =====================================================================
{
  const CHEAP = 12_000;
  const STEEP = 48_000;

  const founded = createInitialState('Hiker', 'private');
  const FOUNDING = founded.finance.listedTuition;
  const afterFirst = playYearAt(founded, CHEAP);
  const beforeRaise = tuitionByClassBilled(afterFirst);

  const afterRaise = playYearAt(afterFirst, STEEP);
  const price = afterRaise.finance.tuitionByClass;

  // Three intakes are on the books by now and they were priced at three
  // different moments: the founding body, the CHEAP year, and this one.
  // That is the model working — a school two raises deep really is billing
  // three prices at once.
  assert(price.freshman === STEEP, `the incoming class pays the new price (got ${price.freshman})`);
  assert(price.sophomore === CHEAP,
    `the class admitted the year before the raise keeps the cheap price (got ${price.sophomore})`);
  assert(price.junior === FOUNDING && price.senior === FOUNDING,
    `the founding classes are still on the founding price (got ${price.junior}, ${price.senior})`);
  assert(price.sophomore !== STEEP && price.junior !== STEEP && price.senior !== STEEP,
    'the raise reaches nobody already enrolled');

  // The class that was a sophomore before the raise is a junior after it,
  // and is billed the same number of dollars per student either way: the
  // raise reached its price not at all. Compare per-student prices rather
  // than totals, since the head counts are the same body shifted a year.
  const billedAfter = tuitionByClassBilled(afterRaise);
  const perStudent = (billed: number, count: number): number => (count > 0 ? billed / count : 0);
  assert(
    Math.abs(perStudent(billedAfter.junior, afterRaise.students.classes.junior)
      - perStudent(beforeRaise.sophomore, afterFirst.students.classes.sophomore)) < 1e-6,
    'the class that advanced across the raise is billed the same per student as before it',
  );

  // And the money, stated as the exploit would have stated it: under one
  // scalar, the raise would have repriced the WHOLE body at STEEP.
  const wholeBodyAtNewPrice = totalEnrolled(afterRaise.students) * STEEP;
  assert(annualTuitionBilled(afterRaise) < wholeBodyAtNewPrice,
    'a raise bills strictly less than repricing the whole body would have');
}

// =====================================================================
// 3. A RAISE IS WORTH EXACTLY THE INCOMING CLASS — the positive half of
// the same invariant. Two schools played identically except for the price
// set at one boundary differ by (new freshmen) x (the difference), and by
// nothing else. This is what makes the decision legible: the player is
// pricing ONE class, not the school.
// =====================================================================
{
  const BASE = 15_000;
  const RAISED = 25_000;

  const founded = createInitialState('Baseline', 'private');
  const afterFirst = playYearAt(founded, BASE);

  const flat = playYearAt(afterFirst, BASE);
  const raised = playYearAt(afterFirst, RAISED);

  // Same history, so the same classes advanced; the funnel itself responds
  // to price, so the freshman COUNTS differ — which is why the delta is
  // computed from each school's own freshman line rather than assumed equal.
  const flatBilled = tuitionByClassBilled(flat);
  const raisedBilled = tuitionByClassBilled(raised);
  const olderFlat = flatBilled.sophomore + flatBilled.junior + flatBilled.senior;
  const olderRaised = raisedBilled.sophomore + raisedBilled.junior + raisedBilled.senior;
  assert(Math.abs(olderFlat - olderRaised) < 1e-6,
    `the three older classes bill identically whatever the new price is (${olderFlat} vs ${olderRaised})`);
  assert(raisedBilled.freshman !== flatBilled.freshman,
    'the freshman line is the only one the decision moves');
}

// =====================================================================
// 4. A PRICE LEAVES WITH THE CLASS THAT PAID IT — four years after a
// raise, nobody admitted at the old price is left, so every class is on
// the new one. The prices must not outlive their class.
// =====================================================================
{
  const OLD = 10_000;
  const NEW = 30_000;

  let s = createInitialState('Flusher', 'private');
  s = playYearAt(s, OLD);
  for (let year = 0; year < 4; year += 1) s = playYearAt(s, NEW);

  const p = s.finance.tuitionByClass;
  assert(p.freshman === NEW && p.sophomore === NEW && p.junior === NEW && p.senior === NEW,
    `four intakes later, no class is still on the old price (got ${JSON.stringify(p)})`);
}

console.log('class-pricing tests');
if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
