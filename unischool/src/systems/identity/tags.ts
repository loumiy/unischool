import type { CohortCounts, CohortId, GameState } from '../../state/types';
import { totalEnrolled } from '../../state/types';
import { TAGS, TAG_EARN_AT, TAG_LIMIT, TAG_SHED_AT, TAG_YEARS, tagById } from '../../data/tagData';
import { tagTeeth } from './teeth';
import { programById } from '../../data/techData';
import { campusAverageCourseQuality } from '../faculty/facultyAssignment';
import { beautyTerms } from '../estate/beauty';
import { priceTolerance } from '../admissions/admissionsSystem';

// PERCEIVED IDENTITY (Plan 31, from v2's tags.ts): what the guidebooks say.
// Each tag has an indicator from 0 to 1, read at the turn of the year; two
// years over the earning line earns it and two under the shedding line
// sheds it, so an identity is a reputation, not this year's numbers. The
// cohorts that dominate the student body lean on the indicators they speak
// for (V1-14), and so do the clubs and chapters (V1-17, V1-18).

export interface Perception {
  tags: string[];
  earning: Record<string, number>;
  shedding: Record<string, number>;
}

export function perceptionOf(s: GameState): Perception {
  return s.identity ?? { tags: [], earning: {}, shedding: {} };
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// Each cohort's share of the student body, summed across the classes.
function cohortShares(s: GameState): Record<CohortId, number> {
  const total: Partial<CohortCounts> = {};
  let all = 0;
  for (const counts of Object.values(s.students.cohortsByClass)) {
    for (const [id, n] of Object.entries(counts) as [CohortId, number][]) {
      total[id] = (total[id] ?? 0) + n;
      all += n;
    }
  }
  const out = {} as Record<CohortId, number>;
  for (const [id, n] of Object.entries(total) as [CohortId, number][]) out[id] = all > 0 ? n / all : 0;
  return out;
}

// A cohort's pull on the tag it speaks for: a quarter of the indicator, full
// once it is a fifth of the body.
function withCohort(base: number, share: number | undefined): number {
  return clamp01(0.75 * base + 0.25 * clamp01((share ?? 0) / 0.2));
}

export function tagIndicators(s: GameState): Record<string, number> {
  const students = totalEnrolled(s.students);
  if (s.clock.year < 3 || students <= 0) return Object.fromEntries(TAGS.map((t) => [t.id, 0]));
  const shares = cohortShares(s);
  const quality = s.students.incomingQuality;
  const satisfaction = s.students.satisfaction;
  const teaching = campusAverageCourseQuality(s) ?? 0;
  const research = s.self.researchStanding;
  const academics = s.self.reputation;
  const housed = Object.values(s.halls).flat().map((slot) => slot.programId).filter((id): id is string => id !== null);
  const arts = housed.filter((id) => programById(id)?.school === 'Arts & Media').length;
  const artsClubs = s.orgs.clubs.filter((c) => /art|music|theat|film|dance|choir|design|writ|poet|photo|comic|anime/i.test(c.name)).length;
  const tolerance = priceTolerance(s.self.reputation);
  const priceRatio = tolerance > 0 ? s.finance.listedTuition / tolerance : 1;
  const perStudent = s.finance.endowment / students;
  const venues = s.tech.filter((t) => t.status === 'done' && (t.facilityType?.startsWith('athletics') || t.facilityType === 'footballStadium' || t.facilityType === 'fieldHouse')).length;
  const beauty = beautyTerms(s).score;
  const out: Record<string, number> = {
    'research-powerhouse': withCohort(clamp01((research - 45) / 25) * (research >= academics * 0.8 ? 1 : 0.5), shares.researchOriented),
    'teaching-college': clamp01((teaching - 55) / 20) * (research < academics * 0.8 ? 1 : 0.4),
    'party-school': withCohort(clamp01((satisfaction - 62) / 15) * clamp01((60 - quality) / 15) * (0.5 + 0.5 * clamp01(s.orgs.chapters.length / 6)), shares.social),
    'jock-school': withCohort(clamp01((s.orgs.teams.length / 6) * 0.6 + (venues / 4) * 0.2), shares.athletes),
    artsy: withCohort(clamp01(((housed.length ? arts / housed.length : 0) - 0.25) / 0.15) * clamp01((housed.length - 6) / 4) * (0.6 + 0.4 * clamp01(artsClubs / 4)), shares.artsFocused),
    // Most students commute by design (satisfactionSystem.ts's housing
    // target houses about a third): a commuter college is one with far
    // fewer beds than that.
    commuter: clamp01((0.35 * students - s.students.capacity) / (0.35 * students) / 0.5),
    'country-club': clamp01((priceRatio - 1.05) / 0.25) * clamp01((beauty - 55) / 20),
    'pressure-cooker': withCohort(clamp01((0.25 - s.students.admitRate) / 0.15) * clamp01((62 - satisfaction) / 12), shares.highAchievers),
    'the-bargain': withCohort(clamp01((0.85 - priceRatio) / 0.25) * (quality >= 45 ? 1 : 0.4), shares.priceSensitive),
    'old-money': clamp01((perStudent - 30_000) / 50_000) * clamp01(s.clock.year / 25),
  };
  for (const id of Object.keys(out)) out[id] = Number(out[id].toFixed(3));
  return out;
}

// The turn of the year (resolveAdmissions.ts, after the history row).
export function turnPerception(s: GameState): void {
  const ind = tagIndicators(s);
  const p = perceptionOf(s);
  let tags = [...p.tags];
  const earning: Record<string, number> = {};
  const shedding: Record<string, number> = {};
  const earned: string[] = [];
  const shed: string[] = [];
  for (const { id } of TAGS) {
    if (tags.includes(id)) {
      const n = ind[id] < TAG_SHED_AT ? (p.shedding[id] ?? 0) + 1 : 0;
      if (n >= TAG_YEARS) shed.push(id);
      else if (n > 0) shedding[id] = n;
    } else {
      const n = ind[id] >= TAG_EARN_AT ? (p.earning[id] ?? 0) + 1 : 0;
      if (n >= TAG_YEARS) earned.push(id);
      else if (n > 0) earning[id] = n;
    }
  }
  tags = tags.filter((t) => !shed.includes(t));
  const room = Math.max(0, TAG_LIMIT - tags.length);
  const taken = [...earned].sort((a, b) => ind[b] - ind[a]).slice(0, room);
  for (const id of earned) if (!taken.includes(id)) earning[id] = TAG_YEARS - 1;
  tags = [...tags, ...taken];
  s.identity = { tags, earning, shedding };
  for (const id of shed) s.log.unshift({ year: s.clock.year, week: s.clock.week, kind: 'info', message: `The guidebooks no longer call the college ${tagById(id)!.name}.` });
  for (const id of taken) s.log.unshift({ year: s.clock.year, week: s.clock.week, kind: 'good', message: `The guidebooks have started calling the college ${tagById(id)!.name}: “${tagById(id)!.blurb}”` });
}

export function hasTag(s: GameState, id: string): boolean {
  return perceptionOf(s).tags.includes(id);
}

export { tagTeeth };

// The pool's size as a factor, and the incoming class's quality shift.
export function tagPoolFactor(s: GameState): number {
  return 1 + perceptionOf(s).tags.reduce((t, id) => t + (tagById(id)?.size ?? 0), 0) + tagTeeth(s, 'pool');
}

export function tagQualityShift(s: GameState): number {
  return perceptionOf(s).tags.reduce((t, id) => t + (tagById(id)?.quality ?? 0), 0);
}
