// ---------------------------------------------------------------------
// The split-school trap (Plan 72L; Plan 65 found it): a school spread over
// two halls while another school, with a program on offer, has none and no
// hall stands empty. The sorting suggestions only brought strays home, so
// nothing ever freed a hall. Now the smaller hall's programs are suggested
// into the larger (systems/techtree/schools.ts's schoolToMerge: the hall
// panel's suggestion, and the harness's); since Plan 80D the next-step line
// names only the school to establish, and its way there brings the
// smaller hall's programs into the larger.
//
// And the trap the October review met in play (its trace 7, Plan 78D): the
// first school in its hall, Founders Hall full of others, and nothing of
// the school on the global offer. Its hall now offers its own programs, so
// the guided player, replayed from the scenario save written before the
// change (test/fixtures/save-v79.json, tools/scenarios.ts's split-school),
// grows the school and reaches a second without a stall.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInitialState } from '../src/state/actions';
import { readSave } from '../src/state/persistence';
import { schoolOffers } from '../src/systems/techtree/programOffers';
import { foundGame, playYears } from '../sim/harness/game';
import { createGuidedPlayer } from '../sim/harness/guided';
import { reducer } from '../src/engine/reducer';
import { FOUNDERS_HALL_ID, isAcademicHall, milestoneSchools, programById, programs } from '../src/data/techData';
import { claimedHalls, emptyHall, programsAwayFromHome, schoolFoundedKey, schoolToMerge, suggestedMove } from '../src/systems/techtree/schools';
import { nextStep } from '../src/systems/guidance/nextStep';
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

console.log('split school tests');

const majors = (school: string) => programs().filter((p) => p.school === school && p.kind !== 'graduate').map((p) => p.id);
const SPLIT = 'Science';
const schools = milestoneSchools().map((m) => m.schoolName);
const others = schools.filter((x) => x !== SPLIT);
// The school left without a hall, with a program on offer.
const HOMELESS = others[others.length - 1];

// Every hall standing and in use: Science four in Elm Hall and `second` in
// Oak Hall, one program of each other school but HOMELESS in the other
// five (Founders Hall among them), and a HOMELESS program on offer.
function trapped(second = 2, first = 4): GameState {
  const s = createInitialState('Split');
  const halls = s.tech.filter((t) => isAcademicHall(t));
  for (const hall of halls) {
    hall.status = 'done';
    s.halls[hall.id] = Array.from({ length: hall.slots ?? 6 }, () => ({ programId: null }));
  }
  const science = majors(SPLIT);
  const [elm, oak, ...rest] = halls.filter((t) => t.id !== FOUNDERS_HALL_ID).map((t) => t.id);
  science.slice(0, first).forEach((id, i) => { s.halls[elm][i] = { programId: id }; });
  science.slice(first, first + second).forEach((id, i) => { s.halls[oak][i] = { programId: id }; });
  [...rest, FOUNDERS_HALL_ID].forEach((hallId, i) => { s.halls[hallId][0] = { programId: majors(others[i])[0] }; });
  s.programOffers = [majors(HOMELESS)[0]];
  s.clock.year = 12;
  return s;
}

