// The administration (src/systems/delegation/seats.ts): seats filled from
// the faculty or from outside, paid for good at the market rate; each
// answers its domain's routine by policy and escalates the rest; together
// they open the top speeds.

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import {
  heldSeat, seatCandidates, seatPayroll, seatSlots, speedLock,
} from '../src/systems/delegation/seats';
import { DEANS_FOR_FASTEST, SEATS, SEAT_SENIOR_YEARS, seatDef } from '../src/data/seatData';
import { DECISION_EVENTS } from '../src/data/eventData';
import { financeBreakdown } from '../src/systems/finance/financeSystem';
import { schoolFoundedKey } from '../src/systems/techtree/schools';
import { milestoneSchools } from '../src/data/techData';
import { loadGame, saveGame } from '../src/state/persistence';
import { bindScriptStream } from '../src/engine/random';
import { EVENT_CATALOGUE } from '../src/data/eventCatalogue';
import type { CatalogueEvent } from '../src/data/eventCatalogueTypes';
import { seatAnswer } from '../src/systems/events/catalogueEngine';
import { WEEKS_PER_YEAR } from '../src/state/types';
import type { GameState } from '../src/state/types';

bindScriptStream(2828);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
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

console.log('seats tests');

function fresh(): GameState {
  const s = createInitialState('Seats');
  s.pendingInterrupt = null;
  s.finance.cash = 50_000_000;
  s.finance.weeklyOpEx = 1_000_000;
  return s;
}

// ---- The content ----
{
  assert(SEATS.length === 5 && SEATS.filter((d) => d.perSchool).length === 1, 'five seats, one of them a Dean per school');
  assert(SEATS.every((d) => d.internalSalary < d.outsideSalary), 'promoting from inside is always the cheaper way');
  assert(SEATS.every((d) => d.policies.length >= 2 && d.policies.some((p) => p.id === d.defaultPolicy)), 'every seat has a choice of policy, and a default among them');
  assert(DECISION_EVENTS.every((e) => ['academic', 'estate', 'students', 'advancement', 'board'].includes(e.domain)), 'every decision event names a domain');
  const covered = new Set(SEATS.map((d) => d.domain));
  assert(DECISION_EVENTS.filter((e) => e.domain !== 'board').every((e) => covered.has(e.domain as never)), 'and every domain but the board\'s has a seat');
}

// ---- Appointing ----
{
  let s = fresh();
  assert(seatSlots(s).every((slot) => slot.school === null), 'no school founded, no Dean\'s seat');
  const school = milestoneSchools()[0].schoolName;
  s.milestones[schoolFoundedKey(school)] = true;
  assert(seatSlots(s).some((slot) => slot.def.id === 'dean' && slot.school === school), 'a founded school has a Dean\'s seat');
  assert(seatCandidates(s, 'provost', null).length === 0, 'a new college has nobody senior enough');
  const prof = s.faculty[0];
  prof.tenureWeeks = SEAT_SENIOR_YEARS * WEEKS_PER_YEAR;
  assert(seatCandidates(s, 'provost', null).some((f) => f.id === prof.id), `${SEAT_SENIOR_YEARS} years on the roster makes a candidate`);
  const taught = Object.entries(s.courseFaculty).filter(([, id]) => id === prof.id).map(([course]) => course);
  const payroll = financeBreakdown(s).administration;
  assert(payroll === 0, 'no seats, no administration line');
  s = reducer(s, { type: 'APPOINT_SEAT', seatId: 'provost', school: null, facultyId: prof.id });
  const provost = heldSeat(s, 'provost', null);
  assert(provost !== undefined && provost.holder === prof.name && provost.internal, 'the professor becomes Provost');
  assert(!s.faculty.some((f) => f.id === prof.id), 'and leaves the roster');
  assert(taught.every((course) => s.courseFaculty[course] === undefined), 'their courses wait for a new instructor');
  assert(provost!.salary === seatDef('provost')!.internalSalary, 'at the internal salary');
  s = reducer(s, { type: 'APPOINT_SEAT', seatId: 'provost', school: null });
  assert(s.seats!.length === 1, 'a held seat cannot be filled twice');
  s = reducer(s, { type: 'APPOINT_SEAT', seatId: 'facilities', school: null });
  const facilities = heldSeat(s, 'facilities', null)!;
  assert(!facilities.internal && facilities.salary === seatDef('facilities')!.outsideSalary && facilities.holder.length > 0, 'an outside hire costs the outside salary, and has a name');
  assert(Math.abs(financeBreakdown(s).administration - seatPayroll(s)) < 1e-9 && seatPayroll(s) > 0, 'the payroll is a line in the weekly statement');
  const before = seatPayroll(s);
  s.self.reputation = 120;
  assert(seatPayroll(s) > before, 'paid at the market rate, which rises with prestige');
  s = reducer(s, { type: 'SET_SEAT_POLICY', seatId: 'facilities', school: null, policy: 'cheapest' });
  assert(heldSeat(s, 'facilities', null)!.policy === 'cheapest', 'a policy can be changed');
  s = reducer(s, { type: 'SET_SEAT_POLICY', seatId: 'facilities', school: null, policy: 'nonsense' });
  assert(heldSeat(s, 'facilities', null)!.policy === 'cheapest', 'but only to one the seat has');
}

