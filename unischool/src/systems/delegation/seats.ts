import type { Faculty, GameState, Seat } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';
import {
  DEANS_FOR_FASTEST, ESCALATION_WEEKS_OF_OPEX, SEATS, SEAT_SENIOR_YEARS, seatDef,
  type EventDomain, type PolicyRule, type SeatDef,
} from '../../data/seatData';
import { milestoneSchools, programs } from '../../data/techData';
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
  if (speed === 'quad' && !fasterAllowed(s)) return 'Appoint a Provost to run the year at four times.';
  if (speed === 'octo' && !fastestAllowed(s)) {
    return provostAppointed(s)
      ? `Appoint ${DEANS_FOR_FASTEST - deansAppointed(s)} more Dean${DEANS_FOR_FASTEST - deansAppointed(s) === 1 ? '' : 's'} to run the year at eight times.`
      : `Appoint a Provost and the Deans of ${DEANS_FOR_FASTEST} founded schools to run the year at eight times.`;
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
