import { useContext } from 'react';
import type { SchoolColors } from '../state/types';
import { ColorsContext, CrowdContext, PennantContext, VenueContext } from './mapOccasions';
import { currentCamera, heightScale, lift, polyPoints, project, type Pt } from './isoProjection';
import { up } from './campusScale';
import { WALKER_SHIRTS, pennantCount } from './mapSignals';
import { shade } from './tint';

// A venue's big days on the map (Plan 124 M1): the stands full of people,
// and its titles' pennants round the rim. Both read the week's occasions
// (mapOccasions.ts) through the venue they stand in, so a full week or a
// new pennant redraws that venue alone, and on the canvas map they are
// part of its recorded drawing: thousands of figures cost a recording a
// week, not a frame.

// A point on a stand: grid col, row and a height in screen units.
export type StandPt = readonly [number, number];

// A spectator is the walkers' figure (Walkers.tsx), a little smaller and
// seated: the shirt and the head, the legs hidden by the row in front.
export const SPECTATOR_SCALE = 0.76;
// How tall a figure stands at this tilt, as the walkers' figureScale.
function figureScale(): number {
  return 0.22 + 0.78 * Math.max(0, Math.min(1, heightScale()));
}
// Screen units between two in a row, as a share of a figure's width, and
// between two rows, as a share of its height.
const ALONG_PITCH = 1.06;
const ROW_PITCH = 0.62;
// An aisle's half-width along a stand, as RakedStand cuts it.
const AISLE_HALF = 0.018;

export interface SpectatorsProps {
  // The surface the crowd sits on: its front edge (at the field, low) and
  // its back edge (high), each from one end to the other.
  inner: readonly [StandPt, StandPt];
  outer: readonly [StandPt, StandPt];
  zIn: number;
  zOut: number;
  // Treads, when the surface is stepped (each row of seats level), else 0.
  steps?: number;
  // Gangways left clear, as RakedStand's aisles.
  aisles?: number;
  // Which edge is nearer the camera: the rows are painted far to near.
  innerNear: boolean;
  seed?: number;
}

// The crowd on a stand of a venue full this week.
export function Spectators(props: SpectatorsProps) {
  const venue = useContext(VenueContext);
  return spectatorsArt(props, useContext(CrowdContext).has(venue ?? ''));
}

const f1 = (v: number) => v.toFixed(1);

