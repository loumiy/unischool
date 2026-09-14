import { memo } from 'react';
import type { Buildable, FacilityType } from '../state/types';
import { boxFaces, facePoint, lift, polyPoints, project, type Pt } from './isoProjection';
import { depthOrder } from './depthSort';
import { STOREY, across, up } from './campusScale';
import {
  FLOOR_COURSE, TOWER_PODIUM_STOREYS, WINDOW_HEIGHT, baysAcross, clerestorySill,
  floorLinesOf, motifOf, rankSills, ridgeOf, storeysOf, wallHeightOf, windowRanksOf,
  windowWidthOf, type Motif,
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
// the light depends on which way the ridge runs — so a palette that names
// them by role can only be right for one of the two orientations, and was
// wrong for the other. See SLOPE below for the tones themselves.
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
// Ordering these WRONG is not a subtle mis-tint: a roof whose up-left face
// is darker than its up-right one looks exactly like something is casting a
// shadow across it, and there is nothing there to cast one.
function SLOPE(tint: string) {
  return {
    negCol: shade(tint, 1.07),
    negRow: shade(tint, 1.0),
    posRow: shade(tint, 0.86),
    posCol: shade(tint, 0.72),
  };
}

// Tones from one tint. Deriving rather than authoring keeps a single source
// of truth per building and guarantees every mass on the map is lit from the
// same direction.
export function paletteFrom(tint: string): Palette {
  return {
    roof: tint,
    // A raised flat deck (the hangar's clear-span roof), which faces
    // straight up and so takes no slope tone at all.
    roofDeck: shade(tint, 1.04),
    ...SLOPE(tint),
    wallLeft: shade(tint, 0.93),
    wallRight: shade(tint, 0.75),
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

// How wide the entrance is IN TILES, and how tall as a fraction of the wall
// it sits on. A gym's doors are wide and low; a lab's is a single service
// door; a hall's is the formal front.
//
// Width is a tile measure rather than a fraction of the wall because a door
// is a fixed physical size: as a fraction, a hall's door came out at 0.64
// tiles on a short wall and 1.44 on a long one, and the two walls of the
// same building disagreed with each other by the ratio of their lengths.
// Height stays a fraction — that IS proportional, since it is set by the
// storey the door opens into.
const DOOR: Record<Motif, [number, number]> = {
  hall: [1.0, 0.46], residential: [0.62, 0.40], portico: [1.0, 0.44],
  // A tower's door is a shopfront: the podium's whole ground floor is
  // retail, so the opening is wide and — as a fraction of a 190-unit mass —
  // very shallow.
  tower: [1.6, 0.055],
  // A hospital's is an ambulance entrance under a canopy: the widest on
  // campus.
  block: [1.8, 0.22],
  pavilion: [0.85, 0.52], hangar: [1.25, 0.46], works: [0.6, 0.5],
  // A village has no single front door — each house has its own, drawn by
  // the motif itself.
  village: [0, 0],
  grounds: [0, 0], bowl: [0, 0],
};

// The door's width as a fraction of the wall it is on, given that wall's
// length in tiles — capped so a door never eats a short wall whole.
function doorFraction(motif: Motif, span: number): number {
  const [tiles] = DOOR[motif];
  if (tiles <= 0 || span <= 0) return 0;
  return Math.min(tiles / span, 0.55);
}

// The bay a door reserves on its wall, in that wall's (u, v) coordinates —
// the opening plus its surround and lintel, so windows clear the whole
// assembly rather than just the leaves.
function doorBay(motif: Motif, span: number): FaceRect | undefined {
  const dw = doorFraction(motif, span);
  if (dw <= 0) return undefined;
  const dh = DOOR[motif][1];
  return { u0: 0.5 - dw / 2 - SURROUND, u1: 0.5 + dw / 2 + SURROUND, v0: 0, v1: dh + LINTEL + 0.02 };
}

const SURROUND = 0.018;   // how far the frame stands proud of the opening, in u
const LINTEL = 0.05;      // the lintel's depth above the head, in v

// The way in. Every roofed building had walls and windows and no door at
// all, which is the one thing that says a wall is the FRONT of somewhere
// rather than just the side of a box.
//
// Drawn in the wall's own (u along, v up) coordinates so the whole assembly
// skews correctly like everything else on that face, with no projection
// maths of its own. Both visible walls get one: which of the two a given
// building "fronts" onto depends on where the player put it and which way
// the paths run, and a blank wall beside a path reads as the back of the
// building wherever it happens to stand.
//
// A plain dark rectangle read as a hole rather than a door, so the opening
// carries what actually makes one legible at this size: a surround, a pair
// of leaves with a mull between them, and a fanlight over the transom.
// Handles and panel mouldings are below a pixel here and are not drawn.
function Door({ motif, origin, along, height, span }: {
  motif: Motif; origin: Pt; along: Pt; height: number;
  span: number;   // this wall's length in tiles, so the door is the same real size on both
}) {
  const dw = doorFraction(motif, span);
  const dh = DOOR[motif][1];
  if (dw <= 0) return null;
  const u0 = 0.5 - dw / 2;
  const u1 = 0.5 + dw / 2;
  const at = (u: number, v: number) => facePoint(origin, along, height, u, v);
  const quad = (a: number, b: number, c: number, d: number) =>
    polyPoints([at(a, c), at(b, c), at(b, d), at(a, d)]);

  const transom = dh * 0.72;      // head of the leaves; the fanlight sits above
  const mull = dw * 0.035;        // the centre post between the two leaves
  const reveal = dw * 0.08;       // how far the leaves sit inside the opening
  const bar = dh * 0.045;         // the transom bar itself

  return (
    <>
      {/* The surround, then the opening cut into it. */}
      <polygon
        className="iso-door-surround"
        points={quad(u0 - SURROUND, u1 + SURROUND, 0, dh + 0.012)}
      />
      <polygon className="iso-door" points={quad(u0, u1, 0, dh)} />

      {/* Two leaves either side of the mull. */}
      <polygon
        className="iso-door-leaf"
        points={quad(u0 + reveal, 0.5 - mull, reveal * 0.4, transom - bar)}
      />
      <polygon
        className="iso-door-leaf"
        points={quad(0.5 + mull, u1 - reveal, reveal * 0.4, transom - bar)}
      />

      {/* The transom bar, and the fanlight over it. */}
      <polygon className="iso-door-bar" points={quad(u0, u1, transom - bar, transom)} />
      <polygon
        className="iso-door-glass"
        points={quad(u0 + reveal, u1 - reveal, transom + bar * 0.5, dh - reveal * 0.4)}
      />

      {/* A lintel across the head, and a step at the threshold lying on the
          ground in front of it. */}
      <polygon
        className="iso-door-lintel"
        points={quad(u0 - SURROUND - 0.012, u1 + SURROUND + 0.012, dh + 0.012, dh + LINTEL)}
      />
      <polygon
        className="iso-door-step"
        points={polyPoints([
          at(u0 - 0.01, 0), at(u1 + 0.01, 0),
          { x: at(u1 + 0.01, 0).x, y: at(u1 + 0.01, 0).y + 3 },
          { x: at(u0 - 0.01, 0).x, y: at(u0 - 0.01, 0).y + 3 },
        ])}
      />
    </>
  );
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

function BuildingMotif({ t, p, tint, developing }: {
  t: Buildable;
  p: { row: number; col: number; w: number; h: number };
  tint: string;
  developing: boolean;
}) {
  const motif = motifOf(t);
  const { row, col, w, h } = p;
  const pal = paletteFrom(tint);

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
        {windows(pod.D, pod.C, PODIUM_H, w, [SHOPFRONT_SILL], SHOPFRONT_WIDTH, 'pl', doorBay('tower', w))}
        {windows(pod.C, pod.B, PODIUM_H, h, [SHOPFRONT_SILL], SHOPFRONT_WIDTH, 'pr', doorBay('tower', h))}
        <Door motif="tower" origin={pod.D} along={pod.C} height={PODIUM_H} span={w} />
        <Door motif="tower" origin={pod.C} along={pod.B} height={PODIUM_H} span={h} />
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

  const gabled = ridge > 0;
  const alongW = w >= h;
  const rs = lift(alongW ? project(col, row + h / 2) : project(col + w / 2, row), H + ridge);
  const re = lift(alongW ? project(col + w, row + h / 2) : project(col + w / 2, row + h), H + ridge);

  return (
    <>
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      {/* The left wall runs w tiles along col, the right wall h tiles along
          row, so each gets its own bay and its own door fraction. */}
      {!developing && floorCourses(f.D, f.C, H, courses, 'l')}
      {!developing && floorCourses(f.C, f.B, H, courses, 'r')}
      {/* The left wall runs w tiles along col, the right wall h tiles along
          row. Each gets its bay count from its OWN length — which is the whole
          point: the same window then goes in both, instead of one wall's
          windows coming out wider than the other's by the ratio of the two
          spans. */}
      {!developing && windows(f.D, f.C, H, w, sills, paneW, 'l', doorBay(motif, w))}
      {!developing && windows(f.C, f.B, H, h, sills, paneW, 'r', doorBay(motif, h))}
      {!developing && <Door motif={motif} origin={f.D} along={f.C} height={H} span={w} />}
      {!developing && <Door motif={motif} origin={f.C} along={f.B} height={H} span={h} />}

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
                tint={tint}
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
  && a.tint === b.tint
  && a.developing === b.developing
  && a.p.col === b.p.col && a.p.row === b.p.row
  && a.p.w === b.p.w && a.p.h === b.p.h
));

// ---------------------------------------------------------------------
// Building tints. These moved OUT of styles.css: the motifs above derive
// five tones from each tint at runtime, so the tint has to be a value this
// code can read rather than a rule a stylesheet applies. Keeping both would
// have meant one source of truth for the flat colour and another for every
// shade of it, drifting apart at the first retune.
//
// Facility values and the dorm shades are carried over UNCHANGED from the
// stylesheet's own kind-/tint- table, so no placed building changes colour.
// ---------------------------------------------------------------------
const BUILDING_TINT = '#c9a227';           // academic halls: one fixed landmark gold, never id-hashed
const DORM_TINTS = ['#cfe0cf', '#c2d8c1', '#d8e6d3', '#c8ddd0'];
const FACILITY_TINTS: Record<FacilityType, string> = {
  library: '#d9cba3',
  studentCenter: '#e0cdb4',
  diningHall: '#e6d3ae',
  recCenter: '#d3cdb2',
  healthCenter: '#e3d6c6',
  quad: '#cfdcc4',
  lab: '#cdd0c0',
  gym: '#d6c9a0',
  tennisCourts: '#d1d9b8',
  pool: '#b9cdd4',
  performingArtsCenter: '#d8c2c9',
  artGallery: '#cbc0d3',
  athleticsField: '#c9d9a8',
  athleticsArena: '#cdbfa0',
  athleticsDiamond: '#d7c49a',
  athleticsNatatorium: '#a9c7cf',   // a distinct blue from the rec pool's
  footballStadium: '#d4a94f',       // the pinnacle venue, boldest of the facility tints
  grocery: '#ecd9a4',
};

// Dorms take their shade from a hash of their own id, so neighbouring
// residences differ; every other kind is fixed by what it is.
function hashTint(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000003;
  return h % DORM_TINTS.length;
}

export function tintFor(t: Buildable): string {
  if (t.kind === 'building') return BUILDING_TINT;
  if (t.kind === 'dorm') return DORM_TINTS[hashTint(t.id)];
  if (t.kind === 'facility' && t.facilityType) return FACILITY_TINTS[t.facilityType] ?? '#dccfa6';
  return '#dccfa6';
}
