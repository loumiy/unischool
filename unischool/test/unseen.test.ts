// No decision passes unseen (Plan 78E, systems/inbox/unseen.ts): when the
// shell pauses the clock for the inbox. A new matter pauses it while the
// setting is on; a matter's final week, unopened, pauses it once whatever
// the setting; neither acts while a stop or the walkthrough holds the
// clock. Also the one countdown label, the "To decide" filter's count, the
// setting's default and the arrival slips that stay.

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { bindScriptStream } from '../src/engine/random';
import { inboxBadge, inboxItems } from '../src/systems/inbox/inbox';
import { dueLabel, forgetOpened, keepOpened, readOpened, toDecideCount, unseenPause, type UnseenMemory } from '../src/systems/inbox/unseen';
import { normaliseSettings, DEFAULT_SETTINGS } from '../src/settings';
import { trimToasts } from '../src/components/Toasts';
import { EVENT_CATALOGUE } from '../src/data/eventCatalogue';
import { weeksProse, weeksShort } from '../src/format';
import { WEEKS_PER_YEAR, type GameState } from '../src/state/types';

bindScriptStream(7802);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('unseen tests');

const inline = EVENT_CATALOGUE.find((x) => x.kind === 'inline' && x.timeoutWeeks >= 3 && !/\{\w+\}/.test(x.text))!;
const weekOf = (s: GameState) => (s.clock.year - 1) * WEEKS_PER_YEAR + s.clock.week;
function withEvent(s: GameState, firedWeek: number, instanceId = 'a'): void {
  const c = s.catalogue ??= { pending: [], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0 };
  c.pending.push({ instanceId, eventId: inline.id, firedWeek, vars: {}, scale: 1 });
}
function fresh(): GameState {
  const s = createInitialState('Unseen');
  s.pendingInterrupt = null;
  s.clock.year = 5;
  s.clock.week = 10;
  return s;
}
const none: ReadonlySet<string> = new Set();
function step(before: UnseenMemory | null, s: GameState, opts: { on?: boolean; held?: boolean; opened?: ReadonlySet<string> } = {}) {
  return unseenPause(before, { items: inboxItems(s), pauseOnArrival: opts.on ?? true, held: opts.held ?? false, opened: opts.opened ?? none });
}
// The week turning, with the matter's clock running.
function tick(s: GameState): void {
  s.clock.week += 1;
}

// The setting: on by default, and on for a browser that kept its settings
// before the key existed.
{
  assert(DEFAULT_SETTINGS.pauseOnArrival === true, 'the setting is on by default');
  assert(normaliseSettings({ textScale: 1.15, vision: 'safe', motion: 'reduce' }).pauseOnArrival === true, 'a browser without the key reads it as on');
  assert(normaliseSettings({ pauseOnArrival: false }).pauseOnArrival === false, 'turned off, it stays off');
  assert(normaliseSettings(null).pauseOnArrival === true, 'no settings at all: on');
}

// A matter arriving pauses the clock with the setting on, not with it off.
{
  const s = fresh();
  const quiet = step(null, s);
  assert(!quiet.pause, 'nothing waiting: the clock runs');
  withEvent(s, weekOf(s));
  const on = step(quiet.memory, s);
  assert(on.pause && on.reason === 'arrival', 'a matter arriving pauses the clock with the setting on');
  const off = step(quiet.memory, s, { on: false });
  assert(!off.pause, 'with it off, the clock runs on (the ease to 1x is useGame.ts\'s)');
  const again = step(on.memory, s);
  assert(!again.pause, 'the same matter a week later is not an arrival');
}

// A load or a new game is not an arrival.
{
  const s = fresh();
  withEvent(s, weekOf(s));
  assert(!step(null, s).pause, 'what the college already holds at a load does not pause it');
}

// A student demand arrives as a matter too.
{
  let s = fresh();
  s.students.classes = { freshman: 3000, sophomore: 2000, junior: 2000, senior: 2000 };
  const before = step(null, s);
  s = reducer(s, { type: 'DEBUG_FORCE_DEMAND', subject: 'basicNeeds' });
  const out = step(before.memory, s);
  assert(out.pause && out.reason === 'arrival', 'a student demand arriving pauses the clock');
}

// The final week: whatever the setting, once, and only unopened.
{
  const s = fresh();
  withEvent(s, weekOf(s));
  let m = step(null, s, { on: false }).memory;
  const weeksToFinal = inline.timeoutWeeks - 1;
  let pauses = 0;
  for (let w = 0; w < weeksToFinal; w++) {
    tick(s);
    const out = step(m, s, { on: false });
    m = out.memory;
    if (out.pause) {
      pauses += 1;
      assert(out.reason === 'final-week', 'the pause is the final week\'s');
      const item = inboxItems(s).find((i) => i.kind === 'event')!;
      assert(item.weeksLeft === 1, `it comes as the matter enters its final week (${item.weeksLeft} left)`);
    }
  }
  assert(pauses === 1, `a matter unopened pauses the clock once in its final week, setting off (${pauses})`);
  const later = step(m, s, { on: false });
  assert(!later.pause, 'and not again the same week');
}
{
  const s = fresh();
  withEvent(s, weekOf(s) - inline.timeoutWeeks + 2);
  const m = step(null, s).memory;
  tick(s);
  const opened = step(m, s, { opened: new Set(['event:a']) });
  assert(!opened.pause, 'a matter already opened does not pause in its final week');
}
{
  let s = fresh();
  s.students.classes = { freshman: 3000, sophomore: 2000, junior: 2000, senior: 2000 };
  s = reducer(s, { type: 'DEBUG_FORCE_DEMAND', subject: 'basicNeeds' });
  s = reducer(s, { type: 'READ_DEMAND' });
  s.events.activeDemand!.deadlineWeek = weekOf(s) + 2;
  const m = step(null, s).memory;
  tick(s);
  assert(!step(m, s).pause, 'a demand noted in the save counts as opened');
}

