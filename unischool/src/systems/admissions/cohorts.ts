import type { GameState } from '../../state/types';
import { weeklyResearchPoints } from '../../data/researchData';
import { teamQuality } from '../../data/studentLifeData';

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

export type CohortId =
  | 'highAchievers' | 'preProfessional' | 'researchOriented'
  | 'social' | 'artsFocused' | 'priceSensitive' | 'athletes';

// baseShare is each cohort's rough weight in a "typical" applicant pool
// (not a claim about the real world, just a relative sizing so no single
// niche cohort — arts-focused, athletes — can swing the total as hard as a
// broad one like pre-professional) — the seven MUST sum to 1, checked by
// invariants.test.ts, so growing one cohort's share always means shrinking
// another's rather than silently inflating the total.
export const COHORTS: Array<{ id: CohortId; label: string; baseShare: number; driverLabel: string }> = [
  { id: 'highAchievers', label: 'High achievers', baseShare: 0.20, driverLabel: 'distinguished & graduate programs' },
  { id: 'preProfessional', label: 'Pre-professional', baseShare: 0.22, driverLabel: 'established career-track majors' },
  { id: 'researchOriented', label: 'Research-oriented', baseShare: 0.10, driverLabel: 'research output & labs' },
  { id: 'social', label: 'Social', baseShare: 0.15, driverLabel: 'clubs & Greek chapters' },
  { id: 'artsFocused', label: 'Arts-focused', baseShare: 0.08, driverLabel: 'arts programs & venues' },
  { id: 'priceSensitive', label: 'Price-sensitive', baseShare: 0.15, driverLabel: 'your price vs. what your prestige supports' },
  { id: 'athletes', label: 'Athletes', baseShare: 0.10, driverLabel: 'active varsity teams & coaching' },
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
  labCount: number;             // 'facilityType' === 'lab' Buildables done
  socialOrgCount: number;       // clubs + chapters
  artsPrograms: number;         // established ARTS_PREFIXES majors, 0..6
  artsFacilities: number;       // ARTS_FACILITY_IDS done, 0..2
  activeTeams: number;          // varsity teams with status 'active'
  athleticsQuality: number;     // avg teamQuality() across active teams, 0 if none
}

export function deriveCohortSignals(s: GameState): CohortSignals {
  const activeTeams = s.orgs.teams.filter((t) => t.status === 'active');
  return {
    distinguishedDepth: milestoneCountWithPrefix(s, 'program-distinguished:') + 2 * milestoneCountWithPrefix(s, 'grad-program-complete:'),
    professionalPrograms: establishedPrefixCount(s, PRE_PROFESSIONAL_PREFIXES),
    researchRate: weeklyResearchPoints(s),
    labCount: s.tech.filter((t) => t.status === 'done' && t.facilityType === 'lab').length,
    socialOrgCount: s.orgs.clubs.length + s.orgs.chapters.length,
    artsPrograms: establishedPrefixCount(s, ARTS_PREFIXES),
    artsFacilities: doneIds(s, ARTS_FACILITY_IDS),
    activeTeams: activeTeams.length,
    athleticsQuality: activeTeams.length > 0
      ? activeTeams.reduce((sum, t) => sum + teamQuality(t, s), 0) / activeTeams.length
      : 0,
  };
}

// A school that has built or achieved nothing beyond founding reads every
// signal at 0 — this is the neutral baseline every pull() curve below is
// centered on, so cohortDemandFactor(NEUTRAL_SIGNALS, ...) at a net price
// exactly at priceTolerance is exactly 1.0 (no effect either way).
export const NEUTRAL_COHORT_SIGNALS: CohortSignals = {
  distinguishedDepth: 0, professionalPrograms: 0, researchRate: 0, labCount: 0,
  socialOrgCount: 0, artsPrograms: 0, artsFacilities: 0, activeTeams: 0, athleticsQuality: 0,
};

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
const ATHLETICS_DECAY = 0.5;

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
    case 'researchOriented': return boundedPull(RESEARCH_STRENGTH, RESEARCH_DECAY, signals.researchRate / 10 + signals.labCount);
    case 'social': return boundedPull(SOCIAL_STRENGTH, SOCIAL_DECAY, signals.socialOrgCount);
    case 'artsFocused': return boundedPull(ARTS_STRENGTH, ARTS_DECAY, signals.artsPrograms * 1.5 + signals.artsFacilities * 2);
    case 'priceSensitive': return priceSensitivePull(tolerance, tuition);
    case 'athletes': return boundedPull(ATHLETICS_STRENGTH, ATHLETICS_DECAY, signals.activeTeams * (signals.athleticsQuality / 100));
  }
}

// The single multiplier admissionsSystem.ts's applicantVolume applies on
// top of everything else — a share-weighted blend of all seven cohorts'
// pulls, so improving ANY one of them nudges the whole pool, in proportion
// to how big that cohort's own baseShare is. Exactly 1.0 when every
// cohort's pull is exactly 1.0 (a founding school pricing itself at
// priceTolerance — see NEUTRAL_COHORT_SIGNALS above).
export function cohortDemandFactor(signals: CohortSignals, tolerance: number, tuition: number): number {
  return COHORTS.reduce((sum, c) => sum + c.baseShare * pullFor(c.id, signals, tolerance, tuition), 0);
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
  applicants: number; // whole applicants from this cohort; the seven sum to `applicants`
}

// Whole people, and the seven of them add up. Apportioned by largest
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
  const counts = apportion(COHORTS.map((c, i) => c.baseShare * pulls[i]), Math.max(0, Math.round(applicants)));
  return COHORTS.map((c, i) => ({
    id: c.id,
    label: c.label,
    driverLabel: c.driverLabel,
    pull: pulls[i],
    applicants: counts[i],
  }));
}
