// ---------------------------------------------------------------------
// A late use for money (Plan 95X, the second review's B4-10;
// systems/prestige/speedUps.ts, data/speedUpData.ts). What is worth pinning:
//
//   - each purchase is open only to its own specialization, once its
//     building stands, and costs its weeks of operating cost
//     (moneyScale.ts), so the price grows with the college;
//   - each fills its share faster than the same play without it, and none
//     raises its ceiling: the share is still full at 1;
//   - the repeatable ones (the training class, the autumn festival) are
//     once a year; the step until the downtown has grown; the wing and the
//     phase once;
//   - a save round trip keeps what was bought, and a malformed record is
//     dropped;
//   - the harness buys while the share is short of full, and not after.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GameState, Initiative, SpeedUpKind } from '../src/state/types';
import { WEEKS_PER_YEAR } from '../src/state/types';
import { exportSave, readSave } from '../src/state/persistence';
import { reduceInPlace } from '../src/engine/reducer';
import { weeksOfOpEx } from '../src/data/moneyScale';
import {
  AUTUMN_POINTS, PHASE_RUN_WEIGHT, SPEED_UP_WEEKS, STEP_GROWTH, WING_LANDMARKS, emptyBought,
} from '../src/data/speedUpData';
import { TRAINING_INSTITUTE_ID, picksFor, trainingReading } from '../src/data/trainingData';
import { LANDMARKS_COUNTED, RESEARCH_PARK_ID, landmarksCounted, parkReading, recordLandmarkWork } from '../src/data/researchParkData';
import { ATHLETICS_COMPLEX_ID, COMPLEX_POINTS, complexPoints, complexReading, recordComplexRun } from '../src/data/athleticsComplexData';
import { FESTIVAL, districtGrowth, downtownReading, emptyDowntown, festivalPoints, goodwillOf } from '../src/data/downtownData';
import { picksLeft, trainingPicks } from '../src/systems/faculty/training';
import { speedUpPrice, speedUpRefusal, speedUpsFor } from '../src/systems/prestige/speedUps';
import { trainingPick } from '../sim/harness/training';
import { buySpeedUps } from '../sim/harness/speedUps';
import { brokenRules } from '../sim/harness/invariants';
import { foundGame } from '../sim/harness/game';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('speed-up tests');

const FIXTURES = join(process.cwd(), 'test/fixtures');
function launch(): GameState {
  const read = readSave(readFileSync(join(FIXTURES, 'save-launch.json'), 'utf8'));
  if ('refused' in read) throw new Error(`the launch fixture is refused: ${read.refused}`);
  return read.state;
}
const node = (s: GameState, id: string) => s.tech.find((t) => t.id === id)!;
// A college specialized in `pillar`, rich, its building standing.
function specialized(pillar: GameState['specialization'], building?: string): GameState {
  const s = launch();
  s.specialization = pillar;
  s.specializationYear = s.clock.year;
  if (building) node(s, building).status = 'done';
  s.finance.cash = 1e10;
  return s;
}
const buy = (s: GameState, kind: SpeedUpKind) => reduceInPlace(s, { type: 'BUY_SPEED_UP', buy: kind });
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

// ---- Each is its own specialization's, at its price ----
{
  const s = specialized('academics', TRAINING_INSTITUTE_ID);
  assert(speedUpsFor(s).join() === 'class', 'academics opens the training class');
  assert(speedUpsFor(specialized('research')).join() === 'wing', 'research the wing');
  assert(speedUpsFor(specialized('studentLife')).join() === 'autumn,step', 'student life the autumn festival and the step');
  assert(speedUpsFor(specialized('athletics')).join() === 'phase', 'athletics the phase');
  assert(speedUpsFor(specialized('none')).length === 0, 'nothing before a specialization');
  for (const kind of ['wing', 'autumn', 'step', 'phase'] as const) {
    assert(speedUpRefusal(s, kind) !== null, `a college specialized in academics may not buy the ${kind}`);
  }
  assert(speedUpPrice(s, 'class') === weeksOfOpEx(s, SPEED_UP_WEEKS.class), 'the price is weeks of operating cost');
  const richer = structuredClone(s);
  richer.finance.weeklyOpEx *= 10;
  assert(speedUpPrice(richer, 'class') > 9 * speedUpPrice(s, 'class'), 'and grows with the college');
  s.finance.cash = speedUpPrice(s, 'class') - 1;
  const before = JSON.stringify(s);
  buy(s, 'class');
  assert(JSON.stringify(s) === before, 'refused short of cash, it changes nothing');
  node(s, TRAINING_INSTITUTE_ID).status = 'locked';
  s.finance.cash = 1e10;
  assert(speedUpRefusal(s, 'class') !== null, 'nor without the institute standing');
}

