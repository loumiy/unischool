// Porticos that tie into their building (Plan 87O).
//
// The owner, on the Georgian Founders Hall (Plan 87M): "These porticos look
// so much better, connecting up to the roof ridges. Update other porticos
// to do the same." There each portico is a full-height temple front whose
// pediment's roof runs back into the main roof as a cross-gable. Elsewhere
// the porticos stopped short: four square posts to the second floor under
// a flat slab, or a pediment roofed only back to the wall. TiedPortico is
// 87M's geometry as a shared part:
//
//   - round columns from the podium (or sill) to the entablature, spaced at
//     least about a diameter and a bit apart: a narrow door gets two, not
//     four squeezed into a door's width (the "four tightly stacked columns"
//     the owner saw);
//   - the entablature's top on the building's cornice line (or its
//     parapet's), so nothing floats or falls short of the roofline;
//   - a pediment on the front, and its roof run back from the pediment
//     until its ridge meets the main roof (`roofAt`): on a hip or a gable's
//     slope that is a cross-gable meeting the slope at a valley; on a gable
//     end, the end wall; on a flat roof, the parapet behind it.
//
// The main roof is drawn first and the portico after it, as on 87M.
import type { DoorDimensions, StonePalette } from './buildingSpec';
import { NO_STONE } from './buildingSpec';
import { METRES_PER_TILE, across, up } from './campusScale';
import { depthOrder } from './depthSort';
import { boxFaces, lift, polyPoints, project, wallOf, type FaceDir, type Pt } from './isoProjection';
import { WALL_LIGHT, faceTone } from './light';
import { shade } from './tint';
import {
  Cylinder, EntranceSteps, WallBand, againstWall, backSlopesFirst, outsideWall, outwardOf, wallSpan,
} from './buildingMotifs';

// The height of the building's roof (or deck, or parapet top) over grid
// point (c, r), -Infinity off it.
export type RoofAt = (c: number, r: number) => number;

const isRow = (dir: FaceDir) => dir === 'posRow' || dir === 'negRow';
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const inside = (c: number, r: number, c0: number, r0: number, w0: number, h0: number) =>
  c >= c0 - 1e-6 && c <= c0 + w0 + 1e-6 && r >= r0 - 1e-6 && r <= r0 + h0 + 1e-6;

// A hip over (c0, r0, w0, h0) springing at `base`: every slope rises `rise`
// over half the shorter span (HippedRoof's geometry).
export function hipRoofAt(c0: number, r0: number, w0: number, h0: number, base: number, rise: number): RoofAt {
  const run = Math.min(w0, h0) / 2;
  return (c, r) => (inside(c, r, c0, r0, w0, h0)
    ? base + rise * clamp01(Math.min(c - c0, c0 + w0 - c, r - r0, r0 + h0 - r) / run)
    : -Infinity);
}
// A gable whose ridge runs along the longer side (gableSlopes'): only the
// two long slopes rise; the ends are walls up to the ridge.
export function gableRoofAt(c0: number, r0: number, w0: number, h0: number, base: number, rise: number): RoofAt {
  const alongW = w0 >= h0;
  const run = (alongW ? h0 : w0) / 2;
  return (c, r) => (inside(c, r, c0, r0, w0, h0)
    ? base + rise * clamp01((alongW ? Math.min(r - r0, r0 + h0 - r) : Math.min(c - c0, c0 + w0 - c)) / run)
    : -Infinity);
}
// A mansard (MansardRoof's): the steep lower slope rises `rise` over its
// inset, then a low lead hip.
export function mansardRoofAt(c0: number, r0: number, w0: number, h0: number, base: number, rise: number): RoofAt {
  const inset = Math.min(across(2.2), Math.min(w0, h0) * 0.16);
  const deck = hipRoofAt(c0 + inset, r0 + inset, w0 - inset * 2, h0 - inset * 2, base + rise, up(1.2));
  return (c, r) => {
    if (!inside(c, r, c0, r0, w0, h0)) return -Infinity;
    const d = Math.min(c - c0, c0 + w0 - c, r - r0, r0 + h0 - r);
    return d < inset ? base + rise * clamp01(d / inset) : deck(c, r);
  };
}
// A flat roof: its deck, or the top of the parapet round it.
export function flatRoofAt(c0: number, r0: number, w0: number, h0: number, z: number): RoofAt {
  return (c, r) => (inside(c, r, c0, r0, w0, h0) ? z : -Infinity);
}
// A flat deck at `z` with a drum of radius `r` rising `rise` from it at
// (cc, cr): a rotunda's (the library's, Plan 87F).
export function rotundaRoofAt(c0: number, r0: number, w0: number, h0: number, z: number, cc: number, cr: number, r: number, rise: number): RoofAt {
  return (c, r1) => (!inside(c, r1, c0, r0, w0, h0) ? -Infinity : Math.hypot(c - cc, r1 - cr) <= r ? z + rise : z);
}
// A barrel vault along the longer side (barrelVault's), its section
// `profile` across it, 0..1.
export function vaultRoofAt(c0: number, r0: number, w0: number, h0: number, base: number, rise: number, profile: (x: number) => number): RoofAt {
  const alongW = w0 >= h0;
  return (c, r) => (inside(c, r, c0, r0, w0, h0)
    ? base + rise * profile(clamp01(alongW ? (r - r0) / h0 : (c - c0) / w0))
    : -Infinity);
}
// The higher of two roofs (a hip behind a parapet).
export function eitherRoof(a: RoofAt, b: RoofAt): RoofAt {
  return (c, r) => Math.max(a(c, r), b(c, r));
}

