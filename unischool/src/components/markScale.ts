// The size the map's marks hold on screen (Plan 126 J). The hall pips, the
// lab's mark, the full-residence mark and the building labels are SVG in the
// map's own units, so they once grew and shrank with the zoom: a pip was
// 5 px at the view a year-15 campus opens on, a label 80 px four steps in.
// Each now takes a counter-scale about its own anchor, so on screen it is
// drawn as if the zoom were held inside a band: below the band's low end it
// stops shrinking, above its high end it stops growing, and inside it the
// mark moves with the map as it always did.
//
// The counter-scale reaches the marks as CSS custom properties on the map's
// world group (CampusMap.tsx's applyView writes them when the zoom changes;
// styles.css's .campus-k-* read them), so a zoom re-renders nothing and a
// pan writes nothing. The one thing a zoom does change in React is whether
// a hall draws its row of pips or one mark, which each hall reads from a
// ZoomStore as a boolean, so only a hall that flips is drawn again.

export type ZoomBand = readonly [low: number, high: number];

// A pip is 13 units across and its plate 19 high: 9.75 to 16.25 px a pip,
// the row's plate 14 to 24 px high.
export const PIP_ZOOM: ZoomBand = [0.75, 1.25];
// The lab's disc is 33 units across and the full residence's 31: 20 to 28 px
// and 19 to 26 px.
export const DISC_ZOOM: ZoomBand = [0.6, 0.85];
// A label's face is 19 to 34 units: 10 to 19 px at the low end, 14 to 26 px
// at the high one.
export const LABEL_ZOOM: ZoomBand = [0.55, 0.75];

// What a mark is scaled by at `zoom` so it is drawn as at the nearest zoom
// inside `band`.
export function heldScale(zoom: number, band: ZoomBand): number {
  if (!(zoom > 0)) return 1;
  return Math.max(band[0], Math.min(band[1], zoom)) / zoom;
}

// The share of its roof's width a hall's row of pips may take before the
// row gives way to one mark. The plan's rule was 1 (a row wider than its
// roof). At 1 a 7x5 hall's row ran from edge to edge of its roof at the
// widest zoom a laptop reaches (80 px on 82), against its neighbours'
// marks, and the one mark was never drawn there; at three quarters a hall
// is one mark from a step wider than the opening view of a built-out
// campus (under a zoom of 0.33, or 0.38 with the offer's flag in the row).
export const HALL_ROW_FIT = 0.75;

// Whether a row `rowWidth` map units wide, drawn at the pips' held scale,
// fits a roof `roofWidth` map units wide at `zoom`. Both are on screen at
// `zoom`, so only the held scale is left of it.
export function hallRowFits(rowWidth: number, roofWidth: number, zoom: number): boolean {
  return rowWidth * heldScale(zoom, PIP_ZOOM) <= roofWidth * HALL_ROW_FIT;
}

// The map's zoom, for the few things that read it in React. The map sets it
// as it writes the view; a reader subscribes (useSyncExternalStore) with a
// snapshot of its own, so it is drawn again only when its answer changes.
export interface ZoomStore {
  get(): number;
  set(zoom: number): void;
  subscribe(listener: () => void): () => void;
}
export function createZoomStore(initial = 1): ZoomStore {
  let zoom = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => zoom,
    set(next) {
      if (next === zoom) return;
      zoom = next;
      for (const l of listeners) l();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
