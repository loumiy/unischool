// Plays sim/balanceSim.ts forward under a scripted strategy and writes the
// resulting GameState as a save payload, so the browser can open a specific
// year or pending modal instead of a fresh game.
//
//   npm run scenario -- --list
//   npm run scenario -- year-8-balanced [out.json]
//   npm run scenario -- --strategy "Balanced builder" --year 12 --modal milestone
//   npm run scenario -- --strategy Completionist --year 22 --vernacular gothic \
//     --name Blackmoor --clear-modal /tmp/gothic.json    # a campus to photograph
//   npm run scenario -- --strategy Completionist --year 50 --build-all \
//     --clear-modal /tmp/all.json           # every placeable asset standing
//
// Flags: --strategy <name> --year N --modal <interrupt type> --seed N
//        --vernacular <v> --name <school> --clear-modal --build-all --list
//
// The output is a real save at the current SAVE_VERSION, built through the
// reducer, so it never needs migrating. Load it with the debug panel's Load
// button, or hand it to `npm run shot`. Nothing in src/ imports this.
import { writeFileSync } from 'node:fs';
import { play, STRATEGIES, DEFAULT_SIM_SEED, type Strategy } from '../sim/balanceSim';
import { SAVE_VERSION } from '../src/state/persistence';
import { totalEnrolled } from '../src/state/types';
import type { GameState, Vernacular } from '../src/state/types';
import { firstFreeSpot, footprintOf, isPlaceableKind, placementFor } from '../src/state/campusMap';
import { SCENARIOS, findScenario, atModal, type Scenario } from './scenarios';

// `--k v` and `--k=v` both work; other arguments are positional.
const VALUE_FLAGS = ['strategy', 'year', 'modal', 'seed', 'vernacular', 'name', 'out'];
const BOOL_FLAGS = ['list', 'clear-modal', 'build-all', 'help'];

function parseArgs(argv: string[]): { flags: Record<string, string>; positional: string[] } {
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { positional.push(arg); continue; }
    const [rawKey, inlineValue] = arg.slice(2).split(/=(.*)/s);
    if (BOOL_FLAGS.includes(rawKey)) { flags[rawKey] = 'true'; continue; }
    if (!VALUE_FLAGS.includes(rawKey)) throw new Error(`unknown flag --${rawKey}`);
    const value = inlineValue ?? argv[++i];
    if (value === undefined) throw new Error(`--${rawKey} needs a value`);
    flags[rawKey] = value;
  }
  return { flags, positional };
}

const { flags, positional } = parseArgs(process.argv.slice(2));

// A positional ending in `.json` is the output path wherever it sits (a run
// built only from flags has no scenario name); anything else is the name.
const pathArg = positional.find((arg) => arg.endsWith('.json'));
const nameArg = positional.find((arg) => !arg.endsWith('.json'));

function printList(): void {
  console.log('scenarios (npm run scenario -- <name> [out.json]):\n');
  const width = Math.max(...SCENARIOS.map((sc) => sc.name.length));
  for (const sc of SCENARIOS) {
    console.log(`  ${sc.name.padEnd(width)}  ${sc.what}`);
    console.log(`  ${' '.repeat(width)}  ${sc.strategy}, to year ${sc.year}${sc.stopWhen ? ', stopping early' : ''}`);
  }
  console.log('\nor build one that is not in the index:');
  console.log('  npm run scenario -- --strategy "Balanced builder" --year 12 [--modal milestone] [--seed 7]');
}

if (flags.help || flags.list) {
  printList();
  process.exit(0);
}

// The recipe: a named scenario, or one from flags. Flags override a named
// scenario's fields.
const named = nameArg ? findScenario(nameArg) : undefined;
if (nameArg && !named) {
  console.error(`no scenario named "${nameArg}". Try --list.`);
  process.exit(2);
}

