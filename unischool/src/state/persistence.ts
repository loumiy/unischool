import type { FacilityType, GameState, HallSlot, Pathways, Placement, Trees } from './types';
import {
  footprintFits, footprintIsClear, isInBounds, isPlaceableKind, parsePathTileKey, pathTileKey,
} from './campusMap';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from './types';
import { fellTrees } from '../data/treeData';
import { glyphsFor, SPORTS } from '../data/studentLifeData';
import { graduatePrograms, majorPrefixes } from '../data/techData';
import { FACULTY_FIELDS } from '../data/facultyData';
import { offerablePrograms, PROGRAM_OFFER_COUNT } from '../systems/techtree/programOffers';

// ---------------------------------------------------------------------
// Save / load (see docs/architecture/game-state.md). A run is measured in
// hours, so a refresh must not destroy it. This is deliberately the
// smallest thing that works: the WHOLE GameState, JSON-serialized under
// ONE versioned localStorage key.
//
// That is only viable because GameState is already plain data — no
// functions, no Dates, no Maps/Sets, no object references between slices
// (see the shape notes on `placements`, `developing`, `candidates` and
// `YearSnapshot` in types.ts). Every field survives a JSON round trip
// untouched, so there is no per-field serializer to write and none to keep
// in sync as the state grows. Keep it that way: anything added to
// GameState that ISN'T JSON-round-trippable breaks save/load silently.
//
// Nothing here is a system and nothing ticks: these are pure helpers over
// the shared state, called from the engine, in the same spirit as
// campusMap.ts and history.ts.
//
// Size: a newly founded university serializes to ~175 KiB (481 Buildables
// with descriptions, 99 rivals, the founding roster, and the 30-listing
// candidate market — ~24 KiB of names and bios that is REPLACED rather
// than accumulated, since the pool is held at CANDIDATE_POOL_TARGET
// forever). A decades-long run
// adds only bounded amounts on top — one small YearSnapshot per year, a
// log capped at LOG_CAP entries, a roster in the dozens — so a mature save
// stays in the low hundreds of KiB, comfortably inside the ~5 MB
// localStorage budget. Nothing here needs compression or slotting yet;
// what would change that is unbounded per-week state, which is exactly
// what the existing caps exist to prevent.
// ---------------------------------------------------------------------

// The single key every save lives under. One key, not one per slot: there
// is exactly one run at a time, and a save overwrites the previous one.
// Exported so the save/load test harness (see test/save-load.test.ts) can
// seed a payload under the exact key loadGame reads, exercising the real
// load path — version check, shape check, sanitizers — rather than a copy
// of it.
export const SAVE_KEY = 'unischool.save';

// Bump this whenever GameState's SHAPE changes in a way an older save
// can't satisfy — a new required field, a renamed/retyped field, a changed
// meaning for an existing one.
//
// Additive OPTIONAL fields don't need a bump — they read as absent, which
// is what they'd be in a new game too.
//
// THE BUMP IS THE WHOLE OBLIGATION. A save at any other version is
// discarded and the player starts fresh — that is the rule, not a failure:
// the game is in development and is not deployed anywhere, so the only
// saves that exist are in a developer's own browser. A silently
// half-loaded run is worse than an obviously new one; a run dropped
// between two builds of an unreleased game costs nothing worth code.
//
// THERE IS NO MIGRATION CHAIN ANY MORE. Versions 3 through 51 each carried
// an entry once, written under an earlier policy of migrating every shape
// change: 2,870 lines of this file carrying saves forward through a
// curriculum reorg, a hundred-school field, three standings and a
// postseason, for a game nobody was playing yet — the September review's
// clearest case of overdevelopment. Plan 14's first PR broke the save
// shape (halls and their slots — see types.ts's HallSlot) and took that as
// the moment to freeze the chain and delete it. What survives is this
// policy, the sanitizers below, and loadGame's one branch: a save at any
// version but this one loads as null. If a specific run is ever worth
// carrying across a bump, write the few lines that carry it as a
// one-off, in that PR, and delete them in the next — never a table.
// See docs/architecture/game-state.md.
//
// v52: Plan 14 PR A. `s.halls` (a hall Buildable's program slots, added as
// required), `Buildable.slots`, and a twelve-hall chain in the seed.
// v53: Plan 14 PRs C and E. The seven school buildings and then Medicine's
// and Law's leave the seed, tier-2 and lab prerequisites are re-pointed,
// and `s.programOffers` is added as required. (PR C should have bumped on
// its own; a save carries its own `tech`, so one written under v52 would
// have loaded with buildings the game no longer knows.)
// v54: Plan 14 PR H. `s.searches` (a posted faculty search per field,
// added as required).
// v55: Plan 15 PR B. `s.self.reportCard` (last summer's grade, nullable)
// and the crowding accumulator on `s.students`, both added as required.
export const SAVE_VERSION = 55;

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

