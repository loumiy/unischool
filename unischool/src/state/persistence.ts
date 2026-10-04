import { tagById } from '../data/tagData';
import { campaignById } from '../data/campaignData';
import { clauseById } from '../data/alumniData';
import { quirkById } from '../data/quirkData';
import { seatDef } from '../data/seatData';
import { officeDef } from '../data/officeData';
import { CHARTER_EVENT, EVENT_CATALOGUE } from '../data/eventCatalogue';
import { promiseById } from '../data/promiseData';
import { BOARD_LETTERS } from '../data/boardData';
import { recordUnlocks } from './unlocks';
import { benchItem, isDressingItem, legacyBenchFacing } from './dressing';
import type { Advancement, AlumniClass, Buildable, CatalogueState, Dressing, FacilityType, GameState, HallOffice, HallSlot, Loan, Pathways, PendingCatalogueEvent, Placement, PromiseState, Seat, Trees } from './types';
import { clampDrawRate } from '../systems/finance/treasury';
import { facilityUpkeepOf, isPriceUpkept } from '../systems/estate/estate';
import { isSweepStep } from '../systems/finance/sweep';
import {
  ROAD_FIRST_ROW, firstFreeSpot, footprintFits, footprintIsClear, isLand, isPlaceableKind, parsePathTileKey,
  pathTileKey,
} from './campusMap';
import { CAMPUS_GRID_WIDTH, WEEKS_PER_YEAR, institutionName, standsOnCampus } from './types';
import { fellTrees } from '../data/treeData';
import { dealtSpecialization, isSpecialization } from '../data/rivalData';
import { glyphsFor, RECRUITING_MAX_LIFT, SCHOLARSHIP_ORDER, SPORTS } from '../data/studentLifeData';
import { ACADEMIC_HALL_COUNT, academicHallId, FOUNDERS_HALL_ID, graduatePrograms, initialTech, majorPrefixes } from '../data/techData';
import { initialDorms } from '../data/campusData';
import { initialFacilities } from '../data/facilitiesData';
import { FACULTY_FIELDS, FOUNDING_TENURE_WEEKS } from '../data/facultyData';
import { FOUNDING_MARKET } from '../data/foundingData';
import { TRAINING_INSTITUTE_ID } from '../data/trainingData';
import { LANDMARKS_COUNTED, LANDMARK_WINDOW_YEARS, RESEARCH_PARK_ID } from '../data/researchParkData';
import { ATHLETICS_COMPLEX_ID, isDeepRun } from '../data/athleticsComplexData';
import { FESTIVAL_EVENT, FESTIVAL_SCALES, GOODWILL_MAX, GOODWILL_START, emptyDowntown } from '../data/downtownData';
import { emptyCareer } from '../systems/faculty/career';
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
// Unbounded per-week state is what would change that. The career records
// (Plan 84C) are bounded by a career and kept for the current roster only:
// about 50 KB of a year-50 save's 490 KB.
// ---------------------------------------------------------------------

// The single save key: one run at a time. Exported so
// test/save-load.test.ts can exercise the real load path.
export const SAVE_KEY = 'unischool.save';

// Bump this whenever GameState's shape changes in a way an older save can't
// satisfy: a new required field, a renamed/retyped field, a changed meaning.
// Additive optional fields don't need a bump.
//
// From launch on (Plan 70B) every bump ships a migration: MIGRATIONS[v]
// takes a version-v state to v+1, and a save from any version the chain
// reaches loads after each step up. A save older than the chain (a
// pre-launch run) is not loaded: it is set aside under SET_ASIDE_KEY, the
// title screen says so, and the player can still download it. Each new link
// gets a fixture written by the version before it (test/save-migrations
// .test.ts, test/fixtures/). See docs/architecture/game-state.md.
export const SAVE_VERSION = 94; // Plan 87C: Walnut Hall
// The version the public build first shipped with. Saves from it on must
// keep loading; test/fixtures/save-launch.json is one.
export const LAUNCH_SAVE_VERSION = 78;

// 77 -> 78, Plan 59: the hall chain shortened to six and the Second Quad
// retired. Either leaves the save unless it is sited, since a sited hall may
// house programs and a sited quad is ground the player laid out; one that
// stands keeps its place, its slots and its effects.
function carryRetired(state: GameState): void {
  const retiredIds = ['HALL-07', 'QUAD-S2'];
  const placed = state as GameState & { placements?: Record<string, unknown> };
  if (!Array.isArray(placed?.tech)) return;
  const retired = new Set(retiredIds.filter((id) => !(placed.placements && id in placed.placements)));
  placed.tech = placed.tech.filter((t) => !retired.has(t.id));
  for (const t of placed.tech) if (Array.isArray(t.prereqs)) t.prereqs = t.prereqs.filter((id) => !retired.has(id));
}

// 78 -> 79, Plan 72E: the charter is a log line, not a modal. A save held
// at the old question takes it as the question's default did (accepted)
// and moves on a week, as answering it did.
function grantHeldCharter(state: GameState): void {
  if (state.pendingInterrupt?.type !== 'charter') return;
  const was = institutionName(state.self);
  state.self.universityCharterOffered = true;
  state.self.suffix = 'University';
  state.log.unshift({
    year: state.clock.year, week: state.clock.week, kind: 'good', topic: 'milestone',
    message: `The board has granted a university charter: ${was} is now ${institutionName(state.self)}.`,
  });
  state.pendingInterrupt = null;
  // As clock.ts's advanceClock, written out: persistence is imported early,
  // and the clock's module would join an import cycle in the tests' bundle.
  state.clock.week += 1;
  if (state.clock.week > WEEKS_PER_YEAR) { state.clock.week = 1; state.clock.year += 1; }
}

// 79 -> 80, Plan 78D: the year's decline of an offer (GameState's
// declinedOffer). A save from before it has declined nothing, which is the
// field's absence; the step only clears anything a hand-edited save carried.
function noDeclineYet(state: GameState): void {
  delete state.declinedOffer;
}

// 80 -> 81, Plan 79C: a landmark's or a milestone's applicants wait in
// students.applicantLift for the next summer's funnel. Before it they went
// into applicantPool, which the funnel overwrote, so a save from before it
// has no lift waiting.
function noLiftYet(state: GameState): void {
  state.students.applicantLift = 0;
}

