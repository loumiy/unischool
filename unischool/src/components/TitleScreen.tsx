import { useState } from 'react';
import ConfirmButton from './ConfirmButton';
import { discardSetAsideSave, readSetAsideRaw, readSetAsideSave } from '../state/persistence';
import ImportSave from './ImportSave';
import { downloadFile } from './download';
import type { GameState } from '../state/types';
import { institutionName } from '../state/types';
import { readHall } from '../state/hall';
import { HallFrame } from './HallOfFame';
import { calendarDate, gameDate } from '../format';
import Logo from './Logo';

// THE TITLE (Plan 34, from v2's; V1-35): what the game opens on. The run in
// this browser, to carry on; a new college, to found (this game's startup
// screen); and the hall of fame's newest portraits, because they are the
// reason to play again.
//
// Over the title art (assets/campus-quad.webp): the mark and the name in the
// sky, the menu on a frosted card below them, the quad showing round it.

const SHOWN = 3;

export default function TitleScreen({ s, onContinue, onNewCollege, onSandbox, onHall, onSettings, onCredits }: {
  s: GameState;
  onContinue: () => void;
  onNewCollege: () => void;
  onSandbox: () => void;
  onHall: () => void;
  onSettings: () => void;
  onCredits: () => void;
}) {
  const [hall] = useState(() => readHall());
  // A run this version could not open (persistence.ts's set-aside save).
  const [setAside, setSetAside] = useState(() => readSetAsideSave());
  const underway = s.started;
  return (
    <div className="front-screen title-screen" role="dialog" aria-modal="true" aria-label="UniSchool">
      <header className="title-head">
        <Logo />
        <p className="title-tagline">Fifty years to build a university.</p>
      </header>
      <div className="title-card">
        {setAside && (
          <p className="title-set-aside" role="status">
            {setAside.name ? `${setAside.name}, a college saved` : 'A college saved'}
            {setAside.savedAt ? ` on ${calendarDate(setAside.savedAt)}` : ''}, was made by an earlier version of the game and cannot be continued in this one. It has been kept aside rather than erased.
            {' '}
            <button
              type="button"
              className="menu-btn"
              onClick={() => { const raw = readSetAsideRaw(); if (raw) downloadFile(`${(setAside.name ?? 'college').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-set-aside.unischool.json`, raw); }}
            >
              Download it
            </button>
            <button type="button" className="menu-btn btn-quiet" onClick={() => { discardSetAsideSave(); setSetAside(null); }}>Discard it</button>
          </p>
        )}
        <nav className="title-actions" aria-label="Start">
          {underway && (
            <button type="button" className="title-primary" onClick={onContinue}>
              <span>Continue</span>
              <span className="title-sub">{institutionName(s.self)} · {gameDate(s.clock.year, s.clock.week)}</span>
            </button>
          )}
          <ConfirmButton
            className={underway ? 'menu-btn' : 'title-primary'}
            label="New game"
            armedLabel={`Confirm — erase ${institutionName(s.self)}`}
            warning={`${institutionName(s.self)} is erased and another is founded.`}
            needsConfirm={underway}
            onConfirm={onNewCollege}
          />
          {/* A college with funds that never run out and nothing to wait on
              (systems/sandbox). It replaces the run here as New game does. */}
          <ConfirmButton
            className="menu-btn"
            title="Found a college with unlimited funds, where buildings and courses are finished the moment they are started."
            label="Sandbox"
            armedLabel={`Confirm — erase ${institutionName(s.self)}`}
            warning={`${institutionName(s.self)} is erased and a sandbox college is founded.`}
            needsConfirm={underway}
            onConfirm={onSandbox}
          />
          <ImportSave current={s} />
          <button type="button" className="menu-btn" onClick={onSettings}>Settings</button>
          <button type="button" className="menu-btn" onClick={onCredits}>Credits</button>
        </nav>
        <section className="title-hall" aria-label="The hall of fame">
          <h2 className="title-hall-head">The hall of fame</h2>
          {hall.length === 0 ? (
            <p className="review-empty">No college has reached its fiftieth year in this browser yet. The first to finish hangs here, with a portrait of what it became.</p>
          ) : (
            <>
              <ul className="hall-frames">
                {hall.slice(0, SHOWN).map((e) => <li key={e.id}><HallFrame entry={e} onClick={onHall} /></li>)}
              </ul>
              <button type="button" className="menu-btn title-hall-all" onClick={onHall}>
                {hall.length > SHOWN ? `All ${hall.length} colleges` : 'Open the hall'}
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
