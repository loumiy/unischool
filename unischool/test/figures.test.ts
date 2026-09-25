// Every number explains itself (Plan 34, components/Figure.tsx,
// data/figureHints.ts): a Figure's sentence is required and is one
// sentence, and the tabs' bare figures (a <dd> not inside a Figure) are
// counted so the count can only fall.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Figure, { FigureBox } from '../src/components/Figure';
import { FIGURE_HINTS, type Sentence } from '../src/data/figureHints';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('figures tests');

// ---- A Figure without its sentence does not typecheck ----
// Never called: these exist for the typechecker (npm run typecheck).
export const typeRule = [
  // @ts-expect-error — no hint
  () => Figure({ label: 'Cash', value: 1 }),
  // @ts-expect-error — an empty hint is not a sentence
  () => Figure({ label: 'Cash', value: 1, hint: '' }),
  // @ts-expect-error — nor is one without its full stop
  () => FigureBox({ hint: 'Cash on hand', children: null }),
  () => Figure({ label: 'Cash', value: 1, hint: 'Cash on hand.' }),
];
assert(typeRule.length === 4, 'the type rule is in the typecheck');

// ---- Every hint is one sentence ----
{
  const hints: Sentence[] = Object.values(FIGURE_HINTS).map((h) => (typeof h === 'function' ? h(100) : h));
  assert(hints.length >= 25, `the headline figures have their sentences (${hints.length})`);
  for (const h of hints) {
    assert(/^[A-Z]/.test(h) && h.endsWith('.') && !/[.!?] [A-Z]/.test(h), `one sentence: "${h}"`);
    assert(h.length <= 200, `short enough to read on hover (${h.length}): "${h.slice(0, 40)}…"`);
  }
}

// ---- The tabs' bare figures can only fall ----
// Raise nothing here: when a tab's <dd> becomes a Figure, lower the ceiling.
const BARE_CEILING = 29;
{
  // process.cwd(), not import.meta: this file runs bundled (invariants.test.ts).
  const dir = join(process.cwd(), 'src', 'tabs');
  const bare = readdirSync(dir)
    .filter((f) => f.endsWith('.tsx'))
    .reduce((n, f) => n + (readFileSync(join(dir, f), 'utf8').match(/<dd[\s>]/g) ?? []).length, 0);
  assert(bare <= BARE_CEILING, `bare figures in the tabs: ${bare}, at most ${BARE_CEILING}; make the new one a Figure`);
  assert(bare === BARE_CEILING, `bare figures in the tabs fell to ${bare}: lower BARE_CEILING to match`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
