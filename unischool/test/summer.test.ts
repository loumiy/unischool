// ---------------------------------------------------------------------
// The summer sequence (Plan 16's PR A): one interrupt, four beats, one
// stop a year — see types.ts's SummerPayload, reducer.ts's
// RESOLVE_SUMMER_BEAT and RESOLVE_ADMISSIONS, and defaultAnswers.ts.
//
// What is pinned here is the SHAPE of the year, not any figure in it:
//   - the year has exactly one fixed stop, at week 52, and it opens on the
//     review beat; the U.S. News report no longer takes week 26 of its own
//   - a beat advances without the calendar moving, so a save written
//     between beats resumes on the same beat with the clock still halted
//   - the decision the Admissions beat produces is carried in the payload
//     and is what the last beat commits
//   - only the last beat turns the page — and it is accepted at any beat,
//     so a harness answering the summer in one action gets the same year
//   - the shared defaults walk all four beats and end on the far side
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { loadGame, saveGame, clearSave } from '../src/state/persistence';
import { buildReportPayload } from '../src/systems/rivals/rivalsSystem';
import type { GameState, SummerPayload } from '../src/state/types';
import { SUMMER_BEATS, SUMMER_LAST_BEAT, WEEKS_PER_YEAR } from '../src/state/types';

// In-memory localStorage, so the persistence module works under Node (the
// same shim save-load.test.ts uses).
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
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

const payloadOf = (s: GameState) => s.pendingInterrupt?.payload as SummerPayload;

// Ticks to the first summer, dismissing anything else on the way with the
// shared defaults, and returns the state with the summer pending on its
// opening beat.
function toSummer(start: GameState): { s: GameState; interruptsBefore: string[] } {
  let s = start;
  const interruptsBefore: string[] = [];
  for (let i = 0; i < WEEKS_PER_YEAR * 2; i += 1) {
    if (s.pendingInterrupt?.type === 'summer') return { s, interruptsBefore };
    if (s.pendingInterrupt) {
      interruptsBefore.push(s.pendingInterrupt.type);
      const answer = defaultAnswer(s);
      if (!answer) throw new Error(`no default answer for ${s.pendingInterrupt.type}`);
      s = reducer(s, answer);
      continue;
    }
    s = reducer(s, { type: 'TICK' });
  }
  throw new Error('no summer inside two years');
}

console.log('summer sequence tests');

// --- the year has one fixed stop, and it is the summer -------------------
{
  const { s, interruptsBefore } = toSummer(createInitialState('Summer'));
  assert(s.clock.week === WEEKS_PER_YEAR && s.clock.year === 1, `the summer holds the clock at week ${WEEKS_PER_YEAR} of year 1 (Y${s.clock.year}W${s.clock.week})`);
  assert(payloadOf(s).beat === 0, 'and opens on the first beat, the review');
  assert(SUMMER_BEATS[0] === 'Review' && SUMMER_BEATS[SUMMER_LAST_BEAT] === 'Students', 'the three beats run Review · Admissions · Students (Plan 33 dropped Standing)');
  assert(!interruptsBefore.includes('annual-report'), 'no U.S. News report stopped the clock mid-year');
  assert(!interruptsBefore.includes('admissions'), 'and nothing raises the old admissions interrupt');
}

// --- the report does not take week 26 even once the school is ranked ----
{
  const s0 = createInitialState('Ranked');
  s0.hasEnteredRankings = true;
  s0.self.reputation = 120; // comfortably inside the top 50
  const { interruptsBefore } = toSummer(s0);
  assert(!interruptsBefore.includes('annual-report'), 'a ranked school gets no mid-year report interrupt');
  assert(!interruptsBefore.includes('rankings-entry'), 'and, already on the list, is not told it has entered it');
}

