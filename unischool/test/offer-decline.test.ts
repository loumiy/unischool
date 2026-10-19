// ---------------------------------------------------------------------
// The move to school halls (Plan 78D): what a claimed hall offers, the
// year's decline of an offer, and the ask before another school's program
// takes a claimed hall's program slot.
//
//   1. A purchased hall one school claims (three of its programs, Plan 100)
//      offers every revealed program of that school, whatever the draw, and
//      the founding gate accepts them there and nowhere else, and nothing
//      else there (decision 2); Founders Hall and an open hall keep the
//      global offers, and one program doesn't claim a hall.
//   2. One offer a year may be declined: it leaves the table, the ordinary
//      draw fills the place (never the game's random stream), and a second
//      decline that year is refused with its reason.
//   3. Moving another school's program into a claimed hall is the case
//      the hall panel asks about (claimCutBy); the hall's own school's, or
//      any program into a hall no school claims, is not.
//   4. A save's declinedOffer is sanitized on load.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { bindScriptStream } from '../src/engine/random';
import { FOUNDERS_HALL_ID, academicHallId, programById, programs } from '../src/data/techData';
import { FOUNDING_PROGRAMS } from '../src/data/foundingData';
import {
  declineRefusal, drawsGlobalOffers, offerablePrograms, offeredIn, PROGRAM_OFFER_COUNT, refillOffers, schoolOffers,
} from '../src/systems/techtree/programOffers';
import { canFoundProgram, eligibleInstructors } from '../src/systems/techtree/techSystem';
import { claimCutBy } from '../src/systems/techtree/schools';
import { readSave, SAVE_VERSION } from '../src/state/persistence';
import type { GameState } from '../src/state/types';

bindScriptStream(12345);
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

console.log('offer decline tests');

const ELM = academicHallId(0);
const OAK = academicHallId(1);

// A college with Elm Hall standing, one founding program moved into it and
// two more of its school housed beside it: three, so Elm Hall is that
// school's claim (Plan 100). Oak Hall stands empty. `one` stops at the
// first program, which leaves Elm Hall open.
function claimed(name = 'Decline', one = false): { s: GameState; school: string } {
  const s = createInitialState(name);
  s.finance.cash = 500_000_000;
  for (const id of [ELM, OAK]) {
    const hall = s.tech.find((t) => t.id === id)!;
    hall.status = 'done';
    s.halls[id] = Array.from({ length: hall.slots ?? 6 }, () => ({ programId: null }));
  }
  const programId = FOUNDING_PROGRAMS[0];
  const founders = s.halls[FOUNDERS_HALL_ID];
  const at = founders.findIndex((slot) => slot.programId === programId);
  founders[at] = { programId: null };
  s.halls[ELM][0] = { programId };
  const school = programById(programId)!.school;
  if (!one) {
    const more = offerablePrograms(s).filter((p) => p.school === school && p.kind !== 'graduate').slice(0, 2);
    more.forEach((p, i) => { s.halls[ELM][i + 1] = { programId: p.id }; });
    refillOffers(s);
  }
  return { s, school };
}

