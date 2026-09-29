// Quads (src/state/quads.ts): the open spaces the buildings enclose, found
// rather than declared. Campus beauty counts them and one event needs one;
// the map no longer shows them, and since Plan 80H nothing but what the
// campus encloses makes one: a save's names and marks are dropped.

import { createInitialState } from '../src/state/actions';
import { detectQuads } from '../src/state/quads';
import { QUAD_MAX_AREA } from '../src/data/quadData';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SAVE_KEY, SAVE_VERSION, loadGame, readSave } from '../src/state/persistence';
import { bindScriptStream } from '../src/engine/random';
import type { GameState } from '../src/state/types';

bindScriptStream(2426);
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

console.log('quad tests');

// A campus with nothing on it but what each case stands.
function bare(): GameState {
  const s = createInitialState('Quads');
  s.pendingInterrupt = null;
  s.placements = {};
  s.pathways = {};
  return s;
}
function wall(s: GameState, row: number, col: number, w: number, h: number): void {
  const t = s.tech.find((x) => (x.kind === 'dorm' || x.kind === 'facility') && x.facilityType !== 'quad' && !(x.id in s.placements))!;
  t.status = 'done';
  s.placements[t.id] = { row, col, w, h };
}
// Walls three deep round an open square of `size` from (row, col), with a
// way in `gap` tiles wide through the north wall.
function court(s: GameState, row: number, col: number, size: number, gap = 0): void {
  wall(s, row - 3, col - 3, 3, 3);                     // north, west of the way in
  wall(s, row - 3, col + gap, size + 3 - gap, 3);      // north, east of it
  wall(s, row, col - 3, 3, size);                      // west
  wall(s, row, col + size, 3, size);                   // east
  wall(s, row + size, col - 3, size + 6, 3);           // south
}

// ---- Four walls round a square are a quad ----
{
  const s = bare();
  court(s, 20, 20, 9);
  const quads = detectQuads(s);
  assert(quads.length === 1, `one court, one quad (${quads.length})`);
  const q = quads[0];
  assert(q?.area === 81 && q.enclosure === 1, `a 9 by 9 court, fully walled (${q?.area}, ${q?.enclosure})`);
}

// ---- A narrow way in is a doorway; a wide one is not ----
{
  const s = bare();
  court(s, 20, 20, 9, 2);
  assert(detectQuads(s).length === 1, 'a court with a two-tile way in is still a quad');
  const open = bare();
  court(open, 20, 20, 9, 6);
  assert(detectQuads(open).length === 0, 'with a six-tile gap it is part of the campus');
}

// ---- A Campus Quad is lawn, not a wall; a path does not split a green ----
{
  const s = bare();
  court(s, 20, 20, 9);
  const quad = s.tech.find((t) => t.facilityType === 'quad')!;
  quad.status = 'done';
  s.placements[quad.id] = { row: 22, col: 22, w: 5, h: 5 };
  for (let c = 20; c < 29; c++) s.pathways[`24,${c}`] = true;
  const quads = detectQuads(s);
  assert(quads.length === 1 && quads[0].area === 81, 'the court holds its Campus Quad and its path as one green');
  assert(quads[0].green < 1, 'with the path counted as paving');
}

// ---- A lawn a player rings with paths is a quad at a path's weight ----
{
  const s = bare();
  for (let i = 30; i <= 38; i++) {
    s.pathways[`30,${i}`] = true; s.pathways[`38,${i}`] = true;
    s.pathways[`${i},30`] = true; s.pathways[`${i},38`] = true;
  }
  const quads = detectQuads(s);
  assert(quads.length === 1 && quads[0].area === 49, `a 7 by 7 lawn inside a ring of path (${quads.map((q) => q.area).join(', ')})`);
  assert(quads[0]?.green === 1, 'and all of it green');
}

// ---- Too big is the rest of the campus ----
{
  const s = bare();
  court(s, 10, 10, 32);
  assert(32 * 32 > QUAD_MAX_AREA && detectQuads(s).length === 0, 'a very large walled space is not found as a quad');
}

// ---- A save's names and marks go (Plan 80H) ----
{
  // The version before the marks went, holding a name and a mark on a
  // space detection passes over: it loads with neither, and the space is
  // no quad.
  const s = bare();
  s.started = true;
  court(s, 10, 10, 32);
  (s as unknown as { quads: unknown }).quads = { names: { '10,10': 'Kept' }, designated: ['20,20'] };
  store.set(SAVE_KEY, JSON.stringify({ version: 82, savedAt: 0, state: s }));
  const loaded = loadGame()!;
  assert(loaded !== null && !('quads' in loaded), `the names and marks are dropped (${JSON.stringify((loaded as unknown as { quads?: unknown })?.quads)})`);
  assert(detectQuads(loaded).length === 0, 'and the space they marked is no quad');

  // A played save from further back, with a name and a mark, climbs every
  // step (Plan 80I's benches, then this) and arrives without them.
  const raw = readFileSync(join(process.cwd(), 'test/fixtures/save-v81-quads.json'), 'utf8');
  const parsed = JSON.parse(raw) as { version: number; state: { quads?: unknown } };
  assert(parsed.version === 81 && parsed.state.quads !== undefined, 'the fixture is a version-81 save holding names and marks');
  const read = readSave(raw);
  assert(!('refused' in read) && !('quads' in read.state), `it loads at version ${SAVE_VERSION}, without them`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
