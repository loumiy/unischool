import type { LogEntry, LogTopic } from '../state/types';
import type { TabId } from './TabNav';

// ---------------------------------------------------------------------
// Which log lines become toasts, and the rules of the stack: the pure half
// of Toasts.tsx, kept apart so it can be tested without a DOM.
//
// A toast is for what never stops the clock and is still worth a glance.
// Anything an interrupt already announces stays out (a milestone, a research
// breakthrough), and so does anything the summer review sums up better
// (money, admissions). A research project concluding without an output has
// no modal, so its line needs somewhere to be seen.
// ---------------------------------------------------------------------

export const TOAST_TOPICS: ReadonlySet<LogTopic> = new Set<LogTopic>([
  'course', 'building', 'program', 'petition', 'publication', 'candidate', 'research-concluded',
]);

export const TOAST_MS = 3_000;   // each toast's life
export const TOAST_MAX = 5;      // the stack's depth; the oldest goes when a sixth arrives

export function isToastable(entry: LogEntry): boolean {
  return entry.topic !== undefined && TOAST_TOPICS.has(entry.topic);
}

// The tab a toast opens. A building finished points nowhere in particular
// — the map is already on screen behind the toast — so it returns null and
// the click only dismisses.
export function toastTarget(topic: LogTopic | undefined): TabId | null {
  switch (topic) {
    case 'course':
    case 'program':
      return 'curriculum';
    case 'petition':
      return 'students';
    case 'publication':
    case 'research-concluded':
      return 'research';
    case 'candidate':
      return 'faculty';
    default:
      return null;
  }
}

// A log entry's identity across renders. The state is structurally cloned
// on every action, so object identity is useless; the stamp plus the text
// is what a line IS. Two identical lines in one week would collapse into
// one toast, which is the right reading of them.
export function toastKey(entry: LogEntry): string {
  return `${entry.year}-${entry.week}-${entry.topic ?? ''}-${entry.message}`;
}

// The toastable lines in `log` (newest first, as s.log is kept) that are
// not in `seen`, returned OLDEST FIRST so they stack in the order they
// happened. The caller owns `seen` and seeds it with the whole log on
// mount, so a save resumed with two hundred lines does not open on two
// hundred toasts.
export function newToasts(log: readonly LogEntry[], seen: ReadonlySet<string>): LogEntry[] {
  const out: LogEntry[] = [];
  for (const entry of log) {
    const key = toastKey(entry);
    if (seen.has(key)) break; // everything older than a seen line has been seen
    if (isToastable(entry)) out.push(entry);
  }
  return out.reverse();
}

// The stack after `arrivals` land on `current`: newest at the end, the
// oldest dropped past TOAST_MAX.
export function pushToasts<T>(current: readonly T[], arrivals: readonly T[]): T[] {
  const next = [...current, ...arrivals];
  return next.length > TOAST_MAX ? next.slice(next.length - TOAST_MAX) : next;
}