// The clear space between columns, in diameters, never less (Plan 87O).
const MIN_CLEAR = 1.25;
const MAX_CLEAR = 4.5;
const PEDIMENT_PITCH = 0.26;           // rise over half-span: about 15 degrees

// How many columns a front of `width` takes, from `wanted`: fewer, two at a
// time, until each stands at least MIN_CLEAR diameters clear of the next
// (more, if they would stand over MAX_CLEAR apart).
export function porticoColumns(width: number, r: number, wanted: number): number {
  let n = Math.max(2, wanted);
  const inset = r + across(0.45);
  const gap = (k: number) => (width - inset * 2) / (k - 1);
  while (n > 2 && gap(n) < 2 * r * (1 + MIN_CLEAR)) n -= 2;
  // Nor so far apart the front reads as posts under a canopy.
  while (n < 10 && gap(n) > 2 * r * (1 + MAX_CLEAR) && gap(n + 2) >= 2 * r * (1 + MIN_CLEAR)) n += 2;
  return n;
}
// The narrowest front that two columns fit at that spacing.
export function porticoMinWidth(r: number): number {
  return (r + across(0.45)) * 2 + 2 * r * (1 + MIN_CLEAR);
}
// A column's radius for its height: about a ninth of it across, within a
// sensible range (Plan 87O).
export function columnRadius(height: number): number {
  const m = height / up(1);
  return across(Math.min(0.75, Math.max(0.32, m / 18)));
}

// How far a portico of `depth` (to its columns' front) reaches from the wall
// to its entablature's front.
const ENT_PROUD = across(0.2);
export function porticoReach(depth: number): number {
  return depth + ENT_PROUD;
}

// A gable on a front of `width` along wall `dir` of box (col, row, w, h)
// from `along0`, its face `reach` out from the wall at height `top`, and
// its roof run back until it meets `roofAt` (Plan 87O, after 87M): the
// ridge where the main roof reaches the ridge's height (a valley on a
// slope, the wall on a gable end), each eave where the roof rises past
// it, or onto a flat deck as far as the ridge. `capRise` keeps the ridge
// under the main roof's peak. The slopes go back first, each falling to
// the eave on its own side of the screen.
export function crossGable({ col, row, w, h, dir, along0, width, reach, top, rise: wanted, roofAt, slopes, capRise = false }: {
  col: number; row: number; w: number; h: number; dir: FaceDir; along0: number; width: number; reach: number;
  top: number; rise: number; roofAt: RoofAt | null; slopes: Record<FaceDir, string>; capRise?: boolean;
}) {
  const out = outwardOf(dir);
  const gb = againstWall(col, row, w, h, dir, along0, width, reach);
  const face = wallOf(boxFaces(gb.col, gb.row, gb.w, gb.h, top, 0), dir);
  const fmid = { x: (face.origin.x + face.along.x) / 2, y: (face.origin.y + face.along.y) / 2 };
  // A point `d` tiles in from the face, `u` (0..1) across it.
  const gridAt = (u: number, d: number) => outsideWall(col, row, w, h, dir, along0 + width * u, reach - d);
  let rise = wanted;
  const deepest = reach + Math.min(w, h);
  const STEP = across(0.2);
  if (roofAt && capRise) {
    let peak = -Infinity;
    for (let d = reach; d <= deepest; d += STEP) { const q = gridAt(0.5, d); peak = Math.max(peak, roofAt(q.col, q.row)); }
    if (peak - top > up(1.5)) rise = Math.min(rise, (peak - top) * 0.82);
  }
  const meet = (u: number, z: number) => {
    if (!roofAt) return reach;
    // An eave on a deck at its own height sits on it, back to the ridge.
    const above = u === 0.5 ? z : z + up(0.3);
    for (let d = u === 0.5 ? reach : 0; d <= deepest; d += STEP) {
      const q = gridAt(u, d);
      if (roofAt(q.col, q.row) >= above) return d;
    }
    if (u !== 0.5) return Infinity;
    return reach + across(0.3);           // a flat deck: just past the parapet
  };
  const dRidge = meet(0.5, top + rise);
  const dEave = Math.min(dRidge, meet(0, top));
  const backBy = (q: Pt, d: number) => {
    const o0 = project(0, 0); const o1 = project(-out.col * d, -out.row * d);
    return { x: q.x + o1.x - o0.x, y: q.y + o1.y - o0.y };
  };
  const apex = lift(fmid, rise);
  const pSide: FaceDir[] = isRow(dir) ? ['negCol', 'posCol'] : ['negRow', 'posRow'];
  const [fl, fr] = face.origin.x < face.along.x ? [face.origin, face.along] : [face.along, face.origin];
  const p0 = project(0, 0); const p1 = isRow(dir) ? project(-1, 0) : project(0, -1);
  const leftDir = p1.x < p0.x ? pSide[0] : pSide[1];
  const pSlopes = backSlopesFirst<[FaceDir, Pt]>([[leftDir, fl], [leftDir === pSide[0] ? pSide[1] : pSide[0], fr]], (q) => q[0]);
  const roof = pSlopes.map(([d, e]) => (
    <polygon key={`ps${d}`} points={polyPoints([e, apex, backBy(apex, dRidge), backBy(e, dEave)])} fill={slopes[d]} />
  ));
  return { face, apex, rise, roof };
}

