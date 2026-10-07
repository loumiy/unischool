import { DEV_BUILD } from '../engine/devBuild';
import { BUILD_STAMP } from '../build';
import { getSettings, onSettings, setSettings } from '../settings';
import { institutionName, type GameState } from '../state/types';
import type { TabId } from '../components/TabNav';
import { COMMON_FIELDS, EVENTS, PLAYING_SPEEDS, TAB_IDS, eventFits, fieldFits, finishedFields, screenBand, stateEvents, type EventName, type Fields, type PlayingSpeed } from './events';

// ANONYMOUS PLAY STATISTICS (Plan 97E, from Plan 70K): what the itch.io
// playtest needs to know, sent to PostHog, and nothing more.
//
//   - Production builds only, and only with VITE_POSTHOG_KEY set where the
//     build ran (Vercel's production build, the release workflow). A
//     development build, the tests and the harness send nothing.
//   - Asked first: the title screen's notice. Nothing is sent before an
//     answer; events wait in memory, and are sent if the answer is yes and
//     dropped if it is no. Settings turn it off at any time, which forgets
//     the install id.
//   - Every event and field is listed in events.ts and checked before it
//     is queued: numbers, booleans and values from fixed lists. No college
//     name, no mascot, nothing typed.
//   - Sent straight to PostHog's capture API, no library: no cookies, no
//     autocapture, no recordings, no person profiles, no GeoIP. A blocked or
//     failed send is dropped silently; the game never notices.
//
// The install id (a random UUID in localStorage) is what lets returning
// players be counted. The run id is random per run, kept beside it with
// the run's played time; neither touches the game's seeded stream.

const env = (import.meta as ImportMeta & { env?: { VITE_POSTHOG_KEY?: string; VITE_POSTHOG_HOST?: string } }).env;
export const DEFAULT_HOST = 'https://eu.i.posthog.com';
export const ID_KEY = 'unischool.stats.id';
export const RUN_KEY = 'unischool.stats.run';
type StatsKey = typeof ID_KEY | typeof RUN_KEY;
// A heartbeat every ten minutes of unpaused, visible play.
export const HEARTBEAT_MS = 10 * 60 * 1000;
const FLUSH_MS = 10_000;
const QUEUE_MAX = 100;

export type Transport = (url: string, body: string) => unknown;

// fetch, kept alive so a send as the tab closes still goes. Any failure is
// swallowed: an ad blocker, a network gone, PostHog down.
const fetchTransport: Transport = (url, body) => {
  try {
    void globalThis.fetch?.(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true, credentials: 'omit' }).catch(() => {});
  } catch {
    // Nothing to do.
  }
};

interface Config {
  key: string | null;
  host: string;
  // Production, with a key.
  enabled: boolean;
  transport: Transport;
}

const KEY = env?.VITE_POSTHOG_KEY?.trim() || null;
let config: Config = {
  key: KEY,
  host: (env?.VITE_POSTHOG_HOST?.trim() || DEFAULT_HOST).replace(/\/+$/, ''),
  enabled: !DEV_BUILD && KEY !== null,
  transport: fetchTransport,
};

// For the tests: turn the module on with a fake transport, as a production
// build with a key would be. Resets what is held in memory.
export function configureAnalytics(next: Partial<Config>): void {
  config = { ...config, ...next };
  queue = [];
  run = null;
  opened = false;
}

// Whether this build sends statistics at all (and so asks, and shows the
// setting).
export function statsAvailable(): boolean {
  return config.enabled && config.key !== null;
}

const consent = () => getSettings().stats;

// The title screen's answer, or the setting.
export function answerStats(on: boolean): void {
  setSettings({ stats: on ? 'on' : 'off' });
}

// ---- Storage, every access wrapped ----

function read(key: StatsKey): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}
function write(key: StatsKey, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Kept for the session only.
  }
}
function remove(key: StatsKey): void {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // Nothing to do.
  }
}

