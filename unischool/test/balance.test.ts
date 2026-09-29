// ---------------------------------------------------------------------
// Balance (Plan 80F): the pieces the harness targets rest on.
//
//   1. The opening: a small college admits most of its few applicants
//      (about 86% at founding), and the curve is the old logistic from
//      prestige 100; the founding classes pay a price the admissions screen
//      reads as fair.
//   2. Facility upkeep is a share of what a building cost, its added floors
//      and expansions with it, paid in full however few it serves; the
//      towers' shops are kept at the grocery's price; a loaded save reads
//      the new terms.
//   3. Food: the grocery and the towers' shops count for at most 40% of
//      what the students need to eat, and a demand never asks for a grocery
//      that would add nothing.
//   4. Fitness: the Athletics Complex feeds health and sits with the fitness
//      chain under Health in the build menu; the Recreation Center stays
//      social.
//
// Academic satisfaction and the teaching ceiling are
// test/teaching-standard.test.ts's; the price's overreach,
// test/crowding-pool.test.ts's; the harness targets, `npm run sim`.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import type { GameState } from '../src/state/types';
import { WEEKS_PER_YEAR, totalEnrolled } from '../src/state/types';
import { admitRate, priceTier, priceTolerance } from '../src/systems/admissions/admissionsSystem';
import { FOUNDING_PRESET, STARTING_TUITION } from '../src/data/foundingData';
import {
  FACILITY_UPKEEP_SHARE, LIBRARY_TIER1_ID, PRICE_UPKEEP_TYPES, REC_CENTER_TIER2_ID, RETAIL_FOOD_SHARE,
  initialFacilities, nextLibraryFloor, nextVenueExpansion, priceUpkeep,
} from '../src/data/facilitiesData';
import { TOWER_RETAIL_UPKEEP_PER_WEEK, initialDorms } from '../src/data/campusData';
import { EXTENSION_COST_SHARE, facilityUpkeepOf, isPriceUpkept } from '../src/systems/estate/estate';
import { attributeCoverage, computeSatisfactionBreakdown, servedPopulationFor } from '../src/systems/satisfaction/satisfactionSystem';
import { financeBreakdown } from '../src/systems/finance/financeSystem';
import { readSave, SAVE_VERSION } from '../src/state/persistence';
import { buildTabOf } from '../src/components/BuildPopup';
import { bindScriptStream } from '../src/engine/random';

bindScriptStream(8006);
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
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;
const node = (s: GameState, id: string) => s.tech.find((t) => t.id === id)!;

// ---- 1. the opening ----
{
  const logistic = (p: number) => 0.055 + (0.38 - 0.055) / (1 + Math.exp(0.06 * (p - 100)));
  assert(admitRate(50) > 0.84 && admitRate(50) < 0.88, `a founding college opens at about 86% (${admitRate(50).toFixed(3)})`);
  for (const p of [100, 110, 130, 150]) assert(near(admitRate(p), logistic(p)), `from prestige 100 the curve is the old one (at ${p})`);
  assert(admitRate(75) > logistic(75) && admitRate(75) < admitRate(50), 'between, it comes down to meet it');
  let previous = Infinity;
  let monotone = true;
  for (let p = 0; p <= 150; p += 1) {
    if (!(admitRate(p) < previous)) monotone = false;
    previous = admitRate(p);
  }
  assert(monotone, 'standing always makes a college more selective by default');

  const s = createInitialState('Opening');
  assert(near(s.students.admitRate, admitRate(s.self.reputation)), 'a new college opens its slider there');
  assert(STARTING_TUITION > 16_000 && priceTier(STARTING_TUITION, priceTolerance(s.self.reputation)) === 'fair', 'the founding price is up, and fair');
  assert(Object.values(s.finance.tuitionByClass).every((p) => p === STARTING_TUITION), 'every founding class pays it');
  assert(s.finance.cash === FOUNDING_PRESET.startingCash && FOUNDING_PRESET.startingCash === 2_900_000, 'the founding funds are $2.9M');
}

