import { tagTeeth } from '../identity/teeth';
import { annualGiving } from '../alumni/giving';
import { seatPayroll } from '../delegation/seats';
import { upkeepShare } from '../estate/estate';
import { debtService, drawRate, serviceLoans } from './treasury';
import { accrueTerm } from './distress';
import type { ClassTuition, GameState } from '../../state/types';
import { WEEKS_PER_YEAR, coursesDone, totalEnrolled } from '../../state/types';
import { departmentPot, studentOrgUpkeep } from '../../data/studentLifeData';
import { weeklyGateRevenue } from '../athletics/gate';
import { marketRateMultiplier } from '../../data/facultyData';
import { SEATS_PER_COURSE, instructionCapacity } from '../techtree/instructionCapacity';

// Money is the game's primary throttle (docs/design/economy.md). The tuning
// shape: cost leads and revenue follows. Every cost driver is charged the
// moment a commitment is made, while the revenue it feeds waits for the
// annual admissions boundary (and, via prestige, for years of drift). Higher
// tiers cost more per course and per student (techData.ts's
// COURSE_UPKEEP_PER_WEEK), so the pinch deepens on its own.
//
// Rough income by stage from `npm run sim`, for pricing new content against
// the stage it unlocks at: founding ~$100k/wk income vs ~$45k opex; tier 1
// opex ~$120k/wk with net 15-30% of income; tiers 2-3 income $1-3M/wk; late
// game $13-18M/wk against ~$7.5M opex.

// Group 1: recurring cost drivers, charged weekly from the moment the thing
// exists. Raise to make growth hurt sooner.

// Charged on beds, not occupants, so a new dorm is a real bill before its
// students arrive. Empty beds cost half: building ahead of demand still
// hurts, but an over-built school's bill shrinks toward what its enrollment
// supports ("stall, don't die", see the note at the bottom).
const UPKEEP_PER_SEAT_PER_WEEK = 24;
const UPKEEP_EMPTY_SEAT_MULTIPLIER = 0.5;

// Instruction, per section. A course costs SECTION_COST a week for every
// SECTION_SIZE students in it, with per-course enrollment read off the
// aggregate body (each student takes COURSES_PER_STUDENT courses, spread
// evenly across the catalog). Every offered course runs at least one
// section and at most what its seats hold (instructionCapacity.ts). So a
// small catalog at a big school runs full, cheap sections and crowds its
// students, while a big catalog at a small school runs empty sections
// dearly: the right catalog size changes as the school grows.
//
// Sections and services are charged at market rate, like salaries
// (facultyData.ts's marketRateMultiplier): a prestige-130 school pays about
// two and a half times the base, and tuition does not rise that fast.
export const SECTION_SIZE = 40;               // students a section holds
export const SECTION_COST = 800;              // a week, a section, at prestige 50
export const COURSES_PER_STUDENT = 4;         // taken at once
const MAX_SECTIONS_PER_COURSE = (SEATS_PER_COURSE * COURSES_PER_STUDENT) / SECTION_SIZE;

// Services per student (advising, registrar, IT, grounds): keeps the marginal
// student's profit thin, and rises with crowding (see servicesMultiplier).
export const SERVICES_PER_STUDENT_PER_WEEK = 45; // at prestige 50

// The cost of being large (Plan 36): the administration a big institution
// needs to hold itself together (registrars, advising, IT, compliance, the
// layers of management that coordinate them), charged per student and
// rising with every doubling of the roll above SCALE_FREE_BELOW. Every other
// running cost is linear in size, so without it the marginal student pays
// as well at 20,000 as at 1,000 and growth compounds until the catalog
// runs out (docs/plans/36-costs-that-grow-with-size.md). Free below the
// threshold, so a founding college never pays it; logarithmic, so the
// marginal student's margin falls smoothly rather than at a cliff; at the
// prestige market rate, on top of it, never in place of it.
// Fitted in Plan 36's PR D to the design's eras: on the default seed the
// Balanced builder's catalog is four-fifths built in Year 35 (Year 16
// without it), it reaches 20,000 students in Year 24 (14) and first place in
// Year 29 (16), and the founding decade is never blocked by money.
export const SCALE_PER_STUDENT_PER_WEEK = 5; // a week, a student, per doubling, at prestige 50
export const SCALE_FREE_BELOW = 1_500;       // students

