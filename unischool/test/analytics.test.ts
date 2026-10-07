// ---------------------------------------------------------------------
// The play statistics (Plan 97E, src/analytics/). What the playtest sends,
// and what it never does:
//   - a scripted run through the module with a fake transport: every field
//     of every event is a number, a boolean or a listed value, and nothing
//     the player typed (the college's name, its mascot) is in what is sent;
//   - nothing is sent from a development build, without a key, before the
//     title screen's question is answered, or with the setting off, and
//     turning it off forgets the install id;
//   - a transport that throws is never the game's problem;
//   - docs/architecture/analytics.md lists every event.
//
//   npm test -- analytics
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { foundGame, fakeStorage, playYears } from '../sim/harness/game';
import { createGuidedPlayer } from '../sim/harness/guided';
import {
  EVENT_NAMES, HEARTBEAT_MS, ID_KEY, RUN_KEY, answerStats, appOpened, configureAnalytics, crashed, flush, noteStop, noteTab,
  notePlaying, noteWeek, observe, reportShared, runFinished, runResumed, runStarted, saveExported, saveImported, statsAvailable, track,
} from '../src/analytics/analytics';
import { EVENTS, cashBand, enrollmentBand, prestigeBand, stateEvents, yearReported } from '../src/analytics/events';
import { BUILD_STAMP } from '../src/build';
import { setSettings } from '../src/settings';
import type { GameState } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

interface Sent { url: string; body: { api_key: string; batch: { event: string; distinct_id: string; timestamp: string; properties: Record<string, unknown> }[] } }
let sent: Sent[] = [];
const fake = (url: string, body: string) => { sent.push({ url, body: JSON.parse(body) as Sent['body'] }); };
const events = () => sent.flatMap((s) => s.body.batch);

const NAME = 'Halberd Crane';
const UUID = /^[0-9a-f-]{36}$/;

// Independent of events.ts's own check: the value's type, and for a string
// the event's listed values (or, for the common fields, the build's own).
function fieldOk(event: string, key: string, value: unknown): boolean {
  if (key === 'version' || key === 'build' || key === 'edition' || key === 'platform') return value === BUILD_STAMP[key];
  if (key === 'run_id') return typeof value === 'string' && UUID.test(value);
  if (key === 'played_minutes') return Number.isInteger(value) && (value as number) >= 0;
  if (key === '$process_person_profile') return value === false;
  if (key === '$geoip_disable') return value === true;
  if (key === '$lib') return value === 'unischool';
  const spec = (EVENTS as Record<string, Record<string, unknown>>)[event]?.[key];
  if (spec === undefined) return false;
  if (spec === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (spec === 'boolean') return typeof value === 'boolean';
  if (spec === 'message') return typeof value === 'string';
  if (Array.isArray(spec)) return typeof value === 'string' && spec.includes(value);
  const list = (spec as { list: string[] }).list;
  return Array.isArray(value) && value.every((v) => list.includes(v as string));
}

// ---- Off by default: the tests are a development build, with no key ----
function testOffByDefault(): void {
  assert(!statsAvailable(), 'a development build sends no statistics');
  setSettings({ stats: 'on' });
  configureAnalytics({ transport: fake });
  appOpened();
  track('heartbeat');
  flush();
  assert(sent.length === 0, 'and sends nothing even with the setting on');
  configureAnalytics({ enabled: true, key: null });
  track('heartbeat');
  flush();
  assert(sent.length === 0, 'nor without a key');
  assert(!fakeStorage.has(ID_KEY), 'and makes no install id');
}

// ---- A scripted run, asked first and then allowed ----
function testScriptedRun(): void {
  setSettings({ stats: 'unasked' });
  configureAnalytics({ enabled: true, key: 'phc_test', transport: fake });
  sent = [];
  appOpened();

  const g = foundGame({ name: NAME, clone: true });
  runStarted(g.s.self.vernacular, false);
  const act = g.act.bind(g);
  g.act = (a) => {
    const prev = g.s;
    act(a);
    observe(prev, g.s);
    if (a.type === 'TICK') noteWeek('double');
  };
  noteTab('faculty');
  noteTab('history');
  noteStop();
  playYears(g, createGuidedPlayer(), 11);
  notePlaying(HEARTBEAT_MS + 1);
  runResumed(g.s.clock.year);
  reportShared('download');
  reportShared('copy');
  saveExported('menu');
  // The mascot the player named (RESOLVE_MASCOT takes free text).
  g.s = { ...g.s, self: { ...g.s.self, mascot: 'Night Herons' } };
  crashed(new Error(`${NAME}'s hall has no floor (the Night Herons)`), g.s);
  runFinished(g.s, { mark: 'B', rank: 7 }, true);
  flush();
  // crashed flushes at once; even it waits for the answer.
  assert(sent.length === 0, 'nothing is sent before the question is answered');

  answerStats(true);
  const all = events();
  assert(sent.length >= 1 && sent.every((s) => s.url === 'https://eu.i.posthog.com/batch/' && s.body.api_key === 'phc_test'), `a yes sends what waited, to PostHog's EU batch endpoint (${sent.map((s) => s.url).join(', ')})`);
  const names = all.map((e) => e.event);
  for (const n of ['app_opened', 'run_started', 'year_reached', 'heartbeat', 'run_resumed', 'report_shared', 'save_exported', 'crashed', 'run_finished']) {
    assert(names.includes(n), `the run sent ${n}`);
  }
  const years = all.filter((e) => e.event === 'year_reached').map((e) => e.properties.year as number);
  assert(JSON.stringify(years) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), `year_reached at each of the first ten summers, not the eleventh (${years.join(', ')})`);
  const first = all.find((e) => e.event === 'year_reached' && e.properties.year === 1);
  assert(first?.properties.tab_faculty === 1 && first.properties.tab_history === 1 && first.properties.stops === 1, 'the first year carries its tab opens and stops');
  assert((first?.properties.weeks_double as number) > 40, `and the weeks played at each speed (${String(first?.properties.weeks_double)})`);
  const second = all.find((e) => e.event === 'year_reached' && e.properties.year === 2);
  assert(second?.properties.tab_faculty === 0 && second.properties.stops === 0, 'and each year counts afresh');

  const bad = all.flatMap((e) => Object.entries(e.properties).filter(([k, v]) => !fieldOk(e.event, k, v)).map(([k, v]) => `${e.event}.${k}=${JSON.stringify(v)}`));
  assert(bad.length === 0, `every field of every event is a number, a boolean or a listed value (${bad.join('; ')})`);
  const body = JSON.stringify(sent);
  assert(!body.includes('Halberd') && !body.includes('Night Herons'), 'nothing the player typed is sent: not the college\'s name, not its mascot');
  const crash = all.find((e) => e.event === 'crashed');
  assert(crash?.properties.message === "Error: [name]'s hall has no floor (the [name])", `a crash's message has the names scrubbed (${String(crash?.properties.message)})`);
  const ids = new Set(all.map((e) => e.distinct_id));
  assert(ids.size === 1 && UUID.test([...ids][0]) && fakeStorage.get(ID_KEY) === [...ids][0], 'every event carries the one install id, kept in storage');
  const runs = new Set(all.filter((e) => e.event !== 'app_opened').map((e) => e.properties.run_id));
  assert(runs.size === 1, 'and the run\'s events one run id');
  const beat = all.find((e) => e.event === 'heartbeat');
  assert((beat?.properties.played_minutes as number) >= 10, `the heartbeat comes after ten minutes of play (${String(beat?.properties.played_minutes)})`);
  assert(all.find((e) => e.event === 'app_opened')?.properties.first_launch === true, 'the first app_opened is a first launch');

  // Importing a file is another run.
  sent = [];
  saveImported();
  flush();
  const imported = events().find((e) => e.event === 'save_imported');
  assert(imported !== undefined && !runs.has(imported.properties.run_id), 'an imported save starts a new run id');

  // Turned off: nothing more, and the ids are forgotten.
  answerStats(false);
  assert(!fakeStorage.has(ID_KEY) && !fakeStorage.has(RUN_KEY), 'turning it off forgets the install id and the run');
  sent = [];
  track('heartbeat');
  reportShared('copy');
  runStarted('gothic', true);
  flush();
  assert(sent.length === 0 && !fakeStorage.has(ID_KEY), 'and sends nothing after');
}

