import type { GameState, PromiseState } from '../../state/types';
import { institutionName } from '../../state/types';
import {
  DECADE_LIST, DECADE_PICKS, DECADE_YEARS, PROMISES, PROMISE_CAP, PROMISE_LINES, PROMISE_OFFER_ODDS, promiseById,
  type PromiseDef,
} from '../../data/promiseData';
import { SEMICENTENNIAL_YEAR } from '../../state/types';
import { hashUnit } from '../../data/rivalData';
import { applyEffects, priceScale, scaledEffects, whenMet } from '../events/catalogue';

// PROMISES (Plan 33, V2 #25, #26): the president's public commitments. Each
// summer the promises that came due are read out, kept or missed, and paid
// for; then, with room, one more may be offered. At the close of a decade
// the board offers a short list instead, to take up to two from. Declining
// costs nothing. Offers are drawn from a hash of the college and the year,
// not the run's random stream, so a run that declines everything is the
// run it would have been.

export function promisesOf(s: GameState): PromiseState {
  return s.promises ?? { active: [], settled: [], declined: [], offer: null };
}

export function goalMet(s: GameState, def: PromiseDef): boolean {
  return whenMet(s, def.goal);
}

// Never one held or settled, never one whose terms are unmet, and never one
// already achieved (that is a report, not a promise).
export function dealable(s: GameState): PromiseDef[] {
  const p = promisesOf(s);
  const held = new Set(p.active.map((a) => a.id));
  const done = new Set(p.settled.map((a) => a.id));
  return PROMISES.filter((d) => !held.has(d.id) && !done.has(d.id) && whenMet(s, d.deal) && !goalMet(s, d));
}

export function isDecadeClose(year: number): boolean {
  return year % DECADE_YEARS === 0 && year < SEMICENTENNIAL_YEAR;
}

function draw(s: GameState, salt: string): number {
  return hashUnit(`${s.self.name}|${s.clock.year}|${salt}`);
}

function weightedPick(pool: PromiseDef[], roll: number): PromiseDef | null {
  const total = pool.reduce((t, d) => t + d.weight, 0);
  if (total <= 0) return null;
  let left = roll * total;
  for (const d of pool) {
    left -= d.weight;
    if (left <= 0) return d;
  }
  return pool[pool.length - 1];
}

function log(s: GameState, message: string, kind: 'good' | 'bad' | 'info'): void {
  s.log.unshift({ year: s.clock.year, week: s.clock.week, kind, message, topic: 'ambition' });
}

// When the summer opens: settle what is due, then make the year's offer.
export function openSummerPromises(s: GameState): void {
  const p = { ...promisesOf(s) };
  p.active = [...p.active];
  p.settled = [...p.settled];
  const scale = priceScale(s);
  // Settling replaces p.active with a new array, so this walk is safe.
  for (const a of p.active) {
    if (a.dueYear > s.clock.year) continue;
    const def = promiseById(a.id);
    p.active = p.active.filter((x) => x !== a);
    if (!def) continue;
    const kept = goalMet(s, def);
    applyEffects(s, scaledEffects(kept ? def.reward : def.penalty, scale));
    p.settled.push({ id: def.id, year: s.clock.year, kept });
    log(s, `${kept ? 'Kept' : 'Missed'}: ${def.title}. ${fillCollege(s, kept ? def.kept : def.missed)}`, kept ? 'good' : 'bad');
  }
  p.offer = null;
  const room = PROMISE_CAP - p.active.length;
  if (room > 0) {
    s.promises = p;
    const pool = dealable(s);
    if (isDecadeClose(s.clock.year)) {
      const ids: string[] = [];
      let rest = pool;
      for (let i = 0; i < DECADE_LIST && rest.length > 0; i++) {
        const d = weightedPick(rest, draw(s, `decade-${i}`));
        if (!d) break;
        ids.push(d.id);
        rest = rest.filter((x) => x !== d);
      }
      if (ids.length > 0) p.offer = { ids, decade: true };
    } else if (draw(s, 'odds') < PROMISE_OFFER_ODDS) {
      const d = weightedPick(pool, draw(s, 'pick'));
      if (d) p.offer = { ids: [d.id], decade: false };
    }
  }
  if (p.active.length > 0 || p.settled.length > 0 || p.declined.length > 0 || p.offer) s.promises = p;
  else delete s.promises;
}

// How many of the offer the college may take now.
export function offerRoom(s: GameState): number {
  const p = promisesOf(s);
  if (!p.offer) return 0;
  return Math.min(p.offer.decade ? DECADE_PICKS : 1, PROMISE_CAP - p.active.length);
}

// The Review beat's answer: the ids taken; the rest of the offer is declined.
export function answerPromises(s: GameState, take: readonly string[]): void {
  const p = promisesOf(s);
  if (!p.offer) return;
  const room = offerRoom(s);
  const taken = p.offer.ids.filter((id) => take.includes(id)).slice(0, room);
  const next: PromiseState = { ...p, active: [...p.active], declined: [...p.declined], offer: null };
  for (const id of p.offer.ids) {
    const def = promiseById(id);
    if (!def) continue;
    if (taken.includes(id)) {
      next.active.push({ id, madeYear: s.clock.year, dueYear: s.clock.year + def.years });
      log(s, PROMISE_LINES.accepted.replace('{title}', def.title).replace('{years}', String(def.years)), 'info');
    } else {
      next.declined.push({ id, year: s.clock.year });
    }
  }
  s.promises = next;
}

export function fillCollege(s: GameState, text: string): string {
  return text.replace(/\{college\}/g, institutionName(s.self));
}
