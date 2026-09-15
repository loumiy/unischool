import type { FacilityType } from '../state/types';
import { boxFaces, lift, polyPoints, project, projectedArc, projectedCircle, projectedStadium, type Pt } from './isoProjection';
import { up } from './campusScale';
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
// FLAT GROUND AND THE THINGS STANDING ON IT — a split this file needs and
// the campus map enforces (see CampusMap.tsx's render).
//
// An angled map is painted back to front, and the order IS the occlusion.
// That works for masses, each of which can be represented by one depth (the
// far corner of its footprint) well enough. It does NOT work for a large
// FLAT plate: a 9x9 quad sorted on its far corner draws AFTER — and so over
// — a tree standing in front of its near corner but off to one side, whose
// own depth is smaller. That is not a tuning problem, it is what a single
// sort key cannot express about a big footprint.
//
// The fix is to stop asking. Flat ground has no height, so it can never
// legitimately occlude anything: it belongs UNDER every mass on the map,
// drawn in a pass of its own before them, and needs no depth at all. What
// genuinely stands on a quad or a ball field — planting, hedges, a
// fountain, a monument, a stand, a fence — is a mass like any other and
// sorts like one, each over the ground it actually covers.
//
// So each open-ground marking below comes in two halves: a component that
// draws the paint, and a function returning its raised props. `groundProps`
// at the bottom of this file is the one entry point for the second half.
export interface GroundProp {
  key: string;
  // The GROUND this prop covers, in grid coordinates: origin plus extent, the
  // same {col,row,w,h} shape a Placement uses, and what the map depth-sorts it
  // on (see depthSort.ts).
  //
  // An extent rather than a point, because several of these are not points. A
  // stand behind home plate, an outfield fence and a garden hedge each cover
  // real ground, and a prop that declares itself a point has to nominate ONE
  // spot to be sorted at — which is the same class of mistake as sorting a
  // building on its far corner, at a smaller scale. Anything genuinely
  // point-like (a tree) declares the tile it stands in, exactly as the
  // woodland on the map around it does.
  col: number;
  row: number;
  w: number;
  h: number;
  node: React.JSX.Element;
}

// The box a round prop covers, from its centre and radius — the shape a
// fountain, a medallion or a tree crown actually occupies on the ground.
function aroundPoint(cc: number, cr: number, radius: number): { col: number; row: number; w: number; h: number } {
  return { col: cc - radius, row: cr - radius, w: radius * 2, h: radius * 2 };
}

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
    </>
  );
}

