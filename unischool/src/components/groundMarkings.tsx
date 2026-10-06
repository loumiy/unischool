import { useContext } from 'react';
import type { FacilityType } from '../state/types';
import { CrowdContext, VenueContext } from './mapOccasions';
import { boxFaces, heightScale, lift, polyPoints, project, projectedArc, projectedCircle, projectedStadium, type FaceDir, type Pt } from './isoProjection';
import { faceTone } from './light';
import { METRES_PER_TILE, up } from './campusScale';
import { shade } from './tint';
import { TreeAt, treeShadow, type Species } from './trees';
import { QUAD_WALK, quadCentre } from './quadGeometry';
import { lampArt } from './dressing';

// Open ground: the Buildables you walk across rather than into (quad, pool
// deck, courts, pitches, the stadium's field). They have no mass, so they are
// drawn flat on the grid with their markings projected at the same angle.
//
// Markings are authored in normalized footprint coordinates (u across, v
// down, both 0..1) and projected at draw time, so every footprint size comes
// out correctly proportioned. Color lives in styles.css; this file is geometry.

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
// Flat ground and the things standing on it (enforced by CampusMap.tsx's
// render). Flat ground has no height, so it never occludes anything: it is
// drawn in its own pass under every mass and needs no depth. What stands on
// it (planting, hedges, fountains, stands, fences) is a mass like any other
// and depth-sorts over the ground it covers.
//
// So each marking comes in two halves: a component that draws the paint, and
// a function returning its raised props. `groundProps` at the bottom of this
// file is the entry point for the second half.
export interface GroundProp {
  key: string;
  // A tree among the props, for the walkers to pass behind (Plan 62).
  tree?: { col: number; row: number; species: Species; scale: number };
  // The ground this prop covers, as {col,row,w,h} like a Placement: what the
  // map depth-sorts it on (depthSort.ts). An extent, not a point, because a
  // stand or a fence covers real ground; a tree declares the tile it stands in.
  col: number;
  row: number;
  w: number;
  h: number;
  node: React.JSX.Element;
  // Shadows the prop casts, as ground polygons, for CampusMap's shadow pass:
  // drawn with the prop, a shadow would land on anything painted before it,
  // including a building behind it.
  shadows?: Pt[][];
}

// The box a round prop (fountain, medallion, tree crown) covers on the ground.
function aroundPoint(cc: number, cr: number, radius: number): { col: number; row: number; w: number; h: number } {
  return { col: cc - radius, row: cr - radius, w: radius * 2, h: radius * 2 };
}

// ---------------------------------------------------------------------
// A raked stand, shared by every venue (the stadium is four around a
// gridiron; the pitch and ball field get small ones).
//
// A wedge, not a box: each row sits higher than the one in front, so the
// surface climbs away from the play. A box reads as a wall around a pitch.
//
// Colors are passed in: the stadium shades its stands from its own tint,
// the bleachers beside a pitch are plain concrete.
// ---------------------------------------------------------------------
export function RakedStand(props: RakedStandProps) {
  // A crowd on the treads in the weeks this stand's venue has a game
  // (mapOccasions.ts).
  const venue = useContext(VenueContext);
  return rakedStandArt(props, useContext(CrowdContext).has(venue ?? ''));
}
export type RakedStandProps = {
  outer: [TilePt, TilePt];   // the back edge, furthest from the field and highest
  inner: [TilePt, TilePt];   // the front edge, at the field and lowest
  bottomH: number; topH: number;
  rakeFill: string; wallFill: string; seatStroke: string;
  rows?: number;
  // Which vertical face the camera sees: a stand on the near side of a pitch
  // shows its outer back, one on the far side the face toward the field.
  // Drawing the wrong one leaves the stand with no mass. Which side is near
  // turns with the camera, so by default each follows it (`climbsAway`
  // below); pass one only to force it.
  wall?: boolean;
  frontWall?: boolean;
  // The two side profiles of the wedge, which say "raked seating" from any
  // angle; omitted only when both ends are buried in a neighboring bank.
  endFaces?: boolean;
  // Gangways cut down the rake, as dark slots. Zero for a bleacher.
  aisles?: number;
  // The rail along the back of the top row.
  rail?: boolean;
};
// The stand given whether its venue has a crowd this week: what the canvas
// map draws (canvasArt.ts).
export function rakedStandArt({
  outer, inner, bottomH, topH, rakeFill, wallFill, seatStroke, rows = 4, wall, frontWall,
  endFaces = true, aisles = 0, rail = true,
}: RakedStandProps, crowded: boolean): React.JSX.Element {
  const [o0, o1] = outer;
  const [i0, i1] = inner;
  const at = (t: TilePt, up: number) => lift(project(t[0], t[1]), up);
  const between = (a: TilePt, b: TilePt, f: number): TilePt => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];

  // Which edge is nearer the camera. Front edge nearer: the risers face the
  // camera and read as steps. Back edge nearer: only the back wall and tread
  // tops show, as when looking over a near stand into a bowl.
  const midO = project((o0[0] + o1[0]) / 2, (o0[1] + o1[1]) / 2);
  const midI = project((i0[0] + i1[0]) / 2, (i0[1] + i1[1]) / 2);
  const climbsAway = midI.y > midO.y;
  const backShows = wall ?? !climbsAway;
  const frontShows = frontWall ?? climbsAway;

  const tiers = Math.max(1, rows);
  const step = (topH - bottomH) / tiers;
  const tierTop = (k: number) => bottomH + step * (k + 1);
  const riserFill = shade(rakeFill, 0.72);
  const endFill = shade(wallFill, 0.9);

  // The side profile: stepped when the steps face the camera, a plain
  // trapezoid when they would be hidden behind the back wall.
  const profile = (i: TilePt, o: TilePt): Pt[] => {
    const pts: Pt[] = [at(i, 0), at(i, bottomH)];
    if (climbsAway) {
      for (let k = 0; k < tiers; k++) {
        pts.push(at(between(i, o, k / tiers), tierTop(k)));
        pts.push(at(between(i, o, (k + 1) / tiers), tierTop(k)));
      }
    } else {
      pts.push(at(o, topH));
    }
    pts.push(at(o, 0));
    return pts;
  };

  const treads: React.JSX.Element[] = [];
  if (climbsAway) {
    // Back to front: top tier first, each lower one painting over the foot of
    // the riser behind. Tread k sits between the k/tiers and (k+1)/tiers
    // lines; its riser stands on the front line from the tread below up to it.
    for (let k = tiers - 1; k >= 0; k--) {
      const f0 = k / tiers; const f1 = (k + 1) / tiers;
      const z = tierTop(k); const zPrev = k === 0 ? bottomH : tierTop(k - 1);
      const a0 = between(i0, o0, f0); const a1 = between(i1, o1, f0);
      const b0 = between(i0, o0, f1); const b1 = between(i1, o1, f1);
      treads.push(
        <g key={k}>
          <polygon points={polyPoints([at(a0, zPrev), at(a1, zPrev), at(a1, z), at(a0, z)])} fill={riserFill} />
          <polygon points={polyPoints([at(a0, z), at(a1, z), at(b1, z), at(b0, z)])} fill={rakeFill} />
        </g>,
      );
    }
  } else {
    // Seen from behind: the rake as one surface, with tier edges as bands.
    treads.push(
      <polygon key="rake" points={polyPoints([at(o0, topH), at(o1, topH), at(i1, bottomH), at(i0, bottomH)])} fill={rakeFill} />,
    );
    for (let k = 1; k < tiers; k++) {
      const f = k / tiers;
      const z = tierTop(k - 1);
      const a0 = between(i0, o0, f); const a1 = between(i1, o1, f);
      const c0 = between(i0, o0, f + 0.22 / tiers); const c1 = between(i1, o1, f + 0.22 / tiers);
      treads.push(
        <polygon key={k} points={polyPoints([at(a0, z), at(a1, z), at(c1, z + step * 0.22), at(c0, z + step * 0.22)])} fill={riserFill} />,
      );
    }
  }

  // Gangways: dark slots down the rake, from the front row to the back.
  const slots: React.JSX.Element[] = [];
  for (let j = 0; j < aisles; j++) {
    const u = (j + 1) / (aisles + 1);
    const half = 0.018;
    const fa = between(i0, i1, u - half); const fb = between(i0, i1, u + half);
    const ba = between(o0, o1, u - half); const bb = between(o0, o1, u + half);
    slots.push(
      <polygon key={j} className="stand-aisle" points={polyPoints([at(fa, bottomH), at(fb, bottomH), at(bb, topH), at(ba, topH)])} />,
    );
  }

  return (
    <>
      {endFaces && <polygon points={polyPoints(profile(i0, o0))} fill={endFill} />}
      {endFaces && <polygon points={polyPoints(profile(i1, o1))} fill={endFill} />}
      {backShows && (
        <polygon points={polyPoints([at(o0, 0), at(o1, 0), at(o1, topH), at(o0, topH)])} fill={wallFill} />
      )}
      {frontShows && (
        <polygon points={polyPoints([at(i0, 0), at(i1, 0), at(i1, bottomH), at(i0, bottomH)])} fill={wallFill} />
      )}
      {treads}
      {crowded && <Crowd outer={outer} inner={inner} bottomH={bottomH} topH={topH} rows={Math.max(1, rows)} />}
      {slots}
      {rail && (
        <line className="stand-rail" x1={at(o0, topH).x} y1={at(o0, topH).y} x2={at(o1, topH).x} y2={at(o1, topH).y} />
      )}
      {void seatStroke}
    </>
  );
}

// Spectators: a row of heads and shoulders along the middle of each tread.
const CROWD_COLOURS = ['#c94b4b', '#3d6a9c', '#e0b64a', '#f2ede2', '#5b8a5b', '#8c5a9c'];
function Crowd({ outer, inner, bottomH, topH, rows }: {
  outer: [TilePt, TilePt]; inner: [TilePt, TilePt]; bottomH: number; topH: number; rows: number;
}) {
  const at = (t: TilePt, up: number) => lift(project(t[0], t[1]), up);
  const between = (a: TilePt, b: TilePt, f: number): TilePt => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  const step = (topH - bottomH) / rows;
  const dots: React.JSX.Element[] = [];
  for (let k = 0; k < rows; k++) {
    const f = (k + 0.5) / rows;
    const a = between(inner[0], outer[0], f);
    const b = between(inner[1], outer[1], f);
    const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2.2));
    for (let i = 0; i < n; i++) {
      const p = at(between(a, b, (i + 0.5 + (k % 2) * 0.35) / n), bottomH + step * (k + 1) + 1.6);
      dots.push(<circle key={`${k}-${i}`} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={1.4} fill={CROWD_COLOURS[(i * 7 + k * 3) % CROWD_COLOURS.length]} />);
    }
  }
  return <g className="stand-crowd">{dots}</g>;
}

// Plain concrete, for the bleachers that are not part of a tinted building.
const CONCRETE = { rake: '#cfc7b4', wall: '#b3ab99', seat: 'rgba(60, 54, 42, 0.35)' };

// ---------------------------------------------------------------------
// A mesh fence around a plot (courts, pool deck, backstop): a translucent
// band with posts and a top rail, what stops a slab of court reading as paint.
// ---------------------------------------------------------------------
function FenceRun({ a, b, height, postEvery = 2 }: { a: TilePt; b: TilePt; height: number; postEvery?: number }) {
  const at = (t: TilePt, up: number) => lift(project(t[0], t[1]), up);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const posts = Math.max(1, Math.round(len / postEvery));
  return (
    <>
      <polygon className="ground-fence-mesh" points={polyPoints([at(a, 0), at(b, 0), at(b, height), at(a, height)])} />
      {Array.from({ length: posts + 1 }, (_, i) => {
        const f = i / posts;
        const t: TilePt = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
        return <line key={i} className="ground-fence-post" x1={at(t, 0).x} y1={at(t, 0).y} x2={at(t, height).x} y2={at(t, height).y} />;
      })}
      <line className="ground-fence-rail" x1={at(a, height).x} y1={at(a, height).y} x2={at(b, height).x} y2={at(b, height).y} />
    </>
  );
}

// The whole perimeter of a rectangle of ground, far sides first so the
// near sides paint over them.
function FenceAround({ col, row, w, h, height }: GroundProps & { height: number }) {
  const A: TilePt = [col, row]; const B: TilePt = [col + w, row];
  const C: TilePt = [col + w, row + h]; const D: TilePt = [col, row + h];
  return (
    <>
      <FenceRun a={A} b={B} height={height} />
      <FenceRun a={A} b={D} height={height} />
      <FenceRun a={D} b={C} height={height} />
      <FenceRun a={B} b={C} height={height} />
    </>
  );
}

// A plain box standing on open ground, in the concrete tones: a dugout, a
// pool house, a scoreboard's housing.
function GroundBox({ col, row, w, h, base = 0, height, side, front, top }: GroundProps & {
  base?: number; height: number; side: string; front: string; top: string;
}) {
  const f = boxFaces(col, row, w, h, base, height);
  // `front` is the +row face's tone and `side` the +col face's; the other
  // two come from light.ts's faceTone when the camera turns them into view.
  return (
    <>
      <polygon points={polyPoints(f.left)} fill={faceTone(f.dir.CD, front, side)} />
      <polygon points={polyPoints(f.right)} fill={faceTone(f.dir.BC, front, side)} />
      <polygon points={polyPoints(f.top)} fill={top} />
    </>
  );
}

