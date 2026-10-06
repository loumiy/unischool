// ---------------------------------------------------------------------
// The events made true (Plan 76D): what an answer says it does, it does.
//   - The lever test: a choice whose label names a lever (hire, pay,
//     repair, plant, fell, list, promise, draw, close, salary, campaign)
//     touches that lever in its effects, or says what it does instead.
//   - Every event can fire: its conditions can all hold in one week the
//     catalog ticks (no winter that only week 52 reaches, no v2 mood scale,
//     no program count below the three every college founds with).
//   - The winter is the turn of the terms (the review's G7-3).
//   - The building, the class and the professor an event names are the
//     ones it means.
//   - The new effects do what they render as.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { bindScriptStream, random } from '../src/engine/random';
import { EVENT_CATALOGUE } from '../src/data/eventCatalogue';
import { applyEffects, eligible, eventById, rollVars, TENURE_CASE_MAX_YEARS, TENURE_CASE_MIN_YEARS } from '../src/systems/events/catalogue';
import { resolveCatalogueEvent } from '../src/systems/events/catalogueEngine';
import { springTermWeek, winterDepth } from '../src/state/winter';
import { promisesOf } from '../src/systems/promises/promises';
import { WEEKS_PER_YEAR, type GameState } from '../src/state/types';
import type { CatalogueChoice } from '../src/data/eventCatalogueTypes';

bindScriptStream(7676);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('event truth tests');

// ---- The lever test ----
// Each lever a label can name, and what its effects must touch for the
// label to be true. A label that names a lever the game cannot move from
// an event (a hire, a closure, a salary, a campaign, the draw rate) fails
// outright: it should say what the answer really does.
type Lever = { word: RegExp; ok: (c: CatalogueChoice) => boolean; why: string };
const e = (c: CatalogueChoice) => c.effects;
const spends = (c: CatalogueChoice) => (e(c).cash ?? 0) < 0 || (e(c).endowment ?? 0) < 0;
const LEVERS: Lever[] = [
  { word: /\b(hire|appoint)\b/i, ok: spends, why: 'a hire costs money (and names no one the market did not)' },
  { word: /\b(fund|pay|buy|install|endow|build|rebuild|replace)\b/i, ok: (c) => spends(c) || (e(c).backlog ?? 0) < 0 || (e(c).buildingFund ?? 0) !== 0 || (e(c).warmth ?? 0) > 0, why: 'what is paid for is paid' },
  { word: /\b(repair|fix|put it right|renovat)/i, ok: (c) => (e(c).backlog ?? 0) < 0 || spends(c), why: 'a repair clears backlog or costs' },
  { word: /\b(plant|replant)\b(?! and)/i, ok: (c) => (e(c).trees ?? 0) > 0 || (e(c).replant ?? 0) > 0, why: 'planting plants' },
  { word: /\bfell\b/i, ok: (c) => (e(c).trees ?? 0) < 0, why: 'felling fells' },
  { word: /\b(designation|historic)\b/i, ok: (c) => (e(c).historic ?? 0) > 0 || /object/i.test(c.label), why: 'supporting a designation declares the building historic' },
  { word: /^promise\b/i, ok: (c) => !!c.promise, why: 'a promise is made in the promise system' },
  { word: /\b(cut|stop) (the )?draw/i, ok: () => false, why: 'no event can set the draw rate' },
  { word: /\bclose (it|the (east end|laborator|labs?\b)|down)/i, ok: () => false, why: 'no event can close a program, a building or a lab' },
  { word: /\bsalar(y|ies)\b/i, ok: () => false, why: 'no event can set salaries' },
  { word: /\b(run|launch) a (capital )?campaign\b/i, ok: () => false, why: 'no event starts a campaign' },
];
for (const ev of EVENT_CATALOGUE) {
  for (const c of ev.choices) {
    for (const lever of LEVERS) {
      if (lever.word.test(c.label)) assert(lever.ok(c), `${ev.id} "${c.label}": ${lever.why}`);
    }
    // Money that flows the wrong way: an answer that says it spends does not bring cash in.
    if (/\b(cut|spend|fund|pay)\b/i.test(c.label)) assert((e(c).cash ?? 0) <= 0, `${ev.id} "${c.label}" does not bring the college cash`);
  }
}

