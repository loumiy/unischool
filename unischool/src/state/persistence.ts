import { campaignById } from '../data/campaignData';
import { clauseById } from '../data/alumniData';
import { quirkById } from '../data/quirkData';
import { seatDef } from '../data/seatData';
import type { Advancement, AlumniClass, FacilityType, GameState, HallSlot, Loan, Pathways, Placement, Seat, Trees } from './types';
import { clampDrawRate } from '../systems/finance/treasury';
import {
  ROAD_FIRST_ROW, firstFreeSpot, footprintFits, footprintIsClear, isLand, isPlaceableKind, parsePathTileKey,
  pathTileKey,
} from './campusMap';
import { CAMPUS_GRID_WIDTH } from './types';
import { fellTrees } from '../data/treeData';
import { QUAD_NAME_MAX } from '../data/quadData';
import { glyphsFor, SPORTS } from '../data/studentLifeData';
import { FOUNDERS_HALL_ID, graduatePrograms, majorPrefixes } from '../data/techData';
import { FACULTY_FIELDS } from '../data/facultyData';
import { offerablePrograms, PROGRAM_OFFER_COUNT } from '../systems/techtree/programOffers';

// ---------------------------------------------------------------------
// Save / load (see docs/architecture/game-state.md): the whole GameState,
// JSON-serialized under one versioned localStorage key.
//
// This works only because GameState is plain data: no functions, Dates,
// Maps/Sets or cross-slice references. Anything added to GameState that
// isn't JSON-round-trippable breaks save/load silently.
//
// Size: a new university serializes to ~175 KiB, and a long run adds only
// bounded amounts (one YearSnapshot per year, a capped log), so a mature
// save stays in the low hundreds of KiB, well inside localStorage's ~5 MB.
// Unbounded per-week state is what would change that.
// ---------------------------------------------------------------------

// The single save key: one run at a time. Exported so
// test/save-load.test.ts can exercise the real load path.
export const SAVE_KEY = 'unischool.save';

// Bump this whenever GameState's shape changes in a way an older save can't
// satisfy: a new required field, a renamed/retyped field, a changed meaning.
// Additive optional fields don't need a bump.
//
// A save at any other version is discarded and the player starts fresh.
// That is the policy: the game is unreleased, and a silently half-loaded
// run is worse than a new one. There is no migration chain; if a specific
// run is ever worth carrying across a bump, write a one-off and delete it
// in the next PR. See docs/architecture/game-state.md.
export const SAVE_VERSION = 71;

// What goes in localStorage. `savedAt` is epoch milliseconds.
export interface SavePayload {
  version: number;
  savedAt: number;
  state: GameState;
}

// Every localStorage access is wrapped: the API throws when storage is
// disabled (Safari private browsing) or over quota, and neither should take
// the run down. saveGame returns false so the caller can tell the player
// their run isn't safe.
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

// Placement hygiene, run on every load. The map is a visual layer no system
// reads, but a bad entry could render a building over another or off the
// grid. Dropped, in order:
//   - orphans: not a placeable Buildable, or not 'done'/'developing' (a
//     placement means "under construction or finished here").
//   - out of bounds: nudged back inside the current grid if the footprint
//     fits at all, otherwise dropped.
//   - overlaps: two placements covering the same tile.
// A dropped placement costs nothing mechanically (tickTech doesn't read
// s.placements).
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
      row = Math.max(0, Math.min(row, ROAD_FIRST_ROW - fp.h));
      col = Math.max(0, Math.min(col, CAMPUS_GRID_WIDTH - fp.w));
      if (!footprintFits(row, col, fp)) continue; // bigger than the grid itself
    }
    if (!footprintIsClear(clean, row, col, fp)) {
      // Moved off the road onto something standing, or overlapping: resited
      // at the first open site rather than lost.
      const spot = p.row + p.h > ROAD_FIRST_ROW ? firstFreeSpot({ placements: clean, tech: state.tech }, node, fp) : null;
      if (!spot) continue;
      ({ row, col } = spot);
    }

    clean[id] = { row, col, ...fp };
  }
  state.placements = clean;
}

// Pathway hygiene, run on every load. Tile keys are free-form strings, so
// unparseable keys and out-of-bounds tiles are dropped (a single tile has
// nothing sensible to clamp to).
function sanitizePathways(state: GameState): void {
  if (typeof state.pathways !== 'object' || state.pathways === null) {
    state.pathways = {};
    return;
  }
  const clean: Pathways = {};
  for (const [key, value] of Object.entries(state.pathways)) {
    if (value !== true) continue;
    const tile = parsePathTileKey(key);
    if (!tile || !isLand(tile.row, tile.col)) continue;
    clean[pathTileKey(tile)] = true;
  }
  state.pathways = clean;
}

