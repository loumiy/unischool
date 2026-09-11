import type { FacilityType } from '../state/types';
import { boxFaces, lift, polyPoints, project, projectedArc, projectedCircle, projectedEllipse, type Pt } from './isoProjection';

// Open ground: the Buildables you walk across rather than into — the quad,
// the pool deck, the courts, the pitches, and the stadium's own field. These
// have no mass at all, so they are the one part of the map that is drawn
// flat ON the grid, with their markings projected into the same angle as
// everything standing on it.
//
// Markings are authored in NORMALISED footprint coordinates (u across, v
// down, both 0..1) and projected at draw time, so a 6x3 tennis court and a
// 12x9 stadium use the same numbers and each comes out correctly
// proportioned and correctly skewed. Colour lives in styles.css; this file
// is geometry.

// u/v within the footprint -> world point.
function uv(col: number, row: number, w: number, h: number, u: number, v: number): Pt {
  return project(col + w * u, row + h * v);
}
function uvPoly(col: number, row: number, w: number, h: number, pts: [number, number][]): string {
  return polyPoints(pts.map(([u, v]) => uv(col, row, w, h, u, v)));
}
function uvLine(col: number, row: number, w: number, h: number, u0: number, v0: number, u1: number, v1: number) {
  const a = uv(col, row, w, h, u0, v0);
  const b = uv(col, row, w, h, u1, v1);
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}

interface GroundProps { col: number; row: number; w: number; h: number; }

// A tile-space point: [col, row].
export type TilePt = [number, number];

// ---------------------------------------------------------------------
// A raked stand. This is the one piece of furniture every venue on campus
// shares — the stadium is four of them around a gridiron, and the pitch and
// the ball field each get one small one — so it is defined once here and
// the geometry is identical wherever it appears.
//
// A stand is NOT a box. It is a wedge: the row nearest the field sits low,
// and each row behind it sits higher, so the surface the camera sees is a
// rake climbing away from the play. Drawing it as a box was what made the
// stadium read as "a field inside a container" — a box has a flat top and
// vertical inner walls, which is a wall around a pitch, not seating.
//
// Colours are passed in rather than taken from CSS: the stadium shades its
// stands from its own tint the way every building shades its walls, while
// the small bleachers beside a pitch are plain concrete. One geometry, two
// palettes.
// ---------------------------------------------------------------------
export function RakedStand({ outer, inner, bottomH, topH, rakeFill, wallFill, seatStroke, rows = 4, wall = false, frontWall = false }: {
  outer: [TilePt, TilePt];   // the back edge, furthest from the field and highest
  inner: [TilePt, TilePt];   // the front edge, at the field and lowest
  bottomH: number; topH: number;
  rakeFill: string; wallFill: string; seatStroke: string;
  rows?: number;
  // Which of the stand's two vertical faces the camera can actually see.
  // A stand on the near side of a pitch (max row / max col) shows its OUTER
  // back; one on the far side shows the face toward the field instead. Draw
  // the wrong one and the stand has no mass at all — it reads as a striped
  // ramp lying in the grass, which is exactly what the first version of the
  // small bleachers looked like.
  wall?: boolean;
  frontWall?: boolean;
}) {
  const [o0, o1] = outer;
  const [i0, i1] = inner;
  const at = (t: TilePt, up: number) => lift(project(t[0], t[1]), up);
  const between = (a: TilePt, b: TilePt, f: number): TilePt => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];

  return (
    <>
      {wall && (
        <polygon points={polyPoints([at(o0, 0), at(o1, 0), at(o1, topH), at(o0, topH)])} fill={wallFill} />
      )}
      {frontWall && (
        <polygon points={polyPoints([at(i0, 0), at(i1, 0), at(i1, bottomH), at(i0, bottomH)])} fill={wallFill} />
      )}
      <polygon points={polyPoints([at(o0, topH), at(o1, topH), at(i1, bottomH), at(i0, bottomH)])} fill={rakeFill} />
      {/* Seat rows: lines stepping down the rake. Cheap, and they are what
          actually say "seating" rather than "ramp". */}
      {Array.from({ length: rows - 1 }, (_, k) => {
        const f = (k + 1) / rows;
        const up = topH + (bottomH - topH) * f;
        const a = at(between(o0, i0, f), up);
        const b = at(between(o1, i1, f), up);
        return <line key={k} className="stand-seat" x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={seatStroke} />;
      })}
    </>
  );
}

