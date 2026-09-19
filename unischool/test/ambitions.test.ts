// ---------------------------------------------------------------------
// Ambitions (Plan 17's PR A): a record of named achievements with the
// year each was reached (src/data/ambitionsData.ts, detected weekly by
// src/systems/ambitions/ambitionsSystem.ts).
//
// What is pinned: that every ambition is a reading of state the game
// already keeps, so setting the thing it names makes it true; that an
// ambition is written once with the year it landed and never revoked;
// that the two fiftieth-summer ambitions read true on the week the
// summer holds the clock on year fifty and on no other; that the run's
// solvency count is kept by the finance tick; and that ambitions grant
// nothing — no prestige, no cash, no applicants.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { AMBITIONS, ambitionById, ambitionEntries } from '../src/data/ambitionsData';
import { tickAmbitions } from '../src/systems/ambitions/ambitionsSystem';
import { SEMICENTENNIAL_YEAR, WEEKS_PER_YEAR } from '../src/state/types';
import type { GameState } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('ambitions tests');

// --- the list is the plan's, and every entry is well-formed ---------------
{
  assert(AMBITIONS.length === 20, `twenty ambitions are authored (${AMBITIONS.length})`);
  assert(new Set(AMBITIONS.map((a) => a.id)).size === AMBITIONS.length, 'ids are unique');
  assert(AMBITIONS.every((a) => a.name.length > 0 && a.line.length > 0), 'each has a name and a line');
  const s = createInitialState('Fresh');
  assert(Object.keys(s.ambitions).length === 0, 'a founding school has reached nothing');
  assert(s.finance.weeksInTheRed === 0, 'and has never been in the red');
  assert(ambitionEntries(s).every((a) => a.year === null), 'the panel shows every entry unreached');
}

// --- a founding school reaches nothing on its first week -----------------
{
  let s = createInitialState('Quiet');
  s = reducer(s, { type: 'TICK' });
  assert(Object.keys(s.ambitions).length === 0, `week one reaches no ambition (${Object.keys(s.ambitions).join(', ')})`);
}

// --- each detector reads the state it names -------------------------------
{
  const s = createInitialState('Readings');
  // Rank: a founding school is mid-table; lift it and the three rank
  // ambitions land in order.
  s.self.reputation = 75; // about #30 of 100 in the authored field
  tickAmbitions(s);
  assert(s.ambitions['top-fifty'] === 1, 'a school inside the top fifty reaches "In the top fifty" in year 1');
  assert(s.ambitions['top-ten'] === undefined, 'but not the top ten');
  s.self.reputation = 200;
  s.clock.year = 7;
  tickAmbitions(s);
  assert(s.ambitions['top-ten'] === 7 && s.ambitions['first'] === 7, 'first in the nation lands the year the school gets there');
  assert(s.ambitions['top-fifty'] === 1, 'and the earlier year stands');

  s.milestones['school-founded:Engineering'] = true;
  s.milestones['program-distinguished:MECH'] = true;
  s.milestones['school-distinguished:Engineering'] = true;
  s.research.prizes = 1;
  s.research.completedInitiatives.push({ depth: 'landmark', cancelled: false } as GameState['research']['completedInitiatives'][number]);
  s.finance.endowment = 1_000_000_000;
  s.students.classes.freshman = 10_000;
  s.self.suffix = 'University';
  s.orgs.teams.push({ id: 't1', sport: 'football', status: 'active' } as GameState['orgs']['teams'][number]);
  s.orgs.titles.push({ sport: 'football', year: 7 });
  tickAmbitions(s);
  for (const id of ['school-founded', 'program-distinguished', 'school-distinguished', 'prize', 'landmark', 'billion', 'ten-thousand', 'university', 'title', 'every-sport-title']) {
    assert(s.ambitions[id] === 7, `"${ambitionById(id)?.name}" reads the state it names (${s.ambitions[id]})`);
  }
  assert(s.ambitions['every-school'] === undefined, 'one school founded is not every school');
  assert(s.ambitions['catalogue'] === undefined, 'nor is one program the whole catalogue');
  assert(s.ambitions['hall'] === undefined, 'Founders Hall alone is not a hall of your own');
  const hall = s.tech.find((t) => t.id.startsWith('HALL-'))!;
  hall.status = 'done';
  tickAmbitions(s);
  assert(s.ambitions['hall'] === 7, 'the first academic hall beyond Founders is');
  const lines = s.log.filter((e) => e.topic === 'ambition');
  assert(lines.length === Object.keys(s.ambitions).length, 'each ambition is named once in the log');
  assert(lines.every((e) => e.subject !== undefined && ambitionById(e.subject) !== undefined), 'each line names its ambition by id');
}

