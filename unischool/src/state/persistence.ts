import type { GameState } from './types';

// ---------------------------------------------------------------------
// Save / load (see README's "Save / load"). A run is measured in hours, so
// a refresh must not destroy it. This is deliberately the smallest thing
// that works: the WHOLE GameState, JSON-serialized under ONE versioned
// localStorage key.
//
// That is only viable because GameState is already plain data — no
// functions, no Dates, no Maps/Sets, no object references between slices
// (see the shape notes on `placements`, `developing`, `openPostings` and
// `YearSnapshot` in types.ts). Every field survives a JSON round trip
// untouched, so there is no per-field serializer to write and none to keep
// in sync as the state grows. Keep it that way: anything added to
// GameState that ISN'T JSON-round-trippable breaks save/load silently.
//
// Nothing here is a system and nothing ticks: these are pure helpers over
// the shared state, called from the engine, in the same spirit as
// campusMap.ts and history.ts.
//
// Size: a newly founded university serializes to ~121 KiB (397 Buildables
// with descriptions, 55 rivals, the founding roster). A decades-long run
// adds only bounded amounts on top — one small YearSnapshot per year, a
// log capped at LOG_CAP entries, a roster in the dozens — so a mature save
// stays in the low hundreds of KiB, comfortably inside the ~5 MB
// localStorage budget. Nothing here needs compression or slotting yet;
// what would change that is unbounded per-week state, which is exactly
// what the existing caps exist to prevent.
// ---------------------------------------------------------------------

// The single key every save lives under. One key, not one per slot: there
// is exactly one run at a time, and a save overwrites the previous one.
const SAVE_KEY = 'unischool.save';

// Bump this whenever GameState's SHAPE changes in a way an older save
// can't satisfy — a new required field, a renamed/retyped field, a changed
// meaning for an existing one. A save whose version doesn't match exactly
// is discarded and the player starts fresh (see loadGame), which is the
// honest behaviour while there is no migration path: a silently
// half-loaded run is worse than an obviously new one.
//
// Additive OPTIONAL fields don't need a bump — they read as absent, which
// is what they'd be in a new game too.
export const SAVE_VERSION = 1;

// What actually goes in localStorage: the state plus enough metadata to
// tell what it is without parsing further. `savedAt` is epoch
// milliseconds, not a Date — the payload stays as JSON-plain as the state
// it wraps.
export interface SavePayload {
  version: number;
  savedAt: number;
  state: GameState;
}

// Every localStorage access here is wrapped: the API throws outright when
// storage is disabled (Safari private browsing, hardened privacy settings)
// and on quota overrun, and neither is a reason to take the run down.

// Writes the full state. Returns false if the browser refused (storage
// disabled, quota exceeded) so the caller can tell the player their run
// isn't actually safe rather than pretending it is.
export function saveGame(state: GameState): boolean {
  try {
    const payload: SavePayload = { version: SAVE_VERSION, savedAt: Date.now(), state };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nothing to do: if we can't clear it we also couldn't have written it.
  }
}

// A shallow structural check, not a full validation of GameState. The point
// is to reject the things that actually happen — a truncated write, a key
// collision, a payload from an older shape that shares the version number
// by accident — before they reach the reducer and crash a system mid-tick.
// It intentionally does NOT verify every field: a save that passes this and
// still has a hole in it is a version-bump bug (see SAVE_VERSION), and
// papering over it here would just hide it.
function looksLikeGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Partial<GameState>;
  return (
    typeof s.clock === 'object' && s.clock !== null && typeof s.clock.year === 'number' &&
    typeof s.finance === 'object' && s.finance !== null &&
    typeof s.students === 'object' && s.students !== null &&
    Array.isArray(s.tech) &&
    Array.isArray(s.faculty) &&
    Array.isArray(s.rivals) &&
    Array.isArray(s.history) &&
    Array.isArray(s.log) &&
    typeof s.self === 'object' && s.self !== null &&
    // A save is only ever written from a founded university, so anything
    // claiming otherwise is not a run worth resuming.
    s.started === true
  );
}

// Returns the saved run, or null if there isn't one, it can't be read, it
// can't be parsed, its version doesn't match, or it doesn't look like a
// GameState. Every one of those falls back to a new game rather than
// throwing — a corrupt save must never be able to stop the app booting.
export function loadGame(): GameState | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const payload = parsed as Partial<SavePayload>;
  if (payload.version !== SAVE_VERSION) return null;
  if (!looksLikeGameState(payload.state)) return null;

  return payload.state;
}
