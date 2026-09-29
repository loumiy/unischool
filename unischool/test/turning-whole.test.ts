// The whole scene through a turn (Plan 82, undoing Plan 80H's light turn):
// at an angle between two views, the campus's sorted scene still holds
// every tree and every prop, and the land around the campus is drawn whole
// (its fields, its trees and houses), not hidden or cut to a flat plate.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { campusLayout } from '../src/components/campusLayout';
import { sceneEntries } from '../src/components/CampusMap';
import { RingBack, RingFront } from '../src/components/Surroundings';
import { DEFAULT_PITCH, VIEWS, setCamera, turnStep } from '../src/components/isoProjection';
import { parsePathTileKey } from '../src/state/campusMap';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('turning whole tests');

bindScriptStream(8200);
const s = createInitialState('Turning Whole');
const layout = campusLayout(s);
const trees = Object.keys(layout.trees).filter((k) => !(k in layout.pathways) && parsePathTileKey(k));
assert(trees.length > 100, `a founding woodland to look for (${trees.length} trees)`);

// Two fifths of the way through a quarter turn: an angle no view rests on.
for (const t of [0.2, 0.4, 0.7]) {
  const camera = setCamera({ azimuth: turnStep(VIEWS[0]!, VIEWS[1]!, t), pitch: DEFAULT_PITCH });
  const scene = sceneEntries(layout);
  const drawn = scene.filter((e) => e.kind === 'tree').length;
  assert(drawn === trees.length, `at ${t} of a turn the scene holds every tree (${drawn} of ${trees.length})`);
  assert(scene.some((e) => e.kind === 'mass'), `at ${t} of a turn the scene holds the buildings`);

  const props = { name: s.self.name, vernacular: s.self.vernacular, camera, turning: true, snow: 0 };
  const back = renderToStaticMarkup(createElement('svg', null, createElement(RingBack, props)));
  const front = renderToStaticMarkup(createElement('svg', null, createElement(RingFront, props)));
  assert(back.includes('ring-field') && back.includes('campus-road'), `at ${t} of a turn the land around the campus has its fields and road`);
  assert(back.includes('campus-tree') || back.includes('ring-crown'), `at ${t} of a turn it has its trees`);
  assert(!back.includes('visibility') && !front.includes('visibility'), `at ${t} of a turn nothing of it is hidden`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
