import type { CohortCounts, CohortId, GameState } from '../../state/types';
import { weeklyResearchPoints } from '../../data/researchData';
import { graduateCourseIds, graduatePrograms } from '../../data/techData';
import { sportById, sportEconomics, teamQuality } from '../../data/studentLifeData';

// ---------------------------------------------------------------------
// STUDENT COHORTS: a second, additive lens on the applicant pool
// admissionsSystem.ts's funnel already grows and shrinks — prestige,
// price, satisfaction, dorm capacity, sticker shock, quality bands.
// Deliberately NOT a full segmentation of that funnel: a cohort does not
// get its own quality band or sticker-shock rate. Instead
// every cohort's `pull` blends into ONE extra multiplier on the whole pool
// (see cohortDemandFactor below and admissionsSystem.ts's rawApplicants),
// the same architectural role wordOfMouthFactor and capacityFactor already
// play there. That keeps the funnel's well-tuned band/sticker-shock
// math (see admissions-pricing.test.ts) completely untouched, while still
// giving the player several genuinely independent reasons enrollment can
// grow, instead of only prestige and price: building labs pulls in
// research-oriented families, fielding a real varsity program pulls in
// athletes, being an honest deal pulls in price-sensitive ones, and so on
// — a different lever for each of several different strategies, not one
// dial that does everything.
//
// Every driver below reads a GameState field that already exists —
// research output, established programs, club counts, team quality. There
// is nothing new to persist and no save migration: a cohort's pull is a
// pure function, recomputed fresh wherever it's needed (the admissions
// interrupt's live preview, the reducer's actual resolve), never stored.
// ---------------------------------------------------------------------

// CohortId itself now lives in state/types.ts, with the rest of the game's
// concepts — state.students.cohortsByClass is typed by it, and types.ts
// deliberately imports nothing. Everything a cohort *does* is still here.
export type { CohortId };

// baseShare is each cohort's rough weight in a "typical" applicant pool
// (not a claim about the real world, just a relative sizing so no single
// niche cohort — arts-focused, athletes — can swing the total as hard as a
// broad one like pre-professional) — the seven with a base share MUST sum
// to 1, checked by
// invariants.test.ts, so growing one cohort's share always means shrinking
// another's rather than silently inflating the total.
export const COHORTS: Array<{ id: CohortId; label: string; baseShare: number; driverLabel: string }> = [
  { id: 'highAchievers', label: 'High achievers', baseShare: 0.20, driverLabel: 'distinguished & graduate programs' },
  { id: 'preProfessional', label: 'Pre-professional', baseShare: 0.22, driverLabel: 'established career-track majors' },
  { id: 'researchOriented', label: 'Research-oriented', baseShare: 0.10, driverLabel: 'publications, breakthroughs, prizes & labs' },
  { id: 'social', label: 'Social', baseShare: 0.15, driverLabel: 'clubs & Greek chapters' },
  { id: 'artsFocused', label: 'Arts-focused', baseShare: 0.08, driverLabel: 'arts programs & venues' },
  { id: 'priceSensitive', label: 'Price-sensitive', baseShare: 0.15, driverLabel: 'your price vs. what your prestige supports' },
  { id: 'athletes', label: 'Athletes', baseShare: 0.10, driverLabel: 'active varsity teams, coaching & recent titles' },
  // UNDERGRADUATES WHO CHOSE THIS UNIVERSITY FOR ITS GRADUATE SCHOOLS —
  // the pre-meds, the pre-laws, the ones intending to continue. NOT
  // graduate students themselves, and the distinction is load-bearing:
  // every cohort here is a kind of APPLICANT to the one undergraduate
  // funnel, admitted into a freshman class and graduating four years
  // later. An actual graduate student does none of those things (an MBA
  // is two years, a JD three, a doctorate five or more), so modelling one
  // as a cohort would put a two-year degree on a four-year conveyor. A
  // real graduate population is a separate body with its own residencies
  // — see docs/design/graduate-programs.md's first boundary, which says
  // to re-open the design rather than bolt it on.
  //
  // THE ONE COHORT WITH NO BASE SHARE, and the reason baseShare is
  // documented above as a share of a pool with no graduate school. A
  // college with nothing to continue INTO does not draw a small number of
  // students who came to continue — it draws none, which no
  // `baseShare > 0` can express. Its share is computed instead (see
  // gradBoundShare), growing from exactly zero as graduate and
  // professional courses are developed.
  { id: 'gradBound', label: 'Grad-school bound', baseShare: 0, driverLabel: 'graduate & professional school courses' },
];