// 81 -> 82, Plan 80I: a bench stores the way it faces. Before, it was
// drawn along whichever way the paving beside it ran, facing east or south
// (state/dressing.ts's legacyBenchFacing); each keeps the facing it was
// drawn with. Lamps are unchanged.
function benchFacings(state: GameState): void {
  const raw = (state as { dressing?: unknown }).dressing;
  if (typeof raw !== 'object' || raw === null) return;
  const pathways = (typeof state.pathways === 'object' && state.pathways !== null ? state.pathways : {}) as Pathways;
  const dressing = raw as Record<string, unknown>;
  for (const [key, kind] of Object.entries(dressing)) {
    const t = kind === 'bench' ? parsePathTileKey(key) : null;
    if (t) dressing[key] = benchItem(legacyBenchFacing(pathways, t.row, t.col));
  }
}

// 82 -> 83, Plan 80H: quads lose their labels. The player's names for them
// and the marks that made a quad of a space detection passed over
// (GameState's quads) go; detection reads only what the campus encloses.
function dropQuadMarks(state: GameState): void {
  delete (state as GameState & { quads?: unknown }).quads;
}

// 83 -> 84, Plan 80C: the board's confidence is removed. The ladder keeps
// its rung and its terms; the number goes. The same plan dates milestones
// (GameState's milestoneYears) and counts prizes on the history rows; a save
// from before has neither, which the chronicle reads as undated.
function dropBoardConfidence(state: GameState): void {
  const d = state.finance?.distress as (Record<string, unknown> | undefined);
  if (d && typeof d === 'object') delete d.confidence;
}

// 84 -> 85, Plan 80D: a milestone records the week it was reached
// (LadderState.reachedWeek), so its letter leaves the inbox a year after.
// A save from before it knows only the year: week 1 of it. And the
// walkthrough's steps were redrawn for a college that opens with nothing
// to teach; a save from before it was founded teaching three programs, so
// a walk held on its old third or fourth step has nothing left to do.
function milestoneWeeks(state: GameState): void {
  const reached = state.ladder.reached;
  state.ladder.reachedWeek = {};
  for (const [id, year] of Object.entries(reached)) state.ladder.reachedWeek[id] = (year - 1) * WEEKS_PER_YEAR + 1;
  const stage = state.events.opening.stage as string;
  if (stage === 'teaching' || stage === 'found') state.events.opening.stage = 'play';
}

// 85 -> 86, Plan 80G: each team carries a scholarship budget and the
// strength its recruited classes add. Before it there was no recruiting, so
// every team starts with no budget and nothing built up; flagships are
// derived from the order and the subsidy level, never stored.
function noRecruitingYet(state: GameState): void {
  for (const team of state.orgs?.teams ?? []) {
    team.scholarships = 'none';
    team.recruiting = 0;
  }
}

// 86 -> 87, Plan 84C: each professor keeps a career record (types.ts's
// Career). A save from before it knows only their tenure: they arrived that
// many weeks ago (a founding professor's head start, FOUNDING_TENURE_WEEKS,
// was served elsewhere), never before the founding, and their record at
// the college begins empty from here on. Candidates have none.
function careersFromTenure(state: GameState): void {
  const now = (state.clock.year - 1) * WEEKS_PER_YEAR + state.clock.week;
  const founders = new Set(FOUNDING_MARKET.map((p) => p.id));
  for (const f of state.faculty ?? []) {
    const here = f.tenureWeeks - (founders.has(f.id) ? FOUNDING_TENURE_WEEKS : 0);
    f.career = emptyCareer(Math.max(1, now - here));
  }
  for (const c of state.candidates ?? []) delete c.career;
}

// 87 -> 88, Plan 85C: each rival specializes in one pillar (types.ts's
// Rival.specialization), dealt off its id as a new run deals it
// (rivalData.ts's dealtSpecialization), so a loaded field is the field a
// new game would have. Its standings are left where they are: the
// unspecialized ceilings (since Plan 85D's review, targets) hold what drift
// would add from here on, and nothing is taken away at the load.
function dealSpecializations(state: GameState): void {
  for (const r of state.rivals ?? []) r.specialization = dealtSpecialization(r.id);
}

// 88 -> 89, Plan 85D: the college's own specialization (types.ts's
// GameState.specialization), chosen at the milestone. A save from before it
// has chosen nothing and heard nothing: none, with no notice sent and no
// choice offered. A college already at the milestone is told at its next
// week and offered the choice at its next summer (systems/prestige/
// milestone.ts), as a new run would be.
function noSpecializationYet(state: GameState): void {
  state.specialization = 'none';
  delete state.specializationYear;
  delete state.specializationNotice;
  delete state.specializationOffered;
}

// 89 -> 90, Plan 85E: the faculty training program. The Faculty Training
// Institute joins the catalog (a save keeps the catalog it was founded with,
// so it is added, locked: it opens at the next week for a college
// specialized in academics, as a new run's does); the year's list of
// professors trained starts empty; nobody has been trained.
function trainingProgram(state: GameState): void {
  if (Array.isArray(state.tech) && !state.tech.some((t) => t.id === TRAINING_INSTITUTE_ID)) {
    const institute = initialFacilities().find((t) => t.id === TRAINING_INSTITUTE_ID);
    if (institute) state.tech.push(institute);
  }
  state.training = { year: state.clock.year, trained: [] };
  for (const f of state.faculty ?? []) delete f.training;
  for (const f of state.faculty ?? []) if (f.career) delete f.career.training;
}