// The line for a roll of `students` at `prestige`. `perStudent` defaults to
// the constant; tests read the shape at a rate of their own.
export function scaleCostFor(students: number, prestige: number, perStudent = SCALE_PER_STUDENT_PER_WEEK): number {
  if (students <= SCALE_FREE_BELOW || perStudent <= 0) return 0;
  return students * perStudent * marketRateMultiplier(prestige) * Math.log2(students / SCALE_FREE_BELOW);
}

export interface InstructionDetail {
  courses: number;        // offered ('done')
  perCourse: number;      // students enrolled in each, off the aggregate body
  sectionsPerCourse: number;
  sections: number;       // courses x sectionsPerCourse
  fill: number;           // how full the sections run, 0..1 (1 = every seat taken)
  overflow: number;       // students beyond what the catalog's sections seat — the crowding case
  cost: number;           // sections x SECTION_COST, a week
}

// The one computation of the instruction line, shared by the Treasury and
// the tick.
export function instructionDetail(s: GameState): InstructionDetail {
  const enrolled = totalEnrolled(s.students);
  const courses = coursesDone(s);
  if (courses === 0) {
    return { courses: 0, perCourse: 0, sectionsPerCourse: 0, sections: 0, fill: 0, overflow: enrolled, cost: 0 };
  }
  const perCourse = (enrolled * COURSES_PER_STUDENT) / courses;
  const sectionsPerCourse = Math.max(1, Math.min(MAX_SECTIONS_PER_COURSE, Math.ceil(perCourse / SECTION_SIZE)));
  const sections = courses * sectionsPerCourse;
  const seated = sections * SECTION_SIZE;
  const demand = enrolled * COURSES_PER_STUDENT;
  return {
    courses,
    perCourse,
    sectionsPerCourse,
    sections,
    fill: Math.min(1, demand / seated),
    overflow: Math.max(0, Math.round((demand - seated) / COURSES_PER_STUDENT)),
    cost: sections * SECTION_COST * marketRateMultiplier(s.self.reputation),
  };
}

// Faculty salaries, Buildable upkeep and student-org upkeep are summed live
// (facultyData.ts's facultySalary, effects.upkeepPerWeek, studentLifeData.ts's
// studentOrgUpkeep), so anything removed stops costing the same week.

// Group 2: revenue, all of it lagging.

// Tuition is the main line, each class at the price it was admitted under.
// The reputation dividend (donors, grants, brand) scales with prestige
// independent of enrollment; it is a stand-in isolated to one line so a
// richer demand model can replace it.
const REPUTATION_DIVIDEND_PER_POINT_PER_YEAR = 900;

// The endowment earns a return and pays its draw rate into income each year
// (treasury.ts: 4% unless the player moves it). At the default the payout
// is below the return, so an untouched endowment grows. There is no
// auto-draw: it is not an insolvency backstop.
export const ENDOWMENT_ANNUAL_RETURN = 0.055;

// =====================================================================
// The weekly cash flow
// =====================================================================

