// The event catalogue (Plan 32): v2's events as data, read against this
// game's state (systems/events/catalogue.ts), fired, queued, answered and
// timed out (systems/events/catalogueEngine.ts).

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { bindScriptStream } from '../src/engine/random';
import { EVENT_CATALOGUE } from '../src/data/eventCatalogue';
import type { CatalogueEvent } from '../src/data/eventCatalogueTypes';
import { DECISION_EVENT_FIRST_YEAR, DECISION_EVENTS } from '../src/data/eventData';
import { tagById } from '../src/data/tagData';
import {
  applyEffects, conditionsMet, eventById, fill, priceScale, rollVars, scaledEffects,
} from '../src/systems/events/catalogue';
import { catalogueOf, resolveCatalogueEvent, sizeFactor, tickCatalogue, timeOutCatalogue } from '../src/systems/events/catalogueEngine';
import { tickEvents } from '../src/systems/events/eventSystem';
import { treeCount } from '../src/systems/estate/woodland';
import { debtOutstanding } from '../src/systems/finance/treasury';
import { loadGame, saveGame } from '../src/state/persistence';
import { WEEKS_PER_YEAR, totalEnrolled } from '../src/state/types';
import type { GameState, PendingCatalogueEvent } from '../src/state/types';

bindScriptStream(3232);
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

console.log('event catalogue tests');

function fresh(year = 5): GameState {
  const s = createInitialState('Catalogue');
  s.pendingInterrupt = null;
  s.clock.year = year;
  s.clock.week = 10;
  return s;
}

// Puts an event in the panel as if it had just fired.
function waiting(s: GameState, e: CatalogueEvent): PendingCatalogueEvent {
  const c = s.catalogue ??= { pending: [], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0 };
  const p: PendingCatalogueEvent = {
    instanceId: `t-${c.pending.length}-${e.id}`,
    eventId: e.id,
    firedWeek: (s.clock.year - 1) * WEEKS_PER_YEAR + s.clock.week,
    vars: rollVars(s),
    scale: priceScale(s),
  };
  c.pending.push(p);
  return p;
}

// ---- The content ----
{
  const ids = new Set(EVENT_CATALOGUE.map((e) => e.id));
  assert(ids.size === EVENT_CATALOGUE.length, 'every event has its own id');
  assert(EVENT_CATALOGUE.length >= 150, `the catalogue is v2's, less what this game has no place for (${EVENT_CATALOGUE.length})`);
  const letters = EVENT_CATALOGUE.filter((e) => e.kind === 'seismic');
  assert(letters.length >= 15 && letters.length < EVENT_CATALOGUE.length / 4, `a few of them are letters (${letters.length})`);
  assert(EVENT_CATALOGUE.every((e) => e.choices.some((c) => c.id === e.default)), 'every default is one of its choices');
  assert(EVENT_CATALOGUE.every((e) => new Set(e.choices.map((c) => c.id)).size === e.choices.length && e.choices.length >= 2), 'every event offers at least two distinct answers');
  assert(EVENT_CATALOGUE.every((e) => e.choices.every((c) => Object.keys(c.effects).length > 0)), 'every answer does something');
  assert(EVENT_CATALOGUE.every((e) => e.kind === 'seismic' || e.timeoutWeeks >= 1), 'every inline event waits at least a week');
  assert(EVENT_CATALOGUE.every((e) => e.weight > 0 && e.cooldownYears >= 0), 'weights and cooldowns are sane');
  assert(EVENT_CATALOGUE.every((e) => (e.favours ?? []).every((t) => tagById(t) !== undefined)), 'every favoured tag exists');
  const vars = rollVars(fresh());
  const unfilled = EVENT_CATALOGUE.filter((e) => /\{\w+\}/.test(fill(e.text, vars)) || e.choices.some((c) => /\{\w+\}/.test(fill(c.label, vars))));
  assert(unfilled.length === 0, `every name in the text is one the game fills (${unfilled.map((e) => e.id).join(', ')})`);
  const text = EVENT_CATALOGUE.map((e) => `${e.text} ${e.choices.map((c) => c.label).join(' ')}`).join(' ');
  assert(!/\b(programmes?|colours?|centres?|licence|catalogue)\b/i.test(text), 'in this game\'s American spelling');
  assert(!/\badjunct|\bcharter\b/i.test(text), 'and about nothing this game does not have');
  assert(DECISION_EVENTS.every((e) => !['roof-failure', 'heating-plant', 'estate-gift', 'winter-storm'].includes(e.id)), 'this game\'s texture events are retired');
  assert(DECISION_EVENTS.some((e) => e.id === 'hellenic-council') && DECISION_EVENTS.some((e) => e.id === 'naming-rights'), 'the questions that belong to a system stay');
}

