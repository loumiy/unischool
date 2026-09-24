import type { GameState } from '../state/types';

// ---------------------------------------------------------------------
// The playtest gate: one place decides whether the developer shortcuts (the
// sandbox Fast speed, DebugPanel.tsx and what it dispatches) are reachable.
// A flag set by `?debug=1` on the URL, the `unischool.debug` localStorage
// key, or a school named "test" (so scenario saves under any name work).
// The first two are read once at module load so the panel cannot appear or
// vanish mid-session; the name is checked per call.
// ---------------------------------------------------------------------

export const DEBUG_FLAG_KEY = 'unischool.debug';

// Checks the player-written half of the name only (types.ts's University),
// so both Test College and Test University count.
export function isTestUniversity(name: string): boolean {
  return name.trim().toLowerCase() === 'test';
}

// `?debug=1` also writes the localStorage key (and `?debug=0` clears it), so
// the flag survives the panel's Load-and-reload. Storage access is wrapped
// because the API throws when storage is disabled.
function readFlagAtBoot(): boolean {
  let stored = false;
  try {
    stored = localStorage.getItem(DEBUG_FLAG_KEY) === '1';
  } catch {
    stored = false;
  }

  let fromUrl: boolean | null = null;
  try {
    const value = new URLSearchParams(window.location.search).get('debug');
    if (value !== null) fromUrl = value !== '0' && value !== 'false';
  } catch {
    fromUrl = null;
  }

  if (fromUrl === null) return stored;
  try {
    if (fromUrl) localStorage.setItem(DEBUG_FLAG_KEY, '1');
    else localStorage.removeItem(DEBUG_FLAG_KEY);
  } catch {
    // Unwritable storage: the flag still holds for this page, it just
    // won't survive the next load.
  }
  return fromUrl;
}

// `typeof window` guards headless callers (the balance sim and tests in Node).
const FLAG_AT_BOOT = typeof window === 'undefined' ? false : readFlagAtBoot();

export function playtestEnabled(s: GameState): boolean {
  return FLAG_AT_BOOT || isTestUniversity(s.self.name);
}
