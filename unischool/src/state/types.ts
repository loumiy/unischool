// Central type definitions. Every system reads and writes this shared state.
// Keep this file authoritative: if a concept exists in the game, its shape lives here.

export interface GameClock {
  year: number;      // in-game year, starts at 1
  week: number;      // 1..WEEKS_PER_YEAR
}

export interface Finance {
  cash: number;          // liquid funds
  endowment: number;     // long-term reserve; earns a return and pays a fixed share of itself into income every year (see financeSystem.ts)
  endowmentCampaigns: number; // how many endowment campaigns have been run — each one costs more than the last (see financeSystem.ts's endowmentCampaign)
  // The school's standing LISTED price — what the summer slider opens at,
  // what a prospective student is quoted, and the only tuition figure any
  // projection of NEXT year's class reads. Setting it does not touch a
  // student already enrolled; it becomes the freshman entry of
  // tuitionByClass at the next admissions boundary, and nowhere else.
  listedTuition: number;
  // What each enrolled CLASS actually pays, locked at the price it was
  // admitted under and carried to graduation (see reducer.ts's
  // RESOLVE_ADMISSIONS, which advances these in lockstep with
  // students.classes). Four prices rather than one scalar because one
  // scalar meant a mid-stream raise repriced every student already on the
  // books — a school could stay cheap while it grew and then bill four
  // captive classes at the new price. Tuition revenue is the sum of four
  // products now (financeSystem.ts's financeBreakdown), never
  // enrolled x price.
  tuitionByClass: ClassTuition;
  // NO tuitionCeiling, and since Plan 07's PR B no baselineFundingPerWeek
  // or appropriationPerStudentPerYear either. All three were set by school
  // type at founding, which is the thing Plan 07 is retiring: the ceiling
  // became one constant for everybody (foundingData.ts's
  // TUITION_SLIDER_MAX), and the two appropriation halves became nothing at
  // all. What is left here is what every school has.
  weeklyOpEx: number;    // salaries + upkeep + instruction, recomputed each tick
}

// The named needs satisfaction is broken into (see satisfactionSystem.ts).
// Each is 0..100 and is written to by a specific cluster of campus
// facilities/needs, never by an ad hoc catch-all formula — so the UI can
// show the player exactly what's dragging the single displayed number down
// and which building fixes it.
export interface SatisfactionAttributes {
  academic: number;       // library seats-to-enrolled ratio
  social: number;         // student center + rec center (ratio) + quad (flat) + live student organisations (flat, see data/studentLifeData.ts)
  basicNeeds: number;     // dining hall seats-to-enrolled ratio — the sharpest penalty curve of the five
  health: number;         // health/counseling center — dormant (scores full) below the population threshold it unlocks at
  // Dorm (+ housed Greek chapter) beds against the enrolled body — most
  // students are commuters by design, so this is NOT scored against a 1:1
  // target the way basicNeeds is (see satisfactionSystem.ts's TARGET_RATIO):
  // a school that houses a healthy minority of its students scores fully
  // adequate here. Not having enough beds for that share is what dents it.
  housing: number;
}

// The student body is FOUR aggregate CLASSES — never individuals (see
// docs/design/admissions.md's "Students: four aggregate classes"). Students
// attend four years: each summer (reducer.ts's RESOLVE_ADMISSIONS) seniors
// graduate and leave, every younger class advances a year, and the
// admissions funnel commits a new freshman class. This is NOT
// individual-student simulation — each class is a plain head count.
//
// "Class" is the year group and ONLY the year group. The other grouping of
// students this game models — research-oriented, price-sensitive, athletes —
// is a COHORT (see systems/admissions/cohorts.ts), and the two words are
// never swapped: a class is admitted in a given year, a cohort is a kind of
// applicant. Neither has anything to do with a course, which is what a
// student enrolls in (see techData.ts's Buildables).
export interface ClassCounts {
  freshman: number;
  sophomore: number;
  junior: number;
  senior: number;
}

// The same four class keys as ClassCounts, carrying dollars instead of
// people: what each class is charged per year. Deliberately its own
// interface rather than a reuse of ClassCounts — the keys match but the
// units do not, and a reader who finds one of these in `finance` should
// not have to work out whether it is money or students.
export interface ClassTuition {
  freshman: number;
  sophomore: number;
  junior: number;
  senior: number;
}

// The seven kinds of applicant the admissions model recognises. The id list
// lives HERE rather than in systems/admissions/cohorts.ts, where it used to,
// because a cohort is a concept of the game and this file is where those
// live — the same charter the header states, and the reason this file spends
// the paragraph above ClassCounts drawing the class/cohort line at all. What
// stays in cohorts.ts is everything a cohort *does*: the COHORTS table, its
// base shares, and the pull curve behind each one.
export type CohortId =
  | 'highAchievers' | 'preProfessional' | 'researchOriented'
  | 'social' | 'artsFocused' | 'priceSensitive' | 'athletes'
  | 'gradBound';

// Whole students, one count per cohort. Used for both an applicant pool's
// composition (the summer reveal) and an enrolled class's (below); the eight
// always sum to whatever total they decompose, apportioned by largest
// remainder so they are people rather than rounded fractions.
export type CohortCounts = Record<CohortId, number>;

// The same four class keys again, carrying each class's cohort composition
// AS ADMITTED. Its own interface for the reason ClassTuition is: matching
// keys, different units.
//
// WHY THIS IS STORED AND NOT DERIVED — the one thing to understand before
// touching it. Every cohort's pull is a pure function of the CURRENT
// GameState (labs standing now, teams active now, programs established now),
// so recomputing an older class's mix would apply today's campus to a class
// admitted years ago: build an arts centre and last year's seniors would
// become arts-focused in hindsight. The four classes being four different
// schools stacked on top of each other is exactly what the Enrollment tab
// exists to show, so the split is written once, at admission, and carried to
// graduation — never recomputed. See docs/design/admissions.md.
export interface ClassCohorts {
  freshman: CohortCounts;
  sophomore: CohortCounts;
  junior: CohortCounts;
  senior: CohortCounts;
}

export interface StudentBody {
  // The four classes. Total enrolled is their sum — read it via
  // totalEnrolled() rather than storing a separate total that could drift.
  classes: ClassCounts;
  // What each of those four classes is MADE OF, recorded when it was
  // admitted (see ClassCohorts above for why this is a record rather than a
  // derivation). Advanced in lockstep with `classes` and
  // finance.tuitionByClass at the one annual boundary that moves any of
  // them; the graduating seniors take theirs with them.
  cohortsByClass: ClassCohorts;
  // Total HOUSING (bed) capacity — dorms plus housed Greek chapter houses —
  // never an admissions ceiling. Enrollment is uncapped and driven purely by
  // the admissions funnel (see admissionsSystem.ts); most students are
  // commuters, and this is only what's needed to keep the physical plant
  // upkeep (financeSystem.ts) and the Housing satisfaction attribute
  // (satisfactionSystem.ts) honest.
  capacity: number;
  satisfaction: number;  // 0..100 — the weighted sum of satisfactionBreakdown, drifted toward smoothly (see satisfactionSystem.ts)
  satisfactionBreakdown: SatisfactionAttributes; // this week's per-attribute scores that satisfaction's target is computed from — the expandable UI reads this directly
  // Trailing-year satisfaction: summed every week and counted (see
  // satisfactionSystem.ts's tickSatisfaction), then averaged and reset at the
  // summer boundary. The average is what next year's applicant funnel reads
  // as word of mouth (see admissionsSystem.ts) — the design's "current
  // experience -> satisfaction -> next year's applications". Kept as
  // sum+count rather than a running mean so the average is exact and cheaply
  // resettable.
  satisfactionYearSum: number;
  satisfactionYearWeeks: number;
  priorYearAvgSatisfaction: number; // last completed year's average — the value the funnel actually uses
  applicantPool: number; // most recent cycle's total applicants (set by the annual funnel)
  admitRate: number;     // most recent cycle's admit rate — the emergent selectivity signal prestige reacts to (see prestigeSystem.ts)
  incomingQuality: number; // most recent cycle's average quality score (0..100) of the entering freshman class — prestige's other admissions-derived input
}

