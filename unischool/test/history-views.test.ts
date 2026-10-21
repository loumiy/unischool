// ---------------------------------------------------------------------
// History in three views (Plan 95H, the second review's B2-1, B2-3 and
// B2-4). What is worth pinning:
//
//   - every chart the one page drew still has a home, and each is in the
//     view this list names: none lost in the split;
//   - the tab opens on Prestige, a held view is the one drawn, and a link's
//     section (the Rank chip's guide) opens the view that holds it;
//   - the pillar rule is said once, in Prestige's head;
//   - a pillar's row reads one scale: "89.8 of 150 → 20.2 of 41.3 points
//     of prestige";
//   - the teaching standard is named by its own measure, mean grade points
//     as a letter.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState } from '../src/state/types';
import { readSave } from '../src/state/persistence';
import HistoryTab, { HISTORY_VIEW_START, type HistoryView } from '../src/tabs/HistoryTab';
import { REPORT_WORDS } from '../src/data/reportData';
import { STANDINGS } from '../src/systems/rivals/rivalsSystem';
import { pillarRule } from '../src/data/prestigeWords';
import { GRADE_POINTS, meanGradeLetter } from '../src/data/courseQuality';
import { PILLARS, prestigeBreakdown, teachingCeiling } from '../src/systems/prestige/prestigeSystem';
import { prestigeFigure } from '../src/format';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('history views tests');

// Year 25, 24 years on the books: every chart is drawn.
function launch(): GameState {
  const read = readSave(readFileSync(join(process.cwd(), 'test/fixtures/save-launch.json'), 'utf8'));
  if ('refused' in read) throw new Error(`the launch fixture is refused: ${read.refused}`);
  return read.state;
}
const act = () => {};
const render = (s: GameState, view?: HistoryView, target?: string) =>
  renderToStaticMarkup(createElement(HistoryTab, { s, act, view, target }));
const unescape = (html: string) => html.replace(/&#x27;/g, '\'').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

// The charts a view draws, by name: a HistoryChart's label (its svg's
// aria-label starts with it, captioned or bare) and a MultiChart's title.
function charts(html: string): string[] {
  const lines = [...html.matchAll(/<svg class="history-chart-svg"[^>]*aria-label="([^"]*?): /g)].map((m) => m[1]);
  const multi = [...html.matchAll(/<figure class="multi-chart"><figcaption[^>]*>([^<]*)<\/figcaption>/g)].map((m) => m[1]);
  return [...lines, ...multi].map(unescape).sort();
}

// Every chart, and the view it lives in. The one page drew all of these.
const HOMES: Record<HistoryView, string[]> = {
  prestige: ['Prestige', 'Place in the guide, by year'],
  record: [REPORT_WORDS.chart, 'Enrolled', 'Operating funds', 'Catalog'],
  // The standings' cards, one rank chart per ranking.
  guide: STANDINGS.map((x) => x.label),
};

// ---- Every chart has a home ----
{
  const s = launch();
  assert(s.history.length >= 2 && s.clock.year >= 10, 'the fixture has the years to draw every chart');
  for (const view of Object.keys(HOMES) as HistoryView[]) {
    const drawn = charts(render(s, view));
    const want = [...HOMES[view]].sort();
    assert(JSON.stringify(drawn) === JSON.stringify(want), `${view} draws ${want.join(', ')} (drew ${drawn.join(', ')})`);
  }
  const all = Object.values(HOMES).flat();
  assert(all.length === 13, `thirteen charts in all, as the one page drew (${all.length})`);
}

// ---- Which view is drawn ----
{
  const s = launch();
  assert(HISTORY_VIEW_START === 'prestige', 'the tab opens on Prestige');
  const opened = render(s);
  assert(opened.includes('data-section="history.prestige"') && !opened.includes('data-section="history.rankings"'), 'with no view held, Prestige is drawn');
  assert(/<button type="button" class="on" aria-pressed="true">Prestige<\/button>/.test(opened), 'and the switch marks it');
  const record = render(s, 'record');
  assert(record.includes('data-section="history.record"') && !record.includes('data-section="history.prestige"'), 'a held view is the one drawn');
  const landed = render(s, 'record', 'history.rankings');
  assert(landed.includes('data-section="history.rankings"') && !landed.includes('data-section="history.record"'), 'the Rank chip\'s section opens the guide');
  const prestige = render(s, 'guide', 'history.prestige');
  assert(prestige.includes('data-section="history.prestige"'), 'the Prestige chip\'s opens Prestige');
}

// ---- The pillar rule, once, in Prestige's head ----
{
  const s = launch();
  const views = (['prestige', 'record', 'guide'] as HistoryView[]).map((v) => unescape(render(s, v)));
  const said = views.map((html) => html.split(pillarRule()).length - 1);
  assert(said[0] === 1 && said[1] === 0 && said[2] === 0, `the rule is said once, in Prestige (${said.join(', ')})`);
  assert(views[0].indexOf(pillarRule()) > views[0].indexOf('glance-details'), 'under Details, below the meters (Plan 107D)');
}

// ---- At a glance: one figure per pillar, and a meter (Plan 107D) ----
{
  const s = launch();
  const html = unescape(render(s, 'prestige'));
  const breakdown = prestigeBreakdown(s);
  const longest = Math.max(...breakdown.inputs.filter((i) => i.pillar).map((i) => i.weight));
  for (const p of PILLARS) {
    const input = breakdown.inputs.find((i) => i.key === p)!;
    const row = html.slice(html.indexOf(`glance-pillar pillar-${p}`));
    const figure = row.replace(/<[^>]+>/g, ' ').match(/[+−]?\d+\.\d/)?.[0];
    const want = `${input.contribution >= 0.05 ? '+' : ''}${input.contribution.toFixed(1)}`;
    assert(figure === want, `${p}'s row reads one figure, what it adds (${figure} for ${want})`);
    const meter = row.match(/glance-meter" style="width:([\d.]+)%/)?.[1];
    assert(meter !== undefined && Math.abs(Number(meter) - input.weight / longest * 100) < 0.01, `and a meter as long as the most it can add (${meter}%)`);
  }
  const text = html.slice(0, html.indexOf('glance-details')).replace(/<[^>]+>/g, '');
  assert(!/ of 150 → /.test(text) && !/points of prestige/.test(text), 'no pillar line reads two scales');
  assert(!text.includes(prestigeFigure(breakdown.target)) || prestigeFigure(breakdown.target) === prestigeFigure(breakdown.current), 'and the target is not shown as a figure (Plan 98B)');
}

// ---- The teaching standard, by its own measure ----
{
  assert(meanGradeLetter(GRADE_POINTS.A) === 'A' && meanGradeLetter(GRADE_POINTS.B) === 'B' && meanGradeLetter(0) === 'F', 'a whole grade reads as its letter');
  assert(meanGradeLetter(0.56) === 'B−' && meanGradeLetter(0.75) === 'B+' && meanGradeLetter(0.9) === 'A−', 'between two, the nearest third');
  const s = launch();
  const standard = teachingCeiling(s);
  assert(/^courses average an? [ABCDF][+−]?: standing can reach \d+\./.test(standard.detail), `the line names the mean grade (${standard.detail})`);
  assert(standard.detail.includes(`reach ${standard.value.toFixed(0)}.`), 'and the standing it allows');
  assert(!/graded A/.test(standard.detail), 'not the share of A\'s');
}

console.log(`  ${checks} checks, ${failures} failed`);
if (failures > 0) process.exit(1);
