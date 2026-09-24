import { tagPoolFactor, tagQualityShift } from '../identity/tags';
import { campusBeauty } from '../estate/beauty';
import type { CohortCounts, CohortId, GameState } from '../../state/types';
import { weeklyResearchPoints } from '../../data/researchData';
import { graduateCourseIds, graduatePrograms } from '../../data/techData';
import { sportById, sportEconomics, teamQuality } from '../../data/studentLifeData';

// Student cohorts: an additive lens on admissionsSystem.ts's applicant
// pool. Their pulls blend into one extra multiplier on the pool
// (cohortDemandFactor), leaving the funnel's band math untouched while each
// strategy gets its own lever. Pure functions of state, never stored.

export type { CohortId };

// baseShare is each cohort's relative size in a typical pool. The seven with
// a base share must sum to 1 (invariants.test.ts).
export const COHORTS: Array<{ id: CohortId; label: string; baseShare: number; driverLabel: string }> = [
  { id: 'highAchievers', label: 'High achievers', baseShare: 0.20, driverLabel: 'distinguished & graduate programs' },
  { id: 'preProfessional', label: 'Pre-professional', baseShare: 0.22, driverLabel: 'established career-track majors' },
  { id: 'researchOriented', label: 'Research-oriented', baseShare: 0.10, driverLabel: 'publications, breakthroughs, prizes & labs' },
  { id: 'social', label: 'Social', baseShare: 0.15, driverLabel: 'clubs & Greek chapters' },
  { id: 'artsFocused', label: 'Arts-focused', baseShare: 0.08, driverLabel: 'arts programs & venues' },
  { id: 'priceSensitive', label: 'Price-sensitive', baseShare: 0.15, driverLabel: 'your price vs. what your prestige supports' },
  { id: 'athletes', label: 'Athletes', baseShare: 0.10, driverLabel: 'active varsity teams, coaching & recent titles' },
  // Undergraduates who chose the school for its graduate schools, not
  // graduate students (who would not fit a four-year class; see
  // docs/design/graduate-programs.md). No base share: a school with nothing
  // to continue into draws none, so the share is computed (gradBoundShare).
  { id: 'gradBound', label: 'Grad-school bound', baseShare: 0, driverLabel: 'graduate & professional school courses' },
];

// Career-track undergraduate majors (Business, Engineering, Health Science,
// Computer Science); graduate Medicine/Law count separately.
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

// Signals every cohort but priceSensitive reads, derived per read. Price
// is passed in instead because the admissions interrupt previews it live,
// before it is written to state.
export interface CohortSignals {
  distinguishedDepth: number;   // program-distinguished + 2x grad-program-complete
  professionalPrograms: number; // established PRE_PROFESSIONAL_PREFIXES majors, 0..24
  researchRate: number;         // weeklyResearchPoints(s)
  researchOutput: number;       // publications at a tenth, breakthroughs, prizes at three
  labCount: number;             // 'facilityType' === 'lab' Buildables done
  socialOrgCount: number;       // clubs + chapters
  artsPrograms: number;         // established ARTS_PREFIXES majors, 0..6
  artsFacilities: number;       // ARTS_FACILITY_IDS done, 0..2
  activeTeams: number;          // varsity teams with status 'active'
  athleticsQuality: number;     // avg teamQuality() across active teams, 0 if none
  revenueShare: number;         // share of the department's cost to compete carried by revenue sports, 0..1
  athleticResults: number;      // titles and deep postseason runs, on a decaying window
  athleticResultsLabel: string; // the cause, named for the summer modal: "the 2031 title in Men's Basketball"; '' when there is nothing recent
  gradCourseDepth: number;      // 'done' graduate/professional course Buildables, 0..37
  beauty: number;               // campus beauty, 0..100, neutral at 50 (systems/estate/beauty.ts)
  // What the identity tags do to the pool (systems/identity/tags.ts): its
  // size as a factor, and points on the incoming class. Absent reads 1 and 0.
  tagPool?: number;
  tagQuality?: number;
}

// Athletic results reach the pool as research output does: a title is worth
// TITLE_RESULT_WEIGHT the next summer and decays by RESULT_DECAY a year;
// last season's deep runs count a little. Sized so a title is visible but
// not a strategy: the cap barely moves, only what it takes to reach it.
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
    // Weighted by the sport's scale: football outweighs swimming.
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
    beauty: campusBeauty(s),
    tagPool: tagPoolFactor(s),
    tagQuality: tagQualityShift(s),
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
    // Counted off developed courses, not program-complete milestones, so
    // the pull ramps as the player builds instead of stepping.
    gradCourseDepth: doneIds(s, graduatePrograms().flatMap(graduateCourseIds)),
  };
}