// ---- Academics: a second training class, once a year ----
{
  // The share after the year's picks are spent, with or without the class.
  function aYear(withClass: boolean): { reading: number; picks: number; s: GameState } {
    const s = specialized('academics', TRAINING_INSTITUTE_ID);
    for (const f of s.faculty) delete f.training;
    s.training = { year: s.clock.year, trained: [] };
    const cash = s.finance.cash;
    if (withClass) buy(s, 'class');
    assert(!withClass || near(cash - s.finance.cash, speedUpPrice(s, 'class')), 'the class is paid for');
    const picks = trainingPicks(s);
    for (let i = 0; i < 200 && picksLeft(s) > 0; i += 1) {
      const f = trainingPick(s);
      if (!f) break;
      reduceInPlace(s, { type: 'TRAIN_FACULTY', facultyId: f.id });
    }
    return { reading: trainingReading(s), picks, s };
  }
  const without = aYear(false);
  const withClass = aYear(true);
  const base = picksFor(without.s.faculty.length);
  assert(without.picks === base && withClass.picks === 2 * base, `the class doubles the year's picks (${without.picks} → ${withClass.picks})`);
  assert(withClass.reading > without.reading, `the share fills faster: ${without.reading.toFixed(3)} → ${withClass.reading.toFixed(3)} in a year`);
  assert(withClass.reading <= 1, 'and is still full at 1');
  assert(speedUpRefusal(withClass.s, 'class') !== null, 'once a year');
  withClass.s.clock.year += 1;
  assert(speedUpRefusal(withClass.s, 'class') === null && trainingPicks(withClass.s) === picksFor(withClass.s.faculty.length), 'open again the next year, the picks back to one class');
}

// ---- Research: the park's second wing ----
{
  const run = (labId: string): Initiative => ({
    labId, topicId: labId, depth: 'landmark', participantIds: [], weeksTotal: 260, weeksRemaining: 100, publications: 0, breakthroughs: 0, grantIncome: 0, banked: 0,
  });
  // A year of five Landmark Programs running, from an empty record.
  function aYear(wing: boolean): { reading: number; s: GameState } {
    const s = specialized('research', RESEARCH_PARK_ID);
    s.research.landmarkWork = [];
    s.research.initiatives = Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`LAB-${i}`, run(`LAB-${i}`)]));
    if (wing) buy(s, 'wing');
    for (let w = 0; w < WEEKS_PER_YEAR; w += 1) recordLandmarkWork(s);
    return { reading: parkReading(s), s };
  }
  const without = aYear(false);
  const withWing = aYear(true);
  assert(landmarksCounted(without.s) === LANDMARKS_COUNTED && landmarksCounted(withWing.s) === LANDMARKS_COUNTED + WING_LANDMARKS, `the wing counts ${LANDMARKS_COUNTED + WING_LANDMARKS} at once, not ${LANDMARKS_COUNTED}`);
  assert(near(withWing.reading / without.reading, (LANDMARKS_COUNTED + WING_LANDMARKS) / LANDMARKS_COUNTED), `the share fills faster: ${without.reading.toFixed(3)} → ${withWing.reading.toFixed(3)} in a year`);
  for (let y = 0; y < 5; y += 1) {
    withWing.s.clock.year += 1;
    for (let w = 0; w < WEEKS_PER_YEAR; w += 1) recordLandmarkWork(withWing.s);
  }
  assert(parkReading(withWing.s) === 1, 'and is still full at 1');
  assert(speedUpRefusal(withWing.s, 'wing') !== null, 'built once');
  assert(brokenRules(withWing.s).length === 0, `the invariants hold with the wing (${brokenRules(withWing.s).join('; ')})`);
  // A save keeps it, and the weeks it allows.
  const back = readSave(exportSave(withWing.s).text);
  assert(!('refused' in back) && back.state.bought.wing === withWing.s.bought.wing
    && back.state.research.landmarkWork.length === withWing.s.research.landmarkWork.length, 'a save round trip keeps the wing and its record');
}

