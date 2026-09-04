import type { Buildable, FacilityType, GameState, Pathways, Placement, StudentClub } from './types';
import {
  edgeKey, footprintFits, footprintIsClear, isEdgeInBounds, isPlaceableKind, parseEdgeKey,
} from './campusMap';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from './types';
import { CANDIDATE_LISTING_WEEKS, LEGACY_FIELD_RENAMES } from '../data/facultyData';
import { initialTech } from '../data/techData';
import { initialFacilities } from '../data/facilitiesData';

// ---------------------------------------------------------------------
// Save / load (see README's "Save / load"). A run is measured in hours, so
// a refresh must not destroy it. This is deliberately the smallest thing
// that works: the WHOLE GameState, JSON-serialized under ONE versioned
// localStorage key.
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
// with descriptions, 55 rivals, the founding roster, and the 30-listing
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
// v5: the faculty-field taxonomy was re-specialised from 13 broad subject
// areas to 26 departments (facultyData.ts's FACULTY_FIELDS), and every
// major was reassigned to one of them. Three old field STRINGS stopped
// existing ('CompSci', 'Business', 'Arts'), and most courses now name a
// different field in requiresFaculty than the save recorded — both are
// stored verbatim in a v4 save, so an un-migrated v4 run would hold
// faculty in fields nothing can be hired into and courses gated on fields
// no longer supplied. Recoverable rather than discardable: it is the same
// school with its departments renamed, so it is migrated, not dropped.
// v6: recruiting stopped being a post-and-wait errand and became a
// standing, churning candidate market. `openPostings` is gone from
// GameState entirely, and every Faculty gained a required `weeksListed`
// (the pool's clock, mirroring tenureWeeks) that a v5 save has on nobody —
// an un-migrated v5 run would increment `undefined` on every listing and
// age out the whole pool on the first tick. Recoverable, and for the same
// reason as v5: the economy, the curriculum and the roster are untouched,
// only the way faculty are ACQUIRED changed, so a run carries forward.
// v7: research landed. Three shape changes at once, all required rather
// than optional: GameState gained a `research` slice (the point stock,
// what it has produced, and the prize queue — see types.ts's
// ResearchState); every Faculty gained an `acclaim` count that the salary
// and research-output formulas read on every tick, so a v6 hire would
// otherwise multiply by `undefined` and turn the whole payroll into NaN;
// and University.name was split into a player-written name plus a fixed
// institutional suffix, with a flag recording whether the College ->
// University charter has been offered. Recoverable, and for the same
// reason as v5 and v6: the economy, the curriculum and the roster are
// untouched — a resumed run simply starts producing research the moment
// it has a lab, exactly as a new one does.
// v8: student organisations landed. GameState gained a required `orgs`
// slice (the live club and Greek-chapter lists, the petitions waiting on
// the next summer digest, and the two Hellenic Council flags — see
// types.ts's StudentOrgState), and RESOLVE_ADMISSIONS gained the digest
// answer it drains. Every read of `orgs` — financeSystem's upkeep line,
// satisfactionSystem's social contribution, studentLifeSystem's formation
// roll, and three eligible() conditions in the decision-event table —
// assumes the slice is there, so a v7 save without it would crash on the
// first tick. Recoverable, and for the same reason as v5, v6 and v7: the
// economy, the curriculum and the roster are untouched. A resumed run
// carries forward with no clubs and no council, which is precisely what a
// school that never triggered them would have anyway, and starts forming
// clubs the moment it has a student center — exactly as a new one does.
// v9: student demands landed. EventState gained three required fields —
// the demand queued for the next quiet week, the demand currently
// outstanding with its target and expiry, and the absolute week the last
// one resolved (see types.ts's StudentDemand and EventState). A v8 save
// carries none of them, so an un-migrated v8 run would hold `undefined`
// everywhere the type promises `null` or a number: the reads in
// systems/demands/demandSystem.ts happen to survive that today, which is
// exactly the kind of accident a version bump exists to stop depending on
// — every read site would have to stay undefined-tolerant forever, and the
// first one that isn't would fail on old saves only. Filled in rather than
// discarded, for the same reason as v5 through v8: the economy, the
// curriculum and the roster are untouched, and a resumed school simply
// starts being asked for things the moment its students are unhappy
// enough, exactly as a new one does.
// v10: the School of Science reorg. This is the first migration since
// v4 -> v5 where the CURRICULUM ITSELF changed shape rather than the state
// around it, and it is a bigger change than that one was: a seventh
// degree-granting school exists, six majors sit in a different school than
// they did (Biology and Psychology moved into Science; Mathematics,
// Chemistry, Physics and Environmental Science are new there), two majors
// were RETIRED outright (Pre-Med and Dentistry, which were professional
// tracks rather than undergraduate majors), four were added to backfill the
// schools those left thin (Anthropology, Pharmacy, Kinesiology,
// Neuroscience), and the lab set moved with them. Every course's prereq
// list therefore has to be re-pointed at the new structure, exactly as v4
// -> v5 re-pointed requiresFaculty — and for the same reason, by reading
// the SEED BY ID rather than by mapping old shape to new, because the
// mapping is not one-to-one.
//
// Recoverable, and generously so: the ids did not change for anything that
// survived, so a decades-in save keeps every finished course, every
// milestone (`major-complete:BIOL` is the same key whichever school Biology
// sits in), its roster, its money and its prestige stock. See the migration
// itself for what happens to a retired major.
// v11: graduate programs landed. This is a CONTENT addition rather than a
// reorg — nothing existing moved, was renamed or was retired — so it is
// the simplest kind of curriculum migration there is: the twenty-eight new
// graduate course Buildables are SPLICED IN BY ID off the seed, exactly
// the way v9 -> v10 spliced in the School of Science's new nodes, and
// every node a v10 save already holds is left completely untouched.
//
// It needs a version bump anyway, and for the reason the README gives: an
// un-migrated v10 save would hold a `tech` array with no MED/LAWS/MBAX/
// PHD* entries at all, so the six programs would simply never exist in
// that run — no gate would ever open them, because there would be nothing
// to open. That is a silently half-loaded game, which is exactly what the
// version field is for.
//
// Two things a resuming player should know, and neither is a loss of
// progress. First, an old run resumes with the programs LOCKED and
// invisible, and they reveal the moment their parent-school gate reads
// true — which for a decades-in save may be the very first tick, since the
// gate is a reading of milestones it already earned. Second, the prestige
// TARGET moves: graduate work is now the last 0.15 of curriculum breadth
// (see prestigeSystem.ts), so a school that had finished the whole
// undergraduate catalogue scores 0.85 on that input until it founds some
// programs. Prestige itself does not lurch — it is a stock that drifts 12%
// a year toward its target — so this reads as a ceiling that moved up
// rather than standing that was taken away, and founding the programs is
// what closes the gap.
// v12: the professional-school restructure. Medicine and Law each gained
// their own campus building (BLDG-MED, BLDG-LAW — a 'building'-kind
// Buildable exactly like an undergraduate school's) and their course
// counts grew (Medicine 6 -> 12, Law 5 -> 8); the MBA and the three PhD
// doctorates are untouched. Like v10 -> v11 this is a CONTENT addition, not
// a reorg — nothing an earlier save already holds moved, was renamed, or
// had its prereqs re-pointed — so it is the same ID-SPLICE migration:
// every seed node the save doesn't already have (the two buildings, plus
// the six new Medicine courses and three new Law courses) is appended at
// its seeded 'locked' status, and the eleven Medicine/Law courses a
// mature v11 save already holds are left completely untouched — same id,
// same prereqs, same status, whatever it was.
//
// THE ONE REAL EDGE CASE, flagged rather than smoothed over: a save that
// had already FOUNDED Medicine or Law under the old buildingless rule (its
// first course, and therefore the whole climb behind it, already 'done')
// keeps every one of those courses done — nothing is un-finished, no
// milestone is revoked. But BLDG-MED/BLDG-LAW arrive 'locked' regardless,
// and the academic gate that makes a professional-school building
// buildable is a read of milestones the save already earned — so on a
// save like that the building flips 'locked' -> 'available' on the very
// first tick after load (see techSystem.ts's unlockAvailable, re-checked
// every tick). The honest consequence: a player who had already staffed
// and founded a medical or law school is handed a brand-new, real
// construction bill for a hall their school apparently never had. That is
// new content applying retroactively, not a bug, and it is accepted as
// the cost of the feature rather than special-cased away — but it is
// exactly the kind of thing a migration should say out loud, so it's
// called out here and in the PR rather than left for a player to discover.
//
// A gentler-sounding but NOT special-cased variant of the same thing: a
// save whose gate was already met but that had not yet started its entry
// course (still sitting 'available' under the old rule) keeps that old
// prereqs/status exactly as spliced-nothing migrations always have — its
// entry course stays directly buildable without the building, because this
// migration re-points nothing that already exists, the same restraint
// v10 -> v11 exercised. That course quietly regains the building
// requirement's spirit only if the player hasn't already started it by the
// time they notice; there's no attempt here to retrofit the building into
// an in-flight course's prereqs.
// v13: parking removed. Parking wasn't fun, it was tedious, and it made the
// campus uglier — pretending nobody drives at this school. Removing it
// meant removing the `infrastructure` satisfaction attribute it alone fed,
// which drops the satisfaction model from five named attributes to four
// (see types.ts's SatisfactionAttributes and satisfactionSystem.ts's
// ATTRIBUTE_WEIGHTS). Unlike every migration since v9 this REMOVES content
// rather than adding it, so it is the mirror image of v9 -> v10's id-splice:
// every parking Buildable (PARKING-01 through PARKING-13, whatever their
// status) is dropped from `tech` outright, not re-pointed — there was
// nothing else in the curriculum or facility graph that ever named a
// parking id as a prereq, so nothing else needs touching.
//
// A parking lot mid-development loses its sunk cost, exactly as a retired
// Pre-Med/Dentistry course did in v9 -> v10 — the alternative, refunding a
// cost the new game has no concept of, would be inventing a payment.
// PLACEMENTS ARE NOT TOUCHED HERE DIRECTLY: a placed parking lot's
// Buildable id no longer exists in `tech` once this migration has run, and
// `sanitizePlacements` (below, run on every load after every migration)
// already drops any placement whose id isn't a placeable 'done' Buildable
// any more — the same hygiene v9 -> v10 relied on rather than duplicating.
// Return-to-tray would be pointless anyway: there is nothing left to place.
//
// The `infrastructure` key is deleted from the saved satisfactionBreakdown,
// since tickSatisfaction now only ever writes the four keys the current
// model produces and a stale fifth key would sit there forever unread.
//
// THE ONE REAL EDGE CASE, flagged rather than smoothed over, same spirit as
// v11 -> v12's above: a save with a demand — queued or already active —
// asking for "somewhere to park" carries `attribute: 'infrastructure'`,
// which data/demandData.ts's DEMAND_COPY table no longer has an entry for.
// Left alone, the very first render that tries to describe that demand
// would crash. It is dropped here instead, exactly as a demand that gets
// fixed before it can be announced already is (see demandSystem.ts's
// closeDemand): the shortfall it was about is gone along with the only
// facility that could ever have fixed it, so there is nothing left to ask
// for. The demand cooldown is deliberately left untouched rather than
// reset — the player is not owed an immediate re-roll just because their
// one outstanding demand happened to be this one, and queueDemand will
// raise a real shortfall, if the campus has one, on its own ordinary
// timeline.
// v14: two map-cosmetic placement capabilities landed together — rotating a
// building before siting it, and drawing/erasing decorative tile-edge
// pathways — so the save shape is versioned ONCE for both rather than
// twice in a row.
//
// ROTATION needs NO data migration at all. Orientation was deliberately
// never given its own field (see campusMap.ts's orientedFootprint) — a
// rotated building is stored as whatever {row,col,w,h} it actually occupies
// once set down, which is exactly the shape Placement already had since v4.
// Every placement a v13 save holds is already valid under v14 as-is: it
// simply reads as "never rotated", which is the truth, since rotation
// didn't exist yet when it was placed.
//
// PATHWAYS is the one real shape change: GameState gains a required
// `pathways` slice (types.ts's Pathways) that CampusMap.tsx now reads and
// writes unconditionally. A v13 save has no such key, so this is a pure
// fill-in — an empty pathway set, exactly the layout a v13 campus actually
// had, since edge-drawing didn't exist for it to have used. No existing
// content moves, is renamed, or is retired; nothing else reads this slice,
// so nothing else needed a migration.
// v15: five new campus-life facilities (facilitiesData.ts's gym, tennis
// courts, pool, performing arts center, art gallery) — more `social`
// satisfaction capacity, plus the performing arts center's gate on the Arts
// & Media school's three majors' tier-3 capstone courses (techData.ts's
// ARTS_GATED_MAJOR_PREFIXES). This is a CONTENT ADDITION with no reorg
// behind it — nothing existing moved, was renamed, or was retired — so it
// is the same ID-SPLICE shape v10 -> v11 and v11 -> v12 used, just sourced
// from initialFacilities() instead of initialTech() (nothing before this
// ever needed to splice a facilitiesData.ts id into an existing save,
// because every prior facility landed before SAVE_VERSION existed at all —
// see facilitiesData.ts's own history).
//
// It needs the bump for the same reason those two did: an un-migrated v14
// save would hold a `tech` array with none of the five new ids, so they
// would simply never exist for that run — nothing to build, forever. That
// is a silently half-loaded game.
//
// The performing arts center's course-prereq change is DELIBERATELY NOT
// migrated onto existing courses. A v14 save's GRDS210/MUSC210/SART210-240
// nodes keep whatever prereqs/status they already have (no facility
// requirement) — exactly the restraint v11 -> v12's comment spells out for
// its own building requirement: this migration re-points nothing that
// already exists, splices only what's missing. A save that already
// finished those capstones keeps them finished, un-un-locked. A save
// still climbing toward one only ever sees the OLD (school-building-only)
// gate, because that is the prereqs array it already has on disk; the new
// gate only applies to a fresh game, whose initialTech() bakes it in from
// the start. The one save-visible consequence: an old and a new game reach
// arts capstones under slightly different rules, which is the accepted,
// honestly-flagged cost of this shape of migration, same as v11 -> v12's
// buildingless-founding edge case.
// v16: varsity athletics landed — a shallow v1 grown out of clubs (see
// data/studentLifeData.ts and data/eventData.ts's 'varsity-petition').
// Three shape changes, all fill-ins:
//
//   - StudentOrgState gains a required `teams` array (empty — a v15 school
//     genuinely had no varsity teams, since sport clubs didn't exist to
//     petition with) and a required `athleticsInvestment` tier, defaulted
//     to 'medium' — the same "pure fill-in with no reconstruction" shape
//     v7 -> v8 used for the whole orgs slice.
//   - Every existing StudentClub gains `sport: null` and `varsityAsked:
//     false` — a v15 club was never rolled against SPORT_CLUB_SHARE, so it
//     genuinely isn't a sport club and has never been asked to go varsity.
//   - The five athletics venue Buildables (facilitiesData.ts's
//     ATH-FIELD/ATH-ARENA/ATH-DIAMOND/ATH-NATATORIUM/ATH-STADIUM) are
//     ID-SPLICED in from initialFacilities(), the same shape v14 -> v15
//     used for the rec/arts facilities — EXCEPT, unlike that migration,
//     spliced in at their SEEDED 'locked' status rather than 'available':
//     these are reveal-gated (see Buildable.athleticsVenueReveal), and a
//     migrated save's `teams` array is freshly empty, so no gate can
//     possibly read true yet. A fresh game's initialFacilities() call
//     produces the exact same 'locked' status for the exact same reason —
//     the one thing this migration note asks to be confirmed, and is: a
//     fresh game and a migrated game agree on every venue's initial status.
// v17: the campus-map footprint rescale — an academic hall grew from 2x2 to
// 9x9, everything else in campusMap.ts's footprint tables scaled with it
// (a dorm 2x1 -> 9x3, a lab (fallback) 1x1 -> 3x3, and so on down the whole
// table — see the PR notes for the full before/after and the coverage
// math), and CAMPUS_GRID_WIDTH/HEIGHT grew from 28x12 to 126x54 (the same
// 4.5x-per-side scale, so the grid and its landmark building move together)
// to keep a fully built-out campus reading as roughly a third of the grid
// rather than swamping it.
//
// PLACEMENTS: every {row, col, w, h} a v16 save holds describes a rectangle
// sized for the OLD table — a hall anchored at its old 2x2, not the new
// 9x9. Rescaling those numbers in place (multiplying w/h by ~4.5 and
// re-solving for a layout that no longer overlaps) was considered and
// rejected: placement is purely visual and cosmetic (see types.ts's
// Placement block), so there is no reading of "what the player meant" to
// preserve — a rescaled-in-place layout would still need every placement
// re-checked against every other for new overlaps, on a grid whose own
// dimensions also just changed, which is a full re-solve dressed up as a
// migration. The chosen answer is the plain one: DROP every placement
// (`placements` -> `{}`), and every finished building simply returns to the
// awaiting-siting tray at its new footprint, exactly as sanitizePlacements
// already does one-by-one for a placement that no longer fits. Nothing
// mechanical is lost — a building's effects apply on completion, not on
// placement — the only cost is a resuming player re-sites a campus they'd
// already arranged, which is the honest trade for a scale change this size.
//
// PATHWAYS are NOT touched. A drawn pathway is a set of edges on the tile-
// corner grid (types.ts's PathEdge), and the grid only ever GREW on both
// axes (28x12 -> 126x54) — every edge a v16 save holds is still a valid
// in-bounds edge on the v17 grid (isEdgeInBounds's bounds check is
// satisfied a fortiori by a larger grid), so sanitizePathways (run on every
// load regardless) is already the complete migration for this slice; no
// entry here needs to touch `pathways`. A resumed campus keeps its old
// paths exactly where they were drawn, now near the corner of a much bigger
// lawn — cosmetically orphaned from the (now-cleared) buildings they used
// to run between, but that was already true of any path drawn next to a
// building the player demolished, and is no more special-cased here than
// that was.
export const SAVE_VERSION = 17;

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
//
// A migration runs on a state in the OLD shape, which by definition is not
// the current GameState — fields it still has may since have been removed.
// LegacyGameState below is how those are addressed without weakening the
// live type: it is GameState plus the removed fields, marked optional, so
// each step can read and clear what its own version actually had. Anything
// added here should be deleted again by the migration that removes it, so
// the list stays a record of what has been dropped rather than growing
// forever.
// ---------------------------------------------------------------------
interface LegacyGameState extends GameState {
  // Removed in v6, when job postings gave way to the standing candidate
  // market: Faculty `field` -> weeks remaining until that posting's
  // candidate arrived.
  openPostings?: Record<string, number>;
}

