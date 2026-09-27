// ---------------------------------------------------------------------
// THE ASSET GALLERY (Plan 75C): every buildable asset in every vernacular,
// as images saved to the repository, vernaculars in rows and assets in
// columns, one image per group of forms, and an index page listing them.
// Covers every placeable, a chapter house, each school's signature hall,
// each venue at each of its expansions and one of each form under
// construction (tools/sheet.tsx's --every set).
//
//   npm run gallery:assets                        # writes ../docs/assets/
//   npm run gallery:assets -- --out /tmp/gallery  # somewhere else
//   npm run gallery:assets -- --azimuth 225       # from behind
//
// Renders the contact sheets through the game's own drawing (npm run
// sheet), photographs each cell's drawing with playwright-core in any
// installed Chromium (CHROME_PATH or PLAYWRIGHT_BROWSERS_PATH), and lays
// the cells out. Not part of the game; nothing in src/ imports it.
// ---------------------------------------------------------------------
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i < 0) return fallback;
  const eq = argv[i].indexOf('=');
  return eq >= 0 ? argv[i].slice(eq + 1) : (argv[i + 1] ?? fallback);
};
const OUT = resolve(flag('out', '../docs/assets'));
const AZIMUTH = flag('azimuth', '45');
const VERNACULARS = ['georgian', 'gothic', 'classical', 'mission', 'modern'];
const VERNACULAR_NAMES = { georgian: 'Georgian', gothic: 'Collegiate Gothic', classical: 'Classical', mission: 'Mission', modern: 'Modern' };
const COLUMNS = 6;
const CELL_W = 300;
const CELL_H = 210;
const SHEETS = resolve('node_modules/.tmp/gallery-sheets');

// The groups the images are cut into, in the order the index lists them:
// a form (buildingSpec.ts's Motif) and what it covers.
const GROUPS = [
  ['hall', 'Academic halls and the school signature halls'],
  ['portico', 'Civic porticos: library, gallery, museum, the professional schools'],
  ['pavilion', 'Pavilions: dining, the student center, the grocery, the chapel, chapter houses'],
  ['residential', 'Residence halls'],
  ['village', 'Residential villages'],
  ['tower', 'Residential towers'],
  ['block', 'Blocks: labs, clinics, the Medical Center'],
  ['works', 'Works: laboratories with plant'],
  ['hangar', 'Clear-span sheds: gyms, arenas, the natatorium, test halls, the studio'],
  ['bowl', 'The stadium at each stage'],
  ['grounds', 'Open ground: fields, courts, quads, gardens, amenities'],
  ['landmark', 'The grand landmarks and the bell tower'],
  ['construction', 'One of each form under construction'],
];

const CANDIDATES = [
  process.env.CHROME_PATH,
  `${process.env.PLAYWRIGHT_BROWSERS_PATH ?? ''}/chromium-1194/chrome-linux/chrome`,
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].filter(Boolean);
const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error(`no Chromium found. Tried:\n  ${CANDIDATES.join('\n  ')}\nSet CHROME_PATH.`);
  process.exit(2);
}

// 1. The contact sheets, one per vernacular, through the game's drawing.
rmSync(SHEETS, { recursive: true, force: true });
execSync(`npm run -s sheet -- --every --scale 1.4 --azimuth ${AZIMUTH} --out ${SHEETS}`, { stdio: 'inherit' });

// 2. Each cell's drawing, by asset and vernacular.
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1800, height: 1000 }, deviceScaleFactor: 1 });
const assets = new Map(); // key -> { key, label, name, size, group, images: { vernacular: base64 } }
for (const v of VERNACULARS) {
  const file = readdirSync(SHEETS).find((f) => f.startsWith(`sheet-${v}-`));
  await page.goto(`file://${join(SHEETS, file)}`);
  await page.waitForTimeout(300);
  for (const cell of await page.locator('.cell').all()) {
    const id = await cell.getAttribute('id');
    const cap = (await cell.locator('.cap').textContent()) ?? '';
    const [label, name, size] = cap.split(' · ');
    const key = id.slice(v.length + 1);
    const motif = label.split(':')[0].trim();
    const group = label.includes('under construction') ? 'construction' : motif;
    const png = await cell.locator('svg').screenshot();
    if (!assets.has(key)) assets.set(key, { key, label, name, size, group, images: {} });
    assets.get(key).images[v] = png.toString('base64');
  }
}

