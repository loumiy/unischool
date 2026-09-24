// Rising expectations and diminishing returns (src/systems/satisfaction/
// satisfactionSystem.ts, Plan 29): a better name asks more of the library,
// social life and beds, and what a college does above 80 counts half.

import { createInitialState } from '../src/state/actions';
import {
  DIMINISHING_ABOVE, computeSatisfactionBreakdown, diminished, expectation, satisfactionTarget,
} from '../src/systems/satisfaction/satisfactionSystem';
import { bindScriptStream } from '../src/engine/random';

bindScriptStream(2931);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('expectations tests');

{
  assert(diminished(60) === 60 && diminished(DIMINISHING_ABOVE) === DIMINISHING_ABOVE, 'up to 80 a target counts in full');
  assert(diminished(100) === 90 && diminished(90) === 85, 'above it, half');
  const s = createInitialState('Expectations');
  s.self.reputation = 50;
  assert(expectation(s) === 1, 'a founding name expects nothing extra');
  s.self.reputation = 150;
  assert(Math.abs(expectation(s) - 1.1) < 1e-9, 'a name at 150 expects a tenth more');
  s.students.classes = { freshman: 4000, sophomore: 3000, junior: 3000, senior: 3000 };
  s.self.reputation = 50;
  const plain = computeSatisfactionBreakdown(s);
  s.self.reputation = 150;
  const grand = computeSatisfactionBreakdown(s);
  assert(grand.housing <= plain.housing && grand.academic <= plain.academic, 'the same campus satisfies less under a grander name');
  assert(grand.basicNeeds === plain.basicNeeds && grand.health === plain.health, 'food and care are needs, and do not rise');
  assert(satisfactionTarget(s) <= 90, 'the headline target never passes 90');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
