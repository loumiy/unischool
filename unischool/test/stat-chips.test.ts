// ---------------------------------------------------------------------
// The dock's stat chips lead to their explanations (Plan 78C,
// src/data/statChips.ts): rank and prestige open History › Standing,
// satisfaction opens Students › the breakdown, and each lands from the
// first week. The rank chip's sentence says prestige's summer step as
// prestigeSystem.ts sets it.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { tickLadder } from '../src/systems/ladder/ladderSystem';
import { sectionAvailable, tabAvailable } from '../src/components/TabNav';
import { STAT_CHIPS, STAT_CHIP_WORDS, chipDoor } from '../src/data/statChips';
import { FIGURE_HINTS } from '../src/data/figureHints';
import { PRESTIGE_MAX_RISE } from '../src/systems/prestige/prestigeSystem';
import { prestigeFigure } from '../src/format';

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

console.log('stat chip tests');

// --- where each chip leads --------------------------------------------
{
  const expected = {
    rank: { tab: 'history', section: 'history.standing' },
    enrolled: null,
    prestige: { tab: 'history', section: 'history.standing' },
    satisfaction: { tab: 'students', section: 'students.breakdown' },
  } as const;
  assert(STAT_CHIPS.join() === 'rank,enrolled,prestige,satisfaction', 'the dock shows the four chips in order');
  for (const chip of STAT_CHIPS) {
    const door = chipDoor(chip, '1');
    const want = expected[chip];
    if (want === null) {
      assert(door === null, `${chip} is a figure only`);
      continue;
    }
    assert(door?.tab === want.tab, `${chip} opens ${want.tab} (${door?.tab})`);
    assert(door?.section === want.section, `${chip} lands on ${want.section} (${door?.section})`);
  }
  assert(chipDoor('prestige', '51.5')?.name === 'Prestige 51.5 — open History, Standing', `the button is named with its figure (${chipDoor('prestige', '51.5')?.name})`);
  assert(chipDoor('rank', '#55')?.name === 'Rank #55 — open History, Standing', 'rank too');
  assert(chipDoor('satisfaction', '70')?.name === 'Satisfaction 70 — open Students, Satisfaction breakdown', 'and satisfaction');
  for (const chip of STAT_CHIPS) {
    assert(/^[A-Z][a-z]+$/.test(STAT_CHIP_WORDS[chip]), `${chip}'s word is one word (${STAT_CHIP_WORDS[chip]})`);
  }
}

// --- every door lands in week one ----------------------------------------
{
  const s = createInitialState('Chips');
  tickLadder(s);
  for (const chip of STAT_CHIPS) {
    const door = chipDoor(chip, '1');
    if (!door) continue;
    assert(tabAvailable(s, door.tab), `${chip}'s tab is open in week 1`);
    assert(sectionAvailable(s, door.section), `${chip}'s section shows in week 1`);
  }
}

// --- the rank chip says prestige's summer step -----------------------------
{
  const hint = FIGURE_HINTS.rank(100);
  assert(hint.includes('follows prestige'), `the rank's sentence says it follows prestige (${hint})`);
  assert(hint.includes(`at most ${prestigeFigure(PRESTIGE_MAX_RISE)} points`), 'and the most a summer can add, read from prestigeSystem.ts');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