// Placement hygiene, run on EVERY load. The map is a
// visual layer that no system reads, so a bad entry here can't corrupt the
// sim — but it can render a building on top of another one or off the edge
// of the grid, so the loader is where it gets cleaned up rather than every
// read site having to be defensive.
//
// Three things get dropped, in this order:
//   - orphans: an id that isn't a placeable Buildable any more, or one that
//     hasn't (or no longer) started construction — 'locked' or 'available'
//     (content was renamed or removed between builds). 'done' AND
//     'developing' are both valid: a placement means "under construction
//     or finished here", not just "finished here" (see the long comment
//     above campusMap.ts's canPlace).
//   - out of bounds: a footprint that doesn't fit the CURRENT grid. The
//     anchor is nudged back inside where the footprint still fits at all —
//     the grid only ever grew so far, but shrinking it must not strand a
//     building half off the map — and dropped when it can't.
//   - overlaps: two placements covering the same tile. The invariant
//     footprints introduce, so it is checked rather than assumed.
// A dropped placement costs the player nothing mechanically: a 'done'
// Buildable already has every effect it granted; a 'developing' one keeps
// counting down in s.developing regardless (tickTech doesn't read
// s.placements at all) — it just won't render anywhere until the player
// notices it's missing, which today's tooling has no way to happen against
// the real catalogue (see firstFreeSpot's comment on why this is dormant
// in practice).
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
    if (!node || !isPlaceableKind(node) || (node.status !== 'done' && node.status !== 'developing')) continue;

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

// Pathway hygiene, run on EVERY load, mirroring
// sanitizePlacements above for exactly the same reason: pathways are a
// visual layer no system reads, so a bad entry can't corrupt the sim, but
// it could still render a stray path off the edge of the grid — and unlike
// placements, a tile key is a free-form string nothing has type-checked
// since it left localStorage. Two things get dropped:
//   - unparseable keys: not the `row,col` shape this version ever wrote
//     (see campusMap.ts's parsePathTileKey).
//   - out of bounds: a tile that doesn't exist on the CURRENT grid. Unlike
//     a placement's anchor there is nothing sensible to nudge a path tile
//     back to — it's a single square with no footprint to slide within —
//     so an out-of-bounds tile is simply dropped rather than clamped. The
//     grid has only ever grown, so this is dormant today; it exists for
//     the day CAMPUS_GRID_WIDTH/HEIGHT shrink, the same forward-looking
//     reason sanitizePlacements already clamps rather than assumes.
// A dropped tile costs the player nothing mechanically — it was decoration
// referencing ground that no longer exists.
function sanitizePathways(state: GameState): void {
  if (typeof state.pathways !== 'object' || state.pathways === null) {
    state.pathways = {};
    return;
  }
  const clean: Pathways = {};
  for (const [key, value] of Object.entries(state.pathways)) {
    if (value !== true) continue;
    const tile = parsePathTileKey(key);
    if (!tile || !isInBounds(tile.row, tile.col)) continue;
    clean[pathTileKey(tile)] = true;
  }
  state.pathways = clean;
}