// Faculty ARE individuals with attributes. teaching/research/salary are
// CURRENT values, derived each tick from tenureWeeks and the two potential
// ceilings below — see facultyData.ts's growth-curve formulas and
// facultySystem.ts's weekly tick that applies them. A hire is an
// appreciating asset: retained faculty grow stronger (and pricier) toward
// their potential over years of tenure, then plateau.
export interface Faculty {
  id: string;
  name: string;
  field: string;
  teaching: number;   // 0..100, current — grows toward teachingPotential with tenure
  research: number;   // 0..100, current — grows toward researchPotential with tenure
  teachingPotential: number; // 0..100, ceiling teaching grows toward; rolled once, fixed for this hire's life
  researchPotential: number; // 0..100, ceiling research grows toward; rolled once, fixed for this hire's life
  tenureWeeks: number; // weeks since hire; 0 for an unhired candidate, increments weekly once on the roster
  weeksListed: number; // the mirror image of tenureWeeks: weeks this person has been sitting in the hiring market, 0 once appointed. Only the candidate pool reads it — facultySystem.ts's tickCandidatePool withdraws a listing at CANDIDATE_LISTING_WEEKS — exactly as only the roster reads tenureWeeks.
  salary: number;      // current annual salary — recomputed from current stats + a separate seniority premium curve
  courseSlots: number; // how many courses in `field` this hire can keep staffed at once — rolled at hire, grows slowly with tenure (see facultyData.ts's grownSlots). A course whose requiresFaculty is `field` occupies one slot in that field for as long as it stays 'developing' or 'done' (see techSystem.ts's canStartDevelopment) — offering more courses in a subject means hiring more (or more tenured) faculty in it.
  // How many research prizes this person has been awarded (see
  // systems/research/researchSystem.ts). Its own field rather than a bump
  // to teaching/research, because teaching, research AND salary are all
  // RECOMPUTED from potential + tenureWeeks on every single tick — a
  // permanent post-prize bump written into any of those three would be
  // erased the following week. Both the salary curve
  // (facultyData.ts's facultySalary) and the research-output formula
  // (researchData.ts's facultyResearchOutput) read this directly, so the
  // premium survives every recomputation. 0 for everyone who has never
  // won one, which is almost everyone.
  acclaim: number;
  // Flavor/biographical fields — rolled once at generation, never mutated.
  // Nationality is disproportionately American regardless of name origin
  // (reflecting how diverse American faculty rosters actually are), with the
  // remainder tied to the same cultural pool the name itself was drawn from
  // (see facultyData.ts's NAME_POOLS/rollNationality) — never assigned
  // independently of the name.
  nationality: string; // e.g. "United States", "China" — full country name, shown expanded in the UI
  flag: string;        // the nationality's flag emoji — authored data, currently unrendered (the glyphs failed to display in some browsers; see FacultyTab.tsx)
  bio: string;         // one-line biographical flavor text, shown only when the roster row is expanded
  // Rolled BEFORE the name (see facultyData.ts's generateCandidate) and used
  // to pick which of a NAME_POOL's firstMale/firstFemale lists the first
  // name itself is drawn from — a flat 50/50, and never mutated after. Its
  // other consumer is FacultyPortrait.tsx, which picks a hairstyle/garment
  // pool from it — either way, a name and a portrait that disagreed on this
  // would read as a bug, not variety, so the two are never rolled apart.
  gender: 'male' | 'female';
  // The rolled name's cultural origin pool (e.g. "Chinese", "West African"
  // — see facultyData.ts's NAME_POOLS) — distinct from `nationality`, which
  // is disproportionately American regardless of this.
  // FacultyPortrait.tsx reads it to bias skin tone the same logical way a
  // name's heritage would in reality, without pretending nationality (a
  // passport, not an ethnicity) is the right signal for that.
  heritage: string;
}

export type BuildableStatus = 'locked' | 'available' | 'developing' | 'done';

// courses, academic buildings, dorms, and campus-life facilities (and later
// sports) are all the same kind of thing: a Buildable. They differ only in
// their data, not their machinery — see docs/architecture/buildables.md.
//
// GRADUATE COURSES DELIBERATELY ADD NO KIND. A graduate program is more
// curriculum (see docs/design/graduate-programs.md): its courses are
// `course` Buildables like every other, so they are academic upkeep, they
// count toward the instruction cost of the catalogue, they occupy faculty
// course-slots, and they are unplaceable — all for free, because nothing
// had to learn about them. What distinguishes them is one optional field,
// `graduateProgram` below. A new kind (or a tier-above-tier-3 value) would
// have meant editing every `kind === 'course'` read in the codebase just to
// put them back where they already were.
export type BuildableKind = 'course' | 'building' | 'dorm' | 'facility';

// The specific campus-life need a `facility`-kind Buildable serves — see
// facilitiesData.ts. Distinguishes facilities within the shared `facility`
// kind the same way a course's major prefix distinguishes it within
// `course`; the engine itself never branches on this, only the data-driven
// systems that read effects (satisfactionSystem.ts, prestigeSystem.ts) and
// the Campus tab's grouping/display do.
export type FacilityType =
  | 'library' | 'studentCenter' | 'diningHall' | 'recCenter'
  | 'healthCenter' | 'quad' | 'lab'
  // A campus grocery store (facilitiesData.ts): a second, single-instance
  // basicNeeds feeder alongside the repeatable dining chain, not a chain of
  // its own — real campuses have several dining halls but one grocery.
  | 'grocery'
  // Recreational and arts facilities (see facilitiesData.ts): gym/pool/
  // tennisCourts feed `health` (fitness is a health need, on top of the
  // health center itself); performingArtsCenter/artGallery feed `social`.
  // All one-off (no tier upgrades) rather than the single-instance-with-
  // upgrades shape library/studentCenter/recCenter use.
  | 'gym' | 'tennisCourts' | 'pool' | 'performingArtsCenter' | 'artGallery'
  // Varsity athletics venues (facilitiesData.ts): shared COMPETITION
  // facilities for the teams in data/studentLifeData.ts's SPORTS, one per
  // venue category. Deliberately DISTINCT from the rec-facility trio above —
  // a natatorium is not the rec Swimming Pool, a stadium is not a rec field
  // — because "shared" here means shared AMONG VARSITY TEAMS in one sport
  // category, not shared with recreational use (see the PR notes' flagged
  // design fork). Hidden from the build rail until a team that needs the
  // category is granted varsity status (see Buildable.athleticsVenueReveal
  // and techSystem.ts's meetsUnlockGates).
  | 'athleticsField' | 'athleticsArena' | 'athleticsDiamond' | 'athleticsNatatorium' | 'footballStadium';