// The diamond's raised props: the outfield fence, and the seating wrapping
// home plate. Both stand ON the field, so both sort against their
// surroundings individually rather than riding the plate's own depth — see
// groundProps at the bottom of this file.
function diamondProps(col: number, row: number, w: number, h: number): GroundProp[] {
  // The same geometry Diamond above is drawn from. Kept as one small block
  // rather than threaded through props, since every line of it is derived
  // from the footprint and nothing else.
  const hc = col + w * 0.70;
  const hr = row + h * 0.70;
  const R = Math.min(w, h) * 0.66;
  const from = Math.PI;
  const to = Math.PI * 1.5;
  const bisect = Math.PI * 1.25;
  const behind = bisect + Math.PI;
  const short = Math.min(w, h);
  const polar = (r: number, a: number): TilePt => [hc + r * Math.cos(a), hr + r * Math.sin(a)];

  const FENCE_H = 5;
  const arcPts = projectedArc(hc, hr, R, from, to, 36);

  // --- the seating -----------------------------------------------------
  // Five straight banks around home plate, not one continuous curve. The
  // first version wrapped 172 degrees of unbroken arc, and what it read as
  // was an amphitheatre — a shell behind the plate with concentric rings on
  // it, which is what an arc with no breaks in it looks like from above
  // whatever its section says. Every ballpark worth the name is built the
  // other way: separate banks, set at an angle to each other, with an aisle
  // between each pair. The gaps are the whole read.
  //
  // Straight banks also let each one use RakedStand, which is the same
  // wedge the stadium and the pitch bleachers are made of — so the seating
  // on this plot is now built out of the campus's one piece of seating
  // rather than a shape of its own.
  const SECTIONS = 5;
  const SWEEP = 2.5;        // radians of seating in all, a little over 140 degrees
  const AISLE = 0.14;       // radians of gangway between neighbouring banks
  const rIn = short * 0.1;
  const rOut = short * 0.28;
  const slice = SWEEP / SECTIONS;

  const stands: GroundProp[] = Array.from({ length: SECTIONS }, (_, k) => {
    const a0 = behind - SWEEP / 2 + k * slice + AISLE / 2;
    const a1 = a0 + slice - AISLE;
    // The bank behind the plate is the grandstand; the ones down the lines
    // are bleachers, and a ballpark's bleachers are both shallower and
    // lower. Uniform banks read as a fan of identical petals, which is the
    // arc's fault repeated five times rather than fixed.
    const deep = 1 - Math.abs(k - (SECTIONS - 1) / 2) * 0.16;
    const back = rIn + (rOut - rIn) * deep;
    const topH = 4 + 12 * deep;
    const corners: TilePt[] = [polar(rIn, a0), polar(rIn, a1), polar(back, a0), polar(back, a1)];
    const cols = corners.map((c) => c[0]);
    const rows = corners.map((c) => c[1]);
    return {
      key: `stand-${k}`,
      // Each bank sorts on the ground IT covers rather than on the plate's
      // depth or on one shared box, which is what lets a tree or a path
      // beside the third-base line pass in front of the bank nearest it and
      // behind the one further round.
      col: Math.min(...cols), row: Math.min(...rows),
      w: Math.max(...cols) - Math.min(...cols), h: Math.max(...rows) - Math.min(...rows),
      node: (
        <RakedStand
          outer={[corners[2], corners[3]]}
          inner={[corners[0], corners[1]]}
          bottomH={4}
          topH={topH}
          rakeFill={CONCRETE.rake}
          wallFill={CONCRETE.wall}
          seatStroke={CONCRETE.seat}
          rows={4}
          // Every bank in this sweep has its back toward the camera: the
          // outer edge of each is nearer than its inner one for the whole
          // of a sweep centred on `behind`, which is the direction the
          // camera looks from. Draw the other face instead and the bank
          // reads as a striped ramp lying in the grass.
          wall
        />
      ),
    };
  });

  return [
    {
      key: 'fence',
      // The fence rings the OUTFIELD — the quarter-disc of the plot away from
      // home plate — so the ground it covers is the box that arc sweeps.
      col: hc - R, row: hr - R, w: R, h: R,
      node: (
        <>
          <polygon className="ground-fence" points={polyPoints([...arcPts, ...[...arcPts].reverse().map((q) => lift(q, FENCE_H))])} />
          <polyline className="ground-fence-rail" fill="none" points={polyPoints(arcPts.map((q) => lift(q, FENCE_H)))} />
        </>
      ),
    },
    {
      key: 'backstop',
      // What tells you the banks behind it are facing a BALL FIELD: the
      // screen between the plate and the front row. Without it the seating
      // could be looking at anything, and the few feet of gap it stands in
      // read as the stands having been set back for no reason.
      ...aroundPoint(hc, hr, rIn),
      node: (() => {
        // Only behind the plate. Carried the full width of the seating it
        // read as a wall around the stands rather than as the screen a
        // foul ball comes off.
        const BACKSTOP = 1.3;
        const pts = projectedArc(hc, hr, rIn * 0.86, behind - BACKSTOP / 2, behind + BACKSTOP / 2, 24);
        const HEIGHT = 11;
        return (
          <>
            <polygon
              className="ground-backstop"
              points={polyPoints([...pts, ...[...pts].reverse().map((q) => lift(q, HEIGHT))])}
            />
            <polyline className="ground-fence-rail" fill="none" points={polyPoints(pts.map((q) => lift(q, HEIGHT)))} />
          </>
        );
      })(),
    },
    ...stands,
  ];
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

    </>
  );
}

