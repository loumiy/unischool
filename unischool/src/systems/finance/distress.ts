import type { Distress, DistressRung, GameState } from '../../state/types';

// THE DISTRESS LADDER (Plan 27D, from v2's distress.ts). There is no
// bankruptcy. Running out of money is a ladder of five rungs, each
// survivable, climbed down and back up a term at a time:
//   Tight         cash under a term's expenses;
//   Deficit       two deficit terms in a row;
//   Freeze        cash at or below zero: no new construction, no borrowing;
//   Austerity     three terms frozen: the board cuts maintenance to nothing
//                 and will not let tuition fall;
//   Receivership  three terms of austerity: for three years an interim CFO
//                 sets the draw and the maintenance, and the college keeps
//                 its curriculum.
// Down one rung a term (except that empty reserves go straight to Freeze),
// back up as the conditions allow. The board writes at each step that
// matters (from Deficit down, and the ways back), as a note that never
// stops the clock.
//
// This game's year has no terms of its own, so the ladder keeps three: they
// open at weeks 1, 18 and 35, and each closes as the next opens.

export const TERM_START_WEEKS = [1, 18, 35] as const;
const TERM_WEEKS = 17;

export const RUNG_SOUND: DistressRung = 0;
export const RUNG_TIGHT: DistressRung = 1;
export const RUNG_DEFICIT: DistressRung = 2;
export const RUNG_FREEZE: DistressRung = 3;
export const RUNG_AUSTERITY: DistressRung = 4;
export const RUNG_RECEIVERSHIP: DistressRung = 5;
export const RUNG_NAMES = ['Sound', 'Tight', 'Deficit', 'Freeze', 'Austerity', 'Receivership'] as const;

export const DEFICIT_TERMS = 2;
export const SURPLUS_TERMS_TO_EXIT = 2;
export const AUSTERITY_AFTER_TERMS = 3;
export const RECEIVERSHIP_AFTER_TERMS = 3;
export const RECEIVERSHIP_TERMS = 9;
// What the interim CFO sets.
export const BOARD_POLICY_DRAW = 0.05;
export const BOARD_POLICY_MAINTENANCE = 0.5;

// Above this draw the board thinks the college is eating its seed corn.
export const DRAW_RATE_PRUDENT = 0.05;

export const BOARD_CONFIDENCE_START = 70;
const CONFIDENCE_SURPLUS_GAIN = 2;
const CONFIDENCE_DEFICIT_LOSS = 4;
const CONFIDENCE_FREEZE_LOSS = 3;
const CONFIDENCE_AUSTERITY_LOSS = 5;
const CONFIDENCE_OVERDRAW_LOSS = 1;

export function foundingDistress(): Distress {
  return {
    rung: RUNG_SOUND, termsAtRung: 0, confidence: BOARD_CONFIDENCE_START,
    termNet: 0, surplusRun: 0, deficitRun: 0, receivershipTermsLeft: 0,
    letters: [], scars: [],
  };
}

// The ladder as it stands. A save from before it is Sound.
export function distressOf(s: GameState): Distress {
  return s.finance.distress ?? foundingDistress();
}

export function rungOf(s: GameState): DistressRung {
  return s.finance.distress?.rung ?? RUNG_SOUND;
}

// ---- What the rungs forbid ----

// No new construction under a freeze or austerity. The interim CFO builds
// on cash, as anyone may.
export function constructionFrozen(s: GameState): boolean {
  const rung = rungOf(s);
  return rung === RUNG_FREEZE || rung === RUNG_AUSTERITY;
}

export function borrowingAllowed(s: GameState): boolean {
  return rungOf(s) < RUNG_FREEZE;
}

export function inReceivership(s: GameState): boolean {
  return rungOf(s) === RUNG_RECEIVERSHIP;
}

// Under austerity and receivership the board holds the tuition where it is:
// it may rise, never fall.
export function tuitionFloor(s: GameState): number {
  return rungOf(s) >= RUNG_AUSTERITY ? s.finance.listedTuition : 0;
}

// Under austerity and receivership the college's own maintenance and draw
// wait, and the board's apply; they come back when it climbs out.
export function boardHoldsBudget(s: GameState): boolean {
  return rungOf(s) >= RUNG_AUSTERITY;
}

// ---- The term ----

// The week's operating result joins the running term (tickFinance).
export function accrueTerm(s: GameState, net: number): void {
  const d = s.finance.distress ??= foundingDistress();
  d.termNet += net;
}

function termExpenses(s: GameState): number {
  return s.finance.weeklyOpEx * TERM_WEEKS;
}

function rungByConditions(s: GameState, d: Distress): DistressRung {
  if (s.finance.cash <= 0) return RUNG_FREEZE;
  if (d.deficitRun >= DEFICIT_TERMS) return RUNG_DEFICIT;
  if (s.finance.cash < termExpenses(s)) return RUNG_TIGHT;
  return RUNG_SOUND;
}

function recovered(s: GameState, d: Distress): boolean {
  return d.surplusRun >= SURPLUS_TERMS_TO_EXIT && s.finance.cash > 0;
}

