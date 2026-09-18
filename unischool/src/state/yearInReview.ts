import type { GameState, LogEntry, LogTopic } from './types';
import { LOG_CAP } from './types';
import { programById, programOfCourse } from '../data/techData';
import { advanceClasses, trailingYearSatisfaction } from '../systems/admissions/admissionsSystem';
import { attritionReasons, summerAttrition } from '../systems/admissions/consequences';
import { baseShareCohortCounts } from '../systems/admissions/cohorts';
import { gradeYear, prestigeBreakdown } from '../systems/prestige/prestigeSystem';
import { previousYear } from './history';

// ---------------------------------------------------------------------
// THE YEAR IN REVIEW (Plan 16's PR B): the summer's first beat. Generated,
// not authored — from the closing year's log lines, grouped by the topic
// each system tagged them with (see types.ts's LogTopic), and from the
// state as it stands at week 52 against the row filed last summer. Nothing
// here is a system and nothing is stored: it is a pure reading, the same
// shape as history.ts's snapshot, built once when the beat renders.
//
// Why the log and not a ledger. Every fact the review wants is already a
// line something wrote the week it happened — a course finishing, a
// petition raised, a paper out — and a second record of the same events,
// kept in state and reset each summer, would be one more thing to drift.
// The cost is the log's cap: a year busier than LOG_CAP lines has lost its
// earliest weeks by the summer, and the review says so rather than
// pretending the year was shorter (see `truncated`).
//
// Two figures are READ rather than counted, because they are about the
// summer that is about to happen rather than the year behind it: who will
// not return (the same attrition the last beat applies, off the same
// average), and the report card (the same grade the last beat steps
// prestige by). Both are the pure functions the reducer commits with, so
// the review cannot promise a summer the boundary does not deliver.
// ---------------------------------------------------------------------

export type ReviewSectionKey = 'built' | 'people' | 'research' | 'students' | 'money' | 'standing';

export interface ReviewLine {
  text: string;
  tone?: 'good' | 'bad';
}

export interface ReviewSection {
  key: ReviewSectionKey;
  title: string;
  lines: ReviewLine[];
  // What the section says when nothing in the year belongs to it — a
  // sentence, so an empty section still reads as a fact about the year.
  empty: string;
}

export interface YearInReview {
  year: number;
  sections: ReviewSection[];
  truncated: boolean; // the log's cap fell inside this year, so the earliest weeks are gone
}

// The closing year's lines, oldest first. The log is newest-first and
// capped, so this is the whole record of the year only while the year fits.
export function yearLog(s: GameState): LogEntry[] {
  return s.log.filter((e) => e.year === s.clock.year).reverse();
}

function byTopic(entries: LogEntry[], topic: LogTopic): LogEntry[] {
  return entries.filter((e) => e.topic === topic);
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}

function money(v: number): string {
  const abs = Math.abs(Math.round(v));
  return `${v < 0 ? '−' : ''}$${abs.toLocaleString()}`;
}

