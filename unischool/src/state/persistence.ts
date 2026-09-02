import type { GameState, Placement } from './types';
import { footprintFits, footprintIsClear, isPlaceableKind } from './campusMap';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from './types';

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
// meaning for an existing one. An older save is then carried forward by a
// MIGRATIONS entry (below) if the change is recoverable, and discarded so
// the player starts fresh if it isn't: a silently half-loaded run is worse
// than an obviously new one.
//
// Additive OPTIONAL fields don't need a bump — they read as absent, which
// is what they'd be in a new game too.
// v2: the growth-loop tuning pass added two required Finance fields
// (appropriationPerStudentPerYear, endowmentCampaigns) and rebalanced
// every cost/revenue constant, so a v1 save would both crash on the
// missing fields and describe a school built under a different economy.
// v3: the week-to-week texture pass added a required `events` slice to
// GameState (the milestone-celebration queue and the decision-event
// cadence bookkeeping — see types.ts's EventState). A v2 save has no such
// field, and every read of it in eventSystem.ts assumes it is there.
// v4: campus-map placements gained a footprint — a placement is now
// { row, col, w, h } covering a rectangle of tiles rather than a single
// { row, col } tile (see types.ts's Placement). Unlike v2 and v3 this one
// is genuinely recoverable, so it is the first version with a MIGRATION
// rather than a discard: every v3 placement covered exactly one tile, so
// it loads as 1x1 and the player keeps their run and their layout.
export const SAVE_VERSION = 4;

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

// ---------------------------------------------------------------------
// Migrations. One entry per version that can be carried FORWARD: the
// function takes a save at that version and mutates it into the shape of
// version + 1. loadGame walks them in order, so a v3 save reaches v5 by
// running 3 then 4, and a version with no entry is simply discarded (which
// is what v1 and v2 still are — those changes rewrote the economy, not
// just a shape, so an old run wouldn't describe the same game).
//
// Keyed on the version being migrated FROM, per the README's note on where
// a migration path belongs.
// ---------------------------------------------------------------------
const MIGRATIONS: Record<number, (state: GameState) => void> = {
  // v3 -> v4: placements gained a footprint. A placement written before
  // footprints existed covered exactly one tile, which is precisely a 1x1,
  // so this is a pure fill-in — no layout moves and nothing is dropped.
  3: (state) => {
    for (const p of Object.values(state.placements ?? {})) {
      const legacy = p as Partial<Placement>;
      if (typeof legacy.w !== 'number') legacy.w = 1;
      if (typeof legacy.h !== 'number') legacy.h = 1;
    }
  },
};

// Placement hygiene, run on EVERY load (migrated or not). The map is a
// visual layer that no system reads, so a bad entry here can't corrupt the
// sim — but it can render a building on top of another one or off the edge
// of the grid, so the loader is where it gets cleaned up rather than every
// read site having to be defensive.
//
// Three things get dropped, in this order:
//   - orphans: an id that isn't a placeable, finished Buildable any more
//     (content was renamed or removed between builds).
//   - out of bounds: a footprint that doesn't fit the CURRENT grid. The
//     anchor is nudged back inside where the footprint still fits at all —
//     the grid only ever grew so far, but shrinking it must not strand a
//     building half off the map — and dropped when it can't.
//   - overlaps: two placements covering the same tile. Can't arise from
//     the v3 migration (1x1 placements were already non-overlapping), but
//     it is the invariant footprints introduce, so it is checked rather
//     than assumed.
// A dropped placement costs the player nothing mechanically: the Buildable
// simply returns to the siting tray to be put down again.
function sanitizePlacements(state: GameState): void {
  if (typeof state.placements !== 'object' || state.placements === null) {
    state.placements = {};
    return;
  }
  const clean: Record<string, Placement> = {};
  for (const [id, raw] of Object.entries(state.placements)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const p = raw as Placement;
    if (!Number.isInteger(p.w) || !Number.isInteger(p.h) || p.w < 1 || p.h < 1) continue;

    const node = state.tech.find((t) => t.id === id);
    if (!node || !isPlaceableKind(node) || node.status !== 'done') continue;

    // Clamp the anchor back inside the grid before giving up on it.
    const fp = { w: p.w, h: p.h };
    let { row, col } = p;
    if (!footprintFits(row, col, fp)) {
      row = Math.max(0, Math.min(row, CAMPUS_GRID_HEIGHT - fp.h));
      col = Math.max(0, Math.min(col, CAMPUS_GRID_WIDTH - fp.w));
      if (!footprintFits(row, col, fp)) continue; // bigger than the grid itself
    }
    if (!footprintIsClear(clean, row, col, fp)) continue; // overlaps something already kept

    clean[id] = { row, col, ...fp };
  }
  state.placements = clean;
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
// can't be parsed, its version can't be reached from here (see MIGRATIONS),
// or it doesn't look like a GameState. Every one of those falls back to a
// new game rather than throwing — a corrupt save must never be able to stop
// the app booting.
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
  if (typeof payload.version !== 'number' || payload.version > SAVE_VERSION) return null;
  if (!looksLikeGameState(payload.state)) return null;

  // Walk the save forward one version at a time. A gap in the chain (a
  // version with no migration) means this save can't be carried forward,
  // which falls back to a new game exactly as an unknown version does.
  const state = payload.state;
  for (let v = payload.version; v < SAVE_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (!migrate) return null;
    migrate(state);
  }

  sanitizePlacements(state);
  return state;
}
