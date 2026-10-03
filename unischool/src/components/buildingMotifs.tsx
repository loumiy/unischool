import { memo, useContext } from 'react';
import type { Buildable, Facing, SchoolColors, Vernacular } from '../state/types';
import { TILE_W, boxFaces, cameraAxes, facePoint, lift, polyPoints, project, projectedCircle, heightScale, visibleWalls, wallOf, type BoxFaces, type Camera, type FaceDir, type Pt } from './isoProjection';
import { frontDepth, frontWidth, localBox, localToGrid, sideSeen, sidesOf, type Plot } from './facing';
import { depthOrder, occludes, type DepthBox } from './depthSort';
import { WALL_LIGHT, faceTone, shadowOffset, sunScreenDir } from './light';
import { METRES_PER_TILE, STOREY, across, up } from './campusScale';
import Landmark from './landmarks';
import LibraryMass from './libraryMotif';
import { ColorsContext } from './mapOccasions';
import {
  labFeatureOf, type LabFeature, type Motif,
  BASE_COURSE, BAY_METRES, BLOCK_SPLIT_MIN_TILES, CANOPY_DEPTH, CROSS_ARM_METRES,
  BUSINESS_PODIUM_STOREYS, BUSINESS_SCHOOL_ID, businessSchoolPlan, isHospital,
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
  baysAcross, clerestorySill, type SignatureFeature, doorDimensions, doorOf, floorLinesOf, floorsUnderConstruction, hasClockTower, motifOf,
  rankSills, ridgeOf, parapetOf, eavesOf, isMansard, stoneFor, paneShapeOf, windowOutline,
  entrancePartOf, rooflineEndPartOf, signatureOf, apexPartOf, partsFor, type ApexPart, massingOf,
  crestOf, surfaceRoofOf, type CrestPart, signifierOf, type Signifier, gothicCivicOf, roofFor,
  STACK_LOWER_TOP, STACK_UPPER_INSET, STACK_UPPER_OVERHANG,
  ARCADE_HEIGHT, ARCADE_DEPTH, ARCADE_PIER, ARCADE_BAY_METRES, ARCADE_MAX,
  CAMPANILE_PLAN, CAMPANILE_RISE, CAMPANILE_BELFRY_RISE, CAMPANILE_CAP_RISE,
  hasBalconies, hasTrim, hasGilt, CHAPELS, chapelPlan, NO_STONE, type ChapelBox,
  diningBandOf, diningPlan, REFECTORIES, REFECTORY_BACK_EAVES, REFECTORY_KITCHEN_EAVES, type DiningPlan, type RefectoryLantern,
  storeysOf, wallHeightOf, wallShadeOf, windowRanksOf,
  windowWidthOf,
  type DoorDimensions, type EntrancePart, type Material, type StonePalette, type WindowShape,
} from './buildingSpec';
import { FOUNDERS_GEORGIAN_COLOURS, glassContrast, georgianHall, readableGlass, towerFormOf } from './buildingSpec';
import {
  CARILLON_BELFRY_RISE, CARILLON_CAP, CARILLON_CAP_OVERSAIL, CARILLON_CLOCK_RADIUS_METRES, CARILLON_CLOCK_RISE,
  CARILLON_PIER, CARILLON_PLAN, CARILLON_PROUD, CARILLON_SHAFT_RISE, CARILLON_TIE, CARILLON_TIE_EVERY,
} from './buildingSpec';
import GroundMarking, { GroundSite, RakedStand, StadiumField, type TilePt } from './groundMarkings';
import { shade } from './tint';
import { SNOW_COLOR, SnowContext, mixColor } from './seasons';
import { Crane, Scaffolding } from './siteWorks';
import { flagCloth } from './wind';
import { TiedPortico, crossGable, eitherRoof, flatRoofAt, gableRoofAt, hipRoofAt, mansardRoofAt, toneSlopes, vaultRoofAt, type RoofAt } from './porticoTie';
import { TreeAt, treeShadow } from './trees';

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

// Sloped faces back to front. A face pointing the way of a wall the camera
// cannot see lies behind its ridge or apex, and on a steep pyramid it rises
// above the front faces on screen, so it must go down first; faces toward
// the camera then paint over it. Stable, so each group keeps the order it
// was authored in. At the opening camera the back faces were always listed
// first, which is why a fixed order looked right there and nowhere else.
function backSlopesFirst<T>(faces: readonly T[], dirOf: (f: T) => FaceDir): T[] {
  const seen = visibleWalls();
  const front = (d: FaceDir) => d === seen.left || d === seen.right;
  return [...faces.filter((f) => !front(dirOf(f))), ...faces.filter((f) => front(dirOf(f)))];
}

// A square pyramid over the grid square (col, row) to (col + plan, row +
// plan), springing at `base` and rising `rise`: four faces toned by the way
// each points (SLOPE's order: -col brightest, +col darkest), back to front.
function pyramid(col: number, row: number, plan: number, base: number, rise: number, tone: string) {
  const NW = lift(project(col, row), base);
  const NE = lift(project(col + plan, row), base);
  const SE = lift(project(col + plan, row + plan), base);
  const SW = lift(project(col, row + plan), base);
  const tip = lift(project(col + plan / 2, row + plan / 2), base + rise);
  const faces: Array<[Pt, Pt, number, FaceDir]> = [
    [NW, SW, 1.10, 'negCol'], [NW, NE, 1.00, 'negRow'], [SW, SE, 0.84, 'posRow'], [NE, SE, 0.70, 'posCol'],
  ];
  return {
    tip,
    faces: backSlopesFirst(faces, (f) => f[3]).map(([a, b, k, dir]) => (
      <polygon key={dir} points={polyPoints([a, b, tip])} fill={shade(tone, k)} />
    )),
  };
}

// The two long slopes of a gable whose ridge runs from `rs` (the low-coordinate
// end) to `re`, on the eaves of box `f`, back slope first.
function gableSlopes(f: BoxFaces, alongW: boolean, rs: Pt, re: Pt, pal: Palette) {
  const slopes: Array<[FaceDir, Pt[]]> = alongW
    ? [['negRow', [f.NWt, f.NEt, re, rs]], ['posRow', [f.SWt, f.SEt, re, rs]]]
    : [['negCol', [f.NWt, f.SWt, re, rs]], ['posCol', [f.NEt, f.SEt, re, rs]]];
  return backSlopesFirst(slopes, (s) => s[0]).map(([dir, pts]) => (
    <polygon key={dir} points={polyPoints(pts)} fill={pal[dir]} />
  ));
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
// The set-back plane a bell-gable's return meets: its wall `dir` (the
// visible left wall unless given; a building's front, Plan 88),
// `across(0.6)` inside the building, oriented the way that wall is.
function gableInward(col: number, row: number, w: number, h: number, dir: FaceDir = visibleWalls().left): { origin: Pt; along: Pt } {
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

// Snow lying on a palette's roofs: every slope and deck mixed toward white,
// the lit slopes most (Plan 74I). The walls are untouched.
export function snowOnRoofs(p: Palette, snow: number): Palette {
  if (snow <= 0) return p;
  const lay = (c: string, k: number) => mixColor(c, SNOW_COLOR, snow * k);
  return {
    ...p,
    roof: lay(p.roof, 0.8), roofDeck: lay(p.roofDeck, 0.82),
    negCol: lay(p.negCol, 0.85), negRow: lay(p.negRow, 0.8), posRow: lay(p.posRow, 0.72), posCol: lay(p.posCol, 0.66),
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
  // A taller pane (a dining hall's ground floor, Plan 87D).
  paneHeight = WINDOW_HEIGHT,
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
    const v1 = (sills[r] + paneHeight) / wallHeight;
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
// (buildingSpec.ts's labFeatureOf). Standing on the roof at `base`. The
// observatory and the glasshouse are one thing each; the flues are three,
// and each is drawn alone (Flue), so the roof's sort can place each one.
function LabRoofFeature({ feature, col, row, w, h, base }: {
  feature: 'observatory' | 'glasshouse'; col: number; row: number; w: number; h: number; base: number;
}) {
  if (feature === 'observatory') {
    // A drum and a dome at the front of the roof, taller than the lab under
    // it, with the shutter slit facing the camera.
    const r = Math.min(w, h) * OBSERVATORY_RADIUS;
    const cc = col + w * OBSERVATORY_AT[0]; const cr = row + h * OBSERVATORY_AT[1];
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
    // A glazed house along the roof's +row half, ridge and panes. The ridge
    // runs along col (ridgeA at -col, ridgeB at +col), so the roof is built
    // from grid corners: the -row and +row slopes, back one first, and the
    // one gable end the camera sees.
    const [gc, gr, gw, gd] = GLASSHOUSE;
    const gh = boxFaces(col + w * gc, row + h * gr, w * gw, h * gd, base, up(2.6));
    const ridgeA = lift(project(col + w * 0.12, row + h * 0.7), base + up(4.2));
    const ridgeB = lift(project(col + w * 0.74, row + h * 0.7), base + up(4.2));
    const slopes: Array<[FaceDir, Pt[]]> = [
      ['negRow', [gh.NWt, gh.NEt, ridgeB, ridgeA]],
      ['posRow', [gh.SWt, gh.SEt, ridgeB, ridgeA]],
    ];
    const end: Pt[] = wallOf(gh, 'posCol').visible ? [gh.NEt, gh.SEt, ridgeB] : [gh.NWt, gh.SWt, ridgeA];
    return (
      <g className="lab-glasshouse">
        <polygon points={polyPoints(gh.left)} className="glass-pane" />
        <polygon points={polyPoints(gh.right)} className="glass-pane" />
        {backSlopesFirst(slopes, (x) => x[0]).map(([dir, pts]) => (
          <polygon key={dir} points={polyPoints(pts)} className="glass-roof" />
        ))}
        <polygon points={polyPoints(end)} className="glass-roof" />
        <line x1={ridgeA.x} y1={ridgeA.y} x2={ridgeB.x} y2={ridgeB.y} className="glass-ridge" />
      </g>
    );
  }
  return null;
}

// Where a lab's feature stands, in fractions of the footprint: the
// observatory's drum (its center, and its radius as a share of the shorter
// side), the glasshouse's box (col, row, w, h), and the fume flues, a row of
// tall thin stacks along the back of the roof (each flue's col; one row).
const OBSERVATORY_AT = [0.62, 0.55] as const;
const OBSERVATORY_RADIUS = 0.3;
const GLASSHOUSE = [0.12, 0.52, 0.62, 0.36] as const;
const FLUES = [0.2, 0.4, 0.6] as const;
const FLUE_ROW = 0.12;
// Roof plant, heaviest on labs and hospitals, in footprint fractions (col,
// row, w, h), capped at a real air-handler size (about 5 m by 4 m). A roof
// shorter than 4 tiles either way carries one unit.
const ROOF_PLANT: Partial<Record<Motif, readonly (readonly [number, number, number, number])[]>> = {
  works: [[0.12, 0.18, 0.28, 0.26], [0.48, 0.44, 0.32, 0.28], [0.18, 0.6, 0.22, 0.22]],
  block: [[0.08, 0.10, 0.30, 0.26], [0.46, 0.12, 0.22, 0.18], [0.10, 0.52, 0.24, 0.22], [0.52, 0.56, 0.34, 0.32]],
  pavilion: [[0.18, 0.26, 0.26, 0.24], [0.54, 0.52, 0.28, 0.22]],
};

// One thing standing on a flat roof, on the ground (in tiles) it covers.
export interface RoofItem extends DepthBox {
  kind: 'stack' | 'plant' | 'flue' | 'observatory' | 'glasshouse' | 'transformers' | 'pylon' | 'distillation' | 'pipeRack' | 'school';
  key: string;
  // A school lab's own roof part (Plan 87E), for kind 'school'.
  part?: SchoolRoofPart;
}

const clearOf = (a: DepthBox, b: DepthBox) =>
  a.col + a.w <= b.col || b.col + b.w <= a.col || a.row + a.h <= b.row || b.row + b.h <= a.row;

// Everything on a flat roof (Plan 80H): a lab's feature, its flues, the
// exhaust stack and the roof plant, in one painter's order for this camera
// (depthSort.ts), so nothing shows through the dome or the glass at any
// view. Which plant units stand does not depend on the view: on a small
// roof, the first unit clear of everything else on it (the depth sort chose
// it, and at three views of four it stood inside the dome or the glasshouse).
export function flatRoofItems(motif: Motif, feature: LabFeature | undefined, col: number, row: number, w: number, h: number, signature?: SignatureFeature): RoofItem[] {
  const fixed: RoofItem[] = [];
  // A school lab's own roof (Plan 87E) in place of the generic plant.
  const school = schoolRoofItems(signature, col, row, w, h);
  if (motif === 'works') {
    // The lab exhaust stack at the back corner.
    const sp = across(1.2);
    fixed.push({ kind: 'stack', key: 'stack', col: col + w * 0.88 - sp, row: row + h * 0.08, w: sp, h: sp });
  }
  if (feature === 'observatory') {
    const r = Math.min(w, h) * OBSERVATORY_RADIUS;
    fixed.push({ kind: 'observatory', key: 'observatory', col: col + w * OBSERVATORY_AT[0] - r, row: row + h * OBSERVATORY_AT[1] - r, w: 2 * r, h: 2 * r });
  } else if (feature === 'glasshouse') {
    const [gc, gr, gw, gd] = GLASSHOUSE;
    fixed.push({ kind: 'glasshouse', key: 'glasshouse', col: col + w * gc, row: row + h * gr, w: w * gw, h: h * gd });
  } else if (feature === 'flues') {
    const sp = across(0.9);
    for (const u of FLUES) fixed.push({ kind: 'flue', key: `flue-${u}`, col: col + w * u, row: row + h * FLUE_ROW, w: sp, h: sp });
  } else if (feature === 'transformers') {
    // The transformer yard (Plan 87I), in place of the roof plant.
    TRANSFORMERS.forEach(([a, c], i) => fixed.push({ kind: 'transformers', key: `transformer-${i}`, ...roofAxisCentred(col, row, w, h, a, c, TRANSFORMER_PLAN[0], TRANSFORMER_PLAN[1]) }));
    fixed.push({ kind: 'pylon', key: 'pylon', ...roofAxisCentred(col, row, w, h, PYLON_AT[0], PYLON_AT[1], PYLON_PLAN, PYLON_PLAN) });
  } else if (feature === 'distillation') {
    // The process plant (Plan 87I), in place of the roof plant.
    const [a0, a1, c0, c1] = PIPE_RACK;
    fixed.push({ kind: 'pipeRack', key: 'pipe-rack', ...roofAxisBox(col, row, w, h, a0, a1, c0, c1) });
    STILLS.forEach(([a, c, r], i) => fixed.push({ kind: 'distillation', key: `still-${i}`, ...roofAxisCentred(col, row, w, h, a, c, across(r) * 2, across(r) * 2) }));
  }
  fixed.push(...school);
  const yard = feature === 'transformers' || feature === 'distillation';
  const plant: RoofItem[] = (yard || school.length > 0 ? [] : ROOF_PLANT[motif] ?? []).map(([fx, fy, fw, fh], i) => ({
    kind: 'plant', key: `plant-${i}`,
    col: col + w * fx, row: row + h * fy, w: Math.min(w * fw, across(5.5)), h: Math.min(h * fh, across(4.5)),
  }));
  const kept = Math.min(w, h) >= 4 || plant.length === 0 ? plant
    : [plant.find((u) => fixed.every((o) => clearOf(u, o))) ?? plant[0]];
  return depthOrder([...fixed, ...kept]);
}

// The Electrical Engineering Labs' transformer yard (Plan 87I): two
// transformers, each a tank with radiator fins down its sides and three
// porcelain bushings (stacked insulator discs) on its lid; a lattice pylon
// at the end of the roof brings the line in. And the Chemical Engineering
// Labs' process plant: a pipe rack along the roof and a cluster of
// distillation columns, ringed with platforms.
const TRANSFORMERS = [[0.42, 0.55], [0.66, 0.55]] as const;   // centers, along the long axis and across
const TRANSFORMER_PLAN = [across(5.6), across(3.8)] as const;
const TRANSFORMER_RISE = up(3.8);
const PYLON_AT = [0.13, 0.55] as const;
const PYLON_PLAN = across(2.8);
const PYLON_RISE = up(15);
const STILLS = [[0.3, 0.66, 1.5, 21], [0.5, 0.72, 1.1, 15], [0.68, 0.62, 1.7, 25]] as const;   // a, c, radius m, height m
const PIPE_RACK = [0.06, 0.94, 0.17, 0.33] as const;   // a0, a1, c0, c1
const PIPE_RACK_RISE = up(3.6);
const PORCELAIN = '#8c4a33';
const TANK_GREEN = '#7f8c84';
const STILL_STEEL = '#cfd3d6';
const PLATFORM = '#6f757a';

// A box on the roof laid out along its long axis: `a` along it, `c` across.
function roofAxisBox(col: number, row: number, w: number, h: number, a0: number, a1: number, c0: number, c1: number): DepthBox {
  return w >= h
    ? { col: col + w * a0, row: row + h * c0, w: w * (a1 - a0), h: h * (c1 - c0) }
    : { col: col + w * c0, row: row + h * a0, w: w * (c1 - c0), h: h * (a1 - a0) };
}
// A box of fixed size centered at (a, c) along the long axis.
function roofAxisCentred(col: number, row: number, w: number, h: number, a: number, c: number, along: number, across_: number): DepthBox {
  const alongW = w >= h;
  const cc = alongW ? col + w * a : col + w * c;
  const cr = alongW ? row + h * c : row + h * a;
  const bw = alongW ? along : across_; const bh = alongW ? across_ : along;
  return { col: cc - bw / 2, row: cr - bh / 2, w: bw, h: bh };
}

// One insulator stack: porcelain discs threaded on a rod, from `p` up.
function InsulatorStack({ p, rise, discs = 5, rx = 2.1 }: { p: Pt; rise: number; discs?: number; rx?: number }) {
  const top = lift(p, rise);
  return (
    <g className="lab-insulator">
      <line x1={p.x} y1={p.y} x2={top.x} y2={top.y} stroke="#4b3a33" strokeWidth={0.8} />
      {Array.from({ length: discs }, (_, i) => {
        const q = lift(p, rise * ((i + 0.7) / (discs + 0.2)));
        return <ellipse key={i} cx={q.x} cy={q.y} rx={rx * (1 - i * 0.05)} ry={rx * 0.42} fill={i % 2 === 0 ? PORCELAIN : shade(PORCELAIN, 1.18)} stroke="rgba(40, 24, 18, 0.55)" strokeWidth={0.4} />;
      })}
      <circle cx={top.x} cy={top.y} r={0.9} fill="#b9bcbf" />
    </g>
  );
}

// The bushings' tops, for the line to land on.
function bushingTops(b: DepthBox, base: number, alongW: boolean): Pt[] {
  return [0.22, 0.5, 0.78].map((f) => {
    const c = alongW ? b.col + b.w * f : b.col + b.w / 2;
    const r = alongW ? b.row + b.h / 2 : b.row + b.h * f;
    return lift(project(c, r), base + TRANSFORMER_RISE + up(3.4));
  });
}

function Transformer({ col, row, w, h, base, alongW }: DepthBox & { base: number; alongW: boolean }) {
  const tank = boxFaces(col, row, w, h, base, TRANSFORMER_RISE);
  // Radiator fins: close vertical ribs down both visible faces.
  const fins = (o: Pt, a: Pt, key: string) => {
    const n = 9;
    return Array.from({ length: n }, (_, i) => {
      const u = 0.08 + (0.84 * i) / (n - 1);
      const p0 = facePoint(o, a, TRANSFORMER_RISE, u, 0.08); const p1 = facePoint(o, a, TRANSFORMER_RISE, u, 0.86);
      return <line key={`${key}${i}`} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="#4f5a53" strokeWidth={0.9} />;
    });
  };
  // A conservator: a small drum along the lid's back edge.
  return (
    <g className="lab-transformer">
      {sideFaces(tank, shade(TANK_GREEN, 0.96), shade(TANK_GREEN, 0.8))}
      {fins(tank.D, tank.C, 'l')}
      {fins(tank.C, tank.B, 'r')}
      <polygon points={polyPoints(tank.top)} fill={shade(TANK_GREEN, 1.12)} />
      {[0.22, 0.5, 0.78].map((f) => {
        const c = alongW ? col + w * f : col + w / 2;
        const r = alongW ? row + h / 2 : row + h * f;
        return <InsulatorStack key={f} p={lift(project(c, r), base + TRANSFORMER_RISE)} rise={up(3.4)} />;
      })}
    </g>
  );
}

// A lattice pylon: four legs tapering to a waist, cross-braced, with a
// crossarm hung with insulator strings.
function Pylon({ col, row, w, h, base, alongW }: DepthBox & { base: number; alongW: boolean }) {
  const cc = col + w / 2; const cr = row + h / 2;
  const half = w / 2; const waist = half * 0.32;
  const corner = (r: number, z: number, i: number): Pt => {
    const dc = (i === 0 || i === 3 ? -1 : 1) * r; const dr = (i < 2 ? -1 : 1) * r;
    return lift(project(cc + dc, cr + dr), z);
  };
  const levels = [0, 0.3, 0.55, 0.78, 1];
  const rAt = (f: number) => half + (waist - half) * f;
  const steel = '#5a5f63';
  const lines: Array<[Pt, Pt]> = [];
  for (let i = 0; i < 4; i += 1) lines.push([corner(half, base, i), corner(waist, base + PYLON_RISE, i)]);
  for (let k = 0; k < levels.length - 1; k += 1) {
    const z0 = base + PYLON_RISE * levels[k]!; const z1 = base + PYLON_RISE * levels[k + 1]!;
    const r0 = rAt(levels[k]!); const r1 = rAt(levels[k + 1]!);
    for (let i = 0; i < 4; i += 1) {
      const j = (i + 1) % 4;
      lines.push([corner(r0, z0, i), corner(r1, z1, j)], [corner(r0, z0, j), corner(r1, z1, i)]);
      lines.push([corner(r1, z1, i), corner(r1, z1, j)]);
    }
  }
  // The crossarm runs across the roof's long axis, so the line leaves along it.
  const armZ = base + PYLON_RISE * 0.86;
  const arm = (s: number) => lift(project(alongW ? cc : cc + s * half * 1.5, alongW ? cr + s * half * 1.5 : cr), armZ);
  const ends = [arm(-1), arm(1)];
  const tip = lift(project(cc, cr), base + PYLON_RISE + up(1.6));
  return (
    <g className="lab-pylon">
      {lines.map(([p, q], i) => <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={steel} strokeWidth={i < 4 ? 1.1 : 0.55} />)}
      <line x1={ends[0]!.x} y1={ends[0]!.y} x2={ends[1]!.x} y2={ends[1]!.y} stroke={steel} strokeWidth={1.2} />
      <line x1={lift(project(cc, cr), base + PYLON_RISE).x} y1={lift(project(cc, cr), base + PYLON_RISE).y} x2={tip.x} y2={tip.y} stroke={steel} strokeWidth={0.8} />
      {ends.map((e, i) => <InsulatorStack key={i} p={lift(e, -up(2.2))} rise={up(2.2)} discs={4} rx={1.4} />)}
    </g>
  );
}

// The line from the pylon's crossarm to each transformer's middle bushing,
// sagging between them. Drawn over the yard, after everything on the roof.
function pylonLines(items: RoofItem[], base: number, alongW: boolean) {
  const pylon = items.find((x) => x.kind === 'pylon');
  if (!pylon) return null;
  const cc = pylon.col + pylon.w / 2; const cr = pylon.row + pylon.h / 2;
  const half = pylon.w / 2;
  const armZ = base + PYLON_RISE * 0.86 - up(2.2);
  const arm = (s: number) => lift(project(alongW ? cc : cc + s * half * 1.5, alongW ? cr + s * half * 1.5 : cr), armZ);
  const tops = items.filter((x) => x.kind === 'transformers').map((b) => bushingTops(b, base, alongW)[1]!);
  return (
    <g className="lab-lines">
      {tops.flatMap((q, i) => [-1, 1].map((s) => {
        const p = arm(s);
        const mx = (p.x + q.x) / 2; const my = Math.max(p.y, q.y) + 4;
        return <path key={`${i}${s}`} d={`M${p.x.toFixed(1)},${p.y.toFixed(1)}Q${mx.toFixed(1)},${my.toFixed(1)} ${q.x.toFixed(1)},${q.y.toFixed(1)}`} fill="none" stroke="#2f3336" strokeWidth={0.5} />;
      }))}
    </g>
  );
}

// A distillation column: a tall steel shell with a domed head, a ladder,
// and platforms with handrails at three levels.
function Still({ col, row, w, base, rise }: DepthBox & { base: number; rise: number }) {
  const r = w / 2;
  const cc = col + r; const cr = row + r;
  const ring = (rad: number, z: number) => projectedCircle(cc, cr, rad, 24).map((q) => lift(q, z));
  const levels = [0.34, 0.62, 0.88];
  const head = lift(project(cc, cr), base + rise);
  const rx = (Math.max(...ring(r, 0).map((q) => q.x)) - Math.min(...ring(r, 0).map((q) => q.x))) / 2;
  const ladder = (() => {
    const near = nearRing(ring(r * 1.02, base));
    const p = near[Math.floor(near.length * 0.35)]!;
    return { p0: p, p1: lift(p, rise * 0.9) };
  })();
  return (
    <g className="lab-still">
      {/* The platforms' far halves, behind the shell. */}
      {levels.map((v) => <polygon key={`b${v}`} points={polyPoints(ring(r * 1.8, base + rise * v))} fill={PLATFORM} />)}
      <Cylinder cc={cc} cr={cr} r={r} z0={base} z1={base + rise} fill={STILL_STEEL} />
      <path d={`M${(head.x - rx).toFixed(1)},${head.y.toFixed(1)}Q${head.x.toFixed(1)},${(head.y - rx * 0.9).toFixed(1)} ${(head.x + rx).toFixed(1)},${head.y.toFixed(1)}Z`} fill={shade(STILL_STEEL, 1.06)} stroke="rgba(40, 42, 44, 0.35)" strokeWidth={0.5} />
      <line x1={ladder.p0.x} y1={ladder.p0.y} x2={ladder.p1.x} y2={ladder.p1.y} stroke="#5b6166" strokeWidth={0.7} />
      {/* Weld seams down the shell. */}
      {[0.2, 0.48, 0.76].map((v) => (
        <polyline key={`s${v}`} points={polyPoints(nearRing(ring(r, base + rise * v)))} fill="none" stroke="rgba(70, 76, 80, 0.45)" strokeWidth={0.5} />
      ))}
      {/* Their near halves, a grating ring in front of it, and a rail. */}
      {levels.map((v) => {
        const z = base + rise * v;
        return (
          <g key={`p${v}`}>
            <polygon points={polyPoints([...nearRing(ring(r * 1.8, z)), ...nearRing(ring(r, z)).reverse()])} fill={shade(PLATFORM, 1.15)} stroke="#4a4f53" strokeWidth={0.5} />
            <polyline points={polyPoints(nearRing(ring(r * 1.8, z + up(1.1))))} fill="none" stroke={GANTRY_YELLOW} strokeWidth={0.7} />
          </g>
        );
      })}
    </g>
  );
}

// The pipe rack: steel bents along its length carrying two tiers of pipes,
// each pipe drawn as a line in its service's color.
function PipeRack({ col, row, w, h, base, alongW }: DepthBox & { base: number; alongW: boolean }) {
  const len = alongW ? w : h;
  const bents = Math.max(3, Math.round((len * METRES_PER_TILE) / 6));
  const at = (a: number, c: number, z: number) => lift(project(alongW ? col + w * a : col + w * c, alongW ? row + h * c : row + h * a), z);
  const steel = '#6a5d55';
  const tiers = [base + PIPE_RACK_RISE * 0.62, base + PIPE_RACK_RISE];
  const pipes: Array<[number, number, string, number]> = [
    [0, 0.25, '#b9bec2', 1.7], [0, 0.55, '#a14a35', 1.5], [0, 0.82, '#d4b347', 1.2],
    [1, 0.3, '#8e979d', 1.9], [1, 0.7, '#e8e6df', 1.6],
  ];
  return (
    <g className="lab-pipe-rack">
      {/* The bents: two legs and two crossbeams each. */}
      {Array.from({ length: bents }, (_, i) => {
        const a = (i + 0.5) / bents;
        const l0 = at(a, 0.08, base); const l1 = at(a, 0.92, base);
        const t0 = at(a, 0.08, tiers[1]!); const t1 = at(a, 0.92, tiers[1]!);
        const m0 = at(a, 0.08, tiers[0]!); const m1 = at(a, 0.92, tiers[0]!);
        return (
          <g key={`b${i}`}>
            <line x1={l0.x} y1={l0.y} x2={t0.x} y2={t0.y} stroke={steel} strokeWidth={1} />
            <line x1={l1.x} y1={l1.y} x2={t1.x} y2={t1.y} stroke={steel} strokeWidth={1} />
            <line x1={m0.x} y1={m0.y} x2={m1.x} y2={m1.y} stroke={steel} strokeWidth={0.8} />
            <line x1={t0.x} y1={t0.y} x2={t1.x} y2={t1.y} stroke={steel} strokeWidth={0.8} />
          </g>
        );
      })}
      {/* The pipes, the far ones first. */}
      {pipes.map(([tier, c, color, width], i) => {
        const p0 = at(0, c, tiers[tier]! + up(0.35)); const p1 = at(1, c, tiers[tier]! + up(0.35));
        return (
          <g key={`p${i}`}>
            <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={shade(color, 0.7)} strokeWidth={width + 0.6} strokeLinecap="round" />
            <line x1={p0.x} y1={p0.y - 0.3} x2={p1.x} y2={p1.y - 0.3} stroke={color} strokeWidth={width * 0.6} strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
}

// One fume flue, standing on the roof at `base`.
function Flue({ col, row, w, h, base, tint }: DepthBox & { base: number; tint: string }) {
  const st = boxFaces(col, row, w, h, base, up(8.5));
  return (
    <g className="lab-flue">
      {sideFaces(st, shade(tint, 0.9), shade(tint, 0.74))}
      <polygon points={polyPoints(st.top)} fill={shade(tint, 0.4)} />
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

// A flag on a civic roof, in the college's colors, flying downwind
// (wind.ts) and foreshortened with the tilt.
const ROOF_FLAG_TILES = 0.28;   // the cloth's length: 12 units at the opening camera
export function RoofFlag({ at }: { at: Pt }) {
  return roofFlagArt({ at }, useContext(ColorsContext));
}
// The flag itself, given the college's colors: what the canvas map draws
// (canvasArt.ts), reading them from its own occasions rather than React's.
export function roofFlagArt({ at }: { at: Pt }, colors: SchoolColors): React.JSX.Element {
  const top = lift(at, up(7));
  return (
    <g className="iso-roof-flag">
      <line x1={at.x} y1={at.y} x2={top.x} y2={top.y} stroke="#d8d4c8" strokeWidth={1.2} />
      <path d={flagCloth(top, ROOF_FLAG_TILES, 1, 7, 2)} fill={colors.primary} />
      <path d={flagCloth(top, ROOF_FLAG_TILES, 3.6, 1.6, 2)} fill={colors.secondary} />
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

// The entrance, drawn in the wall's (u, v). Every wall has one in
// principle (walkRoutes.ts), and both visible walls draw theirs. Surround,
// two leaves with a mull, and a fanlight; smaller details are sub-pixel.
// Steps are EntranceSteps.
//
// Each door is tagged with its grid wall (`side`), and the walkers open it
// by class while someone is on its step (Walkers.tsx): the leaves swing in
// to their hinges and the hall behind shows.
function Door({ d, origin, along, wallHeight, span, side, shape = 'rect' }: {
  d: DoorDimensions;
  origin: Pt; along: Pt; wallHeight: number;
  span: number;   // this wall's length in tiles, so the door is the same real size on both
  side: FaceDir;  // the grid wall it is on
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
  // Open, each leaf is seen edge-on against its hinge: a sliver.
  const swung = (0.5 - mull - (u0 + reveal)) * 0.22;
  const openLeaves = (
    <>
      <polygon className="iso-door-leaf-open" points={quad(u0 + reveal, u0 + reveal + swung, v0 + h * 0.02, transom - bar)} />
      <polygon className="iso-door-leaf-open" points={quad(u1 - reveal - swung, u1 - reveal, v0 + h * 0.02, transom - bar)} />
    </>
  );

  if (shape === 'arched') {
    const arch = (a: number, b: number, c: number, e: number) =>
      polyPoints(windowOutline('arched', a, b, c, e).map(([u, v]) => at(u, v)));
    // The fanlight: the opening's arch, inset, cut off at the transom.
    const fan = polyPoints(
      windowOutline('arched', u0 + reveal, u1 - reveal, v0, v1 - h * 0.04)
        .map(([u, v]) => at(u, Math.max(v, transom + bar * 0.5))),
    );
    return (
      <g className="iso-door-way" data-door={side}>
        <polygon className="iso-door-surround" points={arch(u0 - SURROUND, u1 + SURROUND, v0, v1 + 0.012)} />
        <polygon className="iso-door" points={arch(u0, u1, v0, v1)} />
        <polygon className="iso-door-leaf" points={quad(u0 + reveal, 0.5 - mull, v0 + h * 0.02, transom - bar)} />
        <polygon className="iso-door-leaf" points={quad(0.5 + mull, u1 - reveal, v0 + h * 0.02, transom - bar)} />
        {openLeaves}
        <polygon className="iso-door-bar" points={quad(u0, u1, transom - bar, transom)} />
        <polygon className="iso-door-glass" points={fan} />
      </g>
    );
  }

  return (
    <g className="iso-door-way" data-door={side}>
      {/* The surround, then the opening cut into it. */}
      <polygon className="iso-door-surround" points={quad(u0 - SURROUND, u1 + SURROUND, v0, v1 + 0.012)} />
      <polygon className="iso-door" points={quad(u0, u1, v0, v1)} />

      {/* Two leaves either side of the mull. */}
      <polygon className="iso-door-leaf" points={quad(u0 + reveal, 0.5 - mull, v0 + h * 0.02, transom - bar)} />
      <polygon className="iso-door-leaf" points={quad(0.5 + mull, u1 - reveal, v0 + h * 0.02, transom - bar)} />
      {openLeaves}

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
    </g>
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

// A building's own elevations (Plan 88): its front carries the entrance the
// vernacular gives it (doorOf's door under its portico, porch or canopy);
// each side a plain door, and the back a service door, both at the middle
// of the wall where the walkers come and go (walkRoutes.ts). Each is the
// front door's size at most and on its floor, so the flight climbs as high.
function plainDoorOf(d: DoorDimensions | null, back: boolean): DoorDimensions | null {
  if (!d) return null;
  const plain = doorDimensions(back ? 'service' : 'civic');
  return { ...d, widthTiles: Math.min(d.widthTiles, plain.widthTiles), height: Math.min(d.height, plain.height) };
}

// A plain way in on wall `dir` of box (col, row, w, h): the door in the
// middle, its flight, and at the back (`service`) the bins by the door.
// Nothing on a wall the camera does not see.
function PlainEntrance({ d, col, row, w, h, dir, wallHeight, stone, shape = 'rect', service = false }: {
  d: DoorDimensions | null; col: number; row: number; w: number; h: number; dir: FaceDir;
  wallHeight: number; stone: StonePalette; shape?: 'rect' | 'arched'; service?: boolean;
}) {
  if (!d) return null;
  const wall = wallOf(boxFaces(col, row, w, h, 0, wallHeight), dir);
  if (!wall.visible) return null;
  const span = wallSpan(w, h, dir);
  const at = outsideWall(col, row, w, h, dir, span / 2, 0);
  const out = outwardOf(dir);
  return (
    <>
      <Door d={d} origin={wall.origin} along={wall.along} wallHeight={wallHeight} span={span} side={dir} shape={service ? 'rect' : shape} />
      {service && <ServiceBins d={d} col={col} row={row} w={w} h={h} dir={dir} />}
      <EntranceSteps d={d} centreCol={at.col} centreRow={at.row} outCol={out.col} outRow={out.row} span={span} stone={stone} />
    </>
  );
}

// Two wheeled bins against the back wall beside the service door: what
// says "the back" at a glance. Clear of the door's flight; none on a wall
// too short for them.
const BIN_PLAN = [across(1.2), across(0.9)] as const;   // along the wall, out from it
const BIN_RISE = up(1.25);
const BIN_GREEN = '#4f5f52';
function ServiceBins({ d, col, row, w, h, dir }: {
  d: DoorDimensions; col: number; row: number; w: number; h: number; dir: FaceDir;
}) {
  const span = wallSpan(w, h, dir);
  const clear = Math.min(d.widthTiles, span * 0.6) / 2 + STEP_OVERHANG + across(0.6);
  const step = BIN_PLAN[0] + across(0.3);
  const along0 = span / 2 + clear;
  if (along0 + step * 2 > span * 0.92) return null;
  const bins = depthOrder([0, 1].map((i) => againstWall(col, row, w, h, dir, along0 + step * i, BIN_PLAN[0], BIN_PLAN[1])));
  return (
    <>
      {bins.map((b, i) => {
        const f = boxFaces(b.col, b.row, b.w, b.h, 0, BIN_RISE);
        return (
          <g key={i} className="iso-bin">
            {sideFaces(f, shade(BIN_GREEN, 0.95), shade(BIN_GREEN, 0.78))}
            <polygon points={polyPoints(f.top)} fill={shade(BIN_GREEN, 1.15)} />
          </g>
        );
      })}
    </>
  );
}

// A rectangle of a plot given as fractions of its own frame (Plan 88): `u`
// across the front from its left, `v` from the back toward the front (the
// village's lots, authored for facing 0 with the front on +row), as a grid
// box, so the arrangement turns with the plot.
export function plotFraction(p: Plot, u: number, v: number, uw: number, vh: number): DepthBox {
  const fw = frontWidth(p); const fd = frontDepth(p);
  return localBox(p, fw * u, fd * (1 - v - vh), fw * (u + uw), fd * (1 - v));
}
// A village lot's house, laid out in the plot's own frame.
export function villageLotBox(p: Plot, lot: VillageLot): DepthBox {
  return plotFraction(p, lot.u, lot.v, lot.uw, lot.vh);
}

// A door's bay, when there is a door.
function bayOf(d: DoorDimensions | null, span: number, wallHeight: number): FaceRect | undefined {
  return d ? doorBay(d, span, wallHeight) : undefined;
}

// The academic hall: the landmark, drawn from a real reference building.
// Plinth, floor courses, cornice and parapet, a shallow hipped roof, a
// projecting pedimented center bay, raised end blocks, and on Founders Hall
// alone a clock tower (hasClockTower). Dimensions live in buildingSpec.ts.

// A band of stonework across a wall (plinth, cornice, parapet, course), in
// the wall's (u, v). Not drawn when `trim === 'none'` (Brutalist: the wall
// is one undivided thing).
function WallBand({ origin, along, wallHeight, from, to, className, u0 = 0, u1 = 1, fill }: {
  origin: Pt; along: Pt; wallHeight: number; from: number; to: number; className: string;
  // A u range lets the parapet be raised over the end bays alone.
  u0?: number; u1?: number;
  // A color over the class's own (a cornice cut in the vernacular's trim).
  fill?: string;
}) {
  if (wallHeight <= 0) return null;
  const v0 = Math.max(0, from) / wallHeight;
  const v1 = Math.min(wallHeight, to) / wallHeight;
  if (v1 <= v0) return null;
  return (
    <polygon
      className={className}
      style={fill ? { fill } : undefined}
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
  // Grid corners, not screen ones: each slope is named by the way it points.
  const NW = lift(project(col, row), base);
  const NE = lift(project(col + w, row), base);
  const SE = lift(project(col + w, row + h), base);
  const SW = lift(project(col, row + h), base);
  const rs = alongW
    ? lift(project(col + inset, row + h / 2), base + rise)
    : lift(project(col + w / 2, row + inset), base + rise);
  const re = alongW
    ? lift(project(col + w - inset, row + h / 2), base + rise)
    : lift(project(col + w / 2, row + h - inset), base + rise);
  const slopes: Array<[FaceDir, Pt[]]> = [
    ['negRow', alongW ? [NW, NE, re, rs] : [NW, NE, rs]],
    ['negCol', alongW ? [NW, SW, rs] : [NW, SW, re, rs]],
    ['posRow', alongW ? [SW, SE, re, rs] : [SW, SE, re]],
    ['posCol', alongW ? [NE, SE, re] : [NE, SE, re, rs]],
  ];
  return (
    <>
      {backSlopesFirst(slopes, (s) => s[0]).map(([dir, pts]) => (
        <polygon key={dir} points={polyPoints(pts)} fill={pal[dir]} />
      ))}
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

// The raised roofline ends as four corners (Plan 61): an L at each corner of
// the roof, wrapping it, so the roofline reads alike from every side. Each L
// is two boxes that only touch (the arm along the row edge, corner
// included, then the arm along the col edge), and the caller paints all
// eight in depth order: two overlapping boxes painted in a fixed order split
// the corner apart as the camera turned.
function cornerPavilions(col: number, row: number, w: number, h: number, plan: number, depth: number): DepthBox[] {
  const out: DepthBox[] = [];
  for (const [atEndCol, atEndRow] of [[false, false], [true, false], [true, true], [false, true]] as const) {
    out.push({ col: atEndCol ? col + w - plan : col, row: atEndRow ? row + h - depth : row, w: plan, h: depth });
    out.push({ col: atEndCol ? col + w - depth : col, row: atEndRow ? row + h - plan : row + depth, w: depth, h: plan - depth });
  }
  return out;
}

// A balustrade along the eaves, all four sides, with an urn on a pedestal at
// each corner (Plan 87H): how a Georgian hall finishes a hipped roof behind
// its parapet (Harvard's University Hall, the pavilions of Jefferson's
// Lawn). Plinth, balusters, rail and piers in the trim, painted after the
// roof: far sides first, then the corners far to near.
const EAVES_BALUSTRADE_RISE = up(1.1);
const EAVES_BALUSTRADE_DEPTH = across(0.45);
const BALUSTER_SPACING = across(0.7);
const BALUSTRADE_PIER_EVERY = across(13);
function EavesBalustrade({ col, row, w, h, base, stone }: {
  col: number; row: number; w: number; h: number; base: number; stone: StonePalette;
}) {
  const trim = stone.trim === NO_STONE ? stone.towerStone : stone.trim;
  const R = EAVES_BALUSTRADE_RISE; const D = EAVES_BALUSTRADE_DEPTH;
  const dirs: FaceDir[] = ['negRow', 'posCol', 'posRow', 'negCol'];
  const runOf = (dir: FaceDir) => againstWall(col, row, w, h, dir, 0, wallSpan(w, h, dir), D, D);
  const midY = (b: DepthBox) => project(b.col + b.w / 2, b.row + b.h / 2).y;
  const side = (dir: FaceDir) => {
    const b = runOf(dir);
    const span = wallSpan(w, h, dir);
    const plinth = boxFaces(b.col, b.row, b.w, b.h, base, R * 0.16);
    const rail = boxFaces(b.col, b.row, b.w, b.h, base + R * 0.78, R * 0.18);
    // The balusters, one path on the run's outer face.
    const face = wallOf(boxFaces(b.col, b.row, b.w, b.h, base + R * 0.16, R * 0.62), dir);
    const n = Math.max(2, Math.round(span / BALUSTER_SPACING));
    const bars = Array.from({ length: n }, (_, i) => {
      const u = (i + 0.5) / n;
      const a = facePoint(face.origin, face.along, R * 0.62, u, 0); const c = facePoint(face.origin, face.along, R * 0.62, u, 1);
      return `M${a.x},${a.y}L${c.x},${c.y}`;
    }).join('');
    // Piers between the corners, on a wide run.
    const piers = Math.max(0, Math.round(span / BALUSTRADE_PIER_EVERY) - 1);
    return (
      <g key={dir}>
        {sideFaces(plinth, shade(trim, 0.92), shade(trim, 0.76))}
        <polygon points={polyPoints(plinth.top)} fill={trim} />
        <path d={bars} stroke={shade(trim, face.visible ? 0.98 : 0.86)} strokeWidth={1} fill="none" />
        {sideFaces(rail, shade(trim, 0.95), shade(trim, 0.8))}
        <polygon points={polyPoints(rail.top)} fill={shade(trim, 1.02)} />
        {Array.from({ length: piers }, (_, i) => {
          const at = (span * (i + 1)) / (piers + 1);
          const pb = againstWall(col, row, w, h, dir, at - D * 0.6, D * 1.2, D * 1.2, D * 1.1);
          return <g key={i}>{plainBox(boxFaces(pb.col, pb.row, pb.w, pb.h, base, R), shade(trim, 0.95), shade(trim, 0.78), trim, `p${i}`)}</g>;
        })}
      </g>
    );
  };
  // An urn on its pedestal at each corner of the roof.
  const P = D * 1.5;
  const corners: Array<[number, number]> = [[col, row], [col + w - P, row], [col + w - P, row + h - P], [col, row + h - P]];
  const urn = ([c, r]: [number, number], i: number) => {
    const ped = boxFaces(c, r, P, P, base, R * 1.1);
    const foot = lift(project(c + P / 2, r + P / 2), base + R * 1.1);
    const at = (z: number) => lift(foot, z).y;
    const k = foot.y - at(1);                  // screen units per world unit of height
    // Drawn a little over life size (Plan 87H) so the urns read at the map's zoom.
    const rx = 2.6;
    const vase = [
      [-0.35, 0], [0.35, 0], [0.25, 0.25], [1, 0.75], [0.9, 1.25], [0.45, 1.5], [0.6, 1.62], [-0.6, 1.62], [-0.45, 1.5], [-0.9, 1.25], [-1, 0.75], [-0.25, 0.25],
    ].map(([x, z]) => ({ x: foot.x + x * rx, y: foot.y - z * up(1.4) * k }));
    return (
      <g key={`u${i}`}>
        {plainBox(ped, shade(trim, 0.95), shade(trim, 0.78), trim, `ped${i}`)}
        <polygon points={polyPoints(vase)} fill={shade(trim, 0.93)} stroke={shade(trim, 0.7)} strokeWidth={0.4} />
        <circle cx={foot.x} cy={foot.y - up(2.6) * k} r={1.3} fill={shade(trim, 0.9)} />
      </g>
    );
  };
  return (
    <g className="iso-eaves-balustrade">
      {[...dirs].sort((a, b) => midY(runOf(a)) - midY(runOf(b))).map(side)}
      {corners.map((p, i) => ({ p, i, y: project(p[0] + P / 2, p[1] + P / 2).y }))
        .sort((a, b) => a.y - b.y).map(({ p, i }) => urn(p, i))}
    </g>
  );
}

// How far a hall's temple front stands out from its centre bay (Plan 87O).
const HALL_PORTICO_DEPTH = across(3.4);

// The center bay projects from the front past the cornice, capped with a
// pediment, and carries the door so the entrance reads as the front.
//
// Its width: three structural bays, capped at half the front. Shared with
// the portico so the two agree on the middle.
function pavilionWidth(span: number): number {
  return Math.min(span * 0.5, (span / baysAcross(span)) * PAVILION_BAYS);
}

function CentrePavilion({ col, row, w, h, wallHeight, outward, pal, door, sills, paneW, paneShape, glass, tied = false }: {
  col: number; row: number; w: number; h: number; wallHeight: number;
  outward: FaceDir;
  pal: Palette;
  door: DoorDimensions | null;
  sills: number[]; paneW: number; paneShape: WindowShape; glass: string;
  // Under a temple front tied into the roof (Plan 87O): the bay stops at
  // the cornice, and the portico's pediment and roof stand in for its own.
  tied?: boolean;
}) {
  const span = wallSpan(w, h, outward);
  const width = pavilionWidth(span);
  const top = wallHeight + (tied ? 0 : PAVILION_RISE);
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
      {door && <Door d={door} origin={front.o} along={front.a} wallHeight={top} span={width} side={outward} />}
      {!tied && <polygon points={polyPoints(f.top)} fill={pal.roofDeck} />}
      {/* The pediment, on the door's face. */}
      {!tied && <polygon className="iso-pediment" points={polyPoints([frontTopL, frontTopR, apex])} />}
    </>
  );
}

// A colonnade's column count: one per bay, capped, and always even, so the
// middle of the run (the door) falls between two columns rather than behind
// one (Plan 61: the Georgian library's doors were each blocked by a column).
function colonnadeColumns(span: number): number {
  const n = Math.max(2, Math.min(COLONNADE_MAX, Math.round((span * 0.9 * METRES_PER_TILE) / COLONNADE_BAY_METRES)));
  return n % 2 === 0 ? n : n - 1;
}

// The portico: square columns standing clear of the center bay under an
// entablature, drawn between the pavilion and the steps. Square shafts
// because round shading is not worth it at this size; the rhythm is what
// reads.
function Portico({ centreCol, centreRow, width, outward, stone, columns = PORTICO_COLUMNS, height = PORTICO_HEIGHT, pediment = false, temple = false }: {
  centreCol: number; centreRow: number; width: number; outward: FaceDir;
  stone: StonePalette; columns?: number; height?: number;
  // A pediment over the entablature (Classical temple front).
  pediment?: boolean;
  // A temple front (the exchange, Plan 61): the pediment pitched to its
  // width and roofed back to the wall, so it reads at campus scale.
  temple?: boolean;
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
        // Toned by the way the front faces (light.ts), not by which side
        // of the screen it is on.
        const lit = WALL_LIGHT[outward];
        const mid = { x: (fo.x + fa.x) / 2, y: (fo.y + fa.y) / 2 };
        // A temple's pediment pitched at about 15 degrees across its width.
        const rise = temple ? up((width * METRES_PER_TILE / 2) * 0.27) : PEDIMENT_RISE;
        const apex = lift(mid, top + rise);
        const inset = (q: Pt, sign: number) => ({ x: q.x + sign * 6, y: q.y });
        // Back to the wall: the portico's depth, inward.
        const out = outwardOf(outward);
        const depth = PORTICO_STANDOFF + PORTICO_COLUMN_PLAN;
        const o0 = project(0, 0); const o1 = project(-out.col * depth, -out.row * depth);
        const back = (q: Pt) => ({ x: q.x + o1.x - o0.x, y: q.y + o1.y - o0.y });
        const eaveL = lift(fo, top); const eaveR = lift(fa, top);
        return (
          <>
            {temple && (
              <>
                <polygon points={polyPoints([eaveL, apex, back(apex), back(eaveL)])} fill={shade(stone.towerStone, 0.72)} />
                <polygon points={polyPoints([apex, eaveR, back(eaveR), back(apex)])} fill={shade(stone.towerStone, 0.62)} />
              </>
            )}
            <polygon points={polyPoints([eaveL, eaveR, apex])} fill={shade(stone.towerStone, lit)} />
            <polygon
              points={polyPoints([inset(lift(fo, top + up(0.35)), 1), inset(lift(fa, top + up(0.35)), -1), lift(mid, top + rise - up(0.4))])}
              fill={shade(stone.towerStone, lit * 0.88)}
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
function Porch({ col, row, w, h, wallHeight, outward, pal, stone, roofAt, part }: {
  col: number; row: number; w: number; h: number; wallHeight: number;
  outward: FaceDir;
  pal: Palette; stone: StonePalette;
  // The main roof: given, the porch's gable roof runs back into it (or to
  // the wall) instead of stopping at a flat deck (Plan 87O). `part` splits
  // the body (before the steps) from that roof (after the main roof).
  roofAt?: RoofAt;
  part?: 'body' | 'roof';
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

  if (roofAt && part === 'roof') return porchRoof(col, row, w, h, wallHeight, outward, pal, stone, roofAt);
  if (roofAt) {
    // The body, its deck and gable left to the roof.
    return (
      <>
        {buttress(false)}
        <polygon points={polyPoints(side.poly)} fill={side.fill} />
        <polygon points={polyPoints([front.o, front.a, frontTopR, frontTopL])} fill={frontFill} />
        <WallBand origin={front.o} along={front.a} wallHeight={top} from={0} to={PLINTH} className="iso-plinth" />
        <polygon
          className="iso-door"
          points={polyPoints(
            windowOutline('lancet', archU0, archU1, 0, PORCH_ARCH_HEIGHT)
              .map(([u, v]) => facePoint(front.o, front.a, top, u, v)),
          )}
        />
        {buttress(true)}
        {part !== 'body' && porchRoof(col, row, w, h, wallHeight, outward, pal, stone, roofAt)}
      </>
    );
  }

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

// The porch's gable roof run back into the main roof (Plan 87O): its
// slopes, then the gable end in the wall's stone with a coping.
function porchRoof(col: number, row: number, w: number, h: number, wallHeight: number, outward: FaceDir, pal: Palette, stone: StonePalette, roofAt: RoofAt) {
  const span = wallSpan(w, h, outward);
  const width = pavilionWidth(span);
  const top = wallHeight * PORCH_HEIGHT_FRACTION;
  const g = crossGable({
    col, row, w, h, dir: outward, along0: span / 2 - width / 2, width, reach: PAVILION_DEPTH, top, rise: PORCH_GABLE_RISE, roofAt, slopes: pal,
  });
  const fill = pal.wall[outward];
  return (
    <g key={`pr${outward}`}>
      {g.roof}
      <polygon points={polyPoints([g.face.origin, g.face.along, g.apex])} fill={fill} stroke={shade(stone.trim === NO_STONE ? fill : stone.trim, 0.85)} strokeWidth={1.2} />
    </g>
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
      {/* The arcade's front wall, whitewashed, with the arches cut through it
          (Plan 74G): without spandrels a row of dark bays read as a barcode
          at the opening zoom. */}
      <path
        fillRule="evenodd"
        fill={faceTone(outward, shade(stone.trim, 0.94), shade(stone.trim, 0.76))}
        d={[
          `M${[o, a, facePoint(o, a, height, 1, 1), facePoint(o, a, height, 0, 1)].map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join('L')}Z`,
          ...Array.from({ length: bays }, (_, i) => {
            const pts = windowOutline('arched', (i + 0.09) / bays, (i + 0.91) / bays, 0, 0.84)
              .map(([u, v]) => facePoint(o, a, height, u, v));
            return `M${pts.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join('L')}Z`;
          }),
        ].join('')}
      />
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
  const cap = pyramid(cc - plan / 2, cr - plan / 2, plan, capBase, CAMPANILE_CAP_RISE, pal.roof);
  const tip = cap.tip;

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
      {cap.faces}
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
function BellGable({ origin, along, inward, wallHeight, span, centreU, sideAt, pal, stone, scale = 1, rear }: {
  origin: Pt; along: Pt; inward: { origin: Pt; along: Pt };
  wallHeight: number; span: number; centreU: number;
  // Which end shows its return: +u on the left wall, -u on the right.
  sideAt: 'u0' | 'u1';
  pal: Palette; stone: StonePalette;
  // Uniform scale (a pavilion's is smaller than a hall's).
  scale?: number;
  // Seen from behind, on a front the camera does not see (Plan 88): only
  // its back in this tone and the opening, painted before the mass so the
  // part above the roof shows.
  rear?: string;
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
  if (rear) {
    return (
      <>
        <polygon points={polyPoints(profile.map(([u, v]) => at(u, v)))} fill={rear} />
        <polygon className="iso-undercroft" points={polyPoints(opening.map(([u, v]) => at(u, v)))} />
        <line x1={finial.x} y1={finial.y} x2={finial.x} y2={lift(finial, finialRise).y} stroke={stone.gilt} strokeWidth={1.2} />
      </>
    );
  }
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
function Buttresses({ col, row, w, h, height, outward, pal, stone, reserve, skipNear = 0, corner }: {
  col: number; row: number; w: number; h: number; height: number; outward: FaceDir;
  pal: Palette; stone: StonePalette;
  // The entrance's stretch of this wall, in u.
  reserve?: [number, number];
  // Tiles held by a corner tower either side of its corner.
  skipNear?: number;
  // The grid corner the tower stands at: the +col, +row one unless given
  // (a building's front-right corner, Plan 88).
  corner?: { col: number; row: number };
}) {
  const span = wallSpan(w, h, outward);
  const bays = baysAcross(span);
  if (bays < 2) return null;
  const depth = across(0.85);
  const shrink = depth * 0.42;
  const lowH = height * 0.5; const midH = height * 0.82;
  const out: React.JSX.Element[] = [];
  // Where the tower's corner is along this wall, if the wall runs to it.
  const at = corner ?? { col: col + w, row: row + h };
  const line = outward === 'posRow' ? row + h : outward === 'negRow' ? row : outward === 'posCol' ? col + w : col;
  const onWall = Math.abs((isRowWall(outward) ? at.row : at.col) - line) < 1e-6;
  const cornerAlong = isRowWall(outward) ? at.col - col : at.row - row;
  for (let b = 1; b < bays; b++) {
    const u = b / bays;
    if (reserve && u > reserve[0] - 0.03 && u < reserve[1] + 0.03) continue;
    const along = u * span;
    if (skipNear > 0 && onWall && Math.abs(along - cornerAlong) < skipNear + BUTTRESS_PLAN) continue;
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
  // Walls by the way each faces (a balustrade's stone authored as its +row
  // and +col tones); the top faces up and takes the +row wall's tone lifted.
  const sides = (f: BoxFaces) => (fill
    ? sideFaces(f, shade(fill, 0.96), shade(fill, 0.8))
    : <><polygon points={polyPoints(f.left)} fill={pal.wallLeft} /><polygon points={polyPoints(f.right)} fill={pal.wallRight} /></>);
  const top = fill ? fill : shade(pal.wall.posRow, 1.08);
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
            {sides(f)}
            <polygon points={polyPoints(f.top)} fill={top} />
          </g>
        );
      })}
      {rail && (
        <>
          {sides(railBox)}
          <polygon points={polyPoints(railBox.top)} fill={top} />
        </>
      )}
    </>
  );
}

// The studio's sawtooth roof (Plan 61, Arts & Media): north-light teeth
// across the long axis, each a slope up to a glazed upright face. Teeth are
// painted in depth order and each face only when it faces the camera
// (tested against the deck's own winding), so the roof turns with the view.
const SAWTOOTH_RISE = up(3.2);
// Sky in the north lights, whatever the vernacular's window paint.
const NORTH_LIGHT_GLASS = '#a9c0cc';
function SawtoothRoof({ col, row, w, h, base, pal, glass }: {
  col: number; row: number; w: number; h: number; base: number; pal: Palette; glass: string;
}) {
  const alongW = w >= h;
  const long = alongW ? w : h;
  const teeth = Math.max(3, Math.round(long / across(9)));
  const inset = across(0.6);
  const at = (c: number, r: number, z: number) => lift(project(c, r), z);
  const area = (pts: Pt[]) => pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p.x * q.y - q.x * p.y; }, 0);
  // The deck, wound counterclockwise seen from above, is always seen: a face
  // wound the same way seen from outside is seen when its sign matches.
  const seenSign = Math.sign(area([at(0, 0, 0), at(1, 0, 0), at(1, 1, 0), at(0, 1, 0)]));
  const seen = (pts: Pt[]) => Math.sign(area(pts)) === seenSign;
  const c0 = col + inset; const r0 = row + inset; const cw = w - inset * 2; const rh = h - inset * 2;
  const boxes = Array.from({ length: teeth }, (_, i) => (alongW
    ? { col: c0 + (cw / teeth) * i, row: r0, w: cw / teeth, h: rh }
    : { col: c0, row: r0 + (rh / teeth) * i, w: cw, h: rh / teeth }));
  return (
    <>
      {depthOrder(boxes).map((b, i) => {
        const z0 = base; const z1 = base + SAWTOOTH_RISE;
        // Local frame: `a` runs along the long axis (low edge to glazed edge),
        // `b` across it.
        const P = (a: number, bb: number, z: number) => (alongW ? at(b.col + a * b.w, b.row + bb * b.h, z) : at(b.col + bb * b.w, b.row + a * b.h, z));
        // Outward-facing, counterclockwise from outside when alongW; the
        // other axis mirrors the frame, so every winding flips.
        const fix = (pts: Pt[]) => (alongW ? pts : [...pts].reverse());
        const slope = fix([P(0, 0, z0), P(1, 0, z1), P(1, 1, z1), P(0, 1, z0)]);
        const glazed = fix([P(1, 0, z0), P(1, 1, z0), P(1, 1, z1), P(1, 0, z1)]);
        const endA = fix([P(0, 0, z0), P(1, 0, z0), P(1, 0, z1)]);
        const endB = fix([P(0, 1, z0), P(1, 1, z1), P(1, 1, z0)]);
        return (
          <g key={i}>
            {seen(endA) && <polygon points={polyPoints(endA)} fill={pal.wallLeft} />}
            {seen(endB) && <polygon points={polyPoints(endB)} fill={pal.wallRight} />}
            {seen(glazed) && <polygon points={polyPoints(glazed)} fill={glass} stroke={pal.roofDeck} strokeWidth={0.4} />}
            {seen(slope) && <polygon points={polyPoints(slope)} fill={pal.roof} stroke={pal.roofDeck} strokeWidth={0.3} />}
          </g>
        );
      })}
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

// A coping along a flat parapet's head: stone in the trim, or clay tile
// (Plan 74E).
function CrestCoping({ col, row, w, h, base, outward, fill }: {
  col: number; row: number; w: number; h: number; base: number; outward: FaceDir; fill: string;
}) {
  const span = wallSpan(w, h, outward);
  const depth = across(0.55);
  const b = againstWall(col, row, w, h, outward, -depth * 0.3, span + depth * 0.6, depth, depth);
  const f = boxFaces(b.col, b.row, b.w, b.h, base, up(0.9));
  return (
    <>
      {sideFaces(f, shade(fill, 0.96), shade(fill, 0.8))}
      <polygon points={polyPoints(f.top)} fill={shade(fill, 1.06)} />
    </>
  );
}

// The crest a vernacular puts on a block's, a lab's or a shed's parapet
// (buildingSpec's crestOf), along each visible wall.
function Crest({ crest, col, row, w, h, base, fronts, pal, stone, tile }: {
  crest: CrestPart; col: number; row: number; w: number; h: number; base: number;
  fronts: FaceDir[]; pal: Palette; stone: StonePalette; tile: string;
}) {
  if (crest === 'none') return null;
  const trimmed = stone.trim !== 'none';
  return (
    <>
      {fronts.map((dir) => {
        switch (crest) {
          case 'merlons': return <Merlons key={dir} col={col} row={row} w={w} h={h} base={base} outward={dir} pal={pal} block={across(1.5)} gap={across(1.1)} rise={up(1.6)} depth={across(0.6)} />;
          case 'balustrade': return trimmed ? <Balustrade key={dir} col={col} row={row} w={w} h={h} base={base} outward={dir} pal={pal} stone={stone} /> : null;
          case 'coping': return <CrestCoping key={dir} col={col} row={row} w={w} h={h} base={base} outward={dir} fill={trimmed ? stone.trim : shade(pal.wall.posRow, 1.1)} />;
          case 'tile': return <CrestCoping key={dir} col={col} row={row} w={w} h={h} base={base} outward={dir} fill={tile} />;
        }
      })}
    </>
  );
}

// --- Signifiers (Plan 74F): one mark per building that would otherwise
// share its drawing with a building that does something else.

// The near half of a ring, left to right.
function nearRing(pts: Pt[]): Pt[] {
  const l = pts.reduce((a, q) => (q.x < a.x ? q : a));
  const r = pts.reduce((a, q) => (q.x > a.x ? q : a));
  return pts.filter((q) => q.y >= (l.y + r.y) / 2 - 0.01).sort((a, b) => a.x - b.x);
}

// An upright cylinder: a column, a tank, a stack.
function Cylinder({ cc, cr, r, z0, z1, fill }: { cc: number; cr: number; r: number; z0: number; z1: number; fill: string }) {
  const ring = (z: number) => projectedCircle(cc, cr, r, 24).map((q) => lift(q, z));
  return (
    <>
      <polygon points={polyPoints([...nearRing(ring(z0)), ...nearRing(ring(z1)).reverse()])} fill={fill} stroke="rgba(40, 42, 44, 0.35)" strokeWidth={0.6} />
      <polygon points={polyPoints(ring(z1))} fill={shade(fill, 1.08)} stroke="rgba(40, 42, 44, 0.3)" strokeWidth={0.5} />
    </>
  );
}

// --- The school labs (Plan 87E) -----------------------------------------
// Science, Engineering, Health and Computer Science were one box under four
// roof units. Each now carries what that kind of building carries: Science
// a row of fume-hood stacks and a rooftop greenhouse (the lab towers of any
// chemistry building); Engineering a high-bay workshop with a sectional door
// and a crane beam over it; Health a drop-off canopy, a clinic sign with a
// green cross and bay windows; Computer Science a glazed atrium rising past
// the parapet and arrays of solar panels. The walls are the vernacular's.

// Galvanised steel: the fan deck and the louvred plant screens.
const PLANT_STEEL = '#a9aeb0';

export type SchoolRoofPart = 'fumeRow' | 'greenhouse' | 'plantScreen' | 'solar';

// A box by fractions along the footprint's long side (a) and across it (c).
function longBox(col: number, row: number, w: number, h: number, a0: number, a1: number, c0: number, c1: number): DepthBox {
  return w >= h
    ? { col: col + w * a0, row: row + h * c0, w: w * (a1 - a0), h: h * (c1 - c0) }
    : { col: col + w * c0, row: row + h * a0, w: w * (c1 - c0), h: h * (a1 - a0) };
}

// What a school lab stands on its flat roof, in place of the generic plant.
function schoolRoofItems(sig: SignatureFeature | undefined, col: number, row: number, w: number, h: number): RoofItem[] {
  const item = (part: SchoolRoofPart, key: string, b: DepthBox): RoofItem => ({ kind: 'school', part, key, ...b });
  const screen = (a0: number, a1: number, c0: number, c1: number) => {
    const b = longBox(col, row, w, h, a0, a1, c0, c1);
    return item('plantScreen', 'screen', { ...b, w: Math.min(b.w, across(9)), h: Math.min(b.h, across(9)) });
  };
  switch (sig) {
    case 'fumeHoods':
      return [
        item('fumeRow', 'fume', longBox(col, row, w, h, 0.08, 0.92, 0.07, 0.2)),
        item('greenhouse', 'greenhouse', longBox(col, row, w, h, 0.08, 0.6, 0.42, 0.86)),
        screen(0.68, 0.9, 0.46, 0.84),
      ];
    case 'workshop': return [screen(0.3, 0.7, 0.3, 0.7)];
    case 'clinic': return [screen(0.56, 0.84, 0.22, 0.6)];
    case 'atrium': {
      // Rows along col, tilted to +row, in two arrays a row with a walkway
      // between; clear of the atrium crowns at the walls.
      const pitch = across(6.5);
      const n = Math.max(1, Math.floor((h * 0.72) / pitch));
      const depth = Math.min(across(4.2), pitch * 0.68);
      const out: RoofItem[] = [];
      for (let i = 0; i < n; i++) {
        const r0 = row + h * 0.14 + i * pitch + (h * 0.72 - n * pitch) / 2;
        out.push(item('solar', `solar-${i}a`, { col: col + w * 0.12, row: r0, w: w * 0.36, h: depth }));
        out.push(item('solar', `solar-${i}b`, { col: col + w * 0.52, row: r0, w: w * 0.36, h: depth }));
      }
      return out;
    }
    default: return [];
  }
}

// One school roof part, standing on the roof at `base`.
function SchoolRoofItem({ part, col, row, w, h, base, tint }: DepthBox & { part: SchoolRoofPart; base: number; tint: string }) {
  const alongW = w >= h;
  switch (part) {
    case 'fumeRow': {
      // A fan deck along the back of the roof and a row of tall slim exhaust
      // stacks on it, each under a rain cap; drawn far to near.
      const deckRise = up(1.1);
      const deck = boxFaces(col, row, w, h, base, deckRise);
      const n = 6;
      const r = Math.min(across(0.6), Math.min(w, h) * 0.3);
      const z0 = base + deckRise; const z1 = z0 + up(7.5);
      const stacks = Array.from({ length: n }, (_, i) => {
        const a = (i + 0.5) / n;
        return alongW ? { cc: col + w * a, cr: row + h * 0.5 } : { cc: col + w * 0.5, cr: row + h * a };
      }).sort((p, q) => project(p.cc, p.cr).y - project(q.cc, q.cr).y);
      return (
        <g className="school-fume-hoods">
          {sideFaces(deck, shade(PLANT_STEEL, 0.82), shade(PLANT_STEEL, 0.68))}
          <polygon points={polyPoints(deck.top)} fill={shade(PLANT_STEEL, 0.94)} />
          {stacks.map(({ cc, cr }, i) => (
            <g key={i}>
              <Cylinder cc={cc} cr={cr} r={r} z0={z0} z1={z1} fill="#b8bdc1" />
              <Cylinder cc={cc} cr={cr} r={r * 0.4} z0={z1} z1={z1 + up(0.5)} fill="#6f767b" />
              <Cylinder cc={cc} cr={cr} r={r * 1.75} z0={z1 + up(0.5)} z1={z1 + up(0.9)} fill="#8b9196" />
            </g>
          ))}
        </g>
      );
    }
    case 'greenhouse': {
      // A glazed ridge house: a low wall, glass walls and roof on a frame,
      // benches of plants showing through.
      const eaves = up(2.4); const ridge = up(4.4); const knee = up(0.7);
      const f = boxFaces(col, row, w, h, base, eaves);
      const rA = lift(alongW ? project(col, row + h / 2) : project(col + w / 2, row), base + ridge);
      const rB = lift(alongW ? project(col + w, row + h / 2) : project(col + w / 2, row + h), base + ridge);
      const slopes: Array<[FaceDir, Pt[], Pt[]]> = alongW
        ? [['negRow', [f.NWt, f.NEt], [rA, rB]], ['posRow', [f.SWt, f.SEt], [rA, rB]]]
        : [['negCol', [f.NWt, f.SWt], [rA, rB]], ['posCol', [f.NEt, f.SEt], [rA, rB]]];
      const endDir: FaceDir = alongW ? 'posCol' : 'posRow';
      const end: Pt[] = wallOf(f, endDir).visible
        ? (alongW ? [f.NEt, f.SEt, rB] : [f.SWt, f.SEt, rB])
        : (alongW ? [f.NWt, f.SWt, rA] : [f.NWt, f.NEt, rA]);
      const bays = Math.max(3, Math.round(Math.max(w, h) / across(2.2)));
      const frame = '#f2f4f2';
      const faces = [{ o: f.D, a: f.C, span: f.spanLeft }, { o: f.C, a: f.B, span: f.spanRight }];
      const benches = boxFaces(col + w * 0.06, row + h * 0.1, w * 0.88, h * 0.8, base, up(1.6));
      return (
        <g className="school-greenhouse">
          <polygon points={polyPoints(benches.top)} fill="#4f8a3c" />
          {faces.map(({ o, a, span }, i) => {
            const n = Math.max(2, Math.round(span / across(2.2)));
            return (
              <g key={i}>
                <polygon points={polyPoints(wallQuad(o, a, eaves, 0, 1, 0, eaves))} className="glass-pane" />
                <polygon points={polyPoints(wallQuad(o, a, eaves, 0, 1, 0, knee))} fill={shade(tint, i === 0 ? 0.9 : 0.75)} />
                {Array.from({ length: n + 1 }, (_, k) => {
                  const p0 = facePoint(o, a, eaves, k / n, knee / eaves); const p1 = facePoint(o, a, eaves, k / n, 1);
                  return <line key={k} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={frame} strokeWidth={0.8} />;
                })}
              </g>
            );
          })}
          {backSlopesFirst(slopes, (x) => x[0]).map(([dir, [e0, e1], [q0, q1]]) => (
            <g key={dir}>
              <polygon points={polyPoints([e0, e1, q1, q0])} fill="rgba(214, 238, 242, 0.5)" stroke="rgba(80, 104, 110, 0.6)" strokeWidth={0.8} />
              {Array.from({ length: bays - 1 }, (_, k) => {
                const t = (k + 1) / bays;
                const lo = { x: e0.x + (e1.x - e0.x) * t, y: e0.y + (e1.y - e0.y) * t };
                const hi = { x: q0.x + (q1.x - q0.x) * t, y: q0.y + (q1.y - q0.y) * t };
                return <line key={k} x1={lo.x} y1={lo.y} x2={hi.x} y2={hi.y} stroke={frame} strokeWidth={0.7} />;
              })}
            </g>
          ))}
          <polygon points={polyPoints(end)} fill="rgba(214, 238, 242, 0.5)" stroke="rgba(80, 104, 110, 0.6)" strokeWidth={0.8} />
          <line x1={rA.x} y1={rA.y} x2={rB.x} y2={rB.y} stroke={frame} strokeWidth={1.3} />
        </g>
      );
    }
    case 'plantScreen': {
      // A louvred screen round the air handlers: slatted walls, a fan in the
      // open top.
      const rise = up(2.8);
      const f = boxFaces(col, row, w, h, base, rise);
      const faces = [{ o: f.D, a: f.C }, { o: f.C, a: f.B }];
      const slats = 6;
      const top = boxFaces(col, row, w, h, base, rise).top;
      const r = Math.min(w, h) * 0.26;
      const fan = projectedCircle(col + w / 2, row + h / 2, r, 20).map((q) => lift(q, base + rise));
      return (
        <g className="school-plant-screen">
          {sideFaces(f, shade(PLANT_STEEL, 0.92), shade(PLANT_STEEL, 0.76))}
          {faces.map(({ o, a }, i) => (
            <g key={i}>
              {Array.from({ length: slats }, (_, k) => {
                const v = (k + 0.6) / slats;
                const p0 = facePoint(o, a, rise, 0.02, v); const p1 = facePoint(o, a, rise, 0.98, v);
                return <line key={k} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={shade(PLANT_STEEL, 0.55)} strokeWidth={0.8} />;
              })}
            </g>
          ))}
          <polygon points={polyPoints(top)} fill={shade(PLANT_STEEL, 0.62)} />
          <polygon points={polyPoints(fan)} fill="#3d4246" stroke="#8b9196" strokeWidth={0.8} />
        </g>
      );
    }
    case 'solar': {
      // An east-west array: two banks of dark blue cells leaning back to
      // back along a ridge, so one bank faces the camera from any side; the
      // gray backs of a bank turned away.
      const zRidge = base + up(1.5); const zLo = base + up(0.45);
      const mid = row + h / 2;
      const P3 = (c: number, r: number, z: number) => lift(project(c, r), z);
      const ground = [project(col, row), project(col + w, row), project(col + w, row + h), project(col, row + h)];
      const area = (p: Pt[]) => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]!; return s + a.x * b.y - b.x * a.y; }, 0);
      const banks: Array<[FaceDir, Pt[]]> = [
        ['negRow', [P3(col, row, zLo), P3(col + w, row, zLo), P3(col + w, mid, zRidge), P3(col, mid, zRidge)]],
        ['posRow', [P3(col, mid, zRidge), P3(col + w, mid, zRidge), P3(col + w, row + h, zLo), P3(col, row + h, zLo)]],
      ];
      const cells = Math.max(4, Math.round(w / across(1.7)));
      return (
        <g className="school-solar">
          {backSlopesFirst(banks, (b) => b[0]).map(([dir, q]) => {
            const front = Math.sign(area(q)) === Math.sign(area(ground));
            const P = (s: number, t: number): Pt => ({
              x: q[0]!.x + (q[1]!.x - q[0]!.x) * s + (q[3]!.x - q[0]!.x) * t,
              y: q[0]!.y + (q[1]!.y - q[0]!.y) * s + (q[3]!.y - q[0]!.y) * t,
            });
            return (
              <g key={dir}>
                <polygon points={polyPoints(q)} fill={front ? '#1f3d70' : '#73797e'} stroke={front ? '#c8d2dc' : '#4f5459'} strokeWidth={0.6} />
                {front && Array.from({ length: cells - 1 }, (_, k) => {
                  const a = P((k + 1) / cells, 0); const b = P((k + 1) / cells, 1);
                  return <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#7d9cc8" strokeWidth={0.45} />;
                })}
                {front && (() => { const a = P(0, 0.5); const b = P(1, 0.5); return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#7d9cc8" strokeWidth={0.45} />; })()}
              </g>
            );
          })}
          {/* The end the camera sees: a frame triangle. */}
          {(() => {
            const c = wallOf(boxFaces(col, row, w, h, 0, 0), 'posCol').visible ? col + w : col;
            return <polygon points={polyPoints([P3(c, row, zLo), P3(c, mid, zRidge), P3(c, row + h, zLo), P3(c, row + h, base), P3(c, row, base)])} fill="#5d6267" />;
          })()}
        </g>
      );
    }
  }
}

// Whether the camera sees wall `dir` of any box now.
function wallSeen(dir: FaceDir): boolean {
  const s = visibleWalls();
  return dir === s.left || dir === s.right;
}
// Wall `dir` of box `f` as a face to draw on (origin, along, length in
// tiles), or null when the camera does not see it: a feature anchored to one
// of the building's own sides is drawn only while that wall shows.
function seenWall(f: BoxFaces, dir: FaceDir): { o: Pt; a: Pt; span: number; dir: FaceDir } | null {
  if (dir === f.dir.CD) return { o: f.D, a: f.C, span: f.spanLeft, dir };
  if (dir === f.dir.BC) return { o: f.C, a: f.B, span: f.spanRight, dir };
  return null;
}

// Engineering's footprint: the office block and, at one end of the long
// axis, the high-bay workshop wing, set out in the building's own frame:
// at its left end when the front is the long wall, else at its back, so the
// wing stays at the same end of the building as the camera turns. `end` is
// the wing's outer end wall (its loading door and crane), `joint` the wall
// it shares with the office.
const WORKSHOP_SHARE = 0.4;
const WORKSHOP_RISE = up(5.6);
function workshopSplit(col: number, row: number, w: number, h: number, facing?: Facing): { office: DepthBox; wing: DepthBox; end: FaceDir; joint: FaceDir } {
  const p = { col, row, w, h, facing };
  const W = frontWidth(p); const D = frontDepth(p);
  const sides = sidesOf(facing);
  return W >= D
    ? { wing: localBox(p, 0, 0, W * WORKSHOP_SHARE, D), office: localBox(p, W * WORKSHOP_SHARE, 0, W, D), end: sides.left, joint: sides.right }
    : { wing: localBox(p, 0, D * (1 - WORKSHOP_SHARE), W, D), office: localBox(p, 0, 0, W, D * (1 - WORKSHOP_SHARE)), end: sides.back, joint: sides.front };
}

// A sectional door: a dark frame, steel panels in horizontal slats and a
// row of vision panes, on wall `face` of a wall `H` high and `span` tiles long.
function SectionalDoor({ o, a, H, span, widthM, heightM }: { o: Pt; a: Pt; H: number; span: number; widthM: number; heightM: number }) {
  const half = across(widthM) / span / 2;
  const top = up(heightM);
  const slat = up(0.62);
  const n = Math.floor(top / slat);
  const panes = 4;
  return (
    <g className="school-sectional-door">
      <polygon points={polyPoints(wallQuad(o, a, H, 0.5 - half - 0.015, 0.5 + half + 0.015, 0, top + up(0.5)))} fill="#3a3f43" />
      <polygon points={polyPoints(wallQuad(o, a, H, 0.5 - half, 0.5 + half, 0, top))} fill="#c4cacd" />
      {Array.from({ length: n }, (_, k) => {
        const p0 = facePoint(o, a, H, 0.5 - half, ((k + 1) * slat) / H); const p1 = facePoint(o, a, H, 0.5 + half, ((k + 1) * slat) / H);
        return <line key={k} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="#7b8489" strokeWidth={0.7} />;
      })}
      {Array.from({ length: panes }, (_, k) => {
        const u0 = 0.5 - half + ((k + 0.25) / panes) * half * 2; const u1 = 0.5 - half + ((k + 0.75) / panes) * half * 2;
        return <polygon key={`p${k}`} points={polyPoints(wallQuad(o, a, H, u0, u1, top * 0.58, top * 0.58 + slat * 0.8))} fill="#33424c" />;
      })}
      <polygon points={polyPoints(wallQuad(o, a, H, 0.5 - half - 0.015, 0.5 + half + 0.015, top + up(0.5), top + up(0.8)))} fill={GANTRY_YELLOW} />
    </g>
  );
}

// The workshop wing: tall plain walls, a clerestory, a sectional door in
// the middle of each outside wall (the big loading door on its end wall),
// a crane beam over the end wall's door, and rooflights. The crane stays on
// the end wall: when the camera cannot see that wall it is drawn first, so
// what shows of it past the wing stands behind it. `crestNode` is the
// vernacular's crest on its parapet.
function WorkshopWing({ wing, end, joint, height, pal, stone, trim, crestNode }: {
  wing: DepthBox; end: FaceDir; joint: FaceDir; height: number; pal: Palette; stone: StonePalette; trim: boolean;
  crestNode: React.ReactNode;
}) {
  const { col, row, w, h } = wing;
  const H = height;
  const f = boxFaces(col, row, w, h, 0, H);
  const seen = visibleWalls();
  const faces = ([seen.left, seen.right] as FaceDir[]).map((dir) => ({ dir, ...wallOf(f, dir), span: wallSpan(w, h, dir) }));
  const outside = faces.filter((x) => x.dir !== joint);
  const endSeen = wallSeen(end);
  const craneOn = { dir: end, span: wallSpan(w, h, end) };
  const doorW = (dir: FaceDir) => (dir === end ? 10 : 8);
  const doorH = (dir: FaceDir) => (dir === end ? 8 : 7);
  const lights = depthOrder([0.3, 0.7].map((t) => (isRowWall(end)
    ? { col: col + w * 0.1, row: row + h * t - across(0.9), w: w * 0.8, h: across(1.8) }
    : { col: col + w * t - across(0.9), row: row + h * 0.1, w: across(1.8), h: h * 0.8 })));
  const crane = (() => {
    const { dir, span } = craneOn;
    const reach = across(7);
    const zb = up(doorH(dir) + 1.6);
    const beam = againstWall(col, row, w, h, dir, span / 2 - across(0.35), across(0.7), reach);
    const bf = boxFaces(beam.col, beam.row, beam.w, beam.h, zb, up(1));
    const trolley = againstWall(col, row, w, h, dir, span / 2 - across(0.5), across(1), across(1.2), -across(4.6));
    const tf = boxFaces(trolley.col, trolley.row, trolley.w, trolley.h, zb - up(1), up(1));
    const hook = outsideWall(col, row, w, h, dir, span / 2, across(5.2));
    const h0 = lift(project(hook.col, hook.row), zb - up(0.8)); const h1 = lift(project(hook.col, hook.row), up(3));
    const s0g = outsideWall(col, row, w, h, dir, span / 2, 0);
    const s0 = lift(project(s0g.col, s0g.row), zb - up(2.8));
    const s1g = outsideWall(col, row, w, h, dir, span / 2, across(3));
    const s1 = lift(project(s1g.col, s1g.row), zb);
    return (
      <g className="school-crane">
        <line x1={s0.x} y1={s0.y} x2={s1.x} y2={s1.y} stroke={shade(GANTRY_YELLOW, 0.8)} strokeWidth={2} />
        {sideFaces(bf, shade(GANTRY_YELLOW, 0.92), shade(GANTRY_YELLOW, 0.76))}
        <polygon points={polyPoints(bf.top)} fill={shade(GANTRY_YELLOW, 1.08)} />
        {sideFaces(tf, '#4a4d50', '#3b3e41')}
        <line x1={h0.x} y1={h0.y} x2={h1.x} y2={h1.y} stroke="#2e3032" strokeWidth={0.8} />
        <polygon points={polyPoints([{ x: h1.x - 1.6, y: h1.y }, { x: h1.x + 1.6, y: h1.y }, { x: h1.x, y: h1.y + 2.4 }])} fill="#2e3032" />
      </g>
    );
  })();
  return (
    <g className="school-workshop">
      {!endSeen && crane}
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      {faces.map(({ dir, origin, along, span }) => (
        <g key={dir}>
          {trim && <WallBand origin={origin} along={along} wallHeight={H} from={0} to={BASE_COURSE} className="iso-plinth" />}
          {/* Portal-frame piers between the bays. */}
          {Array.from({ length: Math.max(1, Math.round(span / across(7.5))) - 1 }, (_, k) => {
            const u = (k + 1) / Math.max(1, Math.round(span / across(7.5)));
            return <polygon key={k} points={polyPoints(wallQuad(origin, along, H, u - 0.012, u + 0.012, 0, H))} fill={shade(pal.wall[dir], 0.86)} />;
          })}
          <CurtainWall origin={origin} along={along} wallHeight={H} spanTiles={span} from={H - up(3.6)} to={H - up(1.2)} floors={[]} id={`ws${dir}`} u0={0.05} u1={0.95} />
          {trim && <WallBand origin={origin} along={along} wallHeight={H} from={H - EAVES_COURSE} to={H} className="iso-cornice" fill={stone.trim} />}
        </g>
      ))}
      {outside.map(({ dir, origin, along, span }) => (
        <SectionalDoor key={`d${dir}`} o={origin} a={along} H={H} span={span} widthM={doorW(dir)} heightM={doorH(dir)} />
      ))}
      {/* Yellow bollards guarding each door's jambs. */}
      {outside.map(({ dir, span }) => [-1, 1].map((s) => {
        const b = againstWall(col, row, w, h, dir, span / 2 + s * (across(doorW(dir)) / 2 + across(0.5)) - across(0.25), across(0.5), across(0.5), -across(0.7));
        const bf = boxFaces(b.col, b.row, b.w, b.h, 0, up(1.1));
        return <g key={`b${dir}${s}`}>{sideFaces(bf, GANTRY_YELLOW, shade(GANTRY_YELLOW, 0.8))}<polygon points={polyPoints(bf.top)} fill="#2e3032" /></g>;
      }))}
      {endSeen && crane}
      <polygon points={polyPoints(f.top)} fill={pal.roofDeck} />
      {lights.map((b, i) => {
        const lf = boxFaces(b.col, b.row, b.w, b.h, H, up(0.7));
        return (
          <g key={i}>
            <polygon points={polyPoints(lf.left)} className="glass-pane" />
            <polygon points={polyPoints(lf.right)} className="glass-pane" />
            <polygon points={polyPoints(lf.top)} className="glass-roof" />
          </g>
        );
      })}
      {crestNode}
    </g>
  );
}

// Plate glass in a painted bay, dark from outside whatever the sash.
const BAY_GLASS = '#5f7a86';

// Health's fronts: on the building's front, a drop-off canopy on slim
// posts over a paved lay-by, a lettered fascia, and a sign with a green
// cross (the Medical Center's is red); on each side, two bay windows; the
// back is left plain (its own door is the service way in). Each is drawn
// only while the camera sees its wall.
function ClinicFronts({ col, row, w, h, H, facing, stone }: {
  col: number; row: number; w: number; h: number; H: number; facing?: Facing; stone: StonePalette;
}) {
  const sides = sidesOf(facing);
  const dropDir = sides.front;
  const dropSeen = wallSeen(dropDir);
  const trimTone = stone.trim !== 'none' ? stone.trim : '#e8e6df';
  const span = wallSpan(w, h, dropDir);
  const width = Math.min(span * 0.58, across(22));
  const depth = across(5);
  const top = Math.min(STOREY * 1.05, H - up(2));
  const along0 = span / 2 - width / 2;
  const plate = againstWall(col, row, w, h, dropDir, along0, width, depth);
  const apron = againstWall(col, row, w, h, dropDir, along0 - across(1.5), width + across(3), depth + across(1.2));
  const fasciaH = up(1.5);
  const slab = boxFaces(plate.col, plate.row, plate.w, plate.h, top, fasciaH);
  const fascia = wallOf(slab, dropDir);
  const post = across(0.4);
  const posts = [along0 + across(0.3), span / 2 - post / 2, along0 + width - post - across(0.3)].map((a0) => {
    const b = againstWall(col, row, w, h, dropDir, a0, post, post, -(depth - post - across(0.3)));
    return boxFaces(b.col, b.row, b.w, b.h, 0, top);
  });
  const wall = wallOf(boxFaces(col, row, w, h, 0, H), dropDir);
  const marks = 9;
  // The sign above the canopy: a panel, lettering, a green cross on white.
  const sz0 = top + fasciaH + up(0.9); const sz1 = sz0 + up(3.2);
  const signHalf = Math.min(0.22, across(15) / span / 2);
  const crossU = 0.5 - signHalf + across(1.8) / span;
  const cross = (cu: number, cz: number, armM: number) => {
    const au = across(armM) / span / 2; const bu = au / 3;
    const az = up(armM) / 2; const bz = az / 3;
    return (
      <>
        <polygon points={polyPoints(wallQuad(wall.origin, wall.along, H, cu - bu, cu + bu, cz - az, cz + az))} fill="#2f9a4f" />
        <polygon points={polyPoints(wallQuad(wall.origin, wall.along, H, cu - au, cu + au, cz - bz, cz + bz))} fill="#2f9a4f" />
      </>
    );
  };
  // Two oriels on each side, from the first floor to under the eaves.
  const bz0 = STOREY + up(0.3); const bz1 = H - up(1.1);
  const bays = depthOrder([sides.left, sides.right].filter(wallSeen).flatMap((bayDir) => {
    const bspan = wallSpan(w, h, bayDir);
    const bw = Math.min(across(5.5), bspan * 0.2);
    return [0.2, 0.8].map((u) => ({ ...againstWall(col, row, w, h, bayDir, bspan * u - bw / 2, bw, across(1.8)), bayDir }));
  }));
  const floors = Math.max(1, Math.round((bz1 - bz0) / STOREY));
  return (
    <g className="school-clinic">
      {dropSeen && (
        <g className="clinic-dropoff">
          <polygon points={polyPoints(boxFaces(apron.col, apron.row, apron.w, apron.h, 0, 0).top)} fill="#bdb9ae" />
          {(() => { const e = wallOf(boxFaces(apron.col, apron.row, apron.w, apron.h, 0, 0), dropDir); return <line x1={e.origin.x} y1={e.origin.y} x2={e.along.x} y2={e.along.y} stroke="#f1eee4" strokeWidth={1.4} strokeDasharray="4 3" />; })()}
          <polygon points={polyPoints(wallQuad(wall.origin, wall.along, H, 0.5 - signHalf, 0.5 + signHalf, sz0, sz1))} fill="#2e6f66" stroke={trimTone} strokeWidth={0.8} />
          <polygon points={polyPoints(wallQuad(wall.origin, wall.along, H, crossU - across(1.5) / span, crossU + across(1.5) / span, sz0 + up(0.3), sz1 - up(0.3)))} fill="#f4f6f2" />
          {cross(crossU, (sz0 + sz1) / 2, 2.2)}
          {/* Two lines of lettering: words of uneven length. */}
          {[[0.22, 0.14, 0.3, 0.18], [0.3, 0.2, 0.26]].map((words, line) => {
            const room = 0.5 + signHalf - crossU - across(2.8) / span;
            const z0 = line === 0 ? sz0 + up(1.75) : sz0 + up(0.65); const z1 = z0 + up(0.75);
            let u = crossU + across(2.2) / span;
            return words.map((share, k) => {
              const u0 = u; u += room * share + room * 0.04;
              return <polygon key={`${line}${k}`} points={polyPoints(wallQuad(wall.origin, wall.along, H, u0, u0 + room * share, z0, z1))} fill="#eef2e8" />;
            });
          })}
          {posts.map((p, i) => <g key={`p${i}`}>{sideFaces(p, shade(trimTone, 0.82), shade(trimTone, 0.68))}</g>)}
          {sideFaces(slab, shade(trimTone, 0.86), shade(trimTone, 0.72))}
          <polygon points={polyPoints(slab.top)} fill={shade(trimTone, 0.95)} />
          <polygon points={polyPoints(wallQuad(fascia.origin, fascia.along, fasciaH, 0.04, 0.96, fasciaH * 0.12, fasciaH * 0.88))} fill="#2e6f66" />
          {Array.from({ length: marks }, (_, k) => {
            const u0 = 0.18 + (k / marks) * 0.64; const u1 = u0 + (0.64 / marks) * 0.62;
            return <polygon key={`m${k}`} points={polyPoints(wallQuad(fascia.origin, fascia.along, fasciaH, u0, u1, fasciaH * 0.34, fasciaH * 0.66))} fill="#eef2e8" />;
          })}
        </g>
      )}
      {bays.map((b, i) => {
        const bf = boxFaces(b.col, b.row, b.w, b.h, bz0, bz1 - bz0);
        const bh = bz1 - bz0;
        const sides = [{ o: bf.D, a: bf.C, dir: bf.dir.CD }, { o: bf.C, a: bf.B, dir: bf.dir.BC }];
        return (
          <g key={`bay${i}`}>
            <polygon points={polyPoints(bf.left)} fill={faceTone(bf.dir.CD, shade(trimTone, 0.94), shade(trimTone, 0.78))} />
            <polygon points={polyPoints(bf.right)} fill={faceTone(bf.dir.BC, shade(trimTone, 0.94), shade(trimTone, 0.78))} />
            {sides.map(({ o, a, dir }) => Array.from({ length: floors }, (_, k) => {
              const z0 = k * STOREY + up(0.6); const z1 = Math.min(bh - up(0.3), z0 + STOREY - up(1.2));
              const m = dir === b.bayDir ? 0.1 : 0.16;
              return <polygon key={`${dir}${k}`} points={polyPoints(wallQuad(o, a, bh, m, 1 - m, z0, z1))} fill={BAY_GLASS} />;
            }))}
            <polygon points={polyPoints(boxFaces(b.col, b.row, b.w, b.h, bz1, up(0.5)).top)} fill={trimTone} />
            {sideFaces(boxFaces(b.col, b.row, b.w, b.h, bz1, up(0.5)), shade(trimTone, 0.86), shade(trimTone, 0.72))}
          </g>
        );
      })}
    </g>
  );
}

// Computer Science's entrance on the building's front: a full-height
// glazed atrium in the middle of the wall, rising past the parapet as a
// glass crown, with glass doors at its foot. The crown stands above the
// roof, so it shows (after the mass) even when the front has turned away.
function AtriumFronts({ col, row, w, h, H, facing, floors }: {
  col: number; row: number; w: number; h: number; H: number; facing?: Facing; floors: number[];
}) {
  const f = boxFaces(col, row, w, h, 0, H);
  const crownRise = up(3);
  const dir = sidesOf(facing).front;
  const span = wallSpan(w, h, dir);
  const face = seenWall(f, dir);
  const u0 = 0.36; const u1 = 0.64;
  const strip = againstWall(col, row, w, h, dir, span * u0, span * (u1 - u0), across(3.6), across(3.6));
  const cf = boxFaces(strip.col, strip.row, strip.w, strip.h, H, crownRise);
  const doorHalf = across(2.6) / span;
  return (
    <g className="school-atrium">
      {face && (
        <g className="atrium-front">
          <CurtainWall origin={face.o} along={face.a} wallHeight={H} spanTiles={span} from={0} to={H} floors={floors} id={`at${dir}`} u0={u0} u1={u1} />
          <polygon points={polyPoints(wallQuad(face.o, face.a, H, 0.5 - doorHalf, 0.5 + doorHalf, 0, up(2.8)))} fill="#2b3a44" />
          <polygon points={polyPoints(wallQuad(face.o, face.a, H, 0.5 - 0.004, 0.5 + 0.004, 0, up(2.8)))} fill="#c9d6de" />
        </g>
      )}
      {([cf.dir.CD, cf.dir.BC] as FaceDir[]).map((d) => {
        const cw = wallOf(cf, d);
        return <CurtainWall key={d} origin={cw.origin} along={cw.along} wallHeight={crownRise} spanTiles={wallSpan(strip.w, strip.h, d)} from={0} to={crownRise} floors={[]} id={`ac${dir}${d}`} />;
      })}
      <polygon points={polyPoints(cf.top)} className="glass-roof" />
    </g>
  );
}

const SIGNAL_RED = '#c8392e';
const GANTRY_YELLOW = '#d9a92f';
// The Athletic Performance Complex's roof track (Plan 85G): the lanes'
// rubber and the infield's turf.
const TRACK_RED = '#b0533c';
const TRACK_INFIELD = '#5d8a4a';
const BANNER_COLORS = ['#9e2b2b', '#c29a2c', '#2b3f6b'];

// A quad on a wall face, in its own u and in heights.
function wallQuad(o: Pt, a: Pt, H: number, u0: number, u1: number, z0: number, z1: number): Pt[] {
  return [facePoint(o, a, H, u0, z0 / H), facePoint(o, a, H, u1, z0 / H), facePoint(o, a, H, u1, z1 / H), facePoint(o, a, H, u0, z1 / H)];
}

// What a signifier puts on the walls: drawn over the windows and under any
// entrance part. The awning and the clock are on the building's front; a
// shop's signboards and the ticker turn the corner from the front onto its
// right side, as on a corner shop. Each only while its wall shows.
function WallSignifier({ kind, f, H, stone, facing }: {
  kind: Signifier; f: BoxFaces; H: number; stone: StonePalette; facing?: Facing;
}) {
  const sides = sidesOf(facing);
  const front = seenWall(f, sides.front);
  const faces = [front, seenWall(f, sides.right)].filter((x) => x !== null);
  const halfU = (metres: number, span: number) => metres / 2 / (span * METRES_PER_TILE);
  switch (kind) {
    case 'kitchen': {
      // A striped terrace awning along the front's ground floor.
      if (!front) return null;
      const { o, a } = front;
      const z0 = Math.min(STOREY * 0.62, H * 0.4); const z1 = Math.min(STOREY * 0.92, H * 0.6);
      const n = 9;
      return (
        <g className="sig-awning">
          {Array.from({ length: n }, (_, i) => {
            const u0 = 0.14 + (0.72 * i) / n; const u1 = 0.14 + (0.72 * (i + 1)) / n;
            return <polygon key={i} points={polyPoints(wallQuad(o, a, H, u0, u1, z0, z1))} fill={i % 2 === 0 ? SIGNAL_RED : '#f2e8d4'} />;
          })}
          <polygon points={polyPoints(wallQuad(o, a, H, 0.14, 0.86, z0 - up(0.35), z0))} fill={shade(SIGNAL_RED, 0.8)} />
        </g>
      );
    }
    case 'clock': {
      // A clock under the eaves at the middle of the front.
      if (!front) return null;
      const { o, a, span } = front;
      const R = 2.3;
      const ru = halfU(R * 2, span);
      const zc = H - up(R + 1.1);
      const disc = Array.from({ length: 24 }, (_, i) => {
        const t = (i / 24) * Math.PI * 2;
        return facePoint(o, a, H, 0.5 + Math.cos(t) * ru, (zc + Math.sin(t) * up(R)) / H);
      });
      const hub = facePoint(o, a, H, 0.5, zc / H);
      const twelve = facePoint(o, a, H, 0.5, (zc + up(R * 0.75)) / H);
      const four = facePoint(o, a, H, 0.5 + ru * 0.55, (zc - up(R * 0.3)) / H);
      return (
        <g className="sig-clock">
          <polygon points={polyPoints(disc)} fill="#f4efe1" stroke={stone.gilt !== 'none' ? stone.gilt : '#3a3632'} strokeWidth={1.2} />
          <path d={`M${hub.x.toFixed(1)},${hub.y.toFixed(1)}L${twelve.x.toFixed(1)},${twelve.y.toFixed(1)}M${hub.x.toFixed(1)},${hub.y.toFixed(1)}L${four.x.toFixed(1)},${four.y.toFixed(1)}`} stroke="#2e2a24" strokeWidth={1.1} strokeLinecap="round" />
        </g>
      );
    }
    case 'shopfront': {
      // A painted signboard over the shop glazing on both fronts.
      const z1 = H - EAVES_COURSE * 1.2;
      const z0 = Math.max(BASE_COURSE, z1 - up(1.6));
      return (
        <g className="sig-shopfront">
          {faces.map(({ o, a }, i) => (
            <g key={i}>
              <polygon points={polyPoints(wallQuad(o, a, H, 0.04, 0.96, z0, z1))} fill="#2f6b4a" />
              <polygon points={polyPoints(wallQuad(o, a, H, 0.3, 0.7, z0 + (z1 - z0) * 0.38, z0 + (z1 - z0) * 0.62))} fill="#efe6c8" />
            </g>
          ))}
        </g>
      );
    }
    case 'ticker': {
      // A ticker board (Plan 87I): a dark band wrapping both fronts over the
      // ground floor, in a thin metal frame, its quotes running in amber,
      // green and red dashes.
      const z0 = Math.min(STOREY * 0.8, H * 0.42); const z1 = z0 + up(1.5);
      const colors = ['#ffbf3f', '#5fe08a', '#ffbf3f', '#ff6b5b', '#5fe08a', '#ffbf3f'];
      return (
        <g className="sig-ticker">
          {faces.map(({ o, a, span }, i) => {
            const n = Math.max(6, Math.round((span * METRES_PER_TILE) / 2.6));
            return (
              <g key={i}>
                <polygon points={polyPoints(wallQuad(o, a, H, 0.03, 0.97, z0 - up(0.2), z1 + up(0.2)))} fill="#8d9296" />
                <polygon points={polyPoints(wallQuad(o, a, H, 0.035, 0.965, z0, z1))} fill="#17191c" />
                {Array.from({ length: n }, (_, k) => {
                  const u0 = 0.05 + (0.9 * k) / n; const len = (0.9 / n) * (0.45 + ((k * 7 + i * 3) % 4) * 0.12);
                  const row = (k + i) % 3 === 0 ? 0.62 : 0.3;
                  return <polygon key={k} points={polyPoints(wallQuad(o, a, H, u0, u0 + len, z0 + (z1 - z0) * row, z0 + (z1 - z0) * (row + 0.2)))} fill={colors[(k + i * 2) % colors.length]} />;
                })}
              </g>
            );
          })}
        </g>
      );
    }
    default:
      return null;
  }
}

// What a signifier puts on or over the roof, after it: `base` is the eaves,
// `ridge` the rise of a pitched roof above them. Set out in the building's
// own frame, so a stack, tower or mast keeps its place on the building as
// the camera turns; the pediment and banners hang on its front.
function RoofSignifier({ kind, col, row, w, h, base, ridge, f, stone, pal, facing }: {
  kind: Signifier; col: number; row: number; w: number; h: number; base: number; ridge: number;
  f: BoxFaces; stone: StonePalette; pal: Palette; facing?: Facing;
}) {
  const plot = { col, row, w, h, facing };
  const W = frontWidth(plot); const D = frontDepth(plot);
  const alongU = W >= D;
  // A point by fraction along the long axis and across it: at the opening
  // facing, along +col (or +row) from the building's left (or back) and
  // across from its back (or left).
  const at = (a: number, c: number): [number, number] => {
    const g = alongU ? localToGrid(plot, W * a, D * (1 - c)) : localToGrid(plot, W * c, D * (1 - a));
    return [g.col, g.row];
  };
  const front = seenWall(f, sidesOf(facing).front);
  const box = (a0: number, a1: number, c0: number, c1: number, z: number, rise: number) => {
    const [x0, y0] = at(a0, c0); const [x1, y1] = at(a1, c1);
    return boxFaces(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0), z, rise);
  };
  const solid = (b: BoxFaces, tone: string, key?: string) => (
    <g key={key}>
      {sideFaces(b, shade(tone, 0.96), shade(tone, 0.78))}
      <polygon points={polyPoints(b.top)} fill={shade(tone, 1.08)} />
    </g>
  );
  const long = Math.max(w, h); const short = Math.min(w, h);
  switch (kind) {
    case 'kitchen': {
      // Three kitchen stacks rising through the roof near its ridge.
      const plan = across(0.9);
      return (
        <g className="sig-kitchen">
          {[0.3, 0.45, 0.6].map((a) => {
            const [c0, r0] = at(a, 0.34);
            const b = boxFaces(c0, r0, plan, plan, base + ridge * 0.7, ridge * 0.3 + up(3.2));
            return (
              <g key={a}>
                {sideFaces(b, '#8d9296', '#6f7478')}
                <polygon points={polyPoints(b.top)} fill="#3d4043" />
              </g>
            );
          })}
        </g>
      );
    }
    case 'gantry': {
      // A yellow portal crane straddling the shed at a third of its length.
      const legW = across(0.5) / long;
      const legD = across(0.5) / short;
      const top = up(7.5);
      return (
        <g className="sig-gantry">
          {solid(box(0.3, 0.3 + legW, 0.0, legD, base, top), GANTRY_YELLOW)}
          {solid(box(0.3, 0.3 + legW, 1 - legD, 1, base, top), GANTRY_YELLOW)}
          {solid(box(0.3 - legW * 0.2, 0.3 + legW * 1.2, 0, 1, base + top - up(1.2), up(1.2)), GANTRY_YELLOW)}
          {solid(box(0.29, 0.31 + legW, 0.46, 0.56, base + top - up(2.2), up(1)), '#4a4d50')}
          {(() => {
            const [hc, hr] = at(0.3 + legW / 2, 0.51);
            const p0 = lift(project(hc, hr), base + top - up(2.2));
            const p1 = lift(project(hc, hr), base + up(2.4));
            return <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="#2e3032" strokeWidth={0.9} />;
          })()}
        </g>
      );
    }
    case 'windTunnel': {
      // A long duct down one side of the roof, a flared intake at one end
      // and a fan housing at the other.
      return (
        <g className="sig-wind-tunnel">
          {solid(box(0.16, 0.82, 0.74, 0.94, base, up(3.4)), '#9aa6ae')}
          {solid(box(0.05, 0.16, 0.7, 0.98, base, up(4.6)), '#86939b')}
          {(() => {
            const [fc, fr] = at(0.88, 0.84);
            return <Cylinder cc={fc} cr={fr} r={short * 0.12} z0={base} z1={base + up(5.4)} fill="#7f8b93" />;
          })()}
        </g>
      );
    }
    case 'testTower': {
      // A tall concrete test tower at the corner, banded, with a red cap.
      const tall = up(17);
      const b = box(0.82, 0.96, 0.7, 0.94, base, tall);
      return (
        <g className="sig-test-tower">
          {solid(b, '#c9c5bb')}
          {[0.25, 0.5, 0.75].map((v) => {
            const band = box(0.82, 0.96, 0.7, 0.94, base + tall * v, up(0.5));
            return <g key={v}>{sideFaces(band, '#8e8a82', '#77736b')}</g>;
          })}
          {solid(box(0.84, 0.94, 0.73, 0.91, base + tall, up(1.6)), SIGNAL_RED)}
        </g>
      );
    }
    case 'scales': {
      // A pediment over the front's eaves, and the scales in gilt.
      if (!front) return null;
      const { o, a } = front;
      const P = (u: number, z: number) => facePoint(o, a, base, u, z / base);
      const rise = up(6.5);
      const gilt = stone.gilt !== 'none' ? stone.gilt : '#c9a227';
      const face = stone.trim !== 'none' ? stone.trim : shade(pal.wall.posRow, 1.1);
      const post0 = P(0.5, base + up(0.7)); const post1 = P(0.5, base + up(4.6));
      const beamL = P(0.42, base + up(3.9)); const beamR = P(0.58, base + up(3.9));
      const pan = (u: number) => [P(u - 0.03, base + up(1.9)), P(u + 0.03, base + up(1.9)), P(u, base + up(3.9))];
      return (
        <g className="sig-scales">
          <polygon points={polyPoints([P(0.28, base), P(0.72, base), P(0.5, base + rise)])} fill={face} stroke="rgba(60, 54, 44, 0.55)" strokeWidth={1.2} />
          <line x1={post0.x} y1={post0.y} x2={post1.x} y2={post1.y} stroke={gilt} strokeWidth={1.8} />
          <line x1={beamL.x} y1={beamL.y} x2={beamR.x} y2={beamR.y} stroke={gilt} strokeWidth={1.8} />
          <polygon points={polyPoints(pan(0.42))} fill={gilt} fillOpacity={0.35} stroke={gilt} strokeWidth={1.2} />
          <polygon points={polyPoints(pan(0.58))} fill={gilt} fillOpacity={0.35} stroke={gilt} strokeWidth={1.2} />
        </g>
      );
    }
    case 'banners':
    case 'exhibition': {
      // Banners hung from the colonnade's entablature between its columns,
      // painted after it: three on the Museum's front, one broad one on the
      // Art Gallery's.
      const faces = front ? [front] : [];
      const hc = Math.min(COLONNADE_HEIGHT, base - EAVES_COURSE * 2);
      return (
        <g className={`sig-${kind}`}>
          {faces.map(({ o, a, span }, i) => {
            const n = colonnadeColumns(span);
            const gap = 0.9 / Math.max(1, n - 1);
            const mids = Array.from({ length: n - 1 }, (_, k) => 0.05 + gap * (k + 0.5));
            const pick = kind === 'banners'
              ? [mids[Math.floor(mids.length * 0.2)]!, mids[Math.floor(mids.length / 2)]!, mids[Math.ceil(mids.length * 0.8) - 1]!]
              : [mids.reduce((m, u) => (Math.abs(u - 0.5) < Math.abs(m - 0.5) ? u : m))];
            const hu = gap * (kind === 'banners' ? 0.26 : 0.36);
            return pick.map((uc, j) => (
              <g key={`${i}-${j}`}>
                <polygon points={polyPoints(wallQuad(o, a, base, uc - hu, uc + hu, hc * 0.3, hc * 0.92))} fill={kind === 'banners' ? BANNER_COLORS[(i + j) % 3] : '#2f4f9e'} />
                {kind === 'exhibition' && <polygon points={polyPoints(wallQuad(o, a, base, uc - hu, uc + hu, hc * 0.74, hc * 0.8))} fill="#d7b24a" />}
              </g>
            ));
          })}
        </g>
      );
    }
    case 'lantern': {
      // A glazed reading-room lantern on the middle of the roof.
      const b = box(0.36, 0.64, 0.3, 0.7, base, up(2.6));
      const cap = box(0.34, 0.66, 0.28, 0.72, base + up(2.6), up(0.6));
      return (
        <g className="sig-lantern">
          <polygon points={polyPoints(b.left)} className="glass-pane" />
          <polygon points={polyPoints(b.right)} className="glass-pane" />
          {solid(cap, stone.trim !== 'none' ? stone.trim : '#d8d2c4')}
        </g>
      );
    }
    case 'mast': {
      // A lattice mast at one end and a dish on a plinth.
      const [mc, mr] = at(0.84, 0.3);
      const m0 = lift(project(mc, mr), base); const m1 = lift(project(mc, mr), base + up(13));
      const [dc, dr] = at(0.3, 0.6);
      const d0 = lift(project(dc, dr), base + up(3.4));
      const span = projectedCircle(dc, dr, across(2.6), 16).map((q) => q.x);
      const rx = (Math.max(...span) - Math.min(...span)) / 2; const ry = rx * 0.62;
      return (
        <g className="sig-mast">
          {solid(box(0.26, 0.34, 0.54, 0.66, base, up(1.8)), '#8d9296')}
          <ellipse cx={d0.x} cy={d0.y} rx={rx} ry={ry} fill="#eef0f1" stroke="#6f7478" strokeWidth={0.8} transform={`rotate(-24 ${d0.x.toFixed(1)} ${d0.y.toFixed(1)})`} />
          <line x1={m0.x} y1={m0.y} x2={m1.x} y2={m1.y} stroke="#4a4d50" strokeWidth={2.2} />
          <line x1={m0.x - 3} y1={m0.y} x2={m1.x} y2={m1.y} stroke="#4a4d50" strokeWidth={0.7} />
          <line x1={m0.x + 3} y1={m0.y} x2={m1.x} y2={m1.y} stroke="#4a4d50" strokeWidth={0.7} />
          <circle cx={m1.x} cy={m1.y} r={1.6} fill={SIGNAL_RED} />
        </g>
      );
    }
    case 'cupola': {
      // A flat roof takes a glazed lantern rooflight instead (Plan 87I): a
      // Georgian cupola on a flat deck was a style slip.
      if (ridge === 0) return <Rooflight col={col} row={row} w={w} h={h} base={base} stone={stone} />;
      // A glazed cupola astride the ridge (the Faculty Training Institute,
      // Plan 85E): a square drum in the trim stone with a window to each
      // face, a cornice, a lead pyramid and a gilt finial.
      const plan = across(8);
      const [cc, cr] = at(0.5, 0.5);
      const z0 = base + ridge * 0.85;
      const rise = up(7);
      const drum = boxFaces(cc - plan / 2, cr - plan / 2, plan, plan, z0, rise);
      const cap = boxFaces(cc - plan * 0.6, cr - plan * 0.6, plan * 1.2, plan * 1.2, z0 + rise, up(0.9));
      const apex = lift(project(cc, cr), z0 + rise + up(0.9) + up(5.5));
      const tip = lift(project(cc, cr), z0 + rise + up(0.9) + up(8));
      const trimTone = stone.trim !== 'none' ? stone.trim : '#e4dcc8';
      const gilt = stone.gilt !== 'none' ? stone.gilt : '#c9a227';
      const lead = '#5d6a72';
      return (
        <g className="sig-cupola">
          {sideFaces(drum, shade(trimTone, 0.96), shade(trimTone, 0.8))}
          <polygon points={polyPoints(wallQuad(drum.D, drum.C, rise, 0.28, 0.72, rise * 0.18, rise * 0.82))} className="glass-pane" />
          <polygon points={polyPoints(wallQuad(drum.C, drum.B, rise, 0.28, 0.72, rise * 0.18, rise * 0.82))} className="glass-pane" />
          {solid(cap, trimTone)}
          <polygon points={polyPoints([cap.Ct, cap.Dt, apex])} fill={shade(lead, 0.95)} />
          <polygon points={polyPoints([cap.Bt, cap.Ct, apex])} fill={shade(lead, 0.8)} />
          <line x1={apex.x} y1={apex.y} x2={tip.x} y2={tip.y} stroke={gilt} strokeWidth={1.6} />
          <circle cx={tip.x} cy={tip.y} r={1.5} fill={gilt} />
        </g>
      );
    }
    case 'track': {
      // A running track on the roof (the Athletic Performance Complex, Plan
      // 85G): a rust-red oval of lanes round a green infield, a white line
      // between the lanes, on the glazed block's flat deck. Laid out in tiles
      // along the long axis: two straights joined by half circles.
      const margin = Math.min(across(2.5), short * 0.08);
      const z = base + up(0.35);
      const oval = (r: number, n = 14): string => {
        const straight = Math.max(0, long / 2 - margin - (short / 2 - margin));
        const pts: Pt[] = [];
        const pt = (a: number, c: number) => {
          const [pc, pr] = at(a / long, c / short);
          return lift(project(pc, pr), z);
        };
        for (let i = 0; i <= n; i += 1) {
          const th = -Math.PI / 2 + (Math.PI * i) / n;
          pts.push(pt(long / 2 + straight + r * Math.cos(th), short / 2 + r * Math.sin(th)));
        }
        for (let i = 0; i <= n; i += 1) {
          const th = Math.PI / 2 + (Math.PI * i) / n;
          pts.push(pt(long / 2 - straight + r * Math.cos(th), short / 2 + r * Math.sin(th)));
        }
        return polyPoints(pts);
      };
      const outer = short / 2 - margin;
      const lanes = Math.min(across(9), outer * 0.42);
      return (
        <g className="sig-track">
          <polygon points={oval(outer)} fill={TRACK_RED} />
          <polygon points={oval(outer - lanes / 2)} fill="none" stroke="#f1ece4" strokeWidth={1.1} />
          <polygon points={oval(outer - lanes)} fill={TRACK_INFIELD} />
        </g>
      );
    }
    case 'tanks': {
      // The scanners' cryogen tanks, two white cylinders on the roof.
      const r = Math.min(across(1.7), short * 0.18);
      return (
        <g className="sig-tanks">
          {[0.62, 0.84].map((a) => {
            const [cc, cr] = at(a, 0.3);
            return <Cylinder key={a} cc={cc} cr={cr} r={r} z0={base} z1={base + up(6)} fill="#dfe6ea" />;
          })}
        </g>
      );
    }
    default:
      return null;
  }
}

// The rooflight's glass, toned by the way each plane faces.
const SLOPE_LIGHT: Record<FaceDir, number> = { negCol: 1.28, negRow: 1.2, posRow: 1.1, posCol: 0.98 };
// A roof lantern on a flat deck (Plan 87I): a long glazed box on a kerb,
// mullioned on every visible face, under a shallow hipped glass roof with
// a ridge, along the roof's long axis.
function Rooflight({ col, row, w, h, base, stone }: {
  col: number; row: number; w: number; h: number; base: number; stone: StonePalette;
}) {
  const alongW = w >= h;
  const long = Math.min(across(34), Math.max(w, h) * 0.4);
  const wide = Math.min(across(10), Math.min(w, h) * 0.24);
  const lw = alongW ? long : wide; const lh = alongW ? wide : long;
  const lc = col + w / 2 - lw / 2; const lr = row + h / 2 - lh / 2;
  const kerbH = up(0.8); const glassH = up(2.6); const rise = up(2.4);
  const kerb = boxFaces(lc, lr, lw, lh, base, kerbH);
  const glass = boxFaces(lc, lr, lw, lh, base + kerbH, glassH);
  const z = base + kerbH + glassH;
  const inset = wide / 2;
  const ridgeA = lift(alongW ? project(lc + inset, lr + lh / 2) : project(lc + lw / 2, lr + inset), z + rise);
  const ridgeB = lift(alongW ? project(lc + lw - inset, lr + lh / 2) : project(lc + lw / 2, lr + lh - inset), z + rise);
  const g = glass;
  // The hip's four planes, the far ones first.
  const slopes: Array<[FaceDir, Pt[]]> = alongW
    ? [['negRow', [g.NWt, g.NEt, ridgeB, ridgeA]], ['posRow', [g.SWt, g.SEt, ridgeB, ridgeA]], ['negCol', [g.NWt, g.SWt, ridgeA]], ['posCol', [g.NEt, g.SEt, ridgeB]]]
    : [['negCol', [g.NWt, g.SWt, ridgeB, ridgeA]], ['posCol', [g.NEt, g.SEt, ridgeB, ridgeA]], ['negRow', [g.NWt, g.NEt, ridgeA]], ['posRow', [g.SWt, g.SEt, ridgeB]]];
  const trimTone = stone.trim !== 'none' ? stone.trim : '#e4e6e3';
  const kerbTone = '#6c757c';
  const glassTone = '#7d9fb3';
  const mullions = (o: Pt, a: Pt, span: number, key: string) => {
    const n = Math.max(3, Math.round((span * METRES_PER_TILE) / 1.8));
    return Array.from({ length: n - 1 }, (_, i) => {
      const u = (i + 1) / n;
      const p0 = facePoint(o, a, glassH, u, 0); const p1 = facePoint(o, a, glassH, u, 1);
      return <line key={`${key}${i}`} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="#e9ecec" strokeWidth={0.7} />;
    });
  };
  return (
    <g className="sig-rooflight">
      {sideFaces(kerb, shade(kerbTone, 1), shade(kerbTone, 0.84))}
      {sideFaces(glass, shade(glassTone, 0.92), shade(glassTone, 0.78))}
      {mullions(glass.D, glass.C, glass.spanLeft, 'l')}
      {mullions(glass.C, glass.B, glass.spanRight, 'r')}
      {backSlopesFirst(slopes, (x) => x[0]).map(([dir, pts]) => (
        <polygon key={dir} points={polyPoints(pts)} fill={shade(glassTone, SLOPE_LIGHT[dir])} stroke="#e9ecec" strokeWidth={0.5} />
      ))}
      <line x1={ridgeA.x} y1={ridgeA.y} x2={ridgeB.x} y2={ridgeB.y} stroke="#e9ecec" strokeWidth={0.9} />
      <polygon points={polyPoints([lift(glass.D, glassH), lift(glass.C, glassH), lift(glass.B, glassH)])} fill="none" stroke={trimTone} strokeWidth={0.9} />
    </g>
  );
}

// The dome: a broad stone dome on a low drum with a small gilt lantern,
// crowning the campus's one landmark (not the clock tower's cupola).
// `hemisphere` (the exchange, Plan 61) raises it as high as it is wide.
function Dome({ col, row, w, h, base, stone, hemisphere = false }: {
  col: number; row: number; w: number; h: number; base: number; stone: StonePalette; hemisphere?: boolean;
}) {
  const r = hemisphere ? Math.min(across(7), Math.min(w, h) * 0.2) : Math.min(across(9.5), Math.min(w, h) * 0.26);
  const cc = col + w / 2; const cr = row + h / 2;
  const DRUM = up(hemisphere ? 3.5 : 5.0); const RISE = hemisphere ? up(r * METRES_PER_TILE * 0.9) : up(6.5);
  const centre = project(cc, cr);
  const ring = projectedCircle(cc, cr, r, 48);
  // The drum's near half, split into lit and shaded faces: lit on the
  // side of the screen the sun is on (light.ts), which a turn moves.
  const sunSide = sunScreenDir().x <= 0 ? -1 : 1;
  const front = ring.filter((p) => p.y >= centre.y - 0.01).sort((a, b) => a.x - b.x);
  const lit = front.filter((p) => (p.x - centre.x) * sunSide >= -0.01);
  const dark = front.filter((p) => (p.x - centre.x) * sunSide <= 0.01);
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
  // The lantern and finial stand up, so their heights foreshorten too.
  const hs = heightScale();
  return (
    <>
      <polygon points={wall(lit)} fill={shade(stone.towerStone, 0.97)} />
      <polygon points={wall(dark)} fill={shade(stone.towerStone, 0.8)} />
      <polygon points={polyPoints(ring.map((p) => lift(p, base + DRUM)))} fill={shade(stone.towerStone, 0.9)} />
      {/* The dome, and a lit crescent on its sunward shoulder. */}
      <polygon points={cap(1, 0)} fill={shade(stone.towerStone, 0.86)} />
      <polygon points={cap(0.78, sunSide * rx * 0.12)} fill={shade(stone.towerStone, 0.96)} />
      {/* The lantern, and the gilt finial on it. */}
      <rect x={lanternFoot.x - 3} y={lanternFoot.y - 7 * hs} width={6} height={8 * hs} fill={shade(stone.towerStone, 0.92)} />
      <line className="iso-finial" x1={lanternFoot.x} y1={lanternFoot.y - 7 * hs} x2={lanternFoot.x} y2={lanternFoot.y - 14 * hs} stroke={stone.gilt} />
      <circle cx={lanternFoot.x} cy={lanternFoot.y - 14 * hs} r={1.8} fill={stone.gilt} />
    </>
  );
}

// A corner tower (collegiate Gothic's signature): square, in the wall's
// stone, standing slightly proud of both walls and rising past the eaves,
// with lancets and either a crenellated head (halls) or a slate pyramid.
// Always at the near corner, so neither drawn face lies inside the mass.
function CornerTower({ col, row, plan, height, pal, glass, sills, paneW, crenels, capRise, face }: {
  col: number; row: number; plan: number; height: number;
  pal: Palette; glass: string; sills: number[]; paneW: number;
  crenels: boolean; capRise: number;
  // Only this one wall, windows and cornice: the face standing proud of the
  // mass, repainted after it when the tower's corner is a side corner (see
  // towerProudFace).
  face?: FaceDir;
}) {
  const f = boxFaces(col, row, plan, plan, 0, height);
  if (face) {
    const wall = wallOf(f, face);
    const span = wallSpan(plan, plan, face);
    return (
      <>
        <polygon points={polyPoints(wall.poly)} fill={pal.wall[face]} />
        {windows(wall.origin, wall.along, height, span, sills, paneW * 0.6, 'tp', 'lancet', glass)}
        <WallBand origin={wall.origin} along={wall.along} wallHeight={height} from={height - CORNICE} to={height} className="iso-cornice" />
      </>
    );
  }
  // Crenellated towers are flat-topped; plain ones get a slate pyramid.
  const cap = crenels ? null : pyramid(col, row, plan, height, capRise, pal.roof);
  return (
    <>
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      {windows(f.D, f.C, height, f.spanLeft, sills, paneW * 0.6, 'tl', 'lancet', glass)}
      {windows(f.C, f.B, height, f.spanRight, sills, paneW * 0.6, 'tr', 'lancet', glass)}
      <WallBand origin={f.D} along={f.C} wallHeight={height} from={height - CORNICE} to={height} className="iso-cornice" />
      <WallBand origin={f.C} along={f.B} wallHeight={height} from={height - CORNICE} to={height} className="iso-cornice" />
      <polygon points={polyPoints(f.top)} fill={pal.roofDeck} />
      {cap?.faces}
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
      {sideFaces(slab, shade(pal.wall.posRow, 0.92), shade(pal.wall.posCol, 0.92))}
      <polygon points={polyPoints(slab.top)} fill={shade(pal.wall.posRow, 1.04)} />
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

// The building's front-right corner, where the carillon (Plan 87L) and the
// Recreation Center's climbing tower stand, so each keeps its place on the
// building as the camera turns: its two walls, and whether it is at the
// high-col and high-row end of the grid.
function frontRightCorner(facing?: Facing): { colWall: FaceDir; rowWall: FaceDir; hiCol: boolean; hiRow: boolean } {
  const s = sidesOf(facing);
  const dirs = [s.front, s.right];
  const hiCol = dirs.includes('posCol'); const hiRow = dirs.includes('posRow');
  return { colWall: hiCol ? 'posCol' : 'negCol', rowWall: hiRow ? 'posRow' : 'negRow', hiCol, hiRow };
}
// The carillon's square on the grid, for depth-sorting it against the roof
// terrace.
function carillonPlan(col: number, row: number, w: number, h: number, facing?: Facing): DepthBox {
  const s = Math.min(CARILLON_PLAN, Math.min(w, h) * 0.3);
  const { hiCol, hiRow } = frontRightCorner(facing);
  return { col: hiCol ? col + w + CARILLON_PROUD - s : col - CARILLON_PROUD, row: hiRow ? row + h + CARILLON_PROUD - s : row - CARILLON_PROUD, w: s, h: s };
}
// Whether the carillon's corner is at the high-`along` end of wall `dir`
// (one of its two walls).
function carillonAtHighEnd(dir: FaceDir, facing?: Facing): boolean {
  const { hiCol, hiRow } = frontRightCorner(facing);
  return isRowWall(dir) ? hiCol : hiRow;
}

// The carillon (Plan 87L): Modern's Founders Hall, after the open concrete
// bell towers of the post-war campus (Saarinen's at MIT, the carillons at
// Iowa State and Rice). Four slender piers at the hall's front-right
// corner stand out of its walls and come down them to the ground, tied
// across an open shaft above the roof, then a clock stage, an open belfry
// with its bells hung inside, and a thin oversailing slab. Below the roof
// the frame is drawn only on the walls the camera sees, and only what
// stands proud of them, or it would paint over its own hall; at a corner
// turned away only what rises above the roof shows.
function Carillon({ col, row, w, h, base, stone, facing }: {
  col: number; row: number; w: number; h: number; base: number;
  stone: StonePalette; facing?: Facing;
}) {
  const s = Math.min(CARILLON_PLAN, Math.min(w, h) * 0.3);
  const pp = Math.min(CARILLON_PIER, s * 0.22);
  const P = CARILLON_PROUD;
  const { colWall, rowWall, hiCol, hiRow } = frontRightCorner(facing);
  const { col: c0, row: r0 } = carillonPlan(col, row, w, h, facing);
  const concrete = shade(stone.towerStone, 0.84);
  const lit = concrete; const dark = shade(concrete, 0.8);
  const box = (b: DepthBox, z: number, rise: number, key: string, top = true) => {
    const f = boxFaces(b.col, b.row, b.w, b.h, z, rise);
    return (
      <g key={key}>
        {sideFaces(f, lit, dark)}
        {top && <polygon points={polyPoints(f.top)} fill={shade(concrete, 1.08)} />}
      </g>
    );
  };
  // The four piers, with the walls each one stands in.
  const piers: Array<DepthBox & { walls: FaceDir[] }> = [false, true].flatMap((hc) => [false, true].map((hr) => ({
    col: hc ? c0 + s - pp : c0, row: hr ? r0 + s - pp : r0, w: pp, h: pp,
    walls: [...(hr === hiRow ? [rowWall] : []), ...(hc === hiCol ? [colWall] : [])],
  })));

  // Below the roof: what of each pier stands proud of a visible wall, and
  // the glazed stair between them, in the wall's plane.
  const lower: DepthBox[] = [];
  for (const p of piers) {
    const on = p.walls.filter(wallSeen);
    if (on.length === 2) lower.push(p);
    else if (on[0] === rowWall) lower.push({ col: p.col, row: hiRow ? row + h : row - P, w: pp, h: P });
    else if (on[0] === colWall) lower.push({ col: hiCol ? col + w : col - P, row: p.row, w: P, h: pp });
  }
  const at = (c: number, r: number, z: number) => lift(project(c, r), z);
  const glass = (dir: FaceDir) => {
    // From the inner pier to the hall's corner, in the wall's plane.
    const rw = hiRow ? row + h : row; const cw = hiCol ? col + w : col;
    const [ca, cb] = hiCol ? [c0 + pp, col + w] : [col, c0 + s - pp];
    const [ra, rb] = hiRow ? [r0 + pp, row + h] : [row, r0 + s - pp];
    const quad = (z0: number, z1: number) => (isRowWall(dir)
      ? [at(ca, rw, z0), at(cb, rw, z0), at(cb, rw, z1), at(ca, rw, z1)]
      : [at(cw, ra, z0), at(cw, rb, z0), at(cw, rb, z1), at(cw, ra, z1)]);
    const floors = Math.floor(base / STOREY);
    return (
      <g key={`g${dir}`}>
        <polygon className="iso-curtain-glass" points={polyPoints(quad(PLINTH, base - up(0.4)))} />
        {Array.from({ length: floors }, (_, i) => (
          <polygon key={i} className="iso-mullion" points={polyPoints(quad(STOREY * (i + 1) - up(0.25), STOREY * (i + 1)))} />
        ))}
      </g>
    );
  };

  // Above it: the open shaft, piers and ties.
  const zc = base + CARILLON_SHAFT_RISE;
  const zb = zc + CARILLON_CLOCK_RISE;
  const zt = zb + CARILLON_BELFRY_RISE;
  const d = pp * 0.7;
  const ties: DepthBox[] = [
    { col: c0 + pp, row: r0, w: s - 2 * pp, h: d },
    { col: c0 + pp, row: r0 + s - d, w: s - 2 * pp, h: d },
    { col: c0, row: r0 + pp, w: d, h: s - 2 * pp },
    { col: c0 + s - d, row: r0 + pp, w: d, h: s - 2 * pp },
  ];
  const tieLevels = Array.from({ length: Math.floor(CARILLON_SHAFT_RISE / CARILLON_TIE_EVERY - 0.25) }, (_, i) => base + (i + 1) * CARILLON_TIE_EVERY - CARILLON_TIE);
  const shaft = depthOrder([...piers.map((p) => ({ ...p, tie: false })), ...ties.map((t) => ({ ...t, walls: [], tie: true }))]);

  // The clock stage: the frame's piers stand forward of a panel holding the
  // clock on each visible face.
  const stage = boxFaces(c0, r0, s, s, zc, CARILLON_CLOCK_RISE);
  const R = across(CARILLON_CLOCK_RADIUS_METRES);
  const clock = (o: Pt, a: Pt, key: string) => {
    const ru = R / s; const rv = up(CARILLON_CLOCK_RADIUS_METRES) / CARILLON_CLOCK_RISE;
    const pt = (u: number, v: number) => facePoint(o, a, CARILLON_CLOCK_RISE, u, v);
    const panel = [pt(pp / s, 0.07), pt(1 - pp / s, 0.07), pt(1 - pp / s, 0.93), pt(pp / s, 0.93)];
    const ring: Pt[] = [];
    for (let i = 0; i < 24; i++) {
      const t = (i / 24) * Math.PI * 2;
      ring.push(pt(0.5 + Math.cos(t) * ru, 0.5 + Math.sin(t) * rv));
    }
    // Baton marks at the quarters, and the hands.
    const mark = (k: number) => {
      const t = (k / 4) * Math.PI * 2;
      const p0 = pt(0.5 + Math.cos(t) * ru * 0.66, 0.5 + Math.sin(t) * rv * 0.66);
      const p1 = pt(0.5 + Math.cos(t) * ru * 0.9, 0.5 + Math.sin(t) * rv * 0.9);
      return <line key={`m${k}`} className="iso-clock-hand" x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} />;
    };
    const c = pt(0.5, 0.5); const big = pt(0.5 + ru * 0.1, 0.5 + rv * 0.66); const small = pt(0.5 + ru * 0.48, 0.5 - rv * 0.2);
    return (
      <g key={key}>
        <polygon points={polyPoints(panel)} fill={shade(concrete, 0.88)} />
        <polygon className="iso-clock-face" points={polyPoints(ring)} />
        {[0, 1, 2, 3].map(mark)}
        <line className="iso-clock-hand" x1={c.x} y1={c.y} x2={big.x} y2={big.y} />
        <line className="iso-clock-hand" x1={c.x} y1={c.y} x2={small.x} y2={small.y} />
      </g>
    );
  };

  // The belfry: bells hung in the open frame, one opening a big bell and
  // the other two smaller, as a carillon's are graded. Drawn on screen
  // (like ClockTower's dome) in the gaps between the piers as they project,
  // since the frame's centre is behind its front pier in every view.
  const B = CARILLON_BELFRY_RISE;
  const pierX = piers.map((p) => {
    const f = boxFaces(p.col, p.row, p.w, p.h, zb, B);
    const xs = [f.A.x, f.B.x, f.C.x, f.D.x];
    return { lo: Math.min(...xs), hi: Math.max(...xs) };
  }).sort((p, q) => (p.lo + p.hi) - (q.lo + q.hi));
  // Just inside the visible faces, for the height on screen.
  const ib = boxFaces(c0 + pp / 2, r0 + pp / 2, s - pp, s - pp, zb, B);
  const bells = () => {
    const bell = (x: number, width: number, crown: number, o: Pt, a: Pt, key: string) => {
      const yAt = (v: number) => facePoint(o, a, B, 0.5, v).y;
      const top = yAt(crown); const ht = width * 0.9;
      const pts: Array<[number, number]> = [
        [-0.2, 0], [0.2, 0], [0.31, 0.08], [0.35, 0.3], [0.38, 0.62], [0.46, 0.86], [0.54, 1], [-0.54, 1], [-0.46, 0.86], [-0.38, 0.62], [-0.35, 0.3], [-0.31, 0.08],
      ];
      return (
        <g key={key}>
          <line className="iso-bell-hanger" x1={x} y1={yAt(1)} x2={x} y2={top} />
          <polygon className="iso-bell" points={pts.map(([px, py]) => `${(x + px * width).toFixed(2)},${(top + py * ht).toFixed(2)}`).join(' ')} />
        </g>
      );
    };
    const left = { lo: pierX[0].hi, hi: Math.min(pierX[1].lo, pierX[2].lo) };
    const right = { lo: Math.max(pierX[1].hi, pierX[2].hi), hi: pierX[3].lo };
    const gl = left.hi - left.lo; const gr = right.hi - right.lo;
    return (
      <>
        {gl > 0 && bell((left.lo + left.hi) / 2, gl * 0.7, 0.66, ib.D, ib.C, 'b0')}
        {gr > 0 && bell(right.lo + gr * 0.3, gr * 0.42, 0.78, ib.C, ib.B, 'b1')}
        {gr > 0 && bell(right.lo + gr * 0.74, gr * 0.32, 0.84, ib.C, ib.B, 'b2')}
      </>
    );
  };
  // Bells after the back piers, before the front ones.
  const belfry = depthOrder(piers);
  const ov = CARILLON_CAP_OVERSAIL;

  return (
    <>
      {[rowWall, colWall].filter(wallSeen).map(glass)}
      {depthOrder(lower).map((b, i) => box(b, 0, base, `lo${i}`, false))}
      {shaft.map((b, i) => (b.tie
        ? <g key={`t${i}`}>{tieLevels.map((z, k) => box(b, z, CARILLON_TIE, `t${i}-${k}`))}</g>
        : box(b, base, CARILLON_SHAFT_RISE, `s${i}`, false)))}
      {sideFaces(stage, lit, dark)}
      {clock(stage.D, stage.C, 'cl')}
      {clock(stage.C, stage.B, 'cr')}
      <polygon points={polyPoints(stage.top)} fill={shade(concrete, 1.04)} />
      {belfry.slice(0, 3).map((b, i) => box(b, zb, B, `b${i}`, false))}
      {bells()}
      {box(belfry[3], zb, B, 'b3', false)}
      {box({ col: c0 - ov, row: r0 - ov, w: s + ov * 2, h: s + ov * 2 }, zt, CARILLON_CAP, 'cap')}
      {/* A slender steel spire off the slab, as on Saarinen's MIT tower. */}
      {(() => {
        const m = at(c0 + s / 2, r0 + s / 2, zt + CARILLON_CAP);
        return <line className="iso-carillon-mast" x1={m.x} y1={m.y} x2={m.x} y2={lift(m, up(5.5)).y} />;
      })()}
    </>
  );
}

// How far along its two walls the carillon's corner reaches, so the
// pilotis and fins keep clear of it (Plan 87L).
function carillonReserve(w: number, h: number): number {
  return Math.min(CARILLON_PLAN, Math.min(w, h) * 0.3) - CARILLON_PROUD + across(0.6);
}

// Modern's hall on pilotis (Plan 87L): the glazed ground floor behind a row
// of square columns under the first floor's slab edge, which runs proud of
// the wall like the oversail of Le Corbusier's and Breuer's lifted blocks.
// The hall stands on them all round, so they go on every wall the camera
// sees. The columns keep clear of the door's canopy and, on Founders Hall,
// of the carillon's front-right corner (`reserve`, tiles at that end of the
// front and right walls).
function Pilotis({ col, row, w, h, top, facing, pal, stone, door, reserve = 0 }: {
  col: number; row: number; w: number; h: number; top: number; facing?: Facing;
  pal: Palette; stone: StonePalette; door: DoorDimensions | null; reserve?: number;
}) {
  const depth = across(0.75);
  const plan = across(0.8);
  const slab = up(0.55);
  const seen = visibleWalls();
  const fronts: FaceDir[] = [seen.left, seen.right];
  const corner = frontRightCorner(facing);
  const parts: Array<DepthBox & { k: string; z: number; rise: number; slab: boolean }> = [];
  for (const dir of fronts) {
    const span = wallSpan(w, h, dir);
    const reserved = (dir === corner.colWall || dir === corner.rowWall) ? reserve : 0;
    const hiEnd = reserved > 0 && carillonAtHighEnd(dir, facing);
    const loEnd = reserved > 0 && !hiEnd;
    // The slab edge; a row wall's covers the corner it shares with the other
    // visible wall, so the two meet without a notch.
    const other = fronts.find((d) => d !== dir);
    const toEnd = isRowWall(dir) && other === 'posCol' && !hiEnd ? depth : 0;
    const toStart = isRowWall(dir) && other === 'negCol' && !loEnd ? depth : 0;
    const e = againstWall(col, row, w, h, dir, (loEnd ? reserved : 0) - toStart, span + toStart + toEnd - reserved, depth);
    parts.push({ ...e, k: `e${dir}`, z: top - slab, rise: slab, slab: true });
    const n = Math.max(2, Math.round((span * METRES_PER_TILE) / (BAY_METRES * 2)));
    const clear = door ? Math.max(door.widthTiles * 1.7, across(4)) / 2 + plan : 0;
    for (let i = 0; i <= n; i++) {
      const along = Math.min(span - plan, Math.max(0, (i / n) * span - plan / 2));
      if (door && Math.abs(along + plan / 2 - span / 2) < clear) continue;
      if (hiEnd && along + plan > span - reserved - plan * 0.5) continue;
      if (loEnd && along < reserved + plan * 0.5) continue;
      const c = againstWall(col, row, w, h, dir, along, plan, depth * 0.85);
      parts.push({ ...c, k: `c${dir}${i}`, z: 0, rise: top - slab, slab: false });
    }
  }
  const edge = shade(pal.wall.posRow, 1.06);
  const pier = shade(stone.towerStone, 0.86);
  return (
    <>
      {depthOrder(parts).map((b) => {
        const f = boxFaces(b.col, b.row, b.w, b.h, b.z, b.rise);
        return (
          <g key={b.k}>
            {b.slab ? sideFaces(f, edge, shade(edge, 0.84)) : sideFaces(f, pier, shade(pier, 0.78))}
            {b.slab && <polygon points={polyPoints(f.top)} fill={shade(edge, 0.95)} />}
          </g>
        );
      })}
    </>
  );
}

// The brise-soleil (Plan 87L), Founders Hall only in Modern: deep concrete
// fins at every bay of the floors above the pilotis, as on Le Corbusier's
// and Breuer's teaching blocks, so the ribbons read through a vertical
// screen. On the sunny front and right side, either side of the carillon's
// corner and clear of it (`reserve`); the left side and back keep their
// plain ribbons.
function BriseSoleil({ col, row, w, h, from, to, facing, stone, reserve }: {
  col: number; row: number; w: number; h: number; from: number; to: number;
  facing?: Facing; stone: StonePalette; reserve: number;
}) {
  const depth = across(0.95);
  const thick = across(0.32);
  const fins: Array<DepthBox & { k: string }> = [];
  const sides = sidesOf(facing);
  for (const dir of [sides.front, sides.right].filter(wallSeen)) {
    const span = wallSpan(w, h, dir);
    const hiEnd = carillonAtHighEnd(dir, facing);
    const bays = baysAcross(span);
    for (let i = 1; i < bays; i++) {
      const along = (i / bays) * span - thick / 2;
      if (hiEnd ? along + thick > span - reserve - thick : along < reserve + thick) continue;
      fins.push({ ...againstWall(col, row, w, h, dir, along, thick, depth), k: `${dir}${i}` });
    }
  }
  const fin = shade(stone.towerStone, 0.98);
  return (
    <>
      {depthOrder(fins).map((b) => {
        const f = boxFaces(b.col, b.row, b.w, b.h, from, to - from);
        return (
          <g key={b.k}>
            {sideFaces(f, fin, shade(fin, 0.76))}
            <polygon points={polyPoints(f.top)} fill={shade(fin, 1.04)} />
          </g>
        );
      })}
    </>
  );
}

// The roof terrace (Plan 87L), Founders Hall only in Modern: a paved deck
// under a folded-plate canopy on slender posts, the zigzag roof of the
// post-war campus (Breuer's, Saarinen's), its folded edge drawn on the side
// the camera sees. On the hall's left half (its back half when the front is
// the short wall), clear of the carillon at the front-right corner.
function roofTerracePlan(col: number, row: number, w: number, h: number, facing?: Facing): DepthBox {
  const plot = { col, row, w, h, facing };
  const W = frontWidth(plot); const D = frontDepth(plot);
  // Along the long axis from the end away from the carillon, as the hall's
  // -col (or -row) half at the opening facing.
  return W >= D
    ? localBox(plot, W * 0.1, D * 0.28, W * 0.58, D * 0.76)
    : localBox(plot, W * 0.24, D * 0.42, W * 0.72, D * 0.9);
}
function FoldedPlateTerrace({ col, row, w, h, base, facing, stone }: {
  col: number; row: number; w: number; h: number; base: number;
  facing?: Facing; stone: StonePalette;
}) {
  const fronts: FaceDir[] = [visibleWalls().left, visibleWalls().right];
  const p = roofTerracePlan(col, row, w, h, facing);
  const alongCol = p.w >= p.h;
  const L = alongCol ? p.w : p.h;
  const folds = Math.max(4, Math.round((L * METRES_PER_TILE) / 4.2 / 2) * 2);
  const POST = up(3.0); const RISE = up(1.5); const THICK = up(0.35);
  const zv = base + POST; const zr = zv + RISE;
  const zAt = (k: number) => (k % 2 === 0 ? zv : zr);
  // A point by (along the folds, across them, height).
  const at = (a: number, c: number, z: number) => (alongCol
    ? lift(project(p.col + a, p.row + c), z)
    : lift(project(p.col + c, p.row + a), z));
  const S = alongCol ? p.h : p.w;
  const step = L / folds;
  const deckPad = across(1.2);
  const deck = boxFaces(p.col - deckPad, p.row - deckPad, p.w + deckPad * 2, p.h + deckPad * 2, base, 0).top;
  const slabTone = shade(stone.towerStone, 1.0);
  // Plates back to front, one strip each.
  const strips = depthOrder(Array.from({ length: folds }, (_, k) => (alongCol
    ? { col: p.col + k * step, row: p.row, w: step, h: p.h, k }
    : { col: p.col, row: p.row + k * step, w: p.w, h: step, k })));
  // Which way a plate faces: rising along the folds it faces their start.
  const tone = (k: number) => {
    const rising = k % 2 === 0;
    const dir: FaceDir = alongCol ? (rising ? 'negCol' : 'posCol') : (rising ? 'negRow' : 'posRow');
    // Exaggerated past WALL_LIGHT, or the folds along a row read flat.
    return shade(slabTone, dir === 'negCol' || dir === 'negRow' ? 1.02 : 0.82);
  };
  // The folded edge on the visible side across the folds.
  const edgeDir: FaceDir | undefined = alongCol
    ? fronts.find((d) => d === 'posRow' || d === 'negRow')
    : fronts.find((d) => d === 'posCol' || d === 'negCol');
  const edgeC = edgeDir === 'posRow' || edgeDir === 'posCol' ? S : 0;
  const zig = (dz: number) => Array.from({ length: folds + 1 }, (_, k) => at(k * step, edgeC, zAt(k) + dz));
  // Posts under the valleys at both edges; the back ones paint first.
  const post = (k: number, c: number) => {
    const a = at(k * step, c, base); const b = at(k * step, c, zv);
    return <line key={`p${k}-${c}`} className="iso-terrace-post" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
  };
  const valleys = Array.from({ length: folds / 2 + 1 }, (_, i) => i * 2);
  const backC = S - edgeC;
  return (
    <>
      <polygon points={polyPoints(deck)} fill={shade(stone.towerStone, 0.8)} />
      {valleys.map((k) => post(k, backC))}
      {strips.map((st) => {
        const k = st.k;
        const q = [at(k * step, 0, zAt(k)), at((k + 1) * step, 0, zAt(k + 1)), at((k + 1) * step, S, zAt(k + 1)), at(k * step, S, zAt(k))];
        return <polygon key={`f${k}`} points={polyPoints(q)} fill={tone(k)} />;
      })}
      {valleys.map((k) => post(k, edgeC))}
      <polygon points={polyPoints([...zig(0), ...zig(-THICK).reverse()])} fill={shade(slabTone, 0.86)} />
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
  // The canopy's own ground shadow, away from the sun (light.ts). Drawn with
  // the canopy, after its wall, so only when the sun throws it out from the
  // wall onto open ground: thrown back, it would lie under the building and
  // paint across the wall's face.
  const shadowAt = shadowOffset(top);
  const out = outwardOf(outward);
  const shadow = shadowAt.dcol * out.col + shadowAt.drow * out.row > 0
    ? boxFaces(plate.col + shadowAt.dcol, plate.row + shadowAt.drow, plate.w, plate.h, 0, 0).top
    : null;

  const gable = hood && roof ? (() => {
    // Ridge running out from the wall, two slopes toned by direction, and
    // the gable end facing out.
    const rise = up(1.2);
    const f = slab;
    // A point `along` the wall (grid order) and `out` from it, at height z.
    // Each half is built wall to eave from these rather than from the slab's
    // corners, which run wall to eave only on a +row or +col wall and made a
    // bow-tie on the other two.
    const at = (along: number, out: number, z: number) => {
      const g = outsideWall(col, row, w, h, outward, along, out);
      return lift(project(g.col, g.row), z);
    };
    const eave = top + slabT;
    const ridgeIn = at(mid, 0, top + rise);
    const ridgeOut = at(mid, CANOPY_DEPTH, top + rise);
    // The low-coordinate half faces -col off a row wall, -row off a col wall.
    const lo = mid - width / 2; const hi = mid + width / 2;
    const row_ = isRowWall(outward);
    const halves: Array<[FaceDir, Pt[], number]> = [
      [row_ ? 'negCol' : 'negRow', [at(lo, 0, eave), ridgeIn, ridgeOut, at(lo, CANOPY_DEPTH, eave)], row_ ? 1.12 : 1.0],
      [row_ ? 'posCol' : 'posRow', [at(hi, 0, eave), ridgeIn, ridgeOut, at(hi, CANOPY_DEPTH, eave)], row_ ? 0.84 : 0.7],
    ];
    const end = wallOf(f, outward);
    return (
      <>
        {backSlopesFirst(halves, (x) => x[0]).map(([dir, pts, k]) => <polygon key={dir} points={polyPoints(pts)} fill={shade(roof, k)} />)}
        <polygon points={polyPoints([lift(end.origin, slabT), lift(end.along, slabT), ridgeOut])} fill={shade(canopyStone, 0.8)} />
      </>
    );
  })() : null;

  return (
    <>
      {shadow && <polygon className="campus-building-shadow" points={polyPoints(shadow)} />}
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

// The grand way in (Plan 87I): what stands at the exchange's door, and at
// the Experimental Economics Lab's, by vernacular. A temple front only where
// the set is classical in its bones; Gothic and Tudor a gabled porch,
// Mission an arcade, Modern a cantilevered canopy over a glazed lobby, Art
// Deco a stepped, fluted portal under a sunburst.
type GrandFront = 'temple' | 'pedimented' | 'porch' | 'arcade' | 'cantilever' | 'decoPortal';
const EXCHANGE_FRONTS: Record<Vernacular, GrandFront> = {
  georgian: 'temple', classical: 'temple', italianate: 'temple', secondEmpire: 'temple',
  gothic: 'porch', tudor: 'porch', mission: 'arcade', modern: 'cantilever', artDeco: 'decoPortal',
};
function grandFrontOf(t: Buildable, v: Vernacular): GrandFront | undefined {
  if (signatureOf(t)?.feature === 'exchange') return EXCHANGE_FRONTS[v];
  // The economics lab: a small pedimented portico, as a trading floor's
  // front; Modern's canopy where a portico would be a style slip.
  if (signifierOf(t) === 'ticker') return v === 'modern' ? 'cantilever' : 'pedimented';
  return undefined;
}
// The entrance part each grand front stands in for, so the door, its
// steps and the windows' door bay follow the existing rules.
const GRAND_ENTRANCE: Record<GrandFront, EntrancePart> = {
  temple: 'portico', pedimented: 'portico', porch: 'porch', arcade: 'arcade', cantilever: 'none', decoPortal: 'none',
};
// How far the Art Deco portal stands out from its wall.
const DECO_PORTAL_DEPTH = across(1.6);
const LOBBY_GLASS = '#34464f';
const STEEL = '#3c4246';

// Modern's entrance (Plan 87I): a thin white slab cantilevered well out
// from the wall over a double-height glazed lobby, carried at its outer
// corners on two slender steel pilotis. Drawn in two parts: the lobby on
// the wall before the entrance steps, the slab and its posts after them.
function CantileverCanopy({ col, row, w, h, outward, wallHeight, part }: {
  col: number; row: number; w: number; h: number; outward: FaceDir; wallHeight: number; part: 'lobby' | 'slab';
}) {
  const span = wallSpan(w, h, outward);
  const width = Math.min(span * 0.52, across(22));
  const depth = Math.min(across(4.2), span * 0.3);
  const top = Math.min(STOREY * 1.45, wallHeight - EAVES_COURSE * 2);
  const thick = up(0.75);
  const mid = span / 2;
  const mass = boxFaces(col, row, w, h, 0, wallHeight);
  const wall = wallOf(mass, outward);
  const o = wall.origin; const a = wall.along;
  // The lobby glazing, a little narrower than the slab, mullioned on a
  // 1.6 m grid, with a transom at the doors' head.
  const gw = (width * 0.78) / span;
  const u0 = 0.5 - gw / 2; const u1 = 0.5 + gw / 2;
  const mullions = Math.max(3, Math.round((width * 0.78 * METRES_PER_TILE) / 1.6));
  const transom = Math.min(up(3), top * 0.55);
  const dw = Math.min(gw * 0.3, across(3) / span);
  const plate = againstWall(col, row, w, h, outward, mid - width / 2, width, depth);
  const slab = boxFaces(plate.col, plate.row, plate.w, plate.h, top, thick);
  const post = (along: number) => {
    const g = outsideWall(col, row, w, h, outward, along, depth * 0.88);
    const p = project(g.col, g.row);
    return { p0: p, p1: lift(p, top) };
  };
  const posts = [post(mid - width * 0.42), post(mid + width * 0.42)];
  const shadowAt = shadowOffset(top);
  const out = outwardOf(outward);
  const shadow = shadowAt.dcol * out.col + shadowAt.drow * out.row > 0
    ? boxFaces(plate.col + shadowAt.dcol, plate.row + shadowAt.drow, plate.w, plate.h, 0, 0).top
    : null;
  const white = '#eef0ee';
  if (part === 'slab') {
    return (
      <g className="entrance-cantilever">
        {shadow && <polygon className="campus-building-shadow" points={polyPoints(shadow)} />}
        {posts.map(({ p0, p1 }, i) => (
          <line key={i} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={STEEL} strokeWidth={1.1} />
        ))}
        {sideFaces(slab, shade(white, 0.86), shade(white, 0.72))}
        <polygon points={polyPoints(slab.top)} fill={white} />
      </g>
    );
  }
  return (
    <g className="entrance-lobby">
      <polygon points={polyPoints(wallQuad(o, a, wallHeight, u0, u1, 0, top))} fill={LOBBY_GLASS} />
      {Array.from({ length: mullions + 1 }, (_, i) => {
        const u = u0 + ((u1 - u0) * i) / mullions;
        const p0 = facePoint(o, a, wallHeight, u, 0); const p1 = facePoint(o, a, wallHeight, u, top / wallHeight);
        return <line key={i} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="#c9d3d8" strokeWidth={0.6} />;
      })}
      {(() => {
        const p0 = facePoint(o, a, wallHeight, u0, transom / wallHeight); const p1 = facePoint(o, a, wallHeight, u1, transom / wallHeight);
        return <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="#c9d3d8" strokeWidth={0.6} />;
      })()}
      {/* The doors: a lit pair in the middle of the glass. */}
      <polygon points={polyPoints(wallQuad(o, a, wallHeight, 0.5 - dw, 0.5 + dw, 0, transom * 0.92))} fill="#c7a86a" fillOpacity={0.55} />
    </g>
  );
}

// Art Deco's entrance (Plan 87I): a frontispiece standing out from the
// wall, stepped down to flanking piers and up above the parapet in two
// set-backs, fluted from the door to its crown, with a gilt sunburst over a
// tall door and a chevron band under the top.
function DecoPortal({ col, row, w, h, outward, wallHeight, stone }: {
  col: number; row: number; w: number; h: number; outward: FaceDir; wallHeight: number;
  stone: StonePalette;
}) {
  const span = wallSpan(w, h, outward);
  const mid = span / 2;
  const cw = Math.min(span * 0.26, across(13));
  const sw = cw * 0.38;
  const depth = DECO_PORTAL_DEPTH;
  const tone = stone.towerStone;
  const gilt = stone.gilt !== 'none' ? stone.gilt : '#c9a227';
  const dark = '#2c2a2b';
  const block = (along0: number, width: number, d: number, z: number, rise: number) => {
    const g = againstWall(col, row, w, h, outward, along0, width, d);
    return boxFaces(g.col, g.row, g.w, g.h, z, rise);
  };
  const solid = (f: BoxFaces, k: number, key: string) => (
    <g key={key}>
      {sideFaces(f, shade(tone, 0.97 * k), shade(tone, 0.8 * k))}
      <polygon points={polyPoints(f.top)} fill={shade(tone, 1.04 * k)} />
    </g>
  );
  const centreH = wallHeight + up(1.2);
  const wingH = wallHeight * 0.78;
  const step1 = up(2.4); const step2 = up(2.0);
  const wings = [block(mid - cw / 2 - sw, sw, depth * 0.6, 0, wingH), block(mid + cw / 2, sw, depth * 0.6, 0, wingH)];
  const centre = block(mid - cw / 2, cw, depth, 0, centreH);
  const tier1 = block(mid - cw * 0.34, cw * 0.68, depth * 0.8, centreH, step1);
  const tier2 = block(mid - cw * 0.18, cw * 0.36, depth * 0.6, centreH + step1, step2);
  const front = wallOf(centre, outward);
  const o = front.origin; const a = front.along;
  const P = (u: number, z: number) => facePoint(o, a, centreH, u, z / centreH);
  // The door, the sunburst's springing line, and the fluting above.
  const doorTop = Math.min(STOREY * 1.25, centreH * 0.34);
  const du = 0.17;
  const sunR = up(2.6);
  const fanTop = doorTop + sunR;
  const flutes = 7;
  const chevronZ = centreH - up(1.4);
  const sunburst = () => {
    const rays = 9;
    const hub = P(0.5, doorTop);
    const rim = (t: number) => P(0.5 - du * Math.cos(t), doorTop + sunR * Math.sin(t));
    return (
      <>
        <polygon points={polyPoints(Array.from({ length: 13 }, (_, i) => rim((Math.PI * i) / 12)))} fill={shade(gilt, 0.7)} />
        {Array.from({ length: rays }, (_, i) => {
          const t0 = (Math.PI * (i + 0.2)) / rays; const t1 = (Math.PI * (i + 0.8)) / rays;
          return <polygon key={i} points={polyPoints([hub, rim(t0), rim(t1)])} fill={gilt} />;
        })}
      </>
    );
  };
  const chevrons = () => {
    const n = 6;
    const pts: Pt[] = [];
    for (let i = 0; i <= n * 2; i += 1) {
      const u = 0.08 + (0.84 * i) / (n * 2);
      pts.push(P(u, chevronZ + (i % 2 === 0 ? -up(0.5) : up(0.5))));
    }
    return <polyline points={polyPoints(pts)} fill="none" stroke={gilt} strokeWidth={1.3} />;
  };
  return (
    <g className="entrance-deco-portal">
      {wings.map((f, i) => solid(f, 0.94, `w${i}`))}
      {wings.map((f, i) => {
        const wf = wallOf(f, outward);
        return [0.3, 0.5, 0.7].map((u) => {
          const p0 = facePoint(wf.origin, wf.along, wingH, u, 0.06); const p1 = facePoint(wf.origin, wf.along, wingH, u, 0.94);
          return <line key={`f${i}${u}`} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={shade(tone, 0.62)} strokeWidth={0.7} />;
        });
      })}
      {solid(centre, 1, 'c')}
      {/* The fluting: vertical reeds from the sunburst to the chevrons. */}
      {Array.from({ length: flutes }, (_, i) => {
        const u = 0.2 + (0.6 * (i + 0.5)) / flutes;
        const p0 = P(u, fanTop + up(0.6)); const p1 = P(u, chevronZ - up(0.9));
        return <line key={`fl${i}`} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={shade(tone, 0.6)} strokeWidth={0.9} />;
      })}
      <polygon points={polyPoints([P(0.5 - du, 0), P(0.5 + du, 0), P(0.5 + du, doorTop), P(0.5 - du, doorTop)])} fill={dark} />
      <line x1={P(0.5, 0).x} y1={P(0.5, 0).y} x2={P(0.5, doorTop).x} y2={P(0.5, doorTop).y} stroke={shade(gilt, 0.8)} strokeWidth={0.6} />
      {sunburst()}
      {chevrons()}
      {solid(tier1, 0.98, 't1')}
      {solid(tier2, 0.96, 't2')}
      {(() => {
        const tf = wallOf(tier1, outward);
        const p0 = facePoint(tf.origin, tf.along, step1, 0.12, 0.45); const p1 = facePoint(tf.origin, tf.along, step1, 0.88, 0.45);
        return <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={gilt} strokeWidth={1.1} />;
      })()}
    </g>
  );
}

// --- The sports sheds (Plan 87C) ------------------------------------------
// The Recreation Center, the Gym, the Sports & Recreation Complex, the Field
// House and the Natatorium shared one render shed with a roof monitor (the
// natatorium a flat glass box). Each is drawn here as the kind of building it
// is. The arena keeps its own vault in the hangar branch.
type SportsShed = 'rec' | 'gym' | 'courts' | 'fieldHouse' | 'natatorium';
function sportsShedOf(t: Buildable): SportsShed | undefined {
  if (t.id === 'REC-T1') return 'rec';
  if (t.id === 'REC-T2') return 'courts';
  if (t.facilityType === 'gym') return 'gym';
  if (t.facilityType === 'fieldHouse') return 'fieldHouse';
  if (t.facilityType === 'athleticsNatatorium') return 'natatorium';
  return undefined;
}

// What every sports shed needs from BuildingMotif.
interface ShedCtx {
  col: number; row: number; w: number; h: number; H: number;
  pal: Palette; stone: StonePalette; door: DoorDimensions | null; fronts: FaceDir[];
  crest: CrestPart; plantTint: string; hood: boolean; entrance: EntrancePart;
  cornice?: string; expansions: number;
  // The placement's facing: each shed sets its glass, sign, entrance and
  // service side on the building's own sides from it (shedSides), not from
  // `fronts`.
  facing?: Facing;
}
// A shed's own sides, and the walls the camera sees: the grand way in (its
// steps and canopy or portico) is on the front only; every wall keeps its
// door at the middle.
function shedSides(c: ShedCtx) {
  const sides = sidesOf(c.facing);
  const seen = visibleWalls();
  return { ...sides, seen: [seen.left, seen.right] as FaceDir[], entry: [sides.front].filter(wallSeen) };
}
interface ShedFace { o: Pt; a: Pt; span: number; dir: FaceDir }
// A box's two visible walls, left then right.
function shedFaces(f: BoxFaces): [ShedFace, ShedFace] {
  return [{ o: f.D, a: f.C, span: f.spanLeft, dir: f.dir.CD }, { o: f.C, a: f.B, span: f.spanRight, dir: f.dir.BC }];
}
const SHED_INTERIOR = '#39444a';
const SHED_SHEEN = 'rgba(214, 232, 242, 0.16)';
const MAPLE = '#c99a5c';
const POOL_WATER = '#3d9fc6';
const POOL_DECK = '#ddd9cc';
const LANE_LINE = 'rgba(240, 250, 252, 0.9)';
const CLIMB_WALL = '#e0873a';
const HOLD_COLOURS = ['#f3d13a', '#3f9c4a', '#8a52b8', '#d63c3c', '#2d6fc0', '#f4f1e8'];
const SEAT_RED = '#b6473a';
const SIGN_PANEL = '#1f5566';
const SHED_SIGN_LETTER = '#f3eee1';
const ZINC = '#aeb7ba';
const POOL_ROOF = '#dfe3e1';
const frac = (x: number) => x - Math.floor(x);

// A quad on a wall, in u and heights.
const wq = (s: ShedFace, H: number, u0: number, u1: number, z0: number, z1: number) => polyPoints(wallQuad(s.o, s.a, H, u0, u1, z0, z1));
// Thin mullions across a stretch of glazing, as one path: verticals every
// `pitch` tiles and transoms at the given heights.
function mullionPath(s: ShedFace, H: number, u0: number, u1: number, z0: number, z1: number, pitch: number, transoms: number[] = []): string {
  const n = Math.max(1, Math.round((s.span * (u1 - u0)) / pitch));
  const m = 0.006 * (4 / Math.max(2, s.span));
  const out: string[] = [];
  const quad = (a: number, b: number, c: number, d: number) => `M${polyPoints(wallQuad(s.o, s.a, H, a, b, c, d)).replace(/ /g, 'L')}Z`;
  for (let i = 0; i <= n; i++) {
    const u = u0 + ((u1 - u0) * i) / n;
    out.push(quad(Math.max(u0, u - m), Math.min(u1, u + m), z0, z1));
  }
  const tz = up(0.12);
  for (const z of transoms) out.push(quad(u0, u1, z - tz, z + tz));
  return out.join('');
}
// Glazing that shows what is inside: the room's dark, then `inside` (drawn
// in the wall's u and heights), then a sheen and the mullions over it.
function SeeThrough({ s, H, u0, u1, z0, z1, pitch, transoms, children }: {
  s: ShedFace; H: number; u0: number; u1: number; z0: number; z1: number; pitch: number; transoms?: number[];
  children?: React.ReactNode;
}) {
  return (
    <>
      <polygon points={wq(s, H, u0, u1, z0, z1)} fill={SHED_INTERIOR} />
      {children}
      <polygon points={wq(s, H, u0, u1, z0, z1)} fill={SHED_SHEEN} />
      <path className="iso-mullion" d={mullionPath(s, H, u0, u1, z0, z1, pitch, transoms)} />
    </>
  );
}
// Plinth and eaves course on a box's visible walls.
function shedCourses(f: BoxFaces, H: number, cornice?: string) {
  return shedFaces(f).map((s, i) => (
    <g key={`c${i}`}>
      <WallBand origin={s.o} along={s.a} wallHeight={H} from={0} to={BASE_COURSE} className="iso-plinth" />
      <WallBand origin={s.o} along={s.a} wallHeight={H} from={H - EAVES_COURSE} to={H} className="iso-cornice" fill={cornice} />
    </g>
  ));
}
// A door in the middle of each visible wall of box b, and the front's steps.
function shedDoors(c: ShedCtx, b: DepthBox, f: BoxFaces, H: number) {
  const d = c.door;
  if (!d) return null;
  return (
    <>
      {shedFaces(f).map((s) => <Door key={s.dir} d={d} origin={s.o} along={s.a} wallHeight={H} span={s.span} side={s.dir} />)}
      {shedSides(c).entry.map((dir) => {
        const span = wallSpan(b.w, b.h, dir);
        const at = outsideWall(b.col, b.row, b.w, b.h, dir, span / 2, 0);
        const out = outwardOf(dir);
        return <EntranceSteps key={dir} stone={c.stone} d={d} centreCol={at.col} centreRow={at.row} outCol={out.col} outRow={out.row} span={span} />;
      })}
    </>
  );
}
// The vernacular's way in on the given walls (as the fitness shed's, Plan 74E).
// A portico's pediment roof runs back into `roofAt` (Plan 87O; a flat
// deck at H unless the shed says otherwise), so a portico is drawn after
// the shed's roof.
function shedEntrance(c: ShedCtx, b: DepthBox, H: number, dirs: FaceDir[], roofAt?: RoofAt) {
  const d = c.door;
  if (!d) return null;
  return dirs.map((dir) => {
    if (c.entrance === 'archway') return <Archway key={dir} pal={c.pal} stone={c.stone} d={d} col={b.col} row={b.row} w={b.w} h={b.h} outward={dir} wallHeight={H} />;
    if (c.entrance === 'portico') {
      const span = wallSpan(b.w, b.h, dir);
      return (
        <TiedPortico key={dir} col={b.col} row={b.row} w={b.w} h={b.h} dir={dir} width={Math.min(d.widthTiles * 3.2, span * 0.6)}
          depth={across(2.4)} base={0} top={H} columns={4} roofAt={roofAt ?? flatRoofAt(b.col, b.row, b.w, b.h, H)}
          slopes={toneSlopes(c.pal.roof)} stone={c.stone} />
      );
    }
    return <Canopy key={dir} stone={c.stone} d={d} col={b.col} row={b.row} w={b.w} h={b.h} outward={dir} wallHeight={H} hood={c.hood} roof={c.plantTint} />;
  });
}
// A signboard on a wall: a panel with a roundel and a line of letter-like
// marks.
function WallSign({ s, H, uc, width, z0, z1 }: { s: ShedFace; H: number; uc: number; width: number; z0: number; z1: number }) {
  const half = Math.min(0.45, width / s.span / 2);
  const u0 = uc - half; const u1 = uc + half;
  const hgt = z1 - z0;
  const disc = facePoint(s.o, s.a, H, u0 + (u1 - u0) * 0.1, (z0 + hgt / 2) / H);
  const marks: string[] = [];
  const widths = [0.8, 1, 0.7, 1, 0.9, 0, 0.5, 1, 0.8, 0.9, 1, 0.7];
  const total = widths.reduce((a, x) => a + x + 0.5, 0);
  let u = u0 + (u1 - u0) * 0.2;
  const per = ((u1 - u0) * 0.74) / total;
  // A word, a space, a word: narrow marks with gaps between.
  for (const k of widths) {
    if (k > 0) marks.push(`M${polyPoints(wallQuad(s.o, s.a, H, u, u + per * k, z0 + hgt * 0.28, z0 + hgt * 0.72)).replace(/ /g, 'L')}Z`);
    u += per * (k + 0.5);
  }
  return (
    <g className="shed-sign">
      <polygon points={wq(s, H, u0, u1, z0, z1)} fill={SIGN_PANEL} stroke="rgba(240, 236, 224, 0.7)" strokeWidth={0.6} />
      <circle cx={disc.x} cy={disc.y} r={Math.max(1.4, hgt * 0.32)} fill={CLIMB_WALL} />
      <path d={marks.join('')} fill={SHED_SIGN_LETTER} />
    </g>
  );
}

// --- Seen through the glass (Plan 87J) -------------------------------------
// The Recreation Center's climbing tower, the Gym's two glass floors and the
// Complex's court hall are glazed so the room inside reads: the room is built
// in the grid (floor, far walls, what stands on the floor) and each of its
// shapes is cut to the pane it is seen through (clipConvex), so it stays
// right at any camera and both renderers draw it (no clip-path).
interface Shp { pts: Pt[]; fill: string }
const G3 = (c: number, r: number, z: number) => lift(project(c, r), z);
// A polygon cut to a convex one (Sutherland-Hodgman).
function clipConvex(subject: Pt[], clip: Pt[]): Pt[] {
  const area = clip.reduce((s, p, i) => { const q = clip[(i + 1) % clip.length]!; return s + p.x * q.y - q.x * p.y; }, 0);
  const sgn = area >= 0 ? 1 : -1;
  let out = subject;
  for (let i = 0; i < clip.length && out.length > 0; i++) {
    const a = clip[i]!; const b = clip[(i + 1) % clip.length]!;
    const side = (p: Pt) => sgn * ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x));
    const inp = out;
    out = [];
    for (let j = 0; j < inp.length; j++) {
      const p = inp[j]!; const q = inp[(j + 1) % inp.length]!;
      const sp = side(p); const sq = side(q);
      if (sp >= 0) out.push(p);
      if ((sp >= 0) !== (sq >= 0)) { const k = sp / (sp - sq); out.push({ x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k }); }
    }
  }
  return out;
}
// The shapes, in order, each cut to `clip`.
function Through({ clip, shapes }: { clip: Pt[]; shapes: Shp[] }) {
  return (
    <>
      {shapes.map((s, i) => {
        const p = clipConvex(s.pts, clip);
        return p.length >= 3 ? <polygon key={i} points={polyPoints(p)} fill={s.fill} /> : null;
      })}
    </>
  );
}
// A small box's visible faces, lit as walls are.
function boxShp(c: number, r: number, w: number, h: number, z0: number, ht: number, tone: string, topTone?: string): Shp[] {
  const f = boxFaces(c, r, w, h, z0, ht);
  return [
    { pts: f.left, fill: shade(tone, WALL_LIGHT[f.dir.CD]) },
    { pts: f.right, fill: shade(tone, WALL_LIGHT[f.dir.BC]) },
    { pts: f.top, fill: topTone ?? shade(tone, 1.1) },
  ];
}
// A room's far walls (the inside of the two the camera cannot see) and its
// floor.
function roomShp(b: DepthBox, zf: number, zc: number, wall: string, floor: string): Shp[] {
  const f = boxFaces(b.col, b.row, b.w, b.h, zf, zc - zf);
  return [
    ...[f.dir.AB, f.dir.DA].map((dir) => ({ pts: wallOf(f, dir).poly, fill: shade(wall, WALL_LIGHT[opposite(dir)] * 0.92) })),
    { pts: boxFaces(b.col, b.row, b.w, b.h, zf, 0).top, fill: floor },
  ];
}
// Things standing on a floor, far ones first.
function byDepth(items: Array<{ c: number; r: number; shapes: Shp[] }>): Shp[] {
  return [...items].sort((a, b) => project(a.c, a.r).y - project(b.c, b.r).y).flatMap((x) => x.shapes);
}
// A painted line on the ground from (c0, r0) to (c1, r1), `wd` tiles wide.
function lineShp(c0: number, r0: number, c1: number, r1: number, wd: number, z: number, fill: string): Shp {
  const L = Math.hypot(c1 - c0, r1 - r0) || 1;
  const nc = (-(r1 - r0) / L) * wd / 2; const nr = ((c1 - c0) / L) * wd / 2;
  return { pts: [G3(c0 + nc, r0 + nr, z), G3(c1 + nc, r1 + nr, z), G3(c1 - nc, r1 - nr, z), G3(c0 - nc, r0 - nr, z)], fill };
}
// A disc on screen, for heads, plates and wheels.
function discPts(p: Pt, r: number, n = 8): Pt[] {
  return Array.from({ length: n }, (_, i) => ({ x: p.x + r * Math.cos((i / n) * Math.PI * 2), y: p.y + r * Math.sin((i / n) * Math.PI * 2) }));
}
// A box centred on (c, r), `along` meters along a wall facing `dir` and
// `perp` meters deep through it.
function axBox(c: number, r: number, along: number, perp: number, dir: FaceDir): DepthBox {
  const a = across(along); const p = across(perp);
  return isRowWall(dir) ? { col: c - a / 2, row: r - p / 2, w: a, h: p } : { col: c - p / 2, row: r - a / 2, w: p, h: a };
}
// A figure standing at (c, r, z): legs, a shirt, a head.
function figureShp(c: number, r: number, z: number, shirt: string, skin = '#c98f63', k = 1.2): Shp[] {
  const p = G3(c, r, z);
  const s = up(k) * heightScale();
  const q = (x0: number, x1: number, y0: number, y1: number): Pt[] => [
    { x: p.x + x0 * s, y: p.y - y0 * s }, { x: p.x + x1 * s, y: p.y - y0 * s }, { x: p.x + x1 * s, y: p.y - y1 * s }, { x: p.x + x0 * s, y: p.y - y1 * s },
  ];
  return [
    { pts: q(-0.2, 0.2, 0, 0.9), fill: '#2b2f3a' },
    { pts: q(-0.27, 0.27, 0.85, 1.5), fill: shirt },
    { pts: discPts({ x: p.x, y: p.y - 1.68 * s }, 0.17 * s * 1.3), fill: skin },
  ];
}
const SHIRTS = ['#d9473b', '#2f7fc1', '#f0c02f', '#3c9a5b', '#f4f1e8'];
const MACHINE = '#262b2f';
const SCREEN_GLOW = '#86dbe9';

// A basketball court centred on (cc, cr), its length along col if `alongCol`:
// the surface, its lines (border, half-way, centre circle, the keys and
// the three-point arcs) at height z.
function courtShp(cc: number, cr: number, alongCol: boolean, z: number, surface: string, key: string, ink: string): Shp[] {
  const P = (x: number, y: number): [number, number] => alongCol ? [cc + across(x), cr + across(y)] : [cc + across(y), cr + across(x)];
  const quad = (x0: number, y0: number, x1: number, y1: number, fill: string): Shp => {
    const pts = [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)].map(([c, r]) => G3(c, r, z));
    return { pts, fill };
  };
  const lw = across(0.32);
  const seg = (x0: number, y0: number, x1: number, y1: number): Shp => {
    const [a, b] = P(x0, y0); const [d, e] = P(x1, y1);
    return lineShp(a, b, d, e, lw, z, ink);
  };
  const arc = (xc: number, rad: number, a0: number, a1: number, n: number): Shp[] => Array.from({ length: n }, (_, i) => {
    const t0 = a0 + ((a1 - a0) * i) / n; const t1 = a0 + ((a1 - a0) * (i + 1)) / n;
    return seg(xc + rad * Math.cos(t0), rad * Math.sin(t0), xc + rad * Math.cos(t1), rad * Math.sin(t1));
  });
  const X = 14; const Y = 7.5;
  return [
    quad(-X, -Y, X, Y, surface),
    quad(-X, -2.45, -X + 5.8, 2.45, key),
    quad(X - 5.8, -2.45, X, 2.45, key),
    seg(-X, -Y, X, -Y), seg(-X, Y, X, Y), seg(-X, -Y, -X, Y), seg(X, -Y, X, Y), seg(0, -Y, 0, Y),
    seg(-X + 5.8, -2.45, -X + 5.8, 2.45), seg(X - 5.8, -2.45, X - 5.8, 2.45),
    seg(-X, -2.45, -X + 5.8, -2.45), seg(-X, 2.45, -X + 5.8, 2.45), seg(X, -2.45, X - 5.8, -2.45), seg(X, 2.45, X - 5.8, 2.45),
    ...arc(0, 1.8, 0, Math.PI * 2, 12),
    ...arc(-X + 1.6, 6.75, -Math.PI / 2, Math.PI / 2, 8),
    ...arc(X - 1.6, 6.75, Math.PI / 2, Math.PI * 1.5, 8),
  ];
}
// The two hoops of that court: a post behind each baseline, an arm, a white
// backboard and an orange rim with its net.
function hoopItems(cc: number, cr: number, alongCol: boolean, z: number, k = 1): Array<{ c: number; r: number; shapes: Shp[] }> {
  const P = (x: number, y: number): [number, number] => alongCol ? [cc + across(x), cr + across(y)] : [cc + across(y), cr + across(x)];
  return [-1, 1].map((sgn) => {
    const [pc, pr] = P(sgn * 15.2, 0);
    const post = across(0.3);
    // Drawn a size up (k) so the board reads at the map's zoom.
    const W3 = (x: number, y: number, zz: number) => { const [c, r] = P(x, y); return G3(c, r, z + up(zz * k)); };
    const bx = sgn * 12.8;
    const plane = (x: number, y0: number, y1: number, z0: number, z1: number): Pt[] => [W3(x, y0, z0), W3(x, y1, z0), W3(x, y1, z1), W3(x, y0, z1)];
    const rimC = P(sgn * 12.35, 0);
    const rim = projectedCircle(rimC[0], rimC[1], across(0.28 * k), 10).map((q) => lift(q, z + up(3.05 * k)));
    const xs = rim.map((q) => q.x);
    const lo = W3(sgn * 12.35, 0, 2.55);
    const rimY = lift(project(rimC[0], rimC[1]), z + up(3.05 * k)).y;
    const net: Pt[] = [{ x: Math.min(...xs), y: rimY }, { x: Math.max(...xs), y: rimY }, { x: lo.x + 1, y: lo.y }, { x: lo.x - 1, y: lo.y }];
    return {
      c: pc, r: pr,
      shapes: [
        ...boxShp(pc - post / 2, pr - post / 2, post, post, z, up(3.5 * k), '#3d4246'),
        { pts: [W3(sgn * 15.2, -0.08, 3.25), W3(bx, -0.08, 3.25), W3(bx, -0.08, 3.5), W3(sgn * 15.2, -0.08, 3.5)], fill: '#3d4246' },
        { pts: plane(bx, -0.95 * k, 0.95 * k, 2.85, 4.0), fill: '#30363a' },
        { pts: plane(bx, -0.85 * k, 0.85 * k, 2.92, 3.93), fill: '#f6f4ee' },
        { pts: plane(bx, -0.3 * k, 0.3 * k, 3.05, 3.5), fill: '#d8542e' },
        { pts: net, fill: 'rgba(248, 246, 240, 0.85)' },
        { pts: rim, fill: '#e2632c' },
      ],
    };
  });
}

// A signboard with lettering and a pictogram at its start: a ball (a disc
// with its seams) or a dumbbell (a bar and two plates each end).
function PictoSign({ s, H, u0, u1, z0, z1, picto }: { s: ShedFace; H: number; u0: number; u1: number; z0: number; z1: number; picto: 'ball' | 'dumbbell' }) {
  const hgt = z1 - z0;
  const W = (u: number, z: number) => facePoint(s.o, s.a, H, u, z / H);
  const uq = (a: number, b: number, c: number, d: number) => `M${polyPoints(wallQuad(s.o, s.a, H, a, b, c, d)).replace(/ /g, 'L')}Z`;
  // The pictogram's square, in u: its height in meters over the wall's length.
  const du = (hgt / up(1)) / (s.span * METRES_PER_TILE);
  const pu = u0 + du * 0.25;
  const zc = z0 + hgt / 2;
  const marks: string[] = [];
  const widths = [0.8, 1, 0.7, 1, 0.9, 0, 0.5, 1, 0.8, 0.9, 1, 0.7, 0.8];
  const total = widths.reduce((a, x) => a + x + 0.5, 0);
  const l0 = pu + du * 1.15;
  const per = ((u1 - l0) - (u1 - u0) * 0.05) / total;
  let u = l0;
  for (const k of widths) {
    if (k > 0) marks.push(uq(u, u + per * k, z0 + hgt * 0.27, z0 + hgt * 0.73));
    u += per * (k + 0.5);
  }
  let pic: React.ReactNode;
  if (picto === 'ball') {
    const r = 0.4;
    const ring = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return W(pu + du * (0.45 + r * Math.cos(a)), zc + hgt * r * Math.sin(a)); });
    const seam = (pts: Array<[number, number]>) => polyPoints(pts.map(([x, y]) => W(pu + du * (0.45 + r * x), zc + hgt * r * y)));
    const curve = (sgn: number) => Array.from({ length: 7 }, (_, i): [number, number] => { const a = -Math.PI / 2 + (i / 6) * Math.PI; return [sgn * (1 - 0.45 * Math.cos(a)), Math.sin(a)]; });
    pic = (
      <>
        <polygon points={polyPoints(ring)} fill="#e2742f" />
        <polyline points={seam([[0, -1], [0, 1]])} fill="none" stroke="#2a201a" strokeWidth={0.7} />
        <polyline points={seam([[-1, 0], [1, 0]])} fill="none" stroke="#2a201a" strokeWidth={0.7} />
        <polyline points={seam(curve(-1))} fill="none" stroke="#2a201a" strokeWidth={0.7} />
        <polyline points={seam(curve(1))} fill="none" stroke="#2a201a" strokeWidth={0.7} />
      </>
    );
  } else {
    const a = pu; const b = pu + du * 0.95;
    pic = <path d={[
      uq(a + du * 0.12, b - du * 0.12, zc - hgt * 0.06, zc + hgt * 0.06),
      uq(a + du * 0.12, a + du * 0.22, zc - hgt * 0.36, zc + hgt * 0.36), uq(a, a + du * 0.1, zc - hgt * 0.25, zc + hgt * 0.25),
      uq(b - du * 0.22, b - du * 0.12, zc - hgt * 0.36, zc + hgt * 0.36), uq(b - du * 0.1, b, zc - hgt * 0.25, zc + hgt * 0.25),
    ].join('')} fill="#f0b43a" />;
  }
  return (
    <g className="shed-sign">
      <polygon points={wq(s, H, u0, u1, z0, z1)} fill={SIGN_PANEL} stroke="rgba(240, 236, 224, 0.7)" strokeWidth={0.6} />
      {pic}
      <path d={marks.join('')} fill={SHED_SIGN_LETTER} />
    </g>
  );
}

// The Recreation Center (Plan 87J, after 87C): a glass climbing tower at the
// building's front-right corner, a storey and a half above the roof, its far walls
// panelled in colour and studded with holds, ropes hanging from the top and
// a climber on the wall; beside it, on the main roof, a sun deck behind a
// railing with loungers and umbrellas. Precedents: the climbing towers of
// campus rec centers (Utah's, Oregon State's Dixon), seen from the street.
// The front carries the sign and the way in; the left side and the back
// (the service door) are plain clerestory walls. With the tower's corner
// turned away, what shows of it is what rises above the roof.
function RecCenterShed({ c }: { c: ShedCtx }) {
  const { col, row, w, h, H, pal, stone } = c;
  const f = boxFaces(col, row, w, h, 0, H);
  const [L, R] = shedFaces(f);
  const box = { col, row, w, h };
  const d = c.door;
  const sides = shedSides(c);
  // The tower: square, in the front-right corner, a pier's depth proud of
  // the walls.
  const T = Math.min(across(15), Math.min(w, h) * 0.4);
  const pr = PIER_PROJECTION;
  const corner = frontRightCorner(c.facing);
  const posC = corner.hiCol;
  const posR = corner.hiRow;
  const tb: DepthBox = { col: posC ? col + w - T : col - pr, row: posR ? row + h - T : row - pr, w: T + pr, h: T + pr };
  const Ht = H + up(6.5);
  const tf = boxFaces(tb.col, tb.row, tb.w, tb.h, 0, Ht);
  const [TL, TR] = shedFaces(tf);
  const tTop = Ht - up(1.4);
  // The climbing walls: the tower's two far walls, inside.
  const climb: Shp[] = [];
  const ropes: Shp[] = [];
  const panelTones = [CLIMB_WALL, '#2f8f9d', '#d9d2c2', '#e0b13a'];
  [tf.dir.AB, tf.dir.DA].forEach((dir, wi) => {
    const wf = wallOf(tf, dir);
    const tone = (k: number) => shade(panelTones[(k + wi) % panelTones.length]!, WALL_LIGHT[opposite(dir)] * 0.9);
    const n = 3;
    for (let i = 0; i < n; i++) {
      const a = i / n; const b = (i + 1) / n;
      climb.push({ pts: wallQuad(wf.origin, wf.along, Ht, a, b, 0, tTop), fill: tone(i) });
      // A volume: a darker wedge bolted to the panel.
      const vz = tTop * (0.3 + 0.35 * frac((i + wi) * 0.618));
      climb.push({ pts: [facePoint(wf.origin, wf.along, Ht, a + (b - a) * 0.2, vz / Ht), facePoint(wf.origin, wf.along, Ht, a + (b - a) * 0.75, (vz + up(1.2)) / Ht), facePoint(wf.origin, wf.along, Ht, a + (b - a) * 0.55, (vz + up(2.6)) / Ht)], fill: shade(tone(i), 0.72) });
      for (let k = 0; k < 9; k++) {
        const seed = i * 9 + k + wi * 31;
        const hu = a + (b - a) * (0.12 + 0.76 * frac(seed * 0.618 + 0.13));
        const hz = up(0.6) + (tTop - up(1.2)) * frac(seed * 0.382 + 0.31);
        climb.push({ pts: discPts(facePoint(wf.origin, wf.along, Ht, hu, hz / Ht), 1.5, 6), fill: HOLD_COLOURS[seed % HOLD_COLOURS.length]! });
      }
    }
    // Two top ropes hanging just off the wall.
    [0.3, 0.72].forEach((u, k) => {
      const p0 = facePoint(wf.origin, wf.along, Ht, u, (tTop - up(0.3)) / Ht);
      const p1 = facePoint(wf.origin, wf.along, Ht, u + 0.02, up(0.4) / Ht);
      ropes.push({ pts: [{ x: p0.x - 0.8, y: p0.y }, { x: p0.x + 0.8, y: p0.y }, { x: p1.x + 0.8, y: p1.y }, { x: p1.x - 0.8, y: p1.y }], fill: k ? '#f3e7b0' : '#f4f1e8' });
    });
    // A climber on the wall, roped.
    const cl = facePoint(wf.origin, wf.along, Ht, 0.5 + 0.12 * (wi ? -1 : 1), (tTop * (wi ? 0.55 : 0.38)) / Ht);
    const s = up(1) * heightScale();
    climb.push({ pts: [{ x: cl.x - 0.3 * s, y: cl.y }, { x: cl.x + 0.3 * s, y: cl.y }, { x: cl.x + 0.3 * s, y: cl.y - 1.1 * s }, { x: cl.x - 0.3 * s, y: cl.y - 1.1 * s }], fill: SHIRTS[wi]! });
    climb.push({ pts: discPts({ x: cl.x, y: cl.y - 1.35 * s }, 0.22 * s), fill: '#c98f63' });
  });
  const floor = { pts: boxFaces(tb.col, tb.row, tb.w, tb.h, 0, 0).top, fill: '#3e4f63' };
  const towerScene = [floor, ...climb, ...ropes];
  // The sun deck on the main roof, beside the tower along the longer wall.
  const alongW = w >= h;
  const m = across(2.5);
  const deck: DepthBox = alongW
    ? { col: posC ? col + m : col + T + m, row: posR ? row + h / 2 : row + across(1.5), w: w - T - m * 2, h: h / 2 - across(1.5) }
    : { col: posC ? col + w / 2 : col + across(1.5), row: posR ? row + m : row + T + m, w: w / 2 - across(1.5), h: h - T - m * 2 };
  const dz = H + up(0.25);
  const deckTop = boxFaces(deck.col, deck.row, deck.w, deck.h, H, up(0.25));
  const planks: string[] = [];
  for (let k = 1; k < 10; k++) {
    const a = alongW ? G3(deck.col, deck.row + (deck.h * k) / 10, dz) : G3(deck.col + (deck.w * k) / 10, deck.row, dz);
    const b = alongW ? G3(deck.col + deck.w, deck.row + (deck.h * k) / 10, dz) : G3(deck.col + (deck.w * k) / 10, deck.row + deck.h, dz);
    planks.push(`M${a.x},${a.y}L${b.x},${b.y}`);
  }
  // The railing round the deck, its two far sides drawn before what is on it.
  const corners: Array<[number, number]> = [[deck.col, deck.row], [deck.col + deck.w, deck.row], [deck.col + deck.w, deck.row + deck.h], [deck.col, deck.row + deck.h]];
  const rails = corners.map((p, i) => [p, corners[(i + 1) % 4]!] as const)
    .map(([a, b]) => ({ a, b, y: project((a[0] + b[0]) / 2, (a[1] + b[1]) / 2).y }))
    .sort((x, y) => x.y - y.y);
  const railing = (a: [number, number], b: [number, number], k: string) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(2, Math.round(len / across(1.6)));
    const top0 = G3(a[0], a[1], dz + up(1.1)); const top1 = G3(b[0], b[1], dz + up(1.1));
    const mid0 = G3(a[0], a[1], dz + up(0.55)); const mid1 = G3(b[0], b[1], dz + up(0.55));
    const posts: string[] = [];
    for (let i = 0; i <= n; i++) {
      const cc = a[0] + ((b[0] - a[0]) * i) / n; const rr = a[1] + ((b[1] - a[1]) * i) / n;
      const p = G3(cc, rr, dz); const q = G3(cc, rr, dz + up(1.1));
      posts.push(`M${p.x},${p.y}L${q.x},${q.y}`);
    }
    return (
      <g key={k}>
        <path d={posts.join('')} stroke="#4a4f52" strokeWidth={0.6} fill="none" />
        <line x1={mid0.x} y1={mid0.y} x2={mid1.x} y2={mid1.y} stroke="#4a4f52" strokeWidth={0.5} />
        <line x1={top0.x} y1={top0.y} x2={top1.x} y2={top1.y} stroke="#d9dcd8" strokeWidth={1.1} />
      </g>
    );
  };
  // Loungers along the deck's front, umbrellas behind them.
  const items: Array<{ c: number; r: number; node: React.ReactNode }> = [];
  const along = alongW ? deck.w : deck.h;
  const nU = Math.max(2, Math.round(along / across(9)));
  for (let i = 0; i < nU; i++) {
    const t = (i + 0.5) / nU;
    const uc = alongW ? deck.col + deck.w * t : deck.col + deck.w * (posC ? 0.35 : 0.65);
    const ur = alongW ? deck.row + deck.h * (posR ? 0.35 : 0.65) : deck.row + deck.h * t;
    items.push({ c: uc, r: ur, node: <Umbrella cc={uc} cr={ur} z={dz} /> });
    for (const off of [-0.22, 0.22]) {
      const t2 = t + off / nU;
      const lc = alongW ? deck.col + deck.w * t2 : deck.col + deck.w * (posC ? 0.75 : 0.25);
      const lr = alongW ? deck.row + deck.h * (posR ? 0.75 : 0.25) : deck.row + deck.h * t2;
      const lb = alongW ? { col: lc - across(0.4), row: lr - across(1), w: across(0.8), h: across(2) } : { col: lc - across(1), row: lr - across(0.4), w: across(2), h: across(0.8) };
      const back = alongW
        ? { col: lb.col, row: posR ? lb.row : lb.row + lb.h - across(0.55), w: lb.w, h: across(0.55) }
        : { col: posC ? lb.col : lb.col + lb.w - across(0.55), row: lb.row, w: across(0.55), h: lb.h };
      items.push({
        c: lc, r: lr,
        node: (
          <>
            {boxShp(lb.col, lb.row, lb.w, lb.h, dz, up(0.4), '#e9e4d6').map((s, k) => <polygon key={k} points={polyPoints(s.pts)} fill={s.fill} />)}
            {boxShp(back.col, back.row, back.w, back.h, dz + up(0.4), up(0.45), '#e9e4d6', '#2f7fc1').map((s, k) => <polygon key={`b${k}`} points={polyPoints(s.pts)} fill={s.fill} />)}
          </>
        ),
      });
    }
  }
  items.sort((a, b) => project(a.c, a.r).y - project(b.c, b.r).y);
  // A rooflight down the half of the roof behind the deck.
  const strip = alongW
    ? boxFaces(col + w * 0.12, posR ? row + h * 0.18 : row + h * 0.7, w * 0.6, h * 0.1, H, 0).top
    : boxFaces(posC ? col + w * 0.18 : col + w * 0.7, row + h * 0.12, w * 0.1, h * 0.6, H, 0).top;
  // The sign on the front, set off toward its left, away from the tower.
  const signFace = seenWall(f, sides.front);
  const signZ0 = d ? Math.min(d.threshold + d.height + up(1.5), H - EAVES_COURSE - up(3.2)) : up(4.5);
  const tsill = BASE_COURSE;
  const sunDeck = (
    <>
      {sideFaces(deckTop, '#8f6c45', '#7a5a38')}
      <polygon points={polyPoints(deckTop.top)} fill="#b68a58" />
      <path d={planks.join('')} stroke="rgba(80, 56, 32, 0.45)" strokeWidth={0.5} fill="none" />
      {rails.slice(0, 2).map((sd, i) => railing(sd.a, sd.b, `rb${i}`))}
      {items.map((it, i) => <g key={`it${i}`}>{it.node}</g>)}
      {rails.slice(2).map((sd, i) => railing(sd.a, sd.b, `rf${i}`))}
    </>
  );
  // The climbing tower. Its outer walls (on the hall's own) come down to
  // the ground; a wall inside the hall's corner shows only above its roof.
  const outer = (s: ShedFace) => s.dir === corner.colWall || s.dir === corner.rowWall;
  const tower = (
    <>
      {[TL, TR].map((s, i) => {
        const z0 = outer(s) ? 0 : H;
        const clip = wallQuad(s.o, s.a, Ht, 0.04, 0.96, Math.max(tsill, z0 + up(0.4)), tTop);
        return (
          <g key={`tg${i}`}>
            <polygon points={polyPoints(wallQuad(s.o, s.a, Ht, 0, 1, z0, Ht))} fill={i === 0 ? pal.wallLeft : pal.wallRight} />
            <polygon points={polyPoints(clip)} fill={SHED_INTERIOR} />
            <Through clip={clip} shapes={towerScene} />
            <polygon points={polyPoints(clip)} fill={SHED_SHEEN} />
            <path className="iso-mullion" d={mullionPath(s, Ht, 0.04, 0.96, Math.max(tsill, z0 + up(0.4)), tTop, across(4.5), [up(5), up(10)].filter((z) => z > z0))} />
            {outer(s) && <WallBand origin={s.o} along={s.a} wallHeight={Ht} from={0} to={BASE_COURSE} className="iso-plinth" />}
            <WallBand origin={s.o} along={s.a} wallHeight={Ht} from={Ht - EAVES_COURSE} to={Ht} className="iso-cornice" fill={c.cornice} />
          </g>
        );
      })}
      <polygon points={polyPoints(tf.top)} fill={pal.roof} />
      <Crest crest={c.crest} col={tb.col} row={tb.row} w={tb.w} h={tb.h} base={Ht} fronts={sides.seen} pal={pal} stone={stone} tile={c.plantTint} />
    </>
  );
  return (
    <>
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      {sides.seen.map((dir) => <Piers key={dir} stone={stone} col={col} row={row} w={w} h={h} height={H} outward={dir} pal={pal} />)}
      {shedCourses(f, H, c.cornice)}
      {[L, R].map((s, i) => (
        <g key={`cl${i}`}>
          {windows(s.o, s.a, H, s.span, [clerestorySill(H)], 0, `rc${i}`, 'ribbon', 'rgba(52, 72, 84, 0.6)', d ? doorBay(d, s.span, H) : undefined)}
        </g>
      ))}
      {shedDoors(c, box, f, H)}
      {signFace && <WallSign s={signFace} H={H} uc={0.42} width={across(15)} z0={signZ0} z1={signZ0 + up(1.6)} />}
      <polygon points={polyPoints(f.top)} fill={pal.roof} />
      <polygon className="iso-rooflight" points={polyPoints(strip)} />
      <Crest crest={c.crest} col={col} row={row} w={w} h={h} base={H} fronts={sides.seen} pal={pal} stone={stone} tile={c.plantTint} />
      {occludes(tb, deck) === 1 ? <>{sunDeck}{tower}</> : <>{tower}{sunDeck}</>}
      {shedEntrance(c, box, H, sides.entry)}
    </>
  );
}

// The Gym & Fitness Center (Plan 87J, after 87C): a two-storey glass box
// under a thin flat roof. Upstairs, behind floor-to-ceiling glass on both
// walls the camera sees, rows of treadmills and bikes face out, their
// screens lit, people on some; downstairs the weight floor, racks and
// benches, round the lobby at the door. A sign with a dumbbell runs along
// the front's floor band, and a board on the roof faces the front.
// Precedents: the glass fitness floors of campus gyms and city health
// clubs, cardio rows along the window. Glass on the front and both sides;
// the back, where the service door is, is a plain wall with a clerestory.
function GymShed({ c }: { c: ShedCtx }) {
  const { col, row, w, h, H, pal, stone } = c;
  const f = boxFaces(col, row, w, h, 0, H);
  const sides = shedSides(c);
  const all = shedFaces(f);
  const back = all.find((s) => s.dir === sides.back);
  const faces = all.filter((s) => s.dir !== sides.back);
  const box = { col, row, w, h };
  const sill = BASE_COURSE;
  const zf = up(4.6);
  const band0 = zf - up(0.6); const band1 = zf + up(0.6);
  const top = H - up(0.9);
  // Upstairs: two rows along each glass wall, short of the corners.
  const up2: Array<{ c: number; r: number; shapes: Shp[] }> = [];
  const low: Array<{ c: number; r: number; shapes: Shp[] }> = [];
  faces.forEach((s, fi) => {
    const span = s.span;
    const m = across(6.5);
    const n = Math.max(3, Math.round((span - 2 * m) / across(2.6)));
    for (let i = 0; i < n; i++) {
      const a = m + ((span - 2 * m) * (i + 0.5)) / n;
      // Row 1, by the glass: treadmills; row 2: bikes.
      const t1 = outsideWall(col, row, w, h, s.dir, a, -across(2.2));
      const t2 = outsideWall(col, row, w, h, s.dir, a, -across(5));
      const out = outwardOf(s.dir);
      const deckB = axBox(t1.col, t1.row, 0.8, 1.9, s.dir);
      const cons = axBox(t1.col + out.col * across(0.85), t1.row + out.row * across(0.85), 0.75, 0.22, s.dir);
      const runner = (i + fi) % 3 === 0;
      up2.push({
        c: t1.col, r: t1.row,
        shapes: [
          ...boxShp(deckB.col, deckB.row, deckB.w, deckB.h, zf, up(0.3), MACHINE),
          ...boxShp(cons.col, cons.row, cons.w, cons.h, zf + up(0.3), up(0.85), MACHINE, MACHINE),
          ...boxShp(cons.col, cons.row, cons.w, cons.h, zf + up(1.15), up(0.3), MACHINE, SCREEN_GLOW),
          ...(runner ? figureShp(t1.col - out.col * across(0.2), t1.row - out.row * across(0.2), zf + up(0.3), SHIRTS[(i + fi) % SHIRTS.length]!) : []),
        ],
      });
      const base = axBox(t2.col, t2.row, 0.45, 1.2, s.dir);
      const head = axBox(t2.col + out.col * across(0.45), t2.row + out.row * across(0.45), 0.5, 0.25, s.dir);
      const seat = axBox(t2.col - out.col * across(0.35), t2.row - out.row * across(0.35), 0.3, 0.3, s.dir);
      const fly = G3(t2.col + out.col * across(0.3), t2.row + out.row * across(0.3), zf + up(0.35));
      const rider = (i + fi) % 4 === 1;
      up2.push({
        c: t2.col, r: t2.row,
        shapes: [
          ...boxShp(base.col, base.row, base.w, base.h, zf, up(0.18), MACHINE),
          { pts: discPts(fly, up(0.38) * heightScale(), 8), fill: '#3a4045' },
          ...boxShp(seat.col, seat.row, seat.w, seat.h, zf + up(0.18), up(0.8), MACHINE),
          ...boxShp(head.col, head.row, head.w, head.h, zf + up(0.18), up(0.95), MACHINE, SCREEN_GLOW),
          ...(rider ? figureShp(t2.col - out.col * across(0.35), t2.row - out.row * across(0.35), zf + up(0.4), SHIRTS[(i + fi + 2) % SHIRTS.length]!) : []),
        ],
      });
    }
    // Downstairs: racks and benches, leaving the lobby round the door clear.
    const nr = Math.max(2, Math.round((span - 2 * m) / across(5)));
    for (let i = 0; i < nr; i++) {
      const a = m + ((span - 2 * m) * (i + 0.5)) / nr;
      if (Math.abs(a - span / 2) < across(5)) continue;
      const p = outsideWall(col, row, w, h, s.dir, a, -across(3));
      const out = outwardOf(s.dir);
      const along = isRowWall(s.dir) ? { col: 1, row: 0 } : { col: 0, row: 1 };
      const up1 = axBox(p.col - along.col * across(0.9), p.row - along.row * across(0.9), 0.12, 0.12, s.dir);
      const up2b = axBox(p.col + along.col * across(0.9), p.row + along.row * across(0.9), 0.12, 0.12, s.dir);
      const bar0 = G3(p.col - along.col * across(1.25), p.row - along.row * across(1.25), up(1.35));
      const bar1 = G3(p.col + along.col * across(1.25), p.row + along.row * across(1.25), up(1.35));
      const bench = axBox(p.col + out.col * across(1.0), p.row + out.row * across(1.0), 0.35, 1.3, s.dir);
      const lifter = i % 2 === 0;
      low.push({
        c: p.col, r: p.row,
        shapes: [
          ...boxShp(up1.col, up1.row, up1.w, up1.h, 0, up(2.1), MACHINE),
          ...boxShp(up2b.col, up2b.row, up2b.w, up2b.h, 0, up(2.1), MACHINE),
          { pts: [{ x: bar0.x, y: bar0.y - 0.5 }, { x: bar1.x, y: bar1.y - 0.5 }, { x: bar1.x, y: bar1.y + 0.5 }, { x: bar0.x, y: bar0.y + 0.5 }], fill: '#8d9498' },
          { pts: discPts(bar0, up(0.42) * heightScale(), 8), fill: '#1d2124' },
          { pts: discPts(bar1, up(0.42) * heightScale(), 8), fill: '#1d2124' },
          ...boxShp(bench.col, bench.row, bench.w, bench.h, 0, up(0.45), '#7a2e2a'),
          ...(lifter ? figureShp(p.col + out.col * across(0.3), p.row + out.row * across(0.3), 0, SHIRTS[(i + fi + 1) % SHIRTS.length]!) : []),
        ],
      });
    }
    // The front desk behind the door.
    const desk = outsideWall(col, row, w, h, s.dir, span / 2, -across(5));
    const db = axBox(desk.col, desk.row, 4, 0.8, s.dir);
    low.push({ c: desk.col, r: desk.row, shapes: [...boxShp(db.col, db.row, db.w, db.h, 0, up(1.1), '#a47a4a', '#e6dccb'), ...figureShp(desk.col, desk.row, 0, SHIRTS[1]!).slice(1)] });
  });
  // Lit rooms: pale walls, a pale rubber floor upstairs, timber below.
  const upper = [...roomShp(box, zf, H, '#f4efe2', '#9aa6ae'), ...byDepth(up2)];
  const lower = [...roomShp(box, 0, zf, '#f1ebdc', '#c49a66'), ...byDepth(low)];
  const signFace = seenWall(f, sides.front);
  const slab = across(1.2);
  const roof = boxFaces(col - slab, row - slab, w + slab * 2, h + slab * 2, H, up(0.7));
  const trimTone = stone.trim === 'none' ? stone.towerStone : stone.trim;
  // Three rooflights over the fitness floor.
  const rz = H + up(0.7);
  const lights = [0.25, 0.5, 0.75].map((k) => (w >= h
    ? boxFaces(col + w * 0.2, row + h * k - across(1), w * 0.6, across(2), rz, 0)
    : boxFaces(col + w * k - across(1), row + h * 0.2, across(2), h * 0.6, rz, 0)).top);
  // The board stands a few meters in from the front, 60% of its length.
  const bin = across(3.5); const bd = across(0.35);
  const bspan = wallSpan(w, h, sides.front);
  const bb = againstWall(col, row, w, h, sides.front, bspan * 0.2, bspan * 0.6, bd, bin + bd);
  const board = boxFaces(bb.col, bb.row, bb.w, bb.h, rz + up(1.2), up(2.6));
  const boardFace = shedFaces(board).find((x) => x.dir === sides.front);
  const legs = [0.15, 0.85].flatMap((k) => {
    const a = isRowWall(sides.front) ? { c: bb.col + bb.w * k, r: bb.row + bb.h / 2 } : { c: bb.col + bb.w / 2, r: bb.row + bb.h * k };
    return boxShp(a.c - across(0.15), a.r - across(0.15), across(0.3), across(0.3), rz, up(1.2), '#3d4246');
  });
  return (
    <>
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      {faces.map((s, i) => {
        const lo = wallQuad(s.o, s.a, H, 0.02, 0.98, sill, band0);
        const hi = wallQuad(s.o, s.a, H, 0.02, 0.98, band1, top);
        return (
          <g key={`g${i}`}>
            <polygon points={polyPoints(lo)} fill={SHED_INTERIOR} />
            <polygon points={polyPoints(hi)} fill={SHED_INTERIOR} />
            <Through clip={lo} shapes={lower} />
            <Through clip={hi} shapes={upper} />
            <polygon points={polyPoints(lo)} fill="rgba(255, 240, 200, 0.08)" />
            <polygon points={polyPoints(hi)} fill="rgba(255, 240, 200, 0.08)" />
            <polygon points={polyPoints(lo)} fill={SHED_SHEEN} />
            <polygon points={polyPoints(hi)} fill={SHED_SHEEN} />
            <path className="iso-mullion" d={mullionPath(s, H, 0.02, 0.98, sill, band0, across(3))} />
            <path className="iso-mullion" d={mullionPath(s, H, 0.02, 0.98, band1, top, across(3))} />
          </g>
        );
      })}
      {back && windows(back.o, back.a, H, back.span, [clerestorySill(H)], 0, 'gb', 'ribbon', 'rgba(52, 72, 84, 0.6)', c.door ? doorBay(c.door, back.span, H) : undefined)}
      {sides.seen.map((dir) => <Piers key={dir} stone={stone} col={col} row={row} w={w} h={h} height={H} outward={dir} pal={pal} />)}
      {shedCourses(f, H, c.cornice)}
      {/* The floor band between the storeys, the sign along the front's. */}
      {all.map((s, i) => <WallBand key={`fb${i}`} origin={s.o} along={s.a} wallHeight={H} from={band0} to={band1} className="iso-cornice" fill={c.cornice} />)}
      {signFace && <PictoSign s={signFace} H={H} u0={0.16} u1={0.84} z0={band0 + up(0.05)} z1={band1 - up(0.05)} picto="dumbbell" />}
      {shedDoors(c, box, f, H)}
      {sideFaces(roof, shade(trimTone, 0.8), shade(trimTone, 0.66))}
      <polygon points={polyPoints(roof.top)} fill={pal.roof} />
      {lights.map((q, i) => <polygon key={`rl${i}`} className="iso-rooflight" points={polyPoints(q)} />)}
      <Crest crest={c.crest} col={col - slab} row={row - slab} w={w + slab * 2} h={h + slab * 2} base={H + up(0.7)} fronts={sides.seen} pal={pal} stone={stone} tile={c.plantTint} />
      {/* After the slab its pediment meets (Plan 87O). */}
      {shedEntrance(c, box, H, sides.entry, flatRoofAt(col - slab, row - slab, w + slab * 2, h + slab * 2, H + up(0.7)))}
      {/* The rooftop sign: a board on legs, set back from the edge. */}
      {legs.map((q, i) => <polygon key={`lg${i}`} points={polyPoints(q.pts)} fill={q.fill} />)}
      {sideFaces(board, '#173f4c', '#123540')}
      <polygon points={polyPoints(board.top)} fill="#2a5f70" />
      {boardFace && <PictoSign s={boardFace} H={up(2.6)} u0={0} u1={1} z0={0} z1={up(2.6)} picto="dumbbell" />}
    </>
  );
}

// The Sports & Recreation Complex (Plan 87J, after 87C): a long court hall
// whose wall to the forecourt is all glass under a lettered sign band, the
// maple court inside, its lines and hoops, plain through it; an outdoor hard
// court in the forecourt with its own hoops; the way in through the glass;
// a low gabled roof of standing-seam metal. Precedents: glass-walled
// university recreation centers' court halls (Michigan's, Minnesota's), an
// outdoor court out front. The forecourt and the glass are the front; the
// right side's end wall carries a sign with a ball; the left side and the
// back (its service door) are plain clerestory walls. Each wall keeps its
// door at the middle.
function CourtsShed({ c }: { c: ShedCtx }) {
  const { col, row, w, h, H, pal, stone } = c;
  const alongW = w >= h;
  const sides = shedSides(c);
  // The forecourt runs along the front.
  const ld = sides.front;
  const sd = Math.min(across(19), Math.min(w, h) * 0.42);
  const hb: DepthBox = ld === 'posRow' ? { col, row, w, h: h - sd }
    : ld === 'negRow' ? { col, row: row + sd, w, h: h - sd }
      : ld === 'posCol' ? { col, row, w: w - sd, h } : { col: col + sd, row, w: w - sd, h };
  const f = boxFaces(hb.col, hb.row, hb.w, hb.h, 0, H);
  const faces = shedFaces(f);
  // The glass front, when the camera sees it, and the plain walls it sees.
  const G = faces.find((s) => s.dir === ld);
  const plain = faces.filter((s) => s.dir !== ld);
  const d = c.door;
  const L = wallSpan(hb.w, hb.h, ld);
  const sill = BASE_COURSE;
  const band0 = H - up(1.9);
  const alongCol = isRowWall(ld);
  // Inside: the hall's maple floor, its court a few meters in from the glass.
  // Two courts side by side, each running in from the glass, so the near
  // hoop of each faces the street (only a few meters of the hall show
  // through a wall at this camera).
  const inward = outwardOf(opposite(ld));
  const pins = [-1, 1].map((k) => outsideWall(hb.col, hb.row, hb.w, hb.h, ld, L / 2 + k * Math.min(across(9), L * 0.24), -across(15.3)));
  const players = pins.flatMap((p, k) => [[-2.5, 6], [3, 9.5], [0.5, 12]].map(([y, dd], i) => {
    // `dd` meters in from the glass, `y` across the court.
    const g = { c: p.col - inward.col * across(15.3 - dd) + (alongCol ? 0 : across(y!)), r: p.row - inward.row * across(15.3 - dd) + (alongCol ? across(y!) : 0) };
    return { c: g.c, r: g.r, shapes: figureShp(g.c, g.r, 0, SHIRTS[(i + k * 2) % SHIRTS.length]!, undefined, 1.3) };
  }));
  const hall = [
    ...roomShp(hb, 0, H, '#e9e3d3', MAPLE),
    // A dark padded dado round the far walls.
    ...roomShp(hb, 0, up(2), '#2f4a63', MAPLE).slice(0, 2),
    ...pins.flatMap((p) => courtShp(p.col, p.row, !alongCol, 0, shade(MAPLE, 1.05), '#2f6fa8', 'rgba(250, 248, 240, 0.95)')),
    ...byDepth([...pins.flatMap((p) => hoopItems(p.col, p.row, !alongCol, 0, 1.2)), ...players]),
  ];
  const glass = G ? wallQuad(G.o, G.a, H, 0.01, 0.99, sill, band0) : [];
  // Outside: the forecourt's paving and its hard court, with hoops.
  const fore = ld === 'posRow' ? { col, row: row + h - sd, w, h: sd }
    : ld === 'negRow' ? { col, row, w, h: sd }
      : ld === 'posCol' ? { col: col + w - sd, row, w: sd, h } : { col, row, w: sd, h };
  const oc = outsideWall(hb.col, hb.row, hb.w, hb.h, ld, L / 2, sd / 2);
  const court = courtShp(oc.col, oc.row, alongCol, up(0.05), '#2f6b8f', '#3f8a5c', 'rgba(250, 250, 245, 0.95)');
  const apron = boxFaces(fore.col, fore.row, fore.w, fore.h, 0, 0).top;
  const surround = (() => {
    const P = (x: number, y: number): [number, number] => alongCol ? [oc.col + across(x), oc.row + across(y)] : [oc.col + across(y), oc.row + across(x)];
    return [P(-16.5, -8.6), P(16.5, -8.6), P(16.5, 8.6), P(-16.5, 8.6)].map(([cc, rr]) => G3(cc, rr, up(0.03)));
  })();
  const outside = byDepth(hoopItems(oc.col, oc.row, alongCol, up(0.05), 1.6));
  // The roof: a low gable, ridge down the hall, ribbed.
  const rise = up(2.4);
  const fr = f;
  const rs = alongW ? lift(project(hb.col, hb.row + hb.h / 2), H + rise) : lift(project(hb.col + hb.w / 2, hb.row), H + rise);
  const re = alongW ? lift(project(hb.col + hb.w, hb.row + hb.h / 2), H + rise) : lift(project(hb.col + hb.w / 2, hb.row + hb.h), H + rise);
  const slopes: Array<[FaceDir, Pt[], [Pt, Pt]]> = alongW
    ? [['negRow', [fr.NWt, fr.NEt, re, rs], [fr.NWt, fr.NEt]], ['posRow', [fr.SWt, fr.SEt, re, rs], [fr.SWt, fr.SEt]]]
    : [['negCol', [fr.NWt, fr.SWt, re, rs], [fr.NWt, fr.SWt]], ['posCol', [fr.NEt, fr.SEt, re, rs], [fr.NEt, fr.SEt]]];
  const ribs = Math.max(8, Math.round((alongW ? hb.w : hb.h) / across(3)));
  const ribPath = ([e0, e1]: [Pt, Pt]) => {
    const out: string[] = [];
    for (let k = 1; k < ribs; k++) {
      const t = k / ribs;
      const a = { x: e0.x + (e1.x - e0.x) * t, y: e0.y + (e1.y - e0.y) * t };
      const b = { x: rs.x + (re.x - rs.x) * t, y: rs.y + (re.y - rs.y) * t };
      out.push(`M${a.x},${a.y}L${b.x},${b.y}`);
    }
    return out.join('');
  };
  const signZ0 = d ? Math.min(d.threshold + d.height + up(1.6), band0 - up(1.6)) : up(5);
  // The forecourt's hoops stand in front of the hall when the front shows,
  // behind it when it has turned away.
  const hoops = outside.map((s, i) => <polygon key={`o${i}`} points={polyPoints(s.pts)} fill={s.fill} />);
  return (
    <>
      {/* The forecourt, then the hall behind it. */}
      <polygon points={polyPoints(apron)} fill="#c9c4b6" />
      <polygon points={polyPoints(surround)} fill="#3f8a5c" />
      <Through clip={surround} shapes={court} />
      {!G && hoops}
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      {G && (
        <>
          <polygon points={polyPoints(glass)} fill={SHED_INTERIOR} />
          <Through clip={glass} shapes={hall} />
          <polygon points={polyPoints(glass)} fill={SHED_SHEEN} />
          <path className="iso-mullion" d={mullionPath(G, H, 0.01, 0.99, sill, band0, across(7))} />
        </>
      )}
      {plain.map((E) => <Piers key={`p${E.dir}`} stone={stone} col={hb.col} row={hb.row} w={hb.w} h={hb.h} height={H} outward={E.dir} pal={pal} />)}
      {shedCourses(f, H, c.cornice)}
      {plain.map((E) => <g key={`w${E.dir}`}>{windows(E.o, E.a, H, E.span, [clerestorySill(H)], 0, `sc${E.dir}`, 'ribbon', 'rgba(52, 72, 84, 0.6)', d ? doorBay(d, E.span, H) : undefined)}</g>)}
      {/* The sign band over the glass: the hall's name and a ball. */}
      {G && <PictoSign s={G} H={H} u0={0.01} u1={0.99} z0={band0} z1={H - EAVES_COURSE} picto="ball" />}
      {shedDoors(c, hb, f, H)}
      {plain.filter((E) => E.dir === sides.right).map((E) => (
        <PictoSign key="es" s={E} H={H} u0={0.5 - Math.min(0.4, across(8) / E.span)} u1={0.5 + Math.min(0.4, across(8) / E.span)} z0={signZ0} z1={signZ0 + up(1.5)} picto="ball" />
      ))}
      {/* The roof: gable end in the wall, slopes back to front, ribs. */}
      {gableEnds(fr, alongW, rs, re, pal)}
      {backSlopesFirst(slopes, (s) => s[0]).map(([dir, pts, eave]) => (
        <g key={dir}>
          <polygon points={polyPoints(pts)} fill={pal[dir]} />
          <path d={ribPath(eave)} stroke="rgba(30, 34, 38, 0.22)" strokeWidth={0.6} fill="none" />
        </g>
      ))}
      <line className="iso-ridge" x1={rs.x} y1={rs.y} x2={re.x} y2={re.y} />
      {/* After the roof its pediment runs back into (Plan 87O). */}
      {shedEntrance(c, hb, H, sides.entry, gableRoofAt(hb.col, hb.row, hb.w, hb.h, H, rise))}
      {G && hoops}
    </>
  );
}

// A barrel vault down a box's long axis, sprung from height `base`:
// `profile` (0..1 across the span) gives its section. Only the facets that
// face the camera are drawn (the vault is convex), each with its share of
// `ribs` and of any rooflight strips; the end the camera sees is returned
// as points for the caller to dress.
function barrelVault({ col, row, w, h, base, rise, n, profile, fill, ribs = 0, ribTone, lights = [], lightFill }: {
  col: number; row: number; w: number; h: number; base: number; rise: number; n: number;
  profile: (c: number) => number; fill: (c: number) => string;
  ribs?: number; ribTone?: string; lights?: Array<[number, number]>; lightFill?: string;
}) {
  const alongW = w >= h;
  const a0 = 0.004; const a1 = 0.996;
  const pt = (a: number, c: number) => lift(
    alongW ? project(col + w * a, row + h * c) : project(col + w * c, row + h * a), base + rise * profile(c),
  );
  const area = (pts: Pt[]) => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p.x * q.y - q.x * p.y; }, 0);
  const deck = area([project(0, 0), project(1, 0), project(1, 1), project(0, 1)]);
  const seenSign = Math.sign(deck) * (alongW ? 1 : -1);
  const facets: React.JSX.Element[] = [];
  for (let i = 0; i < n; i++) {
    const c0 = i / n; const c1 = (i + 1) / n;
    const quad = [pt(a0, c0), pt(a1, c0), pt(a1, c1), pt(a0, c1)];
    if (Math.sign(area(quad)) !== seenSign) continue;
    const rib: string[] = [];
    for (let k = 1; k < ribs; k++) {
      const p = pt(k / ribs, c0); const q = pt(k / ribs, c1);
      rib.push(`M${p.x},${p.y}L${q.x},${q.y}`);
    }
    const strips = lights.map(([l0, l1]) => [Math.max(l0, c0), Math.min(l1, c1)]).filter(([l0, l1]) => l1 > l0);
    facets.push(
      <g key={i}>
        <polygon points={polyPoints(quad)} fill={fill((c0 + c1) / 2)} />
        {strips.map(([l0, l1], j) => <polygon key={j} points={polyPoints([pt(0.05, l0), pt(0.95, l0), pt(0.95, l1), pt(0.05, l1)])} fill={lightFill} />)}
        {rib.length > 0 && <path d={rib.join('')} fill="none" stroke={ribTone} strokeWidth={0.7} />}
      </g>,
    );
  }
  // The end the camera sees: +col (+row) or the other.
  const f = boxFaces(col, row, w, h, 0, 0);
  const highEnd: FaceDir = alongW ? 'posCol' : 'posRow';
  const endDir = wallOf(f, highEnd).visible ? highEnd : opposite(highEnd);
  const endAt = endDir === highEnd ? a1 : a0;
  const at = (c: number, z: number) => lift(alongW ? project(col + w * endAt, row + h * c) : project(col + w * c, row + h * endAt), z);
  // The end's arch in k pieces, drawn in toward the middle of its
  // springing line by `shrink` (1 is the vault's own edge).
  const arch = (k: number, shrink = 1) => {
    const hub = at(0.5, base);
    return Array.from({ length: k + 1 }, (_, i) => {
      const q = at(i / k, base + rise * profile(i / k));
      return { x: hub.x + (q.x - hub.x) * shrink, y: hub.y + (q.y - hub.y) * shrink };
    });
  };
  return { facets, endDir, arch, at };
}

// The Field House: low walls under one long, high barrel of ribbed metal
// with a rooflight down its crown, and a fan of glazing in the end the
// camera sees (both ends have one). Precedents: Michigan's Oosterbaan Field
// House, Yale's Coxe Cage. Taller and narrower in section than the arena's
// shallow vault, and metal rather than its slate (Plan 87C). The way in is
// on the front, a plain door in the middle of every other wall.
function FieldHouseShed({ c }: { c: ShedCtx }) {
  const { col, row, w, h, pal, stone } = c;
  const sides = shedSides(c);
  const Hw = up(5.5);
  const f = boxFaces(col, row, w, h, 0, Hw);
  const [L, R] = shedFaces(f);
  const box = { col, row, w, h };
  const alongW = w >= h;
  const rise = up(15);
  const N = 14;
  const vault = barrelVault({
    col, row, w, h, base: Hw, rise, n: N,
    profile: (cc) => Math.sqrt(Math.max(0, 1 - (2 * cc - 1) ** 2)),
    fill: (cm) => shade(ZINC, 1.12 - 0.36 * cm),
    ribs: Math.max(6, Math.round((alongW ? w : h) * 1.1)), ribTone: 'rgba(70, 78, 82, 0.55)',
    lights: [[0.44, 0.56]], lightFill: 'rgba(196, 222, 232, 0.92)',
  });
  const endWall = pal.wall[vault.endDir];
  const lunette = vault.arch(24);
  // The fan: glass inset in the lunette, with mullions radiating from a hub.
  const glass = vault.arch(24, 0.93);
  const hub = vault.at(0.5, Hw + up(0.4));
  const hubDisc = Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI * (i / 8);
    return vault.at(0.5 - 0.07 * Math.cos(a), Hw + up(0.4) + up(3.0) * Math.sin(a));
  });
  const spokes = vault.arch(12, 0.93).slice(1, -1).map((q) => `M${hub.x},${hub.y}L${q.x},${q.y}`);
  const ring = vault.arch(16, 0.5);
  const long = (s: ShedFace) => isRowWall(s.dir) === alongW;
  const d = c.door;
  return (
    <>
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      {sides.seen.map((dir) => <Piers key={dir} stone={stone} col={col} row={row} w={w} h={h} height={Hw} outward={dir} pal={pal} />)}
      {shedCourses(f, Hw, c.cornice)}
      {[L, R].filter(long).map((s, i) => (
        <g key={`w${i}`}>
          {windows(s.o, s.a, Hw, s.span, [up(1.5)], across(2.2), `fw${i}`, 'rect', stone.glass, d ? doorBay(d, s.span, Hw) : undefined)}
        </g>
      ))}
      {shedDoors(c, box, f, Hw)}
      {vault.facets}
      <polygon points={polyPoints([...lunette])} fill={endWall} />
      <polygon points={polyPoints(glass)} fill="rgba(128, 170, 192, 0.95)" />
      <path d={spokes.join('')} fill="none" stroke="rgba(244, 242, 234, 0.9)" strokeWidth={0.9} />
      <polyline points={polyPoints(ring)} fill="none" stroke="rgba(244, 242, 234, 0.9)" strokeWidth={0.9} />
      <polygon points={polyPoints(hubDisc)} fill={shade(endWall, 0.92)} />
      {shedEntrance(c, box, Hw, sides.entry, vaultRoofAt(col, row, w, h, Hw, rise, (cc) => Math.sqrt(Math.max(0, 1 - (2 * cc - 1) ** 2))))}
    </>
  );
}

// The Natatorium: a long, low, pale vault over walls glazed from end to end,
// through which the pool's lanes read, and the stand behind them grows with
// each expansion (Plan 87C). Glazed on the front and both sides; the back,
// where the plant and the service door are, is a plain wall with a
// clerestory. The way in is on the front.
function NatatoriumShed({ c }: { c: ShedCtx }) {
  const { col, row, w, h, H, pal } = c;
  const f = boxFaces(col, row, w, h, 0, H);
  const [L, R] = shedFaces(f);
  const box = { col, row, w, h };
  const alongW = w >= h;
  const sides = shedSides(c);
  const top = H - EAVES_COURSE; const sill = BASE_COURSE;
  const vault = barrelVault({
    col, row, w, h, base: H, rise: up(4.2), n: 9,
    profile: (cc) => 1 - (2 * cc - 1) ** 2,
    fill: (cm) => shade(POOL_ROOF, 1.04 - 0.22 * cm),
    lights: [[0.24, 0.33], [0.67, 0.76]], lightFill: 'rgba(150, 196, 216, 0.85)',
  });
  const long = (s: ShedFace) => isRowWall(s.dir) === alongW;
  const gh = top - sill;
  // The pool along the long glass: deck, water, lane lines.
  const poolLong = (s: ShedFace) => {
    const p0 = sill + gh * 0.05; const p1 = sill + Math.min(gh * 0.34, up(3.6));
    const lanes: string[] = [];
    for (let k = 1; k < 8; k++) {
      const z = p0 + ((p1 - p0) * k) / 8;
      const a = facePoint(s.o, s.a, H, 0.08, z / H); const b = facePoint(s.o, s.a, H, 0.92, z / H);
      lanes.push(`M${a.x},${a.y}L${b.x},${b.y}`);
    }
    // Seats behind the pool: three rows, three more for each expansion.
    const rows = 3 + 3 * c.expansions;
    const rz = up(0.8);
    const s0 = p1 + up(1.2);
    const seats: React.JSX.Element[] = [];
    for (let k = 0; k < rows && s0 + rz * (k + 1) < top - up(0.8); k++) {
      seats.push(<polygon key={k} points={wq(s, H, 0.1, 0.9, s0 + rz * k, s0 + rz * (k + 0.75))} fill={shade(SEAT_RED, 1 - k * 0.04)} />);
    }
    return (
      <>
        <polygon points={wq(s, H, 0.02, 0.98, sill, p1 + up(1.0))} fill={POOL_DECK} />
        <polygon points={wq(s, H, 0.07, 0.93, p0, p1)} fill={POOL_WATER} />
        <path d={lanes.join('')} fill="none" stroke={LANE_LINE} strokeWidth={0.6} />
        {seats}
      </>
    );
  };
  // Through the end glazing the lanes run away from the camera.
  const poolEnd = (s: ShedFace) => {
    const p0 = sill + gh * 0.05; const p1 = sill + Math.min(gh * 0.3, up(3.2));
    const lanes: string[] = [];
    for (let k = 1; k < 8; k++) {
      const u = 0.15 + (0.7 * k) / 8;
      const a = facePoint(s.o, s.a, H, u, p0 / H); const b = facePoint(s.o, s.a, H, u + (u - 0.5) * 0.12, p1 / H);
      lanes.push(`M${a.x},${a.y}L${b.x},${b.y}`);
    }
    return (
      <>
        <polygon points={wq(s, H, 0.03, 0.97, sill, p1 + up(0.8))} fill={POOL_DECK} />
        <polygon points={polyPoints([...wallQuad(s.o, s.a, H, 0.15, 0.85, p0, p0).slice(0, 2), facePoint(s.o, s.a, H, 0.89, p1 / H), facePoint(s.o, s.a, H, 0.11, p1 / H)])} fill={POOL_WATER} />
        <path d={lanes.join('')} fill="none" stroke={LANE_LINE} strokeWidth={0.6} />
      </>
    );
  };
  const lunette = vault.arch(16);
  const lunetteGlass = vault.arch(16, 0.94);
  const mull: string[] = [];
  for (let k = 1; k < 8; k++) {
    const cc = k / 8;
    const p = vault.at(cc, H); const q = vault.at(cc, H + up(4.2) * (1 - (2 * cc - 1) ** 2) * 0.95);
    mull.push(`M${p.x},${p.y}L${q.x},${q.y}`);
  }
  return (
    <>
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      {shedCourses(f, H, c.cornice)}
      {[L, R].map((s) => (s.dir === sides.back
        ? <g key={s.dir}>{windows(s.o, s.a, H, s.span, [clerestorySill(H)], 0, 'nb', 'ribbon', 'rgba(52, 72, 84, 0.6)', c.door ? doorBay(c.door, s.span, H) : undefined)}</g>
        : (
          <SeeThrough key={s.dir} s={s} H={H} u0={long(s) ? 0.02 : 0.03} u1={long(s) ? 0.98 : 0.97} z0={sill} z1={top} pitch={across(4.5)} transoms={[sill + gh * 0.55]}>
            {long(s) ? poolLong(s) : poolEnd(s)}
          </SeeThrough>
        )))}
      {shedDoors(c, box, f, H)}
      {vault.facets}
      <polygon points={polyPoints(lunette)} fill={pal.wall[vault.endDir]} />
      {vault.endDir !== sides.back && (
        <>
          <polygon points={polyPoints(lunetteGlass)} fill="rgba(120, 164, 186, 0.95)" />
          <path d={mull.join('')} fill="none" stroke="rgba(244, 246, 246, 0.85)" strokeWidth={0.8} />
        </>
      )}
      {shedEntrance(c, box, H, sides.entry, vaultRoofAt(col, row, w, h, H, up(4.2), (cc) => 1 - (2 * cc - 1) ** 2))}
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

// The Business School's ticker (Plan 87A): a dark LED fascia with runs of
// lit quotes, green, red, amber and white, the tape that runs round a
// trading floor. One <path> per color, not a node per dash.
const TICKER_DARK = '#16191d';
const TICKER_LIGHTS = ['#58e386', '#ff5f4f', '#ffc847', '#eaf3ff'];
const TICKER_RUN_METRES = 2.4;
function Ticker({ origin, along, wallHeight, spanTiles, from, to, id }: {
  origin: Pt; along: Pt; wallHeight: number; spanTiles: number; from: number; to: number; id: string;
}) {
  if (wallHeight <= 0 || spanTiles <= 0 || to <= from) return null;
  const runs = Math.max(3, Math.round((spanTiles * METRES_PER_TILE) / TICKER_RUN_METRES));
  const d: string[] = TICKER_LIGHTS.map(() => '');
  const v0 = (from + (to - from) * 0.24) / wallHeight;
  const v1 = (from + (to - from) * 0.76) / wallHeight;
  for (let i = 0; i < runs; i++) {
    // A gap now and then between quotes; the colors and lengths vary.
    if (i % 6 === 5) continue;
    const len = 0.45 + ((i * 37) % 5) * 0.08;
    const u0 = (i + 0.12) / runs; const u1 = (i + 0.12 + len) / runs;
    const c = (i * 7 + (i >> 2)) % TICKER_LIGHTS.length;
    d[c] += `M${polyPoints([
      facePoint(origin, along, wallHeight, u0, v0), facePoint(origin, along, wallHeight, u1, v0),
      facePoint(origin, along, wallHeight, u1, v1), facePoint(origin, along, wallHeight, u0, v1),
    ]).replace(/ /g, 'L')}Z`;
  }
  return (
    <>
      <WallBand origin={origin} along={along} wallHeight={wallHeight} from={from} to={to} className="iso-cornice" fill={TICKER_DARK} />
      {d.map((path, c) => path && <path key={`${id}${c}`} fill={TICKER_LIGHTS[c]} d={path} />)}
    </>
  );
}

// The office tower's plant screen (Plan 87A): a light frame hung with dark
// horizontal louvres, open to the sky, the condenser fans showing inside.
const SCREEN_FRAME = '#d3d6d8';
const SCREEN_LOUVRE = '#4a5055';
const SCREEN_WELL = '#2c3034';
const SCREEN_FAN = '#6b7277';
function PlantScreen({ col, row, w, h, base }: DepthBox & { base: number }) {
  const H = up(3.4);
  const f = boxFaces(col, row, w, h, base, H);
  const louvres = [0.16, 0.34, 0.52, 0.7];
  const rim = across(0.5);
  const fans = [0.27, 0.73].map((k) => (w >= h
    ? { cc: col + w * k, cr: row + h / 2 }
    : { cc: col + w / 2, cr: row + h * k }));
  const r = Math.min(w * 0.2, h * 0.3, Math.max(w, h) * 0.2);
  return (
    <>
      {sideFaces(f, SCREEN_FRAME, shade(SCREEN_FRAME, 0.84))}
      {faceWallsOf(f).map(([o, a, , s]) => louvres.map((v, i) => (
        <WallBand key={`${s}${i}`} origin={o} along={a} wallHeight={H} from={H * v} to={H * (v + 0.1)}
          u0={0.05} u1={0.95} className="iso-cornice" fill={SCREEN_LOUVRE} />
      )))}
      {/* Open top: the frame's rim, the well inside it, and the fans'
          rings and hubs in the well. */}
      <polygon points={polyPoints(f.top)} fill={shade(SCREEN_FRAME, 1.04)} />
      <polygon points={polyPoints(boxFaces(col + rim, row + rim, w - rim * 2, h - rim * 2, base + H, 0).top)} fill={SCREEN_WELL} />
      {fans.map(({ cc, cr }, i) => (
        <g key={`fan${i}`}>
          <polygon points={polyPoints(projectedCircle(cc, cr, r, 20).map((q) => lift(q, base + H * 0.86)))} fill={SCREEN_FAN} />
          <polygon points={polyPoints(projectedCircle(cc, cr, r * 0.32, 12).map((q) => lift(q, base + H * 0.86)))} fill={SCREEN_WELL} />
        </g>
      ))}
    </>
  );
}
function faceWallsOf(f: BoxFaces) {
  return [[f.D, f.C, f.spanLeft, 'l'] as const, [f.C, f.B, f.spanRight, 'r'] as const];
}

// --- A building's own sides (Plan 88: four-way facing) --------------------
// The buildings below put their entrances, towers and wings on their own
// front, back and sides (components/facing.ts), not on the walls the camera
// happens to see, so each keeps its elevations as the camera turns. A
// namespace import: other parts of this file import from facing.ts too.
import * as ownFrame from './facing';

// How far along a face (o to a, its ground line) the grid point `at` lies.
function uOnFace(o: Pt, a: Pt, at: { col: number; row: number }): number {
  const q = project(at.col, at.row);
  const dx = a.x - o.x; const dy = a.y - o.y;
  return ((q.x - o.x) * dx + (q.y - o.y) * dy) / (dx * dx + dy * dy || 1);
}

// A door on a face (o to a, `span` tiles, facing `dir`) at the grid point
// `at` on that wall, where it need not be the face's middle (a part's wall
// that carries the building's middle): the window bay it takes, and the
// Door itself, drawn on a stretch of the face centred on it (Door centres
// itself on the stretch it is given) at its real size.
function doorOnFace(d: DoorDimensions, o: Pt, a: Pt, span: number, H: number, dir: FaceDir, at: { col: number; row: number }, key: string, shape: 'rect' | 'arched' = 'rect') {
  const u = Math.min(0.97, Math.max(0.03, uOnFace(o, a, at)));
  const k = Math.min(u, 1 - u);
  const dw = doorFraction(d, span);
  const lerp = (t: number): Pt => ({ x: o.x + (a.x - o.x) * t, y: o.y + (a.y - o.y) * t });
  const reserve: FaceRect | undefined = dw > 0 && H > 0
    ? { u0: u - dw / 2 - SURROUND, u1: u + dw / 2 + SURROUND, v0: 0, v1: (d.threshold + d.height) / H + LINTEL + 0.02 }
    : undefined;
  return {
    u, reserve,
    node: <Door key={key} d={d} origin={lerp(u - k)} along={lerp(u + k)} wallHeight={H} span={span * 2 * k} side={dir} shape={shape} />,
  };
}

// A service bay's roller shutter on a face at `u`: a steel frame, the
// slatted shutter and a dark sill, `width` tiles wide and `height` high.
const SHUTTER = '#9aa0a4';
function ServiceShutter({ o, a, span, H, u, width, height }: {
  o: Pt; a: Pt; span: number; H: number; u: number; width: number; height: number;
}) {
  if (H <= 0 || span <= 0) return null;
  const hw = width / span / 2; const top = Math.min(0.9, height / H);
  const at = (uu: number, v: number) => facePoint(o, a, H, uu, v);
  const quad = (u0: number, u1: number, v0: number, v1: number) => polyPoints([at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)]);
  const slats = Array.from({ length: 7 }, (_, i) => {
    const v = (top * (i + 1)) / 8;
    return `M${at(u - hw, v).x},${at(u - hw, v).y}L${at(u + hw, v).x},${at(u + hw, v).y}`;
  }).join('');
  return (
    <>
      <polygon points={quad(u - hw - 0.012, u + hw + 0.012, 0, top + 0.03)} fill={shade(SHUTTER, 0.62)} />
      <polygon points={quad(u - hw, u + hw, 0, top)} fill={SHUTTER} />
      <path d={slats} stroke={shade(SHUTTER, 0.72)} strokeWidth={0.6} fill="none" />
    </>
  );
}

// The Business School (Plan 87A; buildingSpec's businessSchoolPlan): a
// podium with the ticker round its fascia, a full-height glazed atrium at
// the middle of the long front, and an office tower rising from the back.
// Not the hospital (no slab, cross or helipad) and not the Business hall's
// domed exchange. The walls take the vernacular's windows and crest.
function BusinessSchool({ t, p, pal, stone, paneShape, paneW, crest, plantTint, cornice, trim, door }: {
  t: Buildable; p: Plot;
  pal: Palette; stone: StonePalette; paneShape: WindowShape; paneW: number;
  crest: CrestPart; plantTint: string; cornice: string | undefined; trim: boolean;
  door: DoorDimensions | null;
}) {
  const plan = businessSchoolPlan(p);
  const { front, sides, podiumHeight: Hp, atriumHeight: Ha } = plan;
  const back = opposite(front);
  const Ht = wallHeightOf(t);
  const floorsUnder = (storeys: number) => Array.from({ length: storeys - 1 }, (_, i) => (i + 1) * STOREY);
  const podiumTop = BUSINESS_PODIUM_STOREYS * STOREY;
  // The walls the camera sees: which crest copings to draw, nothing more.
  const fronts = [visibleWalls().left, visibleWalls().right];
  const faceWalls = (f: BoxFaces) => [[f.D, f.C, f.spanLeft, 'l', f.dir.CD] as const, [f.C, f.B, f.spanRight, 'r', f.dir.BC] as const];
  // The back and the two sides (Plan 88): a plain door at the middle of
  // each, where the walkers go in (walkRoutes.ts), all three on the back
  // podium; the back's a staff door beside a loading bay.
  const W = ownFrame.frontWidth(p); const D = ownFrame.frontDepth(p);
  const plainDoor = door ? doorDimensions('service') : null;
  const sideDoors: Partial<Record<FaceDir, { col: number; row: number }>> = {
    [back]: ownFrame.localToGrid(p, W / 2, D),
    [sides[0]]: ownFrame.localToGrid(p, 0, D / 2),
    [sides[1]]: ownFrame.localToGrid(p, W, D / 2),
  };
  const loadingBay = ownFrame.localToGrid(p, W * 0.78, D);

  // A podium part: windows by floor, the ticker on its fascia, its crest on
  // the walls that face out (not on a seam with another part), and any
  // door it carries.
  const podium = (b: DepthBox, outside: FaceDir[], key: string, doors: Partial<Record<FaceDir, { col: number; row: number }>> = {}) => {
    const f = boxFaces(b.col, b.row, b.w, b.h, 0, Hp);
    return (
      <g key={key}>
        <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
        {faceWalls(f).map(([o, a, span, s, dir]) => {
          const at = doors[dir];
          const dr = plainDoor && at ? doorOnFace(plainDoor, o, a, span, Hp, dir, at, `${key}${s}d`) : null;
          const bay = dir === back && at ? uOnFace(o, a, loadingBay) : null;
          return (
            <g key={s}>
              {trim && floorCourses(o, a, Hp, floorsUnder(BUSINESS_PODIUM_STOREYS), `${key}${s}`)}
              {trim && <WallBand origin={o} along={a} wallHeight={Hp} from={0} to={BASE_COURSE} className="iso-plinth" />}
              {windows(o, a, Hp, span, rankSills(BUSINESS_PODIUM_STOREYS).filter((v) => bay === null || v > STOREY), paneW, `${key}${s}`, paneShape, stone.glass, dr?.reserve)}
              {/* The back's ground floor is the service floor: the loading
                  bay's shutter and the staff door, no windows. */}
              {bay !== null && <ServiceShutter o={o} a={a} span={span} H={Hp} u={bay} width={across(4.4)} height={up(4.2)} />}
              {dr?.node}
              <Ticker origin={o} along={a} wallHeight={Hp} spanTiles={span} from={podiumTop + up(0.35)} to={Hp - EAVES_COURSE - up(0.15)} id={`${key}${s}t`} />
              <WallBand origin={o} along={a} wallHeight={Hp} from={Hp - EAVES_COURSE} to={Hp} className="iso-cornice" fill={cornice} />
            </g>
          );
        })}
        <polygon points={polyPoints(f.top)} fill={pal.roofDeck} />
        <Crest crest={crest} {...b} base={Hp} fronts={fronts.filter((d) => outside.includes(d))} pal={pal} stone={stone} tile={plantTint} />
      </g>
    );
  };

  // The tower: the same windows, floor by floor, over the podium; a plant
  // screen and its crest on top.
  const tower = (() => {
    const b = plan.tower;
    const TH = Ht - Hp;
    const f = boxFaces(b.col, b.row, b.w, b.h, Hp, TH);
    const storeys = Math.max(1, Math.round(TH / STOREY));
    const pier = cornice ?? (stone.trim === 'none' ? shade(pal.wall.posRow, 1.12) : stone.trim);
    return (
      <g key="tower">
        <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
        {faceWalls(f).map(([o, a, span, s]) => (
          <g key={s}>
            {trim && floorCourses(o, a, TH, floorsUnder(storeys), `tw${s}`)}
            {windows(o, a, TH, span, rankSills(storeys), paneW, `tw${s}`, paneShape, stone.glass)}
            {/* Piers between the bays, full height: the office tower's
                vertical against the podium's horizontal bands. */}
            {Array.from({ length: baysAcross(span) + 1 }, (_, i) => {
              const u = i / baysAcross(span);
              const half = Math.min(0.02, across(0.45) / span);
              return (
                <WallBand key={`tp${i}`} origin={o} along={a} wallHeight={TH} from={0} to={TH}
                  u0={Math.max(0, u - half)} u1={Math.min(1, u + half)} className="iso-cornice" fill={pier} />
              );
            })}
            <WallBand origin={o} along={a} wallHeight={TH} from={TH - EAVES_COURSE * 1.4} to={TH} className="iso-cornice" fill={cornice} />
          </g>
        ))}
        <polygon points={polyPoints(f.top)} fill={pal.roofDeck} />
        <PlantScreen col={b.col + b.w * 0.22} row={b.row + b.h * 0.24} w={b.w * 0.56} h={b.h * 0.52} base={Ht} />
        <Crest crest={crest} {...b} base={Ht} fronts={fronts} pal={pal} stone={stone} tile={plantTint} />
      </g>
    );
  })();

  // The atrium: glass from the plinth to the eaves, the ticker carried
  // across it at the podium's fascia, a glazed roof, the door and its
  // canopy on the front.
  const atrium = (() => {
    const b = plan.atrium;
    const f = boxFaces(b.col, b.row, b.w, b.h, 0, Ha);
    const fw = wallOf(f, front);
    const mullions = 4;
    const roofBars = Array.from({ length: mullions - 1 }, (_, i) => {
      const k = (i + 1) / mullions;
      const bar = (front === 'posRow' || front === 'negRow')
        ? boxFaces(b.col + b.w * k - across(0.25), b.row, across(0.5), b.h, Ha, 0)
        : boxFaces(b.col, b.row + b.h * k - across(0.25), b.w, across(0.5), Ha, 0);
      return <polygon key={`rb${i}`} className="iso-mullion" points={polyPoints(bar.top)} />;
    });
    return (
      <g key="atrium">
        <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
        {faceWalls(f).map(([o, a, span, s]) => (
          <g key={s}>
            <CurtainWall origin={o} along={a} wallHeight={Ha} spanTiles={span} from={BASE_COURSE} to={Ha - EAVES_COURSE * 1.4} floors={[STOREY * 2]} id={`at${s}`} u0={0.04} u1={0.96} />
            <Ticker origin={o} along={a} wallHeight={Ha} spanTiles={span} from={podiumTop + up(0.35)} to={Hp - EAVES_COURSE - up(0.15)} id={`at${s}t`} />
            <WallBand origin={o} along={a} wallHeight={Ha} from={Ha - EAVES_COURSE * 1.4} to={Ha} className="iso-cornice" fill={cornice} />
          </g>
        ))}
        <polygon className="iso-curtain-glass" points={polyPoints(f.top)} />
        {roofBars}
        {door && fw.visible && (
          <>
            <Door d={door} origin={fw.origin} along={fw.along} wallHeight={Ha} span={wallSpan(b.w, b.h, front)} side={front} />
            <Canopy stone={stone} d={door} col={b.col} row={b.row} w={b.w} h={b.h} outward={front} wallHeight={Ha} />
          </>
        )}
      </g>
    );
  })();

  // Painter's order among the four parts; the tower stands on the back
  // podium and paints with it.
  const parts = depthOrder([
    { ...plan.back, node: <g key="back">{podium(plan.back, [back, ...sides], 'bk', sideDoors)}{tower}</g> },
    { ...plan.wings[0], node: podium(plan.wings[0], [front, sides[0]], 'w0') },
    { ...plan.wings[1], node: podium(plan.wings[1], [front, sides[1]], 'w1') },
    { ...plan.atrium, node: atrium },
  ]);
  return <>{parts.map((x) => x.node)}</>;
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

  // The spire off the belfry's head, in SLOPE's lighting order. It is steep:
  // its back faces rise above its front ones on screen, so pyramid() puts
  // them down first.
  const spire = pyramid(cc - plan / 2, cr - plan / 2, plan, springs, TOWER_SPIRE_RISE, stone.towerStone);
  const tip = spire.tip;

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

      {spire.faces}
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
function VillageHouse({ col, row, w, h, height, ridge, pal, stone, glass, paneShape, chimney, door, doorAt }: {
  col: number; row: number; w: number; h: number; height: number; ridge: number; pal: Palette;
  stone: StonePalette; glass: string; paneShape: WindowShape; chimney: boolean; door: 'row' | 'col' | 'none';
  // The door's wall when the plot is turned (Plan 88), over `door`'s.
  doorAt?: FaceDir;
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
  // The door is on a grid wall, +row or +col (the lots face the green that
  // way), not on whichever wall is on the left: turned away, it is not drawn,
  // and that wall keeps its middle window.
  const doorDir: FaceDir | null = door === 'none' ? null : doorAt ?? (door === 'row' ? 'posRow' : 'posCol');
  const doorWall = doorDir ? wallOf(f, doorDir) : null;
  const plan = across(1.0);
  const stackAt = alongW ? { cc: col + w * 0.3, cr: row + h / 2 } : { cc: col + w / 2, cr: row + h * 0.3 };
  return (
    <>
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      {pane(f.D, f.C, f.spanLeft, 'l', f.dir.CD === doorDir)}
      {pane(f.C, f.B, f.spanRight, 'r', f.dir.BC === doorDir)}
      {doorWall?.visible && doorOn(doorWall.origin, doorWall.along)}
      {ridge > 0 ? (
        <>
          {gableSlopes(f, alongW, rs, re, pal)}
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
export interface VillageLot { u: number; v: number; uw: number; vh: number; s: number; d: 'row' | 'col' | 'none' }
export const VILLAGE_HOUSES: VillageLot[] = [
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

// --- The Research Park and the Graduate College (Plan 87B) ---------------
// Both are drawn as several volumes on one plot, laid out in the plot's own
// frame (Plan 88: l across its front from its own left, s from its back to
// its front) so the plan keeps its shape, and its gate its side, when the
// plot is turned, and painted in depthOrder like the village.

// A box on the plot from fractions of its own width (l) and depth (s, 0 at
// the back, 1 at the front).
function plotBox(p: ownFrame.Plot) {
  const L = ownFrame.frontWidth(p); const S = ownFrame.frontDepth(p);
  return (l0: number, s0: number, l1: number, s1: number): DepthBox =>
    ownFrame.localBox(p, L * l0, S * (1 - s1), L * l1, S * (1 - s0));
}

// A volume's cast shadow on the motif's own lawn, kept inside the plot:
// CampusMap's shadow pass already lies outside it, and a second layer there
// would read as a darker band.
function plotShadow(b: DepthBox, height: number, plot: DepthBox, key: string) {
  const { dcol, drow } = shadowOffset(height);
  const c0 = Math.max(plot.col, b.col + dcol); const c1 = Math.min(plot.col + plot.w, b.col + b.w + dcol);
  const r0 = Math.max(plot.row, b.row + drow); const r1 = Math.min(plot.row + plot.h, b.row + b.h + drow);
  if (c1 <= c0 || r1 <= r0) return null;
  return <polygon key={key} className="campus-building-shadow" points={polyPoints(boxFaces(c0, r0, c1 - c0, r1 - r0, 0, 0).top)} />;
}

// The visible long walls of a box (its two faces along the ridge).
function longWalls(f: BoxFaces, alongW: boolean): FaceDir[] {
  const dirs: FaceDir[] = alongW ? ['negRow', 'posRow'] : ['negCol', 'posCol'];
  return dirs.filter((d) => wallOf(f, d).visible);
}

const LAB_STEEL = '#9aa1a6';
const LAB_LOUVRE = '#b9bfc2';
const LAB_RIBBON_GLASS = 'rgba(52, 72, 84, 0.62)';
const SIGN_FACE = '#3b4650';
const SIGN_LETTER = 'rgba(244, 240, 228, 0.92)';
type ParkPart =
  | DepthBox & { kind: 'lab'; storeys: number; stacks: boolean; screen: boolean; ribbon: boolean }
  | DepthBox & { kind: 'link'; storeys: number }
  | DepthBox & { kind: 'tree'; species: 'canopy' | 'ornamental'; scale: number }
  | DepthBox & { kind: 'planter' }
  | DepthBox & { kind: 'sign' };

// The Research Park (Plan 87B): four lab pavilions of different heights
// round a landscaped court, joined by a glazed atrium and links, with rows
// of fume stacks, a screened roof plant and ribbon windows, and a monument
// sign at the gate. After Stanford Research Park and Cambridge Science Park.
function ResearchPark({ col, row, w, h, facing, pal, stone, paneShape, crest, plantTint }: {
  col: number; row: number; w: number; h: number; facing?: ownFrame.Plot['facing']; pal: Palette; stone: StonePalette;
  paneShape: WindowShape; crest: CrestPart; plantTint: string;
}) {
  const plot = { col, row, w, h, facing };
  const at = plotBox(plot);
  // Whether the plot's own width runs along the grid's columns.
  const alongW = (facing ?? 0) % 2 === 0;
  // The gate, the sign's lettered face and the forecourt are on the plot's
  // own front; the visible walls only choose which crest copings to draw.
  const gateSide = ownFrame.sidesOf(facing).front;
  const seen = visibleWalls();
  const fronts: FaceDir[] = [seen.left, seen.right];
  const lab = (l0: number, s0: number, l1: number, s1: number, storeys: number, extra: Partial<{ stacks: boolean; screen: boolean; ribbon: boolean }>) => (
    { kind: 'lab' as const, ...at(l0, s0, l1, s1), storeys, stacks: false, screen: false, ribbon: false, ...extra });
  const link = (l0: number, s0: number, l1: number, s1: number, storeys: number) => ({ kind: 'link' as const, ...at(l0, s0, l1, s1), storeys });
  const tree = (l: number, s: number, species: 'canopy' | 'ornamental', scale: number) => {
    const b = at(l, s, l, s);
    return { kind: 'tree' as const, col: b.col - 0.5, row: b.row - 0.5, w: 1, h: 1, species, scale };
  };
  const planter = (l: number, s: number) => {
    const b = at(l, s, l, s); const r = across(1.6);
    return { kind: 'planter' as const, col: b.col - r, row: b.row - r, w: r * 2, h: r * 2 };
  };
  // The monument sign stands across the gate's line, its faces to the road.
  const signLen = across(8); const signDepth = across(1.0);
  const sb = at(0.645, 0.955, 0.645, 0.955);
  const sign = { kind: 'sign' as const, ...(alongW
    ? { col: sb.col - signLen / 2, row: sb.row - signDepth / 2, w: signLen, h: signDepth }
    : { col: sb.col - signDepth / 2, row: sb.row - signLen / 2, w: signDepth, h: signLen }) };
  const parts: ParkPart[] = [
    lab(0.03, 0.05, 0.30, 0.47, 4, { stacks: true, ribbon: true }),
    link(0.30, 0.12, 0.50, 0.38, 2),
    lab(0.50, 0.04, 0.79, 0.43, 3, { screen: true }),
    link(0.79, 0.15, 0.84, 0.32, 2),
    lab(0.84, 0.08, 0.97, 0.90, 2, { ribbon: true }),
    link(0.11, 0.47, 0.21, 0.61, 1),
    lab(0.04, 0.61, 0.28, 0.94, 3, {}),
    tree(0.37, 0.60, 'canopy', 0.95), tree(0.75, 0.58, 'canopy', 0.8),
    tree(0.38, 0.88, 'canopy', 0.75), tree(0.78, 0.84, 'canopy', 1.0),
    planter(0.47, 0.47), planter(0.62, 0.47),
    sign,
  ];
  const masses = parts.filter((p): p is Extract<ParkPart, { storeys: number }> => p.kind === 'lab' || p.kind === 'link');
  const flat = (b: DepthBox, cls: string, key: string) => <polygon key={key} className={cls} points={polyPoints(boxFaces(b.col, b.row, b.w, b.h, 0, 0).top)} />;

  const labNode = (p: Extract<ParkPart, { kind: 'lab' }>, key: string) => {
    const H = p.storeys * STOREY;
    const f = boxFaces(p.col, p.row, p.w, p.h, 0, H);
    const lines = Array.from({ length: p.storeys - 1 }, (_, i) => (i + 1) * STOREY);
    const shape: WindowShape = p.ribbon ? 'ribbon' : paneShape;
    const glass = p.ribbon ? LAB_RIBBON_GLASS : stone.glass;
    const face = (o: Pt, a: Pt, span: number, k: string) => (
      <g key={k}>
        {windows(o, a, H, span, rankSills(p.storeys), across(2.2), k, shape, glass)}
        <WallBand origin={o} along={a} wallHeight={H} from={0} to={BASE_COURSE} className="iso-plinth" />
        <WallBand origin={o} along={a} wallHeight={H} from={H - EAVES_COURSE} to={H} className="iso-cornice" fill={stone.trim !== NO_STONE ? stone.trim : undefined} />
      </g>
    );
    // Lab exhaust: a row of tall fan stacks on a plinth down the roof's middle.
    const stacks = () => {
      const pl = Math.max(p.w, p.h); const n = Math.max(3, Math.round(pl / across(5.5)));
      const r = across(0.75); const z0 = H + up(1.2);
      const posts = Array.from({ length: n }, (_, i) => {
        const u = (i + 0.5) / n * 0.8 + 0.1;
        const cc = p.w >= p.h ? p.col + p.w * u : p.col + p.w * 0.5;
        const cr = p.w >= p.h ? p.row + p.h * 0.5 : p.row + p.h * u;
        return { col: cc - r, row: cr - r, w: r * 2, h: r * 2, cc, cr };
      });
      const bed = p.w >= p.h
        ? boxFaces(p.col + p.w * 0.08, p.row + p.h * 0.5 - across(1.4), p.w * 0.84, across(2.8), H, up(1.2))
        : boxFaces(p.col + p.w * 0.5 - across(1.4), p.row + p.h * 0.08, across(2.8), p.h * 0.84, H, up(1.2));
      return (
        <>
          {sideFaces(bed, shade(LAB_STEEL, 0.8), shade(LAB_STEEL, 0.66))}
          <polygon points={polyPoints(bed.top)} fill={shade(LAB_STEEL, 0.9)} />
          {depthOrder(posts).map((s, i) => (
            <g key={`fs${i}`}>
              <Cylinder cc={s.cc} cr={s.cr} r={r} z0={z0} z1={z0 + up(7.5)} fill={LAB_STEEL} />
              <Cylinder cc={s.cc} cr={s.cr} r={r * 0.55} z0={z0 + up(7.5)} z1={z0 + up(9.5)} fill={shade(LAB_STEEL, 0.62)} />
            </g>
          ))}
        </>
      );
    };
    // Rooftop plant behind a louvred screen, its fans showing from above.
    const screen = () => {
      const sc = p.col + p.w * 0.2; const sr = p.row + p.h * 0.22;
      const sw = p.w * 0.6; const sh = p.h * 0.56; const rise = up(3.6);
      const sf = boxFaces(sc, sr, sw, sh, H, rise);
      const fanR = Math.min(sw, sh) * 0.2;
      const fans = (sw >= sh ? [0.3, 0.7].map((u) => [sc + sw * u, sr + sh / 2]) : [0.3, 0.7].map((u) => [sc + sw / 2, sr + sh * u]));
      const louvres = (o: Pt, a: Pt, k: string) => [0.2, 0.4, 0.6, 0.8].map((v) => {
        const p0 = facePoint(o, a, rise, 0, v); const p1 = facePoint(o, a, rise, 1, v);
        return <line key={`${k}${v}`} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={shade(LAB_LOUVRE, 0.62)} strokeWidth={0.9} />;
      });
      return (
        <>
          <polygon points={polyPoints(sf.top)} fill={shade(LAB_STEEL, 0.42)} />
          {fans.map(([fc, fr], i) => (
            <g key={`fan${i}`}>
              <polygon points={polyPoints(projectedCircle(fc, fr, fanR, 20).map((q) => lift(q, H + rise)))} fill={shade(LAB_STEEL, 0.75)} />
              <polygon points={polyPoints(projectedCircle(fc, fr, fanR * 0.7, 20).map((q) => lift(q, H + rise)))} fill={shade(LAB_STEEL, 0.3)} />
              {(() => { const a = lift(project(fc - fanR * 0.7, fr), H + rise); const b = lift(project(fc + fanR * 0.7, fr), H + rise);
                const c = lift(project(fc, fr - fanR * 0.7), H + rise); const d = lift(project(fc, fr + fanR * 0.7), H + rise);
                return <><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={shade(LAB_STEEL, 0.8)} strokeWidth={0.8} /><line x1={c.x} y1={c.y} x2={d.x} y2={d.y} stroke={shade(LAB_STEEL, 0.8)} strokeWidth={0.8} /></>; })()}
            </g>
          ))}
          {sideFaces(sf, LAB_LOUVRE, shade(LAB_LOUVRE, 0.8))}
          {louvres(sf.D, sf.C, 'll')}
          {louvres(sf.C, sf.B, 'lr')}
        </>
      );
    };
    return (
      <g key={key}>
        <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
        {floorCourses(f.D, f.C, H, lines, `${key}l`)}
        {floorCourses(f.C, f.B, H, lines, `${key}r`)}
        {face(f.D, f.C, f.spanLeft, `${key}fl`)}
        {face(f.C, f.B, f.spanRight, `${key}fr`)}
        <polygon points={polyPoints(f.top)} fill={pal.roof} />
        <Crest crest={crest} col={p.col} row={p.row} w={p.w} h={p.h} base={H} fronts={fronts} pal={pal} stone={stone} tile={plantTint} />
        {p.stacks && stacks()}
        {p.screen && screen()}
      </g>
    );
  };

  const linkNode = (p: Extract<ParkPart, { kind: 'link' }>, key: string) => {
    const H = p.storeys * STOREY + up(1.2);
    const f = boxFaces(p.col, p.row, p.w, p.h, 0, H);
    const lines = Array.from({ length: p.storeys - 1 }, (_, i) => (i + 1) * STOREY);
    const roof = boxFaces(p.col, p.row, p.w, p.h, H, 0);
    return (
      <g key={key}>
        <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
        <CurtainWall origin={f.D} along={f.C} wallHeight={H} spanTiles={f.spanLeft} from={BASE_COURSE} to={H - EAVES_COURSE} floors={lines} id={`${key}l`} />
        <CurtainWall origin={f.C} along={f.B} wallHeight={H} spanTiles={f.spanRight} from={BASE_COURSE} to={H - EAVES_COURSE} floors={lines} id={`${key}r`} />
        {/* A glass roof on the atrium: rooflight panes between steel ribs. */}
        <polygon points={polyPoints(roof.top)} fill={shade(LAB_STEEL, 0.85)} />
        <polygon className="iso-curtain-glass" points={polyPoints(boxFaces(p.col + p.w * 0.08, p.row + p.h * 0.08, p.w * 0.84, p.h * 0.84, H, 0).top)} />
        {[0.3, 0.5, 0.7].map((u) => {
          const a = p.w >= p.h ? lift(project(p.col + p.w * u, p.row + p.h * 0.08), H) : lift(project(p.col + p.w * 0.08, p.row + p.h * u), H);
          const b = p.w >= p.h ? lift(project(p.col + p.w * u, p.row + p.h * 0.92), H) : lift(project(p.col + p.w * 0.92, p.row + p.h * u), H);
          return <line key={`rib${u}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={shade(LAB_STEEL, 1.15)} strokeWidth={1} />;
        })}
      </g>
    );
  };

  const signNode = (p: DepthBox, key: string) => {
    const rise = up(2.9);
    const plinth = boxFaces(p.col - across(0.4), p.row - across(0.4), p.w + across(0.8), p.h + across(0.8), 0, up(0.4));
    const f = boxFaces(p.col, p.row, p.w, p.h, up(0.4), rise);
    const cap = boxFaces(p.col - across(0.15), p.row - across(0.15), p.w + across(0.3), p.h + across(0.3), up(0.4) + rise, up(0.35));
    const stoneTone = stone.trim !== NO_STONE ? stone.trim : '#d8d2c2';
    // Lettering-like marks on the face to the road (the plot's front): a
    // logo block and two lines of words. Its back is plain.
    const letters = longWalls(f, p.w >= p.h).filter((dir) => dir === gateSide).map((dir) => {
      const wl = wallOf(f, dir);
      const words: Array<[number, number, number]> = [
        [0.26, 0.48, 0.62], [0.52, 0.62, 0.62], [0.66, 0.86, 0.62],
        [0.26, 0.42, 0.34], [0.46, 0.70, 0.34],
      ];
      return (
        <g key={`${key}${dir}`}>
          <polygon points={polyPoints(wallQuad(wl.origin, wl.along, rise, 0.08, 0.2, rise * 0.25, rise * 0.78))} fill="#c7a540" />
          {words.map(([u0, u1, v], i) => (
            <polygon key={i} points={polyPoints(wallQuad(wl.origin, wl.along, rise, u0, u1, rise * v, rise * (v + (i < 3 ? 0.17 : 0.1))))} fill={SIGN_LETTER} />
          ))}
        </g>
      );
    });
    return (
      <g key={key}>
        <polygon className="ground-bed" points={polyPoints(boxFaces(p.col - across(1.2), p.row - across(1.2), p.w + across(2.4), p.h + across(2.4), 0, 0).top)} />
        {sideFaces(plinth, shade(stoneTone, 0.9), shade(stoneTone, 0.74))}
        {sideFaces(f, SIGN_FACE, shade(SIGN_FACE, 0.82))}
        {letters}
        {sideFaces(cap, shade(stoneTone, 0.95), shade(stoneTone, 0.78))}
        <polygon points={polyPoints(cap.top)} fill={stoneTone} />
      </g>
    );
  };

  const planterNode = (p: DepthBox, key: string) => {
    const cc = p.col + p.w / 2; const cr = p.row + p.h / 2; const r = p.w / 2;
    return (
      <g key={key}>
        <Cylinder cc={cc} cr={cr} r={r} z0={0} z1={up(0.9)} fill={stone.trim !== NO_STONE ? shade(stone.trim, 0.85) : '#bdb6a6'} />
        <polygon points={polyPoints(projectedCircle(cc, cr, r * 0.82, 18).map((q) => lift(q, up(0.9))))} fill="#55863f" />
        <polygon points={polyPoints(projectedCircle(cc - r * 0.15, cr - r * 0.15, r * 0.5, 14).map((q) => lift(q, up(1.6))))} fill="#6b9a4c" />
      </g>
    );
  };

  return (
    <>
      {/* The court: lawn, a paved forecourt at the atrium, and the walk from the gate. */}
      <polygon className="ground-lawn" points={polyPoints(boxFaces(col, row, w, h, 0, 0).top)} />
      {flat(at(0.30, 0.38, 0.84, 0.52), 'ground-walk-fill', 'plaza')}
      {flat(at(0.53, 0.52, 0.58, 1), 'ground-walk-fill', 'gate')}
      {flat(at(0.28, 0.70, 0.84, 0.745), 'ground-walk-fill', 'cross')}
      {flat(at(0.13, 0.94, 0.19, 1), 'ground-walk-fill', 'dwalk')}
      {masses.map((m, i) => plotShadow(m, m.storeys * STOREY, plot, `sh${i}`))}
      {parts.filter((p) => p.kind === 'tree').map((p, i) => (
        <polygon key={`ts${i}`} className="campus-tree-shadow" points={polyPoints(treeShadow(p.col + 0.5, p.row + 0.5, p.species, p.scale))} />
      ))}
      {depthOrder(parts).map((p, i) => {
        switch (p.kind) {
          case 'lab': return labNode(p, `lab${i}`);
          case 'link': return linkNode(p, `lk${i}`);
          case 'tree': return <TreeAt key={`t${i}`} col={p.col + 0.5} row={p.row + 0.5} species={p.species} scale={p.scale} shadow={false} />;
          case 'planter': return planterNode(p, `pl${i}`);
          case 'sign': return signNode(p, `sg${i}`);
        }
      })}
    </>
  );
}

// The Graduate College (Plan 87B): four gabled ranges round an open quad,
// entered through an arch in the front range, with a tall tower at one
// corner crowned in the vernacular's way: Princeton's Graduate College and
// its Cleveland Tower in Collegiate Gothic, a cupola in Georgian and
// Classical, a belfry in Mission, a plain stair tower in Modern.
function GraduateCollege({ col, row, w, h, facing, H, ridge, vernacular, pal, stone, paneShape, lights }: {
  col: number; row: number; w: number; h: number; facing?: ownFrame.Plot['facing']; H: number; ridge: number; vernacular: Vernacular;
  pal: Palette; stone: StonePalette; paneShape: WindowShape; lights: 1 | 2;
}) {
  const plot = { col, row, w, h, facing };
  const at = plotBox(plot);
  // Whether the plot's own width (l) runs along the grid's columns.
  const alongW = (facing ?? 0) % 2 === 0;
  const L = ownFrame.frontWidth(plot); const S = ownFrame.frontDepth(plot);
  const own = ownFrame.sidesOf(facing);
  const parts = partsFor(vernacular);
  const trim = hasTrim(vernacular);
  const mansard = isMansard(vernacular);
  const apex = apexPartOf(vernacular);
  const seen = visibleWalls();
  const fronts: FaceDir[] = [seen.left, seen.right];
  // Range depth and tower plan, as fractions of each axis.
  const d = across(14); const T = across(15.5);
  const dl = d / L; const ds = d / S; const tl = T / L; const ts = T / S;
  const courses = Array.from({ length: Math.round(H / STOREY) - 1 }, (_, i) => (i + 1) * STOREY);
  const sills = rankSills(Math.round(H / STOREY));
  // A range's outer door, if it has one: the wall it is on and the grid
  // point at that wall's middle.
  type OuterDoor = { dir: FaceDir; at: { col: number; row: number } };
  type Range = DepthBox & { kind: 'range'; ridgeAlongW: boolean; arch: boolean; door?: OuterDoor };
  type Tower = DepthBox & { kind: 'tower' };
  type Tree = DepthBox & { kind: 'tree' };
  const range = (l0: number, s0: number, l1: number, s1: number, longRange: boolean, arch = false, door?: OuterDoor): Range => (
    { kind: 'range', ...at(l0, s0, l1, s1), ridgeAlongW: longRange === alongW, arch, door });
  const tb = at(0.5, 0.5, 0.5, 0.5);
  // The college's own sides (Plan 88): the gate through the front range at
  // the front's middle, the tower on the front's right-hand corner, and a
  // plain door at the middle of the back and of each side, where the
  // walkers go in (walkRoutes.ts).
  const gateMid = ownFrame.localToGrid(plot, L / 2, 0);
  const items: Array<Range | Tower | Tree> = [
    range(0, 0, 1, ds, true, false, { dir: own.back, at: ownFrame.localToGrid(plot, L / 2, S) }),    // the back range, full length
    range(0, 1 - ds, 1 - tl, 1, true, true),            // the front range, with the gate
    range(0, ds, dl, 1 - ds, false, false, { dir: own.left, at: ownFrame.localToGrid(plot, 0, S / 2) }),    // the two side ranges
    range(1 - dl, ds, 1, 1 - ts, false, false, { dir: own.right, at: ownFrame.localToGrid(plot, L, S / 2) }),
    { kind: 'tower', ...at(1 - tl, 1 - ts, 1, 1) },
    { kind: 'tree', col: tb.col - 0.5, row: tb.row - 0.5, w: 1, h: 1 },
  ];
  const court = at(dl, ds, 1 - dl, 1 - ds);
  const rangeDoor = doorDimensions('residential');
  const flat = (b: DepthBox, cls: string, key: string) => <polygon key={key} className={cls} points={polyPoints(boxFaces(b.col, b.row, b.w, b.h, 0, 0).top)} />;
  const walk = across(2.6) / 2;

  const rangeNode = (p: Range, key: string) => {
    const f = boxFaces(p.col, p.row, p.w, p.h, 0, H);
    const ra = p.ridgeAlongW;
    const rs = lift(ra ? project(p.col, p.row + p.h / 2) : project(p.col + p.w / 2, p.row), H + ridge);
    const re = lift(ra ? project(p.col + p.w, p.row + p.h / 2) : project(p.col + p.w / 2, p.row + p.h), H + ridge);
    // The gate: a tall arch through the front range at the front's middle
    // (the range stops short at the tower), on both its long faces.
    const gateHalf = across(2.4) / Math.max(p.w, p.h);
    const gateTop = Math.min(H * 0.55, STOREY * 1.6);
    const face = (o: Pt, a: Pt, span: number, dir: FaceDir, k: string) => {
      const long = ra ? dir === 'negRow' || dir === 'posRow' : dir === 'negCol' || dir === 'posCol';
      // The gate's middle on this face: the front's middle line, met on
      // this wall's own line.
      const gateU = uOnFace(o, a, isRowWall(dir) ? { col: gateMid.col, row: gridEdge(p.col, p.row, p.w, p.h, dir)[0][1] } : { col: gridEdge(p.col, p.row, p.w, p.h, dir)[0][0], row: gateMid.row });
      const doorHere = p.door && p.door.dir === dir ? doorOnFace(rangeDoor, o, a, span, H, dir, p.door.at, `${k}d`, paneShape === 'arched' ? 'arched' : 'rect') : null;
      const reserve = p.arch && long ? { u0: gateU - gateHalf * 1.6, u1: gateU + gateHalf * 1.6, v0: 0, v1: (gateTop + up(1)) / H } : doorHere?.reserve;
      return (
        <g key={k}>
          {parts.timbering && <Timbering origin={o} along={a} wallHeight={H} span={span} from={STOREY} to={H} floors={courses} />}
          {trim && floorCourses(o, a, H, courses, k)}
          {trim && <WallBand origin={o} along={a} wallHeight={H} from={0} to={BASE_COURSE} className="iso-plinth" />}
          {trim && <WallBand origin={o} along={a} wallHeight={H} from={H - EAVES_COURSE} to={H} className="iso-cornice" />}
          {windows(o, a, H, span, sills, across(1.6), `${k}w`, paneShape, stone.glass, reserve, lights)}
          {doorHere?.node}
          {p.arch && long && (
            <>
              <polygon className="iso-cornice" points={polyPoints(windowOutline('arched', gateU - gateHalf * 1.25, gateU + gateHalf * 1.25, 0, (gateTop + up(0.9)) / H).map(([u, v]) => facePoint(o, a, H, u, v)))} />
              <polygon className="iso-undercroft" points={polyPoints(windowOutline(paneShape === 'lancet' ? 'lancet' : 'arched', gateU - gateHalf, gateU + gateHalf, 0, gateTop / H).map(([u, v]) => facePoint(o, a, H, u, v)))} />
            </>
          )}
          {eavesOf(vernacular) > 0 && ridge > 0 && <WallBand origin={o} along={a} wallHeight={H} from={H - up(0.9)} to={H} className="iso-eaves-shadow" />}
        </g>
      );
    };
    return (
      <g key={key}>
        <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
        {face(f.D, f.C, f.spanLeft, f.dir.CD, `${key}l`)}
        {face(f.C, f.B, f.spanRight, f.dir.BC, `${key}r`)}
        {ridge > 0 && mansard ? (
          <MansardRoof col={p.col} row={p.row} w={p.w} h={p.h} base={H} rise={ridge} pal={pal} stone={stone} />
        ) : ridge > 0 ? (
          <>
            {gableSlopes(f, ra, rs, re, pal)}
            {gableEnds(f, ra, rs, re, pal)}
            <line className="iso-ridge" x1={rs.x} y1={rs.y} x2={re.x} y2={re.y} />
            {parts.chimneys && [0.25, 0.75].map((u, i) => {
              const cc = ra ? p.col + p.w * u : p.col + p.w / 2;
              const cr = ra ? p.row + p.h / 2 : p.row + p.h * u;
              const plan = across(1.3);
              return <Chimney key={`ch${i}`} cc={cc} cr={cr} base={H + ridge * (1 - plan / Math.min(p.w, p.h))} top={H + ridge + up(2.0)} pal={pal} stone={stone} />;
            })}
          </>
        ) : (
          <>
            <polygon points={polyPoints(f.top)} fill={pal.roof} />
            {fronts.map((dir) => <CrestCoping key={dir} col={p.col} row={p.row} w={p.w} h={p.h} base={H} outward={dir} fill={trim ? stone.trim : shade(pal.wall.posRow, 1.1)} />)}
          </>
        )}
      </g>
    );
  };

  const towerNode = (p: DepthBox, key: string) => {
    // How far the shaft rises past the ranges before its crown.
    const crowned = apex === 'cupola' || apex === 'dome' || apex === 'belvedere' || apex === 'pavilionTower' || apex === 'ziggurat';
    const gothic = apex === 'spire' || apex === 'gatehouse';
    const TH = H + ridge + (gothic ? STOREY * 5.6 : apex === 'campanile' ? STOREY * 3.4 : apex === 'core' ? STOREY * 3.6 : STOREY * 3.2);
    const f = boxFaces(p.col, p.row, p.w, p.h, 0, TH);
    const ranks = Math.max(1, Math.floor((TH - STOREY * 0.5) / STOREY));
    const tsills = rankSills(ranks);
    const towerShape: WindowShape = gothic ? 'lancet' : paneShape === 'ribbon' ? 'rect' : paneShape;
    const face = (o: Pt, a: Pt, span: number, k: string) => (
      <g key={k}>
        {parts.timbering && <Timbering origin={o} along={a} wallHeight={TH} span={span} from={STOREY} to={H} floors={courses} />}
        {apex === 'core'
          ? <CurtainWall origin={o} along={a} wallHeight={TH} spanTiles={span} from={BASE_COURSE} to={TH - EAVES_COURSE * 2} floors={[]} id={k} u0={0.42} u1={0.58} />
          : windows(o, a, TH, span, tsills.filter((v) => v < TH - STOREY * (gothic ? 2.2 : 1)), across(1.4), k, towerShape, stone.glass)}
        {trim && <WallBand origin={o} along={a} wallHeight={TH} from={0} to={BASE_COURSE} className="iso-plinth" />}
        {trim && <WallBand origin={o} along={a} wallHeight={TH} from={H - EAVES_COURSE} to={H} className="iso-course" />}
        {trim && <WallBand origin={o} along={a} wallHeight={TH} from={TH - CORNICE} to={TH} className="iso-cornice" />}
        {/* Collegiate Gothic's belfry stage: a pair of tall traceried lancets a face. */}
        {gothic && [[0.18, 0.46], [0.54, 0.82]].map(([u0, u1]) => (
          <polygon key={`bl${u0}`} className="iso-undercroft"
            points={polyPoints(windowOutline('lancet', u0, u1, (TH - STOREY * 2.0) / TH, (TH - CORNICE * 1.4) / TH).map(([u, v]) => facePoint(o, a, TH, u, v)))} />
        ))}
        {apex === 'campanile' && [[0.14, 0.46], [0.54, 0.86]].map(([u0, u1]) => (
          <polygon key={`bf${u0}`} className="iso-undercroft"
            points={polyPoints(windowOutline('arched', u0, u1, (TH - STOREY * 1.25) / TH, (TH - CORNICE * 1.2) / TH).map(([u, v]) => facePoint(o, a, TH, u, v)))} />
        ))}
      </g>
    );
    // Gothic: a crenellated parapet between four pinnacled corner turrets.
    const turrets = () => {
      const tp = p.w * 0.2; const rise = up(4.5);
      const boxes = depthOrder([
        { col: p.col, row: p.row, w: tp, h: tp }, { col: p.col + p.w - tp, row: p.row, w: tp, h: tp },
        { col: p.col, row: p.row + p.h - tp, w: tp, h: tp }, { col: p.col + p.w - tp, row: p.row + p.h - tp, w: tp, h: tp },
      ]);
      const turret = (b: DepthBox, i: number) => {
        const tf = boxFaces(b.col, b.row, b.w, b.h, TH, rise);
        return (
          <g key={`tu${i}`}>
            <polygon points={polyPoints(tf.left)} fill={pal.wallLeft} />
            <polygon points={polyPoints(tf.right)} fill={pal.wallRight} />
            {trim && <WallBand origin={tf.D} along={tf.C} wallHeight={rise} from={rise - CORNICE * 0.8} to={rise} className="iso-cornice" />}
            {trim && <WallBand origin={tf.C} along={tf.B} wallHeight={rise} from={rise - CORNICE * 0.8} to={rise} className="iso-cornice" />}
            {pyramid(b.col, b.row, b.w, TH + rise, up(5.5), pal.roof).faces}
          </g>
        );
      };
      return (
        <>
          {turret(boxes[0], 0)}
          {fronts.map((dir) => <Merlons key={dir} col={p.col} row={p.row} w={p.w} h={p.h} base={TH} outward={dir} pal={pal} block={across(1.4)} gap={across(1.0)} rise={up(1.5)} />)}
          {boxes.slice(1).map((b, i) => turret(b, i + 1))}
        </>
      );
    };
    return (
      <g key={key}>
        <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
        {face(f.D, f.C, f.spanLeft, `${key}l`)}
        {face(f.C, f.B, f.spanRight, `${key}r`)}
        <polygon points={polyPoints(f.top)} fill={pal.roofDeck} />
        {gothic && turrets()}
        {apex === 'campanile' && pyramid(p.col - across(0.6), p.row - across(0.6), p.w + across(1.2), TH, up(4.2), pal.roof).faces}
        {apex === 'core' && fronts.map((dir) => <CrestCoping key={dir} col={p.col} row={p.row} w={p.w} h={p.h} base={TH} outward={dir} fill={trim ? stone.trim : shade(pal.wall.posRow, 1.1)} />)}
        {crowned && (apex === 'cupola' || apex === 'dome') && (
          <ClockTower stone={stone} apex="cupola" gilded={hasGilt(vernacular)} col={p.col} row={p.row} w={p.w} h={p.h} base={TH} />
        )}
        {apex === 'belvedere' && <Belvedere stone={stone} pal={pal} col={p.col} row={p.row} w={p.w} h={p.h} base={TH} />}
        {apex === 'pavilionTower' && <PavilionTower stone={stone} pal={pal} col={p.col} row={p.row} w={p.w} h={p.h} base={TH} />}
        {apex === 'ziggurat' && <Ziggurat stone={stone} col={p.col} row={p.row} w={p.w} h={p.h} base={TH} />}
      </g>
    );
  };

  return (
    <>
      {/* The quad: lawn, a cross of walks meeting at a round bed, and the
          way in from the gate. */}
      <polygon className="ground-lawn" points={polyPoints(boxFaces(court.col, court.row, court.w, court.h, 0, 0).top)} />
      {[0.3, 0.7].map((v) => flat(at(dl, v - 0.03, 1 - dl, v + 0.03), 'ground-mow', `mw${v}`))}
      {flat(alongW ? { col: tb.col - walk, row: court.row, w: walk * 2, h: court.h } : { col: court.col, row: tb.row - walk, w: court.w, h: walk * 2 }, 'ground-walk-fill', 'wl')}
      {flat(alongW ? { col: court.col, row: tb.row - walk, w: court.w, h: walk * 2 } : { col: tb.col - walk, row: court.row, w: walk * 2, h: court.h }, 'ground-walk-fill', 'ws')}
      <polygon className="ground-walk-fill" points={polyPoints(projectedCircle(tb.col, tb.row, across(6.5), 28))} />
      <polygon className="ground-lawn" points={polyPoints(projectedCircle(tb.col, tb.row, across(4.4), 28))} />
      {items.filter((it) => it.kind !== 'tree').map((it, i) => plotShadow(it, it.kind === 'tower' ? H * 2 : H, plot, `sh${i}`))}
      <polygon className="campus-tree-shadow" points={polyPoints(treeShadow(tb.col, tb.row, 'canopy', 0.8))} />
      {depthOrder(items).map((it, i) => (it.kind === 'range' ? rangeNode(it, `rg${i}`)
        : it.kind === 'tower' ? towerNode(it, `tw${i}`)
          : <TreeAt key={`t${i}`} col={it.col + 0.5} row={it.row + 0.5} species="canopy" scale={0.8} shadow={false} />))}
    </>
  );
}

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

// --- Bonus vernaculars' parts (prototype) --------------------------------
// The applied surfaces and tower tops the seven bonus sets name
// (buildingSpec.ts's BONUS_VERNACULAR_CHOICES). Same conventions as above:
// faces by grid direction, back to front, heights through `up`.

const OAK = '#3b2e27';
const LIMEWASH = '#ece3cc';
const IRON = '#2d3034';
const LEAD = '#6f7479';

// Close-studded timbering (Tudor): a limewashed band from the first floor to
// the eaves, oak studs at a studding interval, a rail at every floor and a
// sill beam. Windows paint over it.
function Timbering({ origin, along, wallHeight, span, from, to, floors }: {
  origin: Pt; along: Pt; wallHeight: number; span: number; from: number; to: number; floors: number[];
}) {
  if (to <= from) return null;
  const q = (u0: number, u1: number, z0: number, z1: number) => polyPoints([
    facePoint(origin, along, wallHeight, u0, z0 / wallHeight), facePoint(origin, along, wallHeight, u1, z0 / wallHeight),
    facePoint(origin, along, wallHeight, u1, z1 / wallHeight), facePoint(origin, along, wallHeight, u0, z1 / wallHeight),
  ]);
  const spanM = span * METRES_PER_TILE;
  const n = Math.max(4, Math.round(spanM / 1.4));
  const stud = 0.32 / spanM;
  const beam = up(0.35);
  const rails = [from, ...floors.filter((z) => z > from + beam && z < to - beam), to - beam];
  return (
    <>
      <polygon points={q(0, 1, from, to)} fill={LIMEWASH} />
      {Array.from({ length: n + 1 }, (_, i) => {
        const u = Math.min(1 - stud, Math.max(0, i / n - stud / 2));
        return <polygon key={`s${i}`} points={q(u, u + stud, from, to)} fill={OAK} />;
      })}
      {rails.map((z, i) => <polygon key={`r${i}`} points={q(0, 1, z, z + beam)} fill={OAK} />)}
    </>
  );
}

// Paired brackets under deep eaves (Italianate), one pair at every bay line.
function EavesBrackets({ origin, along, wallHeight, span, top, stone }: {
  origin: Pt; along: Pt; wallHeight: number; span: number; top: number; stone: StonePalette;
}) {
  const spanM = span * METRES_PER_TILE;
  const bays = Math.max(2, Math.round(spanM / BAY_METRES));
  const bw = 0.5 / spanM; const gap = 0.4 / spanM;
  const z0 = (top - up(2.6)) / wallHeight; const z1 = top / wallHeight;
  const fill = shade(stone.trim, 0.7);
  const out: React.ReactNode[] = [];
  for (let i = 0; i <= bays; i++) {
    const u = i / bays;
    for (const du of [-gap / 2 - bw, gap / 2]) {
      const u0 = Math.min(1 - bw, Math.max(0, u + du));
      out.push(
        <polygon key={`${i}${du}`} fill={fill} points={polyPoints([
          facePoint(origin, along, wallHeight, u0, z1), facePoint(origin, along, wallHeight, u0 + bw, z1),
          facePoint(origin, along, wallHeight, u0 + bw, z0 + (z1 - z0) * 0.45), facePoint(origin, along, wallHeight, u0, z0),
        ])} />,
      );
    }
  }
  return <>{out}</>;
}

// A clock face on a wall, centered at (0.5, cv) in the wall's (u, v).
function WallClock({ origin, along, height, span, cv, r }: {
  origin: Pt; along: Pt; height: number; span: number; cv: number; r: number;
}) {
  const ru = r / span; const rv = (r * METRES_PER_TILE * up(1)) / height;
  const pts: Pt[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    pts.push(facePoint(origin, along, height, 0.5 + Math.cos(a) * ru, cv + Math.sin(a) * rv));
  }
  const c = facePoint(origin, along, height, 0.5, cv);
  const big = facePoint(origin, along, height, 0.5 + ru * 0.1, cv + rv * 0.62);
  const small = facePoint(origin, along, height, 0.5 + ru * 0.5, cv - rv * 0.18);
  return (
    <>
      <polygon className="iso-clock-face" points={polyPoints(pts)} />
      <line className="iso-clock-hand" x1={c.x} y1={c.y} x2={big.x} y2={big.y} />
      <line className="iso-clock-hand" x1={c.x} y1={c.y} x2={small.x} y2={small.y} />
    </>
  );
}

// A truncated hip: four slopes from the box (col, row, w, h) at `base` up to
// the same box inset by `inset`, `rise` higher. Back slopes first; returns
// the top ring too, for a deck, cresting or what stands on it.
function frustum(col: number, row: number, w: number, h: number, base: number, rise: number, inset: number, pal: Palette) {
  const b = (c: number, r: number) => lift(project(c, r), base);
  const t = (c: number, r: number) => lift(project(c, r), base + rise);
  const NW = b(col, row), NE = b(col + w, row), SE = b(col + w, row + h), SW = b(col, row + h);
  const i = inset;
  const nw = t(col + i, row + i), ne = t(col + w - i, row + i), se = t(col + w - i, row + h - i), sw = t(col + i, row + h - i);
  const slopes: Array<[FaceDir, Pt[]]> = [
    ['negRow', [NW, NE, ne, nw]], ['negCol', [NW, SW, sw, nw]],
    ['posRow', [SW, SE, se, sw]], ['posCol', [NE, SE, se, ne]],
  ];
  return {
    top: [nw, ne, se, sw],
    faces: backSlopesFirst(slopes, (s) => s[0]).map(([dir, pts]) => (
      <polygon key={dir} points={polyPoints(pts)} fill={pal[dir]} />
    )),
  };
}

// Iron cresting along the two near edges of a flat top.
function Cresting({ col, row, w, h, z }: { col: number; row: number; w: number; h: number; z: number }) {
  const f = boxFaces(col, row, w, h, z, up(0.9));
  return (
    <>
      {[[f.D, f.C, f.spanLeft] as const, [f.C, f.B, f.spanRight] as const].map(([o, a, span], k) => {
        const n = Math.max(3, Math.round(span * METRES_PER_TILE / 0.8));
        const top = facePoint(o, a, up(0.9), 0, 1); const topEnd = facePoint(o, a, up(0.9), 1, 1);
        return (
          <g key={k} stroke={IRON} strokeWidth={0.7}>
            <line x1={top.x} y1={top.y} x2={topEnd.x} y2={topEnd.y} />
            {Array.from({ length: n + 1 }, (_, i) => {
              const p0 = facePoint(o, a, up(0.9), i / n, 0); const p1 = facePoint(o, a, up(0.9), i / n, 1.35);
              return <line key={i} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} />;
            })}
          </g>
        );
      })}
    </>
  );
}

// Upright dormers on the near slopes of a mansard: a window face set back
// a little from the eaves, framed in trim, under a segmental head.
function MansardDormers({ col, row, w, h, base, rise, inset, stone }: {
  col: number; row: number; w: number; h: number; base: number; rise: number; inset: number; stone: StonePalette;
}) {
  const s = inset * 0.22;
  const z0 = base + rise * 0.22; const dh = rise * 0.58;
  const f = boxFaces(col + s, row + s, w - 2 * s, h - 2 * s, z0, dh);
  return (
    <>
      {[[f.D, f.C, f.spanLeft] as const, [f.C, f.B, f.spanRight] as const].map(([o, a, span], k) => {
        const n = Math.max(2, Math.round((span * METRES_PER_TILE) / (BAY_METRES * 1.4)));
        const fw = 1.9 / (span * METRES_PER_TILE);
        return (
          <g key={k}>
            {Array.from({ length: n }, (_, i) => {
              const uc = (i + 0.5) / n;
              const frame = windowOutline('arched', uc - fw / 2, uc + fw / 2, 0, 1).map(([u, v]) => facePoint(o, a, dh, u, v));
              const pane = windowOutline('arched', uc - fw * 0.3, uc + fw * 0.3, 0.14, 0.86).map(([u, v]) => facePoint(o, a, dh, u, v));
              return (
                <g key={i}>
                  <polygon points={polyPoints(frame)} fill={shade(stone.trim, 0.9)} />
                  <polygon points={polyPoints(pane)} fill={shade(stone.glass.startsWith('rgba') ? '#4a5560' : stone.glass, 1)} fillOpacity={0.85} />
                </g>
              );
            })}
          </g>
        );
      })}
    </>
  );
}

// A mansard (Second Empire): a steep slate lower slope, dormers in it, a
// low lead deck above and iron cresting round the deck.
function MansardRoof({ col, row, w, h, base, rise, pal, stone }: {
  col: number; row: number; w: number; h: number; base: number; rise: number; pal: Palette; stone: StonePalette;
}) {
  const inset = Math.min(across(2.2), Math.min(w, h) * 0.16);
  const m = frustum(col, row, w, h, base, rise, inset, pal);
  const ic = col + inset; const ir = row + inset; const iw = w - 2 * inset; const ih = h - 2 * inset;
  return (
    <>
      {m.faces}
      <MansardDormers col={col} row={row} w={w} h={h} base={base} rise={rise} inset={inset} stone={stone} />
      <HippedRoof col={ic} row={ir} w={iw} h={ih} base={base + rise} rise={up(1.2)} pal={paletteFrom({ wall: pal.wall.posRow, roof: LEAD })} />
      <Cresting col={ic} row={ir} w={iw} h={ih} z={base + rise} />
    </>
  );
}

// The tower's own box in its stone, with a cornice.
function TowerShaft({ f, rise, stone, tone = stone.towerStone, cornice = true }: {
  f: BoxFaces; rise: number; stone: StonePalette; tone?: string; cornice?: boolean;
}) {
  return (
    <>
      {sideFaces(f, shade(tone, 0.98), shade(tone, 0.8))}
      {cornice && stone.trim !== 'none' && (
        <>
          <WallBand origin={f.D} along={f.C} wallHeight={rise} from={rise - CORNICE} to={rise} className="iso-cornice" />
          <WallBand origin={f.C} along={f.B} wallHeight={rise} from={rise - CORNICE} to={rise} className="iso-cornice" />
        </>
      )}
      <polygon points={polyPoints(f.top)} fill={shade(tone, 0.9)} />
    </>
  );
}

// Openings in a stage's two near faces: `n` arches (or lancets) a face.
function StageOpenings({ f, rise, n, shape, v0 = 0.12, v1 = 0.88, cls = 'iso-undercroft' }: {
  f: BoxFaces; rise: number; n: number; shape: WindowShape; v0?: number; v1?: number; cls?: string;
}) {
  return (
    <>
      {([[f.D, f.C, 'l'] as const, [f.C, f.B, 'r'] as const]).map(([o, a, k]) => (
        Array.from({ length: n }, (_, i) => {
          const pad = 0.12; const cell = (1 - pad * 2) / n;
          const u0 = pad + i * cell + cell * 0.14; const u1 = pad + (i + 1) * cell - cell * 0.14;
          return (
            <polygon key={`${k}${i}`} className={cls}
              points={polyPoints(windowOutline(shape, u0, u1, v0, v1).map(([u, v]) => facePoint(o, a, rise, u, v)))} />
          );
        })
      ))}
    </>
  );
}

function GiltFinial({ at, rise, stone }: { at: Pt; rise: number; stone: StonePalette }) {
  if (stone.gilt === 'none') return null;
  const tip = lift(at, rise);
  return (
    <>
      <line className="iso-finial" x1={at.x} y1={at.y} x2={tip.x} y2={tip.y} stroke={stone.gilt} />
      <circle className="iso-dome" cx={tip.x} cy={tip.y} r={2} fill={stone.gilt} />
    </>
  );
}

// Tudor: a brick gatehouse between four turrets that clasp its corners and
// rise past its battlements under lead caps; on the hall's front an oriel
// and the clock, on its back an oriel, on its ends a slit (Plan 88: the
// building's own sides, `facing`).
function Gatehouse({ col, row, w, h, base, stone, facing }: {
  col: number; row: number; w: number; h: number; base: number; stone: StonePalette;
  facing?: ownFrame.Plot['facing'];
}) {
  const plan = Math.min(across(10), Math.min(w, h) * 0.36);
  const tp = plan * 0.26;
  const cc = col + w / 2; const cr = row + h / 2;
  const x0 = cc - plan / 2; const y0 = cr - plan / 2;
  const rise = TOWER_BASE_RISE + up(3);
  const shaft = boxFaces(x0, y0, plan, plan, base, rise);
  const tpal = paletteFrom({ wall: stone.towerStone, roof: LEAD });
  const turretRise = rise + up(4.5);
  type Item = DepthBox & { key: string; node: React.ReactNode };
  const turret = (c: number, r: number, key: string): Item => {
    const f = boxFaces(c, r, tp, tp, base, turretRise);
    const cap = pyramid(c, r, tp, base + turretRise, up(3.2), LEAD);
    return {
      col: c, row: r, w: tp, h: tp, key,
      node: (
        <g key={key}>
          {sideFaces(f, shade(stone.towerStone, 0.95), shade(stone.towerStone, 0.78))}
          <WallBand origin={f.D} along={f.C} wallHeight={turretRise} from={turretRise - CORNICE} to={turretRise} className="iso-cornice" />
          <WallBand origin={f.C} along={f.B} wallHeight={turretRise} from={turretRise - CORNICE} to={turretRise} className="iso-cornice" />
          {cap.faces}
          <GiltFinial at={cap.tip} rise={up(1.6)} stone={stone} />
        </g>
      ),
    };
  };
  const oriel = ([[shaft.D, shaft.C, 'l', shaft.dir.CD] as const, [shaft.C, shaft.B, 'r', shaft.dir.BC] as const]).map(([o, a, k, dir]) => {
    const side = ownFrame.sideOf(facing, dir);
    if (side === 'left' || side === 'right') {
      return (
        <polygon key={k} className="iso-undercroft"
          points={polyPoints(windowOutline('lancet', 0.45, 0.55, 0.3, 0.62).map(([u, v]) => facePoint(o, a, rise, u, v)))} />
      );
    }
    const frame = windowOutline('rect', 0.3, 0.7, 0.2, 0.5).map(([u, v]) => facePoint(o, a, rise, u, v));
    const mull = [0.4, 0.5, 0.6].map((u) => [facePoint(o, a, rise, u, 0.2), facePoint(o, a, rise, u, 0.5)]);
    const transom = [facePoint(o, a, rise, 0.3, 0.36), facePoint(o, a, rise, 0.7, 0.36)];
    return (
      <g key={k}>
        <polygon points={polyPoints(frame)} fill={stone.glass} stroke={stone.trim} strokeWidth={1.2} />
        {[...mull, transom].map(([p, q], i) => <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={stone.trim} strokeWidth={0.9} />)}
        {side === 'front' && <WallClock origin={o} along={a} height={rise} span={plan} cv={0.72} r={CLOCK_RADIUS_TILES} />}
      </g>
    );
  });
  const body: Item = {
    col: x0, row: y0, w: plan, h: plan, key: 'body',
    node: (
      <g key="body">
        <TowerShaft f={shaft} rise={rise} stone={stone} />
        {oriel}
        {[visibleWalls().left, visibleWalls().right].map((dir) => (
          <Merlons key={dir} col={x0} row={y0} w={plan} h={plan} base={base + rise} outward={dir} pal={tpal} block={across(1.0)} gap={across(0.8)} rise={up(1.1)} depth={across(0.45)} />
        ))}
      </g>
    ),
  };
  const items: Item[] = [
    body,
    turret(x0 - tp * 0.5, y0 - tp * 0.5, 'nw'), turret(x0 + plan - tp * 0.5, y0 - tp * 0.5, 'ne'),
    turret(x0 + plan - tp * 0.5, y0 + plan - tp * 0.5, 'se'), turret(x0 - tp * 0.5, y0 + plan - tp * 0.5, 'sw'),
  ];
  // The turrets overlap the body's corners, so order by the far edge: each
  // turret either lies wholly behind the body's near faces or in front.
  const seen = visibleWalls();
  const nearOf = (it: Item) => {
    const c = seen.right === 'posCol' || seen.left === 'posCol' ? it.col + it.w : -it.col;
    const r = seen.right === 'posRow' || seen.left === 'posRow' ? it.row + it.h : -it.row;
    return c + r;
  };
  return <>{[...items].sort((a, b) => nearOf(a) - nearOf(b)).map((it) => it.node)}</>;
}

// Italianate: a square belvedere, arched on every face, under a low hip on
// deep bracketed eaves.
function Belvedere({ col, row, w, h, base, stone, pal }: {
  col: number; row: number; w: number; h: number; base: number; stone: StonePalette; pal: Palette;
}) {
  const plan = Math.min(across(9), Math.min(w, h) * 0.34);
  const cc = col + w / 2; const cr = row + h / 2;
  const x0 = cc - plan / 2; const y0 = cr - plan / 2;
  const shaftRise = up(9);
  const shaft = boxFaces(x0, y0, plan, plan, base, shaftRise);
  const stageBase = base + shaftRise;
  const stageRise = up(5.2);
  const stage = boxFaces(x0, y0, plan, plan, stageBase, stageRise);
  const top = stageBase + stageRise;
  const e = across(1.3);
  const cap = pyramid(x0 - e, y0 - e, plan + 2 * e, top, up(2.4), pal.roof);
  return (
    <>
      <TowerShaft f={shaft} rise={shaftRise} stone={stone} />
      {[[shaft.D, shaft.C] as const, [shaft.C, shaft.B] as const].map(([o, a], i) => (
        <WallClock key={i} origin={o} along={a} height={shaftRise} span={plan} cv={0.55} r={CLOCK_RADIUS_TILES * 0.9} />
      ))}
      <TowerShaft f={stage} rise={stageRise} stone={stone} cornice={false} />
      <StageOpenings f={stage} rise={stageRise} n={3} shape="arched" v0={0.14} v1={0.8} />
      {[[stage.D, stage.C, stage.spanLeft] as const, [stage.C, stage.B, stage.spanRight] as const].map(([o, a, span], i) => (
        <EavesBrackets key={i} origin={o} along={a} wallHeight={stageRise} span={span} top={stageRise} stone={stone} />
      ))}
      {cap.faces}
      <GiltFinial at={cap.tip} rise={up(2.2)} stone={stone} />
    </>
  );
}

// Second Empire: a clock pavilion carried up past the roof under its own
// tall mansard, with a round dormer in each face and cresting on top.
function PavilionTower({ col, row, w, h, base, stone, pal }: {
  col: number; row: number; w: number; h: number; base: number; stone: StonePalette; pal: Palette;
}) {
  const plan = Math.min(across(9.5), Math.min(w, h) * 0.34);
  const cc = col + w / 2; const cr = row + h / 2;
  const x0 = cc - plan / 2; const y0 = cr - plan / 2;
  const rise = TOWER_BASE_RISE;
  const shaft = boxFaces(x0, y0, plan, plan, base, rise);
  const mRise = up(8.5);
  const inset = plan * 0.16;
  const m = frustum(x0, y0, plan, plan, base + rise, mRise, inset, pal);
  const ix = x0 + inset; const iy = y0 + inset; const ip = plan - 2 * inset;
  const deck = base + rise + mRise;
  // Oeil-de-boeuf: a round dormer on each near slope's face, stood upright.
  const ob = boxFaces(x0 + inset * 0.3, y0 + inset * 0.3, plan - inset * 0.6, plan - inset * 0.6, base + rise + mRise * 0.28, mRise * 0.36);
  const ring = (o: Pt, a: Pt, rr: number) => {
    const pts: Pt[] = [];
    for (let i = 0; i < 20; i++) {
      const t = (i / 20) * Math.PI * 2;
      pts.push(facePoint(o, a, mRise * 0.36, 0.5 + Math.cos(t) * rr, 0.5 + Math.sin(t) * rr * 2.1));
    }
    return pts;
  };
  return (
    <>
      <TowerShaft f={shaft} rise={rise} stone={stone} />
      {[[shaft.D, shaft.C] as const, [shaft.C, shaft.B] as const].map(([o, a], i) => (
        <WallClock key={i} origin={o} along={a} height={rise} span={plan} cv={0.62} r={CLOCK_RADIUS_TILES} />
      ))}
      {m.faces}
      {[[ob.D, ob.C] as const, [ob.C, ob.B] as const].map(([o, a], i) => (
        <g key={i}>
          <polygon points={polyPoints(ring(o, a, 0.2))} fill={shade(stone.trim, 0.9)} />
          <polygon points={polyPoints(ring(o, a, 0.13))} fill="#3f4a52" />
        </g>
      ))}
      <polygon points={polyPoints(boxFaces(ix, iy, ip, ip, deck, 0).top)} fill={shade(LEAD, 1.06)} />
      <Cresting col={ix} row={iy} w={ip} h={ip} z={deck} />
      <GiltFinial at={lift(project(cc, cr), deck)} rise={up(4.5)} stone={stone} />
    </>
  );
}

// Art Deco: four setbacks, each fluted by shallow piers and banded at its
// head, to a gilt mast.
function Ziggurat({ col, row, w, h, base, stone }: {
  col: number; row: number; w: number; h: number; base: number; stone: StonePalette;
}) {
  const plan = Math.min(across(11), Math.min(w, h) * 0.4);
  const cc = col + w / 2; const cr = row + h / 2;
  const tiers = [[1, up(11)], [0.78, up(5)], [0.58, up(4)], [0.38, up(3.2)]] as const;
  let z = base;
  const nodes: React.ReactNode[] = [];
  tiers.forEach(([k, rise], i) => {
    const p = plan * k;
    const f = boxFaces(cc - p / 2, cr - p / 2, p, p, z, rise);
    const flutes = ([[f.D, f.C, 'l'] as const, [f.C, f.B, 'r'] as const]).map(([o, a, s]) => {
      const n = i === 0 ? 7 : 5;
      return Array.from({ length: n - 1 }, (_, j) => {
        const u = (j + 1) / n;
        const p0 = facePoint(o, a, rise, u, i === 0 ? 0.08 : 0); const p1 = facePoint(o, a, rise, u, 0.9);
        return <line key={`${s}${j}`} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={shade(stone.towerStone, 0.72)} strokeWidth={1.1} />;
      });
    });
    nodes.push(
      <g key={i}>
        {sideFaces(f, shade(stone.towerStone, 0.99), shade(stone.towerStone, 0.8))}
        {flutes}
        <WallBand origin={f.D} along={f.C} wallHeight={rise} from={rise * 0.9} to={rise} className="iso-cornice" fill={stone.gilt} />
        <WallBand origin={f.C} along={f.B} wallHeight={rise} from={rise * 0.9} to={rise} className="iso-cornice" fill={shade(stone.gilt, 0.8)} />
        <polygon points={polyPoints(f.top)} fill={shade(stone.towerStone, 0.9)} />
        {i === 0 && [[f.D, f.C] as const, [f.C, f.B] as const].map(([o, a], j) => (
          <WallClock key={`c${j}`} origin={o} along={a} height={rise} span={p} cv={0.7} r={CLOCK_RADIUS_TILES} />
        ))}
      </g>,
    );
    z += rise;
  });
  return (
    <>
      {nodes}
      <GiltFinial at={lift(project(cc, cr), z)} rise={up(9)} stone={stone} />
    </>
  );
}

// --- Georgian Founders Hall (Plan 87M) -----------------------------------
// Every other Georgian academic hall (buildingSpec's georgianHall) is drawn
// the same without the clock tower, so the halls read as its siblings.
// After the owner's reference picture, on the hall's own height and four
// storeys: red brick under a blue-grey slate hip with a row of pedimented
// dormers and a brick stack at each end of the ridge; a white cornice;
// white-framed sashes with dark glass; an entrance on every side (Plan 88:
// the building's own, components/facing.ts): on its front the grand white
// temple portico (four full-height round columns on a podium, a pediment
// with an oculus, a wide flight of steps), a narrower one on each end, and
// on the back a plain pedimented doorcase up a short flight; and on the
// ridge, over the front portico, a clock tower: a brick stage, a white clock
// stage, an open arched lantern, a verdigris dome and a gilt finial
// (Harvard's University Hall, Dartmouth's Baker, the eighteenth-century
// college hall). ridgeOf gives it its steeper hip.
const FH_SLATE = FOUNDERS_GEORGIAN_COLOURS.slate;
const FH_GLASS = FOUNDERS_GEORGIAN_COLOURS.glass;
const FH_VERDIGRIS = FOUNDERS_GEORGIAN_COLOURS.verdigris;
const FH_BRONZE = '#8a6a32';
const FH_LANTERN_DARK = '#262c31';
const FH_EAVES = across(0.45);         // the cornice's oversail
const FH_CORNICE = up(0.8);
const FH_BAY_METRES = 4.6;
const FH_WINDOW = across(1.7);
const FH_FRAME = across(0.22);         // the white frame round each sash
const FH_FRAME_UP = up(0.18);
const FH_LINTEL = up(0.4);
const FH_SILL = up(0.75);             // low, so the top rank clears the cornice
const FH_PANE = up(2.3);
const FH_PORTICO_SHARE = 0.3;          // of the front the portico spans
const FH_PORTICO_DEPTH = across(5.2);
const FH_END_PORTICO = 0.8;          // the end portico's width, of the front's
const FH_COLUMN_R = across(0.75);
const FH_ENTABLATURE = up(1.6);
const FH_PEDIMENT_PITCH = 0.25;        // rise over half-span: about 14 degrees
const FH_OCULUS_METRES = 1.05;
const FH_DORMER_W = across(3.0);
const FH_DORMER_D = across(2.4);
const FH_DORMER_FRONT = up(2.9);
const FH_DORMER_PEDIMENT = up(1.1);
const FH_DORMER_AT = 0.22;             // of the slope's run, eaves to ridge
const FH_DORMERS_LONG = [0.16, 0.29, 0.71, 0.84];
const FH_STACK = [across(2.6), across(1.6)] as const;   // along and across the ridge
const FH_STACK_RISE = up(3.6);
const FH_STACK_OUT = 0.35;             // of the hip's run, out past the ridge's end
const FH_TOWER = { brick: across(8.0), clock: across(7.0), lantern: across(6.2) };
const FH_TOWER_BRICK_RISE = up(4.2);
const FH_TOWER_CLOCK_RISE = up(5.4);
const FH_TOWER_LANTERN_RISE = up(5.8);
const FH_TOWER_LEDGE = up(0.7);
const FH_DOME_RISE = up(5.0);
const FH_FINIAL_RISE = up(4.0);

// A grid edge of box (c0, r0, w0, h0): the wall facing `dir`, end to end.
function gridEdge(c0: number, r0: number, w0: number, h0: number, dir: FaceDir): [[number, number], [number, number]] {
  switch (dir) {
    case 'posRow': return [[c0, r0 + h0], [c0 + w0, r0 + h0]];
    case 'negRow': return [[c0, r0], [c0 + w0, r0]];
    case 'posCol': return [[c0 + w0, r0], [c0 + w0, r0 + h0]];
    default: return [[c0, r0], [c0, r0 + h0]];
  }
}

// The two visible walls of a box standing on a roof, each wall's foot
// following the roof under it (`zAt`) up to a flat head at `top`, so a
// stack, a dormer or a tower stage meets the slopes it sits on.
function seatedFaces(c0: number, r0: number, w0: number, h0: number, top: number, zAt: (c: number, r: number) => number, tone: (dir: FaceDir) => string, key: string) {
  const seen = visibleWalls();
  const N = 8;
  return [seen.left, seen.right].map((dir) => {
    const [a, b] = gridEdge(c0, r0, w0, h0, dir);
    const foot = Array.from({ length: N + 1 }, (_, i) => {
      const c = a[0] + ((b[0] - a[0]) * i) / N; const r = a[1] + ((b[1] - a[1]) * i) / N;
      return lift(project(c, r), Math.min(zAt(c, r), top));
    });
    return <polygon key={`${key}${dir}`} points={polyPoints([...foot, lift(project(b[0], b[1]), top), lift(project(a[0], a[1]), top)])} fill={tone(dir)} />;
  });
}

// A slab in the trim (a cornice, a ledge, a cap): two lit faces and a top.
function trimSlab(c0: number, r0: number, w0: number, h0: number, base: number, rise: number, trim: string, key: string) {
  return plainBox(boxFaces(c0, r0, w0, h0, base, rise), shade(trim, 0.97), shade(trim, 0.8), shade(trim, 1.02), key);
}

// The sashes of one wall: an odd number of bays, so the middle one is the
// door's; each window a white frame, dark glass, glazing bars and a white
// lintel, every kind one <path> a wall.
function foundersWindows(origin: Pt, along: Pt, H: number, span: number, doorHeadAt: number | null, trim: string, key: string) {
  let bays = Math.max(3, Math.round((span * METRES_PER_TILE) / FH_BAY_METRES));
  if (bays % 2 === 0) bays -= 1;
  const at = (u: number, z: number) => facePoint(origin, along, H, u, z / H);
  const quad = (u0: number, u1: number, z0: number, z1: number) =>
    `M${at(u0, z0).x},${at(u0, z0).y}L${at(u1, z0).x},${at(u1, z0).y}L${at(u1, z1).x},${at(u1, z1).y}L${at(u0, z1).x},${at(u0, z1).y}Z`;
  const seg = (u0: number, z0: number, u1: number, z1: number) =>
    `M${at(u0, z0).x},${at(u0, z0).y}L${at(u1, z1).x},${at(u1, z1).y}`;
  const frames: string[] = []; const glass: string[] = []; const bars: string[] = []; const lintels: string[] = [];
  const hw = FH_WINDOW / span / 2; const fw = FH_FRAME / span;
  // One rank a storey, as every hall; the door, taller than a
  // storey, takes the middle bay of the first two.
  const sills = Array.from({ length: Math.round(H / STOREY) }, (_, i) => i * STOREY + FH_SILL);
  const doorHead = doorHeadAt ?? 0;
  for (let r = 0; r < sills.length; r++) {
    const z0 = sills[r]; const z1 = z0 + FH_PANE;
    if (z1 > H - FH_CORNICE) continue;
    for (let b = 0; b < bays; b++) {
      if (doorHeadAt !== null && b === (bays - 1) / 2 && z0 < doorHead + FH_LINTEL) continue;
      const c = (b + 0.5) / bays;
      frames.push(quad(c - hw - fw, c + hw + fw, z0 - FH_FRAME_UP, z1 + FH_FRAME_UP));
      lintels.push(quad(c - hw - fw * 1.8, c + hw + fw * 1.8, z1 + FH_FRAME_UP, z1 + FH_FRAME_UP + FH_LINTEL));
      glass.push(quad(c - hw, c + hw, z0, z1));
      // Six over six: a mullion and two glazing bars.
      bars.push(seg(c, z0, c, z1), seg(c - hw, z0 + (z1 - z0) / 3, c + hw, z0 + (z1 - z0) / 3), seg(c - hw, z0 + ((z1 - z0) * 2) / 3, c + hw, z0 + ((z1 - z0) * 2) / 3));
    }
  }
  return (
    <g key={key}>
      <path d={frames.join('')} fill={trim} />
      <path d={lintels.join('')} fill={shade(trim, 0.94)} />
      <path className="iso-window" d={glass.join('')} fill={FH_GLASS} />
      <path d={bars.join('')} stroke={shade(trim, 0.92)} strokeWidth={0.5} fill="none" />
    </g>
  );
}

// A dome in screen space over the ring (cc, cr, r) at `z`: the ring's near
// half, then a half-ellipse over it, with a lit crescent on the sun side.
function screenDome(cc: number, cr: number, r: number, z: number, rise: number, fill: string) {
  const ring = projectedCircle(cc, cr, r, 32).map((q) => lift(q, z));
  const near = nearRing(ring);
  const centre = lift(project(cc, cr), z);
  const rx = (Math.max(...ring.map((q) => q.x)) - Math.min(...ring.map((q) => q.x))) / 2;
  const hs = heightScale();
  const arc = (scale: number, dx: number) => Array.from({ length: 19 }, (_, i) => {
    const a = (i / 18) * Math.PI;
    return { x: centre.x + dx + Math.cos(a) * rx * scale, y: centre.y - Math.sin(a) * rise * hs * scale };
  });
  const sunSide = sunScreenDir().x <= 0 ? -1 : 1;
  return {
    top: lift(centre, rise),
    nodes: (
      <>
        <polygon points={polyPoints([...near, ...arc(1, 0)])} fill={shade(fill, 0.86)} stroke={shade(fill, 0.6)} strokeWidth={0.5} />
        <polygon points={polyPoints(arc(0.72, sunSide * rx * 0.14))} fill={shade(fill, 1.08)} />
      </>
    ),
  };
}

// The clock tower on the ridge, bottom up: the brick stage rising out of
// the slopes, a white ledge, the clock stage, the open lantern (dark
// within, a bell, an arch in each face, a column at each corner), its
// entablature, a drum, the verdigris dome and the gilt finial.
function FoundersTower({ cc, cr, zAt, ridgeTop, brick, stone }: {
  cc: number; cr: number; zAt: (c: number, r: number) => number; ridgeTop: number;
  brick: Record<FaceDir, string>; stone: StonePalette;
}) {
  const trim = stone.trim;
  const sq = (p: number) => ({ c: cc - p / 2, r: cr - p / 2, p });
  const out: React.JSX.Element[] = [];
  const b = sq(FH_TOWER.brick);
  let z = ridgeTop + FH_TOWER_BRICK_RISE;
  out.push(<g key="brick">{seatedFaces(b.c, b.r, b.p, b.p, z, zAt, (d) => brick[d], 'tb')}</g>);
  out.push(trimSlab(b.c - across(0.25), b.r - across(0.25), b.p + across(0.5), b.p + across(0.5), z - up(0.2), FH_TOWER_LEDGE, trim, 'tl1'));
  z += FH_TOWER_LEDGE - up(0.2);
  // The clock stage, a clock on each face the camera sees.
  const k = sq(FH_TOWER.clock);
  const kf = boxFaces(k.c, k.r, k.p, k.p, z, FH_TOWER_CLOCK_RISE);
  out.push(plainBox(kf, shade(stone.towerStone, 0.98), shade(stone.towerStone, 0.8), stone.towerStone, 'tk'));
  out.push(
    <g key="clocks">
      <WallClock origin={kf.D} along={kf.C} height={FH_TOWER_CLOCK_RISE} span={k.p} cv={0.5} r={across(2.1)} />
      <WallClock origin={kf.C} along={kf.B} height={FH_TOWER_CLOCK_RISE} span={k.p} cv={0.5} r={across(2.1)} />
    </g>,
  );
  z += FH_TOWER_CLOCK_RISE;
  out.push(trimSlab(k.c - across(0.25), k.r - across(0.25), k.p + across(0.5), k.p + across(0.5), z, FH_TOWER_LEDGE * 0.8, trim, 'tl2'));
  z += FH_TOWER_LEDGE * 0.8;
  // The lantern: the dark inside, a bell hung in it, then the arched front
  // of each visible face and the columns at its corners.
  const l = sq(FH_TOWER.lantern);
  const L = FH_TOWER_LANTERN_RISE;
  const lf = boxFaces(l.c, l.r, l.p, l.p, z, L);
  const core = sq(l.p * 0.86);
  out.push(plainBox(boxFaces(core.c, core.r, core.p, core.p, z, L), FH_LANTERN_DARK, shade(FH_LANTERN_DARK, 0.85), FH_LANTERN_DARK, 'tcore'));
  // A bell behind each visible opening (the middle is behind a column).
  const hs = heightScale();
  const bw = l.p * TILE_W * 0.1;
  const seenNow = visibleWalls();
  [seenNow.left, seenNow.right].forEach((d) => {
    const o = outwardOf(d);
    const bell = lift(project(cc + o.col * l.p * 0.2, cr + o.row * l.p * 0.2), z + L * 0.6);
    out.push(
      <polygon key={`bell${d}`} fill={FH_BRONZE} points={polyPoints([
        { x: bell.x - bw * 0.45, y: bell.y }, { x: bell.x + bw * 0.45, y: bell.y },
        { x: bell.x + bw * 0.6, y: bell.y + L * 0.22 * hs }, { x: bell.x + bw, y: bell.y + L * 0.3 * hs },
        { x: bell.x - bw, y: bell.y + L * 0.3 * hs }, { x: bell.x - bw * 0.6, y: bell.y + L * 0.22 * hs },
      ])} />,
    );
  });
  const pier = 0.16; const spring = 0.6;
  const arch = (o: Pt, a: Pt, key: string, fill: string) => {
    const at = (u: number, v: number) => facePoint(o, a, L, u, v);
    const rv = ((1 - 2 * pier) / 2) * (l.p / L) * up(METRES_PER_TILE) * 0.9;
    const crown = Array.from({ length: 11 }, (_, i) => {
      const t = Math.PI - (i / 10) * Math.PI;
      return at(0.5 + Math.cos(t) * (0.5 - pier), Math.min(0.9, spring + Math.sin(t) * rv));
    });
    return <polygon key={key} fill={fill} points={polyPoints([at(0, 0), at(pier, 0), ...crown, at(1 - pier, 0), at(1, 0), at(1, 1), at(0, 1)])} />;
  };
  out.push(arch(lf.D, lf.C, 'al', faceTone(lf.dir.CD, shade(trim, 0.97), shade(trim, 0.8))));
  out.push(arch(lf.C, lf.B, 'ar', faceTone(lf.dir.BC, shade(trim, 0.97), shade(trim, 0.8))));
  const cr0 = across(0.38);
  const corners = depthOrder([[l.c, l.r], [l.c + l.p, l.r], [l.c, l.r + l.p], [l.c + l.p, l.r + l.p]].map(([c, r]) => ({ col: c - cr0, row: r - cr0, w: cr0 * 2, h: cr0 * 2 })));
  // Only the three corners not hidden behind the lantern.
  corners.slice(1).forEach((q, i) => out.push(<Cylinder key={`col${i}`} cc={q.col + cr0} cr={q.row + cr0} r={cr0} z0={z} z1={z + L} fill={trim} />));
  z += L;
  out.push(trimSlab(l.c - across(0.35), l.r - across(0.35), l.p + across(0.7), l.p + across(0.7), z, FH_TOWER_LEDGE, trim, 'tl3'));
  z += FH_TOWER_LEDGE;
  // A low drum, the dome and the finial.
  const dr = l.p * 0.46;
  out.push(<Cylinder key="drum" cc={cc} cr={cr} r={dr} z0={z} z1={z + up(1.1)} fill={stone.towerStone} />);
  z += up(1.1);
  const dome = screenDome(cc, cr, dr, z, FH_DOME_RISE, FH_VERDIGRIS);
  out.push(<g key="dome">{dome.nodes}</g>);
  out.push(<GiltFinial key="fin" at={dome.top} rise={FH_FINIAL_RISE} stone={stone} />);
  return <>{out}</>;
}

// A pedimented dormer on the slope that faces `dir`: a white front with a
// dark sash, slate cheeks, a little gable roof and a white pediment.
function FoundersDormer({ b, dir, z0, zAt, roof, trim }: {
  b: DepthBox; dir: FaceDir; z0: number; zAt: (c: number, r: number) => number; roof: Palette; trim: string;
}) {
  const top = z0 + FH_DORMER_FRONT;
  const front = wallOf(boxFaces(b.col, b.row, b.w, b.h, z0, FH_DORMER_FRONT), dir);
  const at = (u: number, v: number) => facePoint(front.origin, front.along, FH_DORMER_FRONT, u, v);
  const mid = { x: (front.origin.x + front.along.x) / 2, y: (front.origin.y + front.along.y) / 2 };
  const apex = lift(mid, FH_DORMER_FRONT + FH_DORMER_PEDIMENT);
  const eL = lift(front.origin, FH_DORMER_FRONT); const eR = lift(front.along, FH_DORMER_FRONT);
  const out = outwardOf(dir);
  const o0 = project(0, 0); const o1 = project(-out.col * FH_DORMER_D, -out.row * FH_DORMER_D);
  const back = (q: Pt) => ({ x: q.x + o1.x - o0.x, y: q.y + o1.y - o0.y });
  // The cheeks are the two slopes' directions: across the front.
  const sideDirs: FaceDir[] = isRowWall(dir) ? ['negCol', 'posCol'] : ['negRow', 'posRow'];
  const slopes = backSlopesFirst<[FaceDir, Pt]>([[sideDirs[0], isRowWall(dir) ? (eL.x < eR.x ? eL : eR) : (eL.x < eR.x ? eL : eR)], [sideDirs[1], eL.x < eR.x ? eR : eL]], (s) => s[0]);
  return (
    <>
      {seatedFaces(b.col, b.row, b.w, b.h, top, zAt, (d) => (d === dir ? shade(trim, WALL_LIGHT[d] * 0.92) : roof[d]), 'dm')}
      <polygon className="iso-window" fill={FH_GLASS} points={polyPoints([at(0.24, 0.12), at(0.76, 0.12), at(0.76, 0.86), at(0.24, 0.86)])} />
      {slopes.map(([d, e]) => <polygon key={d} points={polyPoints([e, apex, back(apex), back(e)])} fill={roof[d]} />)}
      <polygon points={polyPoints([eL, eR, apex])} fill={shade(trim, WALL_LIGHT[dir] * 0.96)} stroke={shade(trim, 0.7)} strokeWidth={0.4} />
    </>
  );
}

function GeorgianFoundersHall({ col, row, w, h, facing, H, ridge, courses, pal, roof, stone, door, wallTone, tower: withTower }: {
  col: number; row: number; w: number; h: number; facing?: ownFrame.Plot['facing']; H: number; ridge: number; courses: number[];
  pal: Palette; roof: Palette; stone: StonePalette; door: DoorDimensions | null; wallTone: string;
  tower: boolean;
}) {
  const trim = stone.trim;
  const seen = visibleWalls();
  const inView = (dir: FaceDir) => dir === seen.left || dir === seen.right;
  // The building's own sides (Plan 88): the grand portico on its front (the
  // long wall, as placed), a narrower one on each end, a doorcase on the
  // back, wherever the camera stands.
  const own = ownFrame.sidesOf(facing);
  const main: FaceDir = own.front;
  const endsOf: FaceDir[] = [own.left, own.right];
  const hf = boxFaces(col, row, w, h, 0, H);
  const walls = [
    { dir: hf.dir.CD, o: hf.D, a: hf.C, span: hf.spanLeft },
    { dir: hf.dir.BC, o: hf.C, a: hf.B, span: hf.spanRight },
  ];
  // The roof over the cornice's oversail, and its height anywhere on it.
  const rc = col - FH_EAVES; const rr = row - FH_EAVES; const rw = w + FH_EAVES * 2; const rh = h + FH_EAVES * 2;
  const run = Math.min(rw, rh) / 2;
  const zAt = (c: number, r: number) => H + ridge * Math.min(1, Math.max(0, Math.min(c - rc, rc + rw - c, r - rr, rr + rh - r)) / run);
  const alongW = rw >= rh;
  const brick = WALLS(wallTone);

  // A chimney out on each hip end, clear of the tower (the owner's second
  // look: on the ridge's own ends they crowded it), and the tower at the
  // ridge's middle, in depth order.
  const stackOut = run * FH_STACK_OUT;
  const ends = alongW
    ? [[rc + run - stackOut, rr + rh / 2], [rc + rw - run + stackOut, rr + rh / 2]]
    : [[rc + rw / 2, rr + run - stackOut], [rc + rw / 2, rr + rh - run + stackOut]];
  const [sa, sx] = alongW ? FH_STACK : [FH_STACK[1], FH_STACK[0]];
  const stacks = ends.map(([c, r], i) => {
    const b = { col: c - sa / 2, row: r - sx / 2, w: sa, h: sx };
    const top = H + ridge + FH_STACK_RISE;
    return {
      ...b,
      node: (
        <g key={`st${i}`}>
          {seatedFaces(b.col, b.row, b.w, b.h, top, zAt, (d) => brick[d], 'st')}
          {trimSlab(b.col - across(0.2), b.row - across(0.2), b.w + across(0.4), b.h + across(0.4), top, up(0.45), trim, 'cap')}
        </g>
      ),
    };
  });
  const tp = FH_TOWER.brick;
  const cc = col + w / 2; const cr = row + h / 2;
  const tower = {
    col: cc - tp / 2, row: cr - tp / 2, w: tp, h: tp,
    node: <FoundersTower key="tower" cc={cc} cr={cr} zAt={zAt} ridgeTop={H + ridge} brick={brick} stone={stone} />,
  };

  // Dormers on the two slopes facing the camera (the others are behind the
  // ridge): four on a long one, either side of the front portico's
  // pediment, and a fifth over the back's doorcase; one on a hip end.
  const dormers = [seen.left, seen.right].flatMap((dir) => {
    const span = wallSpan(rw, rh, dir);
    const us = isRowWall(dir) !== alongW ? [0.5] : dir === own.back ? [...FH_DORMERS_LONG.slice(0, 2), 0.5, ...FH_DORMERS_LONG.slice(2)] : FH_DORMERS_LONG;
    const a = run * FH_DORMER_AT;
    return us.map((u) => ({
      ...againstWall(rc, rr, rw, rh, dir, span * u - FH_DORMER_W / 2, FH_DORMER_W, FH_DORMER_D, a + FH_DORMER_D),
      dir, z0: H + ridge * FH_DORMER_AT,
    }));
  });

  // A temple portico on each visible wall, the grandest on the main front.
  const portico = (dir: FaceDir, share: number) => {
    const span = wallSpan(w, h, dir);
    const pw = span * share;
    const along0 = span / 2 - pw / 2;
    const sill = door ? door.threshold : up(1.4);
    const podium = againstWall(col, row, w, h, dir, along0, pw, FH_PORTICO_DEPTH);
    const ent = againstWall(col, row, w, h, dir, along0 - across(0.2), pw + across(0.4), FH_PORTICO_DEPTH + across(0.2));
    const entF = boxFaces(ent.col, ent.row, ent.w, ent.h, H - FH_ENTABLATURE, FH_ENTABLATURE);
    const inset = FH_COLUMN_R + across(0.45);
    const columns = depthOrder(Array.from({ length: 4 }, (_, i) => {
      const at = outsideWall(col, row, w, h, dir, along0 + inset + ((pw - inset * 2) * i) / 3, FH_PORTICO_DEPTH - inset);
      return { col: at.col - FH_COLUMN_R, row: at.row - FH_COLUMN_R, w: FH_COLUMN_R * 2, h: FH_COLUMN_R * 2 };
    }));
    const face = wallOf(boxFaces(ent.col, ent.row, ent.w, ent.h, H, 0), dir);
    const pedRise = up(((pw + across(0.4)) * METRES_PER_TILE / 2) * FH_PEDIMENT_PITCH);
    const fmid = { x: (face.origin.x + face.along.x) / 2, y: (face.origin.y + face.along.y) / 2 };
    const pedApex = lift(fmid, pedRise);
    const out = outwardOf(dir);
    // The portico's roof runs back from its pediment into the slope.
    const backBy = (q: Pt, d: number) => {
      const o0 = project(0, 0); const o1 = project(-out.col * d, -out.row * d);
      return { x: q.x + o1.x - o0.x, y: q.y + o1.y - o0.y };
    };
    const toWall = FH_PORTICO_DEPTH + across(0.2);
    const intoRoof = toWall + Math.max(0, (pedRise / ridge) * run - FH_EAVES);
    // Each slope falls to the eaves point on its own side of the screen.
    const pSide: FaceDir[] = isRowWall(dir) ? ['negCol', 'posCol'] : ['negRow', 'posRow'];
    const [fl, fr] = face.origin.x < face.along.x ? [face.origin, face.along] : [face.along, face.origin];
    const p0 = project(0, 0); const p1 = isRowWall(dir) ? project(-1, 0) : project(0, -1);
    const leftDir = p1.x < p0.x ? pSide[0] : pSide[1];
    const pSlopes = backSlopesFirst<[FaceDir, Pt]>([[leftDir, fl], [leftDir === pSide[0] ? pSide[1] : pSide[0], fr]], (q) => q[0]);
    const rU = across(FH_OCULUS_METRES) / (pw + across(0.4));
    const pt = (u: number, z: number) => lift({ x: face.origin.x + (face.along.x - face.origin.x) * u, y: face.origin.y + (face.along.y - face.origin.y) * u }, z);
    const oculus = Array.from({ length: 20 }, (_, i) => {
      const t = (i / 20) * Math.PI * 2;
      return pt(0.5 + Math.cos(t) * rU, pedRise * 0.36 + Math.sin(t) * up(FH_OCULUS_METRES));
    });
    const steps = outsideWall(col, row, w, h, dir, span / 2, FH_PORTICO_DEPTH);
    const wall = walls.find((x) => x.dir === dir);
    // On a wall turned away only its solid parts, painted before the mass
    // (which hides them but where they stand past it).
    if (!wall) {
      return (
        <g key={`po${dir}`}>
          {plainBox(boxFaces(podium.col, podium.row, podium.w, podium.h, 0, sill), shade(trim, 0.92), shade(trim, 0.76), shade(trim, 0.98), 'pod')}
          {columns.map((c, i) => (
            <Cylinder key={`pc${i}`} cc={c.col + FH_COLUMN_R} cr={c.row + FH_COLUMN_R} r={FH_COLUMN_R} z0={sill} z1={H - FH_ENTABLATURE} fill={shade(trim, 0.97)} />
          ))}
          {plainBox(entF, shade(trim, 0.97), shade(trim, 0.8), shade(trim, 1.0), 'ent')}
          {pSlopes.map(([d, e]) => (
            <polygon key={`ps${d}`} points={polyPoints([e, pedApex, backBy(pedApex, intoRoof), backBy(e, toWall)])} fill={roof[d]} />
          ))}
        </g>
      );
    }
    return (
      <g key={`po${dir}`}>
        {/* The shade under the portico, on the wall behind its columns. */}
        <WallBand origin={wall.o} along={wall.a} wallHeight={H} from={sill} to={H - FH_ENTABLATURE} className="iso-eaves-shadow"
          u0={along0 / span} u1={(along0 + pw) / span} />
        {plainBox(boxFaces(podium.col, podium.row, podium.w, podium.h, 0, sill), shade(trim, 0.92), shade(trim, 0.76), shade(trim, 0.98), 'pod')}
        {columns.map((c, i) => (
          <Cylinder key={`pc${i}`} cc={c.col + FH_COLUMN_R} cr={c.row + FH_COLUMN_R} r={FH_COLUMN_R} z0={sill} z1={H - FH_ENTABLATURE} fill={shade(trim, 0.97)} />
        ))}
        {plainBox(entF, shade(trim, 0.97), shade(trim, 0.8), shade(trim, 1.0), 'ent')}
        {pSlopes.map(([d, e]) => (
          <polygon key={`ps${d}`} points={polyPoints([e, pedApex, backBy(pedApex, intoRoof), backBy(e, toWall)])} fill={roof[d]} />
        ))}
        <polygon points={polyPoints([face.origin, face.along, pedApex])} fill={shade(trim, WALL_LIGHT[dir])} stroke={shade(trim, 0.72)} strokeWidth={0.5} />
        <polygon points={polyPoints(oculus)} className="iso-clock-face" />
        {door && (
          <EntranceSteps d={{ ...door, widthTiles: Math.max(door.widthTiles, pw * 0.8 - STEP_OVERHANG * 2) }} stone={stone}
            centreCol={steps.col} centreRow={steps.row} outCol={out.col} outRow={out.row} span={pw / 0.6} />
        )}
      </g>
    );
  };
  const mainSpan = wallSpan(w, h, main);
  const endShare = (end: FaceDir) => Math.min(FH_PORTICO_SHARE, (mainSpan * FH_PORTICO_SHARE * FH_END_PORTICO) / wallSpan(w, h, end));
  const porticoOn = (dir: FaceDir) => (dir === main ? portico(main, FH_PORTICO_SHARE) : portico(dir, endShare(dir)));
  const porticoed = [main, ...endsOf];

  // The back's doorcase (a plain service front, as the back of a college
  // hall has): white pilasters either side of the door, an entablature and
  // a small pediment over it, flat on the wall, and a narrow flight.
  const doorcase = (() => {
    const wall = walls.find((x) => x.dir === own.back);
    if (!wall || !door) return null;
    const { o, a, span } = wall;
    const dw = doorFraction(door, span);
    if (dw <= 0) return null;
    const at = (u: number, z: number) => facePoint(o, a, H, u, z / H);
    const head = door.threshold + door.height;
    const pil = across(0.55) / span;
    const u0 = 0.5 - dw / 2 - pil; const u1 = 0.5 + dw / 2 + pil;
    const ent0 = head + up(0.25); const ent1 = ent0 + up(0.75);
    const ext = pil * 0.5;
    const apex = at(0.5, ent1 + ((u1 - u0 + ext * 2) * span * METRES_PER_TILE / 2) * up(FH_PEDIMENT_PITCH));
    const out = outwardOf(own.back);
    const steps = outsideWall(col, row, w, h, own.back, span / 2, 0);
    const lit = shade(trim, WALL_LIGHT[own.back]);
    return (
      <g key="doorcase">
        <polygon points={polyPoints([at(u0, door.threshold), at(u0 + pil, door.threshold), at(u0 + pil, ent0), at(u0, ent0)])} fill={lit} />
        <polygon points={polyPoints([at(u1 - pil, door.threshold), at(u1, door.threshold), at(u1, ent0), at(u1 - pil, ent0)])} fill={lit} />
        <polygon points={polyPoints([at(u0 - ext, ent0), at(u1 + ext, ent0), at(u1 + ext, ent1), at(u0 - ext, ent1)])} fill={lit} />
        <polygon points={polyPoints([at(u0 - ext, ent1), at(u1 + ext, ent1), apex])} fill={lit} stroke={shade(trim, 0.72)} strokeWidth={0.4} />
        <EntranceSteps d={door} stone={stone} centreCol={steps.col} centreRow={steps.row} outCol={out.col} outRow={out.row} span={span} />
      </g>
    );
  })();

  return (
    <>
      {/* The porticos on walls turned away, behind the mass. */}
      {porticoed.filter((dir) => !inView(dir)).map(porticoOn)}
      {/* The brick walls, plinth, storey course and windows. */}
      <polygon points={polyPoints(hf.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(hf.right)} fill={pal.wallRight} />
      {walls.map(({ dir, o, a }) => (
        <g key={`b${dir}`}>
          <WallBand origin={o} along={a} wallHeight={H} from={0} to={PLINTH} className="iso-plinth" />
          {courses.map((z) => (
            <WallBand key={z} origin={o} along={a} wallHeight={H} from={z - up(0.2)} to={z + up(0.2)} className="iso-cornice" fill={shade(trim, WALL_LIGHT[dir])} />
          ))}
        </g>
      ))}
      {walls.map(({ dir, o, a, span: s }) => foundersWindows(o, a, H, s, door ? door.threshold + door.height + (dir === own.back ? up(1.6) : 0) : null, trim, `w${dir}`))}
      {door && walls.map(({ dir, o, a, span: s }) => <Door key={`d${dir}`} d={door} origin={o} along={a} wallHeight={H} span={s} side={dir} />)}
      {doorcase}

      {/* The white cornice, oversailing, and the slate hip on it. */}
      {sideFaces(boxFaces(rc, rr, rw, rh, H - FH_CORNICE, FH_CORNICE), shade(trim, 0.97), shade(trim, 0.8))}
      <HippedRoof col={rc} row={rr} w={rw} h={rh} base={H} rise={ridge} pal={roof} />
      {depthOrder(withTower ? [...stacks, tower] : stacks).map((x) => x.node)}
      {depthOrder(dormers).map((d, i) => (
        <FoundersDormer key={`dm${i}`} b={d} dir={d.dir} z0={d.z0} zAt={zAt} roof={roof} trim={trim} />
      ))}

      {/* The porticos in view last: they stand in front of wall and roof. */}
      {porticoed.filter(inView).map(porticoOn)}
    </>
  );
}

// The chapel (Plan 80I; buildingSpec's CHAPELS and chapelPlan): a tower at
// the west end, a nave under a steep roof with tall windows down its long
// walls, and a lower chancel at the east end with a rose in the nave's
// gable over it. The three volumes, and a Gothic or Tudor chapel's
// buttresses, are painted in depthOrder, so each view puts the tower in
// front of the nave or behind it as it should. A door stands on each of the
// four walls walkRoutes.ts walks to: the tower's west face, the middle bay
// of each long wall and the chancel's east face.
//
// The plan is the building's own (four-way facing): on a wide plot the
// tower stands at its left end and the chancel at its right, and the front
// long wall wears a gabled porch over its door, the parish church's south
// porch, while the back keeps a plain door; on a deep plot the tower stands
// on the front, its door the main one.
// The building's own sides (four-way facing) for the chapel, the Law School,
// the Museum, the dining halls and the residence towers below.

const CHAPEL_GLASS = 'rgba(46, 58, 78, 0.78)';   // leaded, and dark from outside
const CHAPEL_WINDOW = across(1.7);
const CHAPEL_SILL = up(2.6);
const CHAPEL_HEAD_DROP = up(1.4);

interface ChapelFace { dir: FaceDir; o: Pt; a: Pt; span: number }
function chapelFaces(f: BoxFaces): ChapelFace[] {
  return [
    { dir: f.dir.CD, o: f.D, a: f.C, span: f.spanLeft },
    { dir: f.dir.BC, o: f.C, a: f.B, span: f.spanRight },
  ];
}

// Tall windows on one face at `centres` (u), `halfU` wide each side, from
// v0 to v1: one path, as windows() draws them.
function tallWindows(face: ChapelFace, H: number, centres: number[], halfU: number, v0: number, v1: number, shape: WindowShape, key: string) {
  const d = centres.map((u) => `M${polyPoints(windowOutline(shape, u - halfU, u + halfU, v0, v1)
    .map(([uu, vv]) => facePoint(face.o, face.a, H, uu, vv))).replace(/ /g, 'L')}Z`).join('');
  return d ? <path key={key} className="iso-window" fill={CHAPEL_GLASS} d={d} /> : null;
}

// The chapel's porch on its front long wall: a steep little gable standing
// out from the nave's middle bay, its ridge running back into the nave
// wall, the door in its face up a step.
function ChapelPorch({ nave, dir, width, depth, eave, rise, pal, wallTone, stone, door, shape }: {
  nave: ChapelBox; dir: FaceDir; width: number; depth: number; eave: number; rise: number;
  pal: Palette; wallTone: string; stone: StonePalette; door: DoorDimensions; shape: 'rect' | 'arched';
}) {
  const { col, row, w, h } = nave;
  const span = wallSpan(w, h, dir);
  const lo = span / 2 - width / 2; const hi = span / 2 + width / 2; const mid = span / 2;
  const b = againstWall(col, row, w, h, dir, lo, width, depth);
  const f = boxFaces(b.col, b.row, b.w, b.h, 0, eave);
  const front = wallOf(f, dir);
  const sideDir: FaceDir = front.poly === f.left ? f.dir.BC : f.dir.CD;
  const side = wallOf(f, sideDir);
  const at = (a: number, o: number, z: number) => { const g = outsideWall(col, row, w, h, dir, a, o); return lift(project(g.col, g.row), z); };
  const ridgeOut = at(mid, depth + across(0.15), eave + rise); const ridgeIn = at(mid, 0, eave + rise);
  const halves: Array<[FaceDir, Pt[]]> = isRowWall(dir)
    ? [['negCol', [at(lo - across(0.15), depth + across(0.15), eave), at(lo - across(0.15), 0, eave), ridgeIn, ridgeOut]], ['posCol', [at(hi + across(0.15), depth + across(0.15), eave), at(hi + across(0.15), 0, eave), ridgeIn, ridgeOut]]]
    : [['negRow', [at(lo - across(0.15), depth + across(0.15), eave), at(lo - across(0.15), 0, eave), ridgeIn, ridgeOut]], ['posRow', [at(hi + across(0.15), depth + across(0.15), eave), at(hi + across(0.15), 0, eave), ridgeIn, ridgeOut]]];
  const gable = [lift(front.origin, eave), lift(front.along, eave), ridgeOut];
  const o = outwardOf(dir);
  const step = outsideWall(col, row, w, h, dir, mid, depth);
  return (
    <g className="chapel-porch">
      <polygon points={polyPoints(side.poly)} fill={shade(wallTone, WALL_LIGHT[sideDir])} />
      <polygon points={polyPoints(front.poly)} fill={shade(wallTone, WALL_LIGHT[dir])} />
      <Door d={door} origin={front.origin} along={front.along} wallHeight={eave} span={width} side={dir} shape={shape} />
      {backSlopesFirst(halves, (x) => x[0]).map(([d, pts]) => <polygon key={d} points={polyPoints(pts)} fill={pal[d]} />)}
      <polygon points={polyPoints(gable)} fill={shade(wallTone, WALL_LIGHT[dir])} />
      <polyline points={polyPoints([gable[0]!, ridgeOut, gable[1]!])} stroke={shade(wallTone, 0.7)} strokeWidth={1} fill="none" />
      <GiltFinial at={ridgeOut} rise={up(1.2)} stone={stone} />
      <EntranceSteps d={door} centreCol={step.col} centreRow={step.row} outCol={o.col} outRow={o.row} span={width} stone={stone} />
    </g>
  );
}

function Chapel({ t, p, vernacular, pal, stone, wall }: {
  t: Buildable; p: Plot;
  vernacular: Vernacular; pal: Palette; stone: StonePalette; wall: string;
}) {
  const spec = CHAPELS[vernacular];
  const plan = chapelPlan(p, vernacular);
  const door = doorOf(t);
  const trim = hasTrim(vernacular);
  const trimStone = trim ? stone.trim : stone.towerStone;
  const shape = spec.window;
  const doorShape = shape === 'arched' || shape === 'lancet' ? 'arched' : 'rect';
  const { alongW } = plan;
  const isSide = (dir: FaceDir) => dir === plan.sides[0] || dir === plan.sides[1];
  // The front's porch (a wide plot's), drawn when its wall is in view; it
  // carries the front door, so the nave's own is not drawn under it.
  const seenNow = visibleWalls();
  const porchDir = plan.porch !== undefined && door && (plan.porch === seenNow.left || plan.porch === seenNow.right) ? plan.porch : undefined;

  // Walls, courses and the doors' steps of one gabled volume, `details` on
  // its faces, then its roof and whatever stands in its gable.
  const gabled = (b: ChapelBox, H: number, ridge: number, details: (face: ChapelFace) => React.ReactNode, gable?: (face: ChapelFace) => React.ReactNode) => {
    const f = boxFaces(b.col, b.row, b.w, b.h, 0, H);
    const rs = lift(alongW ? project(b.col, b.row + b.h / 2) : project(b.col + b.w / 2, b.row), H + ridge);
    const re = lift(alongW ? project(b.col + b.w, b.row + b.h / 2) : project(b.col + b.w / 2, b.row + b.h), H + ridge);
    const faces = chapelFaces(f);
    return (
      <>
        <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
        {trim && faces.map((face) => (
          <g key={`b${face.dir}`}>
            <WallBand origin={face.o} along={face.a} wallHeight={H} from={0} to={BASE_COURSE} className="iso-plinth" />
            <WallBand origin={face.o} along={face.a} wallHeight={H} from={H - EAVES_COURSE} to={H} className="iso-cornice" />
          </g>
        ))}
        {faces.map((face) => <g key={`d${face.dir}`}>{details(face)}</g>)}
        {gableSlopes(f, alongW, rs, re, pal)}
        {gableEnds(f, alongW, rs, re, pal)}
        <line className="iso-ridge" x1={rs.x} y1={rs.y} x2={re.x} y2={re.y} />
        {gable && faces.map((face) => <g key={`g${face.dir}`}>{gable(face)}</g>)}
      </>
    );
  };

  // A door in the middle of a face, and its step.
  const doorway = (b: ChapelBox, face: ChapelFace, H: number) => {
    if (!door) return null;
    const at = outsideWall(b.col, b.row, b.w, b.h, face.dir, face.span / 2, 0);
    const out = outwardOf(face.dir);
    return (
      <>
        <Door d={door} origin={face.o} along={face.a} wallHeight={H} span={face.span} side={face.dir} shape={doorShape} />
        <EntranceSteps d={door} centreCol={at.col} centreRow={at.row} outCol={out.col} outRow={out.row} span={face.span} stone={stone} />
      </>
    );
  };

  const nave = () => {
    const H = plan.naveHeight;
    const n = plan.bays;
    const v0 = CHAPEL_SILL / H; const v1 = (H - CHAPEL_HEAD_DROP) / H;
    return gabled(plan.nave, H, plan.naveRidge, (face) => {
      if (!isSide(face.dir)) return null;
      const centres = Array.from({ length: n }, (_, b) => (b + 0.5) / n).filter((_, b) => b !== (n - 1) / 2);
      return (
        <>
          {tallWindows(face, H, centres, CHAPEL_WINDOW / face.span / 2, v0, v1, shape, `nw${face.dir}`)}
          {face.dir !== porchDir && doorway(plan.nave, face, H)}
        </>
      );
    }, (face) => {
      // A rose (an oculus in the classical sets) in the east gable, over
      // the chancel's roof; the modern chapel has none.
      if (face.dir !== plan.east || shape === 'slot') return null;
      const H2 = plan.naveHeight;
      const radius = Math.min(2.0, spec.ridgeMetres * 0.25);   // metres
      const cv = 1 + (plan.naveRidge * 0.42) / H2;
      const ring = (k: number) => polyPoints(Array.from({ length: 20 }, (_, i) => {
        const a = (i / 20) * Math.PI * 2;
        return facePoint(face.o, face.a, H2, 0.5 + (Math.cos(a) * across(radius * k)) / face.span, cv + (Math.sin(a) * up(radius * k)) / H2);
      }));
      return (
        <>
          {trim && <polygon points={ring(1.22)} fill={trimStone} />}
          <polygon points={ring(1)} fill={CHAPEL_GLASS} />
        </>
      );
    });
  };

  const chancel = () => {
    const H = plan.chancelHeight;
    return gabled(plan.chancel, H, plan.chancelRidge, (face) => {
      if (isSide(face.dir)) {
        return tallWindows(face, H, [0.5], CHAPEL_WINDOW / face.span / 2, CHAPEL_SILL / H, (H - CHAPEL_HEAD_DROP) / H, shape, `cw${face.dir}`);
      }
      if (face.dir !== plan.east || !door) return null;
      // The east window over the chancel's door.
      const v0 = (door.threshold + door.height + up(1.0)) / H;
      return (
        <>
          {v0 < 0.85 && tallWindows(face, H, [0.5], CHAPEL_WINDOW * 0.9 / face.span, v0, (H - up(0.9)) / H, shape, 'ew')}
          {doorway(plan.chancel, face, H)}
        </>
      );
    });
  };

  const tower = () => {
    const b = plan.tower;
    const cc = b.col + b.w / 2; const cr = b.row + b.h / 2;
    const Hs = plan.towerHeight;
    // The blade is a slab: thin down the chapel's axis, full width across it.
    const blade = spec.tower === 'blade';
    const thin = b.w * 0.42;
    const sb: ChapelBox = !blade ? b : alongW
      ? { col: b.col, row: b.row, w: thin, h: b.h }
      : { col: b.col, row: b.row, w: b.w, h: thin };
    const f = boxFaces(sb.col, sb.row, sb.w, sb.h, 0, Hs);
    const faces = chapelFaces(f);
    // What happens at the top: a belfry's openings in the shaft's head,
    // then the cap.
    const headOpenings = spec.tower === 'spire' || spec.tower === 'battlements' || spec.tower === 'campanile' || blade;
    const stage = (plan0: number, base: number, rise: number) => boxFaces(cc - plan0 / 2, cr - plan0 / 2, plan0, plan0, base, rise);
    const cap = (() => {
      switch (spec.tower) {
        case 'spire': {
          const pp = across(1.4);
          const spire = pyramid(b.col + b.w * 0.08, b.row + b.h * 0.08, b.w * 0.84, Hs, plan.capRise, wall);
          return (
            <>
              {depthOrder([[b.col, b.row], [b.col + b.w - pp, b.row], [b.col, b.row + b.h - pp], [b.col + b.w - pp, b.row + b.h - pp]]
                .map(([c, r]) => ({ col: c, row: r, w: pp, h: pp }))).map((q, i) => {
                const pf = boxFaces(q.col, q.row, q.w, q.h, Hs, up(3.4));
                const foot = lift(project(q.col + q.w / 2, q.row + q.h / 2), Hs + up(3.4));
                return (
                  <g key={i}>
                    <polygon points={polyPoints(pf.left)} fill={pal.wall[pf.dir.CD]} />
                    <polygon points={polyPoints(pf.right)} fill={pal.wall[pf.dir.BC]} />
                    <line className="iso-finial" x1={foot.x} y1={foot.y} x2={foot.x} y2={lift(foot, up(2.6)).y} stroke={shade(wall, 0.8)} />
                  </g>
                );
              })}
              {spire.faces}
              <GiltFinial at={spire.tip} rise={up(2.6)} stone={stone} />
            </>
          );
        }
        case 'steeple': {
          const bp = b.w * 0.72; const br = up(4.6);
          const bf = stage(bp, Hs, br);
          const spire = pyramid(cc - bp * 0.36, cr - bp * 0.36, bp * 0.72, Hs + br, plan.capRise, pal.roof);
          return (
            <>
              {sideFaces(bf, shade(trimStone, 0.98), shade(trimStone, 0.82))}
              <StageOpenings f={bf} rise={br} n={1} shape="arched" v0={0.14} v1={0.86} />
              <polygon points={polyPoints(bf.top)} fill={shade(trimStone, 0.9)} />
              {spire.faces}
              <GiltFinial at={spire.tip} rise={up(2.4)} stone={stone} />
            </>
          );
        }
        case 'cupola': {
          const bp = b.w * 0.76; const br = up(4.2);
          const bf = stage(bp, Hs, br);
          return (
            <>
              {sideFaces(bf, shade(trimStone, 0.98), shade(trimStone, 0.82))}
              <StageOpenings f={bf} rise={br} n={1} shape="arched" v0={0.12} v1={0.84} />
              <polygon points={polyPoints(bf.top)} fill={shade(trimStone, 0.9)} />
              <Dome col={cc - bp * 1.25} row={cr - bp * 1.25} w={bp * 2.5} h={bp * 2.5} base={Hs + br} stone={stone} hemisphere />
            </>
          );
        }
        case 'campanile': {
          const over = across(0.35);
          const roofCap = pyramid(b.col - over, b.row - over, b.w + over * 2, Hs, plan.capRise, pal.roof);
          return (
            <>
              {roofCap.faces}
              <GiltFinial at={roofCap.tip} rise={up(1.8)} stone={stone} />
            </>
          );
        }
        case 'battlements': {
          const pp = across(1.2);
          return (
            <>
              {faces.map((face) => (
                <Merlons key={face.dir} col={b.col} row={b.row} w={b.w} h={b.h} base={Hs} outward={face.dir} pal={pal}
                  block={across(0.9)} gap={across(0.7)} rise={up(1.1)} depth={across(0.45)} />
              ))}
              {depthOrder([[b.col, b.row], [b.col + b.w - pp, b.row], [b.col, b.row + b.h - pp], [b.col + b.w - pp, b.row + b.h - pp]]
                .map(([c, r]) => ({ col: c, row: r, w: pp, h: pp }))).map((q, i) => {
                const pf = boxFaces(q.col, q.row, q.w, q.h, Hs, plan.capRise);
                const pin = pyramid(q.col, q.row, q.w, Hs + plan.capRise, up(2.2), pal.roof);
                return (
                  <g key={i}>
                    <polygon points={polyPoints(pf.left)} fill={pal.wall[pf.dir.CD]} />
                    <polygon points={polyPoints(pf.right)} fill={pal.wall[pf.dir.BC]} />
                    {pin.faces}
                  </g>
                );
              })}
            </>
          );
        }
        case 'stepped': {
          let z = Hs;
          const tiers = ([[0.74, up(4.4)], [0.5, up(3.6)]] as const).map(([k, rise], i) => {
            const tf = stage(b.w * k, z, rise);
            z += rise;
            return (
              <g key={i}>
                {sideFaces(tf, shade(wall, 1.0), shade(wall, 0.8))}
                <WallBand origin={tf.D} along={tf.C} wallHeight={rise} from={rise * 0.86} to={rise} className="iso-cornice" fill={stone.gilt === NO_STONE ? undefined : stone.gilt} />
                <WallBand origin={tf.C} along={tf.B} wallHeight={rise} from={rise * 0.86} to={rise} className="iso-cornice" fill={stone.gilt === NO_STONE ? undefined : shade(stone.gilt, 0.82)} />
                <polygon points={polyPoints(tf.top)} fill={shade(wall, 0.9)} />
              </g>
            );
          });
          return (
            <>
              {tiers}
              <GiltFinial at={lift(project(cc, cr), z)} rise={plan.capRise - up(8)} stone={stone} />
            </>
          );
        }
        default:
          return null;
      }
    })();
    return (
      <>
        <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
        {trim && !blade && faces.map((face) => (
          <g key={`b${face.dir}`}>
            <WallBand origin={face.o} along={face.a} wallHeight={Hs} from={0} to={BASE_COURSE} className="iso-plinth" />
            <WallBand origin={face.o} along={face.a} wallHeight={Hs} from={Hs - CORNICE} to={Hs} className="iso-cornice" />
          </g>
        ))}
        {faces.map((face) => {
          const west = face.dir === plan.west;
          // Slim openings: a slot a face, or a window over the west door.
          const wide = blade && !isSide(face.dir);
          const half = wide ? 0.1 : across(0.9) / face.span / 2;
          return (
            <g key={`o${face.dir}`}>
              {!blade && tallWindows(face, Hs, [0.5], half, west ? 0.3 : 0.4, west ? 0.46 : 0.56, shape === 'slot' ? 'slot' : shape, `tw${face.dir}`)}
              {headOpenings && (blade
                ? wide && <polygon className="iso-undercroft" points={polyPoints(windowOutline('rect', 0.3, 0.7, 0.8, 0.93).map(([u, v]) => facePoint(face.o, face.a, Hs, u, v)))} />
                : [0, 1].slice(0, spec.tower === 'campanile' ? 2 : 1).map((i, _, all) => {
                  const cell = 1 / all.length; const u0 = 0.18 + i * cell * 0.64; const u1 = u0 + cell * 0.64 - (all.length > 1 ? 0.06 : 0);
                  return (
                    <polygon key={i} className={spec.tower === 'campanile' ? 'iso-undercroft' : 'iso-louvre'}
                      points={polyPoints(windowOutline(spec.tower === 'campanile' ? 'arched' : 'lancet', all.length > 1 ? u0 : 0.34, all.length > 1 ? u1 : 0.66, 0.76, 0.95).map(([u, v]) => facePoint(face.o, face.a, Hs, u, v)))} />
                  );
                }))}
              {spec.tower === 'steeple' && <WallClock origin={face.o} along={face.a} height={Hs} span={face.span} cv={0.86} r={Math.min(CLOCK_RADIUS_TILES, face.span * 0.22)} />}
              {west && doorway(sb, face, Hs)}
            </g>
          );
        })}
        <polygon points={polyPoints(f.top)} fill={shade(wall, 0.9)} />
        {cap}
      </>
    );
  };

  // Buttresses at the nave's bay lines on the long walls the camera sees,
  // stepping back once as they climb (as Buttresses).
  const buttresses: Array<DepthBox & { part: 'buttress'; dir: FaceDir; lower: DepthBox; upper: DepthBox }> = [];
  if (spec.buttresses) {
    const seen = visibleWalls();
    const nb = plan.nave;
    const depth = across(0.85); const shrink = depth * 0.42;
    for (const dir of plan.sides) {
      if (dir !== seen.left && dir !== seen.right) continue;
      const span = wallSpan(nb.w, nb.h, dir);
      for (let i = 1; i < plan.bays; i++) {
        const along = (i / plan.bays) * span - BUTTRESS_PLAN / 2;
        const lower = againstWall(nb.col, nb.row, nb.w, nb.h, dir, along, BUTTRESS_PLAN, depth);
        const upper = againstWall(nb.col, nb.row, nb.w, nb.h, dir, along, BUTTRESS_PLAN, depth - shrink);
        buttresses.push({ ...lower, part: 'buttress', dir, lower, upper });
      }
    }
  }
  const H = plan.naveHeight;
  // The porch's plan: the nave's middle bay, out over the margin the nave
  // leaves on the plot.
  const porchItems: Array<DepthBox & { part: 'porch' }> = [];
  let porchNode: React.ReactNode = null;
  if (porchDir && door) {
    const nb = plan.nave;
    const span = wallSpan(nb.w, nb.h, porchDir);
    const width = Math.min(across(5.2), (span / plan.bays) * 0.95);
    const margin = isRowWall(porchDir) ? (porchDir === 'posRow' ? p.row + p.h - (nb.row + nb.h) : nb.row - p.row) : (porchDir === 'posCol' ? p.col + p.w - (nb.col + nb.w) : nb.col - p.col);
    const depth = Math.max(across(1.6), Math.min(across(3.4), margin * 0.85));
    const eave = Math.min(H * 0.62, door.threshold + door.height + up(1.3));
    const rise = up((width * METRES_PER_TILE / 2) * 1.0);
    porchItems.push({ ...againstWall(nb.col, nb.row, nb.w, nb.h, porchDir, span / 2 - width / 2, width, depth), part: 'porch' });
    porchNode = <ChapelPorch nave={nb} dir={porchDir} width={width} depth={depth} eave={eave} rise={rise} pal={pal} wallTone={wall} stone={stone} door={door} shape={doorShape} />;
  }
  const items = depthOrder([
    { ...plan.tower, part: 'tower' as const },
    { ...plan.nave, part: 'nave' as const },
    { ...plan.chancel, part: 'chancel' as const },
    ...buttresses,
    ...porchItems,
  ]);
  return (
    <>
      {items.map((it, i) => {
        if (it.part === 'tower') return <g key="tower">{tower()}</g>;
        if (it.part === 'porch') return <g key="porch">{porchNode}</g>;
        if (it.part === 'nave') return <g key="nave">{nave()}</g>;
        if (it.part === 'chancel') return <g key="chancel">{chancel()}</g>;
        const lo = boxFaces(it.lower.col, it.lower.row, it.lower.w, it.lower.h, 0, H * BUTTRESS_SETOFF_FRACTION);
        const hi = boxFaces(it.upper.col, it.upper.row, it.upper.w, it.upper.h, H * BUTTRESS_SETOFF_FRACTION, H * (0.86 - BUTTRESS_SETOFF_FRACTION));
        return (
          <g key={`bt${i}`}>
            <polygon points={polyPoints(lo.left)} fill={pal.wall[lo.dir.CD]} />
            <polygon points={polyPoints(lo.right)} fill={pal.wall[lo.dir.BC]} />
            <polygon points={polyPoints(lo.top)} fill={shade(trimStone, 0.88)} />
            <polygon points={polyPoints(hi.left)} fill={pal.wall[hi.dir.CD]} />
            <polygon points={polyPoints(hi.right)} fill={pal.wall[hi.dir.BC]} />
            <polygon points={polyPoints(hi.top)} fill={shade(trimStone, 0.94)} />
          </g>
        );
      })}
    </>
  );
}

// --- The Law School and the University Museum (Plan 87G) -----------------
// Both are 11x8 limestone porticos; each now says what it is. The Law
// School wears a temple front on each visible face, after the Supreme
// Court: a wide flight to a podium, a full-height rank of round columns,
// and a pediment carrying the scales of justice, round a raised attic hall.
// Its Gothic set builds Michigan's Law Quad instead: a steep-roofed reading
// room with a great traceried gable window over a Gothic porch. The Museum
// is a gallery wing top-lit by glazed barrel vaults (Yale, Kimbell), set
// back behind a paved forecourt with a sculpture before each visible front.

const LAW_ID = 'PROJ-LAW';
const MUSEUM_ID = 'PROJ-MUSEUM';
// Whether the Law School wears its temple front: all but the Gothic set.
function lawTemple(t: Buildable, v: Vernacular): boolean {
  return t.id === LAW_ID && v !== 'gothic';
}
// The attic's low roof, in weathered copper.
const LAW_ATTIC_ROOF = '#8fa39a';
// The Gothic reading room's slate, darker than the flat roofs round it.
const READING_ROOM_SLATE = '#59616b';
// The Museum's forecourt: how far the gallery stands back from its plot.
const MUSEUM_COURT = across(8);

// A box against wall `dir` from `s0` to `s1` tiles out, `along0` to
// `along0 + width` along it.
function outFromWall(col: number, row: number, w: number, h: number, dir: FaceDir, along0: number, width: number, s0: number, s1: number): DepthBox {
  const b = againstWall(col, row, w, h, dir, along0, width, s1 - s0);
  const o = outwardOf(dir);
  return { col: b.col + o.col * s0, row: b.row + o.row * s0, w: b.w, h: b.h };
}

// The temple front's width on a wall of `span` (Plan 87G).
const lawTempleWidth = (span: number) => Math.min(span * 0.52, across(44));
// The Law School's fronts (Plan 87M; four-way facing): the temple front on
// the building's own front, the pilastered frontispiece on its back, each
// drawn while its wall is in view; the sides keep the mass's plain doors.
// So the hierarchy stays on the building as the camera turns, and a view
// from behind shows the lesser front.
function LawFronts({ col, row, w, h, H, facing, stone }: {
  col: number; row: number; w: number; h: number; H: number; facing?: Facing; stone: StonePalette;
}) {
  const { front, back } = sidesOf(facing);
  return (
    <>
      {sideSeen(facing, 'back') && <LawFrontispiece col={col} row={row} w={w} h={h} H={H} dir={back} stone={stone} />}
      {sideSeen(facing, 'front') && <LawTemple col={col} row={row} w={w} h={h} H={H} dir={front} stone={stone} main />}
    </>
  );
}

// The temple front on wall `dir`: steps to a podium, columns to the eaves,
// an entablature, a pitched roof back to the wall and a pediment with the
// scales of justice in its tympanum. Only the main front (the building's
// own) wears it; the back has a pilastered frontispiece, so the two never
// read as rival temples (Plan 87M).
function LawTemple({ col, row, w, h, H, dir, stone, main }: {
  col: number; row: number; w: number; h: number; H: number; dir: FaceDir; stone: StonePalette; main: boolean;
}) {
  if (!main) return <LawFrontispiece col={col} row={row} w={w} h={h} H={H} dir={dir} stone={stone} />;
  const span = wallSpan(w, h, dir);
  const width = lawTempleWidth(span);
  const n = width >= across(34) ? 8 : 6;
  const along0 = span / 2 - width / 2;
  const depth = across(7.5);
  const podiumH = up(2.4);
  const treads = 6;
  // In the set's dressed stone, never its brick (Tudor's tower stone).
  const marble = stone.trim !== 'none' ? stone.trim : stone.towerStone;
  const gilt = stone.gilt !== 'none' ? stone.gilt : '#c9a227';
  // The flight and podium: stacked slabs, the highest the podium itself.
  const steps = Array.from({ length: treads }, (_, k) => treads - 1 - k).map((i) => {
    const b = outFromWall(col, row, w, h, dir, along0 - across(1.2), width + across(2.4), 0, depth + across(0.5) + (treads - 1 - i) * TREAD_DEPTH);
    const f = boxFaces(b.col, b.row, b.w, b.h, 0, ((i + 1) * podiumH) / treads);
    return (
      <g key={`s${i}`}>
        {sideFaces(f, shade(marble, 0.86), shade(marble, 0.7))}
        <polygon points={polyPoints(f.top)} fill={shade(marble, i === treads - 1 ? 1.0 : 0.95)} stroke="rgba(60, 54, 44, 0.25)" strokeWidth={0.4} />
      </g>
    );
  });
  // Round columns along the front, back to front.
  const r = across(0.72);
  const gap = (width - across(1.6)) / (n - 1);
  const shafts = Array.from({ length: n }, (_, i) => outsideWall(col, row, w, h, dir, along0 + across(0.8) + i * gap, depth - across(0.9)))
    .sort((a, b) => project(a.col, a.row).y - project(b.col, b.row).y);
  const ENT = ENTABLATURE * 1.3;
  const entBox = outFromWall(col, row, w, h, dir, along0, width, 0, depth);
  const ent = boxFaces(entBox.col, entBox.row, entBox.w, entBox.h, H - ENT, ENT);
  const front = wallOf(ent, dir);
  // A point on the pediment's plane, u along the front, z above its eaves
  // (the entablature's top; wallOf gives its foot).
  const P = (u: number, z: number) => facePoint(front.origin, front.along, 1, u, ENT + z);
  const rise = up((width * METRES_PER_TILE / 2) * 0.26);
  const o0 = project(0, 0);
  const out = outwardOf(dir);
  // The pediment's roof runs back a short way past the wall and ends in a
  // hipped return on the deck, short of the attic hall behind, so the
  // attic rises clear over it (Plan 87M; it ran on into the attic, 87O).
  const backBy = (d: number) => {
    const o1 = project(-out.col * d, -out.row * d);
    return (q: Pt) => ({ x: q.x + o1.x - o0.x, y: q.y + o1.y - o0.y });
  };
  const runEave = depth + across(5);
  const eaveBack = backBy(runEave);
  const back = backBy(Math.max(depth * 0.5, runEave - width * 0.22));
  const eL = P(0, 0); const eR = P(1, 0); const apex = P(0.5, rise);
  const lit = WALL_LIGHT[dir];
  // The tympanum, set in from the raking cornices.
  const t0 = up(0.55); const rake = (z: number) => 0.5 * (z / rise);
  const tym = [P(rake(t0) + 0.035, t0), P(1 - rake(t0) - 0.035, t0), P(0.5, rise - up(0.9))];
  // The scales: a post, a beam, two pans on their cords.
  const sc = (u: number, k: number) => P(0.5 + u, t0 + (rise - t0) * k);
  const bw = 0.075;
  // A shallow bowl: its rim, then its curve below.
  const pan = (u: number) => [sc(u - 0.042, 0.3), sc(u + 0.042, 0.3), sc(u + 0.03, 0.22), sc(u, 0.18), sc(u - 0.03, 0.22)];
  const seg = (a: Pt, b: Pt) => `M${a.x.toFixed(1)},${a.y.toFixed(1)}L${b.x.toFixed(1)},${b.y.toFixed(1)}`;
  return (
    <g className="law-temple">
      {steps}
      {shafts.map((c, i) => (
        <g key={`c${i}`}>
          <Cylinder cc={c.col} cr={c.row} r={r} z0={podiumH} z1={H - ENT - up(0.6)} fill={shade(marble, 0.96)} />
          {sideFaces(boxFaces(c.col - r * 1.25, c.row - r * 1.25, r * 2.5, r * 2.5, H - ENT - up(0.6), up(0.6)), shade(marble, 0.94), shade(marble, 0.76))}
        </g>
      ))}
      {sideFaces(ent, shade(marble, 0.94), shade(marble, 0.76))}
      <polygon points={polyPoints([eL, apex, back(apex), eaveBack(eL)])} fill={shade(marble, 0.74)} />
      <polygon points={polyPoints([apex, eR, eaveBack(eR), back(apex)])} fill={shade(marble, 0.64)} />
      <polygon points={polyPoints([eL, eR, apex])} fill={shade(marble, lit)} stroke="rgba(60, 54, 44, 0.5)" strokeWidth={0.8} />
      <polygon points={polyPoints(tym)} fill={shade(marble, lit * 0.84)} />
      <path className="sig-scales" d={seg(sc(0, 0.1), sc(0, 0.74)) + seg(sc(-0.03, 0.1), sc(0.03, 0.1)) + seg(sc(-bw, 0.6), sc(bw, 0.6)) + seg(sc(-bw, 0.6), sc(-bw - 0.04, 0.3)) + seg(sc(-bw, 0.6), sc(-bw + 0.04, 0.3)) + seg(sc(bw, 0.6), sc(bw - 0.04, 0.3)) + seg(sc(bw, 0.6), sc(bw + 0.04, 0.3))} stroke={gilt} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      <polygon points={polyPoints(pan(-bw))} fill={gilt} />
      <polygon points={polyPoints(pan(bw))} fill={gilt} />
    </g>
  );
}

// The Law School's side front (Plan 87M): a shallow frontispiece centred
// on the wall, four giant pilasters to an entablature on the cornice line,
// a low pediment whose roof stops at a hip just behind the parapet, and a
// pedimented doorway up a short flight; the main front keeps the temple.
function LawFrontispiece({ col, row, w, h, H, dir, stone }: {
  col: number; row: number; w: number; h: number; H: number; dir: FaceDir; stone: StonePalette;
}) {
  const span = wallSpan(w, h, dir);
  const width = Math.min(span * 0.4, across(28));
  const along0 = span / 2 - width / 2;
  const proud = across(2.2);
  const marble = stone.trim !== 'none' ? stone.trim : stone.towerStone;
  const gilt = stone.gilt !== 'none' ? stone.gilt : '#c9a227';
  const ENT = ENTABLATURE * 1.3;
  const lit = WALL_LIGHT[dir];
  // The frontispiece's mass, proud of the wall, to the cornice.
  const mass = outFromWall(col, row, w, h, dir, along0, width, 0, proud);
  const mf = boxFaces(mass.col, mass.row, mass.w, mass.h, 0, H);
  const front = wallOf(mf, dir);
  const Q = (u0: number, u1: number, z0: number, z1: number) => polyPoints(wallQuad(front.origin, front.along, H, u0, u1, z0, z1));
  // Engaged columns at the ends and either side of the door bay, half
  // proud of its face.
  const cr0 = across(0.62);
  const pilasters = [0.07, 0.33, 0.67, 0.93].map((u) => outsideWall(col, row, w, h, dir, along0 + width * u, proud))
    .sort((a, b) => project(a.col, a.row).y - project(b.col, b.row).y);
  // The door and its flight.
  const doorH = up(5.2); const sill = up(1.2);
  const treads = 4;
  const steps = Array.from({ length: treads }, (_, k) => treads - 1 - k).map((i) => {
    const b = outFromWall(col, row, w, h, dir, along0 + width * 0.3, width * 0.4, 0, proud + across(0.4) + (treads - 1 - i) * TREAD_DEPTH);
    const f = boxFaces(b.col, b.row, b.w, b.h, 0, ((i + 1) * sill) / treads);
    return (
      <g key={`s${i}`}>
        {sideFaces(f, shade(marble, 0.86), shade(marble, 0.7))}
        <polygon points={polyPoints(f.top)} fill={shade(marble, i === treads - 1 ? 1.0 : 0.95)} stroke="rgba(60, 54, 44, 0.25)" strokeWidth={0.4} />
      </g>
    );
  });
  const g = crossGable({
    col, row, w, h, dir, along0: along0 - across(0.4), width: width + across(0.8), reach: proud + across(0.4), top: H,
    rise: up(((width + across(0.8)) * METRES_PER_TILE / 2) * 0.26), roofAt: flatRoofAt(col, row, w, h, H),
    slopes: { negCol: shade(marble, 0.8), negRow: shade(marble, 0.74), posRow: shade(marble, 0.66), posCol: shade(marble, 0.6) },
    maxRun: proud + across(4.5),
  });
  const P = (u: number, z: number) => facePoint(g.face.origin, g.face.along, 1, u, z);
  const tym = [P(0.09, up(0.5)), P(0.91, up(0.5)), P(0.5, g.rise - up(0.75))];
  // A wreath in the tympanum: a gilt ring.
  const rU = 0.07;
  const ring = Array.from({ length: 16 }, (_, i) => {
    const t = (i / 16) * Math.PI * 2;
    return P(0.5 + Math.cos(t) * rU, g.rise * 0.36 + Math.sin(t) * up(rU * (width + across(0.8)) * METRES_PER_TILE));
  });
  return (
    <g className="law-frontispiece">
      {sideFaces(mf, shade(marble, 0.92), shade(marble, 0.76))}
      {pilasters.map((c, i) => (
        <g key={`p${i}`}>
          <Cylinder cc={c.col} cr={c.row} r={cr0} z0={sill} z1={H - ENT - up(0.5)} fill={shade(marble, 0.97)} />
          {sideFaces(boxFaces(c.col - cr0 * 1.2, c.row - cr0 * 1.2, cr0 * 2.4, cr0 * 2.4, H - ENT - up(0.5), up(0.5)), shade(marble, 0.95), shade(marble, 0.78))}
        </g>
      ))}
      {/* The entablature across the top, and the door with its pediment. */}
      <polygon points={Q(0, 1, H - ENT, H)} fill={shade(marble, lit * 1.04)} stroke="rgba(60, 54, 44, 0.35)" strokeWidth={0.5} />
      <polygon points={Q(0.4, 0.6, sill, sill + doorH)} fill="#4a3b2c" stroke={shade(marble, 0.7)} strokeWidth={1} />
      <polygon points={polyPoints([facePoint(front.origin, front.along, 1, 0.37, sill + doorH + up(0.2)), facePoint(front.origin, front.along, 1, 0.63, sill + doorH + up(0.2)), facePoint(front.origin, front.along, 1, 0.5, sill + doorH + up(1.6))])} fill={shade(marble, lit)} stroke={shade(marble, 0.7)} strokeWidth={0.6} />
      {/* A tall window over the door, between the pilasters. */}
      <polygon points={Q(0.43, 0.57, sill + doorH + up(2.6), H - ENT - up(1.2))} fill={stone.glass} />
      {steps}
      {g.roof}
      <polygon points={polyPoints([g.face.origin, g.face.along, g.apex])} fill={shade(marble, lit)} stroke="rgba(60, 54, 44, 0.5)" strokeWidth={0.8} />
      <polygon points={polyPoints(tym)} fill={shade(marble, lit * 0.86)} />
      <polygon points={polyPoints(ring)} fill={shade(marble, 0.6)} stroke={gilt} strokeWidth={1.6} />
    </g>
  );
}

// The raised attic over the Law School's middle: a clerestoried hall under
// a low hipped roof (the Supreme Court's), or in the Gothic set a reading
// room under a steep slate gable, lancets down its side and a great
// traceried window in its visible end.
function LawAttic({ col, row, w, h, H, pal, stone, gothic }: {
  col: number; row: number; w: number; h: number; H: number; pal: Palette; stone: StonePalette; gothic: boolean;
}) {
  // The classical attic as wide as the temple front before it, over the
  // building's middle (Plan 87M), its long side to the long front.
  const long = lawTempleWidth(Math.max(w, h));
  const aw = gothic ? w * 0.56 : w >= h ? long : w * 0.42;
  const ah = gothic ? h * 0.36 : w >= h ? h * 0.42 : long;
  const ac = col + (w - aw) / 2; const ar = row + (h - ah) / 2;
  const rise = gothic ? up(5.5) : up(5);
  const f = boxFaces(ac, ar, aw, ah, H, rise);
  const trimTone = stone.trim !== 'none' ? stone.trim : shade(pal.wall.posRow, 1.1);
  const faces = [{ o: f.D, a: f.C, span: f.spanLeft }, { o: f.C, a: f.B, span: f.spanRight }];
  const alongW = aw >= ah;
  if (!gothic) {
    return (
      <g className="law-attic">
        <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
        {faces.map(({ o, a, span }, i) => {
          const k = Math.max(3, Math.round(span * 2.2));
          return (
            <g key={i}>
              {Array.from({ length: k }, (_, j) => (
                <polygon key={j} className="iso-window" points={polyPoints(wallQuad(o, a, rise, (j + 0.3) / k, (j + 0.7) / k, rise * 0.25, rise * 0.68))} fill={stone.glass} />
              ))}
              <polygon points={polyPoints(wallQuad(o, a, rise, 0, 1, rise - up(0.8), rise))} fill={trimTone} />
            </g>
          );
        })}
        <HippedRoof col={ac - across(0.3)} row={ar - across(0.3)} w={aw + across(0.6)} h={ah + across(0.6)} base={H + rise} rise={up(2.4)} pal={{ ...pal, ...SLOPE(LAW_ATTIC_ROOF) }} />
      </g>
    );
  }
  // The reading room: a steep gable along its long axis.
  const ridge = up(9);
  const rs = lift(alongW ? project(ac, ar + ah / 2) : project(ac + aw / 2, ar), H + rise + ridge);
  const re = lift(alongW ? project(ac + aw, ar + ah / 2) : project(ac + aw / 2, ar + ah), H + rise + ridge);
  const endDir: FaceDir[] = alongW ? ['negCol', 'posCol'] : ['negRow', 'posRow'];
  return (
    <g className="law-attic law-reading-room">
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      {faces.map(({ o, a, span }, i) => {
        // Lancets down the long side; the end wall's window is drawn with
        // its gable.
        const isEnd = endDir.includes(i === 0 ? f.dir.CD : f.dir.BC);
        if (isEnd) return null;
        const k = Math.max(4, Math.round(span * 2));
        return (
          <g key={i}>
            {Array.from({ length: k }, (_, j) => (
              <polygon key={j} points={polyPoints(windowOutline('lancet', (j + 0.32) / k, (j + 0.68) / k, 0.18, 0.86).map(([u, v]) => facePoint(o, a, rise, u, v)))} fill={stone.glass} />
            ))}
          </g>
        );
      })}
      {gableSlopes(f, alongW, rs, re, { ...pal, ...SLOPE(READING_ROOM_SLATE) })}
      {endDir.map((dir) => {
        const wall = wallOf(f, dir);
        if (!wall.visible) return null;
        const apex = alongW ? (dir === 'negCol' ? rs : re) : (dir === 'negRow' ? rs : re);
        const tl = lift(wall.origin, rise); const tr = lift(wall.along, rise);
        // The great window: a pointed arch through the end wall into its
        // gable, mullioned, in the reading room's glass.
        const hgt = rise + ridge;
        const win = windowOutline('lancet', 0.24, 0.76, 0.14, 0.86).map(([u, v]) => facePoint(wall.origin, wall.along, hgt, u, v));
        const mull = [0.37, 0.5, 0.63].map((u) => `M${facePoint(wall.origin, wall.along, hgt, u, 0.14).x.toFixed(1)},${facePoint(wall.origin, wall.along, hgt, u, 0.14).y.toFixed(1)}L${facePoint(wall.origin, wall.along, hgt, u, 0.7).x.toFixed(1)},${facePoint(wall.origin, wall.along, hgt, u, 0.7).y.toFixed(1)}`).join('');
        return (
          <g key={dir}>
            <polygon points={polyPoints([tl, tr, apex])} fill={pal.wall[dir]} />
            <polygon points={polyPoints(win)} fill={stone.glass} stroke={trimTone} strokeWidth={1.2} />
            <path d={mull} stroke={trimTone} strokeWidth={0.9} />
          </g>
        );
      })}
      <line className="iso-ridge" x1={rs.x} y1={rs.y} x2={re.x} y2={re.y} />
    </g>
  );
}

// The Museum's gallery roof: glazed barrel vaults side by side along the
// long axis, ribbed, closed by solid arched ends, each facet drawn only
// where it faces the camera.
function GalleryVaults({ col, row, w, h, base, pal }: {
  col: number; row: number; w: number; h: number; base: number; pal: Palette;
}) {
  const alongW = w >= h;
  const long = alongW ? w : h; const short = alongW ? h : w;
  const inset = across(5);
  const count = Math.max(2, Math.round((short - inset * 2) / across(15)));
  const bay = (short - inset * 2) / count;
  const R = bay * 0.42;
  const K = 8; const M = Math.max(4, Math.round(long / across(9)));
  // World point: x along the long axis, y across it, z up.
  const W = (x: number, y: number, z: number) => (alongW ? lift(project(col + x, row + y), z) : lift(project(col + y, row + x), z));
  const area = (q: Pt[]) => q.reduce((a, p, i) => { const n = q[(i + 1) % q.length]!; return a + p.x * n.y - n.x * p.y; }, 0);
  // Grid-frame winding of the deck seen from above; a face wound the other
  // way about its own outward normal is seen when its screen area has the
  // deck's sign. The long axis along row mirrors the frame.
  const deck = Math.sign(area([lift(project(0, 0), 0), lift(project(1, 0), 0), lift(project(1, 1), 0), lift(project(0, 1), 0)]));
  const seen = (q: Pt[]) => Math.sign(area(alongW ? q : [...q].reverse())) !== deck;
  const zUp = (tiles: number) => up(tiles * METRES_PER_TILE);
  const x0 = inset; const x1 = long - inset;
  const vaults = depthOrder(Array.from({ length: count }, (_, i) => {
    const yc = inset + bay * (i + 0.5);
    return alongW ? { col: col + x0, row: row + yc - R, w: x1 - x0, h: R * 2, yc } : { col: col + yc - R, row: row + x0, w: R * 2, h: x1 - x0, yc };
  }));
  return (
    <g className="gallery-vaults">
      {vaults.map(({ yc }, vi) => {
        const prof = (k: number) => {
          const ph = (k / K) * Math.PI;
          return [yc - Math.cos(ph) * R, zUp(R) * 0.78 * Math.sin(ph)] as const;
        };
        const quads: React.JSX.Element[] = [];
        for (let k = 0; k < K; k++) {
          const [ya, za] = prof(k); const [yb, zb] = prof(k + 1);
          for (let m = 0; m < M; m++) {
            const xa = x0 + ((x1 - x0) * m) / M; const xb = x0 + ((x1 - x0) * (m + 1)) / M;
            // Up the curve, then along: wound about the inward normal.
            const q = [W(xa, ya, base + za), W(xa, yb, base + zb), W(xb, yb, base + zb), W(xb, ya, base + za)];
            if (!seen(q)) continue;
            quads.push(<polygon key={`${k}-${m}`} points={polyPoints(q)} fill={shade(NORTH_LIGHT_GLASS, 0.9 + 0.2 * Math.sin(((k + 0.5) / K) * Math.PI))} stroke={pal.roofDeck} strokeWidth={0.5} />);
          }
        }
        const end = (x: number, outwardSign: number) => {
          const pts = Array.from({ length: K + 1 }, (_, k) => { const [y, z] = prof(k); return W(x, y, base + z); });
          // Over the crown, the profile winds about -x: the far end's way,
          // which the seen test (inward winding) wants at the near end.
          const q = outwardSign > 0 ? pts : [...pts].reverse();
          const dir: FaceDir = alongW ? (outwardSign > 0 ? 'posCol' : 'negCol') : (outwardSign > 0 ? 'posRow' : 'negRow');
          return seen(q) ? <polygon key={`e${x}`} points={polyPoints(pts)} fill={pal.wall[dir]} stroke={pal.roofDeck} strokeWidth={0.5} /> : null;
        };
        return (
          <g key={vi}>
            {end(x0, -1)}
            {end(x1, 1)}
            {quads}
          </g>
        );
      })}
    </g>
  );
}

// A forecourt sculpture before the Museum's front: a red steel cube on its
// corner to one side of the way in, a bronze figure on a plinth to the other.
function ForecourtSculpture({ cc, cr, kind, stone }: { cc: number; cr: number; kind: 'cube' | 'figure'; stone: StonePalette }) {
  if (kind === 'cube') {
    // A great red steel cube balanced on one corner (Noguchi's Red Cube):
    // its faces wound about their outward normals, each drawn where it
    // faces the camera, lit by the way it points.
    const a = 6;
    const n0 = [1 / Math.sqrt(2), -1 / Math.sqrt(2), 0];
    const n1 = [1 / Math.sqrt(6), 1 / Math.sqrt(6), -2 / Math.sqrt(6)];
    const n2 = [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)];
    // A cube corner (±1 each way) in metres: the long diagonal stood upright.
    const world = (v: number[]) => {
      const x = (v[0]! * n0[0]! + v[1]! * n0[1]! + v[2]! * n0[2]!) * a / 2;
      const y = (v[0]! * n1[0]! + v[1]! * n1[1]! + v[2]! * n1[2]!) * a / 2;
      const z = (v[0]! * n2[0]! + v[1]! * n2[1]! + v[2]! * n2[2]!) * a / 2 + (a * Math.sqrt(3)) / 2;
      return { x, y, z };
    };
    const at = (q: { x: number; y: number; z: number }) => lift(project(cc + across(q.x), cr + across(q.y)), up(q.z));
    const area = (q: Pt[]) => q.reduce((acc, p, i) => { const m = q[(i + 1) % q.length]!; return acc + p.x * m.y - m.x * p.y; }, 0);
    const deck = Math.sign(area([lift(project(0, 0), 0), lift(project(1, 0), 0), lift(project(1, 1), 0), lift(project(0, 1), 0)]));
    const faces = [0, 1, 2].flatMap((axis) => [-1, 1].map((sign) => {
      // The four corners round the face, counterclockwise about its normal.
      const [i, j] = [(axis + 1) % 3, (axis + 2) % 3];
      const ring = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([p, q]) => { const v = [0, 0, 0]; v[axis] = sign; v[i] = p!; v[j] = q!; return v; });
      const corners = (sign > 0 ? ring : [...ring].reverse()).map(world);
      const normal = world([axis === 0 ? sign : 0, axis === 1 ? sign : 0, axis === 2 ? sign : 0]);
      return { pts: corners.map(at), lightness: 0.78 + 0.22 * ((normal.z - (a * Math.sqrt(3)) / 2) / (a / 2)) - 0.1 * (normal.x / (a / 2)) };
    }));
    return (
      <g className="museum-sculpture museum-red-cube">
        <polygon points={polyPoints(projectedCircle(cc, cr, across(2.2), 16))} fill={shade(stone.towerStone, 0.78)} />
        {faces.filter((f) => Math.sign(area(f.pts)) === deck).map((f, i) => (
          <polygon key={i} points={polyPoints(f.pts)} fill={shade(SIGNAL_RED, Math.max(0.6, Math.min(1.2, f.lightness)))} stroke="rgba(60, 20, 14, 0.5)" strokeWidth={0.6} />
        ))}
      </g>
    );
  }
  const s = across(2.8);
  const plinthH = up(3.6);
  const plinth = boxFaces(cc - s / 2, cr - s / 2, s, s, 0, plinthH);
  const BRONZE_FIGURE = '#4c4232';
  const foot = lift(project(cc, cr), plinthH);
  const k = heightScale();
  const m = up(1.9);
  return (
    <g className="museum-sculpture museum-statue">
      {sideFaces(plinth, shade(stone.towerStone, 0.92), shade(stone.towerStone, 0.74))}
      <polygon points={polyPoints(plinth.top)} fill={stone.towerStone} />
      {/* A standing figure, an arm raised: body, head, arm. */}
      <polygon points={polyPoints([
        { x: foot.x - m * 0.45, y: foot.y }, { x: foot.x + m * 0.45, y: foot.y },
        { x: foot.x + m * 0.4, y: foot.y - m * 2.4 * k }, { x: foot.x + m * 0.5, y: foot.y - m * 3.1 * k },
        { x: foot.x - m * 0.5, y: foot.y - m * 3.1 * k }, { x: foot.x - m * 0.4, y: foot.y - m * 2.4 * k },
      ])} fill={BRONZE_FIGURE} />
      <circle cx={foot.x} cy={foot.y - m * 3.55 * k} r={m * 0.42} fill={BRONZE_FIGURE} />
      <line x1={foot.x + m * 0.45} y1={foot.y - m * 3 * k} x2={foot.x + m * 1.1} y2={foot.y - m * 4.2 * k} stroke={BRONZE_FIGURE} strokeWidth={m * 0.35} strokeLinecap="round" />
    </g>
  );
}

// The Museum (a function the canvas walker calls through): a paved
// forecourt over its whole plot, the gallery set back on it, deepest at the
// building's own front (four-way facing), where two sculptures flank the
// walk to its door. With the front turned away the forecourt lies behind
// the gallery, which hides its pieces.
function MuseumCourt({ t, p, material, vernacular, glyphs }: {
  t: Buildable; p: Plot; material: Material; vernacular: Vernacular; glyphs?: string;
}) {
  const { col, row, w, h } = p;
  const c = MUSEUM_COURT;
  const fw = frontWidth(p); const fd = frontDepth(p);
  const inner: Plot = { ...localBox(p, c * 0.7, c * 1.9, fw - c * 0.7, fd - c * 0.5), facing: p.facing };
  const stone = stoneFor(vernacular);
  const pave = stone.trim !== 'none' ? shade(stone.trim, 0.96) : shade(stone.towerStone, 0.94);
  const court = boxFaces(col, row, w, h, 0, 0).top;
  const sculptures = depthOrder((['cube', 'figure'] as const).map((kind, i) => {
    const at = localToGrid(p, fw * (i === 0 ? 0.24 : 0.76), c * 0.95);
    return { col: at.col - 0.3, row: at.row - 0.3, w: 0.6, h: 0.6, cc: at.col, cr: at.row, kind };
  })).map((s0) => <ForecourtSculpture key={s0.kind} cc={s0.cc} cr={s0.cr} kind={s0.kind} stone={stone} />);
  const frontSeen = sideSeen(p.facing, 'front');
  const joints = [0.25, 0.5, 0.75].flatMap((k) => [
    [project(col + w * k, row), project(col + w * k, row + h)],
    [project(col, row + h * k), project(col + w, row + h * k)],
  ]).map(([a, b]) => `M${a!.x.toFixed(1)},${a!.y.toFixed(1)}L${b!.x.toFixed(1)},${b!.y.toFixed(1)}`).join('');
  return (
    <>
      <polygon className="museum-forecourt" points={polyPoints(court)} fill={pave} />
      <path d={joints} stroke="rgba(60, 54, 44, 0.18)" strokeWidth={0.6} fill="none" />
      {/* The way in: a darker paved walk from the front edge to the door. */}
      {(() => { const b = localBox(p, fw / 2 - across(3), 0, fw / 2 + across(3), c * 1.9); return <polygon className="museum-walk" points={polyPoints(boxFaces(b.col, b.row, b.w, b.h, 0, 0).top)} fill={shade(pave, 0.86)} />; })()}
      {!frontSeen && sculptures}
      <BuildingMass t={t} p={inner} material={material} vernacular={vernacular} developing={false} glyphs={glyphs} />
      {frontSeen && sculptures}
    </>
  );
}

// --- The dining halls (Plan 87D; buildingSpec's diningPlan) ---------------
// One low hipped shed, scaled up, read as a barn at the large sizes. Now a
// café under a striped awning with tables by its door; a hall standing back
// from a dining terrace of tables under parasols, its ground floor in tall
// windows; and from the 9x6 up a refectory: one tall room under a steep roof,
// tall windows down its front and a louvre or a cupola on its ridge (Christ
// Church's hall, Harvard's Annenberg), the kitchen and its flues at the
// service end and a lower range behind. Mission's hall keeps its tile behind
// an arcade; Modern's is a glass pavilion under a deep oversailing roof; Art
// Deco's tall slots run up to a stepped frontispiece. The plan is the
// building's own (four-way facing): the terrace on its front, the kitchen
// at its right-hand end, the service range and its yard (a service door,
// the bins) along its back; turned away, the terrace lies behind the hall.
// Everything stands inside the footprint.

// A point on the terrace: x down the long axis, y in from its outer edge.
type TerraceAt = (x: number, y: number) => { col: number; row: number };
const FRONT_RING: readonly FaceDir[] = ['posRow', 'negCol', 'negRow', 'posCol'];
function terraceFrame(plan: DiningPlan): TerraceAt {
  // The terrace in the building's frame: x from its left, y in from its edge.
  const at = { ...plan.terrace, facing: FRONT_RING.indexOf(plan.front) as Facing };
  return (x, y) => localToGrid(at, x, y);
}

// Café parasols, two stripes each; Modern's all in one orange and white.
const PARASOL_STRIPES: ReadonlyArray<readonly [string, string]> = [
  [SIGNAL_RED, '#f2e8d4'], ['#2f6b4a', '#efe6c8'], ['#2b3f6b', '#f2e8d4'],
];
const PARASOL_PLAIN: ReadonlyArray<readonly [string, string]> = [['#e07b3c', '#f4f2ec']];
const TABLE_TOP = '#ece6d6';
const CHAIR = '#5b4a3c';
const PARASOL_RADIUS = across(1.5);

// A table under a parasol: the pole, the table, then the canopy's eight
// gores back to front, a shade darker on the side away from the sun.
function Parasol({ cc, cr, stripes }: { cc: number; cr: number; stripes: readonly [string, string] }) {
  const n = 8;
  const foot = project(cc, cr);
  const apex = lift(foot, up(2.8));
  const rim = projectedCircle(cc, cr, PARASOL_RADIUS, n).map((q) => lift(q, up(2.15)));
  const sunSide = sunScreenDir().x <= 0 ? -1 : 1;
  const gores = rim.map((q, i) => {
    const q2 = rim[(i + 1) % n]!;
    return { i, pts: [apex, q, q2], y: (q.y + q2.y) / 2, lit: ((q.x + q2.x) / 2 - apex.x) * sunSide >= 0 };
  }).sort((a, b) => a.y - b.y);
  return (
    <>
      <line x1={foot.x} y1={foot.y} x2={apex.x} y2={apex.y} stroke="#4a4540" strokeWidth={0.9} />
      <polygon points={polyPoints(projectedCircle(cc, cr, across(0.6), 12).map((q) => lift(q, up(0.75))))} fill={TABLE_TOP} />
      {gores.map((g) => (
        <polygon key={g.i} points={polyPoints(g.pts)} fill={shade(stripes[g.i % 2]!, g.lit ? 1 : 0.84)} />
      ))}
    </>
  );
}

// A bare table with a chair either side along the terrace, far chair first.
function CafeTable({ cc, cr, alongW }: { cc: number; cr: number; alongW: boolean }) {
  const s = across(0.55); const off = across(1.0);
  const chairs = [-1, 1].map((k) => (alongW ? { col: cc + k * off - s / 2, row: cr - s / 2 } : { col: cc - s / 2, row: cr + k * off - s / 2 }))
    .map((c) => ({ ...c, y: project(c.col + s / 2, c.row + s / 2).y }))
    .sort((a, b) => a.y - b.y);
  const top = lift(project(cc, cr), up(0.75));
  const chair = (c: { col: number; row: number }, i: number) => {
    const f = boxFaces(c.col, c.row, s, s, 0, up(0.9));
    return <g key={i}>{sideFaces(f, CHAIR, shade(CHAIR, 0.8))}<polygon points={polyPoints(f.top)} fill={shade(CHAIR, 1.15)} /></g>;
  };
  return (
    <>
      {chair(chairs[0]!, 0)}
      <line x1={top.x} y1={top.y} x2={top.x} y2={project(cc, cr).y} stroke="#4a4540" strokeWidth={0.9} />
      <polygon points={polyPoints(projectedCircle(cc, cr, across(0.6), 12).map((q) => lift(q, up(0.75))))} fill={TABLE_TOP} stroke="rgba(60, 54, 44, 0.35)" strokeWidth={0.5} />
      {chair(chairs[1]!, 1)}
    </>
  );
}

// A clipped shrub in a planter at the terrace's corners and its way in.
function Planter({ cc, cr }: { cc: number; cr: number }) {
  const s = across(1.4);
  const f = boxFaces(cc - s / 2, cr - s / 2, s, s, 0, up(0.7));
  const bush = boxFaces(cc - s * 0.42, cr - s * 0.42, s * 0.84, s * 0.84, up(0.7), up(0.8));
  return (
    <>
      {sideFaces(f, '#8b8273', '#6f675b')}
      <polygon className="ground-hedge-top" points={polyPoints(bush.left)} />
      <polygon className="ground-hedge-top" points={polyPoints(bush.right)} />
      <polygon className="ground-hedge-top" points={polyPoints(bush.top)} />
    </>
  );
}

// The terrace's paving: under everything, drawn first.
function TerracePaving({ plan }: { plan: DiningPlan }) {
  const b = plan.terrace;
  return <polygon className="ground-deck" points={polyPoints(boxFaces(b.col, b.row, b.w, b.h, 0, 0).top)} />;
}

// What stands on the terrace, back to front: parasols in the front row,
// bare tables nearer the wall, planters at the corners and either side of
// the way in. `free` is the depth clear of the walls and whatever stands
// against them; `doorAt` where the way in crosses it.
function TerraceFurniture({ plan, doorAt, free, cafe, plain }: {
  plan: DiningPlan; doorAt: number; free: number; cafe: boolean; plain: boolean;
}) {
  const at = terraceFrame(plan);
  const b = plan.terrace;
  const L = plan.alongW ? b.w : b.h;
  const stripes = plain ? PARASOL_PLAIN : PARASOL_STRIPES;
  const clear = 0.62;           // the steps and the way in, either side of the door
  const xs = (first: number, step: number, max: number) => {
    const out: number[] = [];
    for (let k = 0; k < max; k++) {
      for (const sign of [-1, 1]) {
        const x = doorAt + sign * (first + k * step);
        if (x > 0.3 && x < L - 0.3) out.push(x);
      }
    }
    return out;
  };
  type Item = DepthBox & { kind: 'parasol' | 'table' | 'planter'; cc: number; cr: number; i: number };
  const items: Item[] = [];
  const put = (kind: Item['kind'], x: number, y: number) => {
    const c = at(x, y);
    const r = kind === 'parasol' ? PARASOL_RADIUS : across(1.0);
    items.push({ kind, cc: c.col, cr: c.row, col: c.col - r, row: c.row - r, w: r * 2, h: r * 2, i: items.length });
  };
  if (cafe) {
    for (const x of xs(clear + 0.2, 0.75, L > 4 ? 2 : 1)) put('parasol', x, free * 0.5);
  } else {
    for (const x of xs(clear + 0.15, 0.8, 8)) put('parasol', x, 0.42);
    if (free >= 1.1) for (const x of xs(clear + 0.55, 0.8, 8)) put('table', x, free - 0.3);
  }
  for (const x of [0.14, L - 0.14, doorAt - clear + 0.12, doorAt + clear - 0.12]) put('planter', x, 0.13);
  return (
    <>
      {depthOrder(items).map((it) => (
        it.kind === 'parasol' ? <Parasol key={it.i} cc={it.cc} cr={it.cr} stripes={stripes[it.i % stripes.length]!} />
          : it.kind === 'table' ? <CafeTable key={it.i} cc={it.cc} cr={it.cr} alongW={plan.alongW} />
            : <Planter key={it.i} cc={it.cc} cr={it.cr} />
      ))}
    </>
  );
}

// The café's striped awning, either side of its door: sloping out from
// under the eaves over the tables, with a scalloped valance.
function CafeAwning({ plan, d, H }: { plan: DiningPlan; d: DoorDimensions | null; H: number }) {
  const b = plan.hall;
  const f = boxFaces(b.col, b.row, b.w, b.h, 0, H);
  const wall = wallOf(f, plan.front);
  if (!wall.visible) return null;
  const span = wallSpan(b.w, b.h, plan.front);
  const out = outwardOf(plan.front);
  const o0 = project(0, 0); const o1 = project(out.col * across(1.8), out.row * across(1.8));
  const dx = o1.x - o0.x; const dy = o1.y - o0.y;
  const z1 = Math.min(up(3.3), H - EAVES_COURSE * 1.2); const z0 = z1 - up(0.95);
  const inner = (u: number) => facePoint(wall.origin, wall.along, H, u, z1 / H);
  const outer = (u: number, z: number) => { const q = facePoint(wall.origin, wall.along, H, u, z / H); return { x: q.x + dx, y: q.y + dy }; };
  const gap = d ? (d.widthTiles * 0.85 + 0.08) / span : 0.1;
  const runs: Array<[number, number]> = [[0.06, 0.5 - gap], [0.5 + gap, 0.94]];
  return (
    <g className="sig-awning">
      {runs.filter(([u0, u1]) => u1 - u0 > 0.05).map(([u0, u1], r) => {
        const n = Math.max(3, Math.round(((u1 - u0) * span) / across(1.1)));
        return (
          <g key={r}>
            {Array.from({ length: n }, (_, i) => {
              const a = u0 + ((u1 - u0) * i) / n; const c = u0 + ((u1 - u0) * (i + 1)) / n;
              const tone = i % 2 === 0 ? SIGNAL_RED : '#f2e8d4';
              return (
                <g key={i}>
                  <polygon points={polyPoints([inner(a), inner(c), outer(c, z0), outer(a, z0)])} fill={tone} />
                  <polygon points={polyPoints([outer(a, z0), outer(c, z0), outer((a + c) / 2, z0 - up(0.45))])} fill={shade(tone, 0.82)} />
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

// A regular prism's visible sides and its top ring: `n` corners of radius
// `r` about (cc, cr), from z0 to z1. The faces toward the camera are those
// whose foot lies nearer than the centre's.
function prismSides(cc: number, cr: number, r: number, n: number, z0: number, z1: number) {
  const ring = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + Math.PI / n;
    return project(cc + Math.cos(a) * r, cr + Math.sin(a) * r);
  });
  const centre = project(cc, cr);
  const sunSide = sunScreenDir().x <= 0 ? -1 : 1;
  const faces = ring.map((q, i) => {
    const q2 = ring[(i + 1) % n]!;
    const mid = { x: (q.x + q2.x) / 2, y: (q.y + q2.y) / 2 };
    return { i, pts: [lift(q, z0), lift(q2, z0), lift(q2, z1), lift(q, z1)], seen: mid.y > centre.y, lit: (mid.x - centre.x) * sunSide >= 0 };
  }).filter((fc) => fc.seen);
  return { faces, top: ring.map((q) => lift(q, z1)), apexAt: (z: number) => lift(centre, z), ring };
}

// The ridge's lantern: a medieval hall's louvre, open-slatted under a lead
// spirelet, or a white cupola under a lead dome.
function HallLantern({ kind, cc, cr, base, stone }: {
  kind: RefectoryLantern; cc: number; cr: number; base: number; stone: StonePalette;
}) {
  if (kind === 'none') return null;
  if (kind === 'cupola') {
    const r = across(2.2);
    const side = r / 0.2;
    return <Dome col={cc - side / 2} row={cr - side / 2} w={side} h={side} base={base} stone={stone} hemisphere />;
  }
  const r = across(2.1); const rise = up(3.6); const cap = up(5.2);
  const drum = prismSides(cc, cr, r, 6, base, base + rise);
  const tip = drum.apexAt(base + rise + cap);
  const capFaces = drum.top.map((q, i) => {
    const q2 = drum.top[(i + 1) % 6]!;
    return { i, pts: [q, q2, tip], y: (q.y + q2.y) / 2, lit: ((q.x + q2.x) / 2 - tip.x) * (sunScreenDir().x <= 0 ? -1 : 1) >= 0 };
  }).sort((a, b) => a.y - b.y);
  const timber = shade(LEAD, 1.28);
  return (
    <>
      {drum.faces.map((fc) => (
        <g key={fc.i}>
          <polygon points={polyPoints(fc.pts)} fill={shade(timber, fc.lit ? 1 : 0.8)} />
          {/* The louvre's open slats, between corner posts. */}
          <polygon className="iso-louvre" points={polyPoints([
            lerpPt(lerpPt(fc.pts[0]!, fc.pts[1]!, 0.16), lerpPt(fc.pts[3]!, fc.pts[2]!, 0.16), 0.14),
            lerpPt(lerpPt(fc.pts[0]!, fc.pts[1]!, 0.84), lerpPt(fc.pts[3]!, fc.pts[2]!, 0.84), 0.14),
            lerpPt(lerpPt(fc.pts[0]!, fc.pts[1]!, 0.84), lerpPt(fc.pts[3]!, fc.pts[2]!, 0.84), 0.86),
            lerpPt(lerpPt(fc.pts[0]!, fc.pts[1]!, 0.16), lerpPt(fc.pts[3]!, fc.pts[2]!, 0.16), 0.86),
          ])} />
        </g>
      ))}
      {capFaces.map((fc) => <polygon key={`c${fc.i}`} points={polyPoints(fc.pts)} fill={shade(LEAD, fc.lit ? 1.05 : 0.82)} />)}
      <GiltFinial at={tip} rise={up(2.2)} stone={stone} />
    </>
  );
}
// Harborview Market, the market hall (Plan 87D), and its glass roof.
const MARKET_HALL_ID = 'DININGHALL-07';
const MARKET_GLASS = '#a9c3cf';
// A terrace hall's ground-floor windows: low sills and tall panes.
const DINING_TALL_SILL = up(0.45);
const DINING_TALL_PANE = up(3.0);
const lerpPt = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

// A box grown toward one wall: the oversailing roof's plan.
function grownToward(b: ChapelBox, dir: FaceDir, by: number): ChapelBox {
  switch (dir) {
    case 'posRow': return { ...b, h: b.h + by };
    case 'negRow': return { ...b, row: b.row - by, h: b.h + by };
    case 'posCol': return { ...b, w: b.w + by };
    default: return { ...b, col: b.col - by, w: b.w + by };
  }
}

// The refectory: the hall, its kitchen and its back range in depthOrder,
// with the buttresses and arcade on the hall's front, then the terrace.
function Refectory({ t, plan, vernacular, pal, stone }: {
  t: Buildable; plan: DiningPlan; vernacular: Vernacular; pal: Palette; stone: StonePalette;
}) {
  // Harborview Market is a market hall (Covent Garden's, Boston's Quincy
  // Market): stalls under awnings in open arches, a glass roof on iron ribs
  // and a glazed monitor down its ridge, in every set (a flat one glazed in
  // strips).
  const market = t.id === MARKET_HALL_ID;
  const spec = market && REFECTORIES[vernacular].roof === 'mansard' ? { ...REFECTORIES[vernacular], roof: 'gable' as const } : REFECTORIES[vernacular];
  const glassPal = paletteFrom({ wall: pal.wall.posRow, roof: MARKET_GLASS });
  const H = wallHeightOf(t);
  const ridge = ridgeOf(t, vernacular);
  const trim = hasTrim(vernacular);
  const trimStone = trim ? stone.trim : stone.towerStone;
  const parts = partsFor(vernacular);
  const door = doorOf(t);
  const hall = plan.hall; const kitchen = plan.kitchen!; const back = plan.back!;
  const { alongW } = plan;
  const KH = H * REFECTORY_KITCHEN_EAVES; const BH = H * REFECTORY_BACK_EAVES;
  const pitched = spec.roof !== 'flat';
  const glazed = spec.window === 'glazed';
  const shape: WindowShape = spec.window === 'glazed' ? 'rect' : spec.window;
  const doorShape = shape === 'arched' || shape === 'lancet' ? 'arched' : 'rect';
  const freeEnd = opposite(plan.service);
  const eaves = eavesOf(vernacular);
  const oversail = across(spec.oversailMetres);
  const T = alongW ? plan.terrace.h : plan.terrace.w;
  const hallLen = alongW ? hall.w : hall.h;
  const G = alongW ? hall.h : hall.w;
  const seen = visibleWalls();
  const isSeen = (dir: FaceDir) => dir === seen.left || dir === seen.right;
  // The front's bays: odd, so the door has the middle one.
  const bays = Math.max(5, Math.round((hallLen * METRES_PER_TILE) / 6.4) | 1);
  const winW = across(shape === 'slot' ? 1.3 : 2.4);
  const sill = up(3.4); const head = H - up(1.9);
  // Art Deco's door stands in a stepped frontispiece carried above the parapet.
  const deco = spec.window === 'slot' && !market;
  const frontis = deco ? againstWall(hall.col, hall.row, hall.w, hall.h, plan.front, hallLen / 2 - across(6), across(12), across(0.9)) : null;

  const doorway = (b: ChapelBox, dir: FaceDir, height: number) => {
    if (!door) return null;
    const f = boxFaces(b.col, b.row, b.w, b.h, 0, height);
    const wall = wallOf(f, dir);
    if (!wall.visible) return null;
    const span = wallSpan(b.w, b.h, dir);
    const at = outsideWall(b.col, b.row, b.w, b.h, dir, span / 2, 0);
    const out = outwardOf(dir);
    return (
      <>
        <Door d={door} origin={wall.origin} along={wall.along} wallHeight={height} span={span} side={dir} shape={doorShape} />
        <EntranceSteps d={door} centreCol={at.col} centreRow={at.row} outCol={out.col} outRow={out.row} span={span} stone={stone} />
      </>
    );
  };

  // The market's front: open arches, the stalls' striped awnings inside
  // them, a glazed band above.
  const marketFront = (face: ChapelFace, height: number, n: number) => {
    const archTop = Math.min(0.62, (height - up(3.5)) / height);
    const midBay = (n - 1) / 2;
    const arches: string[] = [];
    const awnings: React.JSX.Element[] = [];
    for (let b = 0; b < n; b++) {
      const u0 = (b + 0.12) / n; const u1 = (b + 0.88) / n;
      arches.push(`M${polyPoints(windowOutline('arched', u0, u1, BASE_COURSE / height, archTop).map(([u, v]) => facePoint(face.o, face.a, height, u, v))).replace(/ /g, 'L')}Z`);
      if (b === midBay) continue;
      const k = 4;
      for (let i = 0; i < k; i++) {
        const a = u0 + ((u1 - u0) * (i + 0.5)) / (k + 1); const c = u0 + ((u1 - u0) * (i + 1.5)) / (k + 1);
        const tone = PARASOL_STRIPES[b % PARASOL_STRIPES.length]![i % 2]!;
        awnings.push(<polygon key={`aw${b}-${i}`} points={polyPoints(wallQuad(face.o, face.a, height, a, c, up(2.4), up(3.2)))} fill={tone} />);
      }
    }
    return (
      <>
        <path className="iso-undercroft" d={arches.join('')} />
        {awnings}
        {tallWindows(face, height, Array.from({ length: n }, (_, b) => (b + 0.5) / n), 0.36 / n, archTop + 0.08, (height - up(1.6)) / height, 'rect', 'mk')}
      </>
    );
  };
  // Iron ribs down the glass roof's slopes at the bays.
  const marketRibs = (rf: BoxFaces, rs: Pt, re: Pt, height: number) => {
    const n = bays * 2;
    const eave = (dir: FaceDir) => wallOf(rf, dir);
    const d: string[] = [];
    for (const dir of [plan.front, opposite(plan.front)]) {
      const e = eave(dir);
      if (!e.visible && dir !== plan.front) continue;
      // The eave's ends in grid order, matched to the ridge's.
      const a0 = lift(e.origin, height); const a1 = lift(e.along, height);
      const flip = Math.hypot(a0.x - rs.x, a0.y - rs.y) > Math.hypot(a1.x - rs.x, a1.y - rs.y);
      const [p0, p1] = flip ? [a1, a0] : [a0, a1];
      for (let i = 1; i < n; i++) {
        const u = i / n;
        const q = lerpPt(p0, p1, u); const r = lerpPt(rs, re, u);
        d.push(`M${q.x.toFixed(1)},${q.y.toFixed(1)}L${r.x.toFixed(1)},${r.y.toFixed(1)}`);
      }
    }
    return <path d={d.join('')} stroke="rgba(52, 60, 66, 0.55)" strokeWidth={0.8} fill="none" />;
  };
  // A glazed monitor astride the ridge, down the middle of the hall.
  const ridgeMonitor = () => {
    const span = across(3.2);
    const len = hallLen * 0.7;
    const b = alongW
      ? { col: hall.col + (hallLen - len) / 2, row: hall.row + hall.h / 2 - span / 2, w: len, h: span }
      : { col: hall.col + hall.w / 2 - span / 2, row: hall.row + (hallLen - len) / 2, w: span, h: len };
    const z0 = H + ridge * (1 - span / G) - up(0.3);
    const rise = H + ridge - z0 + up(2.2);
    const mf = boxFaces(b.col, b.row, b.w, b.h, z0, rise);
    const lid = paletteFrom({ wall: pal.wall.posRow, roof: LEAD });
    return (
      <>
        <polygon points={polyPoints(mf.left)} fill={shade(MARKET_GLASS, 0.9)} />
        <polygon points={polyPoints(mf.right)} fill={shade(MARKET_GLASS, 0.76)} />
        <HippedRoof col={b.col - 0.04} row={b.row - 0.04} w={b.w + 0.08} h={b.h + 0.08} base={z0 + rise} rise={up(1.4)} pal={lid} />
      </>
    );
  };

  const hallArt = () => {
    const f = boxFaces(hall.col, hall.row, hall.w, hall.h, 0, H);
    const faces = chapelFaces(f);
    const rc = hall.col - eaves; const rr = hall.row - eaves; const rw = hall.w + eaves * 2; const rh = hall.h + eaves * 2;
    const rf = boxFaces(rc, rr, rw, rh, 0, H);
    const rs = lift(alongW ? project(rc, rr + rh / 2) : project(rc + rw / 2, rr), H + ridge);
    const re = lift(alongW ? project(rc + rw, rr + rh / 2) : project(rc + rw / 2, rr + rh), H + ridge);
    const mid = alongW ? { cc: hall.col + hall.w / 2, cr: hall.row + hall.h / 2 } : { cc: hall.col + hall.w / 2, cr: hall.row + hall.h / 2 };
    const half = G / 2;
    const r0 = across(2.2);
    return (
      <>
        <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
        {trim && faces.map((face) => (
          <g key={`b${face.dir}`}>
            <WallBand origin={face.o} along={face.a} wallHeight={H} from={0} to={BASE_COURSE} className="iso-plinth" />
            <WallBand origin={face.o} along={face.a} wallHeight={H} from={H - EAVES_COURSE} to={H} className="iso-cornice" />
          </g>
        ))}
        {parts.piers && faces.map((face) => (
          <WallBand key={`g${face.dir}`} origin={face.o} along={face.a} wallHeight={H} from={H - EAVES_COURSE * 1.8} to={H - EAVES_COURSE * 0.7} className="iso-cornice" fill={face.dir === seen.left ? stone.gilt : shade(stone.gilt, 0.82)} />
        ))}
        {faces.map((face) => {
          if (face.dir === plan.service) return null;
          if (glazed) {
            return <CurtainWall key={`cw${face.dir}`} origin={face.o} along={face.a} wallHeight={H} spanTiles={face.span} from={BASE_COURSE} to={H - up(0.4)} floors={[]} id={`rf${face.dir}`} u0={0.015} u1={0.985} />;
          }
          if (face.dir === plan.front && market) return <g key={`m${face.dir}`}>{marketFront(face, H, bays)}</g>;
          if (face.dir === plan.front) {
            const doorTop = door ? (door.threshold + door.height + up(1.2)) / H : sill / H;
            const centres = Array.from({ length: bays }, (_, b) => (b + 0.5) / bays);
            const midBay = (bays - 1) / 2;
            return (
              <g key={`w${face.dir}`}>
                {tallWindows(face, H, centres.filter((_, b) => b !== midBay), winW / face.span / 2, sill / H, head / H, shape, `fw${face.dir}`)}
                {!frontis && doorTop < head / H - 0.12 && tallWindows(face, H, [0.5], winW / face.span / 2, doorTop, head / H, shape, `dw${face.dir}`)}
              </g>
            );
          }
          // The free end: a great window over its door.
          const doorTop = door ? (door.threshold + door.height + up(1.4)) / H : sill / H;
          return <g key={`e${face.dir}`}>{tallWindows(face, H, [0.5], Math.min(0.2, across(4.4) / face.span / 2), doorTop, head / H, shape, `ew${face.dir}`)}</g>;
        })}
        {!frontis && doorway(hall, plan.front, H)}
        {doorway(hall, freeEnd, H)}
        {parts.brackets && pitched && faces.map((face) => (
          <EavesBrackets key={`k${face.dir}`} origin={face.o} along={face.a} wallHeight={H} span={face.span} top={H} stone={stone} />
        ))}
        {eaves > 0 && faces.map((face) => (
          <WallBand key={`es${face.dir}`} origin={face.o} along={face.a} wallHeight={H} from={H - up(0.9)} to={H} className="iso-eaves-shadow" />
        ))}
        {spec.roof === 'gable' && (
          <>
            {gableSlopes(rf, alongW, rs, re, market ? glassPal : pal)}
            {gableEnds(rf, alongW, rs, re, pal)}
            <line className="iso-ridge" x1={rs.x} y1={rs.y} x2={re.x} y2={re.y} />
            {market && marketRibs(rf, rs, re, H)}
          </>
        )}
        {market && spec.roof === 'flat' && [0.25, 0.5, 0.75].map((v) => {
          const sb = alongW
            ? { col: hall.col + hall.w * 0.06, row: hall.row + hall.h * v - across(2), w: hall.w * 0.88, h: across(4) }
            : { col: hall.col + hall.w * v - across(2), row: hall.row + hall.h * 0.06, w: across(4), h: hall.h * 0.88 };
          return <polygon key={`sk${v}`} points={polyPoints(boxFaces(sb.col, sb.row, sb.w, sb.h, H + 1, 0).top)} fill={MARKET_GLASS} />;
        })}
        {spec.roof === 'mansard' && <MansardRoof col={hall.col} row={hall.row} w={hall.w} h={hall.h} base={H} rise={ridge} pal={pal} stone={stone} />}
        {spec.roof === 'flat' && <polygon points={polyPoints(f.top)} fill={pal.roofDeck} />}
        {/* The lantern astride the ridge, footed where the slopes meet it. */}
        {spec.roof === 'gable' && market && ridgeMonitor()}
        {spec.roof === 'gable' && !market && (
          <HallLantern kind={spec.lantern} cc={mid.cc} cr={mid.cr} base={H + ridge * (1 - r0 / half) - up(0.4)} stone={stone} />
        )}
        {spec.roof === 'mansard' && <HallLantern kind={spec.lantern} cc={mid.cc} cr={mid.cr} base={H + ridge + up(1.0)} stone={stone} />}
      </>
    );
  };

  // Modern: the roof slab oversails the terrace on slender steel posts.
  const slabArt = () => {
    const s = grownToward(hall, plan.front, oversail);
    const T0 = up(1.1);
    const sf = boxFaces(s.col, s.row, s.w, s.h, H, T0);
    const n = bays + 1;
    const posts = depthOrder(Array.from({ length: n }, (_, i) => {
      const along = (i / (n - 1)) * (hallLen - across(0.6));
      return againstWall(hall.col, hall.row, hall.w, hall.h, plan.front, along, across(0.6), across(0.6), -(oversail - across(0.6)));
    }));
    return (
      <>
        {posts.map((q, i) => {
          const pf = boxFaces(q.col, q.row, q.w, q.h, 0, H);
          return <g key={i}>{sideFaces(pf, '#3c4146', '#2d3135')}</g>;
        })}
        {sideFaces(sf, shade(stone.towerStone, 0.96), shade(stone.towerStone, 0.78))}
        <polygon points={polyPoints(sf.top)} fill={pal.roofDeck} />
      </>
    );
  };

  // Art Deco: two stepped stages over the door, banded in gilt.
  const frontisArt = () => {
    if (!frontis) return null;
    const tiers = [[frontis, H + up(3.2)], [againstWall(hall.col, hall.row, hall.w, hall.h, plan.front, hallLen / 2 - across(3.6), across(7.2), across(0.9)), H + up(6.4)]] as const;
    const wall = shade(pal.wall.posRow, 1.04);
    return (
      <>
        {tiers.map(([b, top], i) => {
          const f = boxFaces(b.col, b.row, b.w, b.h, i === 0 ? 0 : H, i === 0 ? top : top - H);
          const height = i === 0 ? top : top - H;
          const face = wallOf(f, plan.front);
          const span = wallSpan(b.w, b.h, plan.front);
          return (
            <g key={i}>
              {sideFaces(f, wall, shade(wall, 0.8))}
              <polygon points={polyPoints(f.top)} fill={shade(wall, 0.92)} />
              <WallBand origin={face.origin} along={face.along} wallHeight={height} from={height - up(0.9)} to={height - up(0.3)} className="iso-cornice" fill={stone.gilt === NO_STONE ? undefined : stone.gilt} />
              {i === 0 && (
                <>
                  {tallWindows({ dir: plan.front, o: face.origin, a: face.along, span }, height, [0.5], across(1.6) / span, (door ? door.threshold + door.height + up(1.0) : sill) / height, (H - up(1.2)) / height, 'slot', 'fx')}
                  {door && <Door d={door} origin={face.origin} along={face.along} wallHeight={height} span={span} side={plan.front} />}
                  {door && (() => {
                    const at = outsideWall(b.col, b.row, b.w, b.h, plan.front, span / 2, 0);
                    const out = outwardOf(plan.front);
                    return <EntranceSteps d={door} centreCol={at.col} centreRow={at.row} outCol={out.col} outRow={out.row} span={span} stone={stone} />;
                  })()}
                </>
              )}
            </g>
          );
        })}
      </>
    );
  };

  // The kitchen: a lower block with its tall flues, and a service door.
  const kitchenArt = () => {
    const f = boxFaces(kitchen.col, kitchen.row, kitchen.w, kitchen.h, 0, KH);
    const faces = chapelFaces(f);
    const kAlongW = kitchen.w >= kitchen.h;
    const rise = pitched ? Math.min(ridge * 0.55, up(7)) : 0;
    const along = (u: number) => (kAlongW
      ? { cc: kitchen.col + kitchen.w * u, cr: kitchen.row + kitchen.h / 2 }
      : { cc: kitchen.col + kitchen.w / 2, cr: kitchen.row + kitchen.h * u });
    // Four stacks round a pitched kitchen's hips (the Abbot's Kitchen at
    // Glastonbury, Christ Church's), each footed on its slope; three flues
    // in a row on a flat one.
    const inset = Math.min(kitchen.w, kitchen.h) / 2;
    const stacks = pitched
      ? [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]].map(([u, v]) => {
        const du = Math.min(u, 1 - u) * kitchen.w; const dv = Math.min(v, 1 - v) * kitchen.h;
        return { cc: kitchen.col + kitchen.w * u, cr: kitchen.row + kitchen.h * v, foot: KH + rise * Math.min(1, du / inset, dv / inset) };
      })
      : [0.3, 0.5, 0.7].map((u) => ({ ...along(u), foot: KH }));
    const service = doorDimensions('service');
    return (
      <>
        <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
        {trim && faces.map((face) => (
          <g key={`b${face.dir}`}>
            <WallBand origin={face.o} along={face.a} wallHeight={KH} from={0} to={BASE_COURSE} className="iso-plinth" />
            <WallBand origin={face.o} along={face.a} wallHeight={KH} from={KH - EAVES_COURSE} to={KH} className="iso-cornice" />
          </g>
        ))}
        {faces.map((face) => (
          <g key={`w${face.dir}`}>
            {windows(face.o, face.a, KH, face.span, [KH - up(1.6) - WINDOW_HEIGHT], windowWidthOf(t), `kw${face.dir}`, glazed ? 'ribbon' : shape, stone.glass)}
            {face.dir === plan.service && <Door d={service} origin={face.o} along={face.a} wallHeight={KH} span={face.span} side={face.dir} />}
          </g>
        ))}
        {pitched
          ? <HippedRoof col={kitchen.col} row={kitchen.row} w={kitchen.w} h={kitchen.h} base={KH} rise={rise} pal={pal} />
          : <polygon points={polyPoints(f.top)} fill={pal.roofDeck} />}
        {depthOrder(stacks.map((s, i) => ({ col: s.cc - 0.08, row: s.cr - 0.08, w: 0.16, h: 0.16, i, ...s }))).map((s) => (pitched ? (
          // Tall brick stacks off the kitchen's ridge: the college kitchen's mark.
          (() => {
            const plan0 = across(1.6);
            const top = KH + rise + up(4.5);
            const sf = boxFaces(s.cc - plan0 / 2, s.cr - plan0 / 2, plan0, plan0, s.foot - up(0.8), top - s.foot + up(0.8));
            const cap = boxFaces(s.cc - plan0 / 2 - 0.03, s.cr - plan0 / 2 - 0.03, plan0 + 0.06, plan0 + 0.06, top, up(0.4));
            return (
              <g key={`st${s.i}`} className="sig-kitchen">
                <polygon points={polyPoints(sf.left)} fill={pal.wallLeft} />
                <polygon points={polyPoints(sf.right)} fill={pal.wallRight} />
                {sideFaces(cap, shade(trimStone, 0.78), shade(trimStone, 0.66))}
                <polygon points={polyPoints(cap.top)} fill="#3d4043" />
              </g>
            );
          })()
        ) : (
          <g key={`st${s.i}`} className="sig-kitchen">
            <Cylinder cc={s.cc} cr={s.cr} r={across(0.7)} z0={KH} z1={KH + up(7)} fill="#8d9296" />
          </g>
        )))}
      </>
    );
  };

  // The service range along the back: its door into the kitchen yard at
  // the back wall's middle, where walkers come in, and the yard's bins.
  const backDir = opposite(plan.front);
  const serviceDoor = doorDimensions('service');
  const backArt = () => {
    if (back.w <= 0 || back.h <= 0) return null;
    const f = boxFaces(back.col, back.row, back.w, back.h, 0, BH);
    const faces = chapelFaces(f);
    const span = wallSpan(back.w, back.h, backDir);
    const bins = faces.some((face) => face.dir === backDir)
      ? depthOrder([0.5 - across(3.4) / span, 0.5 + across(2.6) / span].map((u, i) => {
        const b = againstWall(back.col, back.row, back.w, back.h, backDir, span * u - across(0.6), across(1.2), across(1.0), -across(0.3));
        return { ...b, i };
      }))
      : [];
    return (
      <>
        <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
        {faces.map((face) => windows(face.o, face.a, BH, face.span, rankSills(1), windowWidthOf(t), `bw${face.dir}`, glazed ? 'ribbon' : shape === 'slot' ? 'rect' : shape, stone.glass,
          face.dir === backDir ? doorBay(serviceDoor, face.span, BH) : undefined))}
        {faces.filter((face) => face.dir === backDir).map((face) => (
          <Door key="sd" d={serviceDoor} origin={face.o} along={face.a} wallHeight={BH} span={face.span} side={face.dir} />
        ))}
        {bins.map((b) => {
          const bf = boxFaces(b.col, b.row, b.w, b.h, 0, up(1.3));
          return <g key={`bin${b.i}`} className="sig-bins">{sideFaces(bf, '#3f5a46', '#2f4536')}<polygon points={polyPoints(bf.top)} fill="#4c6a54" /></g>;
        })}
        {pitched
          ? <HippedRoof col={back.col} row={back.row} w={back.w} h={back.h} base={BH} rise={up(2.6)} pal={pal} />
          : <polygon points={polyPoints(f.top)} fill={pal.roofDeck} />}
      </>
    );
  };

  // Buttresses at the front's bay lines, stepping back once (as the chapel's).
  type Part = DepthBox & { part: 'hall' | 'kitchen' | 'back' | 'arcade' | 'buttress' | 'slab' | 'frontis'; lower?: DepthBox; upper?: DepthBox };
  const items: Part[] = [
    { ...hall, part: 'hall' }, { ...kitchen, part: 'kitchen' },
  ];
  if (back.w > 0 && back.h > 0) items.push({ ...back, part: 'back' });
  if (spec.buttresses && isSeen(plan.front)) {
    const depth = across(0.85); const shrink = depth * 0.42;
    for (let i = 1; i < bays; i++) {
      if (i === (bays - 1) / 2 || i === (bays + 1) / 2) continue;
      const along = (i / bays) * hallLen - BUTTRESS_PLAN / 2;
      const lower = againstWall(hall.col, hall.row, hall.w, hall.h, plan.front, along, BUTTRESS_PLAN, depth);
      const upper = againstWall(hall.col, hall.row, hall.w, hall.h, plan.front, along, BUTTRESS_PLAN, depth - shrink);
      items.push({ ...lower, part: 'buttress', lower, upper });
    }
  }
  if (spec.arcade && isSeen(plan.front)) items.push({ ...againstWall(hall.col, hall.row, hall.w, hall.h, plan.front, 0, hallLen, ARCADE_DEPTH), part: 'arcade' });
  if (oversail > 0) items.push({ ...againstWall(hall.col, hall.row, hall.w, hall.h, plan.front, 0, hallLen, oversail), part: 'slab' });
  if (frontis) items.push({ ...frontis, part: 'frontis' });

  // What stands against the front takes this much of the terrace.
  const taken = spec.arcade ? ARCADE_DEPTH : oversail > 0 ? oversail + across(1.5) : spec.buttresses ? across(0.85) : frontis ? across(0.9) : 0;
  // The terrace before the front; with the front turned away it lies
  // behind the hall, so its tables are drawn first.
  const furniture = <TerraceFurniture plan={plan} doorAt={hallLen / 2} free={T - taken} cafe={false} plain={vernacular === 'modern'} />;
  return (
    <>
      <TerracePaving plan={plan} />
      {!isSeen(plan.front) && furniture}
      {depthOrder(items).map((it, i) => {
        switch (it.part) {
          case 'hall': return <g key="hall">{hallArt()}</g>;
          case 'kitchen': return <g key="kitchen">{kitchenArt()}</g>;
          case 'back': return <g key="back">{backArt()}</g>;
          case 'slab': return <g key="slab">{slabArt()}</g>;
          case 'frontis': return <g key="frontis">{frontisArt()}</g>;
          case 'arcade': return <Arcade key="arcade" col={hall.col} row={hall.row} w={hall.w} h={hall.h} outward={plan.front} pal={pal} stone={stone} height={arcadeHeight(H)} />;
          default: {
            const lo = boxFaces(it.lower!.col, it.lower!.row, it.lower!.w, it.lower!.h, 0, H * BUTTRESS_SETOFF_FRACTION);
            const hi = boxFaces(it.upper!.col, it.upper!.row, it.upper!.w, it.upper!.h, H * BUTTRESS_SETOFF_FRACTION, H * (0.88 - BUTTRESS_SETOFF_FRACTION));
            return (
              <g key={`bt${i}`}>
                <polygon points={polyPoints(lo.left)} fill={pal.wall[lo.dir.CD]} />
                <polygon points={polyPoints(lo.right)} fill={pal.wall[lo.dir.BC]} />
                <polygon points={polyPoints(lo.top)} fill={shade(trimStone, 0.88)} />
                <polygon points={polyPoints(hi.left)} fill={pal.wall[hi.dir.CD]} />
                <polygon points={polyPoints(hi.right)} fill={pal.wall[hi.dir.BC]} />
                <polygon points={polyPoints(hi.top)} fill={shade(trimStone, 0.94)} />
              </g>
            );
          }
        }
      })}
      {isSeen(plan.front) && furniture}
    </>
  );
}

// The dining hall, by band: the café's and the terrace hall's own mass is
// the pavilion drawn on the plan's hall box (`bare`), the refectory its own.
function diningHallArt(props: BuildingMassProps, snow: number): React.JSX.Element {
  const { t, p, material, vernacular } = props;
  const plan = diningPlan(t, p, vernacular);
  const stone = stoneFor(vernacular);
  if (plan.band === 'refectory') {
    const roof = REFECTORIES[vernacular].roof === 'flat' ? material.roof : roofFor(vernacular).pitchedRoof ?? material.roof;
    const pal = snowOnRoofs(paletteFrom({ wall: material.wall, roof }), snow);
    return <Refectory t={t} plan={plan} vernacular={vernacular} pal={pal} stone={stone} />;
  }
  const L = plan.alongW ? plan.terrace.w : plan.terrace.h;
  const T = plan.alongW ? plan.terrace.h : plan.terrace.w;
  const cafe = plan.band === 'cafe';
  // Mission's arcade runs along the front of a hall tall enough for one.
  const arcaded = entrancePartOf(t, vernacular) === 'arcade' && arcadeFits(wallHeightOf(t));
  // The terrace's tables paint after the hall when the front is in view,
  // before it (behind) when it is turned away.
  const frontSeen = sideSeen(p.facing, 'front');
  const furniture = <TerraceFurniture plan={plan} doorAt={L / 2} free={arcaded ? T - ARCADE_DEPTH - 0.08 : T} cafe={cafe} plain={vernacular === 'modern'} />;
  return (
    <>
      <TerracePaving plan={plan} />
      {!frontSeen && furniture}
      {buildingMassArt({ ...props, p: { ...plan.hall, facing: p.facing }, bare: true }, snow)}
      {cafe && <CafeAwning plan={plan} d={doorOf(t)} H={wallHeightOf(t)} />}
      {frontSeen && furniture}
    </>
  );
}

// Wraps BuildingMass. A building being extended (a library renovation,
// RENOVATE_LIBRARY) is drawn at its standing height, windows and all, with
// scaffolding on its roof rather than as a ground-level site.
// --- The residence towers (Plan 87H) ----------------------------------
// A residence tower is not an office tower: a shaft of punched windows in
// the campus's own wall (brick, stone, stucco or panel), stacked balconies
// down its two row faces, a podium of shops under an entrance canopy, and
// a lit common room at the top whose crown is the tower's own
// (buildingSpec's towerFormOf): Meridian a pitched roof and cupola, Beacon
// a stepped crown and a beacon mast, Horizon a roof terrace with a glazed
// lounge, planters and umbrellas, Aurora a glass lantern under a glass
// spire. Precedents: the brick and stone residence towers of the 1960s
// campus (Penn's Harnwell, Harvard's Peabody Terrace), lounges and roof
// terraces on top of the newer ones.
const TOWER_INSET = 0.17;                    // the shaft, set back from the podium's edge
const TOWER_DECK = '#7c8377';                // the lead deck every flat roof shares
const LOUNGE_GLOW = '#f2d08c';               // a common room's lit glazing
const TERRACE_DECK = '#a7845c';              // timber decking
const PLANTER_GREEN = '#5d8a4a';
const UMBRELLA_CLOTH = ['#e9e1cf', '#b9533f'];
const TOWER_WINDOW = across(1.7);
const TOWER_DARK_GLASS = 'rgba(64, 78, 92, 0.6)';
const LIT_FACE = 1.14;                       // light.ts's brightest wall
const BALCONY_W = across(4.2);
const BALCONY_D = across(1.5);
const BALCONY_SLAB = up(0.35);
const BALCONY_RAIL = up(1.05);

// A storey of lit glazing across a wall, `from` to `to`, with mullions on
// the bay grid: the common room's glass, glowing.
function LitGlazing({ origin, along, wallHeight, span, from, to, mullion, id }: {
  origin: Pt; along: Pt; wallHeight: number; span: number; from: number; to: number; mullion: string; id: string;
}) {
  if (wallHeight <= 0) return null;
  const v0 = from / wallHeight; const v1 = to / wallHeight;
  const bays = Math.max(2, baysAcross(span));
  const q = (u: number, v: number) => facePoint(origin, along, wallHeight, u, v);
  const bars = Array.from({ length: bays - 1 }, (_, i) => {
    const u = (i + 1) / bays; const a = q(u, v0); const b = q(u, v1);
    return `M${a.x},${a.y}L${b.x},${b.y}`;
  }).join('');
  return (
    <g key={id}>
      <polygon points={polyPoints([q(0.02, v0), q(0.98, v0), q(0.98, v1), q(0.02, v1)])} fill={LOUNGE_GLOW} />
      <path d={bars} stroke={mullion} strokeWidth={0.8} fill="none" />
    </g>
  );
}

function hexLuminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

// A box in two wall tones with a deck on top.
function plainBox(f: BoxFaces, lit: string, dark: string, top: string, key: string) {
  return (
    <g key={key}>
      {sideFaces(f, lit, dark)}
      <polygon points={polyPoints(f.top)} fill={top} />
    </g>
  );
}

// A garden umbrella over a café table: a striped cone on a pole.
function Umbrella({ cc, cr, z }: { cc: number; cr: number; z: number }) {
  const r = across(2.1);
  const rim = projectedCircle(cc, cr, r, 12).map((q) => lift(q, z + up(2.1)));
  const apex = lift(project(cc, cr), z + up(2.8));
  const foot = lift(project(cc, cr), z);
  const table = projectedCircle(cc, cr, across(0.7), 10).map((q) => lift(q, z + up(0.75)));
  // Fan triangles far to near (the rim's lower screen edge is the near one).
  const tris = rim.map((p, i) => ({ i, a: p, b: rim[(i + 1) % rim.length] }))
    .sort((x, y) => (x.a.y + x.b.y) - (y.a.y + y.b.y));
  return (
    <g className="tower-umbrella">
      <polygon points={polyPoints(table)} fill="#e6e1d4" stroke="rgba(40,40,40,0.35)" strokeWidth={0.4} />
      <line x1={foot.x} y1={foot.y} x2={apex.x} y2={apex.y} stroke="#4a4540" strokeWidth={0.8} />
      {tris.map(({ i, a, b }) => (
        <polygon key={i} points={polyPoints([a, b, apex])} fill={shade(UMBRELLA_CLOTH[i % 2], (a.y + b.y) / 2 > apex.y ? 1 : 0.85)} />
      ))}
    </g>
  );
}

// A mast: a thin line up from `at`, and a lamp at its head.
function Mast({ at, z, rise, lamp }: { at: Pt; z: number; rise: number; lamp?: string }) {
  const a = lift(at, z); const b = lift(at, z + rise);
  return (
    <g className="tower-mast">
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#5b5f63" strokeWidth={1.1} />
      {lamp && <circle cx={b.x} cy={b.y} r={3.2} fill={lamp} opacity={0.35} />}
      {lamp && <circle cx={b.x} cy={b.y} r={1.4} fill={lamp} />}
    </g>
  );
}

// Its sides are its own (four-way facing): the entrance canopy over the
// front door, shop doors on the sides, a service door at the back; the
// balconies down the front and back, the crown symmetric but for the roof
// terrace's lounge, which keeps to the building's left.
function ResidenceTower({ t, col, row, w, h, H, pal, deck, stone, paneShape, crest, vernacular, material, facing }: {
  t: Buildable; col: number; row: number; w: number; h: number; H: number;
  pal: Palette; deck: string; stone: StonePalette; paneShape: WindowShape; crest: CrestPart;
  vernacular: Vernacular; material: Material; facing?: Facing;
}) {
  const { crown, shaftStoreys } = towerFormOf(t);
  const trimmed = stone.trim !== NO_STONE;
  const trimStone = trimmed ? stone.trim : stone.towerStone;
  const seen = visibleWalls();
  // The visible walls, for what is painted on whichever walls are in view.
  const fronts: FaceDir[] = [seen.left, seen.right];
  const sides = sidesOf(facing);
  // Punched openings: a ribbon is an office's, so Modern gets plain ones.
  const pane: WindowShape = paneShape === 'ribbon' ? 'rect' : paneShape;
  // A pale sash vanishes on the sunlit face of a pale wall (Mission's
  // stucco, Classical's limestone); the shaft's windows are then a darker
  // glass, so the punched grid reads from every side.
  const glass = glassContrast(material.wall, stone.glass, LIT_FACE) < 0.12 ? TOWER_DARK_GLASS : stone.glass;

  // The podium: shops behind tall glass, in the set's tower stone (a dark
  // base under a pale wall in Modern, where there is no trim).
  const PODIUM_H = TOWER_PODIUM_STOREYS * STOREY;
  const podiumStone = trimmed ? stone.towerStone : shade(material.wall, 0.72);
  const podiumDoor = doorDimensions('shopfront');
  // The residents' service door (deliveries, bins) at the back.
  const serviceDoor = doorDimensions('service');
  const doorOn = (dir: FaceDir) => (dir === sides.back ? serviceDoor : podiumDoor);
  const pod = boxFaces(col, row, w, h, 0, PODIUM_H);

  // The shaft, every residential floor above the podium.
  const sc = col + w * TOWER_INSET; const sr = row + h * TOWER_INSET;
  const sw = w * (1 - TOWER_INSET * 2); const sh = h * (1 - TOWER_INSET * 2);
  const shaftH = H - PODIUM_H;
  const shaft = boxFaces(sc, sr, sw, sh, PODIUM_H, shaftH);
  const shaftSills = rankSills(shaftStoreys);
  const courses = Array.from({ length: shaftStoreys - 1 }, (_, i) => (i + 1) * STOREY);

  // Balconies stacked up the front and back (the building's own, so the
  // tower has balconied fronts and plain ends), two stacks a face, every floor but the
  // first; slab, then rail, bottom up so a higher one overlaps a lower.
  // Stone balconies where the trim shows on the wall; wrought iron where
  // it would not (a cream trim on Mission's cream stucco); tinted glass in
  // Modern, which has no trim.
  const ironRails = trimmed && Math.abs(hexLuminance(stone.trim) - hexLuminance(material.wall)) < 0.15;
  const railFill = ironRails ? '#34363a' : trimmed ? shade(stone.trim, 0.97) : 'rgba(62, 82, 94, 0.82)';
  const railShade = ironRails ? '#26282b' : trimmed ? shade(stone.trim, 0.8) : 'rgba(48, 64, 74, 0.82)';
  const balconies = fronts.filter((dir) => dir === sides.front || dir === sides.back).flatMap((dir) => {
    const span = wallSpan(sw, sh, dir);
    return [0.27, 0.73].flatMap((u) => Array.from({ length: shaftStoreys - 1 }, (_, i) => {
      const z = PODIUM_H + (i + 1) * STOREY;
      const b = againstWall(sc, sr, sw, sh, dir, span * u - BALCONY_W / 2, BALCONY_W, BALCONY_D);
      const slab = boxFaces(b.col, b.row, b.w, b.h, z, BALCONY_SLAB);
      const rail = boxFaces(b.col, b.row, b.w, b.h, z + BALCONY_SLAB, BALCONY_RAIL);
      return { z, key: `b${dir}${u}${i}`, slab, rail };
    }));
  }).sort((a, b) => a.z - b.z);

  // --- the crown ---
  const top = H;
  const centre = project(sc + sw / 2, sr + sh / 2);
  const roofs = roofFor(vernacular);
  const flatSet = Object.keys(roofs.ridgeMetres).length === 0;
  const crownNode = (() => {
    switch (crown) {
      case 'pitched': {
        // The common room under a pitched roof: a lit storey, a cornice, a
        // hip (a mansard in Second Empire) and a cupola. A flat-roofed set
        // gets a thin roof oversailing the lit storey instead.
        const lounge = boxFaces(sc, sr, sw, sh, top, STOREY);
        const eave = flatSet ? across(1.4) : across(0.9) + eavesOf(vernacular);
        const base = top + STOREY;
        const rise = up(Math.max(6, (roofs.ridgeMetres.pavilion ?? 3) * 2));
        const cup = across(5);
        // Seated where the hip's slope meets the cupola's walls.
        const cupBase = base + up(0.5) + rise * (1 - cup / 2 / (Math.min(sw, sh) / 2 + eave));
        const cupBox = boxFaces(sc + sw / 2 - cup / 2, sr + sh / 2 - cup / 2, cup, cup, cupBase, up(3.2));
        const cap = pyramid(sc + sw / 2 - cup * 0.6, sr + sh / 2 - cup * 0.6, cup * 1.2, cupBase + up(3.2), up(3.4), pal.roof);
        return (
          <>
            <polygon points={polyPoints(lounge.left)} fill={pal.wallLeft} />
            <polygon points={polyPoints(lounge.right)} fill={pal.wallRight} />
            <LitGlazing id="gl" origin={lounge.D} along={lounge.C} wallHeight={STOREY} span={lounge.spanLeft} from={STOREY * 0.12} to={STOREY * 0.86} mullion={trimStone} />
            <LitGlazing id="gr" origin={lounge.C} along={lounge.B} wallHeight={STOREY} span={lounge.spanRight} from={STOREY * 0.12} to={STOREY * 0.86} mullion={trimStone} />
            {flatSet ? (
              plainBox(boxFaces(sc - eave, sr - eave, sw + eave * 2, sh + eave * 2, base, up(0.7)), shade(trimStone, 0.9), shade(trimStone, 0.74), deck, 'fly')
            ) : isMansard(vernacular) ? (
              <MansardRoof col={sc - eave} row={sr - eave} w={sw + eave * 2} h={sh + eave * 2} base={base} rise={up(4.4)} pal={pal} stone={stone} />
            ) : (
              <>
                {plainBox(boxFaces(sc - eave, sr - eave, sw + eave * 2, sh + eave * 2, base, up(0.5)), shade(trimStone, 0.9), shade(trimStone, 0.74), pal.roof, 'eave')}
                <HippedRoof col={sc - eave} row={sr - eave} w={sw + eave * 2} h={sh + eave * 2} base={base + up(0.5)} rise={rise} pal={pal} />
                {/* The cupola: a lit lantern on the hip, under its own cap. */}
                {sideFaces(cupBox, shade(trimStone, 0.97), shade(trimStone, 0.8))}
                <LitGlazing id="cl" origin={cupBox.D} along={cupBox.C} wallHeight={up(3.2)} span={cupBox.spanLeft} from={up(0.5)} to={up(2.7)} mullion={trimStone} />
                <LitGlazing id="cr" origin={cupBox.C} along={cupBox.B} wallHeight={up(3.2)} span={cupBox.spanRight} from={up(0.5)} to={up(2.7)} mullion={trimStone} />
                {cap.faces}
                <Mast at={centre} z={cupBase + up(6.6)} rise={up(2.4)} />
              </>
            )}
          </>
        );
      }
      case 'stepped': {
        // Two lit set-backs in the trim stone, then a beacon on a mast.
        const tiers = [0.45, 0.95].map((inset, i) => boxFaces(sc + inset, sr + inset, sw - inset * 2, sh - inset * 2, top + i * STOREY * 1.25, STOREY * 1.25));
        return (
          <>
            {tiers.map((f, i) => (
              <g key={i}>
                {sideFaces(f, shade(trimStone, 0.95), shade(trimStone, 0.78))}
                <LitGlazing id={`sl${i}`} origin={f.D} along={f.C} wallHeight={STOREY * 1.25} span={f.spanLeft} from={STOREY * 0.18} to={STOREY * 0.95} mullion={shade(trimStone, 0.8)} />
                <LitGlazing id={`sr${i}`} origin={f.C} along={f.B} wallHeight={STOREY * 1.25} span={f.spanRight} from={STOREY * 0.18} to={STOREY * 0.95} mullion={shade(trimStone, 0.8)} />
                <polygon points={polyPoints(f.top)} fill={deck} />
              </g>
            ))}
            <Mast at={centre} z={top + STOREY * 2.5} rise={up(16)} lamp="#ff6b4a" />
          </>
        );
      }
      case 'terrace': {
        // A glazed lounge on the -col half and a roof terrace beside it:
        // timber deck, planters, café tables under umbrellas, and a glass
        // rail round the edge (the far edges first, the near ones last).
        const g = across(1.1);
        const items: Array<DepthBox & { node: React.JSX.Element }> = [];
        // Set out in the shaft's own frame: u across its front from its
        // left, d from its front back.
        const sp = { col: sc, row: sr, w: sw, h: sh, facing };
        const SW = frontWidth(sp); const SD = frontDepth(sp);
        const lw = SW * 0.42;
        const lb = localBox(sp, g, g, g + lw, SD - g);
        const lounge = boxFaces(lb.col, lb.row, lb.w, lb.h, top, STOREY * 1.1);
        items.push({ ...lb, node: (
          <>
            {sideFaces(lounge, shade(trimStone, 0.93), shade(trimStone, 0.76))}
            <LitGlazing id="tl" origin={lounge.D} along={lounge.C} wallHeight={STOREY * 1.1} span={lounge.spanLeft} from={STOREY * 0.08} to={STOREY * 0.96} mullion={shade(trimStone, 0.85)} />
            <LitGlazing id="tr" origin={lounge.C} along={lounge.B} wallHeight={STOREY * 1.1} span={lounge.spanRight} from={STOREY * 0.08} to={STOREY * 0.96} mullion={shade(trimStone, 0.85)} />
            {(() => { const lr = localBox(sp, g * 0.7, g * 0.7, g * 1.3 + lw, SD - g * 0.7); return plainBox(boxFaces(lr.col, lr.row, lr.w, lr.h, top + STOREY * 1.1, up(0.5)), shade(trimStone, 0.9), shade(trimStone, 0.74), deck, 'lr'); })()}
          </>
        ) });
        const tc = g + lw + across(1.5);           // the terrace's near edge to the lounge
        const tw = SW - g - tc;
        const plant = (u0: number, d0: number, u1: number, d1: number, k: string) => {
          const b = localBox(sp, u0, d0, u1, d1);
          const f = boxFaces(b.col, b.row, b.w, b.h, top, up(0.9));
          items.push({ ...b, node: plainBox(f, '#8a7a66', '#6f6252', PLANTER_GREEN, k) });
        };
        plant(SW - g - across(1.4), g, SW - g, SD - g, 'pe');
        plant(tc, SD - g - across(1.3), tc + tw - across(1.6), SD - g, 'pn');
        plant(tc, g, tc + tw - across(1.6), g + across(1.3), 'ps');
        [[0.3, 0.32], [0.62, 0.55], [0.3, 0.75]].forEach(([u, v]) => {
          const { col: cc, row: cr } = localToGrid(sp, tc + tw * u!, SD * (1 - v!));
          items.push({ col: cc - across(1.6), row: cr - across(1.6), w: across(3.2), h: across(3.2), node: <Umbrella cc={cc} cr={cr} z={top} /> });
        });
        const deckBox = localBox(sp, tc - across(0.6), across(0.2), SW - across(0.2), SD - across(0.2));
        const RT = across(0.25);
        const rail = (dir: FaceDir) => {
          const b = againstWall(sc, sr, sw, sh, dir, 0, wallSpan(sw, sh, dir), RT, RT);
          const f = boxFaces(b.col, b.row, b.w, b.h, top, up(1.1));
          return <g key={`r${dir}`}>{sideFaces(f, 'rgba(214, 230, 238, 0.55)', 'rgba(190, 210, 220, 0.55)')}<polygon points={polyPoints(f.top)} fill={shade(trimStone, 0.85)} /></g>;
        };
        const all: FaceDir[] = ['negRow', 'posCol', 'posRow', 'negCol'];
        return (
          <>
            <polygon points={polyPoints(boxFaces(deckBox.col, deckBox.row, deckBox.w, deckBox.h, top, 0).top)} fill={TERRACE_DECK} />
            {all.filter((d) => !fronts.includes(d)).map(rail)}
            {depthOrder(items).map((it, i) => <g key={i}>{it.node}</g>)}
            {fronts.map(rail)}
          </>
        );
      }
      case 'lantern': {
        // A two-storey glass lantern, a lit glazed crown on it and a
        // slender spire: the tallest tower's glass crown.
        const i = across(1.6);
        const LH = STOREY * 2;
        const lan = boxFaces(sc + i, sr + i, sw - i * 2, sh - i * 2, top, LH);
        const slab = boxFaces(sc + i * 0.6, sr + i * 0.6, sw - i * 1.2, sh - i * 1.2, top + LH, up(0.6));
        const plan = (sw - i * 2) * 0.82;
        const crownGlass = pyramid(sc + sw / 2 - plan / 2, sr + sh / 2 - plan / 2, plan, top + LH + up(0.6), up(9), '#a9c6d6');
        return (
          <>
            {sideFaces(lan, shade(trimStone, 0.95), shade(trimStone, 0.78))}
            <LitGlazing id="al" origin={lan.D} along={lan.C} wallHeight={LH} span={lan.spanLeft} from={STOREY * 0.12} to={LH * 0.97} mullion={shade(trimStone, 0.9)} />
            <LitGlazing id="ar" origin={lan.C} along={lan.B} wallHeight={LH} span={lan.spanRight} from={STOREY * 0.12} to={LH * 0.97} mullion={shade(trimStone, 0.9)} />
            {floorCourses(lan.D, lan.C, LH, [STOREY], 'alc')}
            {floorCourses(lan.C, lan.B, LH, [STOREY], 'arc')}
            {plainBox(slab, shade(trimStone, 0.9), shade(trimStone, 0.74), deck, 'as')}
            {crownGlass.faces}
            <Mast at={centre} z={top + LH + up(9.6)} rise={up(12)} lamp="#fff3c4" />
          </>
        );
      }
    }
  })();

  return (
    <>
      {/* Podium: shopfronts round the street level, a cornice and a deck. */}
      {sideFaces(pod, shade(podiumStone, 0.92), shade(podiumStone, 0.76))}
      {windows(pod.D, pod.C, PODIUM_H, pod.spanLeft, [SHOPFRONT_SILL], SHOPFRONT_WIDTH, 'pl', pane, stone.glass, doorBay(doorOn(pod.dir.CD), pod.spanLeft, PODIUM_H))}
      {windows(pod.C, pod.B, PODIUM_H, pod.spanRight, [SHOPFRONT_SILL], SHOPFRONT_WIDTH, 'pr', pane, stone.glass, doorBay(doorOn(pod.dir.BC), pod.spanRight, PODIUM_H))}
      <WallBand origin={pod.D} along={pod.C} wallHeight={PODIUM_H} from={PODIUM_H - CORNICE} to={PODIUM_H} className="iso-cornice" fill={shade(trimStone, 0.95)} />
      <WallBand origin={pod.C} along={pod.B} wallHeight={PODIUM_H} from={PODIUM_H - CORNICE} to={PODIUM_H} className="iso-cornice" fill={shade(trimStone, 0.8)} />
      <Door d={doorOn(pod.dir.CD)} origin={pod.D} along={pod.C} wallHeight={PODIUM_H} span={pod.spanLeft} side={pod.dir.CD} shape={pane === 'arched' && pod.dir.CD !== sides.back ? 'arched' : 'rect'} />
      <Door d={doorOn(pod.dir.BC)} origin={pod.C} along={pod.B} wallHeight={PODIUM_H} span={pod.spanRight} side={pod.dir.BC} shape={pane === 'arched' && pod.dir.BC !== sides.back ? 'arched' : 'rect'} />
      <polygon points={polyPoints(pod.top)} fill={deck} />
      {/* The entrance canopy, over the front door only. */}
      {fronts.includes(sides.front) && (
        <Canopy d={podiumDoor} col={col} row={row} w={w} h={h} outward={sides.front} wallHeight={PODIUM_H} stone={stone} />
      )}

      {/* The shaft: punched windows floor by floor, in the set's wall. */}
      <polygon points={polyPoints(shaft.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(shaft.right)} fill={pal.wallRight} />
      {trimmed && floorCourses(shaft.D, shaft.C, shaftH, courses.filter((_, i) => i % 3 === 2), 'tlc')}
      {trimmed && floorCourses(shaft.C, shaft.B, shaftH, courses.filter((_, i) => i % 3 === 2), 'trc')}
      {windows(shaft.D, shaft.C, shaftH, shaft.spanLeft, shaftSills, TOWER_WINDOW, 'tl', pane, glass)}
      {windows(shaft.C, shaft.B, shaftH, shaft.spanRight, shaftSills, TOWER_WINDOW, 'tr', pane, glass)}
      <WallBand origin={shaft.D} along={shaft.C} wallHeight={shaftH} from={shaftH - CORNICE} to={shaftH} className="iso-cornice" fill={shade(trimStone, 0.95)} />
      <WallBand origin={shaft.C} along={shaft.B} wallHeight={shaftH} from={shaftH - CORNICE} to={shaftH} className="iso-cornice" fill={shade(trimStone, 0.8)} />
      <polygon points={polyPoints(shaft.top)} fill={deck} />
      {balconies.map(({ key, slab, rail }) => (
        <g key={key}>
          {sideFaces(slab, shade(trimStone, 0.86), shade(trimStone, 0.7))}
          <polygon points={polyPoints(slab.top)} fill={shade(trimStone, 0.8)} />
          {sideFaces(rail, railFill, railShade)}
        </g>
      ))}
      {/* The podium's parapet in the set's crest, in front of the shaft. */}
      <Crest crest={crest} col={col} row={row} w={w} h={h} base={PODIUM_H} fronts={fronts} pal={pal} stone={stone} tile={surfaceRoofOf(vernacular)} />
      {crownNode}
    </>
  );
}

function BuildingMotif({ t, p, material, vernacular, developing, glyphs }: {
  t: Buildable;
  p: Plot;
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
  if (motifOf(t) === 'landmark') return <Landmark t={t} p={p} developing={developing} vernacular={vernacular} />;
  // The Museum stands back behind its forecourt (Plan 87G).
  if (t.id === MUSEUM_ID && !developing) return <MuseumCourt t={t} p={p} material={material} vernacular={vernacular} glyphs={glyphs} />;
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

// A vernacular's stone with its glass swapped for one that reads on this
// wall (buildingSpec's readableGlass, Plan 87H): the dark glass of Modern
// and Art Deco vanished on their dark residential brick. One stable object
// per stone and wall, so the memo still holds.
const STONE_ON_WALL = new Map<StonePalette, Map<string, StonePalette>>();
function stoneOnWall(stone: StonePalette, wall: string): StonePalette {
  const glass = readableGlass(wall, stone.glass);
  if (glass === stone.glass) return stone;
  let byWall = STONE_ON_WALL.get(stone);
  if (!byWall) { byWall = new Map(); STONE_ON_WALL.set(stone, byWall); }
  let out = byWall.get(wall);
  if (!out) { out = { ...stone, glass }; byWall.set(wall, out); }
  return out;
}

export type BuildingMassProps = {
  t: Buildable;
  p: Plot;
  material: Material;
  vernacular: Vernacular;
  developing: boolean;
  glyphs?: string;
  // A dining hall's own mass, drawn on its plan's hall box (Plan 87D).
  bare?: boolean;
};
export function BuildingMass(props: BuildingMassProps) {
  return buildingMassArt(props, useContext(SnowContext));
}
// The mass given the snow on the roofs: what the canvas map draws.
export function buildingMassArt(props: BuildingMassProps, snow: number, part?: 'office'): React.JSX.Element {
  const { t, p, material, vernacular, developing, glyphs, bare } = props;
  // Stable references off buildingSpec's VERNACULARS table, the glass made
  // to read against this building's wall (Plan 87H).
  const stone: StonePalette = stoneOnWall(stoneFor(vernacular), shade(material.wall, wallShadeOf(t)));
  // The Science lab's windows run as lab ribbons where the vernacular's are
  // plain rectangles (Plan 87E); arched and lancet sets keep theirs.
  const paneShape = signatureOf(t)?.feature === 'fumeHoods' && paneShapeOf(t, vernacular) === 'rect' ? 'ribbon' : paneShapeOf(t, vernacular);
  // The vernacular's parts (buildingSpec's VernacularParts): branches below
  // ask what goes in each slot, so a new vernacular is a table row.
  // `trim` false (Brutalism) skips every stone band.
  const trim = hasTrim(vernacular);
  const feature = signatureOf(t)?.feature;
  // An exchange's front, and the economics lab's, stand where the
  // vernacular's entrance would (Plan 87I). The Law School's temple front
  // stands in for it; its Gothic set has a porch (Plan 87G).
  const grand = grandFrontOf(t, vernacular);
  const lawTempleFront = lawTemple(t, vernacular);
  const entrance: EntrancePart = grand ? GRAND_ENTRANCE[grand]
    : t.id === LAW_ID ? (lawTempleFront ? 'none' : 'porch')
      : entrancePartOf(t, vernacular);
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
  const timbering = partsFor(vernacular).timbering === true;
  const brackets = partsFor(vernacular).brackets === true;
  const deckPiers = partsFor(vernacular).piers === true;
  const mansard = isMansard(vernacular);
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
  // A venue expanding in place (Plan 54) stands at its current stage while
  // the work goes on; only a first construction is a site.
  const site = developing && inFlight === 0 && t.renovatingFrom === undefined;
  const { row, col, w, h } = p;
  // Snow on the roofs in the depth of winter (Plan 74I), from the caller.
  const pal = snowOnRoofs(paletteFrom(material, wallShadeOf(t)), snow);
  // The exchange's arcade under the vernacular's tile, as its deck's edge
  // (Plan 87I).
  const tile = roofFor(vernacular).pitchedRoof;
  const arcadePal = tile ? snowOnRoofs(paletteFrom({ wall: material.wall, roof: tile }, wallShadeOf(t)), snow) : pal;
  // The visible walls, left then right, where entrances and attachments go.
  // (Painting: crests, piers and the like that every wall has go on both.)
  const seen = visibleWalls();
  const fronts: FaceDir[] = [seen.left, seen.right];
  const isSeen = (d: FaceDir) => d === seen.left || d === seen.right;
  // The building's own sides (Plan 88, facing.ts): the front's wall, its
  // left, right and back, which stay on the building as the camera turns
  // and turn with it when it is placed. The vernacular's entrance (portico,
  // porch, canopy, steps) goes on the front, drawn while the camera sees it;
  // each side a plain door and the back a service door (PlainEntrance).
  const sides = sidesOf(p.facing);
  const fw = frontWidth(p); const fd = frontDepth(p);
  const mainFronts: FaceDir[] = isSeen(sides.front) ? [sides.front] : [];
  // The seen walls that are not the front, with the door each takes.
  const plainFronts: FaceDir[] = fronts.filter((d) => d !== sides.front);
  // A corner tower stands at the front-right corner, where the front meets
  // the right side. Both walls seen: that corner is the near one, and it
  // paints after the mass; neither, before. Comparing its screen height
  // with the middle's put it in front at a side corner too, so it painted
  // over the mass in two views of four.
  const cornerInFront = isSeen(sides.front) && isSeen(sides.right);
  // At a side corner one of the tower's visible walls stands proud of the
  // mass's own wall (TOWER_PROUD) and so in front of the mass: that face is
  // painted again after it. At the back corner neither is.
  const towerProudFace: FaceDir | undefined = cornerInFront ? undefined
    : isSeen(sides.front) ? sides.front : isSeen(sides.right) ? sides.right : undefined;
  // The tower's corner on the grid, and its plan square standing proud of
  // both walls there.
  const towerCorner = localToGrid(p, fw, 0);
  const towerAt = (plan: number) => localBox(p, fw - plan + TOWER_PROUD, -TOWER_PROUD, fw + TOWER_PROUD, plan - TOWER_PROUD);
  // Base tone for the solid helpers below: the +row wall's, fixed to the
  // world (it was the screen-left wall's, which turned with the camera).
  const tint = pal.wall.posRow;
  const roofTint = material.roof;
  // A block, lab or shed keeps its massing and takes the vernacular's
  // surface (Plan 74E): its crest, its roof color on the plant screens, its
  // trim on the cornice.
  const crest = crestOf(t, vernacular);
  const surface = motif === 'block' || motif === 'works' || motif === 'hangar';
  const plantTint = surface ? surfaceRoofOf(vernacular) : roofTint;
  const signifier = signifierOf(t);
  const surfaceCornice = surface && trim ? stone.trim : undefined;

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
  // The plain doors on the sides and the back (Plan 88), a recess's too.
  const sideDoor = plainDoorOf(doorOf(t), false);
  const backDoor = plainDoorOf(doorOf(t), true);
  const doorOn = (d: FaceDir) => (d === sides.front ? door : d === sides.back ? backDoor : sideDoor);

  // The dining halls (Plan 87D): a café, a hall over a terrace, a refectory.
  if (t.facilityType === 'diningHall' && !site && !bare) return diningHallArt(props, snow);

  // Engineering (Plan 87E): the office block, drawn as any lab, and the
  // high-bay workshop wing at its end, nearer one last.
  if (feature === 'workshop' && !site && part !== 'office') {
    const { office, wing, end, joint } = workshopSplit(col, row, w, h, p.facing);
    const officeNode = buildingMassArt({ t, p: { ...office, facing: p.facing }, material, vernacular, developing, glyphs }, snow, 'office');
    const wingH = H + WORKSHOP_RISE;
    const wingNode = (
      <WorkshopWing
        wing={wing} end={end} joint={joint} height={wingH} pal={pal} stone={stone} trim={trim}
        crestNode={<Crest crest={crest} {...wing} base={wingH} fronts={fronts} pal={pal} stone={stone} tile={plantTint} />}
      />
    );
    return occludes(wing, office) === 1 ? <>{officeNode}{wingNode}</> : <>{wingNode}{officeNode}</>;
  }
  // The fronts the vernacular's entrance takes: the front, unless a school
  // lab's own entrance stands there (Plan 87E): Health's drop-off, with
  // its oriels on the side seen beside it, or Computer Science's atrium.
  const entranceFronts = feature === 'atrium' || feature === 'clinic' ? [] : mainFronts;

  if (motif === 'chapel' && !site) {
    return <Chapel t={t} p={p} vernacular={vernacular} pal={pal} stone={stone} wall={shade(material.wall, wallShadeOf(t))} />;
  }

  // The Research Park and the Graduate College lay out their own plots
  // (Plan 87B); a site is the plain frame below.
  if (!site && t.id === 'PROJ-RESEARCH-PARK') {
    return <ResearchPark col={col} row={row} w={w} h={h} facing={p.facing} pal={pal} stone={stone} paneShape={paneShape} crest={crest} plantTint={plantTint} />;
  }
  if (!site && t.id === 'PROJ-GRADUATE') {
    return (
      <GraduateCollege col={col} row={row} w={w} h={h} facing={p.facing} H={H} ridge={ridge > 0 ? Math.max(ridge, up(3.5)) : 0}
        vernacular={vernacular} pal={pal} stone={stone} paneShape={paneShape} lights={lights} />
    );
  }
  // The library draws itself (Plan 87F, libraryMotif.tsx); its site keeps
  // the common frame below.
  if (t.facilityType === 'library' && !site) {
    return <LibraryMass t={t} p={p} material={material} vernacular={vernacular} pal={pal} stone={stone} H={H} extending={inFlight > 0} snow={snow} />;
  }

  if (motif === 'village') {
    // A plot: lawn, walks, and houses and trees in one depth-ordered list.
    const items = depthOrder([
      // Set out in the plot's own frame (Plan 88): the near rank on the
      // front, each door toward the front or the right as authored.
      ...VILLAGE_HOUSES.map((lot) => ({ kind: 'house' as const, ...villageLotBox(p, lot), lot })),
      ...VILLAGE_TREES.map(([u, v, species, scale]) => {
        const at = localToGrid(p, fw * u, fd * (1 - v));
        return {
          kind: 'tree' as const, col: at.col - 0.5, row: at.row - 0.5, w: 1, h: 1, species, scale,
          lot: undefined as VillageLot | undefined,
        };
      }),
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
        {[0.2, 0.5, 0.8].map((v) => {
          const b = plotFraction(p, 0, v - 0.06, 1, 0.08);
          return <polygon key={v} className="ground-mow" points={polyPoints(boxFaces(b.col, b.row, b.w, b.h, 0, 0).top)} />;
        })}
        {/* One connected walk network reaching every rank. */}
        {([
          [0.02, 0.26, 0.82, 0.05], [0.02, 0.66, 0.82, 0.05],
          [0.02, 0.26, 0.04, 0.45], [0.80, 0.26, 0.04, 0.45],
          [0.26, 0.26, 0.04, 0.45], [0.53, 0.26, 0.04, 0.45],
          [0.02, 0.98, 0.82, 0.02],
        ] as const).map(([u, v, uw, vh], i) => {
          const b = plotFraction(p, u, v, uw, vh);
          return <polygon key={`wk${i}`} className="ground-walk-fill" points={polyPoints(boxFaces(b.col, b.row, b.w, b.h, 0, 0).top)} />;
        })}
        {/* A hedge along the plot's back and left edges. */}
        {[plotFraction(p, 0, 0, 0.84, 0.18 / fd), plotFraction(p, 0, 0, 0.18 / fw, 1)].map((b, i) => (
          <polygon key={`hg${i}`} className="ground-hedge-top" points={polyPoints(boxFaces(b.col, b.row, b.w, b.h, 0, 0).top.map((q) => lift(q, 5)))} />
        ))}
        {items.filter((it) => it.kind === 'tree').map((it, i) => (
          <polygon key={`ts${i}`} className="campus-tree-shadow" points={polyPoints(treeShadow(it.col + 0.5, it.row + 0.5, it.species!, it.scale!))} />
        ))}
        {items.map((it, i) => (it.kind === 'tree' ? (
          <TreeAt key={i} col={it.col + 0.5} row={it.row + 0.5} species={it.species} scale={it.scale} shadow={false} />
        ) : (
          <VillageHouse
            key={i}
            col={it.col} row={it.row} w={it.w} h={it.h}
            height={Math.min(full, it.lot!.s * STOREY)}
            ridge={ridge * (it.lot!.s >= 3 ? 1 : 0.85)}
            pal={pal} stone={stone} glass={stone.glass} paneShape={paneShape}
            chimney={chimneys} door={it.lot!.d} doorAt={it.lot!.d === 'row' ? sides.front : sides.right}
          />
        )))}
      </>
    );
  }

  if (motif === 'tower') {
    // A retail podium over the whole footprint (campusData.ts's
    // TOWER_RETAIL_SERVES), with an inset shaft carried up from it
    // (ResidenceTower).
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

    // A residence tower in the set's own wall, under its own crown (Plan 87H).
    const deck = snowOnRoofs(paletteFrom({ wall: material.wall, roof: TOWER_DECK }), snow).roofDeck;
    return (
      <ResidenceTower t={t} col={col} row={row} w={w} h={h} H={H} pal={pal} deck={deck} stone={stone} facing={p.facing}
        paneShape={paneShape} crest={crest} vernacular={vernacular} material={material} />
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
    // near two show their backs and the tops of their treads. Which two are
    // far turns with the camera (cameraAxes: +row comes toward it when cosA
    // > 0, +col when sinA > 0), and RakedStand picks the face each shows.
    const { cosA, sinA } = cameraAxes();
    const northFar = cosA > 0; const southFar = cosA < 0;
    const westFar = sinA > 0; const eastFar = sinA < 0;

    // The stadium grows with its expansions (Plan 54, Plan 74D): it opens
    // with a low stand down each touchline, since it seats 40,000 from the
    // day it opens; the first expansion adds stands behind both ends, the
    // second closes the corners into the full bowl (Plan 61), and the third
    // adds a second deck all round (Plan 61). The field keeps its place and
    // size throughout, so the bowl grows around it.
    const stage = Math.min(3, t.expansions ?? 0);
    if (stage < 2) {
      const ground = polyPoints(boxFaces(col, row, w, h, 0, 0).top);
      const sideDepth = d * 0.55;
      const touchline = (key: string, outerRow: number, innerRow: number, fill: number) => (
        <RakedStand key={key} outer={[T(iCol, outerRow), T(iCol + iW, outerRow)]} inner={[T(iCol, innerRow), T(iCol + iW, innerRow)]}
          bottomH={H * 0.06} topH={H * 0.34} rows={3} aisles={3} {...fills(fill)} />
      );
      const endStand = (key: string, outerCol: number, innerCol: number, fill: number) => (
        <RakedStand key={key} outer={[T(outerCol, iRow), T(outerCol, iRow + iH)]} inner={[T(innerCol, iRow), T(innerCol, iRow + iH)]}
          bottomH={H * 0.06} topH={H * 0.3} rows={3} aisles={2} {...fills(fill)} />
      );
      const northStand = touchline('n', iRow - sideDepth, iRow, 1.0);
      const southStand = touchline('s', iRow + iH + sideDepth, iRow + iH, 0.8);
      const ends = stage >= 1;
      const westStand = endStand('w', iCol - sideDepth, iCol, 0.9);
      const eastStand = endStand('e', iCol + iW + sideDepth, iCol + iW, 0.72);
      return (
        <>
          <polygon className="ground-lawn" points={ground} />
          {northFar && northStand}
          {southFar && southStand}
          {ends && westFar && westStand}
          {ends && eastFar && eastStand}
          <StadiumField col={iCol} row={iRow} w={iW} h={iH} />
          {ends && !westFar && westStand}
          {ends && !eastFar && eastStand}
          {!northFar && northStand}
          {!southFar && southStand}
        </>
      );
    }
    // The full bowl: every side a raked bank, the home (west) side two-
    // decked from the first, every side on the second deck (stage 3).
    const decked = stage >= 3;
    const at = (c: number, r: number, z: number) => lift(project(c, r), z);
    const atT = (p: TilePt, z: number) => at(p[0], p[1], z);
    const STAND_TOP = H * 0.85;
    const lowerBackX = d * 0.42;
    const upperFrontX = d * 0.5;
    const lowerTop = H * 0.7;
    // The second deck all round stands higher than the home side's own.
    const upperBase = decked ? H * 0.98 : H * 0.86;
    const upperTop = decked ? H * 1.6 : H * 1.32;
    const FASCIA = up(1.1);
    type Side = 'n' | 's' | 'e' | 'w';
    // A point `x` in from a side's outer edge, `a` along it.
    const P = (side: Side, x: number, a: number): TilePt => (
      side === 'n' ? [a, row + x] : side === 's' ? [a, row + h - x] : side === 'e' ? [col + w - x, a] : [col + x, a]);
    const spanOf = (side: Side): [number, number] => (side === 'n' || side === 's' ? [iCol, iCol + iW] : [iRow, iRow + iH]);
    const twoDecks = (side: Side) => side === 'w' || decked;
    const stand = (side: Side, fill: number, far: boolean) => {
      const [a0, a1] = spanOf(side);
      if (!twoDecks(side)) {
        return (
          <RakedStand key={side} outer={[P(side, 0, a0), P(side, 0, a1)]} inner={[P(side, d, a0), P(side, d, a1)]}
            bottomH={bottom} topH={STAND_TOP} rows={7} aisles={3} endFaces={false} {...fills(fill)} />
        );
      }
      // The upper deck oversails the lower, so it has no front wall of its
      // own, and the lower deck's back is buried under it. Seen from the
      // field, the upper deck is behind the lower; seen from behind, in front.
      const upper = (
        <RakedStand key={`${side}u`} outer={[P(side, 0, a0), P(side, 0, a1)]} inner={[P(side, upperFrontX, a0), P(side, upperFrontX, a1)]}
          bottomH={upperBase} topH={upperTop} rows={6} aisles={3} frontWall={false} endFaces={false} {...fills(fill * 1.04)} />
      );
      const soffit = (
        <polygon key={`${side}s`} className="iso-undercroft" points={polyPoints([
          atT(P(side, lowerBackX, a0), lowerTop), atT(P(side, lowerBackX, a1), lowerTop),
          atT(P(side, upperFrontX, a1), upperBase), atT(P(side, upperFrontX, a0), upperBase),
        ])} />
      );
      const lower = (
        <RakedStand key={`${side}l`} outer={[P(side, lowerBackX, a0), P(side, lowerBackX, a1)]} inner={[P(side, d, a0), P(side, d, a1)]}
          bottomH={bottom} topH={lowerTop} rows={6} aisles={3} wall={false} endFaces={false} {...fills(fill)} />
      );
      // The upper deck's front edge, a pale band that marks the tier.
      const fascia = (
        <polygon key={`${side}f`} fill={shade(tint, 1.18)} points={polyPoints([
          atT(P(side, upperFrontX, a0), upperBase - FASCIA), atT(P(side, upperFrontX, a1), upperBase - FASCIA),
          atT(P(side, upperFrontX, a1), upperBase), atT(P(side, upperFrontX, a0), upperBase),
        ])} />
      );
      return far ? <>{upper}{soffit}{fascia}{lower}</> : <>{lower}{upper}</>;
    };

    // The corners close the bowl (Plan 61): each a band of seating mitred
    // on the diagonal, as two planar faces continuing the stands either side,
    // then the outer walls the camera can see.
    const corner = (cx: 'w' | 'e', cy: 'n' | 's', key: string) => {
      const sx = cx === 'w' ? 1 : -1; const sy = cy === 'n' ? 1 : -1;
      const oc = cx === 'w' ? col : col + w; const orr = cy === 'n' ? row : row + h;
      const ic = oc + sx * d; const ir = orr + sy * d;
      const fill = fills(cy === 'n' ? 1.0 : 0.8);
      // One band: inner and outer offsets from the edges, and their heights.
      const band = (xi: number, xo: number, zi: number, zo: number, k: string, rows: number) => {
        const faces = [
          // Continuing the stand along the row edge.
          [[ic, orr + sy * xi, zi], [ic, orr + sy * xo, zo], [oc + sx * xo, orr + sy * xo, zo], [oc + sx * xi, orr + sy * xi, zi]],
          // Continuing the stand along the col edge.
          [[oc + sx * xi, ir, zi], [oc + sx * xo, ir, zo], [oc + sx * xo, orr + sy * xo, zo], [oc + sx * xi, orr + sy * xi, zi]],
        ] as const;
        return faces.map((q, i) => {
          const pts = q.map(([c, r, z]) => at(c, r, z));
          const lerp = (p: Pt, q2: Pt, f: number) => ({ x: p.x + (q2.x - p.x) * f, y: p.y + (q2.y - p.y) * f });
          return (
            <g key={`${k}${i}`}>
              <polygon points={polyPoints(pts)} fill={fill.rakeFill} />
              {Array.from({ length: rows - 1 }, (_, j) => {
                const f = (j + 1) / rows;
                const u = lerp(pts[0], pts[1], f); const v = lerp(pts[3], pts[2], f);
                return <line key={j} x1={u.x} y1={u.y} x2={v.x} y2={v.y} stroke={fill.seatStroke} strokeWidth={0.6} />;
              })}
            </g>
          );
        });
      };
      const top = decked ? upperTop : STAND_TOP;
      const rowWallSeen = cy === 'n' ? !northFar : !southFar;
      const colWallSeen = cx === 'w' ? !westFar : !eastFar;
      return (
        <g key={key}>
          {decked ? (
            <>
              {band(d, lowerBackX, bottom, lowerTop, 'l', 6)}
              {band(upperFrontX, 0, upperBase, upperTop, 'u', 6)}
            </>
          ) : band(d, 0, bottom, STAND_TOP, 'l', 7)}
          {rowWallSeen && <polygon fill={fill.wallFill} points={polyPoints([at(oc, orr, 0), at(ic, orr, 0), at(ic, orr, top), at(oc, orr, top)])} />}
          {colWallSeen && <polygon fill={shade(fill.wallFill, 0.92)} points={polyPoints([at(oc, orr, 0), at(oc, ir, 0), at(oc, ir, top), at(oc, orr, top)])} />}
        </g>
      );
    };

    const north = stand('n', 1.0, northFar);
    const south = stand('s', 0.8, southFar);
    // The visitors' side, as tall as the rest now the bowl is whole.
    const east = stand('e', 0.72, eastFar);
    // The home side: two decks and the press box.
    const PRESS_H = up(3.2);
    const pressTop = upperTop;
    const pressBox = boxFaces(col + 0.05, row + h * 0.32, Math.min(0.75, d * 0.25), h * 0.36, pressTop, PRESS_H);
    // The box looks out over the field, toward +col; its glazing shows only
    // while that face is toward the camera.
    const pressGlass = wallOf(pressBox, 'posCol');
    const west = (
      <>
        {stand('w', 1.0, westFar)}
        {sideFaces(pressBox, shade(stone.trim, 0.82), shade(stone.trim, 0.7))}
        {pressGlass.visible && (
          <WallBand origin={pressGlass.origin} along={pressGlass.along} wallHeight={PRESS_H} from={up(0.9)} to={up(2.6)} className="iso-undercroft" />
        )}
        <polygon points={polyPoints(pressBox.top)} fill={shade(stone.trim, 0.95)} />
      </>
    );

    // Floodlight masts at the concourse corners, in screen space. The head
    // is a lamp bank standing up, so its height foreshortens with the tilt.
    const hs = heightScale();
    const mast = (c: number, r: number, key: string) => {
      const foot = project(c, r);
      const top = lift(foot, H * 2.3);
      return (
        <g key={key}>
          <line className="ground-mast" x1={foot.x} y1={foot.y} x2={top.x} y2={top.y} />
          <polygon className="ground-mast-head" points={polyPoints([
            { x: top.x - 8, y: top.y + hs }, { x: top.x + 8, y: top.y + hs }, { x: top.x + 8, y: top.y - 5 * hs }, { x: top.x - 8, y: top.y - 5 * hs },
          ])} />
        </g>
      );
    };
    const m = d * 0.45;
    // Back corner first, the two side corners between the far and near
    // stands (each is behind the near stand beside it and in front of the
    // far one), the front corner last.
    const masts = ([[col + m, row + m], [col + w - m, row + m], [col + m, row + h - m], [col + w - m, row + h - m]] as const)
      .map(([c, r], i) => ({ y: project(c, r).y, node: mast(c, r, `m${i}`) }))
      .sort((a, b) => a.y - b.y)
      .map((x) => x.node);

    // The scoreboard, on posts behind the north end, facing the field (+row).
    const board = (() => {
      const bw = Math.min(3.2, iW * 0.3); const bd = 0.35;
      const bc = col + w / 2 - bw / 2; const br = row + d * 0.12;
      const base = (decked ? upperTop : H) * 0.98 + (decked ? up(1.0) : 0); const height = up(4.6);
      const f = boxFaces(bc, br, bw, bd, base, height);
      const face = wallOf(f, 'posRow');
      const post = (c: number) => {
        const foot = project(c, br + bd / 2);
        const head = lift(foot, base);
        return <line key={c} className="ground-post" x1={foot.x} y1={foot.y} x2={head.x} y2={head.y} />;
      };
      return (
        <g key="board">
          {post(bc + 0.2)}
          {post(bc + bw - 0.2)}
          {sideFaces(f, '#3a3d40', '#2d2f31')}
          <polygon points={polyPoints(f.top)} fill="#4a4d50" />
          {face.visible && (
            <WallBand origin={face.origin} along={face.along} wallHeight={height} from={height * 0.18} to={height * 0.82} className="ground-scoreboard-face" />
          )}
        </g>
      );
    })();
    // The board stands above the north stand's back rows: behind them while
    // that stand is far, over them while it is near.
    const northEnd = northFar ? <>{board}{north}</> : <>{north}{board}</>;

    // Far stands, the field, the near stands: whichever two are far now.
    const far: React.JSX.Element[] = [];
    const near: React.JSX.Element[] = [];
    (northFar ? far : near).push(<g key="n">{northEnd}</g>);
    (westFar ? far : near).push(<g key="w">{west}</g>);
    (southFar ? far : near).push(<g key="s">{south}</g>);
    (eastFar ? far : near).push(<g key="e">{east}</g>);

    // Corners by how many of their two stands are far: the back corner
    // before the far stands, the side corners between, the front one last.
    const corners = ([['w', 'n'], ['e', 'n'], ['w', 's'], ['e', 's']] as const).map(([cx, cy]) => ({
      node: corner(cx, cy, `c${cx}${cy}`),
      farCount: (cy === 'n' ? (northFar ? 1 : 0) : (southFar ? 1 : 0)) + (cx === 'w' ? (westFar ? 1 : 0) : (eastFar ? 1 : 0)),
    }));
    const cornersAt = (n: number) => corners.filter((c) => c.farCount === n).map((c) => c.node);

    return (
      <>
        {/* The concourse, under everything. */}
        <polygon points={polyPoints(f.top)} fill={concourse} />
        {cornersAt(2)}
        {masts[0]}
        {far}
        <StadiumField col={iCol} row={iRow} w={iW} h={iH} />
        {cornersAt(1)}
        {masts[1]}
        {masts[2]}
        {near}
        {cornersAt(0)}
        {masts[3]}
      </>
    );
  }

  if (motif === 'block' && !site && t.id === BUSINESS_SCHOOL_ID) {
    return (
      <BusinessSchool
        t={t} p={p} pal={pal} stone={stone} paneShape={paneShape} paneW={paneW}
        crest={crest} plantTint={plantTint} cornice={surfaceCornice} trim={trim} door={door}
      />
    );
  }

  if (motif === 'block' && !site && isHospital(t) && Math.min(w, h) >= BLOCK_SPLIT_MIN_TILES) {
    // The hospital: a tall ward slab at the back and a lower glazed public
    // wing in front. Only the Medical Center splits (Plan 87A: the size rule
    // alone drew the Business School as a hospital), and only when large
    // (BLOCK_SPLIT_MIN_TILES); other `block`s are one box.
    const slabStoreys = storeysOf(t);
    const wingStoreys = Math.max(2, Math.round(slabStoreys * WING_STOREY_FRACTION));
    const slabH = slabStoreys * STOREY;
    const wingH = wingStoreys * STOREY;
    const undercroft = UNDERCROFT_STOREYS * STOREY;
    // Set out in the building's own frame (Plan 88): the slab across the
    // back, the wing at the front's left.
    const slab = localBox(p, 0, fd * (1 - SLAB_ROW_FRACTION), fw, fd);
    const wing = localBox(p, 0, 0, fw * WING_COL_FRACTION, fd * (1 - SLAB_ROW_FRACTION));
    const sf = boxFaces(slab.col, slab.row, slab.w, slab.h, 0, slabH);
    const wf = boxFaces(wing.col, wing.row, wing.w, wing.h, 0, wingH);
    const lines = (storeys: number) => Array.from({ length: storeys - 1 }, (_, i) => (i + 1) * STOREY);
    const slabSills = rankSills(slabStoreys).filter((v) => v >= undercroft);
    const undercroftBand = (o: Pt, a: Pt, wh: number) => (
      <WallBand origin={o} along={a} wallHeight={wh} from={0} to={undercroft} className="iso-undercroft" />
    );
    const eaves = (o: Pt, a: Pt, wh: number) => (
      <WallBand origin={o} along={a} wallHeight={wh} from={wh - EAVES_COURSE} to={wh} className="iso-cornice" fill={surfaceCornice} />
    );

    // Nearer volume paints second. The wing's glazed entrance is the
    // front, drawn while the camera sees it; the cross goes on the wing's
    // right side, standing clear of the slab's front, or its left.
    const wingInFront = occludes(wing, slab) !== -1;
    const wingFront = sides.front;
    const wingWall = wallOf(wf, wingFront);
    const wingSpan = wallSpan(wing.w, wing.h, wingFront);
    const crossDir = [sides.right, sides.left].find(isSeen);
    const crossWall = crossDir ? wallOf(wf, crossDir) : null;
    // The slab's own ways in: a plain door on each side, the service door
    // at the back (the wing's front hides the slab's).
    const slabDoors = [sides.left, sides.right, sides.back].filter(isSeen).map((dir) => (
      <PlainEntrance key={`sd${dir}`} d={doorOn(dir) ?? sideDoor} col={slab.col} row={slab.row} w={slab.w} h={slab.h} dir={dir}
        wallHeight={slabH} stone={stone} service={dir === sides.back} />
    ));
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
        {slabDoors}
        <polygon points={polyPoints(sf.top)} fill={pal.roofDeck} />
        {[[0.08, 0.16, 0.26, 0.34], [0.40, 0.12, 0.22, 0.30], [0.70, 0.20, 0.24, 0.36]]
          .map(([fx, fy, sw, sh], i) => (
            <PlantScreen
              key={i} col={slab.col + slab.w * fx} row={slab.row + slab.h * fy}
              w={slab.w * sw} h={slab.h * sh} base={slabH}
            />
          ))}
        {(() => {
          // The helipad: a ring and an H on the slab's deck, toward the wing.
          const { col: hc, row: hr } = localToGrid(p, fw * 0.5, fd * (1 - SLAB_ROW_FRACTION * 0.76));
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
        <Crest crest={crest} {...slab} base={slabH} fronts={fronts} pal={pal} stone={stone} tile={plantTint} />
      </>
    );
    const wingNode = (
      <>
        {/* The public wing: curtain wall on the front, cross on the end. */}
        <polygon points={polyPoints(wf.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(wf.right)} fill={pal.wallRight} />
        {wingWall.visible && (
          <CurtainWall
            origin={wingWall.origin} along={wingWall.along} wallHeight={wingH} spanTiles={wingSpan}
            from={undercroft} floors={lines(wingStoreys)} id="wl"
          />
        )}
        {undercroftBand(wf.D, wf.C, wingH)}
        {undercroftBand(wf.C, wf.B, wingH)}
        {eaves(wf.D, wf.C, wingH)}
        {eaves(wf.C, wf.B, wingH)}
        <polygon points={polyPoints(wf.top)} fill={pal.roofDeck} />
        <Crest crest={crest} {...wing} base={wingH} fronts={fronts} pal={pal} stone={stone} tile={plantTint} />
        {crossDir && crossWall && (
          <RedCross
            origin={crossWall.origin} along={crossWall.along} wallHeight={wingH} spanTiles={wallSpan(wing.w, wing.h, crossDir)}
            centreU={0.5} centreV={(wingH - STOREY * 1.1) / wingH}
          />
        )}

        {/* The way in, under the glazed front. */}
        {door && wingWall.visible && <Door d={door} origin={wingWall.origin} along={wingWall.along} wallHeight={wingH} span={wingSpan} side={wingFront} />}
        {door && wingWall.visible && (
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
        {signifier && <RoofSignifier kind={signifier} col={col} row={row} w={w} h={h} base={H} ridge={0} f={f} stone={stone} pal={pal} facing={p.facing} />}
        {/* The recess on the front; plain doors in the base elsewhere. */}
        {entrance === 'recess' && (
          <>
            {mainFronts.map((dir) => <Recess key={dir} pal={pal} col={col} row={row} w={w} h={h} wallHeight={H * STACK_LOWER_TOP} outward={dir} />)}
          </>
        )}
        {(entrance === 'recess' ? plainFronts : fronts).map((dir) => (
          <PlainEntrance key={`pe${dir}`} d={doorOn(dir) ?? sideDoor} col={col} row={row} w={w} h={h} dir={dir}
            wallHeight={H * STACK_LOWER_TOP} stone={stone} service={dir === sides.back} />
        ))}
      </>
    );
  }

  // Georgian's Founders Hall draws itself (Plan 87M), and its sibling
  // halls the same, without the clock tower.
  if (motif === 'hall' && !site && inFlight === 0 && georgianHall(t, vernacular)) {
    const roofPal = snowOnRoofs(paletteFrom({ wall: material.wall, roof: FH_SLATE }, wallShadeOf(t)), snow);
    return (
      <GeorgianFoundersHall col={col} row={row} w={w} h={h} facing={p.facing} H={H} ridge={ridge} courses={courses}
        pal={pal} roof={roofPal} stone={stone} door={door} wallTone={shade(material.wall, wallShadeOf(t))} tower={hasClockTower(t)} />
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
    // Modern's Founders Hall (Plan 87L).
    const carillon = hasClockTower(t) && apex === 'core';
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
    const turretProps = {
      pal, glass: stone.glass, paneW,
      col: towerAt(towerPlan).col, row: towerAt(towerPlan).row, plan: towerPlan,
      height: WH + STOREY * 1.9, sills: rankSills(ranks + 2), crenels: crenellations, capRise: up(5.0),
    };
    const turretNode = <CornerTower {...turretProps} />;
    // The roof a porch or portico runs back into (Plan 87O): the deck
    // behind the parapet and the hip (or mansard) on it.
    const ri = col + inset - eaves; const rj = row + inset - eaves; const rwi = w - inset * 2 + eaves * 2; const rhi = h - inset * 2 + eaves * 2;
    const hallRoofAt = eitherRoof(flatRoofAt(col, row, w, h, WH),
      ridge > 0 && mansard ? mansardRoofAt(ri, rj, rwi, rhi, WH, ridge) : ridge > 0 ? hipRoofAt(ri, rj, rwi, rhi, WH, ridge) : flatRoofAt(ri, rj, rwi, rhi, WH));
    // The bell-gable stands on the front: after the roof while the camera
    // sees it, else its back, before the mass, over the far eaves.
    const gableOn = bellGable && !hasClockTower(t) && !signifier;
    const gableWall = wallOf(hf, sides.front);
    const gableNode = (rear?: string) => (
      <BellGable pal={pal} stone={stone}
        origin={gableWall.origin} along={gableWall.along}
        inward={gableInward(col, row, w, h, sides.front)}
        wallHeight={WH} span={wallSpan(w, h, sides.front)} centreU={0.5} sideAt={sides.front === seen.left ? 'u1' : 'u0'} rear={rear}
      />
    );
    return (
      <>
        {gableOn && !gableWall.visible && gableNode(shade(pal.wall[opposite(sides.front)], 0.9))}
        {turrets && !cornerInFront && turretNode}
        <polygon points={polyPoints(hf.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(hf.right)} fill={pal.wallRight} />
        {timbering && (
          <>
            <Timbering origin={hf.D} along={hf.C} wallHeight={WH} span={hf.spanLeft} from={STOREY} to={H} floors={courses} />
            <Timbering origin={hf.C} along={hf.B} wallHeight={WH} span={hf.spanRight} from={STOREY} to={H} floors={courses} />
          </>
        )}

        {/* Floor courses, plinth, cornice and parapet. */}
        {trim && floorCourses(hf.D, hf.C, WH, courses, 'l')}
        {trim && floorCourses(hf.C, hf.B, WH, courses, 'r')}
        {trim && band(0, PLINTH, 'iso-plinth', 'p')}
        {trim && band(H - CORNICE, H, 'iso-cornice', 'c')}
        {trim && parapet > 0 && band(H, WH, 'iso-parapet', 'q')}

        {/* Reserve each wall's door bay here, even the front's on its pavilion. */}
        {windows(hf.D, hf.C, WH, hf.spanLeft, sills, paneW, 'l', paneShape, stone.glass, bayOf(doorOn(hf.dir.CD), hf.spanLeft, WH), lights)}
        {windows(hf.C, hf.B, WH, hf.spanRight, sills, paneW, 'r', paneShape, stone.glass, bayOf(doorOn(hf.dir.BC), hf.spanRight, WH), lights)}
        {/* Modern: a recessed, glazed ground floor under the banded floors
            above (Plan 74G), so the hall does not read as a parking garage. */}
        {glazedCivic && (
          <>
            <CurtainWall origin={hf.D} along={hf.C} wallHeight={WH} spanTiles={hf.spanLeft} from={PLINTH} to={STOREY * 0.9} floors={[]} id="gfl" u0={0.03} u1={0.97} />
            <CurtainWall origin={hf.C} along={hf.B} wallHeight={WH} spanTiles={hf.spanRight} from={PLINTH} to={STOREY * 0.9} floors={[]} id="gfr" u0={0.03} u1={0.97} />
            {band(STOREY * 0.9, STOREY * 1.02, 'iso-undercroft', 'gs')}
          </>
        )}
        {/* On pilotis, and on Founders Hall behind fins (Plan 87L). */}
        {glazedCivic && (
          <Pilotis col={col} row={row} w={w} h={h} top={STOREY * 1.02} facing={p.facing} pal={pal} stone={stone}
            door={entrance === 'canopy' ? door : null} reserve={carillon ? carillonReserve(w, h) : 0} />
        )}
        {glazedCivic && carillon && (
          <BriseSoleil col={col} row={row} w={w} h={h} from={STOREY * 1.02} to={WH} facing={p.facing} stone={stone} reserve={carillonReserve(w, h)} />
        )}

        {deckPiers && fronts.map((dir) => <Piers key={`dp${dir}`} stone={stone} col={col} row={row} w={w} h={h} height={WH} outward={dir} pal={pal} />)}
        {deckPiers && (
          <>
            <WallBand origin={hf.D} along={hf.C} wallHeight={WH} from={H - CORNICE * 2.4} to={H - CORNICE * 1.2} className="iso-cornice" fill={stone.gilt} />
            <WallBand origin={hf.C} along={hf.B} wallHeight={WH} from={H - CORNICE * 2.4} to={H - CORNICE * 1.2} className="iso-cornice" fill={shade(stone.gilt, 0.82)} />
          </>
        )}
        {buttresses && (
          <>
            {fronts.map((dir) => {
              const s = wallSpan(w, h, dir);
              // The front's centre bay, a plain door's width elsewhere.
              const half = dir === sides.front ? pavilionWidth(s) / s / 2 : (doorOn(dir)?.widthTiles ?? 0) * 0.95 / s;
              return (
                <Buttresses key={dir} pal={pal} stone={stone} col={col} row={row} w={w} h={h} height={H} outward={dir}
                  reserve={[0.5 - half, 0.5 + half]} skipNear={turrets ? towerPlan : 0} corner={towerCorner} />
              );
            })}
          </>
        )}

        {/* The gutter behind the parapet; without it the lawn shows through
            the roof's inset. */}
        {parapet > 0 && (
          <polygon points={polyPoints(boxFaces(col, row, w, h, 0, WH).top)} fill={pal.roofDeck} />
        )}
        {/* Deep eaves: a shadow band at the wall head, and roof oversail. */}
        {eaves > 0 && band(H - up(0.9), H, 'iso-eaves-shadow', 's')}
        {brackets && (
          <>
            <EavesBrackets origin={hf.D} along={hf.C} wallHeight={WH} span={hf.spanLeft} top={H} stone={stone} />
            <EavesBrackets origin={hf.C} along={hf.B} wallHeight={WH} span={hf.spanRight} top={H} stone={stone} />
          </>
        )}
        {ridge > 0 && mansard ? (
          <MansardRoof
            col={col + inset - eaves} row={row + inset - eaves} w={w - inset * 2 + eaves * 2} h={h - inset * 2 + eaves * 2}
            base={WH} rise={ridge} pal={pal} stone={stone}
          />
        ) : ridge > 0 ? (
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
        {/* The eaves balustrade (Plan 87H), after the roof so it stands on its edge. */}
        {rooflineEnd === 'balustrade' && <EavesBalustrade col={col} row={row} w={w} h={h} base={WH} stone={stone} />}
        {/* Raised roofline ends, after the roof so they close it. */}
        {rooflineEnd === 'pavilion' && depthOrder(cornerPavilions(col, row, w, h, endPlan, Math.min(END_PAVILION_DEPTH, endPlan / 2))).map((b, i) => (
          <EndPavilion stone={stone} key={`e${i}`} col={b.col} row={b.row} w={b.w} h={b.h} base={WH} pal={pal} />
        ))}

        {/* The corner tower, after the roof and before the porch. */}
        {turrets && cornerInFront && turretNode}
        {turrets && towerProudFace && <CornerTower {...turretProps} face={towerProudFace} />}
        {/* A signifier on the ridge (Plan 85E: the Faculty Training
            Institute's cupola), standing in for the bell-gable. */}
        {signifier && <RoofSignifier kind={signifier} col={col} row={row} w={w} h={h} base={WH} ridge={ridge} f={hf} stone={stone} pal={pal} facing={p.facing} />}
        {/* The bell-gable, on every hall but the campanile's. */}
        {gableOn && gableWall.visible && gableNode()}
        {/* hasClockTower picks the building; the vernacular picks the apex. */}
        {hasClockTower(t) && apex === 'campanile' && (
          <Campanile stone={stone} pal={pal} gilded={hasGilt(vernacular)}
            col={col} row={row} w={w} h={h} base={WH + ridge * 0.4} />
        )}
        {hasClockTower(t) && apex === 'dome' && (
          <Dome stone={stone} col={col} row={row} w={w} h={h} base={WH + ridge * 0.4} />
        )}
        {hasClockTower(t) && apex === 'gatehouse' && (
          <Gatehouse stone={stone} col={col} row={row} w={w} h={h} base={WH + ridge * 0.4} facing={p.facing} />
        )}
        {hasClockTower(t) && apex === 'belvedere' && (
          <Belvedere stone={stone} pal={pal} col={col} row={row} w={w} h={h} base={WH + ridge * 0.4} />
        )}
        {hasClockTower(t) && apex === 'pavilionTower' && (
          <PavilionTower stone={stone} pal={pal} col={col} row={row} w={w} h={h} base={WH + ridge * 0.4} />
        )}
        {hasClockTower(t) && apex === 'ziggurat' && (
          <Ziggurat stone={stone} col={col} row={row} w={w} h={h} base={WH} />
        )}
        {hasClockTower(t) && (apex === 'cupola' || apex === 'spire') && (
          <ClockTower stone={stone} apex={apex} gilded={hasGilt(vernacular)} col={col} row={row} w={w} h={h} base={WH + ridge * 0.4} />
        )}
        {/* Modern: the carillon and a roof terrace (Plan 87L), not the
            stair core; the terrace first unless it stands in front. */}
        {carillon && (() => {
          const terrace = <FoldedPlateTerrace key="ft" col={col} row={row} w={w} h={h} base={WH} facing={p.facing} stone={stone} />;
          const tower = <Carillon key="ct" stone={stone} col={col} row={row} w={w} h={h} base={WH} facing={p.facing} />;
          const plan = roofTerracePlan(col, row, w, h, p.facing);
          const towerPlan = { ...carillonPlan(col, row, w, h, p.facing), node: tower };
          return <>{depthOrder([{ ...plan, node: terrace }, towerPlan]).map((b) => b.node)}</>;
        })()}

        {/* Entrances last, painting over their wall. The centre bay belongs
            to the portico entrance; other vernaculars bring their own. */}
        {entrance === 'portico' && (
          <>
            {mainFronts.map((dir) => (
              <CentrePavilion key={dir} paneShape={paneShape} glass={stone.glass}
                col={col} row={row} w={w} h={h} wallHeight={H} outward={dir}
                pal={pal} door={door} sills={sills} paneW={paneW} tied
              />
            ))}
            {/* A temple front on the centre bay (Plan 87O, after 87M's):
                four columns, or (grandPortico) six, to the cornice under a
                pediment whose roof runs back into the hip. */}
            {mainFronts.map((dir) => {
              const span = wallSpan(w, h, dir);
              const pw = pavilionWidth(span);
              const bay = againstWall(col, row, w, h, dir, span / 2 - pw / 2, pw, PAVILION_DEPTH);
              return (
                <TiedPortico key={`hp${dir}`} col={bay.col} row={bay.row} w={bay.w} h={bay.h} dir={dir}
                  width={pw * (grandPortico ? 1.2 : 1)} depth={HALL_PORTICO_DEPTH}
                  base={door ? door.threshold : 0} top={H} podium steps={door}
                  columns={grandPortico ? 6 : PORTICO_COLUMNS} roofAt={hallRoofAt}
                  slopes={ridge > 0 ? pal : toneSlopes(pal.roof)} stone={stone} oculus={grandPortico} />
              );
            })}
          </>
        )}
        {entrance === 'canopy' && door && (
          <>
            {mainFronts.map((dir) => {
              const fwall = wallOf(hf, dir);
              return <Door key={`d${dir}`} d={door} origin={fwall.origin} along={fwall.along} wallHeight={WH} span={wallSpan(w, h, dir)} side={dir} shape={doorShape} />;
            })}
            {mainFronts.map((dir) => <Canopy key={dir} stone={stone} d={door} col={col} row={row} w={w} h={h} outward={dir} wallHeight={H} hood={hood} roof={surface ? plantTint : material.roof} />)}
          </>
        )}
        {entrance === 'porch' && (
          <>
            {mainFronts.map((dir) => (
              <Porch key={dir} pal={pal} stone={stone}
                col={col} row={row} w={w} h={h} wallHeight={H} outward={dir} roofAt={hallRoofAt}
              />
            ))}
          </>
        )}
        {entrance === 'recess' && (
          <>
            {mainFronts.map((dir) => <Recess key={dir} pal={pal} col={col} row={row} w={w} h={h} wallHeight={H} outward={dir} />)}
          </>
        )}
        {entrance === 'arcade' && (
          <>
            {/* The door behind the arcade, at grade, then the arcade over it. */}
            {door && mainFronts.map((dir) => {
              const fwall = wallOf(hf, dir);
              return <Door key={`d${dir}`} d={{ ...door, threshold: 0, treads: 0 }} origin={fwall.origin} along={fwall.along} wallHeight={WH} span={wallSpan(w, h, dir)} side={dir} shape={doorShape} />;
            })}
            {mainFronts.map((dir) => <Arcade key={dir} pal={pal} stone={stone} col={col} row={row} w={w} h={h} outward={dir} height={arcadeHeight(H)} />)}
          </>
        )}
        {/* Steps land at the entrance's front (entranceStandoff); the
            portico brings its own (Plan 87O). */}
        {door && flights && entrance !== 'portico' && mainFronts.map((dir) => {
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
        {/* The sides' plain doors and the back's service door. */}
        {plainFronts.map((dir) => (
          <PlainEntrance key={`pe${dir}`} d={doorOn(dir)} col={col} row={row} w={w} h={h} dir={dir}
            wallHeight={WH} stone={stone} shape={doorShape} service={dir === sides.back} />
        ))}
      </>
    );
  }

  if (motif === 'hangar' && !site) {
    // Clear-span sheds: pier-and-panel walls lit by a band near the eaves,
    // in three silhouettes, the same in every vernacular:
    //   fitness    box, monitor roof, glazed entrance bay, canopy
    //   arena      barrel vault over a glazed concourse
    //   studio     blank sound stage with a roller door
    // The sports sheds draw as what they are (Plan 87C, sportsShedOf).
    const sports = sportsShedOf(t);
    if (sports) {
      const ctx: ShedCtx = {
        col, row, w, h, H, pal, stone, door, fronts, crest, plantTint, hood, entrance,
        cornice: surfaceCornice, expansions: t.expansions ?? 0, facing: p.facing,
      };
      if (sports === 'rec') return <RecCenterShed c={ctx} />;
      if (sports === 'gym') return <GymShed c={ctx} />;
      if (sports === 'courts') return <CourtsShed c={ctx} />;
      if (sports === 'fieldHouse') return <FieldHouseShed c={ctx} />;
      return <NatatoriumShed c={ctx} />;
    }
    const kind: 'fitness' | 'arena' | 'studio' =
      t.facilityType === 'athleticsArena' ? 'arena'
        : t.id === 'LAB-FILM' ? 'studio' : 'fitness';
    const alongW = w >= h;
    const SHED_GLASS = 'rgba(52, 72, 84, 0.6)';
    const clere = [clerestorySill(H)];
    const glassHead = Math.min(STOREY * 1.3, clerestorySill(H) - up(0.5));
    const left = { o: f.D, a: f.C, span: f.spanLeft, dir: f.dir.CD };
    const right = { o: f.C, a: f.B, span: f.spanRight, dir: f.dir.BC };
    // The sound stage's great door: on the front when it is the long wall,
    // else on the right side (Plan 88), while the camera sees it.
    const stageDir = fw >= fd ? sides.front : sides.right;
    const stageWall = wallOf(f, stageDir);

    const courses = ([[f.D, f.C] as const, [f.C, f.B] as const]).map(([o, a], i) => (
      <g key={`b${i}`}>
        <WallBand origin={o} along={a} wallHeight={H} from={0} to={BASE_COURSE} className="iso-plinth" />
        <WallBand origin={o} along={a} wallHeight={H} from={H - EAVES_COURSE} to={H} className="iso-cornice" fill={surfaceCornice} />
      </g>
    ));
    const piers = (
      <>
        {fronts.map((dir) => <Piers key={dir} stone={stone} col={col} row={row} w={w} h={h} height={H} outward={dir} pal={pal} />)}
      </>
    );
    // The front's door; plain ones on the sides, a service door at the back.
    const doors = door && (
      <>
        {mainFronts.map((dir) => {
          const span = wallSpan(w, h, dir);
          const fwall = wallOf(f, dir);
          const at = outsideWall(col, row, w, h, dir, span / 2, 0);
          const out = outwardOf(dir);
          return (
            <g key={dir}>
              <Door d={door} origin={fwall.origin} along={fwall.along} wallHeight={H} span={span} side={dir} />
              <EntranceSteps stone={stone} d={door} centreCol={at.col} centreRow={at.row} outCol={out.col} outRow={out.row} span={span} />
            </g>
          );
        })}
        {plainFronts.map((dir) => (
          <PlainEntrance key={`pe${dir}`} d={doorOn(dir)} col={col} row={row} w={w} h={h} dir={dir} wallHeight={H} stone={stone} service={dir === sides.back} />
        ))}
      </>
    );
    // The clerestory: one continuous band under the eaves.
    const clerestory = (face: { o: Pt; a: Pt; span: number; dir: FaceDir }, key: string) =>
      windows(face.o, face.a, H, face.span, clere, paneW, key, 'ribbon', SHED_GLASS, bayOf(doorOn(face.dir), face.span, H));

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
      // A faceted barrel vault down the long axis, closed at whichever end
      // faces the camera, over a glazed ground-floor concourse.
      const VAULT = up(6.5);
      const N = 7;
      const along0 = 0.015; const along1 = 0.985;
      const pt = (a: number, c: number, z: number) => lift(
        alongW ? project(col + w * a, row + h * c) : project(col + w * c, row + h * a), z,
      );
      const zAt = (c: number) => H + VAULT * Math.sin(Math.PI * c);
      // The vault's two long sides fall toward -row and +row (or -col and
      // +col): facets on the far side go down first, since near the
      // springing they are steeper than the view and would paint over
      // the near side's.
      const lowSide: FaceDir = alongW ? 'negRow' : 'negCol';
      const facetOrder = Array.from({ length: N }, (_, i) => i);
      if (wallOf(f, lowSide).visible) facetOrder.reverse();
      const facets = facetOrder.map((i) => {
        const c0 = i / N; const c1 = (i + 1) / N; const cm = (c0 + c1) / 2;
        return (
          <polygon
            key={i}
            points={polyPoints([pt(along0, c0, zAt(c0)), pt(along1, c0, zAt(c0)), pt(along1, c1, zAt(c1)), pt(along0, c1, zAt(c1))])}
            fill={shade(pal.roof, 1.14 - 0.44 * cm)}
          />
        );
      });
      // The end wall's lunette, at the end the camera sees (+col or +row at
      // the opening camera, the other end half the time).
      const highEnd: FaceDir = alongW ? 'posCol' : 'posRow';
      const endDir = wallOf(f, highEnd).visible ? highEnd : opposite(highEnd);
      const endAt = endDir === highEnd ? along1 : along0;
      const endFace = (
        <polygon
          points={polyPoints(Array.from({ length: N + 1 }, (_, i) => pt(endAt, i / N, zAt(i / N))))}
          fill={pal.wall[endDir]}
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

    if (kind === 'studio') {
      // The great stage door, taller than a shed's roller (Plan 74F).
      const STAGE_DOOR = 0.74;
      // No windows; a roller door on the long face beside the ordinary one.
      return (
        <>
          <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
          <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
          {piers}
          {courses}
          {stageWall.visible && (
            <>
              <WallBand origin={stageWall.origin} along={stageWall.along} wallHeight={H} from={0} to={H * STAGE_DOOR} className="iso-roller" u0={0.62} u1={0.9} />
              <WallBand origin={stageWall.origin} along={stageWall.along} wallHeight={H} from={H * STAGE_DOOR} to={H * STAGE_DOOR + up(0.4)} className="iso-cornice" u0={0.61} u1={0.91} />
            </>
          )}
          {signifier === 'soundstage' && stageWall.visible && (() => {
            // The stage's red lamp over its great door (Plan 74F).
            const lamp = facePoint(stageWall.origin, stageWall.along, H, 0.76, (H * STAGE_DOOR + up(1.4)) / H);
            return (
              <g className="sig-soundstage">
                <circle cx={lamp.x} cy={lamp.y} r={7} fill="rgba(214, 58, 47, 0.25)" />
                <circle cx={lamp.x} cy={lamp.y} r={3.2} fill="#d63a2f" />
              </g>
            );
          })()}
          {doors}
          <polygon points={polyPoints(f.top)} fill={pal.roof} />
          {monitor}
          <Crest crest={crest} col={col} row={row} w={w} h={h} base={H} fronts={fronts} pal={pal} stone={stone} tile={plantTint} />
        </>
      );
    }

    // Fitness: a glazed bay round each door and a canopy.
    const bay = (face: { o: Pt; a: Pt; span: number; dir: FaceDir }, key: string) => {
      if (!door || face.dir !== sides.front) return null;
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
        {door && mainFronts.map((dir) => {
          // The vernacular's way in (Plan 74E): an arched porch in Mission,
          // a small portico in Classical, a canopy (hooded in Gothic) else.
          if (entrance === 'archway') return <Archway key={dir} pal={pal} stone={stone} d={door} col={col} row={row} w={w} h={h} outward={dir} wallHeight={H} />;
          // The portico after the roof (Plan 87O, below).
          if (entrance === 'portico') return null;
          return <Canopy key={dir} stone={stone} d={door} col={col} row={row} w={w} h={h} outward={dir} wallHeight={H} hood={hood} roof={plantTint} />;
        })}
        <polygon points={polyPoints(f.top)} fill={pal.roof} />
        {monitor}
        {door && entrance === 'portico' && mainFronts.map((dir) => (
          <TiedPortico key={`tp${dir}`} col={col} row={row} w={w} h={h} dir={dir} width={Math.min(door.widthTiles * 3.2, wallSpan(w, h, dir) * 0.6)}
            depth={across(2.4)} base={0} top={H} columns={4} roofAt={flatRoofAt(col, row, w, h, H)}
            slopes={toneSlopes(pal.roof)} stone={stone} />
        ))}
        <Crest crest={crest} col={col} row={row} w={w} h={h} base={H} fronts={fronts} pal={pal} stone={stone} tile={plantTint} />
        {signifier && <RoofSignifier kind={signifier} col={col} row={row} w={w} h={h} base={H} ridge={0} f={f} stone={stone} pal={pal} facing={p.facing} />}
      </>
    );
  }

  const gabled = ridge > 0;
  const alongW = w >= h;
  // A terrace hall's tall ground-floor windows (Plan 87D).
  const tallGround = bare === true && diningBandOf(t) === 'terrace' && ranks > 0;
  // A residence hall's stair turret: smaller, plain-capped, only on long walls.
  // Collegiate Gothic's library carries a crenellated tower at its corner
  // (Plan 74G), taller than a residence's turret.
  const libraryTower = gothicCivicOf(t, vernacular) === 'library' && gabled;
  const turretPlan = libraryTower
    ? Math.min(across(6.5), Math.min(w, h) * 0.26)
    : turrets && motif === 'residential' && Math.min(w, h) >= 2.8 && gabled
      ? Math.min(across(4.8), Math.min(w, h) * 0.2)
      : 0;
  // Whether the door is reached through an archway porch (own or fallback).
  const porched = entrance === 'archway' || entrance === 'porch' || (entrance === 'arcade' && !arcadeFits(H) && shortArcadeFallback === 'archway');
  // Where this door's flight lands: the porch front, the portico's columns,
  // or the wall.
  const stepStandoff = porched ? PAVILION_DEPTH : entrance === 'portico' ? PORTICO_STANDOFF + PORTICO_COLUMN_PLAN
    : grand === 'decoPortal' ? DECO_PORTAL_DEPTH : 0;
  // Gable when the short side is under 4 tiles, hip otherwise.
  const hipped = gabled && Math.min(w, h) >= 4;
  // The roof's footprint, including eaves oversail.
  const rc = col - eaves; const rr = row - eaves; const rw = w + eaves * 2; const rh = h + eaves * 2;
  const rf = boxFaces(rc, rr, rw, rh, 0, H);
  // The roof a portico's or porch's gable runs back into (Plan 87O).
  const tieRoof = gabled && mansard ? mansardRoofAt(rc, rr, rw, rh, H, ridge)
    : hipped ? hipRoofAt(rc, rr, rw, rh, H, ridge)
      : gabled ? gableRoofAt(rc, rr, rw, rh, H, ridge)
        : flatRoofAt(col, row, w, h, H);
  // Painted after the roof when its corner faces the camera, else before the walls.
  const residentialTurretProps = {
    pal, glass: stone.glass, paneW,
    col: towerAt(turretPlan).col, row: towerAt(turretPlan).row, plan: turretPlan,
    height: H + STOREY * (libraryTower ? 2.2 : 0.8), sills: rankSills(ranks + (libraryTower ? 2 : 1)),
    crenels: libraryTower, capRise: up(libraryTower ? 5.0 : 4.2),
  };
  const residentialTurret = turretPlan > 0 && <CornerTower {...residentialTurretProps} />;
  const rs = lift(alongW ? project(rc, rr + rh / 2) : project(rc + rw / 2, rr), H + ridge);
  const re = lift(alongW ? project(rc + rw, rr + rh / 2) : project(rc + rw / 2, rr + rh), H + ridge);
  // Glazing that faces the street: on the front and sides, not the back.
  const shopWalls = ([[f.D, f.C, f.spanLeft, f.dir.CD], [f.C, f.B, f.spanRight, f.dir.BC]] as const).filter(([, , , d]) => d !== sides.back);
  // The bell-gable, on the front (Plan 88): after the roof while it is seen.
  const gableWall = wallOf(f, sides.front);
  const pavilionGable = !site && bellGable && motif === 'pavilion' && gabled && !!door && !glyphs && !grand;
  const pavilionGableNode = (rear?: string) => (
    <BellGable pal={pal} stone={stone}
      origin={gableWall.origin} along={gableWall.along}
      inward={gableInward(col, row, w, h, sides.front)}
      wallHeight={H} span={wallSpan(w, h, sides.front)} centreU={0.5} sideAt={sides.front === seen.left ? 'u1' : 'u0'} scale={0.8} rear={rear}
    />
  );

  return (
    <>
      {/* What stands on a front the camera does not see and rises past the
          roofline shows over it: drawn before the walls. */}
      {!site && grand === 'decoPortal' && !gableWall.visible && (
        <DecoPortal col={col} row={row} w={w} h={h} outward={sides.front} wallHeight={H} stone={stone} />
      )}
      {pavilionGable && !gableWall.visible && pavilionGableNode(shade(pal.wall[opposite(sides.front)], 0.9))}
      {!site && !cornerInFront && residentialTurret}
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      {/* Tudor: timbered above the ground floor, on pitched buildings tall
          enough to have one. */}
      {!site && timbering && gabled && H > STOREY * 1.5 && (
        <>
          <Timbering origin={f.D} along={f.C} wallHeight={H} span={f.spanLeft} from={STOREY} to={H} floors={courses} />
          <Timbering origin={f.C} along={f.B} wallHeight={H} span={f.spanRight} from={STOREY} to={H} floors={courses} />
        </>
      )}
      {!site && trim && floorCourses(f.D, f.C, H, courses, 'l')}
      {!site && trim && floorCourses(f.C, f.B, H, courses, 'r')}
      {/* Base and eaves courses shared with the halls. */}
      {!site && trim && ([[f.D, f.C] as const, [f.C, f.B] as const]).map(([o, a], i) => (
        <g key={`b${i}`}>
          <WallBand origin={o} along={a} wallHeight={H} from={0} to={BASE_COURSE} className="iso-plinth" />
          <WallBand origin={o} along={a} wallHeight={H} from={H - EAVES_COURSE} to={H} className="iso-cornice" fill={surfaceCornice} />
        </g>
      ))}
      {/* Each wall's bays come from its own length, so windows match. A
          terrace hall's ground floor is tall windows onto it (Plan 87D). */}
      {!site && windows(f.D, f.C, H, f.spanLeft, tallGround ? sills.slice(1) : sills, paneW, 'l', paneShape, stone.glass, bayOf(doorOn(f.dir.CD), f.spanLeft, H), lights)}
      {!site && windows(f.C, f.B, H, f.spanRight, tallGround ? sills.slice(1) : sills, paneW, 'r', paneShape, stone.glass, bayOf(doorOn(f.dir.BC), f.spanRight, H), lights)}
      {!site && tallGround && windows(f.D, f.C, H, f.spanLeft, [DINING_TALL_SILL], paneW, 'lt', paneShape, stone.glass, bayOf(doorOn(f.dir.CD), f.spanLeft, H), lights, DINING_TALL_PANE)}
      {!site && tallGround && windows(f.C, f.B, H, f.spanRight, [DINING_TALL_SILL], paneW, 'rt', paneShape, stone.glass, bayOf(doorOn(f.dir.BC), f.spanRight, H), lights, DINING_TALL_PANE)}
      {/* Art Deco: its piers on every building it restyles. */}
      {!site && deckPiers && (
        <>
          {fronts.map((dir) => <Piers key={`dp${dir}`} stone={stone} col={col} row={row} w={w} h={h} height={H} outward={dir} pal={pal} />)}
          {/* and a gilt frieze under the roofline. */}
          <WallBand origin={f.D} along={f.C} wallHeight={H} from={H - EAVES_COURSE * 1.6} to={H - EAVES_COURSE * 0.6} className="iso-cornice" fill={stone.gilt} />
          <WallBand origin={f.C} along={f.B} wallHeight={H} from={H - EAVES_COURSE * 1.6} to={H - EAVES_COURSE * 0.6} className="iso-cornice" fill={shade(stone.gilt, 0.82)} />
        </>
      )}
      {/* Buttresses on pitched-roof buildings; flat roofs get merlons below. */}
      {!site && buttresses && gabled && door && (
        <>
          {fronts.map((dir) => {
            const s = wallSpan(w, h, dir); const dw = (doorOn(dir) ?? door).widthTiles;
            return (
              <Buttresses key={dir} pal={pal} stone={stone} col={col} row={row} w={w} h={h} height={H} outward={dir}
                reserve={[0.5 - dw * 0.95 / s, 0.5 + dw * 0.95 / s]} skipNear={turretPlan} corner={towerCorner} />
            );
          })}
        </>
      )}
      {/* A grocery's street-level shopfront glazing. */}
      {!site && t.facilityType === 'grocery' && shopWalls.map(([o, a, span, d]) => (
        <CurtainWall key={`sf${d}`} origin={o} along={a} wallHeight={H} spanTiles={span} from={BASE_COURSE} to={Math.min(STOREY * 0.85, H - EAVES_COURSE * 2)} floors={[]} id={`sf${d}`} u0={0.04} u1={0.96} />
      ))}
      {/* A signifier on the walls (Plan 74F), on the front (Plan 88). */}
      {!site && signifier && !bare && <WallSignifier kind={signifier} f={f} H={H} stone={stone} facing={p.facing} />}
      {/* The front door; the plain doors on the sides and back come after
          the entrance parts, with their steps. */}
      {!site && door && feature !== 'atrium' && mainFronts.map((dir) => {
        const fwall = wallOf(f, dir);
        return <Door key={`d${dir}`} d={door} origin={fwall.origin} along={fwall.along} wallHeight={H} span={wallSpan(w, h, dir)} side={dir} shape={doorShape} />;
      })}
      {/* A smaller cross over the clinic and counselling centre's front door. */}
      {!site && t.facilityType === 'healthCenter' && door && mainFronts.map((dir) => {
        const fwall = wallOf(f, dir);
        return <RedCross key={`rc${dir}`} origin={fwall.origin} along={fwall.along} wallHeight={H} spanTiles={wallSpan(w, h, dir)} centreU={0.5} centreV={Math.min(0.9, (door.threshold + door.height + up(1.6)) / H)} scale={0.45} />;
      })}
      {/* Modern civic buildings: curtain wall from plinth to eaves. */}
      {!site && glazedCivic && motif === 'portico' && (
        <>
          <CurtainWall origin={f.D} along={f.C} wallHeight={H} spanTiles={f.spanLeft} from={BASE_COURSE} to={H - EAVES_COURSE * 1.5} floors={courses} id="gcl" u0={0.03} u1={0.97} />
          <CurtainWall origin={f.C} along={f.B} wallHeight={H} spanTiles={f.spanRight} from={BASE_COURSE} to={H - EAVES_COURSE * 1.5} floors={courses} id="gcr" u0={0.03} u1={0.97} />
        </>
      )}
      {/* The small portico over the door stands after the roof, its
          pediment's roof run back into it (Plan 87O, below). */}
      {/* The civic colonnade, running the length of the front. */}
      {!site && entrance === 'colonnade' && entranceFronts.map((dir) => {
        const span = wallSpan(w, h, dir);
        const at = outsideWall(col, row, w, h, dir, span / 2, PORTICO_STANDOFF);
        return (
          <Portico stone={stone}
            key={dir}
            centreCol={at.col} centreRow={at.row}
            width={span * 0.9}
            outward={dir}
            columns={colonnadeColumns(span)}
            // Its entablature on the cornice line, not short of it (Plan 87O).
            height={H - ENTABLATURE}
          />
        );
      })}
      {!site && entrance === 'recess' && (
        <>
          {entranceFronts.map((dir) => <Recess key={dir} pal={pal} col={col} row={row} w={w} h={h} wallHeight={H} outward={dir} />)}
        </>
      )}
      {!site && entrance === 'arcade' && arcadeFits(H) && (
        <>
          {entranceFronts.map((dir) => <Arcade key={dir} pal={grand === 'arcade' ? arcadePal : pal} stone={stone} col={col} row={row} w={w} h={h} outward={dir} height={arcadeHeight(H)} />)}
        </>
      )}
      {!site && (entrance === 'canopy' || (entrance === 'arcade' && !arcadeFits(H) && shortArcadeFallback === 'canopy')) && door && (
        <>
          {entranceFronts.map((dir) => <Canopy key={dir} stone={stone} d={door} col={col} row={row} w={w} h={h} outward={dir} wallHeight={H} hood={hood} roof={surface ? plantTint : material.roof} />)}
        </>
      )}
      {!site && (entrance === 'archway' || (entrance === 'arcade' && !arcadeFits(H) && shortArcadeFallback === 'archway')) && door && (
        <>
          {entranceFronts.map((dir) => <Archway key={dir} pal={pal} stone={stone} d={door} col={col} row={row} w={w} h={h} outward={dir} wallHeight={H} />)}
        </>
      )}
      {!site && grand === 'cantilever' && mainFronts.map((dir) => (
        <CantileverCanopy key={`cl${dir}`} col={col} row={row} w={w} h={h} outward={dir} wallHeight={H} part="lobby" />
      ))}
      {!site && entrance === 'porch' && entranceFronts.map((dir) => (
        <Porch key={`po${dir}`} pal={pal} stone={stone} col={col} row={row} w={w} h={h} wallHeight={H} outward={dir} roofAt={tieRoof} part="body" />
      ))}
      {/* Steps after the walls and doors, landing at the entrance's face;
          none behind an arcade (entered at grade) or a colonnade (Plan 61:
          they ran out under the columns). */}
      {!site && door && !(entrance === 'arcade' && arcadeFits(H)) && entrance !== 'colonnade' && entrance !== 'portico' && !lawTempleFront && entranceFronts.map((dir) => {
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

      {/* Modern's cantilevered canopy over a glazed lobby (Plan 87I),
          after the steps it shelters. */}
      {/* The sides' plain doors and the back's service door, with their flights. */}
      {!site && plainFronts.map((dir) => (
        <PlainEntrance key={`pe${dir}`} d={doorOn(dir)} col={col} row={row} w={w} h={h} dir={dir}
          wallHeight={H} stone={stone} shape={doorShape} service={dir === sides.back} />
      ))}
      {!site && grand === 'cantilever' && mainFronts.map((dir) => (
        <CantileverCanopy key={`cc${dir}`} col={col} row={row} w={w} h={h} outward={dir} wallHeight={H} part="slab" />
      ))}
      {gabled && eaves > 0 && ([[f.D, f.C] as const, [f.C, f.B] as const]).map(([o, a], i) => (
        <WallBand key={`es${i}`} origin={o} along={a} wallHeight={H} from={H - up(0.9)} to={H} className="iso-eaves-shadow" />
      ))}
      {!site && brackets && gabled && (
        <>
          <EavesBrackets origin={f.D} along={f.C} wallHeight={H} span={f.spanLeft} top={H} stone={stone} />
          <EavesBrackets origin={f.C} along={f.B} wallHeight={H} span={f.spanRight} top={H} stone={stone} />
        </>
      )}
      {gabled && mansard ? (
        <MansardRoof col={rc} row={rr} w={rw} h={rh} base={H} rise={ridge} pal={pal} stone={stone} />
      ) : hipped ? (
        <>
          <HippedRoof col={rc} row={rr} w={rw} h={rh} base={H} rise={ridge} pal={pal} />
          {chimneys && ridgeChimneys({ col: rc, row: rr, w: rw, h: rh, base: H, rise: ridge, at: [0.25, 0.75], pal, stone })}
        </>
      ) : gabled ? (
        <>
          {/* The two long slopes, toned by the direction each points. */}
          {gableSlopes(rf, alongW, rs, re, pal)}
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
          {!site && feature === 'studio' && <SawtoothRoof col={col} row={row} w={w} h={h} base={H} pal={pal} glass={NORTH_LIGHT_GLASS} />}
          {!site && feature === 'exchange' && <Dome col={col} row={row} w={w} h={h} base={H} stone={stone} hemisphere />}

          {!site && t.id === MUSEUM_ID && <GalleryVaults col={col} row={row} w={w} h={h} base={H} pal={pal} />}
          {!site && motif === 'portico' && !feature && t.id !== MUSEUM_ID && t.id !== LAW_ID && [0.3, 0.5, 0.7].map((v) => (
            // Rooflights on top-lit civic buildings, capped at a real size.
            [0.3, 0.55].map((u) => (
              <polygon
                key={`${u}-${v}`}
                className="iso-rooflight"
                points={polyPoints(boxFaces(col + w * u, row + h * v, Math.min(w * 0.12, across(6)), Math.min(h * 0.1, across(4)), H + 1, 0).top)}
              />
            ))
          ))}
          {!site && t.id === 'PROJ-ARTS' && (() => {
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
          {/* Roof plant, but not where a roof track runs (Plan 85G). */}
          {!site && signifier !== 'track' && flatRoofItems(motif, labFeatureOf(t), col, row, w, h, feature).map((item) => {
            if (item.kind === 'school' && item.part) {
              return <SchoolRoofItem key={item.key} part={item.part} col={item.col} row={item.row} w={item.w} h={item.h} base={H} tint={plantTint} />;
            }
            if (item.kind === 'observatory' || item.kind === 'glasshouse') {
              return <LabRoofFeature key={item.key} feature={item.kind} col={col} row={row} w={w} h={h} base={H} />;
            }
            if (item.kind === 'flue') return <Flue key={item.key} col={item.col} row={item.row} w={item.w} h={item.h} base={H} tint={roofTint} />;
            if (item.kind === 'transformers') return <Transformer key={item.key} col={item.col} row={item.row} w={item.w} h={item.h} base={H} alongW={w >= h} />;
            if (item.kind === 'pylon') return <Pylon key={item.key} col={item.col} row={item.row} w={item.w} h={item.h} base={H} alongW={w >= h} />;
            if (item.kind === 'pipeRack') return <PipeRack key={item.key} col={item.col} row={item.row} w={item.w} h={item.h} base={H} alongW={w >= h} />;
            if (item.kind === 'distillation') {
              const rise = up(STILLS[Number(item.key.slice(6))]![3]);
              return <Still key={item.key} col={item.col} row={item.row} w={item.w} h={item.h} base={H} rise={rise} />;
            }
            if (item.kind === 'stack') {
              const st = boxFaces(item.col, item.row, item.w, item.h, H, up(6));
              return (
                <g key={item.key}>
                  {sideFaces(st, shade(roofTint, 0.82), shade(roofTint, 0.68))}
                  <polygon points={polyPoints(st.top)} fill={shade(roofTint, 0.45)} />
                </g>
              );
            }
            // Roof plant reads as plant: a louvred screen with its fans
            // showing, not a bare box (Plan 87).
            return <PlantScreen key={item.key} col={item.col} row={item.row} w={item.w} h={item.h} base={H} />;
          })}
          {/* The line into the transformer yard, over it (Plan 87I). */}
          {!site && labFeatureOf(t) === 'transformers' && pylonLines(flatRoofItems(motif, labFeatureOf(t), col, row, w, h), H, w >= h)}
        </>
      )}
      {/* The porticos, after the roof their pediments' roofs run back into
          (Plan 87O): the exchange's temple front (Plan 87I), the economics
          lab's pedimented portico, and the small portico over a door; each
          a pediment over columns to the eaves, two where the door is narrow. */}
      {!site && entrance === 'portico' && door && (grand ? mainFronts : entranceFronts).map((dir) => {
        const span = wallSpan(w, h, dir);
        const width = grand === 'temple' ? span * 0.5 : grand === 'pedimented' ? Math.min(span * 0.42, across(16)) : Math.min(door.widthTiles * 3.2, span * 0.6);
        return (
          <TiedPortico key={`tp${dir}`} col={col} row={row} w={w} h={h} dir={dir}
            width={width} depth={grand === 'temple' ? across(3.4) : across(2.6)}
            base={door.threshold} top={H} podium steps={door}
            columns={grand === 'temple' ? 6 : 4} roofAt={tieRoof}
            slopes={gabled ? pal : toneSlopes(pal.roof)} stone={stone} oculus={grand === 'temple'} />
        );
      })}
      {/* The porch's gable roof, run back into the roof (Plan 87O). */}
      {!site && entrance === 'porch' && entranceFronts.map((dir) => (
        <Porch key={`pr${dir}`} pal={pal} stone={stone} col={col} row={row} w={w} h={h} wallHeight={H} outward={dir} roofAt={tieRoof} part="roof" />
      ))}
      {/* Art Deco's stepped portal, which rises past the parapet. */}
      {!site && grand === 'decoPortal' && mainFronts.map((dir) => (
        <DecoPortal key={`dp${dir}`} col={col} row={row} w={w} h={h} outward={dir} wallHeight={H} stone={stone} />
      ))}
      {/* A signifier on the roof, after it (Plan 74F). */}
      {!site && signifier && !lawTempleFront && <RoofSignifier kind={signifier} col={col} row={row} w={w} h={h} base={H} ridge={ridge} f={f} stone={stone} pal={pal} facing={p.facing} />}
      {/* The residence turret, after the roof. */}
      {!site && turretPlan > 0 && cornerInFront && residentialTurret}
      {!site && turretPlan > 0 && towerProudFace && <CornerTower {...residentialTurretProps} face={towerProudFace} />}
      {/* Merlons on the flat-roofed civic set. */}
      {!site && crenellations && !gabled && motif === 'portico' && (
        <>
          {fronts.map((dir) => <Merlons key={dir} col={col} row={row} w={w} h={h} base={H} outward={dir} pal={pal} />)}
        </>
      )}
      {/* Mission's exchange: its flat deck edged in the vernacular's tile
          (Plan 74G), so it stops reading as a gray box among red roofs. */}
      {!site && feature === 'exchange' && roofFor(vernacular).pitchedRoof && (
        <Crest crest="tile" col={col} row={row} w={w} h={h} base={H} fronts={fronts} pal={pal} stone={stone} tile={roofFor(vernacular).pitchedRoof!} />
      )}
      {/* A block's or a lab's crest (Plan 74E). */}
      {!site && !gabled && surface && (
        <Crest crest={crest} col={col} row={row} w={w} h={h} base={H} fronts={fronts} pal={pal} stone={stone} tile={plantTint} />
      )}
      {/* A school lab's fronts (Plan 87E), after its crest. */}
      {!site && feature === 'clinic' && (
        <ClinicFronts col={col} row={row} w={w} h={h} H={H} facing={p.facing} stone={stone} />
      )}
      {!site && feature === 'atrium' && <AtriumFronts col={col} row={row} w={w} h={h} H={H} facing={p.facing} floors={courses} />}
      {/* The Classical set's balustrade. */}
      {!site && balustrade && !gabled && motif === 'portico' && (
        <>
          {fronts.map((dir) => <Balustrade key={dir} pal={pal} stone={stone} col={col} row={row} w={w} h={h} base={H} outward={dir} />)}
        </>
      )}
      {/* The Law School's attic hall and temple fronts, after its parapet
          (Plan 87G). */}
      {!site && t.id === LAW_ID && <LawAttic col={col} row={row} w={w} h={h} H={H} pal={pal} stone={stone} gothic={!lawTempleFront} />}
      {!site && lawTempleFront && <LawFronts col={col} row={row} w={w} h={h} H={H} facing={p.facing} stone={stone} />}
      {/* A pavilion's bell-gable, on the left face only, after the roof.
          Chapter houses show their letters instead. */}
      {pavilionGable && gableWall.visible && pavilionGableNode()}
      {/* The roof parts that read (Plan 25): a dining hall's kitchen flues,
          a tall residence's balconies, a civic building's flag. */}
      {!site && t.facilityType === 'diningHall' && !bare && [0.22, 0.34].map((u) => {
        const sp = across(0.8);
        const st = boxFaces(col + w * u, row + h * 0.1, sp, sp, H, up(3.5));
        return (
          <g key={`flue${u}`}>
            {sideFaces(st, shade(pal.wall.posRow, 0.8), shade(pal.wall.posRow, 0.66))}
            <polygon points={polyPoints(st.top)} fill={shade(roofTint, 0.4)} />
          </g>
        );
      })}
      {!site && hasBalconies(t) && (
        <Balconies f={f} storeys={storeysOf(t)} height={H} tone={stone.trim} />
      )}
      {!site && (t.facilityType === 'library' || t.id === 'PROJ-ARTS') && (
        <RoofFlag at={(() => { const q = localToGrid(p, fw * 0.82, fd * 0.18); return lift(project(q.col, q.row), H); })()} />
      )}
      {/* Chapter letters over both doors, last: the pediment rises above
          the eaves, so anything drawn later would cover it. */}
      {!site && glyphs && (door || entrance === 'recess') && mainFronts.map((dir) => {
        const fwall = wallOf(f, dir);
        return (
          <ChapterPediment key={`cp${dir}`}
            glyphs={glyphs} origin={fwall.origin} along={fwall.along}
            wallHeight={H} span={wallSpan(w, h, dir)} doorWidth={door?.widthTiles ?? 0} cast={!trim}
          />
        );
      })}
    </>
  );
}

// Memoised: the map re-renders on every pointer move and a built-out campus
// has many thousands of polygons. A motif is a pure function of these props;
// `p` is rebuilt each render (CampusMap's drawnFootprint), so its fields are
// compared rather than its identity.
export default memo(BuildingMotif, sameMotif);
// The motif's own function and its memo's comparison, for the canvas map
// (canvasArt.ts).
export { BuildingMotif as BuildingMotifArt };
export function sameMotif(a: Parameters<typeof BuildingMotif>[0], b: Parameters<typeof BuildingMotif>[0]): boolean {
  return a.t === b.t
    && a.camera === b.camera
    && a.material === b.material
    && a.vernacular === b.vernacular
    && a.developing === b.developing
    && a.glyphs === b.glyphs
    && a.p.col === b.p.col && a.p.row === b.p.row
    && a.p.w === b.p.w && a.p.h === b.p.h
    && (a.p.facing ?? 0) === (b.p.facing ?? 0);
}

// Color lives in buildingSpec.ts's MATERIALS (see materialOf).
export { materialOf } from './buildingSpec';

// The parts the library draws itself from (Plan 87F, libraryMotif.tsx).
export {
  Arcade, BellGable, CurtainWall, Door, EavesBrackets, EntranceSteps, GiltFinial, HippedRoof, LEAD,
  MansardRoof, Merlons, Balustrade, PavilionTower, Piers, StageOpenings, TowerShaft, WallBand,
  againstWall, arcadeHeight, backSlopesFirst, gableEnds, gableSlopes, nearRing, opposite, outsideWall, outwardOf,
  pyramid, ridgeChimneys, sideFaces, wallSpan, windows, Cylinder,
};
