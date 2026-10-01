// ---------------------------------------------------------------------
// The downtown and the festival (Plan 85H, data/downtownData.ts,
// systems/studentlife/downtown.ts). What is worth pinning:
//
//   - the district grows only at a college specialized in student life, in
//     about ten years at the goodwill a town starts with, faster the warmer
//     the town;
//   - off-campus places: a share of the social, dining and housing needs,
//     growing with the district, only with the specialization, counted where
//     the needs are read (the dials, crowding, the drawers, the space past
//     need);
//   - the festival: raised in the inbox each spring at a college specialized
//     in student life, once, drawing nothing; each scale's cost, mood,
//     applicants, goodwill and the gala's gifts; the default if nobody
//     answers; a spring without one costs goodwill;
//   - the town-and-gown events are gated on the specialization's district;
//   - the student-life term reads the festivals in the window, carried by
//     the district's growth and the town's goodwill, empty without a
//     festival, and says so;
//   - the choice's card, the chronicle's lines;
//   - the map's district: the plain town unchanged at step 0, shops for
//     houses as it grows, lit and dark;
//   - the migration from the version-92 fixture, a round trip and a
//     malformed record;
//   - the harness's student-life specialist.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GameState } from '../src/state/types';
import { totalEnrolled, WEEKS_PER_YEAR } from '../src/state/types';
import { exportSave, readSave, SAVE_VERSION } from '../src/state/persistence';
import {
  DISTRICT_STEPS, DISTRICT_YEARS_TO_FULL, FESTIVAL, FESTIVAL_EVENT, FESTIVAL_POINTS_FOR_FULL, FESTIVAL_WEEK, FESTIVAL_WINDOW_YEARS,
  GOODWILL_FOR_FULL, GOODWILL_START, OFF_CAMPUS_SHARE, SKIPPED_GOODWILL, districtLit, districtStep, downtownReading, emptyDowntown,
  festivalPoints,
} from '../src/data/downtownData';
import { EVENT_CATALOGUE } from '../src/data/eventCatalogue';
import { SPECIALIZATION_CARDS, opensLine, specializationTerm } from '../src/data/specializationData';
import { tickDowntown } from '../src/systems/studentlife/downtown';
import {
  attributeCoverage, attributeDetail, computeSatisfactionBreakdown, expectedRatio, offCampusPlaces, servedPopulationFor,
} from '../src/systems/satisfaction/satisfactionSystem';
import { needCapacity } from '../src/systems/estate/beyondNeed';
import { catalogueOf, raiseFestival, resolveCatalogueEvent, timeOutCatalogue } from '../src/systems/events/catalogueEngine';
import { eligible, priceScale, scaledEffects } from '../src/systems/events/catalogue';
import { annualGiving } from '../src/systems/alumni/giving';
import { chronicleOf } from '../src/systems/chronicle/chronicle';
import { landOf, ringView } from '../src/components/ringLand';
import { brokenRules } from '../sim/harness/invariants';
import { foundGame } from '../sim/harness/game';
import { festivalChoice, isTownEvent, runDowntown } from '../sim/harness/downtown';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('downtown and festival tests');

const FIXTURES = join(process.cwd(), 'test/fixtures');
// The launch fixture: a year-25 Guided run, no specialization.
function launch(): GameState {
  const read = readSave(readFileSync(join(FIXTURES, 'save-launch.json'), 'utf8'));
  if ('refused' in read) throw new Error(`the launch fixture is refused: ${read.refused}`);
  return read.state;
}
function college(specialization: GameState['specialization'], growth = 0, goodwill = GOODWILL_START): GameState {
  const s = launch();
  s.specialization = specialization;
  s.specializationYear = specialization === 'none' ? undefined : s.clock.year;
  s.downtown = { growth, goodwill, festivals: [] };
  return s;
}
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;
const TOWN = EVENT_CATALOGUE.filter(isTownEvent);

