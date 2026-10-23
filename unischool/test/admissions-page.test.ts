// ---------------------------------------------------------------------
// The summer's admissions as a page (Plan 108): the applicant cloud
// (components/applicantCloud.ts) draws the pool by band and reads the line
// as the admit rate, and the page takes the admissions beat out of the
// inbox. Since Plan 112C the summer waits to be opened, its row in the
// inbox on every beat, the line's handle is a grip tab, and the first
// summer of a guided run is walked through.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { applicantCloud, admittedDots, cutForRate, gpaOf, MAX_DOTS, rateForCut, satOf } from '../src/components/applicantCloud';
import InterruptModal from '../src/components/InterruptModal';
import { admissionsPageUp } from '../src/components/AdmissionsPage';
import { interruptItem, interruptPageUp, summerKey, summerOpenLabel } from '../src/systems/inbox/inbox';
import { teachingCollege } from './fixtures/teaching';
import type { SummerPayload } from '../src/state/types';
import { bindScriptStream } from '../src/engine/random';

bindScriptStream(108);
let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

// ---- the cloud ----
{
  const bands = { top: 300, mid: 900, low: 600 };
  const cloud = applicantCloud(bands, [5, 3, 2], 700, 42);
  assert(cloud.per === Math.ceil(1800 / MAX_DOTS), `one scale for the pool and the room (${cloud.per} each)`);
  assert(cloud.dots.length <= MAX_DOTS && Math.abs(cloud.dots.length * cloud.per - 1800) <= 3 * cloud.per, `the pool as at most ${MAX_DOTS} dots (${cloud.dots.length})`);
  assert(cloud.seatDots === Math.floor(700 / cloud.per), 'and the room in the same dots');
  assert(cloud.dots.every((d, i) => i === 0 || cloud.dots[i - 1].comp >= d.comp), 'best first');
  const top = Math.round(300 / cloud.per);
  assert(cloud.dots.slice(0, top).every((d) => d.comp >= 0.7) && cloud.dots.slice(top).every((d) => d.comp < 0.7), "the top band's dots are the best, as the funnel admits them");
  assert(cloud.dots.every((d) => Math.abs((d.sat + d.gpa) / 2 - d.comp) < 1e-9), 'every dot sits on its line of equal quality');
  assert(cloud.dots.every((d) => d.sat > 0 && d.sat < 1 && d.gpa > 0 && d.gpa < 1), 'and inside the plot');
  const again = applicantCloud(bands, [5, 3, 2], 700, 42);
  assert(JSON.stringify(again) === JSON.stringify(cloud), 'a seed draws the same cloud: it holds still while the line moves');
  const shares = [0, 1, 2].map((k) => cloud.dots.filter((d) => d.cohort === k).length / cloud.dots.length);
  assert(Math.abs(shares[0] - 0.5) < 0.02 && Math.abs(shares[2] - 0.2) < 0.02, `cohorts dealt in proportion (${shares.map((x) => x.toFixed(2)).join(', ')})`);

  // The line and the rate are one choice.
  for (const rate of [0, 0.1, 0.38, 0.5, 0.86, 1]) {
    const c = cutForRate(cloud, rate);
    const back = rateForCut(cloud, c);
    assert(Math.abs(back - admittedDots(cloud, rate) / cloud.dots.length) < 1e-9, `a line drawn for ${rate} admits that share back (${back.toFixed(3)})`);
  }
  assert(satOf(0) === 400 && satOf(1) === 1600 && gpaOf(0) === 2 && gpaOf(1) === 4, 'SAT 400–1600, GPA 2.0–4.0');
  // The hall doesn't redraw with the price: on one basis, a smaller or a
  // larger pool keeps the same seats, and the larger is a denser cloud.
  const dear = applicantCloud({ top: 100, mid: 400, low: 300 }, [1], 700, 42, 2400);
  const cheap = applicantCloud({ top: 500, mid: 1500, low: 1000 }, [1], 700, 42, 2400);
  assert(dear.per === cheap.per && dear.seatDots === cheap.seatDots, `the seats hold still while the price moves (${dear.seatDots} and ${cheap.seatDots})`);
  assert(cheap.dots.length > MAX_DOTS && cheap.dots.length > dear.dots.length, 'and a pool past the basis is a denser cloud');
  const tiny = applicantCloud({ top: 10, mid: 20, low: 10 }, [1], 5000, 1);
  assert(tiny.per === Math.ceil(5000 / MAX_DOTS) && tiny.seatDots <= MAX_DOTS, 'a room bigger than the pool sets the scale, so the hall fits too');
}

