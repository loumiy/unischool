import type { GameState, LogEntry, LogTopic } from './types';
import { LOG_CAP } from './types';
import { programById, programOfCourse } from '../data/techData';
import { advanceClasses, trailingYearSatisfaction } from '../systems/admissions/admissionsSystem';
import { attritionReasons, summerAttrition } from '../systems/admissions/consequences';
import { baseShareCohortCounts } from '../systems/admissions/cohorts';
import { gradeYear, prestigeBreakdown, standingDetailLine } from '../systems/prestige/prestigeSystem';
import { buildReportPayload } from '../systems/rivals/rivalsSystem';
import { previousYear } from './history';
import { count, money, prestigeFigure, prestigeShown, satisfactionFigure, satisfactionShown, signed, signedMoney } from '../format';
import { eventById } from '../systems/events/catalogue';
import { classYears, firstClassYear, memoryFor, memoryLine, warmthFor } from '../systems/alumni/ledger';
import { CAMPAIGNS } from '../data/campaignData';

const CAMPAIGN_CLOSINGS: ReadonlySet<string> = new Set(CAMPAIGNS.flatMap((c) => [c.kept, c.missed]));

// ---------------------------------------------------------------------
// The year in review: the summer's first beat. A pure reading, generated
// from the closing year's log lines grouped by LogTopic and from the state
// against last summer's row. The log is the source because every fact is
// already a line written the week it happened; a second ledger would
// drift. A year busier than LOG_CAP lines loses its earliest weeks, and the
// review says so (`truncated`).
//
// Attrition and the report card are read with the same pure functions the
// reducer commits with, so the review can't promise a summer the boundary
// doesn't deliver.
// ---------------------------------------------------------------------

export type ReviewSectionKey = 'built' | 'people' | 'research' | 'students' | 'money' | 'standing' | 'events' | 'class';

export interface ReviewLine {
  text: string;
  tone?: 'good' | 'bad';
  // A second, smaller line under the first: a prestige term's "what moves
  // it", as History › Prestige reads it (Plan 78C).
  detail?: string;
}

export interface ReviewSection {
  key: ReviewSectionKey;
  title: string;
  lines: ReviewLine[];
  // Shown when nothing in the year belongs to the section.
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
  return `${count(n)} ${n === 1 ? one : many}`;
}

// Courses finished, grouped by school. Looked up off the course id (the
// line's subject), not its name.
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
    lines.push({ text: `${plural(started, 'research project')} begun, ${concluded} concluded` });
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