// Tree hygiene, run on every load. Drops unparseable keys, out-of-bounds
// tiles and non-numeric seeds (which would render at NaN), then fells any
// tree standing under a building, applying the reducer's fell-on-build rule
// once at load.
function sanitizeTrees(state: GameState): void {
  if (typeof state.trees !== 'object' || state.trees === null) {
    state.trees = {};
    return;
  }
  const clean: Trees = {};
  for (const [key, seed] of Object.entries(state.trees)) {
    if (typeof seed !== 'number' || !Number.isFinite(seed)) continue;
    const tile = parsePathTileKey(key);
    if (!tile || !isLand(tile.row, tile.col)) continue;
    clean[pathTileKey(tile)] = seed;
  }
  for (const placement of Object.values(state.placements)) fellTrees(clean, placement);
  state.trees = clean;
}

// Dressing hygiene, run on every load: lamps and benches on the land, off
// the buildings; anything else is dropped.
function sanitizeDressing(state: GameState): void {
  const raw = state.dressing as unknown;
  if (raw === undefined) return;
  if (typeof raw !== 'object' || raw === null) { delete state.dressing; return; }
  const clean: Record<string, 'lamp' | 'bench'> = {};
  for (const [key, kind] of Object.entries(raw)) {
    const t = parsePathTileKey(key);
    if (!t || !isLand(t.row, t.col) || (kind !== 'lamp' && kind !== 'bench')) continue;
    if (Object.values(state.placements).some((p) => t.row >= p.row && t.row < p.row + p.h && t.col >= p.col && t.col < p.col + p.w)) continue;
    clean[pathTileKey(t)] = kind;
  }
  state.dressing = clean;
}

// Estate hygiene, run on every load: a funding level outside 0 to 1, or a
// backlog or renovation count that is not a finite non-negative number, is
// dropped rather than compounded.
// The distress ladder: optional, and a malformed one is dropped whole (the
// college is then Sound, with no history) rather than half-read.
function sanitizeDistress(state: GameState): void {
  const d = state.finance.distress as unknown;
  if (d === undefined) return;
  const ok = typeof d === 'object' && d !== null && (() => {
    const x = d as Record<string, unknown>;
    const num = (k: string) => typeof x[k] === 'number' && Number.isFinite(x[k]);
    return Number.isInteger(x.rung) && (x.rung as number) >= 0 && (x.rung as number) <= 5
      && ['termsAtRung', 'confidence', 'termNet', 'surplusRun', 'deficitRun', 'receivershipTermsLeft'].every(num)
      && Array.isArray(x.letters) && x.letters.every((l) => typeof l === 'string')
      && Array.isArray(x.scars) && x.scars.every((y) => Number.isInteger(y));
  })();
  if (!ok) delete state.finance.distress;
}

function sanitizeEstate(state: GameState): void {
  const f = state.finance.maintenanceFunding;
  if (f !== undefined && !(Number.isFinite(f) && f >= 0 && f <= 1)) delete state.finance.maintenanceFunding;
  const loans = state.finance.loans as unknown;
  if (loans !== undefined) {
    const valid = Array.isArray(loans)
      ? loans.filter((l): l is Loan => typeof l === 'object' && l !== null
        && typeof l.buildingId === 'string'
        && Number.isFinite(l.balance) && l.balance >= 0
        && Number.isFinite(l.payment) && l.payment >= 0
        && Number.isInteger(l.weeksLeft) && l.weeksLeft > 0)
      : [];
    if (valid.length > 0) state.finance.loans = valid;
    else delete state.finance.loans;
  }
  sanitizeDistress(state);
  const d = state.finance.drawRate;
  if (d !== undefined) {
    if (typeof d !== 'number' || !Number.isFinite(d)) delete state.finance.drawRate;
    else state.finance.drawRate = clampDrawRate(d);
  }
  for (const t of state.tech) {
    if (t.backlog !== undefined && !(Number.isFinite(t.backlog) && t.backlog >= 0)) delete t.backlog;
    if (t.renovationWeeks !== undefined && !(Number.isInteger(t.renovationWeeks) && t.renovationWeeks >= 0)) delete t.renovationWeeks;
    if (t.historic !== undefined && t.historic !== true) delete t.historic;
    if (t.extensionWeeks !== undefined && !(Number.isInteger(t.extensionWeeks) && t.extensionWeeks >= 0)) delete t.extensionWeeks;
  }
}

// Seats: optional; a malformed one is dropped, and a seat the game no
// longer has (or a policy it no longer offers) with it.
function sanitizeSeats(state: GameState): void {
  const raw = state.seats as unknown;
  if (raw === undefined) return;
  const valid = Array.isArray(raw)
    ? raw.filter((x): x is Seat => typeof x === 'object' && x !== null
      && typeof x.seatId === 'string' && seatDef(x.seatId) !== undefined
      && (x.school === null || typeof x.school === 'string')
      && typeof x.holder === 'string' && typeof x.internal === 'boolean'
      && typeof x.policy === 'string' && seatDef(x.seatId)!.policies.some((p) => p.id === x.policy)
      && Number.isFinite(x.salary) && x.salary >= 0 && Number.isInteger(x.appointedYear))
    : [];
  if (valid.length > 0) state.seats = valid;
  else delete state.seats;
}

