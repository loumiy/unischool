// Plain-SVG line geometry for the History view's charts (HistoryTab.tsx).
// Every series is a YearSnapshot field, one point per year, oldest first.

// One year of history draws nothing rather than a misleading flat line.
export const MIN_SERIES_POINTS = 2;

// Keeps peaks and troughs from being clipped by the stroke width.
const DEFAULT_PAD_Y = 1.5;

// Maps a series onto an SVG `points` string, stretched to fill the height; a
// flat series is a centered horizontal line. `xAt` places point i at that
// share (0..1) of the width, which is how the History tab fixes its axis at
// fifty years.
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

// Keeps the path strings short and stable.
function round(n: number): number {
  return Math.round(n * 100) / 100;
}
