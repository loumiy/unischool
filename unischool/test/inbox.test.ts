// The inbox (Plan 77, systems/inbox/inbox.ts): everything addressed to the
// president, read off state the game already keeps, in three tiers. Only
// what wants an answer counts on the toolbar's button, red in its last
// week; unread letters dot it; bulletins never count and clear after a
// term. NEXT points at the inbox only for what will not wait.

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { bindScriptStream } from '../src/engine/random';
import { afterSubject, answered, BULLETIN_WEEKS, bulletins, finalReportUp, inboxBadge, inboxItems, INTERRUPT_ITEM_ID } from '../src/systems/inbox/inbox';
import { inboxPointer } from '../src/systems/guidance/nextStep';
import { arrivalsIn } from '../src/components/Toasts';
import { CHARTER_EVENTS, EVENT_CATALOGUE } from '../src/data/eventCatalogue';
import { BOARD_QUESTIONS } from '../src/data/boardQuestionData';
import { FESTIVAL_EVENT } from '../src/data/downtownData';
import { initialTech } from '../src/data/techData';
import { SPORTS } from '../src/data/studentLifeData';
import { isPlaceableKind } from '../src/state/campusMap';
import { eventTitle, eventTexts, fill, rollVars } from '../src/systems/events/catalogue';
import { firstSentence } from '../src/systems/events/catalogueEngine';
import { CHARTER_ID, MILESTONES } from '../src/data/ladderData';
import { WEEKS_PER_YEAR, type GameState } from '../src/state/types';
import { foundingDistress, postBoardLetter } from '../src/systems/finance/distress';

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

// A milestone celebration is news, not a stop (Plan 95T): the week it
// lands it is a letter, the clock runs on, and a year later it has gone.
{
  const s = fresh();
  const key = 'school-founded:Business';
  s.events.pendingMilestones = [key];
  const was = { ...s.clock };
  const after = reducer(s, { type: 'TICK' });
  assert(after.pendingInterrupt?.type !== 'milestone', 'a celebration does not stop the clock');
  const letter = after.events.news!.find((n) => n.type === 'milestone');
  assert(letter?.type === 'milestone' && letter.payload.keys.includes(key), 'it is filed as a letter');
  const item = inboxItems(after).find((i) => i.kind === 'news');
  assert(item?.tier === 'letter' && item.from === 'A celebration' && item.subject === 'This is the School of Business', `the inbox names it (${item?.from}: ${item?.subject})`);
  assert(after.pendingInterrupt !== null || after.clock.week !== was.week, 'and the week turns unless something else stopped it');
  const arrived = arrivalsIn(s, after).find((t) => t.open === item?.id);
  assert(arrived?.tone === 'letter' && !arrived.held, 'its slip arrives as a letter\'s does');
  const read = reducer(after, { type: 'READ_NEWS', id: letter!.id });
  assert(inboxItems(read).find((i) => i.kind === 'news')?.unread === false, 'opened, it is read');
  read.clock.year += 1;
  assert(!inboxItems(read).some((i) => i.kind === 'news'), 'a year on it has left the inbox');
}