// Every line of the weekly cash flow, all per week. Annualizing is the
// reader's job, so there is one set of numbers.
export interface FinanceBreakdown {
  // income
  tuitionRevenue: number;      // every class at its own admission-year price (see annualTuitionBilled)
  prestigeRevenue: number;     // the reputation dividend: donors/grants/brand, independent of enrollment
  endowmentPayout: number;     // the endowment's annual spend rate, sliced into weeks
  annualFund: number;          // what the alumni give, sliced into weeks (alumni/giving.ts)
  gateRevenue: number;         // gross gate take (systems/athletics/gate.ts). Shown, not summed: it is paid into the department's pot, and only the surplus reaches income
  athleticsSurplus: number;    // the gate beyond what the programs drew, spilled into general income
  totalIncome: number;
  // expenses
  weeklySalaries: number;      // the faculty payroll at market rate (see facultyData.ts's marketRateMultiplier), annualized salaries sliced into weeks
  seatUpkeep: number;          // capacity x UPKEEP_PER_SEAT_PER_WEEK — the physical plant, sized by beds not bodies
  instructionCost: number;     // sections x SECTION_COST — teaching the catalog you have built, section by section (see instructionDetail)
  servicesCost: number;        // enrolled x SERVICES_PER_STUDENT_PER_WEEK x servicesMultiplier — advising, registrar, IT, grounds
  scaleCost: number;           // the cost of being large (scaleCostFor), rising with every doubling of the roll
  academicUpkeep: number;      // running the courses and academic buildings that are done
  facilityUpkeep: number;      // running the dorms and the facilities (labs among them) that are done
  studentLifeUpkeep: number;   // running the clubs and Greek chapters the player has recognized (see data/studentLifeData.ts)
  athleticsSubsidy: number;    // the part of the tier's subsidy the programs actually drew this week
  debtService: number;         // the buildings' loan payments (finance/treasury.ts)
  administration: number;      // the seats' salaries at market rate (delegation/seats.ts): the administrative ratchet
  totalExpenses: number;
  net: number;                 // totalIncome - totalExpenses
}

// Sums effects.upkeepPerWeek across 'done' Buildables. Split academic vs.
// campus only so the Treasury can show which half runs up the bill.
// A building's upkeep is paid at the maintenance funding (systems/estate).
function upkeepFor(s: GameState, academic: boolean): number {
  return s.tech
    .filter((t) => t.status === 'done' && (t.kind === 'course' || t.kind === 'building') === academic)
    .reduce((sum, t) => sum + (t.effects?.upkeepPerWeek ?? 0) * upkeepShare(s, t), 0);
}

// Per-student weekly instruction cost, for the sim and the Treasury. Zero
// for an empty campus.
export function instructionCostPerStudent(s: GameState): number {
  const enrolled = totalEnrolled(s.students);
  return enrolled <= 0 ? 0 : instructionDetail(s).cost / enrolled;
}

// The same reading with `extra` more courses offered, for a strategy asking
// whether the next course still pays (sim/balanceSim.ts).
export function instructionCostPerStudentWith(s: GameState, extra: number): number {
  const enrolled = totalEnrolled(s.students);
  if (enrolled <= 0) return 0;
  const courses = coursesDone(s) + extra;
  if (courses <= 0) return 0;
  const perCourse = (enrolled * COURSES_PER_STUDENT) / courses;
  const sectionsPerCourse = Math.max(1, Math.min(MAX_SECTIONS_PER_COURSE, Math.ceil(perCourse / SECTION_SIZE)));
  return (courses * sectionsPerCourse * SECTION_COST * marketRateMultiplier(s.self.reputation)) / enrolled;
}

// What the next `extra` students would add to the running costs, per student
// per week (Plan 36): instruction, services and the cost of being large, at
// today's rates and catalog. Read by the summer's projection, the
// Treasury's chart and the harness's sensible strategies (sim/balanceSim.ts).
export function marginalStudentCost(s: GameState, extra = 1_000, scaleRate = SCALE_PER_STUDENT_PER_WEEK, at = totalEnrolled(s.students)): number {
  const rate = marketRateMultiplier(s.self.reputation);
  const courses = coursesDone(s);
  // Sections are read as a share rather than rounded up: every course is the
  // same size here, so a thousand more students would otherwise tip every
  // course over a section boundary at once, and the next student's cost
  // would swing between a few thousand and ninety thousand a year.
  const running = (n: number) => {
    const perCourse = courses > 0 ? (n * COURSES_PER_STUDENT) / courses : 0;
    const sectionsPerCourse = courses > 0 ? Math.max(1, Math.min(MAX_SECTIONS_PER_COURSE, perCourse / SECTION_SIZE)) : 0;
    return courses * sectionsPerCourse * SECTION_COST * rate
      + n * SERVICES_PER_STUDENT_PER_WEEK * rate * servicesMultiplier(s)
      + scaleCostFor(n, s.self.reputation, scaleRate);
  };
  return (running(at + extra) - running(at)) / extra;
}

