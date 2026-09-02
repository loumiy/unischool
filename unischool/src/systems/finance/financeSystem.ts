import type { GameState } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';
import { studentOrgUpkeep } from '../../data/studentLifeData';

// ---------------------------------------------------------------------
// This file is the game's primary throttle (see README's "Pacing model:
// money is the throttle"). Since the development-slot mechanic was
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

// Instruction: charged on ENROLLED students, and rising with the size of
// the catalogue being taught. A big curriculum is not free to run at
// scale — every extra course is another set of sections, and a school
// that has built out 200 courses spends far more per student than one
// running 40. This is what stops "more students" from being pure profit
// and what makes a tier-3 build-out felt on the very next tick, long
// before the prestige it earns has drifted anywhere.
//
// Per-student weekly cost = BASE + PER_COURSE_OFFERED x (courses done).
// At the founding catalogue (6 gen-ed courses) that is ~$44/wk (~$2.3k a
// year, against a founding net tuition around $15k); at a fully built
// 330-course catalogue it is ~$368/wk (~$19k a year, against a top-50
// school's net tuition around $45k). That is the taper made concrete: the
// margin per student stays positive at every stage — an extra student is
// never a loss, which is what keeps a stalled school recoverable — but it
// narrows as the catalogue grows, so the late game's enormous tuition
// line does not simply become free money.
const INSTRUCTION_PER_STUDENT_PER_WEEK = 38;
const INSTRUCTION_PER_STUDENT_PER_COURSE_OFFERED = 1.00;

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

// Tuition (player-set once a year via the summer admissions interrupt)
// times the class the funnel committed, net of financial aid, is the main
// line and the slowest to react: a decision made this week shows up in
// revenue after the NEXT summer's funnel resolves.
//
// On top of it, a "reputation dividend" — donors, grants, brand value —
// scales with prestige, independent of enrollment. This is the simple
// stand-in for the future demand-curve model the README describes, and it
// is isolated to one line so that richer model can replace it later.
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
  tuitionRevenue: number;      // enrolled x tuition, net of financial aid
  prestigeRevenue: number;     // the reputation dividend: donors/grants/brand, independent of enrollment
  endowmentPayout: number;     // the endowment's annual spend rate, sliced into weeks
  baselineFunding: number;     // school-type baseline: a flat appropriation plus a per-student one (0 for private)
  totalIncome: number;
  // expenses
  weeklySalaries: number;      // the faculty payroll, annualized salaries sliced into weeks
  seatUpkeep: number;          // capacity x UPKEEP_PER_SEAT_PER_WEEK — the physical plant, sized by beds not bodies
  instructionCost: number;     // enrolled x (base + per-course-offered) — teaching the catalogue you have built
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
// size. Exported so the Treasury can explain the line rather than just
// reporting it — one formula, no second copy to drift.
export function instructionCostPerStudent(s: GameState): number {
  const coursesOffered = s.tech.filter((t) => t.kind === 'course' && t.status === 'done').length;
  return INSTRUCTION_PER_STUDENT_PER_WEEK + INSTRUCTION_PER_STUDENT_PER_COURSE_OFFERED * coursesOffered;
}

// The single computation of the weekly cash flow. tickFinance applies it,
// weeklyNet reads its bottom line, and the Treasury renders it line by
// line as an income statement — so what the player is shown is exactly
// what is charged, with no second copy of any formula to drift out of
// sync. Pure: reads state, writes nothing.
export function financeBreakdown(s: GameState): FinanceBreakdown {
  const netTuitionPerStudent = s.finance.tuitionPerStudent * (1 - s.admissions.financialAidRate);
  const tuitionRevenue = (s.students.enrolled * netTuitionPerStudent) / WEEKS_PER_YEAR;
  const prestigeRevenue = (s.self.reputation * REPUTATION_DIVIDEND_PER_POINT_PER_YEAR) / WEEKS_PER_YEAR;
  const endowmentPayout = (s.finance.endowment * ENDOWMENT_PAYOUT_RATE) / WEEKS_PER_YEAR;
  // A public school's appropriation has two halves (see schoolTypeData.ts):
  // a flat institutional grant and a per-student allocation that grows
  // with the school. Both are 0 for a private school, so nothing here
  // branches on school type — it only reads the numbers founding set.
  const baselineFunding = s.finance.baselineFundingPerWeek +
    (s.students.enrolled * s.finance.appropriationPerStudentPerYear) / WEEKS_PER_YEAR;

  const weeklySalaries = s.faculty.reduce((sum, f) => sum + f.salary, 0) / WEEKS_PER_YEAR;
  const filledSeats = Math.min(s.students.enrolled, s.students.capacity);
  const emptySeats = Math.max(s.students.capacity - filledSeats, 0);
  const seatUpkeep = (filledSeats + emptySeats * UPKEEP_EMPTY_SEAT_MULTIPLIER) * UPKEEP_PER_SEAT_PER_WEEK;
  const instructionCost = s.students.enrolled * instructionCostPerStudent(s);
  const academicUpkeep = upkeepFor(s, true);
  const facilityUpkeep = upkeepFor(s, false);
  const studentLifeUpkeep = studentOrgUpkeep(s);

  const totalIncome = tuitionRevenue + prestigeRevenue + endowmentPayout + baselineFunding;
  const totalExpenses = weeklySalaries + seatUpkeep + instructionCost + academicUpkeep +
    facilityUpkeep + studentLifeUpkeep;

  return {
    tuitionRevenue,
    prestigeRevenue,
    endowmentPayout,
    baselineFunding,
    totalIncome,
    weeklySalaries,
    seatUpkeep,
    instructionCost,
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
  // canStartDevelopment in techSystem.ts). Per README's pacing model that
  // shortfall stalls new development rather than ending the run, so there
  // is deliberately no auto-draw and no insolvency game-over.
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
//  2. Instruction is charged per ENROLLED student, never per bed, and
//     always below the net tuition a student pays at any sane price — so
//     an extra student is never a loss, and the enrollment side of the
//     loop can only ever dig the school out, never further in.
//  3. Demand cannot collapse to zero: satisfaction is floored by
//     satisfactionSystem.ts's ATTRIBUTE_SCORE_FLOOR (so word of mouth
//     bottoms out around 0.63x, not 0), and prestige's biggest input,
//     curriculum breadth, is a monotone stock — courses already finished
//     never un-finish, so a school's floor prestige never falls back to a
//     founding school's.
//  4. Two zero-cost recovery levers are always available: the annual
//     tuition/aid decision (a lower net price widens the pool
//     immediately — see admissionsSystem.ts's price tolerance) and firing
//     faculty, which is the largest single line on the expense side.
//  5. The endowment pays out every week regardless of the operating
//     picture, so a stalled school still has a small, permanent income
//     floor to climb back from.
// ---------------------------------------------------------------------
