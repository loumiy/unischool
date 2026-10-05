// ---------------------------------------------------------------------
// The tab the build menu opens on (Plan 92, BuildPopup.tsx's
// initialBuildTab): Grounds, its first tab, except while Founders Hall waits
// for its ground in a guided founding; then the tab that holds the hall,
// where the walkthrough points, and Grounds again once it stands.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState, createPreStartState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { FOUNDERS_HALL_ID } from '../src/data/techData';
import { FOUNDING_COLORS, schoolColorsOf } from '../src/data/schoolColors';
import { FOUNDING_VERNACULAR } from '../src/data/foundingData';
import { centredPlacement, footprintOf } from '../src/state/campusMap';
import { buildTabOf, initialBuildTab } from '../src/components/BuildPopup';
import { bindScriptStream } from '../src/engine/random';

bindScriptStream(92);
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

console.log('build tab tests');

{
  const plain = createInitialState('Grounds');
  assert(initialBuildTab(plain) === 'campus-tools', `a running college opens the menu on Grounds (${initialBuildTab(plain)})`);

  let s = reducer(createPreStartState(), {
    type: 'START_GAME', name: 'Walk', vernacular: FOUNDING_VERNACULAR, colors: schoolColorsOf(FOUNDING_COLORS), guided: true,
  });
  const hallTab = buildTabOf(s, FOUNDERS_HALL_ID);
  assert(hallTab !== undefined && hallTab !== 'campus-tools', `Founders Hall is listed off Grounds (${hallTab})`);
  assert(initialBuildTab(s) === hallTab, `while the hall waits for its ground, the menu opens on its tab (${initialBuildTab(s)})`);

  const hall = s.tech.find((t) => t.id === FOUNDERS_HALL_ID)!;
  const spot = centredPlacement(footprintOf(hall));
  s = reducer(s, { type: 'PLACE_BUILDABLE', buildableId: FOUNDERS_HALL_ID, row: spot.row, col: spot.col, facing: 0 });
  assert(FOUNDERS_HALL_ID in s.placements, 'the hall is set down');
  assert(initialBuildTab(s) === 'campus-tools', `and the menu opens on Grounds again (${initialBuildTab(s)})`);
}

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
