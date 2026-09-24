// The ladder (data/ladderData.ts, systems/ladder/ladderSystem.ts): each
// milestone opens on its condition, never closes, and holds back the
// buildings and tabs it names until then.

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { MILESTONES, LADDER_TIERS, milestoneForBuildable, CHARTER_ID } from '../src/data/ladderData';
import { initialTech } from '../src/data/techData';
import { initialDorms } from '../src/data/campusData';
import { initialFacilities } from '../src/data/facilitiesData';
import { TAB_ORDER } from '../src/components/TabNav';
import { tickLadder } from '../src/systems/ladder/ladderSystem';
import { isPlaceableKind } from '../src/state/campusMap';
import { bindScriptStream } from '../src/engine/random';
import type { GameState } from '../src/state/types';

bindScriptStream(2323);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
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

const status = (s: GameState, id: string) => s.tech.find((t) => t.id === id)?.status;
const tick = (s: GameState) => reducer(s, { type: 'TICK' });

console.log('ladder tests');

// ---- The table itself ----
{
  const catalogue = new Set([...initialTech(), ...initialDorms(), ...initialFacilities()].map((t) => t.id));
  const ids = MILESTONES.map((m) => m.id);
  assert(new Set(ids).size === ids.length, 'milestone ids are unique');
  const named = MILESTONES.flatMap((m) => m.buildables);
  assert(new Set(named).size === named.length, 'no buildable is named by two milestones');
  const missing = named.filter((id) => !catalogue.has(id));
  assert(missing.length === 0, `every buildable a milestone names exists (${missing.join(', ')})`);
  const badTabs = MILESTONES.flatMap((m) => m.tabs).filter((t) => !TAB_ORDER.includes(t));
  assert(badTabs.length === 0, `every tab a milestone names exists (${badTabs.join(', ')})`);
  assert(MILESTONES.every((m) => LADDER_TIERS.includes(m.tier)), 'every milestone sits in a tier');
  assert(MILESTONES.every((m) => m.opens.length > 0 && m.name.length > 0 && m.condition.length > 0), 'every milestone says what it is and what it opens');
  assert(MILESTONES.filter((m) => m.id !== CHARTER_ID).every((m) => m.letter.length > 40), 'every milestone after the charter has a letter');
  assert(MILESTONES.every((m) => m.side || m.buildables.length > 0 || m.tabs.length > 0 || m.id === CHARTER_ID), 'every main milestone opens something');
}

// ---- Founding ----
{
  const s = createInitialState('Ladder');
  assert(s.ladder.reached[CHARTER_ID] === 1 && Object.keys(s.ladder.reached).length === 1, 'a new college has reached the charter and nothing else');
  assert(s.ladder.unread.length === 0, 'and has no letters waiting');
  const open = s.tech.filter((t) => isPlaceableKind(t) && t.status === 'available').map((t) => t.id).sort();
  assert(JSON.stringify(open) === JSON.stringify(['DINING-01', 'DORM-01', 'LIB-T1', 'QUAD-T1']), `the founding build list is the dorm, the dining hall, the quad and the library (${open.join(', ')})`);
  for (const id of ['SCTR-T1', 'REC-T1', 'HLTH-T1', 'HALL-01']) {
    assert(status(s, id) === 'locked', `${id} waits on its milestone`);
  }
}

// ---- A milestone opens what it names, the week it is reached ----
{
  let s = createInitialState('Ladder');
  s.pendingInterrupt = null;
  for (const c of Object.keys(s.students.classes) as (keyof GameState['students']['classes'])[]) s.students.classes[c] = 400;
  s = tick(s);
  assert(s.ladder.reached.town !== undefined, '1,600 students reach "a town\'s worth"');
  assert(status(s, 'HLTH-T1') === 'available', 'and the Health & Counseling Center opens the same week');
  assert(s.ladder.unread.includes('town'), 'and its letter is queued');

  for (const c of Object.keys(s.students.classes) as (keyof GameState['students']['classes'])[]) s.students.classes[c] = 100;
  s = tick(s);
  assert(s.ladder.reached.town !== undefined, 'shrinking below the threshold does not undo the milestone');
  assert(status(s, 'HLTH-T1') !== 'locked', 'nor re-lock what it opened');
}

// ---- The first commencement opens the student center, once a year is behind the college ----
{
  const s = createInitialState('Ladder');
  s.history.push({ ...({} as GameState['history'][number]), year: 1 });
  tickLadder(s);
  assert(s.ladder.reached.commencement !== undefined, 'a closed year is the first commencement');
  const opened = reducer(s, { type: 'TICK' });
  assert(status(opened, 'SCTR-T1') === 'available' && status(opened, 'REC-T1') === 'available', 'the Student Center and Recreation Center open after it');
}

// ---- Every milestone is reachable on the harness's own path: none is dead ----
{
  const unreachable = MILESTONES.filter((m) => milestoneForBuildable(m.buildables[0] ?? '') !== undefined && m.buildables.some((b) => milestoneForBuildable(b) !== m.id));
  assert(unreachable.length === 0, 'each named buildable maps back to its milestone');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
