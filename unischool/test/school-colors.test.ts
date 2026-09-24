// ---------------------------------------------------------------------
// The school's colours (Plan 18's PR B — see data/schoolColors.ts). Three
// things are pinned here: every offered pair passes the contrast rule the
// register is drawn against, the pick reaches the founded university and
// every rival is dealt a pair from the same table, and the pair is
// presentation — a founding in a different pair is the same school.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import {
  SCHOOL_COLOR_PAIRS, FOUNDING_COLORS, MIN_CONTRAST, TEXT_ON_PRIMARY,
  contrastRatio, pairIsReadable, rivalColorsFor, schoolColorsOf, colorPairName,
} from '../src/data/schoolColors';
import { createInitialState, createPreStartState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { bindScriptStream } from '../src/engine/random';

bindScriptStream(4242);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
};

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('school colour tests');

// ---- The table ----
assert(SCHOOL_COLOR_PAIRS.length >= 8 && SCHOOL_COLOR_PAIRS.length <= 12, 'eight to twelve pairs are offered');
assert(new Set(SCHOOL_COLOR_PAIRS.map((p) => p.id)).size === SCHOOL_COLOR_PAIRS.length, 'every pair has its own id');
assert(new Set(SCHOOL_COLOR_PAIRS.map((p) => p.name)).size === SCHOOL_COLOR_PAIRS.length, 'every pair has its own name');
for (const pair of SCHOOL_COLOR_PAIRS) {
  assert(/^#[0-9a-f]{6}$/.test(pair.primary) && /^#[0-9a-f]{6}$/.test(pair.secondary), `${pair.name}: both colours are six-digit lowercase hex`);
  assert(
    contrastRatio(TEXT_ON_PRIMARY, pair.primary) >= MIN_CONTRAST,
    `${pair.name}: cream on the primary reads at ${MIN_CONTRAST}:1 or better (${contrastRatio(TEXT_ON_PRIMARY, pair.primary).toFixed(2)})`,
  );
  assert(
    contrastRatio(pair.primary, pair.secondary) >= MIN_CONTRAST,
    `${pair.name}: the primary on the secondary reads at ${MIN_CONTRAST}:1 or better (${contrastRatio(pair.primary, pair.secondary).toFixed(2)})`,
  );
  assert(pairIsReadable(pair), `${pair.name}: pairIsReadable agrees`);
  assert(pair.secondary.toLowerCase() !== TEXT_ON_PRIMARY, `${pair.name}: the secondary is not the cream the ground is`);
}
assert(!pairIsReadable({ primary: '#b8511f', secondary: '#f1e3c3' }), 'a pair that fails the rule is reported as unreadable');
assert(SCHOOL_COLOR_PAIRS[0] === FOUNDING_COLORS, 'the founding default is the first pair');
assert(contrastRatio('#000000', '#ffffff') > 20.9 && contrastRatio('#000000', '#ffffff') < 21.1, 'black on white is 21:1');
assert(Math.abs(contrastRatio('#7b1e2b', '#f2c14e') - contrastRatio('#f2c14e', '#7b1e2b')) < 1e-9, 'the ratio is symmetric');

// ---- Founding carries the pick ----
const pre = createPreStartState();
assert(pre.self.colors.primary === FOUNDING_COLORS.primary, 'the pre-start state wears the default pair');
const picked = SCHOOL_COLOR_PAIRS[4];
const founded = reducer(pre, { type: 'START_GAME', name: 'Colours', vernacular: 'gothic', colors: schoolColorsOf(picked) });
assert(founded.started, 'the school is founded');
assert(founded.self.colors.primary === picked.primary && founded.self.colors.secondary === picked.secondary, 'START_GAME writes the picked pair');
assert(colorPairName(founded.self.colors) === picked.name, 'and the pair can be named back from the two colours');
assert(founded.self.vernacular === 'gothic', 'the vernacular still comes through beside it');
const defaulted = createInitialState('Default');
assert(defaulted.self.colors.primary === FOUNDING_COLORS.primary && defaulted.self.colors.secondary === FOUNDING_COLORS.secondary, 'createInitialState defaults to the founding pair');
assert(colorPairName({ primary: '#000000', secondary: '#000000' }) === null, 'a pair not in the table has no name');

// ---- Rivals are dealt a pair ----
assert(founded.rivals.length > 0, 'there are rivals');
for (const r of founded.rivals) {
  assert(colorPairName(r.colors) !== null, `${r.name} wears a pair from the table`);
  const again = rivalColorsFor(r.id);
  assert(again.primary === r.colors.primary && again.secondary === r.colors.secondary, `${r.name}'s pair is stable off its id`);
}
const worn = new Set(founded.rivals.map((r) => colorPairName(r.colors)));
assert(worn.size >= SCHOOL_COLOR_PAIRS.length - 2, `the field wears most of the table (${worn.size} of ${SCHOOL_COLOR_PAIRS.length})`);

// ---- Presentation only ----
// Two foundings that differ only in their pair are the same school in
// every number: the pair is read by the stylesheet and nothing else.
const a = reducer(createPreStartState(), { type: 'START_GAME', name: 'Same', vernacular: 'georgian', colors: schoolColorsOf(SCHOOL_COLOR_PAIRS[0]), seed: 4242 });
const b = reducer(createPreStartState(), { type: 'START_GAME', name: 'Same', vernacular: 'georgian', colors: schoolColorsOf(SCHOOL_COLOR_PAIRS[7]), seed: 4242 });
// Every id comes from the seeded stream, so the two compare whole.
const strip = (s: typeof a) => JSON.stringify({ ...s, self: { ...s.self, colors: null } });
assert(strip(a) === strip(b), 'a founding in a different pair is the same school in every other field');

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