export interface Buildable {
  id: string;
  kind: BuildableKind;
  facilityType?: FacilityType; // set only for kind 'facility'
  tier?: number;            // 1, 2, 3... for a single-instance-with-upgrades facility (library, student center, rec center, health center, quad); undefined for repeatable-chain kinds (course, dorm, dining hall) where each id is its own rung
  name: string;
  description: string;
  cost: number;            // money spent up front, at the moment development starts
  duration: number;        // weeks of development
  prereqs: string[];       // other Buildable ids that must be 'done'; may cross kinds and majors
  requiresFaculty?: string; // a Faculty `field` that must have a free course slot (see canStartDevelopment) to start
  // The graduate program this course belongs to (a GRADUATE_PROGRAMS id in
  // techData.ts), set on every course in that program and on nothing else.
  // It is BOTH the "this is a graduate course" marker the Curriculum tab
  // styles and groups on, and the key techSystem.ts's meetsUnlockGates
  // resolves the program's parent-school gate through — one field rather
  // than a flag plus a gate id, since a graduate course is never in two
  // programs and never ungated.
  graduateProgram?: string;
  // Dynamic availability gates, re-checked every tick (unlike prereqs, which
  // only re-resolve when something finishes) because the population/prestige
  // they read can also fall back below the threshold — see techSystem.ts's
  // unlockAvailable. Both are ADDITIONAL to prereqs, not a replacement.
  // A population gate, despite the name — checked against total ENROLLED
  // students (techSystem.ts's meetsUnlockGates), not bed capacity. Kept the
  // field name it always had rather than a save-shape rename; e.g. the
  // health center: large campuses only, see facilitiesData.ts.
  minCapacityToUnlock?: number;
  minPrestigeToUnlock?: number; // e.g. a research library / athletics complex tier
  // (the third such gate is `graduateProgram` above — a graduate course
  // waits on its program's parent-school gate, which is a reading of
  // milestones and lab status rather than of any one Buildable's id)
  // The fourth such gate, set only on the five athletics venues
  // (facilitiesData.ts): stays 'locked', its own (empty) prereqs
  // notwithstanding, until a varsity team needing this Buildable's
  // facilityType category has been granted (see techSystem.ts's
  // meetsUnlockGates, which reads s.orgs.teams directly rather than a
  // separate "revealed" flag — a team's existence IS the reveal signal).
  // The Medicine/Law reveal-on-gate pattern, with team formation as the
  // gate instead of a milestone count.
  athleticsVenueReveal?: true;
  // Set only on a Greek chapter's own house (see eventData.ts's
  // 'greek-housing'), one per chapter, id'd deterministically off the
  // chapter's own id rather than drawn from any static seed catalogue —
  // unlike every other flag/gate on this interface, which describes a
  // FIXED Buildable from campusData.ts/facilitiesData.ts, a chapter house
  // is manufactured at runtime the moment its petition is approved. It
  // carries no `effects`: the satisfaction bonus and housing capacity it
  // represents are applied directly to the chapter/s.students.capacity at
  // that same moment, live-read off GreekChapter.housed ever after, not
  // off this Buildable finishing. This flag's only jobs are cosmetic —
  // BuildPopup.tsx groups it under Housing (alongside, but never
  // interleaved with, the sequential dorm chain) and gives its tile a beds
  // figure despite the missing `effects`.
  chapterHouse?: true;
  status: BuildableStatus;
  effects?: Partial<BuildableEffects>; // read by the systems below; see each field's own comment for exactly when
  // Set only once this school's naming rights are sold (see eventData.ts's
  // 'naming-rights' decision event) — the donor's surname, applied to a
  // school building alongside overwriting `name` with the full donor
  // display text (e.g. "Johnson School of Science"). Its presence, not its
  // value, is what the Curriculum tab reads to know `name` is donor text
  // rather than the seeded catalogue name (see CurriculumTab.tsx's
  // buildSections). An additive optional field — no save migration needed.
  donorSurname?: string;
  // How many times this Buildable has been renovated in place for more
  // capacity — today, only the tier-1 library (see facilitiesData.ts's
  // nextLibraryFloor and engine/reducer.ts's RENOVATE_LIBRARY). Unlike
  // every other tiered facility, a renovation is not a second Buildable
  // placed on the map: it puts this SAME node back into 'developing' at
  // its existing spot and raises its own effects.servesPopulation on
  // completion, so this counter — not another Buildable's status — is what
  // both the reducer and the build panel read to agree on what the next
  // renovation costs and grants. Undefined means never renovated, same as 0.
  floorsAdded?: number;
  // The servesPopulation this Buildable had BEFORE the renovation it is
  // currently in, and the whole of what makes a renovation add capacity
  // rather than take it away and give it back. Set when RENOVATE_LIBRARY
  // puts the node back into 'developing'; cleared when it finishes.
  //
  // A renovating library is not a building site with nothing in it: three
  // finished floors of study seats are still open while the fourth goes up.
  // The live-read contract below says 'done' facilities are what the sums
  // count, and that reading is right for everything that has never opened —
  // this is the one case where the node is 'developing' and yet a real part
  // of it is in use, so it is spelled out as its own field rather than
  // inferred from status. Additive and optional: an old save has no
  // renovation in flight to describe, and reads as undefined.
  renovatingFrom?: number;
}

// What a Buildable is contributing to the satisfaction sums RIGHT NOW.
//
// Not the same as effects.servesPopulation, which is what it will serve
// when it is finished. A 'done' facility serves its full figure; a facility
// that has never opened serves nothing; and a facility part-way through an
// in-place renovation serves what it served before the work started (see
// renovatingFrom above). Written once, here, because three separate sums
// and one drawer all have to agree about it.
export function servingPopulation(t: Buildable): number {
  if (t.status === 'done') return t.effects?.servesPopulation ?? 0;
  if (t.status === 'developing' && t.renovatingFrom !== undefined) return t.renovatingFrom;
  return 0;
}

// Effects a Buildable can grant when finished. Deliberately no reputation
// bonus here — prestige is a slow-moving stock computed and drifted toward
// separately (see prestigeSystem.ts), never a sum of completion bonuses.
//
// The first block below is applied ONCE, at the moment a Buildable finishes
// (techSystem.ts's applyEffects mutates state directly). The second block is
// never mutated into state — it's read LIVE, every tick, off every currently
// 'done' Buildable by the system that cares (satisfactionSystem.ts sums
// servesPopulation/satisfactionAttribute/flatSatisfactionBonus, through
// servingPopulation above, which is 'done' plus the one renovation case;
// prestigeSystem.ts sums prestigeContribution;
// financeSystem.ts sums upkeepPerWeek) — so a facility's contribution stays
// current even though nothing "happens" on the weeks after it finishes.
export interface BuildableEffects {
  capacityBonus: number;
  tuitionBonus: number;
  // one-time bump to the applicant pool (see docs/design/curriculum.md)
  applicantPoolBonus: number;
  unlockIds: string[];  // force these Buildable ids to 'available', regardless of their own prereqs

  // --- live-read, every tick, never mutated into state (see above) ---
  researchRateBonus: number; // added into a campus-wide multiplier on weekly research output (see systems/research/researchSystem.ts). Live-read, like upkeep: a lab that exists is research infrastructure every week it stands, not a one-off bump the week it opened. It MULTIPLIES output, it does not create it — a school with no lab of its own produces nothing however much equipment sits elsewhere on campus (see researchData.ts's lab gate)
  servesPopulation: number;    // how many students' worth of this need one instance covers, compared against total ENROLLED students (needs scale with how many students the campus actually has)
  satisfactionAttribute: keyof SatisfactionAttributes; // which breakdown attribute servesPopulation/flatSatisfactionBonus feeds
  flatSatisfactionBonus: number; // added directly to the attribute score, NOT ratio/population-scaled (the quad: cheap, and its contribution doesn't shrink as the campus grows)
  prestigeContribution: number; // 0..1 share fed into prestige's campus-life input (see prestigeSystem.ts) — the rec center's "small prestige contribution"
  upkeepPerWeek: number; // recurring operating cost, summed into weeklyOpEx alongside salaries/dorm-seat upkeep (see financeSystem.ts)
}

// ---------------------------------------------------------------------
// The campus map (see docs/architecture/campus-map.md: the map is its
// own layer reading the same state, with building/dorm/facility
// Buildables gaining placement). Placement is a PURELY VISUAL layer for
// now: where a finished building physically sits on campus. It grants
// nothing and gates nothing — a building's effects are applied when it
// finishes, never when (or whether) it is placed.
//
// Deliberately NOT a field on Buildable: keeping coordinates in a separate
// `placements` record on GameState leaves the single Buildable model
// unforked, so `course` Buildables — which are never placeable — carry no
// vestigial map fields (see docs/architecture/buildables.md).
// ---------------------------------------------------------------------