// ---- The run's events, read off two states ----
function testStateEvents(): void {
  const g = foundGame({ name: NAME, clone: true });
  const s = g.s;
  const offered: GameState = { ...s, pendingInterrupt: { type: 'specialization' } };
  assert(stateEvents(s, offered).some((e) => e.name === 'specialization_offered'), 'the board\'s offer is specialization_offered');
  const chosen: GameState = { ...s, specialization: 'research', pendingInterrupt: null };
  const c = stateEvents(offered, chosen).find((e) => e.name === 'specialization_chosen');
  assert(c?.fields.pillar === 'research', 'a pillar chosen is specialization_chosen, with the pillar');
  assert(stateEvents(offered, { ...s, pendingInterrupt: null }).some((e) => e.name === 'specialization_declined'), 'put off, it is specialization_declined');
  const promise = EVENTS.ambition_reached.ambition[0];
  const kept: GameState = { ...s, promises: { active: [], settled: [{ id: promise, year: 3, kept: true }], declined: [], offer: null } };
  const before: GameState = { ...s, promises: { active: [], settled: [], declined: [], offer: null } };
  const a = stateEvents(before, kept).filter((e) => e.name === 'ambition_reached');
  assert(a.length === 1 && a[0].fields.ambition === promise, 'a promise kept is ambition_reached, with its id');
  assert(stateEvents({ ...s, started: false }, s).length === 0, 'founding is not read here: run_started is sent where the run is founded');
  assert(yearReported(10) && !yearReported(11) && yearReported(15), 'year_reached at each of the first ten summers, then every fifth');
  assert(prestigeBand(57.3) === 50 && enrollmentBand(3200) === 2500 && cashBand(-5) === -1 && cashBand(7e6) === 5e6, 'figures are sent as bands');
}

// ---- A transport that throws ----
function testFailsSilently(): void {
  setSettings({ stats: 'on' });
  configureAnalytics({ enabled: true, key: 'phc_test', transport: () => { throw new Error('blocked'); } });
  let error: unknown = null;
  try {
    track('heartbeat');
    reportShared('copy');
    flush();
  } catch (e) {
    error = e;
  }
  assert(error === null, 'a blocked send is never the game\'s problem');
  configureAnalytics({ enabled: true, key: 'phc_test', transport: fake });
  sent = [];
  track('crashed', { message: 'x', year: 1, name: NAME } as never);
  track('report_shared', { kind: 'tweet' } as never);
  flush();
  assert(sent.length === 0, 'an event with a field not in its entry, or a value not in its list, is dropped');
}

// ---- The page that lists them ----
function testDocs(): void {
  const doc = readFileSync(join(process.cwd(), '../docs/architecture/analytics.md'), 'utf8');
  const missing = EVENT_NAMES.filter((n) => !doc.includes(`\`${n}\``));
  assert(missing.length === 0, `docs/architecture/analytics.md lists every event (${missing.join(', ')})`);
}

testOffByDefault();
testScriptedRun();
testStateEvents();
testFailsSilently();
testDocs();
configureAnalytics({ enabled: false });

console.log('analytics tests');
if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
