// The opening view (Plan 115A, the third review's C1-1): ringLand.ts's
// framedView centres on what stands. A lone Founders Hall opens close, the
// view widens as the college grows, and a built-out campus opens as wide as
// every map opened before. clampView's pan limits hold throughout.

import {
  DEFAULT_ZOOM, FRAMED_ZOOM, FRAME_MARGIN, clampView, framedView, ringZoomFloor, type MapView,
} from '../src/components/ringLand';
import { DEFAULT_CAMERA, project, setCamera, unproject } from '../src/components/isoProjection';
import { CAMPUS_GRID_HEIGHT as GH, CAMPUS_GRID_WIDTH as GW, type Placements } from '../src/state/types';
import { ROAD_FIRST_ROW, footprintIsClear, placementFor } from '../src/state/campusMap';
import { foundGame, playUntil } from '../sim/harness/game';
import { playerNamed } from '../sim/harness/archetypes';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('map frame tests');

setCamera(DEFAULT_CAMERA);
const SIZES = [[1440, 900], [1280, 720]] as const;
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
// The ground under the canvas's centre, in tiles.
const centreOf = (v: MapView, w: number, h: number) => unproject((w / 2 - v.x) / v.zoom, (h / 2 - v.y) / v.zoom);
// Whether every corner of every placement is on the canvas.
function allOnScreen(v: MapView, w: number, h: number, placements: Placements): boolean {
  return Object.values(placements).every((p) =>
    [[p.col, p.row], [p.col + p.w, p.row], [p.col + p.w, p.row + p.h], [p.col, p.row + p.h]].every(([c, r]) => {
      const q = project(c, r);
      const x = v.x + q.x * v.zoom;
      const y = v.y + q.y * v.zoom;
      return x >= 0 && x <= w && y >= 0 && y <= h;
    }));
}
// The middle of the placements' box, in tiles.
function boxMiddle(placements: Placements): { col: number; row: number } {
  const all = Object.values(placements);
  return {
    col: (Math.min(...all.map((p) => p.col)) + Math.max(...all.map((p) => p.col + p.w))) / 2,
    row: (Math.min(...all.map((p) => p.row)) + Math.max(...all.map((p) => p.row + p.h))) / 2,
  };
}

// The harness sites every building at firstFreeSpot, a strip along the
// parcel's back edge (tools/layout.ts says why), so the year-5 run's
// buildings are re-sited as a player sites them: each in turn as near
// Founders Hall as a clear spot with a tile of grass round it allows.
function sitedRoundTheHall(placements: Placements, hallId: string): Placements {
  const hall = placements[hallId];
  const out: Placements = { [hallId]: hall };
  const hc = hall.col + hall.w / 2;
  const hr = hall.row + hall.h / 2;
  for (const [id, p] of Object.entries(placements)) {
    if (id === hallId) continue;
    const ring = { w: p.w + 2, h: p.h + 2 };
    let best: { row: number; col: number; d: number } | null = null;
    for (let row = 1; row + p.h < ROAD_FIRST_ROW; row++) {
      for (let col = 1; col + p.w < GW; col++) {
        const d = Math.hypot(col + p.w / 2 - hc, row + p.h / 2 - hr);
        if (best && d >= best.d) continue;
        if (footprintIsClear(out, row - 1, col - 1, ring)) best = { row, col, d };
      }
    }
    out[id] = placementFor(best!.row, best!.col, { w: p.w, h: p.h });
  }
  return out;
}

const game = foundGame();
const founded = structuredClone(game.s.placements);
const hallId = Object.keys(founded)[0];
playUntil(game, playerNamed('Guided')!, 5, () => false);
const year5 = sitedRoundTheHall(game.s.placements, hallId);
const year40 = (JSON.parse(readFileSync(join(process.cwd(), 'test/fixtures/save-v98.json'), 'utf8')).state as { placements: Placements }).placements;

for (const [w, h] of SIZES) {
  const floor = ringZoomFloor(w, h);
  const at = `at ${w}×${h}`;
  assert(floor < DEFAULT_ZOOM, `${at} the ring's floor is under the opening zoom, so it does not decide these`);

  // ---- The empty parcel (a guided founding before the hall is sited) ----
  {
    const v = framedView({ width: w, height: h }, {}, floor);
    const c = centreOf(v, w, h);
    assert(v.zoom === FRAMED_ZOOM, `${at} an empty parcel opens at ${FRAMED_ZOOM} (${v.zoom})`);
    assert(near(c.col, GW / 2) && near(c.row, GH / 2), `${at} on the parcel's middle (${c.col.toFixed(1)}, ${c.row.toFixed(1)})`);
  }

  // ---- A lone Founders Hall ----
  {
    const ids = Object.keys(founded);
    assert(ids.length === 1, `a new college has one building (${ids.join(', ')})`);
    const v = framedView({ width: w, height: h }, founded, floor);
    const c = centreOf(v, w, h);
    const m = boxMiddle(founded);
    assert(v.zoom === FRAMED_ZOOM, `${at} a lone hall opens at ${FRAMED_ZOOM} (${v.zoom})`);
    assert(near(c.col, m.col) && near(c.row, m.row), `${at} centred on the hall`);
    assert(allOnScreen(v, w, h, founded), `${at} the hall is on screen`);
  }

  // ---- A year-5 Guided campus: between the two, all of it on screen ----
  // At 1280×720 its box (a ball diamond and two quads by year 5) wants a
  // little under DEFAULT_ZOOM, so it opens there, centred on the campus.
  {
    const v = framedView({ width: w, height: h }, year5, floor);
    const n = Object.keys(year5).length;
    assert(n > 5, `the year-5 Guided campus has grown (${n} buildings)`);
    assert(v.zoom >= DEFAULT_ZOOM && v.zoom < FRAMED_ZOOM, `${at} year 5 opens between ${DEFAULT_ZOOM} and ${FRAMED_ZOOM} (${v.zoom.toFixed(3)})`);
    if (w === 1440) {
      assert(v.zoom > DEFAULT_ZOOM, `${at} year 5 opens closer than a built-out campus (${v.zoom.toFixed(3)})`);
      assert(allOnScreen(v, w, h, year5), `${at} every year-5 building is on screen`);
    }
    const c = centreOf(v, w, h);
    const m = boxMiddle(year5);
    assert(near(c.col, m.col) && near(c.row, m.row), `${at} centred on the campus`);
  }

  // ---- A year-40 campus: as wide as the old opening view, unclamped ----
  {
    const v = framedView({ width: w, height: h }, year40, floor);
    assert(Object.keys(year40).length > 50, 'the year-40 save is built out');
    assert(v.zoom === DEFAULT_ZOOM, `${at} year 40 opens at ${DEFAULT_ZOOM} (${v.zoom})`);
    const c = centreOf(v, w, h);
    const m = boxMiddle(year40);
    assert(near(c.col, m.col) && near(c.row, m.row), `${at} centred on the campus: clampView left it alone`);
    assert(clampView(v, w, h) === v, `${at} clampView hands the year-40 view back as it is`);
  }

  // ---- The floor wins over the fit ----
  {
    const v = framedView({ width: w, height: h }, year40, 0.7);
    assert(v.zoom === 0.7, `${at} the map's own floor holds the zoom up (${v.zoom})`);
  }
}

// The margin is grass round the campus, not the zoom's whole fit.
assert(FRAME_MARGIN > 0 && FRAME_MARGIN <= 8, `a margin of a few tiles (${FRAME_MARGIN})`);

console.log(`  ${checks - failures}/${checks} checks passed`);
if (failures > 0) process.exit(1);