// Tree hygiene, run on EVERY load, and the exact mirror
// of sanitizePathways above: trees are a visual layer no system reads, and
// a tree key is a free-form string nothing has type-checked since it left
// localStorage. Three things get dropped or fixed:
//   - unparseable keys, and out-of-bounds tiles. Same rule and same
//     reasoning as a path tile: a tree is one square with no footprint to
//     slide within, so there is nothing sensible to clamp it to.
//   - a non-numeric seed, which would make the renderer's hash produce NaN
//     and draw a tree at no position at all.
//   - A TREE STANDING UNDER A BUILDING. This is the one check pathways
//     doesn't have an equivalent of, and it is what keeps the fell-on-build
//     rule true across a save: the reducer fells trees as it commits a
//     placement, but a hand-edited save can carry a tree under a
//     building. Applying
//     fellTrees over every current placement here is the same rule, applied
//     once at load, rather than a second version of it.
// Dropping a tree costs the player nothing: it is ground cover on a layer
// no system reads.
function sanitizeTrees(state: GameState): void {
  if (typeof state.trees !== 'object' || state.trees === null) {
    state.trees = {};
    return;
  }
  const clean: Trees = {};
  for (const [key, seed] of Object.entries(state.trees)) {
    if (typeof seed !== 'number' || !Number.isFinite(seed)) continue;
    const tile = parsePathTileKey(key);
    if (!tile || !isInBounds(tile.row, tile.col)) continue;
    clean[pathTileKey(tile)] = seed;
  }
  for (const placement of Object.values(state.placements)) fellTrees(clean, placement);
  state.trees = clean;
}

// The five venue categories a team can legitimately reference — the same
// list facilitiesData.ts seeds, kept here rather than imported from it so
// this stays a defensive, self-contained check the way sanitizePlacements'
// own checks are (it doesn't import techData.ts either).
const VENUE_CATEGORIES: readonly FacilityType[] = [
  'athleticsField', 'athleticsArena', 'athleticsDiamond', 'athleticsNatatorium', 'footballStadium',
];

// Every sport+gender combination that can legitimately exist, read off
// SPORTS itself (unlike VENUE_CATEGORIES above, this genuinely would drift
// from the real catalogue if duplicated by hand — a gendered id like
// 'soccer-m' has no meaning independent of SPORTS the way a FacilityType
// string does). A combination that can't exist — a 'women's football', say
// — never appears in SPORTS at all (football fields only 'football', the
// men's-implied bare id), so membership here is exactly the check.
const KNOWN_SPORT_IDS: ReadonlySet<string> = new Set(SPORTS.map((sp) => sp.id));

// Team hygiene, run on EVERY load, mirroring
// sanitizePlacements/sanitizePathways above for the same reason: a team is
// a visual/derived reading away from being load-bearing (its upkeep and
// social contribution are live-read every week — see
// data/studentLifeData.ts), so a bad entry here would silently misprice the
// weekly statement rather than crash outright, which is worse. Three things
// get fixed, in this order:
//   - a team whose venueCategory names something that isn't one of the five
//     known venues (content was renamed or removed between builds — can't
//     happen against the current seed, but neither could a stale placement
//     before content ever moved) is DROPPED entirely, same as an orphaned
//     placement.
//   - a team whose sport isn't a sport+gender combination that can actually
//     exist (a 'women's football' that the catalogue never fields, or a
//     bare pre-gendering id from a hand-edited save) is likewise DROPPED — venueCategory alone can't catch this,
//     since it is captured at grant time and deliberately never re-derived
//     from `sport` (see VarsityTeam's own comment), so an invalid sport
//     can otherwise sit behind an entirely valid-looking venue category.
//   - a team marked 'active' whose venue Buildable isn't actually 'done'
//     (a hand-edited or corrupted save) is RESET to 'awaitingVenue' rather
//     than dropped — the team itself, its coach and its upkeep are all
//     still real, only the venue claim was wrong.
function sanitizeTeams(state: GameState): void {
  if (!Array.isArray(state.orgs?.teams)) {
    if (state.orgs) state.orgs.teams = [];
    return;
  }
  state.orgs.teams = state.orgs.teams.filter(
    (team) => VENUE_CATEGORIES.includes(team.venueCategory) && KNOWN_SPORT_IDS.has(team.sport),
  );
  for (const team of state.orgs.teams) {
    if (team.status !== 'active') continue;
    const venue = state.tech.find((t) => t.kind === 'facility' && t.facilityType === team.venueCategory);
    if (venue?.status !== 'done') team.status = 'awaitingVenue';
  }
}

