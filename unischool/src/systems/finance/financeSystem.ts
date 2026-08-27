import type { GameState } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';

// ---------------------------------------------------------------------
// Pacing constants. This file is the game's primary throttle (see
// README's "Pacing model: money is the throttle"): cash should feel like
// a bottleneck early/mid-game and ease as the school matures. Revenue is
// meant to grow on two axes — enrollment AND prestige — while costs grow
// on one — capacity/faculty — so the income-vs-ambition gap narrows over
// a long playthrough instead of staying flat. Tune these by feel; every
// rate lives here, named, so balancing never means hunting for magic
// numbers.
//
// Salaries/revenue are annualized over WEEKS_PER_YEAR — the same clock
// that drives the academic calendar and admissions — so there is exactly
// one definition of "a year" anywhere in the game.
// ---------------------------------------------------------------------

// Flat per-seat weekly upkeep. Deliberately simple and NOT prestige-linked:
// costs are meant to scale more slowly than revenue, so operating cost
// tracks only the school's physical size (capacity), never its standing.
const UPKEEP_PER_SEAT_PER_WEEK = 5;

// Tuition (player-set once a year via the summer admissions interrupt —
// see admissionsSystem.ts) is the base revenue lever, scaling with
// enrollment. financialAidRate (also set there) discounts the price each
// enrolled student actually pays, so offering aid has a real, felt
// revenue cost in exchange for the satisfaction/conversion effects it
// buys in admissionsSystem.ts. On top of tuition, a "reputation
// dividend" — donors, grants, brand value — scales with prestige,
// independent of enrollment. This is the simple stand-in for the future
// demand-curve model the README describes (where prestige shifts the
// tuition/enrollment frontier): it's isolated to this one line so that
// richer model can replace it later without touching anything else in
// this file, or any other system.
const REPUTATION_DIVIDEND_PER_POINT_PER_YEAR = 400;

// Endowment: a slow, steady long-term reserve, independent of week-to-week
// operations. Intentionally NOT an auto-draw backstop against negative
// cash — see the "no hard insolvency" note in tickFinance below.
const ENDOWMENT_ANNUAL_RETURN = 0.026; // ~2.6%/yr, applied as a weekly slice

function weeklyOpEx(s: GameState): number {
  const weeklySalaries = s.faculty.reduce((sum, f) => sum + f.salary, 0) / WEEKS_PER_YEAR;
  const upkeep = s.students.capacity * UPKEEP_PER_SEAT_PER_WEEK;
  return weeklySalaries + upkeep;
}

function weeklyRevenue(s: GameState): number {
  const netTuitionPerStudent = s.finance.tuitionPerStudent * (1 - s.admissions.financialAidRate);
  const tuitionRevenue = (s.students.enrolled * netTuitionPerStudent) / WEEKS_PER_YEAR;
  const prestigeRevenue = (s.self.reputation * REPUTATION_DIVIDEND_PER_POINT_PER_YEAR) / WEEKS_PER_YEAR;
  // Set once at founding by school type (e.g. state appropriations for a
  // public school; 0 for private) — see SCHOOL_TYPE_PRESETS.
  return tuitionRevenue + prestigeRevenue + s.finance.baselineFundingPerWeek;
}

// Net weekly cash flow at the current state, without mutating anything.
// Exported so the UI can show an accurate "this week's trend" figure
// without keeping a second copy of this formula that can drift out of
// sync with tickFinance below.
export function weeklyNet(s: GameState): number {
  return weeklyRevenue(s) - weeklyOpEx(s);
}

// Recomputes operating costs and applies weekly cash flow.
// Pure: takes state, mutates a draft. (We use structural cloning in the reducer.)
export function tickFinance(s: GameState): void {
  s.finance.weeklyOpEx = weeklyOpEx(s);
  s.finance.cash += weeklyRevenue(s) - s.finance.weeklyOpEx;

  // Endowment drifts with a small return, independent of operations — a
  // slow reserve, not a death backstop. Cash is allowed to go negative:
  // per README's pacing model, a shortfall stalls new development (see
  // canStartDevelopment in techSystem.ts) rather than ending the run, so
  // there is deliberately no auto-draw and no insolvency game-over here.
  s.finance.endowment *= 1 + ENDOWMENT_ANNUAL_RETURN / WEEKS_PER_YEAR;
}