// ---- 2. facility upkeep is a share of the price ----
{
  const catalog = initialFacilities().filter(isPriceUpkept);
  assert(catalog.length >= PRICE_UPKEEP_TYPES.size, 'every serving facility type is priced this way');
  assert(catalog.every((t) => t.effects?.upkeepPerWeek === priceUpkeep(t.cost)), 'each facility\'s upkeep is the share of its price');
  assert(near(priceUpkeep(5_200_000), Math.round((5_200_000 * FACILITY_UPKEEP_SHARE) / WEEKS_PER_YEAR)), 'a year\'s upkeep is FACILITY_UPKEEP_SHARE of the price');
  assert(initialFacilities().filter((t) => t.facilityType === 'quad' || t.facilityType === 'project').every((t) => !isPriceUpkept(t)), 'quads and projects keep their own upkeep');
  const medical = initialFacilities().find((t) => t.id === 'HLTH-T3')!;
  assert(!isPriceUpkept(medical) && medical.effects!.upkeepPerWeek! < priceUpkeep(medical.cost) / 4, 'the Medical Center, a capital project, keeps an authored upkeep like the other projects');

  // Added floors and expansions are priced in.
  const dining = { ...initialFacilities().find((t) => t.id === 'DININGHALL-02')!, floorsAdded: 1 };
  assert(facilityUpkeepOf(dining) === priceUpkeep(dining.cost + Math.round(dining.cost * EXTENSION_COST_SHARE)), 'a dining hall\'s added story is priced in');
  const lib = initialFacilities().find((t) => t.id === LIBRARY_TIER1_ID)!;
  const twoFloors = lib.cost + nextLibraryFloor({ ...lib, floorsAdded: 0 })!.cost + nextLibraryFloor({ ...lib, floorsAdded: 1 })!.cost;
  assert(facilityUpkeepOf({ ...lib, floorsAdded: 2 }) === priceUpkeep(twoFloors), 'a library\'s floors are priced in');
  const arena = initialFacilities().find((t) => t.id === 'ATH-ARENA')!;
  assert(facilityUpkeepOf({ ...arena, expansions: 1 }) === priceUpkeep(arena.cost + nextVenueExpansion(arena)!.cost), 'a venue\'s expansion is priced in');

  // Through the reducer: a library floor raises the upkeep by the floor's share.
  let s = createInitialState('Upkeep');
  const built = node(s, LIBRARY_TIER1_ID);
  built.status = 'done';
  delete s.developing[built.id];
  s.finance.cash = 50_000_000;
  const floor = nextLibraryFloor(built)!;
  const before = built.effects!.upkeepPerWeek!;
  s = reducer(s, { type: 'RENOVATE_LIBRARY' });
  assert(node(s, LIBRARY_TIER1_ID).effects!.upkeepPerWeek === priceUpkeep(built.cost + floor.cost) && priceUpkeep(built.cost + floor.cost) > before, 'renovating the library prices its new floor');

  // Paid in full however few it serves: a hall feeding far more than the
  // campus holds costs the same as one that is full.
  const empty = createInitialState('Empty');
  const hall = node(empty, 'DINING-01');
  hall.status = 'done';
  const onePlace = financeBreakdown(empty).facilityUpkeep;
  empty.students.classes = { freshman: 1, sophomore: 0, junior: 0, senior: 0 };
  assert(near(financeBreakdown(empty).facilityUpkeep, onePlace) && onePlace === hall.effects!.upkeepPerWeek, 'capacity past need is paid in full');

  // The towers' shops, at the grocery's price a place.
  const grocery = initialFacilities().find((t) => t.facilityType === 'grocery')!;
  const perPlace = grocery.cost / grocery.effects!.servesPopulation!;
  const tower = initialDorms().find((t) => (t.effects?.servesPopulation ?? 0) > 0)!;
  assert(TOWER_RETAIL_UPKEEP_PER_WEEK === priceUpkeep(tower.effects!.servesPopulation! * perPlace), 'the towers\' shops are kept at the grocery\'s price a place');
  assert(tower.effects!.upkeepPerWeek === TOWER_RETAIL_UPKEEP_PER_WEEK, 'and every tower carries it');

  // A save written before reads the new terms: the old per-served upkeep
  // and a social Athletics Complex are refreshed from the catalog.
  const saved = createInitialState('Saved');
  const complex = node(saved, REC_CENTER_TIER2_ID);
  complex.status = 'done';
  complex.effects = { ...complex.effects!, satisfactionAttribute: 'social', upkeepPerWeek: 3_850 };
  const oldHall = node(saved, 'DINING-01');
  oldHall.status = 'done';
  oldHall.floorsAdded = 1;
  oldHall.effects = { ...oldHall.effects!, upkeepPerWeek: 962 };
  const read = readSave(JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: saved }));
  assert('state' in read, 'the save reads');
  if ('state' in read) {
    assert(node(read.state, REC_CENTER_TIER2_ID).effects!.satisfactionAttribute === 'health', 'a saved Athletics Complex feeds health');
    assert(node(read.state, REC_CENTER_TIER2_ID).effects!.upkeepPerWeek === priceUpkeep(complex.cost), 'and is kept at its price\'s share');
    assert(node(read.state, 'DINING-01').effects!.upkeepPerWeek === priceUpkeep(oldHall.cost + Math.round(oldHall.cost * EXTENSION_COST_SHARE)), 'a saved hall with a story added is kept at the share of both');
  }
}

