import type { GameState, Pillar, Vernacular } from '../state/types';
import type { TabId } from '../components/TabNav';
import { TAGS } from '../data/tagData';
import { PROMISES } from '../data/promiseData';
import { REPORT_GRADES } from '../data/reportData';
import { EDITIONS, PLATFORMS } from '../build';

// THE PLAY STATISTICS' EVENTS (Plan 97E, from Plan 70K): every event the
// game may send, and every field each may carry. Nothing a player typed
// ever leaves the device: each field is a number, a boolean, or a value
// from a fixed list, and analytics.ts drops any event that does not match
// its entry here. docs/architecture/analytics.md lists the same, for
// players; test/analytics.test.ts holds the two together.
//
// The events that read the run are found by comparing the state before an
// action with the state after it (stateEvents, below), so the reducer and
// the save know nothing of them, and a replay moves nothing.

// What a field may hold. `build` and `id` are the common fields' own: the
// build's constants (src/build.ts) and the random ids analytics.ts makes.
// `message` is the one string a player did not choose from a list: a crash's
// error, with the college's names scrubbed out (analytics.ts's scrub).
export type FieldKind = 'number' | 'boolean' | 'build' | 'id' | 'message' | readonly string[] | { list: readonly string[] };

const PILLARS: readonly Pillar[] = ['academics', 'research', 'studentLife', 'athletics'];
const VERNACULARS: readonly Vernacular[] = ['georgian', 'gothic', 'classical', 'mission', 'modern', 'tudor', 'italianate', 'secondEmpire', 'artDeco'];
// Every tab, checked against TabId: a tab added there fails to compile here
// until it is listed.
const TAB_IDS_RECORD: Record<TabId, true> = { faculty: true, curriculum: true, research: true, treasury: true, students: true, history: true, athletics: true, inbox: true };
export const TAB_IDS = Object.keys(TAB_IDS_RECORD) as TabId[];
// The clock's speeds that play (useGame.ts's SPEEDS, less paused).
export const PLAYING_SPEEDS = ['real', 'double', 'quad', 'octo', 'fast'] as const;
export type PlayingSpeed = (typeof PLAYING_SPEEDS)[number];
export const SCREEN_BANDS = ['phone', 'tablet', 'laptop', 'desktop'] as const;
const MARKS = REPORT_GRADES.map((g) => g.letter);

// On every event (analytics.ts adds them).
export const COMMON_FIELDS: Readonly<Record<string, FieldKind>> = {
  version: 'build',
  build: 'build',
  edition: EDITIONS,
  platform: PLATFORMS,
  run_id: 'id',
  played_minutes: 'number',
};

const yearFields: Record<string, FieldKind> = {
  year: 'number',
  rank: 'number',
  prestige_band: 'number',
  enrollment_band: 'number',
  cash_band: 'number',
  schools_founded: 'number',
  stops: 'number',
  ...Object.fromEntries(PLAYING_SPEEDS.map((sp) => [`weeks_${sp}`, 'number'])),
  ...Object.fromEntries(TAB_IDS.map((t) => [`tab_${t}`, 'number'])),
};

export const EVENTS = {
  app_opened: { screen: SCREEN_BANDS, touch: 'boolean', first_launch: 'boolean' },
  run_started: { vernacular: VERNACULARS, mode: ['normal', 'sandbox'] },
  run_resumed: { year: 'number' },
  year_reached: yearFields,
  ambition_reached: { ambition: PROMISES.map((p) => p.id) },
  specialization_offered: { year: 'number' },
  specialization_chosen: { year: 'number', pillar: PILLARS },
  specialization_declined: { year: 'number' },
  run_finished: { mark: MARKS, rank: 'number', title_tags: { list: TAGS.map((t) => t.id) }, continued: 'boolean' },
  heartbeat: {},
  report_shared: { kind: ['download', 'copy'] },
  save_exported: { kind: ['menu', 'crash', 'set-aside', 'backup'] },
  save_imported: { kind: ['file'] },
  crashed: { message: 'message', year: 'number' },
} as const satisfies Record<string, Record<string, FieldKind>>;

export type EventName = keyof typeof EVENTS;
export type Fields = Record<string, number | boolean | string | string[]>;

