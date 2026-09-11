import type { FacilityType } from '../state/types';
import { boxFaces, lift, polyPoints, project, projectedArc, projectedCircle, projectedStadium, type Pt } from './isoProjection';
import { TreeAt, type Species } from './trees';

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

// Seating that WRAPS, rather than a straight bank. A ballpark's stands curve
// around home plate and run some way down both foul lines — see any aerial
// photograph of one — so a single straight box behind the plate is both the
// wrong shape and, at the size one has to be to fit, far too small a part of
// the complex.
//
// Same wedge section as RakedStand (low at the field, climbing away from it,
// seat rows stepping up the rake); the difference is that every edge here is
// an arc about a centre rather than a straight line between two points.
export function ArcStand({ cc, cr, rInner, rOuter, from, to, bottomH, topH, rakeFill, wallFill, seatStroke, rows = 5 }: {
  cc: number; cr: number;          // the centre the seating wraps around, in tiles
  rInner: number; rOuter: number;  // the front edge at the field, and the back edge
  from: number; to: number;        // the sweep, in radians
  bottomH: number; topH: number;
  rakeFill: string; wallFill: string; seatStroke: string;
  rows?: number;
}) {
  const SEGMENTS = 30;
  const arcAt = (r: number, h: number) => projectedArc(cc, cr, r, from, to, SEGMENTS).map((q) => lift(q, h));
  const innerGround = arcAt(rInner, 0);
  const innerTop = arcAt(rInner, bottomH);
  const outerGround = arcAt(rOuter, 0);
  const outerTop = arcAt(rOuter, topH);

  return (
    <>
      {/* The back of the stand, then the low face toward the field, then the
          rake over both — so whichever way a given stretch of the curve
          happens to face, the surface the camera sees is drawn last. */}
      <polygon points={polyPoints([...outerGround, ...[...outerTop].reverse()])} fill={wallFill} />
      <polygon points={polyPoints([...innerGround, ...[...innerTop].reverse()])} fill={wallFill} />
      <polygon points={polyPoints([...outerTop, ...[...innerTop].reverse()])} fill={rakeFill} />
      {Array.from({ length: rows - 1 }, (_, k) => {
        const f = (k + 1) / rows;
        return (
          <polyline
            key={k}
            className="stand-seat"
            fill="none"
            stroke={seatStroke}
            points={polyPoints(arcAt(rOuter + (rInner - rOuter) * f, topH + (bottomH - topH) * f))}
          />
        );
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
  // Home plate sits well back from the footprint's front corner, because the
  // SEATING needs that room: a ballpark's stands wrap around the plate and
  // run down both foul lines, and at 0.82 across the plot there was only
  // 1.35 tiles of arc radius to fit them in. At 0.70 there is 2.25, which is
  // the difference between a small box behind the backstop and seating that
  // reads as part of the complex. The outfield shrinks to match so the arc
  // still finishes inside the plot.
  const hc = col + w * 0.70;
  const hr = row + h * 0.70;
  const R = Math.min(w, h) * 0.66;      // outfield boundary
  const TRACK = R * 0.87;               // inner edge of the warning track
  const DIRT = Math.min(w, h) * 0.30;   // the infield skin
  const BASE = Math.min(w, h) * 0.19;   // home-to-base
  const from = Math.PI;                 // foul line toward -col
  const to = Math.PI * 1.5;             // foul line toward -row
  const bisect = Math.PI * 1.25;        // toward the outfield's centre
  const behind = bisect + Math.PI;      // out past the plate, where the seats are
  const home = project(hc, hr);
  const polar = (r: number, a: number) => project(hc + r * Math.cos(a), hr + r * Math.sin(a));

  // The base path, and the grass inside it. A real infield is not a solid
  // wedge of dirt — the skin runs around the bases and the middle of the
  // diamond is turf, which is most of what the pattern reads as from above.
  const basePath = [home, polar(BASE, from), polar(BASE * Math.SQRT2, bisect), polar(BASE, to)];
  const infieldGrass = [
    polar(BASE * 0.34, bisect), polar(BASE * 0.72, from), polar(BASE * 1.06, bisect), polar(BASE * 0.72, to),
  ];

  return (
    <>
      <polygon className="ground-turf" points={polyPoints([home, ...projectedArc(hc, hr, R, from, to), home])} />
      {/* The warning track: a band of dirt inside the fence, so a fielder
          knows the wall is coming. The ring between the boundary arc and one
          just inside it. */}
      <polygon
        className="ground-dirt"
        points={polyPoints([
          ...projectedArc(hc, hr, R, from, to, 36),
          ...projectedArc(hc, hr, TRACK, to, from, 36),
        ])}
      />
      <polygon className="ground-dirt" points={polyPoints([home, ...projectedArc(hc, hr, DIRT, from, to), home])} />
      <polygon className="ground-turf" points={polyPoints(infieldGrass)} />
      <polygon className="ground-line" fill="none" points={polyPoints(basePath)} />
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
      {/* The stands, wrapping the plate and running down both foul lines. */}
      {/* 172 degrees of wrap, which reaches most of the way down both foul
          lines — a narrower arc left the seating sitting behind the plate
          only, and a ballpark's stands run well past it on both sides. Both
          ends stay inside the plot: at this radius the far end lands at
          (3.57, 6.43) on a 7x7. The inner edge hugs the plate rather than
          standing off it, so the backstop reads as a gap of a few feet
          rather than a moat. */}
      <ArcStand
        cc={hc} cr={hr}
        rInner={Math.min(w, h) * 0.055}
        rOuter={Math.min(w, h) * 0.29}
        from={behind - 1.5}
        to={behind + 1.5}
        bottomH={5}
        topH={17}
        rakeFill={CONCRETE.rake}
        wallFill={CONCRETE.wall}
        seatStroke={CONCRETE.seat}
        rows={5}
      />
    </>
  );
}

// A soccer pitch: centre circle, halfway line, and the two penalty areas
// that stop it being "a field with a circle on it".
// The number of running lanes. Eight is the competition standard and what a
// track looks like from above — the concentric lines ARE the read.
const TRACK_LANES = 8;

function Pitch({ col, row, w, h }: GroundProps) {
  const landscape = w >= h;
  const cc = col + w * 0.5;
  const cr = row + h * 0.5;
  const along = landscape ? w : h;    // the footprint side the track's long axis runs down
  const across = landscape ? h : w;

  // A track is a STADIUM, not an ellipse: two dead-straight sides joined by
  // semicircular ends. An ellipse bows where the straights should be, which
  // is the first thing that reads as wrong about one.
  // Proportions are the real ones: a 400m track is about 176m long by 92m
  // across, so the outer oval stays near 1.95:1 whatever the footprint. The
  // margin left over is what the stand sits in, which is why these are not
  // simply as large as they fit.
  const outerLen = along * 0.43;
  const outerWid = across * 0.375;
  const trackWidth = Math.min(w, h) * 0.13;    // all eight lanes together
  const innerLen = outerLen - trackWidth;
  const innerWid = outerWid - trackWidth;

  const stadium = (fraction: number) => projectedStadium(
    cc, cr,
    innerLen + (outerLen - innerLen) * fraction,
    innerWid + (outerWid - innerWid) * fraction,
    landscape,
  );

  // The pitch inside, sized from the shape a pitch actually IS rather than
  // from two independent fractions of the infield: 105m by 68m, so the width
  // comes off the infield and the length follows from the ratio. Doing it the
  // other way round gave a pitch half again too long for its width, which
  // read as a stretched rectangle no amount of correct marking could fix.
  // What is left over at each end is the D-zone, exactly as on a real track.
  const PITCH_RATIO = 105 / 68;
  const pitchWid = innerWid * 0.93;
  const pitchLen = Math.min(pitchWid * PITCH_RATIO, innerLen * 0.96);

  // Markings are laid out in the pitch's own (along, across) frame, so a
  // rotated field keeps its halfway line across the short way.
  const pp = (a: number, c: number): Pt => (landscape
    ? project(cc + a * pitchLen, cr + c * pitchWid)
    : project(cc + c * pitchWid, cr + a * pitchLen));
  const rect = (a0: number, a1: number, c0: number, c1: number) =>
    polyPoints([pp(a0, c0), pp(a1, c0), pp(a1, c1), pp(a0, c1)]);
  const seg = (a0: number, c0: number, a1: number, c1: number) => {
    const p0 = pp(a0, c0); const p1 = pp(a1, c1);
    return { x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y };
  };

  const STRIPES = 10;

  return (
    <>
      {/* The running surface, then the lane lines over it. The area inside
          the innermost lane stays track-coloured at both ends, which is what
          the D-zones either side of a pitch actually are. */}
      <polygon className="ground-track" points={polyPoints(stadium(1))} />
      {Array.from({ length: TRACK_LANES + 1 }, (_, i) => (
        <polygon
          key={i}
          className="ground-lane"
          fill="none"
          points={polyPoints(stadium(i / TRACK_LANES))}
        />
      ))}

      {/* The pitch, with mowing stripes — the bands are most of what makes a
          pitch read as cut grass rather than as a green rectangle. */}
      <polygon className="ground-turf" points={rect(-1, 1, -1, 1)} />
      {Array.from({ length: STRIPES }, (_, i) => (i % 2 === 0 ? null : (
        <polygon
          key={i}
          className="ground-mow"
          points={rect(-1 + (2 * i) / STRIPES, -1 + (2 * (i + 1)) / STRIPES, -1, 1)}
        />
      )))}

      <polygon className="ground-line" fill="none" points={rect(-1, 1, -1, 1)} />
      <line className="ground-line" {...seg(0, -1, 0, 1)} />
      <polygon className="ground-line" fill="none" points={rect(-1, -0.68, -0.42, 0.42)} />
      <polygon className="ground-line" fill="none" points={rect(0.68, 1, -0.42, 0.42)} />
      <polygon className="ground-line" fill="none" points={rect(-1, -0.86, -0.2, 0.2)} />
      <polygon className="ground-line" fill="none" points={rect(0.86, 1, -0.2, 0.2)} />
      <polygon
        className="ground-line"
        fill="none"
        points={polyPoints(projectedCircle(cc, cr, Math.min(w, h) * 0.09))}
      />

      {/* The stand, outside the track on the far side. Spanning the middle
          only, where the track's straight runs — and seated ON the track's
          edge rather than at a guessed offset, so shrinking or widening the
          oval above cannot leave it floating in the margin. */}
      {(() => {
        const tp = (a: number, c: number): TilePt => (landscape
          ? [col + w * a, row + h * c]
          : [col + w * c, row + h * a]);
        const trackEdge = 0.5 - outerWid / across;   // the oval's far side, as a footprint fraction
        return (
          <RakedStand
            outer={[tp(0.32, 0.02), tp(0.68, 0.02)]}
            inner={[tp(0.32, trackEdge), tp(0.68, trackEdge)]}
            bottomH={4}
            topH={16}
            rakeFill={CONCRETE.rake}
            wallFill={CONCRETE.wall}
            seatStroke={CONCRETE.seat}
            rows={5}
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

// ---------------------------------------------------------------------
// THE QUAD. The open middle of the campus, and the one Buildable whose
// whole payoff is how it looks — its satisfaction contribution is a flat
// bonus that never scales, so it is bought for the place it makes rather
// than for the capacity it adds (see facilitiesData.ts).
//
// Both tiers are drawn from the same parts, at different densities: lawn,
// a CROSS of paved walks, planting, and something at the middle worth
// walking to. Two things about the walks matter and neither is decoration:
//
//   - They run from the MIDPOINT of each edge to the centre, not corner to
//     corner. A drawn walkway (see pathways.tsx) arriving at the quad's
//     edge therefore meets a walk rather than a lawn, whichever side it
//     comes from — which is what makes a hand-drawn path network join the
//     quad instead of stopping at it.
//   - They are filled SHAPES with a width in tiles, not strokes. A stroke's
//     width is in screen units, so a stroked walk covers a different amount
//     of ground at every zoom; a 13x13 quad's walks have to be a real width
//     on the ground to read as paving at all.
//
// Tier 1 is a plain college green: grass, the cross, a stone roundel where
// the walks meet, and trees at the corners. Tier 2 (the Grand Quad &
// Gardens) keeps every one of those and adds the things a garden has — a
// big fountain in place of the roundel, flower beds down the walks, clipped
// hedges, and more trees.
// ---------------------------------------------------------------------

// The walks, as a fraction of the quad's own width/height. Wide enough to
// walk four abreast at the scale the rest of the map is drawn to.
const QUAD_WALK = 0.075;

function QuadWalks({ col, row, w, h }: GroundProps) {
  const half = QUAD_WALK / 2;
  return (
    <>
      {/* Edge midpoint to edge midpoint, both ways — so the walks cross at
          the centre and meet every side square on. */}
      <polygon
        className="ground-walk-fill"
        points={uvPoly(col, row, w, h, [[0, 0.5 - half], [1, 0.5 - half], [1, 0.5 + half], [0, 0.5 + half]])}
      />
      <polygon
        className="ground-walk-fill"
        points={uvPoly(col, row, w, h, [[0.5 - half, 0], [0.5 + half, 0], [0.5 + half, 1], [0.5 - half, 1]])}
      />
    </>
  );
}

// The quad's own planting. Drawn through components/trees.tsx's TreeAt,
// the SAME component the founding woodland uses, so a tree on the quad is
// the same object as a tree in the wood beside it rather than a
// second-class lookalike. What differs is only where it comes from: a
// woodland tree is one tile's entry in `trees` (its own state, felled by
// building — see state/types.ts), while a quad's planting is part of the
// quad, arriving and leaving with the building, so it is authored geometry
// here and carries no state at all.
//
// Authored rather than random, and that is load-bearing: the map re-renders
// on every pan and every tick, so planting rolled at draw time would shift
// between frames and read as a rendering fault.
type QuadPlanting = [u: number, v: number, species: Species, scale: number];

const QUAD_TREES: QuadPlanting[] = [
  [0.15, 0.15, 'canopy', 1.0], [0.85, 0.15, 'canopy', 1.0],
  [0.15, 0.85, 'canopy', 1.05], [0.85, 0.85, 'canopy', 1.05],
  [0.5, 0.12, 'ornamental', 1.0], [0.5, 0.88, 'ornamental', 1.0],
];

// The gardens tier keeps every one of those and fills in between them: the
// corners of the four lawn panels the cross walk makes, and a conifer on
// each side to break the line of round crowns.
const GARDEN_TREES: QuadPlanting[] = [
  ...QUAD_TREES,
  [0.08, 0.5, 'conifer', 1.1], [0.92, 0.5, 'conifer', 1.1],
  [0.26, 0.26, 'ornamental', 0.85], [0.74, 0.26, 'ornamental', 0.85],
  [0.26, 0.74, 'canopy', 0.8], [0.74, 0.74, 'canopy', 0.8],
];

// A bed of flowers: dark earth with blooms scattered over it. The blooms
// are placed from a fixed lattice with a fixed nudge per index rather than
// at random — the map re-renders constantly (every pan, every tick), and
// planting that moved between frames would read as a rendering fault.
function FlowerBed({ col, row, w, h, u0, v0, u1, v1 }: GroundProps & {
  u0: number; v0: number; u1: number; v1: number;
}) {
  const cols = 5; const rows = 3;
  const blooms = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const u = u0 + ((c + 0.5) / cols) * (u1 - u0) + ((i % 3) - 1) * 0.004;
      const v = v0 + ((r + 0.5) / rows) * (v1 - v0) + ((i % 2) - 0.5) * 0.004;
      blooms.push(
        <polygon
          key={i}
          className={`ground-bloom-${i % 4}`}
          points={polyPoints(projectedCircle(col + w * u, row + h * v, Math.min(w, h) * 0.011, 8))}
        />,
      );
    }
  }
  return (
    <>
      <polygon className="ground-bed" points={uvPoly(col, row, w, h, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]])} />
      {blooms}
    </>
  );
}

// A clipped hedge: a low box with a lit top face, so it has mass rather
// than being a green stripe painted on the grass.
function Hedge({ col, row, w, h, u0, v0, u1, v1 }: GroundProps & {
  u0: number; v0: number; u1: number; v1: number;
}) {
  const HEIGHT = 7;
  const f = boxFaces(col + w * u0, row + h * v0, w * (u1 - u0), h * (v1 - v0), 0, HEIGHT);
  return (
    <>
      <polygon className="ground-hedge" points={polyPoints(f.left)} />
      <polygon className="ground-hedge" points={polyPoints(f.right)} />
      <polygon className="ground-hedge-top" points={polyPoints(f.top)} />
    </>
  );
}

// The fountain at the centre of the Grand Quad: a stone kerb, the water
// inside it, a raised basin, and a jet standing out of that with a ring of
// spray falling back into the pool. Static geometry — a real animation
// would have to run every frame on a surface that is otherwise only redrawn
// when something changes, and the shape alone already reads as a fountain.
function Fountain({ col, row, w, h }: GroundProps) {
  const cc = col + w * 0.5; const cr = row + h * 0.5;
  const R = Math.min(w, h) * 0.20;
  const centre = project(cc, cr);
  const ring = (r: number, up = 0) => polyPoints(projectedCircle(cc, cr, r, 36).map((q) => lift(q, up)));

  return (
    <>
      <polygon className="ground-fountain-kerb" points={ring(R)} />
      <polygon className="ground-fountain-water" points={ring(R * 0.84)} />
      {/* The raised basin standing in the middle of the pool. */}
      <polygon className="ground-fountain-kerb" points={ring(R * 0.30, 7)} />
      <polygon className="ground-fountain-basin" points={ring(R * 0.24, 9)} />
      {/* The jet: a tapering column of water over the basin, with spray
          falling back around it. The spray ring is deliberately small and
          close to the basin — at the first pass it was wide enough to
          cover most of the pool, which washed the water out to near-white
          and lost the one blue on the quad. */}
      <polygon
        className="ground-fountain-spray"
        points={ring(R * 0.44, 11)}
      />
      <polygon
        className="ground-fountain-jet"
        points={polyPoints([
          { x: centre.x - 3.4, y: centre.y - 9 },
          { x: centre.x + 3.4, y: centre.y - 9 },
          { x: centre.x + 1.1, y: centre.y - 44 },
          { x: centre.x - 1.1, y: centre.y - 44 },
        ])}
      />
      <polygon
        className="ground-fountain-jet"
        points={polyPoints(projectedCircle(cc, cr, R * 0.09, 12).map((q) => lift(q, 46)))}
      />
    </>
  );
}

// The tier-1 quad's centrepiece: a paved roundel, a stepped plinth on it,
// and a column standing on that. Drawn in the same two-part language the
// fountain below uses — a ground ring, then mass lifted above it — so the
// two tiers' centres read as the same KIND of thing at different scales.
function Monument({ col, row, w, h }: GroundProps) {
  const cc = col + w * 0.5; const cr = row + h * 0.5;
  const R = Math.min(w, h) * 0.13;
  const centre = project(cc, cr);
  const ring = (r: number, up = 0) => polyPoints(projectedCircle(cc, cr, r, 30).map((q) => lift(q, up)));
  return (
    <>
      <polygon className="ground-medallion" points={ring(R)} />
      <polygon className="ground-fountain-kerb" points={ring(R * 0.46, 5)} />
      {/* The shaft: a tapering column, in screen space like a tree's crown —
          it is mass in the air, not a marking on the ground. */}
      <polygon
        className="ground-monument"
        points={polyPoints([
          { x: centre.x - 4.5, y: centre.y - 5 },
          { x: centre.x + 4.5, y: centre.y - 5 },
          { x: centre.x + 3.0, y: centre.y - 34 },
          { x: centre.x - 3.0, y: centre.y - 34 },
        ])}
      />
      <polygon
        className="ground-monument-cap"
        points={polyPoints([
          { x: centre.x - 5.0, y: centre.y - 33 },
          { x: centre.x + 5.0, y: centre.y - 33 },
          { x: centre.x, y: centre.y - 43 },
        ])}
      />
    </>
  );
}

function Quad({ col, row, w, h, tier }: GroundProps & { tier: number }) {
  const gardens = tier >= 2;
  return (
    <>
      <polygon className="ground-lawn" points={uvPoly(col, row, w, h, [[0, 0], [1, 0], [1, 1], [0, 1]])} />
      {/* Mowing stripes, which are most of what makes a big green read as
          kept lawn rather than a flat colour. */}
      {[0.12, 0.28, 0.44, 0.60, 0.76, 0.92].map((v) => (
        <polygon
          key={v}
          className="ground-mow"
          points={uvPoly(col, row, w, h, [[0, v - 0.05], [1, v - 0.05], [1, v + 0.03], [0, v + 0.03]])}
        />
      ))}
      <QuadWalks col={col} row={row} w={w} h={h} />

      {gardens ? (
        <>
          {/* Beds down both sides of each walk, and hedges closing the
              corners of the four lawn panels the cross makes. */}
          <FlowerBed col={col} row={row} w={w} h={h} u0={0.10} v0={0.38} u1={0.40} v1={0.44} />
          <FlowerBed col={col} row={row} w={w} h={h} u0={0.60} v0={0.38} u1={0.90} v1={0.44} />
          <FlowerBed col={col} row={row} w={w} h={h} u0={0.10} v0={0.56} u1={0.40} v1={0.62} />
          <FlowerBed col={col} row={row} w={w} h={h} u0={0.60} v0={0.56} u1={0.90} v1={0.62} />
          <Hedge col={col} row={row} w={w} h={h} u0={0.38} v0={0.10} u1={0.44} v1={0.32} />
          <Hedge col={col} row={row} w={w} h={h} u0={0.56} v0={0.10} u1={0.62} v1={0.32} />
          <Hedge col={col} row={row} w={w} h={h} u0={0.38} v0={0.68} u1={0.44} v1={0.90} />
          <Hedge col={col} row={row} w={w} h={h} u0={0.56} v0={0.68} u1={0.62} v1={0.90} />
        </>
      ) : (
        // Tier 1's centre: a paved roundel where the walks meet, with a
        // plinth and a column standing on it. The roundel alone was there
        // first and was invisible — it is the same stone as the walks that
        // run into it, so on a lawn it read as a slight widening of the
        // crossing and nothing more. What the walks need at their meeting
        // point is something to be walking TO, and one standing object is
        // the cheapest honest version of that.
        <Monument col={col} row={row} w={w} h={h} />
      )}

      {/* Planting, drawn back-to-front so a near tree overlaps a far one —
          the same depth rule CampusMap applies to whole buildings. */}
      {(gardens ? GARDEN_TREES : QUAD_TREES)
        .slice()
        .sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]))
        .map(([u, v, species, size], i) => (
          <TreeAt key={i} col={col + w * u} row={row + h * v} species={species} scale={size} />
        ))}

      {/* The fountain last: it is the tallest thing on the quad, so it
          paints over the planting behind it. */}
      {gardens && <Fountain col={col} row={row} w={w} h={h} />}
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
export default function GroundMarking({ facilityType, col, row, w, h, tier }: GroundProps & {
  facilityType?: FacilityType;
  // The quad is the one open-ground facility with TIERS, and its two are
  // genuinely different places rather than the same lawn at two sizes (see
  // the quad block above). Nothing else here reads it.
  tier?: number;
}) {
  switch (facilityType) {
    case 'athleticsField': return <Pitch col={col} row={row} w={w} h={h} />;
    case 'athleticsDiamond': return <Diamond col={col} row={row} w={w} h={h} />;
    case 'tennisCourts': return <Courts col={col} row={row} w={w} h={h} />;
    case 'pool': return <PoolDeck col={col} row={row} w={w} h={h} />;
    case 'quad': return <Quad col={col} row={row} w={w} h={h} tier={tier ?? 1} />;
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
