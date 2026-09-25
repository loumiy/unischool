// ---------------------------------------------------------------------
// The top has to be held (Plan 17's PR D): the elite band closes on the
// leader (rivalsSystem.ts's eliteClosingStep), a rival that passes the
// school says so in the year in review, and the board proposes a response
// once per rival (eventData.ts's 'rival-passed', fired by eventSystem.ts).
//
// What is pinned: the closing term's shape — zero at or below the prestige
// gate, zero for a rival already at the target, a ten-point gap closed to
// about a point in five years — and that it reaches only the ten authored
// elite schools; that the field actually arrives on a leader above the
// gate and leaves one below it alone; that the review names who passed;
// and that the trustees ask once per rival, spend the shared cooldown, and
// never ask for a school already answered.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { tickRivals, ELITE_CLOSE_ABOVE_PRESTIGE, ELITE_CLOSE_GAP, ELITE_NO_LEAPFROG_GAP, eliteClosingStep, buildReportPayload, playerRank } from '../src/systems/rivals/rivalsSystem';
import { ELITE_RIVAL_IDS, initialRivals } from '../src/data/rivalData';
import { tickEvents } from '../src/systems/events/eventSystem';
import { DECISION_EVENT_COOLDOWN_WEEKS, DECISION_EVENT_FIRST_YEAR, findDecisionEvent, type DecisionEventContext } from '../src/data/eventData';
import { buildYearInReview } from '../src/state/yearInReview';
import { captureYearSnapshot } from '../src/state/history';
import type { GameState } from '../src/state/types';
import { WEEKS_PER_YEAR } from '../src/state/types';
import { bindScriptStream } from '../src/engine/random';

// The field's drift rolls dice; pinned to one stream (the sim's own LCG,
// sim/balanceSim.ts) so the claims below are about the model and not the
// weather. A claim that only holds on some streams is not pinned here.
bindScriptStream(12345);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('closing field tests');

// --- the term's shape -----------------------------------------------------------
{
  assert(eliteClosingStep(90, ELITE_CLOSE_ABOVE_PRESTIGE) === 0, 'nothing closes at the gate');
  assert(eliteClosingStep(60, 95) === 0, 'nothing closes below it');
  assert(eliteClosingStep(120, 120) === 0, 'a rival level with the leader is not pushed');
  assert(eliteClosingStep(117, 120) === 0, 'nor one inside the gap');
  assert(eliteClosingStep(100, 120) > 0, 'a rival ten points back is pulled');
  let gap = 10;
  for (let y = 0; y < 5; y += 1) gap -= eliteClosingStep(120 - ELITE_CLOSE_GAP - gap, 120);
  assert(gap < 1.5 && gap > 0.5, `a ten-point gap is about a point after five years (${gap.toFixed(2)})`);
}

// --- the band is the authored ten ------------------------------------------------
{
  const rivals = initialRivals();
  const elite = rivals.filter((r) => ELITE_RIVAL_IDS.has(r.id));
  assert(elite.length === 11, 'eleven elite schools');
  assert(elite.every((r) => r.reputation >= 87 && r.reputation <= 99), 'authored at 87 to 99');
  // The band is the table's: every school authored in it, and no other
  // (Plan 46 added Ashcombe, r1, which the list had left out).
  const inBand = rivals.filter((r) => r.reputation >= 87 && r.reputation <= 99).map((r) => r.id).sort();
  assert([...ELITE_RIVAL_IDS].sort().join(',') === inBand.join(','), `and they are every school authored at 87 to 99 (${inBand.join(', ')})`);
}

// --- the field arrives on a leader above the gate ---------------------------------
{
  const s = createInitialState('Leader');
  s.self.reputation = 125;
  s.clock.week = WEEKS_PER_YEAR;
  for (let y = 0; y < 8; y += 1) tickRivals(s);
  const elite = s.rivals.filter((r) => ELITE_RIVAL_IDS.has(r.id));
  assert(elite.every((r) => r.reputation > 110), `every elite school has closed to within reach after eight years (${elite.map((r) => r.reputation.toFixed(0)).join(', ')})`);
  assert(elite.every((r) => r.reputation <= 125 - ELITE_NO_LEAPFROG_GAP), 'and none has leapfrogged a leader who held');
  assert(playerRank(s) === 1, 'so the leader who held is still first');
  const rest = s.rivals.filter((r) => !ELITE_RIVAL_IDS.has(r.id));
  assert(rest.every((r) => r.reputation < 110), 'and the rest of the field drifted as it always did');

  // A leader who coasts falls into the band and is passed: the field does
  // not follow them down.
  const coasting = createInitialState('Coasting');
  coasting.self.reputation = 150;
  coasting.clock.week = WEEKS_PER_YEAR;
  for (let y = 0; y < 12; y += 1) tickRivals(coasting);
  assert(playerRank(coasting) === 1, 'a school holding the cap for twelve years is first');
  coasting.self.reputation = 138;
  tickRivals(coasting);
  assert(playerRank(coasting) > 1, `and one that falls twelve points is passed (rank #${playerRank(coasting)})`);
  const above = coasting.rivals.filter((r) => ELITE_RIVAL_IDS.has(r.id) && r.reputation > 138).length;
  assert(above >= 1, `by rivals the band left standing above it (${above})`);

  // A leader below the gate meets the field it always did: no elite
  // school is pulled, whatever else the dice do.
  const quiet = createInitialState('Quiet');
  quiet.self.reputation = 95;
  quiet.clock.week = WEEKS_PER_YEAR;
  const before = quiet.rivals.filter((r) => ELITE_RIVAL_IDS.has(r.id)).map((r) => r.reputation);
  for (let y = 0; y < 8; y += 1) tickRivals(quiet);
  const after = quiet.rivals.filter((r) => ELITE_RIVAL_IDS.has(r.id)).map((r) => r.reputation);
  const drift = after.map((v, i) => v - before[i]);
  assert(Math.max(...drift) < 20, `below the gate the elite band only drifts (largest move ${Math.max(...drift).toFixed(1)})`);
}