// 90 -> 91, Plan 85F: the Research Park is the research specialization's
// own building. A park standing or going up stays, with its Landmark
// Programs, whatever the college chooses (its terms are the catalog's on
// every load, refreshAuthoredText: it lifts no standing of its own now, and
// opens only to a college specialized in research). A park open but not
// begun at a college not specialized in research is closed again, as a new
// run's would be; it opens again if the college chooses research. The
// Landmark work the research term reads (ResearchState.landmarkWork) is
// read back from what the save kept: each Landmark Program running, for the
// weeks it has run, and each finished in the window, for its length, ended
// in the middle of its year; no more than LANDMARKS_COUNTED a week.
function researchParkGate(state: GameState): void {
  const park = Array.isArray(state.tech) ? state.tech.find((t) => t.id === RESEARCH_PARK_ID) : undefined;
  if (park && park.status === 'available' && state.specialization !== 'research') park.status = 'locked';
  const research = state.research;
  if (!research) return;
  const now = (state.clock.year - 1) * WEEKS_PER_YEAR + state.clock.week;
  const from = state.clock.year - LANDMARK_WINDOW_YEARS + 1;
  const byYear = new Map<number, number>();
  const span = (end: number, weeks: number) => {
    for (let w = Math.max(0, end - weeks); w < end; w += 1) {
      const year = Math.floor(w / WEEKS_PER_YEAR) + 1;
      if (year >= from && year <= state.clock.year) byYear.set(year, (byYear.get(year) ?? 0) + 1);
    }
  };
  for (const i of Object.values(research.initiatives ?? {})) {
    if (i.depth === 'landmark') span(now, Math.max(0, i.weeksTotal - i.weeksRemaining));
  }
  for (const done of research.completedInitiatives ?? []) {
    if (done.depth === 'landmark' && !done.cancelled) span((done.year - 1) * WEEKS_PER_YEAR + WEEKS_PER_YEAR / 2, 5 * WEEKS_PER_YEAR);
  }
  research.landmarkWork = [...byYear.entries()].sort((a, b) => a[0] - b[0])
    .map(([year, weeks]) => ({ year, weeks: Math.min(weeks, LANDMARKS_COUNTED * WEEKS_PER_YEAR) }));
}

// 91 -> 92, Plan 85G: the athletic performance complex. The Athletic
// Performance Complex joins the catalog (a save keeps the catalog it was
// founded with, so it is added, locked: it opens at the next week for a
// college specialized in athletics, as a new run's does), and its record of
// deep runs starts empty: no complex stood before, so nothing it produced
// is counted.
function athleticsComplex(state: GameState): void {
  if (Array.isArray(state.tech) && !state.tech.some((t) => t.id === ATHLETICS_COMPLEX_ID)) {
    const complex = initialFacilities().find((t) => t.id === ATHLETICS_COMPLEX_ID);
    if (complex) state.tech.push(complex);
  }
  if (state.orgs) state.orgs.complexRuns = [];
}

// 92 -> 93, Plan 85H: the downtown and the festival. The district, the
// town's goodwill and the festivals start where a new run's do: no growth,
// the goodwill a town starts with, no festival held. A college already
// specialized in student life (its term filled with the years until now)
// sees the district begin to grow at its next week and is asked about its
// first festival at the next Spring Term's fourth week; until a festival is
// held its term reads empty, as a new specialist's does.
function downtownStarts(state: GameState): void {
  state.downtown = emptyDowntown();
}

// 93 -> 94, Plan 87C: Walnut Hall, the seventh purchased hall, joins the
// catalog (a save keeps the catalog it was founded with, so it is added,
// locked, after Sycamore Hall: it opens once Sycamore Hall is built or
// going up, as a new run's does). A hall already carrying its id (a sited
// Cedar Hall a version-77 save kept, Plan 59) stays as it is.
function walnutHall(state: GameState): void {
  const id = academicHallId(ACADEMIC_HALL_COUNT - 1);
  if (!Array.isArray(state.tech) || state.tech.some((t) => t.id === id)) return;
  const walnut = initialTech().find((t) => t.id === id);
  if (walnut) state.tech.push(walnut);
}

// The downtown (Plan 85H), on every load: growth 0 to 1, goodwill 0 to 100,
// and the festivals a year each, no later than the save's year, of a scale
// the game knows or none, oldest first; anything else is dropped or put
// back where a new run starts.
function sanitizeDowntown(state: GameState): void {
  const raw = state.downtown as unknown as { growth?: unknown; goodwill?: unknown; festivals?: unknown } | undefined;
  if (typeof raw !== 'object' || raw === null) { state.downtown = emptyDowntown(); return; }
  const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
  const growth = finite(raw.growth) ? Math.max(0, Math.min(1, raw.growth)) : 0;
  const goodwill = finite(raw.goodwill) ? Math.max(0, Math.min(GOODWILL_MAX, raw.goodwill)) : GOODWILL_START;
  const scales: readonly string[] = [...FESTIVAL_SCALES, 'none'];
  const seen = new Set<number>();
  const festivals = (Array.isArray(raw.festivals) ? raw.festivals : []).filter((f): f is { year: number; week?: number; scale: (typeof FESTIVAL_SCALES)[number] | 'none' } => (
    typeof f === 'object' && f !== null && Number.isInteger(f.year) && f.year >= 1 && f.year <= state.clock.year
      && typeof f.scale === 'string' && scales.includes(f.scale) && (f.week === undefined || Number.isInteger(f.week))
  )).filter((f) => !seen.has(f.year) && seen.add(f.year) !== undefined)
    .map((f) => ({ year: f.year, ...(f.week !== undefined ? { week: f.week } : {}), scale: f.scale }))
    .sort((a, b) => a.year - b.year);
  state.downtown = { growth, goodwill, festivals };
}

// The Athletic Performance Complex's deep runs (Plan 85G), on every load: a
// year, a sport and a finish in the last four, no later than the save's
// year; anything else is dropped.
function sanitizeComplexRuns(state: GameState): void {
  const raw = state.orgs.complexRuns as unknown;
  state.orgs.complexRuns = (Array.isArray(raw) ? raw : []).filter((r): r is { year: number; sport: string; finish: 'champion' | 'final' | 'semifinal' } => (
    typeof r === 'object' && r !== null && Number.isInteger(r.year) && r.year >= 1 && r.year <= state.clock.year
      && typeof r.sport === 'string' && typeof r.finish === 'string' && isDeepRun(r.finish)
  )).map((r) => ({ year: r.year, sport: r.sport, finish: r.finish }));
}

