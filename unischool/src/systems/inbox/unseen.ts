import type { InboxItem } from './inbox';

// ---------------------------------------------------------------------
// NO DECISION PASSES UNSEEN (Plan 78E): when the shell pauses the clock for
// the inbox. Three rules, each a UI clock action (the same as the player
// pressing pause), none a change to the simulation:
//
//   arrival     — with Settings' "Pause when a matter arrives" on (the
//                 default), a new matter to decide pauses the clock.
//   final week  — whatever the setting, a matter that reaches its final
//                 week without having been opened pauses it, once.
//   news        — with Settings' "Pause for news" on (off by default), a
//                 new celebration or research report pauses it (Plan 95T:
//                 the news that once stopped the clock is a letter).
//
// Neither acts while a stop or the walkthrough holds the clock: the stop's
// inbox already lists the matter, and a final week reached under a hold is
// paused for once the hold lifts. "Opened" is the view's to say (the
// reading pane showed it, or its arrival's Open was pressed), except that a
// demand noted in the save counts too. Pure, for the test; App.tsx keeps
// the memory between snapshots.
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
  if (before && input.pauseOnArrival && matters.some((i) => i.unread && !before.known.has(i.id))) reason = 'arrival';
  else if (before && input.pauseForNews && news.some((i) => i.unread && !before.known.has(i.id))) reason = 'news';
  for (const i of matters) {
    if (!inFinalWeek(i) || warned.has(i.id) || matterOpened(i, input.opened)) continue;
    // One pause covers every matter it catches, the arrival's included.
    warned.add(i.id);
    reason ??= 'final-week';
  }
  return { pause: reason !== null, reason, memory };
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
  return items.filter((i) => i.tier === 'decide' && !(i.kind === 'demand' && !i.unread)).length;
}
