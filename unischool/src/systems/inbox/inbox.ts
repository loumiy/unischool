import type { GameState, LogEntry } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';
import type { CatalogueEvent } from '../../data/eventCatalogueTypes';
import { absoluteWeek } from '../../data/eventData';
import { MILESTONES, CHARTER_ID } from '../../data/ladderData';
import { BOARD_LETTERS } from '../../data/boardData';
import { demandCopy } from '../../data/demandData';
import { eventById, eventText, fill } from '../events/catalogue';
import { catalogueOf, firstSentence } from '../events/catalogueEngine';
import { IDLE_CASH_AGAIN_LETTER, IDLE_CASH_LETTER } from '../finance/sweep';
import { schoolFoundedKey } from '../techtree/schools';
import { foundingNotes } from './foundingNote';

// ---------------------------------------------------------------------
// THE INBOX (Plan 76): everything addressed to the president, in one
// full-screen view (components/InboxTab.tsx), in three tiers told apart by
// form:
//
//   decide    — wants an answer or has a deadline: the catalog's inline
//               events, a student demand, a board letter with an ask. Only
//               this tier puts a number on the toolbar's button.
//   letter    — read once, kept for the record: milestones, the board's
//               distress letters, the founding notes.
//   bulletin  — the week's small news the toasts carry, filed for a term.
//
// Derived, not stored: every item is read off state the game already keeps
// (the catalog's queue, the ladder, the demand, the board's letters, the
// log), so the save format does not change. The log also holds every
// answered event, which is the Answered list.
// ---------------------------------------------------------------------

export type InboxTier = 'decide' | 'letter' | 'bulletin';

export type InboxKind = 'event' | 'demand' | 'board' | 'milestone' | 'founding' | 'bulletin';

export interface InboxItem {
  id: string;
  kind: InboxKind;
  tier: InboxTier;
  // Who it is from, as the list's small capitals say it.
  from: string;
  subject: string;
  // The first line of the body, for the list's preview.
  preview: string;
  // Absolute week it arrived (eventData.ts's absoluteWeek), for ordering.
  week: number;
  unread: boolean;
  // Decide tier: weeks to answer, and whether this is the last of them.
  weeksLeft?: number;
  urgent?: boolean;
  // What it points at: an inline event's instance, a milestone's id, a
  // board letter's id, a log line's subject.
  ref?: string;
  // A bulletin's tone, as the toast had it.
  tone?: LogEntry['kind'];
}

// A bulletin stays filed for a term (StatusHeader.tsx's two terms a year).
export const BULLETIN_WEEKS = WEEKS_PER_YEAR / 2;

export const DOMAIN_LABEL: Record<CatalogueEvent['domain'], string> = {
  board: 'The President',
  academic: 'Academic affairs',
  students: 'Student life',
  estate: 'The estate',
  advancement: 'Advancement',
};

const logWeek = (l: { year: number; week: number }) => (l.year - 1) * WEEKS_PER_YEAR + l.week;

// A letter's ask the board wants answered, not only read (sweep.ts).
export function boardAsks(id: string): boolean {
  return id === IDLE_CASH_LETTER || id === IDLE_CASH_AGAIN_LETTER;
}

// An inline event's subject: its title if it has one, else its first
// sentence, as the log names it when it is answered, without its stop.
export function eventSubject(e: CatalogueEvent, text: string): string {
  return e.title ?? firstSentence(text).replace(/\.$/, '');
}

// The list's preview: the body after the subject, when the subject is its
// first sentence, so the row does not say it twice.
function afterSubject(text: string, subject: string): string {
  const first = text.split('\n')[0];
  return first.startsWith(subject) ? first.slice(subject.length).replace(/^[.!?]?\s*/, '') || first : first;
}

// The read state the view keeps for the one letter the game does not save
// (the founding notes, read for the session: Plan 70I).
export interface InboxOptions {
  read?: ReadonlySet<string>;
}