// The Research Park's Landmark work (Plan 85F), on every load: a list of
// whole years and weeks, each year once, no more than LANDMARKS_COUNTED a
// week; anything else is dropped, which only empties a year of the record.
function sanitizeLandmarkWork(state: GameState): void {
  const raw = state.research.landmarkWork as unknown;
  const seen = new Set<number>();
  state.research.landmarkWork = (Array.isArray(raw) ? raw : []).filter((w): w is { year: number; weeks: number } => {
    const ok = typeof w === 'object' && w !== null && Number.isInteger(w.year) && w.year >= 1 && w.year <= state.clock.year
      && Number.isInteger(w.weeks) && w.weeks >= 0 && w.weeks <= LANDMARKS_COUNTED * WEEKS_PER_YEAR && !seen.has(w.year);
    if (ok) seen.add(w.year);
    return ok;
  }).sort((a, b) => a.year - b.year);
}

// The faculty training program (Plan 85E), on every load: the year's list
// is a year and faculty ids; a professor's training is whole numbers, its
// points no more than the potential holds; a career's trainings are years
// and teaching figures. Anything else is dropped (a training dropped leaves
// the professor growing toward the potential it raised).
function sanitizeTraining(state: GameState): void {
  const int = (n: unknown): n is number => Number.isInteger(n);
  const year = state.training as unknown as { year?: unknown; trained?: unknown } | undefined;
  if (typeof year !== 'object' || year === null || !int(year.year) || !Array.isArray(year.trained)) {
    state.training = { year: state.clock.year, trained: [] };
  } else {
    state.training.trained = [...new Set(state.training.trained.filter((id): id is string => typeof id === 'string'))];
  }
  for (const f of state.faculty) {
    const tr = f.training as unknown as Record<string, unknown> | undefined;
    if (tr === undefined) continue;
    if (typeof tr !== 'object' || tr === null || !int(tr.points) || !int(tr.potential) || !int(tr.untilWeek)
      || (tr.points as number) <= 0 || (tr.potential as number) < 0 || (tr.potential as number) > 100) {
      delete f.training;
    }
  }
  for (const c of state.candidates) delete c.training;
}

// The college's specialization (Plan 85D): one of the four pillars, with the
// year it was chosen, or none. The milestone's years are whole years, and a
// choice cannot stand before its offer.
function sanitizeSpecialization(state: GameState): void {
  const year = (y: unknown) => (Number.isInteger(y) && (y as number) >= 1 ? (y as number) : undefined);
  if (!isSpecialization(state.specialization)) state.specialization = 'none';
  const notice = year(state.specializationNotice);
  const offered = year(state.specializationOffered);
  const chosen = state.specialization === 'none' ? undefined : year(state.specializationYear) ?? offered ?? state.clock.year;
  for (const [key, value] of [['specializationNotice', notice], ['specializationOffered', offered], ['specializationYear', chosen]] as const) {
    if (value === undefined) delete state[key];
    else state[key] = value;
  }
  // A pending choice for a college that has already chosen is spent.
  if (state.pendingInterrupt?.type === 'specialization' && state.specialization !== 'none') state.pendingInterrupt = null;
}

// The chain: from-version -> the step to the next. A step mutates the parsed
// state in place and may assume only what its from-version wrote.
export const MIGRATIONS: Readonly<Record<number, (state: GameState) => void>> = {
  77: carryRetired,
  78: grantHeldCharter,
  79: noDeclineYet,
  80: noLiftYet,
  81: benchFacings,
  82: dropQuadMarks,
  83: dropBoardConfidence,
  84: milestoneWeeks,
  85: noRecruitingYet,
  86: careersFromTenure,
  87: dealSpecializations,
  88: noSpecializationYet,
  89: trainingProgram,
  90: researchParkGate,
  91: athleticsComplex,
  92: downtownStarts,
  93: walnutHall,
};

// Walks a parsed payload up the chain to SAVE_VERSION. Returns false when a
// link is missing (too old) or the version is from the future.
function migrate(payload: SavePayload): boolean {
  while (payload.version < SAVE_VERSION) {
    const step = MIGRATIONS[payload.version];
    if (!step) return false;
    step(payload.state);
    payload.version += 1;
  }
  return payload.version === SAVE_VERSION;
}

// What goes in localStorage. `savedAt` is epoch milliseconds.
export interface SavePayload {
  version: number;
  savedAt: number;
  state: GameState;
}

// Every localStorage access is wrapped: the API throws when storage is
// disabled (Safari private browsing) or over quota, and neither should take
// the run down. saveGame returns false so the caller can tell the player
// their run isn't safe; trySave also says why.
//
// 'newer' is the guard under the claim (Plan 79B, below): the stored save
// is newer than the one this tab last loaded or wrote, so another tab has
// saved since, and this tab's older game must not go over it.
export type SaveOutcome = 'saved' | 'failed' | 'newer';

export function trySave(state: GameState): SaveOutcome {
  if (saveIsNewer()) return 'newer';
  return writeSave(state) ? 'saved' : 'failed';
}

export function saveGame(state: GameState): boolean {
  return trySave(state) === 'saved';
}

function writeSave(state: GameState): boolean {
  try {
    const payload: SavePayload = { version: SAVE_VERSION, savedAt: Date.now(), state };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    knownSavedAt = payload.savedAt;
    // A save is also when a run's unlocks are banked (unlocks.ts).
    recordUnlocks(state);
    return true;
  } catch {
    return false;
  }
}

// ---- Two tabs on one save (Plan 79B) ----
//
// Every tab open on the game shares the one save. The last tab to take up
// the college (Continue, or founding one) claims it: its id goes under
// CLAIM_KEY, and every other tab hears that through the `storage` event
// (useGame.ts), stops, and saves nothing more. Under the claim, the guard:
// a tab never writes over a save newer than the one it last loaded or
// wrote, so a tab that missed the event cannot lose the newer game either.

export const CLAIM_KEY = 'unischool.save.claim';
// Per tab, surviving the reload that "Open it here" does: the page comes
// back straight into the game rather than to the title screen.
const RESUME_KEY = 'unischool.resume';

// The savedAt of the save this tab last loaded or wrote; null when it has
// seen none. Module state is per tab, which is the point.
let knownSavedAt: number | null = null;
let tabId: string | null = null;

