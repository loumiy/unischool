// ---------------------------------------------------------------------
// THE ENROLLED COHORT SPLIT (see state/types.ts's ClassCohorts and Plan
// 06's PR A). A class's cohort composition is recorded when it is ADMITTED
// and carried to graduation — never recomputed, because a cohort's pull is
// a pure function of the CURRENT GameState and recomputing would describe
// today's campus rather than the one that admitted the class.
//
// The last section below is the one that justifies the whole feature being
// stored state rather than a derivation. If it ever fails, the split has
// started being recomputed somewhere and the Enrollment tab has quietly
// begun rewriting history.
//
// These checks drive the real reducer rather than a pure function, for the
// same reason class-pricing.test.ts does: the invariant is about WHEN a
// fact is written, and that lives in RESOLVE_ADMISSIONS's advance.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { findDecisionEvent, type DecisionEventContext } from '../src/data/eventData';
import { COHORTS, baseShareCohortCounts } from '../src/systems/admissions/cohorts';
import { loadGame, SAVE_KEY } from '../src/state/persistence';
import type { ClassCohorts, CohortCounts, GameState } from '../src/state/types';
import { totalEnrolled, WEEKS_PER_YEAR } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

// In-memory localStorage so the persistence module works under Node, the
// same shim save-migrations.test.ts uses and for the same reason: section 4
// below runs the REAL loadGame path rather than calling a migration directly.
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
};

const CLASS_KEYS = ['freshman', 'sophomore', 'junior', 'senior'] as const;

function sum(c: CohortCounts): number {
  return COHORTS.reduce((t, k) => t + c[k.id], 0);
}

// Same dismissal set and same choices as class-pricing.test.ts's own, so a
// year played here is a year played there.
function dismiss(s: GameState, type: string): GameState {
  if (type === 'milestone') return reducer(s, { type: 'RESOLVE_MILESTONE' });
  if (type === 'research-complete') return reducer(s, { type: 'RESOLVE_RESEARCH_REPORT' });
  if (type === 'demand') return reducer(s, { type: 'RESOLVE_DEMAND' });
  if (type === 'charter') return reducer(s, { type: 'RESOLVE_CHARTER', accept: false });
  if (type === 'decision-event') {
    const payload = s.pendingInterrupt!.payload as { eventId: string; ctx: DecisionEventContext };
    const event = findDecisionEvent(payload.eventId);
    const choice = event?.choices.find((c) => c.cost(s, payload.ctx) <= s.finance.cash);
    return reducer(s, {
      type: 'RESOLVE_DECISION_EVENT', eventId: payload.eventId, choiceId: choice?.id ?? '', ctx: payload.ctx,
    });
  }
  return reducer(s, { type: 'RESOLVE_REPORT' });
}

function playYearAt(start: GameState, tuition: number): GameState {
  let s = start;
  for (let i = 0; i < WEEKS_PER_YEAR * 2; i += 1) {
    const pending = s.pendingInterrupt;
    if (pending?.type === 'admissions') {
      return reducer(s, {
        type: 'RESOLVE_ADMISSIONS', tuition, admitRate: s.students.admitRate, approvedPetitionIds: [],
      });
    }
    if (pending) { s = dismiss(s, pending.type); continue; }
    s = reducer(s, { type: 'TICK' });
  }
  throw new Error('no admissions interrupt inside two years');
}

// =====================================================================
// 1. THE SEVEN ALWAYS SUM TO THE CLASS THEY DESCRIBE — the invariant the
// whole display rests on. A stacked bar whose segments miss their own
// total is a visible arithmetic error, so this is checked at founding and
// again after enough years that every founding class has graduated out.
// =====================================================================
function checkSums(s: GameState, when: string): void {
  for (const k of CLASS_KEYS) {
    assert(sum(s.students.cohortsByClass[k]) === s.students.classes[k],
      `${when}: ${k} split sums to its head count (${sum(s.students.cohortsByClass[k])} vs ${s.students.classes[k]})`);
  }
}
{
  let s = createInitialState('Summer');
  checkSums(s, 'at founding');
  for (let y = 0; y < 5; y += 1) s = playYearAt(s, 18_000);
  checkSums(s, 'after five years');

  assert(totalEnrolled(s.students) === CLASS_KEYS.reduce((t, k) => t + sum(s.students.cohortsByClass[k]), 0),
    'the whole body is the sum of all twenty-eight counts');
}

// =====================================================================
// 2. A SPLIT ADVANCES WITH ITS CLASS, AND THE SENIORS' LEAVES WITH THEM.
// The mix moves in the same statements as the head count it describes
// (admissionsSystem.ts's advanceClasses), so last year's freshman split is
// this year's sophomore split, exactly.
// =====================================================================
{
  let s = createInitialState('Advancer');
  s = playYearAt(s, 17_000); // one year first, so the founding prior is not the thing being tested
  const before: ClassCohorts = s.students.cohortsByClass;
  const departing = before.senior;

  s = playYearAt(s, 17_000);
  const after = s.students.cohortsByClass;

  for (const c of COHORTS) {
    assert(after.sophomore[c.id] === before.freshman[c.id],
      `${c.label}: last year's freshmen are this year's sophomores (${after.sophomore[c.id]} vs ${before.freshman[c.id]})`);
    assert(after.junior[c.id] === before.sophomore[c.id],
      `${c.label}: sophomores advance to junior`);
    assert(after.senior[c.id] === before.junior[c.id],
      `${c.label}: juniors advance to senior`);
  }
  assert(JSON.stringify(Object.values(after)).indexOf(JSON.stringify(departing)) === -1 || sum(departing) === 0,
    'the graduating seniors’ split is not carried forward anywhere');
}

