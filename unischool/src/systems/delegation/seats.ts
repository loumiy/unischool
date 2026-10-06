import type { Buildable, Faculty, GameState, Seat } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';
import {
  DEANS_FOR_FASTEST, ESCALATION_WEEKS_OF_OPEX, SEATS, SEAT_SENIOR_YEARS, seatDef,
  type EventDomain, type PolicyRule, type SeatDef,
} from '../../data/seatData';
import { milestoneSchools, programById, programOfCourse, programs } from '../../data/techData';
import { lettersBetter, type CourseQuality, type Grade } from '../../data/courseQuality';
import { facultyLoads, instructorQuality, projectedQuality } from '../faculty/facultyAssignment';
import { effectiveCourseSlots } from '../techtree/techSystem';
import { isInTransit } from '../techtree/programOffers';
import { marketRateMultiplier, rollCoachName } from '../../data/facultyData';
import { weeksOfOpEx } from '../../data/moneyScale';
import { isSchoolFounded } from '../techtree/schools';
import { leaveFaculty } from '../faculty/facultySystem';
import { random } from '../../engine/random';
import type { DecisionEvent, DecisionEventContext } from '../../data/eventData';
import { offeredChoices } from '../../data/eventData';

// DELEGATION (Plan 28, from v2's seats.ts). A seat is filled once and paid
// for for good. It buys the routine of its domain answered without the
// president, and the top speeds; it costs a permanent salary, which is the
// administrative ratchet: seats accumulate, and nothing takes one away.

export function seatsOf(s: GameState): readonly Seat[] {
  return s.seats ?? [];
}

export function heldSeat(s: GameState, seatId: string, school: string | null): Seat | undefined {
  return seatsOf(s).find((x) => x.seatId === seatId && x.school === school);
}

// Every seat the college could fill now: the standing ones, and a Dean for
// each school it has founded.
export function seatSlots(s: GameState): { def: SeatDef; school: string | null }[] {
  const out: { def: SeatDef; school: string | null }[] = [];
  for (const def of SEATS) {
    if (!def.perSchool) out.push({ def, school: null });
    else for (const { schoolName } of milestoneSchools()) if (isSchoolFounded(s, schoolName)) out.push({ def, school: schoolName });
  }
  return out;
}

// The school a faculty field teaches in.
const FIELD_SCHOOLS = new Map<string, Set<string>>();
for (const p of programs()) {
  if (p.field === null) continue;
  if (!FIELD_SCHOOLS.has(p.field)) FIELD_SCHOOLS.set(p.field, new Set());
  FIELD_SCHOOLS.get(p.field)!.add(p.school);
}

// Who could take a seat from inside: professors five years on the roster,
// and for a Dean only those of that school's fields. Best record first.
export function seatCandidates(s: GameState, seatId: string, school: string | null): Faculty[] {
  const def = seatDef(seatId);
  if (!def) return [];
  return s.faculty
    .filter((f) => f.tenureWeeks >= SEAT_SENIOR_YEARS * WEEKS_PER_YEAR)
    .filter((f) => !def.perSchool || (school !== null && (FIELD_SCHOOLS.get(f.field)?.has(school) ?? false)))
    .sort((a, b) => b.teaching + b.research - (a.teaching + a.research) || a.id.localeCompare(b.id));
}

export function canAppoint(s: GameState, seatId: string, school: string | null, facultyId?: string): boolean {
  if (!seatSlots(s).some((slot) => slot.def.id === seatId && slot.school === school)) return false;
  if (heldSeat(s, seatId, school)) return false;
  return facultyId === undefined || seatCandidates(s, seatId, school).some((f) => f.id === facultyId);
}

// Fills a seat. From inside, the professor leaves teaching for good: their
// courses wait for a new instructor, as when anyone leaves.
export function appointSeat(s: GameState, seatId: string, school: string | null, facultyId?: string): boolean {
  const def = seatDef(seatId);
  if (!def || !canAppoint(s, seatId, school, facultyId)) return false;
  const title = seatTitle(def, school);
  let holder: string;
  if (facultyId !== undefined) {
    const f = s.faculty.find((x) => x.id === facultyId)!;
    holder = f.name;
    const orphaned = leaveFaculty(s, f);
    s.log.unshift({
      year: s.clock.year, week: s.clock.week, kind: 'info', topic: 'departure', subject: f.id,
      message: `${f.name} leaves the classroom to become ${title}.${orphaned.length > 0 ? ` ${orphaned.length} ${orphaned.length === 1 ? 'course waits' : 'courses wait'} for a new instructor in ${f.field}.` : ''}`,
    });
  } else {
    const inUse = new Set([...s.faculty.map((f) => f.name), ...seatsOf(s).map((x) => x.holder)]);
    holder = rollCoachName(random() < 0.5 ? 'female' : 'male', inUse).name;
    s.log.unshift({
      year: s.clock.year, week: s.clock.week, kind: 'info',
      message: `${holder} arrives from outside as ${title}.`,
    });
  }
  (s.seats ??= []).push({
    seatId, school, holder, internal: facultyId !== undefined,
    policy: def.defaultPolicy,
    salary: facultyId !== undefined ? def.internalSalary : def.outsideSalary,
    appointedYear: s.clock.year,
  });
  return true;
}