// The campus is a fixed grid of tiles. It started deliberately small (8x6)
// while the map was one panel among many, then grew to 28x12 once the map
// became the central interface; it was resized again, at the SAME 7:3
// aspect ratio, for the footprint rescale that put an academic hall at 9x9
// (see campusMap.ts's footprintOf and the PR notes) — a hall's own footprint
// grew by the same 4.5x per side that the grid did (2x2 -> 9x9, 28x12 ->
// 126x54). It was squared off after that, height alone growing 126x54 ->
// 126x126: the map is now a fixed full-viewport background panned/zoomed
// like any map app (see CampusMap.tsx's .campus-map, position: fixed;
// inset: 0), not a box squeezed beside other panels, so there is no more
// wide-short screen shape to match — a square grid reads as neutral in
// every window shape, and CampusMap.tsx's defaultView()/MAP_WIDTH/
// MAP_HEIGHT and actions.ts's createInitialState Founders Hall centering
// are both already pure functions of these two constants, so nothing else
// needed to change for the map, the founding placement, and the starting
// camera to all recentre themselves. Grow these two numbers together to
// grow the campus and keep it square.
//
// Sized against what can actually be built: the full catalogue is 60
// placeable Buildables (10 school buildings — the eight undergraduate
// halls plus BLDG-MED/BLDG-LAW, see techData.ts's
// GraduateProgramSeed.buildingId — 15 dorms, 35 facilities: 5 dining, 2
// each of library/studentCenter/recCenter/healthCenter/quad, 10 labs, and
// 11 one-off campus-life/athletics facilities) whose footprints (see
// campusMap.ts's footprintOf) total 2,179 tiles — under 14% of the now-
// square 15,876-tile grid (2,179 / 15,876), open ground and headroom for
// future content without the map reading as empty.
export const CAMPUS_GRID_WIDTH = 126;  // tiles across (columns)
export const CAMPUS_GRID_HEIGHT = 126; // tiles down (rows) — kept equal to CAMPUS_GRID_WIDTH so the map stays square

// Which Buildable kinds can be sited on the map at all. `course` is
// absent on purpose and must stay absent — a course is not a place.
export const PLACEABLE_KINDS: readonly BuildableKind[] = ['building', 'dorm', 'facility'];

// One tile on the campus grid. row is 0..CAMPUS_GRID_HEIGHT-1, col is
// 0..CAMPUS_GRID_WIDTH-1.
export interface TileCoord {
  row: number;
  col: number;
}

// How many tiles a Buildable covers, in grid units. Buildings are not all
// the same size on a real campus — a school hall is not a dorm — so a
// placement occupies a rectangle rather than a single tile. Which
// rectangle a given Buildable gets is a placement RULE, not a field on
// Buildable: it lives in campusMap.ts's footprintOf, keyed on kind (and
// facilityType), so the single Buildable model stays unforked.
export interface Footprint {
  w: number; // tiles across (columns), >= 1
  h: number; // tiles down (rows), >= 1
}

// Where one placed Buildable sits: its top-left ANCHOR tile plus the
// footprint it covers from there. It occupies rows row..row+h-1 and
// columns col..col+w-1, and every one of those tiles must be in bounds and
// otherwise empty (see campusMap.ts's canPlace).
//
// The footprint is STORED rather than re-derived from the Buildable on
// every read, so a save's layout can never silently reshape (and start
// overlapping) if the footprint table is retuned later. That is also what
// the SAVE_VERSION 3 -> 4 migration writes: a placement saved before
// footprints existed covered exactly one tile, so it loads as 1x1 (see
// persistence.ts).
export interface Placement extends TileCoord, Footprint {}

// Placed Buildable id -> the tiles it occupies. Absent id = not placed yet.
// Plain JSON (no Map/Set, no object references into `tech`) so it stays
// serializable and light for save/load — the same shape rationale as
// `developing` and `events`.
export type Placements = Record<string, Placement>;

// ---------------------------------------------------------------------
// PATHWAYS: purely decorative walkway TILES (see CampusMap.tsx) — a drawn
// path fills a whole grid square, the same unit a building's footprint is
// measured in, rather than tracing a line along the boundary between two
// tiles. Free to draw, free to delete, read by no system: exactly as
// cosmetic as the map itself, one layer further in.
//
// A path tile is identified by its own {row, col} — the same TileCoord
// every other grid-square concept (a footprint's tiles, a placement's
// anchor) already uses — so "this tile has a path on it" needs no scheme
// of its own beyond the ordinary tile grid.
//
// Drawn tiles, keyed by campusMap.ts's pathTileKey(). A plain string -> true
// record rather than a Set: GameState is JSON round-tripped whole (see
// persistence.ts), so no Map/Set may appear anywhere in it, the same
// constraint `placements` and `developing` are already under. Presence is
// the only information a key carries.
export type Pathways = Record<string, true>;

// ---------------------------------------------------------------------
// TREES: the ground the campus was founded on. A new university does not
// open on a bare plate — it opens on a piece of land with woodland already
// on it, and what a player does over the following decades is CLEAR some of
// that and keep the rest. Which is the whole mechanic here, and it is
// three rules:
//
//   - A tree lives on one TILE, the same unit a path tile and a footprint
//     are measured in, so "is there a tree here" needs no scheme of its own.
//   - BUILDING over a tree FELLS it: the reducer's PLACE_BUILDABLE deletes
//     every tree under the footprint it commits, permanently. You cleared
//     the ground to build there.
//   - PAVING over a tree only HIDES it: a path tile on a tree's tile stops
//     it being drawn, and lifting the path brings it straight back. Nothing
//     is deleted, so this is a pure render-time read of `pathways` (see
//     CampusMap.tsx) rather than a second piece of state to keep in step.
//
// The value is a SEED, not a description: the renderer derives species,
// size and the tree's offset within its own tile from it (see
// components/trees.tsx), so a grove reads as a grove rather than as a grid
// of identical lollipops, and one integer per tree is all that has to be
// saved. Keyed by campusMap.ts's pathTileKey(), the same key `pathways`
// uses — which is also what makes the path lookup above a plain key test.
//
// Visual only, like `placements` and `pathways`: no system reads it, no
// Buildable gates on it, and felling a wood costs and grants nothing.
export type Trees = Record<string, number>;

// The generic pause-the-clock decision-event mechanism (see
// docs/architecture/interrupts.md). Any system enqueues one by setting
// `pendingInterrupt` directly on state; while it is set, the game loop
// halts ticking. The `type` tag identifies which interrupt this is —
// admissions, the U.S. News report, the tutorial, etc. — and `payload`
// carries whatever data that interrupt needs. The UI switches on `type` to
// render the right modal and dispatches an action that clears
// `pendingInterrupt` to let the clock resume. Nothing besides the
// mechanism itself lives here: no admissions, report, or tutorial content.
export interface PendingInterrupt {
  type: string;
  payload?: unknown;
}

// ---------------------------------------------------------------------
// A STUDENT DEMAND (see docs/design/student-life.md's "Student demands:
// the inverse of clubs", and systems/demands/demandSystem.ts). When
// satisfaction sits below DEMAND_SATISFACTION_THRESHOLD the student body
// asks the institution for one concrete, buildable thing, on a deadline.
// Exactly one may be open at a time.
//
// The record carries the TARGET CONDITION and the clock, and nothing else:
// the ask's prompt, headline and grievance text are looked up from
// data/demandData.ts by `metric`/`attribute` when the modal or the tab
// renders, the same way a queued milestone's headline is derived at
// celebration time rather than captured when it was awarded.
//
// The target is a number the game ALREADY tracks, never a parallel
// capacity model: `served` compares satisfactionSystem.ts's own
// servedPopulationFor(attribute) — the sum of servesPopulation across the
// 'done' facilities feeding one satisfaction attribute — against a total,
// and `capacity` compares s.students.capacity against one. So a demand is
// met by BUILDING the thing, detected off the same state the satisfaction
// score is computed from, with no acknowledge button anywhere.
//
// Plain JSON (strings, numbers, a nullable string), like every other slice.
export interface StudentDemand {
  id: string;
  // Which existing reading the target is measured against.
  metric: 'served' | 'capacity';
  // The satisfaction attribute whose served population is being demanded;
  // null for metric 'capacity' (a demand for more housing), which is
  // measured against s.students.capacity instead.
  attribute: keyof SatisfactionAttributes | null;
  // The Buildable that inspired the ask — "somewhere to eat" is whatever
  // the dining chain's next rung actually is. Captured by name as well as
  // id (like PrizeAward's facultyName) so the modal still says something
  // true if content is edited between raising and resolving.
  askId: string;
  askName: string;
  target: number;       // the demand is MET the moment the measured reading reaches this
  raisedWeek: number;   // absolute week the demand was announced; 0 while it is still queued
  deadlineWeek: number; // absolute week it expires unmet; 0 while it is still queued
}