const recipe: Scenario = {
  name: named?.name ?? 'ad-hoc',
  what: named?.what ?? 'built from flags',
  strategy: flags.strategy ?? named?.strategy ?? 'Balanced builder',
  year: Number(flags.year ?? named?.year ?? 20),
  stopWhen: flags.modal ? atModal(flags.modal) : named?.stopWhen,
};
// Only an explicit --modal is known here; a named scenario's stopWhen is opaque.
const wantedModal = flags.modal ?? null;

function resolveStrategy(name: string): Strategy {
  const lower = name.toLowerCase();
  const hit = STRATEGIES.find((st) => st.name.toLowerCase().startsWith(lower))
    ?? STRATEGIES.find((st) => st.name.toLowerCase().includes(lower));
  if (!hit) {
    throw new Error(
      `no strategy matching "${name}". Known: ${STRATEGIES.map((st) => st.name).join(', ')}`,
    );
  }
  return hit;
}

const strategy = resolveStrategy(recipe.strategy);
const seed = flags.seed ? Number(flags.seed) : DEFAULT_SIM_SEED;
const outPath = pathArg ?? flags.out ?? `node_modules/.tmp/${recipe.name}.json`;

const run = play(strategy, recipe.year, undefined, seed, recipe.stopWhen);
const state: GameState = run.state;
// A recipe that breaks the school after the run (see Scenario.mutate).
named?.mutate?.(state);

// Failing to reach the requested stopping point is an error, not a caveat.
// Judged by the clock (the run halts early only if it stopped), so
// non-modal stops like `founding` follow the same rule.
const pending = state.pendingInterrupt?.type ?? null;
const stoppedEarly = state.clock.year <= recipe.year;
if (recipe.stopWhen && !stoppedEarly) {
  console.error(
    `scenario "${recipe.name}" ran out the clock at year ${recipe.year} under ${strategy.name} ` +
    `without reaching ${wantedModal ? `a ${wantedModal} modal` : 'its stopping point'}. ` +
    'Nothing written — raise --year, or try another strategy.',
  );
  process.exit(1);
}
if (wantedModal && pending !== wantedModal) {
  console.error(`asked to stop at a ${wantedModal} modal; stopped at ${pending}. Nothing written.`);
  process.exit(1);
}

// Cosmetic or developer-facing overrides: nothing the simulation reads back.
// The harness never reads the milestone notes, which a player would have
// read as they came: a Year-20 save would otherwise open on Year 1's.
state.ladder.unread = [];
if (flags.name) state.self.name = flags.name;
if (flags.vernacular) state.self.vernacular = flags.vernacular as Vernacular;
if (flags['clear-modal']) {
  // A loaded save reopens its modal, whose backdrop would swallow a
  // screenshot driver's zoom and pan clicks.
  state.pendingInterrupt = null;
  state.events.pendingDemand = null;
  state.events.activeDemand = null;
}

// Not cosmetic: --build-all stands every placeable Buildable the run did not
// build (e.g. the football stadium no strategy unlocks) on the first clear
// tiles, for photographing. The result is not a state the game produced.
let stood = 0;
if (flags['build-all']) {
  for (const node of state.tech) {
    if (!isPlaceableKind(node) || node.status === 'done' || node.status === 'developing') continue;
    const spot = firstFreeSpot(state, node, footprintOf(node));
    if (!spot) { console.error(`--build-all: no room for ${node.id}`); continue; }
    node.status = 'done';
    state.placements[node.id] = placementFor(spot.row, spot.col, footprintOf(node));
    stood += 1;
  }
}

writeFileSync(outPath, JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), state }));

const placed = Object.keys(state.placements ?? {}).length;
console.log(
  `${outPath}\n` +
  `  ${recipe.name}: ${strategy.name}, seed ${seed}\n` +
  `  year ${state.clock.year} week ${state.clock.week}, prestige ${state.self.reputation.toFixed(0)}, ` +
  `${totalEnrolled(state.students).toLocaleString()} enrolled, $${Math.round(state.finance.cash).toLocaleString()} cash\n` +
  `  ${placed} placed buildings${stood ? ` (${stood} stood by --build-all)` : ''}, vernacular ${state.self.vernacular}, ` +
  `modal ${state.pendingInterrupt?.type ?? 'none'}`,
);
