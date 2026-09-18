// ---------------------------------------------------------------------
// A CONTACT SHEET OF EVERY MOTIF. Renders each placeable Buildable on its
// own — through the game's own BuildingMotif, GroundMarking and groundProps,
// via react-dom/server — in one or more vernaculars, and writes one HTML
// page per vernacular with a labelled cell per building. No dev server, no
// save, no scenario: the only way to see every motif at once without
// playing a campus that contains them all.
//
//   npm run sheet                                   # all four vernaculars
//   npm run sheet -- --vernacular gothic --scale 2  # one set, closer
//   npm run sheet -- --only 'hangar|bowl|grounds'   # a regex on the labels
//   npm run sheet:shot -- node_modules/.tmp/sheets/sheet-gothic.html out/ --cells
//
// Cells are drawn at `--scale` screen pixels per world unit (default 1.4,
// about three and a half times the zoom the game opens at) so a canopy or
// a lancet can be judged, and each cell is a real <svg> with the real
// stylesheet, so what the sheet shows is what the map draws. The four
// committed campus renders (docs/images) remain the honest picture of the
// assets TOGETHER; this is for looking at one asset at a time.
//
// Not part of the game: nothing in src/ imports it.
// ---------------------------------------------------------------------
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import BuildingMotif, { ScaffoldPattern, drawnHeightOf, materialOf } from '../src/components/buildingMotifs';
import { groundProps } from '../src/components/groundMarkings';
import { motifOf } from '../src/components/buildingSpec';
import { boxFaces, polyPoints, project } from '../src/components/isoProjection';
import { depthOrder } from '../src/components/depthSort';
import { castShadow } from '../src/components/light';
import { initialTech } from '../src/data/techData';
import { initialDorms } from '../src/data/campusData';
import { initialFacilities } from '../src/data/facilitiesData';
import { footprintOf, isPlaceableKind } from '../src/state/campusMap';
import type { Buildable, Vernacular } from '../src/state/types';

// --- arguments -------------------------------------------------------
const args = process.argv.slice(2);
const flag = (name: string, fallback: string): string => {
  const i = args.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i < 0) return fallback;
  const eq = args[i].indexOf('=');
  return eq >= 0 ? args[i].slice(eq + 1) : (args[i + 1] ?? fallback);
};
const VERNS = flag('vernacular', 'georgian,gothic,classical,mission,modern').split(',') as Vernacular[];
const SCALE = Number(flag('scale', '1.4'));
const ONLY = flag('only', '') ? new RegExp(flag('only', '')) : null;
const OUT = flag('out', 'node_modules/.tmp/sheets');
// CampusMap's own inset (see BUILDING_INSET there), so a cell shows the
// building at the size the map draws it inside its footprint.
const INSET = 0.06;

// The bundle runs from node_modules/.tmp, so the stylesheet is found from
// this file's own location, not the working directory.
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = HERE.includes('node_modules') ? join(HERE, '..', '..') : join(HERE, '..');

const CATALOGUE: Buildable[] = [...initialTech(), ...initialDorms(), ...initialFacilities()].filter(isPlaceableKind);
const byId = (id: string) => CATALOGUE.find((t) => t.id === id);
const byType = (ft: string, pick: (t: Buildable) => boolean = () => true) =>
  CATALOGUE.filter((t) => t.facilityType === ft && pick(t));

interface Sample { label: string; t: Buildable; developing?: boolean; rotated?: boolean; glyphs?: string }