// Plain concrete, for the bleachers that are not part of a tinted building.
const CONCRETE = { rake: '#cfc7b4', wall: '#b3ab99', seat: 'rgba(60, 54, 42, 0.35)' };

// ---------------------------------------------------------------------
// Gridiron. The markings ARE the recognition: without cross-field yard
// lines and the two rows of hash marks down the middle, a green rectangle
// is just a green rectangle. Drawn along the footprint's longer axis, so a
// rotated stadium still has its yard lines running the right way.
// ---------------------------------------------------------------------
function Gridiron({ col, row, w, h, inset = 0 }: GroundProps & { inset?: number }) {
  const landscape = w >= h;
  // Work in (along, across) and map to (u, v) at the end, so the same
  // numbers describe the field whichever way round the footprint sits.
  const A = (a: number, c: number): [number, number] => (landscape ? [a, c] : [c, a]);
  const lo = inset;
  const hi = 1 - inset;
  const span = hi - lo;
  const at = (a: number, c: number): [number, number] => A(lo + a * span, lo + c * span);

  const END_ZONE = 0.12;          // each end zone as a fraction of the field's length
  const HASH_IN = 0.36;           // how far in from each sideline the hash rows sit
  const lines: number[] = [];
  for (let i = 1; i < 10; i++) lines.push(END_ZONE + (i / 10) * (1 - END_ZONE * 2));

  return (
    <>
      <polygon className="ground-turf" points={uvPoly(col, row, w, h, [at(0, 0), at(1, 0), at(1, 1), at(0, 1)])} />
      {/* End zones, one at each end, in the darker turf tone. */}
      <polygon className="ground-endzone" points={uvPoly(col, row, w, h, [at(0, 0), at(END_ZONE, 0), at(END_ZONE, 1), at(0, 1)])} />
      <polygon className="ground-endzone" points={uvPoly(col, row, w, h, [at(1 - END_ZONE, 0), at(1, 0), at(1, 1), at(1 - END_ZONE, 1)])} />
      {/* Yard lines, full width, every ten yards. */}
      {lines.map((a, i) => {
        const p = at(a, 0); const q = at(a, 1);
        const l = uvLine(col, row, w, h, p[0], p[1], q[0], q[1]);
        return <line key={`y${i}`} className="ground-line" {...l} />;
      })}
      {/* Hash marks: two rows of short ticks between the yard lines, which
          is the detail that makes it read as gridiron rather than soccer. */}
      {lines.flatMap((a, i) => [HASH_IN, 1 - HASH_IN].map((c, j) => {
        const p = at(a - 0.022, c); const q = at(a + 0.022, c);
        const l = uvLine(col, row, w, h, p[0], p[1], q[0], q[1]);
        return <line key={`h${i}-${j}`} className="ground-line-fine" {...l} />;
      }))}
      {/* Goal lines, heavier than the yard lines. */}
      {[END_ZONE, 1 - END_ZONE].map((a, i) => {
        const p = at(a, 0); const q = at(a, 1);
        const l = uvLine(col, row, w, h, p[0], p[1], q[0], q[1]);
        return <line key={`g${i}`} className="ground-line-heavy" {...l} />;
      })}
    </>
  );
}