// Opened before a reload (Plan 95AA, the second review's H7-4): the page
// keeps the opened matters for the session under the run, and the
// reloaded page reads them back, so the final week does not pause.
{
  const kept = new Map<string, string>();
  const store = { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => { kept.set(k, v); }, removeItem: (k: string) => { kept.delete(k); } };
  const s = fresh();
  withEvent(s, weekOf(s) - inline.timeoutWeeks + 2);
  keepOpened(s.self.name, new Set(['event:a']), store);
  // The reload: a new page, its memory empty, the opened set read back.
  const read = readOpened(s.self.name, store);
  assert(read.has('event:a'), 'a reload reads back the matters opened before it');
  const m = step(null, s, { opened: read }).memory;
  tick(s);
  assert(inboxItems(s).find((i) => i.kind === 'event')?.weeksLeft === 1, 'the matter reaches its final week after the reload');
  assert(!step(m, s, { opened: read }).pause, 'a matter opened before a reload does not pause in its final week');
  // Read back empty, as before the fix, it does.
  assert(step(m, s).pause, 'read back empty, the same matter pauses');
  assert(readOpened('Another College', store).size === 0, 'another run in the tab reads none of them');
  forgetOpened(store);
  assert(readOpened(s.self.name, store).size === 0, 'a new game forgets them');
  const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
  keepOpened(s.self.name, read, blocked);
  forgetOpened(blocked);
  assert(readOpened(s.self.name, blocked).size === 0, 'blocked storage only loses the convenience');
}

// Not while a stop or the walkthrough holds; the final week waits for the
// hold to lift.
{
  const s = fresh();
  const quiet = step(null, s);
  withEvent(s, weekOf(s) - inline.timeoutWeeks + 1);
  const held = step(quiet.memory, s, { held: true });
  assert(!held.pause, 'a matter arriving under a stop does not pause (the stop holds the clock)');
  const lifted = step(held.memory, s);
  assert(lifted.pause && lifted.reason === 'final-week', 'once the hold lifts, an unopened final week pauses');
  assert(!step(lifted.memory, s).pause, 'once');
}
{
  const s = fresh();
  const quiet = step(null, s);
  withEvent(s, weekOf(s));
  const held = step(quiet.memory, s, { held: true });
  const lifted = step(held.memory, s);
  assert(!lifted.pause, 'an arrival seen under a hold is not an arrival again after it');
}

// One pause covers an arrival that is already in its final week.
{
  const s = fresh();
  const quiet = step(null, s);
  withEvent(s, weekOf(s) - inline.timeoutWeeks + 1);
  const out = step(quiet.memory, s);
  assert(out.pause && out.reason === 'arrival', 'an arrival in its final week pauses once');
  assert(!step(out.memory, s).pause, 'and its final week does not pause again');
}

// The memory keeps only what still waits.
{
  const s = fresh();
  withEvent(s, weekOf(s) - inline.timeoutWeeks + 1);
  const m = step(null, s).memory;
  assert(m.warned.has('event:a'), 'a final week paused for is remembered');
  s.catalogue!.pending = [];
  assert(step(m, s).memory.warned.size === 0, 'and forgotten once the matter is answered');
}

// One countdown label: the final week is "Final week" in the list and the
// reading pane alike.
{
  assert(dueLabel(1, weeksShort) === 'Final week' && dueLabel(1, weeksProse) === 'Final week', 'the last week reads "Final week" in both');
  assert(dueLabel(0, weeksProse) === 'This week', 'nothing waits at zero, but it keeps a label');
  assert(dueLabel(3, weeksShort) === '3w' && dueLabel(3, weeksProse) === '3 weeks', 'earlier weeks keep each view\'s own form');
  const s = fresh();
  withEvent(s, weekOf(s) - inline.timeoutWeeks + 1);
  const e = inboxItems(s).find((i) => i.kind === 'event')!;
  assert(e.urgent === true && dueLabel(e.weeksLeft!, weeksProse) === 'Final week', 'a matter in its last week says so');
}

// The "To decide" filter counts the matters, not the stop; the toolbar's
// button still counts the stop, as what wants an answer (Plan 77 C).
{
  let s = fresh();
  withEvent(s, weekOf(s));
  s.pendingInterrupt = { type: 'dean-recommendations', payload: { schools: [] } };
  const items = inboxItems(s);
  assert(toDecideCount(items) === 1, `the filter counts the matter, not the stop (${toDecideCount(items)})`);
  assert(inboxBadge(items).count === 2, 'the button counts both');
  s.pendingInterrupt = null;
  s.students.classes = { freshman: 3000, sophomore: 2000, junior: 2000, senior: 2000 };
  s = reducer(s, { type: 'DEBUG_FORCE_DEMAND', subject: 'basicNeeds' });
  assert(toDecideCount(inboxItems(s)) === 2, 'an unread demand counts');
  s = reducer(s, { type: 'READ_DEMAND' });
  assert(toDecideCount(inboxItems(s)) === inboxBadge(inboxItems(s)).count, 'a noted demand is a goal, as on the button');
}

// The arrival slips that stay are the last to go when the stack is full.
{
  const list = [{ id: 1, held: true }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
  const kept = trimToasts(list, 4);
  assert(kept.length === 4 && kept[0].id === 1 && !kept.some((t) => t.id === 2), 'a held slip outlasts the news');
  const all = trimToasts([1, 2, 3, 4, 5].map((id) => ({ id, held: true })), 4);
  assert(all.length === 4 && all[0].id === 2, 'held slips alone: the oldest goes');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
