// ---------------------------------------------------------------------
// THE COVER FROM THE SCENE: coverScene.tsx's Founders Hall on its lawn,
// under a summer sky with a few flat clouds, the title screen's mark and
// name at the top. The mark, the face and the browser are coverArt.mjs's,
// as itchCover.mjs uses them.
//
//   npm run cover:scene -- node_modules/.tmp/scene.svg
//   node tools/itchScene.mjs node_modules/.tmp/scene.svg ../docs/store/itch/cover.jpg
//   node tools/itchScene.mjs scene-wide.svg ../docs/store/itch/cover-wide.jpg --size=960,540
//
// --size=W,H draws at twice W by H (default 630 by 500, itch.io's cover);
// the scene should be written at the same ratio (`--ratio=` there).
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { archivoFace, drawPages, logoMark } from './coverArt.mjs';

const args = process.argv.slice(2);
const [scenePath, outPath] = args.filter((a) => !a.startsWith('--'));
const sizeArg = args.find((a) => a.startsWith('--size='));
const [W, H] = sizeArg ? sizeArg.slice(7).split(',').map(Number) : [630, 500];
if (!scenePath || !outPath || !(W > 0 && H > 0)) {
  console.error('usage: node tools/itchScene.mjs <scene.svg> <out.jpg> [--size=W,H]');
  process.exit(2);
}
const scene = readFileSync(resolve(scenePath), 'utf8');
const css = readFileSync(resolve(`${scenePath}.css`), 'utf8');

// Flat clouds, as the map's own art is flat: overlapping discs on a level
// base, a shade of blue-grey under them.
const cloud = (x, y, s) => {
  const discs = [[0, 0, 26], [30, -14, 32], [64, -4, 26], [88, 6, 18], [-24, 8, 16]];
  const body = discs.map(([dx, dy, r]) => `<circle cx="${dx}" cy="${dy}" r="${r}"/>`).join('');
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <g fill="#d7e6f3" transform="translate(4 6)">${body}<rect x="-40" y="0" width="146" height="24" rx="12"/></g>
    <g fill="#fff">${body}<rect x="-40" y="0" width="146" height="20" rx="10"/></g></g>`;
};
const clouds = `<svg class="clouds" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
  ${cloud(W * 0.27, H * 0.47, H / 900)}${cloud(W * 0.66, H * 0.43, H / 1000)}${cloud(W * 0.05, H * 0.08, H / 1100)}${cloud(W * 0.86, H * 0.12, H / 1300)}
</svg>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${css}
${archivoFace()}
html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
.cover { position: relative; width: ${W}px; height: ${H}px; overflow: hidden;
  background: linear-gradient(180deg, #1f86e0 0%, #3d9cec 40%, #8cc8f2 78%, #cfe6f4 100%); }
.clouds { position: absolute; inset: 0; width: 100%; height: 100%; }
.scene { position: absolute; inset: 0; }
.scene svg { width: 100%; height: 100%; display: block; }
.head { position: absolute; inset: ${Math.round(H * 0.07)}px 0 auto 0; display: flex; flex-direction: column; align-items: center; gap: ${Math.round(H * 0.024)}px;
  color: #fff; text-shadow: 0 2px 14px rgba(10, 50, 110, 0.28); }
.mark { width: ${Math.round(H * 0.2)}px; height: auto; display: block; filter: drop-shadow(0 2px 10px rgba(10, 50, 110, 0.25)); }
.name { margin: 0; font-family: 'Archivo', sans-serif; font-weight: 800; font-size: ${Math.round(H * 0.13)}px; line-height: 1;
  letter-spacing: 0.04em; text-transform: uppercase; }
</style></head><body><div class="cover">${clouds}<div class="scene">${scene}</div><div class="head">
${logoMark('mark')}
<h1 class="name">UniSchool</h1></div></div></body></html>`;

await drawPages([{ html, width: W, height: H, scale: 2, out: outPath, selector: '.cover', type: 'jpeg', quality: 92 }]);
console.log(`wrote ${outPath} (${W * 2} by ${H * 2}, ${W} by ${H} at twice the density)`);
