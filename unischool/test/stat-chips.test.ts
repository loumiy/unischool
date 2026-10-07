// ---------------------------------------------------------------------
// The dock's stat chips lead to their explanations (Plan 78C,
// src/data/statChips.ts): prestige opens History › Prestige and rank the
// guide's table (Plan 80C), satisfaction opens Students › the breakdown, and
// each lands from the first week. The committee, a chip until Plan 91, is
// lamps on the Curriculum button: test/committee.test.ts's. The rank chip's
// sentence says the rank is by prestige.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { tickLadder } from '../src/systems/ladder/ladderSystem';
import { sectionAvailable, tabAvailable } from '../src/components/TabNav';
import { STAT_CHIPS, STAT_CHIP_WORDS, chipDoor } from '../src/data/statChips';
import { FIGURE_HINTS } from '../src/data/figureHints';
import { rankingsRows } from '../src/components/RankingsTable';

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
    rank: { tab: 'history', section: 'history.rankings' },
    enrolled: null,
    prestige: { tab: 'history', section: 'history.prestige' },
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
  assert(chipDoor('prestige', '51.5')?.name === 'Prestige 51.5 — open History, Prestige', `the button is named with its figure (${chipDoor('prestige', '51.5')?.name})`);
  assert(chipDoor('rank', '#55')?.name === 'Rank #55 — open History, The guide', 'rank too');
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

// --- the guide's table: the fifty, then the college and its neighbors -----
{
  const entry = (i: number, isPlayer = false) => ({ key: isPlayer ? 'self' : `r${i}`, name: `College ${i}`, mascot: 'Owls', value: 200 - i, isPlayer });
  const list = (mine: number) => Array.from({ length: 80 }, (_, i) => entry(i, i === mine));
  const high = rankingsRows(list(11), 50);
  assert(high.length === 50 && !high.includes('gap'), 'a college in the fifty is one of the fifty rows');
  const low = rankingsRows(list(63), 50);
  const places = low.map((r) => (r === 'gap' ? 'gap' : r.place));
  assert(places.slice(50).join() === 'gap,63,64,65', `a college at #64 follows a gap, with its neighbors (${places.slice(50).join()})`);
  assert(low.some((r) => r !== 'gap' && r.isPlayer && r.place === 64), 'its own row marked');
  const next = rankingsRows(list(50), 50);
  assert(next.slice(50).map((r) => (r === 'gap' ? 'gap' : r.place)).join() === '51,52', 'no gap when it sits just below the fifty');
}

// --- the committee chip's sentence says what the flag means ---------------
{
  assert(FIGURE_HINTS.committee(4, 4, false).endsWith('the next starts when one of them is done.'), 'full: the next waits');
  assert(FIGURE_HINTS.committee(3, 4, true).includes('a course is ready to start'), 'flagged: a course is ready');
  assert(FIGURE_HINTS.committee(3, 4, false).includes('no course can start yet'), 'room, nothing ready');
  assert(FIGURE_HINTS.committee(3, 4, true).includes('of the 4 it can write at once'), 'and it names the most at once');
}

// --- the rank chip says the rank is by prestige ----------------------------
{
  const hint = FIGURE_HINTS.rank(100);
  assert(hint.includes('by prestige'), `the rank's sentence says it follows prestige (${hint})`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