// ---- Every event can fire ----
const tickingWeeks = Array.from({ length: WEEKS_PER_YEAR - 1 }, (_, i) => i + 1); // the summer beat holds week 52
for (const ev of EVENT_CATALOGUE) {
  const w = ev.when;
  if (w.winterAtLeast !== undefined) {
    const weeks = tickingWeeks.filter((k) => winterDepth(k) >= w.winterAtLeast! && (w.springWeekAtMost === undefined || (springTermWeek(k) > 0 && springTermWeek(k) <= w.springWeekAtMost)));
    assert(weeks.length > 0, `${ev.id}: its winter comes in a week the catalog ticks`);
  }
  assert((w.yearAtLeast ?? 0) <= 50, `${ev.id}: its year comes within fifty`);
  assert(w.yearAtMost === undefined || w.yearAtMost >= (w.yearAtLeast ?? 0), `${ev.id}: its years overlap`);
  assert(w.programsUnder === undefined || w.programsUnder > 3, `${ev.id}: a college founds with three programs`);
  assert(w.moodUnder === undefined || w.moodUnder >= 20, `${ev.id}: satisfaction runs to 100, not v2's mood scale`);
  assert(w.moodOver === undefined || w.moodOver > 0, `${ev.id}: a mood floor of 0 is always true`);
  assert(ev.choices.some((c) => c.id === ev.default), `${ev.id}: its default is one of its answers`);
}

// ---- The winter ----
{
  const heating = eventById('the-heating-bill')!;
  const weeks = tickingWeeks.filter((k) => winterDepth(k) >= heating.when.winterAtLeast!);
  assert(weeks.every((k) => k >= 18 && k <= 35), `the heating bill comes at the turn of the terms (${weeks[0]}–${weeks[weeks.length - 1]})`);
  const dark = eventById('the-dark-term')!;
  const darkWeeks = tickingWeeks.filter((k) => winterDepth(k) >= dark.when.winterAtLeast! && springTermWeek(k) > 0 && springTermWeek(k) <= dark.when.springWeekAtMost!);
  assert(darkWeeks.length > 0 && darkWeeks.every((k) => k > 26), `the dark term is the Spring Term's start (${darkWeeks.join(', ')})`);
}

// ---- What an event names ----
function college(): GameState {
  const s = createInitialState('Truth');
  s.clock.year = 30;
  return s;
}
{
  const s = college();
  const standing = s.tech.filter((t) => t.kind !== 'course' && t.status === 'done');
  assert(standing.length > 0, 'the founding college has a building');
  const worst = standing[0];
  worst.backlog = worst.cost * 5;
  const vars = rollVars(s, eventById('derelict-notice')!);
  assert(vars.buildingId === worst.id, `the town writes about the derelict building (${vars.building})`);
  s.alumni = [0, 1, 3, 5, 7].map((out) => ({ classYear: 30 - out, size: 100, warmth: 50, memory: [] } as unknown as NonNullable<GameState['alumni']>[number]));
  const reunion = rollVars(s, eventById('the-reunion-gift')!);
  assert(reunion.class === 'class of Year 25', `a reunion gift comes from a reunion class (${reunion.class})`);
}

