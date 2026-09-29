// ---------------------------------------------------------------------
// The applicant lift (Plan 79C, the October review's G7-7). A grand
// landmark and the milestones draw applicants once. They wait in
// students.applicantLift, and the next summer's funnel adds them to the
// pool and clears the lift, so:
//
//   1. a landmark finished during the year is in that summer's pool, as
//      the Admissions beat previews it and as the reducer commits it, and
//      the reveal names it;
//   2. it is in that summer's pool only: the next summer's has none, and
//      its reveal says the lift ended;
//   3. a milestone's bonus waits in the lift too, not in the pool;
//   4. a save written at version 80 loads with no lift waiting.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { bindScriptStream } from '../src/engine/random';
import { projectAdmissions, trailingYearSatisfaction } from '../src/systems/admissions/admissionsSystem';
import { deriveCohortSignals } from '../src/systems/admissions/cohorts';
import { poolChange } from '../src/systems/admissions/yearOverYear';
import { intakeCeiling } from '../src/systems/techtree/instructionCapacity';
import { tickTech } from '../src/systems/techtree/techSystem';
import { programs } from '../src/data/techData';
import { FOUNDING_PROGRAMS } from '../src/data/foundingData';
import { readSave, SAVE_VERSION } from '../src/state/persistence';
import { WEEKS_PER_YEAR } from '../src/state/types';
import type { GameState } from '../src/state/types';

bindScriptStream(7979);
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

console.log('applicant lift tests');

const LANDMARK = 'LANDMARK-DOME';
const LANDMARK_APPLICANTS = 1_500;

function toSummer(start: GameState): GameState {
  let s = start;
  for (let i = 0; i < WEEKS_PER_YEAR * 2; i += 1) {
    if (s.pendingInterrupt?.type === 'summer') return s;
    const answer = defaultAnswer(s);
    s = answer ? reducer(s, answer) : reducer(s, { type: 'TICK' });
  }
  throw new Error('no summer inside two years');
}

// The Admissions beat's preview (InterruptModal.tsx), at last year's price
// and rate.
function preview(s: GameState) {
  return projectAdmissions(
    s.self.reputation, s.finance.listedTuition, s.students.capacity, trailingYearSatisfaction(s),
    deriveCohortSignals(s), s.students.admitRate, intakeCeiling(s).seatsLeft,
  );
}

function resolve(s: GameState): GameState {
  return reducer(s, { type: 'RESOLVE_ADMISSIONS', tuition: s.finance.listedTuition, admitRate: s.students.admitRate, approvedPetitionIds: [] });
}

// ---- 1 and 2. A landmark's lift, one summer only ----
{
  const s = createInitialState('Lift');
  assert(s.students.applicantLift === 0, 'a new college has no lift waiting');
  const dome = s.tech.find((t) => t.id === LANDMARK)!;
  assert(dome.effects?.applicantPoolBonus === LANDMARK_APPLICANTS, `the Great Dome draws ${LANDMARK_APPLICANTS} once`);
  // Finished in the first week of Year 1.
  dome.status = 'developing';
  s.developing[LANDMARK] = 1;
  const pool = s.students.applicantPool;
  tickTech(s);
  assert(s.tech.find((t) => t.id === LANDMARK)?.status === 'done', 'the dome is finished');
  assert(s.students.applicantLift === LANDMARK_APPLICANTS, `its applicants wait in the lift (${s.students.applicantLift})`);
  assert(s.students.applicantPool === pool, 'and not in the pool, which the summer overwrites');

  const atSummer = toSummer(s);
  assert(atSummer.students.applicantLift >= LANDMARK_APPLICANTS, `the lift waits for the summer (${atSummer.students.applicantLift})`);
  const shown = preview(atSummer);
  const without = projectAdmissions(
    atSummer.self.reputation, atSummer.finance.listedTuition, atSummer.students.capacity, trailingYearSatisfaction(atSummer),
    { ...deriveCohortSignals(atSummer), applicantLift: 0 }, atSummer.students.admitRate, intakeCeiling(atSummer).seatsLeft,
  );
  assert(shown.lift === atSummer.students.applicantLift, `the Admissions beat names the lift (${shown.lift})`);
  assert(Math.abs(shown.applicants - without.applicants - atSummer.students.applicantLift) <= 1,
    `the pool it shows is the lift more than without (${shown.applicants} against ${without.applicants})`);
  assert(shown.factors.lift !== undefined && shown.factors.lift > 1, 'and the lift is one of the pool\'s factors');

  const after = resolve(atSummer);
  assert(after.students.applicantPool === shown.applicants, `the summer draws the pool the beat showed (${after.students.applicantPool} against ${shown.applicants})`);
  assert(after.students.applicantLift === 0, 'and clears the lift');
  assert(after.students.lastFunnel?.factors.lift === shown.factors.lift, 'the record keeps the lift\'s factor');

  const next = toSummer(after);
  assert(next.students.applicantLift === 0, `nothing lifts the second summer (${next.students.applicantLift})`);
  const nextShown = preview(next);
  assert(nextShown.lift === 0 && nextShown.factors.lift === 1, 'so its pool has no lift');
  const change = poolChange(nextShown, next.students.lastFunnel);
  const ended = change?.parts.find((p) => p.key === 'lift');
  assert(ended !== undefined && ended.change < 0 && ended.label === "last year's lift ended",
    `and the reveal says last year's lift ended (${JSON.stringify(ended)})`);
}

// ---- 3. A milestone's bonus waits in the lift ----
{
  const s = createInitialState('Milestone');
  // A program with its whole tier-2 quartet done is established.
  const program = programs().find((p) => p.kind !== 'graduate' && !FOUNDING_PROGRAMS.includes(p.id) && p.courseIds.length >= 5)!;
  for (const id of program.courseIds.slice(0, 5)) s.tech.find((t) => t.id === id)!.status = 'done';
  // A finish is what runs the milestone pass: here, the quad.
  const quad = s.tech.find((t) => t.id === 'QUAD-T1')!;
  quad.status = 'developing';
  s.developing[quad.id] = 1;
  const pool = s.students.applicantPool;
  tickTech(s);
  assert(Object.keys(s.milestones).some((k) => k.startsWith('program-established:')), `a program is established (${Object.keys(s.milestones).join(', ')})`);
  assert(s.students.applicantLift > 0, `its bonus waits in the lift (${s.students.applicantLift})`);
  assert(s.students.applicantPool === pool, 'not in the pool');
}

// ---- 4. A version-80 save loads with no lift waiting ----
{
  const raw = readFileSync(join(process.cwd(), 'test/fixtures/save-v80.json'), 'utf8');
  const parsed = JSON.parse(raw) as { version: number; state: { students: Record<string, unknown> } };
  assert(parsed.version === 80 && !('applicantLift' in parsed.state.students), 'the fixture was written at version 80, before the lift');
  const read = readSave(raw);
  assert(!('refused' in read), 'it loads');
  if (!('refused' in read)) {
    assert(read.state.students.applicantLift === 0, 'with no lift waiting');
    assert(SAVE_VERSION >= 81, `at version 81 or later (${SAVE_VERSION})`);
  }
  // A hand-edited save's lift is a count, never negative.
  const edited = JSON.parse(raw) as { version: number; state: { students: Record<string, unknown> } };
  edited.version = SAVE_VERSION;
  edited.state.students.applicantLift = -40;
  const back = readSave(JSON.stringify(edited));
  assert(!('refused' in back) && back.state.students.applicantLift === 0, 'a negative lift reads as none');
}

console.log(`applicant lift: ${checks} checks, ${failures} failures`);
if (failures > 0) process.exit(1);
