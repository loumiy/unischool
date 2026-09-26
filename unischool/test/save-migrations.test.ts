// ---------------------------------------------------------------------
// Saves that survive updates (Plan 70B). The public build's saves must keep
// loading at every later version, so:
//   - the launch fixture (test/fixtures/save-launch.json, a year-25 run
//     written at LAUNCH_SAVE_VERSION) loads through the real readSave path,
//     holds every rule, and plays a year on;
//   - the chain has a link for every version from launch to SAVE_VERSION,
//     and every link after launch has its own fixture, written by the
//     version before it (test/fixtures/save-vN.json) — so a bump without a
//     migration, or a migration without a fixture, fails here;
//   - export and import round-trip, and a file that cannot be read is
//     refused with its reason.
//
//   npm test -- save-migrations
// ---------------------------------------------------------------------

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { exportSave, LAUNCH_SAVE_VERSION, MIGRATIONS, readSave, SAVE_VERSION } from '../src/state/persistence';
import { foundGame, playYears } from '../sim/harness/game';
import { createGuidedPlayer } from '../sim/harness/guided';
import { brokenRules } from '../sim/harness/invariants';
import type { GameState } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

// Run from the project root (see test/run.mjs), as invariants.test.ts does.
const FIXTURES = join(process.cwd(), 'test/fixtures');
const fixture = (name: string) => readFileSync(join(FIXTURES, name), 'utf8');

function loads(raw: string, what: string): GameState | null {
  const read = readSave(raw);
  if ('refused' in read) {
    assert(false, `${what} loads (refused: ${read.refused})`);
    return null;
  }
  assert(true, `${what} loads`);
  const broken = brokenRules(read.state);
  assert(broken.length === 0, `${what} holds every rule${broken.length ? `: ${broken.join('; ')}` : ''}`);
  return read.state;
}

// ---- The launch fixture ----
function testLaunchFixture(): void {
  const raw = fixture('save-launch.json');
  assert((JSON.parse(raw) as { version: number }).version === LAUNCH_SAVE_VERSION, 'the launch fixture is at the launch version');
  const state = loads(raw, 'the launch fixture');
  if (!state) return;
  assert(state.clock.year === 25, `the launch fixture is a year-25 run (year ${state.clock.year})`);

  // It plays on: a year under the guided player, and the rules still hold.
  const g = foundGame({ from: state, seed: 12345 });
  let error: unknown = null;
  try {
    playYears(g, createGuidedPlayer(), 1);
  } catch (e) {
    error = e;
  }
  assert(error === null, `the launch fixture plays a year on${error ? `: ${String(error)}` : ''}`);
  assert(g.s.clock.year === 26, `and reaches year 26 (year ${g.s.clock.year})`);
  const broken = brokenRules(g.s);
  assert(broken.length === 0, `and holds every rule after it${broken.length ? `: ${broken.join('; ')}` : ''}`);
}

// ---- The chain: a link and a fixture for every version since launch ----
function testChain(): void {
  for (let v = LAUNCH_SAVE_VERSION; v < SAVE_VERSION; v += 1) {
    assert(typeof MIGRATIONS[v] === 'function', `a migration from version ${v}`);
    const name = v === LAUNCH_SAVE_VERSION ? 'save-launch.json' : `save-v${v}.json`;
    if (v > LAUNCH_SAVE_VERSION) {
      assert(existsSync(join(FIXTURES, name)), `a fixture written at version ${v} (test/fixtures/${name})`);
      if (existsSync(join(FIXTURES, name))) loads(fixture(name), `the version-${v} fixture`);
    }
  }
}

// ---- Export and import ----
function testRoundTrip(): void {
  const read = readSave(fixture('save-launch.json'));
  if ('refused' in read) return;
  const file = exportSave(read.state);
  assert(file.filename === 'launch-year-25.unischool.json', `the file is named for the college and year (${file.filename})`);
  const back = readSave(file.text);
  assert(!('refused' in back), 'an exported save imports');
  if ('refused' in back) return;
  assert(JSON.stringify(back.state) === JSON.stringify(read.state), 'and is the same run');
}

// ---- Refusals, each with its reason ----
function testRefusals(): void {
  const refused = (raw: string) => {
    const r = readSave(raw);
    return 'refused' in r ? r.refused : null;
  };
  const launch = JSON.parse(fixture('save-launch.json')) as { version: number; state: unknown };
  assert(refused('not a save at all') === 'unreadable', 'text that is not JSON is unreadable');
  assert(refused('{"savedAt": 1}') === 'unreadable', 'JSON with no version is unreadable');
  assert(refused(JSON.stringify({ ...launch, version: SAVE_VERSION + 1 })) === 'too-new', 'a save from a newer version is refused as too new');
  const oldest = Math.min(...Object.keys(MIGRATIONS).map(Number), SAVE_VERSION);
  assert(refused(JSON.stringify({ ...launch, version: oldest - 1 })) === 'too-old', 'a save older than the chain is refused as too old');
  assert(refused(JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: {} })) === 'not-a-save', 'a save with no college in it is refused');
}

testLaunchFixture();
testChain();
testRoundTrip();
testRefusals();

console.log('save migrations tests');
if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