export function inboxItems(s: GameState, opts: InboxOptions = {}): InboxItem[] {
  const now = absoluteWeek(s);
  const decide: InboxItem[] = [];
  const letters: InboxItem[] = [];

  // The catalog's inline events, waiting for an answer.
  for (const p of catalogueOf(s).pending) {
    const e = eventById(p.eventId);
    if (!e || e.kind !== 'inline') continue;
    const text = fill(eventText(e, p), p.vars);
    const weeksLeft = Math.max(0, e.timeoutWeeks - (now - p.firedWeek));
    const subject = eventSubject(e, text);
    decide.push({
      id: `event:${p.instanceId}`, kind: 'event', tier: 'decide', ref: p.instanceId,
      from: DOMAIN_LABEL[e.domain], subject, preview: afterSubject(text, subject),
      week: p.firedWeek, unread: true, weeksLeft, urgent: weeksLeft <= 1,
    });
  }

  // A student demand: a goal with a deadline, not a question. It stays in
  // the tier until met or lapsed; only while unread does it count.
  const demand = s.events.activeDemand;
  if (demand) {
    const copy = demandCopy(demand);
    const weeksLeft = Math.max(0, demand.deadlineWeek - now);
    decide.push({
      id: `demand:${demand.id}`, kind: 'demand', tier: 'decide', ref: demand.id,
      from: 'A student demand', subject: copy.headline, preview: copy.ask(demand.askName),
      week: demand.deadlineWeek, unread: s.events.demandUnread === true, weeksLeft, urgent: weeksLeft <= 1,
    });
  }

  // The board's letters: the queue is unread by definition, and "Noted"
  // takes the oldest (reducer.ts's READ_BOARD_LETTER), so only the oldest is
  // shown, as the note over the map did.
  const boardId = s.finance.distress?.letters[0];
  const board = boardId ? BOARD_LETTERS[boardId] : undefined;
  if (boardId && board) {
    const item: InboxItem = {
      id: `board:${boardId}`, kind: 'board', tier: boardAsks(boardId) ? 'decide' : 'letter', ref: boardId,
      from: 'From the board', subject: board.title, preview: board.text, week: now, unread: true,
    };
    (item.tier === 'decide' ? decide : letters).push(item);
  }

  // Every milestone reached, for the record; unread until opened.
  const unread = new Set(s.ladder.unread);
  for (const m of MILESTONES) {
    const year = s.ladder.reached[m.id];
    if (year === undefined || m.id === CHARTER_ID || m.quiet) continue;
    letters.push({
      id: `milestone:${m.id}`, kind: 'milestone', tier: 'letter', ref: m.id,
      from: `A milestone · ${m.tier}`, subject: m.name, preview: m.letter,
      week: (year - 1) * WEEKS_PER_YEAR + 1, unread: unread.has(m.id),
    });
  }

  for (const n of foundingNotes(s)) {
    const id = `founding:${n.id}`;
    letters.push({
      id, kind: 'founding', tier: 'letter', ref: n.id, from: 'The founding years', subject: n.title, preview: n.text,
      week: logWeek(n), unread: n.fresh && !(opts.read?.has(id) ?? false),
    });
  }

  decide.sort((a, b) => (a.weeksLeft ?? 0) - (b.weeksLeft ?? 0) || a.week - b.week);
  // Newest first; unread milestones of one year before read ones.
  letters.sort((a, b) => b.week - a.week || Number(b.unread) - Number(a.unread));
  return [...decide, ...letters, ...bulletins(s)];
}

// The toasts' news (Toasts.tsx's toastsFor), filed from the log for a term:
// a program or a school founded, a school distinguished, a building
// finished. Rank moves and the red are the toasts' alone: the log does not
// keep them.
export function bulletins(s: GameState): InboxItem[] {
  const now = absoluteWeek(s);
  const out: InboxItem[] = [];
  for (const l of s.log) {
    const week = logWeek(l);
    if (now - week >= BULLETIN_WEEKS) break;
    const school = l.topic === 'milestone' && (l.subject?.startsWith(schoolFoundedKey('')) || l.subject?.startsWith('school-distinguished:'));
    if (l.topic !== 'program' && l.topic !== 'building' && !school) continue;
    out.push({
      id: `bulletin:${week}:${out.length}`, kind: 'bulletin', tier: 'bulletin', ref: l.subject,
      from: 'Bulletin', subject: l.message, preview: '', week, unread: false, tone: l.kind,
    });
  }
  return out;
}

// Every event answered, by whom, newest first: the lines the catalog's
// resolve writes to the log (catalogueEngine.ts's resolveCatalogueEvent).
export function answered(s: GameState): LogEntry[] {
  return s.log.filter((l) => l.topic === 'event');
}

// What the toolbar's button says: a number for what wants an answer (red
// while any is in its last week), and a dot for unread letters.
export interface InboxBadge {
  count: number;
  urgent: boolean;
  unreadLetters: number;
}

export function inboxBadge(items: readonly InboxItem[]): InboxBadge {
  let count = 0;
  let urgent = false;
  let unreadLetters = 0;
  for (const i of items) {
    if (i.tier === 'decide') {
      // A demand once noted is a goal on the list, not a question.
      if (i.kind === 'demand' && !i.unread) continue;
      count += 1;
      if (i.urgent) urgent = true;
    } else if (i.tier === 'letter' && i.unread) unreadLetters += 1;
  }
  return { count, urgent, unreadLetters };
}
