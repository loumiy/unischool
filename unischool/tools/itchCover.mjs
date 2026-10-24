// ---------------------------------------------------------------------
// THE ITCH.IO COVER (Plan 97I): the fall campus with the title screen's
// mark and name over it, at itch.io's cover ratio (630 by 500), drawn at
// twice that so it stays sharp on a high-density screen.
//
//   npm run shot -- campus-laid.json bg.jpg --bare --size=1260,1000 \
//     --tilt=-2 --zoom=-1 --pan=0,220          # the campus, low in the frame
//   node tools/itchCover.mjs bg.jpg ../docs/store/itch/cover.jpg
//
// --size=W,H draws another shape at twice W by H: --size=960,540 is a
// 1920 by 1080 wide cover (for sites, like foundplay.io, that want one),
// from a background shot at 1920,1080.
//
// --vivid brightens and saturates the picture (the owner's taste, 11
// October): a brighter, bluer sky and livelier grass. The name stays white.
//
// The mark is Logo.tsx's, and the name is set as the title screen sets it
// (styles.css's .logo-name: Archivo 800, wide capitals, white, the soft
// blue shadow). The title screen's art puts them on a blue sky; the campus
// shot's sky is a pale haze, so a band of that blue fades in behind them.
//
// The mark, the face, the sky and the browser are coverArt.mjs's, which the
// Steam capsules (steamCapsules.mjs, Plan 117F) share.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { archivoFace, drawPages, logoMark, photoFilter as vividFilter, skyStops } from './coverArt.mjs';

const args = process.argv.slice(2);
const [bgPath, outPath] = args.filter((a) => !a.startsWith('--'));
const sizeArg = args.find((a) => a.startsWith('--size='));
const vivid = args.includes('--vivid');
const [W, H] = sizeArg ? sizeArg.slice(7).split(',').map(Number) : [630, 500];
if (!bgPath || !outPath || !(W > 0 && H > 0)) {
  console.error('usage: node tools/itchCover.mjs <background.jpg> <out.jpg> [--size=W,H]');
  process.exit(2);
}

const bg = readFileSync(resolve(bgPath)).toString('base64');

// Vivid: the photo brightened and saturated, and the sky band a clearer, more cyan blue.
const photoFilter = vividFilter(vivid);
const sky = skyStops(vivid);
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${archivoFace()}
html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
.cover { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; }
.photo { position: absolute; inset: 0; background: url(data:image/jpeg;base64,${bg}) center / cover; ${photoFilter} }
/* The title art's sky, fading into the haze above the campus. */
.sky { position: absolute; inset: 0 0 auto 0; height: ${Math.round(H * 0.6)}px;
  background: linear-gradient(180deg, ${sky}); }
.head { position: absolute; inset: 34px 0 auto 0; display: flex; flex-direction: column; align-items: center; gap: 12px;
  color: #fff; text-shadow: 0 2px 14px rgba(10, 50, 110, 0.28); }
.mark { width: 92px; height: auto; display: block; filter: drop-shadow(0 2px 10px rgba(10, 50, 110, 0.25)); }
.name { margin: 0; font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 64px; line-height: 1;
  letter-spacing: 0.04em; text-transform: uppercase; }
</style></head><body><div class="cover"><div class="photo"></div><div class="sky"></div><div class="head">
${logoMark('mark')}
<h1 class="name">UniSchool</h1></div></div></body></html>`;

await drawPages([{ html, width: W, height: H, scale: 2, out: outPath, selector: '.cover', type: 'jpeg', quality: 90 }]);
console.log(`wrote ${outPath} (${W * 2} by ${H * 2}, ${W} by ${H} at twice the density)`);