function signed(v: number, digits = 1): string {
  return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}`;
}

// Courses finished, grouped by the school their program belongs to. A
// course's school is looked up off its id (the line's subject), never off
// its name, so a renamed course still files under the right school.
function coursesBySchool(entries: LogEntry[]): ReviewLine[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const programId = e.subject ? programOfCourse(e.subject) : undefined;
    const school = programId ? programById(programId)?.school ?? 'other programs' : 'other programs';
    counts.set(school, (counts.get(school) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([school, n]) => ({ text: `${plural(n, 'course')} finished in ${school}` }));
}

function nameOf(s: GameState, id: string | undefined): string | null {
  if (!id) return null;
  return s.tech.find((t) => t.id === id)?.name ?? null;
}

function built(s: GameState, entries: LogEntry[]): ReviewSection {
  const lines: ReviewLine[] = [];
  const courses = byTopic(entries, 'course');
  if (courses.length > 0) {
    lines.push({ text: `${plural(courses.length, 'course')} finished`, tone: 'good' });
    if (courses.length > 1) lines.push(...coursesBySchool(courses));
  }
  for (const e of byTopic(entries, 'program')) lines.push({ text: e.message.replace(/\.$/, ''), tone: 'good' });
  for (const e of byTopic(entries, 'milestone')) lines.push({ text: e.message.replace(/\.$/, ''), tone: 'good' });
  const buildings = byTopic(entries, 'building').map((e) => nameOf(s, e.subject)).filter((n): n is string => n !== null);
  if (buildings.length > 0) lines.push({ text: `Completed: ${buildings.join(', ')}`, tone: 'good' });
  return { key: 'built', title: 'Built', lines, empty: 'Nothing finished this year.' };
}

function people(entries: LogEntry[]): ReviewSection {
  const lines: ReviewLine[] = [];
  const appointed = byTopic(entries, 'appointment');
  const departed = byTopic(entries, 'departure');
  for (const e of appointed) lines.push({ text: e.message.replace(/\.$/, ''), tone: 'good' });
  for (const e of departed) lines.push({ text: e.message.replace(/\.$/, ''), tone: 'bad' });
  for (const e of byTopic(entries, 'prize')) lines.push({ text: e.message.replace(/\.$/, ''), tone: 'good' });
  return { key: 'people', title: 'People', lines, empty: 'No appointments and no departures.' };
}

function research(entries: LogEntry[]): ReviewSection {
  const lines: ReviewLine[] = [];
  const started = byTopic(entries, 'research-started').length;
  const concluded = byTopic(entries, 'research-concluded').length + byTopic(entries, 'research-reported').length;
  if (started > 0 || concluded > 0) {
    lines.push({ text: `${plural(started, 'initiative')} begun, ${concluded} concluded` });
  }
  const papers = byTopic(entries, 'publication').length;
  const breakthroughs = byTopic(entries, 'breakthrough').length;
  const grants = byTopic(entries, 'grant').length;
  if (papers > 0 || breakthroughs > 0) {
    lines.push({
      text: `${plural(papers, 'publication')}, ${plural(breakthroughs, 'breakthrough')}`,
      tone: breakthroughs > 0 ? 'good' : undefined,
    });
  }
  if (grants > 0) lines.push({ text: `${plural(grants, 'grant')} awarded`, tone: 'good' });
  return { key: 'research', title: 'Research', lines, empty: 'No research under way.' };
}

// Who will not return at this summer — the same advance the last beat
// commits, run on the classes as they stand with nobody incoming, so the
// figure is exactly the one the boundary will log. Its own line, because
// a silently smaller school is the likeliest source of "what happened".
export function projectedAttrition(s: GameState): number {
  return advanceClasses(
    { classes: s.students.classes, tuitionByClass: s.finance.tuitionByClass, cohortsByClass: s.students.cohortsByClass },
    { count: 0, price: 0, cohorts: baseShareCohortCounts(0) },
    summerAttrition(s),
  ).notReturning;
}

function students(s: GameState, entries: LogEntry[]): ReviewSection {
  const lines: ReviewLine[] = [];
  const average = trailingYearSatisfaction(s);
  const lastAverage = s.students.priorYearAvgSatisfaction;
  const delta = average - lastAverage;
  lines.push({
    text: s.history.length > 0
      ? `Satisfaction averaged ${average.toFixed(0)} this year, against ${lastAverage.toFixed(0)} last year (${signed(delta, 0)})`
      : `Satisfaction averaged ${average.toFixed(0)} this year`,
    tone: delta >= 2 ? 'good' : delta <= -2 ? 'bad' : undefined,
  });
  const raised = byTopic(entries, 'demand-raised').length;
  const met = byTopic(entries, 'demand-met').length;
  const failed = byTopic(entries, 'demand-failed').length;
  if (raised > 0 || met > 0 || failed > 0) {
    lines.push({
      text: `${plural(raised, 'demand')} raised, ${met} met, ${failed} failed`,
      tone: failed > 0 ? 'bad' : met > 0 ? 'good' : undefined,
    });
  }
  const petitions = s.orgs.pendingPetitions.length;
  if (petitions > 0) lines.push({ text: `${plural(petitions, 'organisation')} petitioning for recognition — answered in the Students beat` });
  const leaving = projectedAttrition(s);
  if (leaving > 0) {
    const reasons = attritionReasons(s);
    lines.push({
      text: `${plural(leaving, 'student')} will not return this summer — ${reasons.length > 0 ? reasons.join(', ') : `a year averaging ${average.toFixed(0)}`}`,
      tone: 'bad',
    });
  }
  return { key: 'students', title: 'Students', lines, empty: 'Nothing to report.' };
}

function moneySection(s: GameState, entries: LogEntry[]): ReviewSection {
  const before = previousYear(s);
  const net = s.finance.cash - before.cash;
  const lines: ReviewLine[] = [
    { text: `Net over the year: ${net >= 0 ? '+' : '−'}$${Math.abs(Math.round(net)).toLocaleString()}`, tone: net >= 0 ? 'good' : 'bad' },
    { text: `Operating funds ${money(s.finance.cash)}, against ${money(before.cash)} a year ago` },
  ];
  const campaigns = byTopic(entries, 'money').length;
  if (campaigns > 0) lines.push({ text: `${plural(campaigns, 'endowment campaign')} closed; the endowment stands at ${money(s.finance.endowment)}` });
  return { key: 'money', title: 'Money', lines, empty: '' };
}

// The report card, read before it is applied (Plan 15's PR B): what the
// year graded, the step prestige is about to take, and each input's grade
// beside the weight it could have reached — so the arrow on prestige comes
// with its reasons.
function standing(s: GameState): ReviewSection {
  const card = gradeYear(s);
  const breakdown = prestigeBreakdown(s);
  const step = card.after - card.before;
  const lines: ReviewLine[] = [
    {
      text: `The year graded ${card.score.toFixed(0)}: prestige ${card.before.toFixed(1)} → ${card.after.toFixed(1)} (${signed(step)})`,
      tone: step >= 0 ? 'good' : 'bad',
    },
  ];
  const last = s.history.length > 0 ? s.history[s.history.length - 1] : null;
  if (last) lines.push({ text: `A year ago prestige stood at ${last.prestige.toFixed(1)}` });
  for (const input of breakdown.inputs) {
    const grade = card.grades[input.key];
    if (grade === undefined) continue;
    if (input.penalty && Math.abs(grade) < 0.05) continue; // a penalty that took nothing is not a line
    lines.push({
      text: `${input.label}: ${input.penalty ? '−' : '+'}${Math.abs(grade).toFixed(1)} of ${input.weight}`,
      tone: input.penalty ? 'bad' : undefined,
    });
  }
  return { key: 'standing', title: 'Standing', lines, empty: '' };
}

export function buildYearInReview(s: GameState): YearInReview {
  const entries = yearLog(s);
  const oldest = s.log[s.log.length - 1];
  return {
    year: s.clock.year,
    sections: [
      built(s, entries),
      people(entries),
      research(entries),
      students(s, entries),
      moneySection(s, entries),
      standing(s),
    ],
    truncated: s.log.length >= LOG_CAP && oldest !== undefined && oldest.year === s.clock.year,
  };
}