// Cadence bookkeeping for the interrupt kinds that are neither annual nor
// player-triggered: the milestone celebration (a stop-the-clock moment for
// a genuinely special accomplishment), the authored decision events that
// give the quiet weeks between milestones their texture, and the student
// demands that low satisfaction raises. See data/eventData.ts and
// data/demandData.ts for the content and tuning constants, and
// systems/events/eventSystem.ts and systems/demands/demandSystem.ts for
// the tick functions that fire them.
//
// Plain JSON — numbers, a string array, a string -> number record and two
// nullable flat records — the same shape rationale as `developing` and
// `placements`.
export interface EventState {
  // Milestone keys (the same keys techSystem.ts writes into s.milestones)
  // that have been awarded but not yet celebrated. A QUEUE rather than a
  // fire-it-immediately call, because the week a milestone lands may
  // already belong to the summer admissions decision or the U.S. News
  // report, and only one interrupt can be pending at a time. Draining the
  // queue on a later quiet week means a celebration is delayed, never
  // lost, and neither annual interrupt has to be special-cased anywhere.
  pendingMilestones: string[];
  lastMilestoneWeek: number;   // absolute week the last celebration fired; 0 = never
  lastDecisionWeek: number;    // absolute week the last authored decision event fired; 0 = never
  // Decision event id -> how many times it has fired and the absolute
  // week it last did. Both are needed: the count enforces a per-event
  // fire cap, the week enforces the per-event repeat cooldown.
  decisionHistory: Record<string, { fires: number; lastWeek: number }>;
  // The demand the student body has rolled but not yet been able to
  // announce, because the week it landed on already belonged to another
  // interrupt or the shared cadence floor had not cleared. A QUEUE of one,
  // for exactly the reason pendingMilestones is a queue: a demand that
  // would fire during a busy week WAITS rather than being dropped. Its
  // raisedWeek/deadlineWeek are stamped when it is announced, not when it
  // is rolled, so waiting never eats into the deadline the player gets.
  pendingDemand: StudentDemand | null;
  // The demand currently outstanding, with its target and expiry. At most
  // one, ever: demands are pressure, not a to-do list. Cleared the week
  // its target is met (a satisfaction reward) or its deadline passes
  // unmet (a satisfaction penalty).
  activeDemand: StudentDemand | null;
  // Absolute week the last demand RESOLVED — met, failed, or overtaken by
  // the shortfall being fixed before it could even be announced; 0 =
  // never. The cooldown half of the cadence, and the reason a failed
  // demand cannot be followed straight away by a second unmeetable one.
  lastDemandWeek: number;
}

// The player's admissions policy is set once a year via the summer
// interrupt (see docs/design/admissions.md). NOTE: there is no
// AdmissionsSettings any more. Its only field was scholarshipRate, retired
// with scholarships themselves (Plan 05's PR B), and an interface with
// nothing in it is a slot the next reader has to wonder about. Admissions
// policy is now exactly one number and it lives where the price lives:
// finance.listedTuition. Selectivity and enrollment are still NOT inputs —
// they are emergent outcomes of the funnel (see admissionsSystem.ts).

export interface Rival {
  id: string;
  name: string;
  // The school's teams' name — "Owls", "Aggies", "Kestrels". Authored per
  // school in data/rivalData.ts and read by NOTHING mechanical: it exists
  // so a standings row can read as a sports page rather than a spreadsheet.
  // The player's own is University.mascot below, named at the
  // athletic-director interrupt rather than at founding.
  mascot: string;
  reputation: number;   // the metric the ranking sorts on
  momentum: number;     // hidden trend, makes rivals dynamic over decades
  // A second, independent ranking axis for athletics' standings (see
  // data/rivalData.ts's athleticStrengthFor and rivalsSystem.ts's
  // athleticRank) — deliberately NOT derived from `reputation` at read
  // time, so a rival can be an athletic power without being an academic
  // one and vice versa, the same real-world decoupling `reputation` alone
  // could never express.
  //
  // IT MOVES NOW. This used to read "static for now (no annual drift of its
  // own, unlike reputation/momentum) — a deferred deepening, not an
  // oversight", and the deepening is taken: it drifts annually on its own
  // momentum like every other axis. A playoff bracket seeded off a field
  // that never changes is a bracket whose result is known a decade in
  // advance, so the drift is a prerequisite rather than a flourish.
  //
  // THIS IS THE DEPARTMENT-WIDE NUMBER. A school's strength in one
  // particular sport is derived from it per sport, not stored — see
  // rivalData.ts's sportStrengthFor for why 100 schools x 18 sports is
  // derived rather than authored or saved.
  athleticStrength: number;
  athleticMomentum: number;
  // THE OTHER TWO RANKING AXES (see data/rivalData.ts's standingsFor and
  // systems/rivals/rivalsSystem.ts's rankedListBy). `reputation` answers
  // "how good is this university"; these answer "how good is its research"
  // and "what is it like to be a student here", and a school is free to be
  // three different things on the three lists — which is most of what makes
  // a second and third list worth having.
  //
  // Named IDENTICALLY to the player's own fields on University below, which
  // is not cosmetic: it is what lets one rankedListBy(axis) serve all four
  // leaderboards instead of a fourth hand-copied sort.
  //
  // Seeded like athleticStrength — a deterministic spread off the school's
  // own id — and drifted annually like reputation, each with its own
  // momentum so the three tables move independently.
  socialStanding: number;
  researchStanding: number;
  socialMomentum: number;
  researchMomentum: number;
}

// ---------------------------------------------------------------------
// RESEARCH (see docs/design/research.md). Player-commissioned initiatives —
// one per research facility, keyed by the facility's Buildable id so "one
// at a time" is a property of the shape rather than a rule somebody has to
// enforce — plus the lifetime counters each run adds to. Deliberately
// AGGREGATE where it counts: publications, breakthroughs, prizes and grant
// income are one tally for the whole institution rather than a per-school
// ledger, because nothing reads them per school. Everything here is a plain
// number, a plain string or an array of flat records — the same
// JSON-round-trippable shape rationale as
// `events` and `placements`.
// ---------------------------------------------------------------------

// One awarded research prize, queued for its celebration. The faculty
// member's details are CAPTURED here rather than looked up when the modal
// renders, so the celebration still says something true if the winner has
// been dismissed in the weeks between the award and the quiet week it
// finally fires on.
export interface PrizeAward {
  facultyId: string;
  facultyName: string;
  field: string;
  prizeName: string;
}

// THE REPORT A CONCLUDED PROJECT FILES. Queued by researchSystem.ts when
// an initiative runs its course, and rendered as the `research-complete`
// interrupt — the one modal research is allowed, and now the right one.
//
// It used to be the prize that stopped the clock, through a separate
// `research-prize` interrupt, which meant the modal celebrated the trophy
// while the five years of work that earned it passed as a log line. The
// completion IS the event; the award is one of its results, and sits in
// here as one field among the outputs rather than as an interrupt of its
// own.
//
// Names are CAPTURED rather than looked up later, the same reason
// PrizeAward captured them: the week a project ends may not be the week
// the report fires, and a professor can be dismissed or a topic re-authored
// in between. A report says what was true when the work finished.
export interface InitiativeReport {
  topicId: string;
  topicName: string;
  labId: string;
  labName: string;
  depth: InitiativeDepth;
  years: number;              // rounded to one decimal, as the log line reports it
  facultyNames: string[];
  publications: number;
  breakthroughs: number;
  grantIncome: number;
  award: PrizeAward | null;   // the one thing that can only be won at conclusion
}

// How deep a commitment an initiative is. Lives here rather than beside
// its tuning table (data/researchData.ts's INITIATIVE_DEPTHS) because this
// module is the base of the import graph — everything reads types, types
// reads nothing — and the depth is part of the saved shape.
export type InitiativeDepth = 'pilot' | 'project' | 'program' | 'landmark';

// A piece of research the player commissioned: a named topic, run out
// of one research facility by named people, for years. See
// data/researchData.ts's initiative block for the model and
// data/researchTopics.ts for the topics themselves.
//
// Participants are COMMITTED for the duration: their course slots go to
// zero and whatever they were teaching is orphaned (see techSystem.ts's
// isCommitted), which is what makes starting one a real institutional
// decision rather than a free upgrade for anybody idle.
export interface Initiative {
  labId: string;            // the facility hosting it — the slot IS the key in `initiatives`
  topicId: string;
  depth: InitiativeDepth;
  participantIds: string[];
  weeksTotal: number;
  weeksRemaining: number;
  // Banked during the run. breakthroughs is what gates the award roll at
  // conclusion; the rest are for the report it leaves behind.
  publications: number;
  breakthroughs: number;
  grantIncome: number;
}