// Career-track majors (Business, Engineering, Health Science, Computer
// Science — see techData.ts's SCHOOLS), named explicitly here rather than
// derived from a "professional" flag on SchoolSeed (which doesn't exist):
// these six-major blocks are the ones a real pre-professional applicant
// pool is actually chasing. Grad Medicine/Law count too (see
// gradPrograms below) — this list is undergrad majors only.
const PRE_PROFESSIONAL_PREFIXES = [
  'FINA', 'ACCT', 'MRKT', 'ECON', 'MGMT', 'SPCO', // Business
  'MECH', 'ELEC', 'CHEM', 'CIVE', 'INDE', 'AERO', // Engineering
  'PHLT', 'NURS', 'NUTR', 'PHRM', 'KINE', 'NEUR', // Health Science
  'COMP', 'DATA', 'CYBR', 'SOFT', 'ARTF', 'INFO', // Computer Science
];
const ARTS_PREFIXES = ['MDIA', 'GRDS', 'CRWR', 'MUSC', 'FILM', 'SART']; // Arts & Media
const ARTS_FACILITY_IDS = ['ARTS-PAC', 'ART-GALLERY'];

function establishedPrefixCount(s: GameState, prefixes: string[]): number {
  const established = new Set(
    Object.keys(s.milestones)
      .filter((k) => k.startsWith('program-established:'))
      .map((k) => k.slice('program-established:'.length)),
  );
  return prefixes.filter((p) => established.has(p)).length;
}

function milestoneCountWithPrefix(s: GameState, prefix: string): number {
  return Object.keys(s.milestones).filter((k) => k.startsWith(prefix)).length;
}

function doneIds(s: GameState, ids: string[]): number {
  const done = new Set(s.tech.filter((t) => t.status === 'done').map((t) => t.id));
  return ids.filter((id) => done.has(id)).length;
}

// The structural signals every cohort but priceSensitive reads — plain
// numbers, derived once per GameState read (see deriveCohortSignals),
// never persisted. priceSensitive instead reads tuition (and a
// price-tolerance reading derived from prestige) directly (see
// cohortDemandFactor) since those are the values the admissions interrupt
// previews LIVE, before they're ever written to GameState — the same
// reason projectAdmissions itself takes them as explicit parameters rather
// than reading s.finance directly.
export interface CohortSignals {
  distinguishedDepth: number;   // program-distinguished + 2x grad-program-complete
  professionalPrograms: number; // established PRE_PROFESSIONAL_PREFIXES majors, 0..24
  researchRate: number;         // weeklyResearchPoints(s)
  researchOutput: number;       // what the labs have PRODUCED — publications at a tenth, breakthroughs, prizes at three (Plan 15's PR C: output reaches the applicant pool, labelled)
  labCount: number;             // 'facilityType' === 'lab' Buildables done
  socialOrgCount: number;       // clubs + chapters
  artsPrograms: number;         // established ARTS_PREFIXES majors, 0..6
  artsFacilities: number;       // ARTS_FACILITY_IDS done, 0..2
  activeTeams: number;          // varsity teams with status 'active'
  athleticsQuality: number;     // avg teamQuality() across active teams, 0 if none
  revenueShare: number;         // the share of the department's cost to compete that its revenue sports carry, 0..1 — how "big-programme" the department is (Plan 21's PR H)
  athleticResults: number;      // what the programs have WON — titles and deep postseason runs on a decaying window (Plan 21's PR C: results reach the pool, as research output already does)
  athleticResultsLabel: string; // the cause, named for the summer modal: "the 2031 title in Men's Basketball"; '' when there is nothing recent
  gradCourseDepth: number;      // 'done' graduate/professional course Buildables, 0..37
}