// ---- 3. food ----
{
  const s = createInitialState('Food');
  s.students.classes = { freshman: 2_500, sophomore: 2_500, junior: 2_500, senior: 2_500 };
  const enrolled = totalEnrolled(s.students);
  const grocery = s.tech.find((t) => t.facilityType === 'grocery')!;
  grocery.status = 'done';
  const cap = RETAIL_FOOD_SHARE * enrolled;
  assert(grocery.effects!.servesPopulation! > cap, 'the grocery alone could feed more than its share');
  assert(near(servedPopulationFor(s, 'basicNeeds'), cap), 'but counts for 40% of what the students need');
  assert(near(attributeCoverage(s, 'basicNeeds'), RETAIL_FOOD_SHARE), 'so the coverage is 40%');
  const tower = s.tech.find((t) => t.kind === 'dorm' && (t.effects?.servesPopulation ?? 0) > 0)!;
  tower.status = 'done';
  assert(near(servedPopulationFor(s, 'basicNeeds'), cap), 'the towers\' shops share the same 40%');
  const hall = node(s, 'DINING-01');
  hall.status = 'done';
  assert(near(servedPopulationFor(s, 'basicNeeds'), cap + hall.effects!.servesPopulation!), 'the dining halls carry the rest, in full');
  const fed = computeSatisfactionBreakdown(s).basicNeeds;
  // A dining hall's worth more now feeds more students; a second grocery's
  // worth would not.
  assert(servedPopulationFor(s, 'basicNeeds', [grocery]) === servedPopulationFor(s, 'basicNeeds'), 'a grocery past the share adds nothing');
  s.students.classes = { freshman: 100, sophomore: 100, junior: 100, senior: 100 };
  assert(near(servedPopulationFor(s, 'basicNeeds'), RETAIL_FOOD_SHARE * 400 + hall.effects!.servesPopulation!), 'the share is of the students there are');
  assert(fed < 100, 'a campus fed mostly by shops is not fully fed');
}

// ---- 4. fitness ----
{
  const s = createInitialState('Fitness');
  const complex = node(s, REC_CENTER_TIER2_ID);
  const rec = node(s, 'REC-T1');
  assert(complex.effects!.satisfactionAttribute === 'health', 'the Athletics Complex feeds health');
  assert(rec.effects!.satisfactionAttribute === 'social', 'the Recreation Center stays social');
  for (const id of ['GYM', 'POOL', 'TENNIS-COURTS', REC_CENTER_TIER2_ID, 'REC-T1']) node(s, id).status = 'available';
  assert(['GYM', 'POOL', 'TENNIS-COURTS', REC_CENTER_TIER2_ID].every((id) => buildTabOf(s, id) === 'health'), 'the build menu files the fitness chain, the Athletics Complex with it, under Health');
  assert(buildTabOf(s, 'REC-T1') === 'social', 'and the Recreation Center under Social');
  s.students.classes = { freshman: 1_000, sophomore: 1_000, junior: 1_000, senior: 1_000 };
  const health = servedPopulationFor(s, 'health');
  const social = servedPopulationFor(s, 'social');
  complex.status = 'done';
  assert(servedPopulationFor(s, 'health') === health + complex.effects!.servesPopulation! && servedPopulationFor(s, 'social') === social, 'built, it serves health and not social');
}

console.log(`balance: ${checks} checks, ${failures} failures`);
if (failures > 0) process.exit(1);
