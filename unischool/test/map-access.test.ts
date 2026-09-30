// The map's buildings for the keyboard and a screen reader (Plan 83E): the
// map renders a visually hidden list with one button per placed building,
// named as the map names it, in the order the map reads (top to bottom,
// then left to right), with one Tab stop for the whole list.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readSave } from '../src/state/persistence';
import CampusMap from '../src/components/CampusMap';
import { campusLayout } from '../src/components/campusLayout';
import { project, setCamera, DEFAULT_CAMERA } from '../src/components/isoProjection';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('map access tests');

const read = readSave(readFileSync(join(process.cwd(), 'test/fixtures/save-launch.json'), 'utf8'));
if ('refused' in read) throw new Error('the launch fixture did not load');
const s = read.state;
setCamera(DEFAULT_CAMERA);
const layout = campusLayout(s);
const noop = () => {};
const markup = renderToStaticMarkup(createElement(CampusMap, {
  s, act: noop, selectedId: null, onSelect: noop, pathTool: null, onSetPathTool: noop,
  backOutEnabled: true, controlsEnabled: true, onOpenCurriculum: noop, gait: 1,
}));

const list = /<div class="map-building-list" role="group" aria-label="([^"]*)">(.*?)<\/div>/.exec(markup);
assert(list !== null, 'the map has its list of buildings');
const buttons = [...(list?.[2] ?? '').matchAll(/<button type="button" data-building-button="([^"]+)" tabindex="(-?\d)">([^<]*)<\/button>/g)];
assert(buttons.length === layout.placed.length && buttons.length > 3, `one button per building (${buttons.length} of ${layout.placed.length})`);
assert(buttons.filter((b) => b[2] === '0').length === 1, 'one Tab stop for the list');
assert(list?.[1].includes(String(layout.placed.length)) === true, `the list says how many (${list?.[1]})`);
const byId = new Map(layout.placed.map((e) => [e.t.id, e]));
const unescape = (t: string) => t.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
assert(buttons.every((b) => {
  const e = byId.get(b[1]!);
  return e !== undefined && unescape(b[3]!) === (e.developing ? `${e.label}, under construction` : e.label);
}), 'each named as the map names it');
const rows = buttons.map((b) => {
  const e = byId.get(b[1]!)!;
  const c = project(e.p.col + e.p.w / 2, e.p.row + e.p.h / 2);
  return { band: Math.round(c.y / 48), x: c.x };
});
assert(rows.every((r, i) => i === 0 || r.band > rows[i - 1]!.band || (r.band === rows[i - 1]!.band && r.x >= rows[i - 1]!.x)), 'in the order the map reads');
assert(markup.indexOf('map-building-list') < markup.indexOf('campus-map-canvas'), 'before the map\'s layers, so it is the map\'s first Tab stop');

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