export function TiedPortico({
  col, row, w, h, dir, width, depth, base, top, columns, roofAt, slopes, stone, along,
  entablature = up(1.5), podium = false, steps, shadow = true, oculus = false, tone,
}: {
  // The wall box the portico stands against, and the wall.
  col: number; row: number; w: number; h: number; dir: FaceDir;
  // Its width along the wall, and how far its columns' front stands out.
  width: number; depth: number;
  // What the columns stand on (the podium's top, or the sill) and the
  // entablature's top (the cornice or parapet line).
  base: number; top: number;
  // The columns wanted: fewer if they would crowd (porticoColumns).
  columns: number;
  // The main roof, for the pediment's roof to run back into; null runs it
  // back to the wall alone.
  roofAt: RoofAt | null;
  // The pediment roof's tone by the way each slope faces.
  slopes: Record<FaceDir, string>;
  stone: StonePalette;
  // The portico's middle along the wall (default the wall's middle).
  along?: number;
  entablature?: number;
  // A podium under it (base high), steps up to its front, a shade on the
  // wall behind its columns, an oculus in the tympanum.
  podium?: boolean;
  steps?: DoorDimensions | null;
  shadow?: boolean;
  oculus?: boolean;
  // The order's stone; the trim, else the tower stone.
  tone?: string;
}) {
  const span = wallSpan(w, h, dir);
  const r = columnRadius(top - entablature - base);
  // Never a door's width under a giant order: a tall portico widens to a
  // temple's proportion (about 0.9 of its height), within the wall.
  const tall = Math.min(across(((top - base) / up(1)) * 0.9), span * 0.6);
  const pw = Math.max(width, tall, porticoMinWidth(r));
  const mid = along ?? span / 2;
  const along0 = mid - pw / 2;
  const n = porticoColumns(pw, r, columns);
  const order = tone ?? (stone.trim === NO_STONE ? stone.towerStone : stone.trim);
  const out = outwardOf(dir);
  const reach = porticoReach(depth);

  // Columns, back to front; the door falls between the middle two.
  const inset = r + across(0.45);
  const shafts = depthOrder(Array.from({ length: n }, (_, i) => {
    const at = outsideWall(col, row, w, h, dir, along0 + inset + ((pw - inset * 2) * i) / (n - 1), depth - r - across(0.15));
    return { col: at.col - r, row: at.row - r, w: r * 2, h: r * 2 };
  }));

  // The entablature, from the wall to the front.
  const ent = againstWall(col, row, w, h, dir, along0 - ENT_PROUD, pw + ENT_PROUD * 2, reach);
  const entF = boxFaces(ent.col, ent.row, ent.w, ent.h, top - entablature, entablature);
  const pitched = up(((pw + ENT_PROUD * 2) * METRES_PER_TILE / 2) * PEDIMENT_PITCH);
  const { face, apex, rise, roof } = crossGable({
    col, row, w, h, dir, along0: along0 - ENT_PROUD, width: pw + ENT_PROUD * 2, reach, top, rise: pitched, roofAt, slopes, capRise: true,
  });

  // The tympanum, inset, and an oculus in it.
  const pt = (u: number, z: number) => lift({ x: face.origin.x + (face.along.x - face.origin.x) * u, y: face.origin.y + (face.along.y - face.origin.y) * u }, z);
  const lit = WALL_LIGHT[dir];
  const edge = Math.min(0.08, across(0.5) / (pw + ENT_PROUD * 2));
  const tympanum = [pt(edge * 1.6, up(0.32)), pt(1 - edge * 1.6, up(0.32)), pt(0.5, rise - up(0.35))];
  const rU = across(Math.min(1.05, rise / up(1) * 0.22)) / (pw + ENT_PROUD * 2);
  const ring = Array.from({ length: 18 }, (_, i) => {
    const t = (i / 18) * Math.PI * 2;
    return pt(0.5 + Math.cos(t) * rU, rise * 0.38 + Math.sin(t) * up(rU * (pw + ENT_PROUD * 2) * METRES_PER_TILE));
  });

  // The wall behind, in the portico's shade.
  const wall = wallOf(boxFaces(col, row, w, h, 0, top), dir);
  const podiumBox = againstWall(col, row, w, h, dir, along0, pw, depth);
  const stepsAt = outsideWall(col, row, w, h, dir, mid, depth);
  return (
    <g className="iso-portico">
      {shadow && (
        <WallBand origin={wall.origin} along={wall.along} wallHeight={top} from={base} to={top - entablature} className="iso-eaves-shadow"
          u0={Math.max(0, along0 / span)} u1={Math.min(1, (along0 + pw) / span)} />
      )}
      {podium && base > 0 && (() => {
        const pf = boxFaces(podiumBox.col, podiumBox.row, podiumBox.w, podiumBox.h, 0, base);
        return (
          <>
            <polygon points={polyPoints(pf.left)} fill={faceTone(pf.dir.CD, shade(order, 0.9), shade(order, 0.74))} />
            <polygon points={polyPoints(pf.right)} fill={faceTone(pf.dir.BC, shade(order, 0.9), shade(order, 0.74))} />
            <polygon points={polyPoints(pf.top)} fill={shade(order, 0.97)} />
          </>
        );
      })()}
      {shafts.map((c, i) => (
        <g key={`pc${i}`}>
          <Cylinder cc={c.col + r} cr={c.row + r} r={r * 0.86} z0={base} z1={top - entablature} fill={shade(order, 0.97)} />
          <Cylinder cc={c.col + r} cr={c.row + r} r={r} z0={top - entablature - up(0.45)} z1={top - entablature} fill={shade(order, 1.0)} />
        </g>
      ))}
      {steps && (
        <EntranceSteps d={{ ...steps, widthTiles: Math.max(steps.widthTiles, Math.min(pw * 0.8, pw - inset * 2)) }} stone={stone}
          centreCol={stepsAt.col} centreRow={stepsAt.row} outCol={out.col} outRow={out.row} span={pw / 0.6} />
      )}
      <polygon points={polyPoints(entF.left)} fill={faceTone(entF.dir.CD, shade(order, 0.95), shade(order, 0.78))} />
      <polygon points={polyPoints(entF.right)} fill={faceTone(entF.dir.BC, shade(order, 0.95), shade(order, 0.78))} />
      <polygon points={polyPoints(entF.top)} fill={shade(order, 1.0)} />
      {/* The pediment's roof, run back into the main roof. */}
      {roof}
      <polygon points={polyPoints([face.origin, face.along, apex])} fill={shade(order, lit)} stroke={shade(order, 0.72)} strokeWidth={0.5} />
      <polygon points={polyPoints(tympanum)} fill={shade(order, lit * 0.9)} />
      {oculus && rise > up(2) && <polygon points={polyPoints(ring)} className="iso-clock-face" />}
    </g>
  );
}

// A pediment roof's slopes in a roof tone, by the way each faces (SLOPE's
// order), for a portico on a flat-roofed building.
export function toneSlopes(tone: string, k = 1): Record<FaceDir, string> {
  return { negCol: shade(tone, 1.0 * k), negRow: shade(tone, 0.93 * k), posRow: shade(tone, 0.81 * k), posCol: shade(tone, 0.72 * k) };
}
