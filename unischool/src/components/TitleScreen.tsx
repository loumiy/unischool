import { useState } from 'react';
import type { GameState } from '../state/types';
import { institutionName } from '../state/types';
import { readHall } from '../state/hall';
import { HallFrame } from './HallOfFame';

// THE TITLE (Plan 34, from v2's; V1-35): what the game opens on. The run in
// this browser, to carry on; a new college, to found (this game's startup
// screen); and the hall of fame's newest portraits, because they are the
// reason to play again.

const SHOWN = 3;

export default function TitleScreen({ s, onContinue, onNewCollege, onHall, onSettings, onCredits }: {
  s: GameState;
  onContinue: () => void;
  onNewCollege: () => void;
  onHall: () => void;
  onSettings: () => void;
  onCredits: () => void;
}) {
  const [hall] = useState(() => readHall());
  const [confirming, setConfirming] = useState(false);
  const underway = s.started;
  return (
    <div className="front-screen title-screen" role="dialog" aria-modal="true" aria-label="UniSchool">
      <div className="title-card">
        <header className="title-head">
          <h1 className="title-name">UniSchool</h1>
          <p className="title-tagline">Fifty years to build a university.</p>
        </header>
        <nav className="title-actions" aria-label="Start">
          {underway && (
            <button type="button" className="title-primary" onClick={onContinue}>
              <span>Continue</span>
              <span className="title-sub">{institutionName(s.self)} · Year {s.clock.year}, week {s.clock.week}</span>
            </button>
          )}
          {confirming ? (
            <>
              <span className="newgame-confirm-label">Erase {institutionName(s.self)} and found another?</span>
              <button type="button" className="newgame-btn armed" onClick={onNewCollege}>Erase &amp; found a new college</button>
              <button type="button" className="newgame-btn" onClick={() => setConfirming(false)}>Cancel</button>
            </>
          ) : (
            <button type="button" className={underway ? 'save-btn' : 'title-primary'} onClick={() => (underway ? setConfirming(true) : onNewCollege())}>
              Found a new college
            </button>
          )}
          <button type="button" className="save-btn" onClick={onSettings}>Settings</button>
          <button type="button" className="save-btn" onClick={onCredits}>Credits</button>
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
              <button type="button" className="save-btn title-hall-all" onClick={onHall}>
                {hall.length > SHOWN ? `All ${hall.length} colleges` : 'Open the hall'}
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