// An inline event: to decide, counted, red in its last week.
{
  const s = fresh();
  withEvent(s, weekOf(s));
  const items = inboxItems(s);
  const e = items.find((i) => i.kind === 'event')!;
  assert(e !== undefined && e.tier === 'decide' && e.weeksLeft === inline.timeoutWeeks && !e.urgent, 'an event waits to be decided, with its weeks');
  assert(e.subject === inline.title, `with its title for a subject ("${e.subject}")`);
  assert(e.preview === fill(inline.text, s.catalogue!.pending[0].vars).split('\n')[0], 'and its text, from the start, for a preview');
  let badge = inboxBadge(items);
  assert(badge.count === 1 && !badge.urgent, 'it counts on the button, calmly');
  assert(inboxPointer(s) === null, 'NEXT leaves a matter with weeks to go to the button');

  s.catalogue!.pending[0].firedWeek = weekOf(s) - inline.timeoutWeeks + 1;
  badge = inboxBadge(inboxItems(s));
  assert(badge.urgent, 'in its last week the count turns red');
  const p = inboxPointer(s);
  assert(p !== null && p.go === 'inbox' && p.urgent === true && p.text === `Answer this week: ${e.subject}`, `and NEXT points at the inbox, by the matter's subject ("${p?.text}")`);

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
  s.ladder.reached[m.id] = s.clock.year;
  s.ladder.reachedWeek[m.id] = weekOf(s) - 3;
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

// Letters leave the inbox a year after they arrive (Plan 80D): a milestone's
// from the week it was reached, a founding note from its moment; read or
// not. A save from before the milestones kept their week reads week 1 of
// the year.
{
  const s = fresh();
  const m = MILESTONES.find((x) => x.id !== CHARTER_ID && !x.quiet && !x.side)!;
  const has = (id: string) => inboxItems(s).some((i) => i.id === id);
  s.ladder.reached[m.id] = s.clock.year - 1;
  s.ladder.reachedWeek[m.id] = weekOf(s) - (WEEKS_PER_YEAR - 1);
  s.ladder.unread = [m.id];
  assert(has(`milestone:${m.id}`), 'a milestone reached 51 weeks ago is still a letter');
  s.ladder.reachedWeek[m.id] = weekOf(s) - WEEKS_PER_YEAR;
  assert(!has(`milestone:${m.id}`), 'a year after it was reached, it has left, unread or not');
  assert(inboxBadge(inboxItems(s)).unreadLetters === 0, 'and dots the button no more');
  delete (s.ladder.reachedWeek as Record<string, number>)[m.id];
  s.ladder.reached[m.id] = s.clock.year;
  assert(has(`milestone:${m.id}`), 'one with no week recorded is dated to the start of its year');
  s.ladder.reached[m.id] = s.clock.year - 1;
  assert(!has(`milestone:${m.id}`), 'and leaves a year after that');

  const dorm = s.tech.find((t) => t.kind === 'dorm')!;
  const at = (w: number) => ({ year: Math.floor((w - 1) / WEEKS_PER_YEAR) + 1, week: ((w - 1) % WEEKS_PER_YEAR) + 1 });
  s.clock.year = 2;
  s.clock.week = 30;
  s.log = [{ ...at(weekOf(s) - 20), message: `${dorm.name} is finished.`, kind: 'good', topic: 'building', subject: dorm.id }];
  assert(has('founding:firstResidence'), 'the first residence\'s note arrives in the founding years');
  s.clock.year = 3;
  s.clock.week = 10;
  assert(!has('founding:firstResidence'), 'and leaves a year after its moment');
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
  s.finance.distress = { ...foundingDistress(), letters: ['enter-2'] };
  const b = inboxItems(s).find((i) => i.kind === 'board')!;
  assert(b.tier === 'letter' && b.unread, 'the board\'s letter is a letter');
  const p = inboxPointer(s);
  assert(p?.text === 'The board has written to you' && p.urgent === true && p.go === 'inbox', 'and NEXT points at it');
  s = reducer(s, { type: 'READ_BOARD_LETTER' });
  assert(!inboxItems(s).some((i) => i.kind === 'board'), 'noted, it leaves the queue');
  s.finance.distress!.letters = ['idle-cash'];
  assert(inboxItems(s).find((i) => i.kind === 'board')?.tier === 'decide', 'the idle-cash letter asks for an answer');
}

// The board's letter keeps the week it came (Plan 95K, the second review's
// H7-5): one from week 5 still reads week 5 at week 30, and "Noted" puts
// its week away with it, so the next reads its own.
{
  let s = fresh();
  s.clock.week = 5;
  postBoardLetter(s, 'enter-2');
  const came = weekOf(s);
  s.clock.week = 12;
  postBoardLetter(s, 'enter-3');
  s.clock.week = 30;
  const board = () => inboxItems(s).find((i) => i.kind === 'board');
  assert(board()?.week === came, `a letter from week 5 reads week 5 at week 30 (${board()?.week} of ${came})`);
  s = reducer(s, { type: 'READ_BOARD_LETTER' });
  assert(board()?.ref === 'enter-3' && board()?.week === came + 7, 'noted, the next letter reads its own week');
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
  after.ladder.reachedWeek[m.id] = weekOf(after);
  after.ladder.unread = [m.id];
  const got = arrivalsIn(before, after);
  // A matter to decide has no slip (Plan 124 C): the badge and NEXT carry it.
  assert(got.length === 1, `a milestone arrives, the event does not (${got.length})`);
  assert(!got.some((t) => t.open === 'event:a'), 'no slip for a matter to decide');
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

  s.pendingInterrupt = { type: 'summer', payload: { beat: 2, tuition: 1, admitRate: 0.5 } };
  assert(inboxItems(s)[0].subject === `Year ${s.clock.year}: Students`, 'the summer, by its beat');
  // The summer waits to be opened (Plan 112C), so it keeps its row on its
  // pages' beats too: admissions and the Final Report are pages once open.
  s.pendingInterrupt = { type: 'summer', payload: { beat: 1, tuition: 1, admitRate: 0.5 } };
  assert(inboxItems(s)[0]?.id === INTERRUPT_ITEM_ID && inboxItems(s)[0].subject === `Year ${s.clock.year}: Admissions`, 'its admissions waits in the inbox too, until opened');
  assert(!arrivalsIn(fresh(), s).some((t) => t.open === INTERRUPT_ITEM_ID), 'with its own call over the map, not a slip');

  s.pendingInterrupt = { type: 'summer', payload: { beat: 0, final: true, tuition: 1, admitRate: 0.5 } };
  assert(finalReportUp(s) && inboxItems(s)[0].subject === `Year ${s.clock.year}: The Final Report`, 'the Final Report waits as the summer, then keeps its page');
}

// A row does not say its sentence twice (Plan 125G1): the preview starts
// after the subject when the subject is the text's first sentence, cut or
// whole.
{
  const first = 'An inspector spent forty minutes in the boiler room of the Art Gallery, then came out and condemned the boiler.';
  const rest = 'The building is cold and the notice on the door is red.';
  const text = `${first} ${rest}\nA second paragraph.`;
  assert(first.length > 90, 'a first sentence too long for a subject');
  assert(afterSubject(text, `${first.slice(0, 87)}…`) === rest, 'cut with an ellipsis, the subject still opens the sentence, and the preview starts after it');
  assert(afterSubject(text, first.replace(/\.$/, '')) === rest, 'as it does whole');
  assert(afterSubject(text, 'Art Gallery: boiler condemned') === `${first} ${rest}`, 'under a title, the preview is the text from its start');
  assert(afterSubject('Dr. Novotny has an offer. They brought the letter.', 'Dr. Novotny has an offer') === 'They brought the letter.', 'a title\'s stop does not end the sentence');
  assert(afterSubject(first, first.replace(/\.$/, '')) === first, 'and a text of one sentence keeps it');
  assert(firstSentence(text) === first, 'the first sentence is read whole');
}

// Every event has a subject (Plan 125G2): a title of three to six words,
// under 50 characters with the longest names the game can put in it, in
// sentence case, with no final stop and nothing left unfilled.
{
  const all = [...EVENT_CATALOGUE, ...CHARTER_EVENTS, FESTIVAL_EVENT, ...BOARD_QUESTIONS];
  const catalogue = EVENT_CATALOGUE;
  const untitled = all.filter((e) => typeof e.title !== 'string' || e.title.trim().length === 0).map((e) => e.id);
  assert(untitled.length === 0, `every event has a title (${untitled.join(', ') || 'all'})`);

  const NAMES = ['building', 'faculty', 'class', 'sport'];
  const names = (t: string) => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  const strange = catalogue.filter((e) => names(e.title).some((n) => !NAMES.includes(n))).map((e) => e.id);
  assert(strange.length === 0, `a title names only a building, a professor, a class or a sport (${strange.join(', ') || 'all'})`);
  const letters = all.filter((e) => e.kind === 'seismic' && e.title.includes('{')).map((e) => e.id);
  assert(letters.length === 0, `a letter's title, which the chronicle reads unfilled, names nothing (${letters.join(', ') || 'all'})`);
  // A title names only what its every telling names.
  const unnamed = catalogue.filter((e) => names(e.title).some((n) => !eventTexts(e).every((t) => t.includes(`{${n}}`)))).map((e) => e.id);
  assert(unnamed.length === 0, `a title names only what every telling of its text names (${unnamed.join(', ') || 'all'})`);

  const written = catalogue.filter((e) => e.title.length >= 50).map((e) => e.id);
  assert(written.length === 0, `every title is under 50 characters as written (${written.join(', ') || 'all'})`);
  // The longest each name runs: a building's and a team's from the data, a
  // class's from the ledger's two forms, a professor's a long one.
  const longest = (xs: string[]) => xs.reduce((a, b) => (b.length > a.length ? b : a), '');
  const long: Record<string, string> = {
    building: longest(initialTech().filter(isPlaceableKind).map((t) => t.name)),
    faculty: 'Dr. Aleksandra Kowalczyk',
    class: 'first graduating class',
    sport: longest(SPORTS.map((x) => x.teamName.replace(/ Team$/, ''))),
  };
  assert(long.building.length >= 25 && long.sport.length >= 20, `the longest names are long ("${long.building}", "${long.sport}")`);
  const over = catalogue.filter((e) => eventTitle(e, long).length >= 50).map((e) => `${e.id} (${eventTitle(e, long).length})`);
  assert(over.length === 0, `every title is under 50 characters with the longest names in it (${over.join(', ') || 'all'})`);

  const s = fresh();
  const filled = catalogue.map((e) => ({ e, title: eventTitle(e, rollVars(s, e)) }));
  const open = filled.filter((x) => x.title.includes('{')).map((x) => x.e.id);
  assert(open.length === 0, `a filled title holds no unfilled name (${open.join(', ') || 'all'})`);
  const lower = filled.filter((x) => x.title[0] !== x.title[0].toUpperCase()).map((x) => x.title);
  assert(lower.length === 0, `a filled title starts with a capital (${lower.join(', ') || 'all'})`);
  assert(eventTitle({ ...catalogue[0], title: '{building}: boiler condemned' }, { building: 'the Chapel' }) === 'The Chapel: boiler condemned', 'a building named first takes its capital');
  const stopped = all.filter((e) => /[.!…]$/.test(e.title)).map((e) => e.id);
  assert(stopped.length === 0, `no title ends in a stop (${stopped.join(', ') || 'all'})`);
  const wordy = catalogue.filter((e) => e.kind === 'inline' && !e.id.startsWith('town-')).filter((e) => { const n = e.title.split(/\s+/).length; return n < 3 || n > 6; }).map((e) => e.id);
  assert(wordy.length === 0, `an inline event's title is three to six words (${wordy.join(', ') || 'all'})`);
  const dashed = all.filter((e) => /[—–]/.test(e.title)).map((e) => e.id);
  assert(dashed.length === 0, `no title holds a dash (${dashed.join(', ') || 'all'})`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