// Chapter hygiene, run on EVERY load. One job: fill in
// `glyphs` for a chapter that lacks them.
//
// Deliberately a sanitize rather than a SAVE_VERSION bump, because there
// is nothing to migrate. A chapter's name has always
// BEEN its letters ("Alpha Beta Gamma"), so the glyphs are not new
// information recovered from somewhere, they are the same name written the
// way a building writes it — and glyphsFor is the same function that
// produced the field in the first place, not a second reading of it.
//
// A chapter whose name is not three Greek words (a hand-edited save) comes
// back with an empty string, and an empty pediment is the right answer to
// "what letters does this house wear": the campus map draws nothing rather
// than drawing something wrong.
function sanitizeChapters(state: GameState): void {
  if (!Array.isArray(state.orgs?.chapters)) {
    if (state.orgs) state.orgs.chapters = [];
    return;
  }
  for (const chapter of state.orgs.chapters) {
    if (typeof chapter.glyphs !== 'string') chapter.glyphs = glyphsFor(chapter.name);
  }
}

// Seen-slice hygiene, run on EVERY load, mirroring
// sanitizeTeams above: `seen` is display-only (no system reads it — see
// types.ts's SeenState), so a bad entry here can't corrupt the sim, but a
// missing or malformed bucket would crash the first MARK_SEEN dispatch or
// the first badge check that indexes into it. Each bucket is
// reset to empty if it isn't a plain object; a badge briefly re-lighting
// for content the player already saw is a harmless, self-correcting cost,
// the same trade sanitizePlacements/sanitizePathways/sanitizeTeams already
// accept for their own corrupt-entry cases.
function sanitizeSeen(state: GameState): void {
  const isRecord = (v: unknown): v is Record<string, true> => typeof v === 'object' && v !== null;
  const seen = (typeof state.seen === 'object' && state.seen !== null) ? state.seen : ({} as Partial<GameState['seen']>);
  state.seen = {
    courseIds: isRecord(seen.courseIds) ? seen.courseIds : {},
    buildableIds: isRecord(seen.buildableIds) ? seen.buildableIds : {},
    candidateIds: isRecord(seen.candidateIds) ? seen.candidateIds : {},
    // An absent bucket is indistinguishable from an empty one here,
    // and App.tsx fills it silently from whichever gates it finds ALREADY
    // open on its first render (see NOTE_TAB_AVAILABLE's `announce`). So a
    // save written before this field existed resumes with no tab
    // announcements at all — which is right: it has had those views for
    // years.
    tabIds: isRecord(seen.tabIds) ? seen.tabIds : {},
  };
}

// Drops course -> instructor entries that no longer name a real pairing:
// the course is gone from the seed, the faculty member is not on the
// roster, or the value isn't a string at all. Same defensive posture as
// sanitizePlacements/sanitizeSeen above, and cheap for the same reason —
// a stale entry here is not a crash but it IS a lie, and the one thing
// this record must never do is claim a course is taught by somebody who
// does not work here.
//
// Note what is deliberately NOT repaired: a course left with no entry is
// not reassigned to somebody available. Unstaffed is a legitimate, visible
// state with a fix the player owns (see types.ts's CourseFaculty) —
// quietly filling it in here would hide exactly the situation the feature
// exists to surface.
function sanitizeCourseFaculty(state: GameState): void {
  const source = (typeof state.courseFaculty === 'object' && state.courseFaculty !== null) ? state.courseFaculty : {};
  const courseIds = new Set(state.tech.map((t) => t.id));
  const facultyIds = new Set(state.faculty.map((f) => f.id));

  const clean: GameState['courseFaculty'] = {};
  for (const [courseId, facultyId] of Object.entries(source)) {
    if (typeof facultyId !== 'string') continue;
    if (!courseIds.has(courseId) || !facultyIds.has(facultyId)) continue;
    clean[courseId] = facultyId;
  }
  state.courseFaculty = clean;
}

