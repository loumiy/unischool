import { useState } from 'react';
import type { HallEntry } from '../state/hall';
import { readHall } from '../state/hall';
import { REPORT_WORDS } from '../data/reportData';
import { SchoolFacade } from './StartupScreen';
import { useHotkeys } from './hotkeys';
import ReportCardActions, { NewCollegeButton } from './ReportCardActions';
import { CloseIcon } from './icons';
import GradeMark from './GradeMark';
import { calendarDate } from '../format';

// THE HALL OF FAME (Plan 33, Plan 34; state/hall.ts): finished runs as
// framed portraits (each college's own facade) with plaques. The title
// screen shows the newest few; this wall shows them all, and a frame opens
// onto its title, its grades and its chronicle.

export function HallFrame({ entry, open, onClick }: { entry: HallEntry; open?: boolean; onClick?: () => void }) {
  return (
    <button type="button" className={`hall-frame${open ? ' is-open' : ''}`} onClick={onClick} aria-expanded={open}>
      <span className="hall-portrait"><SchoolFacade name={entry.name} vernacular={entry.vernacular} colors={entry.colors} suffix={entry.suffix} /></span>
      <span className="hall-plaque">
        <span className="hall-plaque-name">{entry.college}</span>
        <span className="hall-plaque-meta" title={`Finished ${calendarDate(entry.finishedAt)}`}>
          <GradeMark grade={entry.mark} />
          {/* Game years only: a real calendar year beside them read as a
              date in the college's history. */}
          Years 1–{entry.year}
        </span>
      </span>
    </button>
  );
}

// Found another college (Plan 70J) sits under the wall. `running` names the
// college in progress, if any: warned it will not hang, unless it already
// does.
export default function HallOfFame({ onClose, onNewCollege, running }: { onClose: () => void; onNewCollege?: () => void; running?: string }) {
  const [hall] = useState(() => readHall());
  const [open, setOpen] = useState<string | null>(hall[0]?.id ?? null);
  useHotkeys((e) => { if (e.key === 'Escape') onClose(); });
  const shown = hall.find((e) => e.id === open);
  return (
    <div className="front-screen" role="dialog" aria-modal="true" aria-label="The hall of fame">
      <section className="hall-wall">
        <div className="hall-head">
          <h2 className="hall-title">The hall of fame</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>
        {hall.length === 0 ? (
          <p className="review-empty">No college has reached its fiftieth year in this browser yet. The first to finish hangs here.</p>
        ) : (
          <ul className="hall-frames">
            {hall.map((e) => (
              <li key={e.id}><HallFrame entry={e} open={open === e.id} onClick={() => setOpen(open === e.id ? null : e.id)} /></li>
            ))}
          </ul>
        )}
        {shown && (
          <div className="hall-reading">
            <p className="hall-reading-title">{shown.title}</p>
            <p className="hall-reading-grades">
              {shown.grades.map((g) => (
                <span key={g.label}><GradeMark grade={g.grade} /> {g.label}</span>
              ))}
            </p>
            <ReportCardActions entry={shown} />
            <ol className="chronicle-eras">
              {shown.eras.map((era) => (
                <li key={era.from} className="chronicle-era">
                  <h3 className="chronicle-era-name">{era.name}</h3>
                  <p className="chronicle-era-lines">{era.lines.join(' ')}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
        {onNewCollege && (
          <div className="hall-leave">
            <NewCollegeButton
              note={running && !hall.some((e) => e.college === running) ? REPORT_WORDS.newCollegeMidRun : REPORT_WORDS.newCollegeFresh}
              lost={!running ? undefined : hall.some((e) => e.college === running) ? `end ${running}'s Epilogue` : `erase ${running}`}
              onConfirm={onNewCollege}
            />
          </div>
        )}
      </section>
    </div>
  );
}