// What an initiative leaves behind once it ends — the university's own
// research record, and the only place a finished project is still visible.
// Bounded (see INITIATIVE_HISTORY_LIMIT) because a long run would
// otherwise grow this without limit.
export interface CompletedInitiative {
  topicId: string;
  depth: InitiativeDepth;
  year: number;
  facultyNames: string[];
  publications: number;
  breakthroughs: number;
  grantIncome: number;
  award: string | null;     // the prize name, when the work took one
  cancelled?: true;         // ended early by the player, forfeiting its funding
}

export const INITIATIVE_HISTORY_LIMIT = 24;

export interface ResearchState {
  // DEAD STATE, kept rather than removed. This was the campus-wide bank
  // that lab-equipped faculty trickled into and outputs were bought out
  // of; initiatives replaced it (decision 7 — idle capacity produces
  // nothing, the way to produce is to start something), so nothing writes
  // it and, since the Faculty tab stopped displaying a figure that had
  // read zero ever since, nothing reads it either. Left in the saved shape
  // exactly as Faculty.morale was: harmless, and not worth a migration to
  // delete. Do not wire it back up — if research ever needs a stock
  // again it should be per-initiative, where the work actually is.
  points: number;
  lifetimePoints: number;  // every point ever produced, never spent down — display only, so the Faculty tab can show the long arc rather than a stock that sawtooths
  publications: number;    // papers, monographs, case studies and exhibited works — the cheap, frequent output (see researchData.ts's RESEARCH_OUTPUTS). A monotone stock like the others; feeds prestige at a steep discount to a breakthrough (see prestigeSystem.ts's researchScore)
  grants: number;          // research grants awarded so far
  grantIncome: number;     // total cash those grants brought in — displayed in the Treasury, since a grant lands as a one-off rather than as a line of the weekly statement
  breakthroughs: number;   // published breakthroughs. A monotone STOCK, and the whole of research's reach into prestige: prestigeSystem.ts's researchScore reads this (never s.self.reputation directly — see that file)
  prizes: number;          // prizes awarded; counts for a heavier share of the same capped prestige input
  // Running initiatives, KEYED BY THE FACILITY hosting each one — which is
  // how "one initiative per facility" is enforced by the shape of the data
  // rather than by a rule somebody has to remember to check. A facility is
  // vacant exactly when it has no key here.
  initiatives: Record<string, Initiative>;
  completedInitiatives: CompletedInitiative[]; // newest first, capped at INITIATIVE_HISTORY_LIMIT
  lastOutputWeek: number;  // absolute week the last research output landed; 0 = never. The cooldown half of the cadence, exactly like events.lastDecisionWeek
  pendingCompletions: InitiativeReport[]; // concluded but not yet reported — a QUEUE for the same reason events.pendingMilestones is one: the week a project ends may already belong to admissions or the U.S. News report, and only one interrupt can be pending at a time. Drained one at a time (see eventSystem.ts): each is a report on a different project and they do not read as one modal.
}

// ---------------------------------------------------------------------
// STUDENT ORGANISATIONS (see docs/design/student-life.md). Two layers,
// the second gated by the first: clubs, which form once the campus has a
// student center, and — only if the player has explicitly approved a
// Hellenic Council — Greek chapters on top of them.
//
// Everything here is plain JSON (numbers, strings, booleans, arrays of flat
// records) for the same reason `events`, `placements` and `research` are:
// the whole GameState is JSON-round-tripped into one localStorage key, so
// no Map, no Set and no reference into `tech` may appear (see
// state/persistence.ts).
//
// The two live lists ARE the source of truth for both mechanical effects an
// organisation has: financeSystem.ts sums `upkeepPerWeek` across them every
// week, and satisfactionSystem.ts sums their social contribution into the
// satisfaction TARGET every week. Neither is ever mutated into a total
// stored elsewhere, which is what makes disbanding a chapter actually
// remove its cost and its contribution rather than leaving a baked-in
// number behind.
// ---------------------------------------------------------------------

// What every student organisation carries, whatever kind it is. Membership
// is NOT stored: it is derived from these three fields plus current
// enrollment (see data/studentLifeData.ts's orgMembership), so it can never
// drift from the school it belongs to and costs nothing per week to keep
// current.
export interface StudentOrgBase {
  id: string;
  name: string;
  foundedYear: number;
  // The two founding facts membership is derived FROM: how many students
  // signed up on day one, and how big the school was that day. A club
  // founded at 400 students that still has 40 members reads as a much
  // bigger deal than the same 40 at 18,000 — which is exactly the per-org
  // variation the display is for.
  foundingMembers: number;
  foundingEnrolled: number;
  // Weekly running cost, in DOLLARS, fixed at the moment the player
  // approved this organisation and sized then as a share of a week of
  // operating cost (see studentLifeData.ts's ORG_UPKEEP_WEEKS_OF_OPEX).
  // Fixed rather than re-derived every week because deriving a line of
  // opex FROM opex is circular; what it costs the school to keep this
  // club running does not need to grow with the school's budget forever.
  upkeepPerWeek: number;
}

export interface StudentClub extends StudentOrgBase {
  // Set once at formation (see data/studentLifeData.ts's SPORT_CLUB_SHARE
  // roll) and never changed afterward: a SPORTS id if this club plays a
  // sport, or null for an ordinary interest club. The discriminator a
  // varsity petition's eligibility reads — item 1's "subset of club
  // formations are sport clubs".
  sport: string | null;
  // The year this club was last offered (and declined) the varsity
  // petition, or null if it has never been asked. A decline is not
  // permanent: sportClubsAwaitingVarsity (studentLifeData.ts) re-offers the
  // petition VARSITY_PETITION_MIN_TENURE_YEARS after this year, the same
  // tenure gate a club clears once to be asked at all — a club that says no
  // gets to grow and ask again, not close the door forever. An approval
  // never sets this: the club is promoted straight to a VarsityTeam and
  // removed from s.orgs.clubs (see promoteToVarsityTeam), so there is no
  // club record left here to re-ask. Always null for a non-sport club,
  // since only a sport club is ever offered the question (see
  // data/eventData.ts's 'varsity-petition').
  varsityLastAskedYear: number | null;
}

// A Greek-letter chapter. Everything a chapter needs beyond a club is
// about the two things that can happen to it later: a scandal has to be
// able to name and disband exactly one chapter, and the housing petition
// has to be able to ask each chapter at most once.
export interface GreekChapter extends StudentOrgBase {
  kind: 'fraternity' | 'sorority';
  // The chapter's three letters as LETTERS — 'ΑΒΓ' for Alpha Beta Gamma.
  // Stored rather than derived at every read because it is what goes on the
  // chapter house's pediment on the campus map, and a building should not be
  // re-parsing an English sentence on every frame to find out its own name.
  // Derived from `name` on load for saves that predate the field (see
  // persistence.ts), which is exact: the name is the letters.
  glyphs: string;
  housed: boolean;       // a dedicated chapter house has been built for them
  housingAsked: boolean; // they have already petitioned for one — never ask again, whatever the answer was
}

// A hired member of the athletics staff — a head coach, an assistant coach,
// or a trainer (see VarsityTeam below and data/studentLifeData.ts's coach
// hiring pool). Mirrors Faculty's own hiring-pool shape (a rolled ceiling
// grown toward over tenure, a salary recomputed live from current quality —
// see facultyData.ts's grownStat/facultySalary) deliberately: Athletics V2's
// whole ask was a SEPARATE pool that follows the same mechanism, not a new
// one. Simpler than Faculty by one axis — one `quality` stat, not a
// teaching/research split — since a coach is evaluated on one thing, not
// two.
export interface Coach {
  id: string;
  name: string;
  gender: 'male' | 'female';
  // A head/assistant coach candidate's field is the SPORTS id (see
  // data/studentLifeData.ts) they coach — 'soccer-m', 'lacrosse-w', etc. — so
  // only a candidate for THIS team's own sport is hireable into either of
  // those two roles. A trainer's field is always TRAINER_FIELD
  // ('strength-conditioning'): strength & conditioning is a discipline, not
  // a sport, so one trainer pool serves every team regardless of sport.
  field: string;
  quality: number;          // current, 0..100 — grown toward qualityPotential over tenureWeeks, like Faculty.teaching/research
  qualityPotential: number; // ceiling, rolled once at generation
  tenureWeeks: number;      // weeks assigned to a team's roster; 0 for a candidate still on the market
  weeksListed: number;      // weeks on the market; stops mattering once hired, exactly like Faculty.weeksListed
  salary: number;           // current annual salary, recomputed live from quality + tenureWeeks (see coachSalaryFor)
}