// A TITLE REACHES THE APPLICANT POOL (Plan 21's PR C). The athletes cohort
// used to read capacity alone — teams times quality — and sat within a few
// percent of its cap from four decent programs onward, so the whole back
// half of athletics was worth nothing at the funnel; researchOriented, by
// contrast, has always read what the labs PRODUCED beside what they are.
// This is the same term for athletics: each national title is worth
// TITLE_RESULT_WEIGHT the summer after it and decays by RESULT_DECAY a
// year, and last season's deep runs count a little, so a championship
// swells the next summer's pool and fades over a few years rather than
// compounding forever. Sized so a title is VISIBLE and not a strategy:
// the cohort's cap barely moves; what changes is what it takes to reach it.
const TITLE_RESULT_WEIGHT = 1.5;
const RESULT_DECAY = 0.65;
const RESULT_WINDOW_YEARS = 5;
const FINISH_RESULT_WEIGHT: Record<string, number> = { final: 0.5, semifinal: 0.25, quarterfinal: 0.1 };

export function athleticResultsFor(s: GameState): { results: number; label: string } {
  let results = 0;
  const recent: Array<{ sport: string; year: number }> = [];
  for (const title of s.orgs.titles) {
    const age = s.clock.year - title.year;
    if (age < 0 || age >= RESULT_WINDOW_YEARS) continue;
    // Weighted by the sport's scale (PR F): a football title is national
    // news, a title in swimming is a line in the alumni magazine.
    results += TITLE_RESULT_WEIGHT * sportEconomics(title.sport).payoffMultiplier * RESULT_DECAY ** age;
    recent.push(title);
  }
  for (const result of Object.values(s.orgs.lastSeason)) {
    if (s.clock.year - result.year > 1) continue;
    results += (FINISH_RESULT_WEIGHT[result.finish] ?? 0) * sportEconomics(result.sport).payoffMultiplier;
  }
  recent.sort((a, b) => b.year - a.year);
  const name = (t: { sport: string; year: number }) => `the ${t.year} title in ${sportById(t.sport)?.teamName.replace(/ Team$/, '') ?? t.sport}`;
  const label = recent.length === 0
    ? (results > 0 ? "last season's postseason runs" : '')
    : recent.length === 1
      ? name(recent[0])
      : `${name(recent[0])} and ${recent.length - 1} other recent title${recent.length === 2 ? '' : 's'}`;
  return { results, label };
}

export function deriveCohortSignals(s: GameState): CohortSignals {
  const activeTeams = s.orgs.teams.filter((t) => t.status === 'active');
  const athletic = athleticResultsFor(s);
  return {
    distinguishedDepth: milestoneCountWithPrefix(s, 'program-distinguished:') + 2 * milestoneCountWithPrefix(s, 'grad-program-complete:'),
    professionalPrograms: establishedPrefixCount(s, PRE_PROFESSIONAL_PREFIXES),
    researchRate: weeklyResearchPoints(s),
    researchOutput: 0.1 * s.research.publications + s.research.breakthroughs + 3 * s.research.prizes,
    labCount: s.tech.filter((t) => t.status === 'done' && t.facilityType === 'lab').length,
    socialOrgCount: s.orgs.clubs.length + s.orgs.chapters.length,
    artsPrograms: establishedPrefixCount(s, ARTS_PREFIXES),
    artsFacilities: doneIds(s, ARTS_FACILITY_IDS),
    activeTeams: activeTeams.length,
    athleticsQuality: activeTeams.length > 0
      ? activeTeams.reduce((sum, t) => sum + teamQuality(t, s), 0) / activeTeams.length
      : 0,
    revenueShare: revenueShareOf(activeTeams.map((t) => t.sport)),
    athleticResults: athletic.results,
    athleticResultsLabel: athletic.label,
    // Counted off DEVELOPED COURSES rather than off the
    // `grad-program-complete:` milestones, deliberately. A milestone count
    // is a step function: five of Medicine's twelve courses built would
    // read as no graduate school at all, and the twelfth would summon a
    // whole student body in one week. Courses make it a ramp, which is
    // what "scales with the development of graduate programs" has to mean
    // if the player is to see it responding while they build.
    gradCourseDepth: doneIds(s, graduatePrograms().flatMap(graduateCourseIds)),
  };
}

