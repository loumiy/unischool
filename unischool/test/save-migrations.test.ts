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
import { WEEKS_PER_YEAR, type GameState } from '../src/state/types';
import { LANDMARKS_COUNTED } from '../src/data/researchParkData';

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

// ---- 81 -> 82 (Plan 80D): a milestone's week, and the redrawn walk ----
function testMilestoneWeeks(): void {
  const raw = fixture('save-v81-opening.json');
  const parsed = JSON.parse(raw) as { version: number; state: GameState };
  assert(parsed.version === 81 && !('reachedWeek' in parsed.state.ladder), 'the version-81 fixture written before Plan 80D has no milestone weeks');
  const read = readSave(raw);
  if ('refused' in read) return;
  const reached = Object.entries(parsed.state.ladder.reached);
  assert(reached.length > 1, `it has milestones reached (${reached.length})`);
  assert(reached.every(([id, year]) => read.state.ladder.reachedWeek[id] === (year - 1) * WEEKS_PER_YEAR + 1), 'each loads dated to week 1 of the year it was reached');
  // A walk held on a step the redrawn walk no longer has ends.
  for (const stage of ['teaching', 'found'] as const) {
    const held = JSON.parse(raw) as { version: number; state: { events: { opening: { stage: string } } } };
    held.state.events.opening.stage = stage;
    const back = readSave(JSON.stringify(held));
    assert(!('refused' in back) && back.state.events.opening.stage === 'play', `a save held on the old "${stage}" step loads at play`);
  }
  // A milestone reached after the load records its own week.
  const g = foundGame({ from: read.state, seed: 12345 });
  playYears(g, createGuidedPlayer(), 1);
  const since = Object.keys(g.s.ladder.reached).filter((id) => !(id in parsed.state.ladder.reached));
  assert(since.every((id) => g.s.ladder.reachedWeek[id] > (g.s.ladder.reached[id] - 1) * WEEKS_PER_YEAR), 'and a milestone reached after it keeps the week it was reached');
}

// ---- 90 -> 91 (Plan 85F): Landmark work, read back a week at a time ----
// A save from before Plan 85F with more than LANDMARKS_COUNTED Landmark
// Programs running reads back no more than that a week (Plan 95AA, the
// second review's H7-1), and holds the rule after a year of play.
function testLandmarkWeeks(): void {
  const raw = fixture('save-v81-recruiting.json');
  const parsed = JSON.parse(raw) as { version: number; state: GameState };
  const running = Object.values(parsed.state.research.initiatives ?? {}).filter((i) => i.depth === 'landmark').length;
  assert(running > LANDMARKS_COUNTED, `the recruiting fixture runs more than ${LANDMARKS_COUNTED} Landmark Programs (${running})`);
  const state = loads(raw, 'the recruiting fixture');
  if (!state) return;
  const { year, week } = state.clock;
  const thisYear = state.research.landmarkWork.find((w) => w.year === year)?.weeks ?? 0;
  // The clock's week is the one about to be played: week - 1 weeks are done.
  assert(thisYear <= LANDMARKS_COUNTED * (week - 1), `Year ${year} holds no more than ${LANDMARKS_COUNTED} a week played before week ${week} (${thisYear})`);
  const g = foundGame({ from: state, seed: 12345 });
  playYears(g, createGuidedPlayer(), 1);
  const broken = brokenRules(g.s);
  assert(broken.length === 0, `and holds every rule a year on${broken.length ? `: ${broken.join('; ')}` : ''}`);
}

// ---- 94 -> 95 (Plan 95K): a board letter keeps the week it came ----
// The version-94 fixture is the specialization-notice scenario (year 29),
// the notice queued. It loads dated to week 1 of the year it was given, and
// moved on to year 33 still reads year 29; a ladder letter, whose week no
// save kept, reads the save's week, and a week that is not a week does too.
function testBoardLetterWeeks(): void {
  const raw = fixture('save-v94.json');
  const parsed = JSON.parse(raw) as { version: number; state: GameState };
  const notice = parsed.state.specializationNotice ?? 0;
  assert(parsed.version === 94 && parsed.state.finance.distress?.letters[0] === 'specialization-notice' && notice > 0,
    'the version-94 fixture has the specialization notice queued, with no week');
  const given = (notice - 1) * WEEKS_PER_YEAR + 1;
  const state = loads(raw, 'the version-94 fixture');
  assert(state?.finance.distress?.letterWeeks[0] === given, `the notice loads dated to week 1 of year ${notice} (${state?.finance.distress?.letterWeeks[0]})`);
  const later = JSON.parse(raw) as { version: number; state: GameState };
  later.state.clock.year = notice + 4;
  later.state.finance.distress!.letters.push('enter-2');
  const read = readSave(JSON.stringify(later));
  if ('refused' in read) return assert(false, 'the fixture moved on loads');
  const now = (later.state.clock.year - 1) * WEEKS_PER_YEAR + later.state.clock.week;
  const weeks = read.state.finance.distress?.letterWeeks ?? [];
  assert(weeks[0] === given && weeks[1] === now, `four years on, the notice still reads year ${notice} and a ladder letter the save's week (${weeks.join(', ')})`);
  // At this version, a malformed week reads as the save's and a stray one
  // goes with its letter.
  const bad = { ...read.state, finance: { ...read.state.finance, distress: { ...read.state.finance.distress!, letters: ['enter-2', 'no-such-letter', 'enter-3'], letterWeeks: [-3, 10, 'x'] } } };
  const back = readSave(JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: bad }));
  const d = 'refused' in back ? undefined : back.state.finance.distress;
  assert(d?.letters.join() === 'enter-2,enter-3' && d.letterWeeks.join() === `${now},${now}`, `a malformed week reads as the save's (${d?.letters.join()} at ${d?.letterWeeks.join()})`);
}

// ---- 96 -> 97 (Plan 95V): the programs cut ----
// The version-96 fixture fields twenty programs and has cut none. It loads
// with an empty record, every program still fielded, and plays a year on.
function testNoCutsYet(): void {
  const raw = fixture('save-v96.json');
  const parsed = JSON.parse(raw) as { version: number; state: GameState };
  assert(parsed.version === 96 && !('cutPrograms' in parsed.state.orgs), 'the version-96 fixture has no record of cuts');
  const state = loads(raw, 'the version-96 fixture');
  if (!state) return;
  assert(Array.isArray(state.orgs.cutPrograms) && state.orgs.cutPrograms.length === 0, 'it loads with none cut');
  assert(state.orgs.teams.length === parsed.state.orgs.teams.length, `and every program still fielded (${state.orgs.teams.length})`);
}

testLaunchFixture();
testChain();
testLandmarkWeeks();
testMilestoneWeeks();
testBoardLetterWeeks();
testNoCutsYet();
testRoundTrip();
testRefusals();

console.log('save migrations tests');
if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
