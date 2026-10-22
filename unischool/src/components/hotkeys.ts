import { useEffect, useRef } from 'react';

// The game's keyboard rules: one hook, one typing guard, one rule about
// modifiers. What a key means stays with the component that owns the action;
// this only decides when a keypress is the game's to act on.

// Every shortcut the game answers (Plan 98F): one table, which the handlers
// read through isKey and Settings lists, so the list can't drift from the
// keys. `keys` are KeyboardEvent.key values, lowercased; entries that share
// `does` are listed as one line.
export interface Shortcut { keys: readonly string[]; does: string; where: ShortcutPlace }
export type ShortcutPlace = 'Anywhere' | 'The clock' | 'The tabs' | 'The map';

export const SHORTCUTS = {
  back: { keys: ['escape'], does: 'Close or back out, one layer at a time', where: 'Anywhere' },
  answer: { keys: ['enter'], does: 'Continue past a notice or the coach', where: 'Anywhere' },
  objectives: { keys: ['j'], does: 'Open or close the objectives', where: 'Anywhere' },
  mute: { keys: ['m'], does: 'Mute or unmute the sound', where: 'Anywhere' },
  pause: { keys: [' '], does: 'Pause or resume', where: 'The clock' },
  speed1: { keys: ['1'], does: 'Normal speed', where: 'The clock' },
  speed2: { keys: ['2'], does: 'Double speed', where: 'The clock' },
  speed3: { keys: ['3'], does: 'Four times speed, once unlocked', where: 'The clock' },
  speed4: { keys: ['4'], does: 'Eight times speed, once unlocked', where: 'The clock' },
  speed5: { keys: ['5'], does: 'Fastest, in a sandbox', where: 'The clock' },
  curriculum: { keys: ['c'], does: 'Open or close Curriculum', where: 'The tabs' },
  faculty: { keys: ['f'], does: 'Open or close Faculty', where: 'The tabs' },
  students: { keys: ['l'], does: 'Open or close Students', where: 'The tabs' },
  inbox: { keys: ['i'], does: 'Open or close the Inbox', where: 'The tabs' },
  panUp: { keys: ['w', 'arrowup'], does: 'Pan the map', where: 'The map' },
  panLeft: { keys: ['a', 'arrowleft'], does: 'Pan the map', where: 'The map' },
  panDown: { keys: ['s', 'arrowdown'], does: 'Pan the map', where: 'The map' },
  panRight: { keys: ['d', 'arrowright'], does: 'Pan the map', where: 'The map' },
  turnLeft: { keys: ['q'], does: 'Turn the view', where: 'The map' },
  turnRight: { keys: ['e'], does: 'Turn the view', where: 'The map' },
  tiltDown: { keys: ['z'], does: 'Tilt the view', where: 'The map' },
  tiltUp: { keys: ['x'], does: 'Tilt the view', where: 'The map' },
  camera: { keys: ['home'], does: 'Reset the camera', where: 'The map' },
  rotate: { keys: ['r'], does: 'Rotate the building or bench in hand', where: 'The map' },
  path: { keys: ['p'], does: 'Draw paths, or put the tool away', where: 'The map' },
} as const satisfies Record<string, Shortcut>;

export type ShortcutId = keyof typeof SHORTCUTS;

export function isKey(e: KeyboardEvent, id: ShortcutId): boolean {
  return (SHORTCUTS[id].keys as readonly string[]).includes(e.key.toLowerCase());
}

const KEY_NAMES: Record<string, string> = {
  ' ': 'Space', escape: 'Esc', enter: 'Enter', home: 'Home',
  arrowup: '↑', arrowleft: '←', arrowdown: '↓', arrowright: '→',
};

export function keyName(key: string): string {
  return KEY_NAMES[key] ?? key.toUpperCase();
}

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

// True when the player is typing into a text control, where no game hotkey
// may fire ("3" in a name field must not fast-forward the clock).
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return TYPING_TAGS.has(el.tagName) || el.isContentEditable === true;
}

// Whether the player is driving with the keyboard. A pointer press means
// mouse; Tab means keyboard. Space, Enter and arrow keys deliberately do not
// count: Space/Enter are the keys being arbitrated, and arrows pan the map.
// Capture phase, so it is settled before any bubble-phase game handler asks.
let keyboardModality = false;
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => { keyboardModality = false; }, true);
  window.addEventListener('keydown', (e) => { if (e.key === 'Tab') keyboardModality = true; }, true);
}

// True when a focused BUTTON or A will activate natively on this Space or
// Enter, so a hotkey must not also fire. Only checked by those keys.
// :focus-visible alone is not enough: Chromium flips a clicked element to
// :focus-visible on the first keypress after the click, i.e. during this very
// keydown, so a clicked button would swallow Space. The modality bit above
// is settled before the key and makes the answer reliable.
export function isActivationTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.matches !== 'function') return false;
  if (el.tagName !== 'BUTTON' && el.tagName !== 'A') return false;
  return keyboardModality && el.matches(':focus-visible');
}

// Which map keys are live given what is open over the map. A front screen
// (the title, hall, settings or credits), a full-screen tab, the log popup
// or an interrupt silences the map. The build popup has
// no backdrop and is where the map's tools are used from (the objectives
// drawer, also without one, counts as it: App.tsx), so it takes only
// Escape (App.tsx's Escape ladder enables the map's back-out exactly when it
// has nothing left to close); pan, R and P stay live under it.
export interface ShellOverlays {
  overlayOpen: boolean;   // a full-screen tab is up
  buildOpen: boolean;     // the build popup or the objectives drawer is up — the map is still visible under it
  logOpen: boolean;       // the log popup is up
  interrupted: boolean;   // a decision modal has halted the clock
  frontUp: boolean;       // a front screen covers the whole game
}

// Escape only: the one key the build popup takes from the map.
export function mapBackOutLive(o: ShellOverlays): boolean {
  return !o.frontUp && !o.overlayOpen && !o.buildOpen && !o.logOpen && !o.interrupted;
}

// Everything else the map does: panning, R to rotate, P for the path tool.
// New map keys belong here; only keys two handlers would both answer belong
// in mapBackOutLive.
export function mapControlsLive(o: ShellOverlays): boolean {
  return !o.frontUp && !o.overlayOpen && !o.logOpen && !o.interrupted;
}

const CONFIRM_KEYS = new Set(['Enter', ' ', 'Escape']);

// Subscribe to global keydown while `enabled`. The handler is read through a
// ref, so the listener registers once while always running the latest
// closure. Chords with Ctrl/Meta/Alt belong to the browser and pass through.
export function useHotkeys(onKeyDown: (e: KeyboardEvent) => void, enabled = true): void {
  const handlerRef = useRef(onKeyDown);
  useEffect(() => {
    handlerRef.current = onKeyDown;
  });

  useEffect(() => {
    if (!enabled) return;
    function handle(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      // A held Enter, Space or Escape answers once: its auto-repeat must not
      // answer the next modal unseen, or pause and resume on its own.
      if (e.repeat && CONFIRM_KEYS.has(e.key)) return;
      handlerRef.current(e);
    }
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [enabled]);
}
