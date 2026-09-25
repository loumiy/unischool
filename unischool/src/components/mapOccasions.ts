import { createContext } from 'react';
import type { GameState, SchoolColors } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { OCCASIONS } from '../systems/athletics/season';

// What the calendar puts on the map for a week: crowds in the stands of a
// venue whose team plays that week, and the college's colors on the lamps in
// commencement week. Read through contexts, so a game week redraws the stands
// and a commencement the lamps, never the rest of the scene.

// Weeks left on each site, by Buildable id: a site's progress bar and a
// landmark's stage read it, so a week's countdown redraws them alone.
export const DevelopingContext = createContext<GameState['developing']>({});
// The college's name, for what carries it (the triumphal gate).
export const CollegeNameContext = createContext('');
// The college's colors, for the flags on its civic buildings.
export const ColorsContext = createContext<SchoolColors>({ primary: '#7a2e26', secondary: '#e0b64a' });

// The venues with a crowd this week, by Buildable id. Empty most weeks.
export const CrowdContext = createContext<ReadonlySet<string>>(new Set());
// The venue a stand belongs to, set round each building and its props.
export const VenueContext = createContext<string | null>(null);
// The college's colors in commencement week, else null.
export const BannerContext = createContext<SchoolColors | null>(null);

// The season's dated home occasions (athletics/season.ts's OCCASIONS).
const GAME_WEEKS = new Set(OCCASIONS.map((o) => o.week));

// A venue fills when a team plays at home in its category this week.
export function crowdedVenues(s: GameState): string[] {
  if (!GAME_WEEKS.has(s.clock.week)) return [];
  const playing = new Set(s.orgs.teams.filter((t) => t.status === 'active').map((t) => t.venueCategory));
  if (playing.size === 0) return [];
  return Object.keys(s.placements).filter((id) => {
    const t = s.tech.find((x) => x.id === id);
    return t !== undefined && t.status === 'done' && t.facilityType !== undefined && playing.has(t.facilityType);
  });
}

// Commencement: the last fortnight of the year, before the summer.
export function isCommencement(s: GameState): boolean {
  return s.clock.week >= WEEKS_PER_YEAR - 1;
}
