import type { GameState, Vernacular } from './types';
import { count } from '../format';

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
  // Its name, as the founding screen's button gives it (buildingSpec.ts).
  label: string;
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
    label: 'Tudor',
    condition: `House ${count(TUDOR_BEDS)} students on campus.`,
    earned: (s) => s.students.capacity >= TUDOR_BEDS,
  },
  {
    id: 'italianate',
    label: 'Italianate',
    condition: 'Open the Art Gallery.',
    earned: (s) => built(s, 'artGallery'),
  },
  {
    id: 'secondEmpire',
    label: 'Second Empire',
    // The charter, whichever name the college keeps (Plan 78G).
    condition: 'Win a university charter.',
    earned: (s) => s.self.universityCharterOffered || s.self.suffix === 'University',
  },
  {
    id: 'artDeco',
    label: 'Art Deco',
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

// ---- Saying so (Plan 98C) ----
//
// A set earned during a run files a letter the week it is earned (useGame.ts
// checks after each week, the reducer's UNLOCK_EARNED files it), and the
// founding screen marks a set New until a college is first founded in it.
// What has been seen is its own key beside the unlocks; a browser without
// one reads every set as seen, so no set unlocked before this was built is
// marked.

export const SEEN_KEY = 'unischool.unlocks.seen';

export function readSeen(): BonusVernacular[] | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? UNLOCKS.map((u) => u.id).filter((id) => parsed.includes(id)) : null;
  } catch {
    return null;
  }
}

function writeSeen(seen: BonusVernacular[]): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    // A refused write only leaves a set marked New.
  }
}

// Marked New: unlocked, and no college founded in it since. With no seen
// list yet (`null`), everything unlocked so far counts as seen.
export function isNewUnlock(v: Vernacular, unlocked: readonly Vernacular[], seen: readonly Vernacular[] | null): boolean {
  if (unlockOf(v) === undefined || !unlocked.includes(v)) return false;
  return seen !== null && !seen.includes(v);
}

// A college founded in a set has seen it.
export function markSeen(v: Vernacular): void {
  if (unlockOf(v) === undefined) return;
  const seen = readSeen() ?? readUnlocks().filter((id) => id !== v);
  if (!seen.includes(v as BonusVernacular)) writeSeen([...seen, v as BonusVernacular]);
}

// Banks what this run has newly earned, for the weekly check. On the first
// earning in a browser with no seen list, the list starts from what was
// unlocked before, so only the new set is marked New.
export function bankUnlocks(s: GameState): BonusVernacular[] {
  if (s.sandbox) return [];
  const before = readUnlocks();
  const fresh = recordUnlocks(s);
  if (fresh.length > 0 && readSeen() === null) writeSeen(before);
  return fresh;
}

export function unlockLabel(id: string): string {
  return UNLOCKS.find((u) => u.id === id)?.label ?? id;
}
