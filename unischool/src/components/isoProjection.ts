import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from '../state/types';

// The campus map's projection: an axonometric camera looking down at the
// grid from an azimuth and a pitch. Pure geometry, so the map, motifs and
// ground markings share one definition of where a tile is.
//
// The default camera is the genre's 2:1 dimetric (azimuth 45°, pitch 30°).
// The map only rests on the VIEWS and PITCHES below, all of which keep tile
// edges on clean pixel slopes; the motifs were drawn for that grid and
// shimmer at in-between angles.
//
// Rendering only: tile coordinates, footprints, occupancy and saved
// placements know nothing of the camera, and the camera is never saved.

// One tile's screen size at zoom 1 at the default camera; every other camera
// is derived from these.
export const TILE_W = 64;
export const TILE_H = 32;

export interface Pt { x: number; y: number; }

// --- the camera ------------------------------------------------------------

// Both in radians. `azimuth` is which way round the grid the camera stands
// (at 45°, +col runs down-right and +row down-left; increasing it turns the
// camera anticlockwise; it wraps). `pitch` is the elevation, clamped to a
// range where both walls and roofs still read.
export interface Camera { azimuth: number; pitch: number; }

export const DEFAULT_AZIMUTH = Math.PI / 4;
// Derived, not chosen: sin(pitch) = TILE_H / TILE_W, 30° at a 64x32 tile
// (see campusScale.ts for vertical distances).
export const DEFAULT_PITCH = Math.asin(TILE_H / TILE_W);
// From nearly level to straight down (see PITCH_SINES).
export const MIN_PITCH = (10 * Math.PI) / 180;
export const MAX_PITCH = Math.PI / 2;

export const DEFAULT_CAMERA: Camera = { azimuth: DEFAULT_AZIMUTH, pitch: DEFAULT_PITCH };

// The views the map rests on: four azimuths a quarter turn apart, and ten
// pitches.
export const VIEWS: readonly number[] = [0, 1, 2, 3].map((k) => DEFAULT_AZIMUTH + (k * Math.PI) / 2);
// The tilt ladder, stepped in the sine of the pitch rather than the angle:
// the sine is the factor the ground's depth is squashed by, so even steps in
// it look even, where even steps in degrees crowd at the top. Each is a
// simple ratio, which keeps tile edges on a clean pixel slope. The last is a
// plan view, straight down, where heights vanish. Ported from v2.
export const PITCH_SINES: readonly number[] = [1 / 5, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 5 / 6, 11 / 12, 24 / 25, 1];
export const PITCHES: readonly number[] = PITCH_SINES.map((s) => Math.asin(s));
// The opening view's place on the ladder: the 2:1 dimetric.
export const DEFAULT_PITCH_INDEX = PITCH_SINES.indexOf(TILE_H / TILE_W);

// World units per tile along the ground, whatever the camera.
const SCALE = TILE_W / Math.SQRT2;

// Which way a face points in grid terms (the names match buildingMotifs'
// SLOPE). Faces are lit by where they point, so one palette works at every
// azimuth.
export type FaceDir = 'negRow' | 'posCol' | 'posRow' | 'negCol';

// Precomputed per camera change: the projection runs tens of thousands of
// times per frame and must stay four multiplications.
interface Frame {
  camera: Camera;
  cosA: number; sinA: number;
  // The 2x2 ground map: screen x = xCol * col + xRow * row, and y likewise.
  xCol: number; xRow: number; yCol: number; yRow: number;
  // Foreshortening of a height authored at the default pitch.
  heightScale: number;
  // The back corner on screen (smallest y), as an index into [NW, NE, SE, SW].
  back: 0 | 1 | 2 | 3;
  // The two visible walls: `left` runs from the screen-left corner to the
  // front corner, `right` from the front corner to the screen-right one.
  left: FaceDir; right: FaceDir;
}

// The default camera must give the integer coefficients (32, -32, 16, 16)
// exactly: polygon strings print two decimals, and float error would flip
// digits in thousands of points.
function snap(v: number): number {
  const r = Math.round(v);
  return Math.abs(v - r) < 1e-9 ? r : v;
}