// A school that has built or achieved nothing beyond founding reads every
// signal at 0 — this is the neutral baseline every pull() curve below is
// centered on, so cohortDemandFactor(NEUTRAL_SIGNALS, ...) at a net price
// exactly at priceTolerance is exactly 1.0 (no effect either way).
export const NEUTRAL_COHORT_SIGNALS: CohortSignals = {
  distinguishedDepth: 0, professionalPrograms: 0, researchRate: 0, researchOutput: 0, labCount: 0,
  socialOrgCount: 0, artsPrograms: 0, artsFacilities: 0, activeTeams: 0, athleticsQuality: 0,
  revenueShare: 0, athleticResults: 0, athleticResultsLabel: '',
  gradCourseDepth: 0,
};

// How much of the department is revenue sport, by cost to compete: a
// football school reads near 1, a swimming school 0.
export function revenueShareOf(sportIds: readonly string[]): number {
  let total = 0;
  let revenue = 0;
  for (const id of sportIds) {
    const economics = sportEconomics(id);
    total += economics.costToCompete;
    if (economics.scale === 'revenue') revenue += economics.costToCompete;
  }
  return total > 0 ? revenue / total : 0;
}

// THE COST OF A BIG PROGRAMME (Plan 21's PR H). Cohort and quality band
// were deliberately independent dimensions — a cohort decides how many
// applicants, the band decides how good — and this couples them in one
// narrow place: the realised class's band mix shifts slightly with the
// athlete share of the pool, weighted by how much of the department is
// revenue sport. A football school admits a class that is larger and
// academically a shade weaker; a swimming school barely notices. Athletics
// still never touches the academic number directly; it touches the class
// the school admits, and the class has always been allowed to move
// prestige. Returned as the shift admissionsSystem.ts's qualityMix takes
// off the top band and adds to the low one — at most ATHLETE_BAND_DRAG,
// for a department whose athletes have doubled their base share and whose
// programs are all revenue sports.
const ATHLETE_BAND_DRAG = 0.06;
const ATHLETE_DRAG_REVENUE_FLOOR = 0.3; // an all-Olympic department still drags a little

export function athleteBandDrag(signals: CohortSignals, tolerance: number, tuition: number): number {
  const weights = cohortWeights(signals, tolerance, tuition);
  const total = weights.reduce((sum, w) => sum + w, 0);
  const athletes = COHORTS.findIndex((c) => c.id === 'athletes');
  if (total <= 0 || athletes === -1) return 0;
  const base = COHORTS[athletes].baseShare;
  const excess = Math.max(0, weights[athletes] / total - base) / base; // 0 at base share, 1 at double
  const scale = ATHLETE_DRAG_REVENUE_FLOOR + (1 - ATHLETE_DRAG_REVENUE_FLOOR) * signals.revenueShare;
  return ATHLETE_BAND_DRAG * Math.min(1, excess) * scale;
}

// Every growth-driven cohort (everything but priceSensitive) uses the same
// bounded, diminishing-returns shape wordOfMouthFactor/capacityFactor
// already use elsewhere in this system: 1.0 at zero signal, rising toward
// 1 + STRENGTH as the signal grows, never runaway. STRENGTH/DECAY are
// picked per cohort below so a school that fully commits to one strategy
// (all labs, or a full varsity program) sees a real, felt pull from that
// cohort without any single lever dwarfing the others.
function boundedPull(strength: number, decay: number, signal: number): number {
  return 1 + strength * (1 - Math.exp(-decay * Math.max(signal, 0)));
}

const HIGH_ACHIEVER_STRENGTH = 0.6;
const HIGH_ACHIEVER_DECAY = 0.15;
const PRE_PROFESSIONAL_STRENGTH = 0.5;
const PRE_PROFESSIONAL_DECAY = 0.12;
const RESEARCH_STRENGTH = 0.8;
const RESEARCH_DECAY = 0.15;
const SOCIAL_STRENGTH = 0.5;
const SOCIAL_DECAY = 0.08;
const ARTS_STRENGTH = 0.7;
const ARTS_DECAY = 0.35;
const ATHLETICS_STRENGTH = 0.7;
// 0.5 until Plan 21's PR C: at 0.5 the curve was flat from four decent
// programs onward (six teams at 70 read 1.61, at 100 read 1.67), so nothing a
// program did after fielding was worth anything here. At 0.3 the same six
// teams read 1.50, a title on top of them 1.55, and a dynasty 1.63 — the
// cap is where it was; reaching it now takes results.
const ATHLETICS_DECAY = 0.3;

