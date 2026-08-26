import type { GameState } from '../../state/types';

// ---------------------------------------------------------------------
// Pacing constants. This file is the game's primary throttle (see
// README's "Pacing model: money is the throttle"): cash should feel like
// a bottleneck early/mid-game and ease as the school matures. Revenue is
// meant to grow on two axes — enrollment AND prestige — while costs grow
// on one — capacity/faculty — so the income-vs-ambition gap narrows over
// a long playthrough instead of staying flat. Tune these by feel; every
// rate lives here, named, so balancing never means hunting for magic
// numbers.
// ---------------------------------------------------------------------

// Calendar weeks used to annualize salaries and revenue (i.e. how many
// ticks make "a year" for money purposes). Distinct from the in-game
// academic WEEKS_PER_YEAR (16 — the school-year/admissions clock); this
// is purely the financial annualization basis, unchanged from the
// original model.
const CALENDAR_WEEKS_PER_YEAR = 52;

// Flat per-seat weekly upkeep. Deliberately simple and NOT prestige-linked:
// costs are meant to scale more slowly than revenue, so operating cost
// tracks only the school's physical size (capacity), never its standing.
const UPKEEP_PER_SEAT_PER_WEEK = 5;

// Tuition (player-set via SET_TUITION) is the base revenue lever, scaling
// with enrollment. On top of it, a "reputation dividend" — donors,
// grants, brand value — scales with prestige, independent of enrollment.
// This is the simple stand-in for the future demand-curve model the
// README describes (where prestige shifts the tuition/enrollment
// frontier): it's isolated to this one line so that richer model can
// replace it later without touching anything else in this file, or any
// other system.
const REPUTATION_DIVIDEND_PER_POINT_PER_YEAR = 400;

// Endowment: a slow, steady long-term reserve, independent of week-to-week
// operations. Intentionally NOT an auto-draw backstop against negative
// cash — see the "no hard insolvency" note in tickFinance below.
const ENDOWMENT_ANNUAL_RETURN = 0.026; // ~2.6%/yr, applied as a weekly slice

// Recomputes operating costs and applies weekly cash flow.
// Pure: takes state, mutates a draft. (We use structural cloning in the reducer.)
export function tickFinance(s: GameState): void {
  const weeklySalaries = s.faculty.reduce((sum, f) => sum + f.salary, 0) / CALENDAR_WEEKS_PER_YEAR;
  const upkeep = s.students.capacity * UPKEEP_PER_SEAT_PER_WEEK;
  s.finance.weeklyOpEx = weeklySalaries + upkeep;

  const tuitionRevenue = (s.students.enrolled * s.finance.tuitionPerStudent) / CALENDAR_WEEKS_PER_YEAR;
  const prestigeRevenue = (s.self.reputation * REPUTATION_DIVIDEND_PER_POINT_PER_YEAR) / CALENDAR_WEEKS_PER_YEAR;

  const net = tuitionRevenue + prestigeRevenue - s.finance.weeklyOpEx;
  s.finance.cash += net;

  // Endowment drifts with a small return, independent of operations — a
  // slow reserve, not a death backstop. Cash is allowed to go negative:
  // per README's pacing model, a shortfall stalls new development (see
  // canStartDevelopment in techSystem.ts) rather than ending the run, so
  // there is deliberately no auto-draw and no insolvency game-over here.
  s.finance.endowment *= 1 + ENDOWMENT_ANNUAL_RETURN / CALENDAR_WEEKS_PER_YEAR;
}