// ---- Prices ----
{
  const s = fresh();
  const scale = priceScale(s);
  assert(scale >= 0.2 && scale <= 12, `the price scale is bounded (${scale})`);
  s.finance.weeklyOpEx = 1e9;
  assert(priceScale(s) === 12, 'never above twelve times v2\'s');
  s.finance.weeklyOpEx = 30_000_000 / WEEKS_PER_YEAR;
  assert(Math.abs(priceScale(s) - 2) < 0.01, 'and twice v2\'s for a $30M budget');
  const scaled = scaledEffects({ cash: -200_000, mood: 3, backlog: 10_000 }, 2);
  assert(scaled.cash === -400_000 && scaled.mood === 3, 'money scales, points do not');
  assert(scaled.backlog === 10_000, 'and a sum under $25,000 prices a thing, not a size');
  assert(scaledEffects({ cash: -123_456 }, 1.37).cash === -170_000, 'scaled sums are rounded to two figures');
}

// ---- Conditions ----
{
  const s = fresh(2);
  const late = EVENT_CATALOGUE.find((e) => (e.when.yearAtLeast ?? 0) >= 10)!;
  assert(!conditionsMet(s, late), `"${late.id}" waits for year ${late.when.yearAtLeast}`);
  s.clock.year = late.when.yearAtLeast!;
  assert(conditionsMet(s, { ...late, when: { yearAtLeast: late.when.yearAtLeast } }), 'and comes when it arrives');
  const rich: CatalogueEvent = { ...late, when: { cashOver: 1_000_000 } };
  s.finance.weeklyOpEx = 150_000_000 / WEEKS_PER_YEAR; // ten times v2's
  s.finance.cash = 5_000_000;
  assert(!conditionsMet(s, rich), 'a money threshold scales with the budget');
  s.finance.cash = 11_000_000;
  assert(conditionsMet(s, rich), 'so "over $1M" means over $10M at ten times the budget');
}

// ---- Effects ----
{
  const s = fresh();
  const cash = s.finance.cash;
  applyEffects(s, { cash: -50_000, mood: 500 });
  assert(s.finance.cash === cash - 50_000, 'cash is paid');
  assert(s.students.satisfaction === 100, 'mood is satisfaction points, kept within 0 to 100');

  const body = totalEnrolled(s.students);
  const fr = s.students.classes.freshman;
  applyEffects(s, { enrollment: -200 });
  const lost = fr - s.students.classes.freshman;
  assert(lost === Math.round((200 / 2000) * body), `enrollment is a share of the body, taken from the incoming class (${lost})`);
  const cohorts = Object.values(s.students.cohortsByClass.freshman).reduce((a, b) => a + b, 0);
  assert(cohorts === s.students.classes.freshman, 'and the class\'s cohort mix still adds up');

  const trees = treeCount(s);
  applyEffects(s, { trees: 12 });
  assert(treeCount(s) === trees + 12, 'trees are planted');
  applyEffects(s, { trees: -5 });
  assert(treeCount(s) === trees + 7, 'and felled');
  assert(Object.keys(s.trees).every((k) => !(k in s.pathways)), 'never on a path');

  applyEffects(s, { debt: 2_000_000 });
  assert(Math.abs(debtOutstanding(s) - 2_000_000) < 1, 'debt is a loan, repaid like any other');
  applyEffects(s, { debt: -2_500_000 });
  assert(debtOutstanding(s) === 0 && s.finance.loans === undefined, 'and paying down more than is owed clears it');

  const hall = s.tech.find((t) => t.kind === 'building' && t.status === 'done')!;
  applyEffects(s, { backlog: 100_000 });
  assert((hall.backlog ?? 0) > 0, 'deferred repairs land on the buildings');
  applyEffects(s, { backlog: -10_000_000 });
  assert(s.tech.every((t) => t.backlog === undefined), 'and repairs pay them off');
}

// ---- Firing ----
{
  const s = fresh(DECISION_EVENT_FIRST_YEAR - 1);
  for (let i = 0; i < 200; i++) tickCatalogue(s);
  assert(catalogueOf(s).pending.length === 0, 'nothing fires in the founding years');

  const t = fresh(8);
  let letters = 0;
  let most = 0;
  let fired = 0;
  for (let w = 0; w < WEEKS_PER_YEAR * 6; w++) {
    t.clock.week = (w % WEEKS_PER_YEAR) + 1;
    t.clock.year = 8 + Math.floor(w / WEEKS_PER_YEAR);
    const before = catalogueOf(t).lastInlineWeek + catalogueOf(t).lastSeismicWeek;
    timeOutCatalogue(t);
    tickCatalogue(t);
    if (catalogueOf(t).lastInlineWeek + catalogueOf(t).lastSeismicWeek !== before) fired += 1;
    most = Math.max(most, catalogueOf(t).pending.filter((p) => eventById(p.eventId)?.kind === 'inline').length);
    if (t.pendingInterrupt?.type === 'catalogue-letter') {
      letters += 1;
      t.pendingInterrupt = null;
      const letter = catalogueOf(t).pending.find((p) => eventById(p.eventId)?.kind === 'seismic')!;
      resolveCatalogueEvent(t, letter.instanceId, eventById(letter.eventId)!.default, 'timeout');
    }
  }
  assert(fired >= 6, `a running college sees events (${fired} in six years)`);
  assert(most <= 3, 'never more than three wait in the panel');
  assert(letters <= 6, `letters are rare (${letters} in six years)`);
  const big = fresh();
  big.students.classes.freshman *= 16;
  assert(sizeFactor(big) > sizeFactor(fresh()), 'a large college hears more often');
}

