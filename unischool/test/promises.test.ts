// Promises (Plan 33, systems/promises/promises.ts): settled and offered as
// the summer opens, answered on its Review beat; a decade's close offers a
// list to take up to two from; declining is free; offers never draw on the
// run's random stream.

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { bindScriptStream } from '../src/engine/random';
import { DECADE_LIST, DECADE_PICKS, PROMISES, PROMISE_CAP, promiseById } from '../src/data/promiseData';
import { answerPromises, dealable, goalMet, isDecadeClose, offerRoom, openSummerPromises, promisesOf } from '../src/systems/promises/promises';
import { distressOf } from '../src/systems/finance/distress';
import { loadGame, saveGame } from '../src/state/persistence';
import { SEMICENTENNIAL_YEAR, WEEKS_PER_YEAR } from '../src/state/types';
import type { GameState } from '../src/state/types';

bindScriptStream(3334);
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

console.log('promises tests');

function fresh(year: number): GameState {
  const s = createInitialState('Promise');
  s.pendingInterrupt = null;
  s.clock.year = year;
  s.clock.week = WEEKS_PER_YEAR;
  return s;
}

// ---- The content ----
{
  assert(PROMISES.length === 26, `v2's twenty-six (${PROMISES.length})`);
  assert(PROMISES.every((p) => p.years >= 2 && Object.keys(p.reward).length > 0 && Object.keys(p.penalty).length > 0), 'every promise has a deadline, a reward and a penalty');
  assert(PROMISES.every((p) => !/\{(?!college\})\w+\}/.test(p.text + p.kept + p.missed)), 'the only name in the words is the college\'s');
  assert(PROMISES.every((p) => Object.keys(p.goal).length > 0 && Object.keys(p.deal).length > 0), 'every promise has terms and a goal');
}

// ---- A decade's close: a list, up to two taken ----
{
  const s = fresh(10);
  assert(isDecadeClose(10) && !isDecadeClose(9) && !isDecadeClose(SEMICENTENNIAL_YEAR), 'the decades close at 10, 20, 30 and 40');
  const rng = s.rng;
  openSummerPromises(s);
  assert(s.rng === rng, 'the offer draws nothing from the run\'s random stream');
  const offer = promisesOf(s).offer;
  assert(offer !== null && offer.decade && offer.ids.length === Math.min(DECADE_LIST, dealable(fresh(10)).length) && offer.ids.length > 0, `a list of ${DECADE_LIST} to choose from (${offer?.ids.join(', ')})`);
  assert(new Set(offer!.ids).size === offer!.ids.length, 'all different');
  assert(offerRoom(s) === DECADE_PICKS, `up to ${DECADE_PICKS} may be taken`);
  const again = fresh(10);
  openSummerPromises(again);
  assert(JSON.stringify(promisesOf(again).offer) === JSON.stringify(offer), 'the same college in the same year is offered the same list');
  answerPromises(s, offer!.ids);
  const p = promisesOf(s);
  assert(p.active.length === DECADE_PICKS, 'taking all three takes only two');
  assert(p.declined.length === offer!.ids.length - DECADE_PICKS && p.offer === null, 'and the rest are declined');
  assert(p.active.every((a) => a.dueYear === 10 + promiseById(a.id)!.years), 'each due its years from now');
}

// ---- Declining is free, and the harness declines ----
{
  let s = fresh(10);
  s.pendingInterrupt = { type: 'summer', payload: { beat: 0, tuition: s.finance.listedTuition, admitRate: s.students.admitRate } };
  openSummerPromises(s);
  const cash = s.finance.cash;
  const confidence = distressOf(s).confidence;
  s = reducer(s, defaultAnswer(s)!);
  const p = promisesOf(s);
  assert(p.active.length === 0 && p.offer === null && p.declined.length > 0, 'leaving the Review beat without choosing declines the offer');
  assert(s.finance.cash === cash && distressOf(s).confidence === confidence, 'at no cost');
}

// ---- Settling: kept and missed ----
{
  const def = PROMISES.find((d) => (d.reward.confidence ?? 0) > 0 && (d.penalty.confidence ?? 0) < 0)!;
  const s = fresh(12);
  s.promises = { active: [{ id: def.id, madeYear: 12 - def.years, dueYear: 12 }], settled: [], declined: [], offer: null };
  const met = goalMet(s, def);
  const before = distressOf(s).confidence;
  openSummerPromises(s);
  const r = promisesOf(s).settled[0];
  assert(r?.id === def.id && r.year === 12 && r.kept === met, `"${def.id}" is read out when due, ${met ? 'kept' : 'missed'}`);
  const moved = distressOf(s).confidence - before;
  assert(met ? moved > 0 : moved < 0, `and paid for (board confidence ${moved > 0 ? '+' : ''}${moved})`);
  assert(promisesOf(s).active.length === 0, 'and leaves the docket');
  assert(s.log.some((l) => l.topic === 'ambition' && l.message.includes(def.title)), 'the log says so');
  assert(!dealable(s).some((d) => d.id === def.id), 'a promise settled is never offered again');
}

// ---- The cap ----
{
  const s = fresh(10);
  const ids = PROMISES.slice(0, PROMISE_CAP).map((d) => d.id);
  s.promises = { active: ids.map((id) => ({ id, madeYear: 9, dueYear: 30 })), settled: [], declined: [], offer: null };
  openSummerPromises(s);
  assert(promisesOf(s).offer === null, `${PROMISE_CAP} open is as many as the college will make`);
}

// ---- An ordinary summer offers at most one ----
{
  let offered = 0;
  for (let y = 3; y < 50; y++) {
    if (isDecadeClose(y)) continue;
    const s = fresh(y);
    openSummerPromises(s);
    const o = promisesOf(s).offer;
    if (o) {
      offered += 1;
      assert(o.ids.length === 1 && !o.decade, `year ${y}: one promise offered`);
    }
  }
  assert(offered > 5 && offered < 40, `about half the ordinary summers offer one (${offered} of 43)`);
}

// ---- The save ----
{
  const s = fresh(10);
  openSummerPromises(s);
  answerPromises(s, promisesOf(s).offer!.ids.slice(0, 1));
  saveGame(s);
  const back = loadGame()!;
  assert(JSON.stringify(back.promises) === JSON.stringify(s.promises), 'promises save and load');
  s.promises!.active.push({ id: 'no-such-promise', madeYear: 1, dueYear: 2 });
  saveGame(s);
  assert(loadGame()!.promises!.active.every((a) => a.id !== 'no-such-promise'), 'a promise the game no longer has is dropped');
  (s as unknown as { promises: unknown }).promises = { active: 'x' };
  saveGame(s);
  assert(loadGame()!.promises === undefined, 'a malformed record is dropped whole');
  (s as unknown as { ambitions: unknown }).ambitions = { 'top-fifty': 1 };
  delete s.promises;
  saveGame(s);
  assert(!('ambitions' in loadGame()!), 'the retired achievements are dropped from older saves');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