// This tab's id, made on first use (not at import, so no test's stubbed
// Math.random is drawn from).
export function thisTab(): string {
  if (tabId === null) {
    tabId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
  return tabId;
}

// The stored save's savedAt, or null if there is none or it cannot be read.
// Read off the payload's head, as JSON.stringify writes it, before paying
// for a parse of the whole run.
function storedSavedAt(): number | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  const head = /^\{"version":\d+,"savedAt":(\d+)[,}]/.exec(raw);
  if (head) return Number(head[1]);
  try {
    const p = JSON.parse(raw) as { savedAt?: unknown };
    return typeof p.savedAt === 'number' ? p.savedAt : null;
  } catch {
    return null;
  }
}

// Whether another tab has saved since this one last loaded or wrote.
export function saveIsNewer(): boolean {
  const stored = storedSavedAt();
  return stored !== null && (knownSavedAt === null || stored > knownSavedAt);
}

// Takes the claim for this tab. Refused (false) when the stored save is
// newer than this tab's game: that tab's college is the one to open here.
export function claimSave(): boolean {
  if (saveIsNewer()) return false;
  try {
    localStorage.setItem(CLAIM_KEY, thisTab());
  } catch {
    // Storage refused: the guard still stands.
  }
  return true;
}

export function claimHolder(): string | null {
  try {
    return localStorage.getItem(CLAIM_KEY);
  } catch {
    return null;
  }
}

// Whether a `storage` event means another tab has taken the claim. A cleared
// key (site data wiped) takes nothing.
export function claimTaken(key: string | null, newValue: string | null): boolean {
  return key === CLAIM_KEY && newValue !== null && newValue !== thisTab();
}

// "Open it here": the reload comes back into the game (useGame.ts claims).
export function requestResume(): void {
  try {
    sessionStorage.setItem(RESUME_KEY, '1');
  } catch {
    // The reload lands on the title screen instead, whose Continue claims.
  }
}

// Read once per page load and cleared, so a later reload opens on the title
// as usual. Memoized: StrictMode runs initializers twice.
let resume: boolean | null = null;
export function takeResume(): boolean {
  if (resume === null) {
    try {
      resume = sessionStorage.getItem(RESUME_KEY) !== null;
      sessionStorage.removeItem(RESUME_KEY);
    } catch {
      resume = false;
    }
  }
  return resume;
}

// A save this version cannot read, kept under its own key so the next save
// does not destroy it: the policy discards old runs, but not silently.
export const SET_ASIDE_KEY = 'unischool.save.set-aside';

export interface SetAsideSave {
  version: number | null;
  savedAt: number | null;
  name: string | null;
}

function setAside(raw: string): void {
  try {
    if (localStorage.getItem(SET_ASIDE_KEY) !== null) return;
    localStorage.setItem(SET_ASIDE_KEY, raw);
  } catch {
    // Storage refused: nothing more can be done for it.
  }
}

export function readSetAsideSave(): SetAsideSave | null {
  try {
    const raw = localStorage.getItem(SET_ASIDE_KEY);
    if (raw === null) return null;
    const p = JSON.parse(raw) as { version?: unknown; savedAt?: unknown; state?: { self?: { name?: unknown } } };
    return {
      version: typeof p.version === 'number' ? p.version : null,
      savedAt: typeof p.savedAt === 'number' ? p.savedAt : null,
      name: typeof p.state?.self?.name === 'string' ? p.state.self.name : null,
    };
  } catch {
    return { version: null, savedAt: null, name: null };
  }
}

export function discardSetAsideSave(): void {
  try {
    localStorage.removeItem(SET_ASIDE_KEY);
  } catch {
    // Nothing to do.
  }
}

export function clearSave(): void {
  knownSavedAt = null;
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

// Dressing hygiene, run on every load: lamps and benches (each with a
// facing) on the land, off the buildings; anything else is dropped.
function sanitizeDressing(state: GameState): void {
  const raw = state.dressing as unknown;
  if (raw === undefined) return;
  if (typeof raw !== 'object' || raw === null) { delete state.dressing; return; }
  const clean: Dressing = {};
  for (const [key, kind] of Object.entries(raw)) {
    const t = parsePathTileKey(key);
    if (!t || !isLand(t.row, t.col) || !isDressingItem(kind)) continue;
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
      && ['termsAtRung', 'termNet', 'surplusRun', 'deficitRun', 'receivershipTermsLeft'].every(num)
      && Array.isArray(x.letters) && x.letters.every((l) => typeof l === 'string')
      && Array.isArray(x.scars) && x.scars.every((y) => Number.isInteger(y));
  })();
  if (!ok) { delete state.finance.distress; return; }
  // A letter the game no longer has would sit first in the queue unshown
  // and hold every later letter behind it.
  state.finance.distress!.letters = state.finance.distress!.letters.filter((id) => id in BOARD_LETTERS);
}

