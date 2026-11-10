import { useEffect, useRef, useState } from 'react';
import type { GameState, LogEntry } from '../state/types';
import { linesSince } from './audio/director';
import { onMapScreen } from './mapProbe';
import { playerRank } from '../systems/rivals/rivalsSystem';
import { schoolFoundedKey } from '../systems/techtree/schools';
import { isSearchFind } from '../systems/faculty/facultySearch';
import { schoolMark } from '../data/schoolPalette';
import { inboxItems } from '../systems/inbox/inbox';
import { CloseIcon } from './icons';
import { getSettings } from '../settings';

// ---------------------------------------------------------------------
// Toasts (Plan 70H): short, stacked, one line each, dismissable, gone on
// their own after a few seconds. Only for moments nothing else on screen
// says: a program or a school founded, the rank moving, a building finished
// out of sight, a search's find (Plan 114G), and cash going into the red.
// Never for an interrupt's news.
// Read off successive snapshots, like the sound: a load or a new run is not
// news.
//
// And a letter that arrives in the inbox (Plan 77), as a slip with an Open
// button that takes the player to it, held a little longer than the news.
// Not while the inbox is open, where it arrives in the list itself. In year
// one a founding note or a milestone is held until it is opened or
// dismissed (Plan 78B): the first year's guidance is in those letters, and
// eight seconds is easy to miss. A slip whose arrival paused the clock
// (Settings' "Pause for news") is held too, and goes by itself once it is
// opened in the inbox or leaves it. Opening the inbox puts every arrival
// away. A matter to decide has no slip (Plan 124 C): the Inbox badge, its
// row's pill and NEXT carry it.
// ---------------------------------------------------------------------

const SHOW_MS = 6_000;
const ARRIVAL_MS = 8_000;
// A school distinguished holds the map a little longer (Plan 70H).
const BANNER_MS = 4_500;
const DISTINGUISHED = 'school-distinguished:';
const MOST = 4;
// More than this many new lines at once is a load, not a week.
const CATCH_UP = 60;

export interface Toast {
  id: number;
  text: string;
  tone: 'good' | 'bad' | 'info' | 'letter';
  // An inbox item to open (Plan 77).
  open?: string;
  // Stays until opened or dismissed (Plans 78B and 78E).
  held?: boolean;
  // What it is news of, for merging like toasts (Plan 125 D): a log topic,
  // or a letter's sender. Never drawn.
  kind?: string;
}

type Said = Omit<Toast, 'id'>;

// What a week's news and state say, as toasts. Pure, for the test.
export function toastsFor(before: GameState, after: GameState, fresh: readonly LogEntry[], onScreen: (id: string) => boolean): Said[] {
  const out: Said[] = [];
  for (const l of [...fresh].reverse()) {
    if (l.topic === 'program') out.push({ text: l.message, tone: 'good', kind: 'program' });
    else if (l.topic === 'milestone' && l.subject?.startsWith(schoolFoundedKey(''))) out.push({ text: l.message, tone: 'good', kind: 'school' });
    else if (l.topic === 'building' && l.subject && !onScreen(l.subject)) out.push({ text: l.message, tone: 'info', kind: 'building' });
    // What a search was paid for (Plan 114G); an ordinary listing stays a line.
    else if (isSearchFind(l)) out.push({ text: l.message, tone: 'good', kind: 'search' });
  }
  const [was, now] = [playerRank(before), playerRank(after)];
  if (now !== was) out.push({ text: now < was ? `Up to #${now} in the guide.` : `Down to #${now} in the guide.`, tone: now < was ? 'good' : 'bad' });
  if (before.finance.cash >= 0 && after.finance.cash < 0) out.push({ text: 'The college is in the red.', tone: 'bad' });
  return out;
}

// What arrived in the inbox between two snapshots: an unread letter it did
// not hold before. Pure, for the test. A matter to decide is the badge's,
// not a slip's (Plan 124 C).
export function arrivalsIn(before: GameState, after: GameState): Said[] {
  const had = new Set(inboxItems(before).map((i) => i.id));
  const out: Said[] = [];
  for (const i of inboxItems(after)) {
    // A stop opens the inbox on itself (App.tsx), and the summer has its
    // own call over the map (SummerCall.tsx, Plan 112C): neither needs a slip.
    if (had.has(i.id) || i.tier !== 'letter' || !i.unread) continue;
    const held = after.clock.year === 1 && (i.kind === 'founding' || i.kind === 'milestone');
    out.push({ text: `${i.from}: ${i.subject}`, tone: 'letter', open: i.id, kind: `from:${i.from}`, ...(held ? { held: true as const } : {}) });
  }
  return out;
}

// Like toasts in one week are one toast (Plan 125 D, the interface review's
// I-2: three unlocks arrived as three slips cut at the word that differed).
// The first of a kind stands for the rest, "and 2 more"; its Open goes
// where the first's would. A held slip is never merged: each waits for its
// own letter. Pure, for the test.
export function mergeLike(said: readonly Said[]): Said[] {
  const out: Said[] = [];
  const more = new Map<Said, number>();
  for (const t of said) {
    const first = t.kind && !t.held ? out.find((o) => o.kind === t.kind && o.tone === t.tone && !o.held) : undefined;
    if (first) more.set(first, (more.get(first) ?? 0) + 1);
    else out.push(t);
  }
  return out.map((t) => (more.has(t) ? { ...t, text: `${t.text.replace(/\.$/, '')}, and ${more.get(t)} more` } : t));
}

