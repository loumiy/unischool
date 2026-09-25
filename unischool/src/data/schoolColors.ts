import type { SchoolColors } from '../state/types';

// The school's colors: a named pair chosen at founding and never changed.
// The pair is the game's theme (styles.css's --school-primary and
// --school-secondary, written by components/theme.ts).
//
// Exactly eight pairs, because the startup screen lays them out as one even
// row (.startup-colors); no two may read as the same pair. Every pair must
// pass the contrast rule below (pinned by test/school-colors.test.ts), and
// no secondary is cream, or active chips and the focus ring would vanish on
// the cream ground.

export interface SchoolColorChoice extends SchoolColors {
  id: string;
  name: string; // "Maroon and gold" — how the startup screen labels it
}

export const SCHOOL_COLOR_PAIRS: SchoolColorChoice[] = [
  { id: 'maroon-gold', name: 'Maroon and gold', primary: '#7b1e2b', secondary: '#f2c14e' },
  { id: 'navy-gold', name: 'Navy and gold', primary: '#1f3a6b', secondary: '#e6b84a' },
  { id: 'forest-gold', name: 'Forest and gold', primary: '#1f5a3a', secondary: '#f2c14e' },
  { id: 'crimson-silver', name: 'Crimson and silver', primary: '#9b1c2e', secondary: '#d9d4c7' },
  { id: 'navy-orange', name: 'Navy and orange', primary: '#1b2a4a', secondary: '#f28c28' },
  { id: 'purple-gold', name: 'Purple and gold', primary: '#4a2a6a', secondary: '#e6b84a' },
  { id: 'black-gold', name: 'Black and gold', primary: '#1f1b17', secondary: '#e6b84a' },
  { id: 'royal-gold', name: 'Royal blue and gold', primary: '#1d3f86', secondary: '#e6b84a' },
];

// The default pair: the startup screen's initial pick and createInitialState's
// default. It matches the literal defaults in styles.css.
export const FOUNDING_COLORS: SchoolColorChoice = SCHOOL_COLOR_PAIRS[0];

// The two colors only: what University and Rival store.
export function schoolColorsOf(choice: SchoolColorChoice): SchoolColors {
  return { primary: choice.primary, secondary: choice.secondary };
}

// A rival's pair, derived deterministically from its id (as rivalData.ts
// derives its other axes). Two rivals may share a pair.
export function rivalColorsFor(id: string): SchoolColors {
  return schoolColorsOf(SCHOOL_COLOR_PAIRS[hashIndex(id, SCHOOL_COLOR_PAIRS.length)]);
}

// A pair's display name, or null if it is not in the table.
export function colorPairName(colors: SchoolColors): string | null {
  return SCHOOL_COLOR_PAIRS.find((p) => p.primary === colors.primary && p.secondary === colors.secondary)?.name ?? null;
}

// The same FNV-style hash rivalData.ts uses for its derived axes, bucketed.
// Duplicated rather than imported so this module does not depend on the
// rival table that consults it.
function hashIndex(id: string, buckets: number): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) % buckets;
}

// The WCAG contrast rule, shared by the test and the picker.

// Text on the primary is the register's cream (styles.css's
// --school-on-primary), so the test checks the color actually used.
export const TEXT_ON_PRIMARY = '#f7f2e8';
export const MIN_CONTRAST = 4.5;

export function relativeLuminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Both pairings the register leans on, at the minimum or better.
export function pairIsReadable(c: SchoolColors): boolean {
  return contrastRatio(TEXT_ON_PRIMARY, c.primary) >= MIN_CONTRAST
    && contrastRatio(c.primary, c.secondary) >= MIN_CONTRAST;
}