// The pitch's one raised prop: the stand outside the track on the far side.
// Spanning the middle only, where the track's straight runs — and seated ON
// the track's edge rather than at a guessed offset, so shrinking or
// widening the oval cannot leave it floating in the margin.
function pitchProps(col: number, row: number, w: number, h: number): GroundProp[] {
  const landscape = w >= h;
  const across = landscape ? h : w;
  // The same half-width the oval above is drawn at, so the two cannot drift
  // apart — see Pitch's own `outerWid`.
  const outerWid = across * 0.375;
  const tp = (a: number, c: number): TilePt => (landscape
    ? [col + w * a, row + h * c]
    : [col + w * c, row + h * a]);
  const trackEdge = 0.5 - outerWid / across;   // the oval's far side, as a footprint fraction
  // The ground the stand covers: between its outer and inner edges, across
  // the middle third of the plot's long side.
  const back = tp(0.32, 0.02);
  const front = tp(0.68, trackEdge);
  return [{
    key: 'stand',
    col: Math.min(back[0], front[0]),
    row: Math.min(back[1], front[1]),
    w: Math.abs(front[0] - back[0]),
    h: Math.abs(front[1] - back[1]),
    node: (
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
    ),
  }];
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

// The quad's FLAT half: everything that is paint on the ground. The things
// that STAND on it — planting, hedges, the fountain, the monument — are not
// here; they are raised props, and they come out of quadProps below so the
// map can sort each of them against whatever else is nearby. See
// groundProps at the bottom of this file for why that split exists.
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

      {/* Beds down both sides of each walk. Earth and blooms both lie ON the
          ground, so unlike the hedges beside them they stay in this half. */}
      {gardens && (
        <>
          <FlowerBed col={col} row={row} w={w} h={h} u0={0.10} v0={0.38} u1={0.40} v1={0.44} />
          <FlowerBed col={col} row={row} w={w} h={h} u0={0.60} v0={0.38} u1={0.90} v1={0.44} />
          <FlowerBed col={col} row={row} w={w} h={h} u0={0.10} v0={0.56} u1={0.40} v1={0.62} />
          <FlowerBed col={col} row={row} w={w} h={h} u0={0.60} v0={0.56} u1={0.90} v1={0.62} />
        </>
      )}
    </>
  );
}