// The quarter turn (Plan 37, from v2's): eased in and out over TURN_MS.
// The map still rests only on VIEWS; the angles it passes through on the
// way are drawn for a quarter of a second.
export const TURN_MS = 260;
export function easeInOut(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
}
// The azimuth a turn from `from` to `to` has reached at `t` of its time.
export function turnStep(from: number, to: number, t: number): number {
  return from + (to - from) * easeInOut(t);
}

// Wraps the azimuth into [0, 2pi) and clamps the pitch.
export function normaliseCamera(c: Camera): Camera {
  const TAU = Math.PI * 2;
  let azimuth = c.azimuth % TAU;
  if (azimuth < 0) azimuth += TAU;
  const pitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, c.pitch));
  return { azimuth, pitch };
}

// The outward direction of the edge from corner i to i + 1, corners in
// [NW, NE, SE, SW] order.
const EDGE_DIR: readonly FaceDir[] = ['negRow', 'posCol', 'posRow', 'negCol'];

function frameFor(c: Camera): Frame {
  const camera = normaliseCamera(c);
  const cosA = Math.cos(camera.azimuth);
  const sinA = Math.sin(camera.azimuth);
  const sinP = Math.sin(camera.pitch);
  // Screen y of the unit square's corners; the smallest is the back corner.
  // Ties only occur at exact cardinal azimuths, where either choice draws the
  // same picture.
  const ys = [0, sinA, sinA + cosA, cosA];
  let back: 0 | 1 | 2 | 3 = 0;
  for (let i = 1; i < 4; i++) if (ys[i] < ys[back] - 1e-12) back = i as 0 | 1 | 2 | 3;
  return {
    camera, cosA, sinA,
    xCol: snap(SCALE * cosA), xRow: snap(-SCALE * sinA),
    yCol: snap(SCALE * sinP * sinA), yRow: snap(SCALE * sinP * cosA),
    heightScale: Math.cos(camera.pitch) / Math.cos(DEFAULT_PITCH),
    back,
    left: EDGE_DIR[(back + 2) % 4],
    right: EDGE_DIR[(back + 1) % 4],
  };
}

// The current camera, module-wide rather than threaded through the ~200
// `project` call sites. CampusMap sets it at the top of each render (a
// synchronous subtree, so one commit sees one camera) and passes the camera
// to memoised children as a prop so they redraw. Nothing else may set it.
let frame: Frame = frameFor(DEFAULT_CAMERA);

// Returns the normalized camera applied, for the caller to store.
export function setCamera(c: Camera): Camera {
  if (c.azimuth !== frame.camera.azimuth || c.pitch !== frame.camera.pitch) frame = frameFor(c);
  return frame.camera;
}

// For depthSort.ts: +col moves toward the camera when sinA > 0, +row when
// cosA > 0.
export function cameraAxes(): { cosA: number; sinA: number } {
  return { cosA: frame.cosA, sinA: frame.sinA };
}

// The two walls of any axis-aligned box that this camera can see.
export function visibleWalls(): { left: FaceDir; right: FaceDir } {
  return { left: frame.left, right: frame.right };
}

// How much a height authored at the default pitch is foreshortened now.
export function heightScale(): number {
  return frame.heightScale;
}

// --- the projection -------------------------------------------------------

// Grid corner (col, row) to world point. Corner coordinates, not tile
// indices: tile (row, col) spans corners (col, row) to (col + 1, row + 1).
// A linear map: rotate by the azimuth, squash y by sin(pitch).
export function project(col: number, row: number): Pt {
  const f = frame;
  return { x: f.xCol * col + f.xRow * row, y: f.yCol * col + f.yRow * row };
}

