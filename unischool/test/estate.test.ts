// The estate (src/systems/estate/estate.ts): full maintenance funding moves
// nothing; paying less saves the difference and turns it into backlog, which
// compounds and wears condition down; a renovation pays it off under eight
// weeks of scaffolding.

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { financeBreakdown } from '../src/systems/finance/financeSystem';
import { computePrestigeTarget } from '../src/systems/prestige/prestigeSystem';
import { HISTORIC_AGE_YEARS, HISTORIC_PRESTIGE, HISTORIC_PRESTIGE_MAX, historicPrestige } from '../src/systems/estate/estate';
import {
  EXTENSION_MAX_STOREYS, EXTENSION_WEEKS, RENOVATION_WEEKS, conditionOf, extensionCost, renovationCost, tickEstate,
} from '../src/systems/estate/estate';
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

// ---- Added stories ----
{
  let s = createInitialState('Storeys');
  s.pendingInterrupt = null;
  const dorm = s.tech.find((t) => t.id === 'DORM-01')!;
  dorm.status = 'done';
  s.placements[dorm.id] = { row: 20, col: 20, w: 7, h: 3 };
  s.finance.cash = 1e9;
  const beds = s.students.capacity;
  s = reducer(s, { type: 'EXTEND_BUILDING', id: 'DORM-01' });
  const d = () => s.tech.find((t) => t.id === 'DORM-01')!;
  assert(d().extensionWeeks === EXTENSION_WEEKS && s.finance.cash === 1e9 - extensionCost(d()), 'a story starts, paid up front');
  for (let i = 0; i < EXTENSION_WEEKS; i++) tickEstate(s);
  assert(d().floorsAdded === 1 && s.students.capacity === beds + Math.round((d().effects!.capacityBonus ?? 0) * 0.25), 'and adds a quarter of its beds when done');
  for (let k = 1; k < EXTENSION_MAX_STOREYS + 1; k++) {
    s = reducer(s, { type: 'EXTEND_BUILDING', id: 'DORM-01' });
    for (let i = 0; i < EXTENSION_WEEKS; i++) tickEstate(s);
  }
  assert(d().floorsAdded === EXTENSION_MAX_STOREYS, `never more than ${EXTENSION_MAX_STOREYS} stories`);

  const dining = s.tech.find((t) => t.id === 'DINING-01')!;
  dining.status = 'done';
  const serves = dining.effects!.servesPopulation!;
  const upkeepBefore = dining.effects!.upkeepPerWeek!;
  s = reducer(s, { type: 'EXTEND_BUILDING', id: 'DINING-01' });
  for (let i = 0; i < EXTENSION_WEEKS; i++) tickEstate(s);
  const after = s.tech.find((t) => t.id === 'DINING-01')!;
  assert(after.effects!.servesPopulation === serves + Math.round(serves * 0.25), 'a dining hall serves a quarter more');
  assert(after.effects!.upkeepPerWeek! > upkeepBefore, 'and costs more to run');
}

// ---- Historic status ----
{
  let s = withBuilding();
  const hall = buildingOf(s);
  hall.builtYear = s.clock.year;
  s = reducer(s, { type: 'DECLARE_HISTORIC', id: hall.id });
  assert(buildingOf(s).historic === undefined, 'a new building cannot be declared historic');
  s.clock.year += HISTORIC_AGE_YEARS;
  const upkeep = financeBreakdown(s).facilityUpkeep;
  const prestige = computePrestigeTarget(s);
  s = reducer(s, { type: 'DECLARE_HISTORIC', id: hall.id });
  assert(buildingOf(s).historic === true, `one standing ${HISTORIC_AGE_YEARS} years can`);
  assert(financeBreakdown(s).facilityUpkeep > upkeep, 'it costs more to keep');
  assert(computePrestigeTarget(s) > prestige, 'and lends prestige');
  for (const t of s.tech.filter((x) => x.kind === 'facility').slice(0, 10)) { t.status = 'done'; t.historic = true; }
  assert(historicPrestige(s) === HISTORIC_PRESTIGE_MAX * HISTORIC_PRESTIGE, `only ${HISTORIC_PRESTIGE_MAX} count toward it`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
