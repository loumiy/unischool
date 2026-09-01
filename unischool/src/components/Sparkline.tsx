// ---------------------------------------------------------------------
// Plain-SVG line geometry, shared by the header's sparklines and the
// Institutional History view's charts (see HistoryTab.tsx). No charting
// library and no new dependency: a polyline over a normalized series is
// the whole of it, and both readers want the same handful of lines rather
// than two subtly different copies.
//
// Every series the game plots is a YearSnapshot field (see
// state/types.ts) — one point per in-game year, oldest first.
// ---------------------------------------------------------------------

// Header sparkline geometry. Deliberately tiny: it's a shape cue next to a
// stat, not a chart to read values off.
export const SPARKLINE_WIDTH = 76;
export const SPARKLINE_HEIGHT = 18;

// A line needs two points to have a direction; one year of history draws
// nothing rather than a misleading flat line.
export const MIN_SERIES_POINTS = 2;

// Vertical breathing room so a peak or a trough doesn't sit exactly on the
// edge of the box and get clipped by the stroke's own width.
const DEFAULT_PAD_Y = 1.5;

// Maps a series onto an SVG `points` string spanning the full width, with
// the value range stretched to fill the height. A flat series (every value
// identical, e.g. prestige that hasn't moved) is drawn as a centered
// horizontal line rather than dividing by a zero range.
export function linePoints(values: number[], width: number, height: number, padY = DEFAULT_PAD_Y): string {
  if (values.length < MIN_SERIES_POINTS) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const usableHeight = height - padY * 2;

  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
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

// A bare trend line, sized to sit under a header stat. It carries no axes,
// no labels and no numbers on purpose — the exact figure is the stat right
// above it; this only answers "which way, and how steadily".
export default function Sparkline({ values, title }: { values: number[]; title: string }) {
  const points = linePoints(values, SPARKLINE_WIDTH, SPARKLINE_HEIGHT);
  if (!points) return null;

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
      width={SPARKLINE_WIDTH}
      height={SPARKLINE_HEIGHT}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <polyline points={points} />
    </svg>
  );
}
