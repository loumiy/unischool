import { useState } from 'react';
import { WEEKS_PER_YEAR, type GameState, type LogEntry } from '../state/types';
import { FOUNDING_NOTES, FOUNDING_NOTE_WEEKS } from '../data/foundingNotes';
import { STARTING_DORM_ID } from '../data/campusData';
import { programById } from '../data/techData';
import { fillLine } from '../data/logWords';

// The founding years' notes (Plan 70I, data/foundingNotes.ts): the first
// program the college chose, and its first residence, each marked for a few
// weeks after it happens in years 1 and 2. Read off the log, so they need
// nothing saved; "Noted" puts one away for the session.

const FOUNDING_YEARS = 2;
const weekOf = (l: { year: number; week: number }) => (l.year - 1) * WEEKS_PER_YEAR + l.week;

interface Note {
  id: keyof typeof FOUNDING_NOTES;
  year: number;
  text: string;
}

// The note due now, if any. Exported for the content test.
export function foundingNote(s: GameState): Note | null {
  if (s.clock.year > FOUNDING_YEARS + 1) return null;
  const now = weekOf(s.clock);
  const early = (l: LogEntry) => l.year <= FOUNDING_YEARS && now - weekOf(l) < FOUNDING_NOTE_WEEKS;
  // The log is newest first: the earliest match is the last.
  const firstOf = (test: (l: LogEntry) => boolean) => [...s.log].reverse().find(test);
  const program = firstOf((l) => l.topic === 'program' && l.year <= FOUNDING_YEARS);
  if (program && early(program)) {
    const name = programById(program.subject ?? '')?.name ?? 'The new program';
    return { id: 'firstProgram', year: program.year, text: fillLine(FOUNDING_NOTES.firstProgram.text, { program: name }) };
  }
  const residence = firstOf((l) => l.topic === 'building' && l.subject === STARTING_DORM_ID);
  if (residence && early(residence)) {
    const dorm = s.tech.find((t) => t.id === STARTING_DORM_ID)?.name ?? 'the first residence hall';
    return { id: 'firstResidence', year: residence.year, text: fillLine(FOUNDING_NOTES.firstResidence.text, { dorm }) };
  }
  return null;
}

export default function FoundingNotes({ s }: { s: GameState }) {
  const [noted, setNoted] = useState<ReadonlySet<string>>(new Set());
  const note = foundingNote(s);
  if (!note || noted.has(note.id) || s.pendingInterrupt) return null;
  const { title } = FOUNDING_NOTES[note.id];
  return (
    <aside className="milestone-note" role="note" aria-label={title}>
      <p className="letter-eyebrow">The founding years · Year {note.year}</p>
      <h3 className="milestone-note-title">{title}</h3>
      <p className="milestone-note-text">{note.text}</p>
      <div className="opening-coach-actions">
        <button type="button" onClick={() => setNoted((cur) => new Set([...cur, note.id]))}>Noted</button>
      </div>
    </aside>
  );
}