// ---- The district's growth ----
{
  const s = college('studentLife');
  for (let w = 0; w < WEEKS_PER_YEAR; w++) tickDowntown(s);
  assert(near(s.downtown.growth, 1 / DISTRICT_YEARS_TO_FULL), `a year at a goodwill of ${GOODWILL_START} grows it a tenth (${s.downtown.growth})`);
  for (let w = 0; w < (DISTRICT_YEARS_TO_FULL + 2) * WEEKS_PER_YEAR; w++) tickDowntown(s);
  assert(s.downtown.growth === 1, 'and it stops when grown');
  const warm = college('studentLife', 0, 100);
  const cold = college('studentLife', 0, 0);
  for (let w = 0; w < WEEKS_PER_YEAR; w++) { tickDowntown(warm); tickDowntown(cold); }
  assert(warm.downtown.growth > 1 / DISTRICT_YEARS_TO_FULL && cold.downtown.growth < 1 / DISTRICT_YEARS_TO_FULL && cold.downtown.growth > 0,
    `faster the warmer the town (${warm.downtown.growth.toFixed(3)} at 100, ${cold.downtown.growth.toFixed(3)} at none)`);
  for (const other of ['none', 'academics', 'research', 'athletics'] as const) {
    const t = college(other);
    for (let w = 0; w < WEEKS_PER_YEAR; w++) tickDowntown(t);
    assert(t.downtown.growth === 0, `nothing grows at a college specialized in ${other}`);
  }
  const g = foundGame({ from: college('studentLife') });
  g.act({ type: 'TICK' });
  assert(g.s.downtown.growth > 0, 'the week\'s tick grows it');
  assert(districtStep(college('studentLife', 0)) === 0 && districtStep(college('studentLife', 0.01)) === 1 && districtStep(college('studentLife', 1)) === DISTRICT_STEPS, 'the map draws it in steps');
  assert(districtStep(college('academics', 1)) === 0, 'and the plain town at any other college');
}

// ---- Off-campus places ----
{
  const full = college('studentLife', 1);
  const enrolled = totalEnrolled(full.students);
  for (const need of ['social', 'basicNeeds', 'housing'] as const) {
    const want = Math.round(OFF_CAMPUS_SHARE * enrolled * expectedRatio(full, need));
    assert(offCampusPlaces(full, need) === want, `grown, the downtown meets ${OFF_CAMPUS_SHARE * 100}% of the ${need} need (${offCampusPlaces(full, need)})`);
    assert(offCampusPlaces(college('studentLife', 0.5), need) === Math.round(want / 2) || Math.abs(offCampusPlaces(college('studentLife', 0.5), need) - want / 2) <= 1, `half grown, half as much (${need})`);
    for (const other of ['none', 'academics', 'research', 'athletics'] as const) {
      assert(offCampusPlaces(college(other, 1), need) === 0, `none at a college specialized in ${other} (${need})`);
    }
  }
  assert(offCampusPlaces(full, 'academic') === 0 && offCampusPlaces(full, 'health') === 0, 'study space and health stay the campus\'s');
  const bare = college('studentLife', 0);
  for (const need of ['social', 'basicNeeds'] as const) {
    assert(servedPopulationFor(full, need) - servedPopulationFor(bare, need) === offCampusPlaces(full, need), `counted with the buildings (${need})`);
    assert(attributeDetail(full, need).contributors.some((c) => c.label === 'Downtown, off campus' && c.value === offCampusPlaces(full, need)), `and listed in the need's drawer (${need})`);
  }
  assert(attributeDetail(full, 'housing').totalServed === full.students.capacity + offCampusPlaces(full, 'housing'), 'housing\'s drawer adds the downtown\'s beds to the campus\'s');
  const tight = college('studentLife', 1);
  tight.students.capacity = Math.round(totalEnrolled(tight.students) * 0.2);
  const tightBare = structuredClone(tight);
  tightBare.downtown.growth = 0;
  assert(attributeCoverage(tight, 'housing') > attributeCoverage(tightBare, 'housing'), 'the downtown\'s beds cover more of the housing need');
  assert(computeSatisfactionBreakdown(tight).housing > computeSatisfactionBreakdown(tightBare).housing, 'and the housing dial reads them');
  const other = college('academics', 1);
  const otherBare = college('academics', 0);
  assert(JSON.stringify(needCapacity(other, 'social')) === JSON.stringify(needCapacity(otherBare, 'social')), 'the space past need is as before at another college');
  assert(needCapacity(full, 'social').beyondShare <= needCapacity(bare, 'social').beyondShare, 'and the downtown\'s places, which cost nothing, never push the buildings past the line');
}

