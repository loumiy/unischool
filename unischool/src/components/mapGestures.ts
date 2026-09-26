// Touch on the campus map (Plan 70F): the arithmetic of a pinch, kept apart
// from CampusMap.tsx so it can be checked without a browser.

export interface View { x: number; y: number; zoom: number }
export interface Point { x: number; y: number }

export const PINCH_MIN_DISTANCE = 12; // px between fingers below which a pinch is not read

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// The view a two-finger gesture leads to: the ground that was under the
// fingers' midpoint when they came down stays under their midpoint now, and
// the zoom scales with the spread between them, clamped. `start` is the
// view when the second finger came down; points are in canvas pixels.
export function pinchView(start: View, startMid: Point, startDist: number, mid: Point, dist: number, minZoom: number, maxZoom: number): View {
  const scale = startDist >= PINCH_MIN_DISTANCE && dist >= PINCH_MIN_DISTANCE ? dist / startDist : 1;
  const zoom = Math.min(maxZoom, Math.max(minZoom, start.zoom * scale));
  const worldX = (startMid.x - start.x) / start.zoom;
  const worldY = (startMid.y - start.y) / start.zoom;
  return { x: mid.x - worldX * zoom, y: mid.y - worldY * zoom, zoom };
}
