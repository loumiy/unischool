// Runs the test suites. Each suite is a standalone script that counts its
// checks, prints them and exits non-zero on a failure; this bundles them all
// in one rolldown pass, runs them in parallel child processes, prints each
// suite's output whole as it finishes, and lists every failure at the end.
//
//   npm test                   the fast suites
//   npm run test:slow          the suites that play whole games
//   npm run test:all           both
//   npm test -- cohorts clock  only suites whose name contains a filter

import { build } from 'rolldown';
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'node_modules/.tmp/tests');

// Suites that play one or more whole games through the reducer. They take
// minutes rather than seconds, so they run on their own. The scorecard and
// the endpoint claims were slow suites until Plan 56 made them reports
// (`npm run scorecard`, `npm run endpoint:claims`): balance numbers are
// measured, and only checks gate a merge.
const SLOW = new Set(['balance-regression']);

const args = process.argv.slice(2);
const mode = args.includes('--all') ? 'all' : args.includes('--slow') ? 'slow' : 'fast';
const filters = args.filter((a) => !a.startsWith('--'));

const all = readdirSync(join(ROOT, 'test'))
  .filter((f) => f.endsWith('.test.ts'))
  .map((f) => f.replace(/\.test\.ts$/, ''))
  .sort();
const unknownSlow = [...SLOW].filter((s) => !all.includes(s));
if (unknownSlow.length) {
  console.error(`test/run.mjs lists slow suites that do not exist: ${unknownSlow.join(', ')}`);
  process.exit(1);
}

const suites = all.filter((name) => {
  if (filters.length) return filters.some((f) => name.includes(f));
  if (mode === 'all') return true;
  return mode === 'slow' ? SLOW.has(name) : !SLOW.has(name);
});
if (suites.length === 0) {
  console.error('No suite matches.');
  process.exit(1);
}

const started = Date.now();
await build({
  input: Object.fromEntries(suites.map((s) => [s, join(ROOT, 'test', `${s}.test.ts`)])),
  platform: 'node',
  logLevel: 'warn',
  output: { dir: OUT, format: 'esm', entryFileNames: '[name].mjs', cleanDir: true },
});

function runSuite(name) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn(process.execPath, [join(OUT, `${name}.mjs`)], { cwd: ROOT, env: process.env });
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    child.on('close', (code) => resolve({ name, code, output, ms: Date.now() - t0 }));
  });
}

const results = [];
const queue = [...suites];
const workers = Array.from({ length: Math.min(availableParallelism(), queue.length) }, async () => {
  for (let name = queue.shift(); name; name = queue.shift()) {
    const r = await runSuite(name);
    results.push(r);
    const mark = r.code === 0 ? '✓' : '✗';
    console.log(`\n${mark} ${r.name} (${(r.ms / 1000).toFixed(1)}s)`);
    process.stdout.write(r.output.replace(/^/gm, '    ').trimEnd() + '\n');
  }
});
await Promise.all(workers);

const failed = results.filter((r) => r.code !== 0).map((r) => r.name).sort();
const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log(`\n${results.length - failed.length} of ${results.length} suites passed in ${seconds}s.`);
if (failed.length) {
  console.log(`Failed: ${failed.join(', ')}`);
  process.exit(1);
}
