import type { ClassTuition, GameState } from '../../state/types';
import { WEEKS_PER_YEAR, totalEnrolled } from '../../state/types';
import { studentOrgUpkeep } from '../../data/studentLifeData';
import { marketRateMultiplier } from '../../data/facultyData';
import { SEATS_PER_COURSE, instructionCapacity } from '../techtree/instructionCapacity';

// ---------------------------------------------------------------------
// This file is the game's primary throttle (see
// docs/design/economy.md). Since the development-slot mechanic was
// removed, money paces alone — and money only paces if the growth loop
// makes it bite.
//
// THE SHAPE THIS IS TUNED TO: at every turn of the growth loop, COST
// LEADS AND REVENUE FOLLOWS. Concretely, each of the four cost drivers
// below is charged the moment a commitment is made, while every one of
// the revenue lines it eventually feeds is gated behind the ANNUAL
// admissions boundary (see the reducer's RESOLVE_ADMISSIONS) and, for
// prestige, behind a 12%-per-year drift on top of that:
//
//   commit to a dorm  -> build cost now, seat upkeep from the week it
//                        finishes, and satisfaction dilutes immediately
//                        (satisfactionSystem.ts scores every ratio
//                        attribute against CAPACITY) ... the students who
//                        pay for it arrive at the next summer funnel.
//   commit to courses -> development cost now, a per-course running cost
//                        from completion, and a higher instructional cost
//                        per student across the WHOLE student body
//                        ... the majors/schools they add only raise the
//                        prestige TARGET, which reputation then drifts
//                        toward over years, which only then widens the
//                        applicant pool.
//   commit to faculty -> salary from the week they are hired, rising with
//                        tenure forever ... they unlock courses, which are
//                        two more lags away from revenue.
//
// That gap is the whole game. Nothing here needs to know about tiers to
// produce it: opening a tier's content simply costs more, per course and
// per student, than the tier below it (see techData.ts's
// COURSE_UPKEEP_PER_WEEK), so each turn of the loop is a bigger bite than
// the last one and the pinch deepens on its own.
//
// Salaries/revenue are annualized over WEEKS_PER_YEAR — the same clock
// that drives the academic calendar and admissions — so there is exactly
// one definition of "a year" anywhere in the game.
//
// --- What income looks like by stage, from the fast-forward runs in
// sim/balanceSim.ts (`npm run sim`). New content should be priced against
// the stage it unlocks at, never against the founding cushion:
//   FOUNDING (350 beds, ~6 courses, prestige ~52): income ~$100k/wk,
//     opex ~$45k/wk. The gen-ed ramp is meant to be free money.
//   TIER-1 (350-700 beds, ~42 courses, a full department roster):
//     opex roughly triples to ~$120k/wk while enrollment cannot move
//     until the next summer — the first pinch. Net falls to ~15-30% of
//     income and the founding cushion is gone.
//   TIER-2/3 (2k-7k beds, 150-300 courses, prestige 60-110): income
//     $1-3M/wk, but each dorm costs several months of it and every one
//     dilutes satisfaction, so net keeps getting squeezed back toward
//     15-25% of income for a year or two after each expansion.
//   LATE (18k beds, the full catalogue, prestige 130+): income
//     $13-18M/wk against ~$7.5M/wk of opex. The chains are exhausted;
//     what is left to buy is an endowment campaign (see GROUP 3).
// ---------------------------------------------------------------------

// =====================================================================
// GROUP 1 — RECURRING COST DRIVERS (the teeth of the loop)
// Every number here is charged per week, forever, from the moment the
// thing it prices exists. Raise these to make growth hurt sooner; lower
// them to let revenue catch up faster.
// =====================================================================

