import type { Buildable, Coach, FacilityType, GameState, Pathways, Placement, StudentClub } from './types';
import {
  firstFreeSpot, footprintFits, footprintIsClear, footprintOf, isInBounds, isPlaceableKind,
  parsePathTileKey, pathTileKey, placementFor,
} from './campusMap';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH, WEEKS_PER_YEAR } from './types';
import { CANDIDATE_LISTING_WEEKS, LEGACY_FIELD_RENAMES, ORIGIN_NATIONALITIES } from '../data/facultyData';
import { initialTech } from '../data/techData';
import { initialFacilities } from '../data/facilitiesData';
import {
  coachSalaryFor, initialCoachCandidatePool, LEGACY_TWO_GENDER_SPORT_MIGRATION, SPORTS,
} from '../data/studentLifeData';
import { athleticStrengthFor } from '../data/rivalData';

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
// Exported so the save-migration test harness (see test/save-migrations.test.ts)
// can seed an old-version payload under the exact key loadGame reads, exercising
// the real load+migrate path rather than a copy of it.
export const SAVE_KEY = 'unischool.save';

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
// satisfaction capacity, plus the performing arts center's and art
// gallery's gates on the Arts & Media school's Music and Studio Art majors'
// tier-3 capstone courses respectively (techData.ts's ARTS_CAPSTONE_GATE).
// This is a CONTENT ADDITION with no reorg
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
// v18: developing and placing a placeable Buildable (building/dorm/
// facility — types.ts's PLACEABLE_KINDS) collapsed from two steps into one.
// Under v17 a build was started (cost charged, status 'developing') with NO
// location, and only once it finished did the separate, purely cosmetic
// PLACE_BUILDABLE action let the player site it — the "awaiting siting"
// tray was the queue of finished-but-unplaced Buildables waiting on that
// second step. Under v18, PLACE_BUILDABLE IS how a placeable Buildable
// starts: it charges the cost, starts the countdown, and writes the
// location into s.placements all at once, so a developing placeable is
// renderable at its footprint and its tiles are reserved from week one
// (see the long comment above campusMap.ts's canPlace/firstFreeSpot). No
// GameState FIELD changed shape — `developing`, `placements` and every
// Buildable status are exactly what they always were — so there is nothing
// for LegacyGameState below to carry forward; what changed is a RELATIONSHIP
// between two fields that already existed, which is what makes this
// migration a pure RECONCILE rather than a fill-in or a splice.
//
// A v17 save can be in three shapes, and each needs its own answer:
//
//   DONE AND ALREADY PLACED needs nothing: a v17 placement already means
//   exactly what a v18 one does, whatever status the Buildable is at.
//
//   DONE BUT UNPLACED is the old "awaiting siting" tray — plus, for any
//   save founded before this version, the three Buildables that always
//   started this way (the founding dorm, dining hall and General Studies
//   Hall; see actions.ts's createInitialState, which now places them
//   itself for a fresh game) — plus a chapter house built before this
//   version, back when 'greek-housing' pushed it into the tray instead of
//   placing it itself (see eventData.ts). The tray UI is gone, so there is
//   no longer any way to place these by hand: AUTO-PLACED instead, at
//   whatever spot campusMap.ts's firstFreeSpot (a plain top-left scan)
//   finds first. The full catalogue covers under a third of the grid (see
//   types.ts's CAMPUS_GRID_WIDTH/HEIGHT comment), so in practice this
//   always finds room. The pathological case where it can't is left
//   unplaced rather than crashing or blocking the migration — the
//   Buildable stays 'done' with every effect it already granted, simply
//   invisible on the map, which sanitizePlacements (below, widened this
//   version to accept a 'developing' entry too — see its own comment)
//   already tolerates for other reasons.
//
//   DEVELOPING WITH NO LOCATION is the gnarly case flagged in the PR: a
//   build already in flight under the old two-step flow, from before a
//   location was ever asked for. The new shape's invariant — a developing
//   placeable is ALWAYS renderable at a footprint, and that footprint is
//   reserved — cannot be retrofitted onto "developing, nowhere in
//   particular", so this can't simply carry forward as-is. The SAME
//   firstFreeSpot scan the tray case uses is tried first: if room is
//   found, the location is written in and `developing[id]` (the
//   countdown) is left completely untouched — the build simply continues
//   from wherever it already was, now visible under construction with
//   whatever weeks it has left. Only if NO room can be found (the same
//   pathological case as above, and no more likely here — this is a
//   subset of Buildables that were already fewer than the full catalogue,
//   since the rest hadn't started yet) is the development CANCELLED:
//   status reverts to 'available' and the entry is dropped from
//   `developing`, WITH NO REFUND of the cost already charged. This mirrors
//   the sunk-cost precedent v9 -> v10 (a retired major mid-development) and
//   v12 -> v13 (parking) already set for dropped in-flight development:
//   refunding into a model that has no concept of undoing the charge would
//   be inventing a payment, and the alternative — leaving it "developing"
//   with nowhere to render or reserve tiles for — would violate the one
//   invariant this whole migration exists to establish. In practice this
//   branch is not expected to ever fire against the real catalogue; it
//   exists so a save that somehow hits it degrades honestly instead of
//   carrying a Buildable the new engine cannot represent.
//
// v18 -> v19: curriculum terminology (see the alignment roadmap's PR C). The
// milestone keys and the one history-snapshot field are renamed to the
// program-centric vocabulary — major-complete: -> program-established:,
// major-mastered: -> program-distinguished:, school-complete: ->
// school-distinguished:, majorsComplete -> programsEstablished — with NO
// change to meaning, so breadth and prestige are untouched. grad-program-
// complete: is deliberately left as-is. See MIGRATIONS[18].
//
// v19 -> v20: the four-cohort student model (see README's "Students: four
// aggregate cohorts" and the alignment roadmap's PR D). A v19 save carries a
// single students.enrolled number for the whole body; a mid-flight run has
// all four class years, so it is split evenly across freshman/sophomore/
// junior/senior (remainder to freshman). The trailing-year satisfaction
// accumulator is seeded empty with priorYearAvgSatisfaction set to the
// current satisfaction, so the next funnel behaves as before until a real
// year accumulates. See MIGRATIONS[19].
//
// v20 -> v21: scholarships terminology. AdmissionsSettings.financialAidRate is
// renamed to scholarshipRate — a straight field rename, meaning unchanged. See
// MIGRATIONS[20].
//
// v21 -> v22: the Arts & Media capstone gate re-split (see README's "Arts
// payoffs" and techData.ts's ARTS_CAPSTONE_GATE). The Performing Arts Center
// and Art Gallery used to share one gate (both hidden until BLDG-ARTSMEDIA
// stood) with the Performing Arts Center alone gating all three majors'
// (Graphic Design, Music, Studio Art) tier-3 capstones. Now each facility
// unlocks on its OWN major's tier-2 quartet and gates that SAME major's
// tier-3 capstones only — Music <-> Performing Arts Center, Studio Art <->
// Art Gallery — and Graphic Design drops the coupling entirely, its
// capstones reverting to the plain tier-2 prereq every non-gated major's
// capstones already use. A content-only re-point, the same shape as v9's
// School of Science reorg, scoped down to only the ids this actually
// touches. See MIGRATIONS[21].
//
// v22 -> v23: the curriculum/build/faculty alert badges (see types.ts's
// SeenState). GameState gains a required `seen` slice — three id -> true
// records tracking which courses, buildable tiles and "needed" candidates
// the player has already been shown — that Toolbar.tsx and BuildPopup.tsx
// now read unconditionally to decide whether to light a badge.
//
// A pure fill-in, but NOT an empty one: unlike v7 -> v8's empty orgs slice
// or v13 -> v14's empty pathways, seeding this one empty would tell a
// mature, decades-in save that every course it has ever revealed, every
// building it has ever been able to place, and everyone currently on its
// candidate roster is BRAND NEW — an alert badge on every menu the moment
// the save loads, for content the player has looked at a thousand times.
// So instead every id that would currently count as "visible" is marked
// seen up front, and only a genuinely new reveal after this migration runs
// raises a badge.
//
// "Visible" is approximated here as status !== 'locked' for courses and
// placeable Buildables (building/dorm/facility), rather than by re-running
// the Curriculum tab's full discoverySections algorithm (see
// tabs/CurriculumTab.tsx's visibleCourseIds) — persistence.ts is a pure
// state-layer module with no UI-component imports, and that stays true
// here rather than reaching into a .tsx view for one migration. The two
// definitions agree almost everywhere; the one gap is a course REVEALED
// alongside a just-finished school building but still 'locked' pending its
// own tier-1 prereq (a tier-2 sharing a brand-new section with a tier-1
// that isn't done yet) — that one course is left unseen and can raise a
// one-time, harmless badge that clears the instant the Curriculum tab is
// next opened. Every candidate currently on the market is marked seen
// outright (not just the "needed" ones), since the whole point is that a
// resumed roster is not news.
//
// v23 -> v24: pathways switched from edges to tiles (see CampusMap.tsx and
// types.ts's Pathways block). A drawn path used to be a line along the
// boundary between two tiles (an `orientation:row:col` key on the grid of
// tile CORNERS); it is now a whole tile (a `row,col` key on the ordinary
// tile grid), matching how it's rendered — filling a square, not straddling
// one. The two key shapes don't correspond 1:1 (an edge touches two tiles,
// neither more "the" tile than the other), so there is no reading of "what
// the player meant" to carry forward — the same reasoning v16 -> v17 used
// to drop `placements` outright for the footprint rescale, rather than
// re-solve a layout under a scheme that no longer applies. `pathways` is
// simply reset to `{}`: purely decorative, read by no system, so a
// resuming player loses some drawn walkways and nothing else. See
// MIGRATIONS[23].
// v24 -> v25: gendered sports (see README's varsity athletics note and
// data/studentLifeData.ts's SPORT_PROFILES). A sport is now one of three
// profiles — men-only, women-only, or fielding independent men's AND
// women's lineages — and SPORTS grew from 9 bare ids to 14 gendered ones.
//
// STATE SHAPE: a men's and a women's program of the same sport are two
// separate StudentClub/VarsityTeam records, distinguished by a GENDERED
// SPORTS id (club.sport / team.sport), not by a new `gender` field
// alongside a shared bare id — see the STATE SHAPE note above
// data/studentLifeData.ts's promoteToVarsityTeam for why. That is what
// keeps THIS migration a pure re-pointing of one string field (plus a
// rename) rather than a reshape: no field is added to StudentClub,
// VarsityTeam or OrgPetition, so nothing here needs LegacyGameState.
//
// A one-gender sport's id (football/baseball/fieldHockey/softball) is
// UNCHANGED — it was already a single lineage — so an existing club/team on
// one of those needs no re-pointing at all, only the naming-scheme rename
// below. Only the five TWO-GENDER sports' ids moved, from a bare 'soccer'
// to 'soccer-m', defaulting every existing club/team on them to MEN'S (see
// data/studentLifeData.ts's LEGACY_TWO_GENDER_SPORT_MIGRATION, which this
// reads rather than re-deriving): the honest reading of an existing
// "Soccer" program is that it was implicitly one squad, and defaulting to
// men's preserves it rather than inventing a second one out of nothing.
// The now-open women's lineage (soccer-w, etc.) is untouched — it was never
// fielded, so there is nothing to migrate — and can form and petition
// fresh from here: rollSportClub/sportClubsAwaitingVarsity read SPORTS and
// s.orgs.clubs/teams directly, not anything this migration writes, and
// 'soccer-w' is a plain not-yet-fielded id to both the moment this
// migration finishes — see the PR notes' confirmation that a fresh
// women's petition after migration isn't blocked by the shared original id.
//
// NAMING: every migrated club/team is also RENAMED to the new scheme,
// which is the one genuinely visible consequence of this migration. A
// pre-varsity club's name becomes its (possibly now-gendered) clubName —
// "Soccer Club" -> "Men's Soccer Club" — and a varsity team's name becomes
// its teamName — "Soccer" (captured, pre-this-PR, from the CLUB's own name
// at promotion — see the old promoteToVarsityTeam) becomes "Men's Soccer
// Team", and a ONE-gender team like 'Football' (which kept its bare
// "Football Club" club-name at promotion under the old rule) becomes
// "Football Team" — matching what every future promotion writes now that
// promoteToVarsityTeam names a team from the sport's OWN teamName field
// rather than inheriting the club's.
//
// `varsityAsked` is left completely UNTOUCHED on every migrated club/team —
// a program that already petitioned (whichever way it went) does not
// re-open, and cannot cross into the sibling gender, because the two are
// now distinct ids/records: a migrated men's team's `varsityAsked` says
// nothing about a women's club that has not even formed yet.
//
// A pending petition (raised, not yet resolved at the next summer digest)
// carrying a two-gender sport id is migrated the same way, so a petition
// already in the player's queue reads with its new name/id by the time it
// is shown. See MIGRATIONS[24].
//
// v25 -> v26: commuters (see the long note near admissionsSystem.ts and
// satisfactionSystem.ts). SatisfactionAttributes gains a fifth attribute,
// `housing`, so s.students.satisfactionBreakdown needs a value backfilled —
// 0 rather than a guess, since MIGRATIONS[25] can't know what a resuming
// save's dorm/enrollment mix would have scored and the very next tick
// overwrites it with satisfactionSystem.ts's real computation anyway (the
// same reasoning createPreStartState's own placeholder breakdown uses).
// Nothing else changed shape: `s.students.capacity` is still a plain
// number, just no longer an admissions ceiling from this version forward —
// a resuming save's existing capacity (whatever dorms it had already built)
// carries over unchanged and is simply read differently by the systems that
// use it now. See MIGRATIONS[25].
//
// v26 -> v27: procedural faculty headshots (see FacultyPortrait.tsx). Faculty
// gains `gender` (also now what picks which of a name pool's firstMale/
// firstFemale lists a first name is drawn from — see facultyData.ts's
// NAME_POOLS) and `heritage` (the name's cultural origin pool, which the
// portrait reads to bias skin tone — distinct from `nationality`, which is
// disproportionately American regardless of it). A save from before this
// version has faculty/candidates with neither field: `gender` gets a fresh
// coin flip, and `heritage` gets a real reverse lookup off the saved
// `nationality` where one exists, falling back to a random origin only for
// the common American-nationality case that carries no such signal. Nothing
// mechanical reads either field — only the portrait does — so an imperfect
// backfill costs nothing beyond what it would have anyway. See MIGRATIONS[26].
//
// v27 -> v28: a declined varsity petition is no longer permanent (see
// studentLifeData.ts's sportClubsAwaitingVarsity). StudentClub.varsityAsked
// (a boolean, set true only on decline — see MIGRATIONS[15]) is replaced by
// varsityLastAskedYear (the year of that decline, or null if never asked),
// which the petition pipeline now re-checks against the same five-year
// tenure gate a club clears once to be asked at all. A pre-v28 club that
// was never asked (varsityAsked === false) simply gets null — identical
// behaviour, nothing to recover. One that WAS declined (varsityAsked ===
// true) has no recorded decline year to restore — the save never kept
// one — so it is backfilled to the CURRENT clock year, i.e. treated as
// freshly declined: the honest "we don't know when" answer, and it means
// the club is never instantly re-offered the moment an old save loads,
// only after its own five-year cooldown from here. See MIGRATIONS[27].
//
// v28 -> v29: Athletics V2 (see README's "Student life" and
// data/studentLifeData.ts's coaching-staff block). Four shape changes:
//
//   - VarsityTeam.coachName/coachBaseSalary (a single auto-generated name
//     and a weeks-of-opex-scaled dollar figure) are replaced by
//     headCoach/assistantCoach/trainer: Coach | null, three separately
//     hireable roles. A pre-v29 team's old coachName/coachBaseSalary become
//     its new headCoach — a REAL recovery of the name (nothing about it
//     needed to change), not a fresh roll — with a rolled quality (there is
//     no quality figure to recover; the old model never had one) and a
//     tenureWeeks estimate from the team's own foundedYear, so a
//     long-retained migrated coach doesn't read as a brand-new hire. The
//     assistant coach and trainer roles arrive vacant: a pre-v29 team never
//     had them, so there is nothing to recover, only real vacancies for the
//     player to fill from here.
//   - StudentOrgState gains a required `coachCandidates` pool — seeded with
//     a full, real market (initialCoachCandidatePool(), the same
//     "starts full, not empty" reasoning facultyData.ts's own pool uses),
//     not an empty array a migrated save would otherwise wait ~6 weeks of
//     organic churn to fill.
//   - StudentOrgState.athleticsInvestment is renamed to athleticsBudget —
//     same tier value, same meaning, carried forward unchanged; the rename
//     is cosmetic (see types.ts's AthleticsBudgetTier).
//   - Rival gains a required `athleticStrength` — derived the exact same
//     way a fresh game's initialRivals() derives it (rivalData.ts's
//     athleticStrengthFor, a deterministic function of the rival's own id
//     and CURRENT reputation), so a migrated save's standings read exactly
//     like a fresh game's would at the same reputation, not a special case.
//
// See MIGRATIONS[28].
export const SAVE_VERSION = 29;

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
      clubs: [], chapters: [], teams: [],
      // A v7 save has no coaching-staff market either — the same "genuinely
      // had none" reasoning as the rest of this fill-in. MIGRATIONS[28]
      // (v28 -> v29) is what actually seeds a real pool for every save
      // reaching Athletics V2, regardless of which historical path it took
      // to get here — this empty array is never the final word.
      coachCandidates: [],
      pendingPetitions: [],
      hellenicCouncilApproved: false, hellenicCouncilOffered: false, lastFormationWeek: 0,
      // Filled in here (rather than left for the v15 -> v16 migration to
      // backfill) because this step reconstructs the WHOLE slice from
      // nothing — a v7 save has no orgs at all — so there is nothing later
      // for v15 -> v16 to find missing; it simply runs as a no-op on a save
      // that came through here first.
      athleticsBudget: 'medium',
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
    // Backfilled straight to the CURRENT (v29+) field name — MIGRATIONS[28]
    // only RENAMES an `athleticsInvestment` it finds, so a pre-v16 save
    // (which never had either field) needs the real final name here.
    const legacyOrgs = state.orgs as typeof state.orgs & { athleticsInvestment?: string };
    if (typeof legacyOrgs.athleticsBudget !== 'string' && typeof legacyOrgs.athleticsInvestment !== 'string') {
      state.orgs.athleticsBudget = 'medium';
    }
    for (const club of state.orgs.clubs) {
      const legacy = club as Partial<StudentClub> & { varsityAsked?: boolean };
      if (legacy.sport === undefined) legacy.sport = null;
      // Backfilled straight to the CURRENT (v28+) shape rather than the v16
      // boolean this migration originally wrote — MIGRATIONS[27] only
      // converts a `varsityAsked` it finds, so a pre-v16 save (which never
      // had either field) needs the real final shape here, not a
      // since-removed intermediate one.
      if (typeof legacy.varsityAsked !== 'boolean' && legacy.varsityLastAskedYear === undefined) {
        legacy.varsityLastAskedYear = null;
      }
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

  // v17 -> v18: the build-and-place collapse (see the long note above
  // SAVE_VERSION for the full reasoning). Two passes over the same growing
  // `state.placements`, so a spot firstFreeSpot hands to one Buildable is
  // already occupied by the time the next one asks.
  17: (state) => {
    const placeIfPossible = (node: Buildable): boolean => {
      const fp = footprintOf(node);
      const spot = firstFreeSpot(state.placements, fp);
      if (!spot) return false;
      state.placements[node.id] = placementFor(spot.row, spot.col, fp);
      return true;
    };

    // DONE BUT UNPLACED: the old tray. Auto-placed; left unplaced (but
    // still 'done', with every effect it already granted) in the
    // pathological case where no room is found.
    for (const node of state.tech) {
      if (isPlaceableKind(node) && node.status === 'done' && !(node.id in state.placements)) {
        placeIfPossible(node);
      }
    }

    // DEVELOPING WITH NO LOCATION: a build already in flight, from before a
    // location was ever asked for. Auto-placed with its countdown
    // untouched when room is found; cancelled with no refund when it
    // isn't — see the long note above SAVE_VERSION for why cancelling
    // (rather than leaving it "developing" nowhere) is the honest choice
    // here.
    for (const id of Object.keys(state.developing)) {
      const node = state.tech.find((t) => t.id === id);
      if (!node || !isPlaceableKind(node) || node.status !== 'developing') continue;
      if (node.id in state.placements) continue; // already placed above/somehow — nothing to do
      if (!placeIfPossible(node)) {
        delete state.developing[id];
        node.status = 'available';
      }
    }
  },

  // v18 -> v19: curriculum terminology (see README's milestone chain and the
  // alignment roadmap's PR C). A straight rename of the milestone keys and
  // the one history-snapshot field to the program-centric vocabulary, with NO
  // change to meaning — every established/distinguished program and
  // distinguished school a save earned is preserved under its new key, so
  // curriculumBreadthScore() reads exactly the same breadth after the rename
  // and prestige does not move. `grad-program-complete:` is deliberately left
  // alone: it was never part of the "major completion/mastery" vocabulary
  // this pass corrects. Runs after the older curriculum migrations (e.g.
  // v9 -> v10's PMED/DENT cleanup), which operate on the old key names as
  // they existed at their own version, so those literals must NOT be changed.
  18: (state) => {
    const milestones = state.milestones ?? {};
    const renames: Array<[string, string]> = [
      ['major-complete:', 'program-established:'],
      ['major-mastered:', 'program-distinguished:'],
      ['school-complete:', 'school-distinguished:'],
    ];
    for (const key of Object.keys(milestones)) {
      for (const [oldPrefix, newPrefix] of renames) {
        if (key.startsWith(oldPrefix)) {
          milestones[newPrefix + key.slice(oldPrefix.length)] = milestones[key];
          delete milestones[key];
          break;
        }
      }
    }
    // The renamed history-snapshot field: majorsComplete -> programsEstablished.
    for (const row of state.history ?? []) {
      const legacy = row as unknown as Record<string, number>;
      if (legacy.majorsComplete !== undefined && legacy.programsEstablished === undefined) {
        legacy.programsEstablished = legacy.majorsComplete;
        delete legacy.majorsComplete;
      }
    }
  },

  // v19 -> v20: the four-cohort student model (see the note above SAVE_VERSION
  // and README's "Students: four aggregate cohorts"). Converts the single
  // students.enrolled scalar into four class-year cohorts and seeds the
  // trailing-year satisfaction accumulator. A mid-flight run genuinely has all
  // four years, so the body is split evenly (any remainder to freshman); this
  // is a display/accounting reshape, not a change to how many students the
  // school has, so tuition/instruction/prestige read the same total the tick
  // after load.
  19: (state) => {
    const students = state.students as unknown as {
      enrolled?: number;
      cohorts?: { freshman: number; sophomore: number; junior: number; senior: number };
      satisfaction?: number;
      satisfactionYearSum?: number;
      satisfactionYearWeeks?: number;
      priorYearAvgSatisfaction?: number;
    };
    if (!students.cohorts) {
      const total = Math.max(0, Math.round(students.enrolled ?? 0));
      const per = Math.floor(total / 4);
      students.cohorts = {
        freshman: per + (total - per * 4),
        sophomore: per,
        junior: per,
        senior: per,
      };
    }
    delete students.enrolled;
    students.satisfactionYearSum ??= 0;
    students.satisfactionYearWeeks ??= 0;
    students.priorYearAvgSatisfaction ??= students.satisfaction ?? 70;
  },

  // v20 -> v21: scholarships terminology (see README's "Admissions"). A
  // straight rename of AdmissionsSettings.financialAidRate to scholarshipRate
  // with no change in meaning — it is the same 0..1 average tuition discount —
  // so a resumed run keeps its exact admissions policy.
  20: (state) => {
    const admissions = state.admissions as unknown as {
      financialAidRate?: number;
      scholarshipRate?: number;
    };
    if (admissions.scholarshipRate === undefined) {
      admissions.scholarshipRate = admissions.financialAidRate ?? 0;
    }
    delete admissions.financialAidRate;
  },

  // v21 -> v22: the Arts & Media capstone gate re-split (see SAVE_VERSION
  // above). SURVIVING-node re-point, the v9 -> v10 trick, scoped to only the
  // ids the reorg actually touches: the two facilities and the three
  // majors' four tier-3 course ids each. Every other node — both facilities'
  // unrelated fields, both majors' tier-1/tier-2 courses, and anything not
  // in this list — is left completely untouched.
  //
  // STATUS IS RECOMPUTED for locked/available nodes among the re-pointed ids
  // only, because 'available' means "prereqs are done" and those prereqs
  // just changed underneath the save — same discipline as v9. 'developing'
  // and 'done' are never touched: a Performing Arts Center, Art Gallery, or
  // capstone course already built or in flight keeps standing/developing
  // exactly as the player left it, whatever gate produced that state.
  21: (state) => {
    const REPOINTED = new Set([
      'ARTS-PAC', 'ART-GALLERY',
      'GRDS210', 'GRDS220', 'GRDS230', 'GRDS240',
      'MUSC210', 'MUSC220', 'MUSC230', 'MUSC240',
      'SART210', 'SART220', 'SART230', 'SART240',
    ]);
    const seedById = new Map(
      [...initialFacilities(), ...initialTech()].map((node) => [node.id, node]),
    );
    state.tech = state.tech.map((node) => {
      if (!REPOINTED.has(node.id)) return node;
      const fresh = seedById.get(node.id);
      return fresh ? { ...fresh, status: node.status } : node;
    });

    const done = new Set(state.tech.filter((node) => node.status === 'done').map((node) => node.id));
    for (const node of state.tech) {
      if (!REPOINTED.has(node.id)) continue;
      if (node.status !== 'locked' && node.status !== 'available') continue;
      node.status = node.prereqs.every((id) => done.has(id)) ? 'available' : 'locked';
    }
  },

  // v22 -> v23: the alert-badge `seen` slice (see SAVE_VERSION above). Seeds
  // all three records so a resumed save starts caught up on everything it
  // already had, rather than lighting up every badge at once. See
  // SAVE_VERSION's own comment for why "visible" is approximated as
  // status !== 'locked' here instead of the Curriculum tab's fuller
  // discoverySections reveal logic, and why every current candidate (not
  // just the "needed" ones) is marked seen.
  22: (state) => {
    const courseIds: Record<string, true> = {};
    const buildableIds: Record<string, true> = {};
    for (const node of state.tech) {
      if (node.status === 'locked') continue;
      if (node.kind === 'course') courseIds[node.id] = true;
      else if (isPlaceableKind(node)) buildableIds[node.id] = true;
    }
    const candidateIds: Record<string, true> = {};
    for (const c of state.candidates ?? []) candidateIds[c.id] = true;
    state.seen = { courseIds, buildableIds, candidateIds };
  },

  // v23 -> v24: pathways switched from edges to tiles (see SAVE_VERSION
  // above). The old edge-keyed set has no 1:1 reading under the new
  // tile-keyed scheme, so this simply drops it — a pure reset, the same
  // "nothing sensible to carry forward" call v13 -> v14 made when pathways
  // didn't exist yet at all, and v16 -> v17 made for `placements` under the
  // footprint rescale. sanitizePathways (run unconditionally on every load)
  // would reject every old edge key anyway, since none of them parse as a
  // `row,col` tile key — this just makes that outcome explicit rather than
  // relying on the defensive read to arrive at the same empty set.
  23: (state) => {
    state.pathways = {};
  },

  // v24 -> v25: gendered sports (see the long note above SAVE_VERSION for
  // the full reasoning). A straight re-pointing of one string field —
  // club.sport/team.sport/petition.sport — plus the rename it causes, using
  // LEGACY_TWO_GENDER_SPORT_MIGRATION so the "which old id moved where" fact
  // lives in exactly one place (data/studentLifeData.ts) rather than being
  // re-authored here. A one-gender sport's id passes through `?? sport`
  // unchanged; only the five two-gender sports' bare ids are in that table
  // at all, and they always resolve to the men's variant.
  //
  // `foundedYear`/`foundingMembers`/`foundingEnrolled`/`upkeepPerWeek` (and,
  // for a team, `venueCategory`/`coachName`/`coachBaseSalary`/`status`) are
  // completely untouched — none of them describe the sport or its gender,
  // so there is nothing about them for this migration to touch.
  24: (state) => {
    const bySport = new Map(SPORTS.map((sp) => [sp.id, sp]));
    const migrateSportId = (sport: string): string => LEGACY_TWO_GENDER_SPORT_MIGRATION[sport] ?? sport;

    for (const club of state.orgs.clubs) {
      if (club.sport == null) continue;
      const def = bySport.get(migrateSportId(club.sport));
      if (!def) continue; // defensive; can't happen against the real catalogue
      club.sport = def.id;
      club.name = def.clubName;
    }

    for (const team of state.orgs.teams) {
      const def = bySport.get(migrateSportId(team.sport));
      if (!def) continue;
      team.sport = def.id;
      team.name = def.teamName;
    }

    for (const petition of state.orgs.pendingPetitions) {
      if (petition.kind !== 'club' || petition.sport == null) continue;
      const def = bySport.get(migrateSportId(petition.sport));
      if (!def) continue;
      petition.sport = def.id;
      petition.name = def.clubName;
    }
  },

  // v25 -> v26: commuters (see the long note above SAVE_VERSION). A pure
  // fill-in for the new `housing` attribute — defensive against `??=`
  // rather than a plain assignment, since a fixture built from a CURRENT
  // createInitialState (as several of this file's own test doubles are)
  // may already carry it.
  25: (state) => {
    (state.students.satisfactionBreakdown as unknown as Record<string, number>).housing ??= 0;
  },

  // v26 -> v27: see the SAVE_VERSION header comment above. Every faculty
  // member and candidate on a pre-v27 save is missing `gender` AND
  // `heritage` outright. `gender` gets a fresh, independent roll — the same
  // coin flip generateCandidate itself uses, just applied after the fact
  // instead of at creation; there is no signal in an old save to do better.
  // `heritage` gets a real reverse lookup where one exists: a saved
  // `nationality` of "Nigeria" can only have come from the West/East
  // African pool (see ORIGIN_NATIONALITIES), so that's an actual recovery,
  // not a guess — only the ~72% of faculty whose nationality is the generic
  // American default fall back to a uniform random origin, same as gender.
  26: (state) => {
    const originByNationality = new Map<string, string>();
    for (const [origin, countries] of Object.entries(ORIGIN_NATIONALITIES)) {
      for (const country of countries) originByNationality.set(country.nationality, origin);
    }
    const origins = Object.keys(ORIGIN_NATIONALITIES);
    for (const f of [...state.faculty, ...state.candidates]) {
      const legacy = f as unknown as Record<string, string>;
      legacy.gender ??= Math.random() < 0.5 ? 'male' : 'female';
      legacy.heritage ??= originByNationality.get(f.nationality) ?? origins[Math.floor(Math.random() * origins.length)];
    }
  },

  // v27 -> v28: see the SAVE_VERSION header comment above. Every club's
  // boolean `varsityAsked` becomes `varsityLastAskedYear` — null if it was
  // false, the CURRENT clock year (a freshly-declined backfill, not a real
  // recovered date) if it was true — and the old key is dropped so no stale
  // `varsityAsked` lingers on a migrated club.
  27: (state) => {
    for (const club of state.orgs.clubs) {
      const legacy = club as unknown as { varsityAsked?: boolean; varsityLastAskedYear?: number | null };
      legacy.varsityLastAskedYear = legacy.varsityAsked ? state.clock.year : null;
      delete legacy.varsityAsked;
    }
  },

  // v28 -> v29: Athletics V2. See the SAVE_VERSION header comment above for
  // the full shape change; this just applies it.
  28: (state) => {
    // Rename athleticsInvestment -> athleticsBudget (same value, same
    // meaning). Only present on a save that never passed through
    // MIGRATIONS[7]'s full orgs reconstruction, which already writes the
    // new name directly.
    const legacyOrgs = state.orgs as unknown as { athleticsInvestment?: string };
    if (typeof legacyOrgs.athleticsInvestment === 'string' && typeof state.orgs.athleticsBudget !== 'string') {
      state.orgs.athleticsBudget = legacyOrgs.athleticsInvestment as GameState['orgs']['athleticsBudget'];
    }
    delete legacyOrgs.athleticsInvestment;
    if (typeof state.orgs.athleticsBudget !== 'string') state.orgs.athleticsBudget = 'medium';

    // Real, full coaching-staff market — see the header comment's "starts
    // full, not empty" reasoning.
    if (!Array.isArray(state.orgs.coachCandidates)) {
      state.orgs.coachCandidates = initialCoachCandidatePool();
    }

    // Every pre-v29 team's coachName/coachBaseSalary become its headCoach —
    // the name is a real recovery, quality is a fresh roll (there was never
    // a quality figure to recover), and tenureWeeks is estimated from the
    // team's own foundedYear so a long-retained coach doesn't read as a
    // brand-new hire the week this migration runs.
    for (const team of state.orgs.teams) {
      const legacy = team as unknown as {
        coachName?: string; coachBaseSalary?: number;
        headCoach?: Coach | null; assistantCoach?: Coach | null; trainer?: Coach | null;
      };
      if (legacy.headCoach === undefined) {
        if (typeof legacy.coachName === 'string') {
          const tenureWeeks = Math.max(0, Math.round((state.clock.year - team.foundedYear) * WEEKS_PER_YEAR));
          const quality = 40 + Math.round(Math.random() * 35); // 40..75 — no prior signal, the same "fresh roll" honesty MIGRATIONS[26] uses for gender
          legacy.headCoach = {
            id: crypto.randomUUID(),
            name: legacy.coachName,
            gender: Math.random() < 0.5 ? 'male' : 'female', // no signal to recover — a pre-v29 coach was never gendered
            field: team.sport,
            quality,
            qualityPotential: Math.min(100, quality + 15),
            tenureWeeks,
            weeksListed: 0,
            salary: coachSalaryFor(quality, tenureWeeks),
          };
        } else {
          legacy.headCoach = null;
        }
      }
      if (legacy.assistantCoach === undefined) legacy.assistantCoach = null;
      if (legacy.trainer === undefined) legacy.trainer = null;
      delete legacy.coachName;
      delete legacy.coachBaseSalary;
    }

    // Every rival gains athleticStrength, derived the same way a fresh
    // game's initialRivals() would at this rival's current reputation.
    for (const r of state.rivals) {
      const legacy = r as unknown as { athleticStrength?: number };
      if (typeof legacy.athleticStrength !== 'number') {
        legacy.athleticStrength = athleticStrengthFor(r.reputation, r.id);
      }
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
//   - orphans: an id that isn't a placeable Buildable any more, or one that
//     hasn't (or no longer) started construction — 'locked' or 'available'
//     (content was renamed or removed between builds, or a v17 -> v18
//     migration cancelled an unplaceable in-flight build and reverted it to
//     'available' — see that migration). 'done' AND 'developing' are both
//     valid since v18: a placement now means "under construction or
//     finished here", not just "finished here" (see the long comment above
//     campusMap.ts's canPlace).
//   - out of bounds: a footprint that doesn't fit the CURRENT grid. The
//     anchor is nudged back inside where the footprint still fits at all —
//     the grid only ever grew so far, but shrinking it must not strand a
//     building half off the map — and dropped when it can't.
//   - overlaps: two placements covering the same tile. Can't arise from
//     the v3 migration (1x1 placements were already non-overlapping), but
//     it is the invariant footprints introduce, so it is checked rather
//     than assumed.
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

// Pathway hygiene, run on EVERY load (migrated or not), mirroring
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

// Team hygiene, run on EVERY load (migrated or not), mirroring
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
//     exist (a 'women's football' that the catalogue never fields, or an
//     id predating the v24 -> v25 gendering that the migration somehow
//     missed) is likewise DROPPED — venueCategory alone can't catch this,
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

// Seen-slice hygiene, run on EVERY load (migrated or not), mirroring
// sanitizeTeams above: `seen` is display-only (no system reads it — see
// types.ts's SeenState), so a bad entry here can't corrupt the sim, but a
// missing or malformed bucket would crash the first MARK_SEEN dispatch or
// the first badge check that indexes into it. Each of the three buckets is
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
  };
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
  sanitizeSeen(state);
  return state;
}
