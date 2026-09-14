import { memo } from 'react';
import type { Buildable } from '../state/types';
import { TILE_W, boxFaces, facePoint, lift, polyPoints, project, type Pt } from './isoProjection';
import { depthOrder } from './depthSort';
import { METRES_PER_TILE, STOREY, across, up } from './campusScale';
import {
  BASE_COURSE, BAY_METRES, CANOPY_DEPTH, CANOPY_POST, CANOPY_SLAB, CLOCK_RADIUS,
  CLOCK_RADIUS_TILES, COLONNADE_BAY_METRES, COLONNADE_HEIGHT, COLONNADE_MAX, CORNICE,
  EAVES_COURSE, ENTABLATURE, GILT, PIER_PROJECTION, PIER_WIDTH_METRES,
  PORTICO_COLUMNS,
  PORTICO_COLUMN_PLAN, PORTICO_HEIGHT, PORTICO_STANDOFF, TOWER_STONE, TRIM, END_PAVILION_PLAN, END_PAVILION_RISE, FLOOR_COURSE, PARAPET,
  COPING, COPING_OVERHANG, END_PAVILION_DEPTH, PAVILION_BAYS, PAVILION_DEPTH, PAVILION_RISE, PEDIMENT_RISE, PLINTH, STEP_OVERHANG,
  TOWER_BASE_PLAN, TOWER_BASE_RISE, TOWER_DOME_RISE, TOWER_DRUM_PLAN, TOWER_DRUM_RISE,
  TOWER_FINIAL_RISE, TOWER_PODIUM_STOREYS, TREAD_DEPTH, WINDOW_HEIGHT,
  baysAcross, clerestorySill, doorDimensions, doorOf, floorLinesOf, hasClockTower, motifOf,
  rankSills, ridgeOf, storeysOf, wallHeightOf, wallShadeOf, windowRanksOf,
  windowWidthOf,
  type DoorDimensions, type Material,
} from './buildingSpec';
import GroundMarking, { RakedStand, StadiumField, type TilePt } from './groundMarkings';

// Architectural motifs: what makes a placed Buildable read as a BUILDING
// rather than as a coloured shape with a name on it.
//
// The TAXONOMY below is projection-independent — a hall is a hall whether
// you see its roof or its front — and survived the move from the flat map
// unchanged. What changed is everything under motifOf: on an angled map a
// building is a mass with a roof and two visible walls, so the facade
// details that were simply wrong drawn flat (windows, entrances) are now
// correct, because there are walls to put them on.
//
// House rules as ever: hand-rolled inline SVG, no icon library, no external
// art, no new dependency. Geometry here, colour in styles.css — with one
// deliberate exception noted at paletteFrom: the roof and wall tones are
// DERIVED from each building's tint at runtime, because there are ~22 tints
// and hand-authoring five shades of each would be 110 values to keep in sync
// with each other forever.

// The motifs no longer carry a height, a ridge, a window-rank count or a
// window-bay count of their own. buildingSpec.ts derives all four: the first
// three from one storey count, and the fourth from the length of the wall the
// bays actually run along — so a building cannot be taller than the floors it
// has, and a window cannot change size because the wall it sits on is longer.

// Where a building's LABEL sits: the middle of its mass, not its apex. The
// full standing height (walls + ridge + any added floors) put the plate
// clear above the roof, where it read as floating rather than as naming the
// thing under it; half the ridge lands it on the roof's own centre.
//
// This is the only place a whole-building height is wanted — the cast shadow
// uses drawnHeightOf below, which accounts for construction state — so there
// is deliberately no general "how tall is this" helper to drift from it.
export function labelHeightOf(t: Buildable): number {
  return wallHeightOf(t) + ridgeOf(t) * 0.5;
}