export function setSeatPolicy(s: GameState, seatId: string, school: string | null, policy: string): void {
  const seat = heldSeat(s, seatId, school);
  const def = seatDef(seatId);
  if (seat && def?.policies.some((p) => p.id === policy)) seat.policy = policy;
}

export function seatTitle(def: SeatDef, school: string | null): string {
  return def.perSchool && school ? `${def.title} of ${school}` : def.title;
}

// ---- What it costs: the ratchet ----

// The seats' salaries, a week, at the market rate prestige sets (as the
// faculty's are paid: financeSystem.ts's facultyPay).
export function seatPayroll(s: GameState): number {
  const annual = seatsOf(s).reduce((t, x) => t + x.salary, 0);
  return (annual * marketRateMultiplier(s.self.reputation)) / WEEKS_PER_YEAR;
}

// ---- What it buys: the speeds ----

export function provostAppointed(s: GameState): boolean {
  return heldSeat(s, 'provost', null) !== undefined;
}

export function deansAppointed(s: GameState): number {
  return seatsOf(s).filter((x) => x.seatId === 'dean').length;
}

export function fasterAllowed(s: GameState): boolean {
  return provostAppointed(s);
}

export function fastestAllowed(s: GameState): boolean {
  return provostAppointed(s) && deansAppointed(s) >= DEANS_FOR_FASTEST;
}

// Why a speed is closed, or null when it is open: 4× needs a Provost and 8×
// a Provost and three Deans (V2 #5). Every other speed is free.
export function speedLock(s: GameState, speed: string): string | null {
  if (speed === 'quad' && !fasterAllowed(s)) return 'Appoint a Provost to open game speed 4×.';
  if (speed === 'octo' && !fastestAllowed(s)) {
    return provostAppointed(s)
      ? `Appoint ${DEANS_FOR_FASTEST - deansAppointed(s)} more Dean${DEANS_FOR_FASTEST - deansAppointed(s) === 1 ? '' : 's'} to open game speed 8×.`
      : `Appoint a Provost and the Deans of ${DEANS_FOR_FASTEST} founded schools to open game speed 8×.`;
  }
  return null;
}

// ---- What it buys: the routine ----

// The seat that answers a domain: its standing seat, or for the academic
// side the Provost first and any Dean after.
export function handlerFor(s: GameState, domain: EventDomain): Seat | undefined {
  if (domain === 'board') return undefined;
  const held = seatsOf(s).filter((x) => seatDef(x.seatId)?.domain === domain);
  return held.find((x) => x.school === null) ?? held[0];
}

// The choice a rule takes among those offered: by what each spends, and
// for the popular rule by how it lands (DecisionChoice.mood), ties to the
// cheaper. Ties otherwise keep the authored order.
function choiceByRule(s: GameState, event: DecisionEvent, ctx: DecisionEventContext, rule: PolicyRule): string {
  const choices = offeredChoices(s, event, ctx);
  const spend = (i: number) => choices[i].cost(s, ctx);
  const mood = (i: number) => choices[i].mood ?? 0;
  let best = 0;
  for (let i = 1; i < choices.length; i++) {
    const better = rule === 'thrifty'
      ? spend(i) < spend(best)
      : rule === 'thorough'
        ? spend(i) > spend(best)
        : mood(i) > mood(best) || (mood(i) === mood(best) && spend(i) < spend(best));
    if (better) best = i;
  }
  return choices[best].id;
}

// Whether a routine event would reach the president anyway: a board event,
// one no seat covers, or one that moves more than the escalation line.
export function escalates(s: GameState, event: DecisionEvent, ctx: DecisionEventContext): boolean {
  if (!handlerFor(s, event.domain)) return true;
  const most = Math.max(0, ...offeredChoices(s, event, ctx).map((c) => c.cost(s, ctx)));
  return most > weeksOfOpEx(s, ESCALATION_WEEKS_OF_OPEX);
}

export function policyChoice(s: GameState, event: DecisionEvent, ctx: DecisionEventContext): { seat: Seat; choiceId: string } | null {
  if (escalates(s, event, ctx)) return null;
  const seat = handlerFor(s, event.domain)!;
  const def = seatDef(seat.seatId)!;
  const policy = def.policies.find((p) => p.id === seat.policy) ?? def.policies[0];
  const choiceId = choiceByRule(s, event, ctx, policy.rule);
  const choice = offeredChoices(s, event, ctx).find((c) => c.id === choiceId)!;
  // A choice the college cannot pay for goes to the president.
  if (choice.cost(s, ctx) > s.finance.cash) return null;
  return { seat, choiceId };
}

