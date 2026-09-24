import type { GameState, Loan } from '../../state/types';
import { WEEKS_PER_YEAR, totalEnrolled } from '../../state/types';
import type { CatalogueChoice, CatalogueEvent, ConditionKey, EffectKey, NeedKey } from '../../data/eventCatalogueTypes';
import { EVENT_CATALOGUE } from '../../data/eventCatalogue';
import { random } from '../../engine/random';
import { isPlaceableKind } from '../../state/campusMap';
import { conditionOf } from '../estate/estate';
import { campusBeauty } from '../estate/beauty';
import { changeTrees, treeCount } from '../estate/woodland';
import { detectQuads } from '../../state/quads';
import { campusAverageCourseQuality } from '../faculty/facultyAssignment';
import { distressOf, foundingDistress } from '../finance/distress';
import { debtOutstanding, drawRate, loanPayment } from '../finance/treasury';
import { financeBreakdown } from '../finance/financeSystem';
import { seatPayroll } from '../delegation/seats';
import { collegeRival, mainSport } from '../rivals/collegeRival';
import { playerRank } from '../rivals/rivalsSystem';
import { milestoneSchools, programById } from '../../data/techData';
import { isSchoolFounded } from '../techtree/schools';
import { sportById } from '../../data/studentLifeData';

// THE CATALOGUE (Plan 32, from v2's events.ts): v2's events, read against
// this game's state. An inline event waits in the panel and, if nobody
// answers, takes its default when its weeks run out; a seismic one is a
// letter from the board and stops the clock. A seat covering an inline
// event's domain answers it by policy (delegation/seats.ts).

// ---- Prices ----
// v2 wrote its sums for a founding college with a $15M budget and scaled
// them by budget, never above twelve times. This game's founding college is
// smaller than v2's, so the scale may fall to a fifth. Sums under $25,000
// price a thing, not a size, and stay as written.
const PRICE_REFERENCE_BUDGET = 15_000_000;
const PRICE_SCALE_MIN = 0.2;
const PRICE_SCALE_MAX = 12;
const PRICE_FIXED_BELOW = 25_000;
const MONEY: ReadonlySet<EffectKey> = new Set(['cash', 'endowment', 'debt', 'backlog']);

export function priceScale(s: GameState): number {
  const budget = Math.max(s.finance.weeklyOpEx, 1) * WEEKS_PER_YEAR;
  return Number(Math.min(PRICE_SCALE_MAX, Math.max(PRICE_SCALE_MIN, budget / PRICE_REFERENCE_BUDGET)).toFixed(2));
}

function roundNice(x: number): number {
  if (x === 0) return 0;
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(x))) - 1);
  return Math.round(x / magnitude) * magnitude;
}

export function scaledEffects(effects: CatalogueChoice['effects'], scale: number): CatalogueChoice['effects'] {
  const out: CatalogueChoice['effects'] = {};
  for (const [k, v] of Object.entries(effects) as [EffectKey, number][]) {
    out[k] = MONEY.has(k) && Math.abs(v) >= PRICE_FIXED_BELOW ? roundNice(v * scale) : v;
  }
  return out;
}

// ---- Conditions ----
function enrolled(s: GameState): number { return totalEnrolled(s.students); }
function standing(s: GameState) { return s.tech.filter((t) => isPlaceableKind(t) && t.status === 'done'); }
function housedPrograms(s: GameState): string[] {
  return Object.values(s.halls).flat().map((slot) => slot.programId).filter((id): id is string => id !== null);
}
function alumniCount(s: GameState): number { return (s.alumni ?? []).reduce((t, a) => t + a.size, 0); }
function meanWarmth(s: GameState): number {
  const a = s.alumni ?? [];
  return a.length === 0 ? 50 : a.reduce((t, c) => t + c.warmth + c.nudged, 0) / a.length;
}
// How deep into winter the week is, 0 to 1: this game's winter runs from
// week 44 to week 8 and is deepest at the turn of the year.
function winterDepth(week: number): number {
  const fromNewYear = week <= 26 ? week : week - WEEKS_PER_YEAR;
  return Math.max(0, 1 - Math.abs(fromNewYear) / 9);
}
// v2's reputation runs to 100, this game's prestige to 150.
const REPUTATION_SCALE = 150 / 100;