// ---- Answering, and looking away ----
{
  const s = fresh();
  const e = EVENT_CATALOGUE.find((x) => x.kind === 'inline' && x.choices.some((c) => c.id !== x.default && (c.effects.cash ?? 0) < -100_000))!;
  const dear = e.choices.find((c) => c.id !== e.default && (c.effects.cash ?? 0) < -100_000)!;
  const p = waiting(s, e);
  s.finance.cash = 0;
  assert(!resolveCatalogueEvent(s, p.instanceId, dear.id), 'a player cannot choose what the college cannot pay for');
  s.finance.cash = 1e9;
  const log = s.log.length;
  let r = reducer(s, { type: 'RESOLVE_CATALOGUE_EVENT', instanceId: p.instanceId, choiceId: dear.id });
  assert(catalogueOf(r).pending.length === 0 && r.log.length === log + 1, 'an answer applies, leaves the panel, and is logged');
  assert(r.finance.cash === 1e9 + (scaledEffects(dear.effects, p.scale).cash ?? 0), 'at the sums fixed when it fired');

  const q = waiting(r, e);
  r.clock.week += e.timeoutWeeks;
  timeOutCatalogue(r);
  assert(catalogueOf(r).pending.every((x) => x.instanceId !== q.instanceId), 'left alone, it takes its default when its weeks run out');
  assert(r.log[0].message.includes('Nobody answered'), 'and the log says so');

  r = reducer(r, { type: 'APPOINT_SEAT', seatId: 'facilities', school: null });
  const covered = EVENT_CATALOGUE.find((x) => x.kind === 'inline' && x.domain === 'estate')!;
  const w = waiting(r, covered);
  assert(resolveCatalogueEvent(r, w.instanceId, covered.default, 'seat') && r.log[0].message.includes('Facilities Director'), 'a seat\'s answer is signed');
}

// ---- Letters ----
{
  const s = fresh();
  const e = EVENT_CATALOGUE.find((x) => x.kind === 'seismic')!;
  const p = waiting(s, e);
  s.pendingInterrupt = { type: 'catalogue-letter', payload: { instanceId: p.instanceId } };
  const week = s.clock.week;
  const answer = defaultAnswer(s);
  assert(answer?.type === 'RESOLVE_CATALOGUE_EVENT' && answer.choiceId === e.default, 'a fast-forward answers a letter with its default');
  const r = reducer(s, answer!);
  assert(r.pendingInterrupt === null && r.clock.week === week + 1, 'which clears it and resumes the clock');
  assert(catalogueOf(r).pending.length === 0, 'and it is answered');
  const t = fresh();
  t.pendingInterrupt = { type: 'catalogue-letter', payload: { instanceId: 'gone' } };
  assert(reducer(t, defaultAnswer(t)!).pendingInterrupt === null, 'a mislaid letter is put down, never wedging the clock');
}

// ---- Through the event system and a save ----
{
  let s = fresh(10);
  for (let i = 0; i < WEEKS_PER_YEAR * 3 && catalogueOf(s).pending.length === 0; i++) {
    s.clock.week = (i % WEEKS_PER_YEAR) + 1;
    tickEvents(s);
    if (s.pendingInterrupt) s = reducer(s, defaultAnswer(s)!);
  }
  assert(s.catalogue !== undefined, 'the event system runs the catalogue');
  const c = catalogueOf(s);
  c.pending.push({ instanceId: 'stale', eventId: 'no-such-event', firedWeek: 1, vars: {}, scale: 1 });
  saveGame(s);
  const loaded = loadGame()!;
  assert(loaded.catalogue !== undefined && loaded.catalogue.pending.every((p) => p.eventId !== 'no-such-event'), 'the catalogue saves, less events it no longer has');
  assert(JSON.stringify(loaded.catalogue!.lastFired) === JSON.stringify(c.lastFired), 'and remembers what fired when');
  (s as unknown as { catalogue: unknown }).catalogue = { pending: 'nonsense' };
  saveGame(s);
  assert(loadGame()!.catalogue === undefined, 'a malformed record is dropped');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
