// One fifty-year run read against the balance target, shared by the probe
// (sim/endpoint.ts) and the claims (sim/endpointClaims.ts) so they agree on
// what "finishes the catalog" or "holds first place" means. Not part of
// the game: nothing in src/ imports this.

import type { play } from './balanceSim';
import type { Legacy, LegacyAxisKey, LegacyGrade } from './legacyReading';
import type { FinalReport } from '../src/state/finalReport';
import { SEMICENTENNIAL_YEAR, totalEnrolled } from '../src/state/types';
import { isAcademicHall, milestoneSchools } from '../src/data/techData';

export const ENDPOINT_STRATEGIES = ['Earnest completionist', 'Balanced builder', 'Selective college', 'Regional engine'] as const;

export interface EndpointReading {
  legacy: Legacy | null;
  report: FinalReport | null; // the Final Report the game wrote (Plan 33)
  grades: Partial<Record<LegacyAxisKey, LegacyGrade>>;
  catalogueShare: number;      // courses done / courses
  buildingsShare: number;      // placeable Buildables done / placeable Buildables (halls, dorms, facilities)
  hallsShare: number;          // academic halls built / academic halls
  schoolsFounded: number;
  schoolsTotal: number;
  firstAtOne: number | null;   // the first year the school closed at #1, or null
  yearsAtOneLateDecade: number; // years 40..50 closed at #1
  prestige: number;
  rank: number;
  cash: number;
  enrolled: number;
  admitRate: number;
  incomingQuality: number;
  weeksInTheRed: number;
}

export function endpointReading(run: ReturnType<typeof play>): EndpointReading {
  const s = run.state;
  const rows = run.rows;
  const courses = s.tech.filter((t) => t.kind === 'course');
  // The grand landmarks, the amenities and the capital projects are left
  // out: a college builds one landmark of three, by choice, and no strategy
  // builds an amenity or a project (Plans 25, 26 and 33).
  const placeable = s.tech.filter((t) => t.kind !== 'course' && t.facilityType !== 'landmark' && t.facilityType !== 'amenity' && t.facilityType !== 'project');
  const halls = s.tech.filter(isAcademicHall);
  const schools = milestoneSchools().filter((school) => school.majors.length > 0);
  const legacy = run.tally.legacy;
  const grades: Partial<Record<LegacyAxisKey, LegacyGrade>> = {};
  for (const axis of legacy?.axes ?? []) grades[axis.key] = axis.grade;
  const last = rows[rows.length - 1];
  const atOne = rows.filter((r) => r.rank === 1);
  return {
    legacy,
    report: run.tally.report,
    grades,
    catalogueShare: courses.filter((t) => t.status === 'done').length / Math.max(1, courses.length),
    buildingsShare: placeable.filter((t) => t.status === 'done').length / Math.max(1, placeable.length),
    hallsShare: halls.filter((t) => t.status === 'done').length / Math.max(1, halls.length),
    schoolsFounded: schools.filter((school) => s.milestones[`school-founded:${school.schoolName}`]).length,
    schoolsTotal: schools.length,
    firstAtOne: atOne.length > 0 ? atOne[0].year : null,
    yearsAtOneLateDecade: atOne.filter((r) => r.year >= SEMICENTENNIAL_YEAR - 10 && r.year <= SEMICENTENNIAL_YEAR).length,
    prestige: last?.prestige ?? s.self.reputation,
    rank: last?.rank ?? 0,
    cash: s.finance.cash,
    enrolled: totalEnrolled(s.students),
    admitRate: s.students.admitRate,
    incomingQuality: s.students.incomingQuality,
    weeksInTheRed: last?.weeksInTheRed ?? 0,
  };
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function fmt(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}k`;
  return `${sign}${abs.toFixed(0)}`;
}

export function describeEndpoint(r: EndpointReading): string[] {
  const l = r.legacy;
  return [
    l
      ? `legacy: ${l.name} [${l.table}] — ${l.axes.map((a) => `${a.key} ${a.grade} (${a.score.toFixed(2)})`).join(', ')}`
      : 'legacy: not sealed',
    `catalog ${pct(r.catalogueShare)}, buildings ${pct(r.buildingsShare)}, halls ${pct(r.hallsShare)}, schools founded ${r.schoolsFounded}/${r.schoolsTotal}`,
    `first at #1: ${r.firstAtOne ?? 'never'}; years 40–50 at #1: ${r.yearsAtOneLateDecade}/11`,
    `at 50: prestige ${r.prestige.toFixed(1)} rank #${r.rank} cash ${fmt(r.cash)} enrolled ${r.enrolled.toLocaleString()} admit ${pct(r.admitRate)} quality ${r.incomingQuality.toFixed(0)} red weeks ${r.weeksInTheRed}`,
  ];
}