// A post standing on the ground: a floodlight mast, a foul pole, a canopy
// column. Screen-space line, like a tree's trunk.
function Post({ at: t, from = 0, to, className }: { at: TilePt; from?: number; to: number; className: string }) {
  const foot = lift(project(t[0], t[1]), from);
  const head = lift(project(t[0], t[1]), to);
  return <line className={className} x1={foot.x} y1={foot.y} x2={head.x} y2={head.y} />;
}

// ---------------------------------------------------------------------
// Gridiron: the yard lines and hash marks are the recognition. Drawn along
// the footprint's longer axis so a rotated stadium's lines run the right way.
// ---------------------------------------------------------------------
function Gridiron({ col, row, w, h, inset = 0, insetAcross = inset, posts = false }: GroundProps & {
  inset?: number; insetAcross?: number; posts?: boolean;
}) {
  const landscape = w >= h;
  // Work in (along, across) and map to (u, v) at the end, so the same
  // numbers describe the field whichever way round the footprint sits.
  const A = (a: number, c: number): [number, number] => (landscape ? [a, c] : [c, a]);
  const at = (a: number, c: number): [number, number] => A(inset + a * (1 - inset * 2), insetAcross + c * (1 - insetAcross * 2));

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
      {/* Hash marks: two rows of short ticks between the yard lines, what
          reads as gridiron rather than soccer. */}
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
      {/* The midfield roundel: a darker disc where a real field carries its
          crest. */}
      {(() => {
        const c = at(0.5, 0.5);
        return (
          <polygon
            className="ground-endzone"
            points={polyPoints(projectedCircle(col + w * c[0], row + h * c[1], Math.min(w, h) * 0.05, 24))}
          />
        );
      })()}
      {/* Goalposts on both goal lines: a stem, a crossbar and two uprights,
          in screen space like anything else that stands up. */}
      {posts && [END_ZONE * 0.5, 1 - END_ZONE * 0.5].map((a, i) => {
        const g = (c: number) => { const p = at(a, c); return project(col + w * p[0], row + h * p[1]); };
        const bar = up(3.0); const top = up(9.0); const half = 0.045;
        const c0 = g(0.5); const l = g(0.5 - half); const r = g(0.5 + half);
        return (
          <g key={`gp${i}`}>
            <line className="ground-goal" x1={c0.x} y1={c0.y} x2={c0.x} y2={lift(c0, bar).y} />
            <line className="ground-goal" x1={l.x} y1={lift(l, bar).y} x2={r.x} y2={lift(r, bar).y} />
            <line className="ground-goal" x1={l.x} y1={lift(l, bar).y} x2={l.x} y2={lift(l, top).y} />
            <line className="ground-goal" x1={r.x} y1={lift(r, bar).y} x2={r.x} y2={lift(r, top).y} />
          </g>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------
// Ball diamond: a quarter circle, home plate at one corner, foul lines 90
// degrees apart, with a wedge of infield dirt around the bases.
// ---------------------------------------------------------------------
function Diamond({ col, row, w, h }: GroundProps) {
  // Home plate sits well back from the footprint's front corner: the
  // grandstand wrapping the plate and running down both lines takes a third
  // of the plot.
  const g = diamondGeometry(col, row, w, h);
  const { hc, hr, R, TRACK, DIRT, BASE, from, to, bisect, short } = g;
  const home = project(hc, hr);
  const polar = (r: number, a: number) => project(hc + r * Math.cos(a), hr + r * Math.sin(a));

  // The base path and the turf inside it: a real infield's skin runs around
  // the bases, not a solid wedge.
  const basePath = [home, polar(BASE, from), polar(BASE * Math.SQRT2, bisect), polar(BASE, to)];
  const infieldGrass = [
    polar(BASE * 0.34, bisect), polar(BASE * 0.72, from), polar(BASE * 1.06, bisect), polar(BASE * 0.72, to),
  ];
  // A base is a small square on the ground; home plate a slightly larger one.
  const pad = (r: number, a: number, size: number) => {
    const c = hc + r * Math.cos(a); const rr = hr + r * Math.sin(a);
    return polyPoints(boxFaces(c - size / 2, rr - size / 2, size, size, 0, 0).top);
  };
  // Bases a little over life size, so they read without crowding the paths.
  const base = short * 0.02;

  return (
    <>
      <polygon className="ground-turf" points={polyPoints([home, ...projectedArc(hc, hr, R, from, to), home])} />
      {/* Mowing arcs across the outfield, like the quad's lawn. */}
      {[0, 1, 2].map((i) => {
        const r0 = DIRT * 1.25 + (TRACK - DIRT * 1.25) * ((2 * i + 1) / 6);
        const r1 = DIRT * 1.25 + (TRACK - DIRT * 1.25) * ((2 * i + 2) / 6);
        return (
          <polygon
            key={i}
            className="ground-mow"
            points={polyPoints([...projectedArc(hc, hr, r1, from, to, 36), ...projectedArc(hc, hr, r0, to, from, 36)])}
          />
        );
      })}
      {/* The warning track: a band of dirt inside the fence, between the
          boundary arc and one just inside it. */}
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
      {/* The mound, at its real size (about 5.5 m across on a 125 m field). */}
      <polygon className="ground-dirt-pale" points={polyPoints(projectedCircle(
        hc + BASE * 0.62 * Math.cos(bisect), hr + BASE * 0.62 * Math.sin(bisect), short * 0.028, 20,
      ))} />
      {/* Three bases and the plate. */}
      <polygon className="ground-base" points={pad(BASE, from, base)} />
      <polygon className="ground-base" points={pad(BASE, to, base)} />
      <polygon className="ground-base" points={pad(BASE * Math.SQRT2, bisect, base)} />
      <polygon className="ground-base" points={pad(0, 0, base * 1.2)} />
      {/* Batter's boxes either side of the plate. */}
      {[from, to].map((a, i) => (
        <polygon
          key={`bb${i}`}
          className="ground-line-fine"
          fill="none"
          points={pad(base * 1.6, a, base * 1.3)}
        />
      ))}
      {[from, to].map((a, i) => {
        const end = polar(R, a);
        return <line key={i} className="ground-line" x1={home.x} y1={home.y} x2={end.x} y2={end.y} />;
      })}
    </>
  );
}

// The geometry Diamond and diamondProps share, so the paint and the things
// standing on it cannot drift apart.
function diamondGeometry(col: number, row: number, w: number, h: number) {
  const short = Math.min(w, h);
  return {
    short,
    hc: col + w * 0.66,
    hr: row + h * 0.66,
    R: short * 0.66,                 // outfield boundary
    TRACK: short * 0.66 * 0.87,      // inner edge of the warning track
    DIRT: short * 0.30,              // the infield skin
    BASE: short * 0.19,              // home-to-base
    from: Math.PI,                   // foul line toward -col
    to: Math.PI * 1.5,               // foul line toward -row
    bisect: Math.PI * 1.25,          // toward the outfield's centre
  };
}

// The diamond's raised props: the outfield fence and the seating around home
// plate, each sorted individually (see groundProps).
function diamondProps(col: number, row: number, w: number, h: number, stage: number): GroundProp[] {
  const { hc, hr, R, from, to, bisect, short } = diamondGeometry(col, row, w, h);
  const polar = (r: number, a: number): TilePt => [hc + r * Math.cos(a), hr + r * Math.sin(a)];

  const FENCE_H = up(2.4);
  const arcPts = projectedArc(hc, hr, R, from, to, 36);

  // --- the seating -----------------------------------------------------
  // One horseshoe in three straight pieces: a grandstand behind the plate,
  // square to the bisector, and a wing down each foul line to the bases, all
  // one depth and height, on a low field wall, with a press box over the
  // middle (modeled on a college ballpark such as Holman Stadium). Three
  // props because the depth sort needs them apart: a tree beside the
  // third-base line passes in front of that wing and behind the plate stand
  // (depth-sort.test.ts). The wings follow the grid axes.
  const gap = 0.35;                     // the walkway between the line and the front row
  const depth = short * 0.13;           // how deep the seating is
  const s0 = 0.55;                      // where the wings start, out from the plate
  const L = short * 0.30;               // and how far down the lines they run
  const bottomH = up(1.0);
  const topH = up(6.2);
  const at = (t: TilePt, z: number) => lift(project(t[0], t[1]), z);
  // The seating stands this far back from the plate along the bisector
  // (Plan 61: the plate stand's front edge ran in front of home), which
  // also leaves room for the dugouts between the lines and the wings.
  const BACK = 0.6;
  const sc = hc + BACK; const sr = hr + BACK;

  // The wing down the -row line (first base): its inside face is toward -col.
  const wingA = {
    inner: [[sc + gap, sr - L], [sc + gap, sr - s0]] as [TilePt, TilePt],
    outer: [[sc + gap + depth, sr - L], [sc + gap + depth, sr - s0]] as [TilePt, TilePt],
  };
  // The wing down the -col line (third base): its inside face is toward -row.
  const wingB = {
    inner: [[sc - s0, sr + gap], [sc - L, sr + gap]] as [TilePt, TilePt],
    outer: [[sc - s0, sr + gap + depth], [sc - L, sr + gap + depth]] as [TilePt, TilePt],
  };
  // The grandstand behind the plate joins the two wings' near ends, square
  // to the bisector, with its outer edge running corner to corner.
  const plate = {
    inner: [[sc + gap, sr - s0], [sc - s0, sr + gap]] as [TilePt, TilePt],
    outer: [[sc + gap + depth, sr - s0], [sc - s0, sr + gap + depth]] as [TilePt, TilePt],
  };
  const boxOf = (pts: TilePt[]) => {
    const cols = pts.map((c) => c[0]); const rows = pts.map((c) => c[1]);
    return { col: Math.min(...cols), row: Math.min(...rows), w: Math.max(...cols) - Math.min(...cols), h: Math.max(...rows) - Math.min(...rows) };
  };
  const bank = (key: string, g: { inner: [TilePt, TilePt]; outer: [TilePt, TilePt] }, aisles: number, extra?: React.JSX.Element) => ({
    key,
    ...boxOf([...g.inner, ...g.outer]),
    node: (
      <>
        <RakedStand outer={g.outer} inner={g.inner} bottomH={bottomH} topH={topH}
          rakeFill={CONCRETE.rake} wallFill={CONCRETE.wall} seatStroke={CONCRETE.seat}
          rows={7} aisles={aisles} endFaces />
        {extra}
      </>
    ),
  });

  // The cover and press box over the plate stand: a slab on four posts over
  // the back half of the seating, with the box's dark glazing band under it.
  const cover = (() => {
    const mid = 0.5;
    const f0: TilePt = [plate.inner[0][0] + (plate.outer[0][0] - plate.inner[0][0]) * mid, plate.inner[0][1] + (plate.outer[0][1] - plate.inner[0][1]) * mid];
    const f1: TilePt = [plate.inner[1][0] + (plate.outer[1][0] - plate.inner[1][0]) * mid, plate.inner[1][1] + (plate.outer[1][1] - plate.inner[1][1]) * mid];
    const [b0, b1] = plate.outer;
    const slabZ = topH + up(3.0); const slab = up(0.35);
    const seatZ = bottomH + (topH - bottomH) * mid;
    return (
      <>
        <Post at={b0} from={topH} to={slabZ} className="ground-post" />
        <Post at={b1} from={topH} to={slabZ} className="ground-post" />
        <Post at={f0} from={seatZ} to={slabZ} className="ground-post" />
        <Post at={f1} from={seatZ} to={slabZ} className="ground-post" />
        <polygon points={polyPoints([at(b0, topH), at(b1, topH), at(b1, slabZ), at(b0, slabZ)])} fill={CONCRETE.wall} />
        <polygon className="ground-glazing" points={polyPoints([at(b0, topH + up(1.0)), at(b1, topH + up(1.0)), at(b1, slabZ - up(0.5)), at(b0, slabZ - up(0.5))])} />
        <polygon points={polyPoints([at(f0, slabZ), at(f1, slabZ), at(b1, slabZ), at(b0, slabZ)])} fill={shade(CONCRETE.rake, 1.04)} />
        <polygon points={polyPoints([at(f0, slabZ), at(f1, slabZ), at(f1, slabZ + slab), at(f0, slabZ + slab)])} fill={shade(CONCRETE.wall, 0.9)} />
        <polygon points={polyPoints([at(f0, slabZ + slab), at(f1, slabZ + slab), at(b1, slabZ + slab), at(b0, slabZ + slab)])} fill={shade(CONCRETE.rake, 1.08)} />
      </>
    );
  })();

  const stands: GroundProp[] = [
    bank('stand-0', wingA, 2),
    bank('stand-1', plate, 1, cover),
    bank('stand-2', wingB, 2),
  ];

  // Light towers: two behind the plate stand's corners, one at the end of
  // each wing, two at the outfield fence.
  const towers: GroundProp[] = ([
    [sc + gap + depth + 0.5, sr - s0 - 0.3], [sc - s0 - 0.3, sr + gap + depth + 0.5],
    [sc + gap + depth + 0.4, sr - L - 0.4], [sc - L - 0.4, sr + gap + depth + 0.4],
    polar(R + 0.3, from + 0.32), polar(R + 0.3, to - 0.32),
  ] as TilePt[]).map((t, i) => ({
    key: `tower-${i}`,
    ...aroundPoint(t[0], t[1], 0.2),
    node: (() => {
      const foot = project(t[0], t[1]); const top = lift(foot, up(16));
      // The lamp bank stands up, so its depth foreshortens with the tilt.
      const hs = heightScale();
      return (
        <>
          <line className="ground-mast" x1={foot.x} y1={foot.y} x2={top.x} y2={top.y} />
          <polygon className="ground-mast-head" points={polyPoints([
            { x: top.x - 7, y: top.y + hs }, { x: top.x + 7, y: top.y + hs }, { x: top.x + 7, y: top.y - 4 * hs }, { x: top.x - 7, y: top.y - 4 * hs },
          ])} />
        </>
      );
    })(),
  }));

  // --- the dugouts -----------------------------------------------------
  // Two low covered benches between each foul line and its wing, running
  // from near the plate toward the base, square to the line (Plan 61: they
  // stood out past the wings like stray blocks).
  const dugout = (a: number, k: number): GroundProp => {
    const { BASE } = diamondGeometry(col, row, w, h);
    const off = 0.2; const deep = 0.42;
    const r0 = BASE * 0.3; const r1 = BASE * 0.8;
    const cx = a === from ? hc - r1 : hc + off;
    const cy = a === from ? hr + off : hr - r1;
    const bw = a === from ? r1 - r0 : deep;
    const bh = a === from ? deep : r1 - r0;
    return {
      key: `dugout-${k}`,
      col: cx, row: cy, w: bw, h: bh,
      node: <GroundBox col={cx} row={cy} w={bw} h={bh} height={up(1.4)} side={shade(CONCRETE.wall, 0.86)} front={CONCRETE.wall} top={shade(CONCRETE.rake, 0.92)} />,
    };
  };

  // --- center field ----------------------------------------------------
  // The batter's eye, a dark stretch of the fence at dead center, and the
  // scoreboard standing behind it, both square to the bisector so they sit
  // on the arc (Plan 61: grid-aligned boxes stood askew to it).
  const centreField = (() => {
    const c = polar(R, bisect);
    const eye = projectedArc(hc, hr, R, bisect - 0.11, bisect + 0.11, 8);
    const EYE_H = up(4.2);
    // The tangent at dead center, and the board's feet either side of it.
    const tx = -Math.sin(bisect); const ty = Math.cos(bisect);
    const back = polar(R + 0.7, bisect);
    const half = 0.75;
    const p0: TilePt = [back[0] + tx * half, back[1] + ty * half];
    const p1: TilePt = [back[0] - tx * half, back[1] - ty * half];
    const boardBase = up(3.4); const boardH = up(3.0);
    const at = (t: TilePt, z: number) => lift(project(t[0], t[1]), z);
    return {
      key: 'centrefield',
      ...aroundPoint(c[0], c[1], 1.1),
      node: (
        <>
          {/* The batter's eye is a painted wall: it keeps its green all year. */}
          <polygon fill="#2f472f" points={polyPoints([...eye, ...[...eye].reverse().map((q) => lift(q, EYE_H))])} />
          <Post at={p0} to={boardBase} className="ground-post" />
          <Post at={p1} to={boardBase} className="ground-post" />
          <polygon fill="#33363a" stroke="#222" strokeWidth={0.4} points={polyPoints([
            at(p0, boardBase), at(p1, boardBase), at(p1, boardBase + boardH), at(p0, boardBase + boardH),
          ])} />
          <polygon className="ground-scoreboard-face" points={polyPoints([
            at(p0, boardBase + boardH * 0.25), at(p1, boardBase + boardH * 0.25),
            at(p1, boardBase + boardH * 0.75), at(p0, boardBase + boardH * 0.75),
          ])} />
        </>
      ),
    };
  })();

  return [
    {
      key: 'fence',
      // The fence rings the outfield, so the ground it covers is the box the
      // arc sweeps.
      col: hc - R, row: hr - R, w: R, h: R,
      node: (
        <>
          <polygon className="ground-fence" points={polyPoints([...arcPts, ...[...arcPts].reverse().map((q) => lift(q, FENCE_H))])} />
          <polyline className="ground-fence-rail" fill="none" points={polyPoints(arcPts.map((q) => lift(q, FENCE_H)))} />
          {/* Foul poles at the two ends of the fence, in yellow. */}
          <Post at={polar(R, from)} to={up(7)} className="ground-foul-pole" />
          <Post at={polar(R, to)} to={up(7)} className="ground-foul-pole" />
        </>
      ),
    },
    centreField,
    {
      key: 'backstop',
      // The screen between the plate and the front row of the grandstand:
      // a mesh along the plate stand's inner edge, a story and a half high.
      ...boxOf([...plate.inner]),
      node: (
        <>
          <FenceRun a={plate.inner[0]} b={plate.inner[1]} height={up(5.0)} postEvery={1.2} />
        </>
      ),
    },
    dugout(from, 0),
    dugout(to, 1),
    // The seating by stage (Plan 54): none on the diamond alone, the plate
    // stand on the first expansion, the covered horseshoe and its lights
    // on the second.
    ...(stage >= 2 ? towers : []),
    ...(stage >= 2 ? stands : stage === 1 ? [bank('stand-1', plate, 1)] : []),
  ];
}

// A soccer pitch: center circle, halfway line, and the two penalty areas
// that stop it being "a field with a circle on it".
// The number of running lanes: eight, the competition standard.
const TRACK_LANES = 8;

// Where the oval's center sits across the plot: pushed toward the near side
// so the stand has a margin down the far straight. A fraction of the plot's
// short side, shared with pitchProps so the stand sits on the track's edge.
const TRACK_CENTRE_ACROSS = 0.54;

function pitchGeometry(col: number, row: number, w: number, h: number) {
  const landscape = w >= h;
  const along = landscape ? w : h;    // the footprint side the track's long axis runs down
  const across = landscape ? h : w;
  const cc = landscape ? col + w * 0.5 : col + w * TRACK_CENTRE_ACROSS;
  const cr = landscape ? row + h * TRACK_CENTRE_ACROSS : row + h * 0.5;
  // A track is a stadium shape, not an ellipse: two straights joined by
  // semicircular ends. It fills the plot so the pitch inside can be near its
  // real 105 by 68 m.
  const outerLen = along * 0.445;
  const outerWid = across * 0.39;
  const trackWidth = Math.min(across * 0.1, 8 * 1.22 / METRES_PER_TILE);   // eight 1.22 m lanes
  const innerLen = outerLen - trackWidth;
  const innerWid = outerWid - trackWidth;
  // The pitch inside, at its real size where the infield allows it, and
  // never wider than the infield.
  const PITCH_RATIO = 110 / 68;                                         // a long pitch, within the laws
  const pitchWid = Math.min(innerWid * 0.96, (68 / METRES_PER_TILE) / 2);
  const pitchLen = Math.min(pitchWid * PITCH_RATIO, innerLen * 0.97);
  // (along, across) offsets from the center onto the grid.
  const tp = (a: number, c: number): Pt => (landscape ? project(cc + a, cr + c) : project(cc + c, cr + a));
  const tile = (a: number, c: number): TilePt => (landscape ? [cc + a, cr + c] : [cc + c, cr + a]);
  return { landscape, cc, cr, along, across, outerLen, outerWid, trackWidth, innerLen, innerWid, pitchWid, pitchLen, tp, tile };
}

function Pitch({ col, row, w, h }: GroundProps) {
  const g = pitchGeometry(col, row, w, h);
  const { landscape, cc, cr, outerLen, outerWid, trackWidth, innerLen, innerWid, pitchWid, pitchLen, tp } = g;

  const stadium = (fraction: number) => projectedStadium(
    cc, cr,
    innerLen + (outerLen - innerLen) * fraction,
    innerWid + (outerWid - innerWid) * fraction,
    landscape,
  );

  // Markings are laid out in the pitch's own (along, across) frame, so a
  // rotated field keeps its halfway line across the short way.
  const pp = (a: number, c: number): Pt => tp(a * pitchLen, c * pitchWid);
  const rect = (a0: number, a1: number, c0: number, c1: number) =>
    polyPoints([pp(a0, c0), pp(a1, c0), pp(a1, c1), pp(a0, c1)]);
  const seg = (a0: number, c0: number, a1: number, c1: number) => {
    const p0 = pp(a0, c0); const p1 = pp(a1, c1);
    return { x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y };
  };
  const tseg = (a0: number, c0: number, a1: number, c1: number) => {
    const p0 = tp(a0, c0); const p1 = tp(a1, c1);
    return { x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y };
  };

  const STRIPES = 10;
  const straight = outerLen - outerWid;      // half the length of a straight
  const lane = trackWidth / TRACK_LANES;

  return (
    <>
      {/* The running surface in two tones (outer four lanes darker, as a laid
          track reads from above), then the lane lines. The infield inside the
          innermost lane is paler: the D-zones and the strips beside the pitch. */}
      <polygon className="ground-track" points={polyPoints(stadium(1))} />
      <polygon className="ground-track-inner" points={polyPoints(stadium(0.5))} />
      <polygon className="ground-dzone" points={polyPoints(stadium(0))} />
      {Array.from({ length: TRACK_LANES + 1 }, (_, i) => (
        <polygon
          key={i}
          className="ground-lane"
          fill="none"
          points={polyPoints(stadium(i / TRACK_LANES))}
        />
      ))}
      {/* The finish line across all eight lanes at the end of the home
          straight, and the staggered starts behind it round the bend. */}
      <line className="ground-line-heavy" {...tseg(straight * 0.62, innerWid, straight * 0.62, outerWid)} />
      {Array.from({ length: TRACK_LANES }, (_, i) => {
        const c = innerWid + lane * (i + 0.5);
        const a = -straight * 0.45 + i * lane * 0.9;
        return <line key={`st${i}`} className="ground-line-fine" {...tseg(a, c - lane * 0.4, a, c + lane * 0.4)} />;
      })}
      {/* A long-jump runway and its pit in one D-zone. */}
      {(() => {
        const rc = innerWid * 0.5;           // off the center line, clear of the goal
        const a0 = -innerLen * 0.9; const a1 = -pitchLen * 1.04;
        return (
          <>
            <polygon
              className="ground-runway"
              points={polyPoints([tp(a0, rc - lane * 0.45), tp(a1, rc - lane * 0.45), tp(a1, rc + lane * 0.45), tp(a0, rc + lane * 0.45)])}
            />
            <polygon
              className="ground-dirt-pale"
              points={polyPoints([tp(a0, rc - lane * 0.9), tp(a0 - lane * 2.4, rc - lane * 0.9), tp(a0 - lane * 2.4, rc + lane * 0.9), tp(a0, rc + lane * 0.9)])}
            />
          </>
        );
      })()}

      {/* The pitch, with mowing stripes. */}
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
      {/* Goals: two posts and a crossbar at each end, standing up. */}
      {[-1, 1].map((end) => {
        const l = pp(end, -0.108); const r = pp(end, 0.108); const bar = up(2.4);
        return (
          <g key={`goal${end}`}>
            <line className="ground-goal" x1={l.x} y1={l.y} x2={l.x} y2={lift(l, bar).y} />
            <line className="ground-goal" x1={r.x} y1={r.y} x2={r.x} y2={lift(r, bar).y} />
            <line className="ground-goal" x1={l.x} y1={lift(l, bar).y} x2={r.x} y2={lift(r, bar).y} />
          </g>
        );
      })}
    </>
  );
}

// The pitch's one raised prop: the stand outside the track on the far side,
// spanning the straight and seated on the track's edge so resizing the oval
// cannot leave it floating. Raked seating on a low plinth, with a cover over
// the back rows on four posts.
function pitchProps(col: number, row: number, w: number, h: number, stage: number): GroundProp[] {
  // The field alone until the first expansion (Plan 54).
  if (stage <= 0) return [];
  const landscape = w >= h;
  const across = landscape ? h : w;
  const { outerWid } = pitchGeometry(col, row, w, h);
  const tp = (a: number, c: number): TilePt => (landscape
    ? [col + w * a, row + h * c]
    : [col + w * c, row + h * a]);
  const trackEdge = TRACK_CENTRE_ACROSS - outerWid / across;   // the oval's far side, as a footprint fraction
  // The grandstand's run along the straight (Plan 61: longer, one stand).
  const S0 = 0.24; const S1 = 0.76;
  const back = tp(S0, 0.02);
  const front = tp(S1, trackEdge);
  const bottomH = up(0.9);
  const topH = up(4.6);
  const at = (t: TilePt, z: number) => lift(project(t[0], t[1]), z);
  // The cover: over the back 55% of the seating.
  const mid = 0.02 + (trackEdge - 0.02) * 0.45;
  const f0 = tp(S0 + 0.02, mid); const f1 = tp(S1 - 0.02, mid);
  const b0 = tp(S0 + 0.02, 0.02); const b1 = tp(S1 - 0.02, 0.02);
  const slabZ = topH + up(3.2); const slab = up(0.35);
  const seatZ = bottomH + (topH - bottomH) * 0.55;
  // A low open bleacher, the first expansion's; on the second it becomes a
  // longer covered grandstand, with a scoreboard standing in the far corner
  // (Plan 61: the second expansion's bleacher across the field sat on the
  // track).
  const bleacher = (key: string, near: number, far: number): GroundProp => {
    const o0 = tp(0.36, near); const o1 = tp(0.64, near);
    const i0 = tp(0.36, far); const i1 = tp(0.64, far);
    return {
      key,
      col: Math.min(o0[0], i1[0]), row: Math.min(o0[1], i1[1]),
      w: Math.abs(i1[0] - o0[0]), h: Math.abs(i1[1] - o0[1]),
      node: (
        <RakedStand outer={[o0, o1]} inner={[i0, i1]} bottomH={up(0.5)} topH={up(2.4)}
          rakeFill={CONCRETE.rake} wallFill={CONCRETE.wall} seatStroke={CONCRETE.seat} rows={3} aisles={1} />
      ),
    };
  };
  if (stage === 1) return [bleacher('stand', 0.02, trackEdge)];
  // The scoreboard: on two legs in the corner the oval leaves free, across
  // the field from the grandstand, its face square to the straight.
  const board = (() => {
    const p0 = tp(0.95, 0.9); const p1 = tp(0.95, 0.72);
    const foot = { col: Math.min(p0[0], p1[0]) - 0.1, row: Math.min(p0[1], p1[1]) - 0.1, w: Math.abs(p1[0] - p0[0]) + 0.2, h: Math.abs(p1[1] - p0[1]) + 0.2 };
    const boardBase = up(3.2); const boardH = up(3.4);
    return {
      key: 'scoreboard',
      ...foot,
      node: (
        <>
          <Post at={p0} to={boardBase} className="ground-post" />
          <Post at={p1} to={boardBase} className="ground-post" />
          <polygon fill="#33363a" stroke="#222" strokeWidth={0.4} points={polyPoints([
            at(p0, boardBase), at(p1, boardBase), at(p1, boardBase + boardH), at(p0, boardBase + boardH),
          ])} />
          <polygon className="ground-scoreboard-face" points={polyPoints([
            at(p0, boardBase + boardH * 0.25), at(p1, boardBase + boardH * 0.25),
            at(p1, boardBase + boardH * 0.75), at(p0, boardBase + boardH * 0.75),
          ])} />
        </>
      ),
    } satisfies GroundProp;
  })();
  return [board, {
    key: 'stand',
    col: Math.min(back[0], front[0]),
    row: Math.min(back[1], front[1]),
    w: Math.abs(front[0] - back[0]),
    h: Math.abs(front[1] - back[1]),
    node: (
      <>
        <RakedStand
          outer={[tp(S0, 0.02), tp(S1, 0.02)]}
          inner={[tp(S0, trackEdge), tp(S1, trackEdge)]}
          bottomH={bottomH}
          topH={topH}
          rakeFill={CONCRETE.rake}
          wallFill={CONCRETE.wall}
          seatStroke={CONCRETE.seat}
          rows={6}
          aisles={3}
        />
        <Post at={b0} from={topH} to={slabZ} className="ground-post" />
        <Post at={b1} from={topH} to={slabZ} className="ground-post" />
        <Post at={f0} from={seatZ} to={slabZ} className="ground-post" />
        <Post at={f1} from={seatZ} to={slabZ} className="ground-post" />
        <polygon points={polyPoints([at(f0, slabZ), at(f1, slabZ), at(f1, slabZ + slab), at(f0, slabZ + slab)])} fill={shade(CONCRETE.wall, 0.9)} />
        <polygon points={polyPoints([at(f0, slabZ + slab), at(f1, slabZ + slab), at(b1, slabZ + slab), at(b0, slabZ + slab)])} fill={shade(CONCRETE.rake, 1.08)} />
      </>
    ),
  }];
}

// Courts: a net across the middle and the service boxes either side. A 12x4
// plot is six courts in a row (FACILITY_FOOTPRINTS.tennisCourts). Every
// number is a real dimension divided by the ground it sits on, so a longer
// plot means more courts, not bigger ones.
const COURT_BAY_METRES = 18;      // one court and its side run-off
const COURT_WIDTH_METRES = 10.97; // doubles sidelines
const COURT_LENGTH_METRES = 23.77;// baseline to baseline
const SINGLES_INSET = (10.97 - 8.23) / 2 / 10.97;  // the doubles alley, as a share of the court's width
const SERVICE_LINE = 6.4 / (23.77 / 2);            // service line, as a share of a half court

function courtsLayout(w: number, h: number) {
  const landscape = w >= h;
  // u runs along the row of courts, v across one court's length.
  const A = (a: number, c: number): [number, number] => (landscape ? [a, c] : [c, a]);
  const alongM = (landscape ? w : h) * METRES_PER_TILE;
  const deepM = (landscape ? h : w) * METRES_PER_TILE;
  const courts = Math.max(1, Math.round(alongM / COURT_BAY_METRES));
  const cw = Math.min(COURT_WIDTH_METRES / alongM, 1 / courts);  // one court's width, in plot u
  const cl = Math.min(COURT_LENGTH_METRES / deepM, 1);           // its length, in plot v
  const v0 = (1 - cl) / 2;
  const v1 = v0 + cl;
  return { A, courts, cw, cl, v0, v1 };
}

function Courts({ col, row, w, h }: GroundProps) {
  const { A, courts, cw, cl, v0, v1 } = courtsLayout(w, h);

  const line = (a0: number, c0: number, a1: number, c1: number, cls = 'ground-line') => (
    <line className={cls} {...uvLine(col, row, w, h, ...A(a0, c0), ...A(a1, c1))} />
  );

  return (
    <>
      {/* One slab under all of them, fenced as one. Green run-off, blue
          inside the lines: the hard-court scheme, which still says "tennis"
          once the line work is below a pixel. */}
      <polygon className="ground-court" points={uvPoly(col, row, w, h, [
        A(0, 0), A(1, 0), A(1, 1), A(0, 1),
      ])} />
      {Array.from({ length: courts }, (_, k) => {
        const centre = (k + 0.5) / courts;
        const u0 = centre - cw / 2;
        const u1 = centre + cw / 2;
        const alley = cw * SINGLES_INSET;
        const service = v0 + cl * 0.5 * (1 - SERVICE_LINE);
        return (
          <g key={k}>
            <polygon
              className="ground-court-play"
              points={uvPoly(col, row, w, h, [A(u0, v0), A(u1, v0), A(u1, v1), A(u0, v1)])}
            />
            {/* Baselines and doubles sidelines: the court itself. */}
            <polygon
              className="ground-line"
              fill="none"
              points={uvPoly(col, row, w, h, [A(u0, v0), A(u1, v0), A(u1, v1), A(u0, v1)])}
            />
            {/* The singles sidelines (the alley is the gap between), the one
                marking that says "tennis". */}
            {line(u0 + alley, v0, u0 + alley, v1, 'ground-line-fine')}
            {line(u1 - alley, v0, u1 - alley, v1, 'ground-line-fine')}
            {/* The service courts behind the net on each side. The net
                itself stands up, and comes from courtsProps. */}
            {line(u0 + alley, service, u1 - alley, service)}
            {line(u0 + alley, v1 - (service - v0), u1 - alley, v1 - (service - v0))}
            {line(centre, service, centre, v1 - (service - v0))}
          </g>
        );
      })}
    </>
  );
}

// What stands on a court block: the fence around it, and a net across each
// court.
function courtsProps(col: number, row: number, w: number, h: number): GroundProp[] {
  const { A, courts, cw, v0, v1 } = courtsLayout(w, h);
  const at = (u: number, v: number, z: number) => { const [a, c] = A(u, v); return lift(project(col + w * a, row + h * c), z); };
  const NET = up(1.07);
  return [
    {
      key: 'fence',
      col, row, w, h,
      node: <FenceAround col={col} row={row} w={w} h={h} height={up(3.2)} />,
    },
    {
      key: 'nets',
      col, row, w, h,
      node: (
        <>
          {Array.from({ length: courts }, (_, k) => {
            const centre = (k + 0.5) / courts;
            const u0 = centre - cw / 2; const u1 = centre + cw / 2; const v = (v0 + v1) / 2;
            return (
              <g key={k}>
                <polygon className="ground-net" points={polyPoints([at(u0, v, 0), at(u1, v, 0), at(u1, v, NET), at(u0, v, NET)])} />
                <line className="ground-net-tape" x1={at(u0, v, NET).x} y1={at(u0, v, NET).y} x2={at(u1, v, NET).x} y2={at(u1, v, NET).y} />
              </g>
            );
          })}
        </>
      ),
    },
  ];
}


function QuadWalks({ col, row, w, h }: GroundProps) {
  const half = QUAD_WALK / 2;
  return (
    <>
      {/* Edge midpoint to edge midpoint, both ways, so the walks cross at
          the centre. */}
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

// The quad's own planting, drawn through trees.tsx's TreeAt like the
// woodland. Unlike woodland trees (state in `trees`), it is part of the quad
// and carries no state. Authored rather than random, because the map
// re-renders on every pan and tick and rolled planting would shift between
// frames.
type QuadPlanting = [u: number, v: number, species: Species, scale: number];

const QUAD_TREES: QuadPlanting[] = [
  [0.15, 0.15, 'canopy', 1.0], [0.85, 0.15, 'canopy', 1.0],
  [0.15, 0.85, 'canopy', 1.05], [0.85, 0.85, 'canopy', 1.05],
  // Off the walks, at the lawn panels' inner corners (Plan 87K: they stood
  // on the north and south walks).
  [0.32, 0.32, 'ornamental', 0.85], [0.68, 0.32, 'ornamental', 0.85],
  [0.32, 0.68, 'ornamental', 0.85], [0.68, 0.68, 'ornamental', 0.85],
];

// The Grand Quad's plan (Plan 87K), after a Cambridge court and a Beaux-Arts
// parterre: a perimeter walk on the outermost ring of tiles, the two cross
// walks, and a round plaza they all meet at with the fountain in it. Between
// the walks, four lawn panels, each framed by a low clipped hedge set back
// from the walks and closed toward the plaza by a curved flower bed; trees
// stand in the panels, a row along each side broken by the walk's mouth.
// Nothing stands or lies on a walk, and the walkers' grid (quadGeometry.ts)
// paves exactly these tiles. Everything is authored as offsets from the
// centre, mirrored into the four panels, so it turns with the camera.
const GARDEN_SETBACK = 0.3;   // lawn left between a walk's edge and a hedge
const GARDEN_HEDGE = 0.2;     // a hedge's thickness, in tiles
const GARDEN_BED = 0.45;      // the curved bed's width
type TileBox = { col: number; row: number; w: number; h: number };
interface GardensPlan {
  cc: number; cr: number; R: number; P: number;
  half: number;                 // the cross walks' half-width
  perimeter: number;            // the perimeter walk's width, from the edge in
  hedges: TileBox[];
  beds: TilePt[][];             // the curved beds, as tile polygons
  blooms: TilePt[][];           // the blooms in each bed
  trees: Array<[col: number, row: number, species: Species, scale: number]>;
  lamps: TilePt[];
  benches: number[];            // the benches' bearings round the plaza
}

function gardensPlan(col: number, row: number, w: number, h: number): GardensPlan {
  const short = Math.min(w, h);
  const { cc, cr, R, ring } = quadCentre(col, row, w, h, 2);
  const P = ring ? ring[1] : R;
  const half = (QUAD_WALK * short) / 2;
  const perimeter = half * 2;
  // The panels' outer edges: the perimeter walk's inner edge.
  const ex = w / 2 - perimeter; const ey = h / 2 - perimeter;
  const m = GARDEN_SETBACK; const t = GARDEN_HEDGE;
  const off = half + m;
  const ri = P + m; const ro = ri + GARDEN_BED;
  const hedges: TileBox[] = []; const beds: TilePt[][] = []; const blooms: TilePt[][] = [];
  const trees: GardensPlan['trees'] = []; const lamps: TilePt[] = [];
  // Where a stub along a cross walk meets the bed's outer arc.
  const stubEnd = Math.sqrt(Math.max(0, ro * ro - (off + t) * (off + t)));
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      // An offset box (x0..x1, y0..y1 in the +,+ panel) into this panel.
      const box = (x0: number, x1: number, y0: number, y1: number) => {
        const a = sx > 0 ? x0 : -x1; const b = sy > 0 ? y0 : -y1;
        hedges.push({ col: cc + a, row: cr + b, w: x1 - x0, h: y1 - y0 });
      };
      // The frame: two legs along the perimeter walk (the first takes the
      // corner), and a stub down each cross walk to the bed.
      box(off, ex - m, ey - m - t, ey - m);
      box(ex - m - t, ex - m, off, ey - m - t);
      if (ey - m - t > stubEnd) box(off, off + t, stubEnd, ey - m - t);
      if (ex - m - t > stubEnd) box(stubEnd, ex - m - t, off, off + t);
      // The bed: a quarter ring between the two walks, its ends square to them.
      const arc = (r: number, n: number) => {
        const a0 = Math.asin(Math.min(1, off / r)); const a1 = Math.acos(Math.min(1, off / r));
        return Array.from({ length: n + 1 }, (_, i) => a0 + ((a1 - a0) * i) / n).map((a) => [r * Math.cos(a), r * Math.sin(a)] as const);
      };
      const at = (x: number, y: number): TilePt => [cc + sx * x, cr + sy * y];
      beds.push([...arc(ro, 16), ...arc(ri, 16).reverse()].map(([x, y]) => at(x, y)));
      // Two rows of blooms along the bed, nudged by index so nothing moves.
      const bloom: TilePt[] = [];
      for (const [k, r] of [ri + GARDEN_BED * 0.3, ri + GARDEN_BED * 0.72].entries()) {
        const pts = arc(r, 11 + k);
        pts.slice(1, -1).forEach(([x, y]) => bloom.push(at(x, y)));
      }
      blooms.push(bloom);
      // A border inside each leg of the frame, so the hedge holds a band of
      // flowers along the panel's two outer sides.
      const b0 = ey - m - t - 0.08; const b1 = b0 - 0.32;
      const c0 = ex - m - t - 0.08; const c1 = c0 - 0.32;
      const border = (x0: number, x1: number, y0: number, y1: number) => {
        beds.push([at(x0, y0), at(x1, y0), at(x1, y1), at(x0, y1)]);
        // Two staggered rows of blooms along its length.
        const along = Math.abs(x1 - x0) > Math.abs(y1 - y0);
        const n = Math.max(2, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 0.26));
        const row: TilePt[] = [];
        for (const [j, q] of [0.3, 0.7].entries()) {
          for (let i = 0; i < n - j; i++) {
            const k = (i + 0.5 + j * 0.5) / n;
            row.push(along ? at(x0 + (x1 - x0) * k, y0 + (y1 - y0) * q) : at(x0 + (x1 - x0) * q, y0 + (y1 - y0) * k));
          }
        }
        blooms.push(row);
      };
      border(off + t + 0.08, c0, b0, b1);
      border(c0, c1, off + t + 0.08, b1);
      // The trees: one in the panel's outer corner, one each side flanking a
      // walk's mouth, so each side of the court has a row of four.
      const inset = 1.2;
      trees.push([...at(ex - inset, ey - inset), 'canopy', 1.05]);
      trees.push([...at(off + 0.9, ey - inset), 'ornamental', 1.0]);
      trees.push([...at(ex - inset, off + 0.9), 'ornamental', 1.0]);
      // A lamp each side of a walk where it leaves the perimeter walk.
      lamps.push(at(half + 0.15, ey - m / 2), at(ex - m / 2, half + 0.15));
    }
  }
  // Four benches round the plaza, on the diagonals, facing the fountain.
  const benches = [0.25, 0.75, 1.25, 1.75].map((k) => k * Math.PI);
  return { cc, cr, R, P, half, perimeter, hedges, beds, blooms, trees, lamps, benches };
}

// A bench on the plaza's edge, turned to face the fountain (Plan 87K): the
// dressing bench's parts (Plan 80I) at any bearing, a slatted seat on iron
// legs and a back on the side away from the water.
const PLAZA_BENCH_HALF = 0.22;
function PlazaBench({ cc, cr, d, a }: { cc: number; cr: number; d: number; a: number }) {
  const nx = Math.cos(a); const ny = Math.sin(a);   // outward, from the fountain
  const tx = -ny; const ty = nx;                      // along the bench
  const bc = cc + nx * d; const br = cr + ny * d;
  const G = (s: number, n: number) => project(bc + tx * s + nx * n, br + ty * s + ny * n);
  const P = (s: number, n: number, z: number) => lift(G(s, n), z);
  const L = PLAZA_BENCH_HALF; const front = -0.07; const back = 0.07;
  const SEAT = up(0.9); const TOP = up(1.9);
  const seat = polyPoints([P(-L, front, SEAT), P(L, front, SEAT), P(L, back, SEAT), P(-L, back, SEAT)]);
  const rest = polyPoints([P(-L, back + 0.02, SEAT + 2), P(L, back + 0.02, SEAT + 2), P(L, back + 0.03, TOP), P(-L, back + 0.03, TOP)]);
  const legs = [-L + 0.03, L - 0.03].map((s) => {
    const f0 = G(s, front); const f1 = P(s, front, SEAT); const b0 = G(s, back); const b1 = P(s, back + 0.03, TOP);
    return `M${f0.x.toFixed(2)},${f0.y.toFixed(2)}L${f1.x.toFixed(2)},${f1.y.toFixed(2)}M${b0.x.toFixed(2)},${b0.y.toFixed(2)}L${b1.x.toFixed(2)},${b1.y.toFixed(2)}`;
  }).join('');
  // The back hides the seat when the bench faces away from the camera.
  const backFar = G(0, back).y < G(0, front).y;
  const shadow = polyPoints([G(-L, front), G(L, front), G(L, back + 0.06), G(-L, back + 0.06)]);
  return (
    <g className="campus-bench">
      <polygon className="campus-bench-shadow" points={shadow} />
      {backFar && <polygon className="campus-bench-back" points={rest} />}
      <path className="campus-bench-iron" d={legs} />
      <polygon className="campus-bench-seat" points={seat} />
      {!backFar && <polygon className="campus-bench-back" points={rest} />}
    </g>
  );
}

// A low clipped hedge on a tile box (Plan 87K), lower than the old
// gardens' hedges so it frames a panel rather than walls it.
function GardenHedge({ b }: { b: TileBox }) {
  const f = boxFaces(b.col, b.row, b.w, b.h, 0, 5);
  return (
    <>
      <polygon className="ground-hedge" points={polyPoints(f.left)} />
      <polygon className="ground-hedge" points={polyPoints(f.right)} />
      <polygon className="ground-hedge-top" points={polyPoints(f.top)} />
    </>
  );
}

// The Grand Quad's flat half (Plan 87K): its walks, the plaza, the beds.
function GardensGround({ col, row, w, h }: GroundProps) {
  const plan = gardensPlan(col, row, w, h);
  const { cc, cr, P, half, perimeter } = plan;
  const pts = (q: TilePt[]) => polyPoints(q.map(([c, r]) => project(c, r)));
  const rect = (c0: number, r0: number, c1: number, r1: number) => pts([[c0, r0], [c1, r0], [c1, r1], [c0, r1]]);
  const e = col + w; const s = row + h;
  return (
    <>
      {/* The perimeter walk, the cross walks edge to edge, and the plaza. */}
      <polygon className="ground-walk-fill" points={rect(col, row, e, row + perimeter)} />
      <polygon className="ground-walk-fill" points={rect(col, s - perimeter, e, s)} />
      <polygon className="ground-walk-fill" points={rect(col, row, col + perimeter, s)} />
      <polygon className="ground-walk-fill" points={rect(e - perimeter, row, e, s)} />
      <polygon className="ground-walk-fill" points={rect(cc - half, row, cc + half, s)} />
      <polygon className="ground-walk-fill" points={rect(col, cr - half, e, cr + half)} />
      <polygon className="ground-walk-fill" points={polyPoints(projectedCircle(cc, cr, P, 48))} />
      {plan.beds.map((bed, i) => (
        <g key={i}>
          <polygon className="ground-bed" points={pts(bed)} />
          {plan.blooms[i]!.map(([c, r], j) => (
            <polygon key={j} className={`ground-bloom-${(i + j) % 4}`} points={polyPoints(projectedCircle(c, r, 0.13, 8))} />
          ))}
        </g>
      ))}
    </>
  );
}

// The Grand Quad's raised half (Plan 87K), each piece sorted on its own box.
function gardensProps(col: number, row: number, w: number, h: number): GroundProp[] {
  const plan = gardensPlan(col, row, w, h);
  const { cc, cr, R, P } = plan;
  return [
    ...plan.hedges.map((b, i) => ({ key: `hedge-${i}`, ...b, node: <GardenHedge b={b} /> })),
    ...plan.trees.map(([c, r, species, size], i) => ({
      key: `tree-${i}`,
      col: c - 0.5, row: r - 0.5, w: 1, h: 1,
      node: <TreeAt col={c} row={r} species={species} scale={size} shadow={false} />,
      tree: { col: c, row: r, species, scale: size },
      shadows: [treeShadow(c, r, species, size)],
    })),
    ...plan.lamps.map(([c, r], i) => ({ key: `lamp-${i}`, ...aroundPoint(c, r, 0.1), node: lampArt({ at: project(c, r) }, null) })),
    ...plan.benches.map((a, i) => {
      const d = P - 0.4;
      return { key: `bench-${i}`, ...aroundPoint(cc + Math.cos(a) * d, cr + Math.sin(a) * d, 0.24), node: <PlazaBench cc={cc} cr={cr} d={d} a={a} /> };
    }),
    // The same radius Fountain draws its curb at, so the two cannot drift.
    { key: 'fountain', ...aroundPoint(cc, cr, R), node: <Fountain col={col} row={row} w={w} h={h} /> },
  ];
}

// The Grand Quad's fountain: curb, water, a raised basin, and a jet with a
// ring of spray. Static: animating it would force redraws on a surface that
// is otherwise only redrawn when something changes.
function Fountain({ col, row, w, h }: GroundProps) {
  const { cc, cr, R } = quadCentre(col, row, w, h, 2);
  const centre = project(cc, cr);
  const ring = (r: number, up = 0) => polyPoints(projectedCircle(cc, cr, r, 36).map((q) => lift(q, up)));

  return (
    <>
      <polygon className="ground-fountain-kerb" points={ring(R)} />
      <polygon className="ground-fountain-water" points={ring(R * 0.84)} />
      {/* The raised basin standing in the middle of the pool. */}
      <polygon className="ground-fountain-kerb" points={ring(R * 0.30, 7)} />
      <polygon className="ground-fountain-basin" points={ring(R * 0.24, 9)} />
      {/* The jet: a tapering column of water with spray falling back. The
          spray ring stays small and close to the basin so it does not wash
          out the pool's blue. */}
      <polygon
        className="ground-fountain-spray"
        points={ring(R * 0.44, 11)}
      />
      <polygon
        className="ground-fountain-jet"
        points={polyPoints([
          { x: centre.x - 3.4, y: lift(centre, 9).y },
          { x: centre.x + 3.4, y: lift(centre, 9).y },
          { x: centre.x + 1.1, y: lift(centre, 44).y },
          { x: centre.x - 1.1, y: lift(centre, 44).y },
        ])}
      />
      <polygon
        className="ground-fountain-jet"
        points={polyPoints(projectedCircle(cc, cr, R * 0.09, 12).map((q) => lift(q, 46)))}
      />
    </>
  );
}

// The Japanese garden (Plan 72, in place of the formal garden, which was
// drawn as a small Grand Quad; redrawn denser in 72M, after a picture the
// owner chose): grass, a koi pond with lily pads under a red bridge, a
// vermilion torii over a path of stepping stones, a three-tiered pagoda,
// cherry trees in blossom with their petals on the grass and the water,
// azaleas, pines, rocks round the pond and a stone lantern. Everything is
// authored in the plot's own u/v, so it turns with the camera and never
// shifts; the petals are placed by a fixed hash, never the run's stream.
const JG_POND = { u: 0.61, v: 0.6, ru: 0.19, rv: 0.27 };
const JG_ROCKS: Array<[u: number, v: number, size: number, height: number]> = [
  [0.44, 0.36, 0.03, 7], [0.8, 0.42, 0.035, 8], [0.8, 0.82, 0.028, 6], [0.44, 0.84, 0.025, 5], [0.86, 0.7, 0.022, 5],
  [0.38, 0.52, 0.02, 4], [0.84, 0.52, 0.02, 4],
];
const JG_STEPS: Array<[number, number]> = [[0.04, 0.6], [0.1, 0.61], [0.17, 0.6], [0.24, 0.61], [0.3, 0.6], [0.36, 0.6], [0.88, 0.61], [0.94, 0.6]];
const JG_TORII = { u: 0.17, v0: 0.49, v1: 0.71 };
const JG_TEMPLE = { u: 0.2, v: 0.18, half: 0.09 };
const JG_BRIDGE = { a: { u: 0.38, v: 0.6 }, b: { u: 0.85, v: 0.6 } };
const JG_BRIDGE_HALF = 0.035;
// Cherry trees (ornamental and canopy, pink in styles.css's jg-sakura) and
// pines.
const JG_TREES: QuadPlanting[] = [
  [0.44, 0.1, 'canopy', 0.85], [0.66, 0.16, 'ornamental', 1.05], [0.88, 0.1, 'canopy', 0.8],
  [0.92, 0.34, 'ornamental', 0.9], [0.06, 0.8, 'canopy', 0.8], [0.18, 0.92, 'ornamental', 0.85],
  [0.94, 0.94, 'ornamental', 0.75], [0.06, 0.28, 'ornamental', 0.7], [0.76, 0.26, 'ornamental', 0.55],
  [0.96, 0.5, 'ornamental', 0.6], [0.62, 0.96, 'canopy', 0.7], [0.36, 0.96, 'ornamental', 0.6],
  [0.36, 0.26, 'conifer', 0.7], [0.3, 0.84, 'conifer', 0.65], [0.96, 0.74, 'conifer', 0.6],
];
// Azaleas: low mounds, magenta and pink, and a few clipped green ones.
const JG_SHRUBS: Array<[u: number, v: number, r: number, tone: 'pink' | 'magenta' | 'green']> = [
  [0.36, 0.4, 0.035, 'magenta'], [0.54, 0.28, 0.03, 'pink'], [0.9, 0.82, 0.03, 'green'], [0.7, 0.92, 0.03, 'magenta'],
  [0.24, 0.76, 0.032, 'green'], [0.1, 0.4, 0.028, 'pink'], [0.48, 0.92, 0.026, 'pink'], [0.3, 0.08, 0.03, 'green'],
  [0.08, 0.7, 0.026, 'magenta'], [0.9, 0.4, 0.028, 'pink'], [0.6, 0.12, 0.026, 'magenta'],
];
const JG_LILIES: Array<[u: number, v: number, r: number, flower: boolean]> = [
  [0.62, 0.46, 0.03, true], [0.7, 0.72, 0.022, false], [0.52, 0.74, 0.026, false], [0.64, 0.8, 0.028, true], [0.54, 0.4, 0.02, false],
];
const JG_LANTERN = { u: 0.3, v: 0.47 };

// A fixed, stream-free hash in [0, 1), for the petals.
function jgHash(i: number, k: number): number {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// The pond's edge: a circle bent by two harmonics, so it reads as dug by hand.
function pondOutline(col: number, row: number, w: number, h: number, grow = 0): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const bend = 1 + 0.1 * Math.sin(2 * a + 0.7) + 0.06 * Math.cos(3 * a);
    out.push(project(col + w * (JG_POND.u + (JG_POND.ru + grow) * bend * Math.cos(a)), row + h * (JG_POND.v + (JG_POND.rv + grow) * bend * Math.sin(a))));
  }
  return out;
}

function JapaneseGarden({ col, row, w, h }: GroundProps) {
  const k = Math.min(w, h);
  const disc = (u: number, v: number, r: number, n = 10) => polyPoints(projectedCircle(col + w * u, row + h * v, k * r, n));
  // Petals: most under the cherries' side of the garden, a few on the water.
  const petals = Array.from({ length: 70 }, (_, i) => ({ u: 0.03 + jgHash(i, 1) * 0.94, v: 0.03 + jgHash(i, 2) * 0.94, i }));
  return (
    <>
      <polygon className="ground-garden-grass" points={uvPoly(col, row, w, h, [[0, 0], [1, 0], [1, 1], [0, 1]])} />
      <polygon className="ground-moss" points={polyPoints(pondOutline(col, row, w, h, 0.07))} />
      {JG_STEPS.map(([u, v], i) => (
        <polygon key={`step${i}`} className="ground-step-stone" points={disc(u, v, 0.028)} />
      ))}
      <polygon className="ground-pond-edge" points={polyPoints(pondOutline(col, row, w, h, 0.02))} />
      <polygon className="ground-pond" points={polyPoints(pondOutline(col, row, w, h))} />
      {[[0.54, 0.5, 0], [0.68, 0.68, 1], [0.62, 0.38, 2]].map(([u, v, i]) => (
        <polygon key={`koi${i}`} className={i === 1 ? 'ground-koi-white' : 'ground-koi'}
          points={polyPoints(projectedCircle(col + w * u, row + h * v, k * 0.016, 10).map((p, j) => (j % 2 ? p : { x: p.x + 1.2, y: p.y })))} />
      ))}
      {JG_LILIES.map(([u, v, r, flower], i) => (
        <g key={`lily${i}`}>
          {/* A pad with its notch: a disc missing one wedge. */}
          <polygon className="ground-lily" points={polyPoints(projectedCircle(col + w * u, row + h * v, k * r, 16).slice(2).concat([project(col + w * u, row + h * v)]))} />
          {flower && <polygon className="ground-lily-flower" points={disc(u + 0.004, v - 0.004, r * 0.35, 8)} />}
        </g>
      ))}
      {petals.map(({ u, v, i }) => (
        <polygon key={`petal${i}`} className={i % 3 === 0 ? 'ground-petal-light' : 'ground-petal'} points={disc(u, v, 0.0045, 5)} />
      ))}
    </>
  );
}

// A stone set upright in the gravel: a broad foot and a narrower, taller
// crag set off-center on it, so it reads as rock rather than a slab.
function GardenRock({ col, row, w, h, u, v, size, height }: GroundProps & { u: number; v: number; size: number; height: number }) {
  const s = Math.min(w, h) * size;
  const cc = col + w * u; const cr = row + h * v;
  const mass = (x: number, y: number, ww: number, hh: number, base: number, up: number, k: string) => {
    const f = boxFaces(x, y, ww, hh, base, up);
    return (
      <g key={k}>
        <polygon className="ground-rock-left" points={polyPoints(f.left)} />
        <polygon className="ground-rock-right" points={polyPoints(f.right)} />
        <polygon className="ground-rock-top" points={polyPoints(f.top)} />
      </g>
    );
  };
  return (
    <>
      {mass(cc - s, cr - s * 0.8, s * 2, s * 1.6, 0, height * 0.45, 'foot')}
      {mass(cc - s * 0.55, cr - s * 0.6, s * 0.95, s * 0.9, height * 0.45, height * 0.55, 'crag')}
    </>
  );
}

// A stone lantern (tōrō): a foot, a post, the light box and a wide cap.
function GardenLantern({ cc, cr }: { cc: number; cr: number }) {
  const box = (half: number, base: number, height: number, cls: string, k: string) => {
    const f = boxFaces(cc - half, cr - half, half * 2, half * 2, base, height);
    return (
      <g key={k}>
        <polygon className={`${cls}-left`} points={polyPoints(f.left)} />
        <polygon className={`${cls}-right`} points={polyPoints(f.right)} />
        <polygon className={`${cls}-top`} points={polyPoints(f.top)} />
      </g>
    );
  };
  return (
    <>
      {box(0.16, 0, 3, 'ground-lantern', 'foot')}
      {box(0.07, 3, 9, 'ground-lantern', 'post')}
      {box(0.13, 12, 5, 'ground-lantern-light', 'light')}
      {box(0.22, 17, 2.5, 'ground-lantern', 'cap')}
    </>
  );
}

// The bridge: a red arched deck across the pond, with a rail each side,
// drawn as a strip of lifted points.
function GardenBridge({ col, row, w, h }: GroundProps) {
  const { a, b } = JG_BRIDGE;
  const half = JG_BRIDGE_HALF;
  const RISE = 10;
  const n = 12;
  // Across the deck: perpendicular to its run, in u/v.
  const du = b.u - a.u; const dv = b.v - a.v;
  const len = Math.hypot(du, dv);
  const pu = (-dv / len) * half; const pv = (du / len) * half;
  const edge = (side: number, up = 0) => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return lift(uv(col, row, w, h, a.u + du * t + pu * side, a.v + dv * t + pv * side), RISE * Math.sin(Math.PI * t) + up);
  });
  const near = edge(1); const far = edge(-1);
  const rail = (side: number) => `M ${edge(side, 5).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;
  // Posts along each rail.
  const posts = [0, 3, 6, 9, 12].flatMap((i) => [1, -1].map((side) => {
    const p = edge(side)[i]; const q = edge(side, 5)[i];
    return <line key={`post${i}${side}`} className="ground-bridge-rail" x1={p.x} y1={p.y} x2={q.x} y2={q.y} />;
  }));
  return (
    <>
      <polygon className="ground-bridge" points={polyPoints([...near, ...far.reverse()])} />
      {posts}
      <path className="ground-bridge-rail" d={rail(-1)} />
      <path className="ground-bridge-rail" d={rail(1)} />
    </>
  );
}

// A box standing on the grid, its three visible faces in one class family.
function JgBox({ c0, r0, cw, rh, base, height, cls }: { c0: number; r0: number; cw: number; rh: number; base: number; height: number; cls: string }) {
  const f = boxFaces(c0, r0, cw, rh, base, height);
  return (
    <>
      <polygon className={`${cls}-left`} points={polyPoints(f.left)} />
      <polygon className={`${cls}-right`} points={polyPoints(f.right)} />
      <polygon className={`${cls}-top`} points={polyPoints(f.top)} />
    </>
  );
}

// The torii: two vermilion posts across the path, the tie beam (nuki)
// between them, and the black-capped lintel (kasagi) running past both.
function GardenTorii({ col, row, w, h }: GroundProps) {
  const { u, v0, v1 } = JG_TORII;
  const c = col + w * u;
  const post = 0.07;
  const r0 = row + h * v0; const r1 = row + h * v1;
  const over = 0.16;
  return (
    <>
      <JgBox c0={c - post} r0={r0 - post} cw={post * 2} rh={post * 2} base={0} height={24} cls="jg-torii" />
      <JgBox c0={c - post} r0={r1 - post} cw={post * 2} rh={post * 2} base={0} height={24} cls="jg-torii" />
      <JgBox c0={c - 0.04} r0={r0 - 0.04} cw={0.08} rh={r1 - r0 + 0.08} base={18} height={2} cls="jg-torii" />
      <JgBox c0={c - 0.07} r0={r0 - over} cw={0.14} rh={r1 - r0 + over * 2} base={24} height={2.5} cls="jg-torii" />
      <JgBox c0={c - 0.08} r0={r0 - over - 0.04} cw={0.16} rh={r1 - r0 + (over + 0.04) * 2} base={26.5} height={1.8} cls="jg-kasagi" />
    </>
  );
}

// The pagoda (72M, after a picture the owner chose): a stepped stone base
// with a red runner up its steps, then three tiers, each of white walls
// framed by red posts and a red beam under a flared roof of dark blue tiles,
// narrower as they rise, and a gold spire. Built from the eaves' corners in
// camera order (boxFaces' A at the back, C at the front), so it turns with
// the camera: the two back faces of a roof first, the two front over them.
const JG_PAGODA_TIERS = [
  { half: 1, wall: 15, roof: 3 },
  { half: 0.74, wall: 12, roof: 3 },
  { half: 0.5, wall: 10, roof: 6 },
];
function GardenTemple({ col, row, w, h }: GroundProps) {
  const { u, v, half } = JG_TEMPLE;
  const cc = col + w * u; const cr = row + h * v;
  const k = Math.min(w, h) * half;
  const BASE = 4;
  const out: React.JSX.Element[] = [];
  // The base: two grey steps.
  out.push(<JgBox key="base0" c0={cc - k - 0.22} r0={cr - k - 0.22} cw={(k + 0.22) * 2} rh={(k + 0.22) * 2} base={0} height={2} cls="jg-base" />);
  out.push(<JgBox key="base1" c0={cc - k - 0.1} r0={cr - k - 0.1} cw={(k + 0.1) * 2} rh={(k + 0.1) * 2} base={2} height={2} cls="jg-base" />);
  // The red runner up the steps, on the side facing the path and the pond.
  out.push(<polygon key="runner" className="jg-runner" points={polyPoints([
    lift(project(cc - 0.14, cr + k + 0.22), 0), lift(project(cc + 0.14, cr + k + 0.22), 0),
    lift(project(cc + 0.14, cr + k + 0.1), BASE), lift(project(cc - 0.14, cr + k + 0.1), BASE),
  ])} />);
  let z = BASE;
  JG_PAGODA_TIERS.forEach((tier, i) => {
    const hk = k * tier.half;
    const wall = boxFaces(cc - hk, cr - hk, hk * 2, hk * 2, z, tier.wall);
    // White walls, red posts on each visible face, a red beam along the top.
    out.push(<polygon key={`wl${i}`} className="jg-wall-left" points={polyPoints(wall.left)} />);
    out.push(<polygon key={`wr${i}`} className="jg-wall-right" points={polyPoints(wall.right)} />);
    for (const [face, fk] of [[wall.left, 'l'], [wall.right, 'r']] as const) {
      const [p0, p1, p1t, p0t] = face;
      const at = (t: number, top: boolean) => {
        const a = top ? p0t : p0; const b = top ? p1t : p1;
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      };
      for (const t of [0.04, 0.35, 0.65, 0.96]) {
        const lo = at(t, false); const hi = at(t, true);
        out.push(<line key={`post${i}${fk}${t}`} className="jg-post" x1={lo.x} y1={lo.y} x2={hi.x} y2={hi.y} />);
      }
      // The beam: the top fifth of the wall.
      out.push(<polygon key={`beam${i}${fk}`} className="jg-beam" points={polyPoints([
        { x: p0t.x, y: p0t.y + (p0.y - p0t.y) * 0.18 }, { x: p1t.x, y: p1t.y + (p1.y - p1t.y) * 0.18 }, p1t, p0t,
      ])} />);
      // The ground floor's arched door, in the middle of each visible face.
      if (i === 0) {
        const n = 8;
        const bl = at(0.4, false); const br = at(0.6, false);
        const tall = (p0.y - p0t.y) * 0.62;
        const arch = Array.from({ length: n + 1 }, (_, j) => {
          const a = Math.PI * (j / n);
          const mx = (bl.x + br.x) / 2; const my = (bl.y + br.y) / 2;
          const rx = (br.x - bl.x) / 2; const ry = (br.y - bl.y) / 2;
          const lift0 = tall * 0.7 + Math.sin(a) * tall * 0.3;
          return { x: mx - Math.cos(a) * rx, y: my - Math.cos(a) * ry - lift0 };
        });
        out.push(<polygon key={`door${fk}`} className="jg-door" points={polyPoints([bl, ...arch, br])} />);
      }
    }
    z += tier.wall;
    // The roof: from eaves well out past the walls, corners turned up, to a
    // collar the next tier stands on (or the spire's foot at the top).
    const OVER = 0.14 * k + 0.06;
    const eaves = boxFaces(cc - hk - OVER, cr - hk - OVER, (hk + OVER) * 2, (hk + OVER) * 2, z, 0);
    const next = JG_PAGODA_TIERS[i + 1];
    const topHalf = next ? k * next.half * 0.9 : k * 0.06;
    const top = boxFaces(cc - topHalf, cr - topHalf, topHalf * 2, topHalf * 2, z + tier.roof, 0);
    const UP = 2.2;
    const face = (p: Pt, q: Pt, pt: Pt, qt: Pt, cls: string, key: string) => {
      const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 + UP * 0.4 };
      return <polygon key={key} className={cls} points={polyPoints([lift(p, UP), mid, lift(q, UP), qt, pt])} />;
    };
    out.push(face(eaves.A, eaves.B, top.A, top.B, 'jg-roof-back', `ra${i}`));
    out.push(face(eaves.D, eaves.A, top.D, top.A, 'jg-roof-back', `rd${i}`));
    out.push(face(eaves.D, eaves.C, top.D, top.C, 'jg-roof-left', `rl${i}`));
    out.push(face(eaves.C, eaves.B, top.C, top.B, 'jg-roof-right', `rr${i}`));
    z += tier.roof;
  });
  // The spire: a post with three rings and a jewel.
  const foot = project(cc, cr);
  out.push(<polygon key="spire" className="jg-finial" points={polyPoints([
    { x: foot.x - 1, y: lift(foot, z).y }, { x: foot.x + 1, y: lift(foot, z).y },
    { x: foot.x + 0.6, y: lift(foot, z + 12).y }, { x: foot.x - 0.6, y: lift(foot, z + 12).y },
  ])} />);
  [3, 6, 9].forEach((dz, j) => out.push(
    <polygon key={`ring${j}`} className="jg-finial" points={polyPoints(projectedCircle(cc, cr, 0.1 - j * 0.02, 10).map((p) => lift(p, z + dz)))} />,
  ));
  out.push(<polygon key="jewel" className="jg-finial" points={polyPoints(projectedCircle(cc, cr, 0.05, 8).map((p) => lift(p, z + 13)))} />);
  return <>{out}</>;
}

// An azalea: a low mound, darker below, lighter on top.
function GardenShrub({ cc, cr, r, tone }: { cc: number; cr: number; r: number; tone: string }) {
  const ring = (rr: number, up: number) => polyPoints(projectedCircle(cc, cr, rr, 14).map((p) => lift(p, up)));
  return (
    <>
      <polygon className={`jg-shrub-${tone}`} points={ring(r, 0)} />
      <polygon className={`jg-shrub-${tone}`} points={ring(r * 0.95, 2.5)} />
      <polygon className={`jg-shrub-${tone}-top`} points={ring(r * 0.62, 4)} />
    </>
  );
}

function japaneseGardenProps(col: number, row: number, w: number, h: number): GroundProp[] {
  const k = Math.min(w, h);
  const at = (u: number, v: number) => ({ col: col + w * u - 0.5, row: row + h * v - 0.5, w: 1, h: 1 });
  return [
    ...JG_ROCKS.map(([u, v, size, height], i) => ({
      key: `rock-${i}`,
      ...aroundPoint(col + w * u, row + h * v, k * size),
      node: <GardenRock col={col} row={row} w={w} h={h} u={u} v={v} size={size} height={height} />,
    })),
    ...JG_SHRUBS.map(([u, v, r, tone], i) => ({
      key: `shrub-${i}`,
      ...aroundPoint(col + w * u, row + h * v, k * r),
      node: <GardenShrub cc={col + w * u} cr={row + h * v} r={k * r} tone={tone} />,
    })),
    { key: 'lantern', ...aroundPoint(col + w * JG_LANTERN.u, row + h * JG_LANTERN.v, 0.25), node: <GardenLantern cc={col + w * JG_LANTERN.u} cr={row + h * JG_LANTERN.v} /> },
    {
      key: 'bridge',
      // The deck's run, widened by its width so a straight bridge still
      // covers ground.
      col: col + w * (Math.min(JG_BRIDGE.a.u, JG_BRIDGE.b.u) - JG_BRIDGE_HALF), row: row + h * (Math.min(JG_BRIDGE.a.v, JG_BRIDGE.b.v) - JG_BRIDGE_HALF),
      w: w * (Math.abs(JG_BRIDGE.b.u - JG_BRIDGE.a.u) + 2 * JG_BRIDGE_HALF), h: h * (Math.abs(JG_BRIDGE.b.v - JG_BRIDGE.a.v) + 2 * JG_BRIDGE_HALF),
      node: <GardenBridge col={col} row={row} w={w} h={h} />,
    },
    {
      key: 'torii',
      col: col + w * JG_TORII.u - 0.1, row: row + h * JG_TORII.v0 - 0.2, w: 0.2, h: h * (JG_TORII.v1 - JG_TORII.v0) + 0.4,
      node: <GardenTorii col={col} row={row} w={w} h={h} />,
    },
    {
      key: 'temple',
      ...aroundPoint(col + w * JG_TEMPLE.u, row + h * JG_TEMPLE.v, k * JG_TEMPLE.half + 0.3),
      node: <GardenTemple col={col} row={row} w={w} h={h} />,
    },
    ...JG_TREES.map(([u, v, species, size], i) => ({
      key: `tree-${i}`,
      ...at(u, v),
      // The broadleaves are cherries, in blossom in the spring (styles.css's
      // jg-sakura).
      node: <g className="jg-sakura"><TreeAt col={col + w * u} row={row + h * v} species={species} scale={size} shadow={false} /></g>,
      tree: { col: col + w * u, row: row + h * v, species, scale: size },
      shadows: [treeShadow(col + w * u, row + h * v, species, size)],
    })),
  ];
}

// The amenities that stand on open ground (Plan 26). Each has its own
// drawing (Plan 72M): they used to reuse the quads' centerpieces, the
// statue the tier-1 quad's column and the fountain the Grand Quad's pool.
function amenityProps(id: string | undefined, col: number, row: number, w: number, h: number): GroundProp[] {
  if (id === 'AMENITY-GARDEN') return japaneseGardenProps(col, row, w, h);
  const cc = col + w / 2; const cr = row + h / 2;
  if (id === 'AMENITY-STATUE') {
    return [{ key: 'statue', ...aroundPoint(cc, cr, Math.min(w, h) * 0.24), node: <FoundersStatue col={col} row={row} w={w} h={h} /> }];
  }
  return [{ key: 'fountain', ...aroundPoint(cc, cr, Math.min(w, h) * 0.42), node: <TieredFountain col={col} row={row} w={w} h={h} /> }];
}

// A mass of stone standing on the ground, lit like a building's faces.
function StoneBox({ cc, cr, half, base, height, cls }: { cc: number; cr: number; half: number; base: number; height: number; cls: string }) {
  const f = boxFaces(cc - half, cr - half, half * 2, half * 2, base, height);
  return (
    <>
      <polygon className={`${cls}-left`} points={polyPoints(f.left)} />
      <polygon className={`${cls}-right`} points={polyPoints(f.right)} />
      <polygon className={`${cls}-top`} points={polyPoints(f.top)} />
    </>
  );
}

// The Founder's Statue's ground: a lawn crossed by two paved walks, a paved
// square round the plinth.
function StatueGround({ col, row, w, h }: GroundProps) {
  const cc = col + w / 2; const cr = row + h / 2;
  const walk = Math.min(w, h) * 0.09;
  const pave = Math.min(w, h) * 0.3;
  return (
    <>
      <polygon className="ground-lawn" points={polyPoints(boxFaces(col + 0.05, row + 0.05, w - 0.1, h - 0.1, 0, 0).top)} />
      <polygon className="ground-statue-walk" points={polyPoints(boxFaces(cc - walk, row + 0.05, walk * 2, h - 0.1, 0, 0).top)} />
      <polygon className="ground-statue-walk" points={polyPoints(boxFaces(col + 0.05, cr - walk, w - 0.1, walk * 2, 0, 0).top)} />
      <polygon className="ground-statue-walk" points={polyPoints(boxFaces(cc - pave, cr - pave, pave * 2, pave * 2, 0, 0).top)} />
    </>
  );
}

// The founder in bronze: a stepped stone plinth, and on it a standing
// figure in a long coat, a book in hand. The
// plinth turns with the camera; the figure, like a tree's crown, is drawn
// in screen space and faces the viewer from every side.
function FoundersStatue({ col, row, w, h }: GroundProps) {
  const cc = col + w / 2; const cr = row + h / 2;
  const k = Math.min(w, h) / 2;
  const top = 17; // the plinth's top
  const c = lift(project(cc, cr), top);
  // The figure's own units, half again a walker's height: a little larger
  // than life.
  const F = 1.45;
  const at = (dx: number, dy: number) => ({ x: c.x + dx * F, y: c.y - dy * F * heightScale() });
  return (
    <>
      <StoneBox cc={cc} cr={cr} half={0.34 * k} base={0} height={3} cls="ground-plinth" />
      <StoneBox cc={cc} cr={cr} half={0.24 * k} base={3} height={12} cls="ground-plinth" />
      <StoneBox cc={cc} cr={cr} half={0.28 * k} base={15} height={2} cls="ground-plinth" />
      {/* Legs, then the coat (wider at the hem), the far arm, the head,
          and the near arm at the side with a book in the hand. Both arms
          stay down: a raised arm read as a salute. */}
      <polygon className="ground-bronze-dark" points={polyPoints([at(-2.2, 0), at(-0.4, 0), at(-0.6, 8), at(-2, 8)])} />
      <polygon className="ground-bronze-dark" points={polyPoints([at(0.4, 0), at(2.2, 0), at(2, 8), at(0.6, 8)])} />
      <polygon className="ground-bronze" points={polyPoints([at(-3.6, 5), at(3.6, 5), at(2.6, 17), at(-2.6, 17)])} />
      <polygon className="ground-bronze-dark" points={polyPoints([at(-2.6, 16.5), at(-3.6, 16), at(-4.4, 9), at(-3.2, 9)])} />
      <polygon className="ground-bronze" points={polyPoints(projectedEllipse(at(0, 19.8), 1.9 * F, 2.3 * F))} />
      <polygon className="ground-bronze-light" points={polyPoints([at(2.3, 16.6), at(3.5, 16.1), at(4.1, 10.2), at(2.9, 10.2)])} />
      <polygon className="ground-bronze-dark" points={polyPoints([at(2.6, 11.2), at(5.2, 11.2), at(5.2, 7.2), at(2.6, 7.2)])} />
      <polygon className="ground-bronze-light" points={polyPoints([at(2.6, 11.2), at(3.1, 11.2), at(3.1, 7.2), at(2.6, 7.2)])} />
    </>
  );
}

// A screen-space ellipse, for the statue's head.
function projectedEllipse(c: Pt, rx: number, ry: number, n = 14): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: c.x + Math.cos(a) * rx, y: c.y + Math.sin(a) * ry * heightScale() };
  });
}

// The Fountain's ground: a paved round with four benches at its diagonals.
function FountainGround({ col, row, w, h }: GroundProps) {
  const cc = col + w / 2; const cr = row + h / 2;
  const R = Math.min(w, h) * 0.47;
  return <polygon className="ground-fountain-paving" points={polyPoints(projectedCircle(cc, cr, R, 40))} />;
}

// The Fountain (Plan 72M): an octagonal basin with a low stone wall, and in
// it a two-tier fountain, a wide bowl on a pedestal and a small one above,
// water falling from each in a veil, a finial jet on top. The Grand Quad's
// is a round pool with one tall jet; this one is carved stone.
function TieredFountain({ col, row, w, h }: GroundProps) {
  const cc = col + w / 2; const cr = row + h / 2;
  const R = Math.min(w, h) * 0.36;
  const oct = (r: number, z: number) => polyPoints(projectedCircle(cc, cr, r, 8).map((q) => lift(q, z)));
  const round = (r: number, z: number) => polyPoints(projectedCircle(cc, cr, r, 28).map((q) => lift(q, z)));
  const centre = project(cc, cr);
  const stem = (z0: number, z1: number, half0: number, half1: number) => polyPoints([
    { x: centre.x - half0, y: lift(centre, z0).y }, { x: centre.x + half0, y: lift(centre, z0).y },
    { x: centre.x + half1, y: lift(centre, z1).y }, { x: centre.x - half1, y: lift(centre, z1).y },
  ]);
  // Half a ring's width on screen, so each veil hangs from its bowl's rim.
  const span = (r: number) => {
    const xs = projectedCircle(cc, cr, r, 28).map((q) => q.x);
    return (Math.max(...xs) - Math.min(...xs)) / 2;
  };
  const benches = [0.25, 0.75, 1.25, 1.75].map((t) => {
    const a = t * Math.PI;
    const r = Math.min(w, h) * 0.43;
    return { c: cc + Math.cos(a) * r, r: cr + Math.sin(a) * r };
  });
  return (
    <>
      {benches.map((b, i) => <StoneBox key={i} cc={b.c} cr={b.r} half={0.11} base={0} height={2.5} cls="ground-bench" />)}
      {/* The basin: its wall's outer face, the coping, then the water. */}
      <polygon className="ground-plinth-left" points={oct(R, 0)} />
      <polygon className="ground-fountain-kerb" points={oct(R, 3.5)} />
      <polygon className="ground-fountain-water" points={oct(R * 0.9, 3)} />
      <polygon className="ground-fountain-spray" points={round(R * 0.42, 4)} />
      <polygon className="ground-plinth-right" points={stem(3, 15, 3.6, 2.4)} />
      {/* The lower bowl, its veil falling to the basin. */}
      <polygon className="ground-fountain-veil" points={stem(4, 15, span(R * 0.34) * 1.08, span(R * 0.34))} />
      <polygon className="ground-plinth-left" points={round(R * 0.3, 13)} />
      <polygon className="ground-fountain-kerb" points={round(R * 0.34, 15)} />
      <polygon className="ground-fountain-basin" points={round(R * 0.28, 15.5)} />
      <polygon className="ground-plinth-right" points={stem(15.5, 27, 2, 1.3)} />
      {/* The upper bowl and its veil. */}
      <polygon className="ground-fountain-veil" points={stem(16, 27, span(R * 0.16) * 1.1, span(R * 0.16))} />
      <polygon className="ground-plinth-left" points={round(R * 0.14, 25.5)} />
      <polygon className="ground-fountain-kerb" points={round(R * 0.16, 27)} />
      <polygon className="ground-fountain-basin" points={round(R * 0.12, 27.5)} />
      <polygon className="ground-fountain-jet" points={stem(27.5, 37, 1.3, 0.45)} />
    </>
  );
}

// The tier-1 quad's centerpiece: a paved roundel, a stepped plinth and a
// column, in the fountain's two-part language (ground ring, then raised mass).
function Monument({ col, row, w, h }: GroundProps) {
  const cc = col + w * 0.5; const cr = row + h * 0.5;
  const R = Math.min(w, h) * 0.13;
  const centre = project(cc, cr);
  const ring = (r: number, up = 0) => polyPoints(projectedCircle(cc, cr, r, 30).map((q) => lift(q, up)));
  return (
    <>
      <polygon className="ground-medallion" points={ring(R)} />
      <polygon className="ground-fountain-kerb" points={ring(R * 0.46, 5)} />
      {/* The shaft: a tapering column in screen space, like a tree's crown. */}
      <polygon
        className="ground-monument"
        points={polyPoints([
          { x: centre.x - 4.5, y: lift(centre, 5).y },
          { x: centre.x + 4.5, y: lift(centre, 5).y },
          { x: centre.x + 3.0, y: lift(centre, 34).y },
          { x: centre.x - 3.0, y: lift(centre, 34).y },
        ])}
      />
      <polygon
        className="ground-monument-cap"
        points={polyPoints([
          { x: centre.x - 5.0, y: lift(centre, 33).y },
          { x: centre.x + 5.0, y: lift(centre, 33).y },
          { x: centre.x, y: lift(centre, 43).y },
        ])}
      />
    </>
  );
}

// The quad's flat half: everything painted on the ground. What stands on it
// comes from quadProps (see groundProps).
function Quad({ col, row, w, h, tier }: GroundProps & { tier: number }) {
  const gardens = tier >= 2;
  return (
    <>
      <polygon className="ground-lawn" points={uvPoly(col, row, w, h, [[0, 0], [1, 0], [1, 1], [0, 1]])} />
      {/* Mowing stripes, so a big green reads as kept lawn. */}
      {[0.12, 0.28, 0.44, 0.60, 0.76, 0.92].map((v) => (
        <polygon
          key={v}
          className="ground-mow"
          points={uvPoly(col, row, w, h, [[0, v - 0.05], [1, v - 0.05], [1, v + 0.03], [0, v + 0.03]])}
        />
      ))}
      {/* The gardens tier is laid out as a court (Plan 87K): its walks,
          plaza and beds come from gardensPlan, which keeps them apart. */}
      {gardens
        ? <GardensGround col={col} row={row} w={w} h={h} />
        : <QuadWalks col={col} row={row} w={w} h={h} />}
    </>
  );
}

// The quad's raised half, one entry per standing object, each depth-sorted
// individually.
function quadProps(col: number, row: number, w: number, h: number, tier: number): GroundProp[] {
  if (tier >= 2) return gardensProps(col, row, w, h);
  // A planting stands in one tile, so it sorts like the woodland around it.
  const at = (u: number, v: number) => ({
    col: col + w * u - 0.5, row: row + h * v - 0.5, w: 1, h: 1,
  });
  return [
    ...QUAD_TREES.map(([u, v, species, size], i) => ({
      key: `tree-${i}`,
      ...at(u, v),
      node: <TreeAt col={col + w * u} row={row + h * v} species={species} scale={size} shadow={false} />,
      tree: { col: col + w * u, row: row + h * v, species, scale: size },
      shadows: [treeShadow(col + w * u, row + h * v, species, size)],
    })),
    // Tier 1's center: a roundel with a plinth and column, something for the
    // walks to lead to (a bare roundel in the walks' stone read as nothing).
    {
      key: 'monument',
      ...aroundPoint(col + w * 0.5, row + h * 0.5, Math.min(w, h) * 0.13),
      node: <Monument col={col} row={row} w={w} h={h} />,
    },
  ];
}

// The open-air pool: deck with the water sunk into it, coping round the
// edge, eight lanes, a deep end, and starting blocks at the shallow end.
const POOL_LANES = 8;
const POOL_WATER = { u0: 0.18, u1: 0.82, v0: 0.24, v1: 0.76 };

function PoolDeck({ col, row, w, h }: GroundProps) {
  const { u0, u1, v0, v1 } = POOL_WATER;
  const rect = (a: number, b: number, c: number, d: number): [number, number][] => [[a, c], [b, c], [b, d], [a, d]];
  const cop = 0.02;
  return (
    <>
      <polygon className="ground-deck" points={uvPoly(col, row, w, h, rect(0, 0, 1, 1))} />
      <polygon className="ground-coping" points={uvPoly(col, row, w, h, rect(u0 - cop, u1 + cop, v0 - cop * 2, v1 + cop * 2))} />
      <polygon className="ground-water" points={uvPoly(col, row, w, h, rect(u0, u1, v0, v1))} />
      {/* The deep end. */}
      <polygon className="ground-water-deep" points={uvPoly(col, row, w, h, rect(u0 + (u1 - u0) * 0.58, u1, v0, v1))} />
      {Array.from({ length: POOL_LANES - 1 }, (_, i) => {
        const v = v0 + ((i + 1) / POOL_LANES) * (v1 - v0);
        return <line key={i} className="ground-pool-lane" {...uvLine(col, row, w, h, u0, v, u1, v)} />;
      })}
      {/* Starting blocks on the deck at the shallow end, one per lane. */}
      {Array.from({ length: POOL_LANES }, (_, i) => {
        const v = v0 + ((i + 0.5) / POOL_LANES) * (v1 - v0);
        const s = 0.012;
        return (
          <polygon
            key={`b${i}`}
            className="ground-block"
            points={uvPoly(col, row, w, h, rect(u0 - cop - s * 2.4, u0 - cop - s * 0.6, v - s, v + s))}
          />
        );
      })}
    </>
  );
}

// What stands on a pool deck: a fence round the deck, and a pool house in
// the corner behind the deep end.
function poolProps(col: number, row: number, w: number, h: number): GroundProp[] {
  const inset = 0.03;
  const hc = col + w * 0.86; const hr = row + h * 0.06;
  const hw = w * 0.11; const hh = h * 0.16;
  return [
    {
      key: 'fence',
      col, row, w, h,
      node: <FenceAround col={col + w * inset} row={row + h * inset} w={w * (1 - inset * 2)} h={h * (1 - inset * 2)} height={up(2.0)} />,
    },
    {
      key: 'poolhouse',
      col: hc, row: hr, w: hw, h: hh,
      node: <GroundBox col={hc} row={hr} w={hw} h={hh} height={up(3.0)} side={shade(CONCRETE.wall, 0.86)} front={CONCRETE.wall} top={shade(CONCRETE.rake, 0.94)} />,
    },
  ];
}

// ---------------------------------------------------------------------
// Open ground under construction, shared by every marking above. The
// absence of the finished surface is what makes a site legible, so a
// developing plate is graded earth inside a site hoarding and nothing else:
// no markings, planting or furniture (groundProps returns nothing while
// developing). CampusMap draws the progress bar for every site alike.
// ---------------------------------------------------------------------

// A site hoarding: high enough to stand in front of, low enough not to read
// as a wall under construction.
const HOARDING_H = up(2.1);

// How far in from the plot edge the hoarding stands, so adjacent sites do
// not draw their boards through each other.
const HOARDING_INSET = 0.08;

// The boards' ply, as its +row and +col faces (the two the opening camera
// sees); faceTone gives the other two, so a board keeps its tone as the
// camera turns.
const HOARDING_POS_ROW = '#cdb98c';
const HOARDING_POS_COL = '#a8976f';

export function GroundSite({ col, row, w, h }: GroundProps) {
  // The grader's passes: scrape lines the long way across the plot, counted
  // from the short span so passes land about half a tile apart at any size.
  // Each stops short of the edges by a different amount (from the index, not
  // random, so it never crawls between renders); evenly spaced full-width
  // lines would read as a deck.
  const alongW = w >= h;
  const passes = Math.max(3, Math.round((alongW ? h : w) * 1.8));
  const jitter = (i: number, salt: number) => ((Math.sin((i + 1) * 12.9898 + salt) * 43758.5453) % 1 + 1) % 1;

  const ic = col + w * HOARDING_INSET;
  const ir = row + h * HOARDING_INSET;
  const iw = w * (1 - HOARDING_INSET * 2);
  const ih = h * (1 - HOARDING_INSET * 2);
  const f = boxFaces(ic, ir, iw, ih, 0, HOARDING_H);

  // The two camera-facing panels are f.left and f.right; the two behind show
  // their inner faces. Each is toned by the way its outer face points (its
  // inner face is lit like the outer face of the board across from it) and
  // set out in posts along its own length: A-B parallels the left wall and
  // A-D the right one. Back before front.
  const tone = (dir: FaceDir) => faceTone(dir, HOARDING_POS_ROW, HOARDING_POS_COL);
  const boards: Array<{ fill: string; pts: Pt[]; span: number }> = [
    { fill: tone(f.dir.CD), pts: [f.A, f.B, f.Bt, f.At], span: f.spanLeft },
    { fill: tone(f.dir.BC), pts: [f.A, f.D, f.Dt, f.At], span: f.spanRight },
    { fill: tone(f.dir.CD), pts: f.left, span: f.spanLeft },
    { fill: tone(f.dir.BC), pts: f.right, span: f.spanRight },
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
      {boards.map(({ fill, pts, span }, i) => {
        // Posts every couple of tiles, so the board reads as a hoarding rather
        // than a ribbon of flat color.
        const posts = Math.max(1, Math.round(span / 2.5) - 1);
        return (
          <g key={i}>
            <polygon className="site-hoarding" fill={fill} points={polyPoints(pts)} />
            {Array.from({ length: posts }, (_, j) => {
              const u = (j + 1) / (posts + 1);
              const foot = { x: pts[0].x + (pts[1].x - pts[0].x) * u, y: pts[0].y + (pts[1].y - pts[0].y) * u };
              return (
                <line
                  key={j}
                  className="site-hoarding-post"
                  x1={foot.x} y1={foot.y} x2={foot.x} y2={lift(foot, HOARDING_H).y}
                />
              );
            })}
            {/* The capping rail along each board's top edge. */}
            <line className="site-hoarding-cap" x1={pts[3].x} y1={pts[3].y} x2={pts[2].x} y2={pts[2].y} />
          </g>
        );
      })}
    </>
  );
}

// Which marking each open-ground facility wears. The stadium's field is
// StadiumField below, drawn by the bowl motif inside its stands.
export default function GroundMarking({ facilityType, col, row, w, h, tier, developing, id }: GroundProps & {
  facilityType?: FacilityType;
  // Which amenity (Plan 26): the statue, the fountain and the Japanese
  // garden each have their own ground (Plan 72).
  id?: string;
  // Only the quad has tiers, and its two are different places.
  tier?: number;
  // Checked before the switch: every open-ground facility shares one site.
  developing?: boolean;
}) {
  if (developing) return <GroundSite col={col} row={row} w={w} h={h} />;
  switch (facilityType) {
    case 'athleticsField': return <Pitch col={col} row={row} w={w} h={h} />;
    case 'athleticsDiamond': return <Diamond col={col} row={row} w={w} h={h} />;
    case 'tennisCourts': return <Courts col={col} row={row} w={w} h={h} />;
    case 'pool': return <PoolDeck col={col} row={row} w={w} h={h} />;
    case 'quad': return <Quad col={col} row={row} w={w} h={h} tier={tier ?? 1} />;
    case 'amenity':
      if (id === 'AMENITY-GARDEN') return <JapaneseGarden col={col} row={row} w={w} h={h} />;
      if (id === 'AMENITY-STATUE') return <StatueGround col={col} row={row} w={w} h={h} />;
      return <FountainGround col={col} row={row} w={w} h={h} />;
    default:
      return <polygon className="ground-lawn" points={polyPoints(boxFaces(col, row, w, h, 0, 0).top)} />;
  }
}

// The raised half of an open-ground facility. Mirrors GroundMarking exactly
// (same switch, arguments and `developing` shortcut) so a facility can never
// have its paint without its props, or vice versa.
export function groundProps(
  facilityType: FacilityType | undefined,
  col: number, row: number, w: number, h: number, tier?: number, developing?: boolean, id?: string,
  // A venue's expansions (Plan 54): the field alone, then a small stand,
  // then full seating.
  stage = 0,
): GroundProp[] {
  // Nothing stands on a site yet.
  if (developing) return [];
  switch (facilityType) {
    case 'amenity': return amenityProps(id, col, row, w, h);
    case 'athleticsField': return pitchProps(col, row, w, h, stage);
    case 'athleticsDiamond': return diamondProps(col, row, w, h, stage);
    case 'tennisCourts': return courtsProps(col, row, w, h);
    case 'pool': return poolProps(col, row, w, h);
    case 'quad': return quadProps(col, row, w, h, tier ?? 1);
    default: return [];
  }
}

// The stadium's interior, drawn by the bowl motif inside its stands: a solid
// surface under everything, so the ring's opening never shows bare lawn.
export function StadiumField({ col, row, w, h }: GroundProps) {
  return (
    <>
      {/* The full interior, so nothing behind the stands shows through the
          opening: a concrete concourse around the field. */}
      <polygon className="ground-apron" points={polyPoints(boxFaces(col, row, w, h, 0, 0).top)} />
      {/* A gridiron is 120 by 53 yards, drawn at that length (the multi-sport
          field's pitch is near its real 110 m, so the two match at map
          scale); the apron takes what is left all round. */}
      {(() => {
        const along = Math.max(w, h); const across = Math.min(w, h);
        const fieldLen = Math.min(along * (1 - 0.06 * 2), (120 * 0.9144 * 1.15) / METRES_PER_TILE);
        const fieldWid = Math.min(fieldLen / 2.24, across * 0.88);
        return <Gridiron col={col} row={row} w={w} h={h} inset={(along - fieldLen) / 2 / along} insetAcross={(across - fieldWid) / 2 / across} posts />;
      })()}
    </>
  );
}
