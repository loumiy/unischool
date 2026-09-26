// ---------------------------------------------------------------------
// Overcrowding and overpricing (Plan 71), both on the admissions funnel
// (systems/admissions/admissionsSystem.ts):
//
//   1. A year short of beds, dining or health shrinks the next pool steeply
//      (crowdingPoolFactor), never to nothing, and the projection applies
//      exactly that factor.
//   2. Past the price tolerance applicants fall away faster than below it,
//      so charging past it takes in less (price x applicants), while at or
//      under the tolerance nothing changed.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { crowdingPoolFactor, priceTolerance, projectAdmissions } from '../src/systems/admissions/admissionsSystem';
import { NEUTRAL_COHORT_SIGNALS } from '../src/systems/admissions/cohorts';
import { bindScriptStream } from '../src/engine/random';

bindScriptStream(71);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
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
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

// ---- 1. crowding ----
{
  assert(crowdingPoolFactor(0) === 1, 'no shortfall leaves the pool whole');
  assert(near(crowdingPoolFactor(0.25), 0.75 ** 2.5), 'a quarter short keeps (3/4)^2.5 of the pool');
  assert(crowdingPoolFactor(1) === 0.1 && crowdingPoolFactor(5) === 0.1, 'however bad the year, a tenth still apply');
  let last = 2;
  let falling = true;
  for (let x = 0; x <= 1; x += 0.05) {
    const f = crowdingPoolFactor(x);
    if (f > last) falling = false;
    last = f;
  }
  assert(falling, 'the pool never grows with the shortfall');

  const project = (crowding: number) => projectAdmissions(90, 20_000, 5_000, 70, { ...NEUTRAL_COHORT_SIGNALS, crowding });
  const full = project(0);
  const crowded = project(0.3);
  assert(near(crowded.applicants / full.applicants, crowdingPoolFactor(0.3), 0.01), 'the projection shrinks the pool by the factor');
  assert(crowded.factors.crowding !== undefined && near(crowded.factors.crowding, crowdingPoolFactor(0.3)), 'and names it among the factors');
}

// ---- 2. overpricing ----
{
  const prestige = 90;
  const tolerance = priceTolerance(prestige);
  const at = (ratio: number) => projectAdmissions(prestige, Math.round(tolerance * ratio), 5_000, 70, NEUTRAL_COHORT_SIGNALS);
  assert(near(at(1).factors.priceFactor, Math.exp(-1), 1e-3), 'at the tolerance the price costs exp(-1) of the pool, as before');
  assert(near(at(0.5).factors.priceFactor, Math.exp(-0.5), 1e-3), 'under it, exp(-ratio), as before');
  assert(at(1.6).factors.priceFactor < Math.exp(-1.6) * 0.7, 'past it, applicants fall away faster than below it');
  const take = (ratio: number) => at(ratio).applicants * tolerance * ratio;
  assert(take(1.6) < take(1.3) && take(1.3) < take(1), 'past the tolerance a higher price takes in less');
}

console.log(`crowding pool: ${checks} checks, ${failures} failures`);
if (failures > 0) process.exit(1);
