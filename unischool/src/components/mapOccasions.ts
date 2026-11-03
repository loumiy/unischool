import { createContext } from 'react';
import type { GameState, SchoolColors } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { FOUNDING_COLORS, schoolColorsOf } from '../data/schoolColors';

// What the calendar puts on the map for a week: crowds in the stands of a
// venue full that week, a venue's title pennants, and the college's colors
// on the lamps in commencement week. Read through contexts, so a full week
// redraws the stands and a commencement the lamps, never the rest of the
// scene.

// Weeks left on each site, by Buildable id: a site's progress bar and a
// landmark's stage read it, so a week's countdown redraws them alone.
export const DevelopingContext = createContext<GameState['developing']>({});
// The college's name, for what carries it (the triumphal gate).
export const CollegeNameContext = createContext('');
// The college's colors, for the flags on its civic buildings.
export const ColorsContext = createContext<SchoolColors>(schoolColorsOf(FOUNDING_COLORS));

// The venues full this week, by Buildable id (mapSignals.ts's fullVenues:
// about one week in three each, off the map's own random numbers, Plan 124
// M1). Their stands fill with people and people stand about outside.
export const CrowdContext = createContext<ReadonlySet<string>>(new Set());
// The venues flying their titles' pennants (mapSignals.ts's pennantVenues).
export const PennantContext = createContext<ReadonlySet<string>>(new Set());
// The venue a stand belongs to, set round each building and its props.
export const VenueContext = createContext<string | null>(null);
// The college's colors in commencement week, else null.
export const BannerContext = createContext<SchoolColors | null>(null);

// Commencement: the last fortnight of the year, before the summer.
export function isCommencement(s: GameState): boolean {
  return s.clock.week >= WEEKS_PER_YEAR - 1;
}