// The athletes cohort's own signal: capacity (teams times quality) plus what
// they have won. One place, so the pull and the summer modal's "worth N of
// these" line (cohortBreakdown) read the same sum.
function athleticsSignal(signals: CohortSignals, withResults: boolean): number {
  return signals.activeTeams * (signals.athleticsQuality / 100) + (withResults ? signals.athleticResults : 0);
}

// Price-sensitive is the one cohort that responds to price rather than a
// built asset, and the one place this module needs a price-tolerance
// reading — passed in by the caller (see `tolerance` below) rather than
// imported from admissionsSystem.ts, which would make the two files import
// each other for one pure number. Centered on that tolerance — the same
// earned-price curve admissionsSystem.ts's own sticker shock and
// applicant-volume discount are measured against — so pricing AT or under
// what the school's own standing supports pulls this cohort in (up to
// +STRENGTH at a price of 0), and pricing over it pushes them away (down
// to -STRENGTH at double tolerance or beyond, clamped). This compounds
// with the funnel's existing price-driven volume discount rather than
// duplicating it: that discount is about applicants overall; this is
// specifically about how big a SHARE of them are the deal-conscious ones,
// same real distinction as sticker shock already draws between quality
// bands.
//
// It read NET price until scholarships were retired (Plan 05's PR B).
// Nothing was retuned when they went: the curve is centered on
// priceTolerance, not on the gap between a sticker and a net price, so
// with one price it simply reads that one.
const PRICE_SENSITIVE_STRENGTH = 0.35;

function priceSensitivePull(tolerance: number, tuition: number): number {
  const ratio = tolerance > 0 ? Math.max(tuition, 0) / tolerance : 0;
  return 1 + PRICE_SENSITIVE_STRENGTH * Math.max(-1, Math.min(1, 1 - ratio));
}

// One cohort's pull, keyed by id — the single place every cohort's own
// formula lives, read by both cohortDemandFactor (the blended total) and
// cohortBreakdown (the per-cohort UI detail) so the two can never drift
// apart into different numbers for the same cohort. `tolerance` is
// priceTolerance(prestige) — see admissionsSystem.ts — computed once by
// the caller and threaded through rather than recomputed here.
function pullFor(id: CohortId, signals: CohortSignals, tolerance: number, tuition: number): number {
  switch (id) {
    case 'highAchievers': return boundedPull(HIGH_ACHIEVER_STRENGTH, HIGH_ACHIEVER_DECAY, signals.distinguishedDepth);
    case 'preProfessional': return boundedPull(PRE_PROFESSIONAL_STRENGTH, PRE_PROFESSIONAL_DECAY, signals.professionalPrograms);
    // Capacity AND output: the labs and who staffs them, plus what they have
    // actually produced. A breakthrough is worth a lab to the cohort that
    // chooses a university for its research.
    case 'researchOriented': return boundedPull(RESEARCH_STRENGTH, RESEARCH_DECAY, signals.researchRate / 10 + signals.labCount + signals.researchOutput);
    case 'social': return boundedPull(SOCIAL_STRENGTH, SOCIAL_DECAY, signals.socialOrgCount);
    case 'artsFocused': return boundedPull(ARTS_STRENGTH, ARTS_DECAY, signals.artsPrograms * 1.5 + signals.artsFacilities * 2);
    case 'priceSensitive': return priceSensitivePull(tolerance, tuition);
    case 'athletes': return boundedPull(ATHLETICS_STRENGTH, ATHLETICS_DECAY, athleticsSignal(signals, true));
    // Flat 1.0, and it must stay flat: this cohort's entire responsiveness
    // to what the school has built lives in its SHARE (see gradBoundShare), so
    // a pull that also read gradCourseDepth would count the same graduate
    // courses twice. The `pull` column a panel shows for this cohort is
    // therefore always neutral, which is honest — the number that moves
    // for graduate students is how many of them there are.
    case 'gradBound': return 1;
  }
}