// One of everything, by motif, plus the states worth looking at: a
// rotated footprint, a site, a chapter house wearing letters.
function samples(): Sample[] {
  const halls = CATALOGUE.filter((t) => t.kind === 'building');
  const founders = halls.find((t) => t.id === 'BLDG-GENSTUDIES') ?? halls[0];
  const other = halls.find((t) => t.id !== founders.id) ?? founders;
  const dorms = CATALOGUE.filter((t) => t.kind === 'dorm');
  const dorm = (beds: number) => dorms.find((t) => (t.effects?.capacityBonus ?? 0) === beds);
  const health = byType('healthCenter').sort((a, b) => (a.effects?.servesPopulation ?? 0) - (b.effects?.servesPopulation ?? 0));
  const dining = byType('diningHall').sort((a, b) => (a.effects?.servesPopulation ?? 0) - (b.effects?.servesPopulation ?? 0));
  const libs = byType('library');
  const rec = byType('recCenter').sort((a, b) => (a.effects?.servesPopulation ?? 0) - (b.effects?.servesPopulation ?? 0));
  const quads = byType('quad');
  const chapter: Buildable = {
    id: 'CHAPTER-HOUSE-SAMPLE', kind: 'facility', name: 'Alpha Beta Gamma House', description: '',
    cost: 0, duration: 0, prereqs: [], status: 'done', chapterHouse: true,
  };
  const maybe = (label: string, t: Buildable | undefined, extra: Partial<Sample> = {}): Sample[] => (t ? [{ label, t, ...extra }] : []);
  return [
    ...maybe('hall: Founders Hall (clock tower)', founders),
    ...maybe('hall: academic hall', other),
    ...maybe('hall: rotated', other, { rotated: true }),
    ...maybe('hall: under construction', other, { developing: true }),
    ...maybe('residential: founding hall 350', dorm(350)),
    ...maybe('residential: 500 beds', dorm(500)),
    ...maybe('residential: 1000 beds', dorm(1000)),
    ...maybe('village: 1500 beds', dorm(1500)),
    ...maybe('tower: 5000 beds', dorm(5000)),
    ...maybe('portico: library', libs[0]),
    ...maybe('portico: research library', libs[1]),
    ...maybe('portico: performing arts', byType('performingArtsCenter')[0]),
    ...maybe('portico: art gallery', byType('artGallery')[0]),
    ...maybe('portico: LAB-HIST', byId('LAB-HIST')),
    ...maybe('pavilion: student centre', byType('studentCenter')[0]),
    ...maybe('pavilion: dining smallest', dining[0]),
    ...maybe('pavilion: dining largest', dining[dining.length - 1]),
    ...maybe('pavilion: health tier 1', health[0]),
    ...maybe('pavilion: clinic', health[1]),
    ...maybe('pavilion: grocery', byType('grocery')[0]),
    ...maybe('pavilion: chapter house', chapter, { glyphs: 'ΑΒΓ' }),
    ...maybe('pavilion: LAB-ECON', byId('LAB-ECON')),
    ...maybe('block: hospital', health[2]),
    ...maybe('block: LAB-COMP', byId('LAB-COMP')),
    ...maybe('works: lab', byType('lab', (t) => !['LAB-HIST', 'LAB-FILM', 'LAB-COMP', 'LAB-ECON'].includes(t.id))[0]),
    ...maybe('hangar: rec centre', rec[0]),
    ...maybe('hangar: gym', byType('gym')[0]),
    ...maybe('hangar: athletics complex', rec[rec.length - 1]),
    ...maybe('hangar: arena', byType('athleticsArena')[0]),
    ...maybe('hangar: natatorium', byType('athleticsNatatorium')[0]),
    ...maybe('hangar: LAB-FILM', byId('LAB-FILM')),
    ...maybe('grounds: quad tier 1', quads.find((t) => (t.tier ?? 1) < 2)),
    ...maybe('grounds: quad tier 2', quads.find((t) => (t.tier ?? 1) >= 2)),
    ...maybe('grounds: tennis courts', byType('tennisCourts')[0]),
    ...maybe('grounds: pool', byType('pool')[0]),
    ...maybe('grounds: multi-sport field', byType('athleticsField')[0]),
    ...maybe('grounds: field rotated', byType('athleticsField')[0], { rotated: true }),
    ...maybe('grounds: diamond', byType('athleticsDiamond')[0]),
    ...maybe('grounds: site under construction', byType('tennisCourts')[0], { developing: true }),
    ...maybe('bowl: football stadium', byType('footballStadium')[0]),
    ...maybe('bowl: stadium under construction', byType('footballStadium')[0], { developing: true }),
  ];
}