// ---- the page takes the beat out of the inbox ----
{
  const s = teachingCollege('Page');
  s.started = true;
  s.events.opening.stage = 'play';
  const payload: SummerPayload = { beat: 1, tuition: s.finance.listedTuition, admitRate: s.students.admitRate };
  s.pendingInterrupt = { type: 'summer', payload };
  assert(admissionsPageUp(s) && interruptPageUp(s), 'the admissions beat is a page');
  // Plan 112C: the summer keeps its row on every beat, since it waits there
  // until it is opened; a load in the summer reopens on the beat it was on.
  assert(interruptItem(s)?.subject === `Year ${s.clock.year}: Admissions`, 'and keeps its row in the inbox while it waits');
  assert(summerOpenLabel(s) === 'Open admissions' && summerKey(s) !== null, 'whose door opens admissions');
  const html = renderToStaticMarkup(createElement(InterruptModal, { s, act: () => {} }));
  assert(html.includes('admissions-page') && html.includes('Lock the price'), 'the page opens on the price');
  assert(html.includes('GPA') && html.includes('SAT'), 'over the plot the pool will fill');
  const waiting = renderToStaticMarkup(createElement(InterruptModal, { s, act: () => {}, summerWaiting: true }));
  assert(waiting === '', 'the summer waiting draws nothing over the screen (Plan 112C)');

  const locked = { ...s, pendingInterrupt: { type: 'summer' as const, payload: { ...payload, lockedTuition: payload.tuition } } };
  const after = renderToStaticMarkup(createElement(InterruptModal, { s: locked, act: () => {} }));
  assert(after.includes('Send the offers') && after.includes('role="slider"'), 'a locked price resumes on the line');
  assert(after.includes('adm-handle-tab') && after.includes('adm-handle-chevron'), 'its handle a grip tab with chevrons (Plan 112C)');
  assert(after.includes('What this class does') && after.includes('Weekly net'), 'with money and mood beside it');
  assert(after.includes('Part of your academics score'), 'incoming quality says what it feeds (Plan 113D)');
  assert(!after.includes('crowd'), 'and nothing on the page talks of crowding');
  assert(!html.includes('Your first admissions') && !after.includes('Your first admissions'), 'a run nobody guides is not walked through');

  for (const beat of [0, 2] as const) {
    const other = { ...s, pendingInterrupt: { type: 'summer' as const, payload: { ...payload, beat } } };
    assert(!interruptPageUp(other) && interruptItem(other) !== null, `beat ${beat} stays in the inbox`);
  }
}

// ---- the first summer of a guided run is walked through (Plan 112C) ----
{
  const s = teachingCollege('Coach');
  s.started = true;
  s.events.opening.stage = 'play';
  s.clock = { year: 1, week: 52 };
  s.guidance = { opened: {}, done: {}, met: [], marked: [], gated: true };
  const payload: SummerPayload = { beat: 1, tuition: s.finance.listedTuition, admitRate: s.students.admitRate };
  s.pendingInterrupt = { type: 'summer', payload };
  const html = renderToStaticMarkup(createElement(InterruptModal, { s, act: () => {} }));
  assert(html.includes('Your first admissions') && html.includes('Set the price'), 'the first summer opens on the price, walked through');
  assert(/class="opening-target"[^>]*data-coach="tuition"/.test(html), 'with the tuition slider rung');
  const later = { ...s, clock: { year: 2, week: 52 } };
  assert(!renderToStaticMarkup(createElement(InterruptModal, { s: later, act: () => {} })).includes('Your first admissions'), 'and only the first');
  const off = { ...s, guidance: { ...s.guidance, marked: ['objectives-off'] } };
  assert(!renderToStaticMarkup(createElement(InterruptModal, { s: off, act: () => {} })).includes('Your first admissions'), 'not with the objectives off');
}

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