// --- beats advance; the clock does not -----------------------------------
{
  const { s } = toSummer(createInitialState('Beats'));
  const stamp = (x: GameState) => `${x.clock.year}-${x.clock.week}`;

  const b1 = reducer(s, { type: 'RESOLVE_SUMMER_BEAT' });
  assert(payloadOf(b1).beat === 1, 'Review → Admissions');
  assert(stamp(b1) === stamp(s), 'a beat does not move the calendar');
  assert(b1.history.length === 0, 'and files no year');
  assert(payloadOf(b1).decision === undefined, 'no decision is recorded before the Admissions beat is left');

  const b3 = reducer(b1, { type: 'RESOLVE_SUMMER_BEAT', decision: { tuition: 27_500, admitRate: 1.7 } });
  assert(payloadOf(b3).beat === 2, 'Admissions → Students');
  assert(payloadOf(b3).decision?.tuition === 27_500, 'the decision rides in the payload');
  assert(payloadOf(b3).decision?.admitRate === 1, 'and is clamped to what the funnel accepts');
  assert(b3.finance.listedTuition === s.finance.listedTuition, 'without touching the listed price yet');

  const b4 = reducer(b3, { type: 'RESOLVE_SUMMER_BEAT' });
  assert(b4 === b3, 'a beat past the last is a no-op — the last beat is answered by RESOLVE_ADMISSIONS alone');
  assert(reducer(createInitialState('Quiet'), { type: 'RESOLVE_SUMMER_BEAT' }).pendingInterrupt === null, 'and with no summer pending the action does nothing at all');

  // --- a save between beats resumes on the same beat ----------------------
  clearSave();
  assert(saveGame(b3), 'a mid-summer state saves');
  const loaded = loadGame();
  assert(loaded !== null && loaded.pendingInterrupt?.type === 'summer', 'and loads with the summer still pending');
  if (loaded) {
    assert(payloadOf(loaded).beat === 2 && payloadOf(loaded).decision?.tuition === 27_500, 'on the same beat, with the same decision');
    assert(stamp(loaded) === stamp(s), 'and the clock still halted at the summer');
  }
  clearSave();

  // --- the last beat commits the decision and turns the page -------------
  const decision = payloadOf(b3).decision!;
  const after = reducer(b3, { type: 'RESOLVE_ADMISSIONS', ...decision, approvedPetitionIds: [] });
  assert(after.pendingInterrupt === null, 'the summer is over');
  assert(after.clock.year === 2 && after.clock.week === 1, `and the calendar turns to year 2 (Y${after.clock.year}W${after.clock.week})`);
  assert(after.finance.listedTuition === 27_500, 'the committed price is the one set two beats earlier');
  assert(after.history.length === 1 && after.history[0].year === 1, 'one year is on the books');
}

// --- the last beat's action is accepted at any beat -----------------------
{
  const { s } = toSummer(createInitialState('Harness'));
  const after = reducer(s, {
    type: 'RESOLVE_ADMISSIONS', tuition: s.finance.listedTuition, admitRate: s.students.admitRate, approvedPetitionIds: [],
  });
  assert(after.pendingInterrupt === null && after.clock.year === 2, 'a harness may answer the whole summer from its opening beat');
}

// --- the shared defaults walk all three beats -----------------------------
{
  let { s } = toSummer(createInitialState('Defaults'));
  const types: string[] = [];
  for (let i = 0; i < 10 && s.pendingInterrupt?.type === 'summer'; i += 1) {
    const answer = defaultAnswer(s, { tuition: 19_000, admitRate: 0.3 });
    if (!answer) break;
    types.push(answer.type);
    s = reducer(s, answer);
  }
  assert(
    types.join(',') === 'RESOLVE_SUMMER_BEAT,RESOLVE_SUMMER_BEAT,RESOLVE_ADMISSIONS',
    `the defaults take one beat per call and end on the last beat's action (${types.join(', ')})`,
  );
  assert(s.pendingInterrupt === null && s.clock.year === 2, 'and land on the far side of the boundary');
  assert(s.finance.listedTuition === 19_000, 'committing the policy they were handed');
  assert(Math.abs(s.students.admitRate - 0.3) < 1e-9, 'both halves of it');
}

// --- the Standing beat reads last summer's row as "a year ago" -----------
{
  let { s } = toSummer(createInitialState('Standing'));
  s = reducer(s, { type: 'RESOLVE_ADMISSIONS', tuition: s.finance.listedTuition, admitRate: s.students.admitRate, approvedPetitionIds: [] });
  const second = toSummer(s).s;
  const report = buildReportPayload(second);
  assert(report.previousRank === second.history[0].rank, 'at the second summer the report compares against the rank filed at the first');
  assert(report.field === second.rivals.length + 1, 'and knows how big the field is');
  const first = buildReportPayload(toSummer(createInitialState('First')).s);
  assert(first.previousRank === null, 'at the first summer there is no prior year to compare against');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
