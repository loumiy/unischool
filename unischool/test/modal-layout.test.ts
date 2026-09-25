// ---------------------------------------------------------------------
// Which width an interrupt gets (src/components/modalLayout.ts — Plan 16's
// PR E), and the report table's last-year column (rivalsSystem.ts's
// StandingRow).
//
// The rule is a pure function of the interrupt so it can be pinned without
// a DOM: the summer changes width between beats (the Standing beat is a
// page, the rest are wide), a single milestone is narrow while a burst is
// wide, and anything the rule does not name — including a type it has
// never heard of — falls to narrow, the width every interrupt used to get.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { modalWidth } from '../src/components/modalLayout';
import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { buildReportPayload } from '../src/systems/rivals/rivalsSystem';
import type { GameState, SummerBeat } from '../src/state/types';
import { WEEKS_PER_YEAR } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

function toSummer(start: GameState): GameState {
  let s = start;
  for (let i = 0; i < WEEKS_PER_YEAR * 2; i += 1) {
    if (s.pendingInterrupt?.type === 'summer') return s;
    const answer = defaultAnswer(s);
    s = answer ? reducer(s, answer) : reducer(s, { type: 'TICK' });
  }
  throw new Error('no summer inside two years');
}

console.log('modal layout tests');

// --- the summer: wide throughout (Plan 33 dropped the Standing page) ------
{
  const widths = ([0, 1, 2] as SummerBeat[]).map((beat) => modalWidth({ type: 'summer', payload: { beat, tuition: 0, admitRate: 0 } }));
  assert(widths.join(',') === 'wide,wide,wide', `Review · Admissions · Students read wide · wide · wide (${widths.join(', ')})`);
  assert(modalWidth({ type: 'summer' }) === 'wide', 'a summer with no payload reads as its opening beat');
}

// --- the tables are pages; the decisions with panels are wide -------------
{
  assert(modalWidth({ type: 'rankings-entry' }) === 'page', 'the first rankings entry is a page');
  assert(modalWidth({ type: 'annual-report' }) === 'page', 'so is a playtest-forced report');
  assert(modalWidth({ type: 'athletic-director' }) === 'wide', 'three candidate cards are wide');
  assert(modalWidth({ type: 'championship' }) === 'wide', 'a bracket is wide');
}

// --- a milestone is narrow alone and wide in a burst ------------------------
{
  const entry = (key: string) => ({ key, headline: key, detail: '', unlocks: [] });
  assert(modalWidth({ type: 'milestone', payload: { keys: ['a'], entries: [entry('a')] } }) === 'narrow', 'one milestone is a paragraph');
  assert(modalWidth({ type: 'milestone', payload: { keys: ['a', 'b'], entries: [entry('a'), entry('b')] } }) === 'wide', 'two or more are cards');
}

// --- everything else, and anything unknown, is narrow ----------------------
{
  for (const type of ['decision-event', 'charter', 'research-complete', 'letter', 'something-nobody-wrote']) {
    assert(modalWidth({ type }) === 'narrow', `${type} is narrow`);
  }
}

// --- the report table carries last year's place --------------------------
{
  let s = toSummer(createInitialState('Table'));
  const first = buildReportPayload(s);
  assert(first.standings.length > 0 && first.standings.every((r) => r.previousRank === null), 'at the first summer no row has a prior place');
  s = reducer(s, { type: 'RESOLVE_ADMISSIONS', tuition: s.finance.listedTuition, admitRate: s.students.admitRate, approvedPetitionIds: [] });
  s.self.reputation = 120; // put the school on the published table
  const second = buildReportPayload(toSummer(s));
  const me = second.standings.find((r) => r.isPlayer);
  assert(me !== undefined, 'a school at prestige 120 is on the top-50 table');
  assert(me?.previousRank === s.history[0].rank, `the player's prior place is the rank filed last summer (${me?.previousRank} vs ${s.history[0].rank})`);
  assert(second.standings.filter((r) => !r.isPlayer).every((r) => typeof r.previousRank === 'number'), 'every rival on the table has a reconstructed prior place');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
