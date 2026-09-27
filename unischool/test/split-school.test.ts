// ---------------------------------------------------------------------
// The split-school trap (Plan 72L; Plan 65 found it): a school spread over
// two halls while another school, with a program on offer, has none and no
// hall stands empty. The sorting suggestions only brought strays home, so
// nothing ever freed a hall. Now the smaller hall's programs are suggested
// into the larger (systems/techtree/schools.ts's schoolToMerge), and the
// next-step line says why.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { FOUNDERS_HALL_ID, isAcademicHall, milestoneSchools, programs } from '../src/data/techData';
import { emptyHall, programsAwayFromHome, schoolToMerge, suggestedMove } from '../src/systems/techtree/schools';
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
  const line = nextStep(s)?.text ?? '';
  assert(line.includes(`${SPLIT} is split over two halls`), `the next-step line says so ("${line}")`);

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

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
