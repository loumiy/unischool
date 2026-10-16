import type { Species } from '../data/treeData';
import type { SchoolColors } from '../state/types';
import { pavingValue, type PathSurface } from '../state/paving';
import { FittedDrawing } from './BuildThumb';
import { BannerLamp, Bench, Flowerbed, lampArt } from './dressing';
import { boxFaces, polyPoints, project } from './isoProjection';
import { buildPathGeometry, pathwayArt } from './pathways';
import { TreeAt } from './trees';

// The Grounds tab's tiles show the decoration itself, as the building tiles
// show the building (BuildThumb.tsx): a tile of each path surface, each
// tree, lamp, bench and flower bed, drawn by the map's own art on a tile of
// grass at the default camera, made once and kept.
export type Decor =
  | { kind: 'path'; surface: PathSurface }
  // `null`: whatever grows, drawn as a little grove of the woodland's three.
  | { kind: 'tree'; species: Species | null }
  | { kind: 'lamp' }
  | { kind: 'bannerLamp'; colors: SchoolColors }
  | { kind: 'bench' }
  | { kind: 'flowerbed' };

// What a drawing depends on, so each is kept under its own key.
export function decorKey(d: Decor): string {
  switch (d.kind) {
    case 'path': return `decor|path|${d.surface}`;
    case 'tree': return `decor|tree|${d.species ?? 'any'}`;
    case 'bannerLamp': return `decor|bannerLamp|${d.colors.primary}|${d.colors.secondary}`;
    default: return `decor|${d.kind}`;
  }
}

// The whatever-grows grove: back to front, so the nearer trees overlap.
const GROVE: readonly { species: Species; u: number; v: number; scale: number }[] = [
  { species: 'conifer', u: 0.3, v: 0.2, scale: 0.72 },
  { species: 'canopy', u: 0.78, v: 0.4, scale: 0.66 },
  { species: 'ornamental', u: 0.35, v: 0.72, scale: 0.7 },
];

function Grass({ w = 1 }: { w?: number }) {
  return <polygon className="campus-ground" points={polyPoints(boxFaces(0, 0, w, 1, 0, 0).top)} />;
}

function DecorArt({ d }: { d: Decor }) {
  switch (d.kind) {
    case 'path':
      return <><Grass />{pathwayArt(buildPathGeometry({ '0,0': pavingValue(d.surface) }))}</>;
    case 'tree':
      return (
        <>
          <Grass />
          {d.species
            ? <TreeAt col={0.5} row={0.5} species={d.species} scale={0.9} shadow />
            : GROVE.map((t) => <TreeAt key={t.species} col={t.u} row={t.v} species={t.species} scale={t.scale} shadow />)}
        </>
      );
    case 'lamp':
      return <><Grass />{lampArt({ at: project(0.5, 0.5) }, null)}</>;
    case 'bannerLamp':
      return <><Grass /><BannerLamp at={project(0.5, 0.5)} colors={d.colors} /></>;
    case 'bench':
      return <><Grass /><Bench col={0} row={0} facing="s" /></>;
    case 'flowerbed':
      // Two beds, run together as one border.
      return (
        <>
          <Grass w={2} />
          <Flowerbed col={0} row={0} open={[true, false, true, true]} />
          <Flowerbed col={1} row={0} open={[true, true, true, false]} />
        </>
      );
  }
}

// The drawing as an element, for whichever camera is current. Pure, so the
// tests render every kind through it (test/campus-decoration.test.ts).
export function DecorDrawing({ d }: { d: Decor }) {
  return (
    <svg className="campus-map-svg" xmlns="http://www.w3.org/2000/svg">
      <g><DecorArt d={d} /></g>
    </svg>
  );
}

// Fitted to no less than one tile's width, so a lamp and a bench stand at
// the size they stand on the map beside a tree.
const DECOR_BOX = 64;

export default function DecorThumb({ d }: { d: Decor }) {
  return <FittedDrawing drawKey={decorKey(d)} node={() => <DecorDrawing d={d} />} minBox={DECOR_BOX} />;
}