// A sport club that petitioned and was granted varsity status (see
// data/eventData.ts's 'varsity-petition' and data/studentLifeData.ts). Lives
// alongside clubs/chapters in s.orgs.teams, reusing the same flat-per-org
// capped social contribution and weeks-of-opex upkeep contract every other
// organisation here does. Promoted straight FROM a StudentClub (same id —
// see studentLifeData.ts's promoteToVarsityTeam), so the club stops drawing
// its old club-level contribution the same week.
export interface VarsityTeam extends StudentOrgBase {
  sport: string;               // a SPORTS id (see data/studentLifeData.ts)
  // The venue facilityType this sport needs, CAPTURED at grant time rather
  // than re-derived from `sport` on every read — so a later retune of the
  // sport -> venue-category mapping can never strand an existing team's
  // reference to the venue it was actually promised.
  venueCategory: FacilityType;
  // The three roles Athletics V2 asks every team to staff (see Coach
  // above). All three start vacant (null) the week a team goes varsity —
  // hired from s.orgs.coachCandidates through the Athletics tab, same as a
  // faculty hire, rather than auto-generated the way a v1 team's single
  // coachName used to be. A vacant role is a real, felt gap: teamQuality
  // (studentLifeData.ts) scores it at the same floor an empty course slot
  // would.
  headCoach: Coach | null;
  assistantCoach: Coach | null;
  trainer: Coach | null;
  // Whether the team can actually compete yet. Goes straight to 'active' if
  // a compatible venue was already 'done' when the petition was granted
  // (the "second team in a category" case); otherwise it sits here until
  // the shared venue Buildable it is waiting on finishes (see
  // systems/studentlife/studentLifeSystem.ts's tick).
  status: 'awaitingVenue' | 'active';
}

// One organisation that has formed and is waiting on the player's answer at
// the next summer admissions boundary (see docs/design/student-life.md:
// clubs and new chapters are a batched DIGEST folded into an interrupt that
// already exists, never a modal of their own). Carries everything needed to
// turn it into a live organisation on approval, so approving is a move
// rather than a re-roll.
export interface OrgPetition {
  id: string;
  kind: 'club' | 'chapter';
  name: string;
  greekKind?: 'fraternity' | 'sorority'; // set only for kind 'chapter'
  // Set only for kind 'club': a SPORTS id if the formation roll drew a sport
  // club, null otherwise (see data/studentLifeData.ts's SPORT_CLUB_SHARE).
  // Carried through to the live StudentClub on approval, unchanged — the
  // discriminator is rolled once, at formation, like everything else here.
  sport?: string | null;
  foundedYear: number;
  foundingMembers: number;
  foundingEnrolled: number;
  upkeepPerWeek: number; // sized in weeks of opex the week the petition was raised
}

// The one athletics-wide recruiting & scholarship budget dial (see
// data/studentLifeData.ts's ATHLETICS_BUDGET_TIERS). Scales every active
// varsity team's social contribution AND the whole program's upkeep
// together, same as the investment tier it replaces — deliberately not a
// per-team budget, so athletics stays one lever the player turns for the
// whole department, not a line item per sport — and now ALSO feeds
// teamQuality (studentLifeData.ts): a bigger budget means better recruiting,
// not just a bigger program.
export type AthleticsBudgetTier = 'low' | 'medium' | 'high';

export interface StudentOrgState {
  clubs: StudentClub[];
  chapters: GreekChapter[];
  teams: VarsityTeam[];
  // The standing coach/trainer hiring pool (see Coach above and
  // data/studentLifeData.ts's tickCoachCandidatePool) — mirrors s.candidates
  // (Faculty's own market), just scoped to athletics and kept separate per
  // the design ask for its own pool.
  coachCandidates: Coach[];
  // Petitions raised since the last summer boundary, drained wholesale
  // there: approved ones become organisations, the rest are declined.
  pendingPetitions: OrgPetition[];
  // The Greek gate, and the whole reason no Greek content can appear
  // unbidden. Every Greek-related eligible() reads `approved`; `offered`
  // records that the one-time question has been ASKED, so declining it
  // closes Greek life for the rest of the run.
  hellenicCouncilApproved: boolean;
  hellenicCouncilOffered: boolean;
  lastFormationWeek: number; // absolute week a club or chapter last formed; 0 = never
  athleticsBudget: AthleticsBudgetTier;
}

// WHICH ARCHITECTURE THIS CAMPUS WAS BUILT IN. Chosen at founding and
// permanent: a campus's architecture is what it was built as, so nothing
// offers to change it later.
//
// Lives here rather than in components/buildingSpec.ts because it is a fact
// about the school that gets saved, not a drawing detail — buildingSpec.ts
// imports it, the same direction it already imports Buildable. The palette
// behind each name is that module's (see its VERNACULARS table).
//
export type Vernacular = 'georgian' | 'gothic' | 'brutalist' | 'mission';

// NO SchoolType. Private/public was the game's only starting fork and
// Plan 07 retired it — see data/foundingData.ts for what it was and why it
// went. Everything about a school emerges from play now, which is what
// docs/design/progression.md always said should happen.

export interface University {
  // The institution's name in two halves. The player writes only the
  // first at founding ("Blackmoor"); the second is fixed institutional
  // form, and starts as "College" for every school. Completing the first
  // lab offers a one-time promotion to "University" (see the 'charter'
  // interrupt in systems/events/eventSystem.ts) — the whole of that
  // feature is this string plus the flag below. Kept as two fields rather
  // than one formatted string so nothing ever has to parse a name to
  // decide what may be renamed.
  name: string;
  suffix: string;       // "College", then "University" if the charter is taken. May be empty on a run resumed from a save written before the split (see persistence.ts's v6 -> v7)
  universityCharterOffered: boolean; // the one-time offer has been made — set whether it was accepted or declined, so it never comes back around
  // What this school's teams are called (see Rival.mascot). EMPTY until the
  // athletic director is hired, which is the interrupt that asks for it —
  // deliberately not the startup screen, which would ask a decade before
  // anything wears the name. Empty is a real state every reader must
  // handle: a school with no varsity program has no mascot and is not
  // pretending otherwise.
  mascot: string;
  reputation: number;   // player's own rank metric — the ACADEMIC axis, and the one the whole economy reads (see systems/prestige/prestigeSystem.ts)
  // The other two standings, added beside `reputation` and never inside it
  // (see docs/design/progression.md's "Three standings"). Both are stocks of
  // exactly the same shape — a target computed weekly from durable inputs,
  // drifted toward at PRESTIGE_DRIFT_RATE — and both are READINGS: no system
  // reads either one back. Admissions, tuition, the applicant pool and the
  // balance sim all still read `reputation` alone.
  socialStanding: number;
  researchStanding: number;
  vernacular: Vernacular; // the architecture the campus is built in, fixed at founding
}

// The institution's full display name. The one place the two halves are
// joined, so a school resumed from a pre-split save (empty suffix) reads
// exactly as it always did rather than picking up a stray space.
export function institutionName(u: University): string {
  return u.suffix ? `${u.name} ${u.suffix}` : u.name;
}

// Total enrolled across the four classes — the whole student body. Derived,
// never stored, so it can never drift from the classes it sums. Every
// per-student reading (tuition, instruction cost, appropriations, scale)
// goes through this.
export function totalEnrolled(s: StudentBody): number {
  return s.classes.freshman + s.classes.sophomore + s.classes.junior + s.classes.senior;
}

