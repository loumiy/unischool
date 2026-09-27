import { WEEKS_PER_YEAR } from './types';

// How deep into winter the week is, 0 to 1 (Plan 76D, review G7-3). The
// game's year runs weeks 1–26 the Fall Term and 27–52 the Spring Term, the
// summer beat at week 52, so winter is the turn of the terms: it sets in
// from week 17, is deepest from week 24 to week 29 (while the map's snow
// lies deepest, components/seasons.ts), and is gone by week 36. The events'
// winter conditions and the ambience's wind read it; it used to center on
// week 52, the summer.
export const WINTER_FROM = 17;
export const WINTER_DEEP_FROM = 24;
export const WINTER_DEEP_TO = 29;
export const WINTER_TO = 36;

export function winterDepth(week: number): number {
  const w = ((Math.round(week) - 1) % WEEKS_PER_YEAR + WEEKS_PER_YEAR) % WEEKS_PER_YEAR + 1;
  if (w < WINTER_DEEP_FROM) return Math.max(0, (w - WINTER_FROM) / (WINTER_DEEP_FROM - WINTER_FROM));
  if (w > WINTER_DEEP_TO) return Math.max(0, (WINTER_TO - w) / (WINTER_TO - WINTER_DEEP_TO));
  return 1;
}

// Weeks into the Spring Term, 1 at week 27; the Fall Term reads 0.
export function springTermWeek(week: number): number {
  return week > WEEKS_PER_YEAR / 2 ? week - WEEKS_PER_YEAR / 2 : 0;
}
