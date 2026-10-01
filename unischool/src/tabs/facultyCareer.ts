import type { Faculty, GameState, YearMark } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { programById, programOfCourse } from '../data/techData';
import { researchTopic } from '../data/researchTopics';
import { initiativeDepth } from '../data/researchData';
import { FOUNDING_MARKET } from '../data/foundingData';
import { CAREER_WORDS, LONG_SERVICE_YEARS } from '../data/careerWords';
import { termName } from '../format';
import { gradeFor } from '../data/courseQuality';

// ---------------------------------------------------------------------
// A professor's page, read off their career record (Plan 84C's Career) for
// the expanded tile (Plan 84E, FacultyPerson.tsx). Pure, for the test:
// when they arrived, the courses they taught as a timeline, their
// research, what they are recognized for, and the marks for the chart.
// ---------------------------------------------------------------------

// The clock as one number (eventData.ts's absoluteWeek), and back.
export function weekNow(s: GameState): number {
  return (s.clock.year - 1) * WEEKS_PER_YEAR + s.clock.week;
}
export function yearOfWeek(week: number): number {
  return Math.floor((week - 1) / WEEKS_PER_YEAR) + 1;
}
function weekInYear(week: number): number {
  return ((week - 1) % WEEKS_PER_YEAR) + 1;
}

// Whole years at the college, from the arrival; 0 for a candidate.
export function yearsHere(s: GameState, f: Faculty): number {
  return f.career ? Math.max(0, Math.floor((weekNow(s) - f.career.arrivedWeek) / WEEKS_PER_YEAR)) : 0;
}

export function isFounder(f: Faculty): boolean {
  return FOUNDING_MARKET.some((p) => p.id === f.id);
}

// "Joined Blackmoor University in Year 3, fall term."; null for a candidate.
export function joinedLine(college: string, f: Faculty): string | null {
  if (!f.career) return null;
  const week = f.career.arrivedWeek;
  return CAREER_WORDS.joined(college, yearOfWeek(week), termName(weekInYear(week)));
}

// ---- Courses taught: a timeline ----
export interface TimelineRow {
  courseId: string;
  code: string;                // "CHEM 110", or the whole name when it has no code
  name: string;
  spans: Array<{ from: number; to: number }>;
  now: boolean;                // the last span reaches the week just taught
}

export interface Timeline {
  start: number;               // absolute week: the arrival
  end: number;                 // the week just played
  rows: TimelineRow[];         // by first week taught, then code
}

export function courseTimeline(s: GameState, f: Faculty): Timeline | null {
  if (!f.career) return null;
  const end = Math.max(f.career.arrivedWeek, weekNow(s) - 1);
  const byCourse = new Map<string, TimelineRow>();
  for (const span of f.career.courses) {
    let row = byCourse.get(span.courseId);
    if (!row) {
      const full = s.tech.find((t) => t.id === span.courseId)?.name ?? span.courseId;
      const [code, ...rest] = full.split(' · ');
      row = { courseId: span.courseId, code, name: rest.join(' · ') || code, spans: [], now: false };
      byCourse.set(span.courseId, row);
    }
    row.spans.push({ from: span.from, to: span.to });
  }
  const rows = [...byCourse.values()];
  for (const row of rows) row.now = row.spans[row.spans.length - 1].to >= end;
  rows.sort((a, b) => a.spans[0].from - b.spans[0].from || a.code.localeCompare(b.code));
  return { start: f.career.arrivedWeek, end, rows };
}

// ---- Research ----
export interface ResearchLine {
  topic: string;
  depth: string;
  year: number;
  years: number;
  outcome: string;             // papers and breakthroughs, or wound up early
  cancelled: boolean;
}

export function researchLines(f: Faculty): ResearchLine[] {
  if (!f.career) return [];
  return [...f.career.research].reverse().map((r) => ({
    topic: researchTopic(r.topicId)?.name ?? 'a project',
    depth: initiativeDepth(r.depth).name,
    year: r.year,
    years: r.years,
    outcome: r.cancelled ? CAREER_WORDS.woundUp : CAREER_WORDS.outcome(r.publications, r.breakthroughs),
    cancelled: r.cancelled === true,
  }));
}

// ---- Recognition (Plan 84 §2): prizes, a distinguished program, long service ----
export interface Recognition {
  kind: 'prize' | 'program' | 'service';
  text: string;
}

export function recognitions(s: GameState, f: Faculty): Recognition[] {
  if (!f.career) return [];
  const out: Recognition[] = [];
  for (const p of f.career.prizes) {
    out.push({ kind: 'prize', text: CAREER_WORDS.prize(p.name, p.year, researchTopic(p.topicId)?.name ?? 'a project') });
  }
  // A program is distinguished by its milestone (techSystem.ts); only
  // majors have one.
  const programs = new Set<string>();
  for (const span of f.career.courses) {
    const id = programOfCourse(span.courseId);
    if (id !== undefined) programs.add(id);
  }
  for (const id of [...programs].sort()) {
    const key = `program-distinguished:${id}`;
    if (!s.milestones[key]) continue;
    out.push({ kind: 'program', text: CAREER_WORDS.distinguished(programById(id)?.name ?? id, s.milestoneYears?.[key]) });
  }
  if (yearsHere(s, f) >= LONG_SERVICE_YEARS) {
    out.push({ kind: 'service', text: CAREER_WORDS.longService(LONG_SERVICE_YEARS, yearOfWeek(f.career.arrivedWeek) + LONG_SERVICE_YEARS) });
  }
  return out;
}

// ---- Training at the Faculty Training Institute (Plan 85E) ----
// Each training on the record, oldest first, in words.
export function trainingLines(f: Faculty): string[] {
  return (f.career?.training ?? []).map((x) => CAREER_WORDS.trained(x.year, x.from, x.to, gradeFor(x.from), gradeFor(x.to)));
}

// ---- The chart: a mark a year, and today ----
export function statSeries(s: GameState, f: Faculty): YearMark[] {
  if (!f.career) return [];
  const marks = [...f.career.years];
  const today: YearMark = [s.clock.year, Math.round(f.teaching), Math.round(f.research)];
  if (marks.length === 0 || marks[marks.length - 1][0] !== today[0]) marks.push(today);
  return marks;
}