// Quad hygiene, run on every load: the field is optional, and a malformed
// one is dropped rather than half-read. Names are capped as NAME_QUAD caps
// them; marks must be tile keys on the land.
function sanitizeQuads(state: GameState): void {
  const q = state.quads as unknown;
  if (q === undefined) return;
  if (typeof q !== 'object' || q === null) { delete state.quads; return; }
  const raw = q as { names?: unknown; designated?: unknown };
  const names: Record<string, string> = {};
  if (typeof raw.names === 'object' && raw.names !== null) {
    for (const [key, name] of Object.entries(raw.names)) {
      if (typeof name === 'string' && name.trim() !== '' && parsePathTileKey(key)) names[key] = name.trim().slice(0, QUAD_NAME_MAX);
    }
  }
  const designated = Array.isArray(raw.designated)
    ? raw.designated.filter((key): key is string => {
      const t = typeof key === 'string' ? parsePathTileKey(key) : null;
      return t !== null && isLand(t.row, t.col);
    })
    : [];
  state.quads = { names, designated };
}

// The five venue categories a team can reference, kept local rather than
// imported so this check stays self-contained.
const VENUE_CATEGORIES: readonly FacilityType[] = [
  'athleticsField', 'athleticsArena', 'athleticsDiamond', 'athleticsNatatorium', 'footballStadium',
];

// Every sport+gender id that can exist, read off SPORTS so it can't drift.
// An impossible combination (women's football) never appears in SPORTS.
const KNOWN_SPORT_IDS: ReadonlySet<string> = new Set(SPORTS.map((sp) => sp.id));

// Team hygiene, run on every load. Team upkeep is live-read every week, so
// a bad entry would silently misprice the weekly statement.
//   - an unknown venueCategory: dropped.
//   - a sport that isn't a real sport+gender id: dropped (venueCategory
//     can't catch this; it's never re-derived from `sport`).
//   - 'active' with a venue that isn't 'done': reset to 'awaitingVenue',
//     since the team, coach and upkeep are still real.
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

// Chapter hygiene: fills in `glyphs` from the chapter's name (glyphsFor)
// where missing. Not a version bump because the name already is the
// letters. A name that isn't three Greek words yields an empty string, and
// the map draws nothing.
function sanitizeChapters(state: GameState): void {
  if (!Array.isArray(state.orgs?.chapters)) {
    if (state.orgs) state.orgs.chapters = [];
    return;
  }
  for (const chapter of state.orgs.chapters) {
    if (typeof chapter.glyphs !== 'string') chapter.glyphs = glyphsFor(chapter.name);
  }
}

// Seen-slice hygiene: `seen` is display-only, but a malformed bucket would
// crash MARK_SEEN or a badge check. Bad buckets reset to empty; a badge
// briefly re-lighting is harmless.
function sanitizeSeen(state: GameState): void {
  const isRecord = (v: unknown): v is Record<string, true> => typeof v === 'object' && v !== null;
  const seen = (typeof state.seen === 'object' && state.seen !== null) ? state.seen : ({} as Partial<GameState['seen']>);
  state.seen = {
    courseIds: isRecord(seen.courseIds) ? seen.courseIds : {},
    buildableIds: isRecord(seen.buildableIds) ? seen.buildableIds : {},
    // An absent bucket reads as empty, and App.tsx fills it silently from
    // the gates already open on first render (see NOTE_TAB_AVAILABLE's
    // `announce`), so there are no stale tab announcements.
    tabIds: isRecord(seen.tabIds) ? seen.tabIds : {},
  };
}

// Drops course -> instructor entries whose course or faculty member no
// longer exists, or whose value isn't a string: this record must never
// claim a course is taught by someone who doesn't work here. An unstaffed
// course is deliberately not reassigned; that is a visible state the player
// fixes (see types.ts's CourseFaculty).
// Advancement: a malformed record is dropped whole, and a running campaign
// the game no longer has is stopped.
function sanitizeAdvancement(state: GameState): void {
  const raw = state.advancement as unknown;
  if (raw === undefined) return;
  const a = raw as Partial<Advancement>;
  const ok = typeof raw === 'object' && raw !== null && Array.isArray(a.closed)
    && typeof a.restrictedBuilding === 'number' && Number.isFinite(a.restrictedBuilding) && a.restrictedBuilding >= 0
    && (a.running === null || (typeof a.running === 'object' && a.running !== undefined && typeof a.running.campaignId === 'string'
      && Number.isFinite(a.running.raised) && Number.isFinite(a.running.target) && Number.isInteger(a.running.dueYear)));
  if (!ok) { delete state.advancement; return; }
  if (state.advancement!.running && !campaignById(state.advancement!.running.campaignId)) state.advancement!.running = null;
}

