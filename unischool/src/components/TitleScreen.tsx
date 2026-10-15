import { useId, useState } from 'react';
import ConfirmButton from './ConfirmButton';
import { discardSetAsideSave, readSetAsideRaw, readSetAsideSave } from '../state/persistence';
import ImportSave from './ImportSave';
import SaveSlots from './SaveSlots';
import { downloadFile } from './download';
import type { GameState } from '../state/types';
import { institutionName } from '../state/types';
import { readHall } from '../state/hall';
import { HallFrame } from './HallOfFame';
import { calendarDate, gameDate } from '../format';
import Logo from './Logo';
import { BUILD_ID, versionLine } from '../build';
import { useSettings } from '../settings';
import { answerStats, saveExported, statsAvailable } from '../analytics/analytics';
import { feedbackAvailable, openFeedback } from '../feedback';

// THE TITLE (Plan 34, from v2's; V1-35): what the game opens on. The run in
// this browser, to carry on; a new college, to found (this game's startup
// screen); and the hall of fame's newest portraits, because they are the
// reason to play again.
//
// Over the title art (assets/campus-quad.webp): the college's banner hangs
// on the right, carrying the mark, the name and the menu; the art is placed
// so the hall and its clock tower stand centred in the space beside it. The
// hall of fame hangs on the lawn, bottom left.
// On a phone the banner's head sits in the sky and its body is a sheet over
// the grass (styles.css).

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
  // The play statistics' question (Plan 97E): asked once, before anything
  // is sent, in a build that sends them at all.
  const settings = useSettings();
  const asking = statsAvailable() && settings.stats === 'unasked';
  const [saves, setSaves] = useState(false);
  const savesId = useId();
  return (
    <div className="front-screen title-screen" role="dialog" aria-modal="true" aria-label="UniSchool">
      <div className="title-banner">
        <header className="title-head">
          <Logo />
          <p className="title-tagline">Fifty years to build a university.</p>
        </header>
        <div className="title-body">
          {asking && (
            <p className="title-note title-stats" role="status">
              UniSchool sends anonymous play statistics to help the playtest.
              {' '}
              <button type="button" className="menu-btn" onClick={() => answerStats(true)}>Fine</button>
              <button type="button" className="menu-btn btn-quiet" onClick={() => answerStats(false)}>Turn off</button>
            </p>
          )}
          {setAside && (
            <p className="title-note title-set-aside" role="status">
              {setAside.name ? `${setAside.name}, a college saved` : 'A college saved'}
              {setAside.savedAt ? ` on ${calendarDate(setAside.savedAt)}` : ''}, was made by an earlier version of the game and cannot be continued in this one. It has been kept aside rather than erased.
              {' '}
              <button
                type="button"
                className="menu-btn"
                onClick={() => { const raw = readSetAsideRaw(); if (raw) { downloadFile(`${(setAside.name ?? 'college').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-set-aside.unischool.json`, raw); saveExported('set-aside'); } }}
              >
                Download it
              </button>
              <button type="button" className="menu-btn btn-quiet" onClick={() => { discardSetAsideSave(); setSetAside(null); }}>Discard it</button>
            </p>
          )}
          {/* One loud button (Continue, or New game on a first run), then
              the rest as quiet rows on the banner. */}
          <nav className="title-actions" aria-label="Start">
            {underway && (
              <button type="button" className="title-primary" onClick={onContinue}>
                <span>Continue</span>
                <span className="title-sub">{institutionName(s.self)} · {gameDate(s.clock.year, s.clock.week)}</span>
              </button>
            )}
            <ConfirmButton
              className={underway ? 'title-row' : 'title-primary'}
              label="New game"
              armedLabel={`Confirm — erase ${institutionName(s.self)}`}
              warning={`${institutionName(s.self)} is erased and another is founded.`}
              needsConfirm={underway}
              onConfirm={onNewCollege}
            />
            {/* A college with funds that never run out and nothing to wait on
                (systems/sandbox). It replaces the run here as New game does. */}
            <ConfirmButton
              className="title-row"
              title="Found a college with unlimited funds, where buildings and courses are finished the moment they are started."
              label="Sandbox"
              armedLabel={`Confirm — erase ${institutionName(s.self)}`}
              warning={`${institutionName(s.self)} is erased and a sandbox college is founded.`}
              needsConfirm={underway}
              onConfirm={onSandbox}
            />
            {/* The save slots and a save file, behind one row. */}
            <button type="button" className="title-row" aria-expanded={saves} aria-controls={savesId} onClick={() => setSaves(!saves)}>
              Saves &amp; files
            </button>
            {saves && (
              <div className="title-drawer" id={savesId}>
                <SaveSlots current={s} canSave={false} startOpen onClose={() => setSaves(false)} />
                <ImportSave current={s} />
              </div>
            )}
          </nav>
          <div className="title-utility">
            <button type="button" className="title-link" onClick={onSettings}>Settings</button>
            <button type="button" className="title-link" onClick={onCredits}>Credits</button>
            {feedbackAvailable() && <button type="button" className="title-link" title="A short form, in a new tab." onClick={() => openFeedback(underway ? s : null, 'title')}>Feedback</button>}
          </div>
        </div>
      </div>
      <section className="title-hall" aria-label="The hall of fame">
        <h2 className="title-hall-head">The hall of fame</h2>
        {hall.length === 0 ? (
          <p className="title-hall-empty">No college has reached its fiftieth year in this browser yet. The first to finish hangs here.</p>
        ) : (
          <ul className="hall-frames">
            {hall.slice(0, SHOWN).map((e) => <li key={e.id}><HallFrame entry={e} onClick={onHall} /></li>)}
          </ul>
        )}
        {hall.length > 0 && (
          <button type="button" className="title-link title-hall-all" onClick={onHall}>
            {hall.length > SHOWN ? `All ${hall.length} colleges` : 'Open the hall'}
          </button>
        )}
      </section>
      {/* Which build this is (Plan 97B): feedback names it. */}
      <p className="title-version" title={`Build ${BUILD_ID}`}>{versionLine()}</p>
    </div>
  );
}
