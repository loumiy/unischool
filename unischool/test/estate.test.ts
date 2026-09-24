// The estate (src/systems/estate/estate.ts): full maintenance funding moves
// nothing; paying less saves the difference and turns it into backlog, which
// compounds and wears condition down; a renovation pays it off under eight
// weeks of scaffolding.

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { financeBreakdown } from '../src/systems/finance/financeSystem';
import { RENOVATION_WEEKS, conditionOf, renovationCost, tickEstate } from '../src/systems/estate/estate';
import { bindScriptStream } from '../src/engine/random';
import type { GameState } from '../src/state/types';

bindScriptStream(2626);
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

console.log('estate tests');

function withBuilding(): GameState {
  const s = createInitialState('Estate');
  s.pendingInterrupt = null;
  const dorm = s.tech.find((t) => t.id === 'DINING-01')!;
  dorm.status = 'done';
  s.placements[dorm.id] = { row: 20, col: 20, w: 3, h: 3 };
  return s;
}
const buildingOf = (s: GameState) => s.tech.find((t) => t.id === 'DINING-01')!;

// ---- Full funding moves nothing ----
{
  const s = withBuilding();
  const before = financeBreakdown(s).facilityUpkeep;
  for (let i = 0; i < 52; i++) tickEstate(s);
  assert(buildingOf(s).backlog === undefined, 'a fully funded building builds no backlog in a year');
  assert(conditionOf(buildingOf(s)) === 1, 'and stays in perfect condition');
  assert(financeBreakdown(s).facilityUpkeep === before, 'and costs what it always did');
}

// ---- Paying less saves money and builds backlog ----
{
  let s = withBuilding();
  const full = financeBreakdown(s).facilityUpkeep;
  s = reducer(s, { type: 'SET_MAINTENANCE_FUNDING', level: 0.52 });
  assert(s.finance.maintenanceFunding === 0.5, 'funding steps in fives');
  assert(Math.abs(financeBreakdown(s).facilityUpkeep - full * 0.5) < 1, 'and the upkeep line charges that share');
  const upkeep = buildingOf(s).effects!.upkeepPerWeek!;
  tickEstate(s);
  assert(buildingOf(s).backlog === Math.round(upkeep * 0.5), 'the unpaid half becomes the week\'s backlog');
  for (let i = 0; i < 51; i++) tickEstate(s);
  const year = buildingOf(s).backlog!;
  assert(year > Math.round(upkeep * 0.5 * 52), 'and it compounds');
  assert(conditionOf(buildingOf(s)) < 1, 'condition falls with it');
  const courses = s.tech.filter((t) => t.kind === 'course' && t.status === 'done');
  assert(courses.every((t) => t.backlog === undefined), 'courses keep no backlog: maintenance is for buildings');
}

// ---- A renovation pays it off under scaffolding ----
{
  let s = withBuilding();
  s.finance.maintenanceFunding = 0;
  for (let i = 0; i < 104; i++) tickEstate(s);
  const cost = renovationCost(buildingOf(s));
  s.finance.cash = cost - 1;
  s = reducer(s, { type: 'RENOVATE_BUILDING', id: 'DINING-01' });
  assert(buildingOf(s).renovationWeeks === undefined, 'a renovation the college cannot afford does not start');
  s.finance.cash = cost + 10;
  s = reducer(s, { type: 'RENOVATE_BUILDING', id: 'DINING-01' });
  assert(buildingOf(s).renovationWeeks === RENOVATION_WEEKS && s.finance.cash === 10, 'one it can afford starts, paid up front');
  const backlog = buildingOf(s).backlog!;
  s.finance.maintenanceFunding = 1;
  for (let i = 0; i < RENOVATION_WEEKS - 1; i++) tickEstate(s);
  assert(buildingOf(s).backlog === backlog, 'the backlog stands until the work is done');
  tickEstate(s);
  assert(buildingOf(s).backlog === undefined && buildingOf(s).renovationWeeks === undefined, 'and then it is gone');
  assert(conditionOf(buildingOf(s)) === 1, 'and the building is as built');
  assert(buildingOf(s).status === 'done', 'open throughout');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