// ---- The professor an event names (Plan 79D, the review's G7-10) ----
{
  const s = college();
  while (s.faculty.length < 3) s.faculty.push({ ...structuredClone(s.faculty[0]), id: `extra-${s.faculty.length}`, name: `Extra ${s.faculty.length}` });
  const [researcher, teacher, veteran] = s.faculty;
  for (const f of s.faculty) { f.research = 40; f.teaching = 40; f.tenureWeeks = 5 * WEEKS_PER_YEAR; }
  researcher.research = 90;
  teacher.teaching = 90;
  veteran.tenureWeeks = 29 * WEEKS_PER_YEAR;
  const grant = rollVars(s, eventById('the-grant-windfall')!);
  assert(grant.facultyId === researcher.id && grant.faculty === researcher.name, `the grant windfall names the strongest researcher (${grant.faculty})`);
  const lecture = rollVars(s, eventById('star-lecture')!);
  assert(lecture.facultyId === teacher.id && lecture.faculty === teacher.name, `the crowded lecture is the strongest teacher's (${lecture.faculty})`);
  const longest = rollVars(s, { ...eventById('star-lecture')!, names: { faculty: 'longest' } });
  assert(longest.facultyId === veteran.id, `'longest' names the longest-serving (${longest.faculty})`);
  // The draw is made either way: the other names, and the stream after,
  // are the same with the professor named as without.
  for (const id of ['the-grant-windfall', 'star-lecture']) {
    const e = eventById(id)!;
    bindScriptStream(7979);
    const withName = rollVars(s, e);
    const after = random();
    bindScriptStream(7979);
    const without = rollVars(s, { ...e, names: undefined });
    const afterWithout = random();
    const rest = (v: Record<string, string>) => JSON.stringify({ ...v, faculty: '', facultyId: '' });
    assert(rest(withName) === rest(without) && after === afterWithout, `${id}: naming the professor draws as not naming does (${rest(withName)} against ${rest(without)})`);
  }
  bindScriptStream(7676);
  // An answer that acts on the professor acts on the one named.
  const ev = { ...eventById('tenure-case')!, names: { faculty: 'researcher' as const } };
  const vars = rollVars(s, ev);
  const before = s.faculty.length;
  applyEffects(s, { departs: 1 }, vars);
  assert(s.faculty.length === before - 1 && !s.faculty.some((f) => f.id === researcher.id), 'departs lets the named professor go, and nobody else');
  // Every event that lets its professor go names them by kind (Plan 95AD):
  // the offer the strongest researcher, the tenure case the one up for it.
  const drawnLeaving = EVENT_CATALOGUE.filter((e) => !e.names?.faculty && /\{faculty\}/.test(e.text) && e.choices.some((c) => (c.effects.departs ?? 0) > 0));
  assert(drawnLeaving.length === 0, `an event that lets its professor go names them by kind (${drawnLeaving.map((e) => e.id).join(', ')})`);
}

