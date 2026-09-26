// ---------------------------------------------------------------------
// Toasts (Plan 70H, components/Toasts.tsx): what a week's news and state
// say as toasts, read without a screen. A program or school founded, the
// rank moving, a building finished out of sight (not one in sight), and
// cash going into the red; a school distinguished is its banner.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { distinguishedIn, toastsFor } from '../src/components/Toasts';
import type { LogEntry } from '../src/state/types';

bindScriptStream(7070);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const line = (message: string, over: Partial<LogEntry> = {}): LogEntry => ({ year: 5, week: 3, message, kind: 'info', ...over });
const before = createInitialState('Toasts');
const same = structuredClone(before);
const nowhere = () => false;

assert(toastsFor(before, same, [], nowhere).length === 0, 'a quiet week says nothing');
assert(toastsFor(before, same, [line('Founded Economics.', { topic: 'program', kind: 'good' })], nowhere).length === 1, 'a program founded is a toast');
assert(toastsFor(before, same, [line('Six programs, one building.', { topic: 'milestone', subject: 'school-founded:Business' })], nowhere).length === 1, 'a school founded is a toast');
assert(toastsFor(before, same, [line('Established.', { topic: 'milestone', subject: 'program-established:ECON' })], nowhere).length === 0, 'other milestones are not');
const hall = line('Developed: a hall.', { topic: 'building', subject: 'HALL-1' });
assert(toastsFor(before, same, [hall], nowhere).length === 1, 'a building finished out of sight is a toast');
assert(toastsFor(before, same, [hall], () => true).length === 0, 'one finished in sight is not');
const up = structuredClone(before);
up.self.reputation += 40;
const moved = toastsFor(before, up, [], nowhere);
assert(moved.length === 1 && moved[0].tone === 'good' && moved[0].text.startsWith('Up to #'), 'the rank moving up is a good toast');
assert(toastsFor(up, before, [], nowhere)[0]?.tone === 'bad', 'and down a bad one');
const red = structuredClone(before);
before.finance.cash = 5;
red.finance.cash = -5;
assert(toastsFor(before, red, [], nowhere).some((t) => t.text.includes('in the red')), 'cash going into the red is a toast');
assert(!toastsFor(red, red, [], nowhere).some((t) => t.text.includes('in the red')), 'staying there is not');
assert(distinguishedIn([line('Distinguished.', { topic: 'milestone', subject: 'school-distinguished:Engineering' })]) === 'Engineering', 'a school distinguished names its banner');
assert(distinguishedIn([hall]) === null, 'nothing else does');

console.log(`toasts: ${checks} checks, ${failures} failures`);
if (failures > 0) process.exit(1);