// The physical plant: charged on CAPACITY (beds), not on who's in them,
// so a dorm that finished in October is a real bill through the winter
// while the students who fill it are still nine months away. This is the
// single most direct expression of "cost leads revenue" in the file.
//
// Deliberately not prestige-linked: it tracks how big the campus IS.
//
// EMPTY beds are charged at a reduced "mothballed wing" rate. That is not
// a softening of the lag — a fresh, unfilled dorm still runs up half its
// bill from the day it opens, which is the felt cost of building ahead of
// demand — it is the floor that makes "stall, don't die" true: a school
// that over-built cannot be permanently sunk by upkeep on beds nobody is
// in, because the bill shrinks toward what its actual enrollment can
// support. See the "no downward spiral" note at the bottom of this file.
const UPKEEP_PER_SEAT_PER_WEEK = 24;
const UPKEEP_EMPTY_SEAT_MULTIPLIER = 0.5;

// INSTRUCTION, PER SECTION (Plan 15's PR D, its §3). It used to be
// `38 + 1.00 x coursesOffered` a week per enrolled student: every course a
// permanent tax on every student, so a 421-course school paid $459 a week
// a student in instruction and $2.70 in salaries, and instruction was 95%
// of expense. Three lines replace that one; this is the first.
//
// A course costs SECTION_COST a week for every SECTION_SIZE students
// enrolled in it. Per-course enrollment is read off the aggregate body —
// every student takes COURSES_PER_STUDENT at once, spread evenly across
// the catalogue — with no per-student state. A course that is offered
// runs at least one section, however few take it; and it runs at most
// the sections its seats hold — SEATS_PER_COURSE students each taking
// COURSES_PER_STUDENT courses, in sections of SECTION_SIZE (see
// instructionCapacity.ts; at the ceiling every section is exactly full)
// — so a small catalogue at a big school runs enormous sections cheaply
// — and crowds its students, which is what the crowding penalty and
// Plan 15's intake ceiling are for — while a big catalogue at a small
// school runs empty sections dearly. The RIGHT catalogue size for a given
// enrollment becomes a real question whose answer changes as the school
// grows. Fitted by PR G against the scorecard.
//
// AT MARKET RATE, LIKE SALARIES. A section at a top-20 school is taught,
// equipped and housed at what top-20 schools pay for those things, so the
// section cost and the services line carry the same prestige multiplier
// the payroll does (facultyData.ts's marketRateMultiplier). That is the
// one lever that makes the founding years viable AND the late game tight:
// a founding school at prestige 50 pays the base, a school at 130 pays
// two and a half times it per student, and tuition does not rise that
// fast. Fitted by PR G.
export const SECTION_SIZE = 40;               // students a section holds
export const SECTION_COST = 800;              // a week, a section, at prestige 50
export const COURSES_PER_STUDENT = 4;         // taken at once
const MAX_SECTIONS_PER_COURSE = (SEATS_PER_COURSE * COURSES_PER_STUDENT) / SECTION_SIZE;

// SERVICES, PER STUDENT: advising, the registrar, IT, grounds. A flat
// weekly cost every enrolled student carries, the line that makes the
// marginal student's profit thin — and, from PR E, the line crowding
// raises (see servicesMultiplier).
export const SERVICES_PER_STUDENT_PER_WEEK = 45; // at prestige 50

export interface InstructionDetail {
  courses: number;        // offered ('done')
  perCourse: number;      // students enrolled in each, off the aggregate body
  sectionsPerCourse: number;
  sections: number;       // courses x sectionsPerCourse
  fill: number;           // how full the sections run, 0..1 (1 = every seat taken)
  overflow: number;       // students beyond what the catalogue's sections seat — the crowding case
  cost: number;           // sections x SECTION_COST, a week
}