// A founding school's signals: with tuition at priceTolerance,
// cohortDemandFactor reads exactly 1.0.
export const NEUTRAL_COHORT_SIGNALS: CohortSignals = {
  distinguishedDepth: 0, professionalPrograms: 0, researchRate: 0, researchOutput: 0, labCount: 0,
  socialOrgCount: 0, artsPrograms: 0, artsFacilities: 0, activeTeams: 0, athleticsQuality: 0,
  revenueShare: 0, athleticResults: 0, athleticResultsLabel: '',
  gradCourseDepth: 0,
  beauty: 50,
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

// The cost of a big programme: the admitted class's band mix shifts
// slightly with the athlete share of the pool, weighted by revenue share.
// Returned as the shift admissionsSystem.ts's qualityMix moves from the top
// band to the low one: at most ATHLETE_BAND_DRAG, when athletes have doubled
// their base share and every program is a revenue sport.
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

// 1.0 at zero signal, rising with diminishing returns toward 1 + strength.
// Tuned so committing to one strategy is felt without dwarfing the others.
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
// At 0.3, six teams at quality 70 read 1.50, a title on top 1.55 and a
// dynasty 1.63: reaching the cap takes results, not just fielding teams.
const ATHLETICS_DECAY = 0.3;

// Capacity (teams times quality) plus results, shared by the pull and the
// summer modal's note.
function athleticsSignal(signals: CohortSignals, withResults: boolean): number {
  return signals.activeTeams * (signals.athleticsQuality / 100) + (withResults ? signals.athleticResults : 0);
}

// Centered on priceTolerance (passed in to avoid a circular import): up to
// +STRENGTH at a price of 0, down to -STRENGTH at double tolerance. This is
// the deal-conscious share, separate from the funnel's overall price discount.
const PRICE_SENSITIVE_STRENGTH = 0.35;

function priceSensitivePull(tolerance: number, tuition: number): number {
  const ratio = tolerance > 0 ? Math.max(tuition, 0) / tolerance : 0;
  return 1 + PRICE_SENSITIVE_STRENGTH * Math.max(-1, Math.min(1, 1 - ratio));
}

// Each cohort's formula, shared by cohortDemandFactor and cohortBreakdown
// so they cannot drift. `tolerance` is priceTolerance(prestige).
function pullFor(id: CohortId, signals: CohortSignals, tolerance: number, tuition: number): number {
  switch (id) {
    case 'highAchievers': return boundedPull(HIGH_ACHIEVER_STRENGTH, HIGH_ACHIEVER_DECAY, signals.distinguishedDepth);
    case 'preProfessional': return boundedPull(PRE_PROFESSIONAL_STRENGTH, PRE_PROFESSIONAL_DECAY, signals.professionalPrograms);
    // Capacity and output: a breakthrough is worth a lab here.
    case 'researchOriented': return boundedPull(RESEARCH_STRENGTH, RESEARCH_DECAY, signals.researchRate / 10 + signals.labCount + signals.researchOutput);
    case 'social': return boundedPull(SOCIAL_STRENGTH, SOCIAL_DECAY, signals.socialOrgCount);
    case 'artsFocused': return boundedPull(ARTS_STRENGTH, ARTS_DECAY, signals.artsPrograms * 1.5 + signals.artsFacilities * 2);
    case 'priceSensitive': return priceSensitivePull(tolerance, tuition);
    case 'athletes': return boundedPull(ATHLETICS_STRENGTH, ATHLETICS_DECAY, athleticsSignal(signals, true));
    // Must stay flat: this cohort responds through its share
    // (gradBoundShare), and reading gradCourseDepth here too would count it
    // twice.
    case 'gradBound': return 1;
  }
}

// The grad-bound weight is added to the seven rather than carved out of
// them: a graduate school brings applicants who would not otherwise apply.
// Carving it out would make building one shrink the pool, since its pull is
// 1.0 while the others' are above it.
const GRAD_BOUND_SHARE_MAX = 0.18;
const GRAD_BOUND_SHARE_DECAY = 0.05;

// A share that grows from exactly zero, unlike a pull. Calibrated on the 37
// graduate courses: the business school (5) is about 4% of the pool,
// Medicine (12) about 8%, Medicine and Law (20) about 11%, all about 15%.
export function gradBoundShare(signals: CohortSignals): number {
  return GRAD_BOUND_SHARE_MAX * (1 - Math.exp(-GRAD_BOUND_SHARE_DECAY * Math.max(signals.gradCourseDepth, 0)));
}

// Each cohort's weight (share times pull), for both the total and the
// breakdown. They sum to 1 at a founding school and rise from there.
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

// Per-cohort detail for the admissions UI, as head counts. The counts
// decompose the realized pool exactly: band and cohort are independent
// (sticker shock scales bands, never cohorts), so the split is the same
// before and after attrition.
export interface CohortDetail {
  id: CohortId;
  label: string;
  driverLabel: string;
  pull: number;       // this cohort's own multiplier, 1.0 = neutral
  applicants: number; // whole applicants from this cohort; the eight sum to `applicants`
  // The named cause, e.g. "the 2031 title in Men's Basketball is worth
  // 4,100 of these". Athletes only.
  note?: string;
}

// Largest-remainder apportionment, so the whole-person counts sum exactly
// to the total shown beside them.
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

// `applicants` is projectAdmissions's rounded figure, so the breakdown
// matches the headline.
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

// How many athletes the recent results are worth: the part of the pull
// capacity alone would not produce, in people.
function athleticsNote(signals: CohortSignals, pull: number, applicants: number): string | undefined {
  if (signals.athleticResults <= 0 || !signals.athleticResultsLabel || pull <= 1) return undefined;
  const without = boundedPull(ATHLETICS_STRENGTH, ATHLETICS_DECAY, athleticsSignal(signals, false));
  const fromResults = Math.round(applicants * (pull - without) / pull);
  if (fromResults <= 0) return undefined;
  const label = signals.athleticResultsLabel;
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${label.includes(' and ') ? 'are' : 'is'} worth ${fromResults.toLocaleString()} of these.`;
}

// cohortBreakdown's counts keyed by id, the shape cohortsByClass stores.
// `total` is an applicant pool or an enrolled class; both split exactly
// (see CohortDetail above).
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

// Base shares alone, for classes admitted with no signals to respond to:
// the founding classes (foundingData.ts's FOUNDING_CLASSES) and standing
// classes in saves written before cohortsByClass existed. A neutral prior,
// not a record, and the Students tab says so.
export function baseShareCohortCounts(total: number): CohortCounts {
  const counts = apportion(COHORTS.map((c) => c.baseShare), Math.max(0, Math.round(total)));
  const out = {} as CohortCounts;
  COHORTS.forEach((c, i) => { out[c.id] = counts[i]; });
  return out;
}
