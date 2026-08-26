import type { GameState } from '../../state/types';

// --- Weekly finance rates --------------------------------------------------
// Keep every rate here, named and labeled, so pacing can be tuned by feel
// without hunting through the tick logic.

// Income: a flat base (grants, state funding) regardless of size, plus a
// per-course amount for every developed course (program revenue), plus a
// small reputation-driven amount (donor interest). This whole shape lives in
// computeWeeklyIncome() below so it can be swapped for a richer demand-curve
// model later (prestige trading off tuition vs. enrollment volume) without
// touching costs, the endowment, or anything else in this system.
const BASE_WEEKLY_INCOME = 4_000;
const INCOME_PER_DEVELOPED_COURSE = 150;
const INCOME_PER_REPUTATION_POINT = 5;

// Costs: faculty salaries (stored annual, sliced weekly) plus a small
// upkeep cost per developed course (materials, facilities, staffing).
const UPKEEP_PER_DEVELOPED_COURSE = 40;

// Endowment: a slow-growing reserve that absorbs cash shortfalls.
const ENDOWMENT_WEEKLY_GROWTH = 0.0005; // ~2.6% annualized at 52 weeks
const ENDOWMENT_DRAW_FRACTION = 0.1;    // max fraction of endowment drawn per week
const ENDOWMENT_DRAW_FLOOR = 100_000;   // stop auto-drawing once endowment is this low
const INSOLVENCY_THRESHOLD = -500_000;  // cash this negative ends the game

function developedCourseCount(s: GameState): number {
  return s.tech.filter((t) => t.status === 'done').length;
}

// The one function to replace with a demand-curve model later.
export function computeWeeklyIncome(s: GameState): number {
  return (
    BASE_WEEKLY_INCOME +
    developedCourseCount(s) * INCOME_PER_DEVELOPED_COURSE +
    s.self.reputation * INCOME_PER_REPUTATION_POINT
  );
}

function computeWeeklyCosts(s: GameState): number {
  const annualSalaries = s.faculty.reduce((sum, f) => sum + f.salary, 0);
  const weeklySalaries = annualSalaries / 52;
  const upkeep = developedCourseCount(s) * UPKEEP_PER_DEVELOPED_COURSE;
  return weeklySalaries + upkeep;
}

// Recomputes income and costs and applies weekly cash flow.
// Pure: takes state, mutates a draft. (We use structural cloning in the reducer.)
export function tickFinance(s: GameState): void {
  const income = computeWeeklyIncome(s);
  const costs = computeWeeklyCosts(s);
  s.finance.weeklyOpEx = costs;
  s.finance.cash += income - costs;

  // Endowment drifts with a small return, independent of operations.
  s.finance.endowment *= 1 + ENDOWMENT_WEEKLY_GROWTH;

  if (s.finance.cash < 0 && s.finance.endowment > ENDOWMENT_DRAW_FLOOR) {
    // Auto-draw from endowment to cover shortfalls.
    const draw = Math.min(-s.finance.cash, s.finance.endowment * ENDOWMENT_DRAW_FRACTION);
    s.finance.cash += draw;
    s.finance.endowment -= draw;
  }

  if (s.finance.cash < INSOLVENCY_THRESHOLD) {
    s.gameOver = true;
    s.log.unshift({
      year: s.clock.year,
      week: s.clock.week,
      message: 'The university is insolvent. Game over.',
      kind: 'bad',
    });
  }
}
