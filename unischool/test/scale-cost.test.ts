// The cost of being large (Plan 36, systems/finance/financeSystem.ts's
// scaleCostFor): free below the founding threshold, rising with every
// doubling of the roll, so the marginal student costs more as the college
// grows, the property the plan rests on; and one line the Treasury and the
// tick read alike.

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { SCALE_FREE_BELOW, financeBreakdown, scaleCostFor } from '../src/systems/finance/financeSystem';
import { marketRateMultiplier } from '../src/data/facultyData';

bindScriptStream(3360);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('scale cost tests');

const RATE = 10; // a rate of the test's own: the constant is fitted in Plan 36's PR D

// ---- Free below the threshold ----
{
  assert(scaleCostFor(350, 50, RATE) === 0 && scaleCostFor(SCALE_FREE_BELOW, 50, RATE) === 0, 'a founding college pays nothing');
  assert(scaleCostFor(SCALE_FREE_BELOW + 1, 50, RATE) > 0, 'one past the threshold pays');
}

// ---- Rising with size ----
{
  const sizes = [2_000, 4_000, 8_000, 16_000, 32_000];
  const costs = sizes.map((n) => scaleCostFor(n, 50, RATE));
  assert(costs.every((c, i) => i === 0 || c > costs[i - 1]), 'more students cost more');
  const perStudent = sizes.map((n, i) => costs[i] / n);
  assert(perStudent.every((c, i) => i === 0 || c > perStudent[i - 1]), 'and each costs more than the last size\'s');
  const marginal = (n: number) => (scaleCostFor(n + 1_000, 50, RATE) - scaleCostFor(n, 50, RATE)) / 1_000;
  assert(marginal(4_000) < marginal(16_000) && marginal(16_000) < marginal(30_000), 'the next thousand cost more the larger the college (the plan\'s property)');
  const step = (n: number) => scaleCostFor(n * 2, 50, RATE) / (n * 2) - scaleCostFor(n, 50, RATE) / n;
  assert(Math.abs(step(3_000) - step(12_000)) < 1e-9, 'every doubling adds the same to each student\'s share: no cliff');
}

// ---- At the market rate ----
{
  const ratio = scaleCostFor(10_000, 130, RATE) / scaleCostFor(10_000, 50, RATE);
  assert(Math.abs(ratio - marketRateMultiplier(130)) < 1e-9, 'charged at the prestige market rate, like services');
}

// ---- One line ----
{
  const s = createInitialState('Scale');
  s.students.classes = { freshman: 3_000, sophomore: 3_000, junior: 2_000, senior: 2_000 };
  const flow = financeBreakdown(s);
  assert(flow.scaleCost === scaleCostFor(10_000, s.self.reputation), 'the tick charges what the line says');
  const lines = flow.weeklySalaries + flow.seatUpkeep + flow.instructionCost + flow.servicesCost + flow.scaleCost +
    flow.academicUpkeep + flow.facilityUpkeep + flow.studentLifeUpkeep + flow.athleticsSubsidy + flow.debtService + flow.administration;
  assert(Math.abs(flow.totalExpenses - lines) < 1e-6, 'and it is one of the lines the expenses add up');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