// --- never revoked ---------------------------------------------------------
{
  const s = createInitialState('Sticky');
  s.self.reputation = 200;
  s.clock.year = 12;
  tickAmbitions(s);
  s.self.reputation = 5;
  s.clock.year = 20;
  tickAmbitions(s);
  assert(s.ambitions['first'] === 12, 'a school that falls from first keeps the year it got there');
}

// --- the fiftieth summer's pair ---------------------------------------------
{
  const s = createInitialState('Fifty');
  s.clock.year = SEMICENTENNIAL_YEAR;
  s.clock.week = WEEKS_PER_YEAR - 1;
  tickAmbitions(s);
  assert(s.ambitions['fifty-years'] === undefined, 'the week before the fiftieth summer is not fifty years');
  s.clock.week = WEEKS_PER_YEAR;
  tickAmbitions(s);
  assert(s.ambitions['fifty-years'] === SEMICENTENNIAL_YEAR, 'the fiftieth summer is');
  assert(s.ambitions['never-in-red'] === SEMICENTENNIAL_YEAR, 'a run that never dipped below zero was never in the red');

  const red = createInitialState('Red');
  red.clock.year = SEMICENTENNIAL_YEAR;
  red.clock.week = WEEKS_PER_YEAR;
  red.finance.weeksInTheRed = 1;
  tickAmbitions(red);
  assert(red.ambitions['never-in-red'] === undefined, 'one week below zero, fifty years ago, forfeits it');

  const early = createInitialState('Early');
  early.clock.year = SEMICENTENNIAL_YEAR - 1;
  early.clock.week = WEEKS_PER_YEAR;
  tickAmbitions(early);
  assert(early.ambitions['never-in-red'] === undefined && early.ambitions['fifty-years'] === undefined, 'the forty-ninth summer judges neither');
}

// --- the finance tick keeps the solvency count -----------------------------
{
  let s = createInitialState('Solvency');
  s.finance.cash = -1_000_000_000;
  s = reducer(s, { type: 'TICK' });
  assert(s.finance.weeksInTheRed === 1, 'a week closing below zero counts');
  // The first year's letters may hold the week; answer whatever is pending
  // so the next TICK is a real week.
  const answer = defaultAnswer(s);
  if (answer) s = reducer(s, answer);
  s = reducer(s, { type: 'TICK' });
  assert(s.finance.weeksInTheRed === 2, 'and so does the next');
}

// --- ambitions grant nothing -------------------------------------------------
{
  const s = createInitialState('Nothing');
  s.self.reputation = 200;
  const before = { cash: s.finance.cash, pool: s.students.applicantPool, reputation: s.self.reputation, endowment: s.finance.endowment };
  tickAmbitions(s);
  assert(Object.keys(s.ambitions).length > 0, 'something was reached');
  assert(
    s.finance.cash === before.cash && s.students.applicantPool === before.pool
      && s.self.reputation === before.reputation && s.finance.endowment === before.endowment,
    'and nothing was granted for it',
  );
  assert(s.pendingInterrupt === null, 'and no clock was stopped');
}

// --- through the real reducer, a year of play ---------------------------------
{
  let s = createInitialState('Year');
  s.self.reputation = 75;
  for (let i = 0; i < WEEKS_PER_YEAR * 2 && s.history.length === 0; i += 1) {
    const answer = defaultAnswer(s);
    s = answer ? reducer(s, answer) : reducer(s, { type: 'TICK' });
  }
  assert(s.ambitions['top-fifty'] === 1, 'a school ranked inside the top fifty reaches the ambition in play, stamped year 1');
  assert(s.log.some((e) => e.topic === 'ambition' && e.message.includes('In the top fifty')), 'and the log names it');
}

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
process.exit(failures === 0 ? 0 : 1);