// ---- The festival ----
{
  const s = college('studentLife', 0.4);
  s.clock.week = FESTIVAL_WEEK - 1;
  assert(!raiseFestival(s), 'not before the Spring Term\'s fourth week');
  s.clock.week = FESTIVAL_WEEK;
  const rng = s.rng;
  assert(raiseFestival(s), 'raised from it');
  assert(s.rng === rng, 'drawing nothing from the run\'s stream');
  assert(!raiseFestival(s), 'once while it waits');
  const p = catalogueOf(s).pending.find((x) => x.eventId === FESTIVAL_EVENT.id)!;
  assert(p !== undefined && s.pendingInterrupt === null, 'in the inbox, the clock running');
  for (const other of ['none', 'academics', 'research', 'athletics'] as const) {
    const t = college(other, 0.4);
    t.clock.week = FESTIVAL_WEEK;
    assert(!raiseFestival(t), `never at a college specialized in ${other}`);
  }
  // The gala.
  const before = structuredClone(s);
  s.finance.cash = 1e9;
  before.finance.cash = 1e9;
  const pool = s.students.applicantPool;
  const giving = annualGiving(s);
  assert(resolveCatalogueEvent(s, p.instanceId, 'gala'), 'the gala is answered');
  const cost = -(scaledEffects(FESTIVAL_EVENT.choices.find((c) => c.id === 'gala')!.effects, p.scale).cash ?? 0);
  assert(near(before.finance.cash - s.finance.cash, cost) && cost > 0, `it costs its scaled price (${cost})`);
  assert(near(s.students.satisfaction, Math.min(100, before.students.satisfaction + FESTIVAL.gala.mood)), 'it lifts satisfaction');
  assert(s.students.applicantLift - before.students.applicantLift === Math.round(pool * FESTIVAL.gala.applicants), `next summer's applicants (+${s.students.applicantLift - before.students.applicantLift})`);
  assert(s.downtown.goodwill === before.downtown.goodwill + FESTIVAL.gala.goodwill, 'the town\'s goodwill');
  assert(near(s.finance.endowment - before.finance.endowment, Math.round(giving * FESTIVAL.gala.gifts)) && giving > 0, 'and the alumni give at the gala');
  assert(s.downtown.festivals.length === 1 && s.downtown.festivals[0].scale === 'gala' && s.downtown.festivals[0].year === s.clock.year, 'it is recorded');
  assert(!raiseFestival(s), 'and not raised again that year');
  s.clock.week = FESTIVAL_WEEK + 1;
  assert(districtLit(s, 0), 'the map lights the district in its weeks');
  s.clock.week = FESTIVAL_WEEK + 10;
  assert(!districtLit(s, 0) && districtLit(s, 1), 'and through the winter, not otherwise');
  // A smaller scale does less, and costs less.
  const fair = college('studentLife', 0.4);
  fair.clock.week = FESTIVAL_WEEK;
  raiseFestival(fair);
  const fp = catalogueOf(fair).pending.find((x) => x.eventId === FESTIVAL_EVENT.id)!;
  const endowment = fair.finance.endowment;
  fair.finance.cash = 1e9;
  resolveCatalogueEvent(fair, fp.instanceId, 'fair');
  assert(fair.downtown.goodwill === GOODWILL_START + FESTIVAL.fair.goodwill && fair.finance.endowment === endowment, 'a street fair: its own goodwill, and no gala gifts');
  assert(FESTIVAL.weekend.cost < FESTIVAL.fair.cost && FESTIVAL.fair.cost < FESTIVAL.concert.cost && FESTIVAL.concert.cost < FESTIVAL.gala.cost, 'each scale costs more than the last');
  // Nobody answers: the modest weekend.
  const idle = college('studentLife', 0.4);
  idle.clock.week = FESTIVAL_WEEK;
  raiseFestival(idle);
  idle.clock.week += FESTIVAL_EVENT.timeoutWeeks;
  timeOutCatalogue(idle);
  assert(idle.downtown.festivals[0]?.scale === 'weekend', 'left unanswered, the modest weekend');
  // A spring without one.
  const skip = college('studentLife', 0.4);
  skip.clock.week = FESTIVAL_WEEK;
  raiseFestival(skip);
  const sp = catalogueOf(skip).pending.find((x) => x.eventId === FESTIVAL_EVENT.id)!;
  const cash = skip.finance.cash;
  assert(resolveCatalogueEvent(skip, sp.instanceId, 'none'), 'the college may let a spring pass');
  assert(skip.downtown.goodwill === GOODWILL_START + SKIPPED_GOODWILL && skip.finance.cash === cash, `it costs the town's goodwill (${skip.downtown.goodwill}), and no money`);
  assert(skip.downtown.festivals[0]?.scale === 'none' && skip.log.some((l) => /No spring festival/.test(l.message)), 'it is recorded, and the log says so');
  const cold = college('studentLife', 0.4, 4);
  cold.clock.week = FESTIVAL_WEEK;
  raiseFestival(cold);
  resolveCatalogueEvent(cold, catalogueOf(cold).pending.find((x) => x.eventId === FESTIVAL_EVENT.id)!.instanceId, 'none');
  assert(cold.downtown.goodwill === 0, 'goodwill never falls below none');
}