// The alumni ledger: a malformed class is dropped, and a clause the game no
// longer has is dropped from a class's memory.
function sanitizeAlumni(state: GameState): void {
  const raw = state.alumni as unknown;
  if (raw === undefined) return;
  const valid = Array.isArray(raw)
    ? raw.filter((a): a is AlumniClass => typeof a === 'object' && a !== null
      && Number.isInteger(a.classYear) && Number.isFinite(a.size) && a.size >= 0
      && Number.isFinite(a.satisfaction) && Number.isFinite(a.quality)
      && Number.isFinite(a.warmth) && Number.isFinite(a.nudged) && Array.isArray(a.memory))
    : [];
  for (const a of valid) a.memory = a.memory.filter((id) => typeof id === 'string' && clauseById(id) !== undefined);
  if (valid.length > 0) state.alumni = valid;
  else delete state.alumni;
}

// A quirk the game no longer has is dropped (data/quirkData.ts).
function sanitizeQuirks(state: GameState): void {
  for (const f of [...state.faculty, ...state.candidates]) {
    if (f.quirk !== undefined && quirkById(f.quirk) === undefined) delete f.quirk;
  }
}

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

// Hall hygiene, run on every load. Systems do read `halls`, so a bad entry
// means a program housed somewhere it isn't. The rules test/invariants.test.ts
// asserts of every state:
//   - an entry names a 'done' Buildable with `slots` that stands on the map
//     (slots open the week a hall finishes); anything else is dropped.
//   - an entry has exactly `slots` entries, padded or trimmed.
//   - a slot's program is a real program id (major prefix or graduate
//     program) housed nowhere else; otherwise the slot is emptied.
//   - a transit countdown is a positive whole number of weeks, or gone.
function sanitizeHalls(state: GameState): void {
  const source = (typeof state.halls === 'object' && state.halls !== null) ? state.halls : {};
  const programIds = new Set<string>([...majorPrefixes(), ...graduatePrograms().map((p) => p.id)]);
  const housed = new Set<string>();

  const clean: GameState['halls'] = {};
  for (const [hallId, raw] of Object.entries(source)) {
    const hall = state.tech.find((t) => t.id === hallId);
    if (!hall || hall.slots === undefined || hall.status !== 'done') continue;
    // Founders Hall counts even before it is sited: a guided founding saves
    // before the player places it (state/opening.ts).
    if (!(hallId in state.placements) && hallId !== FOUNDERS_HALL_ID) continue;
    const slots: HallSlot[] = [];
    for (let i = 0; i < hall.slots; i += 1) {
      const entry = Array.isArray(raw) ? (raw[i] as Partial<HallSlot> | undefined) : undefined;
      const programId = entry && typeof entry.programId === 'string' ? entry.programId : null;
      if (programId !== null && programIds.has(programId) && !housed.has(programId)) {
        housed.add(programId);
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

// Offer hygiene, after sanitizeHalls (it reads the cleaned halls). Drops
// offers that are housed, gated, unknown or duplicated. Never tops the list
// back up: a loader that drew dice would make loading change the game.
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

// A shallow structural check that rejects what actually happens (truncated
// writes, key collisions) before it reaches the reducer. A save that passes
// and still has a hole in it is a version-bump bug (see SAVE_VERSION).
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
    // Saves are only written from a founded university.
    s.started === true
  );
}

// Returns the saved run, or null if it is missing, unreadable, unparseable,
// the wrong version, or not shaped like a GameState. A corrupt save must
// never stop the app booting.
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
  // Exactly this version: older saves aren't carried forward and newer ones
  // aren't understood.
  if (payload.version !== SAVE_VERSION) return null;
  if (!looksLikeGameState(payload.state)) return null;

  const state = payload.state;
  sanitizePlacements(state);
  // Halls after placements (a hall's slots are real only while it stands),
  // offers after halls (an offer is real only while its program is unhoused).
  sanitizeHalls(state);
  sanitizeProgramOffers(state);
  sanitizeSearches(state);
  sanitizePathways(state);
  // Trees after placements: it reads the cleaned placements.
  sanitizeTrees(state);
  sanitizeEstate(state);
  sanitizeQuads(state);
  sanitizeSeats(state);
  sanitizeQuirks(state);
  sanitizeAlumni(state);
  sanitizeAdvancement(state);
  sanitizeDressing(state);
  sanitizeTeams(state);
  sanitizeChapters(state);
  sanitizeSeen(state);
  sanitizeCourseFaculty(state);
  return state;
}
