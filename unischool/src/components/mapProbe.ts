// Whether a placed building is on the map's screen (Plan 70H). CampusMap
// registers the reading; Toasts.tsx asks it, so a building finished where
// the player can see it is not announced twice. With no map mounted,
// nothing is on screen.
//
// Two maps can be mounted at once: the game's map under the title screen,
// and the title's live backdrop over it. So each map's reading is kept in
// mount order, the newest answers, and a map that unmounts takes only its
// own away (Plan 124G, the review's T-1: the backdrop's unmount on Continue
// cleared the game map's reading).

type Probe = (buildableId: string) => boolean;
const probes: Probe[] = [];

export function setMapProbe(next: Probe): void {
  probes.push(next);
}

export function clearMapProbe(mine: Probe): void {
  const i = probes.lastIndexOf(mine);
  if (i >= 0) probes.splice(i, 1);
}

export function onMapScreen(buildableId: string): boolean {
  return probes[probes.length - 1]?.(buildableId) ?? false;
}

// What the review tools read of the map (Plan 83E), as `window.__campusMap`:
// the tools test the map the player sees (the canvas, or the SVG map it
// falls back to), not the SVG's DOM. CampusMap registers it; nothing in the
// game reads it.
export interface MapReview {
  // Which map is up: the canvas, or the SVG map (`?map=svg`, or after the
  // canvas failed).
  renderer(): 'canvas' | 'svg';
  // The pan and zoom: a world point p is on screen at p * zoom + (x, y),
  // in CSS pixels from the map's corner.
  view(): { x: number; y: number; zoom: number };
  // Nothing left to draw: the map shows the settled view in full.
  settled(): boolean;
  // The building under a point of the page, as a click there would find it.
  buildingAt(clientX: number, clientY: number): string | null;
  // Each placed building, its name as the map gives it, and the middle of
  // its footprint on the page.
  buildings(): { id: string; name: string; x: number; y: number }[];
  // A point of the grid (a tile's corner; col + 0.5, row + 0.5 its middle)
  // on the page, as the current view draws it.
  tile(col: number, row: number): { x: number; y: number };
  // The canvas's last frame's time in ms, and everything in the scene it
  // has not been able to draw since it started, by name (null on the SVG
  // map).
  frame(): { ms: number; unsupported: Record<string, number> } | null;
}

const reviews: MapReview[] = [];

function showReview(): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { __campusMap?: MapReview };
  const top = reviews[reviews.length - 1];
  if (top) w.__campusMap = top;
  else delete w.__campusMap;
}

export function setMapReview(review: MapReview): void {
  reviews.push(review);
  showReview();
}

export function clearMapReview(mine: MapReview): void {
  const i = reviews.lastIndexOf(mine);
  if (i >= 0) reviews.splice(i, 1);
  showReview();
}
