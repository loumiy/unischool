// Calling off and pulling down (Plan 39, src/state/demolition.ts):
// a building under construction called off returns its cost to where it was
// paid from, settles its loan and clears its site; a standing building
// demolished costs nothing, returns nothing, takes back a dorm's beds and
// goes back into the catalog as it first was. Founders Hall, a historic
// building and a hall with programs in it stay up.

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { firstFreeSpot, footprintOf } from '../src/state/campusMap';
import { bindScriptStream } from '../src/engine/random';
import { tickTech } from '../src/systems/techtree/techSystem';
import { debtOutstanding } from '../src/systems/finance/treasury';
import { endowmentHalf } from '../src/systems/estate/projects';
import { canCancelConstruction, demolitionBlock } from '../src/state/demolition';
import { FOUNDERS_HALL_ID } from '../src/data/techData';
import type { Buildable, GameState } from '../src/state/types';

bindScriptStream(3939);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('demolition tests');

const fresh = () => {
  const s = createInitialState('Demolition');
  s.pendingInterrupt = null;
  return s;
};
const node = (s: GameState, id: string) => s.tech.find((t) => t.id === id)!;
const place = (s: GameState, t: Buildable, how: { borrow?: boolean; gift?: boolean; endowment?: boolean } = {}) => {
  const spot = firstFreeSpot(s, t, footprintOf(t))!;
  return reducer(s, { type: 'PLACE_BUILDABLE', buildableId: t.id, row: spot.row, col: spot.col, rotated: false, ...how });
};
const finish = (s: GameState, id: string) => {
  s.developing[id] = 1;
  tickTech(s);
  return s;
};
const facility = (s: GameState) => {
  const t = s.tech.find((x) => x.kind === 'facility' && x.cost >= 5_000_000 && !x.requiresFaculty && !x.project)!;
  t.status = 'available';
  return t;
};

// ---- Calling off, paid in cash ----
{
  let s = fresh();
  const t = facility(s);
  s.finance.cash = t.cost + 1_000;
  s = place(s, t);
  assert(node(s, t.id).status === 'developing' && s.placements[t.id] !== undefined, 'a building placed is going up on its site');
  assert(canCancelConstruction(s, node(s, t.id)), 'and can be called off');
  const cash = s.finance.cash;
  s = reducer(s, { type: 'CANCEL_CONSTRUCTION', id: t.id });
  assert(s.finance.cash === cash + t.cost, 'calling it off returns its cost');
  assert(node(s, t.id).status === 'available' && s.developing[t.id] === undefined && s.placements[t.id] === undefined, 'clears its site and puts it back in the catalog');
  assert(s.log[0].message.includes('called off'), 'and says so');
  s = reducer(s, { type: 'CANCEL_CONSTRUCTION', id: t.id });
  assert(s.finance.cash === cash + t.cost, 'a second call-off returns nothing more');
}

// ---- Calling off, borrowed for ----
{
  let s = fresh();
  const t = facility(s);
  s.finance.endowment = 10_000_000;
  s.finance.cash = t.cost - 500_000;
  s = place(s, t, { borrow: true });
  assert(node(s, t.id).financing === 'loan' && debtOutstanding(s) === 500_000, 'a building borrowed for records it');
  s = reducer(s, { type: 'CANCEL_CONSTRUCTION', id: t.id });
  assert(s.finance.cash === t.cost - 500_000 && debtOutstanding(s) === 0 && s.finance.loans === undefined, 'called off, the loan is settled out of the refund and the cash is as it was');
  assert(node(s, t.id).financing === undefined, 'and the record goes');
}

// ---- Calling off, from the building fund ----
{
  let s = fresh();
  const t = facility(s);
  s.finance.cash = 10;
  s.advancement = { running: null, closed: [], restrictedBuilding: t.cost + 1 };
  s = place(s, t, { gift: true });
  s = reducer(s, { type: 'CANCEL_CONSTRUCTION', id: t.id });
  assert(s.advancement!.restrictedBuilding === t.cost + 1 && s.finance.cash === 10, 'gifts go back to the building fund, not into cash');
}

// ---- Calling off, half from the endowment ----
{
  let s = fresh();
  const t = s.tech.find((x) => x.project !== undefined)!;
  t.status = 'available';
  s.finance.cash = t.cost;
  s.finance.endowment = t.cost * 10;
  const endowment = s.finance.endowment;
  s = place(s, t, { endowment: true });
  const started = node(s, t.id).status === 'developing';
  assert(started, 'a capital project can start half from the endowment');
  assert(!started || node(s, t.id).financing === 'endowment', 'a capital project paid half from the endowment records it');
  if (started) {
    s = reducer(s, { type: 'CANCEL_CONSTRUCTION', id: t.id });
    assert(s.finance.endowment === endowment && s.finance.cash === t.cost, `the endowment's half (${endowmentHalf(t)}) goes back to the endowment and the rest to cash`);
  }
}

// ---- Finishing clears the record ----
{
  let s = fresh();
  const t = facility(s);
  s.finance.endowment = 10_000_000;
  s.finance.cash = t.cost - 500_000;
  s = finish(place(s, t, { borrow: true }), t.id);
  assert(node(s, t.id).status === 'done' && node(s, t.id).financing === undefined, 'a finished building keeps no record of how it was paid');
  assert(!canCancelConstruction(s, node(s, t.id)), 'and cannot be called off');
}

