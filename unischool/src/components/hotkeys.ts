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

// WHICH DEVICE IS THE PLAYER DRIVING WITH? Tracked here, once, because the
// answer is what isActivationTarget below actually needs and neither the
// DOM nor :focus-visible can be asked for it after the fact (see that
// function). Only two events move the needle: a pointer press means the
// player is on the mouse, and Tab — the one key that moves focus in this
// game, since nothing here is an arrow-navigated widget — means they are on
// the keyboard. Space and Enter deliberately do NOT count: those are the
// keys being arbitrated, and letting them vote would be the circularity
// this exists to break. Arrow keys deliberately do not count either: they
// pan the campus, so a player who clicked a button and then panned would
// otherwise be declared a keyboard user with that button still focused.
//
// Capture phase, so it is settled before any game handler (which listen in
// the bubble phase) asks. Module scope rather than a hook: it is one bit
// about the player, not about any component, and there is exactly one
// player.
let keyboardModality = false;
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => { keyboardModality = false; }, true);
  window.addEventListener('keydown', (e) => { if (e.key === 'Tab') keyboardModality = true; }, true);
}

// True when the keypress is already going to activate a focused control on
// its own — a Tab-focused button answers Space and Enter natively, and a
// hotkey that also fires would double-act on it. Checked only by the
// hotkeys that actually collide with that native behaviour (Space, Enter);
// every letter key is free of it.
//
// ASKING THE TAG ALONE WAS THE BUG. A button that was CLICKED is focused
// too, so "is a button focused?" answered yes long after the mouse had
// moved on — which is how Space came to re-click the tab icon the player
// had just clicked (closing the tab) instead of pausing the game. The guard
// was right about keyboard focus and wrong about mouse focus, and could not
// tell them apart because it was not asking.
//
// :focus-visible is the browser's own name for the distinction, and it is
// half the answer rather than all of it: Chromium flips an already-focused
// element to :focus-visible on the FIRST keypress after a click, and that
// keypress is this one — probed directly, `matches(':focus-visible')` reads
// true inside the keydown handler for the very Space that follows a mouse
// click. So the browser's heuristic cannot answer a question asked during
// the key it is about. Hence the modality bit above: it is settled before
// the key, by the interaction that actually chose the device. Both are
// required, so this never claims native activation the browser will not
// perform.
//
// Narrowed to BUTTON/A, because those are the elements whose native
// activation this is deferring to at all — a focused div is not going to
// click itself, and text controls never reach here (see isTypingTarget).
export function isActivationTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.matches !== 'function') return false;
  if (el.tagName !== 'BUTTON' && el.tagName !== 'A') return false;
  return keyboardModality && el.matches(':focus-visible');
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
