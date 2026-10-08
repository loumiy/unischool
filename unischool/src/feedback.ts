import { BUILD_STAMP } from './build';
import { feedbackOpened, sharedInstallId, type FeedbackFrom } from './analytics/analytics';
import { getSettings } from './settings';
import type { GameState } from './state/types';
import { playerRank } from './systems/rivals/rivalsSystem';

// FEEDBACK FROM INSIDE THE GAME (Plan 97F). One form, outside the game
// (Tally), reached from the menus, the crash screen and two prompts that
// each ask once. Its link carries, as hidden fields, only what the build
// knows: the build, the year, week and rank, and the install id while
// statistics are on. Never the college's name, its mascot or anything
// else typed.
//
// The form's address is VITE_FEEDBACK_URL when a build sets it, else the
// playtest's form. It is public: anyone with the link can open the form.

const env = (import.meta as ImportMeta & { env?: { VITE_FEEDBACK_URL?: string } }).env;
export const PLAYTEST_FORM = 'https://tally.so/r/Gx2Z2p';

// The form's address from the build's setting: unset, the playtest's form;
// set empty, no form, and no links show; anything but an https address,
// none either.
export function formUrlFrom(set: string | undefined): string | null {
  const raw = set === undefined ? PLAYTEST_FORM : set.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}
export const FEEDBACK_URL: string | null = formUrlFrom(env?.VITE_FEEDBACK_URL);

export const feedbackAvailable = () => FEEDBACK_URL !== null;

// The hidden fields, by the names the form gives them.
export function feedbackFields(s: GameState | null): Record<string, string> {
  const fields: Record<string, string> = { ...BUILD_STAMP };
  if (s?.started) {
    fields.year = String(s.clock.year);
    fields.week = String(s.clock.week);
    try {
      fields.rank = String(playerRank(s));
    } catch {
      // A state too broken to rank (the crash screen's): left out.
    }
  }
  const id = sharedInstallId();
  if (id) fields.install_id = id;
  return fields;
}

export function feedbackLink(s: GameState | null): string | null {
  if (!FEEDBACK_URL) return null;
  const u = new URL(FEEDBACK_URL);
  for (const [k, v] of Object.entries(feedbackFields(s))) u.searchParams.set(k, v);
  return u.href;
}

// Opens the form in a new tab (the desktop build sends it to the system
// browser, Plan 97H). The caller saves the run first.
export function openFeedback(s: GameState | null, from: FeedbackFrom): void {
  const link = feedbackLink(s);
  if (!link) return;
  feedbackOpened(from);
  try {
    window.open(link, '_blank', 'noopener,noreferrer');
  } catch {
    // A browser that refuses: nothing lost.
  }
}

// ---- The two prompts: each asks once per install, never again ----

export type FeedbackPrompt = 'five-years' | 'final-report';
export const PROMPTS_KEY = 'unischool.feedback.asked';

function askedList(): string[] {
  try {
    const v = JSON.parse(globalThis.localStorage?.getItem(PROMPTS_KEY) ?? '[]') as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

// Whether a prompt should show: a form to send to, the setting on, and not
// asked on this install before.
export function promptDue(prompt: FeedbackPrompt): boolean {
  return feedbackAvailable() && getSettings().feedbackPrompts && !askedList().includes(prompt);
}

export function markAsked(prompt: FeedbackPrompt): void {
  const list = askedList();
  if (list.includes(prompt)) return;
  try {
    globalThis.localStorage?.setItem(PROMPTS_KEY, JSON.stringify([...list, prompt]));
  } catch {
    // Asked again next time, at worst.
  }
}

// ---- Report a bug ----

// The bug report: the same file the crash screen offers (Plan 70C), with no
// error, for a player who saw something wrong and played on.
export function bugReport(runLog: string, error: Error | null = null): string {
  let run: unknown = null;
  try {
    run = JSON.parse(runLog) as unknown;
  } catch {
    // The log could not be read: the report still names the build.
  }
  return JSON.stringify({ game: BUILD_STAMP, error: error ? `${error.name}: ${error.message}` : null, stack: error?.stack ?? null, run });
}
export const bugReportName = () => `unischool-bug-report-${Date.now()}.json`;