// 3. One image per group, cut into pages of COLUMNS assets.
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith('.jpg')) rmSync(join(OUT, f));
const index = [];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const headline = (a) => {
  // The asset's own name, and what state of it this is when it is not the
  // catalogue entry itself (a signature, an expansion, a site).
  const what = a.label.split(':').slice(1).join(':').trim();
  const id = a.key.replace(/-(sig-.*|x\d|dev|rot)$/, '');
  if (/-sig-/.test(a.key)) return { title: what, sub: `a hall given over to one school · ${a.size}` };
  return { title: a.name, sub: what === id ? `${id} · ${a.size}` : `${what} · ${a.size}` };
};
for (const [group, blurb] of GROUPS) {
  const list = [...assets.values()].filter((a) => a.group === group);
  // As few images as COLUMNS allows, split evenly (seven go four and three,
  // not six and one).
  const pages = Math.ceil(list.length / COLUMNS);
  const per = Math.ceil(list.length / Math.max(1, pages));
  for (let n = 0; n < pages; n++) {
    const chunk = list.slice(n * per, (n + 1) * per);
    const head = `<div></div>${chunk.map((a) => { const h = headline(a); return `<div class="h"><b>${esc(h.title)}</b><br><span>${esc(h.sub)}</span></div>`; }).join('')}`;
    const rows = VERNACULARS.map((v) => `<div class="v">${VERNACULAR_NAMES[v]}</div>${chunk.map((a) => (a.images[v]
      ? `<div class="c"><img src="data:image/png;base64,${a.images[v]}"></div>`
      : '<div class="c"></div>')).join('')}`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      body{margin:0;background:#f3efe4;font:13px/1.3 sans-serif;color:#222}
      .g{display:grid;grid-template-columns:130px repeat(${chunk.length},${CELL_W}px);gap:6px;padding:10px}
      .h{padding:4px 2px 2px}.h span{color:#555;font-size:12px}
      .v{display:flex;align-items:center;font-weight:600}
      .c{width:${CELL_W}px;height:${CELL_H}px;background:#6d8c52;display:flex;align-items:center;justify-content:center;overflow:hidden}
      .c img{max-width:100%;max-height:100%}
      </style></head><body><div class="g">${head}${rows}</div></body></html>`;
    await page.setViewportSize({ width: 150 + chunk.length * (CELL_W + 6), height: 100 });
    await page.setContent(html);
    const file = `${group}${pages > 1 ? `-${n + 1}` : ''}.jpg`;
    await page.screenshot({ path: join(OUT, file), fullPage: true, type: 'jpeg', quality: 85 });
    index.push({ group, blurb, file, assets: chunk.map((a) => headline(a)) });
    console.log(`wrote ${join(OUT, file)} (${chunk.length} assets)`);
  }
}
await browser.close();

// 4. The index page.
const lines = [
  '# The asset gallery',
  '',
  `Every buildable asset in all five vernaculars, drawn by the game itself from the opening camera (azimuth ${AZIMUTH}°). ` +
    'Vernaculars run down each image and assets across it. Written by `npm run gallery:assets` (unischool/tools/assetGallery.mjs, Plan 75C); ' +
    'run it again after any change to how a building is drawn.',
  '',
  `${assets.size} assets in ${index.length} images.`,
  '',
];
let lastGroup = '';
for (const img of index) {
  if (img.group !== lastGroup) {
    lines.push(`## ${img.blurb}`, '');
    lastGroup = img.group;
  }
  lines.push(`![${img.blurb}](${img.file})`, '', img.assets.map((a) => `- **${a.title}**: ${a.sub}`).join('\n'), '');
}
writeFileSync(join(OUT, 'README.md'), lines.join('\n'));
console.log(`wrote ${join(OUT, 'README.md')}`);
