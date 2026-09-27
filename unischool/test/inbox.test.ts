// The inbox (Plan 77, systems/inbox/inbox.ts): everything addressed to the
// president, read off state the game already keeps, in three tiers. Only
// what wants an answer counts on the toolbar's button, red in its last
// week; unread letters dot it; bulletins never count and clear after a
// term. NEXT points at the inbox only for what will not wait.

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { bindScriptStream } from '../src/engine/random';
import { answered, BULLETIN_WEEKS, bulletins, finalReportUp, inboxBadge, inboxItems, INTERRUPT_ITEM_ID } from '../src/systems/inbox/inbox';
import { inboxPointer } from '../src/systems/guidance/nextStep';
import { arrivalsIn } from '../src/components/Toasts';
import { EVENT_CATALOGUE } from '../src/data/eventCatalogue';
import { CHARTER_ID, MILESTONES } from '../src/data/ladderData';
import { WEEKS_PER_YEAR, type GameState } from '../src/state/types';

bindScriptStream(7601);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('inbox tests');

const inline = EVENT_CATALOGUE.find((x) => x.kind === 'inline' && x.timeoutWeeks >= 3 && !/\{\w+\}/.test(x.text))!;
const weekOf = (s: GameState) => (s.clock.year - 1) * WEEKS_PER_YEAR + s.clock.week;
function withEvent(s: GameState, firedWeek: number, instanceId = 'a'): void {
  const c = s.catalogue ??= { pending: [], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0 };
  c.pending.push({ instanceId, eventId: inline.id, firedWeek, vars: {}, scale: 1 });
}
function fresh(): GameState {
  const s = createInitialState('Inbox');
  s.pendingInterrupt = null;
  s.clock.year = 5;
  s.clock.week = 10;
  return s;
}

{
  const s = fresh();
  const empty = inboxBadge(inboxItems(s));
  assert(empty.count === 0 && !empty.urgent && empty.unreadLetters === 0, 'a new college: nothing on the button');
  assert(inboxItems(s).every((i) => i.kind !== 'milestone'), 'the charter is not a letter');
  assert(inboxPointer(s) === null, 'and nothing for NEXT to point at');
}

// An inline event: to decide, counted, red in its last week.
{
  const s = fresh();
  withEvent(s, weekOf(s));
  const items = inboxItems(s);
  const e = items.find((i) => i.kind === 'event')!;
  assert(e !== undefined && e.tier === 'decide' && e.weeksLeft === inline.timeoutWeeks && !e.urgent, 'an event waits to be decided, with its weeks');
  assert(e.subject.length > 0 && e.subject.length <= 90, `with a subject cut to a sentence ("${e.subject}")`);
  let badge = inboxBadge(items);
  assert(badge.count === 1 && !badge.urgent, 'it counts on the button, calmly');
  assert(inboxPointer(s) === null, 'NEXT leaves a matter with weeks to go to the button');

  s.catalogue!.pending[0].firedWeek = weekOf(s) - inline.timeoutWeeks + 1;
  badge = inboxBadge(inboxItems(s));
  assert(badge.urgent, 'in its last week the count turns red');
  const p = inboxPointer(s);
  assert(p !== null && p.go === 'inbox' && p.urgent === true && p.text.startsWith('Lapses this week:'), `and NEXT points at the inbox ("${p?.text}")`);

  withEvent(s, weekOf(s), 'b');
  const order = inboxItems(s).filter((i) => i.tier === 'decide').map((i) => i.ref);
  assert(order[0] === 'a' && order[1] === 'b', 'the soonest deadline first');
}

// Answering takes it out of the inbox and into the Answered list.
{
  let s = fresh();
  withEvent(s, weekOf(s));
  s.finance.cash = 1e12;
  s = reducer(s, { type: 'RESOLVE_CATALOGUE_EVENT', instanceId: 'a', choiceId: inline.default });
  assert(!inboxItems(s).some((i) => i.kind === 'event'), 'an answered event leaves the inbox');
  const a = answered(s);
  assert(a.length === 1 && a[0].message.includes(' — Answered: '), 'and is kept in Answered, off the log');
}

// Milestones: every one reached is a letter; unread until read.
{
  let s = fresh();
  const m = MILESTONES.find((x) => x.id !== CHARTER_ID && !x.quiet && !x.side)!;
  s.ladder.reached[m.id] = 3;
  s.ladder.unread = [m.id];
  let letter = inboxItems(s).find((i) => i.id === `milestone:${m.id}`)!;
  assert(letter !== undefined && letter.tier === 'letter' && letter.unread, 'a milestone reached arrives as an unread letter');
  let badge = inboxBadge(inboxItems(s));
  assert(badge.count === 0 && badge.unreadLetters === 1, 'a letter dots the button, it does not count');
  s = reducer(s, { type: 'READ_MILESTONE', id: m.id });
  letter = inboxItems(s).find((i) => i.id === `milestone:${m.id}`)!;
  assert(letter !== undefined && !letter.unread, 'read, it stays in the inbox for the record');
  badge = inboxBadge(inboxItems(s));
  assert(badge.unreadLetters === 0, 'and the dot goes');
}

