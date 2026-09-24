import type { CapitalProject } from '../state/types';

// CAPITAL PROJECTS (Plan 33, V2 #27, V1-24): big, slow builds, one of each
// to a campus, that lift a standing while they stand (in proportion to
// their condition), and that can be paid half from the endowment. v2's five
// open from their years; the graduate college waits on a graduate program;
// the late tier opens with the defend era, or at Year 40.
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
    id: 'PROJ-LAWN', name: 'The Great Lawn',
    description: 'Ten acres of level grass between the oldest buildings, with the paths taken up and the cars sent elsewhere: where commencement is held and every photograph is taken.',
    cost: 18_000_000, weeks: 108, upkeep: 12_000, beauty: 4,
    project: { fromYear: 10, boosts: { experience: 5 } },
  },
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
    id: 'PROJ-STADIUM', name: 'The Championship Stadium',
    description: 'A real stadium, in the round, with lights, a press box and seats for a town twice the size of this one. The old football ground becomes the practice field.',
    cost: 55_000_000, weeks: 144, upkeep: 60_000,
    project: { fromYear: 12, boosts: { athletics: 18 } },
  },
  {
    id: 'PROJ-MEDICAL', name: 'The Medical Center',
    description: 'A teaching hospital with the college\'s name over the door: wards, clinics, operating theaters and a residency program that trains the region\'s doctors.',
    cost: 70_000_000, weeks: 180, upkeep: 90_000,
    project: { fromYear: 15, boosts: { academics: 6, research: 8 } },
  },
  {
    id: 'PROJ-GRADUATE', name: 'The Graduate College',
    description: 'A quadrangle of its own for graduate students, with a hall to dine in and a tower to be seen from: the scholars given a college rather than a set of rooms.',
    cost: 25_000_000, weeks: 104, upkeep: 30_000, beds: 600,
    project: { fromYear: 20, graduate: true, boosts: { academics: 4 } },
  },
  {
    id: 'PROJ-INSTITUTE', name: 'The Institute for Advanced Study',
    description: 'A quiet house in the woods for scholars with no teaching to do and nothing to finish by Friday. It will produce very little for years, and then something nobody expected.',
    cost: 90_000_000, weeks: 156, upkeep: 80_000, beauty: 1,
    project: { fromYear: LATE_TIER_YEAR, late: true, boosts: { research: 10, academics: 6 } },
  },
  {
    id: 'PROJ-MUSEUM', name: 'The University Museum',
    description: 'Fifty years of gifts, loans and bequests finally in one place and on show: a museum that schoolchildren are taken to and graduates bring their own children back to.',
    cost: 60_000_000, weeks: 144, upkeep: 55_000, beauty: 3,
    project: { fromYear: LATE_TIER_YEAR, late: true, boosts: { experience: 6, academics: 3 } },
  },
  {
    id: 'PROJ-COMMONS', name: 'The Great Commons',
    description: 'A hall big enough for the whole college to eat in at once, which it never will, and a place for everything that happens after dinner.',
    cost: 50_000_000, weeks: 120, upkeep: 50_000, beauty: 1,
    project: { fromYear: LATE_TIER_YEAR, late: true, boosts: { experience: 8 } },
  },
];

export const PROJECT_IDS: readonly string[] = PROJECTS.map((p) => p.id);