// One cell: the building on a plate of grass with the tile grid showing,
// its cast shadow, its motif, and (for open ground) its raised props in
// the map's own depth order.
function cell(sample: Sample, v: Vernacular) {
  const { t } = sample;
  const fp0 = footprintOf(t);
  const fp = sample.rotated ? { w: fp0.h, h: fp0.w } : fp0;
  const d = { col: INSET, row: INSET, w: fp.w - INSET * 2, h: fp.h - INSET * 2 };
  const M = 2;
  const plate = boxFaces(-M, -M, fp.w + 2 * M, fp.h + 2 * M, 0, 0).top;
  const xs = plate.map((q) => q.x); const ys = plate.map((q) => q.y);
  const developing = !!sample.developing;
  const grounds = motifOf(t) === 'grounds';
  const lift = drawnHeightOf(t, developing, v);
  const headroom = grounds ? 40 : lift + 150;
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys) - headroom; const maxY = Math.max(...ys);
  const W = (maxX - minX) * SCALE; const H = (maxY - minY) * SCALE;
  const grid: string[] = [];
  for (let c = -M; c <= fp.w + M; c++) grid.push(`M${project(c, -M).x},${project(c, -M).y}L${project(c, fp.h + M).x},${project(c, fp.h + M).y}`);
  for (let r = -M; r <= fp.h + M; r++) grid.push(`M${project(-M, r).x},${project(-M, r).y}L${project(fp.w + M, r).x},${project(fp.w + M, r).y}`);
  const props = grounds ? depthOrder(groundProps(t.facilityType, d.col, d.row, d.w, d.h, t.tier, developing)) : [];
  const svg = (
    <svg className="campus-map-svg" width={W} height={H} viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} xmlns="http://www.w3.org/2000/svg">
      <defs><ScaffoldPattern /></defs>
      <polygon className="campus-ground" points={polyPoints(plate)} />
      <path className="campus-grid" d={grid.join('')} style={{ stroke: 'rgba(42,56,28,0.12)' }} />
      {!grounds && lift > 0 && (
        <polygon className="campus-building-shadow" points={polyPoints(castShadow(d.col, d.row, d.w, d.h, lift))} />
      )}
      <BuildingMotif t={t} p={d} material={materialOf(t, v)} vernacular={v} developing={developing} glyphs={sample.glyphs} />
      {props.map((pr) => <g key={pr.key}>{pr.node}</g>)}
    </svg>
  );
  const id = `${v}-${t.id}${sample.rotated ? '-rot' : ''}${sample.developing ? '-dev' : ''}`;
  return `<div class="cell" id="${id}"><div class="cap">${sample.label} · ${t.name} · ${fp.w}x${fp.h} · ${v}</div>${renderToStaticMarkup(svg)}</div>`;
}

const css = readFileSync(join(ROOT, 'src', 'styles.css'), 'utf8')
  .split('\n').filter((l) => !l.includes('@import')).join('\n');
mkdirSync(OUT, { recursive: true });
const all = samples();
for (const v of VERNS) {
  const cells = all.filter((s) => !ONLY || ONLY.test(s.label) || ONLY.test(s.t.id)).map((s) => cell(s, v));
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>UniSchool motifs · ${v}</title><style>${css}
  body{background:#e8e2d0;margin:0;padding:12px;font-family:sans-serif}
  .cell{display:inline-block;vertical-align:top;margin:8px;background:#6d8c52;border:1px solid #333;padding:4px}
  .cap{font:12px/1.3 sans-serif;color:#111;background:#fff;padding:2px 4px;margin-bottom:3px}
  svg{display:block}</style></head><body>${cells.join('\n')}</body></html>`;
  const path = join(OUT, `sheet-${v}.html`);
  writeFileSync(path, html);
  console.log(`wrote ${path} (${cells.length} cells)`);
}
