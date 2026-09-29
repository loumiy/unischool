// The canvas map (Plan 83B's prototype behind `?map=canvas`, the map since
// 83C) keeps the SVG scene behind `?map=svg`, rendered exactly as before,
// and the SVG is what renders outside a browser; the points the art formats
// are strings as before.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import CampusMap, { CANVAS_MAP, canvasMapWanted } from '../src/components/CampusMap';
import { PointList, polyPoints, setRawPoints } from '../src/components/isoProjection';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('canvas flag tests');

// The flag: only `map=svg` turns the canvas off.
assert(!CANVAS_MAP, 'the SVG outside a browser');
assert(canvasMapWanted(''), 'no query, the canvas');
assert(canvasMapWanted('?map=canvas'), 'map=canvas is the canvas');
assert(canvasMapWanted('?debug=1'), 'another query is the canvas');
assert(!canvasMapWanted('?map=svg'), 'map=svg is the SVG');
assert(!canvasMapWanted('?debug=1&map=svg'), 'map=svg among other parameters is the SVG');

// Points are strings unless the painter asks for them raw, and a raw list
// formats to the same string.
const pts = [{ x: 1.234, y: 5 }, { x: -2, y: 0.005 }, { x: 10, y: 20.5 }];
const text = polyPoints(pts);
assert(typeof text === 'string' && text === '1.23,5.00 -2.00,0.01 10.00,20.50', `points format as before (${text})`);
setRawPoints(true);
const raw = polyPoints(pts) as unknown;
setRawPoints(false);
assert(raw instanceof PointList && String(raw) === text, 'a raw point list formats to the same string');
assert(`M${raw as string}` === `M${text}` && (raw as PointList).replace(/ /g, 'L') === text.replace(/ /g, 'L'), 'and serves the art\'s string uses');
assert(typeof polyPoints(pts) === 'string', 'raw mode is off again after the painter');

// The SVG map: the SVG scene, its ring and its labels, and no canvas.
bindScriptStream(8300);
const s = createInitialState('Canvas Flag');
const noop = () => {};
const markup = renderToStaticMarkup(createElement(CampusMap, {
  s, act: noop, selectedId: null, onSelect: noop, pathTool: null, onSetPathTool: noop,
  backOutEnabled: true, controlsEnabled: true, onOpenCurriculum: noop, gait: 1,
}));
assert(!markup.includes('<canvas'), 'the SVG map has no canvas');
assert(!markup.includes('campus-map-scene'), 'nor the canvas layer');
assert(markup.includes('class="campus-map-ring"'), 'it has the ring\'s own svg');
assert(markup.includes('ring-field'), 'with the land around the campus in it');
assert(markup.includes('campus-ground') && markup.includes('campus-road'), 'the ground and the road are SVG');
assert(markup.includes('campus-building'), 'the buildings are SVG');
assert(markup.includes('campus-tree'), 'the trees are SVG');
assert(markup.includes('scaffold-hatch'), 'the scaffold pattern is defined');
const rings = markup.indexOf('campus-map-ring');
const scene = markup.indexOf('campus-ground');
assert(rings >= 0 && scene > rings, 'the ring is drawn under the scene');

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
