// Choosing the tree (Plan 37, data/treeData.ts's seedForSpecies and the
// reducer's PLANT_TREE): a seed is found for every species, no species
// leaves the dice's seed alone, the planted tree is the kind asked for, and
// planting draws one number from the run's stream either way, so replays
// and older saves are untouched.

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { bindScriptStream } from '../src/engine/random';
import { SPECIES, TREE_SEED_RANGE, seedForSpecies, speciesOf } from '../src/data/treeData';
import { treeShape } from '../src/components/trees';
import type { GameState } from '../src/state/types';

bindScriptStream(3370);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('tree tests');

// ---- The hash ----
{
  for (let seed = 0; seed < 200; seed += 7) {
    for (const species of SPECIES) {
      const found = seedForSpecies(seed, species);
      assert(speciesOf(found) === species && found >= 0 && found < TREE_SEED_RANGE, `a ${species} seed from ${seed}`);
    }
    assert(seedForSpecies(seed, null) === seed && seedForSpecies(seed, undefined) === seed, 'no species leaves the seed alone');
  }
  assert(treeShape(12345).species === speciesOf(12345), 'the renderer reads the same hash');
}

// ---- Planting ----
function open(): { s: GameState; tile: { row: number; col: number } } {
  const s = createInitialState('Trees');
  s.pendingInterrupt = null;
  // An open tile: nothing on it, not a path, not the road, no tree.
  for (let row = 5; row < 40; row++) {
    for (let col = 5; col < 40; col++) {
      const key = `${row},${col}`;
      if (key in s.trees || key in s.pathways) continue;
      const next = reducer(structuredClone(s), { type: 'PLANT_TREE', tile: { row, col } });
      if (key in next.trees) return { s, tile: { row, col } };
    }
  }
  throw new Error('no open tile');
}
{
  const { s, tile } = open();
  const key = `${tile.row},${tile.col}`;
  for (const species of SPECIES) {
    const planted = reducer(structuredClone(s), { type: 'PLANT_TREE', tile, species });
    assert(speciesOf(planted.trees[key]) === species, `planting a ${species} plants a ${species}`);
    const plain = reducer(structuredClone(s), { type: 'PLANT_TREE', tile });
    assert(planted.rng === plain.rng, `and draws the same one number from the run's stream as planting whatever grows (${species})`);
  }
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