// ---------------------------------------------------------------------
// Ball diamond. A ballfield is not a square with a diamond in it — it is a
// QUARTER CIRCLE: home plate at one corner, the foul lines 90 degrees
// apart, the outfield sweeping between them, and a wedge of infield dirt
// around the bases. The dirt is what makes it read instantly.
// ---------------------------------------------------------------------
function Diamond({ col, row, w, h }: GroundProps) {
  // Home plate sits back from the footprint's front corner rather than on
  // it, which is what leaves room for the stand BEHIND the plate — where a
  // ballpark actually puts its seats. The outfield radius shrinks to match
  // so the arc still finishes inside the plot.
  const hc = col + w * 0.82;
  const hr = row + h * 0.82;
  const R = Math.min(w, h) * 0.74;      // outfield boundary
  const TRACK = R * 0.88;               // inner edge of the warning track
  const DIRT = Math.min(w, h) * 0.30;   // infield dirt
  const BASE = Math.min(w, h) * 0.19;   // home-to-base
  const from = Math.PI;                 // foul line toward -col
  const to = Math.PI * 1.5;             // foul line toward -row
  const bisect = Math.PI * 1.25;        // toward the outfield's centre
  const home = project(hc, hr);
  const polar = (r: number, a: number) => project(hc + r * Math.cos(a), hr + r * Math.sin(a));
  const tp = (r: number, a: number): TilePt => [hc + r * Math.cos(a), hr + r * Math.sin(a)];

  return (
    <>
      <polygon className="ground-turf" points={polyPoints([home, ...projectedArc(hc, hr, R, from, to), home])} />
      {/* The warning track: a band of dirt inside the fence, so a fielder
          knows the wall is coming. Drawn as the ring between the boundary
          and TRACK — an arc out and the inner arc back. */}
      <polygon
        className="ground-dirt"
        points={polyPoints([
          ...projectedArc(hc, hr, R, from, to, 36),
          ...projectedArc(hc, hr, TRACK, to, from, 36),
        ])}
      />
      <polygon className="ground-dirt" points={polyPoints([home, ...projectedArc(hc, hr, DIRT, from, to), home])} />
      <polygon
        className="ground-line"
        fill="none"
        points={polyPoints([home, polar(BASE, from), polar(BASE * Math.SQRT2, bisect), polar(BASE, to)])}
      />
      <polygon className="ground-dirt-pale" points={polyPoints(projectedCircle(
        hc + BASE * 0.62 * Math.cos(bisect), hr + BASE * 0.62 * Math.sin(bisect), Math.min(w, h) * 0.045, 20,
      ))} />
      {[from, to].map((a, i) => {
        const end = polar(R, a);
        return <line key={i} className="ground-line" x1={home.x} y1={home.y} x2={end.x} y2={end.y} />;
      })}
      {/* The outfield fence, following the boundary. */}
      {(() => {
        const FENCE_H = 5;
        const arcPts = projectedArc(hc, hr, R, from, to, 36);
        return (
          <>
            <polygon className="ground-fence" points={polyPoints([...arcPts, ...[...arcPts].reverse().map((q) => lift(q, FENCE_H))])} />
            <polyline className="ground-fence-rail" fill="none" points={polyPoints(arcPts.map((q) => lift(q, FENCE_H)))} />
          </>
        );
      })()}
      {/* The stand, BEHIND home plate and facing out over the diamond —
          which is where a ballpark's seats are. It was in the outfield
          corner before, which is a real place to put bleachers but not the
          place you watch a game from. */}
      {(() => {
        const behind = bisect + Math.PI;   // away from the field, past the plate
        const dA = 0.45;
        // The plate sits 0.82 of the way across, so the room behind it runs
        // (1 - 0.82) * min(w, h) * sqrt(2) along this diagonal — about 1.78
        // tiles on a 7x7. The first version put the stand's back edge at
        // 0.32 of the short side (2.24 tiles) and it overran the plot, which
        // is what made it read as detached rather than as seating behind the
        // backstop. Both radii now sit inside that room, and the near edge
        // is close enough to the plate to read as behind it.
        const OUTER = 0.22;
        const INNER = 0.06;
        return (
          <RakedStand
            outer={[tp(Math.min(w, h) * OUTER, behind - dA), tp(Math.min(w, h) * OUTER, behind + dA)]}
            inner={[tp(Math.min(w, h) * INNER, behind - dA), tp(Math.min(w, h) * INNER, behind + dA)]}
            bottomH={5}
            topH={15}
            rakeFill={CONCRETE.rake}
            wallFill={CONCRETE.wall}
            seatStroke={CONCRETE.seat}
            rows={4}
            wall
          />
        );
      })()}
    </>
  );
}

