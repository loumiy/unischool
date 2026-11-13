import type { GameState, InstitutionTitle, Vernacular } from './types';
import { count } from '../format';
import { graduateProgramFounded } from '../systems/events/charter';

// THE BONUS VERNACULARS' UNLOCKS, and the titles' (Plan 127, below): four
// architectures a run earns for the runs after it (buildingSpec.ts's
// BONUS_VERNACULAR_CHOICES). Kept in their own storage key, like the hall of
// fame (hall.ts), so a new run's save or a full hall never takes one away.
// Checked whenever the game saves and when a finished run is hung, never in
// a sandbox: each is something the run did, read off the state, so a run
// that reaches one mid-way keeps it even if it is abandoned.

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
    // The Institute charter, whichever name the college keeps (Plan 127,
    // D3): raised with the first lab, so its timing in a run is the old
    // charter's.
    condition: 'Open a research lab.',
    earned: (s) => s.self.charters.institute,
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
// The titles (below) are banked at the same points, and file no letter of
// their own: the charter that grants one already says so.
// A sandbox banks nothing, at a save as at the weekly check (Plan 127, D6).
export function recordUnlocks(s: GameState): BonusVernacular[] {
  if (s.sandbox) return [];
  recordTitles(s);
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

// ---- The titles (Plan 127) ----
//
// A college opens as a College, an Institute or a University (types.ts's
// InstitutionTitle), chosen at founding beside the name. A first browser has
// College only; the other two are earned in a run and open to every run
// after it, kept in their own key like the architectures. A sandbox earns
// none (D6). Each run's charter letter for a title already says so, so a
// title earned mid-run files no letter of its own.

export const TITLE_UNLOCKS_KEY = 'unischool.unlocks.titles';
export const TITLE_SEEN_KEY = 'unischool.unlocks.titles.seen';

export type UnlockableTitle = Exclude<InstitutionTitle, 'College'>;

export interface TitleUnlock {
  id: UnlockableTitle;
  // What the founding screen's dropdown says a locked title asks for.
  condition: string;
  earned: (s: GameState) => boolean;
}

export const TITLE_UNLOCKS: TitleUnlock[] = [
  {
    id: 'Institute',
    condition: 'Open a research lab in any run',
    // The Institute charter is raised with the first lab at work.
    earned: (s) => s.self.charters.institute || s.self.suffix === 'Institute',
  },
  {
    id: 'University',
    condition: 'Found a graduate program in any run',
    earned: (s) => graduateProgramFounded(s),
  },
];

export function titleUnlockOf(t: InstitutionTitle): TitleUnlock | undefined {
  return TITLE_UNLOCKS.find((u) => u.id === t);
}

type TitleListKey = typeof TITLE_UNLOCKS_KEY | typeof TITLE_SEEN_KEY;

function readTitleList(key: TitleListKey): UnlockableTitle[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? TITLE_UNLOCKS.map((u) => u.id).filter((id) => parsed.includes(id)) : null;
  } catch {
    return null;
  }
}

function writeTitleList(key: TitleListKey, list: UnlockableTitle[]): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

// The titles this browser has earned. A browser that won the old university
// charter has Second Empire, and starts with Institute (D5).
export function readTitleUnlocks(): UnlockableTitle[] {
  const have = readTitleList(TITLE_UNLOCKS_KEY) ?? [];
  const seeded = readUnlocks().includes('secondEmpire') && !have.includes('Institute') ? ['Institute' as const] : [];
  return TITLE_UNLOCKS.map((u) => u.id).filter((id) => have.includes(id) || (seeded as UnlockableTitle[]).includes(id));
}

// The titles a college can open as: College always, the others once earned.
export function openTitles(unlocked: readonly UnlockableTitle[] = readTitleUnlocks()): InstitutionTitle[] {
  return ['College', ...TITLE_UNLOCKS.map((u) => u.id).filter((id) => unlocked.includes(id))];
}

export function isTitleOpen(t: InstitutionTitle, unlocked: readonly UnlockableTitle[] = readTitleUnlocks()): boolean {
  return titleUnlockOf(t) === undefined || unlocked.includes(t as UnlockableTitle);
}

// Writes whatever titles this run has earned; returns those newly earned.
export function recordTitles(s: GameState): UnlockableTitle[] {
  if (s.sandbox) return [];
  const have = readTitleUnlocks();
  const fresh = TITLE_UNLOCKS.filter((u) => !have.includes(u.id) && u.earned(s)).map((u) => u.id);
  if (fresh.length === 0 && readTitleList(TITLE_UNLOCKS_KEY) !== null) return [];
  // The first write also keeps the Second Empire seed, so it holds whatever
  // happens to the architectures' key.
  return writeTitleList(TITLE_UNLOCKS_KEY, [...have, ...fresh]) ? fresh : [];
}

// Marked new in the dropdown: earned, and no college founded under it
// since. Unlike the architectures, every title is new to every browser, so
// no seen list yet means none seen.
export function readTitlesSeen(): UnlockableTitle[] {
  return readTitleList(TITLE_SEEN_KEY) ?? [];
}

export function isNewTitle(t: InstitutionTitle, unlocked: readonly UnlockableTitle[], seen: readonly UnlockableTitle[]): boolean {
  return titleUnlockOf(t) !== undefined && unlocked.includes(t as UnlockableTitle) && !seen.includes(t as UnlockableTitle);
}

// A college founded under a title has seen it.
export function markTitleSeen(t: InstitutionTitle): void {
  if (titleUnlockOf(t) === undefined) return;
  const seen = readTitlesSeen();
  if (!seen.includes(t as UnlockableTitle)) writeTitleList(TITLE_SEEN_KEY, [...seen, t as UnlockableTitle]);
}