// World point to fractional grid corner coordinates: a 2x2 inverse
// (sin(pitch) is never zero), so hit-testing needs no per-tile targets.
export function unproject(x: number, y: number): { col: number; row: number } {
  const f = frame;
  const det = f.xCol * f.yRow - f.xRow * f.yCol;
  return {
    col: (f.yRow * x - f.xRow * y) / det,
    row: (f.xCol * y - f.yCol * x) / det,
  };
}

// The tile a world point falls in, or null if it falls off the grid.
export function tileAt(x: number, y: number): { row: number; col: number } | null {
  const { col, row } = unproject(x, y);
  const c = Math.floor(col);
  const r = Math.floor(row);
  if (r < 0 || c < 0 || r >= CAMPUS_GRID_HEIGHT || c >= CAMPUS_GRID_WIDTH) return null;
  return { row: r, col: c };
}

// Raises a point by `h` screen units as authored at the default pitch. The
// camera never rolls, so verticals stay vertical; only their length is
// foreshortened, here, so every height stays in one unit.
export function lift(p: Pt, h: number): Pt {
  return { x: p.x, y: p.y - h * frame.heightScale };
}

export function polyPoints(pts: Pt[]): string {
  return pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

// The faces of an axis-aligned box standing on the grid.
//
//   A ---- B      A is the back corner (smallest screen y), B the right,
//   |      |      C the front, D the left; the visible walls meet at C:
//   D ---- C      D-C on the left, C-B on the right.
//
// The letters are screen positions, so a motif drawn on `left` is right at
// every azimuth. Each visible wall's u axis runs left to right on screen.
// Anything that cares about grid edges uses NW/NE/SE/SW or `dir`.
export interface BoxFaces {
  A: Pt; B: Pt; C: Pt; D: Pt;
  At: Pt; Bt: Pt; Ct: Pt; Dt: Pt;
  // The same points by grid corner: NW (col, row), NE (col + w, row),
  // SE (col + w, row + h), SW (col, row + h).
  NW: Pt; NE: Pt; SE: Pt; SW: Pt;
  NWt: Pt; NEt: Pt; SEt: Pt; SWt: Pt;
  top: Pt[]; left: Pt[]; right: Pt[];
  // Grid direction of each face: CD is `left`, BC is `right`, AB and DA are
  // hidden.
  dir: { AB: FaceDir; BC: FaceDir; CD: FaceDir; DA: FaceDir };
  // The visible walls' lengths in tiles (w along col, h along row), for
  // anything set out in bays.
  spanLeft: number; spanRight: number;
}
export function boxFaces(
  col: number, row: number, w: number, h: number, base: number, height: number,
): BoxFaces {
  const NW = lift(project(col, row), base);
  const NE = lift(project(col + w, row), base);
  const SE = lift(project(col + w, row + h), base);
  const SW = lift(project(col, row + h), base);
  const NWt = lift(NW, height); const NEt = lift(NE, height);
  const SEt = lift(SE, height); const SWt = lift(SW, height);
  const P = [NW, NE, SE, SW];
  const Pt_ = [NWt, NEt, SEt, SWt];
  const k = frame.back;
  const A = P[k]; const B = P[(k + 1) % 4]; const C = P[(k + 2) % 4]; const D = P[(k + 3) % 4];
  const At = Pt_[k]; const Bt = Pt_[(k + 1) % 4]; const Ct = Pt_[(k + 2) % 4]; const Dt = Pt_[(k + 3) % 4];
  return {
    A, B, C, D, At, Bt, Ct, Dt,
    NW, NE, SE, SW, NWt, NEt, SEt, SWt,
    top: [At, Bt, Ct, Dt], left: [D, C, Ct, Dt], right: [C, B, Bt, Ct],
    dir: { AB: EDGE_DIR[k], BC: EDGE_DIR[(k + 1) % 4], CD: EDGE_DIR[(k + 2) % 4], DA: EDGE_DIR[(k + 3) % 4] },
    // Edges 0 and 2 (NW-NE, SE-SW) run along col; CD is edge k + 2, BC is k + 1.
    spanLeft: (k % 2 === 0) ? w : h,
    spanRight: (k % 2 === 0) ? h : w,
  };
}

// One wall by grid direction, oriented left to right on screen. For the two
// hidden walls the polygon is their inside face, as an open enclosure shows.
export function wallOf(f: BoxFaces, dir: FaceDir): { origin: Pt; along: Pt; poly: Pt[]; visible: boolean } {
  if (dir === f.dir.CD) return { origin: f.D, along: f.C, poly: f.left, visible: true };
  if (dir === f.dir.BC) return { origin: f.C, along: f.B, poly: f.right, visible: true };
  if (dir === f.dir.AB) return { origin: f.A, along: f.B, poly: [f.A, f.B, f.Bt, f.At], visible: false };
  return { origin: f.D, along: f.A, poly: [f.D, f.A, f.At, f.Dt], visible: false };
}

// A point on a wall in its own coordinates: u along it, v up it (0..1), so a
// window is a rectangle in (u, v). `height` is foreshortened like lift's.
export function facePoint(origin: Pt, along: Pt, height: number, u: number, v: number): Pt {
  return {
    x: origin.x + (along.x - origin.x) * u,
    y: origin.y + (along.y - origin.y) * u - height * v * frame.heightScale,
  };
}

// Sampled as a polygon because the projected ellipse's axes are not
// screen-aligned.
export function projectedCircle(
  centreCol: number, centreRow: number, radius: number, segments = 40,
): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    out.push(project(centreCol + Math.cos(a) * radius, centreRow + Math.sin(a) * radius));
  }
  return out;
}