// The milestones' years (Plan 80C): optional, a year to each key; anything
// else is dropped, and the chronicle then reads the milestone as undated.
function sanitizeMilestoneYears(state: GameState): void {
  const years = state.milestoneYears as unknown;
  if (years === undefined) return;
  if (typeof years !== 'object' || years === null || Array.isArray(years)) { delete state.milestoneYears; return; }
  const clean: Record<string, number> = {};
  for (const [key, year] of Object.entries(years)) if (Number.isInteger(year)) clean[key] = year as number;
  state.milestoneYears = clean;
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
  // The standing sweep and the idle-cash watch (Plan 70D): a sweep that is
  // not one of the steps is off; a watch that is not a whole week or year is
  // dropped, which only restarts the watch.
  if (state.finance.sweepWeeks !== undefined && !isSweepStep(state.finance.sweepWeeks)) delete state.finance.sweepWeeks;
  if (state.finance.idleSince !== undefined && !Number.isInteger(state.finance.idleSince)) delete state.finance.idleSince;
  if (state.finance.idleLetterYear !== undefined && !Number.isInteger(state.finance.idleLetterYear)) delete state.finance.idleLetterYear;
  const funding = state.research?.funding;
  if (funding !== undefined && !(typeof funding === 'number' && Number.isFinite(funding) && funding >= 0)) delete state.research.funding;
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
//   - 'active' with no standing venue (standsOnCampus): reset to 'awaitingVenue',
//     since the team, coach and upkeep are still real.
//   - a scholarship level that isn't one: none; recruiting off the scale:
//     clamped to 0..RECRUITING_MAX_LIFT (full scholarships at the Athletic
//     Performance Complex, Plan 85G).
function sanitizeTeams(state: GameState): void {
  if (!Array.isArray(state.orgs?.teams)) {
    if (state.orgs) state.orgs.teams = [];
    return;
  }
  state.orgs.teams = state.orgs.teams.filter(
    (team) => VENUE_CATEGORIES.includes(team.venueCategory) && KNOWN_SPORT_IDS.has(team.sport),
  );
  for (const team of state.orgs.teams) {
    if (!SCHOLARSHIP_ORDER.includes(team.scholarships)) team.scholarships = 'none';
    team.recruiting = Number.isFinite(team.recruiting) ? Math.max(0, Math.min(RECRUITING_MAX_LIFT, team.recruiting)) : 0;
    if (team.status !== 'active') continue;
    // A venue open through an expansion still stands: saving mid-expansion
    // used to demote every team of its sport on load.
    const stands = state.tech.some((t) => t.kind === 'facility' && t.facilityType === team.venueCategory && standsOnCampus(t));
    if (!stands) team.status = 'awaitingVenue';
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
// Identity: tags the game no longer has are dropped; a malformed record is
// dropped whole, and the college is known for nothing yet.
function sanitizeIdentity(state: GameState): void {
  const raw = state.identity as unknown;
  if (raw === undefined) return;
  const p = raw as { tags?: unknown; earning?: unknown; shedding?: unknown };
  if (typeof raw !== 'object' || raw === null || !Array.isArray(p.tags) || typeof p.earning !== 'object' || typeof p.shedding !== 'object' || p.earning === null || p.shedding === null) {
    delete state.identity;
    return;
  }
  state.identity!.tags = (p.tags as unknown[]).filter((id): id is string => typeof id === 'string' && tagById(id) !== undefined);
  const log = (raw as { log?: unknown }).log;
  if (log !== undefined) {
    const kept = Array.isArray(log)
      ? log.filter((e): e is { id: string; year: number; earned: boolean } => typeof e === 'object' && e !== null
        && typeof e.id === 'string' && tagById(e.id) !== undefined && Number.isInteger(e.year) && typeof e.earned === 'boolean')
      : [];
    if (kept.length > 0) state.identity!.log = kept; else delete state.identity!.log;
  }
}

// Advancement: a malformed record is dropped whole, and a running campaign
// the game no longer has is stopped.
function sanitizeAdvancement(state: GameState): void {
  const raw = state.advancement as unknown;
  if (raw === undefined) return;
  const a = raw as Partial<Advancement>;
  const ok = typeof raw === 'object' && raw !== null && Array.isArray(a.closed)
    && typeof a.restrictedBuilding === 'number' && Number.isFinite(a.restrictedBuilding) && a.restrictedBuilding >= 0
    && (a.running === null || (typeof a.running === 'object' && a.running !== undefined && typeof a.running.campaignId === 'string'
      && Number.isFinite(a.running.raised) && Number.isFinite(a.running.target) && Number.isInteger(a.running.dueYear)
      && (a.running.dueWeek === undefined || Number.isInteger(a.running.dueWeek))));
  if (!ok) { delete state.advancement; return; }
  if (state.advancement!.running && !campaignById(state.advancement!.running.campaignId)) state.advancement!.running = null;
}

// The event catalog: a malformed record is dropped whole, and an event
// waiting that the catalog no longer has, or that is malformed, is
// dropped (a letter left naming it is cleared when answered).
function sanitizeCatalogue(state: GameState): void {
  const raw = state.catalogue as unknown;
  if (raw === undefined) return;
  const c = raw as Partial<CatalogueState>;
  const ok = typeof raw === 'object' && raw !== null && Array.isArray(c.pending)
    && typeof c.lastFired === 'object' && c.lastFired !== null
    && Number.isFinite(c.lastInlineWeek) && Number.isFinite(c.lastSeismicWeek);
  if (!ok) { delete state.catalogue; return; }
  state.catalogue!.pending = (c.pending as unknown[]).filter((p): p is PendingCatalogueEvent => {
    const e = p as Partial<PendingCatalogueEvent> | null;
    return typeof e === 'object' && e !== null && typeof e.instanceId === 'string' && typeof e.eventId === 'string'
      && (e.eventId === CHARTER_EVENT.id || e.eventId === FESTIVAL_EVENT.id || EVENT_CATALOGUE.some((x) => x.id === e.eventId)) && Number.isFinite(e.firedWeek) && Number.isFinite(e.scale) && e.scale! > 0
      && typeof e.vars === 'object' && e.vars !== null;
  });
  // The journal: malformed entries are dropped.
  const cat = state.catalogue!;
  if (cat.letters !== undefined) {
    cat.letters = Array.isArray(cat.letters) ? cat.letters.filter((l) => typeof l === 'object' && l !== null
      && typeof l.eventId === 'string' && typeof l.choiceId === 'string' && Number.isInteger(l.year)) : [];
    if (cat.letters.length === 0) delete cat.letters;
  }
  if (cat.answered !== undefined) {
    cat.answered = Array.isArray(cat.answered) ? cat.answered.filter((a) => typeof a === 'object' && a !== null
      && Number.isInteger(a.year) && [a.player, a.seat, a.timeout].every((n) => Number.isInteger(n) && n >= 0)) : [];
    if (cat.answered.length === 0) delete cat.answered;
  }
}

// The ending: a report missing its grades or its title is dropped whole,
// and so is a malformed addendum.
function sanitizeEnding(state: GameState): void {
  const raw = state.ending as unknown;
  if (raw === undefined) return;
  const e = raw as { report?: { title?: unknown; axes?: unknown; mark?: unknown; year?: unknown }; addenda?: unknown };
  const r = e.report;
  const ok = typeof raw === 'object' && raw !== null && typeof r === 'object' && r !== null
    && typeof r.title === 'string' && typeof r.mark === 'string' && Array.isArray(r.axes) && Number.isInteger(r.year);
  if (!ok) { delete state.ending; return; }
  state.ending!.addenda = Array.isArray(e.addenda)
    ? e.addenda.filter((a): a is { from: number; to: number; lines: string[] } => typeof a === 'object' && a !== null
      && Number.isInteger(a.from) && Number.isInteger(a.to) && Array.isArray(a.lines) && a.lines.every((l: unknown) => typeof l === 'string'))
    : [];
}

// Promises: a malformed record is dropped whole; entries naming a promise
// the game no longer has are dropped.
function sanitizePromises(state: GameState): void {
  const raw = state.promises as unknown;
  if (raw === undefined) return;
  const p = raw as Partial<PromiseState>;
  if (typeof raw !== 'object' || raw === null || !Array.isArray(p.active) || !Array.isArray(p.settled) || !Array.isArray(p.declined)) {
    delete state.promises;
    return;
  }
  const known = (id: unknown): id is string => typeof id === 'string' && promiseById(id) !== undefined;
  const year = (n: unknown) => Number.isInteger(n);
  const ok: PromiseState = {
    active: p.active.filter((a) => typeof a === 'object' && a !== null && known(a.id) && year(a.madeYear) && year(a.dueYear)),
    settled: p.settled.filter((a) => typeof a === 'object' && a !== null && known(a.id) && year(a.year) && typeof a.kept === 'boolean'),
    declined: p.declined.filter((a) => typeof a === 'object' && a !== null && known(a.id) && year(a.year)),
    offer: null,
  };
  // A promise's scale (Plan 76C) is optional; one that is not a positive
  // number is dropped, and the promise reads the live scale.
  for (const a of [...ok.active, ...ok.settled]) {
    if (a.scale !== undefined && !(typeof a.scale === 'number' && Number.isFinite(a.scale) && a.scale > 0)) delete a.scale;
  }
  const offer = p.offer as { ids?: unknown; decade?: unknown } | null | undefined;
  if (offer && Array.isArray(offer.ids) && typeof offer.decade === 'boolean') {
    const ids = offer.ids.filter(known);
    if (ids.length > 0) ok.offer = { ids, decade: offer.decade };
  }
  state.promises = ok;
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

// The career record (Plan 84C): a professor whose record is missing or
// malformed starts an empty one this week, and malformed entries are
// dropped. A candidate has none.
function sanitizeCareers(state: GameState): void {
  const now = (state.clock.year - 1) * WEEKS_PER_YEAR + state.clock.week;
  const int = (n: unknown): n is number => Number.isInteger(n);
  const record = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
  for (const f of state.faculty) {
    const c = f.career as unknown;
    if (!record(c) || !int(c.arrivedWeek) || ![c.courses, c.research, c.prizes, c.years].every(Array.isArray)) {
      f.career = emptyCareer(now);
      continue;
    }
    const career = f.career!;
    career.courses = career.courses.filter((x) => record(x) && typeof x.courseId === 'string' && int(x.from) && int(x.to) && x.from <= x.to);
    career.research = career.research.filter((x) => record(x) && typeof x.topicId === 'string' && typeof x.depth === 'string'
      && int(x.year) && Number.isFinite(x.years) && int(x.publications) && int(x.breakthroughs));
    career.prizes = career.prizes.filter((x) => record(x) && typeof x.name === 'string' && int(x.year) && typeof x.topicId === 'string');
    career.years = career.years.filter((x) => Array.isArray(x) && x.length === 3 && x.every(int));
    // Trainings at the institute (Plan 85E), when there are any.
    if (career.training !== undefined) {
      if (!Array.isArray(career.training)) delete career.training;
      else career.training = career.training.filter((x) => record(x) && int(x.year) && int(x.from) && int(x.to));
    }
  }
  for (const c of state.candidates) delete c.career;
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
  const offices = new Set<string>();

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
        slots.push(cleanOffice(entry?.office, hallId, offices));
      }
    }
    clean[hallId] = slots;
  }
  state.halls = clean;
}

// An office (Plan 87) survives a load only in Founders Hall, in a slot no
// program holds, naming a known office the hall does not hold twice, and
// with its closing term (if any) a whole number of weeks.
function cleanOffice(raw: unknown, hallId: string, seen: Set<string>): HallSlot {
  const office = raw as Partial<HallOffice> | undefined;
  if (hallId !== FOUNDERS_HALL_ID || !office || typeof office.id !== 'string') return { programId: null };
  if (!officeDef(office.id) || seen.has(office.id)) return { programId: null };
  seen.add(office.id);
  const kept: HallOffice = { id: office.id, openedYear: Number.isInteger(office.openedYear) ? office.openedYear as number : 1 };
  if (Number.isInteger(office.closingWeeks) && (office.closingWeeks as number) > 0) kept.closingWeeks = office.closingWeeks;
  return { programId: null, office: kept };
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
  // The year's decline (Plan 78D): a whole year and a program id, or nothing.
  const declined = state.declinedOffer as unknown;
  if (declined !== undefined) {
    const d = declined as { year?: unknown; programId?: unknown };
    const valid = typeof declined === 'object' && declined !== null
      && Number.isInteger(d.year) && typeof d.programId === 'string';
    if (!valid) delete state.declinedOffer;
  }
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

// A save keeps each Buildable's text, so a correction to the catalog would
// otherwise reach new runs only. Descriptions are always the catalog's; a
// name is the catalog's for a course (nothing renames a course), while a
// building's may be a donor's (eventData.ts's naming rights) and is kept.
let catalogText: Map<string, Pick<Buildable, 'name' | 'description' | 'project' | 'duration' | 'effects'>> | null = null;
function refreshAuthoredText(state: GameState): void {
  catalogText ??= new Map([...initialTech(), ...initialDorms(), ...initialFacilities()].map((t) => [t.id, { name: t.name, description: t.description, project: t.project, duration: t.duration, effects: t.effects }]));
  for (const t of state.tech) {
    const authored = catalogText.get(t.id);
    if (!authored) continue;
    t.description = authored.description;
    // A capital project's terms are authored too (projectData.ts): a saved
    // run opens the Graduate College from Year 15 like a new one (Plan 58).
    if (authored.project) t.project = authored.project;
    if (t.kind === 'course') t.name = authored.name;
    // A course's weeks are the catalog's until it starts (techData.ts's
    // courseWeeks, Plan 80E); one under way or taught keeps the weeks it
    // was started with, so its progress still reads against them.
    if (t.kind === 'course' && (t.status === 'locked' || t.status === 'available')) t.duration = authored.duration;
    // What a building feeds and what it costs to keep are the catalog's
    // (Plan 80F: the Athletics Complex feeds health; a facility's upkeep is
    // a share of its price, its floors and expansions with it; the towers'
    // shops are kept at the grocery's price). No state shape changes, so no
    // save version: a loaded run reads the new terms as a new one does.
    if (t.effects && authored.effects) {
      if (authored.effects.satisfactionAttribute !== undefined) t.effects.satisfactionAttribute = authored.effects.satisfactionAttribute;
      if (isPriceUpkept(t)) t.effects.upkeepPerWeek = facilityUpkeepOf(t);
      else if (t.kind === 'dorm' && authored.effects.upkeepPerWeek !== undefined) t.effects.upkeepPerWeek = authored.effects.upkeepPerWeek;
    }
  }
}

// Why a save could not be read, in the player's words (the import dialog
// shows it).
export type SaveRefusal = 'unreadable' | 'too-old' | 'too-new' | 'not-a-save';
export const REFUSAL_TEXT: Record<SaveRefusal, string> = {
  unreadable: 'The file is not a UniSchool save, or it was cut short.',
  'too-old': 'The save was made by a version of the game from before its release, which this one cannot continue.',
  'too-new': 'The save was made by a newer version of the game. Reload the page to get it.',
  'not-a-save': 'The file reads, but it holds no founded college.',
};

// Parse, migrate and sanitize one save's text: the whole load path, shared by
// the boot load and an imported file.
export function readSave(raw: string): { state: GameState; savedAt: number | null } | { refused: SaveRefusal } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { refused: 'unreadable' };
  }
  if (typeof parsed !== 'object' || parsed === null) return { refused: 'unreadable' };
  const payload = parsed as Partial<SavePayload>;
  if (typeof payload.version !== 'number' || !Number.isInteger(payload.version)) return { refused: 'unreadable' };
  if (payload.version > SAVE_VERSION) return { refused: 'too-new' };
  if (typeof payload.state !== 'object' || payload.state === null) return { refused: 'not-a-save' };
  try {
    if (!migrate(payload as SavePayload)) return { refused: 'too-old' };
  } catch {
    // A step met a state its version should not have written.
    return { refused: 'unreadable' };
  }
  if (!looksLikeGameState(payload.state)) return { refused: 'not-a-save' };
  sanitize(payload.state);
  return { state: payload.state, savedAt: typeof payload.savedAt === 'number' ? payload.savedAt : null };
}

