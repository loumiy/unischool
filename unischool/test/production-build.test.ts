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
import TitleScreen from '../src/components/TitleScreen';
import Credits from '../src/components/Credits';
import { BUILD_STAMP, buildLine, EDITION, PLATFORM, VERSION, versionLine } from '../src/build';

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

// Which build this is (Plan 97B): the title screen, the Credits and the
// crash screen name it; headless callers read the defaults.
function testVersion(): void {
  assert(VERSION === 'dev' && EDITION === 'full' && PLATFORM === 'web', `headless callers read the defaults (${VERSION}, ${EDITION}, ${PLATFORM})`);
  assert(versionLine('0.1.0', 'full') === 'v0.1.0 · playtest', `a 0.x build is a playtest (${versionLine('0.1.0', 'full')})`);
  assert(versionLine('0.1.0', 'demo') === 'v0.1.0 · demo', 'the demo edition says so');
  assert(versionLine('1.0.0', 'full') === 'v1.0.0', 'and 1.0.0, launch, says neither');
  assert(buildLine({ version: '0.1.0', build: 'a1b2c3d', edition: 'full', platform: 'itch' }) === 'Version 0.1.0 (a1b2c3d), playtest', 'the long line names the commit');

  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { version: string };
  assert(/^0\.\d+\.\d+$/.test(pkg.version), `package.json's version is a 0.x playtest version until launch (${pkg.version})`);
  const config = source(join(process.cwd(), 'vite.config.ts'));
  assert(config.includes('__APP_VERSION__') && config.includes('__BUILD_ID__'), 'vite.config.ts defines the version and the build');

  const noop = () => {};
  const s = createInitialState('Version');
  const title = renderToStaticMarkup(createElement(TitleScreen, { s, onContinue: noop, onNewCollege: noop, onSandbox: noop, onHall: noop, onSettings: noop, onCredits: noop }));
  assert(title.includes(`>${versionLine()}</p>`), 'the title screen shows the version line');
  const credits = renderToStaticMarkup(createElement(Credits, { onClose: noop }));
  assert(credits.includes(buildLine()), 'the Credits name the build');
  const crash = renderToStaticMarkup(createElement(CrashFallback, { error: new Error('x') }));
  assert(crash.includes(buildLine()), 'and so does the crash screen');
  const crashSourceText = source(join(SRC, 'components/CrashScreen.tsx'));
  assert(/JSON\.stringify\(\{ game: BUILD_STAMP,/.test(crashSourceText), 'the bug report carries the build\'s stamp');
  assert(BUILD_STAMP.version === VERSION, 'the stamp is the build\'s');
}

testDebugIsDevOnly();
testCrashScreen();
testVersion();

console.log('production build tests');
if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