// =====================================================================
// 3. THE FOUNDING BODY IS THE NEUTRAL PRIOR. Not one of the four opening
// classes was admitted by the player, so all four read base shares rather
// than a mix implying choices nobody made.
// =====================================================================
{
  const s = createInitialState('Founder');
  for (const k of CLASS_KEYS) {
    const expected = baseShareCohortCounts(s.students.classes[k]);
    for (const c of COHORTS) {
      assert(s.students.cohortsByClass[k][c.id] === expected[c.id],
        `founding ${k}: ${c.label} opens on the base share (${s.students.cohortsByClass[k][c.id]} vs ${expected[c.id]})`);
    }
  }
}

// =====================================================================
// 4. A v39 SAVE MIGRATES TO THE SAME PRIOR, and is self-correcting: play
// four years on a migrated run and every class is a real recorded split.
// =====================================================================
{
  // A v39 save is a current-shape state with cohortsByClass simply absent —
  // the field did not exist to be written. Seeded at v39 and run through the
  // real loadGame path, sanitizers and all.
  const founded = createInitialState('Legacy');
  const legacy = JSON.parse(JSON.stringify(founded)) as Record<string, unknown>;
  delete (legacy.students as Record<string, unknown>).cohortsByClass;
  // The version is a LITERAL, not SAVE_VERSION - 1. This fixture describes
  // the v39 shape specifically, and pinning it to "one before current"
  // silently re-labels it every time the version moves — which is how it
  // briefly claimed to be a v40 save that had no cohortsByClass at all, a
  // shape no v40 save could ever have had.
  store.set(SAVE_KEY, JSON.stringify({ version: 39, savedAt: Date.now(), state: legacy }));

  const migrated = loadGame();
  assert(migrated !== null, 'a v39 save migrates forward through every later version rather than being discarded');
  if (migrated) {
    checkSums(migrated, 'after migration');
    for (const k of CLASS_KEYS) {
      const expected = baseShareCohortCounts(migrated.students.classes[k]);
      assert(COHORTS.every((c) => migrated.students.cohortsByClass[k][c.id] === expected[c.id]),
        `migrated ${k} reads the neutral prior, not a reconstruction`);
    }

    // Self-correcting on the same four-year clock the founding body runs on.
    let played = migrated;
    for (let y = 0; y < 4; y += 1) played = playYearAt(played, 19_000);
    checkSums(played, 'four years after migration');
  }
}

// =====================================================================
// 5. THE RETROACTIVITY GUARD — the reason any of this is stored.
//
// Build a great deal between one admissions boundary and the next, so the
// school's cohort PULL moves a long way. The class admitted before that
// build must read exactly as it did, unchanged: a school that opens an
// arts centre does not retroactively fill last year's seniors with arts
// students. If this fails, something has started deriving the split.
// =====================================================================
{
  let s = createInitialState('Builder');
  s = playYearAt(s, 16_000);
  const admittedBefore = { ...s.students.cohortsByClass.freshman };
  const beforeSignalsCount = s.tech.filter((t) => t.status === 'done').length;

  // Finish every course and facility the school could possibly have: the
  // biggest swing in cohort pull available, applied entirely AFTER the
  // class above was admitted.
  s = { ...s, tech: s.tech.map((t) => ({ ...t, status: 'done' as const })) };
  const afterSignalsCount = s.tech.filter((t) => t.status === 'done').length;
  assert(afterSignalsCount > beforeSignalsCount,
    `the campus really did change underneath the class (${beforeSignalsCount} -> ${afterSignalsCount} done)`);

  s = playYearAt(s, 16_000); // that class is now sophomores
  for (const c of COHORTS) {
    assert(s.students.cohortsByClass.sophomore[c.id] === admittedBefore[c.id],
      `${c.label}: the class keeps the split it was admitted under (${s.students.cohortsByClass.sophomore[c.id]} vs ${admittedBefore[c.id]})`);
  }
}

// =====================================================================
// 6. A v40 SAVE GAINS THE GRADUATE COHORT AT ZERO. The eighth cohort
// arrived after cohortsByClass shipped, so a v40 split has seven keys
// where every reader now expects eight — and a missing key here is not a
// harmless absence: counts[id] reads undefined, every sum goes NaN, and
// the bars stop rendering entirely.
// =====================================================================
{
  const founded = createInitialState('Postgrad');
  const legacy = JSON.parse(JSON.stringify(founded)) as Record<string, unknown>;
  const byClass = (legacy.students as Record<string, Record<string, Record<string, number>>>).cohortsByClass;
  for (const k of CLASS_KEYS) delete byClass[k].gradBound; // what a v40 save actually holds
  store.set(SAVE_KEY, JSON.stringify({ version: 40, savedAt: Date.now(), state: legacy }));

  const migrated = loadGame();
  assert(migrated !== null, 'a v40 save migrates rather than being discarded');
  if (migrated) {
    for (const k of CLASS_KEYS) {
      assert(migrated.students.cohortsByClass[k].gradBound === 0,
        `migrated ${k} gains a graduate count of exactly 0`);
    }
    // The sums must survive the migration: nobody is redistributed to make
    // room for the new cohort, so each class still sums to its head count.
    checkSums(migrated, 'after the v40 -> v41 migration');
  }
}

console.log('enrolled cohort tests');
if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
