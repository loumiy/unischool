// ---------------------------------------------------------------------
// Feedback from inside the game (Plan 97F, src/feedback.ts):
//   - the form's address: the playtest's by default, none when a build
//     sets it empty (and then no link shows: every one is guarded);
//   - the link's hidden fields are only what the build knows, never the
//     college's name or mascot, and the install id only while statistics
//     are on;
//   - each prompt asks once per install, and the setting turns both off;
//   - Report a bug's file names the build.
//
//   npm test -- feedback
// ---------------------------------------------------------------------

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { foundGame, fakeStorage } from '../sim/harness/game';
import { FEEDBACK_URL, PLAYTEST_FORM, PROMPTS_KEY, bugReport, feedbackFields, feedbackLink, formUrlFrom, markAsked, promptDue } from '../src/feedback';
import { ID_KEY, configureAnalytics } from '../src/analytics/analytics';
import { BUILD_STAMP } from '../src/build';
import { setSettings } from '../src/settings';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

// ---- The form's address ----
assert(FEEDBACK_URL === PLAYTEST_FORM && formUrlFrom(undefined) === PLAYTEST_FORM, 'unset, the build sends to the playtest\'s form');
assert(formUrlFrom('') === null && formUrlFrom('  ') === null, 'set empty, there is no form');
assert(formUrlFrom('http://tally.so/r/x') === null && formUrlFrom('not a url') === null, 'nor for an address that is not https');
assert(formUrlFrom('https://tally.so/r/other') === 'https://tally.so/r/other', 'another form, when a build names one');

// Every link to the form in the game is guarded, so a build without one
// shows none.
const SRC = join(process.cwd(), 'src');
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : /\.tsx$/.test(f) ? [p] : [];
});
const unguarded = walk(SRC).filter((f) => {
  const text = readFileSync(f, 'utf8');
  return /openFeedback\(/.test(text) && !/feedbackAvailable\(\)|promptDue\(/.test(text);
}).map((f) => relative(SRC, f));
assert(unguarded.length === 0, `every link to the form shows only when there is one (${unguarded.join(', ')})`);

// ---- The link's fields ----
const g = foundGame({ name: 'Halberd Crane' });
g.s.self.mascot = 'Night Herons';
setSettings({ stats: 'off' });
const fields = feedbackFields(g.s);
const link = feedbackLink(g.s) ?? '';
assert(JSON.stringify(Object.keys(fields).sort()) === JSON.stringify(['build', 'edition', 'platform', 'rank', 'version', 'week', 'year']), `the link carries only the build, the year, week and rank (${Object.keys(fields).join(', ')})`);
assert(fields.version === BUILD_STAMP.version && fields.year === String(g.s.clock.year) && Number(fields.rank) >= 1, 'with their values');
assert(link.startsWith(`${PLAYTEST_FORM}?`) && !/Halberd|Crane|Night|Herons/i.test(decodeURIComponent(link)), `and never the college's name or mascot (${link})`);
assert(!('year' in feedbackFields(null)) && 'version' in feedbackFields(null), 'with no run, only the build');

// The install id: only while statistics are on, and never made for it.
configureAnalytics({ enabled: true, key: 'phc_test', transport: () => {} });
fakeStorage.set(ID_KEY, '00000000-0000-4000-8000-000000000000');
assert(!('install_id' in feedbackFields(g.s)), 'statistics off: no install id');
setSettings({ stats: 'on' });
assert(feedbackFields(g.s).install_id === '00000000-0000-4000-8000-000000000000', 'statistics on: the install id, to read a reply beside the statistics');
fakeStorage.delete(ID_KEY);
assert(!('install_id' in feedbackFields(g.s)) && !fakeStorage.has(ID_KEY), 'and none is made for the link');
configureAnalytics({ enabled: false, key: null });

// ---- The prompts ----
fakeStorage.delete(PROMPTS_KEY);
setSettings({ feedbackPrompts: true });
assert(promptDue('five-years') && promptDue('final-report'), 'each prompt is due on a fresh install');
markAsked('five-years');
assert(!promptDue('five-years') && promptDue('final-report'), 'once asked, the fifth summer\'s never asks again, and the other still does');
markAsked('five-years');
assert(JSON.parse(fakeStorage.get(PROMPTS_KEY) ?? '[]').length === 1, 'and is recorded once');
setSettings({ feedbackPrompts: false });
assert(!promptDue('final-report'), 'the setting off, neither shows');
setSettings({ feedbackPrompts: true });

// ---- Report a bug ----
const report = JSON.parse(bugReport('{"start":null,"actions":[]}')) as { game: unknown; error: unknown; run: unknown };
assert(JSON.stringify(report.game) === JSON.stringify(BUILD_STAMP) && report.error === null && report.run !== null, 'Report a bug\'s file names the build and holds the session');
assert(JSON.parse(bugReport('not json')).run === null, 'and still writes when the log cannot be read');

console.log('feedback tests');
if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
