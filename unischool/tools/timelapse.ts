// ---------------------------------------------------------------------
// FIFTY YEARS AS FRAMES (the trailer's time-lapse). Plays one run under a
// harness player, keeps a snapshot every few weeks, and writes each as a
// save laid out on the FINAL campus's plan, so a building stands in the
// same place from the week it breaks ground to year 50. The frames are for
// tools/timelapseShoot.mjs, which photographs them and joins the video.
//
//   npm run timelapse -- --out node_modules/.tmp/timelapse
//   npm run timelapse -- --player Completionist --years 50 --every 13 \
//     --name Blackmoor --colors navy-gold --vernacular gothic --out dir
//   npm run timelapse:shoot -- node_modules/.tmp/timelapse
//
// How a frame is made:
//   - the run's final state goes through tools/layout.ts, the same precinct
//     plan the README's campus picture uses, and its placements are the
//     plan for every frame (placement is visual-only, campusMap.ts, so the
//     school in each frame is still the one the run had that week);
//   - a frame's buildings are those the run had placed by then, standing
//     or still going up, each at its final site;
//   - its walks are the final walks that join its buildings to Founders
//     Hall: a breadth-first tree over the final network from the founding
//     buildings, and each building's route up it. So the walks grow out
//     from the first quad, and every walk drawn is connected;
//   - its trees are the founding woodland, felled wherever a building or a
//     walk has arrived, plus layout.ts's planted grounds once a building
//     stands near them.
//
// Flags: --player <name> (default Completionist, which builds the most)
//        --years N (50) --every N (weeks between frames, 13) --seed N
//        --name <school> --colors <pair id> --vernacular <v> --out <dir>
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_SEED, foundGame, playWeek } from '../sim/harness/game';
import { PLAYERS, playerNamed } from '../sim/harness/archetypes';
import { SAVE_VERSION } from '../src/state/persistence';
import { SCHOOL_COLOR_PAIRS, schoolColorsOf } from '../src/data/schoolColors';
import { seedTrees } from '../src/data/treeData';
import { bindScriptStream } from '../src/engine/random';
import { pathTileKey, placementTiles } from '../src/state/campusMap';
import type { GameState, Pathways, Placement, Placements, TileCoord, Trees, Vernacular } from '../src/state/types';

const VALUE_FLAGS = ['player', 'years', 'every', 'seed', 'name', 'colors', 'vernacular', 'out'];
const flags: Record<string, string> = {};
{
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const [key, inline] = argv[i].replace(/^--/, '').split(/=(.*)/s);
    if (!VALUE_FLAGS.includes(key)) throw new Error(`unknown argument ${argv[i]}`);
    flags[key] = inline ?? argv[++i];
  }
}
const player = playerNamed(flags.player ?? 'Completionist');
if (!player) throw new Error(`no player matching "${flags.player}". Known: ${PLAYERS.join(', ')}`);
const years = Number(flags.years ?? 50);
const every = Number(flags.every ?? 13);
const seed = flags.seed ? Number(flags.seed) : DEFAULT_SEED;
const out = flags.out ?? 'node_modules/.tmp/timelapse';

// ---------------------------------------------------------------------
// The run, snapshotted.
// ---------------------------------------------------------------------
const game = foundGame({ seed });
const snapshots: GameState[] = [];
const endYear = game.s.clock.year + years;
for (let week = 0, limit = years * 52 * 4 + 100; week < limit && game.s.clock.year < endYear; week++) {
  if (week % every === 0) snapshots.push(structuredClone(game.s));
  playWeek(game, player);
}
// No frame once the clock has turned into year N + 1: the video ends in year N.
console.log(`${player.name}, seed ${seed}: ${snapshots.length} frames to year ${snapshots[snapshots.length - 1].clock.year}`);

// Cosmetic overrides and a clear screen, as scenario.ts's flags do them.
function dress(state: GameState): void {
  state.ladder.unread = [];
  if (flags.name) state.self.name = flags.name;
  if (flags.vernacular) state.self.vernacular = flags.vernacular as Vernacular;
  if (flags.colors) {
    const pair = SCHOOL_COLOR_PAIRS.find((p) => p.id === flags.colors);
    if (!pair) throw new Error(`no color pair "${flags.colors}". Known: ${SCHOOL_COLOR_PAIRS.map((p) => p.id).join(', ')}`);
    state.self.colors = schoolColorsOf(pair);
  }
  state.pendingInterrupt = null;
  state.events.pendingDemand = null;
  state.events.activeDemand = null;
  if (state.finance.distress) state.finance.distress.letters = [];
}

// ---------------------------------------------------------------------
// The final plan, from layout.ts.
// ---------------------------------------------------------------------
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const finalIn = join(out, 'final-run.json');
const finalOut = join(out, 'final-layout.json');
const last = structuredClone(snapshots[snapshots.length - 1]);
dress(last);
writeFileSync(finalIn, JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), state: last }));
execFileSync('npm', ['run', '-s', 'layout', '--', finalIn, finalOut], { stdio: ['ignore', 'ignore', 'inherit'] });
const plan = (JSON.parse(readFileSync(finalOut, 'utf8')) as { state: GameState }).state;

// The planted grounds: layout.ts's trees less the woodland it regrew.
bindScriptStream(2026);
const regrown = seedTrees(plan.placements);
const planted: Trees = {};
for (const [key, value] of Object.entries(plan.trees)) if (!(key in regrown)) planted[key] = value;
// The woodland the college was founded on: the same stream, nothing built.
bindScriptStream(2026);
const woodland = seedTrees({});

// ---------------------------------------------------------------------
// The walks: a tree over the final network, rooted at the founding
// buildings, and each building's route up it.
// ---------------------------------------------------------------------
const N4 = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
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
    for (const [dr, dc] of N4) {
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

// ---------------------------------------------------------------------
// The frames.
// ---------------------------------------------------------------------
const NEAR = 3;
let dropped = 0;
snapshots.forEach((state, i) => {
  dress(state);
  const ids = Object.keys(state.placements).filter((id) => id in plan.placements);
  dropped = Math.max(dropped, Object.keys(state.placements).length - ids.length);
  const placements: Placements = {};
  for (const id of ids) placements[id] = plan.placements[id];
  const walks = walksFor(ids);

  const taken = new Set<string>(Object.keys(walks));
  for (const p of Object.values(placements)) for (const t of placementTiles(p)) taken.add(keyOf(t));
  const trees: Trees = {};
  for (const [k, v] of Object.entries(woodland)) if (!taken.has(k)) trees[k] = v;
  const near = (k: string) => {
    const t = tileOf(k);
    return Object.values(placements).some((p) =>
      t.row >= p.row - NEAR && t.row < p.row + p.h + NEAR && t.col >= p.col - NEAR && t.col < p.col + p.w + NEAR);
  };
  for (const [k, v] of Object.entries(planted)) if (!taken.has(k) && near(k)) trees[k] = v;

  state.placements = placements;
  state.pathways = walks;
  state.trees = trees;
  const name = `frame-${String(i).padStart(4, '0')}.json`;
  writeFileSync(join(out, name), JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), state }));
});
rmSync(finalIn);
console.log(`${out}: ${snapshots.length} frames${dropped ? ` (up to ${dropped} buildings a frame not in the final plan, left out)` : ''}`);