// Whether a value is what its field allows.
export function fieldFits(kind: FieldKind, value: unknown): boolean {
  if (kind === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (kind === 'boolean') return typeof value === 'boolean';
  if (kind === 'build' || kind === 'id' || kind === 'message') return typeof value === 'string' && value.length <= 200;
  if (Array.isArray(kind)) return typeof value === 'string' && kind.includes(value);
  const list = (kind as { list: readonly string[] }).list;
  return Array.isArray(value) && value.every((v) => typeof v === 'string' && list.includes(v));
}

// Whether an event's own fields are exactly those its entry lists, each
// fitting.
export function eventFits(name: string, fields: Fields): boolean {
  const spec = (EVENTS as Record<string, Record<string, FieldKind>>)[name];
  if (!spec) return false;
  const keys = Object.keys(fields);
  return keys.every((k) => k in spec && fieldFits(spec[k], fields[k])) && Object.keys(spec).every((k) => k in fields);
}

// ---- Bands: a figure's neighborhood, never the figure ----

// The lower edge of the band a value falls in.
function band(value: number, edges: readonly number[]): number {
  let out = edges[0];
  for (const e of edges) if (value >= e) out = e;
  return out;
}
export const prestigeBand = (p: number) => Math.max(0, Math.floor(p / 10) * 10);
export const enrollmentBand = (n: number) => band(n, [0, 500, 1000, 2500, 5000, 10000, 20000, 40000]);
// In the red reads -1.
export const cashBand = (c: number) => (c < 0 ? -1 : band(c, [0, 1e6, 5e6, 2e7, 1e8, 5e8, 1e9]));
export function screenBand(width: number): (typeof SCREEN_BANDS)[number] {
  return width < 600 ? 'phone' : width < 1024 ? 'tablet' : width < 1600 ? 'laptop' : 'desktop';
}

// Which summers send year_reached: each of the first ten, then every fifth.
export const yearReported = (year: number) => year <= 10 || year % 5 === 0;

// ---- The run's events, read off two states ----

export interface StateEvent {
  name: EventName;
  fields: Fields;
}

// What the summer that just closed reads: the history's row for that year.
// The play counters (stops, weeks, tabs) are analytics.ts's, added there.
export function yearReadings(s: GameState, year: number): Fields | null {
  const row = s.history.find((h) => h.year === year);
  if (!row) return null;
  return {
    year,
    rank: row.rank,
    prestige_band: prestigeBand(row.prestige),
    enrollment_band: enrollmentBand(row.enrolled),
    cash_band: cashBand(row.cash),
    schools_founded: row.schoolsFounded ?? 0,
  };
}

export function stateEvents(prev: GameState, next: GameState): StateEvent[] {
  // A new run, or no run: run_started is sent where the run is founded.
  if (!prev.started || !next.started || prev.self.name !== next.self.name || next.clock.year < prev.clock.year) return [];
  const out: StateEvent[] = [];
  // The summer closed: RESOLVE_ADMISSIONS turned the calendar.
  if (next.clock.year > prev.clock.year) {
    const year = prev.clock.year;
    const readings = yearReported(year) ? yearReadings(next, year) : null;
    if (readings) out.push({ name: 'year_reached', fields: readings });
  }
  // An ambition met (a promise kept).
  const before = new Set((prev.promises?.settled ?? []).map((p) => `${p.id}@${p.year}`));
  for (const p of next.promises?.settled ?? []) {
    if (p.kept && !before.has(`${p.id}@${p.year}`) && PROMISES.some((d) => d.id === p.id)) out.push({ name: 'ambition_reached', fields: { ambition: p.id } });
  }
  // The board's offer of a specialization, and its answer.
  const offering = (s: GameState) => s.pendingInterrupt?.type === 'specialization';
  if (!offering(prev) && offering(next)) out.push({ name: 'specialization_offered', fields: { year: next.clock.year } });
  if (offering(prev) && !offering(next)) {
    if (prev.specialization === 'none' && next.specialization !== 'none') {
      out.push({ name: 'specialization_chosen', fields: { year: next.clock.year, pillar: next.specialization } });
    } else if (next.specialization === 'none') {
      out.push({ name: 'specialization_declined', fields: { year: next.clock.year } });
    }
  }
  return out;
}

// The fields of run_finished, read off the report and the college's tags.
export function finishedFields(s: GameState, report: { mark: string; rank: number }, continued: boolean): Fields {
  const known = new Set(TAGS.map((t) => t.id));
  return { mark: report.mark, rank: report.rank, title_tags: (s.identity?.tags ?? []).filter((t) => known.has(t)), continued };
}
