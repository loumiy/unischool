// Quads (src/state/quads.ts): the open spaces the buildings enclose, found
// rather than declared; the player's names for them; and the marks that make
// a quad of a space detection passes over. Cosmetic like the rest of the map:
// what these pin is what the map will say, and that a save keeps it.

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { detectQuads, designationRefusal, tileIndex } from '../src/state/quads';
import { QUAD_MAX_AREA, QUAD_NAMES } from '../src/data/quadData';
import { SAVE_KEY, SAVE_VERSION, loadGame } from '../src/state/persistence';
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
  assert(q !== undefined && QUAD_NAMES.includes(q.name), 'named from the list');
  assert(q !== undefined && !q.designated, 'found, not marked');
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

// ---- Names ----
{
  let s = bare();
  court(s, 20, 20, 9);
  const key = detectQuads(s)[0].key;
  s = reducer(s, { type: 'NAME_QUAD', key, name: '  Ellison Green  ' });
  assert(detectQuads(s)[0].name === 'Ellison Green', 'a quad takes the name it is given, trimmed');
  s = reducer(s, { type: 'NAME_QUAD', key, name: '' });
  assert(QUAD_NAMES.includes(detectQuads(s)[0].name), 'and an empty name gives it back its own');
}

// ---- Marks ----
{
  let s = bare();
  // A walled space too big for detection: 32 by 32.
  court(s, 10, 10, 32);
  assert(32 * 32 > QUAD_MAX_AREA && detectQuads(s).length === 0, 'a very large walled space is not found as a quad');
  s = reducer(s, { type: 'MARK_QUAD', tile: { row: 20, col: 20 } });
  const quads = detectQuads(s);
  assert(quads.length === 1 && quads[0].designated && quads[0].area === 1024, 'marked, it is one');
  const again = reducer(s, { type: 'MARK_QUAD', tile: { row: 25, col: 25 } });
  assert(again.quads!.designated.length === 1, 'a second mark inside it adds nothing');
  assert(designationRefusal(s, 60, 5) === 'open to the edge of the campus', 'open ground reaching the edge cannot be marked');
  const refused = reducer(s, { type: 'MARK_QUAD', tile: { row: 60, col: 5 } });
  assert(refused.quads!.designated.length === 1, 'and the mark is not kept');
  s = reducer(s, { type: 'UNMARK_QUAD', key: quads[0].key });
  assert(detectQuads(s).length === 0 && s.quads!.designated.length === 0, 'lifting the mark lifts the quad');
  assert(quads[0].tiles.includes(tileIndex(20, 20)), 'the marked quad holds the tile that was clicked');
}

// ---- A save keeps names and marks, and drops a malformed field ----
{
  const s = bare();
  s.started = true;
  s.quads = { names: { '21,20': 'Kept', '??': 'Bad', '22,22': '' }, designated: ['20,20', 'x', '125,3'] };
  store.set(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: s }));
  const loaded = loadGame()!;
  assert(JSON.stringify(loaded.quads) === JSON.stringify({ names: { '21,20': 'Kept' }, designated: ['20,20'] }), `names and marks survive, the bad ones go (${JSON.stringify(loaded.quads)})`);
  (s as unknown as { quads: unknown }).quads = 'nonsense';
  store.set(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: s }));
  assert(loadGame()!.quads === undefined, 'a field that is not a quad record is dropped');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
