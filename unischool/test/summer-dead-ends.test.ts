// ---------------------------------------------------------------------
// No summer step without a way on (Plan 118H, after I9: from 0.1.3 the
// fiftieth summer's admissions drew "Admissions is open on its own page."
// with no page and no button, and the run stopped). Every beat of an
// ordinary summer and of the fiftieth draws something to press, and never
// that sentence alone. As the shell shows them: a page over the screen
// (interruptPageUp), else the inbox's reading pane.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import InterruptModal, { InterruptContent } from '../src/components/InterruptModal';
import { interruptPageUp } from '../src/systems/inbox/inbox';
import { teachingCollege } from './fixtures/teaching';
import type { SummerPayload } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('summer dead ends tests');

for (const final of [false, true]) {
  for (const beat of [0, 1, 2] as const) {
    const s = teachingCollege('Summer');
    s.started = true;
    s.events.opening.stage = 'play';
    const payload: SummerPayload = { beat, tuition: s.finance.listedTuition, admitRate: s.students.admitRate, ...(final ? { final: true } : {}) };
    s.pendingInterrupt = { type: 'summer', payload };
    const html = interruptPageUp(s)
      ? renderToStaticMarkup(createElement(InterruptModal, { s, act: () => {} }))
      : renderToStaticMarkup(createElement(InterruptContent, { s, act: () => {} }));
    const where = `${final ? 'the fiftieth summer' : 'a summer'}, beat ${beat}`;
    const buttons = (html.match(/<button(?![^>]*disabled)[^>]*>/g) ?? []).length;
    assert(buttons > 0, `${where} draws a button to press (${buttons})`);
    assert(!html.includes('Admissions is open on its own page.') || html.includes('admissions-page'), `${where} never says admissions is elsewhere with nothing there`);
  }
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
