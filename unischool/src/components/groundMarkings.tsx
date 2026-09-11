import type { FacilityType } from '../state/types';
import { boxFaces, polyPoints, project, projectedArc, projectedCircle, type Pt } from './isoProjection';

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
  // Home plate sits at the FRONT corner of the footprint — the one nearest
  // the camera — with the field opening away from it, so the view is the one
  // you get from behind the plate. The foul lines run along -col and -row,
  // exactly 90 degrees apart, and the outfield arc sweeps between them.
  //
  // The radius is bounded by the footprint rather than chosen freely: the
  // first version used 0.86 of the short side, which put the arc's widest
  // point outside the footprint entirely and spilled the outfield across the
  // neighbouring lawn.
  const hc = col + w * 0.93;
  const hr = row + h * 0.93;
  const R = Math.min(w, h) * 0.82;      // outfield, sized to stay inside the plot
  const DIRT = Math.min(w, h) * 0.32;   // infield dirt
  const BASE = Math.min(w, h) * 0.21;   // home-to-base
  const from = Math.PI;                 // foul line toward -col
  const to = Math.PI * 1.5;             // foul line toward -row
  const bisect = Math.PI * 1.25;        // toward the outfield's centre
  const home = project(hc, hr);
  const polar = (r: number, a: number) => project(hc + r * Math.cos(a), hr + r * Math.sin(a));

  return (
    <>
      <polygon className="ground-turf" points={polyPoints([home, ...projectedArc(hc, hr, R, from, to), home])} />
      <polygon className="ground-dirt" points={polyPoints([home, ...projectedArc(hc, hr, DIRT, from, to), home])} />
      {/* The base path: home, first, second, third — a square stood on one
          corner, with home at the near end. */}
      <polygon
        className="ground-line"
        fill="none"
        points={polyPoints([home, polar(BASE, from), polar(BASE * Math.SQRT2, bisect), polar(BASE, to)])}
      />
      <polygon className="ground-dirt-pale" points={polyPoints(projectedCircle(
        hc + BASE * 0.62 * Math.cos(bisect), hr + BASE * 0.62 * Math.sin(bisect), Math.min(w, h) * 0.05, 20,
      ))} />
      {[from, to].map((a, i) => {
        const end = polar(R, a);
        return <line key={i} className="ground-line" x1={home.x} y1={home.y} x2={end.x} y2={end.y} />;
      })}
    </>
  );
}

// A soccer pitch: centre circle, halfway line, and the two penalty areas
// that stop it being "a field with a circle on it".
function Pitch({ col, row, w, h }: GroundProps) {
  const landscape = w >= h;
  const A = (a: number, c: number): [number, number] => (landscape ? [a, c] : [c, a]);
  const lo = 0.06; const span = 1 - lo * 2;
  const at = (a: number, c: number): [number, number] => A(lo + a * span, lo + c * span);
  const half = uvLine(col, row, w, h, ...at(0.5, 0), ...at(0.5, 1));
  const box = (from: number, to: number) => uvPoly(col, row, w, h, [at(from, 0.22), at(to, 0.22), at(to, 0.78), at(from, 0.78)]);
  return (
    <>
      <polygon className="ground-turf" points={uvPoly(col, row, w, h, [at(0, 0), at(1, 0), at(1, 1), at(0, 1)])} />
      <line className="ground-line" {...half} />
      <polygon className="ground-line" points={box(0, 0.16)} fill="none" />
      <polygon className="ground-line" points={box(0.84, 1)} fill="none" />
      <polygon
        className="ground-line"
        fill="none"
        points={polyPoints(projectedCircle(col + w * 0.5, row + h * 0.5, Math.min(w, h) * 0.16))}
      />
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
      <Gridiron col={col} row={row} w={w} h={h} inset={0.16} />
    </>
  );
}