// The quad's RAISED half, one entry per standing object, each carrying the
// point it stands on so the map can depth-sort it individually.
function quadProps(col: number, row: number, w: number, h: number, tier: number): GroundProp[] {
  const gardens = tier >= 2;
  // A planting stands in one tile, like every tree in the woodland around the
  // quad — so it sorts against them on the same terms.
  const at = (u: number, v: number) => ({
    col: col + w * u - 0.5, row: row + h * v - 0.5, w: 1, h: 1,
  });

  const hedges: Array<[number, number, number, number]> = [
    [0.38, 0.10, 0.44, 0.32], [0.56, 0.10, 0.62, 0.32],
    [0.38, 0.68, 0.44, 0.90], [0.56, 0.68, 0.62, 0.90],
  ];

  return [
    ...(gardens
      ? hedges.map(([u0, v0, u1, v1], i) => ({
        key: `hedge-${i}`,
        // A hedge covers the whole bed it is clipped into, near edge to far.
        col: col + w * u0, row: row + h * v0, w: w * (u1 - u0), h: h * (v1 - v0),
        node: <Hedge col={col} row={row} w={w} h={h} u0={u0} v0={v0} u1={u1} v1={v1} />,
      }))
      : []),
    ...(gardens ? GARDEN_TREES : QUAD_TREES).map(([u, v, species, size], i) => ({
      key: `tree-${i}`,
      ...at(u, v),
      node: <TreeAt col={col + w * u} row={row + h * v} species={species} scale={size} />,
    })),
    gardens
      ? {
        key: 'fountain',
        // The same radius Fountain draws its kerb at, so the two cannot drift.
        ...aroundPoint(col + w * 0.5, row + h * 0.5, Math.min(w, h) * 0.20),
        node: <Fountain col={col} row={row} w={w} h={h} />,
      }
      // Tier 1's centre: a paved roundel where the walks meet, with a plinth
      // and a column standing on it. The roundel alone was there first and
      // was invisible — it is the same stone as the walks that run into it,
      // so on a lawn it read as a slight widening of the crossing and
      // nothing more. What the walks need at their meeting point is
      // something to be walking TO.
      : {
        key: 'monument',
        ...aroundPoint(col + w * 0.5, row + h * 0.5, Math.min(w, h) * 0.13),
        node: <Monument col={col} row={row} w={w} h={h} />,
      },
  ];
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

// ---------------------------------------------------------------------
// OPEN GROUND UNDER CONSTRUCTION — the state every marking above shares
// while it is being laid.
//
// The old comment in buildingMotifs.tsx said open ground had "no
// construction state worth drawing either, since there is nothing to
// raise", and drew the finished surface throughout. That reasoning is
// backwards: RISING MASS is how a building shows its progress, but it is
// not what makes construction legible. The absence of the finished surface
// is. A quad being laid was drawn complete — lawn, walks, fountain, trees —
// with a progress bar lying on top of it, which reads as a finished quad
// somebody has put a bar on rather than as a site.
//
// So a developing plate is graded earth inside a site hoarding, and nothing
// else: no markings, no planting, no furniture (see groundProps below,
// which returns an empty list while a plate is developing, so the trees and
// fountains that stand ON a quad do not arrive before the quad does). The
// progress bar along the front is drawn by CampusMap for every site alike.
// ---------------------------------------------------------------------

// A real site hoarding, near enough: high enough to stand in front of, low
// enough that it never reads as a wall somebody is building.
const HOARDING_H = up(2.1);

// How far in from the plot edge the hoarding stands. Off the boundary by a
// little so two adjacent sites do not draw their boards through each other.
const HOARDING_INSET = 0.08;

export function GroundSite({ col, row, w, h }: GroundProps) {
  // The grader's passes, as scrape lines running the LONG way across the
  // plot — which is the way a machine would actually work it. Counted from
  // the short span in tiles rather than fixed, so a 3x3 courts site and a
  // 20x11 field site both come out with passes about half a tile apart
  // instead of the small one looking ploughed and the large one swept.
  //
  // Each pass is short of the edges by a different amount. Evenly spaced
  // full-width lines are what a DECK looks like; ground that has been
  // worked reads as overlapping runs that stop short, which is the whole
  // difference between this and a plank floor. The offsets come off the
  // index rather than Math.random: a site that reshuffled its own scrapes
  // on every render would crawl.
  const alongW = w >= h;
  const passes = Math.max(3, Math.round((alongW ? h : w) * 1.8));
  const jitter = (i: number, salt: number) => ((Math.sin((i + 1) * 12.9898 + salt) * 43758.5453) % 1 + 1) % 1;

  const ic = col + w * HOARDING_INSET;
  const ir = row + h * HOARDING_INSET;
  const iw = w * (1 - HOARDING_INSET * 2);
  const ih = h * (1 - HOARDING_INSET * 2);
  const f = boxFaces(ic, ir, iw, ih, 0, HOARDING_H);

  // The two panels facing the camera are f.left and f.right; the two behind
  // are the same edges on the far side, and we see their inner faces. Each
  // takes the tone of the panel it runs parallel to, so the four boards
  // read as one enclosure rather than as four unrelated strips. Back before
  // front, so a near board covers the far one it crosses.
  const boards: Array<{ tone: string; pts: Pt[]; span: number }> = [
    { tone: 'a', pts: [f.A, f.B, f.Bt, f.At], span: iw },
    { tone: 'b', pts: [f.A, f.D, f.Dt, f.At], span: ih },
    { tone: 'a', pts: f.left, span: iw },
    { tone: 'b', pts: f.right, span: ih },
  ];

  return (
    <>
      <polygon className="ground-graded" points={polyPoints(boxFaces(col, row, w, h, 0, 0).top)} />
      {Array.from({ length: passes }, (_, i) => {
        const t = (i + 1) / (passes + 1);
        const a = 0.03 + jitter(i, 0) * 0.22;
        const b = 0.97 - jitter(i, 7) * 0.22;
        return (
          <line
            key={i}
            className="ground-graded-scrape"
            {...(alongW ? uvLine(col, row, w, h, a, t, b, t) : uvLine(col, row, w, h, t, a, t, b))}
          />
        );
      })}
      {boards.map(({ tone, pts, span }, i) => {
        // Posts every couple of tiles along the run. Without them the board
        // is a ribbon of flat colour; with them it is a hoarding somebody
        // erected, which is the difference this whole component is about.
        const posts = Math.max(1, Math.round(span / 2.5) - 1);
        return (
          <g key={i}>
            <polygon className={`site-hoarding-${tone}`} points={polyPoints(pts)} />
            {Array.from({ length: posts }, (_, j) => {
              const u = (j + 1) / (posts + 1);
              const foot = { x: pts[0].x + (pts[1].x - pts[0].x) * u, y: pts[0].y + (pts[1].y - pts[0].y) * u };
              return (
                <line
                  key={j}
                  className="site-hoarding-post"
                  x1={foot.x} y1={foot.y} x2={foot.x} y2={foot.y - HOARDING_H}
                />
              );
            })}
            {/* The capping rail along the top edge of each board, which is
                what stops a flat plate reading as a change of colour. */}
            <line className="site-hoarding-cap" x1={pts[3].x} y1={pts[3].y} x2={pts[2].x} y2={pts[2].y} />
          </g>
        );
      })}
    </>
  );
}

// Which marking each open-ground facility wears. The stadium's own field
// is a gridiron too — see StadiumField below, which the bowl motif draws
// inside its stands.
export default function GroundMarking({ facilityType, col, row, w, h, tier, developing }: GroundProps & {
  facilityType?: FacilityType;
  // The quad is the one open-ground facility with TIERS, and its two are
  // genuinely different places rather than the same lawn at two sizes (see
  // the quad block above). Nothing else here reads it.
  tier?: number;
  // Before the switch, not inside it: a site is a site whatever is going to
  // be on it when it is done, and the point of GroundSite is that every
  // open-ground facility shares one.
  developing?: boolean;
}) {
  if (developing) return <GroundSite col={col} row={row} w={w} h={h} />;
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

// The raised half of an open-ground facility: every prop standing on it,
// each with the point it stands on. Mirrors GroundMarking above exactly —
// same switch, same argument list, same `developing` shortcut ahead of it —
// so a facility can never have its paint drawn without its props, or vice
// versa. An empty list is the normal answer: a tennis court and a pool deck
// are paint all the way down.
export function groundProps(
  facilityType: FacilityType | undefined,
  col: number, row: number, w: number, h: number, tier?: number, developing?: boolean,
): GroundProp[] {
  // Nothing stands on a site yet. Without this a quad under construction
  // kept its full-grown trees, its fountain and its monument while the
  // ground under them was still being graded — the props are a separate
  // pass from the paint (see the note at the top of this file), so hiding
  // one half and not the other is exactly the mistake the mirroring is
  // meant to prevent.
  if (developing) return [];
  switch (facilityType) {
    case 'athleticsField': return pitchProps(col, row, w, h);
    case 'athleticsDiamond': return diamondProps(col, row, w, h);
    case 'quad': return quadProps(col, row, w, h, tier ?? 1);
    default: return [];
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
