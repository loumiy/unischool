import type { InboxItem } from './inbox';

// ---------------------------------------------------------------------
// NO DECISION PASSES UNSEEN (Plan 78E): when the shell pauses the clock for
// the inbox. Three rules, each a UI clock action (the same as the player
// pressing pause), none a change to the simulation:
//
//   arrival     — with Settings' "Pause for an urgent matter" on (the
//                 default), a new matter short of time (two weeks or less
//                 to answer: Plan 116B, the third review's C4-4) pauses the
//                 clock. With it off, the same arrival eases 2×, 4× and 8×
//                 to 1× instead (easesOnArrival, Plan 35's ease). A matter
//                 with more weeks, or no deadline, only says it arrived.
//                 A matter short of time is first seen in its final week
//                 (weeksToAnswer), so the rule below usually pauses the
//                 clock for it too, whatever the setting.
//   final week  — whatever the setting, a matter that reaches its final
//                 week without having been opened pauses it, once. It
//                 catches the matters the arrival let pass, left unread.
//   news        — with Settings' "Pause for news" on (off by default), a
//                 new celebration or research report pauses it (Plan 95T:
//                 the news that once stopped the clock is a letter).
//
// None acts while a stop or the walkthrough holds the clock: the stop's
// inbox already lists the matter, and a final week reached under a hold is
// paused for once the hold lifts. "Opened" is the view's to say (the
// reading pane showed it, or its arrival's Open was pressed), except that a
// demand noted in the save counts too. Pure, for the test and for the
// harness's pause count (sim/harness/pauses.ts); App.tsx keeps the memory
// between snapshots.
// ---------------------------------------------------------------------

export interface UnseenMemory {
  // The matters and the news in the last snapshot, to tell what arrived.
  known: ReadonlySet<string>;
  // The matters whose final week has paused the clock.
  warned: ReadonlySet<string>;
}

export interface UnseenInput {
  items: readonly InboxItem[];
  pauseOnArrival: boolean;
  pauseForNews: boolean;
  // A stop or the walkthrough holds the clock.
  held: boolean;
  opened: ReadonlySet<string>;
}

export type UnseenReason = 'arrival' | 'final-week' | 'news';

export interface UnseenOutcome {
  pause: boolean;
  reason: UnseenReason | null;
  memory: UnseenMemory;
}

// A matter's last week to answer: an inline event takes its answer when its
// weeks run out (catalogueEngine.ts), so one week left is the last of them.
export function inFinalWeek(i: InboxItem): boolean {
  return i.weeksLeft !== undefined && i.weeksLeft <= 1;
}

// A matter short of time: the weeks to answer at or under which its arrival
// pauses the clock (Plan 116B). Most of the catalogue gives three to six,
// and those wait for their final week.
export const SHORT_OF_TIME_WEEKS = 2;

// The weeks a matter gives to answer, counting the week it is in.
// `weeksLeft` counts the weeks after it: a matter raised in a week's tick
// is first seen once the clock has turned, so a two-week event arrives
// with one left, and its answer is taken in the tick of the week after.
export function weeksToAnswer(i: InboxItem): number | undefined {
  return i.weeksLeft === undefined ? undefined : i.weeksLeft + 1;
}
export function shortOfTime(i: InboxItem): boolean {
  const weeks = weeksToAnswer(i);
  return weeks !== undefined && weeks <= SHORT_OF_TIME_WEEKS;
}

// A matter short of time that was not in the last snapshot.
function urgentArrival(before: UnseenMemory | null, matters: readonly InboxItem[]): boolean {
  return before !== null && matters.some((i) => i.unread && !before.known.has(i.id) && shortOfTime(i));
}

// Whether the player has had the matter in front of them.
export function matterOpened(i: InboxItem, opened: ReadonlySet<string>): boolean {
  return opened.has(i.id) || !i.unread;
}

