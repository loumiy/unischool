import type { GameState } from '../../state/types';

// Recomputes operating costs and applies weekly cash flow.
// Pure: takes state, mutates a draft. (We use structural cloning in the reducer.)
export function tickFinance(s: GameState): void {
  const salaries = s.faculty.reduce((sum, f) => sum + f.salary, 0);
  const weeklySalaries = salaries / 52;               // salaries are annual
  const upkeep = s.students.capacity * 5;             // crude per-seat upkeep
  s.finance.weeklyOpEx = weeklySalaries + upkeep;

  const tuitionRevenue =
    (s.students.enrolled * s.finance.tuitionPerStudent) / 52; // annual, weekly slice

  const net = tuitionRevenue - s.finance.weeklyOpEx;
  s.finance.cash += net;

  // Endowment drifts with a small return, independent of operations.
  s.finance.endowment *= 1 + 0.0005; // ~2.6% annualized at 52 wks; tune later

  if (s.finance.cash < 0 && s.finance.endowment > 100_000) {
    // Auto-draw from endowment to cover shortfalls, with a warning cost.
    const draw = Math.min(-s.finance.cash, s.finance.endowment * 0.1);
    s.finance.cash += draw;
    s.finance.endowment -= draw;
  }

  if (s.finance.cash < -500_000) {
    s.gameOver = true;
    s.log.unshift({
      year: s.clock.year,
      week: s.clock.week,
      message: 'The university is insolvent. Game over.',
      kind: 'bad',
    });
  }
}