// The stack after new toasts: at most MOST, the oldest going first, but a
// held arrival is not pushed out by the news. Pure, for the test.
export function stacked(cur: readonly Toast[], made: readonly Toast[]): Toast[] {
  const all = [...cur, ...made];
  const drop = new Set<number>();
  let over = all.length - MOST;
  for (const t of all) {
    if (over <= 0) break;
    if (t.held) continue;
    drop.add(t.id);
    over -= 1;
  }
  return all.filter((t) => !drop.has(t.id));
}

// Keeps the newest few, dropping a held slip only when nothing else can go.
export function trimToasts<T extends { held?: boolean }>(list: readonly T[], most = MOST): T[] {
  const out = [...list];
  while (out.length > most) {
    const i = out.findIndex((t) => !t.held);
    out.splice(i < 0 ? 0 : i, 1);
  }
  return out;
}

// The school a week's news distinguished, if any (its banner).
export function distinguishedIn(fresh: readonly LogEntry[]): string | null {
  const line = fresh.find((l) => l.topic === 'milestone' && l.subject?.startsWith(DISTINGUISHED));
  return line ? line.subject!.slice(DISTINGUISHED.length) : null;
}

export default function Toasts({ s, inboxOpen = false, overTab = false, onOpenInbox, opened }: {
  s: GameState | null;
  inboxOpen?: boolean;
  // A tab is open (Plan 125 D): the newest toast alone, in the tab's own
  // header, where no tab keeps anything, and not over its content.
  overTab?: boolean;
  onOpenInbox?: (id: string) => void;
  // The items the player has opened (App.tsx), whose slips can go.
  opened?: ReadonlySet<string>;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const last = useRef<GameState | null>(null);
  const heard = useRef<LogEntry | undefined>(undefined);
  const next = useRef(1);
  // Read inside the snapshot effect without re-running it.
  const inboxOpenRef = useRef(inboxOpen);
  useEffect(() => { inboxOpenRef.current = inboxOpen; });
  // The inbox open: whatever arrived is there, in the list.
  useEffect(() => {
    if (inboxOpen) setToasts((cur) => (cur.some((t) => t.open) ? cur.filter((t) => !t.open) : cur));
  }, [inboxOpen]);

  useEffect(() => {
    const before = last.current;
    last.current = s;
    if (!s) return;
    // A held slip goes once its item leaves the inbox.
    setToasts((cur) => {
      if (!cur.some((t) => t.held)) return cur;
      const waiting = new Set(inboxItems(s).map((i) => i.id));
      const kept = cur.filter((t) => !t.held || waiting.has(t.open!));
      return kept.length === cur.length ? cur : kept;
    });
    const fresh = linesSince(s.log, heard.current);
    heard.current = s.log[0];
    const sameRun = before !== null && before.self.name === s.self.name && before.clock.year <= s.clock.year;
    if (!sameRun || fresh === null || fresh.length > CATCH_UP) return;
    const school = distinguishedIn(fresh);
    if (school) {
      setBanner(school);
      window.setTimeout(() => setBanner((cur) => (cur === school ? null : cur)), BANNER_MS);
    }
    const said = mergeLike([...toastsFor(before, s, fresh, onMapScreen), ...(inboxOpenRef.current ? [] : arrivalsIn(before, s))]);
    if (said.length === 0) return;
    const { pauseForNews } = getSettings();
    // A slip whose arrival paused the clock waits with it (Plan 95T).
    const waits = (t: Said) => pauseForNews && t.open?.startsWith('news:') === true;
    const made = said.map((t) => ({ ...t, id: next.current++, held: t.held || waits(t) }));
    setToasts((cur) => stacked(cur, made));
    for (const t of made) {
      if (t.held) continue;
      window.setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== t.id)), t.open ? ARRIVAL_MS : SHOW_MS);
    }
  }, [s]);

  // Opening an item in the inbox is what its held slip waited for.
  useEffect(() => {
    if (!opened) return;
    setToasts((cur) => (cur.some((t) => t.held && opened.has(t.open!)) ? cur.filter((t) => !(t.held && opened.has(t.open!))) : cur));
  }, [opened]);

  return (
    <>
      {banner && (
        // Across the map in the school's colors, with the fanfare the
        // director plays for it.
        <div className="school-banner" role="status" style={{ ['--school-hue' as string]: schoolMark(banner).hue }}>
          <span className="school-banner-motif" aria-hidden="true">{schoolMark(banner).motif}</span>
          <span>The School of {banner} is distinguished.</span>
        </div>
      )}
      {toasts.length > 0 && (
        <Stack
          toasts={toasts}
          overTab={overTab}
          dismiss={(id) => setToasts((cur) => cur.filter((x) => x.id !== id))}
          open={(t) => { setToasts((cur) => cur.filter((x) => x.id !== t.id)); if (t.open) onOpenInbox?.(t.open); }}
        />
      )}
    </>
  );
}

function Stack({ toasts, overTab, dismiss, open }: { toasts: Toast[]; overTab: boolean; dismiss: (id: number) => void; open: (t: Toast) => void }) {
  return (
    <ol className={`toasts${overTab ? ' over-tab' : ''}`} aria-live="polite">
      {toasts.map((t) => (
        <li key={t.id} className={`toast ${t.tone}`}>
          <span className="toast-text">{t.text}</span>
          {t.open && <button type="button" className="toast-open btn" onClick={() => open(t)}>Open</button>}
          <button type="button" className="close-btn" aria-label="Dismiss" onClick={() => dismiss(t.id)}><CloseIcon /></button>
        </li>
      ))}
    </ol>
  );
}
