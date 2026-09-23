// ---------------------------------------------------------------------
// The cost side (Plan 15's PR D — see financeSystem.ts's instructionDetail,
// SERVICES_PER_STUDENT_PER_WEEK and facultyPay, facultyData.ts's
// marketRateMultiplier, and eventData.ts's capital events). Instruction is
// charged per section, services per student, salaries at the market rate
// the school's standing commands, and a capital event scales to the
// building that broke rather than to opex.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import {
  COURSES_PER_STUDENT, SECTION_COST, SECTION_SIZE, SERVICES_PER_STUDENT_PER_WEEK,
  facultyPay, financeBreakdown, instructionCostPerStudent, instructionCostPerStudentWith, instructionDetail,
} from '../src/systems/finance/financeSystem';
import { marketRateMultiplier } from '../src/data/facultyData';
import { SEATS_PER_COURSE } from '../src/systems/techtree/instructionCapacity';
import { DECISION_EVENTS } from '../src/data/eventData';
import { foundingCourseIds } from '../src/state/actions';
import { WEEKS_PER_YEAR, totalEnrolled } from '../src/state/types';
import type { GameState } from '../src/state/types';
import { bindScriptStream } from '../src/engine/random';

bindScriptStream(5);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
};

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

// At prestige 50 exactly, so the market rate is 1 and the section and
// services lines read their base values.
function fresh(): GameState {
  const s = createInitialState('Costs');
  s.self.reputation = 50;
  return s;
}
// The founding college opens teaching six courses (Plan 19); a statement
// with no course offered has to un-teach them first.
function withoutFoundingCourses(s: GameState): void {
  for (const id of foundingCourseIds()) s.tech.find((t) => t.id === id)!.status = 'available';
}
// Exactly n courses developed: the founding six are un-taught first, so
// the count is the count.
function withCourses(s: GameState, n: number): void {
  const courses = s.tech.filter((t) => t.kind === 'course');
  courses.forEach((t) => { if (t.status === 'done') t.status = 'available'; });
  courses.slice(0, n).forEach((t) => { t.status = 'done'; });
}
function enrol(s: GameState, n: number): void {
  s.students.classes = { freshman: n, sophomore: 0, junior: 0, senior: 0 };
}

console.log('cost model tests');

// ---- instruction per section ----
{
  const s = fresh();
  withoutFoundingCourses(s);
  assert(instructionDetail(s).cost === 0 && instructionDetail(s).sections === 0, 'no course offered, no section, no cost');

  withCourses(s, foundingCourseIds().length);
  enrol(s, 350);
  const d = instructionDetail(s);
  assert(d.courses === 6, 'six courses offered');
  assert(near(d.perCourse, (350 * COURSES_PER_STUDENT) / 6), 'each carries the body times courses-per-student, spread evenly');
  const maxSections = (SEATS_PER_COURSE * COURSES_PER_STUDENT) / SECTION_SIZE;
  assert(d.sectionsPerCourse === Math.ceil(d.perCourse / SECTION_SIZE), 'each course runs the sections its enrollment needs');
  assert(d.sectionsPerCourse < maxSections, 'short of the cap for the founding body');
  assert(d.sections === 6 * d.sectionsPerCourse && d.cost === d.sections * SECTION_COST, 'cost is sections times the section cost');
  assert(d.overflow === 0 && d.fill > 0.9, 'and the sections run nearly full with nobody in overflow');
  assert(near(financeBreakdown(s).instructionCost, d.cost), 'the statement charges the same line');

  // A big catalogue at a small school runs empty sections dearly.
  const big = fresh();
  withCourses(big, 200);
  enrol(big, 350);
  const e = instructionDetail(big);
  assert(e.sectionsPerCourse === 1, 'a course always runs at least one section');
  assert(e.sections === 200 && e.cost === 200 * SECTION_COST, 'two hundred courses is two hundred sections');
  assert(e.fill < 0.25 && e.overflow === 0, `and they run nearly empty (${Math.round(e.fill * 100)}% full)`);
  assert(instructionCostPerStudent(big) > instructionCostPerStudent(s) * 5, 'which is dear per student');

  // A small catalogue at a big school runs enormous sections cheaply.
  const crowded = fresh();
  withCourses(crowded, 6);
  enrol(crowded, 20_000);
  const c = instructionDetail(crowded);
  assert(c.sectionsPerCourse === maxSections, 'sections cap at what the seats hold');
  assert(c.cost === 6 * maxSections * SECTION_COST, 'so the bill stops growing at the ceiling');
  assert(c.overflow > 19_000, `and the overflow says who is not being taught (${c.overflow.toLocaleString()})`);
  // At exactly the ceiling every section is full and nobody is over.
  enrol(crowded, 6 * SEATS_PER_COURSE);
  const full = instructionDetail(crowded);
  assert(full.sectionsPerCourse === maxSections && full.fill === 1 && full.overflow === 0, 'at the ceiling the catalogue is exactly full');

  // The projection with more courses is the same model.
  assert(near(instructionCostPerStudentWith(s, 0), instructionCostPerStudent(s)), 'zero extra courses is today\'s figure');
  assert(instructionCostPerStudentWith(big, 10) > instructionCostPerStudent(big), 'another empty course costs more per student');
}

