// ---------------------------------------------------------------------
// The first year explains itself (Plan 78B).
//
// - NEXT in year one: between the chair's letters the line falls back to
//   the shortfall reading, so it is never empty while a need is under 50.
// - A letter stop whose ask is a building carries a door to the build menu
//   ("Continue and open Build").
// - The week-9 letter says the figures: students, beds and dining seats.
// - The inbox's arrival notice holds a founding note or a milestone in year
//   one, and a held notice is not pushed out of the stack by the news.
//
// The Students tab's week-1 gating is checked in tab-gates.test.ts.
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { bindScriptStream } from '../src/engine/random';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { nextStep, ATTRIBUTE_SHORTFALL } from '../src/systems/guidance/nextStep';
import { findOpeningLetter } from '../src/data/eventData';
import { FOUNDERS_HALL_ID } from '../src/data/techData';
import { letterOpensBuild } from '../src/systems/inbox/inbox';
import { InterruptContent } from '../src/components/InterruptModal';
import { arrivalsIn, stacked, type Toast } from '../src/components/Toasts';
import { satisfactionHint } from '../src/data/figureHints';
import { count } from '../src/format';
import { totalEnrolled, type GameState, type SatisfactionAttributes } from '../src/state/types';

bindScriptStream(7802);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('first year tests');

const lowest = (s: GameState) => Math.min(...Object.values(s.students.satisfactionBreakdown as SatisfactionAttributes));
const render = (s: GameState, onOpenBuild?: () => void) =>
  renderToStaticMarkup(createElement(InterruptContent, { s, act: () => {}, onOpenBuild }));

// --- year one, played on the defaults: NEXT is never empty while a need is short
{
  // A headless founding opens at 'play': the walkthrough is behind it.
  let s = createInitialState('First Year');
  let short = 0;
  let quietWhileShort = 0;
  let week9: GameState | null = null;
  for (let i = 0; i < 400 && s.clock.year === 1; i += 1) {
    if (s.pendingInterrupt) {
      const p = s.pendingInterrupt;
      if (p.type === 'letter' && (p.payload as { id: string }).id === 'somewhere-to-sleep') week9 = s;
      const answer = defaultAnswer(s);
      if (!answer) throw new Error(`no default answer for ${p.type}`);
      s = reducer(s, answer);
      continue;
    }
    if (lowest(s) < ATTRIBUTE_SHORTFALL) {
      short += 1;
      if (nextStep(s) === null) quietWhileShort += 1;
    }
    s = reducer(s, { type: 'TICK' });
  }
  assert(short > 0, `year one has weeks with a need under ${ATTRIBUTE_SHORTFALL} (${short}), so the check means something`);
  assert(quietWhileShort === 0, `NEXT is never empty in year one while a need is under ${ATTRIBUTE_SHORTFALL} (${quietWhileShort} quiet weeks)`);

  // --- the week-9 letter: its figures, and its door
  assert(week9 !== null, 'the week-9 letter arrives in year one');
  if (week9) {
    const w = week9;
    const letter = findOpeningLetter('somewhere-to-sleep')!;
    const body = letter.body(w);
    assert(body.includes(`${count(totalEnrolled(w.students))} students`), `the letter says how many students there are (${body.slice(0, 120)}…)`);
    assert(body.includes(`${count(w.students.capacity)} beds`), 'and the beds that serve them');
    assert(/\d dining seats/.test(body), 'and the dining seats');

    assert(letterOpensBuild(w, 'somewhere-to-sleep'), 'its ask is a building, so the stop carries a door');
    const html = render(w, () => {});
    assert(html.includes('Continue and open Build') && html.includes('>Continue<'), 'the card offers "Continue and open Build" beside Continue');
    assert(/class="btn-quiet"[^>]*>Continue</.test(html), 'Continue is the quiet one beside the door');
    assert(!render(w).includes('open Build'), 'with nowhere to open Build, the card has Continue alone');
  }
}

// --- between letters: the shortfall reading, and a letter's ask still wins --
{
  const s = createInitialState('Between');
  s.events.opening.read = ['doors-open'];
  s.halls[FOUNDERS_HALL_ID].find((slot) => slot.programId === null)!.programId = s.programOffers[0];
  assert(findOpeningLetter('doors-open')!.done(s), 'the first ask is done, and no other letter is read');
  s.students.satisfactionBreakdown = { academic: 70, social: 70, basicNeeds: 70, health: 70, housing: 38 };
  const step = nextStep(s);
  assert(step?.intent?.kind === 'build-for' && step.text.startsWith('Housing is at 38') && step.go === 'build', `between letters year one names the shortfall (${step?.text})`);
  s.events.opening.read.push('somewhere-to-sleep');
  assert(nextStep(s)?.text === findOpeningLetter('somewhere-to-sleep')!.ask(s).text, 'a letter\'s ask still wins when there is one');
  s.students.satisfactionBreakdown.housing = 70;
  s.events.opening.read = ['doors-open'];
  assert(nextStep(s) === null, 'and with nothing short and no ask, the line is quiet');
}

// --- a letter whose ask is not a building has no door ------------------------
{
  let s = createInitialState('No Door');
  s = reducer(s, { type: 'TICK' });
  const id = (s.pendingInterrupt?.payload as { id?: string } | undefined)?.id;
  assert(id === 'doors-open', 'the first stop is the first letter');
  assert(!letterOpensBuild(s, 'doors-open'), 'its ask opens a hall, not the build menu');
  assert(!render(s, () => {}).includes('open Build'), 'so its card has Continue alone');
  assert(!letterOpensBuild(s, 'no-such-letter'), 'a letter gone from the table has no door');
}

// --- the satisfaction chip names the lowest need -----------------------------
{
  const s = createInitialState('Chip');
  s.students.satisfactionBreakdown = { academic: 70, social: 64, basicNeeds: 81, health: 100, housing: 38 };
  const hint = satisfactionHint(s);
  assert(hint.includes('housing, at 38'), `the chip's hint names the lowest need and its figure (${hint})`);
}

// --- arrivals: held in year one, eight seconds after ------------------------
{
  const before = createInitialState('Arrivals');
  before.pendingInterrupt = null;
  const after = structuredClone(before);
  after.clock.week = 5;
  after.log.unshift({ year: 1, week: 5, message: 'Founded Economics.', kind: 'good', topic: 'program', subject: 'ECON' });
  const got = arrivalsIn(before, after);
  const note = got.find((t) => t.open?.startsWith('founding:'));
  assert(note !== undefined && note.held === true, 'a founding note arriving in year one is held');

  const later = structuredClone(before);
  const later2 = structuredClone(after);
  later.clock.year = 2;
  later2.clock.year = 2;
  later2.log[0].year = 2;
  const late = arrivalsIn(later, later2).find((t) => t.open?.startsWith('founding:'));
  assert(late !== undefined && late.held === undefined, 'from year two it keeps the eight seconds');

  const toast = (id: number, held?: true): Toast => ({ id, text: `t${id}`, tone: 'info', ...(held ? { held } : {}) });
  const stack = stacked([toast(1, true), toast(2), toast(3), toast(4)], [toast(5), toast(6)]);
  assert(stack.length === 4 && stack[0].id === 1, 'a held arrival is not pushed out of the stack by the news');
  assert(stack.map((t) => t.id).join(',') === '1,4,5,6', 'the oldest news goes first');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