// ---- Student life: the autumn festival, once a year; the downtown's step ----
{
  function aYear(autumn: boolean): { reading: number; points: number; s: GameState } {
    const s = specialized('studentLife');
    s.downtown = { ...emptyDowntown(), growth: 0.5 };
    s.downtown.festivals = [{ year: s.clock.year, scale: 'concert' }];
    if (autumn) buy(s, 'autumn');
    return { reading: downtownReading(s), points: festivalPoints(s), s };
  }
  const without = aYear(false);
  const withAutumn = aYear(true);
  assert(near(withAutumn.points - without.points, AUTUMN_POINTS), `the autumn festival counts ${AUTUMN_POINTS} (${without.points} → ${withAutumn.points})`);
  assert(withAutumn.reading > without.reading, `the share fills faster: ${without.reading.toFixed(3)} → ${withAutumn.reading.toFixed(3)}`);
  assert(goodwillOf(withAutumn.s) > goodwillOf(without.s), 'and the town warms');
  assert(speedUpRefusal(withAutumn.s, 'autumn') !== null, 'once a year');
  // Ten years of both festivals, grown, warm: full and no more.
  const s = withAutumn.s;
  s.downtown.growth = 1;
  s.downtown.goodwill = 100;
  for (let y = 1; y < 10; y += 1) {
    s.clock.year += 1;
    s.downtown.festivals.push({ year: s.clock.year, scale: 'gala' });
    buy(s, 'autumn');
  }
  assert(s.bought.autumn.length === 10 && festivalPoints(s) > 10 * FESTIVAL.gala.points, 'a festival a year, ten years');
  assert(downtownReading(s) === 1, 'and the share is still full at 1');

  // The step.
  const t = specialized('studentLife');
  t.downtown = { ...emptyDowntown(), festivals: [{ year: t.clock.year, scale: 'concert' }] };
  const before = downtownReading(t);
  buy(t, 'step');
  assert(near(districtGrowth(t), STEP_GROWTH) && downtownReading(t) > before, `a step grows the district ${Math.round(STEP_GROWTH * 100)}% at once, and the share with it (${before.toFixed(3)} → ${downtownReading(t).toFixed(3)})`);
  buy(t, 'step');
  assert(near(districtGrowth(t), 2 * STEP_GROWTH), 'repeatable');
  for (let i = 0; i < 10; i += 1) buy(t, 'step');
  assert(districtGrowth(t) === 1 && speedUpRefusal(t, 'step') !== null, 'until the district has grown in full');
}

// ---- Athletics: the complex's second phase ----
{
  function aSeason(phase: boolean): { points: number; reading: number; s: GameState } {
    const s = specialized('athletics', ATHLETICS_COMPLEX_ID);
    s.orgs.complexRuns = [];
    if (phase) buy(s, 'phase');
    recordComplexRun(s, 'soccer-m', 'champion');
    recordComplexRun(s, 'soccer-w', 'final');
    return { points: complexPoints(s), reading: complexReading(s), s };
  }
  const without = aSeason(false);
  const withPhase = aSeason(true);
  const plain = COMPLEX_POINTS.champion + COMPLEX_POINTS.final;
  assert(near(without.points, plain) && near(withPhase.points, plain * PHASE_RUN_WEIGHT), `a deep run counts half again with the phase (${without.points} → ${withPhase.points})`);
  assert(withPhase.reading > without.reading, `the share fills faster: ${without.reading.toFixed(3)} → ${withPhase.reading.toFixed(3)} in a season`);
  assert(speedUpRefusal(withPhase.s, 'phase') !== null, 'built once');
  withPhase.s.orgs.complexRuns = Array.from({ length: 40 }, (_, i) => ({ year: withPhase.s.clock.year - (i % 10), sport: `s${i}`, finish: 'champion' as const, phase: true as const }));
  assert(complexReading(withPhase.s) === 1, 'and the share is still full at 1');
  const back = readSave(exportSave(withPhase.s).text);
  assert(!('refused' in back) && back.state.bought.phase === withPhase.s.bought.phase && back.state.orgs.complexRuns.every((r) => r.phase === true), 'a save round trip keeps the phase and its runs');
}

// ---- The save: malformed records dropped ----
{
  const s = specialized('studentLife');
  (s as unknown as { bought: unknown }).bought = { classes: [0, 1.5, 'x', s.clock.year + 3, 2, 2], autumn: 'none', wing: -1, phase: s.clock.year };
  const back = readSave(exportSave(s).text);
  assert(!('refused' in back) && back.state.bought.classes.join() === '2' && back.state.bought.autumn.length === 0
    && back.state.bought.wing === undefined && back.state.bought.phase === s.clock.year, `a malformed record is dropped (${JSON.stringify(!('refused' in back) && back.state.bought)})`);
  (s as unknown as { bought: unknown }).bought = undefined;
  const none = readSave(exportSave(s).text);
  assert(!('refused' in none) && JSON.stringify(none.state.bought) === JSON.stringify(emptyBought()), 'none at all reads as nothing bought');
}

// ---- The harness buys while the share is short of full ----
{
  const g = foundGame({ from: specialized('research', RESEARCH_PARK_ID) });
  g.s.research.landmarkWork = [];
  assert(buySpeedUps(g) === 1 && g.s.bought.wing === g.s.clock.year, 'the harness buys the wing for a share short of full');
  const full = foundGame({ from: specialized('studentLife') });
  full.s.downtown = { growth: 1, goodwill: 100, festivals: Array.from({ length: 10 }, (_, i) => ({ year: full.s.clock.year - i, scale: 'gala' as const })) };
  assert(buySpeedUps(full) === 0, 'and nothing for a full one');
  const poor = foundGame({ from: specialized('research', RESEARCH_PARK_ID) });
  poor.s.research.landmarkWork = [];
  poor.s.finance.cash = speedUpPrice(poor.s, 'wing');
  assert(buySpeedUps(poor) === 0, 'nor without its reserve');
}

console.log(`  ${checks} checks, ${failures} failed`);
if (failures > 0) process.exit(1);
