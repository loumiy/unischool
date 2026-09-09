import type { GameState } from '../../state/types';
import { weeklyResearchPoints } from '../../data/researchData';
import { teamQuality } from '../../data/studentLifeData';

// ---------------------------------------------------------------------
// STUDENT COHORTS: a second, additive lens on the applicant pool
// admissionsSystem.ts's funnel already grows and shrinks — prestige,
// price, satisfaction, dorm capacity, sticker shock, quality bands.
// Deliberately NOT a full segmentation of that funnel: a cohort does not
// get its own quality band, yield curve, or sticker-shock rate. Instead
// every cohort's `pull` blends into ONE extra multiplier on the whole pool
// (see cohortDemandFactor below and admissionsSystem.ts's rawApplicants),
// the same architectural role wordOfMouthFactor and capacityFactor already
// play there. That keeps the funnel's well-tuned band/yield/sticker-shock
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
  { id: 'priceSensitive', label: 'Price-sensitive', baseShare: 0.15, driverLabel: 'net price vs. what your prestige supports' },
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
// never persisted. priceSensitive instead reads tuition/scholarshipRate
// (and a price-tolerance reading derived from prestige) directly (see
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
// 0.25, not 0.5: signal here is activeTeams * (athleticsQuality/100), which
// can run all the way up to ~14 (one team per SPORTS entry, all maxed) —
// a far bigger ceiling than any other cohort's signal gets per unit of
// player investment (see AthleticsTab.tsx, where this pull is now shown
// directly). At the old 0.5, a single team of merely decent quality
// (signal ~0.7-0.8) already reached roughly a third of the cohort's max
// pull, and three or four such teams fully saturated it — fielding a
// tenth or fourteenth team, despite costing just as much in staff and
// venues as the first, bought almost nothing more. 0.25 keeps the first
// team's payoff real but modest and lets the curve keep climbing
// meaningfully through a genuinely large athletics department, so
// committing to the FULL buildout the game's other systems make possible
// is still a strategy with a growing payoff, not a plateau you hit after
// three teams.
const ATHLETICS_DECAY = 0.25;

// Price-sensitive is the one cohort that responds to price rather than a
// built asset, and the one place this module needs a price-tolerance
// reading — passed in by the caller (see `tolerance` below) rather than
// imported from admissionsSystem.ts, which would make the two files import
// each other for one pure number. Centered on that tolerance — the same
// earned-price curve admissionsSystem.ts's own sticker shock and
// applicant-volume discount are measured against — so pricing AT or under
// what the school's own standing supports pulls this cohort in (up to
// +STRENGTH at net price 0), and pricing over it pushes them away (down to
// -STRENGTH at double tolerance or beyond, clamped). This compounds with
// the funnel's existing price-driven volume discount rather than
// duplicating it: that discount is about applicants overall; this is
// specifically about how big a SHARE of them are the deal-conscious ones,
// same real distinction as sticker shock already draws between quality
// bands.
const PRICE_SENSITIVE_STRENGTH = 0.35;

function priceSensitivePull(tolerance: number, tuition: number, scholarshipRate: number): number {
  const netPrice = Math.max(tuition, 0) * (1 - Math.max(0, Math.min(1, scholarshipRate)));
  const ratio = tolerance > 0 ? netPrice / tolerance : 0;
  return 1 + PRICE_SENSITIVE_STRENGTH * Math.max(-1, Math.min(1, 1 - ratio));
}

// The athletes cohort's own pull, broken out as its own export (unlike
// every other cohort) because AthleticsTab.tsx needs exactly this one
// number to surface the payoff of investing in teams/coaching right where
// that investment happens — without needing a price/tolerance reading it
// has no other reason to compute (every OTHER cohort's pull only matters
// blended into cohortDemandFactor, read from the admissions interrupt that
// already has those figures on hand).
export function athleticsCohortPull(signals: CohortSignals): number {
  return boundedPull(ATHLETICS_STRENGTH, ATHLETICS_DECAY, signals.activeTeams * (signals.athleticsQuality / 100));
}

// One cohort's pull, keyed by id — the single place every cohort's own
// formula lives, read by both cohortDemandFactor (the blended total) and
// cohortBreakdown (the per-cohort UI detail) so the two can never drift
// apart into different numbers for the same cohort. `tolerance` is
// priceTolerance(prestige) — see admissionsSystem.ts — computed once by
// the caller and threaded through rather than recomputed here.
function pullFor(id: CohortId, signals: CohortSignals, tolerance: number, tuition: number, scholarshipRate: number): number {
  switch (id) {
    case 'highAchievers': return boundedPull(HIGH_ACHIEVER_STRENGTH, HIGH_ACHIEVER_DECAY, signals.distinguishedDepth);
    case 'preProfessional': return boundedPull(PRE_PROFESSIONAL_STRENGTH, PRE_PROFESSIONAL_DECAY, signals.professionalPrograms);
    case 'researchOriented': return boundedPull(RESEARCH_STRENGTH, RESEARCH_DECAY, signals.researchRate / 10 + signals.labCount);
    case 'social': return boundedPull(SOCIAL_STRENGTH, SOCIAL_DECAY, signals.socialOrgCount);
    case 'artsFocused': return boundedPull(ARTS_STRENGTH, ARTS_DECAY, signals.artsPrograms * 1.5 + signals.artsFacilities * 2);
    case 'priceSensitive': return priceSensitivePull(tolerance, tuition, scholarshipRate);
    case 'athletes': return athleticsCohortPull(signals);
  }
}

// The single multiplier admissionsSystem.ts's applicantVolume applies on
// top of everything else — a share-weighted blend of all seven cohorts'
// pulls, so improving ANY one of them nudges the whole pool, in proportion
// to how big that cohort's own baseShare is. Exactly 1.0 when every
// cohort's pull is exactly 1.0 (a founding school pricing itself at
// priceTolerance — see NEUTRAL_COHORT_SIGNALS above).
export function cohortDemandFactor(signals: CohortSignals, tolerance: number, tuition: number, scholarshipRate: number): number {
  return COHORTS.reduce((sum, c) => sum + c.baseShare * pullFor(c.id, signals, tolerance, tuition, scholarshipRate), 0);
}

// Per-cohort detail for the admissions UI: not just the blended total, but
// which cohorts are up, which are down, and by how much — so a player can
// actually see which of their choices (or which building) is moving which
// audience, rather than reading one opaque multiplier.
export interface CohortDetail {
  id: CohortId;
  label: string;
  driverLabel: string;
  pull: number; // this cohort's own multiplier, 1.0 = neutral
}

export function cohortBreakdown(signals: CohortSignals, tolerance: number, tuition: number, scholarshipRate: number): CohortDetail[] {
  return COHORTS.map((c) => ({
    id: c.id,
    label: c.label,
    driverLabel: c.driverLabel,
    pull: pullFor(c.id, signals, tolerance, tuition, scholarshipRate),
  }));
}