// ---- 1. A claimed hall's own offers ----
{
  const { s, school } = claimed();
  const own = schoolOffers(s, ELM);
  const expected = offerablePrograms(s).filter((p) => p.school === school).map((p) => p.id);
  assert(own.length > 0 && own.length === expected.length, `Elm Hall offers every revealed ${school} program (${own.length} of ${expected.length})`);
  assert(own.every((p) => p.school === school), 'and only that school\'s');
  assert(schoolOffers(s, FOUNDERS_HALL_ID).length === 0, 'Founders Hall has no school offers of its own');
  assert(schoolOffers(s, OAK).length === 0, 'nor does a hall no school claims');
  // A global offer from another school isn't founded in a claimed hall.
  const foreign = s.programOffers.find((id) => programById(id)?.school !== school);
  if (foreign) assert(!offeredIn(s, ELM, foreign) && offeredIn(s, OAK, foreign), 'a claimed hall founds only its own school; an open hall the global offers');
  // One program doesn't claim a hall.
  const open = claimed('Open', true);
  assert(schoolOffers(open.s, ELM).length === 0 && open.s.programOffers.every((id) => offeredIn(open.s, ELM, id)), 'one program leaves Elm Hall open, founding the global offers');

  // The gate: an own-school program not on the global offer is foundable in
  // Elm Hall, and in no other hall.
  const off = own.find((p) => !s.programOffers.includes(p.id));
  assert(off !== undefined, `some ${school} program is not on the global offer (${s.programOffers.join(', ')})`);
  if (off) {
    assert(offeredIn(s, ELM, off.id), `${off.name} is on offer in Elm Hall`);
    assert(!offeredIn(s, FOUNDERS_HALL_ID, off.id), `but not in Founders Hall`);
    assert(!offeredIn(s, OAK, off.id), `nor in Oak Hall`);
    const entry = s.tech.find((t) => t.id === off.entryCourseId)!;
    const teacher = eligibleInstructors(s, entry)[0];
    if (teacher) {
      const founding = { programId: off.id, hallId: ELM, slot: 3, facultyId: teacher.id };
      assert(canFoundProgram(s, founding), `and founding it into Elm Hall is allowed`);
      assert(!canFoundProgram(s, { ...founding, hallId: FOUNDERS_HALL_ID, slot: s.halls[FOUNDERS_HALL_ID].findIndex((x) => x.programId === null) }), 'into Founders Hall it is not');
      const rng = s.rng;
      const offers = [...s.programOffers];
      const t = reducer(s, { type: 'FOUND_PROGRAM', ...founding });
      assert(t.halls[ELM][3].programId === off.id, `FOUND_PROGRAM houses ${off.name} in Elm Hall`);
      assert(JSON.stringify(t.programOffers) === JSON.stringify(offers), 'and leaves the global offers as they were');
      assert(t.rng === rng, 'without a draw on the random stream');
    }
  }
}

// ---- 1b. A claimed hall whose school has nothing left (Playtest 1, F5) ----
// Late in a run a school has founded every program it has; its hall's free
// slots then take the global offers instead of refusing everything.
{
  const { s, school } = claimed('Spent');
  assert(!drawsGlobalOffers(s, ELM), `while ${school} has programs left, Elm Hall offers only those`);
  const third = academicHallId(2);
  const hall = s.tech.find((t) => t.id === third)!;
  hall.status = 'done';
  s.halls[third] = Array.from({ length: Math.max(hall.slots ?? 6, schoolOffers(s, ELM).length) }, () => ({ programId: null }));
  schoolOffers(s, ELM).forEach((p, i) => { s.halls[third][i] = { programId: p.id }; });
  refillOffers(s);
  assert(schoolOffers(s, ELM).length === 0 && drawsGlobalOffers(s, ELM), `every ${school} program housed, Elm Hall draws the global offers`);
  assert(s.programOffers.length > 0 && s.programOffers.every((id) => offeredIn(s, ELM, id)), 'and every one of them may be founded there');
  const global = s.programOffers.map((id) => programById(id)!).find((p) => {
    const entry = s.tech.find((t) => t.id === p.entryCourseId)!;
    return eligibleInstructors(s, entry).length > 0;
  });
  if (global) {
    const entry = s.tech.find((t) => t.id === global.entryCourseId)!;
    const free = s.halls[ELM].findIndex((slot) => slot.programId === null);
    assert(canFoundProgram(s, { programId: global.id, hallId: ELM, slot: free, facultyId: eligibleInstructors(s, entry)[0].id }), `${global.name} can be founded into Elm Hall's free slot`);
  }
}