// One year's worth of the school's headline numbers, appended once a year
// at the admissions boundary (see reducer.ts's RESOLVE_ADMISSIONS — the
// game's only annual boundary). This is the game's time series: the long
// arc the docs/design/gameplay.mdis about is otherwise invisible, because
// every stat on screen is a "right now" reading with no memory.
//
// Deliberately NUMBERS ONLY — no functions, no Dates, no references into
// `tech`/`rivals` — so the whole history survives a JSON round trip
// untouched when save/load lands, and so its size stays predictable: one
// small flat record per in-game year (a 50-year run is 50 of these).
// Anything derivable from these fields (catalogue percentage, year-over-
// year deltas) is derived at read time by the views, never stored here.
export interface YearSnapshot {
  year: number;           // the year that just CLOSED; the snapshot is the state the school carries into year + 1
  prestige: number;       // self.reputation after that year's drift
  rank: number;           // 1-indexed national rank at that moment, recorded whether or not the player has unlocked the rankings reveal yet
  enrolled: number;       // the class the admissions funnel just committed
  cash: number;
  coursesDone: number;    // 'done' course Buildables — the catalogue's progress
  programsEstablished: number; // program-established milestones awarded so far
  satisfaction: number;   // 0..100
}

// ---------------------------------------------------------------------
// WHO TEACHES WHAT. Course id -> the id of the Faculty member the player
// chose to teach it, written when development starts and editable
// afterwards (REASSIGN_COURSE_FACULTY).
//
// A SEPARATE RECORD, keyed by id, rather than a field on Buildable — for
// exactly the reason `placements` is a separate record and not a field on
// Buildable (see docs/architecture/buildables.md). A building's location
// and a course's instructor are the same SHAPE of fact: something true of
// one KIND of Buildable, which must not fork the single Buildable model
// that serves all four kinds. Courses are never placed and so never carry
// a `placements` entry; buildings never have instructors and so never
// carry one here. Same reasoning, same shape, in both directions.
//
// WHY THIS IS REAL STATE AND NOT A PROJECTION. It used to be neither: the
// engine tracked only per-field slot CAPACITY, and who taught what was a
// deterministic round-robin computed on read (see
// systems/faculty/facultyAssignment.ts, which now reads this record
// instead). That was fine while the answer was only ever a caption. It
// cannot carry a course QUALITY GRADE, which is what lands next: hire one
// more person into a field and the round-robin silently re-pairs every
// course in it, so a grade computed off it would change whenever the
// roster did, for reasons the player never chose and cannot see. Letting
// the player pick is what makes the pairing stable enough to grade.
//
// An id here may go STALE in exactly one way: the person is dismissed
// (FIRE_FACULTY clears their entries) or is otherwise no longer on the
// roster. A course that is offered but has no live entry is UNSTAFFED —
// see techSystem.ts's isUnstaffed. That is a real, visible state the
// player has to fix, not an error: it is the "department left
// understaffed, its courses on hold" chain the
// docs/design/faculty.mdfaculty section describes. Unstaffed courses
// hold no slot, so dismissing someone frees their field capacity at the
// same moment it orphans their courses.
//
// A plain id -> id record, the same shape rationale as `milestones` and
// `pathways`: no Map, no reference into `faculty` or `tech`, so it
// survives a JSON round trip untouched.
export type CourseFaculty = Record<string, string>;

export interface GameState {
  clock: GameClock;
  finance: Finance;
  students: StudentBody;
  faculty: Faculty[];
  tech: Buildable[];
  developing: Record<string, number>; // course id -> weeks remaining
  courseFaculty: CourseFaculty;       // course id -> the faculty member teaching it; the player's choice, made when development starts (see the CourseFaculty block above)
  placements: Placements;            // Buildable id -> the campus tiles it covers; visual only (see the campus map block above)
  pathways: Pathways;                 // drawn walkway tiles; visual only, read by no system (see the Pathways block above)
  trees: Trees;                       // the founding woodland, tile -> render seed; felled by building, hidden by paving (see the Trees block above)
  rivals: Rival[];
  self: University;
  history: YearSnapshot[];       // one entry per completed in-game year, oldest first — the game's only time series (see YearSnapshot above)
  log: LogEntry[];               // recent events, newest first
  pendingInterrupt: PendingInterrupt | null; // set => clock halts until resolved
  events: EventState;            // cadence bookkeeping for milestone celebrations and authored decision events (see EventState above)
  orgs: StudentOrgState;         // the student organisations the campus has grown: clubs, Greek chapters, and the petitions waiting on the next summer digest (see StudentOrgState above)
  research: ResearchState;       // the research stock, what it has produced, and the prize queue (see ResearchState above)
  candidates: Faculty[];         // the standing academic job market: a long, always-churning list of people available to appoint right now. facultySystem.ts's tickCandidatePool ages every listing, withdraws the ones that have been up too long, and tops the pool back up to CANDIDATE_POOL_TARGET each week — there is no posting, no fee, and no wait (see facultyData.ts's churn block)
  started: boolean;              // false only during the pre-game startup screen (name + school type)
  hasEnteredRankings: boolean;   // true once the one-time "you've entered the top 50" reveal has fired
  milestones: Record<string, boolean>; // milestone key -> awarded, so each curriculum milestone bonus fires once
  seen: SeenState;               // what the player has already been shown, for the curriculum/build/faculty alert badges (see SeenState above)
}

// ---------------------------------------------------------------------
// ALERT BADGES: a small red "new content" marker on a toolbar icon (and,
// for the build menu, on the specific category tab holding the new item),
// cleared the moment the player actually looks at the thing it's pointing
// at. Three independent slices, one per menu that can raise one:
//   - courseIds: every course id the Curriculum tab has ever rendered on
//     screen for this player (see tabs/CurriculumTab.tsx's
//     visibleCourseIds) — a course counts as "seen" the instant it's
//     revealed while the tab is open, whatever its own status is, since
//     revealing it (not finishing it) is the moment there was something
//     new to notice.
//   - buildableIds: every placeable Buildable id (building/dorm/facility)
//     the build popup has rendered as a tile while its OWN category tab
//     was the active one (see components/BuildPopup.tsx) — so a building
//     that appears in a tab the player hasn't switched to yet stays
//     unseen, and the build button's badge stays lit, even while the
//     popup itself is open on a different tab.
//   - tabIds: every gated tab (see components/TabNav.tsx's TAB_GATES) whose
//     gate has been noticed OPEN. Unlike the other three this is not a
//     badge: it is what keeps the one-off "the Research view is now
//     available" log line one-off — including across a save that resumes
//     with the gate already open, and across a gate that closes and reopens
//     (a school that disbands its last varsity team and founds another does
//     not get told twice).
//   - candidateIds: DEAD STATE. It fed the Faculty tab's alert badge —
//     an unseen candidate in a field the school was short on — and that
//     badge is retired: it was a prompt to run the old hiring loop, and
//     hiring now happens where the shortage is felt (see FacultyTab.tsx and
//     Toolbar.tsx's TAB_ALERT). Nothing writes it and nothing reads it. Left
//     in the saved shape exactly as Faculty.morale and ResearchState.points
//     were, rather than spending a migration to remove a record that costs
//     nothing; the weekly prune that used to bound its growth went with the
//     writes, since an empty record does not grow.
//
// Each is a plain id -> true record, the same shape rationale as
// `pathways` and `milestones`: no Map/Set, no reference into `tech`, so it
// survives a JSON round trip untouched. Ids only ever get ADDED here (by
// the MARK_SEEN action — see actions.ts) except for candidateIds, which
// the weekly tick prunes down to whoever is still actually listed (see
// reducer.ts's TICK case) — the candidate market churns constantly, so
// without pruning this would grow without bound over a long run, unlike
// the other two, which are bounded by the size of the (fixed) course/
// building catalogue.
export interface SeenState {
  courseIds: Record<string, true>;
  buildableIds: Record<string, true>;
  candidateIds: Record<string, true>;
  tabIds: Record<string, true>;
}

export interface LogEntry {
  year: number;
  week: number;
  message: string;
  kind: 'info' | 'good' | 'bad';
}

export const WEEKS_PER_YEAR = 52; // the one place the game's year length lives — every system (clock, annual interrupts, finance annualization) reads from this
