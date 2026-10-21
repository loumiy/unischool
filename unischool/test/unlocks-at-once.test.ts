// ---------------------------------------------------------------------
// What an action opens, it opens at once (Plan 107G, engine/reducer.ts's
// settleUnlocks): the first class set in the summer opens the Students tab
// on Year 2's first week, not its second, and a team granted varsity finds
// its venue in the build menu the moment it is granted.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { ladderOpensTab } from '../src/systems/ladder/ladderSystem';
import { sportById } from '../src/data/studentLifeData';
import { teachingCollege } from './fixtures/teaching';
import { WEEKS_PER_YEAR } from '../src/state/types';
import type { GameState } from '../src/state/types';
import { bindScriptStream } from '../src/engine/random';

bindScriptStream(107);
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

function started(): GameState {
  const s = teachingCollege('Unlocks');
  s.started = true;
  s.events.opening.stage = 'play';
  return s;
}

function testStudentsTabOnTheFirstWeek(): void {
  let s = started();
  for (let i = 0; i < WEEKS_PER_YEAR * 2 && s.history.length === 0; i += 1) {
    const answer = defaultAnswer(s);
    s = answer ? reducer(s, answer) : reducer(s, { type: 'TICK' });
  }
  assert(s.history.length === 1, 'the first summer is set');
  assert(s.clock.year === 2 && s.clock.week === 1, `the page turns to Year 2, Week 1 (got Y${s.clock.year} W${s.clock.week})`);
  assert(ladderOpensTab(s, 'students'), 'the Students tab is open on Year 2, Week 1');
}

function testVenueOnTheGrant(): void {
  const s = started();
  const sport = sportById('basketball-m') ?? sportById('basketball-w')!;
  s.orgs.clubs.push({
    id: 'club-test', name: sport.clubName, foundedYear: 1, foundingMembers: 14, foundingEnrolled: 350,
    upkeepPerWeek: 100, sport: sport.id, varsityLastAskedYear: null,
  });
  s.finance.cash = 50_000_000;
  const venue = () => next.tech.filter((t) => t.athleticsVenueReveal && t.facilityType === sport.venueCategory);
  const ctx = { subjectId: 'club-test', subjectName: sport.clubName, subjectField: sport.id, amount: 0 };
  s.pendingInterrupt = { type: 'decision-event', payload: { eventId: 'varsity-petition', ctx } };
  let next = s;
  assert(venue().every((t) => t.status === 'locked'), 'the venue is hidden before the grant');
  next = reducer(s, { type: 'RESOLVE_DECISION_EVENT', eventId: 'varsity-petition', choiceId: 'establish', ctx });
  assert(next.orgs.teams.length === 1, 'the team goes varsity');
  assert(venue().some((t) => t.status === 'available'), 'its venue is on the build menu at once');
}

testStudentsTabOnTheFirstWeek();
testVenueOnTheGrant();

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
