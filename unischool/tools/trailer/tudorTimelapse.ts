// ---------------------------------------------------------------------
// THE TUDOR LAYOUT, BUILT (the trailer's time-lapse; docs/store/trailer.md).
// tools/campuses/tudor-year-1.unischool.json is a campus laid out by hand
// in the sandbox: a placement plan, not a run. This plays a real run (the
// seeded Completionist, as tools/timelapse.ts does), keeps a snapshot every
// few weeks, and stands each building the run has by then on its site in
// the Tudor plan, finished or still a construction site. So the campus
// grows in the order a real run builds it, with the run's own clock.
//
//   npm run dev                                                # in one shell
//   npx rolldown tools/trailer/tudorTimelapse.ts -o node_modules/.tmp/tudor.mjs -f esm -p node \
//     && node node_modules/.tmp/tudor.mjs --out node_modules/.tmp/tudor
//   node tools/timelapseShoot.mjs node_modules/.tmp/tudor --clean --png
//
// How a frame is made, as in tools/timelapse.ts:
//   - its buildings are those the run has placed by then that the plan
//     has a site for (the run's chapter houses, arts and museum projects,
//     its seventh hall and dining hall and its Campanile have none, and are
//     left out);
//   - its walks are the plan's walks that join its buildings to Founders
//     Hall, so the walks grow out from the first quad;
//   - its trees are the founding woodland, felled where buildings and walks
//     arrive, with the plan's own trees and its lamps, benches and flower
//     beds coming in round each building as it stands;
//   - three of the plan's buildings the run never builds (the Triumphal
//     Gate, since it chose the Campanile; the Research Park; Aurora Tower)
//     are raised in a short coda after year 50, as the README's campus
//     picture stands what the run did not (layout's --build-all).
//
// Flags: --every N (weeks between frames, 13) --coda N (frames of the coda,
//        12) --out <dir>
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_SEED, foundGame, playWeek } from '../../sim/harness/game';
import { playerNamed } from '../../sim/harness/archetypes';
import { SAVE_VERSION } from '../../src/state/persistence';
import { seedTrees } from '../../src/data/treeData';
import { bindScriptStream } from '../../src/engine/random';
import { pathTileKey, placementTiles } from '../../src/state/campusMap';
import type { GameState, Pathways, Placement, Placements, TileCoord, Trees } from '../../src/state/types';
import { clearBoardLetters } from '../../src/systems/finance/distress';

const VALUE_FLAGS = ['every', 'coda', 'out'];
const flags: Record<string, string> = {};
{
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const [key, inline] = argv[i].replace(/^--/, '').split(/=(.*)/s);
    if (!VALUE_FLAGS.includes(key)) throw new Error(`unknown argument ${argv[i]}`);
    flags[key] = inline ?? argv[++i];
  }
}
const every = Number(flags.every ?? 13);
const coda = Number(flags.coda ?? 12);
const out = flags.out ?? 'node_modules/.tmp/tudor';
const YEARS = 50;

// The plan: the hand-laid Tudor campus, read for its layout alone.
const tudor = (JSON.parse(readFileSync('tools/campuses/tudor-year-1.unischool.json', 'utf8')) as { state: GameState }).state;
const plan = {
  placements: Object.fromEntries(Object.entries(tudor.placements).map(([id, p]) => [id, { facing: 0, ...p }])) as Placements,
  pathways: tudor.pathways,
  trees: tudor.trees,
  dressing: tudor.dressing ?? {},
};

// The run.
const player = playerNamed('Completionist')!;
const game = foundGame({ seed: DEFAULT_SEED });
const snapshots: GameState[] = [];
const endYear = game.s.clock.year + YEARS;
for (let week = 0, limit = YEARS * 52 * 4 + 100; week < limit && game.s.clock.year < endYear; week++) {
  if (week % every === 0) snapshots.push(structuredClone(game.s));
  playWeek(game, player);
}

function dress(state: GameState): void {
  state.ladder.unread = [];
  state.self.name = tudor.self.name.replace(/ College$/, '');
  state.self.vernacular = 'tudor';
  state.self.colors = tudor.self.colors;
  state.pendingInterrupt = null;
  state.events.pendingDemand = null;
  state.events.activeDemand = null;
  if (state.finance.distress) clearBoardLetters(state.finance.distress);
}

// The planted grounds: the plan's trees less the woodland the game would
// regrow round its buildings; and the woodland the college was founded on.
bindScriptStream(2026);
const regrown = seedTrees(plan.placements);
const planted: Trees = {};
for (const [key, value] of Object.entries(plan.trees)) if (!(key in regrown)) planted[key] = value;
bindScriptStream(2026);
const woodland = seedTrees({});

