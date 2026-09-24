// The quarter turn (Plan 37, components/isoProjection.ts's easeInOut and
// turnStep): eased at both ends, arriving exactly, and a second press
// mid-turn carries on from where the view has got to.

import { TURN_MS, VIEWS, easeInOut, turnStep } from '../src/components/isoProjection';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('turn tests');

assert(TURN_MS > 0 && TURN_MS <= 400, `a quarter turn is quick (${TURN_MS} ms)`);
assert(easeInOut(0) === 0 && easeInOut(1) === 1 && Math.abs(easeInOut(0.5) - 0.5) < 1e-12, 'eased from rest to rest, half way at half time');
assert(easeInOut(-1) === 0 && easeInOut(2) === 1, 'and clamped either side');
const samples = Array.from({ length: 101 }, (_, i) => easeInOut(i / 100));
assert(samples.every((v, i) => i === 0 || v >= samples[i - 1]), 'never turning back');
assert(easeInOut(0.1) < 0.1 && easeInOut(0.9) > 0.9, 'slow to start and slow to stop');

const quarter = Math.PI / 2;
const from = VIEWS[0];
assert(turnStep(from, from + quarter, 0) === from && Math.abs(turnStep(from, from + quarter, 1) - (from + quarter)) < 1e-12, 'a turn starts where the view is and ends a quarter on');
// A second press at 40%: from the view's current angle, to the next quarter
// beyond the first target, so the view never jumps.
const at = turnStep(from, from + quarter, 0.4);
const retarget = turnStep(at, from + 2 * quarter, 0);
assert(Math.abs(retarget - at) < 1e-12, 'a second press carries on from where the view has got to');

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
