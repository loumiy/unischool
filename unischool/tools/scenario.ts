// ---------------------------------------------------------------------
// STAND THE GAME UP SOMEWHERE SPECIFIC. Plays sim/balanceSim.ts forward
// under a scripted strategy and writes the resulting GameState out as a
// save payload, so the browser can open year 8 of a balanced school, or
// the exact week a championship modal is pending, instead of week one of
// a fresh game.
//
// This is the thing every later playtest is checked with: "does this
// change make the game better" is a question about a state, and until
// this existed the only way to reach one was to play there, or to write a
// one-off script (which is what the September 2026 design review did).
//
//   npm run scenario -- --list
//   npm run scenario -- year-8-balanced [out.json]
//   npm run scenario -- --strategy "Balanced builder" --year 12 --modal milestone
//   npm run scenario -- --strategy Completionist --year 22 --vernacular gothic \
//     --name Blackmoor --clear-modal /tmp/gothic.json    # a campus to photograph
//
// Flags: --strategy <name> --year N --modal <interrupt type> --seed N
//        --vernacular <v> --name <school> --clear-modal --list
//
// The written file is a real save (persistence.ts's SavePayload at the
// current SAVE_VERSION), built through the reducer rather than assembled
// by hand, so it never needs migrating and can never disagree with the
// shape the game actually loads. Load it with the debug panel's Load
// button, or hand it to `npm run shot`.
//
// Not part of the game: nothing in src/ imports it.
// ---------------------------------------------------------------------
import { writeFileSync } from 'node:fs';
import { play, STRATEGIES, DEFAULT_SIM_SEED, type Strategy } from '../sim/balanceSim';
import { SAVE_VERSION } from '../src/state/persistence';
import { totalEnrolled } from '../src/state/types';
import type { GameState, Vernacular } from '../src/state/types';
import { SCENARIOS, findScenario, atModal, type Scenario } from './scenarios';

// ---------------------------------------------------------------------
// Arguments. `--k v` and `--k=v` both work, and anything that isn't a flag
// or a flag's value is positional: the scenario name, and the output path
// (told apart by the `.json`, see below).
// ---------------------------------------------------------------------
const VALUE_FLAGS = ['strategy', 'year', 'modal', 'seed', 'vernacular', 'name', 'out'];
const BOOL_FLAGS = ['list', 'clear-modal', 'help'];

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

// A positional ending in `.json` is the OUTPUT PATH, wherever it sits, and
// anything else is the scenario name. Positional order alone is not enough:
// `--strategy Balanced --year 20 out.json` has no name in it at all, and
// reading that path as a scenario name would quietly write the file
// somewhere else.
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

// ---------------------------------------------------------------------
// The recipe: either a named scenario, or one assembled from the flags.
// Flags override a named scenario's own fields, so `year-8-balanced
// --year 12` is a legal thing to ask for.
// ---------------------------------------------------------------------
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
// What the run was ASKED to stop at, kept beside the predicate so the
// check below can name it. A named scenario's own stopWhen is opaque —
// it is a function — so the modal it waits for is recovered from the
// state it actually stopped in.
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

// ---------------------------------------------------------------------
// Play it.
// ---------------------------------------------------------------------
const run = play(strategy, recipe.year, undefined, seed, recipe.stopWhen);
const state: GameState = run.state;
// A recipe that breaks the school after the run (see Scenario.mutate).
named?.mutate?.(state);

// A scenario that asked to stop somewhere and never got there is a
// FAILURE, not a save with a caveat: the whole value of `championship` is
// that the state it writes has a championship on screen, and silently
// handing back year 40 instead would send a playtest looking at the wrong
// thing. Read off the CLOCK rather than off the modal — the run halted
// early if and only if it never reached the year cutoff — so a scenario
// whose stopping point is not a modal at all (`founding` stops at week
// one) is judged by the same rule.
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

// ---------------------------------------------------------------------
// The overrides, applied to the finished state. Each one is cosmetic or
// developer-facing — nothing here changes a number the simulation reads
// back — so a scenario stays a state the game itself produced.
// ---------------------------------------------------------------------
if (flags.name) state.self.name = flags.name;
if (flags.vernacular) state.self.vernacular = flags.vernacular as Vernacular;
if (flags['clear-modal']) {
  // What tools/makeSave.ts used to do unconditionally, now a flag: a
  // loaded save opens whatever modal it was holding, and a modal backdrop
  // swallows the clicks a screenshot driver needs for zoom and pan.
  state.pendingInterrupt = null;
  state.events.pendingDemand = null;
  state.events.activeDemand = null;
}

writeFileSync(outPath, JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), state }));

const placed = Object.keys(state.placements ?? {}).length;
console.log(
  `${outPath}\n` +
  `  ${recipe.name}: ${strategy.name}, seed ${seed}\n` +
  `  year ${state.clock.year} week ${state.clock.week}, prestige ${state.self.reputation.toFixed(0)}, ` +
  `${totalEnrolled(state.students).toLocaleString()} enrolled, $${Math.round(state.finance.cash).toLocaleString()} cash\n` +
  `  ${placed} placed buildings, vernacular ${state.self.vernacular}, ` +
  `modal ${state.pendingInterrupt?.type ?? 'none'}`,
);