// ---- 2. The decline: once a year ----
{
  const { s } = claimed('Ashgrove');
  s.clock.year = 4;
  const first = s.programOffers[0];
  const rng = s.rng;
  assert(declineRefusal(s, first) === null, `an offer may be declined (${first})`);
  const t = reducer(s, { type: 'DECLINE_OFFER', programId: first });
  assert(!t.programOffers.includes(first), 'the declined offer leaves the table');
  assert(t.programOffers.length === PROGRAM_OFFER_COUNT, `and a replacement is drawn (${t.programOffers.join(', ')})`);
  assert(t.declinedOffer?.year === 4 && t.declinedOffer.programId === first, 'the year\'s decline is spent');
  assert(t.rng === rng, 'the draw leaves the game\'s random stream alone');
  const again = reducer(s, { type: 'DECLINE_OFFER', programId: first });
  assert(JSON.stringify(again.programOffers) === JSON.stringify(t.programOffers), 'the replacement is the same from the same state');

  const second = t.programOffers[0];
  const reason = declineRefusal(t, second);
  assert(reason === 'Already declined one this year.', `a second decline this year is refused with its reason ("${reason}")`);
  const u = reducer(t, { type: 'DECLINE_OFFER', programId: second });
  assert(JSON.stringify(u.programOffers) === JSON.stringify(t.programOffers), 'and changes nothing');

  // Through the year, the declined program is not drawn back: found every
  // offer in turn into Founders Hall's and Oak Hall's room, drawing after
  // each as founding does.
  let v = t;
  for (let i = 0; i < 4; i += 1) {
    const id = v.programOffers[0];
    v = JSON.parse(JSON.stringify(v)) as GameState;
    const hallId = v.halls[FOUNDERS_HALL_ID].some((x) => x.programId === null) ? FOUNDERS_HALL_ID : OAK;
    v.halls[hallId][v.halls[hallId].findIndex((x) => x.programId === null)] = { programId: id };
    v.programOffers = v.programOffers.filter((x) => x !== id);
    v.clock.week += 1;
    refillOffers(v);
    assert(v.programOffers.length === PROGRAM_OFFER_COUNT, `a full table after founding ${id}`);
    assert(!v.programOffers.includes(first), `the declined program stays off the table this year (week ${v.clock.week})`);
  }

  // A new year: the decline is there again.
  const w = JSON.parse(JSON.stringify(t)) as GameState;
  w.clock.year = 5;
  assert(declineRefusal(w, w.programOffers[0]) === null, 'the next year, an offer may be declined again');

  // An offer not on the table cannot be declined.
  const absent = programs().find((p) => p.kind !== 'graduate' && !s.programOffers.includes(p.id))!;
  assert(declineRefusal(s, absent.id) !== null, 'a program not on offer cannot be declined');
}

// ---- 3. The ask before a claimed hall's program slot is taken ----
{
  const { s, school } = claimed();
  const other = s.programOffers.map((id) => programById(id)!).find((p) => p.school !== school);
  const mine = schoolOffers(s, ELM)[0];
  assert(other !== undefined, 'an offer from another school');
  if (other) {
    const cut = claimCutBy(s, ELM, other.id);
    assert(cut?.school === school && cut.slots === 6, `another school's program into Elm Hall cuts ${school}'s claim (${JSON.stringify(cut)})`);
    assert(claimCutBy(s, OAK, other.id) === null, 'into a hall no school claims, nothing is cut');
    assert(claimCutBy(s, FOUNDERS_HALL_ID, other.id) === null, 'nor into Founders Hall while it is no school\'s');
  }
  assert(claimCutBy(s, ELM, mine.id) === null, 'the hall\'s own school\'s program cuts nothing');
}

// ---- 4. A save's decline, on load ----
{
  const { s } = claimed();
  s.started = true;
  const good = readSave(JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: { ...s, declinedOffer: { year: 3, programId: 'FINA' } } }));
  assert(!('refused' in good) && good.state.declinedOffer?.year === 3, 'a save\'s decline loads');
  const bad = readSave(JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: { ...s, declinedOffer: { year: 'x' } } }));
  assert(!('refused' in bad) && bad.state.declinedOffer === undefined, 'a malformed one is dropped');
  const old = readSave(JSON.stringify({ version: SAVE_VERSION - 1, savedAt: 0, state: s }));
  assert(!('refused' in old) && old.state.declinedOffer === undefined, 'a save from before the decline loads with none spent');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
