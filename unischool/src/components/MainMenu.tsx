import { useEffect, useState } from 'react';
import ConfirmButton from './ConfirmButton';
import type { Action } from '../state/actions';
import { MenuIcon } from './icons';
import ImportSave from './ImportSave';
import { downloadFile } from './download';
import { exportSave } from '../state/persistence';
import type { GameState } from '../state/types';

// The top-right hamburger menu: Save, the run as a file and back (Plan 70B),
// the hall of fame, Settings, the title screen and New Game (Plan 34 added
// the hall, Settings and the title screen, from v2's). Sits
// directly above the map's zoom/'?' pill (see styles.css's
// --corner-menu-height). New game asks once more (ConfirmButton), as every
// destructive action does.
export default function MainMenu({ s, act, onHall, onSettings, onTitle }: {
  s: GameState;
  act: (a: Action) => void;
  onHall: () => void;
  onSettings: () => void;
  onTitle: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Captured and stopped, so the Escape that closes the menu closes
    // nothing else (App.tsx's ladder and the map listen on window).
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <div className="main-menu">
      <button
        type="button"
        className={`main-menu-btn ${open ? 'active' : ''}`}
        aria-expanded={open}
        aria-label={open ? 'Close main menu' : 'Open main menu'}
        title="Menu"
        onClick={() => (open ? close() : setOpen(true))}
      >
        <MenuIcon />
      </button>

      {open && (
        <div className="main-menu-popup" role="dialog" aria-label="Main menu">
          <button
            className="save-btn"
            onClick={() => { act({ type: 'SAVE_GAME' }); close(); }}
            title="Write the run to this browser now. The game also saves itself every summer, at admissions."
          >
            Save
          </button>
          <button
            className="save-btn"
            title="Download the run as a file, to keep or to continue in another browser."
            onClick={() => { const f = exportSave(s); downloadFile(f.filename, f.text); close(); }}
          >
            Download save
          </button>
          <ImportSave current={s} />
          <button className="save-btn" onClick={() => { close(); onHall(); }}>Hall of fame</button>
          <button className="save-btn" onClick={() => { close(); onSettings(); }}>Settings</button>
          <button className="save-btn" onClick={() => { close(); onTitle(); }}>Title screen</button>
          <ConfirmButton
            className="newgame-btn"
            title="Erase the saved run and found a new college."
            label="New game"
            armedLabel="Confirm — erase this run"
            warning="The run is erased and a new college is founded."
            onConfirm={() => act({ type: 'RESET' })}
          />
        </div>
      )}
    </div>
  );
}
