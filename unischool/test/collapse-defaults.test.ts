// ---------------------------------------------------------------------
// Curriculum folding (Plan 107C, components/useCollapse.ts): a program or
// school is open while it has work left and folds once it is finished; a
// player's click is kept, until the section next finishes.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useCollapse } from '../src/components/useCollapse';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

// Renders one section and hands back what it read and its toggle.
function read(key: string, finished: boolean): { collapsed: boolean; toggle: () => void } {
  let out: { collapsed: boolean; toggle: () => void } | undefined;
  function Probe() {
    const [collapsed, toggle] = useCollapse(key, finished);
    out = { collapsed, toggle };
    return null;
  }
  renderToStaticMarkup(createElement(Probe));
  return out!;
}

assert(!read('program:a', false).collapsed, 'a program with courses left starts open');
assert(read('program:b', true).collapsed, 'a finished program starts folded');

read('program:c', false).toggle();
assert(read('program:c', false).collapsed, 'a player who folds an unfinished program keeps it folded');

read('program:d', true).toggle();
assert(!read('program:d', true).collapsed, 'a player who opens a finished program keeps it open');

read('program:e', false).toggle();
read('program:e', false).toggle();
assert(!read('program:e', false).collapsed, 'opened again by hand, it stays open while unfinished');
assert(read('program:e', true).collapsed, 'and folds the moment it finishes, the earlier click giving way');
read('program:e', true).toggle();
assert(!read('program:e', true).collapsed, 'reopened after finishing, it stays open');

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