// Each condition as a reading and whether the event's number is a floor or
// a ceiling on it.
const READINGS: Record<ConditionKey, [(s: GameState) => number, 'min' | 'max']> = {
  yearAtLeast: [(s) => s.clock.year, 'min'],
  yearAtMost: [(s) => s.clock.year, 'max'],
  enrolledOver: [enrolled, 'min'],
  enrolledUnder: [enrolled, 'max'],
  alumniOver: [alumniCount, 'min'],
  facultyOver: [(s) => s.faculty.length, 'min'],
  facultyUnder: [(s) => s.faculty.length, 'max'],
  studentsPerFacultyOver: [(s) => enrolled(s) / Math.max(1, s.faculty.length), 'min'],
  buildingsOver: [(s) => standing(s).length, 'min'],
  oldestBuildingOver: [(s) => Math.max(0, ...standing(s).map((t) => (t.builtYear === undefined ? 0 : s.clock.year - t.builtYear))), 'min'],
  derelictOver: [(s) => standing(s).filter((t) => conditionOf(t) < 0.1).length, 'min'],
  quadsOver: [(s) => detectQuads(s).length, 'min'],
  treesUnder: [treeCount, 'max'],
  programsOver: [(s) => housedPrograms(s).length, 'min'],
  programsUnder: [(s) => housedPrograms(s).length, 'max'],
  schoolsOver: [(s) => milestoneSchools().filter((x) => isSchoolFounded(s, x.schoolName)).length, 'min'],
  endowmentOver: [(s) => s.finance.endowment, 'min'],
  endowmentUnder: [(s) => s.finance.endowment, 'max'],
  cashOver: [(s) => s.finance.cash, 'min'],
  cashUnder: [(s) => s.finance.cash, 'max'],
  debtOver: [debtOutstanding, 'min'],
  deficitOver: [(s) => -financeBreakdown(s).net * WEEKS_PER_YEAR, 'min'],
  drawRateOver: [drawRate, 'min'],
  backlogOver: [(s) => standing(s).reduce((t, b) => t + (b.backlog ?? 0), 0), 'min'],
  maintenanceUnder: [(s) => s.finance.maintenanceFunding ?? 1, 'max'],
  conditionUnder: [(s) => Math.min(1, ...standing(s).map(conditionOf)), 'max'],
  satisfactionOver: [(s) => s.students.satisfaction, 'min'],
  satisfactionUnder: [(s) => s.students.satisfaction, 'max'],
  moodOver: [(s) => s.students.satisfaction, 'min'],
  moodUnder: [(s) => s.students.satisfaction, 'max'],
  teachingOver: [(s) => campusAverageCourseQuality(s) ?? 0, 'min'],
  teachingUnder: [(s) => campusAverageCourseQuality(s) ?? 100, 'max'],
  selectivityOver: [(s) => 1 - s.students.admitRate, 'min'],
  selectivityUnder: [(s) => 1 - s.students.admitRate, 'max'],
  tuitionOver: [(s) => s.finance.listedTuition, 'min'],
  reputationOver: [(s) => s.self.reputation / REPUTATION_SCALE, 'min'],
  reputationUnder: [(s) => s.self.reputation / REPUTATION_SCALE, 'max'],
  rankAtLeast: [playerRank, 'min'],
  beautyOver: [campusBeauty, 'min'],
  beautyUnder: [campusBeauty, 'max'],
  warmthOver: [meanWarmth, 'min'],
  warmthUnder: [meanWarmth, 'max'],
  confidenceOver: [(s) => distressOf(s).confidence, 'min'],
  confidenceUnder: [(s) => distressOf(s).confidence, 'max'],
  rungAtLeast: [(s) => distressOf(s).rung, 'min'],
  varsityAtLeast: [(s) => s.orgs.teams.filter((t) => t.status === 'active').length, 'min'],
  titlesAtLeast: [(s) => s.orgs.titles.length, 'min'],
  rivalAtLeast: [(s) => (collegeRival(s) ? 1 : 0), 'min'],
  adminShareOver: [(s) => { const f = financeBreakdown(s); const pay = f.weeklySalaries + seatPayroll(s); return pay > 0 ? seatPayroll(s) / pay : 0; }, 'min'],
  payrollShareOver: [(s) => { const f = financeBreakdown(s); return f.totalExpenses > 0 ? f.weeklySalaries / f.totalExpenses : 0; }, 'min'],
  winterAtLeast: [(s) => winterDepth(s.clock.week), 'min'],
};

