// ---------------------------------------------------------------------
// The store page's link (Plan 117G, src/storeLink.ts):
//   - unset, empty or not https, there is no link;
//   - a build that names an https page links to it;
//   - every place that opens it is guarded, so a build without one shows
//     none.
//
//   npm test -- store-link
// ---------------------------------------------------------------------

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { STORE_URL, storeUrlFrom } from '../src/storeLink';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

assert(STORE_URL === null && storeUrlFrom(undefined) === null, 'unset, the build links to no store');
assert(storeUrlFrom('') === null && storeUrlFrom('   ') === null, 'nor set empty');
assert(storeUrlFrom('http://store.steampowered.com/app/1') === null && storeUrlFrom('not a url') === null, 'nor to an address that is not https');
assert(storeUrlFrom(' https://store.steampowered.com/app/1/UniSchool/ ') === 'https://store.steampowered.com/app/1/UniSchool/', 'a build that names a page links to it');

const SRC = join(process.cwd(), 'src');
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : f.endsWith('.tsx') ? [p] : [];
});
const users = walk(SRC).filter((f) => readFileSync(f, 'utf8').includes('openStorePage'));
const unguarded = users.filter((f) => !/STORE_URL &&/.test(readFileSync(f, 'utf8'))).map((f) => relative(SRC, f));
assert(users.length >= 2, `the title menu and the Final Report open it (${users.map((f) => relative(SRC, f)).join(', ')})`);
assert(unguarded.length === 0, `every link to the store shows only when there is one (${unguarded.join(', ')})`);

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