// How tall the mass ACTUALLY stands right now — full height when finished,
// a frame barely off the ground while developing. Exported so the cast
// shadow is computed from the same number the mass is drawn at, rather than
// a second copy of the developing fraction that could drift from it.
export function drawnHeightOf(t: Buildable, developing: boolean): number {
  if (motifOf(t) === 'grounds') return 0;
  const full = wallHeightOf(t);
  return developing ? Math.max(4, full * 0.16) : full + ridgeOf(t);
}

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  if (Number.isNaN(n)) return hex;
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => Math.max(0, Math.min(255, Math.round(v * factor))));
  return `#${ch.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// Roof faces are keyed by the GRID DIRECTION they point, not by a role like
// "lit" or "shade". A pitched roof has four faces and which of them catches
// the light depends on which way the ridge runs — so a palette that names them
// by role can only be right for one of the two orientations, and was wrong for
// the other. It is also the discipline a rotating camera needs: turn the view
// and the roles swap, while the directions do not.
export interface Palette {
  roof: string; roofDeck: string;
  negCol: string; negRow: string; posRow: string; posCol: string;
  wallLeft: string; wallRight: string;
}

// How bright a sloped face is, by the grid direction its outward normal
// points. The map is lit from the UPPER LEFT — the direction the flat map's
// own drop shadows already fell — and on this projection decreasing col runs
// up-left on screen, decreasing row up-right, increasing row down-left and
// increasing col down-right. So:
//
//        -col  up-left    faces the light head-on   brightest
//        -row  up-right   glancing                  bright
//        +row  down-left  glancing, away            dim
//        +col  down-right faces away head-on        darkest
//
// Ordering these WRONG is not a subtle mis-tint: a roof whose up-left face is
// darker than its up-right one looks exactly like something is casting a
// shadow across it, and there is nothing there to cast one.
function SLOPE(roof: string) {
  return {
    negCol: shade(roof, 1.12),
    negRow: shade(roof, 1.0),
    posRow: shade(roof, 0.84),
    posCol: shade(roof, 0.7),
  };
}

// Tones from one MATERIAL — a wall colour and a roof colour, not one tint for
// both. That split is the whole of PR F on screen: roof tones used to be
// derived from the wall, so a gold hall stood under a gold roof and the two
// read as a single mass. Deriving each family's shades from its own base still
// keeps one source of truth per surface and guarantees every face on the map
// is lit from the same direction.
export function paletteFrom(m: Material, shadeFactor = 1): Palette {
  const wall = shadeFactor === 1 ? m.wall : shade(m.wall, shadeFactor);
  return {
    roof: m.roof,
    // A raised flat deck (the hangar's clear-span roof), which faces straight
    // up and so takes no slope tone at all.
    roofDeck: shade(m.roof, 1.06),
    ...SLOPE(m.roof),
    wallLeft: shade(wall, 0.98),
    wallRight: shade(wall, 0.78),
  };
}

// A retail podium's street level is a shopfront, not a rank of flats: one
// tall opening per bay, sitting almost on the pavement. Its own two numbers
// rather than the ordinary window's, because that is genuinely what differs —
// the bay spacing it is set out on is the campus's.
const SHOPFRONT_SILL = up(0.5);
const SHOPFRONT_WIDTH = across(3.4);

// A rectangle in a wall's own (u, v) coordinates. Used to reserve the bay a
// door stands in so no window is drawn behind it.
interface FaceRect { u0: number; u1: number; v0: number; v1: number; }
function overlaps(a: FaceRect, b: FaceRect): boolean {
  return a.u0 < b.u1 && a.u1 > b.u0 && a.v0 < b.v1 && a.v1 > b.v0;
}

// Windows on one wall, at their REAL size.
//
// The wall's own (u along, v up) coordinates still do the projection work — a
// pane is a rectangle in (u, v) and comes out correctly skewed for free. What
// changed is where the rectangle's edges come from. They used to be a fraction
// of the wall in both directions, which is what made a window's size a
// property of the building rather than of the window. Now the width is a fixed
// number of TILES (converted to u by dividing by this wall's span) and the
// height is a fixed number of SCREEN UNITS (converted to v by dividing by this
// wall's height), so the same window is drawn everywhere and the conversion is
// the only thing that differs.
//
// `sills` is where each rank sits, in screen units above the base — one entry
// per storey for an ordinary building, one entry near the eaves for a
// clear-span volume (see buildingSpec's rankSills and clerestorySill).
//
// `reserved` is the door's bay. A wall does not have windows behind its door,
// so the grid skips those cells outright rather than drawing them and letting
// the door cover them — which left panes showing through wherever the door was
// the more transparent of the two.
function windows(
  origin: Pt, along: Pt, wallHeight: number, spanTiles: number,
  sills: number[], windowWidthTiles: number, key: string,
  reserved?: FaceRect,
) {
  const out: React.JSX.Element[] = [];
  if (wallHeight <= 0 || spanTiles <= 0) return out;
  const bays = baysAcross(spanTiles);
  const halfU = Math.min(windowWidthTiles / spanTiles, 1 / bays) / 2;
  for (let r = 0; r < sills.length; r++) {
    const v0 = sills[r] / wallHeight;
    const v1 = (sills[r] + WINDOW_HEIGHT) / wallHeight;
    if (v1 > 1) continue;             // no rank above the eaves
    for (let b = 0; b < bays; b++) {
      const centre = (b + 0.5) / bays;
      const u0 = centre - halfU; const u1 = centre + halfU;
      if (reserved && overlaps({ u0, u1, v0, v1 }, reserved)) continue;
      out.push(
        <polygon
          key={`${key}${r}-${b}`}
          className="iso-window"
          points={polyPoints([
            facePoint(origin, along, wallHeight, u0, v0),
            facePoint(origin, along, wallHeight, u1, v0),
            facePoint(origin, along, wallHeight, u1, v1),
            facePoint(origin, along, wallHeight, u0, v1),
          ])}
        />,
      );
    }
  }
  return out;
}

// The band at each floor line, running the whole width of the wall.
//
// This is the horizontal structure a multi-storey facade needs, and it is the
// part that still reads at the zoom the game opens at, when the panes
// themselves are a few pixels across. It is also the honest way to draw what a
// rank of windows sits on: one course per storey boundary rather than a sill
// and a lintel around every opening, which would treble the polygon count for
// a line the eye reads as continuous anyway.
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

// NO GLAZING BARS. This is worth recording, because the plan called for them
// and they were built before being taken out again.
//
// The idea was one <pattern> in <defs>, filled into every pane, so a sash
// window's muntins cost nothing per window on a campus that has several
// thousand of them. It works as arithmetic and fails as drawing: a pattern is
// laid out in the world's coordinates and a pane is a SKEWED rectangle in a
// wall's, so every pane samples a different part of the pattern. Some came out
// with a bright bar across a corner, some with none, and the rank as a whole
// read as irregular — which is precisely the complaint this PR exists to fix.
// The alternative, drawing each bar in the wall's own (u, v) space where it
// would align correctly, triples the polygon count for a detail that is under
// a pixel at the zoom the map is actually played at.
//
// So the panes are flat, and the facade's structure comes from the thing that
// genuinely does read at this size: the floor courses above.

// A rectangle in a wall's own (u, v) coordinates. Used to reserve the bay a
// door stands in so no window is drawn behind it.
// The scaffolding hatch, referenced by every site under construction. One
// <pattern> defined once for the whole map rather than per building — see
// SCAFFOLD_PATTERN_ID's use in CampusMap's <defs>.
export const SCAFFOLD_PATTERN_ID = 'campus-scaffold';
export function ScaffoldPattern() {
  return (
    <pattern id={SCAFFOLD_PATTERN_ID} width={14} height={14} patternUnits="userSpaceOnUse">
      <path className="scaffold-hatch" d="M-4,4 L4,-4 M0,14 L14,0 M10,18 L18,10" />
    </pattern>
  );
}

// Scaffold poles standing at the corners of a site, with a lift line between
// them. A hatch alone reads as a texture; the poles are what say "work is
// happening here" rather than "this rectangle is a different colour".
function Scaffolding({ col, row, w, h, height }: {
  col: number; row: number; w: number; h: number; height: number;
}) {
  const posts: [number, number][] = [
    [col + w * 0.06, row + h * 0.06], [col + w * 0.94, row + h * 0.06],
    [col + w * 0.94, row + h * 0.94], [col + w * 0.06, row + h * 0.94],
  ];
  const POLE = height * 2.6;
  return (
    <>
      {posts.map(([c, r], i) => {
        const foot = project(c, r);
        const head = lift(foot, POLE);
        return <line key={i} className="scaffold-pole" x1={foot.x} y1={foot.y} x2={head.x} y2={head.y} />;
      })}
      {/* One lift line along the back, where it reads against the sky rather
          than against the site's own hatch. */}
      <line
        className="scaffold-rail"
        x1={lift(project(posts[0][0], posts[0][1]), POLE * 0.72).x}
        y1={lift(project(posts[0][0], posts[0][1]), POLE * 0.72).y}
        x2={lift(project(posts[1][0], posts[1][1]), POLE * 0.72).x}
        y2={lift(project(posts[1][0], posts[1][1]), POLE * 0.72).y}
      />
    </>
  );
}

// The door's width as a fraction of the wall it is on. The width itself is a
// real measure (see buildingSpec's DOOR_FAMILIES); this only converts it into
// the wall's own u, which is the one thing that legitimately depends on how
// long that wall is. Capped so an entrance can never eat a short wall whole.
function doorFraction(d: DoorDimensions, span: number): number {
  if (d.widthTiles <= 0 || span <= 0) return 0;
  return Math.min(d.widthTiles / span, 0.6);
}

// The bay a door reserves on its wall, in that wall's (u, v) coordinates — the
// opening plus its surround and lintel, so windows clear the whole assembly
// rather than just the leaves. Reserved from the GROUND up rather than from
// the threshold, so nothing is drawn behind the steps either.
//
// A formal portal is taller than a storey, which means it reaches into the
// first floor and the rank up there clears it too. That is not a special case
// here: the rectangle is simply tall enough, and `overlaps` does the rest.
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

// The way in.
//
// Drawn in the wall's own (u along, v up) coordinates so the whole assembly
// skews correctly like everything else on that face, with no projection maths
// of its own. Both visible walls get one: which of the two a building "fronts"
// onto depends on where the player put it and which way the paths run, and a
// blank wall beside a path reads as the back of the building wherever it
// happens to stand.
//
// The opening carries what makes a door legible at this size: a surround, a
// pair of leaves with a mull between them, and a fanlight over the transom.
// Handles and panel mouldings are below a pixel here and are not drawn. What
// IS drawn now, and was not, is the threshold the door sits on — see
// EntranceSteps below.
function Door({ d, origin, along, wallHeight, span }: {
  d: DoorDimensions;
  origin: Pt; along: Pt; wallHeight: number;
  span: number;   // this wall's length in tiles, so the door is the same real size on both
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
  const mull = dw * 0.035;          // the centre post between the two leaves
  const reveal = dw * 0.08;         // how far the leaves sit inside the opening
  const bar = h * 0.045;            // the transom bar itself

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

// The flight up to a threshold, standing on the ground in front of the door.
//
// This is the piece the old drawing was missing entirely — its "step" was a
// three-pixel sliver in SCREEN space, which is the one measure on this map
// that means nothing. A real stair is boxes on the grid: each tread stands one
// rise higher and one tread-depth shallower than the one in front of it, so
// the flight climbs back toward the wall.
//
// `outCol`/`outRow` is the direction away from the building, in grid units —
// the left wall faces down-row, the right wall faces down-col. Treads are
// drawn from the top down, so the lowest (which projects furthest toward the
// camera) paints over the ones behind it.
function EntranceSteps({ d, centreCol, centreRow, outCol, outRow, span }: {
  d: DoorDimensions;
  centreCol: number; centreRow: number;
  outCol: number; outRow: number;
  span: number;
}) {
  if (d.treads <= 0 || d.threshold <= 0) return null;
  const halfW = Math.min(d.widthTiles, span * 0.6) / 2 + STEP_OVERHANG;
  const rise = d.threshold / d.treads;
  const out: React.JSX.Element[] = [];
  for (let i = d.treads - 1; i >= 0; i--) {
    // Tread i counts from the bottom, so it stands (i + 1) rises high and
    // reaches (d.treads - i) tread-depths out from the wall.
    const depth = (d.treads - i) * TREAD_DEPTH;
    const col = outCol !== 0 ? centreCol : centreCol - halfW;
    const row = outRow !== 0 ? centreRow : centreRow - halfW;
    const w = outCol !== 0 ? depth : halfW * 2;
    const h = outRow !== 0 ? depth : halfW * 2;
    const f = boxFaces(col, row, w, h, 0, (i + 1) * rise);
    out.push(
      <g key={i}>
        <polygon points={polyPoints(f.left)} fill={shade(TRIM, 0.82)} />
        <polygon points={polyPoints(f.right)} fill={shade(TRIM, 0.68)} />
        <polygon className="iso-step-tread" points={polyPoints(f.top)} />
      </g>,
    );
  }
  return <>{out}</>;
}

// A small box standing on a roof: plant, a stair head, a lift overrun — the
// thing you actually see on a flat roof from above and to one side.
function RoofBox({ col, row, w, h, base, height, tint }: {
  col: number; row: number; w: number; h: number; base: number; height: number; tint: string;
}) {
  const f = boxFaces(col, row, w, h, base, height);
  return (
    <>
      <polygon points={polyPoints(f.left)} fill={shade(tint, 0.66)} />
      <polygon points={polyPoints(f.right)} fill={shade(tint, 0.56)} />
      <polygon points={polyPoints(f.top)} fill={shade(tint, 0.8)} />
    </>
  );
}

// ---------------------------------------------------------------------
// THE ACADEMIC HALL. The campus's landmark, and the one motif drawn from a
// real reference building rather than from a description.
//
// Everything here is an element of that building — a stone plinth, a course at
// each floor, a cornice and parapet at the eaves, a shallow hipped roof set
// back behind them, a centre bay that projects and is capped with a pediment,
// raised blocks closing each end of the roofline, and (on Founders Hall alone)
// a clock tower with a gilded dome. Their DIMENSIONS all live in
// buildingSpec.ts; what is here is only how to turn them into polygons.
//
// This is why "the other academic halls in the same style, without the spire"
// is one flag and not a second motif: every hall gets the whole vocabulary,
// and hasClockTower decides the one element that is singular.
// ---------------------------------------------------------------------

// A horizontal band across a wall — a plinth, a cornice, a parapet. Same
// (u, v) trick as everything else on a face, so it skews for free.
function WallBand({ origin, along, wallHeight, from, to, className, u0 = 0, u1 = 1 }: {
  origin: Pt; along: Pt; wallHeight: number; from: number; to: number; className: string;
  // A band usually runs the whole width of the wall. Giving it a u range is
  // what lets the parapet be RAISED over the end bays alone, which is how the
  // reference building closes each end of its roofline — a section of the wall
  // carried higher, not a block sitting on the roof.
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

// A HIPPED roof: four slopes meeting at a ridge that stops short of both ends,
// rather than two slopes and a gable wall. This is what the reference building
// has, and at a shallow pitch behind a parapet it reads as a landmark where
// the old barn gable (a ridge deeper than a storey and a half) read as a shed.
//
// The ridge is inset from each end by half the SHORTER span, which is what
// makes the two end slopes proper hips rather than clipped triangles. Faces
// are tinted by the grid direction they point, like every other sloped surface
// on this map (see SLOPE) — so the roof is lit correctly whichever way it runs
// and, when the camera can eventually turn, whichever way it is looked at.
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

// A raised end of the roofline: the WALL carried up past the parapet and
// capped in stone.
//
// These were RoofBoxes, which shade a plain box three ways off one tint and
// are right for an air handler and wrong for a piece of a building — at the
// brick's own 0.66 they read as dark red slabs balanced on the roof. A section
// of wall takes the wall's own two tones, and its coping takes the same
// limestone as the plinth and the cornice, which is what ties it back to the
// vocabulary rather than leaving it an object sitting on top of one.
function EndPavilion({ col, row, w, h, base, pal }: {
  col: number; row: number; w: number; h: number; base: number; pal: Palette;
}) {
  const f = boxFaces(col, row, w, h, base, END_PAVILION_RISE);
  const cap = boxFaces(col - COPING_OVERHANG, row - COPING_OVERHANG,
    w + COPING_OVERHANG * 2, h + COPING_OVERHANG * 2, base + END_PAVILION_RISE, COPING);
  return (
    <>
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      <polygon points={polyPoints(cap.left)} fill={shade(TRIM, 0.82)} />
      <polygon points={polyPoints(cap.right)} fill={shade(TRIM, 0.7)} />
      <polygon points={polyPoints(cap.top)} fill={TRIM} />
    </>
  );
}

// The centre bay: a shallow box projecting from the middle of a front, carried
// past the cornice and capped with a pediment. The building's door goes on
// ITS face rather than on the wall behind it, which is the whole point — an
// entrance that projects reads as the front of a building, where the same door
// flush in a seventy-metre wall reads as a hole in it.
//
// `outward` says which way the front faces: 'row' for the wall running along
// col, 'col' for the one running along row.
// How wide a centre bay is, in tiles: three structural bays of the wall it
// sits on, capped so it can never eat a short front. Shared by the pavilion
// and the portico that stands in front of it, so the two cannot disagree about
// where the middle of the building is.
function pavilionWidth(span: number): number {
  return Math.min(span * 0.5, (span / baysAcross(span)) * PAVILION_BAYS);
}

function CentrePavilion({ col, row, w, h, wallHeight, outward, pal, door, sills, paneW }: {
  col: number; row: number; w: number; h: number; wallHeight: number;
  outward: 'row' | 'col';
  pal: Palette;
  door: DoorDimensions | null;
  sills: number[]; paneW: number;
}) {
  const span = outward === 'row' ? w : h;
  const width = pavilionWidth(span);
  const top = wallHeight + PAVILION_RISE;
  const pc = outward === 'row' ? col + w / 2 - width / 2 : col + w;
  const pr = outward === 'row' ? row + h : row + h / 2 - width / 2;
  const pw = outward === 'row' ? width : PAVILION_DEPTH;
  const ph = outward === 'row' ? PAVILION_DEPTH : width;
  const f = boxFaces(pc, pr, pw, ph, 0, top);
  // The face looking away from the building: the +row face of a box on the
  // col-running wall, the +col face of one on the row-running wall.
  const front = outward === 'row' ? { o: f.D, a: f.C } : { o: f.C, a: f.B };
  const side = outward === 'row' ? { poly: f.right, fill: pal.wallRight } : { poly: f.left, fill: pal.wallLeft };
  const frontFill = outward === 'row' ? pal.wallLeft : pal.wallRight;
  const apex = lift(
    { x: (front.o.x + front.a.x) / 2, y: (front.o.y + front.a.y) / 2 - top },
    PEDIMENT_RISE,
  );
  const frontTopL = lift(front.o, top);
  const frontTopR = lift(front.a, top);
  return (
    <>
      <polygon points={polyPoints(side.poly)} fill={side.fill} />
      <polygon points={polyPoints([front.o, front.a, frontTopR, frontTopL])} fill={frontFill} />
      <WallBand origin={front.o} along={front.a} wallHeight={top} from={0} to={PLINTH} className="iso-plinth" />
      <WallBand origin={front.o} along={front.a} wallHeight={top} from={wallHeight - CORNICE} to={wallHeight} className="iso-cornice" />
      {windows(front.o, front.a, top, width, sills, paneW, 'pv', door ? doorBay(door, width, top) : undefined)}
      {door && <Door d={door} origin={front.o} along={front.a} wallHeight={top} span={width} />}
      <polygon points={polyPoints(f.top)} fill={pal.roofDeck} />
      {/* The pediment, on the face the door is in. */}
      <polygon className="iso-pediment" points={polyPoints([frontTopL, frontTopR, apex])} />
    </>
  );
}

// The portico: columns standing clear of the centre bay, under an entablature.
//
// Drawn in front of the pavilion and behind the steps, which is where it
// stands: you climb the flight, pass between the columns, and reach the door.
// Columns are boxes rather than cylinders — a round shaft at this size is
// three or four pixels across, and the shading that would make it read as
// round costs more than the difference is worth. What does read is the RHYTHM:
// four uprights, evenly spaced, carrying one horizontal.
//
// `outward` matches CentrePavilion's: 'row' for the front on the col-running
// wall, 'col' for the one on the row-running wall.
function Portico({ centreCol, centreRow, width, outward, columns = PORTICO_COLUMNS, height = PORTICO_HEIGHT }: {
  centreCol: number; centreRow: number; width: number; outward: 'row' | 'col';
  columns?: number; height?: number;
}) {
  if (columns < 2 || width <= 0) return null;
  const gap = (width - PORTICO_COLUMN_PLAN) / (columns - 1);
  const half = width / 2;
  const shafts = Array.from({ length: columns }, (_, i) => {
    const along = -half + PORTICO_COLUMN_PLAN / 2 + i * gap;
    return outward === 'row'
      ? { col: centreCol + along - PORTICO_COLUMN_PLAN / 2, row: centreRow }
      : { col: centreCol, row: centreRow + along - PORTICO_COLUMN_PLAN / 2 };
  });
  const ent = outward === 'row'
    ? boxFaces(centreCol - half, centreRow - COPING_OVERHANG, width, PORTICO_COLUMN_PLAN + COPING_OVERHANG * 2, height, ENTABLATURE)
    : boxFaces(centreCol - COPING_OVERHANG, centreRow - half, PORTICO_COLUMN_PLAN + COPING_OVERHANG * 2, width, height, ENTABLATURE);
  return (
    <>
      {/* Back to front, so a near column paints over the entablature's
          underside rather than the other way round. */}
      {depthOrder(shafts.map((c) => ({ ...c, w: PORTICO_COLUMN_PLAN, h: PORTICO_COLUMN_PLAN })))
        .map((c, i) => {
          const f = boxFaces(c.col, c.row, c.w, c.h, 0, height);
          return (
            <g key={i}>
              <polygon points={polyPoints(f.left)} fill={shade(TOWER_STONE, 0.96)} />
              <polygon points={polyPoints(f.right)} fill={shade(TOWER_STONE, 0.78)} />
              <polygon points={polyPoints(f.top)} fill={TOWER_STONE} />
            </g>
          );
        })}
      <polygon points={polyPoints(ent.left)} fill={shade(TOWER_STONE, 0.92)} />
      <polygon points={polyPoints(ent.right)} fill={shade(TOWER_STONE, 0.74)} />
      <polygon points={polyPoints(ent.top)} fill={shade(TOWER_STONE, 1.02)} />
    </>
  );
}

// BUTTRESS PIERS along a clear-span wall. A sports hall's walls are held up
// at bay centres, and those piers are most of what you actually see of a gym
// from outside — without them a hangar is a blank box with one stripe of glass
// across it. Shallow boxes standing against the wall rather than bands painted
// on it, so they catch the light on one face and not the other, which is the
// whole reason they read as depth.
function Piers({ col, row, w, h, height, outward, pal }: {
  col: number; row: number; w: number; h: number; height: number;
  outward: 'row' | 'col'; pal: Palette;
}) {
  const span = outward === 'row' ? w : h;
  const count = Math.max(2, Math.round((span * METRES_PER_TILE) / (BAY_METRES * 2)));
  const plan = across(PIER_WIDTH_METRES);
  return (
    <>
      {Array.from({ length: count + 1 }, (_, i) => {
        const at = (i / count) * span - plan / 2;
        const pc = outward === 'row' ? col + at : col + w;
        const pr = outward === 'row' ? row + h : row + at;
        const pw = outward === 'row' ? plan : PIER_PROJECTION;
        const ph = outward === 'row' ? PIER_PROJECTION : plan;
        const f = boxFaces(pc, pr, pw, ph, 0, height);
        return (
          <g key={i}>
            <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
            <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
            <polygon points={polyPoints(f.top)} fill={shade(TRIM, 0.86)} />
          </g>
        );
      })}
    </>
  );
}

// A CANOPY over a door: a slab on two posts. What a dining hall, a clinic or a
// union puts over its entrance, and the cheapest way to make a low pavilion
// read as somewhere you go IN rather than as a shed with a door in it.
function Canopy({ d, centreCol, centreRow, outward, wallHeight }: {
  d: DoorDimensions; centreCol: number; centreRow: number; outward: 'row' | 'col';
  wallHeight: number;
}) {
  // Clamped under the eaves. The smallest pavilion on the campus is ONE storey
  // — the founding dining hall — and a civic door plus its threshold plus the
  // clearance this wanted came to more than that wall is tall, so the slab
  // floated above the roof of the building it was supposed to be attached to.
  // Same class of mistake as a door taller than its own wall, and caught the
  // same way: by measuring rather than by looking.
  const top = Math.min(d.threshold + d.height + up(0.6), wallHeight - EAVES_COURSE - CANOPY_SLAB);
  if (top <= d.threshold + d.height * 0.5) return null;
  const width = d.widthTiles * 1.7;
  const slabCol = outward === 'row' ? centreCol - width / 2 : centreCol;
  const slabRow = outward === 'row' ? centreRow : centreRow - width / 2;
  const slabW = outward === 'row' ? width : CANOPY_DEPTH;
  const slabH = outward === 'row' ? CANOPY_DEPTH : width;
  const slab = boxFaces(slabCol, slabRow, slabW, slabH, top, CANOPY_SLAB);
  const postAt = (sign: number) => {
    const along = sign * (width / 2 - CANOPY_POST);
    const pc = outward === 'row' ? centreCol + along : centreCol + CANOPY_DEPTH - CANOPY_POST;
    const pr = outward === 'row' ? centreRow + CANOPY_DEPTH - CANOPY_POST : centreRow + along;
    return boxFaces(pc, pr, CANOPY_POST, CANOPY_POST, 0, top);
  };
  return (
    <>
      {[-1, 1].map((sign) => {
        const f = postAt(sign);
        return (
          <g key={sign}>
            <polygon points={polyPoints(f.left)} fill={shade(TRIM, 0.8)} />
            <polygon points={polyPoints(f.right)} fill={shade(TRIM, 0.66)} />
          </g>
        );
      })}
      <polygon points={polyPoints(slab.left)} fill={shade(TRIM, 0.88)} />
      <polygon points={polyPoints(slab.right)} fill={shade(TRIM, 0.72)} />
      <polygon points={polyPoints(slab.top)} fill={TRIM} />
    </>
  );
}

// THE CLOCK TOWER. Founders Hall and nothing else (see hasClockTower).
//
// Four pieces, bottom to top: a square base rising out of the roof with a
// clock face on each visible side, a colonnaded drum set back from it, a
// gilded dome, and a finial.
//
// The DOME is drawn in SCREEN space rather than projected onto the grid, for
// the same reason trees.tsx draws a crown that way: it is a mass in the air,
// not a marking on the ground. Projecting a hemisphere gives a 2:1 squashed
// ellipse, which is right for something lying flat and exactly wrong for
// something round — it would read as a dinner plate balanced on a drum. A
// roughly spherical thing looks roughly circular from every direction.
function ClockTower({ col, row, w, h, base }: {
  col: number; row: number; w: number; h: number; base: number;
}) {
  const plan = Math.min(TOWER_BASE_PLAN, Math.min(w, h) * 0.42);
  const drumPlan = plan * (TOWER_DRUM_PLAN / TOWER_BASE_PLAN);
  const cc = col + w / 2; const cr = row + h / 2;
  const shaft = boxFaces(cc - plan / 2, cr - plan / 2, plan, plan, base, TOWER_BASE_RISE);
  const drumBase = base + TOWER_BASE_RISE;
  const drum = boxFaces(cc - drumPlan / 2, cr - drumPlan / 2, drumPlan, drumPlan, drumBase, TOWER_DRUM_RISE);

  // A clock face on a wall, in that wall's own (u, v) — sampled as a polygon
  // because a circle on a skewed face is an ellipse whose axes are not screen
  // aligned, and sampling needs no rotation maths and stays right if the
  // projection is ever retuned. Same reasoning as projectedCircle's.
  const clock = (origin: Pt, along: Pt, key: string) => {
    // A ROUND face, which means converting its radius separately on each axis:
    // u runs along the wall in tiles and v is a fraction of the wall's height,
    // so one number for both gives an ellipse. (An earlier pass did exactly
    // that, and the two faces read as a pair of eyes.)
    const ru = CLOCK_RADIUS_TILES / plan;
    const rv = CLOCK_RADIUS / TOWER_BASE_RISE;
    const pts: Pt[] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      pts.push(facePoint(origin, along, TOWER_BASE_RISE, 0.5 + Math.cos(a) * ru, 0.56 + Math.sin(a) * rv));
    }
    // Hands, and a dot at their centre. Without them two white circles side by
    // side on a tower read unmistakably as a pair of eyes — which is what an
    // earlier pass produced, and is very hard to stop seeing afterwards.
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
    dome.push(`${(domeCentre.x + Math.cos(a) * domeR).toFixed(2)},${(domeCentre.y + Math.sin(a) * TOWER_DOME_RISE).toFixed(2)}`);
  }
  const finialFoot = { x: domeCentre.x, y: domeCentre.y - TOWER_DOME_RISE };

  return (
    <>
      <polygon points={polyPoints(shaft.left)} fill={shade(TOWER_STONE, 0.98)} />
      <polygon points={polyPoints(shaft.right)} fill={shade(TOWER_STONE, 0.82)} />
      <WallBand origin={shaft.D} along={shaft.C} wallHeight={TOWER_BASE_RISE} from={TOWER_BASE_RISE - CORNICE} to={TOWER_BASE_RISE} className="iso-cornice" />
      <WallBand origin={shaft.C} along={shaft.B} wallHeight={TOWER_BASE_RISE} from={TOWER_BASE_RISE - CORNICE} to={TOWER_BASE_RISE} className="iso-cornice" />
      {clock(shaft.D, shaft.C, 'cl')}
      {clock(shaft.C, shaft.B, 'cr')}
      <polygon points={polyPoints(shaft.top)} fill={shade(TOWER_STONE, 0.9)} />

      {/* The colonnaded drum, a shade brighter than the base it stands on. */}
      <polygon points={polyPoints(drum.left)} fill={TOWER_STONE} />
      <polygon points={polyPoints(drum.right)} fill={shade(TOWER_STONE, 0.86)} />
      <polygon points={polyPoints(drum.top)} fill={shade(TOWER_STONE, 1.03)} />

      <polygon className="iso-dome" points={dome.join(' ')} fill={GILT} />
      <line
        className="iso-finial"
        x1={finialFoot.x} y1={finialFoot.y}
        x2={finialFoot.x} y2={finialFoot.y - TOWER_FINIAL_RISE}
        stroke={GILT}
      />
      <circle className="iso-dome" cx={finialFoot.x} cy={finialFoot.y - TOWER_FINIAL_RISE} r={2.2} fill={GILT} />
    </>
  );
}

// ---------------------------------------------------------------------
// A SMALL GABLED HOUSE, standing on its own. The unit a residential village
// is made of — six to twelve of these around shared green, rather than one
// more slab (see campusData.ts's village rung). Its own component because a
// village draws many of them and each needs the full walls-plus-roof
// treatment the main motif gives one building, at a size where windows
// would be sub-pixel and are deliberately left off.
// ---------------------------------------------------------------------
function VillageHouse({ col, row, w, h, height, ridge, pal }: {
  col: number; row: number; w: number; h: number; height: number; ridge: number; pal: Palette;
}) {
  const f = boxFaces(col, row, w, h, 0, height);
  const alongW = w >= h;
  const rs = lift(alongW ? project(col, row + h / 2) : project(col + w / 2, row), height + ridge);
  const re = lift(alongW ? project(col + w, row + h / 2) : project(col + w / 2, row + h), height + ridge);
  return (
    <>
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      <polygon
        points={polyPoints(alongW ? [f.At, f.Bt, re, rs] : [f.At, f.Dt, re, rs])}
        fill={alongW ? pal.negRow : pal.negCol}
      />
      <polygon
        points={polyPoints(alongW ? [f.Dt, f.Ct, re, rs] : [f.Bt, f.Ct, re, rs])}
        fill={alongW ? pal.posRow : pal.posCol}
      />
      <polygon
        points={polyPoints(alongW ? [f.Bt, f.Ct, re] : [f.Dt, f.Ct, re])}
        fill={alongW ? pal.wallRight : pal.wallLeft}
      />
      <line className="iso-ridge" x1={rs.x} y1={rs.y} x2={re.x} y2={re.y} />
    </>
  );
}

// Where a village's houses stand on its plot, in NORMALISED footprint
// coordinates (u across, v down, 0..1) — so the same arrangement comes out
// correctly proportioned whether the plot was placed landscape or rotated.
// Two ranks facing each other across a green, with a third short rank
// closing one end: the courtyard arrangement a real student village uses,
// rather than a grid of identical boxes.
const VILLAGE_HOUSES: Array<[number, number, number, number]> = [
  // [u, v, uw, vh]
  [0.06, 0.06, 0.22, 0.17], [0.34, 0.06, 0.22, 0.17], [0.62, 0.06, 0.22, 0.17],
  [0.06, 0.40, 0.22, 0.17], [0.34, 0.40, 0.22, 0.17], [0.62, 0.40, 0.22, 0.17],
  [0.06, 0.74, 0.22, 0.17], [0.34, 0.74, 0.22, 0.17], [0.62, 0.74, 0.22, 0.17],
  [0.88, 0.20, 0.09, 0.56],
];

function BuildingMotif({ t, p, material, developing }: {
  t: Buildable;
  p: { row: number; col: number; w: number; h: number };
  material: Material;
  developing: boolean;
}) {
  const motif = motifOf(t);
  const { row, col, w, h } = p;
  const pal = paletteFrom(material, wallShadeOf(t));
  // What the solid helpers below shade from. A roof unit, a stair tread and a
  // stand are not made of the wall they stand on — plant is roof-coloured,
  // stonework is trim — so each takes the surface it actually belongs to.
  const tint = pal.wallLeft;
  const roofTint = material.roof;

  // Open ground has no mass at all — and no construction state worth
  // drawing either, since there is nothing to raise.
  if (motif === 'grounds') {
    return <GroundMarking facilityType={t.facilityType} tier={t.tier} col={col} row={row} w={w} h={h} />;
  }

  // A site under construction is a footprint pegged out and a frame barely
  // off the ground, not a building with the roof left off. The mass RISING
  // is what completion looks like — which is a thing an angled map can show
  // and a flat one never could.
  const full = wallHeightOf(t);
  const H = developing ? Math.max(4, full * 0.16) : full;
  const ridge = developing ? 0 : ridgeOf(t);
  const f = boxFaces(col, row, w, h, 0, H);
  // One rank of windows per storey, always — including the storeys a
  // renovation added, which is what makes that growth legible rather than
  // just making the building taller. A clear-span volume has no storeys and
  // gets one band near its eaves instead (see buildingSpec's clerestorySill).
  const sills = storeysOf(t) > 0 ? rankSills(windowRanksOf(t)) : [clerestorySill(H)];
  const paneW = windowWidthOf(t);
  const courses = floorLinesOf(t);
  const door = doorOf(t);

  if (motif === 'village') {
    // A PLOT, not a building: lawn, walks between the ranks, and ten small
    // houses standing on it (see VILLAGE_HOUSES). Drawn back-to-front by
    // each house's own distance from the camera, exactly as CampusMap sorts
    // whole buildings, so a near house correctly overlaps the one behind it.
    const houses = depthOrder(VILLAGE_HOUSES.map(([u, v, uw, vh]) => ({
      col: col + w * u, row: row + h * v, w: w * uw, h: h * vh,
    })));

    if (developing) {
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
        {/* The green down the middle, and the cross walk at its head. */}
        <polygon
          className="ground-walk-fill"
          points={polyPoints(boxFaces(col + w * 0.04, row + h * 0.30, w * 0.80, h * 0.07, 0, 0).top)}
        />
        <polygon
          className="ground-walk-fill"
          points={polyPoints(boxFaces(col + w * 0.04, row + h * 0.64, w * 0.80, h * 0.07, 0, 0).top)}
        />
        {houses.map((house, i) => (
          <VillageHouse
            key={i}
            {...house}
            height={full}
            ridge={ridge}
            pal={pal}
          />
        ))}
      </>
    );
  }

  if (motif === 'tower') {
    // A RETAIL PODIUM with a tower on it. The podium is the whole footprint,
    // two storeys of shopfront (which is the part of a residential tower the
    // campus around it actually uses — see campusData.ts's TOWER_RETAIL_SERVES);
    // the shaft is inset from it and carried the rest of the way up, which is
    // what stops a 190-unit mass reading as a single blank obelisk.
    const PODIUM_H = TOWER_PODIUM_STOREYS * STOREY;
    // The way into a tower is its podium's shopfront, measured against the
    // PODIUM's own height rather than the shaft's. The old table said its
    // height fraction was small because the mass was 190 units tall, and then
    // applied that fraction to the 34-unit podium — which is how a 24 m
    // opening came to be 0.88 m high.
    const podiumDoor = doorDimensions('shopfront');
    const inset = 0.17;
    const sc = col + w * inset; const sr = row + h * inset;
    const sw = w * (1 - inset * 2); const sh = h * (1 - inset * 2);

    if (developing) {
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
    // The shaft carries every storey the tower has except the podium's.
    const shaftRanks = Math.max(1, storeysOf(t) - TOWER_PODIUM_STOREYS);
    const shaftSills = rankSills(shaftRanks);
    const shaftW = windowWidthOf(t);
    return (
      <>
        {/* Podium: glazed at street level, so its "windows" are one tall
            rank of shopfront rather than the shaft's ranks of flats. */}
        <polygon points={polyPoints(pod.left)} fill={shade(tint, 0.88)} />
        <polygon points={polyPoints(pod.right)} fill={shade(tint, 0.70)} />
        {windows(pod.D, pod.C, PODIUM_H, w, [SHOPFRONT_SILL], SHOPFRONT_WIDTH, 'pl', doorBay(podiumDoor, w, PODIUM_H))}
        {windows(pod.C, pod.B, PODIUM_H, h, [SHOPFRONT_SILL], SHOPFRONT_WIDTH, 'pr', doorBay(podiumDoor, h, PODIUM_H))}
        <Door d={podiumDoor} origin={pod.D} along={pod.C} wallHeight={PODIUM_H} span={w} />
        <Door d={podiumDoor} origin={pod.C} along={pod.B} wallHeight={PODIUM_H} span={h} />
        <polygon points={polyPoints(pod.top)} fill={pal.roofDeck} />

        {/* The shaft, ranked floor by floor. */}
        <polygon points={polyPoints(shaft.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(shaft.right)} fill={pal.wallRight} />
        {windows(shaft.D, shaft.C, H - PODIUM_H, sw, shaftSills, shaftW, 'tl')}
        {windows(shaft.C, shaft.B, H - PODIUM_H, sh, shaftSills, shaftW, 'tr')}
        <polygon points={polyPoints(shaft.top)} fill={pal.roof} />
        {/* Lift overrun and plant on the roof — what tells a tower's top
            from a flat lid at this distance. */}
        <RoofBox
          col={sc + sw * 0.24} row={sr + sh * 0.24} w={sw * 0.5} h={sh * 0.5}
          base={H} height={16} tint={tint}
        />
      </>
    );
  }

  if (motif === 'bowl') {
    // FOUR RAKED BANKS around a gridiron, not a box with a hole in it.
    //
    // The previous version drew the stands as a ring-shaped slab: an
    // evenodd top face, outer walls, and two vertical inner faces dropped
    // from the opening's back edges. Those inner faces hung down-screen
    // across the ring's own arms and outer walls, which is what garbled it —
    // and even drawn cleanly a box with a flat top and vertical inner walls
    // is a wall around a pitch, not seating.
    //
    // Each bank is a wedge instead: low at the field, climbing away from it,
    // with seat rows stepping up the rake. The four are mitred at the
    // corners (each one's inner edge is inset by the stand depth at both
    // ends), so they tile the ring exactly with no overlap to garble.
    const d = Math.min(w, h) * 0.17;          // stand depth, in tiles
    const iCol = col + d; const iRow = row + d;
    const iW = w - d * 2; const iH = h - d * 2;
    const top = H;
    const bottom = H * 0.22;
    const fills = (f: number) => ({
      rakeFill: shade(tint, f),
      wallFill: shade(tint, f * 0.82),
      seatStroke: 'rgba(42, 56, 28, 0.30)',
    });
    // Corner points of the outer ring and of the field it encloses.
    const O = { nw: [col, row], ne: [col + w, row], se: [col + w, row + h], sw: [col, row + h] } as Record<string, TilePt>;
    const I = { nw: [iCol, iRow], ne: [iCol + iW, iRow], se: [iCol + iW, iRow + iH], sw: [iCol, iRow + iH] } as Record<string, TilePt>;

    // Painter's order by each bank's own distance from the camera: the two
    // far banks, then the field, then the two near ones — so the near stands
    // correctly overlap the front edge of the field, the way you look OVER a
    // near stand into a stadium.
    const west = (
      <RakedStand outer={[O.nw, O.sw]} inner={[I.nw, I.sw]} bottomH={bottom} topH={top} rows={5} {...fills(0.96)} />
    );
    const north = (
      <RakedStand outer={[O.nw, O.ne]} inner={[I.nw, I.ne]} bottomH={bottom} topH={top} rows={5} {...fills(1.04)} />
    );
    const south = (
      <RakedStand outer={[O.sw, O.se]} inner={[I.sw, I.se]} bottomH={bottom} topH={top} rows={5} wall {...fills(0.8)} />
    );
    const east = (
      <RakedStand outer={[O.ne, O.se]} inner={[I.ne, I.se]} bottomH={bottom} topH={top} rows={5} wall {...fills(0.72)} />
    );

    // A site under construction is the bowl's earthworks, not a stadium.
    if (developing) {
      return (
        <>
          <polygon points={polyPoints(f.top)} fill={shade(tint, 0.9)} />
          <polygon points={polyPoints(f.top)} fill={`url(#${SCAFFOLD_PATTERN_ID})`} />
          <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
          <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
          <Scaffolding col={col} row={row} w={w} h={h} height={H} />
        </>
      );
    }
    return (
      <>
        {west}
        {north}
        <StadiumField col={iCol} row={iRow} w={iW} h={iH} />
        {south}
        {east}
      </>
    );
  }

  if (motif === 'hall' && !developing) {
    // THE ACADEMIC HALL, assembled from the vocabulary above. The order is the
    // order you would build it in, which is also the order it has to be
    // painted in: mass, then what is applied to the mass, then what stands on
    // top of it, then what stands in front of it.
    //
    // The wall runs to the top of the PARAPET, not to the cornice, and every
    // band and window below is a fraction of that one height. Computing the
    // parapet as a second box over the first is what an earlier pass did, and
    // it drew a full-height blank wall straight over the windows, the courses
    // and the plinth — a parapet is the top of this wall, not another one.
    const WH = H + PARAPET;
    const hf = boxFaces(col, row, w, h, 0, WH);
    const endPlan = Math.min(END_PAVILION_PLAN, Math.min(w, h) * 0.28);
    // The roof is set BACK behind the parapet, which is what a parapet is for.
    const inset = Math.min(0.3, Math.min(w, h) * 0.06);

    const band = (from: number, to: number, className: string, key: string) => (
      <>
        <WallBand key={`${key}l`} origin={hf.D} along={hf.C} wallHeight={WH} from={from} to={to} className={className} />
        <WallBand key={`${key}r`} origin={hf.C} along={hf.B} wallHeight={WH} from={from} to={to} className={className} />
      </>
    );
    return (
      <>
        <polygon points={polyPoints(hf.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(hf.right)} fill={pal.wallRight} />

        {/* A course at every floor, a stone base under them all, a cornice
            over them and the parapet above that — the horizontals that give a
            long brick front its structure, and the reason the reference
            building reads as storeys rather than as a wall with holes in it. */}
        {floorCourses(hf.D, hf.C, WH, courses, 'l')}
        {floorCourses(hf.C, hf.B, WH, courses, 'r')}
        {band(0, PLINTH, 'iso-plinth', 'p')}
        {band(H - CORNICE, H, 'iso-cornice', 'c')}
        {band(H, WH, 'iso-parapet', 'q')}

        {/* The door's bay is reserved on the main wall even though the door
            itself goes on the pavilion in front of it — otherwise a rank of
            windows sits behind the entrance. */}
        {windows(hf.D, hf.C, WH, w, sills, paneW, 'l', door ? doorBay(door, w, WH) : undefined)}
        {windows(hf.C, hf.B, WH, h, sills, paneW, 'r', door ? doorBay(door, h, WH) : undefined)}

        {/* The flat between the parapet and the eaves. Without it the roof's
            inset leaves a ring of nothing at the head of the wall, and the
            LAWN shows through it — a green stripe running right round the
            building where its roof should meet its walls. A parapet roof has a
            gutter behind it; this is that gutter. */}
        <polygon points={polyPoints(boxFaces(col, row, w, h, 0, WH).top)} fill={pal.roofDeck} />
        <HippedRoof
          col={col + inset} row={row + inset} w={w - inset * 2} h={h - inset * 2}
          base={WH} rise={ridge} pal={pal}
        />
        {/* Each end of the roofline closed by carrying the wall itself higher.
            Real blocks hugging the wall rather than a band painted over it —
            an earlier pass drew these as a translucent band from the ground up,
            which washed brown over the windows underneath instead of standing
            above them. Drawn AFTER the roof, so they close it rather than
            disappear behind it. */}
        {([
          // [col, row, w, h] of each raised end, hugging the wall it caps.
          [col, row + h - END_PAVILION_DEPTH, endPlan, END_PAVILION_DEPTH],
          [col + w - endPlan, row + h - END_PAVILION_DEPTH, endPlan, END_PAVILION_DEPTH],
          [col + w - END_PAVILION_DEPTH, row, END_PAVILION_DEPTH, endPlan],
          [col + w - END_PAVILION_DEPTH, row + h - endPlan, END_PAVILION_DEPTH, endPlan],
        ] as const).map(([ec, er, ew, eh], i) => (
          <EndPavilion key={`e${i}`} col={ec} row={er} w={ew} h={eh} base={WH} pal={pal} />
        ))}

        {hasClockTower(t) && (
          <ClockTower col={col} row={row} w={w} h={h} base={WH + ridge * 0.4} />
        )}

        {/* Last, because they project toward the camera and must paint over
            the wall they stand against. */}
        <CentrePavilion
          col={col} row={row} w={w} h={h} wallHeight={H} outward="row"
          pal={pal} door={door} sills={sills} paneW={paneW}
        />
        <CentrePavilion
          col={col} row={row} w={w} h={h} wallHeight={H} outward="col"
          pal={pal} door={door} sills={sills} paneW={paneW}
        />
        <Portico
          centreCol={col + w / 2} centreRow={row + h + PAVILION_DEPTH + PORTICO_STANDOFF}
          width={pavilionWidth(w)} outward="row"
        />
        <Portico
          centreCol={col + w + PAVILION_DEPTH + PORTICO_STANDOFF} centreRow={row + h / 2}
          width={pavilionWidth(h)} outward="col"
        />
        {door && (
          <EntranceSteps
            d={door} centreCol={col + w / 2} centreRow={row + h + PAVILION_DEPTH + PORTICO_STANDOFF + PORTICO_COLUMN_PLAN}
            outCol={0} outRow={1} span={w}
          />
        )}
        {door && (
          <EntranceSteps
            d={door} centreCol={col + w + PAVILION_DEPTH + PORTICO_STANDOFF + PORTICO_COLUMN_PLAN} centreRow={row + h / 2}
            outCol={1} outRow={0} span={h}
          />
        )}
      </>
    );
  }

  const gabled = ridge > 0;
  const alongW = w >= h;
  const rs = lift(alongW ? project(col, row + h / 2) : project(col + w / 2, row), H + ridge);
  const re = lift(alongW ? project(col + w, row + h / 2) : project(col + w / 2, row + h), H + ridge);

  return (
    <>
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      {/* Piers first: they stand against the wall, so everything applied to
          the wall is drawn over them rather than the other way round. */}
      {!developing && motif === 'hangar' && (
        <>
          <Piers col={col} row={row} w={w} h={h} height={H} outward="row" pal={pal} />
          <Piers col={col} row={row} w={w} h={h} height={H} outward="col" pal={pal} />
        </>
      )}
      {!developing && floorCourses(f.D, f.C, H, courses, 'l')}
      {!developing && floorCourses(f.C, f.B, H, courses, 'r')}
      {/* The base course and the eaves course every roofed building on this
          campus shares with the halls. One set of parts, assembled
          differently — which is the whole of what makes a library and a lab
          read as the same campus. */}
      {!developing && ([[f.D, f.C] as const, [f.C, f.B] as const]).map(([o, a], i) => (
        <g key={`b${i}`}>
          <WallBand origin={o} along={a} wallHeight={H} from={0} to={BASE_COURSE} className="iso-plinth" />
          <WallBand origin={o} along={a} wallHeight={H} from={H - EAVES_COURSE} to={H} className="iso-cornice" />
        </g>
      ))}
      {/* The left wall runs w tiles along col, the right wall h tiles along
          row. Each gets its bay count from its OWN length — which is the whole
          point: the same window then goes in both, instead of one wall's
          windows coming out wider than the other's by the ratio of the two
          spans. */}
      {!developing && windows(f.D, f.C, H, w, sills, paneW, 'l', door ? doorBay(door, w, H) : undefined)}
      {!developing && windows(f.C, f.B, H, h, sills, paneW, 'r', door ? doorBay(door, h, H) : undefined)}
      {!developing && door && <Door d={door} origin={f.D} along={f.C} wallHeight={H} span={w} />}
      {!developing && door && <Door d={door} origin={f.C} along={f.B} wallHeight={H} span={h} />}
      {/* The civic set's colonnade: the hall's own columns, run the length of
          the front rather than gathered into a centre bay. That is the
          difference between a building with an entrance and a building that
          IS one, which is what a library and a concert hall are. */}
      {!developing && motif === 'portico' && ([['row', w] as const, ['col', h] as const]).map(([out, span]) => (
        <Portico
          key={out}
          centreCol={out === 'row' ? col + w / 2 : col + w + PORTICO_STANDOFF}
          centreRow={out === 'row' ? row + h + PORTICO_STANDOFF : row + h / 2}
          width={span * 0.9}
          outward={out}
          columns={Math.max(2, Math.min(COLONNADE_MAX,
            Math.round((span * 0.9 * METRES_PER_TILE) / COLONNADE_BAY_METRES)))}
          height={Math.min(COLONNADE_HEIGHT, H - EAVES_COURSE * 2)}
        />
      ))}
      {/* A canopy over a low building's door. */}
      {!developing && motif === 'pavilion' && door && (
        <>
          <Canopy d={door} centreCol={col + w / 2} centreRow={row + h} outward="row" wallHeight={H} />
          <Canopy d={door} centreCol={col + w} centreRow={row + h / 2} outward="col" wallHeight={H} />
        </>
      )}
      {/* The flights, on the ground in front of each door. Drawn after the
          walls so they stand in front of the mass they climb to, and after
          both doors so neither one's steps are cut by the other's wall. */}
      {!developing && door && (
        <EntranceSteps
          d={door} centreCol={col + w / 2} centreRow={row + h}
          outCol={0} outRow={1} span={w}
        />
      )}
      {!developing && door && (
        <EntranceSteps
          d={door} centreCol={col + w} centreRow={row + h / 2}
          outCol={1} outRow={0} span={h}
        />
      )}

      {gabled ? (
        <>
          {/* The two long slopes. When the ridge runs along col (alongW) they
              are the -row and +row faces; when it runs along row they are
              -col and +col. Same polygons as before, tones now chosen by
              which way each one actually points. */}
          <polygon
            points={polyPoints(alongW ? [f.At, f.Bt, re, rs] : [f.At, f.Dt, re, rs])}
            fill={alongW ? pal.negRow : pal.negCol}
          />
          <polygon
            points={polyPoints(alongW ? [f.Dt, f.Ct, re, rs] : [f.Bt, f.Ct, re, rs])}
            fill={alongW ? pal.posRow : pal.posCol}
          />
          {/* ONE gable end — the near one. These are vertical triangles
              capping the ridge, not hips, and only the near one can be seen:
              the far one is geometrically inside the front slope. It was
              being drawn anyway, and drawn LAST, so painter's order put an
              occluded face over the roof and the roof read as transparent.
              Its tone is the wall's, not a slope's, because a gable end is
              the wall below it carried on up — same plane, same light. */}
          <polygon
            points={polyPoints(alongW ? [f.Bt, f.Ct, re] : [f.Dt, f.Ct, re])}
            fill={alongW ? pal.wallRight : pal.wallLeft}
          />
          <line className="iso-ridge" x1={rs.x} y1={rs.y} x2={re.x} y2={re.y} />
        </>
      ) : motif === 'hangar' && !developing ? (
        // A clear-span roof: a shallow raised deck with a glazed strip along
        // its ridge, which is what actually lights a gym or a pool hall.
        <>
          <polygon points={polyPoints(f.top)} fill={pal.roof} />
          <polygon
            points={polyPoints(alongW
              ? [lift(project(col, row + h * 0.28), H + 9), lift(project(col + w, row + h * 0.28), H + 9),
                lift(project(col + w, row + h * 0.72), H + 9), lift(project(col, row + h * 0.72), H + 9)]
              : [lift(project(col + w * 0.28, row), H + 9), lift(project(col + w * 0.28, row + h), H + 9),
                lift(project(col + w * 0.72, row + h), H + 9), lift(project(col + w * 0.72, row), H + 9)])}
            fill={pal.roofDeck}
          />
          <polygon
            className="iso-rooflight"
            points={polyPoints(alongW
              ? [lift(project(col + w * 0.08, row + h * 0.42), H + 10), lift(project(col + w * 0.92, row + h * 0.42), H + 10),
                lift(project(col + w * 0.92, row + h * 0.58), H + 10), lift(project(col + w * 0.08, row + h * 0.58), H + 10)]
              : [lift(project(col + w * 0.42, row + h * 0.08), H + 10), lift(project(col + w * 0.42, row + h * 0.92), H + 10),
                lift(project(col + w * 0.58, row + h * 0.92), H + 10), lift(project(col + w * 0.58, row + h * 0.08), H + 10)])}
          />
        </>
      ) : (
        <>
          <polygon points={polyPoints(f.top)} fill={pal.roof} />
          {/* Scaffolding hatch over the site's own deck: the diagonal
              boarding you see looking down into a half-built frame. */}
          {developing && <polygon points={polyPoints(f.top)} fill={`url(#${SCAFFOLD_PATTERN_ID})`} />}
          {developing && <Scaffolding col={col} row={row} w={w} h={h} height={H} />}
          {!developing && motif === 'portico' && [0.26, 0.5, 0.74].map((v) => (
            // Libraries and galleries are top-lit. Rooflights are both true
            // and the thing that tells them apart from a plain shed.
            [0.24, 0.54].map((u) => (
              <polygon
                key={`${u}-${v}`}
                className="iso-rooflight"
                points={polyPoints(boxFaces(col + w * u, row + h * v, w * 0.22, h * 0.16, H + 1, 0).top)}
              />
            ))
          ))}
          {!developing && (motif === 'works' || motif === 'pavilion' || motif === 'block') && (
            // A lab's roof is the most crowded on campus; a pavilion's
            // carries a unit or two; a hospital's carries the heaviest plant
            // of all plus a helipad-sized deck, which is what reads as
            // "hospital" rather than "very large pavilion" from above.
            // Back to front, like everything else that stands on this map.
            // These are authored in the order that reads best on the page, not
            // in the order they have to be painted in — a lab's three units
            // were listed 0.30, 0.92, 0.78 deep, so the nearest was drawn
            // before the farthest and the farthest painted over it. Sorted
            // through the map's own comparator (depthSort.ts), in the
            // building's own footprint fractions: it is scale-free, so the
            // same relation that orders two halls orders two air handlers.
            depthOrder(
              (motif === 'works'
                ? [[0.12, 0.18, 0.28, 0.26], [0.48, 0.44, 0.32, 0.28], [0.18, 0.6, 0.22, 0.22]]
                : motif === 'block'
                  ? [[0.08, 0.10, 0.30, 0.26], [0.46, 0.12, 0.22, 0.18], [0.10, 0.52, 0.24, 0.22], [0.52, 0.56, 0.34, 0.32]]
                  : [[0.18, 0.26, 0.26, 0.24], [0.54, 0.52, 0.28, 0.22]]
              ).map(([fx, fy, fw, fh]) => ({ col: fx, row: fy, w: fw, h: fh })),
            ).map((unit, i) => (
              <RoofBox
                key={i}
                col={col + w * unit.col} row={row + h * unit.row}
                w={w * unit.w} h={h * unit.h}
                base={H} height={motif === 'works' ? 12 : motif === 'block' ? 15 : 9}
                tint={roofTint}
              />
            ))
          )}
        </>
      )}
    </>
  );
}

