import type { Placements, Trees } from '../state/types';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from '../state/types';
import { isRoadTile, parsePathTileKey, pathTileKey, placementTiles } from '../state/campusMap';
import { random } from '../engine/random';

// The founding woodland (see types.ts's Trees). Runs once, in
// createInitialState; after that trees are only felled by building. Trees
// are placed in groves with open meadow between plus a thin scatter, so the
// map has places on it. The middle is kept clear so a founding campus has
// room to build around Founders Hall.

// Share of tiles wooded: enough for groves to read as woods without a heavy
// render cost (components/trees.tsx).
export const TREE_COVERAGE = 0.05;
// Share of trees in groves rather than the scatter.
const GROVE_SHARE = 0.78;
const GROVE_COUNT = 14;
// Trees fall within this many tiles of a grove centre, denser toward it.
const GROVE_RADIUS = 13;
// No grove centre lands within this many tiles of the middle of the grid,
// so the founding campus opens with a clearing to build in.
const CLEARING_RADIUS = 18;

// One integer per tree, from which the renderer derives species, size and
// offset (see Trees in types.ts). Exported for the reducer's PLANT_TREE.
export const TREE_SEED_RANGE = 1 << 20;

// What kind of tree a seed is (Plan 37, from v2's sim/trees.ts). The hash
// moved here from the renderer, byte for byte, so the reducer can honour a
// planting choice without widening the save: a tree is still one integer,
// and a seed is found that already means the species asked for.
export type Species = 'canopy' | 'conifer' | 'ornamental';
// The mix a random seed draws from: mostly canopy, some conifer, the
// ornamentals sparse enough to read as deliberate when one appears.
export const SPECIES_MIX: readonly Species[] = ['canopy', 'canopy', 'canopy', 'conifer', 'conifer', 'ornamental'];
export const SPECIES: readonly Species[] = ['canopy', 'conifer', 'ornamental'];

// Integer hash so each roll off one seed is independent; `seed % n` would
// correlate species with position and show as banding.
export function roll(seed: number, salt: number): number {
  let h = (seed ^ (salt * 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 0x100000000;
}

export function speciesOf(seed: number): Species {
  return SPECIES_MIX[Math.floor(roll(seed, 1) * SPECIES_MIX.length)];
}

// A seed that means the species asked for, found by walking forward from
// the one the dice gave rather than drawing again: planting consumes exactly
// one number from the stream either way, so replays and older saves are
// unaffected. Bounded, so a species the mix no longer holds degrades to
// "whatever the dice said".
const SPECIES_SEARCH_CAP = 256;
export function seedForSpecies(seed: number, species: Species | null | undefined): number {
  if (!species) return seed;
  for (let i = 0; i < SPECIES_SEARCH_CAP; i++) {
    const candidate = (seed + i) % TREE_SEED_RANGE;
    if (speciesOf(candidate) === species) return candidate;
  }
  return seed;
}

function randomSeed(): number {
  return Math.floor(random() * TREE_SEED_RANGE);
}

// Every tile a placed Buildable stands on.
function occupiedTiles(placements: Placements): Set<string> {
  const taken = new Set<string>();
  for (const p of Object.values(placements)) {
    for (const tile of placementTiles(p)) taken.add(pathTileKey(tile));
  }
  return taken;
}

// A roughly normal offset in [-1, 1] from the mean of two uniform rolls.
function clustered(): number {
  return (random() + random()) - 1;
}

export function seedTrees(placements: Placements): Trees {
  const trees: Trees = {};
  const taken = occupiedTiles(placements);
  const total = Math.round(CAMPUS_GRID_WIDTH * CAMPUS_GRID_HEIGHT * TREE_COVERAGE);

  const plant = (row: number, col: number): void => {
    if (row < 0 || col < 0 || row >= CAMPUS_GRID_HEIGHT || col >= CAMPUS_GRID_WIDTH) return;
    const key = pathTileKey({ row, col });
    if (taken.has(key) || key in trees) return;
    trees[key] = randomSeed();
  };

  // Grove centres, kept out of the clearing in the middle.
  const midRow = CAMPUS_GRID_HEIGHT / 2;
  const midCol = CAMPUS_GRID_WIDTH / 2;
  const centres: Array<{ row: number; col: number }> = [];
  // Bounded so unlucky rolls cannot spin; a short grove count is harmless
  // since the scatter still fills to TREE_COVERAGE.
  for (let attempt = 0; attempt < GROVE_COUNT * 8 && centres.length < GROVE_COUNT; attempt++) {
    const row = Math.floor(random() * CAMPUS_GRID_HEIGHT);
    const col = Math.floor(random() * CAMPUS_GRID_WIDTH);
    if (Math.hypot(row - midRow, col - midCol) < CLEARING_RADIUS) continue;
    centres.push({ row, col });
  }

  const inGroves = Math.round(total * GROVE_SHARE);
  for (let i = 0; i < inGroves && centres.length > 0; i++) {
    const centre = centres[i % centres.length];
    plant(
      Math.round(centre.row + clustered() * GROVE_RADIUS),
      Math.round(centre.col + clustered() * GROVE_RADIUS),
    );
  }

  // The thin scatter: specimen trees anywhere, including across the
  // clearing, so the open middle is a meadow rather than a bald patch.
  for (let i = inGroves; i < total; i++) {
    plant(
      Math.floor(random() * CAMPUS_GRID_HEIGHT),
      Math.floor(random() * CAMPUS_GRID_WIDTH),
    );
  }

  // Nothing grows on the road. Cleared afterwards rather than skipped while
  // planting, so the founding draws from the random stream are unchanged.
  for (const key of Object.keys(trees)) {
    const tile = parsePathTileKey(key);
    if (tile && isRoadTile(tile.row, tile.col)) delete trees[key];
  }

  return trees;
}

// Fell every tree under a footprint: the one place trees are removed (from
// PLACE_BUILDABLE and the save loader's hygiene pass). Mutates.
export function fellTrees(trees: Trees, placement: { row: number; col: number; w: number; h: number }): void {
  for (const tile of placementTiles(placement)) delete trees[pathTileKey(tile)];
}