// The walks: a tree over the plan's network, rooted at Founders Hall (and
// whatever else stands at the founding), and each building's route up it.
// Eight ways: the plan's walks run on the diagonal too (pathways.tsx).
const N8 = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]] as const;
const keyOf = pathTileKey;
const tileOf = (key: string): TileCoord => { const [row, col] = key.split(',').map(Number); return { row, col }; };
function edgeKeys(p: Placement): string[] {
  const edge: TileCoord[] = [];
  for (let c = p.col; c < p.col + p.w; c++) edge.push({ row: p.row + p.h, col: c }, { row: p.row - 1, col: c });
  for (let r = p.row; r < p.row + p.h; r++) edge.push({ row: r, col: p.col + p.w }, { row: r, col: p.col - 1 });
  return edge.map(keyOf).filter((k) => plan.pathways[k]);
}
const founding = Object.keys(snapshots[0].placements).filter((id) => id in plan.placements);
const parent = new Map<string, string | null>();
{
  const queue: string[] = [];
  for (const id of founding) for (const k of edgeKeys(plan.placements[id])) if (!parent.has(k)) { parent.set(k, null); queue.push(k); }
  while (queue.length) {
    const k = queue.shift()!;
    const t = tileOf(k);
    for (const [dr, dc] of N8) {
      const n = keyOf({ row: t.row + dr, col: t.col + dc });
      if (plan.pathways[n] && !parent.has(n)) { parent.set(n, k); queue.push(n); }
    }
  }
}
function walksFor(ids: string[]): Pathways {
  const walks: Pathways = {};
  for (const id of ids) {
    for (const k of edgeKeys(plan.placements[id])) {
      for (let at: string | null = k; at && !walks[at]; at = parent.get(at) ?? null) walks[at] = true;
    }
  }
  return walks;
}

const NEAR = 3;
function write(state: GameState, ids: string[], i: number, whole = false): void {
  const placements: Placements = {};
  for (const id of ids) placements[id] = plan.placements[id];
  const walks = walksFor(ids);
  const taken = new Set<string>(Object.keys(walks));
  for (const p of Object.values(placements)) for (const t of placementTiles(p)) taken.add(keyOf(t));
  const near = (k: string) => {
    const t = tileOf(k);
    return Object.values(placements).some((p) =>
      t.row >= p.row - NEAR && t.row < p.row + p.h + NEAR && t.col >= p.col - NEAR && t.col < p.col + p.w + NEAR);
  };
  const trees: Trees = {};
  for (const [k, v] of Object.entries(woodland)) if (!taken.has(k)) trees[k] = v;
  for (const [k, v] of Object.entries(planted)) if (!taken.has(k) && near(k)) trees[k] = v;
  const dressing: GameState['dressing'] = {};
  for (const [k, v] of Object.entries(plan.dressing)) if (!taken.has(k) && near(k)) dressing[k] = v;
  for (const k of Object.keys(dressing)) delete trees[k];
  state.placements = placements;
  // The coda's last frame is the plan itself: every walk, tree, lamp,
  // bench and flower bed as it was laid out.
  state.pathways = whole ? plan.pathways : walks;
  state.trees = whole ? plan.trees : trees;
  state.dressing = whole ? plan.dressing : dressing;
  writeFileSync(join(out, `frame-${String(i).padStart(4, '0')}.json`), JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), state }));
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
let i = 0;
for (const state of snapshots) {
  dress(state);
  write(state, Object.keys(state.placements).filter((id) => id in plan.placements), i++);
}

// The coda: the plan's buildings the run never built, raised in turn on
// the last snapshot, each a construction site for a few frames first.
const last = snapshots[snapshots.length - 1];
const standing = Object.keys(last.placements).filter((id) => id in plan.placements);
const missing = Object.keys(plan.placements).filter((id) => !standing.includes(id));
const perBuilding = Math.max(2, Math.floor(coda / Math.max(1, missing.length)));
let built = [...standing];
for (const id of missing) {
  const t = last.tech.find((x) => x.id === id);
  if (!t) { console.warn(`the plan's ${id} is not in this build's catalog; left out`); continue; }
  const weeks = t.duration ?? 52;
  for (let f = 0; f < perBuilding; f++) {
    const state = structuredClone(last);
    const site = state.tech.find((x) => x.id === id)!;
    const done = f === perBuilding - 1;
    for (const b of built) { const x = state.tech.find((y) => y.id === b); if (x && !state.developing[b]) x.status = 'done'; }
    site.status = done ? 'done' : 'developing';
    if (done) delete state.developing[id];
    else state.developing[id] = Math.max(1, Math.round(weeks * (1 - (f + 1) / perBuilding)));
    write(state, [...built, id], i++);
  }
  built = [...built, id];
}
// The finished plan, held.
for (let f = 0; f < 4; f++) {
  const state = structuredClone(last);
  for (const b of built) { const x = state.tech.find((y) => y.id === b); if (x) { x.status = 'done'; delete state.developing[b]; } }
  write(state, built, i++, true);
}
console.log(`${out}: ${i} frames (${snapshots.length} from the run, to year ${last.clock.year}; ${missing.length} raised in the coda: ${missing.join(', ') || 'none'})`);