// The one computation of the instruction line, so the Treasury can say
// "421 courses in 842 sections of 40" off the same arithmetic the tick
// charges. Pure.
export function instructionDetail(s: GameState): InstructionDetail {
  const enrolled = totalEnrolled(s.students);
  const courses = s.tech.filter((t) => t.kind === 'course' && t.status === 'done').length;
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

// Faculty salaries and per-Buildable upkeep are not constants here: they
// are summed live off the roster (see facultyData.ts's facultySalary —
// salaries compound with tenure) and off every 'done' Buildable's own
// effects.upkeepPerWeek (courses and academic buildings in techData.ts,
// campus-life facilities in facilitiesData.ts). Both follow the live-read
// contract documented on BuildableEffects in state/types.ts.
//
// Student organisations are the third such line and follow the same
// contract without being Buildables at all: every club and Greek chapter
// on s.orgs carries its own upkeepPerWeek, sized in weeks of opex when the
// player approved it, and studentOrgUpkeep sums whatever is live THIS
// WEEK (see data/studentLifeData.ts). That is what makes disbanding a
// chapter genuinely remove its cost rather than leaving a baked total
// behind — there is no total anywhere to leave behind.

// =====================================================================
// GROUP 2 — REVENUE (all of it lagging, by construction)
// =====================================================================

// Tuition — each class at the price it was admitted under (see
// annualTuitionBilled) — is the main line and the slowest to react: a decision made this week shows up in
// revenue after the NEXT summer's funnel resolves.
//
// On top of it, a "reputation dividend" — donors, grants, brand value —
// scales with prestige, independent of enrollment. This is the simple
// stand-in for the future demand-curve model the
// docs/design/economy.mddescribes, and it is isolated to one line so that
// richer model can replace it later.
const REPUTATION_DIVIDEND_PER_POINT_PER_YEAR = 900;

// The endowment: a long-term reserve that now actually does something.
// It earns a market-ish return and pays a fixed fraction of itself into
// operating income every year (the classic endowment spend rate), so the
// late-game money sink below has a real, permanent payoff. Payout is
// deliberately below the return, so an untouched endowment still grows.
//
// It is NOT an insolvency backstop: there is no auto-draw, and a school
// in the red keeps the same modest payout it had the week before — enough
// to make a stalled run recoverable over time, never enough to rescue it
// from a bad year on its own.
const ENDOWMENT_ANNUAL_RETURN = 0.055;
const ENDOWMENT_PAYOUT_RATE = 0.040;

// =====================================================================
// GROUP 3 — ENDOWMENT CAMPAIGNS (the late-game money sink)
// The dorm chain and the facility chains both run out (see campusData.ts
// and facilitiesData.ts); the curriculum finishes. Without a sink, a
// mature school's surplus has nowhere to go and cash stops mattering
// exactly when the player finally has a lot of it. A campaign converts
// cash into endowment at a prestige-scaled donor match: it is repeatable
// forever, it gets more expensive every time, and what it buys is a
// permanent payout plus a (capped) prestige input — see
// prestigeSystem.ts's endowmentScore.
//
// Revealed, not gated: campaigns appear once the school is prestigious
// enough for donors to care, which is a threshold the growth loop already
// produces. It never competes with money as a throttle.
// =====================================================================
const ENDOWMENT_CAMPAIGN_BASE_COST = 2_000_000;
const ENDOWMENT_CAMPAIGN_COST_GROWTH = 1.45;  // each campaign costs 45% more than the last
const ENDOWMENT_CAMPAIGN_PRESTIGE_GATE = 60;  // donors show up once the school is somebody
// The donor match: every dollar committed brings in this much more from
// alumni and donors, scaling with prestige (a school nobody has heard of
// runs a bad campaign; a famous one runs a great one).
const ENDOWMENT_CAMPAIGN_BASE_MATCH = 0.25;
const ENDOWMENT_CAMPAIGN_PRESTIGE_MATCH = 0.75; // additional match at PRESTIGE_MATCH_REFERENCE prestige
const ENDOWMENT_CAMPAIGN_PRESTIGE_REFERENCE = 150; // same top of the scale prestigeSystem.ts clamps to
// Donor fatigue: each campaign's match is worth less than the last. This
// is what keeps a SINK a sink. Without it, cash -> endowment -> payout ->
// cash is a perpetual machine that eventually out-earns the university
// itself (an early fast-forward of this pass ended year 50 with a $76B
// endowment and an operating surplus that was mostly its own interest).
// With it the match decays toward nothing while the cost of the next
// campaign keeps climbing, so late campaigns are what they should be: an
// expensive, mostly one-way conversion of money into standing.
const ENDOWMENT_CAMPAIGN_MATCH_DECAY = 0.88;

// What a campaign costs and returns right now. Pure — the Treasury renders
// it and the reducer commits it, so the player is never shown a number
// different from the one they get.
export interface EndowmentCampaign {
  available: boolean;   // prestige gate cleared
  affordable: boolean;  // and the cash is actually there
  number: number;       // 1-indexed: which campaign this would be
  cost: number;         // cash committed
  match: number;        // donor match multiplier on that cash
  endowmentGain: number; // cost x (1 + match)
  annualPayout: number; // what that gain adds to income every year, forever
}

export function endowmentCampaign(s: GameState): EndowmentCampaign {
  const number = s.finance.endowmentCampaigns + 1;
  const cost = Math.round(
    ENDOWMENT_CAMPAIGN_BASE_COST * ENDOWMENT_CAMPAIGN_COST_GROWTH ** s.finance.endowmentCampaigns,
  );
  const match = (ENDOWMENT_CAMPAIGN_BASE_MATCH +
    ENDOWMENT_CAMPAIGN_PRESTIGE_MATCH * Math.max(0, s.self.reputation) / ENDOWMENT_CAMPAIGN_PRESTIGE_REFERENCE) *
    ENDOWMENT_CAMPAIGN_MATCH_DECAY ** s.finance.endowmentCampaigns;
  const endowmentGain = Math.round(cost * (1 + match));
  return {
    available: s.self.reputation >= ENDOWMENT_CAMPAIGN_PRESTIGE_GATE,
    affordable: s.finance.cash >= cost,
    number,
    cost,
    match,
    endowmentGain,
    annualPayout: endowmentGain * ENDOWMENT_PAYOUT_RATE,
  };
}

// =====================================================================
// The weekly cash flow
// =====================================================================

// Every line of the weekly cash flow, broken out. All figures are PER
// WEEK, the unit the sim actually runs on — annualizing is the reader's
// job (x WEEKS_PER_YEAR), never done here, so there is one set of numbers
// rather than two that can disagree.
export interface FinanceBreakdown {
  // income
  tuitionRevenue: number;      // every class at its own admission-year price (see annualTuitionBilled)
  prestigeRevenue: number;     // the reputation dividend: donors/grants/brand, independent of enrollment
  endowmentPayout: number;     // the endowment's annual spend rate, sliced into weeks
  totalIncome: number;
  // expenses
  weeklySalaries: number;      // the faculty payroll at market rate (see facultyData.ts's marketRateMultiplier), annualized salaries sliced into weeks
  seatUpkeep: number;          // capacity x UPKEEP_PER_SEAT_PER_WEEK — the physical plant, sized by beds not bodies
  instructionCost: number;     // sections x SECTION_COST — teaching the catalogue you have built, section by section (see instructionDetail)
  servicesCost: number;        // enrolled x SERVICES_PER_STUDENT_PER_WEEK x servicesMultiplier — advising, registrar, IT, grounds
  academicUpkeep: number;      // running the courses, academic buildings and labs that are done
  facilityUpkeep: number;      // running the dorms and campus-life facilities that are done
  studentLifeUpkeep: number;   // running the clubs and Greek chapters the player has recognised (see data/studentLifeData.ts)
  totalExpenses: number;
  net: number;                 // totalIncome - totalExpenses
}

// Sums effects.upkeepPerWeek across every 'done' Buildable whose kind the
// predicate accepts — the same live-read contract satisfactionSystem.ts
// and prestigeSystem.ts use for their own effect reads (see
// BuildableEffects in state/types.ts). Split into two displayed lines
// (academic vs. campus) purely so the Treasury can say WHICH half of the
// school is running up the bill; the engine charges their sum either way.
function upkeepFor(s: GameState, academic: boolean): number {
  return s.tech
    .filter((t) => t.status === 'done' && (t.kind === 'course' || t.kind === 'building') === academic)
    .reduce((sum, t) => sum + (t.effects?.upkeepPerWeek ?? 0), 0);
}

// The per-student weekly cost of instruction at the current catalogue
// size — a reading of the section model above, for the sim's affordability
// check and the Treasury's note. Zero for an empty campus.
export function instructionCostPerStudent(s: GameState): number {
  const enrolled = totalEnrolled(s.students);
  return enrolled <= 0 ? 0 : instructionDetail(s).cost / enrolled;
}

// The same reading with `extra` more courses offered, for a strategy asking
// whether the next course still pays (sim/balanceSim.ts).
export function instructionCostPerStudentWith(s: GameState, extra: number): number {
  const enrolled = totalEnrolled(s.students);
  if (enrolled <= 0) return 0;
  const courses = s.tech.filter((t) => t.kind === 'course' && t.status === 'done').length + extra;
  if (courses <= 0) return 0;
  const perCourse = (enrolled * COURSES_PER_STUDENT) / courses;
  const sectionsPerCourse = Math.max(1, Math.min(MAX_SECTIONS_PER_COURSE, Math.ceil(perCourse / SECTION_SIZE)));
  return (courses * sectionsPerCourse * SECTION_COST * marketRateMultiplier(s.self.reputation)) / enrolled;
}

// What crowding does to the services line (Plan 15's PR E): nothing up to
// SERVICES_CROWDING_FROM of instruction capacity, then rising linearly to
// 1 + SERVICES_CROWDING_AT_FULL at the ceiling and on past it, capped. A
// school at its ceiling is paying for it before it is over it. A campus
// with no seats at all reads the cap.
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

// A hire's pay THIS WEEK: the salary on the roster times the market rate
// the school's standing commands. Exported so the Faculty tab and the
// payroll lever read what the tick charges.
export function facultyPay(s: GameState, salary: number): number {
  return salary * marketRateMultiplier(s.self.reputation);
}

// What the school bills in tuition across a whole year: every class's own
// head count at its own price. FOUR products, not
// `enrolled x price` — each class pays what it was quoted at admission and
// carries that to graduation (see types.ts's tuitionByClass), so a school
// that has raised its price is collecting up to four different prices at
// once and there is no single per-student figure to multiply by.
//
// Exported because the Treasury shows the same four rows it sums here, and
// a second copy of this arithmetic in the UI is exactly how a displayed
// income statement starts disagreeing with what the tick charges.
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

// The single computation of the weekly cash flow. tickFinance applies it,
// weeklyNet reads its bottom line, and the Treasury renders it line by
// line as an income statement — so what the player is shown is exactly
// what is charged, with no second copy of any formula to drift out of
// sync. Pure: reads state, writes nothing.
export function financeBreakdown(s: GameState): FinanceBreakdown {
  const enrolled = totalEnrolled(s.students);
  const tuitionRevenue = annualTuitionBilled(s) / WEEKS_PER_YEAR;
  const prestigeRevenue = (s.self.reputation * REPUTATION_DIVIDEND_PER_POINT_PER_YEAR) / WEEKS_PER_YEAR;
  const endowmentPayout = (s.finance.endowment * ENDOWMENT_PAYOUT_RATE) / WEEKS_PER_YEAR;
  // SALARIES AT MARKET RATE (Plan 15's PR D): a top-20 school pays what
  // top-20 schools pay. The roster's salaries are the base; the school's
  // prestige tier multiplies them (facultyData.ts's marketRateMultiplier),
  // so payroll goes from under 1% of opex to a fifth of it, and "can I
  // afford this hire" is a question again after year five.
  const weeklySalaries = s.faculty.reduce((sum, f) => sum + facultyPay(s, f.salary), 0) / WEEKS_PER_YEAR;
  const filledSeats = Math.min(enrolled, s.students.capacity);
  const emptySeats = Math.max(s.students.capacity - filledSeats, 0);
  const seatUpkeep = (filledSeats + emptySeats * UPKEEP_EMPTY_SEAT_MULTIPLIER) * UPKEEP_PER_SEAT_PER_WEEK;
  const instructionCost = instructionDetail(s).cost;
  const servicesCost = enrolled * SERVICES_PER_STUDENT_PER_WEEK * marketRateMultiplier(s.self.reputation) * servicesMultiplier(s);
  const academicUpkeep = upkeepFor(s, true);
  const facilityUpkeep = upkeepFor(s, false);
  const studentLifeUpkeep = studentOrgUpkeep(s);

  // THREE income lines, and none of them is an appropriation. A public
  // school used to add a fourth — a flat state grant plus a per-student
  // allocation — which Plan 07's PR B retired along with the rest of the
  // founding fork. Every school now lives on what it charges, what its
  // standing attracts and what its endowment pays out.
  const totalIncome = tuitionRevenue + prestigeRevenue + endowmentPayout;
  const totalExpenses = weeklySalaries + seatUpkeep + instructionCost + servicesCost + academicUpkeep +
    facilityUpkeep + studentLifeUpkeep;

  return {
    tuitionRevenue,
    prestigeRevenue,
    endowmentPayout,
    totalIncome,
    weeklySalaries,
    seatUpkeep,
    instructionCost,
    servicesCost,
    academicUpkeep,
    facilityUpkeep,
    studentLifeUpkeep,
    totalExpenses,
    net: totalIncome - totalExpenses,
  };
}

// Net weekly cash flow at the current state, without mutating anything.
// Exported so the UI can show an accurate "this week's trend" figure
// without keeping a second copy of this formula that can drift out of
// sync with tickFinance below.
export function weeklyNet(s: GameState): number {
  return financeBreakdown(s).net;
}

// Recomputes operating costs and applies weekly cash flow.
// Pure: takes state, mutates a draft. (We use structural cloning in the reducer.)
export function tickFinance(s: GameState): void {
  const flow = financeBreakdown(s);
  s.finance.weeklyOpEx = flow.totalExpenses;
  s.finance.cash += flow.net;

  // The endowment compounds at its return rate net of the payout that was
  // just collected as income above. Cash is allowed to go negative HERE —
  // an operating deficit is the only thing that can do it, since a
  // purchase is refused outright when the money isn't there (see
  // canStartDevelopment in techSystem.ts). Per
  // docs/design/economy.mdpacing model that shortfall stalls new
  // development rather than ending the run, so there is deliberately no
  // auto-draw and no insolvency game-over.
  s.finance.endowment *= 1 + (ENDOWMENT_ANNUAL_RETURN - ENDOWMENT_PAYOUT_RATE) / WEEKS_PER_YEAR;
}

// ---------------------------------------------------------------------
// "Stall, don't die" — why no combination of bad decisions can produce an
// unrecoverable downward spiral, now that costs are tuned to lead revenue.
// Each of these is a property of a constant or a formula, not a special
// case, so none of them can be forgotten in a later balance pass:
//
//  1. Empty capacity self-mothballs (UPKEEP_EMPTY_SEAT_MULTIPLIER above),
//     so the cost of over-building is bounded and falls as the school
//     shrinks back toward the enrollment it can actually draw.
//  2. Instruction is charged per SECTION, and sections follow enrollment:
//     a shrinking school runs fewer of them, down to the one section a
//     course always runs. That floor — a catalogue's worth of single
//     sections — is the one fixed bill here, and it is the felt cost of a
//     catalogue bigger than the school (the "empty sections" case in
//     instructionDetail's note). What makes it recoverable is lever 4
//     below (move the price) plus firing faculty, both unconditional;
//     Plan 15's PR G fits the constants so the floor stalls and never
//     sinks.
//  3. Demand cannot collapse to zero: satisfaction is floored by
//     satisfactionSystem.ts's ATTRIBUTE_SCORE_FLOOR (so word of mouth
//     bottoms out around 0.63x, not 0), and prestige's biggest input,
//     curriculum breadth, is a monotone stock — courses already finished
//     never un-finish, so a school's floor prestige never falls back to a
//     founding school's.
//  4. Two zero-cost recovery levers are always available: the annual
//     tuition decision (a lower price widens the pool immediately — see
//     admissionsSystem.ts's price tolerance) and firing faculty, which is
//     the largest single line on the expense side.
//  5. The endowment pays out every week regardless of the operating
//     picture, so a stalled school still has a small, permanent income
//     floor to climb back from.
// ---------------------------------------------------------------------