// ---- Demolishing ----
{
  let s = fresh();
  assert(demolitionBlock(s, node(s, FOUNDERS_HALL_ID)) !== null, 'Founders Hall stays up');
  s = reducer(s, { type: 'DEMOLISH_BUILDING', id: FOUNDERS_HALL_ID });
  assert(s.placements[FOUNDERS_HALL_ID] !== undefined && node(s, FOUNDERS_HALL_ID).status === 'done', 'even when asked');

  const t = facility(s);
  s.finance.cash = t.cost * 2;
  s = finish(place(s, t), t.id);
  node(s, t.id).backlog = 12_345;
  assert(demolitionBlock(s, node(s, t.id)) === null, 'a standing facility can come down');
  const cash = s.finance.cash;
  s = reducer(s, { type: 'DEMOLISH_BUILDING', id: t.id });
  const after = node(s, t.id);
  assert(s.finance.cash === cash, 'free, and with nothing back');
  assert(after.status === 'available' && s.placements[t.id] === undefined, 'its site cleared and it is in the catalog again');
  assert(after.backlog === undefined && after.builtYear === undefined, 'as it first was');
  assert(s.log[0].message.includes('demolished'), 'and the log says so');

  const historic = facility(s);
  s.finance.cash = historic.cost * 2;
  s = finish(place(s, historic), historic.id);
  node(s, historic.id).historic = true;
  assert(demolitionBlock(s, node(s, historic.id)) !== null, 'a historic building stays up');
}

// ---- A dorm's beds ----
{
  let s = fresh();
  const dorm = s.tech.find((x) => x.kind === 'dorm' && x.status === 'available' && (x.effects?.capacityBonus ?? 0) > 0);
  if (dorm) {
    s.finance.cash = dorm.cost * 2;
    const before = s.students.capacity;
    s = finish(place(s, dorm), dorm.id);
    assert(s.students.capacity === before + dorm.effects!.capacityBonus!, 'a dorm finished adds its beds');
    node(s, dorm.id).floorsAdded = 1;
    s.students.capacity += Math.round(dorm.effects!.capacityBonus! * 0.25);
    s = reducer(s, { type: 'DEMOLISH_BUILDING', id: dorm.id });
    assert(s.students.capacity === before, 'and demolished takes them back, its added story included');
    assert(node(s, dorm.id).floorsAdded === undefined, 'and forgets the story');
  } else {
    assert(false, 'a dorm is available at the founding');
  }
}

// ---- A hall with programs ----
{
  const s = fresh();
  const hallId = Object.keys(s.halls).find((id) => s.halls[id].some((slot) => slot.programId !== null));
  assert(hallId !== undefined, 'the founding programs are housed in a hall');
  if (hallId) assert(demolitionBlock(s, node(s, hallId)) !== null, 'which stays up while they are');
}

// ---- Beds on a facility, a venue's teams, an older loan (Plan 43) ----
{
  let s = fresh();
  // No facility carries beds today (Plan 46 took the Graduate College's), so
  // one is given some: the path that takes them back must still work.
  const grad = s.tech.find((x) => x.id === 'PROJ-GRADUATE');
  if (grad) grad.effects = { ...grad.effects, capacityBonus: 600 };
  assert(grad !== undefined, 'a facility given beds (the Graduate College)');
  if (grad) {
    grad.status = 'available';
    s.finance.cash = grad.cost * 2;
    s.finance.endowment = grad.cost * 10;
    const before = s.students.capacity;
    s = finish(place(s, grad), grad.id);
    if (node(s, grad.id).status === 'done') {
      s = reducer(s, { type: 'DEMOLISH_BUILDING', id: grad.id });
      assert(s.students.capacity === before, 'demolishing a facility with beds takes them back');
    }
  }

  let v = fresh();
  const venue = facility(v);
  v.finance.cash = venue.cost * 2;
  v = finish(place(v, venue), venue.id);
  v.orgs.teams.push({ id: 't-test', sport: 'x', name: 'Test Team', venueCategory: venue.facilityType!, status: 'active' } as never);
  v = reducer(v, { type: 'DEMOLISH_BUILDING', id: venue.id });
  assert(v.orgs.teams.find((t) => t.id === 't-test')?.status === 'awaitingVenue', "a demolished venue's teams wait for another, as a reload would have them");

  let l = fresh();
  const dorm = l.tech.find((x) => x.kind === 'dorm' && x.status === 'available')!;
  l.finance.endowment = 50_000_000;
  l.finance.cash = dorm.cost - 100_000;
  l = finish(place(l, dorm, { borrow: true }), dorm.id);
  const owed = debtOutstanding(l);
  assert(owed > 0, 'a residence hall borrowed for leaves a loan');
  l = reducer(l, { type: 'DEMOLISH_BUILDING', id: dorm.id });
  l.finance.cash = dorm.cost * 2;
  l = place(l, dorm);
  const cash = l.finance.cash;
  l = reducer(l, { type: 'CANCEL_CONSTRUCTION', id: dorm.id });
  assert(l.finance.cash === cash + dorm.cost && debtOutstanding(l) === owed, "calling off a cash rebuild leaves the demolished building's loan alone");
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
