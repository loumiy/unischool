// The chronicle (Plan 33, systems/chronicle/chronicle.ts): each closed year
// read from the history rows and the journal, given a kind; runs of a kind
// become named, summarized eras.

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { chronicleOf, currentEra, partition, summariseYears, yearKind, yearRecords } from '../src/systems/chronicle/chronicle';
import { ERA_MAX, ERA_MIN_YEARS } from '../src/data/chronicleData';
import { EVENT_CATALOGUE } from '../src/data/eventCatalogue';
import { moneyShort } from '../src/format';
import type { GameState, YearSnapshot } from '../src/state/types';

bindScriptStream(3336);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('chronicle tests');

function row(year: number, over: Partial<YearSnapshot> = {}): YearSnapshot {
  return {
    year, prestige: 50, rank: 40, enrolled: 1000, cash: 1e6, coursesDone: 10, programsEstablished: 1,
    satisfaction: 60, net: 100_000, applicants: 2000, admitRate: 0.5, incomingQuality: 50,
    satisfactionAverage: 60, coursesFinished: 1, attrition: 50, graduated: year >= 4 ? 200 : 0,
    worstRung: 0, endowment: 5e6 + year * 1e5, ...over,
  };
}

function run(years: number, over: (y: number) => Partial<YearSnapshot> = () => ({})): GameState {
  const s = createInitialState('Chronicle');
  s.pendingInterrupt = null;
  s.history = Array.from({ length: years }, (_, i) => row(i + 1, over(i + 1)));
  s.clock.year = years + 1;
  return s;
}

// ---- Nothing to divide yet ----
{
  const s = createInitialState('Chronicle');
  assert(chronicleOf(s).eras.length === 0 && currentEra(s) === null, 'a college with no closed year has no eras');
}

// ---- The kinds of year ----
{
  const s = run(24, (y) => ({
    worstRung: y >= 5 && y <= 10 ? 3 : 0,
    rank: y <= 14 ? 40 : Math.max(2, 40 - (y - 14) * 4),
  }));
  const recs = yearRecords(s);
  assert(recs.length === 24 && recs[0].year === 1, 'a record for every closed year');
  assert(yearKind(recs, 0) === 'founding' && yearKind(recs, 2) === 'founding', 'the first three are the founding');
  assert(yearKind(recs, 5) === 'troubles', 'a year at rung 3 is troubles');
  assert(yearKind(recs, 18) === 'rise', 'three places gained in three years is a rise');
  const spans = partition(recs);
  assert(spans[0].kind === 'founding' && spans[0].from === 1, 'the chronicle opens on the founding');
  assert(spans.every((sp, i) => i === 0 || i === spans.length - 1 || sp.to - sp.from + 1 >= ERA_MIN_YEARS), `no era in the middle shorter than ${ERA_MIN_YEARS} years`);
  assert(spans.length <= ERA_MAX, 'and no more eras than a chronicle holds');
  assert(spans.every((sp, i) => i === 0 || sp.from === spans[i - 1].to + 1) && spans[spans.length - 1].to === 24, 'the eras cover every year, in order');
  const c = chronicleOf(s);
  assert(c.eras.some((e) => e.kind === 'troubles') && c.eras.some((e) => e.kind === 'rise'), `the troubles and the rise are eras (${c.eras.map((e) => e.kind).join(', ')})`);
  assert(new Set(c.eras.map((e) => e.name)).size === c.eras.length, `every era has its own name (${c.eras.map((e) => e.name).join(' · ')})`);
  assert(c.eras.every((e) => e.lines[0].startsWith('Year')), 'each summary opens on its span');
  const troubles = c.eras.find((e) => e.kind === 'troubles')!;
  assert(troubles.lines.some((l) => l.includes('rung 3')), 'the troubles say how far the board climbed');
  assert(currentEra(s)?.to === 24, 'the era being lived is the last');
}

// ---- What the journal adds ----
{
  const s = run(12);
  const letter = EVENT_CATALOGUE.find((e) => e.kind === 'seismic' && e.title)!;
  s.catalogue = { pending: [], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0, letters: [{ eventId: letter.id, choiceId: letter.default, year: 6 }] };
  s.identity = { tags: ['old-money'], earning: {}, shedding: {}, log: [{ id: 'old-money', year: 7, earned: true }] };
  s.promises = { active: [], settled: [{ id: 'debt-free', year: 8, kept: true }], declined: [], offer: null };
  s.orgs.titles = [{ sport: 'football', year: 9 } as never];
  const lines = chronicleOf(s).eras.flatMap((e) => e.lines).join(' ');
  assert(lines.includes(`It weathered ${letter.title!.charAt(0).toLowerCase()}${letter.title!.slice(1)}`), 'a letter answered is weathered');
  assert(lines.includes('Old Money'), 'a tag earned is what the guidebooks started calling it');
  assert(lines.includes('It kept its promise: owing nothing to anybody'), 'a promise kept is kept');
  assert(lines.includes('The teams won a title'), 'a title is won');
  const quiet = chronicleOf(s).eras.find((e) => e.from <= 6 && e.to >= 6)!;
  assert(quiet.kind !== 'quiet' || quiet.name.toLowerCase().includes(letter.title!.toLowerCase().replace(/^the /, '')), `a quiet stretch with a letter is named for it (${quiet.name})`);
  assert(lines.includes(moneyShort(5e6 + 4 * 1e5)), 'the endowment is read from the rows');
}

// ---- An addendum ----
{
  const s = run(30);
  const lines = summariseYears(s, 21, 30);
  assert(lines[0] === 'Years 21 to 30.' && lines.some((l) => l.startsWith('The books closed')), `a decade in the chronicle's sentences (${lines.join(' ')})`);
  assert(moneyShort(3.2e9) === '$3.2B' && moneyShort(12e9) === '$12B', 'billions read as billions');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