// ---- The routine, by policy (the catalogue's inline events, Plan 32) ----
{
  const spend = (e: CatalogueEvent, id: string) => -(e.choices.find((c) => c.id === id)!.effects.cash ?? 0);
  // An estate event whose answers cost different sums.
  const leak = EVENT_CATALOGUE.find((e) => e.kind === 'inline' && e.domain === 'estate'
    && new Set(e.choices.map((c) => c.effects.cash ?? 0)).size === e.choices.length && e.choices.length >= 2)!;
  const s = fresh();
  assert(seatAnswer(s, leak, 1) === null, `with no Facilities Director "${leak.id}" reaches the president`);
  const s2 = reducer(s, { type: 'APPOINT_SEAT', seatId: 'facilities', school: null });
  const dearest = leak.choices.reduce((a, b) => (spend(leak, b.id) > spend(leak, a.id) ? b : a));
  const cheapest = leak.choices.reduce((a, b) => (spend(leak, b.id) < spend(leak, a.id) ? b : a));
  heldSeat(s2, 'facilities', null)!.policy = 'worst-first';
  assert(seatAnswer(s2, leak, 1) === dearest.id, `"worst first, properly" pays for the thorough answer (${seatAnswer(s2, leak, 1)})`);
  heldSeat(s2, 'facilities', null)!.policy = 'cheapest';
  assert(seatAnswer(s2, leak, 1) === cheapest.id, 'the cheapest fix takes the cheapest');
  s2.finance.weeklyOpEx = spend(leak, dearest.id) / 5;
  assert(seatAnswer(s2, leak, 1) === null, 'anything above four weeks of operating cost escalates');
  s2.finance.weeklyOpEx = 1_000_000;
  heldSeat(s2, 'facilities', null)!.policy = 'worst-first';
  s2.finance.cash = spend(leak, dearest.id) - 1;
  assert(spend(leak, dearest.id) <= 0 || seatAnswer(s2, leak, 1) === null, 'and so does a choice the college cannot pay for');
  assert(EVENT_CATALOGUE.filter((e) => e.domain === 'board').every((e) => seatAnswer(s2, e, 1) === null), 'the board\'s events are the president\'s own');
}

// ---- Speeds ----
{
  let s = fresh();
  assert(speedLock(s, 'real') === null && speedLock(s, 'double') === null, '1× and 2× are free');
  assert(speedLock(s, 'quad') !== null && speedLock(s, 'octo') !== null, '4× and 8× are not');
  s = reducer(s, { type: 'APPOINT_SEAT', seatId: 'provost', school: null });
  assert(speedLock(s, 'quad') === null && speedLock(s, 'octo') !== null, 'a Provost opens 4×');
  for (const { schoolName } of milestoneSchools().slice(0, DEANS_FOR_FASTEST)) {
    s.milestones[schoolFoundedKey(schoolName)] = true;
    s = reducer(s, { type: 'APPOINT_SEAT', seatId: 'dean', school: schoolName });
  }
  assert(speedLock(s, 'octo') === null, `and ${DEANS_FOR_FASTEST} Deans with it open 8×`);

  saveGame(s);
  assert(loadGame()?.seats?.length === 1 + DEANS_FOR_FASTEST, 'the seats save');
  s.seats![0].policy = 'gone';
  saveGame(s);
  assert(loadGame()?.seats?.length === DEANS_FOR_FASTEST, 'and a seat with a policy it does not have is dropped');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
