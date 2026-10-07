// ---------------------------------------------------------------------
// Every key the game keeps in the browser starts "unischool." (Plan 97D).
// itch.io serves every HTML game from one domain, so all of them share one
// localStorage: a key without the game's prefix could meet another game's.
//   - every *_KEY / KEY constant in src/ is prefixed;
//   - no getItem, setItem or removeItem is called with a bare string that
//     is not;
//   - a key built at run time (unseen.ts's opened matters) starts from a
//     prefixed constant.
//
//   npm test -- storage-keys
// ---------------------------------------------------------------------

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const SRC = join(process.cwd(), 'src');
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

const files = walk(SRC).map((p) => ({ path: relative(SRC, p), text: readFileSync(p, 'utf8') }));
const storing = files.filter((f) => /localStorage|sessionStorage/.test(f.text));

const constants = storing.flatMap((f) => [...f.text.matchAll(/\b([A-Z_]*KEY)\s*=\s*['`]([^'`]*)['`]/g)].map((m) => ({ file: f.path, name: m[1], value: m[2] })));
assert(constants.length >= 10, `the storage keys are found (${constants.length})`);
const bare = constants.filter((c) => !c.value.startsWith('unischool.'));
assert(bare.length === 0, `every storage key constant starts "unischool." (${bare.map((c) => `${c.file}: ${c.name} = '${c.value}'`).join('; ')})`);

const literal = storing.flatMap((f) => [...f.text.matchAll(/\.(?:getItem|setItem|removeItem)\(\s*['`]([^'`]*)['`]/g)].map((m) => ({ file: f.path, key: m[1] })));
const strays = literal.filter((l) => !l.key.startsWith('unischool.'));
assert(strays.length === 0, `no storage call names a key without the prefix (${strays.map((s) => `${s.file}: '${s.key}'`).join('; ')})`);

// A call with a variable: the variable is one of the constants, or `key`
// built from one in the same file, or typed as one of them.
const known = new Set(constants.map((c) => c.name));
const calls = storing.flatMap((f) => [...f.text.matchAll(/\.(?:getItem|setItem|removeItem)\(\s*([A-Za-z_$][\w$]*)/g)].map((m) => ({ file: f, name: m[1] })));
const unknown = calls.filter((c) => !known.has(c.name) && !(c.name === 'key' && (/`\$\{[A-Z_]*KEY\}/.test(c.file.text) || /key: \w+Key\b/.test(c.file.text) && /type \w+Key = typeof [A-Z_]*KEY/.test(c.file.text))));
assert(unknown.length === 0, `every storage call reads a prefixed key (${unknown.map((u) => `${u.file.path}: ${u.name}`).join('; ')})`);

console.log('storage keys tests');
if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