// Returns the saved run, or null if it is missing, unreadable, too old or
// too new, or not shaped like a GameState. A corrupt save must never stop
// the app booting. A run this version cannot read is set aside, not lost,
// and the title screen says so (readSetAsideSave), before the next save
// overwrites the key.
export function loadGame(): GameState | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  // What this tab has seen, even of a save it cannot read: the next save
  // may write over that one (it is set aside), but not over a newer one.
  knownSavedAt = storedSavedAt();
  const read = readSave(raw);
  if ('refused' in read) {
    if (read.refused === 'too-old' || read.refused === 'too-new') setAside(raw);
    return null;
  }
  return read.state;
}

// ---- Export and import (Plan 70B) ----

// The run as a file: the same payload the browser keeps, named for the
// college and the year.
export function exportSave(state: GameState): { filename: string; text: string } {
  const payload: SavePayload = { version: SAVE_VERSION, savedAt: Date.now(), state };
  const slug = (state.self?.name ?? 'college').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'college';
  return { filename: `${slug}-year-${state.clock.year}.unischool.json`, text: JSON.stringify(payload) };
}

// The set-aside run's own text, for the title screen's download.
export function readSetAsideRaw(): string | null {
  try {
    return localStorage.getItem(SET_ASIDE_KEY);
  } catch {
    return null;
  }
}

