// ---------------------------------------------------------------------
// The production build (Plan 70C): what a public player can reach.
//   - The playtest tools are development-only: App.tsx reaches DebugPanel
//     only through an import.meta.env.DEV-guarded lazy import, nothing else
//     in src/ imports it (or AudioBench) statically, a college's name no
//     longer opens the gate, and the reducer refuses DEBUG_ actions outside
//     a development build.
//   - The crash screen: a thrown render becomes its fallback, which offers
//     the run and a bug report only when there is one to offer.
//
//   npm test -- production-build
// ---------------------------------------------------------------------

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CrashScreen, { CrashFallback } from '../src/components/CrashScreen';
import { registerCrashSource } from '../src/engine/crashContext';
import { DEV_BUILD } from '../src/engine/devBuild';
import { createInitialState } from '../src/state/actions';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

// Run from the project root (see test/run.mjs).
const SRC = join(process.cwd(), 'src');
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}
const source = (p: string) => readFileSync(p, 'utf8');

function testDebugIsDevOnly(): void {
  const files = walk(SRC);
  const importers = files.filter((f) => /from '\.\/(components\/)?DebugPanel'|from '\.\/audio\/AudioBench'|from '\.\/AudioBench'/.test(source(f)));
  const allowed = new Set(['components/DebugPanel.tsx']);
  const stray = importers.map((f) => relative(SRC, f)).filter((f) => !allowed.has(f));
  assert(stray.length === 0, `nothing imports DebugPanel or AudioBench statically but DebugPanel itself (${stray.join(', ')})`);
  const app = source(join(SRC, 'App.tsx'));
  assert(/import\.meta\.env\.DEV \? lazy\(\(\) => import\('\.\/components\/DebugPanel'\)\)/.test(app), 'App.tsx reaches DebugPanel through a DEV-guarded lazy import');
  const gate = source(join(SRC, 'components/playtest.ts'));
  assert(!/self\.name|isTestUniversity/.test(gate), 'the playtest gate no longer reads the college\'s name');
  assert(/DEV_BUILD && FLAG_AT_BOOT/.test(gate), 'the playtest gate is closed outside a development build');
  const reducer = source(join(SRC, 'engine/reducer.ts'));
  assert(/if \(!DEV_BUILD && action\.type\.startsWith\('DEBUG_'\)\) return state;/.test(reducer), 'the reducer refuses DEBUG_ actions outside a development build');
  assert(DEV_BUILD === true, 'headless callers (the tests, the harness) count as development');
}

function testCrashScreen(): void {
  const error = new Error('a hall with no floor');
  assert(CrashScreen.getDerivedStateFromError(error).error === error, 'a thrown render becomes the crash screen\'s state');
  assert(CrashScreen.getDerivedStateFromError('text').error.message === 'text', 'a thrown non-Error is wrapped');

  const bare = renderToStaticMarkup(createElement(CrashFallback, { error }));
  assert(bare.includes('The game has stopped') && bare.includes('Reload'), 'the fallback says what happened and offers a reload');
  assert(!bare.includes('Download save'), 'with no game registered it offers no save');
  assert(bare.includes('a hall with no floor'), 'and names the error');

  const s = createInitialState('Crash');
  registerCrashSource({ state: () => s, runLog: () => '{"start":null,"actions":[]}' });
  const live = renderToStaticMarkup(createElement(CrashFallback, { error }));
  assert(live.includes('Download save') && live.includes('Download a bug report'), 'with a founded run it offers the save and a bug report');
}

testDebugIsDevOnly();
testCrashScreen();

console.log('production build tests');
if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
