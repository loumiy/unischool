// ---------------------------------------------------------------------
// Plan 98G: the next-step line asks for research in an idle lab only when
// a project can start there, an unblocked offer the college can fund with
// LAB_RESERVE_WEEKS of expenses left in hand. Before, it asked whenever a
// lab stood idle, and the guided player failed about two weeks in three.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { initiativeOffers } from '../src/data/researchData';
import { hostableFields } from '../src/data/techData';
import { financeBreakdown } from '../src/systems/finance/financeSystem';
import { LAB_RESERVE_WEEKS, labCanStart, nextStep } from '../src/systems/guidance/nextStep';
import type { Faculty } from '../src/state/types';

bindScriptStream(9813);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) { failures += 1; console.log(`  ✗ ${msg}`); }
}

console.log('lab step tests');

const s = createInitialState('Ashcombe');
s.clock.year = 6;
const lab = s.tech.find((t) => t.kind === 'facility' && t.facilityType === 'lab')!;
lab.status = 'done';
const says = () => nextStep(s)?.text ?? '';

// No scholars: every offer is blocked, so the lab isn't the line's to raise.
s.finance.cash = 1e9;
assert(!labCanStart(s, lab.id), 'a lab with no scholar can start nothing');
assert(!says().includes(lab.name), `and the line doesn't name it ("${says()}")`);

// Scholars in every field the lab hosts.
for (const [i, field] of hostableFields(lab.id).entries()) {
  for (let n = 0; n < 4; n += 1) {
    s.faculty.push({ id: `t-${i}-${n}`, name: `Scholar ${i}-${n}`, field, teaching: 70, research: 70, acclaim: 0, courseSlots: 5, salary: 100_000, tenureWeeks: 0 } as Faculty);
  }
}
const cheapest = Math.min(...initiativeOffers(s, lab.id).filter((o) => !o.blockedReason).map((o) => o.fundingCost));
assert(Number.isFinite(cheapest), 'with scholars, an offer is open');
const floor = LAB_RESERVE_WEEKS * financeBreakdown(s).totalExpenses;
s.finance.cash = floor + cheapest;
assert(labCanStart(s, lab.id), 'with the reserve and the funding in hand, it can start');
s.finance.cash = floor + cheapest - 1;
assert(!labCanStart(s, lab.id), 'a dollar short of keeping the reserve, it cannot');
assert(!says().includes(lab.name), `and the line moves on ("${says()}")`);

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
if (failures > 0) process.exit(1);
