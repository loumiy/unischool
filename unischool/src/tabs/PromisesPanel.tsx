import type { GameState } from '../state/types';
import { PROMISE_LINES, promiseById } from '../data/promiseData';
import { fillCollege, offerRoom, promisesOf } from '../systems/promises/promises';
import HelpHint from '../components/HelpHint';

// Promises (Plan 33): those open, with the years left, and those settled,
// kept or missed. The History tab's panel; the Final Report lists the
// settled ones the same way.

function dueLine(s: GameState, dueYear: number): string {
  const left = dueYear - s.clock.year;
  if (left <= 0) return PROMISE_LINES.dueNow;
  if (left === 1) return PROMISE_LINES.dueNext;
  return PROMISE_LINES.dueIn.replace('{years}', String(left));
}

export function PromiseRecord({ s }: { s: GameState }) {
  const p = promisesOf(s);
  if (p.settled.length === 0) return <p className="review-empty">{PROMISE_LINES.none}</p>;
  return (
    <ul className="ambitions">
      {p.settled.map((r) => {
        const def = promiseById(r.id);
        return (
          <li key={`${r.id}-${r.year}`} className={`ambition${r.kept ? '' : ' unreached'}`}>
            <span className="ambition-mark" aria-hidden="true">{r.kept ? '●' : '○'}</span>
            <span className="ambition-body">
              <span className="ambition-name">{def?.title ?? r.id}</span>
              <span className="ambition-line">{r.kept ? 'Kept' : 'Missed'}</span>
            </span>
            <span className="ambition-year">Year {r.year}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function PromisesPanel({ s }: { s: GameState }) {
  const p = promisesOf(s);
  const kept = p.settled.filter((r) => r.kept).length;
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-head-title">
          <h2>Promises</h2>
          <span className="panel-count">{kept} kept of {p.settled.length}</span>
        </div>
        <HelpHint align="end" text={PROMISE_LINES.note} />
      </div>
      {p.active.length > 0 && (
        <ul className="ambitions">
          {p.active.map((a) => (
            <li key={a.id} className="ambition">
              <span className="ambition-mark" aria-hidden="true">◐</span>
              <span className="ambition-body">
                <span className="ambition-name">{promiseById(a.id)?.title ?? a.id}</span>
                <span className="ambition-line">Made in Year {a.madeYear}</span>
              </span>
              <span className="ambition-year">{dueLine(s, a.dueYear)}</span>
            </li>
          ))}
        </ul>
      )}
      <PromiseRecord s={s} />
    </section>
  );
}

// The Review beat's promises (Plan 33): what came due this summer, and the
// year's offer. `taken` is lifted to the beat, which sends it on leaving.
export function PromiseOffer({ s, taken, onToggle }: { s: GameState; taken: readonly string[]; onToggle: (id: string) => void }) {
  const p = promisesOf(s);
  const due = p.settled.filter((r) => r.year === s.clock.year);
  const room = offerRoom(s);
  if (due.length === 0 && !p.offer) return null;
  return (
    <section className="review-section promise-offer">
      <h3>{p.offer?.decade ? PROMISE_LINES.decadeTitle : 'Promises'}</h3>
      {due.length > 0 && (
        <ul>
          {due.map((r) => {
            const def = promiseById(r.id);
            return (
              <li key={r.id} className={r.kept ? 'good' : 'bad'}>
                {r.kept ? 'Kept' : 'Missed'}: {def?.title}. {def ? fillCollege(s, r.kept ? def.kept : def.missed) : ''}
              </li>
            );
          })}
        </ul>
      )}
      {p.offer && (
        <>
          <p>
            {p.offer.decade
              ? PROMISE_LINES.decadeBody.replace('{picks}', String(room))
              : PROMISE_LINES.offered.replace('{title}', promiseById(p.offer.ids[0])?.title ?? '')}
          </p>
          <div className="event-choices">
            {p.offer.ids.map((id) => {
              const def = promiseById(id);
              if (!def) return null;
              const on = taken.includes(id);
              const full = !on && taken.length >= room;
              return (
                <button key={id} type="button" className={`event-choice${on ? ' is-on' : ''}`} aria-pressed={on} disabled={full} onClick={() => onToggle(id)}>
                  <span className="event-choice-label">
                    {def.title}
                    <span className="event-choice-cost">{on ? (p.offer!.decade ? PROMISE_LINES.decadeTaken : 'Promised') : `${def.years} years`}</span>
                  </span>
                  <span className="event-choice-detail">{fillCollege(s, def.text)}</span>
                </button>
              );
            })}
          </div>
          <p className="review-empty">{room === 0 ? PROMISE_LINES.capReached : PROMISE_LINES.note}</p>
        </>
      )}
    </section>
  );
}