const uuid = (): string => {
  try {
    return globalThis.crypto.randomUUID();
  } catch {
    // Not the run's stream (engine/random.ts): a replay never moves.
    return `x${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  }
};

let memoryId: string | null = null;
function installId(): string {
  const stored = read(ID_KEY);
  if (stored) return stored;
  memoryId ??= uuid();
  write(ID_KEY, memoryId);
  return memoryId;
}

// ---- The run: its id, its played time, and this year's play ----

interface YearPlay {
  stops: number;
  weeks: Partial<Record<PlayingSpeed, number>>;
  tabs: Partial<Record<TabId, number>>;
}
interface RunRecord {
  id: string;
  ms: number;
  year: YearPlay;
}
const emptyYear = (): YearPlay => ({ stops: 0, weeks: {}, tabs: {} });
let run: RunRecord | null = null;

function loadRun(): RunRecord | null {
  try {
    const o = JSON.parse(read(RUN_KEY) ?? 'null') as Partial<RunRecord> | null;
    if (!o || typeof o.id !== 'string' || typeof o.ms !== 'number' || !Number.isFinite(o.ms)) return null;
    const y = (o.year ?? {}) as Partial<YearPlay>;
    return { id: o.id, ms: Math.max(0, o.ms), year: { stops: Number(y.stops) || 0, weeks: { ...y.weeks }, tabs: { ...y.tabs } } };
  } catch {
    return null;
  }
}
function currentRun(): RunRecord {
  run ??= loadRun() ?? { id: uuid(), ms: 0, year: emptyYear() };
  return run;
}
function saveRun(): void {
  if (run && consent() !== 'off') write(RUN_KEY, JSON.stringify(run));
}

// Turned off: what was waiting is dropped, and the ids are forgotten, so
// turning it on again starts a stranger.
function forget(): void {
  queue = [];
  run = null;
  memoryId = null;
  remove(ID_KEY);
  remove(RUN_KEY);
}

// ---- The queue ----

interface Queued {
  event: EventName;
  properties: Fields;
  timestamp: string;
}
let queue: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

// Queues one event, if it fits its entry in events.ts; a field that does not
// fit drops the whole event (and says so in development).
export function track(name: EventName, fields: Fields = {}): void {
  if (!statsAvailable() || consent() === 'off') return;
  if (!eventFits(name, fields)) {
    if (DEV_BUILD) console.warn(`analytics: ${name} does not fit its entry in events.ts`, fields);
    return;
  }
  const r = currentRun();
  const common: Fields = { ...BUILD_STAMP, run_id: r.id, played_minutes: Math.floor(r.ms / 60_000) };
  if (!Object.entries(COMMON_FIELDS).every(([k, kind]) => fieldFits(kind, common[k]))) return;
  queue.push({ event: name, properties: { ...common, ...fields }, timestamp: new Date().toISOString() });
  if (queue.length > QUEUE_MAX) queue.shift();
  saveRun();
  if (name === 'crashed') flush();
  else schedule();
}

function schedule(): void {
  if (timer !== null || consent() !== 'on') return;
  timer = setTimeout(() => { timer = null; flush(); }, FLUSH_MS);
  (timer as { unref?: () => void }).unref?.();
}

// Sends what is queued, once the player has said yes.
export function flush(): void {
  if (!statsAvailable() || consent() !== 'on' || queue.length === 0 || !config.key) return;
  const distinctId = installId();
  const batch = queue.map((q) => ({
    event: q.event,
    distinct_id: distinctId,
    timestamp: q.timestamp,
    // PostHog's own switches: an anonymous event with no person profile,
    // and no location looked up from the address.
    properties: { ...q.properties, $process_person_profile: false, $geoip_disable: true, $lib: 'unischool' },
  }));
  queue = [];
  try {
    config.transport(`${config.host}/batch/`, JSON.stringify({ api_key: config.key, batch }));
  } catch {
    // Dropped: the game never notices.
  }
}

// Follows the setting: a yes sends what waited, a no forgets.
onSettings(() => {
  const c = consent();
  if (c === 'off') forget();
  else if (c === 'on') flush();
});

// A tab going to the background sends what is waiting and keeps the run's
// time.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    saveRun();
    flush();
  });
}

// ---- What the game reports ----

let opened = false;
export function appOpened(): void {
  if (opened || !statsAvailable()) return;
  opened = true;
  const width = typeof window === 'undefined' ? 0 : window.innerWidth;
  const touch = typeof window !== 'undefined' && (navigator.maxTouchPoints ?? 0) > 0;
  track('app_opened', { screen: screenBand(width), touch, first_launch: consent() === 'unasked' && read(ID_KEY) === null });
}

// A new college: a new run id, its time from zero.
export function runStarted(vernacular: string, sandbox: boolean): void {
  if (!statsAvailable() || consent() === 'off') return;
  run = { id: uuid(), ms: 0, year: emptyYear() };
  track('run_started', { vernacular, mode: sandbox ? 'sandbox' : 'normal' });
}

export function runResumed(year: number): void {
  track('run_resumed', { year });
}

// The run's events, from the state before an action and after it
// (events.ts's stateEvents). A year_reached carries this year's play, and
// any summer closing starts the next year's count.
export function observe(prev: GameState, next: GameState): void {
  if (!statsAvailable() || consent() === 'off' || prev === next) return;
  const events = stateEvents(prev, next);
  for (const e of events) {
    if (e.name !== 'year_reached') { track(e.name, e.fields); continue; }
    const y = currentRun().year;
    track('year_reached', {
      ...e.fields,
      stops: y.stops,
      ...Object.fromEntries(PLAYING_SPEEDS.map((sp) => [`weeks_${sp}`, y.weeks[sp] ?? 0])),
      ...Object.fromEntries(TAB_IDS.map((t) => [`tab_${t}`, y.tabs[t] ?? 0])),
    });
  }
  if (next.started && prev.started && next.clock.year > prev.clock.year) {
    currentRun().year = emptyYear();
    saveRun();
  }
}

// Time that counts: the clock running and the page in view. A heartbeat
// every ten minutes of it.
export function notePlaying(ms: number): void {
  if (!statsAvailable() || consent() === 'off' || ms <= 0) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  const r = currentRun();
  const before = r.ms;
  r.ms += ms;
  if (Math.floor(r.ms / HEARTBEAT_MS) > Math.floor(before / HEARTBEAT_MS)) track('heartbeat');
  else if (Math.floor(r.ms / 60_000) > Math.floor(before / 60_000)) saveRun();
}

export function noteWeek(speed: string): void {
  if (!statsAvailable() || consent() === 'off' || !(PLAYING_SPEEDS as readonly string[]).includes(speed)) return;
  const w = currentRun().year.weeks;
  w[speed as PlayingSpeed] = (w[speed as PlayingSpeed] ?? 0) + 1;
}

// The player stopping the clock.
export function noteStop(): void {
  if (!statsAvailable() || consent() === 'off') return;
  currentRun().year.stops += 1;
}

export function noteTab(tab: TabId): void {
  if (!statsAvailable() || consent() === 'off' || !TAB_IDS.includes(tab)) return;
  const t = currentRun().year.tabs;
  t[tab] = (t[tab] ?? 0) + 1;
}

export function runFinished(s: GameState, report: { mark: string; rank: number }, continued: boolean): void {
  track('run_finished', finishedFields(s, report, continued));
}

export function reportShared(kind: 'download' | 'copy'): void {
  track('report_shared', { kind });
}
export function saveExported(kind: 'menu' | 'crash' | 'set-aside' | 'backup'): void {
  track('save_exported', { kind });
}
// An imported file is another run: a new run id, its time from zero.
export function saveImported(): void {
  if (!statsAvailable() || consent() === 'off') return;
  run = { id: uuid(), ms: 0, year: emptyYear() };
  track('save_imported', { kind: 'file' });
}

// The college's own names out of a crash's message: it is the one string
// sent that no list holds, so nothing the player typed may ride in it.
export function scrub(message: string, s: GameState | null): string {
  const names = s ? [institutionName(s.self), s.self.name, s.self.mascot].filter((n) => typeof n === 'string' && n.trim().length > 1) : [];
  let out = message;
  for (const n of names.sort((a, b) => b.length - a.length)) out = out.split(n).join('[name]');
  return out.slice(0, 200);
}

export function crashed(error: Error, s: GameState | null): void {
  track('crashed', { message: scrub(`${error.name}: ${error.message}`, s), year: s?.started ? s.clock.year : 0 });
}

// Every event name, for docs and tests.
export const EVENT_NAMES = Object.keys(EVENTS) as EventName[];