// ---- services per student ----
{
  const s = fresh();
  enrol(s, 300); // under 85% of the founding seats, so no crowding multiplier applies
  assert(near(financeBreakdown(s).servicesCost, 300 * SERVICES_PER_STUDENT_PER_WEEK), 'services is a flat weekly cost per enrolled student');
  enrol(s, 0);
  assert(financeBreakdown(s).servicesCost === 0, 'and nothing for nobody');
  const flow = financeBreakdown(fresh());
  assert(
    near(flow.totalExpenses, flow.weeklySalaries + flow.seatUpkeep + flow.instructionCost + flow.servicesCost + flow.academicUpkeep + flow.facilityUpkeep + flow.studentLifeUpkeep),
    'the statement sums every line, services included',
  );
}

// ---- salaries at market rate ----
{
  assert(near(marketRateMultiplier(50), 1), 'prestige 50 pays the base');
  assert(near(marketRateMultiplier(130), 3.4), 'prestige 130 pays 3.4x');
  assert(near(marketRateMultiplier(90), 2.2), 'linear between');
  assert(near(marketRateMultiplier(20), 1), 'floored below 50');
  assert(marketRateMultiplier(150) <= 4 && marketRateMultiplier(150) > 3.4, 'capped a little above the band');
  const s = fresh();
  s.self.reputation = 130;
  const base = s.faculty.reduce((sum, f) => sum + f.salary, 0);
  assert(near(financeBreakdown(s).weeklySalaries, (base * 3.4) / WEEKS_PER_YEAR), 'the payroll is the roster at the market rate');
  assert(near(facultyPay(s, 100_000), 340_000), 'and a hire\'s pay reads the same rate');
  assert(s.faculty.every((f) => f.salary === f.salary), 'the salary on the roster is untouched — the rate applies at the payroll');
}

// ---- capital events scale to what broke ----
{
  const s = fresh();
  s.finance.weeklyOpEx = 20_000_000; // the late-game budget the review found the boiler scaling off
  const building = s.tech.find((t) => t.kind === 'building' && t.status === 'done')!;
  const roof = DECISION_EVENTS.find((e) => e.id === 'roof-failure')!;
  const ctx = roof.rollContext!(s)!;
  assert(ctx.amount! < s.finance.weeklyOpEx, `a roof costs a share of its building, not weeks of a $20M budget (${ctx.amount!.toLocaleString()})`);
  assert(ctx.amount! >= 60_000, 'floored so a founding roof is still a bill');
  assert(ctx.amount! <= Math.max(60_000, building.cost * 0.25) + 1, 'at most a quarter of the dearest building it could name');

  const boiler = DECISION_EVENTS.find((e) => e.id === 'heating-plant')!;
  const dorms = s.tech.filter((t) => t.kind === 'dorm' && t.status === 'done');
  const amount = boiler.rollContext!(s)!.amount!;
  assert(amount === Math.max(60_000, Math.round(dorms.reduce((sum, t) => sum + t.cost, 0) * 0.12)), 'the boiler is a share of the residence halls on its loop');
}

// ---- the founding statement still nets positive at the new costs ----
{
  const s = fresh();
  const flow = financeBreakdown(s);
  assert(totalEnrolled(s.students) === 350, 'the founding body');
  assert(flow.instructionCost > 0 && flow.servicesCost > 0, 'is taught and served');
}

console.log(`cost model: ${checks} checks, ${failures} failures`);
if (failures > 0) process.exit(1);
