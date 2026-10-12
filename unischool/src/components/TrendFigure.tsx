import type { ReactNode } from 'react';

// ---------------------------------------------------------------------
// A figure and the way it is moving (Plan 98B, the owner's answer on
// targets against actuals): the actual value, never the target it moves
// toward, with an arrow for this week's change. ▲ rising, ▼ falling,
// nothing when it holds; a heavier arrow for a fast move.
// ---------------------------------------------------------------------

export type Trend = 'up' | 'down' | 'steady';

// A weekly change smaller than `floor` reads as holding: it would not move
// the figure as shown.
export function trendOf(change: number, floor: number): Trend {
  if (change >= floor) return 'up';
  if (change <= -floor) return 'down';
  return 'steady';
}

// The week's movement in words, for a note or a tooltip: "Rising about 0.3
// a week", "Holding steady".
export function trendWords(change: number, floor: number, digits = 1): string {
  const trend = trendOf(change, floor);
  if (trend === 'steady') return 'Holding steady';
  const size = Math.abs(change).toFixed(digits);
  return `${trend === 'up' ? 'Rising' : 'Falling'} about ${size} a week`;
}

export function TrendArrow({ change, floor, fast, digits = 1 }: {
  change: number; floor: number; fast: number; digits?: number;
}) {
  const trend = trendOf(change, floor);
  if (trend === 'steady') return null;
  const words = trendWords(change, floor, digits);
  const quick = Math.abs(change) >= fast;
  return (
    <span className={`trend-arrow ${trend}${quick ? ' fast' : ''}`} role="img" aria-label={words} title={words}>
      {trend === 'up' ? '▲' : '▼'}
    </span>
  );
}

// A value and its arrow, side by side.
export function TrendFigure({ value, change, floor, fast, digits }: {
  value: ReactNode; change: number; floor: number; fast: number; digits?: number;
}) {
  return (
    <span className="trend-figure">
      {value}
      <TrendArrow change={change} floor={floor} fast={fast} digits={digits} />
    </span>
  );
}

// The two figures that move toward a target each week, and how much
// movement each counts. Between summers prestige only trembles toward the
// year's grade, a few hundredths a week, so its floor is low enough for the
// arrow to say which way; a point a week is fast for either.
export const PRESTIGE_TREND = { floor: 0.005, fast: 1, digits: 2 } as const;
export const SATISFACTION_TREND = { floor: 0.05, fast: 1, digits: 1 } as const;