{
  const s = trapped();
  assert(majors(SPLIT).length >= 6 && others.length === 6, `${SPLIT} has six majors and six other schools (${majors(SPLIT).length}, ${others.length})`);
  assert(emptyHall(s) === undefined, 'no hall stands empty');
  const merge = schoolToMerge(s);
  assert(merge?.school === SPLIT && merge.from === 'HALL-02' && merge.into === 'HALL-01', `${SPLIT} is to merge Oak Hall into Elm Hall (${JSON.stringify(merge)})`);
  const oakPrograms = s.halls['HALL-02'].map((x) => x.programId).filter((x): x is string => x !== null);
  assert(oakPrograms.every((id) => programsAwayFromHome(s).some((p) => p.programId === id)), 'the programs in Oak Hall count as away from home');
  const move = suggestedMove(s, oakPrograms[0]);
  assert(move?.hallId === 'HALL-01' && move.slot === 4, `and the first is suggested into Elm Hall's first free slot (${JSON.stringify(move)})`);
  const step = nextStep(s);
  assert(step?.text === `Establish a school: six programs of ${SPLIT} in one hall (4 of 6)`, `the next-step line names the school, not the move ("${step?.text}")`);
  assert(step?.intent?.kind === 'move' && oakPrograms.includes(step.intent.programId) && step.intent.hallId === 'HALL-01', 'and its way there brings Oak Hall\'s into Elm Hall');

  // Both moved: Oak Hall stands empty, and nothing is left to merge.
  let t = s;
  for (const id of oakPrograms) {
    const m = suggestedMove(t, id);
    assert(m !== null, `a move for ${id} while the merge is under way`);
    if (m) t = reducer(t, { type: 'RELOCATE_PROGRAM', programId: id, ...m });
  }
  assert(emptyHall(t) === 'HALL-02', `Oak Hall stands empty after the merge (${emptyHall(t)})`);
  assert(schoolToMerge(t) === null, 'and nothing is left to merge');
}

// Nothing is suggested when no school is left out, when a hall already
// stands empty, or when the smaller hall would not fit in the larger.
{
  const s = trapped();
  s.programOffers = [];
  assert(schoolToMerge(s) === null, 'no offer from a school without a hall: no merge');
  s.programOffers = [majors(SPLIT)[5]];
  assert(schoolToMerge(s) === null, 'an offer from a school that has a hall: no merge');
}
{
  const s = trapped();
  const last = s.tech.find((t) => t.id === 'HALL-06')!;
  s.halls[last.id] = s.halls[last.id].map(() => ({ programId: null }));
  assert(schoolToMerge(s) === null, 'a hall already stands empty: no merge');
}
{
  // Elm Hall cut to five rooms: four Science and one free, and two in Oak
  // Hall would not fit.
  const s = trapped();
  s.halls['HALL-01'] = s.halls['HALL-01'].slice(0, 5);
  assert(schoolToMerge(s) === null, 'two in Oak Hall would not fit in Elm Hall\'s one free room: no merge');
}

// ---- Trace 7, replayed from the scenario save ----
{
  const raw = readFileSync(join(process.cwd(), 'test/fixtures/save-v79.json'), 'utf8');
  const read = readSave(raw);
  assert(!('refused' in read), 'the split-school save (version 79) loads');
  if (!('refused' in read)) {
    const s = read.state;
    const claim = claimedHalls(s)[0];
    const founders = s.halls[FOUNDERS_HALL_ID];
    assert(claim !== undefined && claim.housed < claim.slots, `a school is part-way into its hall (${JSON.stringify(claim)})`);
    assert(founders.every((x) => x.programId !== null), 'Founders Hall is full');
    const school = claim?.school ?? '';
    assert(s.programOffers.every((id) => programById(id)?.school !== school), `nothing of ${school} is on the global offer (${s.programOffers.join(', ')})`);
    assert(schoolOffers(s, claim?.hallId ?? '').length > 0, `but its hall offers ${school}'s own programs`);
    const trapYear = s.clock.year;

    const g = foundGame({ from: s, seed: 12345 });
    const player = createGuidedPlayer();
    // A stall: the line waiting on the offer while the school's hall has
    // room (the old "has room for Science when one is on offer").
    let stalled = 0;
    let founded: number | null = null;
    playYears(g, player, 3, (h) => {
      const step = nextStep(h.s);
      if (step?.intent?.kind === 'wait' && /when one is on offer/.test(step.text)) stalled += 1;
      if (founded === null && h.s.milestones[schoolFoundedKey(school)]) founded = h.s.clock.year;
    });
    assert(stalled === 0, `the line never waits on an offer for ${school} (${stalled} weeks)`);
    assert(founded !== null && founded <= trapYear + 1, `the School of ${school} is founded within a year (Year ${founded}, from Year ${trapYear})`);
    const second = player.record.done['a-second-school'];
    assert(second !== undefined && second[0] <= trapYear + 2, `a second school has a hall of its own within two years (${JSON.stringify(second)})`);
  }
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
