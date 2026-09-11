import { useEffect, useRef } from 'react';

// The one place the game's keyboard rules live.
//
// Hotkeys grew up scattered — speed on the status header, rotate on the
// map, Escape in the tab overlay, Enter in the interrupt modal — and every
// one of them hand-rolled the same two things: a window listener with the
// right teardown, and a guard so a key pressed while the player is typing
// into a field doesn't also do something to the game. Now that the map
// itself answers to W/A/S/D, P and Escape, and the tabs answer to C/F/L,
// that duplication is worth collapsing: one hook, one guard, one rule about
// modifiers.
//
// Nothing here knows what any particular key means — that stays with the
// component that owns the thing the key does. This only decides WHEN a
// keypress is the game's to act on at all.

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

// True when the keypress belongs to a text control the player is typing in
// (the startup screen's school-name field, the admissions form's numbers).
// A game hotkey must never fire in that case: typing "3" into a name should
// not yank the clock into fast-forward, and "W" should not pan the campus.
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return TYPING_TAGS.has(el.tagName) || el.isContentEditable === true;
}

// True when the keypress is already going to activate a focused control on
// its own — a Tab-focused button answers Space and Enter natively, and a
// hotkey that also fires would double-act on it. Checked only by the
// hotkeys that actually collide with that native behaviour (Space, Enter);
// every letter key is free of it.
export function isActivationTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'BUTTON' || el.tagName === 'A');
}

// Subscribe to global keydown for as long as `enabled` holds.
//
// The handler is read through a ref rather than captured in the effect, so
// the listener is registered ONCE per enabled-stretch while still always
// running the current render's closure: callers can write handlers that
// read whatever props and state they like without thinking about stale
// values or about churning a listener on every tick of the game clock.
//
// Chords are never game hotkeys: anything held with Ctrl/Meta/Alt is the
// browser's or the OS's (Cmd-S, Ctrl-F, Alt-Tab) and is passed straight
// through untouched.
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