// ---- Town and gown ----
{
  assert(TOWN.length >= 4 && TOWN.length <= 6, `a handful of town-and-gown events (${TOWN.length})`);
  assert(TOWN.every((e) => e.choices.some((c) => (c.effects.goodwill ?? 0) !== 0)), 'each trades the town\'s goodwill');
  assert(TOWN.every((e) => e.choices.some((c) => (c.effects.cash ?? 0) !== 0 || (c.effects.mood ?? 0) !== 0)), 'against money or mood');
  const grown = college('studentLife', 1);
  grown.finance.cash = 1e9;
  for (const e of TOWN) {
    assert(eligible(grown, e), `"${e.id}" comes to a grown downtown`);
    for (const other of ['none', 'academics', 'research', 'athletics'] as const) {
      assert(!eligible(college(other, 1), e), `"${e.id}" never comes to a college specialized in ${other}`);
    }
    assert(!eligible(college('studentLife', 0), e), `nor before the district has begun ("${e.id}")`);
  }
  const s = college('studentLife', 1, 50);
  const e = TOWN.find((x) => x.id === 'town-noise')!;
  const patrol = e.choices.find((c) => c.id === 'patrol')!;
  s.catalogue = { pending: [{ instanceId: 'x', eventId: e.id, firedWeek: 0, vars: {}, scale: priceScale(s) }], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0 };
  s.finance.cash = 1e9;
  assert(resolveCatalogueEvent(s, 'x', 'patrol') && s.downtown.goodwill === 50 + (patrol.effects.goodwill ?? 0), 'an answer moves the town\'s goodwill');
}