// The stand's people, row by row from the far edge: each row one path per
// shirt colour and one for the heads, so a packed bowl is a few hundred
// elements, not tens of thousands.
// Kept by stand and camera: a venue that empties and fills again, week on
// week, draws the same crowd without laying it out again.
const KEPT = new Map<string, React.JSX.Element>();
const KEPT_MAX = 400;
export function spectatorsArt(props: SpectatorsProps, crowded: boolean): React.JSX.Element | null {
  if (!crowded) return null;
  const cam = currentCamera();
  const key = `${cam.azimuth},${cam.pitch}|${props.inner.flat().join(',')}|${props.outer.flat().join(',')}|${props.zIn}|${props.zOut}|${props.steps ?? 0}|${props.aisles ?? 0}|${props.innerNear}|${props.seed ?? 0}`;
  const kept = KEPT.get(key);
  if (kept) return kept;
  if (KEPT.size >= KEPT_MAX) KEPT.clear();
  const made = layOut(props);
  KEPT.set(key, made);
  return made;
}
function layOut({ inner, outer, zIn, zOut, steps = 0, aisles = 0, innerNear, seed = 0 }: SpectatorsProps): React.JSX.Element {
  const s = figureScale();
  const k = SPECTATOR_SCALE;
  const half = 3.1 * (1 + (1 - s) * 0.55) * k;
  const shoulder = 4.7 * s * k;
  const crown = 7.2 * s * k;
  const headY = 8.8 * s * k;
  const headR = 3 * (1 + (1 - s) * 0.18) * k;
  const width = half * 2;
  const hx = f1(headR / 2); const hr = f1(headR); const hy = f1(headR * 0.87);
  const tall = headY + headR;
  const at = (p: StandPt, z: number): Pt => lift(project(p[0], p[1]), z);
  const mix = (a: StandPt, b: StandPt, f: number): StandPt => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  // How many rows: as many as fit at ROW_PITCH of a figure's height down
  // the surface's depth on screen, a whole number to a tread.
  const mi = at(mix(inner[0], inner[1], 0.5), zIn);
  const mo = at(mix(outer[0], outer[1], 0.5), zOut);
  const depth = Math.hypot(mo.x - mi.x, mo.y - mi.y);
  const fit = Math.max(1, Math.round(depth / Math.max(2.4, tall * ROW_PITCH)));
  const rows = steps > 0 ? steps * Math.max(1, Math.round(fit / steps)) : fit;
  const zAt = (v: number) => (steps > 0
    ? zIn + ((zOut - zIn) * (Math.min(steps - 1, Math.floor(v * steps)) + 1)) / steps
    : zIn + (zOut - zIn) * v);
  const aisleAt = Array.from({ length: aisles }, (_, j) => (j + 1) / (aisles + 1));
  const out: React.JSX.Element[] = [];
  let n = 0;
  for (let q = 0; q < rows; q++) {
    const j = innerNear ? rows - 1 - q : q;
    const v = (j + 0.5) / rows;
    const z = zAt(v);
    const a = at(mix(inner[0], outer[0], v), z);
    const b = at(mix(inner[1], outer[1], v), z);
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < width) continue;
    const pitch = width * ALONG_PITCH;
    const count = Math.floor((len - width) / pitch) + 1;
    const start = (len - (count - 1) * pitch) / 2;
    const clear = AISLE_HALF + half / len;
    const torsos: string[][] = WALKER_SHIRTS.map(() => []);
    const heads: string[] = [];
    // Every other row a half-step along and one fewer, so the heads
    // interleave and nobody overhangs the row's ends.
    const odd = j % 2 === 1 && count > 1;
    const inRow = odd ? count - 1 : count;
    for (let i = 0; i < inRow; i++) {
      const d = start + i * pitch + (odd ? pitch * 0.5 : 0);
      const u = d / len;
      if (aisleAt.some((c) => Math.abs(u - c) < clear)) continue;
      const x = a.x + (b.x - a.x) * u;
      const y = a.y + (b.y - a.y) * u;
      const h = ((n++ * 2654435761) ^ (seed + j * 40503)) >>> 0;
      torsos[h % WALKER_SHIRTS.length]!.push(
        `M${f1(x - half)} ${f1(y)}V${f1(y - shoulder)}Q${f1(x)} ${f1(y - crown)} ${f1(x + half)} ${f1(y - shoulder)}V${f1(y)}Z`,
      );
      // A head as a hexagon: at two or three pixels it reads as round, and
      // fills in half an arc's time.
      heads.push(`M${f1(x - headR)} ${f1(y - headY)}l${hx} -${hy}h${hr}l${hx} ${hy}l-${hx} ${hy}h-${hr}z`);
    }
    torsos.forEach((d, c) => {
      if (d.length) out.push(<path key={`${j}t${c}`} d={d.join('')} fill={WALKER_SHIRTS[c]} />);
    });
    if (heads.length) out.push(<path key={`${j}h`} className="walker-head" d={heads.join('')} />);
  }
  return <g className="stand-crowd">{out}</g>;
}

// ---- Pennants ----
// A pennant on a short staff: the staff up from the rim, a triangle in the
// college's first colour flying off it with a band of the second.
const STAFF = up(3.4);
function pennant(foot: Pt, colors: SchoolColors, key: string): React.JSX.Element {
  const hs = Math.max(0.35, heightScale());
  const top = lift(foot, STAFF);
  const fly = 13;
  const drop = 7 * hs + 1.6;
  return (
    <g key={key}>
      <line className="venue-pennant-staff" x1={foot.x} y1={foot.y} x2={top.x} y2={top.y} />
      <polygon fill={colors.primary} stroke={shade(colors.primary, 0.6)} strokeWidth={0.4} points={polyPoints([
        top, { x: top.x + fly, y: top.y + drop * 0.5 }, { x: top.x, y: top.y + drop },
      ])} />
      <polygon fill={colors.secondary} points={polyPoints([
        { x: top.x, y: top.y + drop * 0.36 }, { x: top.x + fly * 0.62, y: top.y + drop * 0.5 }, { x: top.x, y: top.y + drop * 0.64 },
      ])} />
    </g>
  );
}

export interface PennantsProps {
  // The edges they run along, each from one end to the other, at height z.
  edges: ReadonlyArray<readonly [StandPt, StandPt]>;
  z: number;
}
// A venue's title pennants (mapSignals.ts's pennantVenues), the year after
// a title and from then on.
export function VenuePennants(props: PennantsProps) {
  const venue = useContext(VenueContext);
  return venuePennantsArt(props, useContext(PennantContext).has(venue ?? ''), useContext(ColorsContext));
}
export function venuePennantsArt({ edges, z }: PennantsProps, flying: boolean, colors: SchoolColors): React.JSX.Element | null {
  if (!flying) return null;
  const feet: Pt[] = [];
  for (const [a, b] of edges) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = pennantCount(len);
    // The last of an edge is the next one's first, where edges meet.
    for (let i = 0; i < n - 1; i++) {
      const f = i / (n - 1);
      feet.push(lift(project(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f), z));
    }
    if (edges.length === 1) feet.push(lift(project(b[0], b[1]), z));
  }
  feet.sort((p, q) => p.y - q.y);
  return <g className="venue-pennants">{feet.map((p, i) => pennant(p, colors, `p${i}`))}</g>;
}
