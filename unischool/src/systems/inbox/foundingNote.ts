import { WEEKS_PER_YEAR, type GameState, type LogEntry } from '../../state/types';
import { FOUNDING_NOTES, FOUNDING_NOTE_WEEKS } from '../../data/foundingNotes';
import { STARTING_DORM_ID } from '../../data/campusData';
import { fillLine } from '../../data/logWords';

// The founding years' notes (Plan 70I, data/foundingNotes.ts): the
// college's first residence, a letter in the inbox (Plan 77) from the week
// it happens in years 1 and 2. Read off the log, so it needs nothing saved.

const FOUNDING_YEARS = 2;
const weekOf = (l: { year: number; week: number }) => (l.year - 1) * WEEKS_PER_YEAR + l.week;

export interface FoundingNote {
  id: keyof typeof FOUNDING_NOTES;
  year: number;
  week: number;
  title: string;
  text: string;
  // Within FOUNDING_NOTE_WEEKS of its moment: new enough to arrive unread.
  fresh: boolean;
}

// Every founding note the log still holds, newest first. Exported for the
// content test.
export function foundingNotes(s: GameState): FoundingNote[] {
  const now = weekOf(s.clock);
  // The log is newest first: the earliest match is the last.
  const firstOf = (test: (l: LogEntry) => boolean) => [...s.log].reverse().find(test);
  const out: FoundingNote[] = [];
  const residence = firstOf((l) => l.topic === 'building' && l.subject === STARTING_DORM_ID && l.year <= FOUNDING_YEARS);
  if (residence) {
    const dorm = s.tech.find((t) => t.id === STARTING_DORM_ID)?.name ?? 'the first residence hall';
    out.push(note('firstResidence', residence, fillLine(FOUNDING_NOTES.firstResidence.text, { dorm }), now));
  }
  return out.sort((a, b) => weekOf(b) - weekOf(a));
}

function note(id: FoundingNote['id'], l: LogEntry, text: string, now: number): FoundingNote {
  return { id, year: l.year, week: l.week, title: FOUNDING_NOTES[id].title, text, fresh: now - weekOf(l) < FOUNDING_NOTE_WEEKS };
}
