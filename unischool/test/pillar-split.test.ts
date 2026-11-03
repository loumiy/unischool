// Prestige by pillar (Plan 124K, prestigeSystem.ts's prestigeByPillar): the
// four parts the tabs' heads and the summer review draw sum to the prestige
// they are parts of, each in proportion to what its pillar brings to the
// blend, and the tick is the target the summer pulls toward.

import { teachingCollege } from './fixtures/teaching';
import {
  computePrestigeTarget, PILLAR_FLOOR, PILLAR_WEIGHTS, PILLARS, gradeYear, prestigeBreakdown, prestigeByPillar,
} from '../src/systems/prestige/prestigeSystem';
import { pillarHeadLine } from '../src/components/PillarHead';
import type { GameState } from '../src/state/types';
import { bindScriptStream } from '../src/engine/random';

bindScriptStream(1241);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

console.log('pillar split tests');

function check(s: GameState, name: string): void {
  const split = prestigeByPillar(s);
  const sum = PILLARS.reduce((t, p) => t + split.parts[p], 0);
  assert(near(sum, s.self.reputation) && near(split.current, s.self.reputation), `${name}: the four parts sum to prestige (${sum.toFixed(3)} of ${s.self.reputation.toFixed(3)})`);
  assert(PILLARS.every((p) => split.parts[p] >= 0), `${name}: no part is negative`);
  assert(near(split.target, computePrestigeTarget(s)), `${name}: the tick is the target (${split.target.toFixed(2)})`);
  // Each part in proportion to its pillar's weight times its value.
  const made = prestigeBreakdown(s);
  const blend = (p: (typeof PILLARS)[number]) => PILLAR_WEIGHTS[p] * PILLAR_FLOOR + made.inputs.find((i) => i.key === p)!.contribution;
  const total = PILLARS.reduce((t, p) => t + blend(p), 0);
  assert(PILLARS.every((p) => near(split.parts[p] / s.self.reputation, blend(p) / total)), `${name}: each part is its pillar's share of the blend`);
  // At the summer: the parts of the prestige it steps to.
  const after = gradeYear(s).after;
  const atSummer = prestigeByPillar(s, after);
  assert(near(PILLARS.reduce((t, p) => t + atSummer.parts[p], 0), after), `${name}: at the summer, the parts sum to the prestige it steps to`);
}

{
  const s = teachingCollege('Split');
  check(s, 'a new teaching college');
  s.self.reputation = 71.4;
  check(s, 'a college standing higher than its pillars earn');
  s.self.reputation = 0;
  const zero = prestigeByPillar(s);
  assert(PILLARS.every((p) => zero.parts[p] === 0), 'nothing to split at zero');
}

assert(pillarHeadLine(25.6, 50.3, 53.8) === '25.6 of your 50.3 prestige · heading for 53.8', 'the line reads as the plan has it');

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