// Who won't return this summer: the same advance the boundary commits, with
// nobody incoming, so the figure matches what it will log.
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
  // From the figures as shown, so "80 against 73" reads "+7".
  const delta = satisfactionShown(average) - satisfactionShown(lastAverage);
  lines.push({
    text: s.history.length > 0
      ? `Satisfaction averaged ${satisfactionFigure(average)} this year, against ${satisfactionFigure(lastAverage)} last year (${signed(delta)})`
      : `Satisfaction averaged ${satisfactionFigure(average)} this year`,
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
  if (petitions > 0) lines.push({ text: `${plural(petitions, 'organization')} petitioning for recognition — the President answers at this summer's Students step` });
  const leaving = projectedAttrition(s);
  if (leaving > 0) {
    const reasons = attritionReasons(s);
    lines.push({
      text: `${plural(leaving, 'student')} will not return this summer — ${reasons.length > 0 ? reasons.join(', ') : `a year averaging ${satisfactionFigure(average)}`}`,
      tone: 'bad',
    });
  }
  return { key: 'students', title: 'Students', lines, empty: 'No demands, petitions or departures this year.' };
}

function moneySection(s: GameState, entries: LogEntry[]): ReviewSection {
  const before = previousYear(s);
  const net = s.finance.cash - before.cash;
  const lines: ReviewLine[] = [
    { text: `Net over the year: ${signedMoney(net)}`, tone: net >= 0 ? 'good' : 'bad' },
    { text: `Operating funds ${money(s.finance.cash)}, against ${money(before.cash)} a year ago` },
  ];
  // Only a campaign's closing line counts: its launch and the building
  // fund's lines are money lines too (alumni/campaigns.ts).
  const campaigns = byTopic(entries, 'money').filter((e) => CAMPAIGN_CLOSINGS.has(e.message)).length;
  if (campaigns > 0) lines.push({ text: `${plural(campaigns, 'campaign')} closed; the endowment stands at ${money(s.finance.endowment)}` });
  return { key: 'money', title: 'Money', lines, empty: '' };
}

// The report card, read before it is applied: the year's grade, the step
// prestige is about to take, and each input's grade against its weight.
function standing(s: GameState): ReviewSection {
  const card = gradeYear(s);
  const breakdown = prestigeBreakdown(s);
  const step = prestigeShown(card.after) - prestigeShown(card.before);
  const lines: ReviewLine[] = [
    {
      text: `The year graded ${card.score.toFixed(0)}: prestige ${prestigeFigure(card.before)} → ${prestigeFigure(card.after)} (${signed(step, 1)})`,
      tone: step >= 0 ? 'good' : 'bad',
    },
  ];
  const last = s.history.length > 0 ? s.history[s.history.length - 1] : null;
  if (last) lines.push({ text: `A year ago prestige stood at ${prestigeFigure(last.prestige)}` });
  // Same crossing the Standing beat reports, so the two agree.
  const passedBy = last ? buildReportPayload(s).passedBy : [];
  if (passedBy.length > 0) {
    lines.push({ text: `Passed this year by ${passedBy.join(', ')}`, tone: 'bad' });
  }
  for (const input of breakdown.inputs) {
    const grade = card.grades[input.key];
    if (grade === undefined) continue;
    if (input.penalty && Math.abs(grade) < 0.05) continue; // a penalty that took nothing is not a line
    lines.push({
      text: `${input.label}: ${input.penalty ? '−' : '+'}${Math.abs(grade).toFixed(1)} of ${input.weight}`,
      tone: input.penalty ? 'bad' : undefined,
      detail: standingDetailLine(input),
    });
  }
  return { key: 'standing', title: 'Standing', lines, empty: '' };
}

// The year's events (Plan 33): the board's letters answered, and the
// catalog's inline events by who answered them (the journal's records).
function events(s: GameState): ReviewSection {
  const lines: ReviewLine[] = [];
  for (const l of s.catalogue?.letters ?? []) {
    if (l.year !== s.clock.year) continue;
    const e = eventById(l.eventId);
    const choice = e?.choices.find((c) => c.id === l.choiceId);
    lines.push({ text: `${e?.title ?? 'A letter'}, a letter to the President: ${choice?.label ?? 'answered'}` });
  }
  const row = s.catalogue?.answered?.find((a) => a.year === s.clock.year);
  if (row) {
    const parts = [
      row.player > 0 ? `${count(row.player)} answered by the President` : '',
      row.seat > 0 ? `${count(row.seat)} by the administration` : '',
      row.timeout > 0 ? `${count(row.timeout)} left unanswered, taking the usual course` : '',
    ].filter((x) => x !== '');
    lines.push({ text: `${plural(row.player + row.seat + row.timeout, 'matter')} came up: ${parts.join(', ')}` });
  }
  return { key: 'events', title: 'The year\'s events', lines, empty: 'A quiet year: nothing reached the President\'s desk.' };
}

// The class about to graduate (Plan 33): how it will remember its years
// and how warmly, read as commencement will stamp it (alumni/ledger.ts).
function graduatingClass(s: GameState): ReviewSection {
  const seniors = s.students.classes.senior;
  const lines: ReviewLine[] = [];
  if (seniors > 0) {
    const c = classYears(s, s.clock.year);
    const memory = memoryFor(s, c);
    const warmth = warmthFor(c, memory);
    lines.push({ text: memoryLine({ classYear: s.clock.year, memory }, firstClassYear(s.alumni, s.clock.year)) });
    lines.push({
      text: `${plural(seniors, 'senior')} leave${seniors === 1 ? 's' : ''} ${warmth >= 60 ? 'warm toward the college' : warmth >= 40 ? 'on fair terms with it' : 'cool toward it'} (${warmth.toFixed(0)} of 100)`,
      tone: warmth >= 60 ? 'good' : warmth < 40 ? 'bad' : undefined,
    });
  }
  return { key: 'class', title: 'The graduating class', lines, empty: 'No class graduates this summer.' };
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
      events(s),
      graduatingClass(s),
    ],
    truncated: s.log.length >= LOG_CAP && oldest !== undefined && oldest.year === s.clock.year,
  };
}
