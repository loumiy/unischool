// ---------------------------------------------------------------------
// The Final Report staged (Plan 124 M3): where the fiftieth summer files
// it, the page opens with no grade down and "Students taught" at nought;
// the six grades and the final one then stamp in (a timer, not checked
// here). Under reduced motion it opens at its end state: every grade down
// and the figure whole. The History tab's copy is never staged. The
// fanfare moved from the summer's seal (audio/director.ts) to the reveal.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { finalReport, founderFigures } from '../src/state/finalReport';
import { STANDINGS } from '../src/systems/rivals/rivalsSystem';
import { setSettings } from '../src/settings';
import { stateCues } from '../src/components/audio/director';
import FinalReportView from '../src/components/FinalReportView';
import { count } from '../src/format';
import type { GameState, YearSnapshot } from '../src/state/types';

bindScriptStream(1243);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('final report staged tests');

const s = createInitialState('Staged');
s.history = Array.from({ length: 50 }, (_, i) => ({
  year: i + 1, rank: 10, graduated: 1000,
  standingValues: Object.fromEntries(STANDINGS.map(({ axis }) => [axis, 40 + i])),
}) as unknown as YearSnapshot);
s.clock.year = 50;
const report = finalReport(s);
const taught = count(founderFigures(s).studentsTaught);
const marks = (html: string) => (html.match(/aria-label="grade /g) ?? []).length;
const render = (staged: boolean) => renderToStaticMarkup(createElement(FinalReportView, { s, report, staged }));

setSettings({ motion: 'system' });
{
  const html = render(true);
  assert(marks(html) === 0, `staged, it opens with no grade down (${marks(html)})`);
  assert(!html.includes(taught), 'and Students taught yet to count up');
  assert((html.match(/final-report-stamp/g) ?? []).length === 7, 'with a place kept for each of the seven grades');
}
{
  const html = render(false);
  assert(marks(html) === 7 && html.includes(taught), 'the History tab\'s copy shows everything at once');
}

setSettings({ motion: 'reduce' });
{
  const html = render(true);
  assert(marks(html) === 7, `under reduced motion, every grade is down at once (${marks(html)})`);
  assert(html.includes(`aria-label="grade ${report.mark}"`), 'the final grade among them');
  assert(html.includes(taught), `and Students taught whole (${taught})`);
}

// The fanfare is the reveal's, not the seal's.
{
  const before = structuredClone(s) as GameState;
  const after = structuredClone(s) as GameState;
  after.ending = { report, addenda: [] };
  assert(!stateCues(before, after).includes('fanfare'), 'sealing the report plays no fanfare');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