// Answers a routine event by policy, as RESOLVE_DECISION_EVENT would, and
// logs who did. False when it reaches the president instead.
export function delegate(s: GameState, event: DecisionEvent, ctx: DecisionEventContext): boolean {
  const answer = policyChoice(s, event, ctx);
  if (!answer) return false;
  const choice = offeredChoices(s, event, ctx).find((c) => c.id === answer.choiceId)!;
  s.finance.cash -= choice.cost(s, ctx);
  const entry = choice.apply(s, ctx);
  const def = seatDef(answer.seat.seatId)!;
  s.log.unshift({ ...entry, message: `${seatTitle(def, answer.seat.school)} ${answer.seat.holder} handled "${event.title}": ${entry.message}` });
  return true;
}

// ---- What it buys: the teaching (Plan 95S, the second review's B4-5) ----

// The seats that staff the courses now: the Provost when it holds the
// teaching policy; with no Provost, each Dean that holds it, for its own
// school (as the Deans take the academic routine when there is no Provost).
export function staffingSeats(s: GameState): Seat[] {
  const staffs = (x: Seat) => seatDef(x.seatId)?.policies.find((p) => p.id === x.policy)?.staffs === true;
  const provost = heldSeat(s, 'provost', null);
  if (provost) return staffs(provost) ? [provost] : [];
  return seatsOf(s).filter((x) => x.seatId === 'dean' && staffs(x));
}

// The school a course is taught in: its program's (a graduate program's
// home school).
function schoolOfCourse(courseId: string): string | undefined {
  const programId = programOfCourse(courseId);
  return programId !== undefined ? programById(programId)?.school : undefined;
}

// Whether a seat staffs this course. The harness's players leave such a
// course to the seat rather than swap its instructor themselves.
export function staffingCovers(s: GameState, t: Buildable): boolean {
  if (!t.requiresFaculty) return false;
  return staffingSeats(s).some((seat) => seat.school === null || schoolOfCourse(t.id) === seat.school);
}

export interface StaffingMove { courseId: string; facultyId: string; from: Grade; to: Grade }

// Staff for the A: for each course below A in the seat's scope, weakest
// first, the best free instructor in its field (teaching under their course
// slots) takes it over when they would teach it a full letter or more
// better, so the seat does not churn. At most one move a course a week; it
// never hires and never dismisses. A course in a program between halls
// keeps its instructor, as REASSIGN_COURSE_FACULTY refuses it.
export function staffForTheA(s: GameState, school: string | null): StaffingMove[] {
  const loads = new Map(facultyLoads(s));
  const weak = s.tech
    .filter((t) => t.requiresFaculty && (school === null || schoolOfCourse(t.id) === school))
    .filter((t) => {
      const programId = programOfCourse(t.id);
      return programId === undefined || !isInTransit(s, programId);
    })
    .map((t) => ({ t, q: instructorQuality(s, t, loads) }))
    .filter((x): x is { t: Buildable; q: CourseQuality } => x.q !== null && x.q.grade !== 'A')
    .sort((a, b) => a.q.score - b.q.score);
  const moves: StaffingMove[] = [];
  for (const { t } of weak) {
    // Read again: an earlier move this week may have lightened its teacher.
    const now = instructorQuality(s, t, loads);
    const current = s.courseFaculty[t.id];
    if (!now || now.grade === 'A' || !current) continue;
    let best: { f: Faculty; q: CourseQuality } | null = null;
    for (const f of s.faculty) {
      if (f.field !== t.requiresFaculty || f.id === current) continue;
      if ((loads.get(f.id) ?? 0) >= effectiveCourseSlots(s, f)) continue;
      const q = projectedQuality(s, t, f, loads);
      if (!best || q.score > best.q.score) best = { f, q };
    }
    if (!best || lettersBetter(now.grade, best.q.grade) < 1) continue;
    s.courseFaculty[t.id] = best.f.id;
    loads.set(current, (loads.get(current) ?? 1) - 1);
    loads.set(best.f.id, (loads.get(best.f.id) ?? 0) + 1);
    moves.push({ courseId: t.id, facultyId: best.f.id, from: now.grade, to: best.q.grade });
  }
  return moves;
}

// How many moves a week's line names before it counts the rest.
const STAFFING_NAMED = 3;

// The week's staffing, after the faculty's week (reducer.ts's SYSTEMS):
// each staffing seat's moves, logged as one line.
export function tickStaffing(s: GameState): void {
  for (const seat of staffingSeats(s)) {
    const moves = staffForTheA(s, seat.school);
    if (moves.length === 0) continue;
    const named = moves.slice(0, STAFFING_NAMED).map((m) => {
      const who = s.faculty.find((f) => f.id === m.facultyId)?.name ?? 'a professor';
      const code = s.tech.find((t) => t.id === m.courseId)?.name.split(' · ')[0] ?? m.courseId;
      return `${who} onto ${code} (${m.from} to ${m.to})`;
    });
    const rest = moves.length - named.length;
    const list = rest > 0
      ? `${named.join(', ')}, and ${rest} more onto ${rest === 1 ? 'a course' : 'courses'} below A`
      : named.length > 1 ? `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}` : named[0];
    s.log.unshift({
      year: s.clock.year, week: s.clock.week, kind: 'info',
      message: `${seatTitle(seatDef(seat.seatId)!, seat.school)} ${seat.holder} moved ${list}.`,
    });
  }
}
