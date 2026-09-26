// The pinch's arithmetic (src/components/mapGestures.ts, Plan 70F): the
// ground under the fingers stays under them, the zoom follows their spread
// and is clamped, and two fingers too close together do not zoom.

import { distance, midpoint, pinchView } from '../src/components/mapGestures';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

console.log('map gesture tests');

const start = { x: 100, y: 50, zoom: 1 };
const a = { x: 200, y: 200 };
const b = { x: 300, y: 200 };
const mid = midpoint(a, b);
const d = distance(a, b);
assert(near(mid.x, 250) && near(mid.y, 200) && near(d, 100), 'midpoint and distance');

// Spreading the fingers to twice the distance doubles the zoom, and the
// ground under the midpoint stays put.
const wide = pinchView(start, mid, d, mid, 2 * d, 0.2, 3);
assert(near(wide.zoom, 2), `spread x2 zooms x2 (${wide.zoom})`);
const groundBefore = { x: (mid.x - start.x) / start.zoom, y: (mid.y - start.y) / start.zoom };
const groundAfter = { x: (mid.x - wide.x) / wide.zoom, y: (mid.y - wide.y) / wide.zoom };
assert(near(groundBefore.x, groundAfter.x) && near(groundBefore.y, groundAfter.y), 'the ground under the fingers stays under them');

// Moving both fingers pans by the midpoint's travel.
const moved = pinchView(start, mid, d, { x: mid.x + 40, y: mid.y - 10 }, d, 0.2, 3);
assert(near(moved.zoom, 1) && near(moved.x, start.x + 40) && near(moved.y, start.y - 10), 'two fingers moving together pan');

// Clamped at both ends.
assert(near(pinchView(start, mid, d, mid, 10 * d, 0.2, 3).zoom, 3), 'zoom clamps at the top');
assert(near(pinchView(start, mid, d, mid, d / 6, 0.2, 3).zoom, 0.2), 'and at the bottom');

// Fingers nearly touching are not read as a pinch.
assert(near(pinchView(start, mid, 5, mid, 50, 0.2, 3).zoom, 1), 'fingers too close together do not zoom');

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
