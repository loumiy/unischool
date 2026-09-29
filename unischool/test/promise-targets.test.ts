// ---------------------------------------------------------------------
// Numbers explained (Plan 80C):
//
//   1. every promise states its target: each condition its goal uses has
//      words (systems/promises/promiseTargets.ts), so the offer and the
//      Promises panel say the measure, the figure, the summer it is judged
//      and where the college stands now;
//   2. a promise whose title names a number names its goal's;
//   3. the owner's example reads as written: "Admit rate 25% or lower at
//      the summer of Year 14. Now 36%.";
//   4. the board's confidence is gone: a save written at version 81 loads
//      without it, and no event or promise reads or moves it.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { PROMISES, promiseById } from '../src/data/promiseData';
import { EVENT_CATALOGUE } from '../src/data/eventCatalogue';
import { GOAL_WORDS, promiseTarget, promiseTargetLine } from '../src/systems/promises/promiseTargets';
import { readSave, SAVE_VERSION } from '../src/state/persistence';
import type { ConditionKey } from '../src/data/eventCatalogueTypes';

bindScriptStream(8080);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('promise targets tests');

// ---- 1. Every goal can be said ----
{
  const s = createInitialState('Targets');
  for (const def of PROMISES) {
    const keys = Object.keys(def.goal) as ConditionKey[];
    for (const k of keys) assert(GOAL_WORDS[k] !== undefined, `${def.id}: the goal's ${k} has words`);
    const line = promiseTargetLine(s, def, 14);
    assert(/ at the summer of Year 14\. Now .+\.$/.test(line), `${def.id}: "${line}" names the summer and the college's reading`);
    assert(!/undefined|NaN|Infinity/.test(line), `${def.id}: "${line}" is all figures`);
    // One target per part of the goal.
    assert(promiseTarget(def, 14, 1).split(' and ').length >= keys.length, `${def.id}: every part of the goal is stated`);
  }
}

// ---- 2. A title's number is its goal's ----
// "Four schools", "Thirty scholars", "Eight hundred students, and content",
// "Into the guide's top twenty": the words a title counts in, read back.
{
  const UNITS: Record<string, number> = {
    a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  };
  const numberIn = (title: string): number | null => {
    const words = title.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const next = words[i + 1];
      if (next === 'thousand' || next === 'hundred') {
        const unit = UNITS[words[i]];
        if (unit !== undefined) return unit * (next === 'thousand' ? 1000 : 100);
      }
      if (words[i] !== 'a' && words[i] !== 'one' && UNITS[words[i]] !== undefined) return UNITS[words[i]];
    }
    return null;
  };
  let counted = 0;
  for (const def of PROMISES) {
    const n = numberIn(def.title.replace(/\{\w+\}/g, ''));
    if (n === null) continue;
    counted += 1;
    const bounds = Object.values(def.goal);
    assert(bounds.includes(n), `"${def.title}" (${def.id}) counts ${n}, and its goal is ${JSON.stringify(def.goal)}`);
  }
  assert(counted >= 8, `the titles that name a number are read (${counted})`);
}

// ---- 3. The owner's example ----
{
  const s = createInitialState('Targets');
  s.students.admitRate = 0.36;
  const def = promiseById('selective-college')!;
  const line = promiseTargetLine(s, def, 14);
  assert(line === 'Admit rate 25% or lower at the summer of Year 14. Now 36%.', `the admit rate reads as the owner wrote it ("${line}")`);
  const pair = promiseTargetLine(s, promiseById('content-at-eight-hundred')!, 20);
  assert(/^800 students or more and satisfaction 50 or more at the summer of Year 20\. Now [\d,]+ students and satisfaction \d+\.$/.test(pair), `a goal of two parts names each ("${pair}")`);
  const money = promiseTargetLine(s, promiseById('a-years-reserve')!, 11, 2);
  assert(money.startsWith('Cash of $20M or more at the summer of Year 11.'), `a money target is at the promise's scale ("${money}")`);
}

// ---- 4. The board's confidence is gone ----
{
  const raw = readFileSync(join(process.cwd(), 'test/fixtures/save-v81-confidence.json'), 'utf8');
  const parsed = JSON.parse(raw) as { version: number; state: { finance: { distress?: Record<string, unknown> } } };
  assert(parsed.version === 81 && typeof parsed.state.finance.distress?.confidence === 'number', 'the fixture was written at version 81, with the board\'s confidence');
  const read = readSave(raw);
  assert(!('refused' in read), 'it loads');
  if (!('refused' in read)) {
    const d = read.state.finance.distress as unknown as Record<string, unknown>;
    assert(d !== undefined && !('confidence' in d), 'without the confidence');
    assert(d !== undefined && d.rung === parsed.state.finance.distress!.rung, 'and on the same rung of the board\'s scale');
    assert(SAVE_VERSION >= 84, `at version 84 or later (${SAVE_VERSION})`);
  }
  const text = JSON.stringify([EVENT_CATALOGUE.map((e) => [e.when, e.choices.map((c) => c.effects)]), PROMISES.map((p) => [p.deal, p.goal, p.reward, p.penalty])]);
  assert(!text.includes('confidence'), 'no event or promise reads or moves it');
}

console.log(`promise targets: ${checks} checks, ${failures} failures`);
if (failures > 0) process.exit(1);
