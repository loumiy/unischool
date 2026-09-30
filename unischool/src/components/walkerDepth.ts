// Where a walker goes in the scene's paint order (Plan 83D): the canvas map
// draws the crowd inside the depth order (depthSort.ts), so a building,
// tree or prop nearer the camera covers a figure behind it by being drawn
// after it, at every frame, turns included. Replaces Plan 42's clips.
//
// Pure geometry, as depthSort.ts: no React, no canvas.

import type { DepthBox } from './depthSort';

interface Axes { cosA: number; sinA: number }

// Is the thing on `b` nearer the camera than a walker at (wc, wr)? The
// relation depthSort.ts paints by, for a point rather than a box (Plan 42's
// nearerThanWalker): a box separated from the point along a grid axis is
// nearer when it lies further along that axis toward the camera; a point
// inside a footprint (a walker on a door's step, fading in) is in front of
// it. A small thing (a tree, a lamp) stands at its middle, and is nearer
// when that point is further along the way toward the camera.
export function nearerThanWalker(b: DepthBox, wc: number, wr: number, ax: Axes): boolean {
  const { sinA, cosA } = ax;
  if (b.w <= 1 && b.h <= 1) {
    const c = b.col + b.w / 2; const r = b.row + b.h / 2;
    return c * sinA + r * cosA > wc * sinA + wr * cosA;
  }
  if (b.col >= wc) return sinA > 0;
  if (wc >= b.col + b.w) return sinA < 0;
  if (b.row >= wr) return cosA > 0;
  if (wr >= b.row + b.h) return cosA < 0;
  return false;
}

// The paint-order slot for a walker at (wc, wr): the index of the first
// thing nearer the camera among `candidates` (indices into the scene's
// order, ascending: the things whose drawing reaches the figure), or the
// scene's length when none is. The walker is drawn just before that thing.
export function walkerSlot(boxes: readonly DepthBox[], candidates: readonly number[], wc: number, wr: number, ax: Axes): number {
  for (const i of candidates) if (nearerThanWalker(boxes[i]!, wc, wr, ax)) return i;
  return boxes.length;
}
