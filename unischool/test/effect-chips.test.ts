// ---------------------------------------------------------------------
// The effect chips (Plan 125 A, data/effectTypes.ts): what an answer does,
// as figures the interface draws in place of a sentence.
//   - a catalogue choice's levers become chips with a sign and a tone
//     (systems/events/choiceEffects.ts);
//   - a bump to satisfaction is marked as wearing off;
//   - the authored decisions (data/eventData.ts) carry their numbers as
//     chips, and their sentences no longer repeat the cost or the numbers.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { effectText } from '../src/data/effectTypes';
import { DECISION_EVENTS, type DecisionEventContext } from '../src/data/eventData';
import { effectsOf } from '../src/systems/events/choiceEffects';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('effect chips tests');

// ---- A catalogue choice's levers ----
{
  const s = createInitialState('Chips');
  const chips = effectsOf(s, { cash: -900_000, mood: 2, warmth: -1, goodwill: 3 }, {});
  const said = chips.map(effectText);
  assert(chips.length === 4, `four levers, four chips (${said.join(' | ')})`);
  const [cash, mood, warmth, goodwill] = chips;
  assert(cash.kind === 'money' && cash.tone === 'loss' && cash.figure === '−$900,000' && !cash.words, `a cost is a red money chip with a minus (${said[0]})`);
  assert(mood.kind === 'satisfaction' && mood.tone === 'gain' && mood.figure === '+2' && mood.fades === true, `a bump to satisfaction is green and wears off (${said[1]})`);
  assert(said[1] === '+2 satisfaction, for a while', `and says so to a screen reader (${said[1]})`);
  assert(warmth.kind === 'alumni' && warmth.tone === 'loss' && !warmth.fades, `alumni warmth is its own chip, and stays (${said[2]})`);
  assert(goodwill.kind === 'goodwill' && goodwill.tone === 'gain', `so is the town's goodwill (${said[3]})`);
  assert(effectsOf(s, {}, {}).length === 0, 'a choice with no levers has no chips');
  assert(effectsOf(s, { cash: 250_000 }, {})[0].figure === '+$250,000', 'a gift is signed too');
  assert(chips.every((c) => /^[+−]/.test(c.figure ?? '')), 'every signed figure carries its sign, so colour is never the only cue');
}

// ---- The authored decisions ----
{
  const s = createInitialState('Chips');
  const ctx: DecisionEventContext = { subjectId: 'x', subjectName: 'Alpha Beta', subjectField: 'venue', amount: 1_000_000, donorName: 'Hale', newName: 'Hale Field' };
  let withChips = 0;
  for (const event of DECISION_EVENTS) {
    for (const choice of event.choices) {
      let text = '';
      try { text = choice.describe(s, ctx); } catch { continue; }
      assert(!/^Costs nothing\b/.test(text), `${event.id}/${choice.id} leaves the cost to its corner ("${text.slice(0, 50)}")`);
      assert(!/recovers over the following weeks/.test(text), `${event.id}/${choice.id} leaves the satisfaction bump to its chip`);
      let chips: ReturnType<NonNullable<typeof choice.effects>> = [];
      try { chips = choice.effects?.(s, ctx) ?? []; } catch { continue; }
      if (chips.length > 0) withChips += 1;
      for (const c of chips) assert(Boolean(c.figure || c.words), `${event.id}/${choice.id}'s chip says something`);
    }
  }
  assert(withChips >= 10, `the decisions carry their numbers as chips (${withChips} choices)`);
  const naming = DECISION_EVENTS.find((e) => e.id === 'naming-rights')!.choices[0];
  const chips = naming.effects!(s, ctx);
  assert(chips[0].kind === 'money' && chips[0].figure === '+$1,000,000' && chips[1].kind === 'satisfaction' && chips[1].tone === 'loss' && chips[1].fades === true,
    `a named gift is money in and a bump down that wears off (${chips.map(effectText).join(' | ')})`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
