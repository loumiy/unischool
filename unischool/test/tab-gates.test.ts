// ---------------------------------------------------------------------
// When a tab is worth offering (src/components/TabNav.tsx's tabAvailable).
//
// Five tabs open from milestones on the ladder (data/ladderData.ts):
// Enrollment, Student Life and History at the first commencement, Research
// with the first finished lab, Athletics with the first sport club.
// The risk this pins down is not that a gate is wrong on day one — it is
// that a gate silently stops being reachable. A predicate that returns
// false forever hides a whole system behind a screen nobody can open, and
// nothing in the game would throw; the player would simply never see the
// Research tab again.
//
// So each gate is checked BOTH ways, against a real founding state: closed
// on a fresh university, and open once its milestone's condition holds and
// the ladder ticks. A milestone is never undone, so an open tab stays
// open. Ungated tabs are checked too — they must be available from the
// first week, since there is no other way into them.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { GATED_TABS, TAB_ORDER, tabAvailable, type TabId } from '../src/components/TabNav';
import type { GameState, VarsityTeam } from '../src/state/types';
import { bindScriptStream } from '../src/engine/random';
import { tickLadder } from '../src/systems/ladder/ladderSystem';

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

function fresh(): GameState {
  return createInitialState('Ashcombe');
}

console.log('tab gate tests');

// --- a brand-new university ------------------------------------------
{
  const s = fresh();

  assert(GATED_TABS.length === 5, 'exactly five tabs are gated');
  for (const id of GATED_TABS) {
    assert(!tabAvailable(s, id), `${id} is not offered at founding`);
  }
  for (const id of TAB_ORDER) {
    if (GATED_TABS.includes(id)) continue;
    assert(tabAvailable(s, id), `${id} is offered from the first week (nothing else opens it)`);
  }
  tickLadder(s);
  assert(GATED_TABS.every((id) => !tabAvailable(s, id)), 'and the first tick opens none of them');
}

// --- research: a finished lab, and nothing less -----------------------
{
  const s = fresh();
  const lab = s.tech.find((t) => t.kind === 'facility' && t.facilityType === 'lab');
  assert(!!lab, 'the seeded catalogue has a lab facility to gate on');

  lab!.status = 'available';
  tickLadder(s);
  assert(!tabAvailable(s, 'research'), 'a lab that can be built does not open Research');
  lab!.status = 'developing';
  tickLadder(s);
  assert(!tabAvailable(s, 'research'), 'nor does one under construction');
  lab!.status = 'done';
  tickLadder(s);
  assert(tabAvailable(s, 'research'), 'a FINISHED lab opens Research');

  const other = fresh();
  for (const t of other.tech) {
    if (t.kind === 'facility' && t.facilityType !== 'lab') t.status = 'done';
  }
  tickLadder(other);
  assert(!tabAvailable(other, 'research'), 'every other facility on campus, finished, still does not open Research');
}

// --- athletics: a team or sport club ----------------------------------
{
  const s = fresh();
  assert(s.orgs.teams.length === 0, 'a new school fields no varsity teams');

  const team = {
    id: 'team-test', name: 'Test Squad', sport: 'basketball', venueCategory: 'arena',
    headCoach: null, assistantCoach: null, trainer: null,
    status: 'awaitingVenue', foundedYear: 1,
  } as unknown as VarsityTeam;
  s.orgs.teams.push(team);
  tickLadder(s);
  assert(tabAvailable(s, 'athletics'), 'a team still waiting on its venue opens Athletics — it is a program the player has to staff');

  s.orgs.teams.pop();
  tickLadder(s);
  assert(tabAvailable(s, 'athletics'), 'and it stays open if the last team goes: a milestone is never undone');
}

// --- enrollment, student life, history: the first commencement ---------
{
  const s = fresh();
  s.clock.week = 52;
  tickLadder(s);
  for (const id of ['enrollment', 'studentlife', 'history'] as TabId[]) {
    assert(!tabAvailable(s, id), `${id} stays closed through the first year`);
  }
  s.history.push({ ...({} as GameState['history'][number]), year: 1 });
  s.clock.year = 2;
  s.clock.week = 1;
  tickLadder(s);
  for (const id of ['enrollment', 'studentlife', 'history'] as TabId[]) {
    assert(tabAvailable(s, id), `${id} opens once the first summer has closed`);
  }
  assert(s.ladder.reached.commencement === 2, 'the milestone records the year it was reached');
  assert(s.ladder.unread.includes('commencement'), 'and queues its letter');
}

// --- the bookkeeping the unlock line hangs off ------------------------
{
  const s = fresh();
  assert(
    Object.keys(s.seen.tabIds).length === 0,
    'a founding state has reported no gates yet (see SeenState.tabIds)',
  );
  for (const id of GATED_TABS) {
    assert(!s.seen.tabIds[id as TabId], `${id} starts unreported, so its first opening is news`);
  }
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
