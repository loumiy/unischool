import { DEV_BUILD } from '../engine/devBuild';

// ---------------------------------------------------------------------
// The playtest gate: one place decides whether the developer shortcuts (the
// sandbox Fast speed, DebugPanel.tsx and what it dispatches) are reachable.
// Development builds only (Plan 70C): in the public build the gate is always
// closed. There, a flag set by `?debug=1` on the URL or the `unischool.debug`
// localStorage key opens it, read once at module load so the panel cannot
// appear or vanish mid-session. (A college named "Test" used to open it too;
// Plan 70C retired that, since a player could name one so.)
// ---------------------------------------------------------------------

export const DEBUG_FLAG_KEY = 'unischool.debug';

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
const FLAG_AT_BOOT = !DEV_BUILD || typeof window === 'undefined' ? false : readFlagAtBoot();

export function playtestEnabled(): boolean {
  return DEV_BUILD && FLAG_AT_BOOT;
}
