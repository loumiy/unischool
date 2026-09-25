import { memo, useContext } from 'react';
import type { Buildable, Vernacular } from '../state/types';
import { TILE_W, boxFaces, facePoint, lift, polyPoints, project, projectedCircle, heightScale, visibleWalls, wallOf, type BoxFaces, type Camera, type FaceDir, type Pt } from './isoProjection';
import { depthOrder, occludes, type DepthBox } from './depthSort';
import { WALL_LIGHT, faceTone, shadowOffset } from './light';
import { METRES_PER_TILE, STOREY, across, up } from './campusScale';
import Landmark from './landmarks';
import { ColorsContext } from './mapOccasions';
import {
  labFeatureOf, type LabFeature,
  BASE_COURSE, BAY_METRES, BLOCK_SPLIT_MIN_TILES, CANOPY_DEPTH, CROSS_ARM_METRES,
  CROSS_BAR_METRES, CANOPY_POST, CANOPY_SLAB, CLOCK_RADIUS,
  CLOCK_RADIUS_TILES, COLONNADE_BAY_METRES, COLONNADE_HEIGHT, COLONNADE_MAX, CORNICE,
  EAVES_COURSE, ENTABLATURE, PIER_PROJECTION, PIER_WIDTH_METRES,
  PORTICO_COLUMNS, SLAB_ROW_FRACTION, UNDERCROFT_STOREYS, WING_COL_FRACTION,
  WING_STOREY_FRACTION,
  PORTICO_COLUMN_PLAN, PORTICO_HEIGHT, PORTICO_STANDOFF, END_PAVILION_PLAN, END_PAVILION_RISE, FLOOR_COURSE,
  PORCH_GABLE_RISE, PORCH_ARCH_WIDTH, PORCH_ARCH_HEIGHT, PORCH_HEIGHT_FRACTION,
  RECESS_WIDTH, RECESS_DEPTH, RECESS_OVERHANG, CORE_PLAN, CORE_RISE, CORE_CAP_RISE,
  BUTTRESS_PLAN, BUTTRESS_SETOFF_FRACTION, BUTTRESS_SETOFF_DEPTH,
  COPING, COPING_OVERHANG, END_PAVILION_DEPTH, PAVILION_BAYS, PAVILION_DEPTH, PAVILION_RISE, PEDIMENT_RISE, PLINTH, STEP_OVERHANG,
  TOWER_BASE_PLAN, TOWER_BASE_RISE, TOWER_DOME_RISE, TOWER_DRUM_PLAN, TOWER_DRUM_RISE,
  TOWER_FINIAL_RISE, TOWER_PODIUM_STOREYS, TREAD_DEPTH, WINDOW_HEIGHT,
  TOWER_BELFRY_PLAN, TOWER_BELFRY_RISE, TOWER_SPIRE_RISE,
  TOWER_PINNACLE_PLAN, TOWER_PINNACLE_RISE,
  baysAcross, clerestorySill, doorDimensions, doorOf, floorLinesOf, floorsUnderConstruction, hasClockTower, motifOf,
  rankSills, ridgeOf, parapetOf, eavesOf, stoneFor, paneShapeOf, windowOutline,
  entrancePartOf, rooflineEndPartOf, apexPartOf, partsFor, type ApexPart, massingOf,
  STACK_LOWER_TOP, STACK_UPPER_INSET, STACK_UPPER_OVERHANG,
  ARCADE_HEIGHT, ARCADE_DEPTH, ARCADE_PIER, ARCADE_BAY_METRES, ARCADE_MAX,
  CAMPANILE_PLAN, CAMPANILE_RISE, CAMPANILE_BELFRY_RISE, CAMPANILE_CAP_RISE,
  hasTrim, hasGilt,
  storeysOf, wallHeightOf, wallShadeOf, windowRanksOf,
  windowWidthOf,
  type DoorDimensions, type EntrancePart, type Material, type StonePalette, type WindowShape,
} from './buildingSpec';
import GroundMarking, { GroundSite, RakedStand, StadiumField, type TilePt } from './groundMarkings';
import { shade } from './tint';
import { Crane, Scaffolding } from './siteWorks';
import { TreeAt } from './trees';

// Architectural motifs: what makes a placed Buildable read as a building.
// Hand-rolled inline SVG, no icon library or external art. Geometry here,
// color in styles.css, except roof and wall tones, which are derived from
// each building's tint at runtime (see paletteFrom). buildingSpec.ts
// derives height, ridge, window ranks and bays.

// The label sits mid-mass (walls plus half the ridge), not at the apex.
export function labelHeightOf(t: Buildable, v: Vernacular): number {
  return wallHeightOf(t) + ridgeOf(t, v) * 0.5;
}

// The height the mass is drawn at now, shared with the cast shadow. A new
// site under development is a low frame; a building being extended keeps
// the floors it already has (it stays open, see types.ts's
// servingPopulation) and the scaffold rises off its roof.
export function drawnHeightOf(t: Buildable, developing: boolean, v: Vernacular): number {
  if (motifOf(t) === 'grounds') return 0;
  const full = wallHeightOf(t);
  if (!developing) return full + ridgeOf(t, v);
  const inFlight = floorsUnderConstruction(t);
  // Nothing built yet: a frame barely off the ground.
  if (inFlight === 0) return Math.max(4, full * 0.16);
  const standing = full - inFlight * STOREY;
  return standing > 0 ? standing : Math.max(4, full * 0.16);
}


// Roof and wall faces are keyed by the grid direction they point, not by a
// lit/shade role, so they stay correct for either ridge orientation and any
// camera rotation.
export interface Palette {
  roof: string; roofDeck: string;
  negCol: string; negRow: string; posRow: string; posCol: string;
  // Wall tone by grid direction.
  wall: Record<FaceDir, string>;
  // Tones for the currently visible left and right walls (paletteFrom runs
  // per render, so these follow the camera).
  wallLeft: string; wallRight: string;
}

// Sloped-face brightness by the direction its normal points. The sun is
// fixed to the world (light.ts), mostly from -col, a little from -row:
// -col brightest, then -row, +row, +col darkest. Getting this order wrong
// reads as a shadow cast by nothing.
function SLOPE(roof: string) {
  return {
    negCol: shade(roof, 1.12),
    negRow: shade(roof, 1.0),
    posRow: shade(roof, 0.84),
    posCol: shade(roof, 0.7),
  };
}

// Wall tones for the same sun (light.ts's WALL_LIGHT).
function WALLS(wall: string): Record<FaceDir, string> {
  return {
    negCol: shade(wall, WALL_LIGHT.negCol),
    negRow: shade(wall, WALL_LIGHT.negRow),
    posRow: shade(wall, WALL_LIGHT.posRow),
    posCol: shade(wall, WALL_LIGHT.posCol),
  };
}

// The two visible walls of a small box (chimney, buttress, roof unit),
// authored as +row/+col tones; faceTone (light.ts) maps them to whichever
// faces the camera sees.
function sideFaces(f: BoxFaces, posRowTone: string, posColTone: string) {
  return (
    <>
      <polygon points={polyPoints(f.left)} fill={faceTone(f.dir.CD, posRowTone, posColTone)} />
      <polygon points={polyPoints(f.right)} fill={faceTone(f.dir.BC, posRowTone, posColTone)} />
    </>
  );
}

// Walls by direction. Attachments (pavilions, porticos, arcades, canopies,
// buttresses, merlons) take the wall by grid direction and are drawn only on
// the walls the camera can see (isoProjection's visibleWalls), never against
// a wall that has turned away, where they would paint over their own mass.
const isRowWall = (dir: FaceDir): boolean => dir === 'posRow' || dir === 'negRow';
function wallSpan(w: number, h: number, dir: FaceDir): number {
  return isRowWall(dir) ? w : h;
}
function opposite(dir: FaceDir): FaceDir {
  return dir === 'posRow' ? 'negRow' : dir === 'negRow' ? 'posRow' : dir === 'posCol' ? 'negCol' : 'posCol';
}
// The unit direction away from the building through this wall.
function outwardOf(dir: FaceDir): { col: number; row: number } {
  return dir === 'posRow' ? { col: 0, row: 1 } : dir === 'negRow' ? { col: 0, row: -1 }
    : dir === 'posCol' ? { col: 1, row: 0 } : { col: -1, row: 0 };
}
// A footprint against wall `dir` of box (col, row, w, h): `along0` to
// `along0 + width` along the wall in grid order, `depth` tiles out (or,
// with `sink`, that much into the wall, for things on its head or face).
function againstWall(
  col: number, row: number, w: number, h: number, dir: FaceDir,
  along0: number, width: number, depth: number, sink = 0,
): DepthBox {
  switch (dir) {
    case 'posRow': return { col: col + along0, row: row + h - sink, w: width, h: depth };
    case 'negRow': return { col: col + along0, row: row - depth + sink, w: width, h: depth };
    case 'posCol': return { col: col + w - sink, row: row + along0, w: depth, h: width };
    default: return { col: col - depth + sink, row: row + along0, w: depth, h: width };
  }
}
// A grid point `along` the wall and `out` tiles beyond its plane.
function outsideWall(
  col: number, row: number, w: number, h: number, dir: FaceDir, along: number, out: number,
): { col: number; row: number } {
  switch (dir) {
    case 'posRow': return { col: col + along, row: row + h + out };
    case 'negRow': return { col: col + along, row: row - out };
    case 'posCol': return { col: col + w + out, row: row + along };
    default: return { col: col - out, row: row + along };
  }
}
// A wall-attached box's visible front (facing `dir`) and one side, in the
// right wall tones.
function attachmentFaces(f: BoxFaces, dir: FaceDir, pal: Palette) {
  const frontIsLeft = f.dir.CD === dir;
  return {
    front: wallOf(f, dir),
    frontFill: frontIsLeft ? pal.wallLeft : pal.wallRight,
    side: frontIsLeft ? f.right : f.left,
    sideFill: frontIsLeft ? pal.wallRight : pal.wallLeft,
    frontIsLeft,
  };
}
// The lean-to roof over a wall-attached box, sloping up to the wall, plus
// the triangle closing its visible end.
function leanToRoof(f: BoxFaces, dir: FaceDir, height: number, rise: number, pal: Palette) {
  const front = wallOf(f, dir);
  const back = wallOf(f, opposite(dir));
  const frontIsLeft = f.dir.CD === dir;
  return {
    leanTo: [lift(front.origin, height), lift(front.along, height), lift(back.along, height + rise), lift(back.origin, height + rise)],
    leanToFill: pal[dir],
    endCap: frontIsLeft
      ? [lift(f.C, height), lift(f.B, height), lift(f.B, height + rise)]
      : [lift(f.C, height), lift(f.D, height), lift(f.D, height + rise)],
    endCapFill: frontIsLeft ? pal.wallRight : pal.wallLeft,
  };
}
// The set-back plane a bell-gable's return meets: the visible left wall,
// `across(0.6)` inside the building, oriented the way that wall is.
function gableInward(col: number, row: number, w: number, h: number): { origin: Pt; along: Pt } {
  const dir = visibleWalls().left;
  const strip = againstWall(col, row, w, h, dir, 0, wallSpan(w, h, dir), across(0.6), across(0.6));
  const back = wallOf(boxFaces(strip.col, strip.row, strip.w, strip.h, 0, 0), opposite(dir));
  return { origin: back.origin, along: back.along };
}

export function paletteFrom(m: Material, shadeFactor = 1): Palette {
  const wall = shadeFactor === 1 ? m.wall : shade(m.wall, shadeFactor);
  const walls = WALLS(wall);
  const seen = visibleWalls();
  return {
    roof: m.roof,
    // A flat raised deck faces straight up and takes no slope tone.
    roofDeck: shade(m.roof, 1.06),
    ...SLOPE(m.roof),
    wall: walls,
    wallLeft: walls[seen.left],
    wallRight: walls[seen.right],
  };
}

// A retail podium's street level: one tall shopfront per bay, near the pavement.
const SHOPFRONT_SILL = up(0.5);
const SHOPFRONT_WIDTH = across(3.4);

// A rectangle in a wall's own (u, v) coordinates. Used to reserve the bay a
// door stands in so no window is drawn behind it.
interface FaceRect { u0: number; u1: number; v0: number; v1: number; }
function overlaps(a: FaceRect, b: FaceRect): boolean {
  return a.u0 < b.u1 && a.u1 > b.u0 && a.v0 < b.v1 && a.v1 > b.v0;
}

// Windows on one wall at their real size: width in tiles (divided by the
// wall's span) and height in screen units (divided by its height), mapped
// through the wall's (u, v) so panes skew correctly. `sills` has one entry
// per rank (buildingSpec's rankSills / clerestorySill). `reserved` is the
// door's bay, skipped outright so no pane shows behind the door.
function windows(
  origin: Pt, along: Pt, wallHeight: number, spanTiles: number,
  sills: number[], windowWidthTiles: number, key: string,
  shape: WindowShape, glass: string,
  reserved?: FaceRect,
  // Two lights per bay (the Gothic grouping); the bay itself is unchanged.
  lights: 1 | 2 = 1,
) {
  const out: React.JSX.Element[] = [];
  if (wallHeight <= 0 || spanTiles <= 0) return out;
  const bays = baysAcross(spanTiles);
  // One <path> per wall, not a node per pane: a built-out campus has
  // thousands of windows.
  const panes: string[] = [];
  // A ribbon fills its bay edge to edge so the rank reads as one band.
  const halfU = shape === 'ribbon'
    ? 1 / bays / 2
    : Math.min(windowWidthTiles / spanTiles, 1 / bays) / 2;
  for (let r = 0; r < sills.length; r++) {
    const v0 = sills[r] / wallHeight;
    const v1 = (sills[r] + WINDOW_HEIGHT) / wallHeight;
    if (v1 > 1) continue;             // no rank above the eaves
    for (let b = 0; b < bays; b++) {
      const centre = (b + 0.5) / bays;
      const u0 = centre - halfU; const u1 = centre + halfU;
      if (reserved && overlaps({ u0, u1, v0, v1 }, reserved)) continue;
      // Two lights are each a little over half, so they read as one window.
      const spans: Array<[number, number]> = lights === 2
        ? [[centre - halfU * 1.08, centre - halfU * 0.12], [centre + halfU * 0.12, centre + halfU * 1.08]]
        : [[u0, u1]];
      for (const [a, c] of spans) {
        panes.push(`M${polyPoints(
          windowOutline(shape, a, c, v0, v1)
            .map(([u, v]) => facePoint(origin, along, wallHeight, u, v)),
        ).replace(/ /g, 'L')}Z`);
      }
    }
  }
  if (panes.length > 0) out.push(<path key={`${key}w`} className="iso-window" fill={glass} d={panes.join('')} />);
  return out;
}

// A course at each floor line across the whole wall: the horizontal
// structure that still reads at the opening zoom.
function floorCourses(
  origin: Pt, along: Pt, wallHeight: number, lines: number[], key: string,
) {
  if (wallHeight <= 0) return [];
  return lines.map((at, i) => {
    const v0 = (at - FLOOR_COURSE / 2) / wallHeight;
    const v1 = (at + FLOOR_COURSE / 2) / wallHeight;
    if (v0 <= 0 || v1 >= 1) return null;
    return (
      <polygon
        key={`${key}c${i}`}
        className="iso-course"
        points={polyPoints([
          facePoint(origin, along, wallHeight, 0, v0),
          facePoint(origin, along, wallHeight, 1, v0),
          facePoint(origin, along, wallHeight, 1, v1),
          facePoint(origin, along, wallHeight, 0, v1),
        ])}
      />
    );
  }).filter(Boolean);
}

// Panes are flat, with no glazing bars: a world-space <pattern> samples
// differently in each skewed pane and reads as irregular, and per-pane bars
// cost too many polygons for a sub-pixel detail.

// The scaffolding hatch, defined once in CampusMap's <defs>.
export const SCAFFOLD_PATTERN_ID = 'campus-scaffold';
export function ScaffoldPattern() {
  return (
    <pattern id={SCAFFOLD_PATTERN_ID} width={14} height={14} patternUnits="userSpaceOnUse">
      <path className="scaffold-hatch" d="M-4,4 L4,-4 M0,14 L14,0 M10,18 L18,10" />
    </pattern>
  );
}

// What a laboratory carries on its roof to say which science it is
// (buildingSpec.ts's labFeatureOf). Standing on the roof at `base`.
function LabRoofFeature({ feature, col, row, w, h, base, tint }: {
  feature: LabFeature; col: number; row: number; w: number; h: number; base: number; tint: string;
}) {
  if (feature === 'observatory') {
    // A drum and a dome at the front of the roof, taller than the lab under
    // it, with the shutter slit facing the camera.
    const r = Math.min(w, h) * 0.3;
    const cc = col + w * 0.62; const cr = row + h * 0.55;
    const drumRise = up(8);
    const ring = (z: number) => projectedCircle(cc, cr, r, 32).map((q) => lift(q, z));
    const bottom = ring(base); const top = ring(base + drumRise);
    const left = bottom.reduce((a, q) => (q.x < a.x ? q : a)); const right = bottom.reduce((a, q) => (q.x > a.x ? q : a));
    // The near half of a ring, left to right: the points below the line
    // through its two widest points.
    const front = (pts: Pt[]) => {
      const l = pts.reduce((a, q) => (q.x < a.x ? q : a)); const r = pts.reduce((a, q) => (q.x > a.x ? q : a));
      return pts.filter((q) => q.y >= (l.y + r.y) / 2 - 0.01).sort((a, b) => a.x - b.x);
    };
    const side = [...front(bottom), ...front(top).reverse()];
    const centre = lift(project(cc, cr), base + drumRise);
    const rx = (right.x - left.x) / 2;
    const rise = up(4.2) * heightScale() + rx * 0.35;
    const dome: string[] = [];
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI + (i / 20) * Math.PI;
      dome.push(`${(centre.x + Math.cos(a) * rx).toFixed(2)},${(centre.y + Math.sin(a) * rise).toFixed(2)}`);
    }
    const slitW = rx * 0.14;
    return (
      <g className="lab-observatory">
        <polygon points={polyPoints(side)} fill="#d6cfbf" stroke="rgba(70, 64, 54, 0.5)" strokeWidth={0.8} />
        <polygon points={polyPoints(top)} fill="#bdb5a3" />
        <polygon points={dome.join(' ')} fill="#d9dcdf" stroke="rgba(60, 64, 70, 0.45)" strokeWidth={0.8} />
        <polygon
          points={polyPoints([
            { x: centre.x - slitW, y: centre.y }, { x: centre.x + slitW, y: centre.y },
            { x: centre.x + slitW * 0.6, y: centre.y - rise * 0.98 }, { x: centre.x - slitW * 0.6, y: centre.y - rise * 0.98 },
          ])}
          fill="#3b4148"
        />
      </g>
    );
  }
  if (feature === 'glasshouse') {
    // A glazed house along the roof's front edge, ridge and panes.
    const gh = boxFaces(col + w * 0.12, row + h * 0.52, w * 0.62, h * 0.36, base, up(2.6));
    const ridgeA = lift(project(col + w * 0.12, row + h * 0.7), base + up(4.2));
    const ridgeB = lift(project(col + w * 0.74, row + h * 0.7), base + up(4.2));
    return (
      <g className="lab-glasshouse">
        <polygon points={polyPoints(gh.left)} className="glass-pane" />
        <polygon points={polyPoints(gh.right)} className="glass-pane" />
        <polygon points={polyPoints([gh.Dt, gh.Ct, ridgeB, ridgeA])} className="glass-roof" />
        <polygon points={polyPoints([gh.Ct, gh.Bt, ridgeB])} className="glass-roof" />
        <line x1={ridgeA.x} y1={ridgeA.y} x2={ridgeB.x} y2={ridgeB.y} className="glass-ridge" />
      </g>
    );
  }
  // Fume flues: a row of tall thin stacks along the back of the roof.
  const sp = across(0.9);
  return (
    <g className="lab-flues">
      {[0.2, 0.4, 0.6].map((u) => {
        const st = boxFaces(col + w * u, row + h * 0.12, sp, sp, base, up(8.5));
        return (
          <g key={u}>
            {sideFaces(st, shade(tint, 0.9), shade(tint, 0.74))}
            <polygon points={polyPoints(st.top)} fill={shade(tint, 0.4)} />
          </g>
        );
      })}
    </g>
  );
}

