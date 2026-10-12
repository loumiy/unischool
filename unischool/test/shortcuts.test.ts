// ---------------------------------------------------------------------
// Plan 98F: the shortcuts are one table (components/hotkeys.ts), which the
// handlers read and Settings lists. A key is bound once, and no handler
// compares a key of its own.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { SHORTCUTS, keyName } from '../src/components/hotkeys';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) { failures += 1; console.log(`  ✗ ${msg}`); }
}

console.log('shortcut tests');

const all = Object.values(SHORTCUTS).flatMap((s) => [...s.keys]);
assert(new Set(all).size === all.length, 'no key is bound twice');
assert(all.every((k) => k === k.toLowerCase()), 'keys are stored lowercased, as isKey reads them');
assert(keyName(' ') === 'Space' && keyName('q') === 'Q' && keyName('arrowup') === '↑', 'keys are listed by their caps');

// A handler that compared e.key with a literal would bind a key the list
// doesn't show.
const src = join(process.cwd(), 'src');
const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
  .flatMap((d) => d.isDirectory() ? files(join(dir, d.name)) : /\.tsx?$/.test(d.name) ? [join(dir, d.name)] : []);
// Each useHotkeys call's arguments, by matching parentheses. (A widget's
// own keys, like a list's arrow keys or a popover's Escape, are not shortcuts.)
function hotkeyHandlers(text: string): string[] {
  const out: string[] = [];
  for (let at = text.indexOf('useHotkeys('); at >= 0; at = text.indexOf('useHotkeys(', at + 1)) {
    let depth = 0;
    let end = at + 'useHotkeys'.length;
    for (; end < text.length; end += 1) {
      if (text[end] === '(') depth += 1;
      else if (text[end] === ')' && --depth === 0) break;
    }
    out.push(text.slice(at, end));
  }
  return out;
}
let handlers = 0;
for (const file of files(src)) {
  if (file.endsWith('hotkeys.ts')) continue;
  for (const body of hotkeyHandlers(readFileSync(file, 'utf8'))) {
    handlers += 1;
    const literal = /e\.key\b(?!.*isKey)[^;\n]*'/.exec(body);
    assert(!literal, `${file.slice(src.length + 1)} reads its keys from the table (${literal?.[0] ?? ''})`);
  }
}
assert(handlers >= 12, `every handler was found (${handlers})`);

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
if (failures > 0) process.exit(1);
