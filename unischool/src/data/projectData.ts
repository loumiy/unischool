import type { CapitalProject } from '../state/types';

// CAPITAL PROJECTS (Plan 33, V2 #27, V1-24): big, slow builds, one of each
// to a campus, that lift a standing while they stand (in proportion to
// their condition), and that can be paid half from the endowment. Each opens
// from its year; the graduate college waits on a graduate program; the late
// tier opens with the defend era, or at Year 40.
//
// Plan 50 kept the ones that are something the campus does not otherwise
// have: the Great Lawn (a quad), the Championship Stadium (the football
// stadium), the Institute for Advanced Study and the Great Commons (a
// dining hall that fed no one) are gone, and the Medical Center is the
// health chain's teaching hospital (MEDICAL_CENTER_PROJECT below).
//
// The lifts are v2's, in points on this game's 0–150 standings: academics
// (prestige), research, experience (campus life) and athletics (program
// strength, 0–100). Phase N tunes them.

export interface ProjectDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  weeks: number;
  upkeep: number;          // a week
  beds?: number;           // the graduate college houses its students
  beauty?: number;
  project: CapitalProject;
}

// The defend era's own gates (rivalsSystem.ts's elite band): the late tier
// opens at Year 35 for a college with prestige 100, or at Year 40 for any.
export const LATE_TIER_YEAR = 40;
export const DEFEND_ERA_YEAR = 35;
export const DEFEND_ERA_PRESTIGE = 100;

// A project is paid half from the endowment while half the endowment covers
// that half (v2's ENDOWMENT_PROJECT_SHARE).
export const ENDOWMENT_PROJECT_SHARE = 0.5;

export const PROJECTS: readonly ProjectDef[] = [
  {
    id: 'PROJ-ARTS', name: 'The Arts Center',
    description: 'A concert hall, two theaters and the studios behind them, under one roof and open late: the building the town comes to the college for.',
    cost: 35_000_000, weeks: 144, upkeep: 40_000, beauty: 2,
    project: { fromYear: 10, boosts: { experience: 6 } },
  },
  {
    id: 'PROJ-RESEARCH-PARK', name: 'The Research Park',
    description: 'Laboratories for rent at the edge of campus, to companies who want to be near the faculty, and faculty who want to be near the money.',
    cost: 45_000_000, weeks: 144, upkeep: 45_000,
    project: { fromYear: 12, boosts: { research: 18 } },
  },
  {
    id: 'PROJ-GRADUATE', name: 'The Graduate College',
    description: 'A quadrangle of its own for graduate students, with a hall to dine in and a tower to be seen from: the scholars given a college rather than a set of rooms.',
    // No beds: the game houses no graduate students (techData.ts's graduate
    // boundary), so its rooms add nothing the undergraduate count reads.
    cost: 25_000_000, weeks: 104, upkeep: 30_000,
    project: { fromYear: 20, graduate: true, boosts: { academics: 4 } },
  },
  {
    id: 'PROJ-MUSEUM', name: 'The University Museum',
    description: 'Fifty years of gifts, loans and bequests finally in one place and on show: a museum that schoolchildren are taken to and graduates bring their own children back to.',
    cost: 60_000_000, weeks: 144, upkeep: 55_000, beauty: 3,
    project: { fromYear: LATE_TIER_YEAR, late: true, boosts: { experience: 6, academics: 3 } },
  },
];

export const PROJECT_IDS: readonly string[] = PROJECTS.map((p) => p.id);

// The Medical Center (Plan 50): the health chain's third rung
// (facilitiesData.ts's HEALTH_CENTER_TIER3_ID), a capital project in all but
// its place in the build menu: it lifts academics and research while it
// stands, opens from Year 15, and can be paid half from the endowment.
export const MEDICAL_CENTER_PROJECT: CapitalProject = { fromYear: 15, boosts: { academics: 6, research: 8 } };

// Every project's terms, the Medical Center's among them: what the most an
// axis can be lifted is read from.
export const ALL_PROJECT_TERMS: readonly CapitalProject[] = [...PROJECTS.map((p) => p.project), MEDICAL_CENTER_PROJECT];
