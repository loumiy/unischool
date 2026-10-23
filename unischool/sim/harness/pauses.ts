// ---------------------------------------------------------------------
// The pauses (Plan 116A, the third review's C4-4): how often the game
// stops the running clock, counted as the play statistics count a stop,
// the speed going to paused (useGame.ts's noteStop), which a stop (an
// interrupt) never does. A harness run has no shell, so this plays the
// shell's part on each snapshot:
//
//   arrival, final week, news
//                — the inbox through unseen.ts's unseenPause on the default
//                  settings (Pause when a matter arrives on, Pause for news
//                  off), held while a stop or the walkthrough holds the
//                  clock, as App.tsx sends it.
//   summer       — the summer waiting stops the clock that ran into it
//                  (Plan 112C, App.tsx), once a summer.
//
// And the eases to 1× the setting's Off would make instead: a new event
// waiting (useGame.ts's ease, which acts under a hold too).
//
// What is opened is the player's, so two players bound it: one opens a
// matter only when the clock pauses for it, one opens every slip as it
// arrives. A matter left unopened pauses again in its final week. Under
// the rule as Plan 78E left it the two agree, but for a matter that
// arrives under a stop. The player's own presses and the front screens,
// which the statistics count too, are not here.
//
// Pure: the track is the caller's to keep between snapshots.
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import type { GameState } from '../../src/state/types';
import { catalogueOf } from '../../src/systems/events/catalogueEngine';
import { inboxItems, summerKey, type InboxItem } from '../../src/systems/inbox/inbox';
import { inFinalWeek, matterOpened, unseenPause, type UnseenMemory, type UnseenReason } from '../../src/systems/inbox/unseen';
import { openingHoldsClock } from '../../src/state/opening';
import { DEFAULT_SETTINGS } from '../../src/settings';

export type PauseReason = UnseenReason | 'summer';
export const OPENERS = ['on-pause', 'every-slip'] as const;
export type Opener = (typeof OPENERS)[number];

// What the shell would see in one snapshot.
export interface PauseView {
  items: readonly InboxItem[];
  held: boolean;
  // The summer standing, by inbox.ts's key; null when none is.
  summer: string | null;
  // Events waiting on the player (useGame.ts's `waiting`).
  waiting: number;
}

export function pauseView(s: GameState): PauseView {
  return {
    items: inboxItems(s),
    held: s.pendingInterrupt !== null || openingHoldsClock(s),
    summer: summerKey(s),
    waiting: catalogueOf(s).pending.length,
  };
}

interface OpenerTrack { memory: UnseenMemory; opened: ReadonlySet<string> }

export interface PauseTrack {
  players: Record<Opener, OpenerTrack>;
  summer: string | null;
  waiting: number;
}

export interface PauseStep {
  track: PauseTrack;
  // Why each player's clock paused this snapshot, or null.
  pauses: Record<Opener, PauseReason | null>;
  // The setting off: the clock eased to 1× instead.
  eased: boolean;
}

function stepPlayer(before: OpenerTrack | null, view: PauseView, opener: Opener): { track: OpenerTrack; reason: UnseenReason | null } {
  const opened = new Set(before?.opened ?? []);
  const matters = view.items.filter((i) => i.tier === 'decide');
  const arrived = (i: InboxItem) => before !== null && i.unread && !before.memory.known.has(i.id);
  // Read off its slip before the shell sees it: the clock never pauses for it.
  if (opener === 'every-slip') for (const i of matters) if (arrived(i)) opened.add(i.id);
  const out = unseenPause(before?.memory ?? null, {
    items: view.items,
    pauseOnArrival: DEFAULT_SETTINGS.pauseOnArrival,
    pauseForNews: DEFAULT_SETTINGS.pauseForNews,
    held: view.held,
    opened,
  });
  // The clock paused for it, so it is opened: what arrived, and what the
  // final week caught.
  if (opener === 'on-pause' && out.pause) {
    for (const i of matters) if (arrived(i) || (inFinalWeek(i) && !matterOpened(i, opened))) opened.add(i.id);
  }
  // Kept only for the matters still waiting.
  for (const id of opened) if (!out.memory.known.has(id)) opened.delete(id);
  return { track: { memory: out.memory, opened }, reason: out.reason };
}

// `before` is null for a run's first snapshot, which nothing has arrived in.
export function pauseStep(before: PauseTrack | null, view: PauseView): PauseStep {
  const summer = view.summer !== null && before !== null && view.summer !== before.summer;
  const eased = before !== null && view.waiting > before.waiting;
  const players = {} as Record<Opener, OpenerTrack>;
  const pauses = {} as Record<Opener, PauseReason | null>;
  for (const opener of OPENERS) {
    const { track, reason } = stepPlayer(before?.players[opener] ?? null, view, opener);
    players[opener] = track;
    pauses[opener] = summer ? 'summer' : reason;
  }
  return { track: { players, summer: view.summer, waiting: view.waiting }, pauses, eased };
}

// A run's tally, year by year: the pauses by player and reason, and the
// eases.
export interface PauseTally {
  pauses: Record<Opener, Record<string, Partial<Record<PauseReason, number>>>>;
  eases: Record<string, number>;
}

export function newTally(): PauseTally {
  return { pauses: { 'on-pause': {}, 'every-slip': {} }, eases: {} };
}

export function tallyStep(t: PauseTally, year: number, step: PauseStep): void {
  const y = String(year);
  for (const opener of OPENERS) {
    const reason = step.pauses[opener];
    if (reason === null) continue;
    const bucket = (t.pauses[opener][y] ??= {});
    bucket[reason] = (bucket[reason] ?? 0) + 1;
  }
  if (step.eased) t.eases[y] = (t.eases[y] ?? 0) + 1;
}
