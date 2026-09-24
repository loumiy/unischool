// Painter's order for the campus map: which of two things on the grid has to
// be drawn on top of the other. There is no depth buffer, so draw order is
// the occlusion.
//
// Not a sort key: a scalar such as the far corner (`row + h + col + w`) is
// right for points but not rectangles, since whether A occludes B depends on
// how they are separated. So this states the occlusion relation directly and
// topologically sorts it, with that scalar (generalised to any camera) as the
// tie-break where the relation leaves the order free. The camera's axes are
// an input, so rotation is a transform rather than a rewrite.
//
// Pure geometry: no React, no game state, same as isoProjection.ts.

import { cameraAxes } from './isoProjection';

// The tiles a thing stands on: whole tiles for a Buildable, fractions for a
// hedge or fountain. Never assumed to be integers.
export interface DepthBox {
  col: number; row: number; w: number; h: number;
}

// Could the camera see these two overlap at all? Tests the footprints'
// extents on the two screen axes (isoProjection's cameraAxes: across is
// col * cosA - row * sinA, down is col * sinA + row * cosA).
//
// Conservative on purpose: it tests the rhombus's bounding box, so edge-
// touching pairs are admitted. An extra pair only costs a constraint that was
// already true; a wrongly rejected one would leave an occlusion unordered.
//
// It never admits a pair separated on both grid axes with the axes
// disagreeing about which is nearer (their across-screen extents are pushed
// apart), which is what keeps `occludes` consistent and the topological sort
// cycle-free at any azimuth.
//
// Height is safe to ignore: pairs separated across the screen never meet,
// since height only moves a mass up; pairs separated down the screen are
// already ordered correctly by `nearest`.
interface Axes { cosA: number; sinA: number; }
function overlapsOnScreen(a: DepthBox, b: DepthBox, ax: Axes): boolean {
  const { cosA, sinA } = ax;
  // Extents of a's rhombus on the across axis (X) and the down axis (Y).
  const aX = a.col * cosA - a.row * sinA; const aY = a.col * sinA + a.row * cosA;
  const bX = b.col * cosA - b.row * sinA; const bY = b.col * sinA + b.row * cosA;
  const awx = a.w * cosA; const ahx = -a.h * sinA; const awy = a.w * sinA; const ahy = a.h * cosA;
  const bwx = b.w * cosA; const bhx = -b.h * sinA; const bwy = b.w * sinA; const bhy = b.h * cosA;
  const aX0 = aX + Math.min(0, awx) + Math.min(0, ahx); const aX1 = aX + Math.max(0, awx) + Math.max(0, ahx);
  const bX0 = bX + Math.min(0, bwx) + Math.min(0, bhx); const bX1 = bX + Math.max(0, bwx) + Math.max(0, bhx);
  if (!(aX0 < bX1 && bX0 < aX1)) return false;
  const aY0 = aY + Math.min(0, awy) + Math.min(0, ahy); const aY1 = aY + Math.max(0, awy) + Math.max(0, ahy);
  const bY0 = bY + Math.min(0, bwy) + Math.min(0, bhy); const bY1 = bY + Math.max(0, bwy) + Math.max(0, bhy);
  return aY0 < bY1 && bY0 < aY1;
}

// Which of two footprints is nearer the camera: 1 if `a` is (so `a` is painted
// AFTER `b`), -1 if `b` is, 0 if they never overlap and the order is free.
//
// Two disjoint axis-aligned rectangles are separated along at least one grid
// axis, and the camera says which way each axis runs toward it (increasing
// col is nearer when sinA > 0, increasing row when cosA > 0). The box further
// along the separating axis in that direction is nearer. At an exact cardinal
// azimuth one axis runs straight across the screen; boxes separated on it
// were already rejected by the gate.
//
// Footprints are disjoint by construction (campusMap.ts's footprintIsClear;
// trees only on unbuilt tiles). Genuinely overlapping boxes return 0 and
// keep the tie-break order.
export function occludes(a: DepthBox, b: DepthBox, ax: Axes = cameraAxes()): -1 | 0 | 1 {
  if (!overlapsOnScreen(a, b, ax)) return 0;
  const colNear = Math.sign(ax.sinA) as -1 | 0 | 1;
  const rowNear = Math.sign(ax.cosA) as -1 | 0 | 1;
  if (a.col >= b.col + b.w) return colNear;
  if (b.col >= a.col + a.w) return -colNear as -1 | 0 | 1;
  if (a.row >= b.row + b.h) return rowNear;
  if (b.row >= a.row + a.h) return -rowNear as -1 | 0 | 1;
  return 0;
}

// The tie-break: the down-screen coordinate of the footprint's nearest
// corner, up to a positive rescaling. At the default camera it is exactly
// `row + h + col + w`, in that arithmetic, so ties stay ties.
function nearest(b: DepthBox, ax: Axes): number {
  const { cosA, sinA } = ax;
  const rowEnd = cosA >= 0 ? b.row + b.h : b.row;
  const colEnd = sinA >= 0 ? b.col + b.w : b.col;
  if (Math.abs(cosA) >= Math.abs(sinA)) {
    const t = ratio(sinA, cosA);
    if (t === 1 && sinA > 0) return (rowEnd + b.col) + b.w;   // exactly `row + h + col + w`
    return Math.sign(cosA) * (rowEnd + colEnd * t);
  }
  const t = ratio(cosA, sinA);
  return Math.sign(sinA) * (colEnd + rowEnd * t);
}
// a / b, snapped to an integer within an ulp or two: sin and cos of 45
// degrees differ in their last digit, and the tie-break needs exactly 1.
function ratio(a: number, b: number): number {
  const v = a / b;
  const r = Math.round(v);
  return Math.abs(v - r) < 1e-9 ? r : v;
}