// ---- The term ----
{
  const s = college('studentLife', 1, GOODWILL_FOR_FULL);
  const row = () => specializationTerm(s, 'studentLife');
  assert(downtownReading(s) === 0 && row().score === 0, 'without a festival the term is empty');
  assert(/no spring festival has been held/.test(row().detail), `and the row says so ("${row().detail}")`);
  for (let k = 1; k <= FESTIVAL_POINTS_FOR_FULL; k++) s.downtown.festivals.unshift({ year: s.clock.year - k, scale: 'concert' });
  assert(near(festivalPoints(s), FESTIVAL_POINTS_FOR_FULL) && near(downtownReading(s), 1), `ten festivals with a headline act, grown, goodwill at ${GOODWILL_FOR_FULL}: full (${downtownReading(s)})`);
  assert(/10 festivals in the last 10 years/.test(row().detail) && /term is full/.test(row().detail), `the row reads the program ("${row().detail}")`);
  s.downtown.growth = 0.5;
  assert(near(downtownReading(s), 0.75), 'half grown, three quarters');
  s.downtown.growth = 1;
  s.downtown.goodwill = 0;
  assert(near(downtownReading(s), 0.5), 'with no goodwill, half');
  s.downtown.goodwill = 100;
  assert(near(downtownReading(s), 1), 'and goodwill past the mark adds nothing');
  s.downtown.festivals = s.downtown.festivals.map((f) => ({ ...f, year: f.year - FESTIVAL_WINDOW_YEARS }));
  assert(downtownReading(s) === 0, 'festivals older than the window count for nothing');
  s.downtown.festivals = [{ year: s.clock.year - 1, scale: 'weekend' }, { year: s.clock.year - 2, scale: 'none' }];
  assert(near(festivalPoints(s), FESTIVAL.weekend.points), 'a spring without one counts nothing');
  // This year's, once decided, joins the window; the oldest leaves.
  s.downtown.festivals = Array.from({ length: FESTIVAL_WINDOW_YEARS }, (_, k) => ({ year: s.clock.year - FESTIVAL_WINDOW_YEARS + k, scale: 'concert' as const }));
  assert(near(festivalPoints(s), FESTIVAL_WINDOW_YEARS), 'before this spring, the ten before it');
  s.downtown.festivals.push({ year: s.clock.year, scale: 'weekend' });
  assert(near(festivalPoints(s), FESTIVAL_WINDOW_YEARS - 1 + FESTIVAL.weekend.points), 'after it, this spring and the nine before');
  for (const other of ['academics', 'research', 'athletics'] as const) {
    const t = college(other, 1, 100);
    t.downtown.festivals = s.downtown.festivals;
    assert(specializationTerm(t, 'studentLife').score === 0, `specialized in ${other}, student life's term stays empty`);
  }
  // The card.
  assert(/as the college holds its spring festival/.test(opensLine('studentLife', 30)), `the card says how it fills ("${opensLine('studentLife', 30)}")`);
  assert(SPECIALIZATION_CARDS.studentLife.mechanics.length === 3 && SPECIALIZATION_CARDS.studentLife.mechanics.every((m) => m.ready), 'the district, the festival and town and gown are now, not still to come');
  assert(Object.values(SPECIALIZATION_CARDS).every((c) => c.mechanics.every((m) => m.ready)), 'nothing on any card is still to come');
}

// ---- The chronicle ----
{
  const s = college('studentLife', 1);
  const y = s.history[s.history.length - 1].year;
  s.downtown.festivals = [{ year: y - 2, scale: 'gala' }, { year: y - 1, scale: 'none' }, { year: y, scale: 'concert' }];
  const lines = chronicleOf(s).eras.flatMap((e) => e.lines);
  assert(lines.some((l) => l === 'It held the spring festival in 2 of these years, once as a headline gala.'), `the chronicle names the festivals (${lines.filter((l) => /festival/.test(l)).join(' | ')})`);
  assert(lines.some((l) => new RegExp(`went without its festival in Year ${y - 1}`).test(l)), 'and a spring without one');
}

// ---- The map ----
{
  const name = 'Blackmoor University';
  const land = landOf(name);
  const plain = ringView(name, false);
  const zero = ringView(name, false, 0, true);
  const houses = (v: typeof plain) => [...v.back, ...v.front].filter((x) => x.kind === 'house').length;
  const shops = (v: typeof plain) => [...v.back, ...v.front].filter((x) => x.kind === 'shop').length;
  assert(houses(plain) === land.houses.length && shops(plain) === 0, 'step 0 is the plain town: every house, no shop');
  assert(houses(zero) === houses(plain) && shops(zero) === 0, 'and never lit');
  let lastShops = 0;
  let lastHouses = Infinity;
  for (let step = 1; step <= DISTRICT_STEPS; step++) {
    const v = ringView(name, false, step);
    assert(shops(v) > lastShops && houses(v) <= lastHouses, `step ${step}: more shops (${shops(v)}), no more houses (${houses(v)})`);
    lastShops = shops(v);
    lastHouses = houses(v);
  }
  assert(lastHouses < land.houses.length, 'the grown district stands where houses stood');
  const day = ringView(name, false, DISTRICT_STEPS, false);
  const lit = ringView(name, false, DISTRICT_STEPS, true);
  const lightsOf = (v: typeof plain) => [...v.back, ...v.front].filter((x) => x.kind === 'lights');
  assert(lightsOf(day).length > 0 && lightsOf(day).every((x) => x.kind === 'lights' && !x.lit && x.halo === ''), 'by day, strings of lights, unlit');
  assert(lightsOf(lit).every((x) => x.kind === 'lights' && x.lit && x.halo !== ''), 'lit, they glow');
  assert([...lit.back, ...lit.front].some((x) => x.kind === 'shop' && x.litWindows !== ''), 'and windows are lit');
  assert(JSON.stringify(landOf(name).houses) === JSON.stringify(land.houses), 'the land itself is the same whatever the district');
}

