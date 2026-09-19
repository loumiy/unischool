// ---------------------------------------------------------------------
// Plain-SVG line geometry for the Institutional History view's charts (see
// HistoryTab.tsx). No charting library and no new dependency: a polyline
// over a normalized series is the whole of it.
//
// This was shared with a pair of header sparklines until those were
// removed from the top bar — the trend belongs on the History view, which
// draws it at a size worth reading. What's left is the geometry itself,
// which is a chart's business either way.
//
// Every series the game plots is a YearSnapshot field (see
// state/types.ts) — one point per in-game year, oldest first.
// ---------------------------------------------------------------------

// A line needs two points to have a direction; one year of history draws
// nothing rather than a misleading flat line.
export const MIN_SERIES_POINTS = 2;

// Vertical breathing room so a peak or a trough doesn't sit exactly on the
// edge of the box and get clipped by the stroke's own width.
const DEFAULT_PAD_Y = 1.5;

// Maps a series onto an SVG `points` string, with the value range
// stretched to fill the height. A flat series (every value identical, e.g.
// prestige that hasn't moved) is drawn as a centered horizontal line rather
// than dividing by a zero range.
//
// The x-axis spans the full width by default — the last point sits at the
// right edge. `xAt`, when given, places point i at that share (0..1) of the
// width instead, which is how the History tab fixes its axis at fifty years
// (Plan 17's PR F): a run in year 23 draws its curve across the left half
// and leaves the right half for the years to come.
export function linePoints(
  values: number[], width: number, height: number, padY = DEFAULT_PAD_Y,
  xAt: (i: number) => number = (i) => i / (values.length - 1),
): string {
  if (values.length < MIN_SERIES_POINTS) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const usableHeight = height - padY * 2;

  return values
    .map((v, i) => {
      const x = Math.max(0, Math.min(1, xAt(i))) * width;
      const y = range === 0 ? height / 2 : padY + (1 - (v - min) / range) * usableHeight;
      return `${round(x)},${round(y)}`;
    })
    .join(' ');
}

// Keeps the emitted path strings short and stable rather than carrying
// full float precision into the DOM.
function round(n: number): number {
  return Math.round(n * 100) / 100;
}
