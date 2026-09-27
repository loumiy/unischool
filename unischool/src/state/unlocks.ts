import type { GameState, Vernacular } from './types';

// THE BONUS VERNACULARS' UNLOCKS: four architectures a run earns for the
// runs after it (buildingSpec.ts's BONUS_VERNACULAR_CHOICES). Kept in their
// own storage key, like the hall of fame (hall.ts), so a new run's save or
// a full hall never takes one away. Checked whenever the game saves and
// when a finished run is hung: each is something the run did, read off the
// state, so a run that reaches one mid-way keeps it even if it is abandoned.

export const UNLOCKS_KEY = 'unischool.unlocks';

export type BonusVernacular = 'tudor' | 'italianate' | 'secondEmpire' | 'artDeco';

export interface Unlock {
  id: BonusVernacular;
  // What the founding screen says a locked set asks for.
  condition: string;
  earned: (s: GameState) => boolean;
}

// Beds on campus to earn Tudor: a residential college's worth.
export const TUDOR_BEDS = 2_000;

const built = (s: GameState, facilityType: string) =>
  s.tech.some((t) => t.facilityType === facilityType && t.status === 'done');

export const UNLOCKS: Unlock[] = [
  {
    id: 'tudor',
    condition: `House ${TUDOR_BEDS.toLocaleString('en-US')} students on campus.`,
    earned: (s) => s.students.capacity >= TUDOR_BEDS,
  },
  {
    id: 'italianate',
    condition: 'Open the Art Gallery.',
    earned: (s) => built(s, 'artGallery'),
  },
  {
    id: 'secondEmpire',
    condition: 'Become a university.',
    earned: (s) => s.self.suffix === 'University',
  },
  {
    id: 'artDeco',
    condition: 'Build the football stadium and beat a rival.',
    earned: (s) => built(s, 'footballStadium') && Object.values(s.orgs.rivalries).some((r) => r.wins > 0),
  },
];

export function unlockOf(v: Vernacular): Unlock | undefined {
  return UNLOCKS.find((u) => u.id === v);
}

export function readUnlocks(): BonusVernacular[] {
  try {
    const raw = localStorage.getItem(UNLOCKS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? UNLOCKS.map((u) => u.id).filter((id) => parsed.includes(id))
      : [];
  } catch {
    return [];
  }
}

// Whether a set can be chosen at founding: the five founding sets always,
// a bonus set once some run has earned it.
export function isUnlocked(v: Vernacular, unlocked: readonly Vernacular[] = readUnlocks()): boolean {
  return unlockOf(v) === undefined || unlocked.includes(v);
}

// Writes whatever this run has earned; returns the sets newly unlocked.
export function recordUnlocks(s: GameState): BonusVernacular[] {
  const have = readUnlocks();
  const fresh = UNLOCKS.filter((u) => !have.includes(u.id) && u.earned(s)).map((u) => u.id);
  if (fresh.length === 0) return [];
  try {
    localStorage.setItem(UNLOCKS_KEY, JSON.stringify([...have, ...fresh]));
    return fresh;
  } catch {
    return [];
  }
}