// A box this size or smaller stands on a point (tree, hedge, fountain,
// rooftop unit). Two small boxes overlap on screen only if their origins are
// within a tile or two, which keeps this from being O(n^2) over the trees.
const SMALL = 1;
function isSmall(b: DepthBox): boolean {
  return b.w <= SMALL && b.h <= SMALL;
}
// How far the neighbourhood scan reaches, in tiles. Two, not one: boxes sit
// at fractional coordinates, and a one-tile footprint's screen bounding box is
// at most sqrt2 tiles a side at any azimuth.
const NEIGHBOURHOOD = 2;

// A binary heap of indices ordered by the tie-break key, so Kahn's algorithm
// releases ready items in tie-break order.
function keyHeap(keyOf: (i: number) => number) {
  const h: number[] = [];
  const swap = (a: number, b: number) => { const t = h[a]; h[a] = h[b]; h[b] = t; };
  return {
    get size(): number { return h.length; },
    push(i: number): void {
      h.push(i);
      for (let c = h.length - 1; c > 0;) {
        const p = (c - 1) >> 1;
        if (keyOf(h[p]) <= keyOf(h[c])) break;
        swap(p, c);
        c = p;
      }
    },
    pop(): number {
      const top = h[0];
      const last = h.pop()!;
      if (h.length > 0) {
        h[0] = last;
        for (let p = 0;;) {
          const l = p * 2 + 1; const r = l + 1;
          let m = p;
          if (l < h.length && keyOf(h[l]) < keyOf(h[m])) m = l;
          if (r < h.length && keyOf(h[r]) < keyOf(h[m])) m = r;
          if (m === p) break;
          swap(p, m);
          p = m;
        }
      }
      return top;
    },
  };
}

// The scene in painter's order, back to front. Returns the same objects,
// reordered.
//
// Masses (a few dozen buildings) are compared pairwise; small things
// (hundreds of trees and props) against every mass, and with each other only
// within NEIGHBOURHOOD. A full scene costs a few milliseconds, and the caller
// memoises it on the campus state.
export function depthOrder<T extends DepthBox>(items: readonly T[], ax: Axes = cameraAxes()): T[] {
  const n = items.length;
  if (n < 2) return items.slice();

  // after[i] holds the items that must be drawn AFTER item i.
  const after: number[][] = Array.from({ length: n }, () => []);
  const indegree = new Uint32Array(n);
  const link = (first: number, second: number) => {
    after[first].push(second);
    indegree[second] += 1;
  };
  const relate = (i: number, j: number) => {
    const v = occludes(items[i], items[j], ax);
    if (v === 1) link(j, i);
    else if (v === -1) link(i, j);
  };

  const large: number[] = [];
  const small: number[] = [];
  for (let i = 0; i < n; i++) (isSmall(items[i]) ? small : large).push(i);

  // Mass against mass, and every small thing against every mass.
  for (let a = 0; a < large.length; a++) {
    for (let b = a + 1; b < large.length; b++) relate(large[a], large[b]);
  }
  for (const s of small) for (const l of large) relate(s, l);

  // Small against small, within NEIGHBOURHOOD. Without this a tree free of
  // every building could be released ahead of one waiting behind a hall.
  const buckets = new Map<string, number[]>();
  for (const s of small) {
    const key = `${Math.floor(items[s].row)},${Math.floor(items[s].col)}`;
    const at = buckets.get(key);
    if (at) at.push(s); else buckets.set(key, [s]);
  }
  for (const s of small) {
    const r0 = Math.floor(items[s].row); const c0 = Math.floor(items[s].col);
    for (let dr = -NEIGHBOURHOOD; dr <= NEIGHBOURHOOD; dr++) {
      for (let dc = -NEIGHBOURHOOD; dc <= NEIGHBOURHOOD; dc++) {
        for (const o of buckets.get(`${r0 + dr},${c0 + dc}`) ?? []) {
          if (o > s) relate(s, o);   // each pair once
        }
      }
    }
  }

  const ready = keyHeap((i) => nearest(items[i], ax));
  for (let i = 0; i < n; i++) if (indegree[i] === 0) ready.push(i);

  const out: T[] = [];
  const drawn = new Uint8Array(n);
  while (out.length < n) {
    if (ready.size === 0) {
      // Unreachable for this map's footprints (the gate keeps the relation
      // consistent; test/depth-sort.test.ts sweeps for cycles). Kept so a
      // cycle releases the rest in tie-break order rather than dropping a
      // building off the map.
      let fallback = -1;
      for (let i = 0; i < n; i++) {
        if (drawn[i]) continue;
        if (fallback < 0 || nearest(items[i], ax) < nearest(items[fallback], ax)) fallback = i;
      }
      if (fallback < 0) break;
      indegree[fallback] = 0;
      ready.push(fallback);
    }
    const u = ready.pop();
    if (drawn[u]) continue;
    drawn[u] = 1;
    out.push(items[u]);
    for (const v of after[u]) {
      indegree[v] -= 1;
      if (indegree[v] === 0 && !drawn[v]) ready.push(v);
    }
  }
  return out;
}