// Makes an imported file the run in this browser, once readSave accepts it.
// The caller has already confirmed with the player and reloads after, so the
// run boots through loadGame like any other. Past the guard: the player has
// chosen to replace whatever is stored. It takes the claim too, so any other
// tab on the old save stops at once; the reloaded page claims again at its
// Continue.
export function adoptSave(state: GameState): boolean {
  if (!writeSave(state)) return false;
  claimSave();
  return true;
}

function sanitize(state: GameState): void {
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
  sanitizeMilestoneYears(state);
  sanitizeSeats(state);
  sanitizeQuirks(state);
  sanitizeCareers(state);
  sanitizeAlumni(state);
  sanitizeAdvancement(state);
  sanitizeCatalogue(state);
  sanitizePromises(state);
  sanitizeEnding(state);
  refreshAuthoredText(state);
  sanitizeIdentity(state);
  // A rival's specialization (Plan 85C) is one of the four pillars; anything
  // else is dealt again off its id.
  for (const r of state.rivals) if (!isSpecialization(r.specialization)) r.specialization = dealtSpecialization(r.id);
  sanitizeSpecialization(state);
  sanitizeTraining(state);
  sanitizeLandmarkWork(state);
  sanitizeComplexRuns(state);
  sanitizeDowntown(state);
  const rs = state.rivalStanding as unknown as { rivalId?: unknown; above?: unknown } | undefined;
  if (rs !== undefined && (typeof rs !== 'object' || rs === null || typeof rs.rivalId !== 'string' || typeof rs.above !== 'boolean')) delete state.rivalStanding;
  else if (state.rivalStanding && state.rivalStanding.since !== undefined && !Number.isInteger(state.rivalStanding.since)) delete state.rivalStanding.since;
  sanitizeDressing(state);
  sanitizeTeams(state);
  sanitizeChapters(state);
  sanitizeSeen(state);
  sanitizeCourseFaculty(state);
  // The year's lift (Plan 79C): a count of applicants, never negative.
  const lift = state.students.applicantLift;
  if (!(typeof lift === 'number' && Number.isFinite(lift) && lift >= 0)) state.students.applicantLift = 0;
}
