// ---------------------------------------------------------------------
// THE FALLBACK CAPSULES (Plan 117F): Steam's capsule set, drawn as the
// itch.io cover is (itchCover.mjs) from the game's own fall campus and the
// title screen's code-drawn mark and name, until the commissioned art
// (docs/store/art-brief.md) lands. Nothing in them is generated, so they
// need no AI disclosure.
//
// Each is drawn at exactly the size Steamworks asks for, not doubled, and
// the script reads each file back and fails if it is any other size.
//
//   npm run scenario -- --player Completionist --year 32 --week 14 --build-all \
//     --clear-modal --name Halifax --colors navy-gold campus.json
//   npm run layout -- campus.json campus-laid.json
//   npm run shot -- campus-laid.json wide.jpg --bare --size=1920,1080 --tilt=-2 --zoom=0 --pan=0,300 --quality=92
//   npm run shot -- campus-laid.json tall.jpg --bare --size=1000,1500 --tilt=-2 --zoom=0 --pan=0,380 --quality=92
//   npm run shot -- campus-laid.json hero.jpg --bare --size=1920,620 --tilt=-2 --zoom=-1 --pan=0,150 --scale=2 --quality=92
//   npm run steam:capsules -- --wide=wide.jpg --tall=tall.jpg --hero=hero.jpg --vivid
//
// --out=<dir> writes elsewhere than docs/store/steam/; --only=small,header
// draws some of them. Without --hero the library hero is skipped.
//
// Each shape gets its own composition rather than one picture cropped five
// ways: the wide ones take the 1920 by 1080 shot with the mark over the
// name; the tall ones (the vertical and library capsules) take a portrait
// shot, so the campus fills the lower half under the name; the small capsule
// sets the mark beside the name, the name as large as the height allows,
// over a deeper band of the sky, since at 462 by 174 the name is the whole
// job. The library hero carries no name (Steam lays the logo over it), and
// the library logo is the mark and name alone on a transparent ground.
// ---------------------------------------------------------------------

import { readFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ROOT, archivoFace, drawPages, imageSize, logoMark, photoFilter, skyStops } from './coverArt.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const vivid = args.includes('--vivid');
const outDir = resolve(flag('out') ?? join(ROOT, '../docs/store/steam'));
const only = flag('only')?.split(',');
const shots = { wide: flag('wide'), tall: flag('tall'), hero: flag('hero') };
if (!shots.wide || !shots.tall) {
  console.error('usage: npm run steam:capsules -- --wide=<1920x1080.jpg> --tall=<portrait.jpg> [--hero=<3840x1240.jpg>] [--vivid] [--out=dir] [--only=a,b]');
  process.exit(2);
}

// Each capsule: its size; the shot behind it, scaled to cover and then by
// `zoom`, placed by `at` (0 to 1 across the overflow, as background-position
// reads a percentage); how far down the sky band reaches (a fraction of the
// height); and the lockup: the mark above the name ('stack') or beside it
// ('row'), the mark's height and the name's size in pixels, and its top.
const CAPSULES = [
  { id: 'header', file: 'header.jpg', W: 920, H: 430, shot: 'wide', zoom: 1, at: [0.5, 0.45], sky: 0.6,
    lockup: 'stack', mark: 56, name: 70, top: 20, gap: 8 },
  { id: 'small', file: 'small.png', W: 462, H: 174, shot: 'wide', zoom: 1, at: [0.5, 1], sky: 1, skyDeep: true,
    lockup: 'row', mark: 56, name: 56, top: 'middle', gap: 14 },
  { id: 'main', file: 'main.jpg', W: 1232, H: 706, shot: 'wide', zoom: 1, at: [0.5, 1], sky: 0.6,
    lockup: 'stack', mark: 84, name: 100, top: 40, gap: 12 },
  { id: 'vertical', file: 'vertical.jpg', W: 748, H: 896, shot: 'tall', zoom: 1, at: [0.5, 1], sky: 0.55,
    lockup: 'stack', mark: 92, name: 92, top: 56, gap: 14 },
  { id: 'library', file: 'library.jpg', W: 600, H: 900, shot: 'tall', zoom: 1, at: [0.5, 1], sky: 0.55,
    lockup: 'stack', mark: 84, name: 74, top: 64, gap: 12 },
  { id: 'library-hero', file: 'library-hero.jpg', W: 3840, H: 1240, shot: 'hero', zoom: 1, at: [0.5, 1], sky: 0.34,
    lockup: null },
  { id: 'library-logo', file: 'library-logo.png', W: 1280, H: 720, shot: null,
    lockup: 'stack', mark: 260, name: 168, top: 'middle', gap: 34 },
];

