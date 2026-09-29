import type { FinanceBreakdown } from '../systems/finance/financeSystem';

// The Treasury's weekly statement (TreasuryTab.tsx), line by line: which
// figure of financeBreakdown each line shows, its label, and when it shows.
// A line is left off only when its figure is nothing, so the lines shown
// always sum to the totals (the review's G7-8: Student life once went
// missing). test/treasury.test.ts holds them to it.

type Figure = Exclude<keyof FinanceBreakdown, 'totalIncome' | 'totalExpenses' | 'net' | 'gateRevenue'>;

export interface StatementLineSpec {
  key: Figure;
  label: string;
  // When it shows; always, if absent.
  shown?: (flow: FinanceBreakdown) => boolean;
}

export const INCOME_LINES: readonly StatementLineSpec[] = [
  { key: 'tuitionRevenue', label: 'Net tuition' },
  { key: 'prestigeRevenue', label: 'Prestige dividend' },
  { key: 'annualFund', label: 'Annual fund', shown: (f) => f.annualFund > 0 },
  { key: 'endowmentPayout', label: 'Endowment payout' },
  // Shown with a gate, even when nothing was left: the note says where the
  // gate went.
  { key: 'athleticsSurplus', label: 'Athletics surplus', shown: (f) => f.athleticsSurplus > 0 || f.gateRevenue > 0 },
];

export const EXPENSE_LINES: readonly StatementLineSpec[] = [
  { key: 'weeklySalaries', label: 'Faculty salaries' },
  { key: 'seatUpkeep', label: 'Housing upkeep' },
  { key: 'instructionCost', label: 'Instruction' },
  { key: 'servicesCost', label: 'Services' },
  { key: 'scaleCost', label: 'Being large', shown: (f) => f.scaleCost > 0 },
  { key: 'academicUpkeep', label: 'Academic upkeep' },
  { key: 'facilityUpkeep', label: 'Campus upkeep' },
  { key: 'studentLifeUpkeep', label: 'Student life', shown: (f) => f.studentLifeUpkeep > 0 },
  { key: 'athleticsSubsidy', label: 'Athletics subsidy', shown: (f) => f.athleticsSubsidy > 0 },
  { key: 'athleticScholarships', label: 'Athletic scholarships', shown: (f) => f.athleticScholarships > 0 },
  { key: 'administration', label: 'Administration', shown: (f) => f.administration > 0 },
  { key: 'debtService', label: 'Loan repayments', shown: (f) => f.debtService > 0 },
];

export function shownLines(lines: readonly StatementLineSpec[], flow: FinanceBreakdown): StatementLineSpec[] {
  return lines.filter((l) => l.shown?.(flow) ?? true);
}
