import type { AlumniClass, GameState, YearSnapshot } from '../../state/types';
import {
  MEMORY_BEAUTIFUL, MEMORY_BUILDINGS, MEMORY_CLAUSES, MEMORY_CLAUSE_LIMIT, MEMORY_DEFICIT_YEARS, MEMORY_HAPPY,
  MEMORY_LINE, MEMORY_POORLY_TAUGHT, MEMORY_THINNED_SHARE, MEMORY_UNHAPPY, MEMORY_WELL_TAUGHT,
  WARMTH_BASE, WARMTH_FROM_SATISFACTION, WARMTH_FROM_TEACHING, WARMTH_ORDINARY, clauseById, type MemoryCondition,
} from '../../data/alumniData';
import { campusBeauty } from '../estate/beauty';
import { campusAverageCourseQuality } from '../faculty/facultyAssignment';
import { RUNG_AUSTERITY, RUNG_FREEZE, RUNG_RECEIVERSHIP } from '../finance/distress';

// THE ALUMNI LEDGER (Plan 30, from v2's alumni.ts): the game's long memory.
// A class is stamped at commencement with the clauses its four years
// earned, read off the facts this game keeps (the history rows, the
// buildings' builtYear, the distress ladder's worst rung each year, beauty)
// and never invented. Its warmth is set then and never rewritten, except a
// little by a reunion: a freeze in year 12 is still costing money in year 40.

// What the four years held.
export interface ClassYears {
  years: YearSnapshot[];      // the rows of their years, oldest first (up to four)
  satisfaction: number;       // the years' mean satisfaction
  teaching: number;           // mean course quality at commencement, 0–100
  thinned: number;            // the share of a class lost across the years, from each year's attrition rate
  buildings: number;          // buildings finished in the years
  worstRung: number;          // the ladder's worst rung in the years
  deficitYears: number;
  schoolsFounded: number;
  programsEstablished: number;
}

// The four years of the class graduating at the close of `year`.
export function classYears(s: GameState, year: number): ClassYears {
  const years = s.history.filter((h) => h.year > year - 4 && h.year <= year);
  const mean = (xs: number[]) => (xs.length === 0 ? s.students.satisfaction : xs.reduce((a, b) => a + b, 0) / xs.length);
  const first = s.history.find((h) => h.year === year - 4);
  const last = years[years.length - 1];
  return {
    years,
    satisfaction: mean(years.map((h) => h.satisfactionAverage)),
    teaching: campusAverageCourseQuality(s) ?? 0,
    thinned: 1 - years.reduce((kept, h) => kept * (1 - (h.enrolled > 0 ? Math.min(1, h.attrition / (h.enrolled + h.attrition)) : 0)), 1),
    buildings: s.tech.filter((t) => t.kind !== 'course' && t.status === 'done' && t.builtYear !== undefined && t.builtYear > year - 4 && t.builtYear <= year).length,
    worstRung: Math.max(0, ...years.map((h) => h.worstRung ?? 0)),
    deficitYears: years.filter((h) => h.net < 0).length,
    schoolsFounded: last && first ? (last.schoolsFounded ?? 0) - (first.schoolsFounded ?? 0) : 0,
    programsEstablished: last && first ? last.programsEstablished - first.programsEstablished : 0,
  };
}

function conditionMet(when: MemoryCondition, c: ClassYears, s: GameState): boolean {
  switch (when) {
    case 'always': return true;
    case 'thinned': return c.thinned >= MEMORY_THINNED_SHARE;
    case 'poorlyTaught': return c.teaching < MEMORY_POORLY_TAUGHT;
    case 'wellTaught': return c.teaching >= MEMORY_WELL_TAUGHT;
    case 'happy': return c.satisfaction >= MEMORY_HAPPY;
    case 'unhappy': return c.satisfaction < MEMORY_UNHAPPY;
    case 'building': return c.buildings >= MEMORY_BUILDINGS;
    case 'newSchool': return c.schoolsFounded > 0;
    case 'firstOfProgram': return c.programsEstablished > 0;
    case 'freeze': return c.worstRung === RUNG_FREEZE;
    case 'austerity': return c.worstRung === RUNG_AUSTERITY;
    case 'receivership': return c.worstRung >= RUNG_RECEIVERSHIP;
    case 'deficits': return c.deficitYears >= MEMORY_DEFICIT_YEARS;
    case 'beautiful': return campusBeauty(s) >= MEMORY_BEAUTIFUL;
  }
}

// Every clause the class earned, loudest first; the quiet one only if
// nothing else.
export function memoryFor(s: GameState, c: ClassYears): string[] {
  const earned = MEMORY_CLAUSES.filter((m) => m.when !== 'always' && conditionMet(m.when, c, s));
  if (earned.length === 0) return [MEMORY_CLAUSES.find((m) => m.when === 'always')!.id];
  return earned.slice().sort((a, b) => Math.abs(b.warmth) - Math.abs(a.warmth)).map((m) => m.id);
}

export function warmthFor(c: ClassYears, memory: readonly string[]): number {
  const base = WARMTH_BASE + (c.satisfaction - WARMTH_ORDINARY) * WARMTH_FROM_SATISFACTION + (c.teaching - WARMTH_ORDINARY) * WARMTH_FROM_TEACHING;
  const clauses = memory.reduce((t, id) => t + (clauseById(id)?.warmth ?? 0), 0);
  return Number(Math.min(100, Math.max(0, base + clauses)).toFixed(1));
}

// Stamps the class graduating at this summer (resolveAdmissions.ts, after
// the year's history row is written). A class of nobody is not a class.
export function stampGraduatingClass(s: GameState, graduating: number, year: number): void {
  if (graduating <= 0) return;
  const c = classYears(s, year);
  const memory = memoryFor(s, c);
  const first = c.years[0];
  (s.alumni ??= []).push({
    classYear: year,
    size: graduating,
    satisfaction: Number(c.satisfaction.toFixed(1)),
    quality: Number((first?.incomingQuality ?? s.students.incomingQuality).toFixed(1)),
    memory,
    warmth: warmthFor(c, memory),
    nudged: 0,
  });
}

// The line itself: "The class of 12: happy in it, properly taught and
// there for the building years."
export function memoryLine(alumni: Pick<AlumniClass, 'classYear' | 'memory'>): string {
  const texts = alumni.memory.slice(0, MEMORY_CLAUSE_LIMIT).map((id) => clauseById(id)?.text ?? id);
  const clauses = texts.length <= 1 ? (texts[0] ?? '') : `${texts.slice(0, -1).join(', ')} and ${texts[texts.length - 1]}`;
  return MEMORY_LINE.replace('{year}', String(alumni.classYear)).replace('{clauses}', clauses);
}
