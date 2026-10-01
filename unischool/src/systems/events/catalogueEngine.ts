import type { CatalogueState, GameState, PendingCatalogueEvent } from '../../state/types';
import { WEEKS_PER_YEAR, totalEnrolled } from '../../state/types';
import type { CatalogueEvent } from '../../data/eventCatalogueTypes';
import { absoluteWeek, DECISION_EVENT_COOLDOWN_WEEKS, DECISION_EVENT_FIRST_YEAR } from '../../data/eventData';
import { random, newId } from '../../engine/random';
import { EVENT_CATALOGUE, applyEffects, eligible, eventById, eventText, fill, pickTelling, priceScale, rollVars, scaledEffects } from './catalogue';
import { hasTag } from '../identity/tags';
import { makePromise } from '../promises/promises';
import { handlerFor, seatTitle } from '../delegation/seats';
import { weeksOfOpEx } from '../../data/moneyScale';
import { ESCALATION_WEEKS_OF_OPEX, seatDef } from '../../data/seatData';
import { CHARTER_EVENT } from '../../data/eventCatalogue';
import { CHARTER_INSTANCE, charterVars } from './charter';
import { FESTIVAL_EVENT, FESTIVAL_INSTANCE, FESTIVAL_WEEK, downtownWorks, festivalHeld } from '../../data/downtownData';

// THE PANEL (Plan 32): when the catalog's events fire, how they wait, and
// how they are answered. Inline events queue in the panel and never stop
// the clock; if nobody answers, each takes its default when its weeks run
// out. Seismic events are the board's letters and do stop it. A seat
// covering an inline event's domain answers it by policy.

// The cadence. Held back through the founding years; then a small college
// sees an inline event every few months and a large one more often. Letters
// are rarer, and spaced a year apart.
const INLINE_WEEKLY_CHANCE = 0.05;
const INLINE_SPACING_WEEKS = 6;
const INLINE_QUEUE_MAX = 3;
const SEISMIC_WEEKLY_CHANCE = 0.012;
const SEISMIC_SPACING_WEEKS = 52;
// The pull of an identity tag an event favors (data/tagData.ts).
const FAVOUR_WEIGHT = 2;

export function sizeFactor(s: GameState): number {
  const body = totalEnrolled(s.students);
  return Math.min(2, 1 + Math.max(0, Math.log2(Math.max(1, body) / 1000)) / 4);
}

export function catalogueOf(s: GameState): CatalogueState {
  return s.catalogue ?? { pending: [], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0 };
}

function offCooldown(s: GameState, e: CatalogueEvent): boolean {
  const last = catalogueOf(s).lastFired[e.id];
  return last === undefined || s.clock.year - last >= e.cooldownYears;
}

function draw(s: GameState, kind: CatalogueEvent['kind']): CatalogueEvent | null {
  const pending = new Set(catalogueOf(s).pending.map((p) => p.eventId));
  const pool = EVENT_CATALOGUE.filter((e) => e.kind === kind && !pending.has(e.id) && offCooldown(s, e) && eligible(s, e));
  const weightOf = (e: CatalogueEvent) => e.weight * ((e.favours ?? []).some((t) => hasTag(s, t)) ? FAVOUR_WEIGHT : 1);
  const total = pool.reduce((t, e) => t + weightOf(e), 0);
  if (total <= 0) return null;
  let roll = random() * total;
  for (const e of pool) {
    roll -= weightOf(e);
    if (roll <= 0) return e;
  }
  return pool[pool.length - 1];
}

// ---- Seats ----
// The choice a policy takes over the catalog's own effects: thrifty
// spends least, thorough most, popular pleases most (mood), ties cheaper.
export function seatAnswer(s: GameState, e: CatalogueEvent, scale: number): string | null {
  const seat = handlerFor(s, e.domain);
  if (!seat) return null;
  const spend = (i: number) => -(scaledEffects(e.choices[i].effects, scale).cash ?? 0);
  const most = Math.max(0, ...e.choices.map((_, i) => spend(i)));
  if (most > weeksOfOpEx(s, ESCALATION_WEEKS_OF_OPEX)) return null;
  const def = seatDef(seat.seatId)!;
  const rule = (def.policies.find((p) => p.id === seat.policy) ?? def.policies[0]).rule;
  const mood = (i: number) => e.choices[i].effects.mood ?? 0;
  let best = 0;
  for (let i = 1; i < e.choices.length; i++) {
    const better = rule === 'thrifty' ? spend(i) < spend(best)
      : rule === 'thorough' ? spend(i) > spend(best)
        : mood(i) > mood(best) || (mood(i) === mood(best) && spend(i) < spend(best));
    if (better) best = i;
  }
  if (spend(best) > s.finance.cash) return null;
  return e.choices[best].id;
}