// --- who passed, in the review; the board's response --------------------------------
{
  // A school that was first last summer, passed this year by an elite
  // rival that has surged past it.
  const s = createInitialState('Passed');
  s.self.reputation = 120;
  s.clock.year = 10;
  s.clock.week = 30;
  s.events.opening.skipped = true;
  const rival = s.rivals.find((r) => r.id === 'r6')!;
  rival.reputation = 110;
  s.history.push(captureYearSnapshot(s, { attrition: 0, satisfactionAverage: 70, graduated: 0 }));
  assert(s.history[0].rank === 1, 'first last summer');
  rival.reputation = 130;
  // The report reconstructs a rival's standing a year ago by stepping its
  // momentum back (see rivalsSystem.ts's previousEntries), so a surge is a
  // large momentum: 130 today, 105 a year ago.
  rival.momentum = 25;
  assert(playerRank(s) === 2, 'second today');
  assert(buildReportPayload(s).passedBy.includes(rival.name), 'the report says who passed');
  const standing = buildYearInReview(s).sections.find((x) => x.key === 'standing')!;
  assert(standing.lines.some((l) => l.text.includes(`Passed this year by ${rival.name}`) && l.tone === 'bad'), 'and so does the year in review');

  // Below the gate the board says nothing, however the table moves: being
  // passed at #55 is the field breathing, not news.
  const midTable: GameState = structuredClone(s);
  midTable.self.reputation = ELITE_CLOSE_ABOVE_PRESTIGE;
  midTable.history[0].rank = 1; // still "passed" by the reconstruction
  tickEvents(midTable);
  assert(midTable.pendingInterrupt?.type !== 'decision-event' || (midTable.pendingInterrupt.payload as { eventId: string }).eventId !== 'rival-passed',
    'the board does not respond at or below the prestige gate');
  assert(midTable.events.passedResponses.length === 0, 'and stamps nothing');

  // Above it, the trustees respond on the first quiet week.
  assert(s.clock.year >= DECISION_EVENT_FIRST_YEAR, 'past the founding ramp');
  tickEvents(s);
  assert(s.pendingInterrupt?.type === 'decision-event', 'a decision event fires');
  const payload = s.pendingInterrupt!.payload as { eventId: string; ctx: DecisionEventContext };
  assert(payload.eventId === 'rival-passed', 'it is the board wanting a response');
  assert(payload.ctx.subjectId === rival.id, 'about the rival that passed');
  assert((payload.ctx.amount ?? 0) > 0 && payload.ctx.candidate !== undefined, 'with a price and a person rolled');
  assert(s.events.passedResponses.includes(rival.id), 'stamped at fire time');
  assert(s.events.lastDecisionWeek > 0, 'and it spends the shared cooldown');

  const event = findDecisionEvent('rival-passed')!;
  assert(event.choices.some((c) => c.cost(s, payload.ctx) === 0), 'there is a free way out');
  const cash = s.finance.cash;
  const endowment = s.finance.endowment;
  const answered = reducer(s, { type: 'RESOLVE_DECISION_EVENT', eventId: 'rival-passed', choiceId: 'campaign', ctx: payload.ctx });
  assert(answered.finance.cash < cash && answered.finance.endowment > endowment, 'the campaign costs cash and raises endowment');
  assert(answered.self.reputation === 120, 'and writes no prestige');

  const chair = reducer(s, { type: 'RESOLVE_DECISION_EVENT', eventId: 'rival-passed', choiceId: 'chair', ctx: payload.ctx });
  assert(chair.faculty.length === s.faculty.length + 1 && chair.self.facultyServed === s.self.facultyServed + 1, 'the chair appoints somebody');

  // Never twice for the same rival, even after the cooldown clears.
  const again: GameState = { ...answered, pendingInterrupt: null, clock: { year: 11, week: 30 } };
  again.events = { ...again.events, lastDecisionWeek: again.events.lastDecisionWeek - DECISION_EVENT_COOLDOWN_WEEKS * 2 };
  tickEvents(again);
  assert(again.pendingInterrupt?.type !== 'decision-event' || (again.pendingInterrupt.payload as { eventId: string }).eventId !== 'rival-passed',
    'the board does not ask about the same school twice');
}

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
process.exit(failures === 0 ? 0 : 1);