// The single multiplier admissionsSystem.ts's applicantVolume applies on
// top of everything else — a share-weighted blend of all eight cohorts'
// pulls, so improving ANY one of them nudges the whole pool, in proportion
// to how big that cohort's own baseShare is. Exactly 1.0 when every
// cohort's pull is exactly 1.0 (a founding school pricing itself at
// priceTolerance — see NEUTRAL_COHORT_SIGNALS above).
// THE GRAD-SCHOOL-BOUND ARE AN EXTRA AUDIENCE, NOT A REDISTRIBUTION of
// the rest. Their weight is ADDED to the seven rather than taken out of
// them, which is the whole mechanical point: founding a law school does
// not persuade prospective athletes to become lawyers, it puts the school
// in front of applicants who were never going to consider it. So a school
// with graduate programs draws a bigger undergraduate pool, and
// cohortDemandFactor rises above 1 by exactly this weight even with every
// other cohort sitting at neutral.
//
// The alternative — carving a grad share out of the seven and rescaling
// them down — was tried on paper and is perverse: since this cohort's own
// pull is 1.0 (see pullFor), diluting cohorts whose pulls are above 1.0
// with one that is not would make BUILDING a graduate school shrink the
// applicant pool.
const GRAD_BOUND_SHARE_MAX = 0.18;
const GRAD_BOUND_SHARE_DECAY = 0.05;

// Zero at zero, which no boundedPull can be — every other cohort's curve
// starts at 1.0 and rises, because every other cohort exists in some
// proportion at a school that has built nothing. Nobody picks a college
// for a graduate school it does not have, so this one is absent outright
// until there is something to continue into: a share that grows, rather
// than a pull that multiplies.
//
// Calibrated against the 37 authored graduate courses: the business school
// alone (5) is worth about 4% of the pool, Medicine (12) about 8%, Medicine
// and Law together (20) about 11%, and the full graduate build-out about
// 15%. Diminishing, like every other curve in this module, so the first
// programs matter most.
export function gradBoundShare(signals: CohortSignals): number {
  return GRAD_BOUND_SHARE_MAX * (1 - Math.exp(-GRAD_BOUND_SHARE_DECAY * Math.max(signals.gradCourseDepth, 0)));
}

// Each cohort's WEIGHT in the pool: its share times how keenly it responds.
// The single place the eight weights are computed, read by both
// cohortDemandFactor (which sums them) and cohortBreakdown (which
// apportions by them), so the blended total and the per-cohort counts can
// never be computed two different ways.
//
// These do NOT sum to 1, and are not meant to: they sum to 1 at a founding
// school and rise from there. apportion() normalises by their total, so the
// breakdown is unaffected by the scale.
function cohortWeights(signals: CohortSignals, tolerance: number, tuition: number): number[] {
  return COHORTS.map((c) => (
    c.id === 'gradBound'
      ? gradBoundShare(signals)
      : c.baseShare * pullFor(c.id, signals, tolerance, tuition)
  ));
}

export function cohortDemandFactor(signals: CohortSignals, tolerance: number, tuition: number): number {
  return cohortWeights(signals, tolerance, tuition).reduce((sum, w) => sum + w, 0);
}

// Per-cohort detail for the admissions UI: not just the blended total, but
// HOW MANY APPLICANTS each cohort is actually worth — so a player can see
// which of their choices (or which building) is moving which audience, and
// by how many people, rather than reading a multiplier and doing the
// arithmetic themselves.
//
// `applicants` is a real head count out of the realized pool, not a second
// opinion about it. cohortDemandFactor is a share-weighted blend of the
// same pulls, so a cohort's share of the pool is exactly its own weighted
// term over that blend — which means these counts are a decomposition of
// the pool the funnel already produced, not a parallel model that could
// disagree with it. Quality band and cohort are independent dimensions in
// this model (sticker shock scales bands, never cohorts), so the split is
// the same before and after the funnel's own attrition, and applying it to
// the realized pool is exact rather than an approximation.
export interface CohortDetail {
  id: CohortId;
  label: string;
  driverLabel: string;
  pull: number;       // this cohort's own multiplier, 1.0 = neutral
  applicants: number; // whole applicants from this cohort; the eight sum to `applicants`
  // The cause, named, where one figure has one: "the 2031 title in Men's
  // Basketball is worth 4,100 of these" (Plan 21's PR C). Only the athletes
  // cohort carries one today; undefined otherwise.
  note?: string;
}