// Balconies on a tall residence: a slab and a rail at every second bay of
// each visible wall, on every story but the ground and the top.
function Balconies({ f, storeys, height, tone }: { f: BoxFaces; storeys: number; height: number; tone: string }) {
  const out: React.JSX.Element[] = [];
  const faces: [Pt, Pt, number][] = [[f.D, f.C, f.spanLeft], [f.C, f.B, f.spanRight]];
  faces.forEach(([o, a, span], side) => {
    const n = Math.max(1, Math.floor(span / 2));
    for (let k = 1; k < storeys - 1; k++) {
      const v = k / storeys;
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n;
        const slab = [facePoint(o, a, height, u - 0.035, v), facePoint(o, a, height, u + 0.035, v)];
        const rail = [facePoint(o, a, height, u - 0.035, v + 0.28 / storeys), facePoint(o, a, height, u + 0.035, v + 0.28 / storeys)];
        out.push(
          <g key={`${side}-${k}-${i}`}>
            <line x1={slab[0].x} y1={slab[0].y} x2={slab[1].x} y2={slab[1].y} stroke={tone} strokeWidth={2.2} />
            <line x1={rail[0].x} y1={rail[0].y} x2={rail[1].x} y2={rail[1].y} stroke="rgba(40, 40, 40, 0.55)" strokeWidth={0.9} />
          </g>,
        );
      }
    }
  });
  return <g className="iso-balconies">{out}</g>;
}

// A flag on a civic roof, in the college's colors.
function RoofFlag({ at }: { at: Pt }) {
  const colors = useContext(ColorsContext);
  const top = lift(at, up(7));
  return (
    <g className="iso-roof-flag">
      <line x1={at.x} y1={at.y} x2={top.x} y2={top.y} stroke="#d8d4c8" strokeWidth={1.2} />
      <path d={`M${top.x},${top.y + 1} q6,-2 12,0 v7 q-6,-2 -12,0 Z`} fill={colors.primary} />
      <path d={`M${top.x},${top.y + 3.6} q6,-2 12,0 v1.6 q-6,-2 -12,0 Z`} fill={colors.secondary} />
    </g>
  );
}

// Door width (buildingSpec's DOOR_FAMILIES) as a fraction of this wall,
// capped so an entrance never eats a short wall.
function doorFraction(d: DoorDimensions, span: number): number {
  if (d.widthTiles <= 0 || span <= 0) return 0;
  return Math.min(d.widthTiles / span, 0.6);
}

// The bay a door reserves, in (u, v): opening, surround and lintel, from the
// ground up so nothing draws behind the steps. A portal taller than a
// story clears the first-floor rank too.
function doorBay(d: DoorDimensions, span: number, wallHeight: number): FaceRect | undefined {
  const dw = doorFraction(d, span);
  if (dw <= 0 || wallHeight <= 0) return undefined;
  const head = (d.threshold + d.height) / wallHeight;
  return {
    u0: 0.5 - dw / 2 - SURROUND,
    u1: 0.5 + dw / 2 + SURROUND,
    v0: 0,
    v1: head + LINTEL + 0.02,
  };
}

const SURROUND = 0.018;   // how far the frame stands proud of the opening, in u
const LINTEL = 0.05;      // the lintel's depth above the head, in v

// The entrance, drawn in the wall's (u, v). Both visible walls get one,
// since either may face a path. Surround, two leaves with a mull, and a
// fanlight; smaller details are sub-pixel. Steps are EntranceSteps.
function Door({ d, origin, along, wallHeight, span, shape = 'rect' }: {
  d: DoorDimensions;
  origin: Pt; along: Pt; wallHeight: number;
  span: number;   // this wall's length in tiles, so the door is the same real size on both
  // Round-headed where the vernacular's windows are.
  shape?: 'rect' | 'arched';
}) {
  const dw = doorFraction(d, span);
  if (dw <= 0 || wallHeight <= 0) return null;
  // The opening in this wall's v: a real height, converted once.
  const v0 = d.threshold / wallHeight;
  const v1 = (d.threshold + d.height) / wallHeight;
  if (v1 > 1) return null;            // taller than the wall it is on: draw nothing rather than overflow
  const h = v1 - v0;
  const u0 = 0.5 - dw / 2;
  const u1 = 0.5 + dw / 2;
  const at = (u: number, v: number) => facePoint(origin, along, wallHeight, u, v);
  const quad = (a: number, b: number, c: number, e: number) =>
    polyPoints([at(a, c), at(b, c), at(b, e), at(a, e)]);

  const transom = v0 + h * 0.72;    // head of the leaves; the fanlight sits above
  const mull = dw * 0.035;          // the center post between the two leaves
  const reveal = dw * 0.08;         // how far the leaves sit inside the opening
  const bar = h * 0.045;            // the transom bar itself

  if (shape === 'arched') {
    const arch = (a: number, b: number, c: number, e: number) =>
      polyPoints(windowOutline('arched', a, b, c, e).map(([u, v]) => at(u, v)));
    // The fanlight: the opening's arch, inset, cut off at the transom.
    const fan = polyPoints(
      windowOutline('arched', u0 + reveal, u1 - reveal, v0, v1 - h * 0.04)
        .map(([u, v]) => at(u, Math.max(v, transom + bar * 0.5))),
    );
    return (
      <>
        <polygon className="iso-door-surround" points={arch(u0 - SURROUND, u1 + SURROUND, v0, v1 + 0.012)} />
        <polygon className="iso-door" points={arch(u0, u1, v0, v1)} />
        <polygon className="iso-door-leaf" points={quad(u0 + reveal, 0.5 - mull, v0 + h * 0.02, transom - bar)} />
        <polygon className="iso-door-leaf" points={quad(0.5 + mull, u1 - reveal, v0 + h * 0.02, transom - bar)} />
        <polygon className="iso-door-bar" points={quad(u0, u1, transom - bar, transom)} />
        <polygon className="iso-door-glass" points={fan} />
      </>
    );
  }

  return (
    <>
      {/* The surround, then the opening cut into it. */}
      <polygon className="iso-door-surround" points={quad(u0 - SURROUND, u1 + SURROUND, v0, v1 + 0.012)} />
      <polygon className="iso-door" points={quad(u0, u1, v0, v1)} />

      {/* Two leaves either side of the mull. */}
      <polygon className="iso-door-leaf" points={quad(u0 + reveal, 0.5 - mull, v0 + h * 0.02, transom - bar)} />
      <polygon className="iso-door-leaf" points={quad(0.5 + mull, u1 - reveal, v0 + h * 0.02, transom - bar)} />

      {/* The transom bar, and the fanlight over it. */}
      <polygon className="iso-door-bar" points={quad(u0, u1, transom - bar, transom)} />
      <polygon
        className="iso-door-glass"
        points={quad(u0 + reveal, u1 - reveal, transom + bar * 0.5, v1 - h * 0.04)}
      />

      {/* A lintel across the head. */}
      <polygon
        className="iso-door-lintel"
        points={quad(u0 - SURROUND - 0.012, u1 + SURROUND + 0.012, v1 + 0.012, v1 + LINTEL)}
      />
    </>
  );
}

// The flight of steps before a door, as grid boxes: each tread one rise
// higher and one tread-depth shallower, climbing toward the wall.
// `outCol`/`outRow` point away from the building. Drawn top down so the
// lowest tread paints over the rest.
function EntranceSteps({ d, centreCol, centreRow, outCol, outRow, span, stone }: {
  d: DoorDimensions;
  centreCol: number; centreRow: number;
  outCol: number; outRow: number;
  span: number; stone: StonePalette;
}) {
  if (d.treads <= 0 || d.threshold <= 0) return null;
  const stepStone = stone.trim === 'none' ? stone.towerStone : stone.trim;
  const halfW = Math.min(d.widthTiles, span * 0.6) / 2 + STEP_OVERHANG;
  const rise = d.threshold / d.treads;
  const out: React.JSX.Element[] = [];
  for (let i = d.treads - 1; i >= 0; i--) {
    // Tread i (from the bottom): (i + 1) rises high, (d.treads - i) depths out.
    const depth = (d.treads - i) * TREAD_DEPTH;
    const col = outCol !== 0 ? centreCol : centreCol - halfW;
    const row = outRow !== 0 ? centreRow : centreRow - halfW;
    const w = outCol !== 0 ? depth : halfW * 2;
    const h = outRow !== 0 ? depth : halfW * 2;
    const f = boxFaces(col, row, w, h, 0, (i + 1) * rise);
    out.push(
      <g key={i}>
        {sideFaces(f, shade(stepStone, 0.82), shade(stepStone, 0.68))}
        <polygon className="iso-step-tread" points={polyPoints(f.top)} />
      </g>,
    );
  }
  return <>{out}</>;
}

// A small box on a roof: plant, a stair head, a lift overrun.
function RoofBox({ col, row, w, h, base, height, tint }: {
  col: number; row: number; w: number; h: number; base: number; height: number; tint: string;
}) {
  const f = boxFaces(col, row, w, h, base, height);
  return (
    <>
      {sideFaces(f, shade(tint, 0.66), shade(tint, 0.56))}
      <polygon points={polyPoints(f.top)} fill={shade(tint, 0.8)} />
    </>
  );
}

// The academic hall: the landmark, drawn from a real reference building.
// Plinth, floor courses, cornice and parapet, a shallow hipped roof, a
// projecting pedimented center bay, raised end blocks, and on Founders Hall
// alone a clock tower (hasClockTower). Dimensions live in buildingSpec.ts.

// A band of stonework across a wall (plinth, cornice, parapet, course), in
// the wall's (u, v). Not drawn when `trim === 'none'` (Brutalist: the wall
// is one undivided thing).
function WallBand({ origin, along, wallHeight, from, to, className, u0 = 0, u1 = 1 }: {
  origin: Pt; along: Pt; wallHeight: number; from: number; to: number; className: string;
  // A u range lets the parapet be raised over the end bays alone.
  u0?: number; u1?: number;
}) {
  if (wallHeight <= 0) return null;
  const v0 = Math.max(0, from) / wallHeight;
  const v1 = Math.min(wallHeight, to) / wallHeight;
  if (v1 <= v0) return null;
  return (
    <polygon
      className={className}
      points={polyPoints([
        facePoint(origin, along, wallHeight, u0, v0),
        facePoint(origin, along, wallHeight, u1, v0),
        facePoint(origin, along, wallHeight, u1, v1),
        facePoint(origin, along, wallHeight, u0, v1),
      ])}
    />
  );
}

// Gable ends of a ridged roof, in the wall's tone, drawn only where the
// camera sees that end (`wallOf(...).visible`).
function gableEnds(f: BoxFaces, alongW: boolean, rs: Pt, re: Pt, pal: Palette) {
  // rs is the low-coordinate end of the ridge.
  const ends: Array<[FaceDir, Pt[]]> = alongW
    ? [['negCol', [f.NWt, f.SWt, rs]], ['posCol', [f.NEt, f.SEt, re]]]
    : [['negRow', [f.NWt, f.NEt, rs]], ['posRow', [f.SWt, f.SEt, re]]];
  return ends.map(([dir, pts]) => (
    wallOf(f, dir).visible
      ? <polygon key={dir} points={polyPoints(pts)} fill={pal.wall[dir]} />
      : null
  ));
}

// A hipped roof: four slopes meeting at a ridge inset from each end by half
// the shorter span, so the ends are proper hips. Faces toned by grid
// direction (SLOPE).
function HippedRoof({ col, row, w, h, base, rise, pal }: {
  col: number; row: number; w: number; h: number; base: number; rise: number; pal: Palette;
}) {
  const alongW = w >= h;
  const inset = Math.min(w, h) / 2;
  const At = lift(project(col, row), base);
  const Bt = lift(project(col + w, row), base);
  const Ct = lift(project(col + w, row + h), base);
  const Dt = lift(project(col, row + h), base);
  const rs = alongW
    ? lift(project(col + inset, row + h / 2), base + rise)
    : lift(project(col + w / 2, row + inset), base + rise);
  const re = alongW
    ? lift(project(col + w - inset, row + h / 2), base + rise)
    : lift(project(col + w / 2, row + h - inset), base + rise);
  return (
    <>
      <polygon points={polyPoints(alongW ? [At, Bt, re, rs] : [At, Bt, rs])} fill={pal.negRow} />
      <polygon points={polyPoints(alongW ? [At, Dt, rs] : [At, Dt, re, rs])} fill={pal.negCol} />
      <polygon points={polyPoints(alongW ? [Dt, Ct, re, rs] : [Dt, Ct, re])} fill={pal.posRow} />
      <polygon points={polyPoints(alongW ? [Bt, Ct, re] : [Bt, Ct, re, rs])} fill={pal.posCol} />
      <line className="iso-ridge" x1={rs.x} y1={rs.y} x2={re.x} y2={re.y} />
    </>
  );
}

// A raised end of the roofline: the wall carried up, in the wall's own
// tones, with a stone coping matching the plinth and cornice.
function EndPavilion({ col, row, w, h, base, pal, stone }: {
  col: number; row: number; w: number; h: number; base: number; pal: Palette; stone: StonePalette;
}) {
  const f = boxFaces(col, row, w, h, base, END_PAVILION_RISE);
  // Half overhang and a shade below trim, so the caps don't glare.
  const over = COPING_OVERHANG * 0.5;
  const cap = boxFaces(col - over, row - over, w + over * 2, h + over * 2, base + END_PAVILION_RISE, COPING * 0.8);
  return (
    <>
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      {sideFaces(cap, shade(stone.trim, 0.78), shade(stone.trim, 0.66))}
      <polygon points={polyPoints(cap.top)} fill={shade(stone.trim, 0.9)} />
    </>
  );
}

// The center bay projects from the front past the cornice, capped with a
// pediment, and carries the door so the entrance reads as the front.
//
// Its width: three structural bays, capped at half the front. Shared with
// the portico so the two agree on the middle.
function pavilionWidth(span: number): number {
  return Math.min(span * 0.5, (span / baysAcross(span)) * PAVILION_BAYS);
}

function CentrePavilion({ col, row, w, h, wallHeight, outward, pal, door, sills, paneW, paneShape, glass }: {
  col: number; row: number; w: number; h: number; wallHeight: number;
  outward: FaceDir;
  pal: Palette;
  door: DoorDimensions | null;
  sills: number[]; paneW: number; paneShape: WindowShape; glass: string;
}) {
  const span = wallSpan(w, h, outward);
  const width = pavilionWidth(span);
  const top = wallHeight + PAVILION_RISE;
  const bay = againstWall(col, row, w, h, outward, span / 2 - width / 2, width, PAVILION_DEPTH);
  const f = boxFaces(bay.col, bay.row, bay.w, bay.h, 0, top);
  const faces = attachmentFaces(f, outward, pal);
  const front = { o: faces.front.origin, a: faces.front.along };
  const side = { poly: faces.side, fill: faces.sideFill };
  const frontFill = faces.frontFill;
  const apex = lift(
    { x: (front.o.x + front.a.x) / 2, y: (front.o.y + front.a.y) / 2 },
    top + PEDIMENT_RISE,
  );
  const frontTopL = lift(front.o, top);
  const frontTopR = lift(front.a, top);
  return (
    <>
      <polygon points={polyPoints(side.poly)} fill={side.fill} />
      <polygon points={polyPoints([front.o, front.a, frontTopR, frontTopL])} fill={frontFill} />
      <WallBand origin={front.o} along={front.a} wallHeight={top} from={0} to={PLINTH} className="iso-plinth" />
      <WallBand origin={front.o} along={front.a} wallHeight={top} from={wallHeight - CORNICE} to={wallHeight} className="iso-cornice" />
      {windows(front.o, front.a, top, width, sills, paneW, 'pv', paneShape, glass, door ? doorBay(door, width, top) : undefined)}
      {door && <Door d={door} origin={front.o} along={front.a} wallHeight={top} span={width} />}
      <polygon points={polyPoints(f.top)} fill={pal.roofDeck} />
      {/* The pediment, on the door's face. */}
      <polygon className="iso-pediment" points={polyPoints([frontTopL, frontTopR, apex])} />
    </>
  );
}

// The portico: square columns standing clear of the center bay under an
// entablature, drawn between the pavilion and the steps. Square shafts
// because round shading is not worth it at this size; the rhythm is what
// reads.
function Portico({ centreCol, centreRow, width, outward, stone, columns = PORTICO_COLUMNS, height = PORTICO_HEIGHT, pediment = false }: {
  centreCol: number; centreRow: number; width: number; outward: FaceDir;
  stone: StonePalette; columns?: number; height?: number;
  // A pediment over the entablature (Classical temple front).
  pediment?: boolean;
}) {
  if (columns < 2 || width <= 0) return null;
  const gap = (width - PORTICO_COLUMN_PLAN) / (columns - 1);
  const half = width / 2;
  const shafts = Array.from({ length: columns }, (_, i) => {
    const along = -half + PORTICO_COLUMN_PLAN / 2 + i * gap;
    return isRowWall(outward)
      ? { col: centreCol + along - PORTICO_COLUMN_PLAN / 2, row: centreRow }
      : { col: centreCol, row: centreRow + along - PORTICO_COLUMN_PLAN / 2 };
  });
  const ent = isRowWall(outward)
    ? boxFaces(centreCol - half, centreRow - COPING_OVERHANG, width, PORTICO_COLUMN_PLAN + COPING_OVERHANG * 2, height, ENTABLATURE)
    : boxFaces(centreCol - COPING_OVERHANG, centreRow - half, PORTICO_COLUMN_PLAN + COPING_OVERHANG * 2, width, height, ENTABLATURE);
  return (
    <>
      {/* Back to front, so near columns paint over far ones. */}
      {depthOrder(shafts.map((c) => ({ ...c, w: PORTICO_COLUMN_PLAN, h: PORTICO_COLUMN_PLAN })))
        .map((c, i) => {
          const f = boxFaces(c.col, c.row, c.w, c.h, 0, height);
          return (
            <g key={i}>
              {sideFaces(f, shade(stone.towerStone, 0.96), shade(stone.towerStone, 0.78))}
              <polygon points={polyPoints(f.top)} fill={stone.towerStone} />
            </g>
          );
        })}
      {sideFaces(ent, shade(stone.towerStone, 0.92), shade(stone.towerStone, 0.74))}
      <polygon points={polyPoints(ent.top)} fill={shade(stone.towerStone, 1.02)} />
      {pediment && (() => {
        // The gable on the entablature's front with a darker tympanum.
        // boxFaces already lifts the corners to the base, so it springs
        // ENTABLATURE above them.
        const top = ENTABLATURE;
        const frontWall = wallOf(ent, outward);
        const [fo, fa] = [frontWall.origin, frontWall.along];
        const frontIsLeft = ent.dir.CD === outward;
        const mid = { x: (fo.x + fa.x) / 2, y: (fo.y + fa.y) / 2 };
        const apex = lift(mid, top + PEDIMENT_RISE);
        const inset = (q: Pt, sign: number) => ({ x: q.x + sign * 6, y: q.y });
        return (
          <>
            <polygon points={polyPoints([lift(fo, top), lift(fa, top), apex])} fill={shade(stone.towerStone, frontIsLeft ? 0.98 : 0.8)} />
            <polygon
              points={polyPoints([inset(lift(fo, top + up(0.35)), 1), inset(lift(fa, top + up(0.35)), -1), lift(mid, top + PEDIMENT_RISE - up(0.4))])}
              fill={shade(stone.towerStone, frontIsLeft ? 0.86 : 0.7)}
            />
          </>
        );
      })()}
    </>
  );
}

