// ---------------------------------------------------------------------
// THE COVER SCENE: Founders Hall at the head of its lawn, seen from in
// front and low, as a cover is drawn rather than as the map shows it.
// Every piece that stands is the game's own art (BuildingMotif, TreeAt,
// BannerLamp, Bench, Flowerbed, the walkers' figure), drawn at a camera
// the map never uses: nearly straight at the hall's front, a degree and a
// half up, at eye level (isoProjection's setArtCamera, below the map's
// lowest pitch). The map's camera is parallel, which squeezes a lawn seen
// this low into a strip, so each piece is then placed by a perspective
// camera standing on the lawn: moved to where its foot falls in
// perspective and scaled by its distance. The lawn and its walks are flat
// shapes in the map's grass and path colours, drawn in that perspective.
//
//   npm run cover:scene -- node_modules/.tmp/scene.svg
//   node tools/itchScene.mjs node_modules/.tmp/scene.svg ../docs/store/itch/cover.jpg
//   npm run cover:scene -- scene-wide.svg --ratio=1.7778 --hall=0.32 --cam=20   # 16:9
//
// itchScene.mjs sets the scene under the title art's sky with the mark and
// the name.
// ---------------------------------------------------------------------
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import BuildingMotif, { drawnHeightOf, materialOf } from '../src/components/buildingMotifs';
import { TreeAt } from '../src/components/trees';
import { BannerLamp, Bench, Flowerbed } from '../src/components/dressing';
import { castShadow } from '../src/components/light';
import { polyPoints, project, setArtCamera, type Pt } from '../src/components/isoProjection';
import { ColorsContext, CollegeNameContext } from '../src/components/mapOccasions';
import { initialTech, FOUNDERS_HALL_ID } from '../src/data/techData';
import { orientedFootprint } from '../src/state/campusMap';
import type { SchoolColors } from '../src/state/types';
import type { Species } from '../src/data/treeData';

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--')) ?? 'node_modules/.tmp/scene.svg';
const flag = (name: string, dflt: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? dflt;
setArtCamera({ azimuth: (Number(flag('azimuth', '7')) * Math.PI) / 180, pitch: (Number(flag('pitch', '1.5')) * Math.PI) / 180 });

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = HERE.includes('node_modules') ? join(HERE, '..', '..') : join(HERE, '..');
const NAVY_GOLD: SchoolColors = { primary: '#1b2a4a', secondary: '#d4a017' };
const RATIO = Number(flag('ratio', String(1260 / 1000)));

// --- the hall --------------------------------------------------------
// Its front on +row, centred on col 0, its steps at row 0.
const hall = initialTech().find((t) => t.id === FOUNDERS_HALL_ID)!;
const fp = orientedFootprint(hall, 0);
const INSET = 0.06;
const H = { col: -fp.w / 2 + INSET, row: -fp.h + INSET, w: fp.w - INSET * 2, h: fp.h - INSET * 2, facing: 0 as const };

// --- the perspective camera -------------------------------------------
// It stands CAM tiles out on the lawn, its eye EYE screen units above the
// ground at the hall's front. A point `r` rows toward it is CAM / (CAM - r)
// times as big as the hall's front, and its foot that much further below
// the horizon.
const A = project(0, 0);
const UX = project(1, 0).x - A.x;
const CAM = Number(flag('cam', '26'));
const hallW = Math.abs(project(H.col + H.w, 0).x - project(H.col, 0).x);
// The hall a little over a third of the picture's width, its steps three
// quarters of the way down, so the name has the sky above its cupola.
const sceneW = hallW / Number(flag('hall', '0.44'));
const sceneH = sceneW / RATIO;
const BASE = Number(flag('base', '0.82'));
// The eye stands EYE of the picture's height above the hall's steps: the
// horizon, which the hall and the near trees hide.
const kOf = (r: number) => CAM / (CAM - r);
const EYE = sceneH * Number(flag('eye', '0.16'));
const horizon = A.y - EYE;
// The camera stands OFF tiles to the side of the walk and turns back onto
// the hall, so the hall keeps the middle and the walk runs off toward a
// corner (a pan, standing in for the turn).
const OFF = Number(flag('off', '2.2'));
const at = (c: number, r: number): Pt => ({ x: A.x + UX * ((c - OFF) * kOf(r) + OFF), y: horizon + EYE * kOf(r) });
// A piece of the game's art, drawn about its own map point `from`, set at
// (c, r) in perspective, `extra` times its distance's size.
const place = (c: number, r: number, from: Pt, node: React.JSX.Element, key: string, extra = 1) => {
  const p = at(c, r); const k = kOf(r) * extra;
  return <g key={key} transform={`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${k.toFixed(4)}) translate(${(-from.x).toFixed(2)} ${(-from.y).toFixed(2)})`}>{node}</g>;
};

// --- the lawn and its walks ------------------------------------------
type Quad = [number, number][];
const strip = (c0: number, c1: number, r0: number, r1: number): Quad => [[c0, r0], [c1, r0], [c1, r1], [c0, r1]];
const walks: Quad[] = [
  strip(-1, 1, 0, CAM - 0.4),             // from the steps to the camera
  strip(-9, 9, 0.1, 1.2),                 // along the hall's front
  strip(-80, 80, 9, 10.2),                // the cross walk
  [[1, 9.6], [2.6, 9.6], [24, 21], [21.6, 21]],    // two walks off it to the lawn's corners
  [[-1, 9.6], [-2.6, 9.6], [-24, 21], [-21.6, 21]],
];
const quadPts = (q: Quad) => polyPoints(q.map(([c, r]) => at(c, Math.min(r, CAM - 0.4))));

// --- the grounds -----------------------------------------------------
// Few trees: the near ones that frame the picture and, with the hall, hide
// the horizon, and one further back. Each is set by where it stands across
// the picture (-1 the left edge, 1 the right) and how far out on the lawn,
// so a wider frame moves them out with its edges.
interface TreeSpot { c: number; r: number; s: Species; k: number; g?: number }
const across = (x: number, r: number) => ((x * sceneW) / 2 / UX - OFF) / kOf(r) + OFF;
// `--trees=N` grows them all. A 16:9 frame has too much horizon for three
// to hide at a size that leaves the name clear, so it has two a side.
const TG = Number(flag('trees', '1'));
const WIDE = RATIO > 1.5;
const spots: [number, number, number][] = WIDE
  ? [[-0.45, 2.5, 1], [-0.8, 10, 1.05], [0.5, 3, 1], [0.84, 9, 1.05]]
  : [[-0.63, 2.5, 1.1], [-1.05, 11, 1.2], [0.87, 9, 1.25]];
const trees: TreeSpot[] = spots.map(([x, r, g]) => ({ c: across(x, r), r, s: 'canopy', k: 2.85, g: g * TG }));
const lamps = [3, 8, 13].flatMap((r) => [[-1.5, r], [1.5, r]] as const);
const beds: [number, number][] = [];
for (let c = -7; c <= 6; c++) if (c < -2 || c > 1) beds.push([2, c]);
const benches: [number, number][] = [[-4.5, 8.4], [3.5, 8.4]];

// The walkers' figure (Walkers.tsx's shapes), standing or mid-stride, at a
// size: one opening-view figure is 16 units tall.
function figure(shirt: string, trousers: string, stride: number) {
  const half = 3.1; const HIP = 3.8; const reach = stride * 1.9;
  return (
    <g>
      <ellipse className="walker-shadow" rx={4.2} ry={1.3} />
      <path className="walker-leg" stroke={trousers} d={`M-1.25,${-HIP - 0.4}L${-1.25 + reach},0M1.25,${-HIP - 0.4}L${1.25 - reach},0`} />
      <path className="walker-body" fill={shirt} d={`M${-half},${-HIP} L${-half},-8.5 Q0,-11 ${half},-8.5 L${half},${-HIP} Z`} />
      <circle className="walker-head" cy={-12.6} r={3} />
    </g>
  );
}
const people: [number, number, string, string, number][] = [
  [-0.3, 1.6, '#9a3b32', '#3b3b46', 0], [0.5, 6, '#2f4f7a', '#2a3550', 0.5],
  [5.5, 9.6, '#e3c26b', '#2a3550', 0.6], [-6, 9.7, '#4f7a4a', '#3b3b46', -0.5],
  [2.6, 13.2, '#3c5f8f', '#25304a', 0.7],
  // Two on the near lawn, standing together.
  [-2.9, 15.2, '#2e4a75', '#2a3550', 0], [-2.3, 15.3, '#efe6d2', '#3a4a6a', 0],
];
const PERSON = Number(flag('person', '1.7'));

// Far to near: everything that stands, by row.
const lift = drawnHeightOf(hall, false, 'georgian');
type Item = { r: number; node: React.JSX.Element };
const items: Item[] = [
  { r: H.row + H.h, node: (
    <g key="hall">
      <polygon className="campus-building-shadow" points={polyPoints(castShadow(H.col, H.row, H.w, H.h, lift))} />
      <BuildingMotif t={hall} p={H} material={materialOf(hall, 'georgian')} vernacular="georgian" developing={false} />
    </g>
  ) },
  ...trees.map((t, i) => ({ r: t.r, node: place(t.c, t.r, project(t.c, t.r), <TreeAt col={t.c} row={t.r} species={t.s} scale={t.k} shadow />, `t${i}`, t.g ?? 1) })),
  ...lamps.map(([c, r], i) => ({ r, node: place(c, r, project(c, r), <BannerLamp at={project(c, r)} colors={NAVY_GOLD} />, `l${i}`, 1.1) })),
  ...beds.map(([r, c], i) => ({ r, node: place(c + 0.5, r + 0.5, project(c + 0.5, r + 0.5), (
    <Flowerbed col={c} row={r} open={[true, !beds.some(([rr, cc]) => rr === r && cc === c + 1), true, !beds.some(([rr, cc]) => rr === r && cc === c - 1)]} />
  ), `b${i}`) })),
  ...benches.map(([c, r], i) => ({ r, node: place(c, r, project(c, r), <Bench col={c - 0.5} row={r - 0.5} facing="s" />, `bn${i}`, 1.6) })),
  ...people.map(([c, r, shirt, legs, stride], i) => ({ r, node: place(c, r, { x: 0, y: 0 }, figure(shirt, legs, stride), `p${i}`, PERSON) })),
].sort((a, b) => a.r - b.r);

// The frame: the hall centred, its steps BASE of the way down.
const vx = A.x - sceneW / 2;
const vy = A.y - sceneH * BASE;
const svg = (
  <ColorsContext.Provider value={NAVY_GOLD}>
    <CollegeNameContext.Provider value="Halifax">
      <svg className="campus-map-svg" xmlns="http://www.w3.org/2000/svg" viewBox={`${vx.toFixed(1)} ${vy.toFixed(1)} ${sceneW.toFixed(1)} ${sceneH.toFixed(1)}`} preserveAspectRatio="xMidYMax slice">
        <rect className="campus-ground" x={vx} y={horizon} width={sceneW} height={vy + sceneH - horizon + 1} />
        <g className="cover-walks">
          {walks.map((q, i) => <polygon key={`k${i}`} points={quadPts(q)} fill="none" stroke="#a89566" strokeWidth={4} strokeLinejoin="round" />)}
          {walks.map((q, i) => <polygon key={`f${i}`} className="campus-path-fill" points={quadPts(q)} />)}
        </g>
        {items.map((it) => it.node)}
      </svg>
    </CollegeNameContext.Provider>
  </ColorsContext.Provider>
);

// The stylesheet the map draws with, so every class is the map's own.
const css = readFileSync(join(ROOT, 'src', 'styles.css'), 'utf8').split('\n').filter((l) => !l.includes('@import')).join('\n');
writeFileSync(out, renderToStaticMarkup(svg));
writeFileSync(`${out}.css`, css);
console.log(`wrote ${out} (and its stylesheet, ${out}.css)`);