export function nextRung(s: GameState, d: Distress): DistressRung {
  switch (d.rung) {
    case RUNG_RECEIVERSHIP:
      // A fixed sentence: the CFO leaves when the term ends, not before.
      return d.receivershipTermsLeft > 0 ? RUNG_RECEIVERSHIP : rungByConditions(s, d);
    case RUNG_AUSTERITY:
      if (recovered(s, d)) return rungByConditions(s, d);
      return d.termsAtRung >= RECEIVERSHIP_AFTER_TERMS ? RUNG_RECEIVERSHIP : RUNG_AUSTERITY;
    case RUNG_FREEZE:
      if (recovered(s, d)) return rungByConditions(s, d);
      return d.termsAtRung >= AUSTERITY_AFTER_TERMS ? RUNG_AUSTERITY : RUNG_FREEZE;
    default: {
      const by = rungByConditions(s, d);
      if (by === RUNG_FREEZE) return RUNG_FREEZE;
      return Math.min(by, d.rung + 1) as DistressRung;
    }
  }
}

// Tight is a reading, not a step: a growing college's cash is often under a
// term's expenses, and a letter every time it dips would be noise. The
// Treasury tab shows it.
function letterFor(from: DistressRung, to: DistressRung): string | null {
  if (to > from) return to === RUNG_TIGHT ? null : `enter-${to}`;
  if (from === RUNG_RECEIVERSHIP) return 'exit-5';
  if (from === RUNG_AUSTERITY) return 'exit-4';
  if (from >= RUNG_DEFICIT && to === RUNG_SOUND) return 'recovered';
  return null;
}

function applyBoardBudget(s: GameState, d: Distress, to: DistressRung): void {
  const f = s.finance;
  const holding = to >= RUNG_AUSTERITY;
  if (holding && d.ownMaintenance === undefined) {
    d.ownMaintenance = f.maintenanceFunding ?? 1;
    d.ownDrawRate = f.drawRate ?? null;
  }
  if (to === RUNG_AUSTERITY) f.maintenanceFunding = 0;
  if (to === RUNG_RECEIVERSHIP) {
    f.maintenanceFunding = BOARD_POLICY_MAINTENANCE;
    f.drawRate = BOARD_POLICY_DRAW;
  }
  if (!holding && d.ownMaintenance !== undefined) {
    if (d.ownMaintenance >= 1) delete f.maintenanceFunding;
    else f.maintenanceFunding = d.ownMaintenance;
    if (d.ownDrawRate === null || d.ownDrawRate === undefined) delete f.drawRate;
    else f.drawRate = d.ownDrawRate;
    delete d.ownMaintenance;
    delete d.ownDrawRate;
  }
}

export function closeTerm(s: GameState): void {
  const d = s.finance.distress ??= foundingDistress();
  const surplus = d.termNet >= 0;
  d.surplusRun = surplus ? d.surplusRun + 1 : 0;
  d.deficitRun = surplus ? 0 : d.deficitRun + 1;
  d.termsAtRung += 1;
  // A term served under the CFO counts off the sentence before the ladder
  // reads it.
  if (d.rung === RUNG_RECEIVERSHIP) d.receivershipTermsLeft = Math.max(0, d.receivershipTermsLeft - 1);
  const from = d.rung;
  const to = nextRung(s, d);

  let c = d.confidence;
  if (surplus && to === RUNG_SOUND) c += CONFIDENCE_SURPLUS_GAIN;
  if (!surplus) c -= CONFIDENCE_DEFICIT_LOSS;
  if (to === RUNG_FREEZE) c -= CONFIDENCE_FREEZE_LOSS;
  if (to >= RUNG_AUSTERITY) c -= CONFIDENCE_AUSTERITY_LOSS;
  if ((s.finance.drawRate ?? 0) > DRAW_RATE_PRUDENT) c -= CONFIDENCE_OVERDRAW_LOSS;
  d.confidence = Math.max(0, Math.min(100, c));

  if (to === RUNG_RECEIVERSHIP && from !== RUNG_RECEIVERSHIP) {
    d.receivershipTermsLeft = RECEIVERSHIP_TERMS;
    d.scars.push(s.clock.year);
  }
  if (to !== RUNG_RECEIVERSHIP) d.receivershipTermsLeft = 0;
  if (to !== from) {
    d.termsAtRung = 0;
    applyBoardBudget(s, d, to);
    const letter = letterFor(from, to);
    if (letter) d.letters.push(letter);
  }
  d.rung = to;
  d.termNet = 0;
}

// Weekly, after the week's money has moved: at the top of a term the one
// before it closes. A week the clock holds (an interrupt) runs again, so the
// close is keyed to the week it happened in.
export function tickDistress(s: GameState): void {
  if (!(TERM_START_WEEKS as readonly number[]).includes(s.clock.week)) return;
  if (s.clock.year === 1 && s.clock.week === 1) return;
  const d = s.finance.distress ??= foundingDistress();
  const key = s.clock.year * 100 + s.clock.week;
  if (d.closedAt === key) return;
  d.closedAt = key;
  closeTerm(s);
}
