import { useEffect, useState } from 'react';
import type { Action } from '../state/actions';
import { MenuIcon } from './icons';

// The top-right hamburger menu: Save, the hall of fame, Settings, the title
// screen and New Game (Plan 34 added the middle three, from v2's). Sits
// directly above the map's zoom/'?' pill (see styles.css's
// --corner-menu-height). New Game confirms with an inline second click
// rather than a browser confirm() dialog, so it matches the rest of the
// chrome.
export default function MainMenu({ act, onHall, onSettings, onTitle }: {
  act: (a: Action) => void;
  onHall: () => void;
  onSettings: () => void;
  onTitle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmingNewGame, setConfirmingNewGame] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Captured and stopped, so the Escape that closes the menu closes
    // nothing else (App.tsx's ladder and the map listen on window).
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); setConfirmingNewGame(false); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  function close() {
    setOpen(false);
    setConfirmingNewGame(false);
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
          {confirmingNewGame ? (
            <>
              <span className="newgame-confirm-label">Erase this run and start over?</span>
              <button className="newgame-btn armed" onClick={() => act({ type: 'RESET' })}>
                Erase &amp; start over
              </button>
              <button className="newgame-btn" onClick={() => setConfirmingNewGame(false)}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                className="save-btn"
                onClick={() => { act({ type: 'SAVE_GAME' }); close(); }}
                title="Write the run to this browser now. The game also saves itself every summer, at admissions."
              >
                Save
              </button>
              <button className="save-btn" onClick={() => { close(); onHall(); }}>Hall of fame</button>
              <button className="save-btn" onClick={() => { close(); onSettings(); }}>Settings</button>
              <button className="save-btn" onClick={() => { close(); onTitle(); }}>Title screen</button>
              <button
                className="newgame-btn"
                onClick={() => setConfirmingNewGame(true)}
                title="Erase the saved run and found a new college."
              >
                New Game
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
