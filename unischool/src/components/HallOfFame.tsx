import { useState } from 'react';
import type { HallEntry } from '../state/hall';
import { readHall } from '../state/hall';
import { SchoolFacade } from './StartupScreen';
import { useHotkeys } from './hotkeys';

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
        <span className="hall-plaque-meta">
          <span className={`grade-chip sm grade-${entry.mark.toLowerCase()}`}>{entry.mark}</span>
          Years 1–{entry.year} · {new Date(entry.finishedAt).getFullYear()}
        </span>
      </span>
    </button>
  );
}

export default function HallOfFame({ onClose }: { onClose: () => void }) {
  const [hall] = useState(() => readHall());
  const [open, setOpen] = useState<string | null>(hall[0]?.id ?? null);
  useHotkeys((e) => { if (e.key === 'Escape') onClose(); });
  const shown = hall.find((e) => e.id === open);
  return (
    <div className="front-screen" role="dialog" aria-modal="true" aria-label="The hall of fame">
      <section className="hall-wall">
        <div className="hall-head">
          <h2 className="hall-title">The hall of fame</h2>
          <button type="button" className="toolbar-popup-close" onClick={onClose} aria-label="Close">✕</button>
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
                <span key={g.label}><span className={`grade-chip sm grade-${g.grade.toLowerCase()}`}>{g.grade}</span> {g.label}</span>
              ))}
            </p>
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
      </section>
    </div>
  );
}