// Whole people, and the eight of them add up. Apportioned by largest
// remainder (the same method used to seat a legislature, and for the same
// reason): floor every share, then hand the leftover applicants out to the
// cohorts with the biggest fractions. Rounding each share on its own would
// leave a breakdown that misses its own total by a few students, which on a
// panel that shows both is just a visible arithmetic error.
function apportion(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || total <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (w / sum) * total);
  const counts = exact.map(Math.floor);
  let remainder = total - counts.reduce((a, b) => a + b, 0);
  const byFraction = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of byFraction) {
    if (remainder <= 0) break;
    counts[i] += 1;
    remainder -= 1;
  }
  return counts;
}

// `applicants` is the realized pool — projectAdmissions's own rounded
// figure, the one the panel puts at the top — so the breakdown and the
// headline can never disagree by a student.
export function cohortBreakdown(
  signals: CohortSignals,
  tolerance: number,
  tuition: number,
  applicants: number,
): CohortDetail[] {
  const pulls = COHORTS.map((c) => pullFor(c.id, signals, tolerance, tuition));
  const counts = apportion(cohortWeights(signals, tolerance, tuition), Math.max(0, Math.round(applicants)));
  return COHORTS.map((c, i) => ({
    id: c.id,
    label: c.label,
    driverLabel: c.driverLabel,
    pull: pulls[i],
    applicants: counts[i],
    note: c.id === 'athletes' ? athleticsNote(signals, pulls[i], counts[i]) : undefined,
  }));
}

// How many of the athletes cohort the recent results are worth: the share
// of this cohort's pull that capacity alone would not have produced, as
// whole people out of the count the cohort actually drew.
function athleticsNote(signals: CohortSignals, pull: number, applicants: number): string | undefined {
  if (signals.athleticResults <= 0 || !signals.athleticResultsLabel || pull <= 1) return undefined;
  const without = boundedPull(ATHLETICS_STRENGTH, ATHLETICS_DECAY, athleticsSignal(signals, false));
  const fromResults = Math.round(applicants * (pull - without) / pull);
  if (fromResults <= 0) return undefined;
  const label = signals.athleticResultsLabel;
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${label.includes(' and ') ? 'are' : 'is'} worth ${fromResults.toLocaleString()} of these.`;
}

// The same seven counts as cohortBreakdown, keyed rather than listed and
// without the per-cohort pull/label detail a panel needs. This is the shape
// state.students.cohortsByClass stores, and `total` is whatever is being
// decomposed: an applicant pool (the reveal) or an ENROLLED class (the
// record written at admission).
//
// Apportioning the enrolled count with the pool's own weights is exact, not
// an approximation, for the reason the module comment gives: quality band
// and cohort are independent dimensions here — sticker shock scales bands,
// never cohorts — so the mix is the same before and after the funnel's
// attrition. Built on cohortBreakdown rather than beside it so there is one
// apportionment in this file and the two can never disagree by a student.
export function cohortCounts(
  signals: CohortSignals,
  tolerance: number,
  tuition: number,
  total: number,
): CohortCounts {
  const counts = {} as CohortCounts;
  for (const d of cohortBreakdown(signals, tolerance, tuition, total)) counts[d.id] = d.applicants;
  return counts;
}

// The mix of a class NOBODY CHOSE: base shares alone, no pull from anything
// built, apportioned the same way so the eight are still whole students that
// sum to `total`.
//
// Two callers, and they are the same situation seen twice. A founding school
// opens with all four classes already on the books (see foundingData.ts's
// FOUNDING_CLASSES) admitted before the player had built a single thing for a
// cohort to respond to; and a save written before cohortsByClass existed is in
// that position for its up-to-four standing classes. Both get the model's own
// statement of what a pool looks like absent any signal.
//
// This is a NEUTRAL PRIOR, not a reconstruction, and the Enrollment tab says
// so rather than presenting it as a record of who those students were.
export function baseShareCohortCounts(total: number): CohortCounts {
  const counts = apportion(COHORTS.map((c) => c.baseShare), Math.max(0, Math.round(total)));
  const out = {} as CohortCounts;
  COHORTS.forEach((c, i) => { out[c.id] = counts[i]; });
  return out;
}