// A soccer pitch: centre circle, halfway line, and the two penalty areas
// that stop it being "a field with a circle on it".
function Pitch({ col, row, w, h }: GroundProps) {
  const landscape = w >= h;
  const A = (a: number, c: number): [number, number] => (landscape ? [a, c] : [c, a]);
  const cc = col + w * 0.5;
  const cr = row + h * 0.5;

  // The running track: an oval around the pitch, which is what a
  // multi-sport field actually is. The band between the two ellipses is the
  // track surface; the pitch sits in the infield inside it.
  //
  // Radii are taken along the footprint's own axes so a rotated field gets
  // an oval the right way round, and the outer one stops short of the edge
  // to leave a strip for the stand.
  const outerA = 0.46;   // along the long axis, as a fraction of that side
  const outerC = 0.40;   // across it
  const innerA = 0.355;
  const innerC = 0.285;
  const rA = (fr: number) => (landscape ? w : h) * fr;
  const rC = (fr: number) => (landscape ? h : w) * fr;
  const ell = (fa: number, fc: number) => (landscape
    ? projectedEllipse(cc, cr, rA(fa), rC(fc))
    : projectedEllipse(cc, cr, rC(fc), rA(fa)));

  // The pitch itself, inscribed in the infield.
  const at = (a: number, c: number): [number, number] => A(0.5 + (a - 0.5) * 0.60, 0.5 + (c - 0.5) * 0.50);
  const half = uvLine(col, row, w, h, ...at(0.5, 0), ...at(0.5, 1));
  const box = (from: number, to: number) => uvPoly(col, row, w, h, [at(from, 0.24), at(to, 0.24), at(to, 0.76), at(from, 0.76)]);

  return (
    <>
      {/* Track surface, then the infield cut back out of it. */}
      <polygon className="ground-track" points={polyPoints(ell(outerA, outerC))} />
      <polygon className="ground-lane" fill="none" points={polyPoints(ell(outerA - 0.03, outerC - 0.035))} />
      <polygon className="ground-lane" fill="none" points={polyPoints(ell(outerA - 0.06, outerC - 0.07))} />
      <polygon className="ground-turf" points={polyPoints(ell(innerA, innerC))} />

      <polygon className="ground-turf" points={uvPoly(col, row, w, h, [at(0, 0), at(1, 0), at(1, 1), at(0, 1)])} />
      <polygon className="ground-line" fill="none" points={uvPoly(col, row, w, h, [at(0, 0), at(1, 0), at(1, 1), at(0, 1)])} />
      <line className="ground-line" {...half} />
      <polygon className="ground-line" points={box(0, 0.16)} fill="none" />
      <polygon className="ground-line" points={box(0.84, 1)} fill="none" />
      <polygon
        className="ground-line"
        fill="none"
        points={polyPoints(projectedCircle(cc, cr, Math.min(w, h) * 0.10))}
      />

      {/* The stand, outside the track on the far side. */}
      {(() => {
        const tp = (a: number, c: number): TilePt => {
          const [u, v] = A(a, c);
          return [col + w * u, row + h * v];
        };
        return (
          // Spanning the middle only, where the oval is straightest. A stand
          // running the full width stood off the curve at both ends and read
          // as detached from the track it serves.
          <RakedStand
            outer={[tp(0.32, 0.02), tp(0.68, 0.02)]}
            inner={[tp(0.32, 0.10), tp(0.68, 0.10)]}
            bottomH={5}
            topH={14}
            rakeFill={CONCRETE.rake}
            wallFill={CONCRETE.wall}
            seatStroke={CONCRETE.seat}
            rows={4}
            frontWall
          />
        );
      })()}
    </>
  );
}