// The two institutional suffixes a saved name may already end in. A v6
// name was one free-form string the player typed, so this is the only
// evidence available about which half is which.
const KNOWN_SUFFIXES = ['College', 'University'];

const MIGRATIONS: Record<number, (state: LegacyGameState) => void> = {
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

  // v4 -> v5: the faculty-field taxonomy became 26 departments and every
  // major was reassigned to one. Nothing about the run's SHAPE changed —
  // only which field string a course asks for and a hire supplies — so the
  // whole migration is a re-pointing of those strings at the new taxonomy.
  //
  // Courses are re-read from the seed by id rather than mapped old-field ->
  // new-field, because the mapping isn't one-to-one: 'Business' split four
  // ways by major, so only the seed knows that FINA belongs to Accounting &
  // Finance and SPCO to Operations Research. Progress is untouched — status,
  // prereqs, cost and every other authored field on the saved node stay as
  // the player left them; a saved course that no longer exists in the seed
  // simply loses its gate rather than keeping a dead one.
  //
  // Faculty (and unhired candidates, and open postings, which are KEYED by
  // field) are remapped by name through LEGACY_FIELD_RENAMES: ten of the
  // thirteen old fields are still live departments and pass through
  // untouched, and the three that were merged away follow their hires to
  // the nearest surviving one, so no hire the player paid for is lost.
  //
  // What this deliberately does NOT do is rebalance the resumed roster: a
  // save whose six 'Business' professors all land in Management will find
  // its Finance and Marketing courses over-subscribed (their slots are
  // occupied by already-developing/done courses, per techSystem.ts's
  // usedFacultySlots) until the player posts openings in those departments.
  // That blocks STARTING new development in those fields only — no course
  // in flight is cancelled, nothing is refunded, and posting for the new
  // departments clears it — which is the same stall a player who under-hires
  // in a field already experiences, not a broken save.
  4: (state) => {
    const seededFields = new Map(
      initialTech()
        .filter((node) => node.requiresFaculty)
        .map((node) => [node.id, node.requiresFaculty as string]),
    );
    for (const node of state.tech) {
      if (!node.requiresFaculty) continue;
      const reassigned = seededFields.get(node.id);
      if (reassigned) node.requiresFaculty = reassigned;
      else delete node.requiresFaculty;
    }

    const liveField = (field: string): string => LEGACY_FIELD_RENAMES[field] ?? field;
    for (const f of state.faculty) f.field = liveField(f.field);
    for (const c of state.candidates ?? []) c.field = liveField(c.field);

    // At most one posting per field, so two old fields collapsing into one
    // new department keeps the posting that resolves soonest rather than
    // silently dropping one of the two the player paid for. (v6 drops
    // postings entirely a step later; this still runs because each
    // migration's job is to produce a valid save at ITS OWN next version,
    // not to guess what a later one will throw away.)
    const postings: Record<string, number> = {};
    for (const [field, weeksLeft] of Object.entries(state.openPostings ?? {})) {
      const next = liveField(field);
      postings[next] = next in postings ? Math.min(postings[next], weeksLeft) : weeksLeft;
    }
    state.openPostings = postings;
  },

  // v5 -> v6: job postings out, standing candidate market in.
  //
  // An in-flight posting cannot be carried forward — there is nothing left
  // to carry it into — so `openPostings` is simply dropped, and with it any
  // fee already paid on a posting that had not resolved. That is a real (if
  // small) loss to a resuming player, and it is the right trade: what they
  // get back is a pool that already has ~30 people standing in it, which is
  // strictly more hiring power than the one candidate the posting owed them.
  // No refund is issued, deliberately — refunding into a model that has no
  // posting fee at all would be inventing a payment the new game can't
  // explain.
  //
  // Listings are staggered across the window rather than all starting at 0
  // for the same reason initialCandidatePool staggers them: a pool that
  // aged in lockstep would empty and refill in waves instead of churning.
  // Anyone already on the ROSTER gets 0 — they are not listed at all — and
  // the pool tops itself back up to target on the first tick after load.
  5: (state) => {
    delete state.openPostings;
    for (const f of state.faculty) f.weeksListed = 0;
    for (const c of state.candidates ?? []) {
      c.weeksListed = Math.floor(Math.random() * CANDIDATE_LISTING_WEEKS);
    }
    if (!Array.isArray(state.candidates)) state.candidates = [];
  },

  // v6 -> v7: research, faculty acclaim, and the split institution name.
  //
  // The research slice starts EMPTY rather than being back-filled from
  // the resumed school's labs and roster. A synthetic starting stock
  // would be inventing history — the run genuinely did not do that
  // research — and the cost of not doing it is only that a resumed
  // mature school waits one output cadence for its first grant, while
  // producing points from its first tick like any other lab-equipped
  // school. Nothing is lost and nothing is fabricated.
  //
  // Acclaim is 0 on everyone for the same reason: no prize was ever
  // awarded in a v6 run, because prizes did not exist. It is the one
  // field here that MUST be written rather than left absent — the salary
  // curve multiplies by it every tick.
  //
  // The name is split on the evidence the save actually carries. A name
  // ending in " College" or " University" is split there, which is the
  // overwhelmingly common case (the old startup screen's own placeholder
  // was "e.g. Ashcombe University"), and a school still calling itself a
  // College keeps the charter offer ahead of it. Anything else is kept
  // WHOLE, with an empty suffix — institutionName renders that exactly as
  // the school always looked — and the charter is marked already offered,
  // because appending a word to a name whose shape we can't read would
  // rename the player's school out from under them.
  6: (state) => {
    state.research = {
      points: 0, lifetimePoints: 0, grants: 0, grantIncome: 0,
      breakthroughs: 0, prizes: 0, lastOutputWeek: 0, pendingPrizes: [],
    };
    for (const f of state.faculty) f.acclaim = 0;
    for (const c of state.candidates ?? []) c.acclaim = 0;

    const full = (state.self.name ?? '').trim();
    const matched = KNOWN_SUFFIXES.find((suffix) => full.endsWith(` ${suffix}`));
    if (matched) {
      state.self.name = full.slice(0, full.length - matched.length - 1);
      state.self.suffix = matched;
      state.self.universityCharterOffered = matched === 'University';
    } else {
      state.self.name = full;
      state.self.suffix = '';
      state.self.universityCharterOffered = true;
    }
  },

  // v7 -> v8: the student-organisation slice.
  //
  // A pure fill-in with an EMPTY slice, and deliberately not a
  // reconstruction. There is no evidence in a v7 save about what student
  // life the school had, because it had none — clubs did not exist — so
  // seeding a resumed school with a few plausible clubs would be inventing
  // history the run never played, the same objection that kept v6 -> v7
  // from back-filling a research stock.
  //
  // The council is un-offered rather than declined: a resumed school with
  // a student center and enough clubs will be asked about Greek life in
  // due course, like any other. The cost of starting empty is only that a
  // mature resumed campus spends a few years growing a club scene it
  // "should" already have had, which is indistinguishable from a school
  // that simply never organised one.
  7: (state) => {
    state.orgs = {
      clubs: [], chapters: [], teams: [], pendingPetitions: [],
      hellenicCouncilApproved: false, hellenicCouncilOffered: false, lastFormationWeek: 0,
      // Filled in here (rather than left for the v15 -> v16 migration to
      // backfill) because this step reconstructs the WHOLE slice from
      // nothing — a v7 save has no orgs at all — so there is nothing later
      // for v15 -> v16 to find missing; it simply runs as a no-op on a save
      // that came through here first.
      athleticsInvestment: 'medium',
    };
  },

  // v8 -> v9: the student-demand slice of EventState.
  //
  // A pure fill-in, and the only sensible one: a v8 run genuinely had no
  // demands, so it resumes with none outstanding and none queued. The
  // cooldown is cleared (0 = never), which means a resumed school that is
  // ALREADY below the satisfaction threshold can be asked for something
  // straight away rather than serving a cooldown for a demand it never
  // received — the school's students have every right to be unhappy about
  // a campus that was neglected before the save was written.
  8: (state) => {
    state.events.pendingDemand = null;
    state.events.activeDemand = null;
    state.events.lastDemandWeek = 0;
  },

  // v9 -> v10: the School of Science reorg (see SAVE_VERSION above).
  //
  // THE SHAPE OF THE PROBLEM. Unlike every migration since v5 this is not a
  // fill-in: the seed the saved `tech` array was generated from no longer
  // exists. Three kinds of node need three different answers.
  //
  //   SURVIVING nodes (everything except Pre-Med and Dentistry) are
  //   re-pointed against the current seed BY ID, keeping only `status`.
  //   This is the v4 -> v5 trick, widened from requiresFaculty to the whole
  //   authored node, and it is what makes the reorg free: BIOL110's prereqs
  //   now name BLDG-SCIENCE instead of BLDG-HEALTHSCI, LAB-BIOL now hangs
  //   off the Science Center, NUTR130 still requires BIOL101 (which is now
  //   a cross-school prereq), and every new bridge and retitled course
  //   arrives — all without the save having to know any of it. Keeping
  //   `status` and nothing else is the point: progress is the player's,
  //   structure is the seed's.
  //
  //   NEW nodes (Science's six majors, the four backfill majors, the
  //   Science Center, the Chemistry/Physics/Neuroscience labs) are appended
  //   from the seed at their seeded status. They are locked; the resolver
  //   opens them on the first tick like anything else.
  //
  //   RETIRED nodes (Pre-Med, Dentistry, and their two labs) are DROPPED,
  //   and this is the one place a resuming player loses something. The
  //   alternative — mapping a completed Pre-Med onto, say, Pharmacy — was
  //   rejected: it would mark a major complete whose nine courses the player
  //   has never developed and which are all still locked, so the Curriculum
  //   tab would show a finished major full of unbuilt courses and the
  //   milestone would be a lie. A clean retirement is honest instead. What a
  //   player who had finished Dentistry actually sees: Health Science now
  //   lists Pharmacy, Kinesiology and Neuroscience where Pre-Med and
  //   Dentistry were, all at tier 1; the two majors and their coursework are
  //   gone from the catalogue along with their weekly running cost (~$12.5k
  //   a week if both were fully built, labs included, which is a small
  //   ongoing REFUND against the sunk development spend, for which there is
  //   none); and their two milestones stop counting toward curriculum
  //   breadth. Prestige does not lurch: it is a stock that drifts 12% a year
  //   toward its target (see prestigeSystem.ts), so a slightly lower target
  //   is a slow settle, not a reset. Their Clinical Health and Chemistry
  //   professors are untouched — those departments now staff Pharmacy and
  //   the Chemistry major.
  //
  // STATUS IS RECOMPUTED for locked/available nodes, because 'available'
  // means "prereqs are done" and the prereqs just changed underneath the
  // save. A BIOL110 that was available under the Health Sciences Building
  // is locked again until the Science Center stands, and unlockAvailable()
  // re-opens it the moment it does. 'developing' and 'done' are never
  // touched — no course in flight is cancelled and nothing finished is
  // un-finished.
  9: (state) => {
    const seed = initialTech();
    const seedById = new Map(seed.map((node) => [node.id, node]));

    // Every id the reorg retires. Listed explicitly rather than derived by
    // pattern: `state.tech` also holds dorms and campus-life facilities from
    // the other two seeds, and "an id the curriculum seed no longer has" is
    // true of every one of those too.
    const retired = new Set<string>([
      ...[101, 110, 120, 130, 140, 210, 220, 230, 240].flatMap((n) => [`PMED${n}`, `DENT${n}`]),
      'LAB-PMED', 'LAB-DENT',
    ]);

    const migrated: Buildable[] = [];
    const carried = new Set<string>();
    for (const node of state.tech) {
      if (retired.has(node.id)) continue;
      const fresh = seedById.get(node.id);
      if (fresh) {
        migrated.push({ ...fresh, status: node.status });
        carried.add(node.id);
      } else {
        // A dorm or a campus-life facility: not this seed's business.
        migrated.push(node);
      }
    }
    for (const node of seed) {
      if (!carried.has(node.id)) migrated.push({ ...node });
    }
    state.tech = migrated;

    // Re-derive 'available' from the NEW prereqs. Read-only against 'done',
    // which nothing in this pass changes, so one pass is enough.
    const done = new Set(state.tech.filter((node) => node.status === 'done').map((node) => node.id));
    for (const node of state.tech) {
      if (node.status !== 'locked' && node.status !== 'available') continue;
      node.status = node.prereqs.every((id) => done.has(id)) ? 'available' : 'locked';
    }

    // A retired course that was mid-development stops developing. Its cost
    // was charged up front and is sunk, the same as any other spend on
    // something the school no longer has.
    for (const id of Object.keys(state.developing)) {
      if (retired.has(id)) delete state.developing[id];
    }

    // The retired majors' milestones. curriculumBreadthScore() walks
    // milestoneSchools() and would never read these again, so this is
    // hygiene rather than a fix — but a stale `major-complete:DENT` sitting
    // in the save forever is exactly the kind of thing the next migration
    // trips over.
    for (const prefix of ['PMED', 'DENT']) {
      delete state.milestones[`major-complete:${prefix}`];
      delete state.milestones[`major-mastered:${prefix}`];
    }
    // school-complete:* is deliberately LEFT ALONE. A school whose majors
    // changed keeps the milestone it earned — Health Science was genuinely
    // finished under the curriculum the player played, and taking that back
    // years later would cut the prestige target for work they actually did.
    // Nothing re-locks it either: checkMilestones only ever sets.

    // Faculty and candidates: no field was retired by this reorg (two were
    // ADDED — see facultyData.ts's note on LEGACY_FIELD_RENAMES), so this
    // is a no-op on any save that has already been through v4 -> v5. It runs
    // anyway because a v3 save reaching v10 has, and a defensive pass costs
    // one map lookup per person.
    const liveField = (field: string): string => LEGACY_FIELD_RENAMES[field] ?? field;
    for (const f of state.faculty) f.field = liveField(f.field);
    for (const c of state.candidates ?? []) c.field = liveField(c.field);
  },

  // v10 -> v11: graduate programs (see SAVE_VERSION above). An ID SPLICE,
  // and only that: every seed node the save does not already have is
  // appended at its seeded status, and every node it does have is left
  // exactly as it is.
  //
  // Deliberately NOT the wider "re-point every surviving node against the
  // seed" pass v9 -> v10 ran. That pass existed because the reorg changed
  // the prereqs, schools and labs of nodes the save already held; this
  // change touches none of them, so re-pointing would be rewriting
  // hundreds of nodes to the values they already carry — a lot of
  // opportunity for a typo in the seed to silently reach into old runs, for
  // no benefit. Splice what is new, touch nothing else.
  //
  // The new nodes arrive 'locked', which is right: a graduate course waits
  // on its program's parent-school gate (techSystem.ts's meetsUnlockGates
  // -> graduateGateMet), and the resolver runs that check on the first
  // tick after the load, so a save that has ALREADY earned the gate opens
  // its programs immediately and one that has not simply doesn't see them
  // yet. There is no status to re-derive for anything else, because
  // nothing else changed.
  10: (state) => {
    const have = new Set(state.tech.map((node) => node.id));
    for (const node of initialTech()) {
      if (!have.has(node.id)) state.tech.push({ ...node });
    }
  },

  // v11 -> v12: the professional-school restructure (see SAVE_VERSION
  // above). The exact same id-splice shape as v10 -> v11: every seed node
  // the save doesn't already have — BLDG-MED, BLDG-LAW, and the nine new
  // Medicine/Law courses (Medicine's six new 5xx courses, Law's three) —
  // is appended at its seeded 'locked' status, and every node the save
  // already holds (the eleven pre-existing Medicine/Law courses, whatever
  // their status) is left completely untouched: same id, same prereqs,
  // same status. Nothing is re-pointed, for the same reason v10 -> v11
  // didn't re-point either — see that migration's comment.
  //
  // The two buildings' academic gate is a read of milestones the save may
  // already have earned, so a save that met Medicine's or Law's gate
  // before this landed sees its new building flip 'locked' -> 'available'
  // on the very first tick after load (techSystem.ts's unlockAvailable
  // re-checks dynamic gates every tick, not just on load) — including a
  // save that had already FOUNDED the program under the old buildingless
  // rule, whose courses all stay 'done' untouched while the brand-new
  // building sits there waiting to be built. See the longer note above
  // SAVE_VERSION for why that's an accepted, honestly-flagged consequence
  // rather than a bug.
  11: (state) => {
    const have = new Set(state.tech.map((node) => node.id));
    for (const node of initialTech()) {
      if (!have.has(node.id)) state.tech.push({ ...node });
    }
  },

  // v12 -> v13: parking removed (see SAVE_VERSION above). The mirror image
  // of v9 -> v10's id-splice: every parking Buildable is DROPPED from
  // `tech` rather than appended, since nothing else in the curriculum or
  // facility graph ever named a parking id as a prereq. A lot mid-
  // development loses its sunk cost, exactly as a retired Pre-Med/Dentistry
  // course did in v9 -> v10.
  //
  // Placements are deliberately NOT touched here: a placed parking lot's
  // id no longer exists in `tech` once this runs, and `sanitizePlacements`
  // (below, run on every load after every migration) already drops any
  // placement whose id isn't a placeable 'done' Buildable any more — the
  // same hygiene v9 -> v10 relied on for its own retired ids rather than
  // duplicating.
  12: (state) => {
    const isParking = (id: string): boolean => id.startsWith('PARKING-');
    state.tech = state.tech.filter((node) => !isParking(node.id));
    for (const id of Object.keys(state.developing)) {
      if (isParking(id)) delete state.developing[id];
    }

    // A stale fifth key nothing recomputes any more — tickSatisfaction
    // only ever writes the four keys the current model produces.
    delete (state.students.satisfactionBreakdown as unknown as Record<string, number>).infrastructure;

    // THE ONE REAL EDGE CASE (see the longer note above SAVE_VERSION): a
    // queued or active demand asking for "somewhere to park" carries an
    // attribute data/demandData.ts's DEMAND_COPY no longer has an entry
    // for, which would crash the first render that tries to describe it.
    // Dropped here exactly as a demand that gets fixed before it can be
    // announced already is (see demandSystem.ts's closeDemand) — the
    // shortfall it was about is gone along with the only facility that
    // could ever have fixed it.
    const asksForParking = (demand: { attribute: string | null } | null): boolean =>
      demand?.attribute === 'infrastructure';
    if (asksForParking(state.events.pendingDemand)) state.events.pendingDemand = null;
    if (asksForParking(state.events.activeDemand)) state.events.activeDemand = null;
  },

  // v13 -> v14: rotation + tile-edge pathways (see SAVE_VERSION above).
  //
  // Rotation writes nothing here — see the long note above SAVE_VERSION —
  // every placement a v13 save has is already a valid, unrotated v14
  // placement as-is.
  //
  // Pathways is a pure fill-in with an EMPTY set, and deliberately not a
  // reconstruction: a v13 campus genuinely had no drawn paths, because
  // edge-drawing did not exist, the same reasoning v7 -> v8 used for the
  // empty student-org slice and v8 -> v9 for no outstanding demands.
  13: (state) => {
    state.pathways = {};
  },

  // v14 -> v15: five new campus-life facilities (see SAVE_VERSION above).
  // The exact same id-splice shape as v10 -> v11 / v11 -> v12, just sourced
  // from initialFacilities() instead of initialTech() — every seed facility
  // the save doesn't already have is appended at its seeded 'available'
  // status, and every node the save already holds is left completely
  // untouched. No course prereqs are re-pointed here — see the long note
  // above SAVE_VERSION for why that's deliberate.
  14: (state) => {
    const have = new Set(state.tech.map((node) => node.id));
    for (const node of initialFacilities()) {
      if (!have.has(node.id)) state.tech.push({ ...node });
    }
  },

  // v15 -> v16: varsity athletics (see SAVE_VERSION above). Fill in the two
  // new StudentOrgState fields, backfill the two new StudentClub fields on
  // every existing club, and id-splice the five venue Buildables in at
  // their seeded (locked) status — the same splice v14 -> v15 used, just
  // without that migration's "arrives 'available'" twist, because these are
  // reveal-gated and nothing in a migrated save can have earned the gate.
  15: (state) => {
    if (!Array.isArray(state.orgs.teams)) state.orgs.teams = [];
    if (typeof state.orgs.athleticsInvestment !== 'string') {
      state.orgs.athleticsInvestment = 'medium';
    }
    for (const club of state.orgs.clubs) {
      const legacy = club as Partial<StudentClub>;
      if (legacy.sport === undefined) legacy.sport = null;
      if (typeof legacy.varsityAsked !== 'boolean') legacy.varsityAsked = false;
    }

    const have = new Set(state.tech.map((node) => node.id));
    for (const node of initialFacilities()) {
      if (!have.has(node.id)) state.tech.push({ ...node });
    }
  },

  // v16 -> v17: the campus-map footprint rescale (see SAVE_VERSION above).
  // Every placement is dropped rather than rescaled in place — the reasoning
  // is the long note above SAVE_VERSION, not repeated here. Pathways are
  // deliberately left untouched for the same reason: the grid only grew, so
  // sanitizePathways (run unconditionally on every load) is already the
  // whole of that migration.
  16: (state) => {
    state.placements = {};
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

// Pathway hygiene, run on EVERY load (migrated or not), mirroring
// sanitizePlacements above for exactly the same reason: pathways are a
// visual layer no system reads, so a bad entry can't corrupt the sim, but
// it could still render a stray path off the edge of the grid — and unlike
// placements, an edge key is a free-form string nothing has type-checked
// since it left localStorage. Two things get dropped:
//   - unparseable keys: not the `orientation:row:col` shape this version
//     ever wrote (see campusMap.ts's parseEdgeKey).
//   - out of bounds: an edge that doesn't exist on the CURRENT grid. Unlike
//     a placement's anchor there is nothing sensible to nudge an edge back
//     to — it's a line, not a rectangle with room to slide — so an
//     out-of-bounds edge is simply dropped rather than clamped. The grid
//     has only ever grown, so this is dormant today; it exists for the day
//     CAMPUS_GRID_WIDTH/HEIGHT shrink, the same forward-looking reason
//     sanitizePlacements already clamps rather than assumes.
// A dropped edge costs the player nothing mechanically — it was decoration
// referencing ground that no longer exists.
function sanitizePathways(state: GameState): void {
  if (typeof state.pathways !== 'object' || state.pathways === null) {
    state.pathways = {};
    return;
  }
  const clean: Pathways = {};
  for (const [key, value] of Object.entries(state.pathways)) {
    if (value !== true) continue;
    const edge = parseEdgeKey(key);
    if (!edge || !isEdgeInBounds(edge)) continue;
    clean[edgeKey(edge)] = true;
  }
  state.pathways = clean;
}

// The five venue categories a team can legitimately reference — the same
// list facilitiesData.ts seeds, kept here rather than imported from it so
// this stays a defensive, self-contained check the way sanitizePlacements'
// own checks are (it doesn't import techData.ts either).
const VENUE_CATEGORIES: readonly FacilityType[] = [
  'athleticsField', 'athleticsArena', 'athleticsDiamond', 'athleticsNatatorium', 'footballStadium',
];

// Team hygiene, run on EVERY load (migrated or not), mirroring
// sanitizePlacements/sanitizePathways above for the same reason: a team is
// a visual/derived reading away from being load-bearing (its upkeep and
// social contribution are live-read every week — see
// data/studentLifeData.ts), so a bad entry here would silently misprice the
// weekly statement rather than crash outright, which is worse. Two things
// get fixed, in this order:
//   - a team whose venueCategory names something that isn't one of the five
//     known venues (content was renamed or removed between builds — can't
//     happen against the current seed, but neither could a stale placement
//     before content ever moved) is DROPPED entirely, same as an orphaned
//     placement.
//   - a team marked 'active' whose venue Buildable isn't actually 'done'
//     (a hand-edited or corrupted save) is RESET to 'awaitingVenue' rather
//     than dropped — the team itself, its coach and its upkeep are all
//     still real, only the venue claim was wrong.
function sanitizeTeams(state: GameState): void {
  if (!Array.isArray(state.orgs?.teams)) {
    if (state.orgs) state.orgs.teams = [];
    return;
  }
  state.orgs.teams = state.orgs.teams.filter((team) => VENUE_CATEGORIES.includes(team.venueCategory));
  for (const team of state.orgs.teams) {
    if (team.status !== 'active') continue;
    const venue = state.tech.find((t) => t.kind === 'facility' && t.facilityType === team.venueCategory);
    if (venue?.status !== 'done') team.status = 'awaitingVenue';
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
  sanitizePathways(state);
  sanitizeTeams(state);
  return state;
}