const images = {};
for (const [k, p] of Object.entries(shots)) {
  if (!p) continue;
  images[k] = { data: readFileSync(resolve(p)).toString('base64'), ...imageSize(resolve(p)) };
}

function page(c) {
  let photo = '';
  if (c.shot) {
    const img = images[c.shot];
    const s = Math.max(c.W / img.width, c.H / img.height) * c.zoom;
    const [bw, bh] = [img.width * s, img.height * s];
    const [x, y] = [(c.W - bw) * c.at[0], (c.H - bh) * c.at[1]];
    photo = `<div class="photo" style="background: url(data:image/jpeg;base64,${img.data}) ${x}px ${y}px / ${bw}px ${bh}px no-repeat; ${photoFilter(vivid)}"></div>`;
  }
  // The small capsule's band runs deeper: the sky's top two stops held
  // longer, so the whole name sits on blue and the campus shows below it.
  const stops = c.skyDeep ? skyStops(vivid).replace(/45%/, '62%').replace(/75%/, '86%') : skyStops(vivid);
  const sky = c.shot ? `<div class="sky" style="height: ${Math.round(c.H * c.sky)}px; background: linear-gradient(180deg, ${stops});"></div>` : '';
  const shadow = c.shot ? '0 2px 14px rgba(10, 50, 110, 0.28)' : '0 3px 18px rgba(10, 40, 90, 0.35)';
  const head = !c.lockup ? '' : `<div class="head ${c.lockup}">${logoMark('mark')}<h1 class="name">UniSchool</h1></div>`;
  const top = c.top === 'middle' ? 'top: 50%; transform: translateY(-50%);' : `top: ${c.top}px;`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${archivoFace()}
html, body { margin: 0; width: ${c.W}px; height: ${c.H}px; overflow: hidden; background: transparent; }
.cover { position: relative; width: ${c.W}px; height: ${c.H}px; overflow: hidden; }
.photo { position: absolute; inset: 0; }
.sky { position: absolute; inset: 0 0 auto 0; }
.head { position: absolute; left: 0; right: 0; ${top} display: flex; align-items: center; justify-content: center; gap: ${c.gap}px;
  color: #fff; text-shadow: ${shadow}; }
.head.stack { flex-direction: column; }
.mark { height: ${c.mark}px; width: auto; display: block; filter: drop-shadow(${shadow}); }
.name { margin: 0; font-family: 'Archivo', sans-serif; font-weight: 800; font-size: ${c.name}px; line-height: 1;
  letter-spacing: 0.04em; text-transform: uppercase; }
/* Archivo's capitals sit high in their line box; a row lockup centres them on the mark. */
.head.row .name { padding-top: ${c.lockup === 'row' ? Math.round(c.name * 0.06) : 0}px; }
</style></head><body><div class="cover">${photo}${sky}${head}</div></body></html>`;
}

const todo = CAPSULES.filter((c) => (!only || only.includes(c.id)) && (!c.shot || images[c.shot]));
for (const c of CAPSULES) if (c.shot && !images[c.shot] && (!only || only.includes(c.id))) console.log(`skipped ${c.file}: no --${c.shot} shot`);
mkdirSync(outDir, { recursive: true });
await drawPages(todo.map((c) => ({
  html: page(c), width: c.W, height: c.H, scale: 1, out: join(outDir, c.file), selector: '.cover',
  type: c.file.endsWith('.png') ? 'png' : 'jpeg', quality: 92, omitBackground: !c.shot,
})));

// Steam refuses a capsule of the wrong size; so does this.
let wrong = 0;
for (const c of todo) {
  const { width, height } = imageSize(join(outDir, c.file));
  const ok = width === c.W && height === c.H;
  if (!ok) wrong++;
  console.log(`${ok ? 'wrote' : 'WRONG SIZE'} ${join(outDir, c.file)}: ${width} by ${height}${ok ? '' : ` (wants ${c.W} by ${c.H})`}`);
}
if (wrong) process.exit(1);