// Courts: a net across the middle and the service boxes either side.
function Courts({ col, row, w, h }: GroundProps) {
  const landscape = w >= h;
  const A = (a: number, c: number): [number, number] => (landscape ? [a, c] : [c, a]);
  const lo = 0.08; const span = 1 - lo * 2;
  const at = (a: number, c: number): [number, number] => A(lo + a * span, lo + c * span);
  return (
    <>
      <polygon className="ground-court" points={uvPoly(col, row, w, h, [at(0, 0), at(1, 0), at(1, 1), at(0, 1)])} />
      <line className="ground-line-heavy" {...uvLine(col, row, w, h, ...at(0.5, 0), ...at(0.5, 1))} />
      <line className="ground-line" {...uvLine(col, row, w, h, ...at(0.25, 0.16), ...at(0.75, 0.16))} />
      <line className="ground-line" {...uvLine(col, row, w, h, ...at(0.25, 0.84), ...at(0.75, 0.84))} />
      <line className="ground-line" {...uvLine(col, row, w, h, ...at(0.25, 0.16), ...at(0.25, 0.84))} />
      <line className="ground-line" {...uvLine(col, row, w, h, ...at(0.75, 0.16), ...at(0.75, 0.84))} />
    </>
  );
}

// The quad: lawn with walks cut across it, meeting at something worth
// walking to.
function Quad({ col, row, w, h }: GroundProps) {
  return (
    <>
      <polygon className="ground-lawn" points={uvPoly(col, row, w, h, [[0, 0], [1, 0], [1, 1], [0, 1]])} />
      <line className="ground-walk" {...uvLine(col, row, w, h, 0.04, 0.04, 0.96, 0.96)} />
      <line className="ground-walk" {...uvLine(col, row, w, h, 0.96, 0.04, 0.04, 0.96)} />
      <polygon
        className="ground-medallion"
        points={polyPoints(projectedCircle(col + w * 0.5, row + h * 0.5, Math.min(w, h) * 0.13))}
      />
    </>
  );
}

// The open-air pool: deck with the water sunk into it, plus lane lines.
function PoolDeck({ col, row, w, h }: GroundProps) {
  const water: [number, number][] = [[0.18, 0.24], [0.82, 0.24], [0.82, 0.76], [0.18, 0.76]];
  return (
    <>
      <polygon className="ground-deck" points={uvPoly(col, row, w, h, [[0, 0], [1, 0], [1, 1], [0, 1]])} />
      <polygon className="ground-water" points={uvPoly(col, row, w, h, water)} />
      {[0.38, 0.5, 0.62].map((v, i) => (
        <line key={i} className="ground-lane" {...uvLine(col, row, w, h, 0.2, v, 0.8, v)} />
      ))}
    </>
  );
}

// Which marking each open-ground facility wears. The stadium's own field
// is a gridiron too — see StadiumField below, which the bowl motif draws
// inside its stands.
export default function GroundMarking({ facilityType, col, row, w, h }: GroundProps & { facilityType?: FacilityType }) {
  switch (facilityType) {
    case 'athleticsField': return <Pitch col={col} row={row} w={w} h={h} />;
    case 'athleticsDiamond': return <Diamond col={col} row={row} w={w} h={h} />;
    case 'tennisCourts': return <Courts col={col} row={row} w={w} h={h} />;
    case 'pool': return <PoolDeck col={col} row={row} w={w} h={h} />;
    case 'quad': return <Quad col={col} row={row} w={w} h={h} />;
    default:
      return <polygon className="ground-lawn" points={polyPoints(boxFaces(col, row, w, h, 0, 0).top)} />;
  }
}

// The stadium's interior, drawn by the bowl motif inside its ring of
// stands. A SOLID surface under everything: the first version left the
// ring's opening showing bare lawn and grid lines between the pitch edge
// and the stands, which read as a hole in the map rather than a stadium.
export function StadiumField({ col, row, w, h }: GroundProps) {
  return (
    <>
      {/* The full interior, so nothing behind the stands is ever visible
          through the opening. Drawn before the gridiron sitting on it. */}
      <polygon className="ground-track" points={polyPoints(boxFaces(col, row, w, h, 0, 0).top)} />
      <Gridiron col={col} row={row} w={w} h={h} inset={0.10} />
    </>
  );
}