// A student demand: to decide, counted until read, listed until met.
{
  let s = fresh();
  s.students.classes = { freshman: 3000, sophomore: 2000, junior: 2000, senior: 2000 };
  s = reducer(s, { type: 'DEBUG_FORCE_DEMAND', subject: 'basicNeeds' });
  const d = () => inboxItems(s).find((i) => i.kind === 'demand');
  assert(d()?.tier === 'decide' && d()?.unread === true, 'a demand arrives to be decided');
  assert(inboxBadge(inboxItems(s)).count === 1, 'and counts while unread');
  s = reducer(s, { type: 'READ_DEMAND' });
  assert(d() !== undefined && inboxBadge(inboxItems(s)).count === 0, 'read, it stays on the list as a goal and stops counting');
}

// The board: a distress letter is a letter, the idle-cash ask is to decide.
{
  let s = fresh();
  s.finance.distress = { ...s.finance.distress!, letters: ['enter-2'] };
  const b = inboxItems(s).find((i) => i.kind === 'board')!;
  assert(b.tier === 'letter' && b.unread, 'the board\'s letter is a letter');
  const p = inboxPointer(s);
  assert(p?.text === 'The board has written' && p.urgent === true && p.go === 'inbox', 'and NEXT points at it');
  s = reducer(s, { type: 'READ_BOARD_LETTER' });
  assert(!inboxItems(s).some((i) => i.kind === 'board'), 'noted, it leaves the queue');
  s.finance.distress!.letters = ['idle-cash'];
  assert(inboxItems(s).find((i) => i.kind === 'board')?.tier === 'decide', 'the idle-cash letter asks for an answer');
}

// Bulletins: the toasts' news for a term, never counted.
{
  const s = fresh();
  const now = weekOf(s);
  const at = (w: number) => ({ year: Math.floor((w - 1) / WEEKS_PER_YEAR) + 1, week: ((w - 1) % WEEKS_PER_YEAR) + 1 });
  s.log = [
    { ...at(now), message: 'Elm Hall is finished.', kind: 'info', topic: 'building', subject: 'x' },
    { ...at(now - 1), message: 'A line about money.', kind: 'info', topic: 'money' },
    { ...at(now - BULLETIN_WEEKS), message: 'Too old.', kind: 'good', topic: 'program' },
  ];
  const b = bulletins(s);
  assert(b.length === 1 && b[0].subject === 'Elm Hall is finished.', 'a building finished is a bulletin; money is not, and a term on it is gone');
  assert(inboxBadge(inboxItems(s)).count === 0 && inboxBadge(inboxItems(s)).unreadLetters === 0, 'bulletins never touch the button');
}

// Arrivals: what the toasts announce with an Open button.
{
  const before = fresh();
  const after = structuredClone(before);
  withEvent(after, weekOf(after));
  const m = MILESTONES.find((x) => x.id !== CHARTER_ID && !x.quiet)!;
  after.ladder.reached[m.id] = 5;
  after.ladder.unread = [m.id];
  const got = arrivalsIn(before, after);
  assert(got.length === 2, `an event and a milestone arrive (${got.length})`);
  assert(got.some((t) => t.tone === 'matter' && t.open === 'event:a' && t.text.includes('to answer')), 'the event as a matter to open');
  assert(got.some((t) => t.tone === 'letter' && t.open === `milestone:${m.id}`), 'the milestone as a letter to open');
  assert(arrivalsIn(after, after).length === 0, 'nothing arrives twice');
}

// A stop: pinned first, counted and red, never a slip; the Final Report
// keeps its own page.
{
  const s = fresh();
  withEvent(s, weekOf(s));
  s.pendingInterrupt = { type: 'dean-recommendations', payload: { schools: [] } };
  const items = inboxItems(s);
  assert(items[0].id === INTERRUPT_ITEM_ID && items[0].tier === 'hold' && items[0].subject === 'The Deans\' recommendations', 'a stop is pinned first, named');
  const badge = inboxBadge(items);
  assert(badge.count === 2 && badge.urgent, 'it counts, in red');
  const before = fresh();
  assert(!arrivalsIn(before, s).some((t) => t.open === INTERRUPT_ITEM_ID), 'the inbox opens on a stop, so no slip announces it');

  s.pendingInterrupt = { type: 'summer', payload: { beat: 1, tuition: 1, admitRate: 0.5 } };
  assert(inboxItems(s)[0].subject === `Year ${s.clock.year}: Admissions`, 'the summer, by its beat');

  s.pendingInterrupt = { type: 'summer', payload: { beat: 0, final: true, tuition: 1, admitRate: 0.5 } };
  assert(finalReportUp(s) && !inboxItems(s).some((i) => i.tier === 'hold'), 'the Final Report keeps its page');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