// ---- Firing ----
// Called by eventSystem.ts after everything earned has had its chance: a
// letter claims the week and stops the clock; an inline event joins the
// panel and the clock runs on.
export function tickCatalogue(s: GameState): void {
  if (s.clock.year < DECISION_EVENT_FIRST_YEAR || s.pendingInterrupt) return;
  const c = s.catalogue ??= { pending: [], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0 };
  const week = absoluteWeek(s);
  // A letter stops the clock, so it keeps the decision events' global
  // quiet stretch (eventData.ts) as well as its own year apart.
  const quiet = s.events.lastDecisionWeek === 0 || week - s.events.lastDecisionWeek >= DECISION_EVENT_COOLDOWN_WEEKS;
  if (quiet && week - c.lastSeismicWeek >= SEISMIC_SPACING_WEEKS && random() < SEISMIC_WEEKLY_CHANCE) {
    const e = draw(s, 'seismic');
    if (e) {
      const p = fire(s, e);
      c.lastSeismicWeek = week;
      s.events.lastDecisionWeek = week;
      s.pendingInterrupt = { type: 'catalogue-letter', payload: { instanceId: p.instanceId } };
      return;
    }
  }
  if (drawnWaiting(c) >= INLINE_QUEUE_MAX || week - c.lastInlineWeek < INLINE_SPACING_WEEKS) return;
  if (random() >= INLINE_WEEKLY_CHANCE * sizeFactor(s)) return;
  const e = draw(s, 'inline');
  if (!e) return;
  const p = fire(s, e);
  c.lastInlineWeek = week;
  const choice = seatAnswer(s, e, p.scale);
  if (choice) resolveCatalogueEvent(s, p.instanceId, choice, 'seat');
}

// The drawn events waiting: the charter and the spring festival are raised,
// not drawn, and hold no place in the queue the draws are held to.
function drawnWaiting(c: CatalogueState): number {
  return c.pending.filter((p) => p.eventId !== CHARTER_EVENT.id && p.eventId !== FESTIVAL_EVENT.id).length;
}

// The charter (charter.ts), raised by eventSystem.ts rather than drawn: a
// fixed id and names read off the state, so it takes nothing from the run's
// stream, and no seat answers it: the name is the President's.
export function raiseCharter(s: GameState): void {
  const c = s.catalogue ??= { pending: [], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0 };
  if (c.pending.some((p) => p.eventId === CHARTER_EVENT.id)) return;
  c.pending.push({ instanceId: CHARTER_INSTANCE, eventId: CHARTER_EVENT.id, firedWeek: absoluteWeek(s), vars: charterVars(s), scale: priceScale(s) });
}

// The spring festival (Plan 85H, data/downtownData.ts), raised by
// eventSystem.ts each week before anything can claim it: from FESTIVAL_WEEK
// of each year at a college specialized in student life, once a year, while
// none waits. A fixed id and no names, so it takes nothing from the run's
// stream, and no seat answers it: the festival is the President's. An inbox
// matter, so it never stops the clock.
export function raiseFestival(s: GameState): boolean {
  if (!downtownWorks(s) || s.sandbox) return false;
  if (s.clock.week < FESTIVAL_WEEK || s.clock.week >= WEEKS_PER_YEAR) return false;
  if (festivalHeld(s, s.clock.year)) return false;
  const c = s.catalogue ??= { pending: [], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0 };
  if (c.pending.some((p) => p.eventId === FESTIVAL_EVENT.id)) return false;
  c.pending.push({ instanceId: FESTIVAL_INSTANCE, eventId: FESTIVAL_EVENT.id, firedWeek: absoluteWeek(s), vars: {}, scale: priceScale(s) });
  c.lastFired[FESTIVAL_EVENT.id] = s.clock.year;
  return true;
}