// Money thresholds were written for v2's founding college and scale as its
// prices do.
const MONEY_CONDITIONS: ReadonlySet<ConditionKey> = new Set(['endowmentOver', 'endowmentUnder', 'cashOver', 'cashUnder', 'debtOver', 'deficitOver', 'backlogOver']);

export function conditionsMet(s: GameState, e: CatalogueEvent): boolean {
  const scale = priceScale(s);
  for (const [key, raw] of Object.entries(e.when) as [ConditionKey, number][]) {
    const [read, bound] = READINGS[key];
    const target = MONEY_CONDITIONS.has(key) ? raw * scale : raw;
    const value = read(s);
    // "Over" and "at least" both read as a floor, as v2 does.
    if (bound === 'min' ? value < target : value > target) return false;
  }
  return true;
}

const NEEDS: Record<NeedKey, (s: GameState) => boolean> = {
  'arts-centre': (s) => standing(s).some((t) => t.facilityType === 'performingArtsCenter' || t.facilityType === 'artGallery'),
  'championship-stadium': (s) => standing(s).some((t) => t.facilityType === 'footballStadium'),
  'dining-hall': (s) => standing(s).some((t) => t.facilityType === 'diningHall'),
  'great-lawn': (s) => standing(s).some((t) => t.facilityType === 'quad'),
  'health-center': (s) => standing(s).some((t) => t.facilityType === 'healthCenter'),
  lab: (s) => standing(s).some((t) => t.facilityType === 'lab'),
  library: (s) => standing(s).some((t) => t.facilityType === 'library'),
  'playing-field': (s) => standing(s).some((t) => t.facilityType === 'athleticsField' || t.facilityType === 'recCenter'),
  'research-park': (s) => standing(s).filter((t) => t.facilityType === 'lab').length >= 3,
  'residence-hall': (s) => standing(s).some((t) => t.kind === 'dorm'),
};

export function eligible(s: GameState, e: CatalogueEvent): boolean {
  return conditionsMet(s, e) && (e.needs ?? []).every((n) => NEEDS[n](s));
}

// ---- Variables ----
function pick<T>(xs: readonly T[]): T | undefined {
  return xs.length === 0 ? undefined : xs[Math.floor(random() * xs.length) % xs.length];
}

export function rollVars(s: GameState): Record<string, string> {
  const rival = collegeRival(s) ?? pick(s.rivals);
  const latest = (s.alumni ?? [])[(s.alumni ?? []).length - 1];
  const faculty = pick(s.faculty);
  const program = pick(housedPrograms(s));
  const building = pick(standing(s));
  const sport = mainSport(s);
  const schools = milestoneSchools().filter((x) => isSchoolFounded(s, x.schoolName)).map((x) => x.schoolName);
  const suitor = pick(s.rivals.filter((r) => r.reputation > s.self.reputation));
  return {
    rival: rival ? rival.name : 'the college across the river',
    class: latest ? `the class of ${latest.classYear}` : 'the first class',
    faculty: faculty ? faculty.name : 'a senior professor',
    program: program ? (programById(program)?.name ?? program) : 'the founding program',
    building: building ? building.name : 'Founders Hall',
    sport: sport ? (sportById(sport)?.teamName ?? sport) : 'the intramural league',
    school: pick(schools) ?? 'the college',
    suitor: suitor ? suitor.name : 'a larger university',
  };
}

