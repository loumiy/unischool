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
//     as a letter;
//   - how prestige moves is said in the era's words, the same in the
//     glance and the help (Plan 114B), and a pillar whose door is shut
//     says what opens it.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState } from '../src/state/types';
import { readSave } from '../src/state/persistence';
import HistoryTab, { HISTORY_VIEW_START, prestigeHelp, type HistoryView } from '../src/tabs/HistoryTab';
import { REPORT_WORDS } from '../src/data/reportData';
import { STANDINGS } from '../src/systems/rivals/rivalsSystem';
import { pillarRule, summerRule } from '../src/data/prestigeWords';
import { researchSchools } from '../src/data/techData';
import { GRADE_POINTS, meanGradeLetter } from '../src/data/courseQuality';
import { EARLY_FADE_YEAR, PILLARS, PRESTIGE_FALL_RATE, prestigeBreakdown, riseRateIn, teachingCeiling } from '../src/systems/prestige/prestigeSystem';
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

// ---- How prestige moves, in both eras (Plan 114B, C2-6) ----
{
  const weekly = `Until year ${EARLY_FADE_YEAR} it also climbs a little every week.`;
  const falls = 'It falls faster than it climbs.';
  for (let year = 1; year <= EARLY_FADE_YEAR + 5; year += 1) {
    const rule = summerRule(year);
    assert(rule.startsWith('Prestige is graded each summer. It moves toward that grade. '), `year ${year}: the first two sentences, split (${rule})`);
    // Each era's sentence only while it is true: the weekly climb ends at
    // EARLY_FADE_YEAR, and the fall is faster only once the rise has tapered
    // below it.
    if (rule.endsWith(weekly)) assert(year < EARLY_FADE_YEAR && riseRateIn(year) >= PRESTIGE_FALL_RATE, `year ${year}: climbs weekly only in the early years`);
    else assert(rule.endsWith(falls) && riseRateIn(year) < PRESTIGE_FALL_RATE, `year ${year}: falls faster only once it does (${rule})`);
  }
  assert(summerRule(1).endsWith(weekly) && summerRule(EARLY_FADE_YEAR).endsWith(falls), 'year 1 climbs weekly, and from the fade year it falls faster');
  for (const year of [1, EARLY_FADE_YEAR]) {
    const s = launch();
    s.clock.year = year;
    const html = unescape(render(s, 'prestige'));
    // The help's text shows only when opened, so it is read from its own function.
    const help = prestigeHelp(s);
    assert(html.slice(html.indexOf('glance-details')).includes(summerRule(year)) && help.includes(summerRule(year)), `year ${year}: the glance and History's help say the same sentences`);
    assert(!help.includes('rises slowly') && !help.includes('falls quickly'), 'and the old rule is gone');
  }
}

// ---- A pillar whose door is shut says what opens it (Plan 114B, C3-11) ----
{
  const s = launch();
  const labs = new Set(researchSchools().flatMap((r) => r.labIds));
  const glance = (x: GameState) => {
    const html = unescape(render(x, 'prestige'));
    return { html, meters: html.slice(0, html.indexOf('glance-details')), details: html.slice(html.indexOf('glance-details')) };
  };
  const row = (meters: string, p: string) => meters.slice(meters.indexOf(`glance-pillar pillar-${p}`)).split('</li>')[0];
  const withLab = glance(s);
  assert(s.tech.some((t) => labs.has(t.id) && t.status === 'done') && !withLab.meters.includes('Opens with your first lab'), 'with a lab standing, research says nothing of opening');
  assert(!withLab.details.includes('not yet'), 'and Details marks nothing "not yet"');
  const before = launch();
  for (const t of before.tech) if (labs.has(t.id) && t.status === 'done') t.status = 'available';
  before.orgs.teams = [];
  const shut = glance(before);
  assert(row(shut.meters, 'research').includes('Opens with your first lab'), 'with no lab, research says its first lab opens it');
  assert(row(shut.meters, 'athletics').includes('Opens with your first varsity team'), 'with no team, athletics says its first varsity team does');
  assert(!row(shut.meters, 'academics').includes('glance-shut') && !row(shut.meters, 'studentLife').includes('glance-shut'), 'the other pillars carry no such line');
  const research = shut.details.slice(shut.details.indexOf('pillar-research')).split('</li>')[0];
  assert(/What the labs have produced not yet/.test(research) && /Fields it can research in not yet/.test(research), `Details marks research's lab terms "not yet" (${research.replace(/<[^>]+>/g, '')})`);
  assert(!/Capital projects not yet/.test(research), 'but not a term another door opens');
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