// MEMOISED, and by PR C it has to be. A wall's windows are now set out on real
// bays rather than on a fixed count of eight, so an eleven-tile hospital wall
// carries twenty-two bays over eight storeys instead of ten over five — the
// campus draws roughly three times the polygons it used to. The map's render
// path runs on every mouse move (hover is React state), and re-reconciling
// every pane on every pointer event is the difference between a smooth pan and
// a janky one.
//
// A motif is a pure function of these four things, so the comparison is exact
// rather than a heuristic. `p` is rebuilt on every render (see CampusMap's
// drawnFootprint), which is why its fields are compared rather than its
// identity; `t` genuinely is the same object until the reducer runs.
export default memo(BuildingMotif, (a, b) => (
  a.t === b.t
  && a.material === b.material
  && a.developing === b.developing
  && a.p.col === b.p.col && a.p.row === b.p.row
  && a.p.w === b.p.w && a.p.h === b.p.h
));

// Colour lives in buildingSpec.ts's MATERIALS now, not here and not in
// styles.css. A stylesheet cannot derive five shades of a surface at runtime,
// which is why the tints were ever in this file; and a material is a fact
// about a BUILDING, not about how it is drawn, which is why they are in the
// spec rather than in the renderer. See the note above materialOf.
export { materialOf } from './buildingSpec';
