// ---------------------------------------------------------------------
// The athletic director (see systems/events/eventSystem.ts's
// fireAthleticDirectorOffer and data/studentLifeData.ts's AD block).
// Behavioral checks against the real event/reducer code, covering what the
// feature promises and the one thing it got wrong first:
//
//   - the offer arrives once the school fields a team, and not before;
//   - it is PUT once and does not come back until the cooldown, whatever
//     happens to the modal — the loop that starved every other event;
//   - hiring lifts every team at once, and costs real money every week;
//   - declining keeps the position open rather than closing it for the run.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { SPORTS, promoteToVarsityTeam, teamQuality, varsityTeamUpkeep, rollAthleticDirectorCandidates } from '../src/data/studentLifeData';
import { tickEvents } from '../src/systems/events/eventSystem';
import { WEEKS_PER_YEAR } from '../src/state/types';
import type { Coach, GameState, StudentClub } from '../src/state/types';

let seed = 20260917;
Math.random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) { failures += 1; console.error(`  ✗ ${msg}`); }
}

function fresh(): GameState {
  return createInitialState('Director Test');
}

function fieldTeam(s: GameState, sportId: string): void {
  const sport = SPORTS.find((sp) => sp.id === sportId)!;
  const club: StudentClub = {
    id: `club-${sportId}`, name: sport.clubName, foundedYear: 1,
    foundingMembers: 12, foundingEnrolled: 350, upkeepPerWeek: 50,
    sport: sportId, varsityLastAskedYear: null,
  };
  s.orgs.clubs.push(club);
  promoteToVarsityTeam(s, club, {
    sport: sport.id, name: sport.teamName, venueCategory: sport.venueCategory,
    upkeepPerWeek: 400, status: 'active',
  });
}

// ---- The offer arrives with the first team ----
function testOfferGate(): void {
  const s = fresh();
  tickEvents(s);
  assert(s.pendingInterrupt?.type !== 'athletic-director',
    'no director is offered to a school with no varsity program');

  const s2 = fresh();
  fieldTeam(s2, 'soccer-m');
  tickEvents(s2);
  assert(s2.pendingInterrupt?.type === 'athletic-director',
    'the offer arrives on the first quiet week after a team is fielded');

  const payload = s2.pendingInterrupt?.payload as { candidates: Coach[]; mascotSuggestion: string };
  assert(payload.candidates.length === 3, `three candidates are offered (got ${payload.candidates.length})`);
  assert(payload.candidates.every((c) => c.field === 'athletic-director'), 'each carries the director field');
  assert(typeof payload.mascotSuggestion === 'string' && payload.mascotSuggestion.length > 0,
    'and a mascot is suggested to start from');

  // Salary is the axis the cards differ on, so it must actually order them.
  const salaries = payload.candidates.map((c) => c.salary);
  assert(salaries[0] < salaries[2], `the cards run cheap to expensive (${salaries.join(' < ')})`);
}

// ---- THE LOOP THIS PR CLOSED ----
//
// The offer records the week it was PUT, not the week it was answered. So an
// interrupt cleared by anything other than the decline — the generic resolve
// path, a harness dismissing a modal it does not recognise — still cools down.
// Written as a regression test because the first version stamped the decline
// instead, and the offer then re-fired every quiet week forever: the balance
// sim's decision-event count over forty years fell from 52 to 8.
function testOfferIsPutOnce(): void {
  const s = fresh();
  fieldTeam(s, 'soccer-m');
  tickEvents(s);
  assert(s.pendingInterrupt?.type === 'athletic-director', 'the offer fires');
  assert(s.orgs.athleticDirectorAskedWeek > 0, 'and records the week it went out, at fire time');

  // Clear it the way an unrecognising caller would: no hire, no decline.
  s.pendingInterrupt = null;

  let refires = 0;
  for (let week = 0; week < WEEKS_PER_YEAR * 2; week += 1) {
    s.clock.week = (s.clock.week % WEEKS_PER_YEAR) + 1;
    if (s.clock.week === 1) s.clock.year += 1;
    tickEvents(s);
    if (s.pendingInterrupt?.type === 'athletic-director') refires += 1;
    s.pendingInterrupt = null;
  }
  assert(refires === 0, `the offer does not re-fire for two years after being put (re-fired ${refires} times)`);

  // But it DOES come back — the position is not lost for the run.
  s.clock.year += 4;
  tickEvents(s);
  assert(s.pendingInterrupt?.type === 'athletic-director',
    'and it does come back once the cooldown is past — declining never closes the position');
}

// ---- Hiring lifts every team, and costs money ----
function testHiringLiftsAndCosts(): void {
  const s = fresh();
  fieldTeam(s, 'soccer-m');
  fieldTeam(s, 'basketball-w');
  const qualityBefore = s.orgs.teams.map((t) => teamQuality(t, s));
  const upkeepBefore = varsityTeamUpkeep(s);

  const candidates = rollAthleticDirectorCandidates();
  const pick = candidates[2]; // the expensive one, so the lift is unmistakable
  const after = reducer(
    { ...s, pendingInterrupt: { type: 'athletic-director', payload: { candidates, mascotSuggestion: 'Owls' } } },
    { type: 'RESOLVE_ATHLETIC_DIRECTOR', candidate: pick, mascot: 'Kestrels' },
  );

  assert(after.orgs.athleticDirector?.id === pick.id, 'the director the modal described is the one hired');
  assert(after.self.mascot === 'Kestrels', `the mascot is named in the same breath (got '${after.self.mascot}')`);
  assert(after.pendingInterrupt === null, 'and the interrupt resolves');

  const qualityAfter = after.orgs.teams.map((t) => teamQuality(t, after));
  assert(qualityAfter.every((q, i) => q > qualityBefore[i]),
    `every team is lifted, not just one (${qualityBefore.join('/')} -> ${qualityAfter.join('/')})`);
  assert(varsityTeamUpkeep(after) > upkeepBefore,
    'and the department pays for them every week, like any other salary');
}

// ---- Declining keeps the position open ----
function testDecline(): void {
  const s = fresh();
  fieldTeam(s, 'soccer-m');
  const candidates = rollAthleticDirectorCandidates();
  const after = reducer(
    { ...s, pendingInterrupt: { type: 'athletic-director', payload: { candidates, mascotSuggestion: 'Owls' } } },
    { type: 'RESOLVE_ATHLETIC_DIRECTOR', candidate: null, mascot: 'Owls' },
  );
  assert(after.orgs.athleticDirector === null, 'declining appoints nobody');
  assert(after.self.mascot === '', 'and names no mascot — there is nothing yet to wear it');
  assert(after.pendingInterrupt === null, 'the interrupt still resolves');
}

console.log('athletic-director tests');
testOfferGate();
testOfferIsPutOnce();
testHiringLiftsAndCosts();
testDecline();

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
