import { useEffect, useRef } from 'react';

// The game's keyboard rules: one hook, one typing guard, one rule about
// modifiers. What a key means stays with the component that owns the action;
// this only decides when a keypress is the game's to act on.

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

// Which map keys are live given what is open over the map. A full-screen
// tab, the log popup or an interrupt silences the map. The build popup has
// no backdrop and is where the map's tools are used from, so it takes only
// Escape (App.tsx's Escape ladder enables the map's back-out exactly when it
// has nothing left to close); pan, R and P stay live under it.
export interface ShellOverlays {
  overlayOpen: boolean;   // a full-screen tab is up
  buildOpen: boolean;     // the build popup is up — note the map is still visible under it
  logOpen: boolean;       // the log popup is up
  interrupted: boolean;   // a decision modal has halted the clock
}

// Escape only: the one key the build popup takes from the map.
export function mapBackOutLive(o: ShellOverlays): boolean {
  return !o.overlayOpen && !o.buildOpen && !o.logOpen && !o.interrupted;
}

// Everything else the map does: panning, R to rotate, P for the path tool.
// New map keys belong here; only keys two handlers would both answer belong
// in mapBackOutLive.
export function mapControlsLive(o: ShellOverlays): boolean {
  return !o.overlayOpen && !o.logOpen && !o.interrupted;
}

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
      handlerRef.current(e);
    }
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [enabled]);
}
