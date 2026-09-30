// Whether a placed building is on the map's screen (Plan 70H). CampusMap
// registers the reading; Toasts.tsx asks it, so a building finished where
// the player can see it is not announced twice. With no map mounted,
// nothing is on screen.

type Probe = (buildableId: string) => boolean;
let probe: Probe | null = null;

export function setMapProbe(next: Probe | null): void {
  probe = next;
}

export function onMapScreen(buildableId: string): boolean {
  return probe?.(buildableId) ?? false;
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
  // The canvas's last frame's time in ms, and everything in the scene it
  // has not been able to draw since it started, by name (null on the SVG
  // map).
  frame(): { ms: number; unsupported: Record<string, number> } | null;
}

export function setMapReview(review: MapReview | null): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { __campusMap?: MapReview };
  if (review) w.__campusMap = review;
  else delete w.__campusMap;
}