// ---- The offer, the tenure case and the two-body problem (Plan 95AD, H7-9) ----
{
  const s = college();
  const base = structuredClone(s.faculty[0]);
  const prof = (id: string, years: number, research = 40) => ({ ...structuredClone(base), id, name: `Professor ${id}`, tenureWeeks: years * WEEKS_PER_YEAR, research });
  s.faculty = [prof('a-veteran', 25, 95), prof('b-six', 6), prof('c-five', 5), prof('d-five', 5), prof('e-new', 0), prof('f-two', 2), prof('g-two', 2), prof('h-star', 12, 80)];
  const offer = rollVars(s, eventById('star-poached')!);
  assert(offer.facultyId === 'a-veteran', `the offer goes to the strongest researcher (${offer.faculty})`);
  const tenure = rollVars(s, eventById('tenure-case')!);
  assert(tenure.facultyId === 'c-five', `the tenure case is the shortest-serving in the window, ties to the id (${tenure.faculty})`);
  const twoBody = rollVars(s, eventById('two-body')!);
  assert(twoBody.facultyId === 'f-two', `the two-body problem is the latest hire with a year here, ties to the id (${twoBody.faculty})`);
  assert(TENURE_CASE_MIN_YEARS <= 5 && TENURE_CASE_MAX_YEARS < 25, 'the tenure window is a few years in');
  // A kind that finds nobody keeps the event from firing (its other
  // conditions set aside: the test college houses no programs).
  const canFire = (st: GameState, id: string) => eligible(st, { ...eventById(id)!, when: {} });
  for (const id of ['tenure-case', 'two-body', 'star-poached']) assert(canFire(s, id), `${id} can fire with someone to name`);
  const veterans = structuredClone(s);
  veterans.faculty = veterans.faculty.map((f) => ({ ...f, tenureWeeks: 25 * WEEKS_PER_YEAR }));
  assert(!canFire(veterans, 'tenure-case'), 'no tenure case at a college with nobody in the window');
  assert(canFire(veterans, 'two-body'), 'a veteran faculty still has a hire with a year here');
  const fresh = structuredClone(s);
  fresh.faculty = fresh.faculty.map((f) => ({ ...f, tenureWeeks: 20 }));
  assert(!canFire(fresh, 'two-body') && !canFire(fresh, 'tenure-case'), 'no two-body problem or tenure case in a faculty\'s first year');
  // The draw is made either way: the stream reads the same.
  for (const id of ['star-poached', 'tenure-case', 'two-body']) {
    const e = eventById(id)!;
    bindScriptStream(9595);
    const withName = rollVars(s, e);
    const after = random();
    bindScriptStream(9595);
    const without = rollVars(s, { ...e, names: undefined });
    const afterWithout = random();
    const rest = (v: Record<string, string>) => JSON.stringify({ ...v, faculty: '', facultyId: '' });
    assert(rest(withName) === rest(without) && after === afterWithout, `${id}: naming the professor draws as not naming does`);
    bindScriptStream(9595);
    eligible(s, e);
    const afterEligible = random();
    bindScriptStream(9595);
    assert(afterEligible === random(), `${id}: asking whether it can fire draws nothing`);
  }
  bindScriptStream(7676);
}

// ---- The new effects ----
{
  const s = college();
  const hall = s.tech.find((t) => t.kind === 'building' && t.status === 'done')!;
  hall.builtYear = 1;
  applyEffects(s, { historic: 1 }, { buildingId: hall.id });
  assert(hall.historic === true, 'historic declares the named building historic');
  const before = s.advancement?.restrictedBuilding ?? 0;
  const cash = s.finance.cash;
  applyEffects(s, { buildingFund: 1_000_000 });
  assert(s.advancement!.restrictedBuilding === before + 1_000_000 && s.finance.cash === cash, 'building money goes to the building fund, not cash');
  s.finance.loans = [{ buildingId: 'x', balance: 300_000, payment: 1000, weeksLeft: 100 }];
  applyEffects(s, { debt: -1_000_000 });
  assert(!s.finance.loans?.length && s.finance.cash === cash + 700_000, 'clearing more debt than is owed returns the rest as cash');
}
{
  const s = college();
  const ev = eventById('the-rankings-slip')!;
  s.catalogue = { pending: [{ instanceId: 'i1', eventId: ev.id, firedWeek: 1, vars: rollVars(s, ev), scale: 1 }], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0 };
  resolveCatalogueEvent(s, 'i1', 'promise');
  assert(promisesOf(s).active.some((a) => a.id === 'a-rise-in-the-guide' && a.dueYear === 35), 'promising a rise makes the promise, due in five years');
}
{
  const s = college();
  s.self.mascot = '';
  const ev = eventById('mascot')!;
  s.catalogue = { pending: [{ instanceId: 'i2', eventId: ev.id, firedWeek: 1, vars: rollVars(s, ev), scale: 1 }], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0 };
  resolveCatalogueEvent(s, 'i2', 'adopt');
  assert(s.self.mascot === 'Swans', `adopting the swan names the teams (${s.self.mascot})`);
}

console.log(`  ${failures === 0 ? '✓' : '✗'} ${checks - failures} of ${checks} checks passed`);
if (failures > 0) process.exit(1);
