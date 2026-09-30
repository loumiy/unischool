// The canvas map's scene (Plans 83C–83D), recorded and drawn in Node with
// stand-ins for the canvas and the stylesheet: a year-25 campus at every
// view and at the lowest pitch records with no hook, no gap and nothing it
// cannot draw, each building pickable; a door a walker holds is drawn
// through the recorder's hook; and neither the painter, the compositor nor
// the art's registry reaches into React.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readSave } from '../src/state/persistence';
import { campusLayout } from '../src/components/campusLayout';
import { canvasSceneOf, groundGeometry, sceneEntries } from '../src/components/CampusMap';
import { HitList, Recorder, replay, type ClassRules, type Op } from '../src/components/canvasPaint';
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
assert(ids.length >= 40, `a built campus to draw (${ids.length} buildings)`);

const doorCalls: string[] = [];
const defs = new Map();
const ground = new Recorder({ rules, defs, skipClass: 'campus-building-complete' });
const things = new Recorder({
  rules, defs, skipClass: 'campus-building-complete',
  extraClass: (cls, props, owner) => {
    if (owner && cls.includes('iso-door-way')) doorCalls.push(`${owner}|${String(props['data-door'])}`);
    return cls;
  },
});
const cameras = [...VIEWS.map((azimuth) => ({ azimuth, pitch: PITCHES[3]! })), { azimuth: VIEWS[0]!, pitch: PITCHES[0]! }];
for (const [i, c] of cameras.entries()) {
  const camera = setCamera(c);
  const scene = canvasSceneOf({
    layout, camera, scene: sceneEntries(layout), groundGeo: groundGeometry(), name: s.self.name, developing: s.developing,
    turning: false, snow: 0.6, crowds: new Set(ids.slice(0, 3)), banners: { ...s.self.colors },
    inspectedId: ids[0]!, justFinished: [ids[1]!], onInspect: () => {}, labelLayerRef: { current: null },
    season: 'test', groundClass: '',
  });
  const where = `view ${i}${c.pitch === PITCHES[0] ? ' at the lowest pitch' : ''}`;
  things.resetStats();
  ground.resetStats();
  const all: Op[][] = [ground.record('ring', scene.ring.node, scene.values), ground.record('ground', scene.ground.node, scene.values)];
  for (const e of scene.entries) all.push(things.record(e.key, e.node, scene.values));
  all.push(ground.record('front', scene.front.node, scene.values));
  const unsupported = { ...Object.fromEntries(things.stats.unsupported), ...Object.fromEntries(ground.stats.unsupported) };
  assert(Object.keys(unsupported).length === 0, `${where}: nothing it cannot draw (${JSON.stringify(unsupported)})`);
  counts.fill = 0;
  for (const ops of all) replay(ctx, ops, { base: [1, 0, 0, 1, 0, 0], zoom: 1, dpr: 1 });
  const drawn = things.stats.drawn + ground.stats.drawn;
  assert(drawn > 4000 && counts.fill > 3000, `${where}: the whole scene (${drawn} shapes, ${counts.fill} fills)`);
  const hits = new HitList();
  for (const ops of all) hits.addOps(ops);
  const owners = new Set(hits.owners());
  const missing = ids.filter((id) => !owners.has(id));
  assert(missing.length === 0, `${where}: every building can be pointed at (${missing.join(', ') || 'all'})`);
  assert(scene.entries.every((e) => e.sig.length > 0) && new Set(scene.entries.map((e) => e.key)).size === scene.entries.length, `${where}: every thing has a key and a signature`);
  assert(scene.rings.length === 1 && scene.rings[0]!.id === ids[1], `${where}: the finished building's ring`);
}
assert(doorCalls.length > 20 && doorCalls.every((k) => /\|(negRow|posRow|negCol|posCol)$/.test(k)), `the doors reach the recorder by building and wall (${doorCalls.length}, e.g. ${doorCalls[0]})`);
assert(typeof polyPoints([{ x: 1, y: 2 }]) === 'string', 'points are strings again after recording');

// Works under way: sites at every stage record too. The site's progress
// read its weeks through a hook the recorder did not answer, and a campus
// with works going on stopped the game (Plan 83C's fix, #264).
{
  const s2 = structuredClone(s);
  const sites = layout.placed.filter((e) => !e.developing).slice(0, 6).map((e) => e.t.id);
  for (const [i, id] of sites.entries()) {
    const node = s2.tech.find((t) => t.id === id)!;
    node.status = 'developing';
    s2.developing[id] = Math.max(1, Math.round((node.duration * (i + 0.5)) / sites.length));
  }
  const layout2 = campusLayout(s2);
  const camera = setCamera(cameras[0]!);
  const scene = canvasSceneOf({
    layout: layout2, camera, scene: sceneEntries(layout2), groundGeo: groundGeometry(), name: s2.self.name, developing: s2.developing,
    turning: false, snow: 0, crowds: new Set<string>(), banners: null, inspectedId: null, justFinished: [], onInspect: () => {},
    labelLayerRef: { current: null }, season: 'works', groundClass: '',
  });
  let threw = '';
  things.resetStats();
  ground.resetStats();
  try {
    ground.record('ground-works', scene.ground.node, scene.values);
    for (const e of scene.entries) things.record(`works-${e.key}`, e.node, scene.values);
  } catch (err) {
    threw = String(err).slice(0, 120);
  }
  assert(layout2.placed.filter((e) => e.developing).length >= sites.length, `the works are under way (${sites.length} sites)`);
  assert(threw === '', `a campus with works under way records (${threw || 'no error'})`);
  const unsupported = { ...Object.fromEntries(things.stats.unsupported), ...Object.fromEntries(ground.stats.unsupported) };
  assert(Object.keys(unsupported).length === 0, `the sites hold nothing it cannot draw (${JSON.stringify(unsupported)})`);
}

// A thing's signature changes with what it draws, and only then.
{
  const camera = setCamera(cameras[0]!);
  const base = { layout, camera, scene: sceneEntries(layout), groundGeo: groundGeometry(), name: s.self.name, developing: s.developing, turning: false, snow: 0, crowds: new Set<string>(), banners: null, inspectedId: null, justFinished: [], onInspect: () => {}, labelLayerRef: { current: null }, season: 'x', groundClass: '' };
  const a = canvasSceneOf(base);
  const b = canvasSceneOf({ ...base, inspectedId: ids[0]! });
  const changed = a.entries.filter((e, i) => e.sig !== b.entries[i]!.sig).map((e) => e.key);
  assert(changed.length === 1 && changed[0] === `b-${ids[0]}`, `inspecting a building changes its drawing alone (${changed.join(', ')})`);
  const c = canvasSceneOf({ ...base, developing: { ...s.developing, [ids[2]!]: 7 } });
  const changed2 = a.entries.filter((e, i) => e.sig !== c.entries[i]!.sig).map((e) => e.key);
  assert(changed2.every((k) => k === `b-${ids[2]}`), `a week's works change that building's drawing alone (${changed2.join(', ')})`);
}

// Nothing reaches into React: no internals, no element markers, no
// context internals.
for (const file of ['src/components/canvasPaint.ts', 'src/components/canvasArt.ts', 'src/components/mapCanvas.ts']) {
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
