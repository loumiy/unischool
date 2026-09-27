import { useEffect, useRef, useState } from 'react';
import type { GameState, LogEntry } from '../state/types';
import { linesSince } from './audio/director';
import { onMapScreen } from './mapProbe';
import { playerRank } from '../systems/rivals/rivalsSystem';
import { schoolFoundedKey } from '../systems/techtree/schools';
import { schoolMark } from '../data/schoolPalette';
import { inboxItems } from '../systems/inbox/inbox';

// ---------------------------------------------------------------------
// Toasts (Plan 70H): short, stacked, one line each, dismissable, gone on
// their own after a few seconds. Only for moments nothing else on screen
// says: a program or a school founded, the rank moving, a building finished
// out of sight, and cash going into the red. Never for an interrupt's news.
// Read off successive snapshots, like the sound: a load or a new run is not
// news.
//
// And what arrives in the inbox (Plan 76): a matter to decide or a letter,
// as a slip with an Open button that takes the player to it, held a little
// longer than the news. Not while the inbox is open, where it arrives in
// the list itself.
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
  tone: 'good' | 'bad' | 'info' | 'matter' | 'letter';
  // An inbox item to open (Plan 76).
  open?: string;
}

type Said = Omit<Toast, 'id'>;

// What a week's news and state say, as toasts. Pure, for the test.
export function toastsFor(before: GameState, after: GameState, fresh: readonly LogEntry[], onScreen: (id: string) => boolean): Said[] {
  const out: Said[] = [];
  for (const l of [...fresh].reverse()) {
    if (l.topic === 'program') out.push({ text: l.message, tone: 'good' });
    else if (l.topic === 'milestone' && l.subject?.startsWith(schoolFoundedKey(''))) out.push({ text: l.message, tone: 'good' });
    else if (l.topic === 'building' && l.subject && !onScreen(l.subject)) out.push({ text: l.message, tone: 'info' });
  }
  const [was, now] = [playerRank(before), playerRank(after)];
  if (now !== was) out.push({ text: now < was ? `Up to #${now} in the rankings.` : `Down to #${now} in the rankings.`, tone: now < was ? 'good' : 'bad' });
  if (before.finance.cash >= 0 && after.finance.cash < 0) out.push({ text: 'The college is in the red.', tone: 'bad' });
  return out;
}

// What arrived in the inbox between two snapshots: a matter to decide or an
// unread letter it did not hold before. Pure, for the test. A seat's answer
// settles its event within the week, so it never arrives.
export function arrivalsIn(before: GameState, after: GameState): Said[] {
  const had = new Set(inboxItems(before).map((i) => i.id));
  const out: Said[] = [];
  for (const i of inboxItems(after)) {
    // A stop opens the inbox on itself (App.tsx), so it needs no slip.
    if (had.has(i.id) || i.tier === 'bulletin' || i.tier === 'hold' || !i.unread) continue;
    const text = i.tier === 'decide' && i.weeksLeft !== undefined && i.kind === 'event'
      ? `${i.from} · ${i.weeksLeft === 1 ? '1 week' : `${i.weeksLeft} weeks`} to answer: ${i.subject}`
      : `${i.from}: ${i.subject}`;
    out.push({ text, tone: i.tier === 'decide' ? 'matter' : 'letter', open: i.id });
  }
  return out;
}

// The school a week's news distinguished, if any (its banner).
export function distinguishedIn(fresh: readonly LogEntry[]): string | null {
  const line = fresh.find((l) => l.topic === 'milestone' && l.subject?.startsWith(DISTINGUISHED));
  return line ? line.subject!.slice(DISTINGUISHED.length) : null;
}

export default function Toasts({ s, inboxOpen = false, onOpenInbox }: {
  s: GameState | null;
  inboxOpen?: boolean;
  onOpenInbox?: (id: string) => void;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const last = useRef<GameState | null>(null);
  const heard = useRef<LogEntry | undefined>(undefined);
  const next = useRef(1);
  // Read inside the snapshot effect without re-running it.
  const inboxOpenRef = useRef(inboxOpen);
  useEffect(() => { inboxOpenRef.current = inboxOpen; });

  useEffect(() => {
    const before = last.current;
    last.current = s;
    if (!s) return;
    const fresh = linesSince(s.log, heard.current);
    heard.current = s.log[0];
    const sameRun = before !== null && before.self.name === s.self.name && before.clock.year <= s.clock.year;
    if (!sameRun || fresh === null || fresh.length > CATCH_UP) return;
    const school = distinguishedIn(fresh);
    if (school) {
      setBanner(school);
      window.setTimeout(() => setBanner((cur) => (cur === school ? null : cur)), BANNER_MS);
    }
    const said = [...toastsFor(before, s, fresh, onMapScreen), ...(inboxOpenRef.current ? [] : arrivalsIn(before, s))];
    if (said.length === 0) return;
    const made = said.map((t) => ({ ...t, id: next.current++ }));
    setToasts((cur) => [...cur, ...made].slice(-MOST));
    for (const t of made) window.setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== t.id)), t.open ? ARRIVAL_MS : SHOW_MS);
  }, [s]);

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
          dismiss={(id) => setToasts((cur) => cur.filter((x) => x.id !== id))}
          open={(t) => { setToasts((cur) => cur.filter((x) => x.id !== t.id)); if (t.open) onOpenInbox?.(t.open); }}
        />
      )}
    </>
  );
}

function Stack({ toasts, dismiss, open }: { toasts: Toast[]; dismiss: (id: number) => void; open: (t: Toast) => void }) {
  return (
    <ol className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <li key={t.id} className={`toast ${t.tone}`}>
          <span className="toast-text">{t.text}</span>
          {t.open && <button type="button" className="toast-open" onClick={() => open(t)}>Open</button>}
          <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>×</button>
        </li>
      ))}
    </ol>
  );
}
