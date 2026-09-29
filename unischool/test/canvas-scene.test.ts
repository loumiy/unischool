// The canvas map's scene (Plan 83C), painted in Node with stand-ins for the
// canvas and the stylesheet: the painter walks the whole scene of a
// year-25 campus at every view and at the lowest pitch without a hook, a
// gap or anything it cannot draw, and records every building for picking;
// and neither the painter nor the art's registry reaches into React.

import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readSave } from '../src/state/persistence';
import { campusLayout } from '../src/components/campusLayout';
import { mapSceneTree } from '../src/components/CampusMap';
import { RingFront } from '../src/components/Surroundings';
import { HitList, Painter, type ClassRules } from '../src/components/canvasPaint';
import { PITCHES, VIEWS, polyPoints, setCamera } from '../src/components/isoProjection';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('canvas scene tests');

// Stand-ins: a Path2D that records nothing, and a context that counts what
// it is asked to fill and stroke.
class FakePath2D {
  moveTo(): void {} lineTo(): void {} closePath(): void {} rect(): void {} roundRect(): void {}
  arc(): void {} ellipse(): void {} addPath(): void {} bezierCurveTo(): void {} quadraticCurveTo(): void {}
}
(globalThis as unknown as { Path2D: unknown }).Path2D = FakePath2D;
const counts = { fill: 0, stroke: 0, text: 0 };
const state: Record<string, unknown> = { canvas: { width: 1000, height: 800 } };
const ctx = new Proxy(state, {
  get(t, k: string) {
    if (k in t) return t[k];
    if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
    if (k === 'fill') return () => { counts.fill += 1; };
    if (k === 'stroke') return () => { counts.stroke += 1; };
    if (k === 'fillText') return () => { counts.text += 1; };
    // Gradients and patterns: something to add stops to.
    return () => ({ addColorStop: () => {}, setTransform: () => {} });
  },
  set(t, k: string, v) { t[k] = v; return true; },
}) as unknown as CanvasRenderingContext2D;
(globalThis as unknown as { document: unknown }).document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
};
const rules: ClassRules = { generation: 0, resolve: () => ({ opacity: 1, display: true }), color: (v) => v };

const read = readSave(readFileSync(join(process.cwd(), 'test/fixtures/save-launch.json'), 'utf8'));
if ('refused' in read) throw new Error('the launch fixture did not load');
const s = read.state;
const layout = campusLayout(s);
const ids = layout.placed.map((e) => e.t.id);
assert(ids.length >= 40, `a built campus to paint (${ids.length} buildings)`);

const labelLayerRef = { current: null };
const hits = new HitList();
const painter = new Painter(ctx, { rules, dpr: 1, zoom: 1, hits, skipRef: labelLayerRef, skipClass: 'campus-building-complete' });
const cameras = [...VIEWS.map((azimuth) => ({ azimuth, pitch: PITCHES[3]! })), { azimuth: VIEWS[0]!, pitch: PITCHES[0]! }];
let lastDrawn = 0;
for (const [i, c] of cameras.entries()) {
  const camera = setCamera(c);
  const tree = mapSceneTree({
    name: s.self.name, developing: s.developing, layout, camera, turning: false, snow: 0.6,
    crowds: new Set(ids.slice(0, 3)), banners: { ...s.self.colors },
    inspectedId: ids[0]!, justFinished: [ids[1]!], onInspect: () => {}, labelLayerRef,
    front: createElement(RingFront, { name: s.self.name, vernacular: layout.vernacular, camera, turning: false, snow: 0.6 }),
  });
  counts.fill = 0;
  const stats = painter.paint(tree);
  const where = `view ${i}${c.pitch === PITCHES[0] ? ' at the lowest pitch' : ''}`;
  assert(stats.unsupported.size === 0, `${where}: nothing it cannot draw (${JSON.stringify(Object.fromEntries(stats.unsupported))})`);
  assert(stats.drawn > 4000 && counts.fill > 3000, `${where}: the whole scene (${stats.drawn} shapes, ${counts.fill} fills)`);
  const owners = new Set(hits.owners());
  const missing = ids.filter((id) => !owners.has(id));
  assert(missing.length === 0, `${where}: every building can be pointed at (${missing.join(', ') || 'all'})`);
  lastDrawn = stats.drawn;
}
// A second paint at the same camera, its memos kept, draws the same.
const again = painter.paint(mapSceneTree({
  name: s.self.name, developing: s.developing, layout, camera: setCamera(cameras[cameras.length - 1]!), turning: false, snow: 0.6,
  crowds: new Set(ids.slice(0, 3)), banners: { ...s.self.colors },
  inspectedId: ids[0]!, justFinished: [ids[1]!], onInspect: () => {}, labelLayerRef,
  front: null,
}));
assert(again.drawn > 0 && Math.abs(again.drawn - lastDrawn) < 200, `a repaint draws the scene again (${again.drawn} against ${lastDrawn}, less the land in front)`);
assert(typeof polyPoints([{ x: 1, y: 2 }]) === 'string', 'points are strings again after a paint');

// Works under way: sites at every stage paint too. The site's progress read
// its weeks through a hook the painter did not answer, and a campus with
// works going on stopped the game (Plan 83C's fix).
{
  const s2 = structuredClone(s);
  const sites = layout.placed.filter((e) => !e.developing).slice(0, 6).map((e) => e.t.id);
  for (const [i, id] of sites.entries()) {
    const node = s2.tech.find((t) => t.id === id)!;
    node.status = 'developing';
    s2.developing[id] = Math.max(1, Math.round((node.duration * (i + 0.5)) / sites.length));
  }
  const layout2 = campusLayout(s2);
  assert(layout2.placed.filter((e) => e.developing).length >= sites.length, `the works are under way (${sites.length} sites)`);
  let threw = '';
  let stats: ReturnType<typeof painter.paint> | null = null;
  try {
    stats = painter.paint(mapSceneTree({
      name: s2.self.name, developing: s2.developing, layout: layout2, camera: setCamera(cameras[0]!), turning: false, snow: 0,
      crowds: new Set<string>(), banners: null, inspectedId: null, justFinished: [], onInspect: () => {}, labelLayerRef,
      front: null,
    }));
  } catch (err) {
    threw = String(err).slice(0, 160);
  }
  assert(threw === '', `a campus with works under way paints (${threw || 'no error'})`);
  assert(stats !== null && stats.unsupported.size === 0, `the sites hold nothing it cannot draw (${stats ? JSON.stringify(Object.fromEntries(stats.unsupported)) : 'no paint'})`);
}

// Nothing reaches into React: no internals, no element markers, no
// context internals.
for (const file of ['src/components/canvasPaint.ts', 'src/components/canvasArt.ts']) {
  const src = readFileSync(join(process.cwd(), file), 'utf8');
  for (const word of ['__CLIENT_INTERNALS', '$$typeof', '_currentValue', 'Symbol.for(']) {
    assert(!src.includes(word), `${file} does not use ${word}`);
  }
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