export function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, key: string) => vars[key] ?? m);
}

// ---- Effects ----
function spreadBacklog(s: GameState, amount: number): void {
  const open = standing(s);
  if (open.length === 0) return;
  const weigh = (t: (typeof open)[number]) => (amount < 0 ? (t.backlog ?? 0) : t.cost);
  const carried = open.reduce((t, b) => t + weigh(b), 0);
  for (const b of open) {
    const share = carried > 0 ? weigh(b) / carried : 1 / open.length;
    const next = Math.max(0, (b.backlog ?? 0) + amount * share);
    if (next > 0) b.backlog = Math.round(next); else delete b.backlog;
  }
}

function changeEnrollment(s: GameState, amount: number): void {
  // v2's figures are for its founding body of about two thousand: the
  // change is that share of this college's body, taken from or added to
  // the incoming class, whose cohort mix is kept in proportion.
  const body = enrolled(s);
  if (body <= 0) return;
  const fr = s.students.classes.freshman;
  const next = Math.max(0, fr + Math.round((amount / 2000) * body));
  const counts = s.students.cohortsByClass.freshman;
  const before = Object.values(counts).reduce((a, b) => a + b, 0);
  const keys = Object.keys(counts) as (keyof typeof counts)[];
  if (before > 0) {
    const scaled = keys.map((k) => ({ k, exact: (counts[k] * next) / before }));
    let placed = 0;
    for (const { k, exact } of scaled) { counts[k] = Math.floor(exact); placed += counts[k]; }
    const byRemainder = scaled.slice().sort((a, b) => (b.exact % 1) - (a.exact % 1));
    for (let i = 0; placed < next; i++, placed++) counts[byRemainder[i % byRemainder.length].k] += 1;
  } else if (next > 0) {
    counts[keys[0]] = next;
  }
  s.students.classes.freshman = next;
}

function changeDebt(s: GameState, amount: number): void {
  if (amount > 0) {
    const loan: Loan = { buildingId: 'event', balance: amount, payment: loanPayment(amount), weeksLeft: 15 * WEEKS_PER_YEAR };
    (s.finance.loans ??= []).push(loan);
    return;
  }
  let left = -amount;
  for (const l of s.finance.loans ?? []) {
    const paid = Math.min(l.balance, left);
    l.balance -= paid;
    left -= paid;
  }
  if (s.finance.loans) s.finance.loans = s.finance.loans.filter((l) => l.balance > 0);
  if (s.finance.loans?.length === 0) delete s.finance.loans;
}

export function applyEffects(s: GameState, effects: CatalogueChoice['effects']): void {
  for (const [k, v] of Object.entries(effects) as [EffectKey, number][]) {
    switch (k) {
      case 'cash': s.finance.cash += v; break;
      case 'endowment': s.finance.endowment = Math.max(0, s.finance.endowment + v); break;
      case 'debt': changeDebt(s, v); break;
      case 'backlog': spreadBacklog(s, v); break;
      case 'mood': s.students.satisfaction = Math.max(0, Math.min(100, s.students.satisfaction + v)); break;
      case 'confidence': {
        const d = s.finance.distress ??= foundingDistress();
        d.confidence = Math.max(0, Math.min(100, d.confidence + v));
        break;
      }
      case 'warmth': for (const a of s.alumni ?? []) a.warmth = Math.max(0, Math.min(100, a.warmth + v)); break;
      case 'quality': s.students.incomingQuality = Math.max(0, Math.min(100, s.students.incomingQuality + v)); break;
      case 'enrollment': changeEnrollment(s, v); break;
      case 'trees': changeTrees(s, v); break; // estate/woodland.ts
    }
  }
}

export function eventById(id: string): CatalogueEvent | undefined {
  return EVENT_CATALOGUE.find((e) => e.id === id);
}

export { EVENT_CATALOGUE };
