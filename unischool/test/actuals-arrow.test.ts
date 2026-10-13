// ---------------------------------------------------------------------
// Plan 98B: prestige and satisfaction show the actual figure with an arrow
// for the week's change, never the target they move toward. The arrow's
// three states, the words beside it, and a sweep that no player-facing
// string under src/ names either target (the DebugPanel may).
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PRESTIGE_TREND, SATISFACTION_TREND, trendOf, trendWords } from '../src/components/TrendFigure';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) { failures += 1; console.log(`  ✗ ${msg}`); }
}

console.log('actuals with an arrow tests');

// The arrow's three states.
assert(trendOf(0.3, 0.05) === 'up', 'a rise reads up');
assert(trendOf(-0.3, 0.05) === 'down', 'a fall reads down');
assert(trendOf(0.01, 0.05) === 'steady', 'a move under the floor reads steady');
assert(trendOf(-0.01, SATISFACTION_TREND.floor) === 'steady', 'a small fall in satisfaction reads steady');
assert(trendOf(0.02, PRESTIGE_TREND.floor) === 'up', "prestige's tremble between summers still shows its direction");
assert(trendOf(0.05, 0.05) === 'up', 'the floor itself counts as moving');

// The words.
assert(trendWords(0.314, 0.05, 2) === 'Rising about 0.31 a week', `a rise in words (${trendWords(0.314, 0.05, 2)})`);
assert(trendWords(-1.2, 0.05, 1) === 'Falling about 1.2 a week', `a fall in words (${trendWords(-1.2, 0.05, 1)})`);
assert(trendWords(0, 0.05) === 'Holding steady', 'holding, in words');

// No player-facing string names either target. Comments are skipped (a
// line whose code part is empty after stripping // comments), and the
// DebugPanel is the one place that shows the target on purpose.
const FORBIDDEN = [/prestige target/i, /satisfaction target/i, /Drifting (up|down) toward/, /Sitting at its target/, /is grading \$\{/];
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}
const SRC = join(process.cwd(), 'src');
const offenders: string[] = [];
for (const file of sources(SRC)) {
  if (file.endsWith('DebugPanel.tsx')) continue;
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '').trim();
    if (code.startsWith('*') || code === '') return;
    if (FORBIDDEN.some((re) => re.test(code))) offenders.push(`${file.slice(SRC.length + 1)}:${i + 1}`);
  });
}
assert(offenders.length === 0, `no player-facing string names a target (${offenders.join(', ')})`);

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
if (failures > 0) process.exit(1);
