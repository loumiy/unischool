import type { AlumniClass, GameState } from '../../state/types';

// THE ANNUAL FUND AND REUNIONS (Plan 30, from v2's alumni.ts). Each class
// gives every year: by its size, its warmth (0 at nothing, 1 at a neutral
// 50, 2 at devoted), its means (how good a class it was when it came) and
// how far it has come since it left. A reunion, every fifth year, nudges a
// class's warmth, capped: a memory can be warmed, never rewritten.

export const GIVING_PER_ALUM = 220;       // dollars a year, a neutral established alum
export const GIVING_MATURITY_YEARS = 20;  // years out before a class gives in full
export const GIVING_YOUNG_SHARE = 0.15;   // what a class gives the year it leaves, of that
export const REUNION_EVERY_YEARS = 5;
export const REUNION_COST_PER_HEAD = 90;
export const REUNION_WARMTH = 4;
export const REUNION_WARMTH_CAP = 12;

export function maturityOf(yearsOut: number): number {
  const ramp = Math.min(1, Math.max(0, yearsOut / GIVING_MATURITY_YEARS));
  return GIVING_YOUNG_SHARE + (1 - GIVING_YOUNG_SHARE) * ramp;
}

export function warmthOf(a: AlumniClass): number {
  return Math.min(100, a.warmth + a.nudged);
}

// A class gives from its second year out: the first it spends finding its
// feet. (It also keeps the summer's projection exact: the class stamped at
// commencement gives nothing in the year the admissions panel prices.)
export const GIVING_FIRST_YEAR_OUT = 2;

export function givingOf(a: AlumniClass, year: number): number {
  if (year - a.classYear < GIVING_FIRST_YEAR_OUT) return 0;
  const warmth = warmthOf(a) / 50;
  const means = 0.5 + a.quality / 100;
  return Math.round(a.size * GIVING_PER_ALUM * warmth * means * maturityOf(Math.max(0, year - a.classYear)));
}

// The year's giving, every class together.
export function annualGiving(s: GameState): number {
  return (s.alumni ?? []).reduce((t, a) => t + givingOf(a, s.clock.year), 0);
}

// ---- Reunions ----

export function reunionCost(a: AlumniClass): number {
  return Math.round(a.size * REUNION_COST_PER_HEAD);
}

// A class can be brought back in the years that are a multiple of five
// since it left, once, while its warmth has room to move.
export function canReunite(s: GameState, a: AlumniClass): boolean {
  const out = s.clock.year - a.classYear;
  return out > 0 && out % REUNION_EVERY_YEARS === 0 && a.reunionYear !== s.clock.year
    && a.nudged < REUNION_WARMTH_CAP && s.finance.cash >= reunionCost(a);
}

export function holdReunion(s: GameState, classYear: number): boolean {
  const a = (s.alumni ?? []).find((x) => x.classYear === classYear);
  if (!a || !canReunite(s, a)) return false;
  s.finance.cash -= reunionCost(a);
  a.nudged = Math.min(REUNION_WARMTH_CAP, a.nudged + REUNION_WARMTH);
  a.reunionYear = s.clock.year;
  s.log.unshift({
    year: s.clock.year, week: s.clock.week, kind: 'good',
    message: `The class of ${a.classYear} came back for its ${s.clock.year - a.classYear}-year reunion. They went home a little fonder of the place.`,
  });
  return true;
}