// ---- The migration, and a round trip ----
{
  const raw = readFileSync(join(FIXTURES, 'save-v92.json'), 'utf8');
  const parsed = JSON.parse(raw) as { version: number; state: GameState };
  assert(parsed.version === 92 && !('downtown' in parsed.state), 'the version-92 fixture predates the downtown');
  const read = readSave(raw);
  assert(!('refused' in read), 'it loads');
  if (!('refused' in read)) {
    assert(JSON.stringify(read.state.downtown) === JSON.stringify(emptyDowntown()), 'with the downtown where a new run starts');
    assert(brokenRules(read.state).length === 0, `the rules hold (${brokenRules(read.state).join('; ')})`);
  }
  const s = college('studentLife', 0.42, 71);
  s.downtown.festivals = [{ year: s.clock.year - 1, week: 31, scale: 'gala' }, { year: s.clock.year, scale: 'none' }];
  const back = readSave(exportSave(s).text);
  assert(!('refused' in back) && JSON.stringify(back.state.downtown) === JSON.stringify(s.downtown), 'a round trip keeps the downtown');
  const bad = JSON.parse(exportSave(s).text) as { state: GameState };
  (bad.state as unknown as { downtown: unknown }).downtown = {
    growth: 3, goodwill: -20,
    festivals: [{ year: s.clock.year + 2, scale: 'gala' }, { year: s.clock.year - 3, scale: 'rave' }, { year: 'last', scale: 'fair' }, { year: s.clock.year - 5, scale: 'fair' }, { year: s.clock.year - 5, scale: 'gala' }],
  };
  const cleaned = readSave(JSON.stringify(bad));
  assert(!('refused' in cleaned) && cleaned.state.downtown.growth === 1 && cleaned.state.downtown.goodwill === 0, 'growth and goodwill are kept to their ranges on load');
  assert(!('refused' in cleaned) && JSON.stringify(cleaned.state.downtown.festivals) === JSON.stringify([{ year: s.clock.year - 5, scale: 'fair' }]), 'and malformed festivals are dropped, one a year');
  (bad.state as unknown as { downtown: unknown }).downtown = 'bustling';
  const none = readSave(JSON.stringify(bad));
  assert(!('refused' in none) && JSON.stringify(none.state.downtown) === JSON.stringify(emptyDowntown()), 'and a malformed downtown starts again');
  assert(SAVE_VERSION >= 93, `at version 93 or later (${SAVE_VERSION})`);
}

// ---- The harness's student-life specialist ----
{
  const s = college('studentLife', 0.5);
  s.clock.week = FESTIVAL_WEEK;
  s.finance.cash = 1e10;
  raiseFestival(s);
  const g = foundGame({ from: s });
  const p = catalogueOf(g.s).pending.find((x) => x.eventId === FESTIVAL_EVENT.id)!;
  assert(festivalChoice(g, p.scale) !== 'none', 'it never lets a spring pass');
  const town = TOWN.find((x) => x.id === 'town-noise')!;
  catalogueOf(g.s).pending.push({ instanceId: 't', eventId: town.id, firedWeek: 0, vars: {}, scale: priceScale(g.s) });
  assert(runDowntown(g) === 2, 'it answers the festival and the town');
  assert(g.s.downtown.festivals.length === 1 && g.s.downtown.festivals[0].scale !== 'none', `the festival is held (${g.s.downtown.festivals[0]?.scale})`);
  assert(g.s.log.some((l) => /late-night student patrol/.test(l.message)), 'and the town answered for its goodwill and the students\' mood');
  const poor = college('studentLife', 0.5);
  poor.clock.week = FESTIVAL_WEEK;
  poor.finance.cash = 0;
  raiseFestival(poor);
  const pg = foundGame({ from: poor });
  assert(festivalChoice(pg, catalogueOf(pg.s).pending[0].scale) === 'weekend', 'short of money, the modest weekend');
  const other = college('academics', 1);
  other.catalogue = { pending: [{ instanceId: 't', eventId: town.id, firedWeek: 0, vars: {}, scale: 1 }], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0 };
  assert(runDowntown(foundGame({ from: other })) === 0, 'a college specialized in anything else is left to its own player');
}

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
