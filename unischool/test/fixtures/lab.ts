// A finished lab a project can start in (Plan 98G): the next-step line names
// an idle lab only then (nextStep.ts's labCanStart). Four scholars in each
// field the lab hosts, none on an initiative, and the cash to fund its
// dearest offer with a year of expenses still in hand. Not a game path.

import type { Faculty, GameState } from '../../src/state/types';
import { hostableFields } from '../../src/data/techData';
import { initiativeOffers } from '../../src/data/researchData';
import { financeBreakdown } from '../../src/systems/finance/financeSystem';

export function equipLab(s: GameState, labId: string): void {
  for (const [i, field] of hostableFields(labId).entries()) {
    for (let n = 0; n < 4; n += 1) {
      s.faculty.push({ id: `lab-${labId}-${i}-${n}`, name: `Scholar ${i}-${n}`, field, teaching: 70, research: 70, acclaim: 0, courseSlots: 5, salary: 100_000, tenureWeeks: 0 } as Faculty);
    }
  }
  const dearest = Math.max(...initiativeOffers(s, labId).map((o) => o.fundingCost));
  s.finance.cash = Math.max(s.finance.cash, dearest + 52 * financeBreakdown(s).totalExpenses);
}