// What the next `extra` would pay at the listed price less what they would
// cost, per student per week. The break is where this turns negative: past
// it, the next thousand cost more than they pay.
export function marginalStudentMargin(s: GameState, extra = 1_000, scaleRate = SCALE_PER_STUDENT_PER_WEEK): number {
  return s.finance.listedTuition / WEEKS_PER_YEAR - marginalStudentCost(s, extra, scaleRate);
}

// Crowding raises the services line: flat up to SERVICES_CROWDING_FROM of
// instruction capacity, then linear to 1 + SERVICES_CROWDING_AT_FULL at the
// ceiling and beyond, capped. A campus with no seats reads the cap.
export const SERVICES_CROWDING_FROM = 0.85;
export const SERVICES_CROWDING_AT_FULL = 0.5;
const SERVICES_CROWDING_CAP = 2.0;
export function servicesMultiplier(s: GameState): number {
  const enrolled = totalEnrolled(s.students);
  if (enrolled <= 0) return 1;
  const capacity = instructionCapacity(s);
  if (capacity <= 0) return SERVICES_CROWDING_CAP;
  const used = enrolled / capacity;
  const past = Math.max(0, (used - SERVICES_CROWDING_FROM) / (1 - SERVICES_CROWDING_FROM));
  return Math.min(SERVICES_CROWDING_CAP, 1 + SERVICES_CROWDING_AT_FULL * past);
}

// A hire's pay this week at the school's market rate. Exported so the
// Faculty tab and payroll lever match the tick.
export function facultyPay(s: GameState, salary: number): number {
  return salary * marketRateMultiplier(s.self.reputation);
}

// Annual tuition billed, per class: each class pays the price it was quoted
// at admission until graduation (types.ts's tuitionByClass), so there is no
// single per-student price. Exported so the Treasury shows the same rows.
export function tuitionByClassBilled(s: GameState): ClassTuition {
  const classes = s.students.classes;
  const price = s.finance.tuitionByClass;
  return {
    freshman: classes.freshman * price.freshman,
    sophomore: classes.sophomore * price.sophomore,
    junior: classes.junior * price.junior,
    senior: classes.senior * price.senior,
  };
}

export function annualTuitionBilled(s: GameState): number {
  const billed = tuitionByClassBilled(s);
  return billed.freshman + billed.sophomore + billed.junior + billed.senior;
}