// The porch: a projecting gabled entrance bay with a pointed arch between
// two buttresses (the Gothic entrance where Georgian has a portico). It is
// part of the wall, so it takes the wall's palette.
function Porch({ col, row, w, h, wallHeight, outward, pal, stone }: {
  col: number; row: number; w: number; h: number; wallHeight: number;
  outward: FaceDir;
  pal: Palette; stone: StonePalette;
}) {
  // Same plan as CentrePavilion so it lines up with the reserved door bay.
  const span = wallSpan(w, h, outward);
  const width = pavilionWidth(span);
  // Lower than the wall behind it — see PORCH_HEIGHT_FRACTION.
  const top = wallHeight * PORCH_HEIGHT_FRACTION;
  const bayAlong = span / 2 - width / 2;
  const bay = againstWall(col, row, w, h, outward, bayAlong, width, PAVILION_DEPTH);
  const f = boxFaces(bay.col, bay.row, bay.w, bay.h, 0, top);

  const faces = attachmentFaces(f, outward, pal);
  const front = { o: faces.front.origin, a: faces.front.along };
  const side = { poly: faces.side, fill: faces.sideFill };
  const frontFill = faces.frontFill;
  const frontTopL = lift(front.o, top);
  const frontTopR = lift(front.a, top);
  // A steep gable off the bay's head (no cornice in this vernacular).
  const apex = lift(
    { x: (front.o.x + front.a.x) / 2, y: (front.o.y + front.a.y) / 2 },
    top + PORCH_GABLE_RISE,
  );

  // A buttress at each front corner, flush with the sides: two stacked
  // boxes, the upper shallower so the set-off reads as a step.
  const buttress = (nearSide: boolean) => {
    const along0 = bayAlong + (nearSide ? 0 : width - BUTTRESS_PLAN);
    const lowH = top * BUTTRESS_SETOFF_FRACTION;
    const lo = againstWall(col, row, w, h, outward, along0, BUTTRESS_PLAN, PAVILION_DEPTH);
    const lower = boxFaces(lo.col, lo.row, lo.w, lo.h, 0, lowH);
    // The set-off loses depth, not span.
    const shrink = PAVILION_DEPTH * BUTTRESS_SETOFF_DEPTH;
    const hi = againstWall(col, row, w, h, outward, along0, BUTTRESS_PLAN, PAVILION_DEPTH - shrink);
    const upper = boxFaces(hi.col, hi.row, hi.w, hi.h, lowH, top - lowH);
    return (
      <>
        <polygon points={polyPoints(lower.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(lower.right)} fill={pal.wallRight} />
        <polygon points={polyPoints(lower.top)} fill={shade(stone.trim, 0.88)} />
        <polygon points={polyPoints(upper.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(upper.right)} fill={pal.wallRight} />
        <polygon points={polyPoints(upper.top)} fill={shade(stone.trim, 0.94)} />
      </>
    );
  };

  const archU0 = 0.5 - PORCH_ARCH_WIDTH / 2;
  const archU1 = 0.5 + PORCH_ARCH_WIDTH / 2;

  return (
    <>
      {buttress(false)}
      <polygon points={polyPoints(side.poly)} fill={side.fill} />
      <polygon points={polyPoints([front.o, front.a, frontTopR, frontTopL])} fill={frontFill} />
      <WallBand origin={front.o} along={front.a} wallHeight={top} from={0} to={PLINTH} className="iso-plinth" />
      {/* One opening and no windows on this face. */}
      <polygon
        className="iso-door"
        points={polyPoints(
          windowOutline('lancet', archU0, archU1, 0, PORCH_ARCH_HEIGHT)
            .map(([u, v]) => facePoint(front.o, front.a, top, u, v)),
        )}
      />
      <polygon points={polyPoints(f.top)} fill={pal.roofDeck} />
      {/* The gable last, so it closes the roof. */}
      <polygon points={polyPoints([frontTopL, frontTopR, apex])} fill={shade(pal.roof, 1.04)} />
      {buttress(true)}
    </>
  );
}

// A stacked mass (buildingSpec's Massing): a set-back base, a slab
// cantilevering over it, a plant room on top. Brutalism is the shape, not
// ornament. The overhang is the base pulling in, so every volume stays
// inside the footprint.
function StackedMass({ col, row, w, h, height, pal, stone, paneShape, paneW, ranks }: {
  col: number; row: number; w: number; h: number; height: number;
  pal: Palette; stone: StonePalette; paneShape: WindowShape; paneW: number; ranks: number;
}) {
  const lowTop = height * STACK_LOWER_TOP;
  const upH = height - lowTop;
  // Step on the LONGER axis, so the offset has room to read.
  const alongW = w >= h;
  const inset = (alongW ? w : h) * STACK_UPPER_INSET;
  const over = (alongW ? h : w) * STACK_UPPER_OVERHANG;

  const low = boxFaces(col, row, w, h, 0, lowTop);
  // The upper slab pulls back from the far end and overhangs the near one.
  const uc = alongW ? col + inset : col - over;
  const ur = alongW ? row - over : row + inset;
  const uw = alongW ? w - inset : w + over;
  const uh = alongW ? h + over : h - inset;
  const up = boxFaces(uc, ur, uw, uh, lowTop, upH);

  const lowBands = Math.max(1, Math.round(ranks * STACK_LOWER_TOP));
  const upBands = Math.max(1, ranks - lowBands);
  const lowSills = rankSills(lowBands).map((v) => (v / (lowBands * STOREY)) * lowTop);
  const upSills = rankSills(upBands).map((v) => (v / (upBands * STOREY)) * upH);

  return (
    <>
      {/* The broad base. */}
      <polygon points={polyPoints(low.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(low.right)} fill={pal.wallRight} />
      {windows(low.D, low.C, lowTop, low.spanLeft, lowSills, paneW, 'sl', paneShape, stone.glass)}
      {windows(low.C, low.B, lowTop, low.spanRight, lowSills, paneW, 'sr', paneShape, stone.glass)}
      <polygon points={polyPoints(low.top)} fill={pal.roof} />

      {/* The soffit under the overhang: what reads as "cantilever". */}
      <polygon className="iso-undercroft" points={polyPoints(
        alongW
          ? [lift(project(uc, ur), lowTop), lift(project(uc + uw, ur), lowTop),
            lift(project(uc + uw, row), lowTop), lift(project(uc, row), lowTop)]
          : [lift(project(uc, ur), lowTop), lift(project(uc, ur + uh), lowTop),
            lift(project(col, ur + uh), lowTop), lift(project(col, ur), lowTop)],
      )} />

      {/* The upper slab, stepped back on one axis. */}
      <polygon points={polyPoints(up.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(up.right)} fill={pal.wallRight} />
      {windows(up.D, up.C, upH, up.spanLeft, upSills, paneW, 'ul', paneShape, stone.glass)}
      {windows(up.C, up.B, upH, up.spanRight, upSills, paneW, 'ur', paneShape, stone.glass)}
      <polygon points={polyPoints(up.top)} fill={pal.roof} />
    </>
  );
}

// The arcade: a covered walk of round arches on square piers along the
// whole front (you walk along it, unlike a portico), lower than a portico.
function Arcade({ col, row, w, h, outward, pal, stone, height = ARCADE_HEIGHT }: {
  col: number; row: number; w: number; h: number;
  outward: FaceDir; pal: Palette; stone: StonePalette;
  // Clamped by the caller under the wall's eaves (see arcadeHeight).
  height?: number;
}) {
  const span = wallSpan(w, h, outward);
  const bays = Math.max(2, Math.min(ARCADE_MAX,
    Math.round((span * METRES_PER_TILE) / ARCADE_BAY_METRES)));
  const walk = againstWall(col, row, w, h, outward, 0, span, ARCADE_DEPTH);

  // Piers back to front, whitewashed in the trim.
  const piers = depthOrder(Array.from({ length: bays + 1 }, (_, i) => {
    const at = Math.min(Math.max((i / bays) * span - ARCADE_PIER / 2, 0), span - ARCADE_PIER);
    return againstWall(col, row, w, h, outward, at, ARCADE_PIER, ARCADE_DEPTH);
  }));

  const front = boxFaces(walk.col, walk.row, walk.w, walk.h, 0, height);
  const frontWall = wallOf(front, outward);
  const o = frontWall.origin;
  const a = frontWall.along;

  // The tiled lean-to over the walk, and its end cap.
  const RISE = up(1.3);
  const roof = leanToRoof(front, outward, height, RISE, pal);

  return (
    <>
      {/* The shaded walk behind the arches. */}
      <polygon className="iso-undercroft" points={polyPoints(frontWall.poly)} />
      {/* One round-headed opening per bay, cut in the arcade's own front. */}
      {Array.from({ length: bays }, (_, i) => {
        // Most of the bay is opening: arches carried on piers.
        const u0 = (i + 0.09) / bays;
        const u1 = (i + 0.91) / bays;
        return (
          <polygon
            key={i}
            className="iso-undercroft"
            points={polyPoints(
              windowOutline('arched', u0, u1, 0.02, 0.9)
                .map(([u, v]) => facePoint(o, a, height, u, v)),
            )}
          />
        );
      })}
      {piers.map((p, i) => {
        const f = boxFaces(p.col, p.row, p.w, p.h, 0, height);
        return (
          <g key={i}>
            {sideFaces(f, shade(stone.trim, 0.94), shade(stone.trim, 0.76))}
          </g>
        );
      })}
      <polygon points={polyPoints(roof.endCap)} fill={roof.endCapFill} />
      <polygon points={polyPoints(roof.leanTo)} fill={roof.leanToFill} />
      <WallBand origin={o} along={a} wallHeight={height} from={height - COPING * 0.7} to={height} className="iso-cornice" />
    </>
  );
}


// Arcade height against this wall, clearing the eaves course. Walls too
// short for one get a canopy instead (arcadeFits).
function arcadeHeight(wallHeight: number): number {
  return Math.min(ARCADE_HEIGHT, wallHeight - EAVES_COURSE - COPING - up(0.4));
}
function arcadeFits(wallHeight: number): boolean {
  return wallHeight >= STOREY * 1.6;
}

// The campanile: a plain square shaft, an arcaded open belfry and a shallow
// tiled pyramid. The ornament is the opening, not the crown.
function Campanile({ col, row, w, h, base, stone, pal, gilded }: {
  col: number; row: number; w: number; h: number; base: number;
  stone: StonePalette; pal: Palette; gilded: boolean;
}) {
  const plan = Math.min(CAMPANILE_PLAN, Math.min(w, h) * 0.38);
  const cc = col + w / 2; const cr = row + h / 2;
  const shaft = boxFaces(cc - plan / 2, cr - plan / 2, plan, plan, base, CAMPANILE_RISE);
  const belfryBase = base + CAMPANILE_RISE;
  const belfry = boxFaces(cc - plan / 2, cr - plan / 2, plan, plan, belfryBase, CAMPANILE_BELFRY_RISE);
  const capBase = belfryBase + CAMPANILE_BELFRY_RISE;

  const At = lift(project(cc - plan / 2, cr - plan / 2), capBase);
  const Bt = lift(project(cc + plan / 2, cr - plan / 2), capBase);
  const Ct = lift(project(cc + plan / 2, cr + plan / 2), capBase);
  const Dt = lift(project(cc - plan / 2, cr + plan / 2), capBase);
  const tip = lift(project(cc, cr), capBase + CAMPANILE_CAP_RISE);
  const faces: Array<[Pt, Pt, number]> = [
    [At, Dt, 1.10], [At, Bt, 1.00], [Dt, Ct, 0.84], [Bt, Ct, 0.70],
  ];

  return (
    <>
      {sideFaces(shaft, shade(stone.towerStone, 0.97), shade(stone.towerStone, 0.8))}
      {sideFaces(belfry, shade(stone.towerStone, 0.93), shade(stone.towerStone, 0.77))}
      {/* Two arches a face on a shared centre pier. */}
      {([[belfry.D, belfry.C, 'cl'] as const, [belfry.C, belfry.B, 'cr'] as const]).map(([bo, ba, k]) => (
        [[0.14, 0.46] as const, [0.54, 0.86] as const].map(([u0, u1]) => (
          <polygon
            key={`${k}${u0}`}
            className="iso-undercroft"
            points={polyPoints(
              windowOutline('arched', u0, u1, 0.1, 0.9)
                .map(([u, v]) => facePoint(bo, ba, CAMPANILE_BELFRY_RISE, u, v)),
            )}
          />
        ))
      ))}
      {/* A shallow pyramid of the same tile as the roofs below it. */}
      {faces.map(([fa, fb], i) => (
        <polygon key={i} points={polyPoints([fa, fb, tip])} fill={shade(pal.roof, faces[i][2])} />
      ))}
      {gilded && (
        <circle className="iso-dome" cx={tip.x} cy={tip.y - 3} r={2} fill={stone.gilt} />
      )}
    </>
  );
}

// The archway: a Mission residence hall's entrance, a small stucco porch
// with one round-headed opening under a tile lean-to. Its floor is the
// door's threshold, so the steps climb to it.
function Archway({ d, col, row, w, h, outward, wallHeight, pal, stone }: {
  d: DoorDimensions; col: number; row: number; w: number; h: number; outward: FaceDir;
  wallHeight: number; pal: Palette; stone: StonePalette;
}) {
  const top = Math.min(d.threshold + d.height + up(1.5), wallHeight - EAVES_COURSE - up(1.4));
  if (top <= d.threshold + d.height * 0.6) return null;
  const width = Math.max(d.widthTiles * 2.3, across(4.5));
  const span = wallSpan(w, h, outward);
  const porch = againstWall(col, row, w, h, outward, span / 2 - width / 2, width, PAVILION_DEPTH);
  const f = boxFaces(porch.col, porch.row, porch.w, porch.h, 0, top);
  const frontWall = wallOf(f, outward);
  const o = frontWall.origin;
  const a = frontWall.along;
  const RISE = up(1.1);
  const roof = leanToRoof(f, outward, top, RISE, pal);
  const floor = d.threshold / top;
  const outline = (u0: number, u1: number, v1: number) =>
    polyPoints(windowOutline('arched', u0, u1, floor, v1).map(([u, v]) => facePoint(o, a, top, u, v)));
  return (
    <>
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      {/* A whitewashed surround, and the shaded walk behind the arch. */}
      <polygon points={outline(0.17, 0.83, 0.94)} fill={stone.trim} />
      <polygon className="iso-undercroft" points={outline(0.21, 0.79, 0.9)} />
      <polygon points={polyPoints(roof.endCap)} fill={roof.endCapFill} />
      <polygon points={polyPoints(roof.leanTo)} fill={roof.leanToFill} />
    </>
  );
}

// The espadaña (Mission bell-gable): the front wall carried up past the
// eaves with coved shoulders, a bell in a round-headed opening and a small
// gable. No cross. Drawn in the wall's plane after the roof; `inward` is the
// same face set back to give it a lit return.
function BellGable({ origin, along, inward, wallHeight, span, centreU, sideAt, pal, stone, scale = 1 }: {
  origin: Pt; along: Pt; inward: { origin: Pt; along: Pt };
  wallHeight: number; span: number; centreU: number;
  // Which end shows its return: +u on the left wall, -u on the right.
  sideAt: 'u0' | 'u1';
  pal: Palette; stone: StonePalette;
  // Uniform scale (a pavilion's is smaller than a hall's).
  scale?: number;
}) {
  const at = (u: number, v: number) => facePoint(origin, along, wallHeight, u, v);
  const back = (u: number, v: number) => facePoint(inward.origin, inward.along, wallHeight, u, v);
  const widthTiles = Math.min(span * 0.36, across(10.5 * scale));
  const hw = widthTiles / span / 2;
  const u0 = centreU - hw; const u1 = centreU + hw;
  const V = (m: number) => 1 + up(m * scale) / wallHeight;
  const shoulder = V(1.4); const neck = V(4.0); const top = V(6.4); const peak = V(7.3);
  const q = hw * 0.48;           // how far each shoulder steps in
  // A cove: a quarter of a circle from the outer edge up into the neck.
  const cove = (from: number, dir: 1 | -1): Array<[number, number]> =>
    Array.from({ length: 6 }, (_, i) => {
      const t = (i + 1) / 6 * Math.PI / 2;
      return [from + dir * q * (1 - Math.cos(t)), shoulder + (neck - shoulder) * Math.sin(t)];
    });
  const profile: Array<[number, number]> = [
    [u0, 1], [u0, shoulder], ...cove(u0, 1),
    [u0 + q, top], [centreU, peak], [u1 - q, top],
    ...cove(u1, -1).reverse(), [u1, shoulder], [u1, 1],
  ];
  const su = sideAt === 'u1' ? u1 : u0;
  const nu = sideAt === 'u1' ? u1 - q : u0 + q;
  const face = sideAt === 'u1' ? pal.wallLeft : pal.wallRight;
  const ret = sideAt === 'u1' ? pal.wallRight : pal.wallLeft;
  const bellU = hw * 0.3;
  const opening = windowOutline('arched', centreU - bellU, centreU + bellU, V(0.9), V(5.5));
  const finial = { x: at(centreU, peak).x, y: at(centreU, peak).y };
  const finialRise = wallHeight * (V(0.7) - 1);
  return (
    <>
      {/* The returns first. */}
      <polygon points={polyPoints([at(su, 1), at(su, shoulder), back(su, shoulder), back(su, 1)])} fill={ret} />
      <polygon points={polyPoints([at(nu, neck), at(nu, top), back(nu, top), back(nu, neck)])} fill={ret} />
      <polygon points={polyPoints(profile.map(([u, v]) => at(u, v)))} fill={face} />
      <polygon className="iso-undercroft" points={polyPoints(opening.map(([u, v]) => at(u, v)))} />
      {/* The bell: a small trapezoid of bronze hanging in the opening. */}
      <polygon points={polyPoints([at(centreU - bellU * 0.5, V(2.0)), at(centreU + bellU * 0.5, V(2.0)), at(centreU + bellU * 0.22, V(3.7)), at(centreU - bellU * 0.22, V(3.7))])} fill={stone.gilt} />
      {/* A bronze finial at the peak. */}
      <line x1={finial.x} y1={finial.y} x2={finial.x} y2={lift(finial, finialRise).y} stroke={stone.gilt} strokeWidth={1.2} />
      <circle cx={finial.x} cy={lift(finial, finialRise).y} r={1.6} fill={stone.gilt} />
    </>
  );
}

// Buttresses at every bay line, clear of the entrance bay and a corner
// tower, with two set-offs: the structure on the outside is what reads as
// Gothic construction.
function Buttresses({ col, row, w, h, height, outward, pal, stone, reserve, skipNear = 0 }: {
  col: number; row: number; w: number; h: number; height: number; outward: FaceDir;
  pal: Palette; stone: StonePalette;
  // The entrance's stretch of this wall, in u.
  reserve?: [number, number];
  // Tiles at the wall's near end held by a corner tower.
  skipNear?: number;
}) {
  const span = wallSpan(w, h, outward);
  const bays = baysAcross(span);
  if (bays < 2) return null;
  const depth = across(0.85);
  const shrink = depth * 0.42;
  const lowH = height * 0.5; const midH = height * 0.82;
  const out: React.JSX.Element[] = [];
  for (let b = 1; b < bays; b++) {
    const u = b / bays;
    if (reserve && u > reserve[0] - 0.03 && u < reserve[1] + 0.03) continue;
    const along = u * span;
    // The corner tower is at the +col, +row corner.
    if (skipNear > 0 && (outward === 'posRow' || outward === 'posCol') && along > span - skipNear - BUTTRESS_PLAN) continue;
    const lo = againstWall(col, row, w, h, outward, along - BUTTRESS_PLAN / 2, BUTTRESS_PLAN, depth);
    const lower = boxFaces(lo.col, lo.row, lo.w, lo.h, 0, lowH);
    const hi = againstWall(col, row, w, h, outward, along - BUTTRESS_PLAN / 2, BUTTRESS_PLAN, depth - shrink);
    const upper = boxFaces(hi.col, hi.row, hi.w, hi.h, lowH, midH - lowH);
    out.push(
      <g key={`${outward}${b}`}>
        <polygon points={polyPoints(lower.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(lower.right)} fill={pal.wallRight} />
        <polygon points={polyPoints(lower.top)} fill={shade(stone.trim, 0.88)} />
        <polygon points={polyPoints(upper.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(upper.right)} fill={pal.wallRight} />
        <polygon points={polyPoints(upper.top)} fill={shade(stone.trim, 0.94)} />
      </g>,
    );
  }
  return <>{out}</>;
}

// Merlons: a crenellated parapet as real blocks on the wall head. Made thin,
// pale and railed, the same row is a balustrade, hence the size props.
function Merlons({ col, row, w, h, base, outward, pal, block = across(1.1), gap = across(0.9), rise = up(1.0), depth = across(0.5), fill, rail = false }: {
  col: number; row: number; w: number; h: number; base: number; outward: FaceDir; pal: Palette;
  block?: number; gap?: number; rise?: number; depth?: number;
  // A stone other than the wall's (a balustrade in trim).
  fill?: string;
  rail?: boolean;
}) {
  const span = wallSpan(w, h, outward);
  const m = block; const g = gap;
  const n = Math.max(1, Math.floor((span - g) / (m + g)));
  const start = (span - (n * m + (n - 1) * g)) / 2;
  const left = fill ? shade(fill, 0.96) : pal.wallLeft;
  const right = fill ? shade(fill, 0.8) : pal.wallRight;
  const top = fill ? fill : shade(pal.wallLeft, 1.08);
  const rb = againstWall(col, row, w, h, outward, start, span - start * 2, depth, depth);
  const railBox = boxFaces(rb.col, rb.row, rb.w, rb.h, base + rise, rise * 0.22);
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const along = start + i * (m + g);
        const b = againstWall(col, row, w, h, outward, along, m, depth, depth);
        const f = boxFaces(b.col, b.row, b.w, b.h, base, rise);
        return (
          <g key={i}>
            <polygon points={polyPoints(f.left)} fill={left} />
            <polygon points={polyPoints(f.right)} fill={right} />
            <polygon points={polyPoints(f.top)} fill={top} />
          </g>
        );
      })}
      {rail && (
        <>
          <polygon points={polyPoints(railBox.left)} fill={left} />
          <polygon points={polyPoints(railBox.right)} fill={right} />
          <polygon points={polyPoints(railBox.top)} fill={top} />
        </>
      )}
    </>
  );
}

// A balustrade: thin balusters under a rail, in trim (the Classical parapet).
function Balustrade({ col, row, w, h, base, outward, pal, stone }: {
  col: number; row: number; w: number; h: number; base: number; outward: FaceDir;
  pal: Palette; stone: StonePalette;
}) {
  return (
    <Merlons col={col} row={row} w={w} h={h} base={base} outward={outward} pal={pal}
      block={across(0.32)} gap={across(0.5)} rise={up(0.95)} depth={across(0.32)} fill={stone.trim} rail />
  );
}

// The dome: a broad stone dome on a low drum with a small gilt lantern,
// crowning the campus's one landmark (not the clock tower's cupola).
function Dome({ col, row, w, h, base, stone }: {
  col: number; row: number; w: number; h: number; base: number; stone: StonePalette;
}) {
  const r = Math.min(across(9.5), Math.min(w, h) * 0.26);
  const cc = col + w / 2; const cr = row + h / 2;
  const DRUM = up(5.0); const RISE = up(6.5);
  const centre = project(cc, cr);
  const ring = projectedCircle(cc, cr, r, 48);
  // The drum's near half, split into lit and shaded faces.
  const front = ring.filter((p) => p.y >= centre.y - 0.01).sort((a, b) => a.x - b.x);
  const lit = front.filter((p) => p.x <= centre.x + 0.01);
  const dark = front.filter((p) => p.x >= centre.x - 0.01);
  const wall = (pts: Pt[]) => polyPoints([...pts.map((p) => lift(p, base)), ...[...pts].reverse().map((p) => lift(p, base + DRUM))]);
  const rx = (Math.max(...ring.map((p) => p.x)) - Math.min(...ring.map((p) => p.x))) / 2;
  const top = lift(centre, base + DRUM);
  const cap = (scale: number, dx: number): string => {
    const pts: string[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI + (i / 24) * Math.PI;
      pts.push(`${(top.x + dx + Math.cos(a) * rx * scale).toFixed(2)},${(top.y + Math.sin(a) * RISE * scale * heightScale()).toFixed(2)}`);
    }
    return pts.join(' ');
  };
  const lanternFoot = lift(top, RISE);
  return (
    <>
      <polygon points={wall(lit)} fill={shade(stone.towerStone, 0.97)} />
      <polygon points={wall(dark)} fill={shade(stone.towerStone, 0.8)} />
      <polygon points={polyPoints(ring.map((p) => lift(p, base + DRUM)))} fill={shade(stone.towerStone, 0.9)} />
      {/* The dome, and a lit crescent on its left shoulder. */}
      <polygon points={cap(1, 0)} fill={shade(stone.towerStone, 0.86)} />
      <polygon points={cap(0.78, -rx * 0.12)} fill={shade(stone.towerStone, 0.96)} />
      {/* The lantern, and the gilt finial on it. */}
      <rect x={lanternFoot.x - 3} y={lanternFoot.y - 7} width={6} height={8} fill={shade(stone.towerStone, 0.92)} />
      <line className="iso-finial" x1={lanternFoot.x} y1={lanternFoot.y - 7} x2={lanternFoot.x} y2={lanternFoot.y - 14} stroke={stone.gilt} />
      <circle cx={lanternFoot.x} cy={lanternFoot.y - 14} r={1.8} fill={stone.gilt} />
    </>
  );
}

// A corner tower (collegiate Gothic's signature): square, in the wall's
// stone, standing slightly proud of both walls and rising past the eaves,
// with lancets and either a crenellated head (halls) or a slate pyramid.
// Always at the near corner, so neither drawn face lies inside the mass.
function CornerTower({ col, row, plan, height, pal, glass, sills, paneW, crenels, capRise }: {
  col: number; row: number; plan: number; height: number;
  pal: Palette; glass: string; sills: number[]; paneW: number;
  crenels: boolean; capRise: number;
}) {
  const f = boxFaces(col, row, plan, plan, 0, height);
  // Crenellated towers are flat-topped; plain ones get a slate pyramid.
  const At = lift(project(col, row), height);
  const Bt = lift(project(col + plan, row), height);
  const Ct = lift(project(col + plan, row + plan), height);
  const Dt = lift(project(col, row + plan), height);
  const tip = lift(project(col + plan / 2, row + plan / 2), height + capRise);
  const faces: Array<[Pt, Pt, number]> = [[At, Dt, 1.10], [At, Bt, 1.00], [Dt, Ct, 0.84], [Bt, Ct, 0.70]];
  return (
    <>
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      {windows(f.D, f.C, height, f.spanLeft, sills, paneW * 0.6, 'tl', 'lancet', glass)}
      {windows(f.C, f.B, height, f.spanRight, sills, paneW * 0.6, 'tr', 'lancet', glass)}
      <WallBand origin={f.D} along={f.C} wallHeight={height} from={height - CORNICE} to={height} className="iso-cornice" />
      <WallBand origin={f.C} along={f.B} wallHeight={height} from={height - CORNICE} to={height} className="iso-cornice" />
      <polygon points={polyPoints(f.top)} fill={pal.roofDeck} />
      {!crenels && faces.map(([a, b, k], i) => <polygon key={i} points={polyPoints([a, b, tip])} fill={shade(pal.roof, k)} />)}
      {crenels && [visibleWalls().left, visibleWalls().right].map((dir) => (
        <Merlons key={dir} col={col} row={row} w={plan} h={plan} base={height} outward={dir} pal={pal} />
      ))}
    </>
  );
}

// The recess (Brutalist entrance): the ground floor cut away across the
// middle of the front under an oversailing slab. Adds nothing but shadow.
function Recess({ col, row, w, h, wallHeight, outward, pal }: {
  col: number; row: number; w: number; h: number; wallHeight: number;
  outward: FaceDir; pal: Palette;
}) {
  const span = wallSpan(w, h, outward);
  const width = span * RECESS_WIDTH;
  const height = Math.min(wallHeight * 0.3, STOREY * 1.25);
  const along0 = span / 2 - width / 2;

  // The cut-away, drawn as the faces you see into so it reads as depth.
  const c = againstWall(col, row, w, h, outward, along0, width, RECESS_DEPTH, RECESS_DEPTH);
  const cut = boxFaces(c.col, c.row, c.w, c.h, 0, height);
  // The slab that oversails it, projecting past the wall.
  const sl = againstWall(col, row, w, h, outward, along0 - RECESS_OVERHANG, width + RECESS_OVERHANG * 2, RECESS_DEPTH + RECESS_OVERHANG, RECESS_DEPTH);
  const slab = boxFaces(sl.col, sl.row, sl.w, sl.h, height, CANOPY_SLAB * 1.6);

  return (
    <>
      <polygon className="iso-undercroft" points={polyPoints(cut.left)} />
      <polygon className="iso-undercroft" points={polyPoints(cut.right)} />
      <polygon className="iso-undercroft" points={polyPoints(cut.top)} />
      {sideFaces(slab, shade(pal.wallLeft, 0.92), shade(pal.wallRight, 0.92))}
      <polygon points={polyPoints(slab.top)} fill={shade(pal.wallLeft, 1.04)} />
    </>
  );
}

// The stair core: a blind concrete shaft past the roof slab. Deliberately
// plain; the Brutalist landmark is the mass itself.
function StairCore({ col, row, w, h, base, stone }: {
  col: number; row: number; w: number; h: number; base: number; stone: StonePalette;
}) {
  const plan = Math.min(CORE_PLAN, Math.min(w, h) * 0.34);
  const cc = col + w / 2; const cr = row + h / 2;
  const shaft = boxFaces(cc - plan / 2, cr - plan / 2, plan, plan, base, CORE_RISE);
  const capPlan = plan * 0.55;
  const cap = boxFaces(cc - capPlan / 2, cr - capPlan / 2, capPlan, capPlan, base + CORE_RISE, CORE_CAP_RISE);
  return (
    <>
      {sideFaces(shaft, shade(stone.towerStone, 0.97), shade(stone.towerStone, 0.79))}
      <polygon points={polyPoints(shaft.top)} fill={shade(stone.towerStone, 0.9)} />
      {sideFaces(cap, shade(stone.towerStone, 0.9), shade(stone.towerStone, 0.74))}
      <polygon points={polyPoints(cap.top)} fill={shade(stone.towerStone, 0.86)} />
    </>
  );
}

// Buttress piers along a clear-span wall, at bay centers: shallow boxes so
// they catch light on one face and read as depth.
function Piers({ col, row, w, h, height, outward, pal, stone }: {
  col: number; row: number; w: number; h: number; height: number;
  outward: FaceDir; pal: Palette; stone: StonePalette;
}) {
  const span = wallSpan(w, h, outward);
  const count = Math.max(2, Math.round((span * METRES_PER_TILE) / (BAY_METRES * 2)));
  const plan = across(PIER_WIDTH_METRES);
  return (
    <>
      {Array.from({ length: count + 1 }, (_, i) => {
        const at = (i / count) * span - plan / 2;
        const pier = againstWall(col, row, w, h, outward, at, plan, PIER_PROJECTION);
        const f = boxFaces(pier.col, pier.row, pier.w, pier.h, 0, height);
        return (
          <g key={i}>
            <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
            <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
            <polygon points={polyPoints(f.top)} fill={shade(stone.trim, 0.86)} />
          </g>
        );
      })}
    </>
  );
}

// A canopy over a door: a slab on two posts, marking a low pavilion's entrance.
function Canopy({ d, col, row, w, h, outward, wallHeight, stone, hood = false, roof }: {
  d: DoorDimensions; col: number; row: number; w: number; h: number; outward: FaceDir;
  wallHeight: number; stone: StonePalette;
  // A small pitched hood instead of a slab (Gothic); `roof` is its slate.
  hood?: boolean; roof?: string;
}) {
  // With no trim (Modern), canopies use the tower stone.
  const canopyStone = stone.trim === 'none' ? stone.towerStone : stone.trim;
  // Clamped under the eaves: on a one-story pavilion the door, threshold
  // and clearance can exceed the wall height.
  const top = Math.min(d.threshold + d.height + up(0.6), wallHeight - EAVES_COURSE - CANOPY_SLAB);
  if (top <= d.threshold + d.height * 0.5) return null;
  const width = d.widthTiles * 1.7;
  const span = wallSpan(w, h, outward);
  const mid = span / 2;
  const plate = againstWall(col, row, w, h, outward, mid - width / 2, width, CANOPY_DEPTH);
  // Thin and a shade below trim; its ground shadow shows it is raised.
  const slabT = CANOPY_SLAB * 0.55;
  const slab = boxFaces(plate.col, plate.row, plate.w, plate.h, top, slabT);
  const postAt = (sign: number) => {
    const along0 = mid + (sign < 0 ? -width / 2 : width / 2 - CANOPY_POST);
    const post = againstWall(col, row, w, h, outward, along0, CANOPY_POST, CANOPY_POST, -(CANOPY_DEPTH - CANOPY_POST));
    return boxFaces(post.col, post.row, post.w, post.h, 0, top);
  };
  // The canopy's own ground shadow, away from the sun (light.ts).
  const shadowAt = shadowOffset(top);
  const shadow = boxFaces(plate.col + shadowAt.dcol, plate.row + shadowAt.drow, plate.w, plate.h, 0, 0).top;

  const gable = hood && roof ? (() => {
    // Ridge running out from the wall, two slopes toned by direction, and
    // the gable end facing out.
    const rise = up(1.2);
    const f = slab;
    const rIn = outsideWall(col, row, w, h, outward, mid, 0);
    const rOut = outsideWall(col, row, w, h, outward, mid, CANOPY_DEPTH);
    const ridgeIn = lift(project(rIn.col, rIn.row), top + rise);
    const ridgeOut = lift(project(rOut.col, rOut.row), top + rise);
    const halves: Array<[Pt[], number]> = isRowWall(outward)
      ? [[[f.NWt, ridgeIn, ridgeOut, f.SWt], 1.12], [[f.NEt, ridgeIn, ridgeOut, f.SEt], 0.84]]
      : [[[f.NWt, ridgeIn, ridgeOut, f.NEt], 1.0], [[f.SWt, ridgeIn, ridgeOut, f.SEt], 0.7]];
    const end = wallOf(f, outward);
    return (
      <>
        {halves.map(([pts, k], i) => <polygon key={i} points={polyPoints(pts)} fill={shade(roof, k)} />)}
        <polygon points={polyPoints([lift(end.origin, slabT), lift(end.along, slabT), ridgeOut])} fill={shade(canopyStone, 0.8)} />
      </>
    );
  })() : null;

  return (
    <>
      <polygon className="campus-building-shadow" points={polyPoints(shadow)} />
      {[-1, 1].map((sign) => {
        const f = postAt(sign);
        return (
          <g key={sign}>
            {sideFaces(f, shade(canopyStone, 0.62), shade(canopyStone, 0.5))}
          </g>
        );
      })}
      {sideFaces(slab, shade(canopyStone, 0.66), shade(canopyStone, 0.56))}
      <polygon points={polyPoints(slab.top)} fill={shade(canopyStone, 0.9)} />
      {gable}
    </>
  );
}

// A curtain wall: continuous glass divided by mullions (the wall is the
// glazing), on the same bay grid as punched windows so the two agree.
function CurtainWall({ origin, along, wallHeight, spanTiles, from, to, floors, id, u0 = 0, u1 = 1 }: {
  origin: Pt; along: Pt; wallHeight: number; spanTiles: number;
  from: number;          // the head of the undercroft: glazing starts here
  to?: number;           // and stops here (default: the eaves)
  floors: number[];      // floor lines, for the transoms
  id: string;            // not `key`: React reserves that and it arrives undefined
  // The stretch of wall glazed, in u (whole face by default).
  u0?: number; u1?: number;
}) {
  if (wallHeight <= 0 || spanTiles <= 0 || u1 <= u0) return null;
  const v0 = from / wallHeight;
  const v1 = Math.min(1, (to ?? wallHeight) / wallHeight);
  if (v1 <= v0) return null;
  const quad = (a0: number, a1: number, a: number, b: number) => polyPoints([
    facePoint(origin, along, wallHeight, a0, a),
    facePoint(origin, along, wallHeight, a1, a),
    facePoint(origin, along, wallHeight, a1, b),
    facePoint(origin, along, wallHeight, a0, b),
  ]);
  const bays = Math.max(1, Math.round(baysAcross(spanTiles) * (u1 - u0)));
  const mullion = Math.min(0.16 / bays, 0.01) * (u1 - u0);
  const transom = FLOOR_COURSE * 0.35 / wallHeight;
  return (
    <>
      <polygon className="iso-curtain-glass" points={quad(u0, u1, v0, v1)} />
      {Array.from({ length: bays + 1 }, (_, i) => {
        const u = u0 + (i / bays) * (u1 - u0);
        return (
          <polygon
            key={`${id}m${i}`}
            className="iso-mullion"
            points={quad(Math.max(u0, u - mullion), Math.min(u1, u + mullion), v0, v1)}
          />
        );
      })}
      {floors.filter((at) => at > from && at / wallHeight < v1).map((at, i) => (
        <polygon
          key={`${id}t${i}`}
          className="iso-mullion"
          points={quad(u0, u1, at / wallHeight - transom, at / wallHeight + transom)}
        />
      ))}
    </>
  );
}

// The red cross, in the wall's (u, v) so it skews with the face.
function RedCross({ origin, along, wallHeight, spanTiles, centreU, centreV, scale = 1 }: {
  origin: Pt; along: Pt; wallHeight: number; spanTiles: number;
  centreU: number; centreV: number;
  // Smaller for the clinic's sign over a door.
  scale?: number;
}) {
  const armU = across(CROSS_ARM_METRES * scale) / spanTiles / 2;
  const armV = up(CROSS_ARM_METRES * scale) / wallHeight / 2;
  const barU = across(CROSS_BAR_METRES * scale) / spanTiles / 2;
  const barV = up(CROSS_BAR_METRES * scale) / wallHeight / 2;
  const quad = (u0: number, u1: number, v0: number, v1: number) => polyPoints([
    facePoint(origin, along, wallHeight, u0, v0),
    facePoint(origin, along, wallHeight, u1, v0),
    facePoint(origin, along, wallHeight, u1, v1),
    facePoint(origin, along, wallHeight, u0, v1),
  ]);
  return (
    <>
      <polygon className="iso-cross" points={quad(centreU - barU, centreU + barU, centreV - armV, centreV + armV)} />
      <polygon className="iso-cross" points={quad(centreU - armU, centreU + armU, centreV - barV, centreV + barV)} />
    </>
  );
}

// The clock tower, Founders Hall only (hasClockTower): a square base with a
// clock on each visible face, a colonnaded drum, a gilded dome and a finial.
// The dome is drawn in screen space (like trees.tsx's crowns): a projected
// hemisphere is a squashed ellipse and reads as a plate.
function ClockTower({ col, row, w, h, base, stone, apex, gilded }: {
  col: number; row: number; w: number; h: number; base: number;
  stone: StonePalette; apex: ApexPart; gilded: boolean;
}) {
  const plan = Math.min(TOWER_BASE_PLAN, Math.min(w, h) * 0.42);
  const drumPlan = plan * (TOWER_DRUM_PLAN / TOWER_BASE_PLAN);
  const cc = col + w / 2; const cr = row + h / 2;
  const shaft = boxFaces(cc - plan / 2, cr - plan / 2, plan, plan, base, TOWER_BASE_RISE);
  const drumBase = base + TOWER_BASE_RISE;
  const drum = boxFaces(cc - drumPlan / 2, cr - drumPlan / 2, drumPlan, drumPlan, drumBase, TOWER_DRUM_RISE);

  // A clock face sampled as a polygon in the wall's (u, v), so it skews
  // correctly without rotation maths.
  const clock = (origin: Pt, along: Pt, key: string) => {
    // Convert the radius separately per axis (u is tiles, v a fraction of
    // height), or the face becomes an ellipse.
    const ru = CLOCK_RADIUS_TILES / plan;
    const rv = CLOCK_RADIUS / TOWER_BASE_RISE;
    const pts: Pt[] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      pts.push(facePoint(origin, along, TOWER_BASE_RISE, 0.5 + Math.cos(a) * ru, 0.56 + Math.sin(a) * rv));
    }
    // Hands: without them two white circles read as a pair of eyes.
    const centre = facePoint(origin, along, TOWER_BASE_RISE, 0.5, 0.56);
    const hand = (fu: number, fv: number) => facePoint(
      origin, along, TOWER_BASE_RISE, 0.5 + ru * fu, 0.56 + rv * fv,
    );
    const big = hand(0.1, 0.62); const small = hand(0.5, -0.18);
    return (
      <g key={key}>
        <polygon className="iso-clock-face" points={polyPoints(pts)} />
        <line className="iso-clock-hand" x1={centre.x} y1={centre.y} x2={big.x} y2={big.y} />
        <line className="iso-clock-hand" x1={centre.x} y1={centre.y} x2={small.x} y2={small.y} />
      </g>
    );
  };

  const domeCentre = lift(project(cc, cr), drumBase + TOWER_DRUM_RISE);
  const domeR = (drumPlan / 2) * TILE_W * 0.55;
  const dome: string[] = [];
  for (let i = 0; i <= 18; i++) {
    const a = Math.PI + (i / 18) * Math.PI;          // a half circle, flat side down
    dome.push(`${(domeCentre.x + Math.cos(a) * domeR).toFixed(2)},${(domeCentre.y + Math.sin(a) * TOWER_DOME_RISE * heightScale()).toFixed(2)}`);
  }
  const finialFoot = lift(domeCentre, TOWER_DOME_RISE);

  return (
    <>
      {sideFaces(shaft, shade(stone.towerStone, 0.98), shade(stone.towerStone, 0.82))}
      <WallBand origin={shaft.D} along={shaft.C} wallHeight={TOWER_BASE_RISE} from={TOWER_BASE_RISE - CORNICE} to={TOWER_BASE_RISE} className="iso-cornice" />
      <WallBand origin={shaft.C} along={shaft.B} wallHeight={TOWER_BASE_RISE} from={TOWER_BASE_RISE - CORNICE} to={TOWER_BASE_RISE} className="iso-cornice" />
      {clock(shaft.D, shaft.C, 'cl')}
      {clock(shaft.C, shaft.B, 'cr')}
      <polygon points={polyPoints(shaft.top)} fill={shade(stone.towerStone, 0.9)} />

      {apex === 'cupola' && (
        <>
          {/* The drum, with shafts at the visible corners and mid-faces. */}
          {sideFaces(drum, shade(stone.towerStone, 0.9), shade(stone.towerStone, 0.76))}
          {(() => {
            const cp = drumPlan * 0.16;
            const dc = cc - drumPlan / 2; const dr = cr - drumPlan / 2;
            const shafts = [
              [dc, dr + drumPlan - cp], [dc + drumPlan - cp, dr + drumPlan - cp], [dc + drumPlan - cp, dr],
              [dc + drumPlan / 2 - cp / 2, dr + drumPlan - cp], [dc + drumPlan - cp, dr + drumPlan / 2 - cp / 2],
            ];
            return depthOrder(shafts.map(([c, r]) => ({ col: c, row: r, w: cp, h: cp }))).map((c, i) => {
              const sf = boxFaces(c.col, c.row, c.w, c.h, drumBase, TOWER_DRUM_RISE);
              return (
                <g key={`dc${i}`}>
                  {sideFaces(sf, shade(stone.towerStone, 1.02), shade(stone.towerStone, 0.88))}
                </g>
              );
            });
          })()}
          <polygon points={polyPoints(drum.top)} fill={shade(stone.towerStone, 1.03)} />

          <polygon className="iso-dome" points={dome.join(' ')} fill={gilded ? stone.gilt : shade(stone.towerStone, 0.92)} />
          {gilded && (
            <>
              <line
                className="iso-finial"
                x1={finialFoot.x} y1={finialFoot.y}
                x2={finialFoot.x} y2={lift(finialFoot, TOWER_FINIAL_RISE).y}
                stroke={stone.gilt}
              />
              <circle className="iso-dome" cx={finialFoot.x} cy={lift(finialFoot, TOWER_FINIAL_RISE).y} r={2.2} fill={stone.gilt} />
            </>
          )}
        </>
      )}

      {apex === 'spire' && (
        <Spire cc={cc} cr={cr} base={drumBase} stone={stone} gilded={gilded} />
      )}
    </>
  );
}

// The spire: a louvred belfry, four corner pinnacles and a tapering
// pyramid on the clock stage (Gothic's answer to the dome). A pyramid, not a
// cone, so its faces follow the same directional lighting as the roofs.
function Spire({ cc, cr, base, stone, gilded }: {
  cc: number; cr: number; base: number; stone: StonePalette; gilded: boolean;
}) {
  const plan = TOWER_BELFRY_PLAN;
  const belfry = boxFaces(cc - plan / 2, cr - plan / 2, plan, plan, base, TOWER_BELFRY_RISE);
  const springs = base + TOWER_BELFRY_RISE;

  // The four corners the spire springs from, and its point.
  const At = lift(project(cc - plan / 2, cr - plan / 2), springs);
  const Bt = lift(project(cc + plan / 2, cr - plan / 2), springs);
  const Ct = lift(project(cc + plan / 2, cr + plan / 2), springs);
  const Dt = lift(project(cc - plan / 2, cr + plan / 2), springs);
  const tip = lift(project(cc, cr), springs + TOWER_SPIRE_RISE);

  // Same lighting order as SLOPE.
  const faces: Array<[Pt, Pt, number]> = [
    [At, Dt, 1.10],   // -col, up-left
    [At, Bt, 1.00],   // -row, up-right
    [Dt, Ct, 0.84],   // +row, down-left
    [Bt, Ct, 0.70],   // +col, down-right
  ];

  return (
    <>
      {/* The belfry, with a louvred opening on each visible face. */}
      {sideFaces(belfry, shade(stone.towerStone, 0.94), shade(stone.towerStone, 0.8))}
      {([[belfry.D, belfry.C, 'bl'] as const, [belfry.C, belfry.B, 'br'] as const]).map(([o, a, k]) => (
        <polygon
          key={k}
          className="iso-louvre"
          points={polyPoints(
            windowOutline('lancet', 0.3, 0.7, 0.12, 0.88)
              .map(([u, v]) => facePoint(o, a, TOWER_BELFRY_RISE, u, v)),
          )}
        />
      ))}

      {/* Corner pinnacles, drawn before the spire (they are shorter than it). */}
      {depthOrder([
        { col: cc - plan / 2, row: cr - plan / 2 },
        { col: cc + plan / 2 - TOWER_PINNACLE_PLAN, row: cr - plan / 2 },
        { col: cc - plan / 2, row: cr + plan / 2 - TOWER_PINNACLE_PLAN },
        { col: cc + plan / 2 - TOWER_PINNACLE_PLAN, row: cr + plan / 2 - TOWER_PINNACLE_PLAN },
      ].map((c) => ({ ...c, w: TOWER_PINNACLE_PLAN, h: TOWER_PINNACLE_PLAN }))).map((c, i) => {
        const f = boxFaces(c.col, c.row, c.w, c.h, springs, TOWER_PINNACLE_RISE);
        const capFoot = lift(project(c.col + c.w / 2, c.row + c.h / 2), springs + TOWER_PINNACLE_RISE);
        const capTip = lift(project(c.col + c.w / 2, c.row + c.h / 2), springs + TOWER_PINNACLE_RISE * 1.6);
        return (
          <g key={i}>
            {sideFaces(f, shade(stone.towerStone, 0.92), shade(stone.towerStone, 0.76))}
            <line
              className="iso-finial"
              x1={capFoot.x} y1={capFoot.y} x2={capTip.x} y2={capTip.y}
              stroke={shade(stone.towerStone, 0.86)}
            />
          </g>
        );
      })}

      {faces.map(([a, b], i) => (
        <polygon key={i} points={polyPoints([a, b, tip])} fill={shade(stone.towerStone, faces[i][2])} />
      ))}
      {/* The weathervane: a Gothic landmark's only metal (see gothic's `gilt`). */}
      {gilded && (
        <>
          <line
            className="iso-finial"
            x1={tip.x} y1={tip.y} x2={tip.x} y2={lift(tip, TOWER_FINIAL_RISE).y}
            stroke={stone.gilt}
          />
          <circle className="iso-dome" cx={tip.x} cy={lift(tip, TOWER_FINIAL_RISE).y} r={1.8} fill={stone.gilt} />
        </>
      )}
    </>
  );
}

// A chimney stack on a ridge: a strong period signal at any zoom.
function Chimney({ cc, cr, base, top, pal, stone }: {
  cc: number; cr: number; base: number; top: number; pal: Palette; stone: StonePalette;
}) {
  const plan = across(1.3);
  const f = boxFaces(cc - plan / 2, cr - plan / 2, plan, plan, base, top - base);
  const cap = boxFaces(cc - plan / 2 - 0.03, cr - plan / 2 - 0.03, plan + 0.06, plan + 0.06, top, up(0.3));
  return (
    <>
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      {sideFaces(cap, shade(stone.trim, 0.78), shade(stone.trim, 0.66))}
      <polygon points={polyPoints(cap.top)} fill={shade(stone.trim, 0.86)} />
    </>
  );
}

// Chimneys along a hipped roof's ridge, footed a little below it so they
// meet the slope.
function ridgeChimneys({ col, row, w, h, base, rise, at, ends = false, pal, stone }: {
  col: number; row: number; w: number; h: number; base: number; rise: number;
  // Positions along the ridge, 0..1. With `ends`, stacks stand on the two
  // hips instead (Georgian end stacks, clear of a central clock tower).
  at: number[]; ends?: boolean; pal: Palette; stone: StonePalette;
}) {
  const alongW = w >= h;
  const inset = Math.min(w, h) / 2;
  const plan = across(1.3);
  const top = base + rise + up(2.2);
  const seg = (alongW ? w : h) - inset * 2;
  const positions = ends ? [-0.4 * inset, seg + 0.4 * inset] : at.map((u) => u * seg);
  return positions.map((d, i) => {
    // On a hip the roof falls to the eaves over `inset`.
    const beyond = d < 0 ? -d : d > seg ? d - seg : 0;
    const foot = base + rise * (1 - beyond / inset) - rise * (plan / Math.min(w, h));
    const cc = alongW ? col + inset + d : col + w / 2;
    const cr = alongW ? row + h / 2 : row + inset + d;
    return <Chimney key={`ch${i}`} cc={cc} cr={cr} base={foot} top={Math.max(top, foot + up(3))} pal={pal} stone={stone} />;
  });
}

// Dormers on the two roof slopes facing the camera: small gabled boxes with
// a lancet each.
function Dormers({ col, row, w, h, base, rise, pal, stone, glass }: {
  col: number; row: number; w: number; h: number; base: number; rise: number;
  pal: Palette; stone: StonePalette; glass: string;
}) {
  const alongW = w >= h;
  const T = 0.34;                    // how far up the slope, eaves to ridge
  const dw = across(2.0); const dd = across(1.6); const dh = up(2.4);
  const out: React.JSX.Element[] = [];
  // Three on the visible long slope, one on the short.
  const seen = visibleWalls();
  const faces: Array<{ outward: FaceDir; count: number }> = [seen.left, seen.right]
    .map((dir) => ({ outward: dir, count: isRowWall(dir) === alongW ? 3 : 1 }));
  for (const { outward, count } of faces) {
    for (let i = 0; i < count; i++) {
      const u = (i + 1) / (count + 1);
      const z = base + rise * T - up(0.4);
      const span = wallSpan(w, h, outward);
      const deep = isRowWall(outward) ? h : w;
      const b = againstWall(col, row, w, h, outward, span * u - dw / 2, dw, dd, T * (deep / 2) + dd / 2);
      const f = boxFaces(b.col, b.row, b.w, b.h, z, dh);
      const frontWall = wallOf(f, outward);
      const front = { o: frontWall.origin, a: frontWall.along };
      const frontTopL = lift(front.o, dh); const frontTopR = lift(front.a, dh);
      const apex = lift({ x: (front.o.x + front.a.x) / 2, y: (front.o.y + front.a.y) / 2 }, dh + up(1.1));
      out.push(
        <g key={`${outward}${i}`}>
          <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
          <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
          <polygon
            className="iso-window"
            fill={glass}
            points={polyPoints(windowOutline('lancet', 0.3, 0.7, 0.15, 0.85).map(([a, b]) => facePoint(front.o, front.a, dh, a, b)))}
          />
          <polygon points={polyPoints(f.top)} fill={shade(pal.roof, 1.06)} />
          <polygon points={polyPoints([frontTopL, frontTopR, apex])} fill={shade(stone.trim, 0.8)} />
        </g>,
      );
    }
  }
  return <>{out}</>;
}

// A small gabled house, the unit of a residential village (campusData.ts's
// village rungs).
function VillageHouse({ col, row, w, h, height, ridge, pal, stone, glass, paneShape, chimney, door }: {
  col: number; row: number; w: number; h: number; height: number; ridge: number; pal: Palette;
  stone: StonePalette; glass: string; paneShape: WindowShape; chimney: boolean; door: 'row' | 'col' | 'none';
}) {
  const f = boxFaces(col, row, w, h, 0, height);
  const alongW = w >= h;
  const rs = lift(alongW ? project(col, row + h / 2) : project(col + w / 2, row), height + ridge);
  const re = lift(alongW ? project(col + w, row + h / 2) : project(col + w / 2, row + h), height + ridge);
  // Small windows per story on both faces, and a door toward the green.
  const storeys = Math.max(1, Math.round(height / STOREY));
  const sills = rankSills(storeys).filter((v) => v + WINDOW_HEIGHT * 0.7 < height);
  const pane = (o: Pt, a: Pt, span: number, key: string, skipMiddle: boolean) => {
    const bays = Math.max(1, Math.round(span * METRES_PER_TILE / 3.2));
    const out: React.JSX.Element[] = [];
    for (let r = 0; r < sills.length; r++) {
      for (let bIdx = 0; bIdx < bays; bIdx++) {
        if (skipMiddle && r === 0 && bIdx === Math.floor(bays / 2)) continue;
        const c = (bIdx + 0.5) / bays; const hw = Math.min(0.09, 0.32 / bays);
        const v0 = sills[r] / height; const v1 = (sills[r] + WINDOW_HEIGHT * 0.7) / height;
        out.push(
          <polygon key={`${key}${r}-${bIdx}`} className="iso-window" fill={glass}
            points={polyPoints(windowOutline(paneShape, c - hw, c + hw, v0, v1).map(([u, v]) => facePoint(o, a, height, u, v)))} />,
        );
      }
    }
    return out;
  };
  const doorOn = (o: Pt, a: Pt) => (
    <polygon className="iso-door" points={polyPoints([
      facePoint(o, a, height, 0.44, 0), facePoint(o, a, height, 0.56, 0),
      facePoint(o, a, height, 0.56, Math.min(0.9, up(2.1) / height)), facePoint(o, a, height, 0.44, Math.min(0.9, up(2.1) / height)),
    ])} />
  );
  const plan = across(1.0);
  const stackAt = alongW ? { cc: col + w * 0.3, cr: row + h / 2 } : { cc: col + w / 2, cr: row + h * 0.3 };
  return (
    <>
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      {pane(f.D, f.C, f.spanLeft, 'l', door === 'row')}
      {pane(f.C, f.B, f.spanRight, 'r', door === 'col')}
      {door === 'row' && doorOn(f.D, f.C)}
      {door === 'col' && doorOn(f.C, f.B)}
      {ridge > 0 ? (
        <>
          <polygon
            points={polyPoints(alongW ? [f.NWt, f.NEt, re, rs] : [f.NWt, f.SWt, re, rs])}
            fill={alongW ? pal.negRow : pal.negCol}
          />
          <polygon
            points={polyPoints(alongW ? [f.SWt, f.SEt, re, rs] : [f.NEt, f.SEt, re, rs])}
            fill={alongW ? pal.posRow : pal.posCol}
          />
          {gableEnds(f, alongW, rs, re, pal)}
          <line className="iso-ridge" x1={rs.x} y1={rs.y} x2={re.x} y2={re.y} />
          {chimney && (
            <Chimney cc={stackAt.cc} cr={stackAt.cr} base={height + ridge * (1 - plan / Math.min(w, h))} top={height + ridge + up(1.6)} pal={pal} stone={stone} />
          )}
        </>
      ) : (
        <polygon points={polyPoints(f.top)} fill={pal.roof} />
      )}
    </>
  );
}

// Village house lots in normalized footprint coordinates (u across, v
// down, 0..1), so the arrangement survives rotation: ranks around a green
// plus a long block, varied in size, ridge direction and stories (two are
// L-shaped) so it does not read as a storage-unit lot. `s` is stories, `d`
// the door's face.
interface VillageLot { u: number; v: number; uw: number; vh: number; s: number; d: 'row' | 'col' | 'none' }
const VILLAGE_HOUSES: VillageLot[] = [
  // The far rank, facing the green: three houses, one of them an L.
  { u: 0.05, v: 0.05, uw: 0.20, vh: 0.16, s: 2, d: 'row' },
  { u: 0.31, v: 0.06, uw: 0.13, vh: 0.20, s: 3, d: 'col' },
  { u: 0.50, v: 0.05, uw: 0.24, vh: 0.15, s: 2, d: 'row' },
  { u: 0.50, v: 0.20, uw: 0.09, vh: 0.14, s: 2, d: 'none' },   // its wing
  // The middle rank, across the green.
  { u: 0.06, v: 0.42, uw: 0.16, vh: 0.20, s: 3, d: 'col' },
  { u: 0.29, v: 0.44, uw: 0.22, vh: 0.14, s: 2, d: 'row' },
  { u: 0.57, v: 0.41, uw: 0.15, vh: 0.21, s: 3, d: 'col' },
  // The near rank.
  { u: 0.05, v: 0.76, uw: 0.24, vh: 0.15, s: 2, d: 'row' },
  { u: 0.36, v: 0.74, uw: 0.13, vh: 0.19, s: 2, d: 'col' },
  { u: 0.55, v: 0.77, uw: 0.20, vh: 0.14, s: 2, d: 'row' },
  { u: 0.75, v: 0.63, uw: 0.09, vh: 0.14, s: 2, d: 'none' },   // a wing on the last one
  // The long block closing the east side.
  { u: 0.86, v: 0.12, uw: 0.09, vh: 0.62, s: 3, d: 'col' },
];

// The village's authored planting.
const VILLAGE_TREES: Array<[number, number, 'canopy' | 'ornamental' | 'conifer', number]> = [
  [0.27, 0.32, 'canopy', 0.9], [0.62, 0.33, 'ornamental', 0.85], [0.80, 0.86, 'canopy', 0.95],
  [0.24, 0.66, 'ornamental', 0.8], [0.03, 0.97, 'conifer', 0.9], [0.96, 0.04, 'conifer', 0.85],
];

// A chapter house's Greek letters (ΑΒΓ), on a pedimented parapet above the
// wall: a one-story chapter house has no room under its eaves. Sized off
// the wall, not the (domestic, narrow) door.
const PEDIMENT_SPAN = 0.62;    // share of the wall the assembly covers
const FRIEZE_DEPTH = 0.16;     // the lettered band, as a share of its own width
const PEDIMENT_PITCH = 0.17;   // and the gable above it
// Cap on the assembly's height as a share of the wall.
const PEDIMENT_MAX_OF_WALL = 0.5;

function ChapterPediment({ glyphs, origin, along, wallHeight, span, doorWidth, cast = false }: {
  glyphs: string;
  origin: Pt; along: Pt;     // the wall's two ends, at its BASE
  wallHeight: number;
  span: number;              // the wall's length in tiles
  doorWidth: number;         // the door's width in tiles
  // Letters cast into the wall, for a vernacular with no applied stonework
  // (and no door to gate a pediment on); every chapter house shows them.
  cast?: boolean;
}) {
  if (!glyphs || span <= 0) return null;
  if (cast) {
    const l = facePoint(origin, along, wallHeight, 0.5 - PEDIMENT_SPAN / 2, 0.72);
    const r = facePoint(origin, along, wallHeight, 0.5 + PEDIMENT_SPAN / 2, 0.72);
    const width = Math.hypot(r.x - l.x, r.y - l.y);
    const slope = (r.y - l.y) / (r.x - l.x || 1);
    const seat = { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 };
    return (
      <text
        className="chapter-letters chapter-letters-cast"
        transform={`matrix(1 ${slope} 0 1 ${seat.x} ${seat.y})`}
        textAnchor="middle"
        fontSize={Math.max(5, Math.min(width * 0.26, wallHeight * 0.2))}
      >
        {glyphs}
      </text>
    );
  }
  if (doorWidth <= 0) return null;
  const half = PEDIMENT_SPAN / 2;
  const left = facePoint(origin, along, wallHeight, 0.5 - half, 1);
  const right = facePoint(origin, along, wallHeight, 0.5 + half, 1);
  const width = Math.hypot(right.x - left.x, right.y - left.y);
  if (width <= 0) return null;

  const fit = Math.min(1, (wallHeight * PEDIMENT_MAX_OF_WALL) / (width * (FRIEZE_DEPTH + PEDIMENT_PITCH)));
  const frieze = width * FRIEZE_DEPTH * fit;
  const rise = width * PEDIMENT_PITCH * fit;

  const bandLeft = lift(left, frieze);
  const bandRight = lift(right, frieze);
  const apex = lift({ x: (bandLeft.x + bandRight.x) / 2, y: (bandLeft.y + bandRight.y) / 2 }, rise);

  // Shear the letters to the wall's slope so they read as cut into it.
  const slope = (right.y - left.y) / (right.x - left.x || 1);
  const seat = lift({ x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 }, frieze * 0.5);

  return (
    <>
      {/* The frieze carries the letters; the gable sits on it. */}
      <polygon className="chapter-pediment" points={polyPoints([left, right, bandRight, bandLeft])} />
      <polygon className="chapter-pediment" points={polyPoints([bandLeft, bandRight, apex])} />
      <text
        className="chapter-letters"
        transform={`matrix(1 ${slope} 0 1 ${seat.x} ${seat.y})`}
        textAnchor="middle"
        fontSize={Math.max(5, Math.min(width * 0.26, frieze * 0.88))}
      >
        {glyphs}
      </text>
    </>
  );
}

// Wraps BuildingMass. A building being extended (a library renovation,
// RENOVATE_LIBRARY) is drawn at its standing height, windows and all, with
// scaffolding on its roof rather than as a ground-level site.
function BuildingMotif({ t, p, material, vernacular, developing, glyphs }: {
  t: Buildable;
  p: { row: number; col: number; w: number; h: number };
  material: Material;
  // Passed as the vernacular itself; every lookup happens at point of use.
  vernacular: Vernacular;
  developing: boolean;
  // A chapter house's letters (ChapterPediment), passed in from the chapter
  // rather than stored on the Buildable so they follow renames and disbanding.
  glyphs?: string;
  // Unused here; compared by the memo so the motif redraws when the view turns.
  camera?: Camera;
}) {
  // The grand landmarks draw themselves, stage by stage (landmarks.tsx).
  if (motifOf(t) === 'landmark') return <Landmark t={t} p={p} developing={developing} />;
  const extending = developing && floorsUnderConstruction(t) > 0 && motifOf(t) !== 'grounds';
  if (!extending) return <BuildingMass t={t} p={p} material={material} vernacular={vernacular} developing={developing} glyphs={glyphs} />;

  const { col, row, w, h } = p;
  const roof = drawnHeightOf(t, true, vernacular);
  return (
    <>
      <BuildingMass t={t} p={p} material={material} vernacular={vernacular} developing glyphs={glyphs} />
      {/* Boarding and poles on the finished roof. */}
      <polygon points={polyPoints(boxFaces(col, row, w, h, roof, 0).top)} fill={`url(#${SCAFFOLD_PATTERN_ID})`} />
      <Scaffolding col={col} row={row} w={w} h={h} height={STOREY * 0.5} base={roof} />
    </>
  );
}

function BuildingMass({ t, p, material, vernacular, developing, glyphs }: {
  t: Buildable;
  p: { row: number; col: number; w: number; h: number };
  material: Material;
  vernacular: Vernacular;
  developing: boolean;
  glyphs?: string;
}) {
  // Stable references off buildingSpec's VERNACULARS table.
  const stone: StonePalette = stoneFor(vernacular);
  const paneShape = paneShapeOf(t, vernacular);
  // The vernacular's parts (buildingSpec's VernacularParts): branches below
  // ask what goes in each slot, so a new vernacular is a table row.
  // `trim` false (Brutalism) skips every stone band.
  const trim = hasTrim(vernacular);
  const entrance = entrancePartOf(t, vernacular);
  const rooflineEnd = rooflineEndPartOf(vernacular);
  const apex = apexPartOf(vernacular);
  const hood = partsFor(vernacular).hood === true;
  const chimneys = partsFor(vernacular).chimneys === true;
  const dormers = partsFor(vernacular).dormers === true;
  const bellGable = partsFor(vernacular).bellGable === true;
  const buttresses = partsFor(vernacular).buttresses === true;
  const turrets = partsFor(vernacular).turrets === true;
  const crenellations = partsFor(vernacular).crenellations === true;
  const lights: 1 | 2 = partsFor(vernacular).pairedLights === true ? 2 : 1;
  const grandPortico = partsFor(vernacular).grandPortico === true;
  const balustrade = partsFor(vernacular).balustrade === true;
  const glazedCivic = partsFor(vernacular).glazedCivic === true;
  // How far a corner tower stands proud of the walls it rises from.
  const TOWER_PROUD = across(0.45);
  // A wall too short for an arcade gets the residential archway if the
  // vernacular has one, else a canopy.
  const shortArcadeFallback: EntrancePart =
    partsFor(vernacular).entrance.residential === 'archway' ? 'archway' : 'canopy';
  // The door's head follows the windows': round where they are round.
  const doorShape = paneShape === 'arched' ? 'arched' : 'rect';
  // Pitched-roof oversail (Mission's deep eaves; zero elsewhere).
  const eaves = eavesOf(vernacular);
  const motif = motifOf(t);
  // A site has nothing standing; an extension has all but its new floors
  // (BuildingMotif). Construction branches below are the site case.
  const inFlight = developing ? floorsUnderConstruction(t) : 0;
  const site = developing && inFlight === 0;
  const { row, col, w, h } = p;
  const pal = paletteFrom(material, wallShadeOf(t));
  // The visible walls, left then right, where entrances and attachments go.
  const seen = visibleWalls();
  const fronts: FaceDir[] = [seen.left, seen.right];
  // Whether the corner tower's (+col, +row) corner is nearer the camera than
  // the mass's middle: if so it paints after the mass, else before.
  const cornerInFront = project(col + w, row + h).y > project(col + w / 2, row + h / 2).y;
  // Base tones for the solid helpers below.
  const tint = pal.wallLeft;
  const roofTint = material.roof;

  // Open ground has no mass; GroundMarking draws its own construction state.
  if (motif === 'grounds') {
    return (
      <GroundMarking
        facilityType={t.facilityType}
        id={t.id}
        tier={t.tier}
        col={col}
        row={row}
        w={w}
        h={h}
        developing={site}
      />
    );
  }

  // A site is a low frame; `full` is what stands (for an extension, all
  // below the floor going up).
  const full = wallHeightOf(t) - inFlight * STOREY;
  const H = site ? Math.max(4, wallHeightOf(t) * 0.16) : full;
  const ridge = site ? 0 : ridgeOf(t, vernacular);
  const f = boxFaces(col, row, w, h, 0, H);
  // One rank per standing story (added floors included); a clear-span
  // volume gets one band near its eaves (buildingSpec's clerestorySill).
  const ranks = windowRanksOf(t) - inFlight;
  const sills = storeysOf(t) - inFlight > 0 ? rankSills(ranks) : [clerestorySill(H)];
  const paneW = windowWidthOf(t);
  const courses = floorLinesOf(t);
  // A recess is the entrance itself: no door leaf or steps.
  const door = entrance === 'recess' ? null : doorOf(t);

  if (motif === 'village') {
    // A plot: lawn, walks, and houses and trees in one depth-ordered list.
    const items = depthOrder([
      ...VILLAGE_HOUSES.map((lot) => ({
        kind: 'house' as const, col: col + w * lot.u, row: row + h * lot.v, w: w * lot.uw, h: h * lot.vh, lot,
      })),
      ...VILLAGE_TREES.map(([u, v, species, scale]) => ({
        kind: 'tree' as const, col: col + w * u - 0.5, row: row + h * v - 0.5, w: 1, h: 1, species, scale,
        lot: undefined as VillageLot | undefined,
      })),
    ]);

    if (site) {
      return (
        <>
          <polygon points={polyPoints(f.top)} fill={shade(tint, 0.9)} />
          <polygon points={polyPoints(f.top)} fill={`url(#${SCAFFOLD_PATTERN_ID})`} />
          <Scaffolding col={col} row={row} w={w} h={h} height={H} />
        </>
      );
    }
    return (
      <>
        <polygon className="ground-lawn" points={polyPoints(boxFaces(col, row, w, h, 0, 0).top)} />
        {/* Mowing stripes on the green. */}
        {[0.2, 0.5, 0.8].map((v) => (
          <polygon key={v} className="ground-mow" points={polyPoints(boxFaces(col, row + h * (v - 0.06), w, h * 0.08, 0, 0).top)} />
        ))}
        {/* One connected walk network reaching every rank. */}
        {([
          [0.02, 0.26, 0.82, 0.05], [0.02, 0.66, 0.82, 0.05],
          [0.02, 0.26, 0.04, 0.45], [0.80, 0.26, 0.04, 0.45],
          [0.26, 0.26, 0.04, 0.45], [0.53, 0.26, 0.04, 0.45],
          [0.02, 0.98, 0.82, 0.02],
        ] as const).map(([u, v, uw, vh], i) => (
          <polygon key={`wk${i}`} className="ground-walk-fill" points={polyPoints(boxFaces(col + w * u, row + h * v, w * uw, h * vh, 0, 0).top)} />
        ))}
        {/* A hedge along the plot's far edges. */}
        <polygon className="ground-hedge-top" points={polyPoints(boxFaces(col, row, w * 0.84, 0.18, 0, 0).top.map((q) => lift(q, 5)))} />
        <polygon className="ground-hedge-top" points={polyPoints(boxFaces(col, row, 0.18, h, 0, 0).top.map((q) => lift(q, 5)))} />
        {items.map((it, i) => (it.kind === 'tree' ? (
          <TreeAt key={i} col={it.col + 0.5} row={it.row + 0.5} species={it.species} scale={it.scale} />
        ) : (
          <VillageHouse
            key={i}
            col={it.col} row={it.row} w={it.w} h={it.h}
            height={Math.min(full, it.lot!.s * STOREY)}
            ridge={ridge * (it.lot!.s >= 3 ? 1 : 0.85)}
            pal={pal} stone={stone} glass={stone.glass} paneShape={paneShape}
            chimney={chimneys} door={it.lot!.d}
          />
        )))}
      </>
    );
  }

  if (motif === 'tower') {
    // A retail podium over the whole footprint (campusData.ts's
    // TOWER_RETAIL_SERVES), with an inset shaft carried up from it.
    const PODIUM_H = TOWER_PODIUM_STOREYS * STOREY;
    // The shopfront door, measured against the podium's height, not the shaft's.
    const podiumDoor = doorDimensions('shopfront');
    const inset = 0.17;
    const sc = col + w * inset; const sr = row + h * inset;
    const sw = w * (1 - inset * 2); const sh = h * (1 - inset * 2);

    if (site) {
      return (
        <>
          <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
          <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
          <polygon points={polyPoints(f.top)} fill={shade(tint, 0.9)} />
          <polygon points={polyPoints(f.top)} fill={`url(#${SCAFFOLD_PATTERN_ID})`} />
          <Scaffolding col={col} row={row} w={w} h={h} height={H} />
        </>
      );
    }

    const pod = boxFaces(col, row, w, h, 0, PODIUM_H);
    const shaft = boxFaces(sc, sr, sw, sh, PODIUM_H, H - PODIUM_H);
    // The shaft carries every story the tower has except the podium's.
    const shaftRanks = Math.max(1, storeysOf(t) - TOWER_PODIUM_STOREYS);
    const shaftSills = rankSills(shaftRanks);
    const shaftW = windowWidthOf(t);
    return (
      <>
        {/* Podium: one tall rank of shopfront. */}
        {sideFaces(pod, shade(tint, 0.88), shade(tint, 0.70))}
        {windows(pod.D, pod.C, PODIUM_H, pod.spanLeft, [SHOPFRONT_SILL], SHOPFRONT_WIDTH, 'pl', paneShape, stone.glass, doorBay(podiumDoor, pod.spanLeft, PODIUM_H))}
        {windows(pod.C, pod.B, PODIUM_H, pod.spanRight, [SHOPFRONT_SILL], SHOPFRONT_WIDTH, 'pr', paneShape, stone.glass, doorBay(podiumDoor, pod.spanRight, PODIUM_H))}
        <Door d={podiumDoor} origin={pod.D} along={pod.C} wallHeight={PODIUM_H} span={pod.spanLeft} />
        <Door d={podiumDoor} origin={pod.C} along={pod.B} wallHeight={PODIUM_H} span={pod.spanRight} />
        <polygon points={polyPoints(pod.top)} fill={pal.roofDeck} />

        {/* The shaft, ranked floor by floor. */}
        <polygon points={polyPoints(shaft.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(shaft.right)} fill={pal.wallRight} />
        {windows(shaft.D, shaft.C, H - PODIUM_H, shaft.spanLeft, shaftSills, shaftW, 'tl', paneShape, stone.glass)}
        {windows(shaft.C, shaft.B, H - PODIUM_H, shaft.spanRight, shaftSills, shaftW, 'tr', paneShape, stone.glass)}
        <polygon points={polyPoints(shaft.top)} fill={pal.roof} />
        {/* Lift overrun and plant on the roof. */}
        <RoofBox
          col={sc + sw * 0.24} row={sr + sh * 0.24} w={sw * 0.5} h={sh * 0.5}
          base={H} height={16} tint={tint}
        />
      </>
    );
  }

  if (motif === 'bowl') {
    // Four raked banks around a gridiron on a concourse. Keep the corners
    // open (a mitred ring reads as a tray), the home side taller than the
    // visitor side, and floodlight masts at the corners.
    const d = Math.min(w, h) * 0.2;           // stand depth, in tiles
    const iCol = col + d; const iRow = row + d;
    const iW = w - d * 2; const iH = h - d * 2;
    const bottom = H * 0.18;
    const fills = (f: number) => ({
      rakeFill: shade(tint, f),
      wallFill: shade(tint, f * 0.82),
      seatStroke: 'rgba(42, 56, 28, 0.30)',
    });
    const concourse = shade(tint, 0.9);
    const T = (c: number, r: number): TilePt => [c, r];

    // A site under construction is the bowl's earthworks, not a stadium.
    if (site) {
      return (
        <>
          <GroundSite col={col} row={row} w={w} h={h} />
          <Scaffolding col={col} row={row} w={w} h={h} height={H} />
        </>
      );
    }

    // The far banks climb away from the camera and show their steps; the
    // near two show their backs and the tops of their treads.
    const north = (
      <RakedStand outer={[T(iCol, row), T(iCol + iW, row)]} inner={[T(iCol, iRow), T(iCol + iW, iRow)]}
        bottomH={bottom} topH={H * 0.85} rows={7} aisles={3} {...fills(1.0)} />
    );
    const south = (
      <RakedStand outer={[T(iCol, row + h), T(iCol + iW, row + h)]} inner={[T(iCol, iRow + iH), T(iCol + iW, iRow + iH)]}
        bottomH={bottom} topH={H * 0.85} rows={7} aisles={3} wall {...fills(0.8)} />
    );
    // The visitors' side: lower.
    const east = (
      <RakedStand outer={[T(col + w, iRow), T(col + w, iRow + iH)]} inner={[T(iCol + iW, iRow), T(iCol + iW, iRow + iH)]}
        bottomH={bottom} topH={H * 0.62} rows={5} aisles={2} wall {...fills(0.72)} />
    );
    // The home side: lower deck, stepped-back upper deck, soffit, press box.
    const lowerBack = col + d * 0.42;
    const upperFront = col + d * 0.5;
    const lowerTop = H * 0.7;
    const upperBase = H * 0.86;
    const upperTop = H * 1.32;
    const at = (c: number, r: number, z: number) => lift(project(c, r), z);
    const pressBox = boxFaces(col + 0.05, row + h * 0.32, Math.min(0.75, d * 0.25), h * 0.36, upperTop, up(3.2));
    const west = (
      <>
        <RakedStand outer={[T(col, iRow), T(col, iRow + iH)]} inner={[T(upperFront, iRow), T(upperFront, iRow + iH)]}
          bottomH={upperBase} topH={upperTop} rows={6} aisles={3} {...fills(1.04)} />
        <polygon className="iso-undercroft" points={polyPoints([
          at(lowerBack, iRow, lowerTop), at(lowerBack, iRow + iH, lowerTop),
          at(upperFront, iRow + iH, upperBase), at(upperFront, iRow, upperBase),
        ])} />
        <RakedStand outer={[T(lowerBack, iRow), T(lowerBack, iRow + iH)]} inner={[T(iCol, iRow), T(iCol, iRow + iH)]}
          bottomH={bottom} topH={lowerTop} rows={6} aisles={3} {...fills(1.0)} />
        {sideFaces(pressBox, shade(stone.trim, 0.82), shade(stone.trim, 0.7))}
        <WallBand origin={pressBox.C} along={pressBox.B} wallHeight={up(3.2)} from={up(0.9)} to={up(2.6)} className="iso-undercroft" />
        <polygon points={polyPoints(pressBox.top)} fill={shade(stone.trim, 0.95)} />
      </>
    );

    // Floodlight masts at the concourse corners, in screen space.
    const mast = (c: number, r: number, key: string) => {
      const foot = project(c, r);
      const top = lift(foot, H * 2.3);
      return (
        <g key={key}>
          <line className="ground-mast" x1={foot.x} y1={foot.y} x2={top.x} y2={top.y} />
          <polygon className="ground-mast-head" points={polyPoints([
            { x: top.x - 8, y: top.y + 1 }, { x: top.x + 8, y: top.y + 1 }, { x: top.x + 8, y: top.y - 5 }, { x: top.x - 8, y: top.y - 5 },
          ])} />
        </g>
      );
    };
    const m = d * 0.45;

    // The scoreboard, on posts behind the north end.
    const board = (() => {
      const bw = Math.min(3.2, iW * 0.3); const bd = 0.35;
      const bc = col + w / 2 - bw / 2; const br = row + d * 0.12;
      const base = H * 0.98; const height = up(4.6);
      const f = boxFaces(bc, br, bw, bd, base, height);
      return (
        <>
          <line className="ground-post" x1={project(bc + 0.2, br + bd / 2).x} y1={project(bc + 0.2, br + bd / 2).y} x2={project(bc + 0.2, br + bd / 2).x} y2={project(bc + 0.2, br + bd / 2).y - base} />
          <line className="ground-post" x1={project(bc + bw - 0.2, br + bd / 2).x} y1={project(bc + bw - 0.2, br + bd / 2).y} x2={project(bc + bw - 0.2, br + bd / 2).x} y2={project(bc + bw - 0.2, br + bd / 2).y - base} />
          <polygon points={polyPoints(f.left)} fill="#3a3d40" />
          <polygon points={polyPoints(f.right)} fill="#2d2f31" />
          <polygon points={polyPoints(f.top)} fill="#4a4d50" />
          <WallBand origin={f.D} along={f.C} wallHeight={height} from={height * 0.18} to={height * 0.82} className="ground-scoreboard-face" />
        </>
      );
    })();

    return (
      <>
        {/* The concourse, so the open corners show concrete. */}
        <polygon points={polyPoints(f.top)} fill={concourse} />
        {mast(col + m, row + m, 'm0')}
        {mast(col + w - m, row + m, 'm1')}
        {board}
        {north}
        {west}
        <StadiumField col={iCol} row={iRow} w={iW} h={iH} />
        {south}
        {east}
        {mast(col + m, row + h - m, 'm2')}
        {mast(col + w - m, row + h - m, 'm3')}
      </>
    );
  }

  if (motif === 'block' && !site && Math.min(w, h) >= BLOCK_SPLIT_MIN_TILES) {
    // The hospital: a tall ward slab at the back and a lower glazed public
    // wing in front. Only large `block`s split (BLOCK_SPLIT_MIN_TILES); small
    // ones read better as one box.
    const slabStoreys = storeysOf(t);
    const wingStoreys = Math.max(2, Math.round(slabStoreys * WING_STOREY_FRACTION));
    const slabH = slabStoreys * STOREY;
    const wingH = wingStoreys * STOREY;
    const undercroft = UNDERCROFT_STOREYS * STOREY;
    const slab = { col, row, w, h: h * SLAB_ROW_FRACTION };
    const wing = {
      col, row: row + h * SLAB_ROW_FRACTION,
      w: w * WING_COL_FRACTION, h: h * (1 - SLAB_ROW_FRACTION),
    };
    const sf = boxFaces(slab.col, slab.row, slab.w, slab.h, 0, slabH);
    const wf = boxFaces(wing.col, wing.row, wing.w, wing.h, 0, wingH);
    const lines = (storeys: number) => Array.from({ length: storeys - 1 }, (_, i) => (i + 1) * STOREY);
    const slabSills = rankSills(slabStoreys).filter((v) => v >= undercroft);
    const undercroftBand = (o: Pt, a: Pt, wh: number) => (
      <WallBand origin={o} along={a} wallHeight={wh} from={0} to={undercroft} className="iso-undercroft" />
    );
    const eaves = (o: Pt, a: Pt, wh: number) => (
      <WallBand origin={o} along={a} wallHeight={wh} from={wh - EAVES_COURSE} to={wh} className="iso-cornice" />
    );

    // Nearer volume paints second; the wing's entrance goes on a visible
    // wall it does not share with the slab.
    const wingInFront = occludes(wing, slab) !== -1;
    const wingFront = seen.left === 'negRow' ? seen.right : seen.left;
    const wingWall = wallOf(wf, wingFront);
    const wingSpan = wallSpan(wing.w, wing.h, wingFront);
    const slabNode = (
      <>
        {/* The ward slab, across the back. */}
        <polygon points={polyPoints(sf.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(sf.right)} fill={pal.wallRight} />
        {floorCourses(sf.D, sf.C, slabH, lines(slabStoreys), 'sl')}
        {floorCourses(sf.C, sf.B, slabH, lines(slabStoreys), 'sr')}
        {windows(sf.D, sf.C, slabH, sf.spanLeft, slabSills, paneW, 'sl', paneShape, stone.glass)}
        {windows(sf.C, sf.B, slabH, sf.spanRight, slabSills, paneW, 'sr', paneShape, stone.glass)}
        {undercroftBand(sf.D, sf.C, slabH)}
        {undercroftBand(sf.C, sf.B, slabH)}
        {eaves(sf.D, sf.C, slabH)}
        {eaves(sf.C, sf.B, slabH)}
        <polygon points={polyPoints(sf.top)} fill={pal.roofDeck} />
        {[[0.08, 0.16, 0.26, 0.34], [0.40, 0.12, 0.22, 0.30], [0.70, 0.20, 0.24, 0.36]]
          .map(([fx, fy, fw, fh], i) => (
            <RoofBox
              key={i} col={slab.col + slab.w * fx} row={slab.row + slab.h * fy}
              w={slab.w * fw} h={slab.h * fh} base={slabH} height={15} tint={roofTint}
            />
          ))}
        {(() => {
          // The helipad: a ring and an H on the slab's deck.
          const hc = slab.col + slab.w * 0.5; const hr = slab.row + slab.h * 0.76;
          const R = across(4.5);
          const ring = projectedCircle(hc, hr, R, 28).map((q) => lift(q, slabH));
          const bar = (c0: number, r0: number, c1: number, r1: number) => polyPoints(boxFaces(c0, r0, c1 - c0, r1 - r0, slabH, 0).top);
          const a = R * 0.42; const th = R * 0.16;
          return (
            <>
              <polygon className="iso-helipad" points={polyPoints(ring)} />
              <polygon className="iso-helipad-mark" points={bar(hc - a, hr - a, hc - a + th, hr + a)} />
              <polygon className="iso-helipad-mark" points={bar(hc + a - th, hr - a, hc + a, hr + a)} />
              <polygon className="iso-helipad-mark" points={bar(hc - a, hr - th / 2, hc + a, hr + th / 2)} />
            </>
          );
        })()}
      </>
    );
    const wingNode = (
      <>
        {/* The public wing: curtain wall on the long face, cross on the end. */}
        <polygon points={polyPoints(wf.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(wf.right)} fill={pal.wallRight} />
        <CurtainWall
          origin={wingWall.origin} along={wingWall.along} wallHeight={wingH} spanTiles={wingSpan}
          from={undercroft} floors={lines(wingStoreys)} id="wl"
        />
        {undercroftBand(wf.D, wf.C, wingH)}
        {undercroftBand(wf.C, wf.B, wingH)}
        {eaves(wf.D, wf.C, wingH)}
        {eaves(wf.C, wf.B, wingH)}
        <polygon points={polyPoints(wf.top)} fill={pal.roofDeck} />
        <RedCross
          origin={wf.C} along={wf.B} wallHeight={wingH} spanTiles={wf.spanRight}
          centreU={0.5} centreV={(wingH - STOREY * 1.1) / wingH}
        />

        {/* The way in, under the glazed front. */}
        {door && <Door d={door} origin={wingWall.origin} along={wingWall.along} wallHeight={wingH} span={wingSpan} />}
        {door && (
          <Canopy stone={stone}
            d={door} col={wing.col} row={wing.row} w={wing.w} h={wing.h}
            outward={wingFront} wallHeight={wingH}
          />
        )}
      </>
    );
    return wingInFront ? <>{slabNode}{wingNode}</> : <>{wingNode}{slabNode}</>;
  }

  if (motif === 'hall' && !site && massingOf(t, vernacular) === 'stacked') {
    // A stacked hall: shape only, no bands; entrance and apex still come
    // from the parts table.
    return (
      <>
        <StackedMass
          col={col} row={row} w={w} h={h} height={H}
          pal={pal} stone={stone} paneShape={paneShape} paneW={paneW}
          ranks={windowRanksOf(t)}
        />
        {hasClockTower(t) && apex === 'core' && (
          <StairCore stone={stone} col={col} row={row} w={w} h={h} base={H} />
        )}
        {entrance === 'recess' && (
          <>
            {fronts.map((dir) => <Recess key={dir} pal={pal} col={col} row={row} w={w} h={h} wallHeight={H * STACK_LOWER_TOP} outward={dir} />)}
          </>
        )}
      </>
    );
  }

  if (motif === 'hall' && !site) {
    // The academic hall, painted in build order: mass, what is applied to
    // it, what stands on it, what stands in front of it. The wall runs to the
    // top of the parapet (one height; not a second box, which would cover
    // the windows).
    const parapet = parapetOf(vernacular);
    const WH = H + parapet;
    // How far the entrance's face stands in front of the wall. An arcade
    // is entered at grade and gets no steps.
    const entranceStandoff = entrance === 'portico'
      ? PAVILION_DEPTH + PORTICO_STANDOFF + PORTICO_COLUMN_PLAN
      : entrance === 'porch' ? PAVILION_DEPTH : 0;
    const flights = entrance !== 'arcade';
    const hf = boxFaces(col, row, w, h, 0, WH);
    const endPlan = Math.min(END_PAVILION_PLAN, Math.min(w, h) * 0.28);
    const towerPlan = Math.min(across(7.5), Math.min(w, h) * 0.26);
    // The roof sets back behind a parapet; with no parapet it springs
    // straight off the eaves.
    const inset = parapet > 0 ? Math.min(0.3, Math.min(w, h) * 0.06) : 0;

    const band = (from: number, to: number, className: string, key: string) => (
      <>
        <WallBand key={`${key}l`} origin={hf.D} along={hf.C} wallHeight={WH} from={from} to={to} className={className} />
        <WallBand key={`${key}r`} origin={hf.C} along={hf.B} wallHeight={WH} from={from} to={to} className={className} />
      </>
    );
    const turretNode = (
      <CornerTower pal={pal} glass={stone.glass} paneW={paneW}
        col={col + w - towerPlan + TOWER_PROUD} row={row + h - towerPlan + TOWER_PROUD} plan={towerPlan}
        height={WH + STOREY * 1.9} sills={rankSills(ranks + 2)} crenels={crenellations} capRise={up(5.0)}
      />
    );
    return (
      <>
        {turrets && !cornerInFront && turretNode}
        <polygon points={polyPoints(hf.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(hf.right)} fill={pal.wallRight} />

        {/* Floor courses, plinth, cornice and parapet. */}
        {trim && floorCourses(hf.D, hf.C, WH, courses, 'l')}
        {trim && floorCourses(hf.C, hf.B, WH, courses, 'r')}
        {trim && band(0, PLINTH, 'iso-plinth', 'p')}
        {trim && band(H - CORNICE, H, 'iso-cornice', 'c')}
        {trim && parapet > 0 && band(H, WH, 'iso-parapet', 'q')}

        {/* Reserve the door's bay here even though the door is on the pavilion. */}
        {windows(hf.D, hf.C, WH, hf.spanLeft, sills, paneW, 'l', paneShape, stone.glass, door ? doorBay(door, hf.spanLeft, WH) : undefined, lights)}
        {windows(hf.C, hf.B, WH, hf.spanRight, sills, paneW, 'r', paneShape, stone.glass, door ? doorBay(door, hf.spanRight, WH) : undefined, lights)}

        {buttresses && (
          <>
            {fronts.map((dir) => { const s = wallSpan(w, h, dir); return (
              <Buttresses key={dir} pal={pal} stone={stone} col={col} row={row} w={w} h={h} height={H} outward={dir}
                reserve={[0.5 - pavilionWidth(s) / s / 2, 0.5 + pavilionWidth(s) / s / 2]} skipNear={turrets ? towerPlan : 0} />
              ); })}
          </>
        )}

        {/* The gutter behind the parapet; without it the lawn shows through
            the roof's inset. */}
        {parapet > 0 && (
          <polygon points={polyPoints(boxFaces(col, row, w, h, 0, WH).top)} fill={pal.roofDeck} />
        )}
        {/* Deep eaves: a shadow band at the wall head, and roof oversail. */}
        {eaves > 0 && band(H - up(0.9), H, 'iso-eaves-shadow', 's')}
        {ridge > 0 ? (
          <HippedRoof
            col={col + inset - eaves} row={row + inset - eaves} w={w - inset * 2 + eaves * 2} h={h - inset * 2 + eaves * 2}
            base={WH} rise={ridge} pal={pal}
          />
        ) : (
          // No ridge (Modern): one flat deck.
          <polygon points={polyPoints(boxFaces(col + inset, row + inset, w - inset * 2, h - inset * 2, WH, 0).top)} fill={pal.roof} />
        )}
        {balustrade && parapet > 0 && (
          <>
            {fronts.map((dir) => <Balustrade key={dir} pal={pal} stone={stone} col={col} row={row} w={w} h={h} base={WH} outward={dir} />)}
          </>
        )}
        {chimneys && ridgeChimneys({ col: col + inset, row: row + inset, w: w - inset * 2, h: h - inset * 2, base: WH, rise: ridge, at: [], ends: true, pal, stone })}
        {dormers && <Dormers col={col + inset} row={row + inset} w={w - inset * 2} h={h - inset * 2} base={WH} rise={ridge} pal={pal} stone={stone} glass={stone.glass} />}
        {/* Raised roofline ends, after the roof so they close it. */}
        {rooflineEnd === 'pavilion' && ([
          // [col, row, w, h] of each raised end, hugging the wall it caps.
          [col, row + h - END_PAVILION_DEPTH, endPlan, END_PAVILION_DEPTH],
          [col + w - endPlan, row + h - END_PAVILION_DEPTH, endPlan, END_PAVILION_DEPTH],
          [col + w - END_PAVILION_DEPTH, row, END_PAVILION_DEPTH, endPlan],
          [col + w - END_PAVILION_DEPTH, row + h - endPlan, END_PAVILION_DEPTH, endPlan],
        ] as const).map(([ec, er, ew, eh], i) => (
          <EndPavilion stone={stone} key={`e${i}`} col={ec} row={er} w={ew} h={eh} base={WH} pal={pal} />
        ))}

        {/* The corner tower, after the roof and before the porch. */}
        {turrets && cornerInFront && turretNode}
        {/* The bell-gable, on every hall but the campanile's. */}
        {bellGable && !hasClockTower(t) && (
          <BellGable pal={pal} stone={stone}
            origin={hf.D} along={hf.C}
            inward={gableInward(col, row, w, h)}
            wallHeight={WH} span={hf.spanLeft} centreU={0.5} sideAt="u1"
          />
        )}
        {/* hasClockTower picks the building; the vernacular picks the apex. */}
        {hasClockTower(t) && apex === 'campanile' && (
          <Campanile stone={stone} pal={pal} gilded={hasGilt(vernacular)}
            col={col} row={row} w={w} h={h} base={WH + ridge * 0.4} />
        )}
        {hasClockTower(t) && apex === 'dome' && (
          <Dome stone={stone} col={col} row={row} w={w} h={h} base={WH + ridge * 0.4} />
        )}
        {hasClockTower(t) && apex !== 'none' && apex !== 'core' && apex !== 'campanile' && apex !== 'dome' && (
          <ClockTower stone={stone} apex={apex} gilded={hasGilt(vernacular)} col={col} row={row} w={w} h={h} base={WH + ridge * 0.4} />
        )}
        {hasClockTower(t) && apex === 'core' && (
          <StairCore stone={stone} col={col} row={row} w={w} h={h} base={WH} />
        )}

        {/* Entrances last, painting over their wall. The centre bay belongs
            to the portico entrance; other vernaculars bring their own. */}
        {entrance === 'portico' && (
          <>
            {fronts.map((dir) => (
              <CentrePavilion key={dir} paneShape={paneShape} glass={stone.glass}
                col={col} row={row} w={w} h={h} wallHeight={H} outward={dir}
                pal={pal} door={door} sills={sills} paneW={paneW}
              />
            ))}
            {/* Four columns to the second floor, or (grandPortico) six to
                the eaves under a pediment. */}
            {fronts.map((dir) => {
              const span = wallSpan(w, h, dir);
              const at = outsideWall(col, row, w, h, dir, span / 2, PAVILION_DEPTH + PORTICO_STANDOFF);
              return (
                <Portico key={dir} stone={stone}
                  centreCol={at.col} centreRow={at.row}
                  width={pavilionWidth(span) * (grandPortico ? 1.2 : 1)} outward={dir}
                  columns={grandPortico ? 6 : PORTICO_COLUMNS}
                  height={grandPortico ? H - ENTABLATURE - up(0.3) : PORTICO_HEIGHT} pediment={grandPortico}
                />
              );
            })}
          </>
        )}
        {entrance === 'canopy' && door && (
          <>
            <Door d={door} origin={hf.D} along={hf.C} wallHeight={WH} span={hf.spanLeft} shape={doorShape} />
            <Door d={door} origin={hf.C} along={hf.B} wallHeight={WH} span={hf.spanRight} shape={doorShape} />
            {fronts.map((dir) => <Canopy key={dir} stone={stone} d={door} col={col} row={row} w={w} h={h} outward={dir} wallHeight={H} hood={hood} roof={material.roof} />)}
          </>
        )}
        {entrance === 'porch' && (
          <>
            {fronts.map((dir) => (
              <Porch key={dir} pal={pal} stone={stone}
                col={col} row={row} w={w} h={h} wallHeight={H} outward={dir}
              />
            ))}
          </>
        )}
        {entrance === 'recess' && (
          <>
            {fronts.map((dir) => <Recess key={dir} pal={pal} col={col} row={row} w={w} h={h} wallHeight={H} outward={dir} />)}
          </>
        )}
        {entrance === 'arcade' && (
          <>
            {fronts.map((dir) => <Arcade key={dir} pal={pal} stone={stone} col={col} row={row} w={w} h={h} outward={dir} height={arcadeHeight(H)} />)}
          </>
        )}
        {/* Steps land at the entrance's front (entranceStandoff). */}
        {door && flights && fronts.map((dir) => {
          const span = wallSpan(w, h, dir);
          const at = outsideWall(col, row, w, h, dir, span / 2, entranceStandoff);
          const out = outwardOf(dir);
          return (
            <EntranceSteps key={dir} stone={stone}
              d={door} centreCol={at.col} centreRow={at.row}
              outCol={out.col} outRow={out.row} span={span}
            />
          );
        })}
      </>
    );
  }

  if (motif === 'hangar' && !site) {
    // Clear-span sheds: pier-and-panel walls lit by a band near the eaves,
    // in four silhouettes, the same in every vernacular:
    //   fitness    box, monitor roof, glazed entrance bay, canopy
    //   arena      barrel vault over a glazed concourse
    //   natatorium glazed long face showing the pool, monopitch roof, flue
    //   studio     blank sound stage with a roller door
    const kind: 'fitness' | 'arena' | 'natatorium' | 'studio' =
      t.facilityType === 'athleticsArena' ? 'arena'
        : t.facilityType === 'athleticsNatatorium' ? 'natatorium'
          : t.id === 'LAB-FILM' ? 'studio' : 'fitness';
    const alongW = w >= h;
    const SHED_GLASS = 'rgba(52, 72, 84, 0.6)';
    const clere = [clerestorySill(H)];
    const glassHead = Math.min(STOREY * 1.3, clerestorySill(H) - up(0.5));
    const left = { o: f.D, a: f.C, span: f.spanLeft };
    const right = { o: f.C, a: f.B, span: f.spanRight };
    const longFace = alongW ? left : right;
    const shortFace = alongW ? right : left;

    const courses = ([[f.D, f.C] as const, [f.C, f.B] as const]).map(([o, a], i) => (
      <g key={`b${i}`}>
        <WallBand origin={o} along={a} wallHeight={H} from={0} to={BASE_COURSE} className="iso-plinth" />
        <WallBand origin={o} along={a} wallHeight={H} from={H - EAVES_COURSE} to={H} className="iso-cornice" />
      </g>
    ));
    const piers = (
      <>
        {fronts.map((dir) => <Piers key={dir} stone={stone} col={col} row={row} w={w} h={h} height={H} outward={dir} pal={pal} />)}
      </>
    );
    const doors = door && (
      <>
        <Door d={door} origin={f.D} along={f.C} wallHeight={H} span={f.spanLeft} />
        <Door d={door} origin={f.C} along={f.B} wallHeight={H} span={f.spanRight} />
        {fronts.map((dir) => {
          const span = wallSpan(w, h, dir);
          const at = outsideWall(col, row, w, h, dir, span / 2, 0);
          const out = outwardOf(dir);
          return <EntranceSteps key={dir} stone={stone} d={door} centreCol={at.col} centreRow={at.row} outCol={out.col} outRow={out.row} span={span} />;
        })}
      </>
    );
    // The clerestory: one continuous band under the eaves.
    const clerestory = (face: { o: Pt; a: Pt; span: number }, key: string) =>
      windows(face.o, face.a, H, face.span, clere, paneW, key, 'ribbon', SHED_GLASS, door ? doorBay(door, face.span, H) : undefined);

    // The monitor: a raised box along the ridge with a rooflight on top.
    const monitor = (() => {
      const mc = alongW ? col + w * 0.05 : col + w * 0.31;
      const mr = alongW ? row + h * 0.31 : row + h * 0.05;
      const mw = alongW ? w * 0.9 : w * 0.38;
      const mh = alongW ? h * 0.38 : h * 0.9;
      const rise = up(2.2);
      const box = boxFaces(mc, mr, mw, mh, H, rise);
      const light = boxFaces(
        mc + (alongW ? mw * 0.03 : mw * 0.3), mr + (alongW ? mh * 0.3 : mh * 0.03),
        alongW ? mw * 0.94 : mw * 0.4, alongW ? mh * 0.4 : mh * 0.94, H + rise, 0,
      );
      return (
        <>
          {sideFaces(box, shade(pal.roof, 0.9), shade(pal.roof, 0.76))}
          <polygon points={polyPoints(box.top)} fill={pal.roofDeck} />
          <polygon className="iso-rooflight" points={polyPoints(light.top)} />
        </>
      );
    })();

    if (kind === 'arena') {
      // A faceted barrel vault down the long axis, closed at the near end,
      // over a glazed ground-floor concourse.
      const VAULT = up(6.5);
      const N = 7;
      const along0 = 0.015; const along1 = 0.985;
      const pt = (a: number, c: number, z: number) => lift(
        alongW ? project(col + w * a, row + h * c) : project(col + w * c, row + h * a), z,
      );
      const zAt = (c: number) => H + VAULT * Math.sin(Math.PI * c);
      const facets = Array.from({ length: N }, (_, i) => {
        const c0 = i / N; const c1 = (i + 1) / N; const cm = (c0 + c1) / 2;
        return (
          <polygon
            key={i}
            points={polyPoints([pt(along0, c0, zAt(c0)), pt(along1, c0, zAt(c0)), pt(along1, c1, zAt(c1)), pt(along0, c1, zAt(c1))])}
            fill={shade(pal.roof, 1.14 - 0.44 * cm)}
          />
        );
      });
      const endFace = (
        <polygon
          points={polyPoints(Array.from({ length: N + 1 }, (_, i) => pt(along1, i / N, zAt(i / N))))}
          fill={alongW ? pal.wallRight : pal.wallLeft}
        />
      );
      return (
        <>
          <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
          <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
          {piers}
          {courses}
          <CurtainWall origin={f.D} along={f.C} wallHeight={H} spanTiles={f.spanLeft} from={BASE_COURSE} to={glassHead} floors={[]} id="al" />
          <CurtainWall origin={f.C} along={f.B} wallHeight={H} spanTiles={f.spanRight} from={BASE_COURSE} to={glassHead} floors={[]} id="ar" />
          {doors}
          <polygon points={polyPoints(f.top)} fill={pal.roof} />
          {facets}
          {endFace}
        </>
      );
    }

    if (kind === 'natatorium') {
      // Glass long face with a pool band, a monopitch roof falling toward
      // it, and a flue at the back corner.
      const RISE = up(3.0);
      // Grid-fixed corners: the high edge is -row (or -col) at any camera.
      const NW = f.NWt; const NE = f.NEt; const SE = f.SEt; const SW = f.SWt;
      const roof = alongW
        ? [lift(NW, RISE), lift(NE, RISE), SE, SW]      // high along the -row edge
        : [lift(NW, RISE), NE, SE, lift(SW, RISE)];     // high along the -col edge
      // The triangle above the eaves on each visible short wall.
      const gableEnd = (dir: FaceDir) => {
        if (!wallOf(f, dir).visible) return null;
        const pts = dir === 'posCol' ? [SE, NE, lift(NE, RISE)]
          : dir === 'negCol' ? [SW, NW, lift(NW, RISE)]
            : dir === 'posRow' ? [SW, SE, lift(SW, RISE)]
              : [NE, NW, lift(NW, RISE)];
        return <polygon key={dir} points={polyPoints(pts)} fill={pal.wall[dir]} />;
      };
      const gable = alongW ? ['posCol', 'negCol'] as const : ['posRow', 'negRow'] as const;
      // The extra strip of the high long wall, when visible.
      const highWall = alongW ? 'negRow' as const : 'negCol' as const;
      const highStrip = wallOf(f, highWall).visible
        ? (
          <polygon
            points={polyPoints(alongW ? [NW, NE, lift(NE, RISE), lift(NW, RISE)] : [NW, SW, lift(SW, RISE), lift(NW, RISE)])}
            fill={pal.wall[highWall]}
          />
        )
        : null;
      const flue = boxFaces(col + 0.25, row + 0.25, 0.45, 0.45, H + RISE * 0.9, up(4.5));
      const roofFill = alongW ? pal.negRow : pal.negCol;
      return (
        <>
          <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
          <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
          {piers}
          {courses}
          <CurtainWall origin={longFace.o} along={longFace.a} wallHeight={H} spanTiles={longFace.span} from={BASE_COURSE} floors={[]} id="nl" />
          <WallBand origin={longFace.o} along={longFace.a} wallHeight={H} from={up(1.1)} to={up(2.4)} className="iso-pool-glimpse" u0={0.06} u1={0.94} />
          {clerestory(shortFace, 'ns')}
          {doors}
          {highStrip}
          {gable.map(gableEnd)}
          <polygon points={polyPoints(roof)} fill={roofFill} />
          {sideFaces(flue, shade(roofTint, 0.8), shade(roofTint, 0.66))}
          <polygon points={polyPoints(flue.top)} fill={shade(roofTint, 0.5)} />
        </>
      );
    }

    if (kind === 'studio') {
      // No windows; a roller door on the long face beside the ordinary one.
      return (
        <>
          <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
          <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
          {piers}
          {courses}
          <WallBand origin={longFace.o} along={longFace.a} wallHeight={H} from={0} to={H * 0.6} className="iso-roller" u0={0.66} u1={0.88} />
          <WallBand origin={longFace.o} along={longFace.a} wallHeight={H} from={H * 0.6} to={H * 0.6 + up(0.4)} className="iso-cornice" u0={0.65} u1={0.89} />
          {doors}
          <polygon points={polyPoints(f.top)} fill={pal.roof} />
          {monitor}
        </>
      );
    }

    // Fitness: a glazed bay round each door and a canopy.
    const bay = (face: { o: Pt; a: Pt; span: number }, key: string) => {
      if (!door) return null;
      const dw = Math.min(door.widthTiles / face.span, 0.6);
      const extra = 1 / baysAcross(face.span);
      return (
        <CurtainWall
          origin={face.o} along={face.a} wallHeight={H} spanTiles={face.span}
          from={BASE_COURSE} to={glassHead} floors={[]} id={key}
          u0={Math.max(0.02, 0.5 - dw / 2 - extra)} u1={Math.min(0.98, 0.5 + dw / 2 + extra)}
        />
      );
    };
    return (
      <>
        <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
        {piers}
        {courses}
        {clerestory(left, 'l')}
        {clerestory(right, 'r')}
        {bay(left, 'gl')}
        {bay(right, 'gr')}
        {doors}
        {door && fronts.map((dir) => <Canopy key={dir} stone={stone} d={door} col={col} row={row} w={w} h={h} outward={dir} wallHeight={H} />)}
        <polygon points={polyPoints(f.top)} fill={pal.roof} />
        {monitor}
      </>
    );
  }

  const gabled = ridge > 0;
  const alongW = w >= h;
  // A residence hall's stair turret: smaller, plain-capped, only on long walls.
  const turretPlan = turrets && motif === 'residential' && Math.min(w, h) >= 2.8 && gabled
    ? Math.min(across(4.8), Math.min(w, h) * 0.2)
    : 0;
  // Whether the door is reached through an archway porch (own or fallback).
  const porched = entrance === 'archway' || (entrance === 'arcade' && !arcadeFits(H) && shortArcadeFallback === 'archway');
  // Where this door's flight lands: the porch front, the portico's columns,
  // or the wall.
  const stepStandoff = porched ? PAVILION_DEPTH : entrance === 'portico' ? PORTICO_STANDOFF + PORTICO_COLUMN_PLAN : 0;
  // Gable when the short side is under 4 tiles, hip otherwise.
  const hipped = gabled && Math.min(w, h) >= 4;
  // The roof's footprint, including eaves oversail.
  const rc = col - eaves; const rr = row - eaves; const rw = w + eaves * 2; const rh = h + eaves * 2;
  const rf = boxFaces(rc, rr, rw, rh, 0, H);
  // Painted after the roof when its corner faces the camera, else before the walls.
  const residentialTurret = turretPlan > 0 && (
    <CornerTower pal={pal} glass={stone.glass} paneW={paneW}
      col={col + w - turretPlan + TOWER_PROUD} row={row + h - turretPlan + TOWER_PROUD} plan={turretPlan}
      height={H + STOREY * 0.8} sills={rankSills(ranks + 1)} crenels={false} capRise={up(4.2)}
    />
  );
  const rs = lift(alongW ? project(rc, rr + rh / 2) : project(rc + rw / 2, rr), H + ridge);
  const re = lift(alongW ? project(rc + rw, rr + rh / 2) : project(rc + rw / 2, rr + rh), H + ridge);

  return (
    <>
      {!site && !cornerInFront && residentialTurret}
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      {!site && trim && floorCourses(f.D, f.C, H, courses, 'l')}
      {!site && trim && floorCourses(f.C, f.B, H, courses, 'r')}
      {/* Base and eaves courses shared with the halls. */}
      {!site && trim && ([[f.D, f.C] as const, [f.C, f.B] as const]).map(([o, a], i) => (
        <g key={`b${i}`}>
          <WallBand origin={o} along={a} wallHeight={H} from={0} to={BASE_COURSE} className="iso-plinth" />
          <WallBand origin={o} along={a} wallHeight={H} from={H - EAVES_COURSE} to={H} className="iso-cornice" />
        </g>
      ))}
      {/* Each wall's bays come from its own length, so windows match. */}
      {!site && windows(f.D, f.C, H, f.spanLeft, sills, paneW, 'l', paneShape, stone.glass, door ? doorBay(door, f.spanLeft, H) : undefined, lights)}
      {!site && windows(f.C, f.B, H, f.spanRight, sills, paneW, 'r', paneShape, stone.glass, door ? doorBay(door, f.spanRight, H) : undefined, lights)}
      {/* Buttresses on pitched-roof buildings; flat roofs get merlons below. */}
      {!site && buttresses && gabled && door && (
        <>
          {fronts.map((dir) => { const s = wallSpan(w, h, dir); return (
            <Buttresses key={dir} pal={pal} stone={stone} col={col} row={row} w={w} h={h} height={H} outward={dir}
              reserve={[0.5 - door.widthTiles * 0.95 / s, 0.5 + door.widthTiles * 0.95 / s]} skipNear={turretPlan} />
            ); })}
        </>
      )}
      {/* A grocery's street-level shopfront glazing. */}
      {!site && t.facilityType === 'grocery' && (
        <>
          <CurtainWall origin={f.D} along={f.C} wallHeight={H} spanTiles={f.spanLeft} from={BASE_COURSE} to={Math.min(STOREY * 0.85, H - EAVES_COURSE * 2)} floors={[]} id="sfl" u0={0.04} u1={0.96} />
          <CurtainWall origin={f.C} along={f.B} wallHeight={H} spanTiles={f.spanRight} from={BASE_COURSE} to={Math.min(STOREY * 0.85, H - EAVES_COURSE * 2)} floors={[]} id="sfr" u0={0.04} u1={0.96} />
        </>
      )}
      {!site && door && <Door d={door} origin={f.D} along={f.C} wallHeight={H} span={f.spanLeft} shape={doorShape} />}
      {!site && door && <Door d={door} origin={f.C} along={f.B} wallHeight={H} span={f.spanRight} shape={doorShape} />}
      {/* A smaller cross over the clinic and counselling centre doors. */}
      {!site && t.facilityType === 'healthCenter' && door && (
        <>
          <RedCross origin={f.D} along={f.C} wallHeight={H} spanTiles={f.spanLeft} centreU={0.5} centreV={Math.min(0.9, (door.threshold + door.height + up(1.6)) / H)} scale={0.45} />
          <RedCross origin={f.C} along={f.B} wallHeight={H} spanTiles={f.spanRight} centreU={0.5} centreV={Math.min(0.9, (door.threshold + door.height + up(1.6)) / H)} scale={0.45} />
        </>
      )}
      {/* Modern civic buildings: curtain wall from plinth to eaves. */}
      {!site && glazedCivic && motif === 'portico' && (
        <>
          <CurtainWall origin={f.D} along={f.C} wallHeight={H} spanTiles={f.spanLeft} from={BASE_COURSE} to={H - EAVES_COURSE * 1.5} floors={courses} id="gcl" u0={0.03} u1={0.97} />
          <CurtainWall origin={f.C} along={f.B} wallHeight={H} spanTiles={f.spanRight} from={BASE_COURSE} to={H - EAVES_COURSE * 1.5} floors={courses} id="gcr" u0={0.03} u1={0.97} />
        </>
      )}
      {/* A small portico over the door, kept under the eaves. */}
      {!site && entrance === 'portico' && door && fronts.map((dir) => {
        const span = wallSpan(w, h, dir);
        const at = outsideWall(col, row, w, h, dir, span / 2, PORTICO_STANDOFF);
        return (
          <Portico stone={stone}
            key={`sp${dir}`}
            centreCol={at.col} centreRow={at.row}
            width={Math.min(door.widthTiles * 3.2, span * 0.6)}
            outward={dir}
            height={Math.min(PORTICO_HEIGHT, H - EAVES_COURSE * 2)}
          />
        );
      })}
      {/* The civic colonnade, running the length of the front. */}
      {!site && entrance === 'colonnade' && fronts.map((dir) => {
        const span = wallSpan(w, h, dir);
        const at = outsideWall(col, row, w, h, dir, span / 2, PORTICO_STANDOFF);
        return (
          <Portico stone={stone}
            key={dir}
            centreCol={at.col} centreRow={at.row}
            width={span * 0.9}
            outward={dir}
            columns={Math.max(2, Math.min(COLONNADE_MAX,
              Math.round((span * 0.9 * METRES_PER_TILE) / COLONNADE_BAY_METRES)))}
            height={Math.min(COLONNADE_HEIGHT, H - EAVES_COURSE * 2)}
          />
        );
      })}
      {!site && entrance === 'recess' && (
        <>
          {fronts.map((dir) => <Recess key={dir} pal={pal} col={col} row={row} w={w} h={h} wallHeight={H} outward={dir} />)}
        </>
      )}
      {!site && entrance === 'arcade' && arcadeFits(H) && (
        <>
          {fronts.map((dir) => <Arcade key={dir} pal={pal} stone={stone} col={col} row={row} w={w} h={h} outward={dir} height={arcadeHeight(H)} />)}
        </>
      )}
      {!site && (entrance === 'canopy' || (entrance === 'arcade' && !arcadeFits(H) && shortArcadeFallback === 'canopy')) && door && (
        <>
          {fronts.map((dir) => <Canopy key={dir} stone={stone} d={door} col={col} row={row} w={w} h={h} outward={dir} wallHeight={H} hood={hood} roof={material.roof} />)}
        </>
      )}
      {!site && (entrance === 'archway' || (entrance === 'arcade' && !arcadeFits(H) && shortArcadeFallback === 'archway')) && door && (
        <>
          {fronts.map((dir) => <Archway key={dir} pal={pal} stone={stone} d={door} col={col} row={row} w={w} h={h} outward={dir} wallHeight={H} />)}
        </>
      )}
      {/* Steps after the walls and doors, landing at the entrance's face;
          none behind an arcade (entered at grade). */}
      {!site && door && !(entrance === 'arcade' && arcadeFits(H)) && fronts.map((dir) => {
        const span = wallSpan(w, h, dir);
        const at = outsideWall(col, row, w, h, dir, span / 2, stepStandoff);
        const out = outwardOf(dir);
        return (
          <EntranceSteps key={dir} stone={stone}
            d={door} centreCol={at.col} centreRow={at.row}
            outCol={out.col} outRow={out.row} span={span}
          />
        );
      })}

      {gabled && eaves > 0 && ([[f.D, f.C] as const, [f.C, f.B] as const]).map(([o, a], i) => (
        <WallBand key={`es${i}`} origin={o} along={a} wallHeight={H} from={H - up(0.9)} to={H} className="iso-eaves-shadow" />
      ))}
      {hipped ? (
        <>
          <HippedRoof col={rc} row={rr} w={rw} h={rh} base={H} rise={ridge} pal={pal} />
          {chimneys && ridgeChimneys({ col: rc, row: rr, w: rw, h: rh, base: H, rise: ridge, at: [0.25, 0.75], pal, stone })}
        </>
      ) : gabled ? (
        <>
          {/* The two long slopes, toned by the direction each points. */}
          <polygon
            points={polyPoints(alongW ? [rf.NWt, rf.NEt, re, rs] : [rf.NWt, rf.SWt, re, rs])}
            fill={alongW ? pal.negRow : pal.negCol}
          />
          <polygon
            points={polyPoints(alongW ? [rf.SWt, rf.SEt, re, rs] : [rf.NEt, rf.SEt, re, rs])}
            fill={alongW ? pal.posRow : pal.posCol}
          />
          {/* Only the visible gable end (gableEnds); drawing the far one
              makes the roof look transparent. */}
          {gableEnds(rf, alongW, rs, re, pal)}
          <line className="iso-ridge" x1={rs.x} y1={rs.y} x2={re.x} y2={re.y} />
          {chimneys && [0.22, 0.78].map((u, i) => {
            const cc = alongW ? rc + rw * u : rc + rw / 2;
            const cr = alongW ? rr + rh / 2 : rr + rh * u;
            const plan = across(1.3);
            return <Chimney key={`gc${i}`} cc={cc} cr={cr} base={H + ridge * (1 - plan / Math.min(rw, rh))} top={H + ridge + up(2.0)} pal={pal} stone={stone} />;
          })}
        </>
      ) : (
        <>
          <polygon points={polyPoints(f.top)} fill={pal.roof} />
          {/* Scaffolding hatch over the site's deck. */}
          {site && <polygon points={polyPoints(f.top)} fill={`url(#${SCAFFOLD_PATTERN_ID})`} />}
          {site && <Scaffolding col={col} row={row} w={w} h={h} height={H} />}
          {site && Math.max(w, h) >= 5 && <Crane col={col} row={row} w={w} h={h} height={wallHeightOf(t)} />}
          {!site && motif === 'portico' && [0.3, 0.5, 0.7].map((v) => (
            // Rooflights on top-lit civic buildings, capped at a real size.
            [0.3, 0.55].map((u) => (
              <polygon
                key={`${u}-${v}`}
                className="iso-rooflight"
                points={polyPoints(boxFaces(col + w * u, row + h * v, Math.min(w * 0.12, across(6)), Math.min(h * 0.1, across(4)), H + 1, 0).top)}
              />
            ))
          ))}
          {!site && t.facilityType === 'performingArtsCenter' && (() => {
            // The fly tower: a blank box over the stage that says "theater".
            const fw = w * 0.34; const fh = h * 0.56;
            const fly = boxFaces(col + w * 0.06, row + h * 0.22, fw, fh, H, STOREY * 1.6);
            return (
              <>
                <polygon points={polyPoints(fly.left)} fill={pal.wallLeft} />
                <polygon points={polyPoints(fly.right)} fill={pal.wallRight} />
                {trim && <WallBand origin={fly.D} along={fly.C} wallHeight={STOREY * 1.6} from={STOREY * 1.6 - EAVES_COURSE} to={STOREY * 1.6} className="iso-cornice" />}
                {trim && <WallBand origin={fly.C} along={fly.B} wallHeight={STOREY * 1.6} from={STOREY * 1.6 - EAVES_COURSE} to={STOREY * 1.6} className="iso-cornice" />}
                <polygon points={polyPoints(fly.top)} fill={pal.roof} />
              </>
            );
          })()}
          {!site && motif === 'works' && (() => {
            // The lab exhaust stack at the back corner.
            const sp = across(1.2);
            const st = boxFaces(col + w * 0.88 - sp, row + h * 0.08, sp, sp, H, up(6));
            return (
              <>
                {sideFaces(st, shade(roofTint, 0.82), shade(roofTint, 0.68))}
                <polygon points={polyPoints(st.top)} fill={shade(roofTint, 0.45)} />
              </>
            );
          })()}
          {!site && labFeatureOf(t) && (
            <LabRoofFeature feature={labFeatureOf(t)!} col={col} row={row} w={w} h={h} base={H} tint={roofTint} />
          )}
          {!site && (motif === 'works' || motif === 'pavilion' || motif === 'block') && (
            // Roof plant, heaviest on labs and hospitals. Sorted back to
            // front with depthSort.ts's comparator (in footprint fractions),
            // since the lists are not authored in paint order.
            depthOrder(
              (motif === 'works'
                ? [[0.12, 0.18, 0.28, 0.26], [0.48, 0.44, 0.32, 0.28], [0.18, 0.6, 0.22, 0.22]]
                : motif === 'block'
                  ? [[0.08, 0.10, 0.30, 0.26], [0.46, 0.12, 0.22, 0.18], [0.10, 0.52, 0.24, 0.22], [0.52, 0.56, 0.34, 0.32]]
                  : [[0.18, 0.26, 0.26, 0.24], [0.54, 0.52, 0.28, 0.22]]
              ).map(([fx, fy, fw, fh]) => ({ col: fx, row: fy, w: fw, h: fh })),
            ).filter((_, i) => Math.min(w, h) >= 4 || i === 0).map((unit, i) => (
              // Capped at a real air-handler size (about 5 m by 4 m).
              <RoofBox
                key={i}
                col={col + w * unit.col} row={row + h * unit.row}
                w={Math.min(w * unit.w, across(5.5))} h={Math.min(h * unit.h, across(4.5))}
                base={H} height={motif === 'works' ? 12 : motif === 'block' ? 15 : 9}
                tint={roofTint}
              />
            ))
          )}
        </>
      )}
      {/* The residence turret, after the roof. */}
      {!site && turretPlan > 0 && cornerInFront && residentialTurret}
      {/* Merlons on the flat-roofed civic set. */}
      {!site && crenellations && !gabled && motif === 'portico' && (
        <>
          {fronts.map((dir) => <Merlons key={dir} col={col} row={row} w={w} h={h} base={H} outward={dir} pal={pal} />)}
        </>
      )}
      {/* The Classical set's balustrade. */}
      {!site && balustrade && !gabled && motif === 'portico' && (
        <>
          {fronts.map((dir) => <Balustrade key={dir} pal={pal} stone={stone} col={col} row={row} w={w} h={h} base={H} outward={dir} />)}
        </>
      )}
      {/* A pavilion's bell-gable, on the left face only, after the roof.
          Chapter houses show their letters instead. */}
      {!site && bellGable && motif === 'pavilion' && gabled && door && !glyphs && (
        <BellGable pal={pal} stone={stone}
          origin={f.D} along={f.C}
          inward={gableInward(col, row, w, h)}
          wallHeight={H} span={f.spanLeft} centreU={0.5} sideAt="u1" scale={0.8}
        />
      )}
      {/* The roof parts that read (Plan 25): a dining hall's kitchen flues,
          a tall residence's balconies, a civic building's flag. */}
      {!site && t.facilityType === 'diningHall' && [0.22, 0.34].map((u) => {
        const sp = across(0.8);
        const st = boxFaces(col + w * u, row + h * 0.1, sp, sp, H, up(3.5));
        return (
          <g key={`flue${u}`}>
            {sideFaces(st, shade(pal.wallLeft, 0.8), shade(pal.wallLeft, 0.66))}
            <polygon points={polyPoints(st.top)} fill={shade(roofTint, 0.4)} />
          </g>
        );
      })}
      {!site && motif === 'residential' && storeysOf(t) >= 4 && (
        <Balconies f={f} storeys={storeysOf(t)} height={H} tone={stone.trim} />
      )}
      {!site && (t.facilityType === 'library' || t.facilityType === 'performingArtsCenter') && (
        <RoofFlag at={lift(project(col + w * 0.82, row + h * 0.82), H)} />
      )}
      {/* Chapter letters over both doors, last: the pediment rises above
          the eaves, so anything drawn later would cover it. */}
      {!site && glyphs && (door || entrance === 'recess') && (
        <>
          <ChapterPediment
            glyphs={glyphs} origin={f.D} along={f.C}
            wallHeight={H} span={f.spanLeft} doorWidth={door?.widthTiles ?? 0} cast={!trim}
          />
          <ChapterPediment
            glyphs={glyphs} origin={f.C} along={f.B}
            wallHeight={H} span={f.spanRight} doorWidth={door?.widthTiles ?? 0} cast={!trim}
          />
        </>
      )}
    </>
  );
}

// Memoised: the map re-renders on every pointer move and a built-out campus
// has many thousands of polygons. A motif is a pure function of these props;
// `p` is rebuilt each render (CampusMap's drawnFootprint), so its fields are
// compared rather than its identity.
export default memo(BuildingMotif, (a, b) => (
  a.t === b.t
  && a.camera === b.camera
  && a.material === b.material
  && a.vernacular === b.vernacular
  && a.developing === b.developing
  && a.glyphs === b.glyphs
  && a.p.col === b.p.col && a.p.row === b.p.row
  && a.p.w === b.p.w && a.p.h === b.p.h
));

// Color lives in buildingSpec.ts's MATERIALS (see materialOf).
export { materialOf } from './buildingSpec';