function fire(s: GameState, e: CatalogueEvent): PendingCatalogueEvent {
  const c = s.catalogue!;
  const variant = pickTelling(e, s.clock.year, c.lastVariant?.[e.id]);
  const p: PendingCatalogueEvent = { instanceId: newId(), eventId: e.id, firedWeek: absoluteWeek(s), vars: rollVars(s, e), scale: priceScale(s), variant };
  c.pending.push(p);
  c.lastFired[e.id] = s.clock.year;
  (c.lastVariant ??= {})[e.id] = variant;
  return p;
}

// Inline events whose weeks are up take their default. Run every week,
// before anything can claim it.
export function timeOutCatalogue(s: GameState): void {
  const c = s.catalogue;
  if (!c) return;
  const week = absoluteWeek(s);
  // Answering replaces c.pending with a new array, so this walk is safe.
  for (const p of c.pending) {
    const e = eventById(p.eventId);
    if (!e) { c.pending = c.pending.filter((x) => x !== p); continue; }
    if (e.kind === 'inline' && week - p.firedWeek >= e.timeoutWeeks) resolveCatalogueEvent(s, p.instanceId, e.default, 'timeout');
  }
}

// ---- Answering ----
export function choiceCost(e: CatalogueEvent, choiceId: string, scale: number): number {
  const choice = e.choices.find((c) => c.id === choiceId);
  return choice ? Math.max(0, -(scaledEffects(choice.effects, scale).cash ?? 0)) : 0;
}

export function resolveCatalogueEvent(s: GameState, instanceId: string, choiceId: string, by: 'player' | 'seat' | 'timeout' = 'player'): boolean {
  const c = s.catalogue;
  const p = c?.pending.find((x) => x.instanceId === instanceId);
  if (!c || !p) return false;
  const e = eventById(p.eventId);
  // An event gone from the catalog since a save was written passes.
  if (!e) { c.pending = c.pending.filter((x) => x !== p); return false; }
  const choice = e.choices.find((x) => x.id === choiceId);
  if (!choice) return false;
  // The player cannot choose what the college cannot pay for, bar the
  // default, which is always there to take; the clock's default and a
  // seat's answer are paid however they can be.
  if (by === 'player' && choiceId !== e.default && choiceCost(e, choiceId, p.scale) > Math.max(0, s.finance.cash)) return false;
  applyEffects(s, scaledEffects(choice.effects, p.scale), p.vars);
  // What an answer does beyond the levers (Plan 76D).
  if (choice.promise) makePromise(s, choice.promise);
  if (choice.mascot && !s.self.mascot) s.self.mascot = choice.mascot;
  c.pending = c.pending.filter((x) => x.instanceId !== instanceId);
  journal(c, e, choiceId, by, s.clock.year);
  const title = e.title ?? firstSentence(fill(eventText(e, p), p.vars));
  const who = by === 'seat'
    ? (() => { const seat = handlerFor(s, e.domain)!; return `${seatTitle(seatDef(seat.seatId)!, seat.school)} ${seat.holder} answered`; })()
    : by === 'timeout' ? 'Nobody answered in time' : 'Answered';
  s.log.unshift({ year: s.clock.year, week: s.clock.week, kind: 'info', topic: 'event', message: `${title} — ${who}: ${fill(choice.label, p.vars)}.` });
  return true;
}

// The journal (Plan 33): letters for good, inline answers counted by year.
function journal(c: CatalogueState, e: CatalogueEvent, choiceId: string, by: 'player' | 'seat' | 'timeout', year: number): void {
  if (e.kind === 'seismic') {
    (c.letters ??= []).push({ eventId: e.id, choiceId, year });
    return;
  }
  const rows = (c.answered ??= []);
  let row = rows[rows.length - 1];
  if (!row || row.year !== year) rows.push(row = { year, player: 0, seat: 0, timeout: 0 });
  row[by] += 1;
}

// A sentence ends at a stop that is not a title's ("Dr. Novotny", Plan 35).
export function firstSentence(text: string): string {
  const cut = text.search(/(?<!\b(?:Dr|Mr|Mrs|Ms|Prof|St))[.!?](\s|$)/);
  const first = cut === -1 ? text : text.slice(0, cut + 1);
  return first.length > 90 ? `${first.slice(0, 87)}…` : first;
}