// `before` is null for the first snapshot of a run (a load, a new game):
// what the college already holds then has not arrived.
export function unseenPause(before: UnseenMemory | null, input: UnseenInput): UnseenOutcome {
  const matters = input.items.filter((i) => i.tier === 'decide');
  const news = input.items.filter((i) => i.kind === 'news');
  const known = new Set([...matters, ...news].map((i) => i.id));
  // Kept only for the matters still waiting, so the memory never grows.
  const warned = new Set([...(before?.warned ?? [])].filter((id) => known.has(id)));
  const memory = { known, warned };
  if (input.held) return { pause: false, reason: null, memory };

  let reason: UnseenReason | null = null;
  if (input.pauseOnArrival && urgentArrival(before, matters)) reason = 'arrival';
  else if (before && input.pauseForNews && news.some((i) => i.unread && !before.known.has(i.id))) reason = 'news';
  for (const i of matters) {
    if (!inFinalWeek(i) || warned.has(i.id) || matterOpened(i, input.opened)) continue;
    // One pause covers every matter it catches, the arrival's included.
    warned.add(i.id);
    reason ??= 'final-week';
  }
  return { pause: reason !== null, reason, memory };
}

// With the setting off, the arrival that would have paused the clock eases
// it to 1× instead (Plan 35's ease, which once followed every new event:
// Plan 116B). Never under a hold, as the pause: the stop's inbox lists the
// matter, and its final week still pauses the clock. `before` is the
// memory unseenPause was given for the same snapshot.
export function easesOnArrival(before: UnseenMemory | null, input: Pick<UnseenInput, 'items' | 'pauseOnArrival' | 'held'>): boolean {
  if (input.pauseOnArrival || input.held) return false;
  return urgentArrival(before, input.items.filter((i) => i.tier === 'decide'));
}

// The matters opened, kept for the page's session (Plan 95AA, the second
// review's H7-4): a reload reads them back, so a matter opened before it
// does not pause the clock again in its final week. Kept under the run
// (the college's name, as App.tsx tells runs apart), so another run read
// in this tab starts with none. Every read and write is wrapped: storage
// that is blocked only loses the convenience.
const OPENED_KEY = 'unischool.opened';

type SessionStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const sessionStore = (): SessionStore | null => (typeof sessionStorage === 'undefined' ? null : sessionStorage);

export function readOpened(run: string, store: SessionStore | null = sessionStore()): ReadonlySet<string> {
  try {
    const raw = store?.getItem(OPENED_KEY);
    if (!raw) return new Set();
    const kept = JSON.parse(raw) as { run?: unknown; ids?: unknown };
    if (kept.run !== run || !Array.isArray(kept.ids)) return new Set();
    return new Set(kept.ids.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

export function keepOpened(run: string, opened: ReadonlySet<string>, store: SessionStore | null = sessionStore()): void {
  try {
    store?.setItem(OPENED_KEY, JSON.stringify({ run, ids: [...opened] }));
  } catch {
    // Not kept: a reload forgets them, as before.
  }
}

export function forgetOpened(store: SessionStore | null = sessionStore()): void {
  try {
    store?.removeItem(OPENED_KEY);
  } catch {
    // Nothing to do.
  }
}

// The countdown, said one way in the list and the reading pane: the last
// week is the final week. Nothing waits at zero (an event takes its answer
// on that week's turn), but it keeps a label.
export function dueLabel(weeksLeft: number, otherwise: (weeks: number) => string): string {
  if (weeksLeft <= 0) return 'This week';
  if (weeksLeft === 1) return 'Final week';
  return otherwise(weeksLeft);
}

// The "To decide" filter's count: the matters, not the stop, which has its
// own tier ("The clock waits") pinned above them. A demand once noted is a
// goal on the list, as on the toolbar's button.
export function toDecideCount(items: readonly InboxItem[]): number {
  return items.filter((i) => i.tier === 'decide' && !((i.kind === 'demand' || i.kind === 'gift') && !i.unread)).length;
}