// Hall hygiene, run on EVERY load. `halls` is the one side record beside
// `tech` that systems DO read (from Plan 14's PR C on — see types.ts's
// HallSlot block), so a bad entry here is not a rendering glitch but a
// program the game believes is housed somewhere it is not. Three rules,
// the same three test/invariants.test.ts asserts of every state:
//   - a hall entry names a 'done' Buildable that has `slots` and stands on
//     the map; anything else is dropped. A hall still under construction
//     has no slots yet (techSystem.ts opens them the week it finishes).
//   - an entry has exactly `slots` entries: padded with empty slots or
//     trimmed, so a slot index always means the same slot.
//   - a slot's program is a real program id — a major prefix, 'CORE', or
//     a graduate program — housed nowhere else. A duplicate or an unknown
//     id becomes an empty slot rather than a claim nothing can honour.
//   - a transit countdown is a positive whole number of weeks, or gone.
// A dropped or emptied slot costs the player only what a stale
// courseFaculty entry costs: a state that has to be re-made visibly rather
// than one that quietly asserts something false.
function sanitizeHalls(state: GameState): void {
  const source = (typeof state.halls === 'object' && state.halls !== null) ? state.halls : {};
  const programIds = new Set<string>(['CORE', ...majorPrefixes(), ...graduatePrograms().map((p) => p.id)]);
  const housed = new Set<string>();

  const clean: GameState['halls'] = {};
  for (const [hallId, raw] of Object.entries(source)) {
    const hall = state.tech.find((t) => t.id === hallId);
    if (!hall || hall.slots === undefined || hall.status !== 'done' || !(hallId in state.placements)) continue;
    const slots: HallSlot[] = [];
    for (let i = 0; i < hall.slots; i += 1) {
      const entry = Array.isArray(raw) ? (raw[i] as Partial<HallSlot> | undefined) : undefined;
      const programId = entry && typeof entry.programId === 'string' ? entry.programId : null;
      if (programId !== null && programIds.has(programId) && !housed.has(programId)) {
        housed.add(programId);
        // A transit countdown survives only as a positive whole number of
        // weeks; anything else reads as settled.
        const weeks = entry?.transitWeeks;
        slots.push(Number.isInteger(weeks) && (weeks as number) > 0 ? { programId, transitWeeks: weeks as number } : { programId });
      } else {
        slots.push({ programId: null });
      }
    }
    clean[hallId] = slots;
  }
  state.halls = clean;
}

// Offer hygiene, run on EVERY load, after sanitizeHalls (it reads the
// cleaned halls to know what is housed). An offer is a claim that a
// program can be founded right now, so an entry that cannot be — housed,
// gated, unknown, or a duplicate — is dropped. Never topped back up here:
// a short offer is refilled by the next finish (techSystem.ts), and a
// loader that drew dice would make loading a save change the game.
function sanitizeProgramOffers(state: GameState): void {
  const source = Array.isArray(state.programOffers) ? state.programOffers : [];
  const offerable = new Set(offerablePrograms(state).map((program) => program.id));
  const clean: string[] = [];
  for (const id of source) {
    if (typeof id !== 'string' || !offerable.has(id) || clean.includes(id)) continue;
    if (clean.length >= PROGRAM_OFFER_COUNT) break;
    clean.push(id);
  }
  state.programOffers = clean;
}

// Search hygiene, run on EVERY load: a running search is a positive
// whole number of weeks in a field that exists; anything else is dropped.
function sanitizeSearches(state: GameState): void {
  const source = (typeof state.searches === 'object' && state.searches !== null) ? state.searches : {};
  const clean: GameState['searches'] = {};
  for (const [field, weeks] of Object.entries(source)) {
    if (!FACULTY_FIELDS.includes(field) || !Number.isInteger(weeks) || (weeks as number) <= 0) continue;
    clean[field] = weeks as number;
  }
  state.searches = clean;
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
    typeof s.halls === 'object' && s.halls !== null &&
    Array.isArray(s.programOffers) &&
    typeof s.searches === 'object' && s.searches !== null &&
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
// can't be parsed, its version is not this build's (see SAVE_VERSION), or
// it doesn't look like a GameState. Every one of those falls back to a
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
  // Exactly this version, nothing else: an older save is not carried
  // forward (see the policy note above SAVE_VERSION) and a newer one was
  // written by a build this one does not understand. Both fall back to a
  // new game, which is the one thing a version mismatch must never fail
  // to do.
  if (payload.version !== SAVE_VERSION) return null;
  if (!looksLikeGameState(payload.state)) return null;

  const state = payload.state;
  sanitizePlacements(state);
  // After sanitizePlacements: a hall's slots are only real while the hall
  // itself stands on the map. And offers after halls: an offer is only
  // real while its program is unhoused.
  sanitizeHalls(state);
  sanitizeProgramOffers(state);
  sanitizeSearches(state);
  sanitizePathways(state);
  // After sanitizePlacements, never before: it reads the CLEANED placements
  // to decide which trees are standing under a building.
  sanitizeTrees(state);
  sanitizeTeams(state);
  sanitizeChapters(state);
  sanitizeSeen(state);
  sanitizeCourseFaculty(state);
  return state;
}
