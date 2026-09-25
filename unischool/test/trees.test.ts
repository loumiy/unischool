// Choosing the tree (Plan 37, data/treeData.ts's seedForSpecies and the
// reducer's PLANT_TREE): a seed is found for every species, no species
// leaves the dice's seed alone, the planted tree is the kind asked for, and
// planting draws one number from the run's stream either way, so replays
// and older saves are untouched.

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { bindScriptStream } from '../src/engine/random';
import { SPECIES, TREE_SEED_RANGE, seedForSpecies, speciesOf } from '../src/data/treeData';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CONIFER_FLOOR, CROWN_SPREAD, TreeAt, treeShape, treeStanding } from '../src/components/trees';
import { DEFAULT_CAMERA, PITCHES, setCamera } from '../src/components/isoProjection';
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
    assert(planted.rng === s.rng, `and draws nothing from the run's stream, so decorating never moves a later roll (${species})`);
  }
}

// ---- Trees answer the tilt (Plan 37) ----
{
  const circles = (svg: string) => [...svg.matchAll(/<circle[^>]*cy="([-\d.e]+)"[^>]*r="([-\d.e]+)"/g)].map((m) => ({ cy: Number(m[1]), r: Number(m[2]) }));
  const polys = (svg: string) => [...svg.matchAll(/points="([^"]+)"/g)].map((m) => m[1].trim().split(' ').map((p) => p.split(',').map(Number)));
  const draw = (species: 'canopy' | 'conifer', pitch: number) => {
    setCamera({ ...DEFAULT_CAMERA, pitch });
    return renderToStaticMarkup(createElement('svg', null, createElement(TreeAt, { col: 20, row: 20, species, scale: 1, shadow: false })));
  };
  setCamera({ ...DEFAULT_CAMERA, pitch: PITCHES[0] });
  assert(treeStanding() === 1, 'nearly level, a tree stands no taller than at the opening view');
  setCamera(DEFAULT_CAMERA);
  assert(Math.abs(treeStanding() - 1) < 1e-9, 'at the opening view it stands');
  setCamera({ ...DEFAULT_CAMERA, pitch: PITCHES[PITCHES.length - 1] });
  assert(treeStanding() < 1e-9, 'straight down it does not');

  const side = circles(draw('canopy', DEFAULT_CAMERA.pitch));
  const top = circles(draw('canopy', PITCHES[PITCHES.length - 1]));
  assert(Math.abs(top[0].r / side[0].r - (1 + CROWN_SPREAD)) < 1e-6, `overhead a broadleaf crown spreads by ${CROWN_SPREAD * 100}%`);
  // The trunk has no length overhead, so the crown's lit cap sits on its foot.
  const trunkTopY = polys(draw('canopy', PITCHES[PITCHES.length - 1]))[0][3][1];
  assert(Math.abs(top[3].cy - trunkTopY) < 0.01, 'and settles onto the trunk');

  const riseOf = (svg: string) => { const p = polys(svg); const apex = p[p.length - 1][2][1]; const base = p[1][0][1]; return base - apex; };
  const coniferSide = riseOf(draw('conifer', DEFAULT_CAMERA.pitch));
  const coniferTop = riseOf(draw('conifer', PITCHES[PITCHES.length - 1]));
  assert(Math.abs(coniferTop / coniferSide - CONIFER_FLOOR) < 0.01, `a conifer keeps a quarter of its rise (${(coniferTop / coniferSide).toFixed(2)})`);
  setCamera(DEFAULT_CAMERA);
}

// ---- A turn moves a tree, it does not redraw one (Plan 38) ----
// Everything but the lit cap is drawn about the tree's foot, so two views a
// part-turn apart differ only in where the tree stands and where its cap
// sits: the memoised body is the same markup either way.
{
  const body = (azimuth: number) => {
    setCamera({ ...DEFAULT_CAMERA, azimuth });
    const svg = renderToStaticMarkup(createElement('svg', null, createElement(TreeAt, { col: 20, row: 20, species: 'canopy', scale: 1, shadow: false })));
    return { svg, stripped: svg.replace(/transform="[^"]*"/, '').replace(/<circle class="campus-tree-crown-top"[^>]*>(<\/circle>)?/, '') };
  };
  const a = body(DEFAULT_CAMERA.azimuth);
  const b = body(DEFAULT_CAMERA.azimuth + 0.4);
  assert(a.svg !== b.svg, 'a part-turn moves the tree');
  assert(a.stripped === b.stripped, 'and leaves its body as it was');
  setCamera(DEFAULT_CAMERA);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