// The single computation of the weekly cash flow, applied by tickFinance and
// rendered by the Treasury. Pure.
export function financeBreakdown(s: GameState): FinanceBreakdown {
  const enrolled = totalEnrolled(s.students);
  const tuitionRevenue = annualTuitionBilled(s) / WEEKS_PER_YEAR;
  const prestigeRevenue = (s.self.reputation * REPUTATION_DIVIDEND_PER_POINT_PER_YEAR) / WEEKS_PER_YEAR;
  const endowmentPayout = (s.finance.endowment * drawRate(s)) / WEEKS_PER_YEAR;
  const annualFund = annualGiving(s) / WEEKS_PER_YEAR;
  // The gate is paid to the athletics department's pot (subsidy + gate),
  // programs draw from it in list order, and only the leftover gate spills
  // into income. The university pays only the subsidy actually drawn. Do not
  // charge the whole tier and refund the surplus: it nets the same but
  // inflates opex, which many prices are measured in.
  const gateRevenue = weeklyGateRevenue(s);
  const pot = departmentPot(s);
  const athleticsSubsidy = Math.max(0, pot.drawn - pot.earned) / WEEKS_PER_YEAR;
  const athleticsSurplus = Math.max(0, pot.earned - pot.drawn) / WEEKS_PER_YEAR;
  // Salaries at market rate (facultyData.ts's marketRateMultiplier).
  const weeklySalaries = s.faculty.reduce((sum, f) => sum + facultyPay(s, f.salary), 0) / WEEKS_PER_YEAR;
  const filledSeats = Math.min(enrolled, s.students.capacity);
  const emptySeats = Math.max(s.students.capacity - filledSeats, 0);
  const seatUpkeep = (filledSeats + emptySeats * UPKEEP_EMPTY_SEAT_MULTIPLIER) * UPKEEP_PER_SEAT_PER_WEEK;
  const instructionCost = instructionDetail(s).cost;
  // A Party School pays for the parties (an identity tag's teeth, Plan 31).
  const servicesCost = enrolled * SERVICES_PER_STUDENT_PER_WEEK * marketRateMultiplier(s.self.reputation) * servicesMultiplier(s)
    + (enrolled * tagTeeth(s, 'studentCost')) / WEEKS_PER_YEAR;
  const scaleCost = scaleCostFor(enrolled, s.self.reputation);
  const academicUpkeep = upkeepFor(s, true);
  const facilityUpkeep = upkeepFor(s, false);
  const studentLifeUpkeep = studentOrgUpkeep(s);
  const debt = debtService(s);
  const administration = seatPayroll(s);

  // Five income lines; there is no state appropriation.
  const totalIncome = tuitionRevenue + prestigeRevenue + endowmentPayout + athleticsSurplus + annualFund;
  const totalExpenses = weeklySalaries + seatUpkeep + instructionCost + servicesCost + scaleCost + academicUpkeep +
    facilityUpkeep + studentLifeUpkeep + athleticsSubsidy + debt + administration;

  return {
    tuitionRevenue,
    prestigeRevenue,
    endowmentPayout,
    annualFund,
    gateRevenue,
    athleticsSurplus,
    totalIncome,
    weeklySalaries,
    seatUpkeep,
    instructionCost,
    servicesCost,
    scaleCost,
    academicUpkeep,
    facilityUpkeep,
    studentLifeUpkeep,
    athleticsSubsidy,
    debtService: debt,
    administration,
    totalExpenses,
    net: totalIncome - totalExpenses,
  };
}

// Net weekly cash flow, without mutating anything.
export function weeklyNet(s: GameState): number {
  return financeBreakdown(s).net;
}

// Applies the weekly cash flow to the draft state.
export function tickFinance(s: GameState): void {
  const flow = financeBreakdown(s);
  s.finance.weeklyOpEx = flow.totalExpenses;
  s.finance.cash += flow.net;
  // The run's solvency record (types.ts's Finance.weeksInTheRed), counted
  // only here where cash settles.
  if (s.finance.cash < 0) s.finance.weeksInTheRed += 1;
  serviceLoans(s);
  accrueTerm(s, flow.net);

  // The endowment compounds net of the payout collected above. Cash can go
  // negative only through an operating deficit (purchases need the cash),
  // which stalls development rather than ending the run: no auto-draw, no
  // game over.
  s.finance.endowment *= 1 + (ENDOWMENT_ANNUAL_RETURN - drawRate(s)) / WEEKS_PER_YEAR;
}

// "Stall, don't die": why no run can spiral beyond recovery. Since Plan 27
// the stall has a shape, the board's distress ladder (distress.ts); what
// keeps the bottom of it survivable is still a property of a constant or
// formula:
//  1. Empty beds cost half, so over-building's cost falls as the school
//     shrinks.
//  2. Sections follow enrollment down to one per course; that catalog
//     floor is the one fixed bill, recoverable with the levers in 4.
//  3. Demand cannot hit zero: satisfaction is floored (satisfactionSystem.ts's
//     ATTRIBUTE_SCORE_FLOOR) and curriculum breadth never falls.
//  4. Two zero-cost levers are always available: lowering tuition (widens
//     the pool) and firing faculty.
//  5. The endowment pays out every week regardless.