// A running-track outline: straight sides joined by semicircular ends (an
// ellipse would bow the sides). `halfLen`/`halfWid` are from the center, so
// the straights are (halfLen - halfWid) and the caps have radius halfWid.
// `landscape` says which grid axis is the long one.
export function projectedStadium(
  centreCol: number, centreRow: number,
  halfLen: number, halfWid: number, landscape: boolean, segments = 20,
): Pt[] {
  const straight = Math.max(0, halfLen - halfWid);
  const r = halfWid;
  const out: Pt[] = [];
  const push = (a: number, c: number) => {
    out.push(landscape ? project(centreCol + a, centreRow + c) : project(centreCol + c, centreRow + a));
  };
  push(straight, -r);
  push(-straight, -r);
  for (let i = 1; i < segments; i++) {
    const t = -Math.PI / 2 - (i / segments) * Math.PI;   // round the far cap
    push(-straight + r * Math.cos(t), r * Math.sin(t));
  }
  push(-straight, r);
  push(straight, r);
  for (let i = 1; i < segments; i++) {
    const t = Math.PI / 2 - (i / segments) * Math.PI;    // round the near cap
    push(straight + r * Math.cos(t), r * Math.sin(t));
  }
  return out;
}

// A ground arc, as for a ball field's outfield and infield.
export function projectedArc(
  centreCol: number, centreRow: number, radius: number,
  fromAngle: number, toAngle: number, segments = 28,
): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = fromAngle + (toAngle - fromAngle) * (i / segments);
    out.push(project(centreCol + Math.cos(a) * radius, centreRow + Math.sin(a) * radius));
  }
  return out;
}

// The grid's extent at the current camera. x is not anchored at zero.
export function worldBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
  const pts = [
    project(0, 0), project(CAMPUS_GRID_WIDTH, 0),
    project(CAMPUS_GRID_WIDTH, CAMPUS_GRID_HEIGHT), project(0, CAMPUS_GRID_HEIGHT),
  ];
  return {
    minX: Math.min(...pts.map((p) => p.x)), maxX: Math.max(...pts.map((p) => p.x)),
    minY: Math.min(...pts.map((p) => p.y)), maxY: Math.max(...pts.map((p) => p.y)),
  };
}

// The same at the default camera: what the first view is centered and sized on.
export const WORLD = (() => {
  const N = Math.max(CAMPUS_GRID_WIDTH, CAMPUS_GRID_HEIGHT);
  return { ...worldBounds(), width: N * TILE_W, height: N * TILE_H };
})();
