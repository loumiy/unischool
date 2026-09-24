// ---------------------------------------------------------------------
// PR H — the closing spec-conformance / invariant sweep (see the alignment
// roadmap). This is the last line of defense: it encodes the core design
// principles as checks that fail loudly if a future change drifts from them,
// rather than trusting a human to notice in review.
//
// Two kinds of check live here:
//   - BEHAVIORAL: drive the real reducer/data and assert on the outcome.
//   - SOURCE-SCAN: read the actual .ts source text and assert a pattern is
//     absent/confined to named files. Cheap, and it catches the kind of
//     regression a type system can't (a stray direct prestige write, a
//     system reaching into `placements`, a legacy identifier creeping back).
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { reducer } from '../src/engine/reducer';
import { createInitialState } from '../src/state/actions';
import { initialTech, majorPrefixes, graduatePrograms, ACADEMIC_HALL_COUNT, ACADEMIC_HALL_SLOTS, FIRST_HALL_COURSE_GATE, isAcademicHall } from '../src/data/techData';
import { weeklyResearchPoints, facilitySchool, disciplineVocab, rollGrantFunder, rollPrizeName } from '../src/data/researchData';
import { researchSchools } from '../src/data/techData';
import { findDecisionEvent, type DecisionEventContext } from '../src/data/eventData';
import { totalEnrolled } from '../src/state/types';
import { FOUNDERS_HALL_ID, programById } from '../src/data/techData';
import { FOUNDING_PROGRAMS } from '../src/data/foundingData';
import { FOUNDING_OFFER_GUARANTEE } from '../src/state/actions';
import type { GameState, OrgPetition } from '../src/state/types';
import {
  usedFacultySlots, hasFreeFacultySlot, eligibleInstructors, facultyLoad, isUnstaffed, hasFreeSlot,
} from '../src/systems/techtree/techSystem';
import { isHoused, PROGRAM_OFFER_COUNT, startedSchools } from '../src/systems/techtree/programOffers';
import {
  computePrestigeTarget, computeResearchTarget, computeSocialTarget,
  prestigeBreakdown, researchStandingBreakdown, socialStandingBreakdown,
} from '../src/systems/prestige/prestigeSystem';
import { bindScriptStream } from '../src/engine/random';
import { milestoneById, milestoneForBuildable } from '../src/data/ladderData';

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

function fresh(): GameState {
  return createInitialState('Invariants');
}

// Directly staffs a field with a generously-slotted hire, bypassing the
// hiring/candidate-market flow entirely — that machinery is exercised by
// test/faculty.test.ts, not this one. This test is about the CURRICULUM
// gate chain, and the founding five faculty do not cover every field a
// school's T1 courses require (see facultyData.ts's FACULTY_FIELDS), so a
// scenario that walks a whole school's chain needs its fields staffed first.
function staffField(s: GameState, field: string): void {
  s.faculty.push({
    id: `test-${field}`, name: `Dr. Test ${field}`, field,
    teaching: 80, research: 60, teachingPotential: 90, researchPotential: 70,
    tenureWeeks: 0, weeksListed: 0, acclaim: 0, salary: 0, courseSlots: 10,
    nationality: 'United States', flag: '🇺🇸', bio: 'A test fixture, not a character.', gender: 'male', heritage: 'Anglo/Western European',
  });
}

// Ticks the reducer forward, auto-resolving whatever interrupt fires with
// the simplest safe choice, so a long-running scenario (this file drives a
// school building's multi-year construction) survives the summer admissions
// boundary and any milestone/event/demand it crosses along the way — exactly
// what a real playthrough does, just automated. Stops once `predicate(s)` is
// true or `maxTicks` weekly ticks have elapsed.
function advanceUntil(s: GameState, predicate: (s: GameState) => boolean, maxTicks: number): GameState {
  for (let i = 0; i < maxTicks && !predicate(s); i += 1) {
    if (s.pendingInterrupt) {
      const type = s.pendingInterrupt.type;
      if (type === 'summer') {
        s = reducer(s, {
          type: 'RESOLVE_ADMISSIONS',
          tuition: s.finance.listedTuition,
          admitRate: s.students.admitRate,
          approvedPetitionIds: [],
        });
      } else if (type === 'milestone') {
        s = reducer(s, { type: 'RESOLVE_MILESTONE' });
      } else if (type === 'research-complete') {
        s = reducer(s, { type: 'RESOLVE_RESEARCH_REPORT' });
      } else if (type === 'demand') {
        s = reducer(s, { type: 'RESOLVE_DEMAND' });
      } else if (type === 'charter') {
        s = reducer(s, { type: 'RESOLVE_CHARTER', accept: false });
      } else if (type === 'decision-event') {
        // Take whichever choice the school can actually afford — every
        // authored event guarantees at least one zero-cost option, so this
        // never wedges (see data/eventData.ts's DECISION_EVENTS contract).
        const payload = s.pendingInterrupt.payload as { eventId: string; ctx: DecisionEventContext };
        const event = findDecisionEvent(payload.eventId);
        const choice = event?.choices.find((c) => c.cost(s, payload.ctx) <= s.finance.cash);
        s = reducer(s, {
          type: 'RESOLVE_DECISION_EVENT', eventId: payload.eventId, choiceId: choice?.id ?? '', ctx: payload.ctx,
        });
      } else {
        s = reducer(s, { type: 'RESOLVE_REPORT' });
      }
      continue;
    }
    s = reducer(s, { type: 'TICK' });
  }
  return s;
}

// =====================================================================
// SOURCE-SCAN HELPERS
// =====================================================================

// process.cwd() rather than import.meta.url: this file is BUNDLED by
// rolldown into node_modules/.tmp before running (see package.json's
// test:invariants script), so a path derived from the bundle's own location
// would resolve inside node_modules, not the project. npm scripts always run
// with cwd at the project root, which is the stable anchor here.
const SRC_ROOT = join(process.cwd(), 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) out.push(full);
  }
  return out;
}

const ALL_SRC_FILES = walk(SRC_ROOT);

function readAll(files: string[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const f of files) m.set(f, readFileSync(f, 'utf8'));
  return m;
}

const SOURCE = readAll(ALL_SRC_FILES);

function relPath(f: string): string {
  return f.slice(SRC_ROOT.length + 1);
}

// =====================================================================
// 1. NO HARD GAME-OVER — the field is gone, not just unset
// =====================================================================
{
  const s = fresh();
  assert(!('gameOver' in (s as unknown as Record<string, unknown>)), 'GameState carries no gameOver field');
  const pre = JSON.parse(JSON.stringify(s)) as GameState; // pre-start shape check too
  assert(!('gameOver' in (pre as unknown as Record<string, unknown>)), 'a serialized state carries no gameOver field');
}

// =====================================================================
// 2. INSTITUTION, NOT STUDENTS — exactly four aggregate classes, no list
// =====================================================================
{
  const s = fresh();
  const classKeys = Object.keys(s.students.classes).sort();
  assert(
    JSON.stringify(classKeys) === JSON.stringify(['freshman', 'junior', 'senior', 'sophomore']),
    'students.classes has exactly the four class-year keys',
  );
  for (const v of Object.values(s.students.classes)) {
    assert(typeof v === 'number', 'every class is a plain count, not a list of individuals');
  }
  // The word is load-bearing now that admissions cohorts are a separate
  // grouping of the same students (see systems/admissions/cohorts.ts): a
  // `cohorts` key back on the student body would mean the two had been
  // conflated again, which is exactly what the rename set out to stop.
  assert(!('cohorts' in (s.students as unknown as Record<string, unknown>)),
    'the student body has no `cohorts` key — a year group is a class');
  // A founded college opens with all four class years present and BALANCED
  // (each class within one student of the others), sized to FOUNDING_BODY —
  // the steady state that de-lumps the early admissions cycles. See
  // actions.ts's createInitialState / FOUNDING_CLASSES in foundingData.ts.
  const fc = s.students.classes;
  assert(fc.freshman > 0 && fc.sophomore > 0 && fc.junior > 0 && fc.senior > 0,
    'founding body has all four classes populated, not freshmen only');
  const counts = [fc.freshman, fc.sophomore, fc.junior, fc.senior];
  assert(Math.max(...counts) - Math.min(...counts) <= 1,
    'founding classes are balanced (within one student of each other)');
  assert(totalEnrolled(s.students) === fc.freshman + fc.sophomore + fc.junior + fc.senior,
    'founding total equals the sum of the four classes');
  // The founding body is entirely commuters — no dorm at founding (see
  // campusData.ts) — and enrollment is never capacity-gated (see
  // admissionsSystem.ts), so there is no dorm bed to speak of yet.
  assert(s.students.capacity === 0,
    'founding capacity is zero — the whole founding body is commuters');
}

// =====================================================================
// 3. MONEY IS THE ONLY DEVELOPMENT THROTTLE — no slot cap on concurrency
// =====================================================================
{
  let s = fresh();
  s.finance.cash = 10_000_000;
  const availableCourses = s.tech.filter((t) => t.kind === 'course' && t.status === 'available');
  assert(availableCourses.length >= 3, 'fixture: at least three courses available to start at once');
  // Money is the only throttle under test; the faculty gate is a different
  // one (see the capacity sweep below), so the three fields are staffed.
  for (const c of availableCourses.slice(0, 3)) {
    if (c.requiresFaculty && !s.faculty.some((f) => f.id === `test-${c.requiresFaculty}`)) staffField(s, c.requiresFaculty);
    s = reducer(s, { type: 'START_DEVELOPMENT', nodeId: c.id });
  }
  const developingCount = availableCourses.slice(0, 3)
    .filter((c) => s.tech.find((t) => t.id === c.id)?.status === 'developing').length;
  assert(developingCount === 3, 'three simultaneous developments all start — no development-slot cap exists');
}

// =====================================================================
// 4. THE MAP IS COSMETIC — no system reads placements/pathways/trees,
//    but one: campus beauty (Plan 26)
//
// `trees` joined this list with the founding woodland (see types.ts's Trees
// block). It is the same claim for the same reason: where a building stands,
// which squares are paved, and which squares have a tree on them are facts
// about the picture, and a system that started scoring one of them would
// make the map load-bearing without anyone deciding that it should.
//
// Plan 26 decided it should, in one place: systems/estate/beauty.ts scores
// the trees, the quads and the standing buildings, and its score is capped
// wherever it lands. Every other system still may not look.
// =====================================================================
const LAYOUT_READERS = new Set(['systems/estate/beauty.ts', 'systems/estate/pairing.ts']);
{
  const systemFiles = ALL_SRC_FILES.filter((f) => relPath(f).startsWith(`systems${'/'}`) && !LAYOUT_READERS.has(relPath(f)));
  const offenders: string[] = [];
  for (const f of systemFiles) {
    const text = SOURCE.get(f)!;
    if (/\.placements\b|\.pathways\b|\.trees\b/.test(text)) offenders.push(relPath(f));
  }
  assert(offenders.length === 0, `no tick system reads placements/pathways/trees (found in: ${offenders.join(', ')})`);
}

// =====================================================================
// 5. PRESTIGE IS A STOCK — writers are confined, rank never feeds it
// =====================================================================
{
  // Every direct assignment to `self.reputation` (or a destructured
  // `reputation:` on the University object) is confined to the three
  // intentional writers: founding init, the weekly drift, and rivals
  // writing their OWN reputation (a different object entirely, but grepped
  // here for completeness since it shares the field name).
  const ALLOWED_REPUTATION_WRITERS = new Set([
    'state/actions.ts',
    'systems/prestige/prestigeSystem.ts',
    'systems/rivals/rivalsSystem.ts',
  ]);
  const offenders: string[] = [];
  for (const [f, text] of SOURCE) {
    const rel = relPath(f);
    if (ALLOWED_REPUTATION_WRITERS.has(rel)) continue;
    // Matches `self.reputation =` / `self.reputation +=` style writes;
    // comments mentioning reputation are not flagged unless they contain an
    // actual assignment operator right after the property access.
    if (/self\.reputation\s*[+\-*/]?=/.test(text)) offenders.push(rel);
  }
  assert(offenders.length === 0, `no unexpected writer of self.reputation (found in: ${offenders.join(', ')})`);

  // THE SAME CONFINEMENT FOR THE OTHER TWO STANDINGS. They are stocks of
  // exactly the same shape (see prestigeSystem.ts's computeSocialTarget /
  // computeResearchTarget), so an event or a completion effect nudging one
  // directly would be the same flow-not-stock mistake the rule above exists
  // to forbid — just in a place nobody was watching yet.
  //
  // The allowed set gains one file over reputation's: persistence.ts, which
  // once seeded a newly-added stock for a run already underway (the same
  // act as founding init, arriving late) and is kept on the list by name
  // rather than dodged by renaming a local — an invariant you can slip past
  // by choosing a different variable name is not an invariant.
  const ALLOWED_STANDING_WRITERS = new Set([...ALLOWED_REPUTATION_WRITERS, 'state/persistence.ts']);
  for (const field of ['socialStanding', 'researchStanding'] as const) {
    const found: string[] = [];
    for (const [f, text] of SOURCE) {
      const rel = relPath(f);
      if (ALLOWED_STANDING_WRITERS.has(rel)) continue;
      if (new RegExp(`self\\.${field}\\s*[+\\-*/]?=`).test(text)) found.push(rel);
    }
    assert(found.length === 0, `no unexpected writer of self.${field} (found in: ${found.join(', ')})`);
  }

  // Rank is a measurement OF prestige, never an input TO it: the prestige
  // module must never read the rivals module's rank function.
  const prestigeText = SOURCE.get(join(SRC_ROOT, 'systems', 'prestige', 'prestigeSystem.ts'))!;
  assert(!/playerRank/.test(prestigeText), 'prestigeSystem.ts never reads playerRank (rankings cannot feed prestige)');
  assert(!/rankBy|rankedListBy/.test(prestigeText),
    'prestigeSystem.ts never reads any ranked list (the rule covers all three axes, not just the academic one)');

  // THE CENTRAL PROMISE OF THE THREE-STANDINGS CHANGE, asserted rather than
  // intended: the two new axes are READINGS of the school, never inputs to
  // the academic number. computePrestigeTarget is the function the whole
  // economy hangs off — admitRate, the applicant pool, price tolerance, every
  // recorded YearSnapshot — and if either stock ever appeared inside it, the
  // headline would start depending on campus life and the balance sim's
  // forty-year runs would quietly stop meaning what they meant.
  const targetFn = prestigeText.slice(prestigeText.indexOf('export function computePrestigeTarget'));
  const targetBody = targetFn.slice(0, targetFn.indexOf('\n}'));
  for (const field of ['socialStanding', 'researchStanding']) {
    assert(!targetBody.includes(field),
      `computePrestigeTarget does not read self.${field} (a standing is a reading of prestige, never an input to it)`);
  }
}

// =====================================================================
// 6. PRESTIGE CADENCE — weekly drift only, never per-mutation
// =====================================================================
{
  const reducerText = SOURCE.get(join(SRC_ROOT, 'engine', 'reducer.ts'))!;
  // tickPrestige lives in the SYSTEMS array as a bare function reference
  // (`tickPrestige,`), never invoked directly — the reducer calls every
  // system uniformly via `for (const system of SYSTEMS) system(s)`. So the
  // check for "runs on the weekly cadence only, never per-mutation" is that
  // it is NOT called as `tickPrestige(...)` anywhere in the codebase outside
  // its own definition file, and that it IS present as an array entry here.
  assert(/\btickPrestige\s*,/.test(reducerText), 'tickPrestige is registered as a bare entry in the weekly SYSTEMS array');
  const prestigeFile = join(SRC_ROOT, 'systems', 'prestige', 'prestigeSystem.ts');
  const directCallSites: string[] = [];
  for (const [f, text] of SOURCE) {
    if (f === prestigeFile) continue; // its own definition
    if (/\btickPrestige\(/.test(text)) directCallSites.push(relPath(f));
  }
  assert(directCallSites.length === 0,
    `tickPrestige is never called directly elsewhere — only run via the SYSTEMS loop (found direct calls in: ${directCallSites.join(', ')})`);

  // Behavioral half: reputation moves only a small fraction of the gap per
  // week — never jumps — even when the target is far away.
  const s = fresh();
  const before = s.self.reputation;
  const s1 = reducer(s, { type: 'TICK' });
  const delta = Math.abs(s1.self.reputation - before);
  assert(delta < 1, `prestige moves by a small fraction in one week, never jumps (moved ${delta.toFixed(3)})`);
}

// =====================================================================
// 7. RIGID CURRICULUM GATING — hall -> founding -> T1 -> T2 -> T3 (Plan
// 14; Plan 19 took the gen-ed core out from under it). There is no school
// building: a program is founded by taking a slot in a standing hall,
// which is the only way its tier-1 course ever starts, and every course
// of the program waits on that home.
// =====================================================================
{
  const tech = initialTech();
  const byId = new Map(tech.map((t) => [t.id, t]));

  const t1 = byId.get('FINA101')!;
  assert(t1.prereqs.length === 0, 'a T1 course has no prereqs at all — its home is a dynamic gate');
  assert(!tech.some((t) => t.kind === 'building' && t.id.startsWith('BLDG-') && t.id !== FOUNDERS_HALL_ID && t.graduateProgram === undefined),
    'no degree-granting school has a building of its own in the seed');

  const t2 = byId.get('FINA110')!;
  assert(
    t2.prereqs.length === 1 && t2.prereqs[0] === 'FINA101',
    'a T2 course requires its own T1 course and nothing else as a prereq — its home is a dynamic gate',
  );

  const t3 = byId.get('FINA210')!;
  assert(
    ['FINA110', 'FINA120', 'FINA130', 'FINA140'].every((id) => t3.prereqs.includes(id)),
    'a T3 course requires the full T2 quartet of its major',
  );

  // End-to-end: drive the chain through the real reducer/systems and
  // confirm nothing ever unlocks ahead of its gate.
  let s = fresh();
  s.finance.cash = 500_000_000; // large enough that money never blocks this test
  const isAvailIn = (st: GameState, id: string) => st.tech.find((t) => t.id === id)?.status === 'available';
  const isAvail = (id: string) => isAvailIn(s, id);
  const isLocked = (id: string) => s.tech.find((t) => t.id === id)?.status === 'locked';
  const isDoneIn = (st: GameState, id: string) => st.tech.find((t) => t.id === id)?.status === 'done';

  assert(isLocked('FINA101'), 'FINA101 starts locked (its program has no home)');
  assert(isLocked('HALL-01'), 'the first academic hall starts locked — six courses developed against a gate of eight');
  assert(isLocked('FINA110'), 'FINA110 starts locked');
  assert(isAvail('ENGL120'), 'a founding program\'s next course opens at founding — housed, and its entry course done');

  // Teach two more courses, which is what the first hall waits on (Plan
  // 19's PR B): the founding faculty have a slot for one; the other needs
  // a hire.
  staffField(s, 'History');
  for (const id of ['ENGL120', 'HIST120']) s = reducer(s, { type: 'START_DEVELOPMENT', nodeId: id });
  s = advanceUntil(s, (st) => isAvailIn(st, 'HALL-01'), 60);
  assert(isAvail('HALL-01'), 'the first hall opens once the college teaches eight courses');
  assert(isLocked('FINA101'), 'FINA101 stays locked — its program has no home');
  assert(s.programOffers.length === 3, 'three programs are on offer');
  assert(s.programOffers.every((id) => isLocked(programById(id)!.entryCourseId)),
    "every offered program's entry course is still locked");

  // A tier-1 course cannot be started around the founding.
  const offered = programById(s.programOffers[0])!;
  s.tech.find((t) => t.id === offered.entryCourseId)!.status = 'available'; // a hand-edited save
  const sneaked = reducer(JSON.parse(JSON.stringify(s)) as GameState, { type: 'START_DEVELOPMENT', nodeId: offered.entryCourseId });
  void sneaked; // START_DEVELOPMENT trusts status; what protects the gate is that nothing ever sets it
  s.tech.find((t) => t.id === offered.entryCourseId)!.status = 'locked';
  s = reducer(s, { type: 'TICK' });
  assert(isLocked(offered.entryCourseId), 'a tick re-resolves nothing for an unhoused program');

  // Build the hall, and found the first offer into it.
  s = reducer(s, { type: 'PLACE_BUILDABLE', buildableId: 'HALL-01', row: 40, col: 90, rotated: false });
  s = advanceUntil(s, (st) => isDoneIn(st, 'HALL-01'), 260);
  assert(isDoneIn(s, 'HALL-01'), 'the hall stands');
  const program = programById(s.programOffers[0])!;
  const entry = s.tech.find((t) => t.id === program.entryCourseId)!;
  if (entry.requiresFaculty) staffField(s, entry.requiresFaculty);
  const instructor = s.faculty.find((f) => f.field === entry.requiresFaculty)!;
  const before = [...s.programOffers];
  s = reducer(s, { type: 'FOUND_PROGRAM', programId: program.id, hallId: 'HALL-01', slot: 2, facultyId: instructor.id });
  assert(s.halls['HALL-01'][2].programId === program.id, `${program.name} is housed in slot 3`);
  assert(s.tech.find((t) => t.id === entry.id)?.status === 'developing', 'its entry course starts in the same transaction');
  assert(s.courseFaculty[entry.id] === instructor.id, 'with the chosen instructor');
  assert(!s.programOffers.includes(program.id) && s.programOffers.length === 3, 'the offer is refilled');
  assert(before.filter((id) => id !== program.id).every((id) => s.programOffers.includes(id)), 'and the other two offers stand');
  assertHallsInvariants(s, 'after founding');

  // Its tier-2 courses open once the entry course is done — and only for
  // the housed program.
  const t2Id = program.courseIds[1];
  assert(isLocked(t2Id), 'a T2 course stays locked while the entry course develops');
  s = advanceUntil(s, (st) => isAvailIn(st, t2Id), 40);
  assert(isAvail(t2Id), 'a T2 course opens once its T1 course is done and the program is housed');
  const other = programById(s.programOffers[0])!;
  assert(isLocked(other.entryCourseId), "an unfounded program's entry course is still locked");

  // Finish the T2 quartet and confirm T3 + the program-established
  // milestone, with any cross-major bridge satisfied by hand (a bridge
  // may point into an unfounded program, which is real curriculum
  // texture rather than a wrinkle to route around).
  const t2Ids = program.courseIds.slice(1, 5);
  for (const id of t2Ids) {
    const node = s.tech.find((t) => t.id === id)!;
    for (const pre of node.prereqs) {
      const p = s.tech.find((t) => t.id === pre)!;
      if (p.status !== 'done') p.status = 'done';
    }
  }
  s = reducer(s, { type: 'TICK' });
  for (const id of t2Ids) {
    if (isAvail(id)) s = reducer(s, { type: 'START_DEVELOPMENT', nodeId: id });
  }
  const t3Id = program.courseIds[5];
  s = advanceUntil(s, (st) => isAvailIn(st, t3Id) || st.tech.find((t) => t.id === t3Id)?.status === 'developing', 80);
  const capstone = s.tech.find((t) => t.id === t3Id)!;
  const capstoneGated = capstone.prereqs.filter((id) => !t2Ids.includes(id));
  if (capstoneGated.every((id) => isDoneIn(s, id))) {
    assert(capstone.status !== 'locked', 'a T3 course opens once the T2 quartet is done');
  } else {
    assert(capstone.status === 'locked', 'a T3 course stays locked behind its lab or facility gate');
  }
  assert(s.milestones[`program-established:${program.id}`] === true, 'the program-established milestone is awarded');
}

// =====================================================================
// 8. RESEARCH IS STATE-INFLUENCED + PROBABILISTIC — no lab, no output
// =====================================================================
{
  const s = fresh();
  assert(s.tech.filter((t) => t.facilityType === 'lab' && t.status === 'done').length === 0,
    'fixture: a founding school has no finished lab');
  assert(weeklyResearchPoints(s) === 0, 'zero labs -> zero weekly research output, however large the faculty roster');
}

// =====================================================================
// 8b. AN OUTPUT IS DESCRIBED BY THE DISCIPLINE THAT PRODUCED IT
//
// Every research facility resolves to the school that owns it, and every
// word the log puts around an output — the noun, the funder, the prize —
// comes from that school's vocabulary. The bug this guards used a
// campus-wide weighted draw across everyone producing scholarship, which
// was right when production WAS the whole equipped roster and is simply
// wrong against initiatives: a project in the Humanities Research
// Institute logged "a new paper" whenever the campus also ran physics
// labs, because the draw landed on a physicist with nothing to do with it.
// =====================================================================
{
  const schools = researchSchools();

  // Every facility in the catalogue belongs to exactly the school that lists it.
  for (const school of schools) {
    for (const labId of school.labIds) {
      assert(facilitySchool(labId) === school.schoolName,
        `${labId} resolves to ${school.schoolName} (got ${facilitySchool(labId)})`);
    }
  }

  assert(facilitySchool('NOT-A-FACILITY') === null, 'an unknown facility id resolves to no school, rather than throwing');

  // The humanities do not have breakthroughs, and are not funded by the
  // agencies that fund bench science. Both halves of the same point.
  const humanities = disciplineVocab('Social Sciences & Humanities');
  assert(humanities.publication === 'monograph', `the humanities publish monographs (got "${humanities.publication}")`);
  assert(humanities.breakthrough !== 'breakthrough', `the humanities do not have "breakthroughs" (got "${humanities.breakthrough}")`);

  // Nothing science-specific can be drawn for a humanities project, however
  // many times it is rolled. 400 draws over a pool of this size makes a
  // miss vanishingly unlikely to be luck.
  const SCIENCE_ONLY = ['Science Foundation', 'defense', 'industrial', 'Scientific Achievement', 'Health Sciences', 'Medicine'];
  let strayFunder: string | null = null;
  let strayPrize: string | null = null;
  for (let i = 0; i < 400; i += 1) {
    const funder = rollGrantFunder(humanities);
    const prize = rollPrizeName(humanities);
    if (SCIENCE_ONLY.some((w) => funder.includes(w))) strayFunder = funder;
    if (SCIENCE_ONLY.some((w) => prize.includes(w))) strayPrize = prize;
  }
  assert(strayFunder === null, `a humanities project is never funded by a science body (drew "${strayFunder}")`);
  assert(strayPrize === null, `a humanities project never wins a science prize (drew "${strayPrize}")`);

  // And every school that can run research has vocabulary of its own or a
  // default that fits it — no school draws from an empty pool.
  for (const school of schools) {
    if (school.labIds.length === 0) continue;
    const vocab = disciplineVocab(school.schoolName);
    assert(vocab.funders.length > 0 && vocab.prizes.length > 0,
      `${school.schoolName} has funders and prizes to draw from`);
    assert(rollGrantFunder(vocab).length > 0 && rollPrizeName(vocab).length > 0,
      `${school.schoolName} draws a real funder and a real prize name`);
  }
}

// =====================================================================
// 9. PETITIONS ARE A YEARLY POOL — the queue drains wholesale, never persists
// =====================================================================
{
  let s = fresh();
  const petition: OrgPetition = {
    id: 'test-petition', kind: 'club', name: 'Test Club',
    foundedYear: s.clock.year, foundingMembers: 20, foundingEnrolled: 200, upkeepPerWeek: 100,
  };
  s.orgs.pendingPetitions = [petition];
  s.clock.week = 52; // the summer boundary
  s.pendingInterrupt = { type: 'summer', payload: { beat: 0, tuition: s.finance.listedTuition, admitRate: s.students.admitRate } };

  // Decline it explicitly (approvedPetitionIds does not include it).
  const s1 = reducer(s, {
    type: 'RESOLVE_ADMISSIONS', tuition: s.finance.listedTuition, admitRate: s.students.admitRate, approvedPetitionIds: [],
  });
  assert(s1.orgs.pendingPetitions.length === 0, 'the petition queue is empty after resolving — nothing carries over');
  assert(!s1.orgs.clubs.some((c) => c.id === 'test-petition'), 'a declined petition never becomes a live club');
}

// =====================================================================
// 9b. HALLS AND SLOTS (Plan 14's PR A). `s.halls` is the one side record
// systems read (see types.ts's HallSlot), so it is held to three rules in
// every state the game can reach: every non-null slot names a real
// program; no program is housed twice; and every hall in the record is a
// placed, standing Buildable with exactly its `slots` entries. The same
// three rules persistence.ts's sanitizeHalls enforces on load.
// =====================================================================
function assertHallsInvariants(s: GameState, label: string): void {
  const programIds = new Set<string>([...majorPrefixes(), ...graduatePrograms().map((p) => p.id)]);
  const housed = new Map<string, string>();
  for (const [hallId, slots] of Object.entries(s.halls)) {
    const hall = s.tech.find((t) => t.id === hallId);
    assert(!!hall && hall.slots !== undefined, `${label}: hall ${hallId} is a Buildable with slots`);
    assert(hall?.status === 'done', `${label}: hall ${hallId} is standing`);
    assert(hallId in s.placements, `${label}: hall ${hallId} is placed`);
    assert(slots.length === hall?.slots, `${label}: hall ${hallId} has exactly ${hall?.slots} slots (got ${slots.length})`);
    for (const slot of slots) {
      if (slot.programId === null) continue;
      assert(programIds.has(slot.programId), `${label}: slot in ${hallId} names a real program (${slot.programId})`);
      assert(!housed.has(slot.programId), `${label}: ${slot.programId} is housed once (also in ${housed.get(slot.programId)})`);
      housed.set(slot.programId, hallId);
    }
  }
  // The offer (Plan 14's PR B): at most three, distinct, real, and none of
  // them housed — an offer is a claim the program can be founded now.
  assert(s.programOffers.length <= PROGRAM_OFFER_COUNT, `${label}: at most ${PROGRAM_OFFER_COUNT} offers`);
  assert(new Set(s.programOffers).size === s.programOffers.length, `${label}: offers are distinct`);
  for (const id of s.programOffers) {
    assert(programIds.has(id), `${label}: offer ${id} is a real program`);
    assert(!isHoused(s, id), `${label}: offer ${id} is not already housed`);
  }
}
{
  // A founding save (Plan 19): one hall, six slots, the three founding
  // programs in it, three rooms free, and three programs on offer of which
  // at least one the roster can staff.
  let s = fresh();
  assertHallsInvariants(s, 'founding');
  assert(Object.keys(s.halls).length === 1 && s.halls[FOUNDERS_HALL_ID]?.length === ACADEMIC_HALL_SLOTS,
    'a founding save has one hall with six slots');
  assert(FOUNDING_PROGRAMS.every((id, i) => s.halls[FOUNDERS_HALL_ID]?.[i]?.programId === id), 'the founding programs are in its first three');
  assert(s.halls[FOUNDERS_HALL_ID]?.slice(FOUNDING_PROGRAMS.length).every((slot) => slot.programId === null), 'and the rest are empty');
  assert(s.tech.find((t) => t.id === FOUNDERS_HALL_ID)?.slots === ACADEMIC_HALL_SLOTS, 'Founders Hall is seeded with six slots like every other hall');
  assert(s.programOffers.length === PROGRAM_OFFER_COUNT, `three programs are on offer at founding (got ${s.programOffers.length})`);
  assert(s.programOffers.some((id) => FOUNDING_OFFER_GUARANTEE.includes(id)), `one of them is a program the roster can staff (${s.programOffers.join(', ')})`);
  assert(startedSchools(s).size === 1 && startedSchools(s).has(programById(FOUNDING_PROGRAMS[0])!.school), 'the opening school is the one started school');
  assert(s.tech.filter((t) => t.kind === 'course' && t.status === 'done').length === 6, 'six courses are developed at founding');

  // The chain: Founders Hall standing, then thirteen halls of six, strictly
  // sequential, the first with no Buildable prereq (its gate is dynamic).
  const halls = s.tech.filter((t) => isAcademicHall(t) && t.id !== FOUNDERS_HALL_ID);
  assert(halls.length === ACADEMIC_HALL_COUNT, `the seed holds ${ACADEMIC_HALL_COUNT} academic halls beyond Founders (got ${halls.length})`);
  assert(halls.every((h) => h.slots === ACADEMIC_HALL_SLOTS), 'every academic hall has six slots');
  assert(halls.every((h) => h.status === 'locked'), 'no academic hall is buildable at founding');
  assert(halls[0].prereqs.length === 0 && milestoneForBuildable(halls[0].id) === 'curriculum' && milestoneById('curriculum')!.condition.startsWith(`${FIRST_HALL_COURSE_GATE} courses`), 'the first hall waits on the ladder\'s curriculum milestone, at the course gate');
  assert(halls.slice(1).every((h, i) => h.prereqs.length === 1 && h.prereqs[0] === halls[i].id),
    'each later hall requires exactly the hall before it');
  assert(halls.every((h, i) => i === 0 || h.cost > halls[i - 1].cost), 'each hall costs more than the one before');

  // Drive it: teach two more courses, build the first hall, and its slots
  // open empty the week it finishes — not before.
  s.finance.cash = 500_000_000;
  staffField(s, 'History');
  for (const id of ['ENGL120', 'HIST120']) s = reducer(s, { type: 'START_DEVELOPMENT', nodeId: id });
  const first = halls[0].id;
  s = advanceUntil(s, (st) => st.tech.find((t) => t.id === first)?.status === 'available', 60);
  assert(s.tech.find((t) => t.id === first)?.status === 'available', 'the first hall opens once eight courses are taught');
  assert(s.programOffers.length === PROGRAM_OFFER_COUNT, `three programs are still on offer (got ${s.programOffers.length})`);
  assertHallsInvariants(s, 'eight courses');
  assert(s.tech.find((t) => t.id === halls[1].id)?.status === 'locked', 'the second hall stays locked behind the first');
  s = reducer(s, { type: 'PLACE_BUILDABLE', buildableId: first, row: 40, col: 90, rotated: false });
  assert(s.tech.find((t) => t.id === first)?.status === 'developing', 'the first hall is under construction');
  assert(s.halls[first] === undefined, 'a hall under construction has no slots yet');
  assertHallsInvariants(s, 'hall under construction');
  s = advanceUntil(s, (st) => st.tech.find((t) => t.id === first)?.status === 'done', 260);
  assert(s.tech.find((t) => t.id === first)?.status === 'done', 'the first hall finishes');
  assert(s.halls[first]?.length === ACADEMIC_HALL_SLOTS, 'and opens with six slots');
  assert(s.halls[first]?.every((slot) => slot.programId === null), 'all of them empty');
  assert(s.tech.find((t) => t.id === halls[1].id)?.status === 'available', 'the second hall is now offered');
  assertHallsInvariants(s, 'first hall standing');

  // A tick does not touch a hall's slots or the offer: nothing writes
  // them beyond the writes above, and the three stand until one is taken.
  const before = JSON.stringify([s.halls, s.programOffers]);
  s = advanceUntil(s, () => false, 20);
  assert(JSON.stringify([s.halls, s.programOffers]) === before, 'ticking leaves the halls record and the offer alone');
}

// =====================================================================
// 10. NO LEGACY TERMINOLOGY LEAKS BACK IN
// =====================================================================
{
  // Files where an old-key string is EXPECTED to appear (migration code that
  // must read the old name to convert it, and the comments documenting it).
  const MIGRATION_FILE = join(SRC_ROOT, 'state', 'persistence.ts');

  const LEGACY_PATTERNS: Array<[RegExp, string]> = [
    [/major-complete:/, 'major-complete: (curriculum milestone key)'],
    [/major-mastered:/, 'major-mastered: (curriculum milestone key)'],
    [/school-complete:/, 'school-complete: (curriculum milestone key)'],
    [/financialAidRate/, 'financialAidRate (pre-scholarships field name)'],
    [/\bgameOver\b/, 'gameOver (removed hard-failure field)'],
  ];

  for (const [pattern, label] of LEGACY_PATTERNS) {
    const offenders: string[] = [];
    for (const [f, text] of SOURCE) {
      if (f === MIGRATION_FILE) continue; // the migration is allowed to read old names
      if (pattern.test(text)) offenders.push(relPath(f));
    }
    assert(offenders.length === 0, `no live use of ${label} outside the migration (found in: ${offenders.join(', ')})`);
  }
}

// =====================================================================
// 11. THE GENERIC INTERRUPT FALLBACK NEVER WEDGES THE CLOCK — every
// pendingInterrupt-resolving action must advance the clock, the same way
// every one of the 8 real interrupt types' own dedicated RESOLVE_* action
// does (see reducer.ts's TICK: a system that raises an interrupt mid-tick
// skips that tick's own advanceClock call to hold the week open, so
// whatever clears the interrupt has to advance it, or the next ordinary
// TICK would silently re-run that same week's systems a second time).
// RESOLVE_INTERRUPT is InterruptModal.tsx's fallback for a type its own
// switch doesn't recognise — normally unreachable, but a real bug once
// (it cleared the interrupt without advancing, which would have wedged
// the clock on that exact week forever if a future interrupt type ever
// fell through to it by accident).
// =====================================================================
{
  const s = fresh();
  const week = s.clock.week;
  const year = s.clock.year;
  // A type nothing in InterruptModal.tsx's switch recognises — PendingInterrupt.type
  // is a plain string, so this is exactly the "content drift" case its own
  // module comment describes, not a real interrupt this test is faking.
  s.pendingInterrupt = { type: 'test-unrecognised-interrupt' };
  const resolved = reducer(s, { type: 'RESOLVE_INTERRUPT' });
  assert(resolved.pendingInterrupt === null, 'RESOLVE_INTERRUPT clears pendingInterrupt');
  const advanced = resolved.clock.year > year || (resolved.clock.year === year && resolved.clock.week > week);
  assert(advanced, `RESOLVE_INTERRUPT advances the clock (was Y${year}W${week}, now Y${resolved.clock.year}W${resolved.clock.week})`);
}

// =====================================================================
// THE TWO FACULTY-CAPACITY GATES MUST AGREE.
//
// There are two ways to ask "can this course be staffed", and they are
// asked by different callers at different moments:
//
//   - FIELD level. hasFreeFacultySlot: does this department have a free
//     slot anywhere? Asked by the cell's blocked/available state and by
//     canStartDevelopment when no specific person has been chosen yet.
//   - PERSON level. eligibleInstructors: is there somebody who can
//     actually take it? Asked the moment the player opens the picker.
//
// If these ever disagree, the game shows a course as startable and then
// offers an empty list of people to start it with — a dead end with no
// explanation, which is precisely the failure this whole change exists to
// remove. They agree because the two sums are the same sum: a field's used
// slots is its assigned offered courses, and that is exactly the total of
// its members' individual loads, since an assignment is always in-field.
// This pins that down, because the coupling is invisible in the types and
// easy to break by "optimizing" either counter alone.
// =====================================================================
{
  const s = fresh();
  // Offer some courses so the counters have something to count, taking
  // whoever the engine picks — the auto-pick path, which is what a
  // headless caller uses.
  let state = s;
  for (const node of state.tech.filter((t) => t.kind === 'course' && t.status === 'available').slice(0, 6)) {
    state = reducer(state, { type: 'START_DEVELOPMENT', nodeId: node.id });
  }

  const fields = [...new Set(state.tech.map((t) => t.requiresFaculty).filter((f): f is string => !!f))];
  let offered = 0;
  for (const field of fields) {
    const used = usedFacultySlots(state, field);
    const loadSum = state.faculty
      .filter((f) => f.field === field)
      .reduce((sum, f) => sum + facultyLoad(state, f.id), 0);
    // Field usage counts every OFFERED course; the members' loads count
    // only the ones somebody is actually teaching. So loads can never
    // exceed usage, and the gap between them IS the unstaffed count —
    // courses the school still owes and has nobody for.
    assert(
      loadSum <= used,
      `a field's assigned loads never exceed its offered courses (${field}: ${loadSum} vs ${used})`,
    );

    // The gates themselves: a free slot in the field must mean a real
    // person who can take one more.
    if (hasFreeFacultySlot(state, field)) {
      const anyCourse = state.tech.find((t) => t.requiresFaculty === field);
      if (anyCourse) {
        assert(
          eligibleInstructors(state, anyCourse).length > 0,
          `a free slot in ${field} means somebody is actually eligible to teach in it`,
        );
      }
    }
  }

  // Nobody is over their own ceiling on a state the engine itself built.
  for (const f of state.faculty) {
    assert(
      facultyLoad(state, f.id) <= f.courseSlots,
      `${f.name} is not assigned beyond their own course slots`,
    );
  }

  // Every offered course the engine started has a real, in-field
  // instructor: startDevelopment writes the assignment in the same
  // transaction, so a developing course is never without a teacher.
  for (const t of state.tech) {
    if (t.status !== 'developing' && t.status !== 'done') continue;
    if (!t.requiresFaculty) continue;
    offered += 1;
    const holder = state.faculty.find((f) => f.id === state.courseFaculty[t.id]);
    assert(holder !== undefined, `${t.id} has an instructor on the roster`);
    assert(holder === undefined || holder.field === t.requiresFaculty, `${t.id}'s instructor is in its own field`);
  }
  assert(offered > 0, 'the capacity sweep actually exercised some offered courses');
}

// =====================================================================
// DISMISSAL ORPHANS, AND HANDS THE CAPACITY BACK.
// The two halves of one event (see the reducer's FIRE_FACULTY): the
// courses lose their teacher AND the department gets its slots back, so a
// replacement can take the orphans straight over rather than finding the
// field still full of someone who no longer works here.
// =====================================================================
{
  let state = fresh();
  // A founding professor with an open course in their field and a slot to
  // teach it: Bennett, whose third slot is the roster's one spare among
  // the founding programs (see actions.ts).
  const victim = state.faculty.find((f) => state.tech.some((t) => t.requiresFaculty === f.field && t.status === 'available') && hasFreeSlot(state, f))!;
  const theirCourse = state.tech.find((t) => t.requiresFaculty === victim.field && t.status === 'available');
  assert(theirCourse !== undefined, 'the dismissal sweep found a course in the target field');
  if (theirCourse) {
    state = reducer(state, { type: 'START_DEVELOPMENT', nodeId: theirCourse.id, facultyId: victim.id });
    assert(state.courseFaculty[theirCourse.id] === victim.id, 'the chosen instructor is the one recorded');
    const usedBefore = usedFacultySlots(state, victim.field);

    state = reducer(state, { type: 'FIRE_FACULTY', facultyId: victim.id });
    assert(state.courseFaculty[theirCourse.id] === undefined, 'dismissal clears their course assignments');
    assert(
      isUnstaffed(state, state.tech.find((t) => t.id === theirCourse.id)!),
      'the orphaned course reads as unstaffed',
    );
    // The capacity does NOT come back: the course is still offered and
    // still needs teaching, which is exactly what the school no longer has
    // anyone to do. Letting it come back would make dismissal a way to buy
    // room for more courses (see usedFacultySlots).
    assert(
      usedFacultySlots(state, victim.field) === usedBefore,
      'an orphaned course keeps holding its field slot after the dismissal',
    );
    // But re-staffing it is still possible, because eligibility is a
    // PER-PERSON check: a replacement with a free slot can take it over.
    const replacement = state.faculty.find((f) => f.field === victim.field && hasFreeSlot(state, f));
    if (replacement) {
      const restaffed = reducer(state, {
        type: 'REASSIGN_COURSE_FACULTY', courseId: theirCourse.id, facultyId: replacement.id,
      });
      assert(
        restaffed.courseFaculty[theirCourse.id] === replacement.id,
        'an orphaned course can still be given to someone with room',
      );
    }
  }
}

// =====================================================================
// 13. A STANDING'S BREAKDOWN IS THE SUM ITS TARGET IS COMPUTED FROM
//
// prestigeBreakdown / researchStandingBreakdown / socialStandingBreakdown
// are what the History tab's Standing panel renders, and each target
// function is a sum over its own breakdown (see prestigeSystem.ts). This
// asserts the identity that makes that safe: baseline plus every
// contribution IS the target, so a panel reading the breakdown can never
// print a set of rows that disagrees with the number beside them.
//
// Checked on three states, because the interesting terms are the clamped
// ones: a founding school (several inputs at zero, one multiplier on its
// floor), the same school given an endowment and a full research record
// (inputs at their caps, and a target that clamps), and the same school
// with nothing but a vast student body (the scale multiplier at 1, the
// library multiplier on its floor). test/balance-scorecard's own year-20
// states are covered by the sim harness; this is the cheap structural half.
// =====================================================================
{
  const founding = fresh();

  const rich = fresh();
  rich.finance.endowment = 50_000_000_000;
  rich.research.publications = 400;
  rich.research.breakthroughs = 90;
  rich.research.prizes = 20;
  rich.orgs.titles = Array.from({ length: 30 }, (_, i) => ({
    year: i + 1, sport: 'basketball-m', champion: 'Invariants', championMascot: 'Owls',
  }));
  for (const key of Object.keys(rich.milestones)) rich.milestones[key] = true;

  const crowded = fresh();
  crowded.students.classes = { freshman: 90_000, sophomore: 80_000, junior: 70_000, senior: 60_000 };

  for (const [label, state] of [['founding', founding], ['saturated', rich], ['crowded', crowded]] as const) {
    for (const [name, made, target] of [
      ['academic', prestigeBreakdown(state), computePrestigeTarget(state)],
      ['research', researchStandingBreakdown(state), computeResearchTarget(state)],
      ['campus life', socialStandingBreakdown(state), computeSocialTarget(state)],
    ] as const) {
      const summed = made.inputs.reduce((total, input) => total + input.contribution, made.baseline);
      // The target CLAMPS, and the saturated state is there precisely to
      // reach the clamp — so the identity is "the sum, clamped", not "the
      // sum". Both halves are asserted: every contribution is also its own
      // weight x score x multiplier, so a row cannot quietly report a
      // contribution it did not make.
      const clamped = Math.max(made.min, Math.min(made.max, summed));
      assert(
        Math.abs(clamped - target) < 1e-9,
        `${name} breakdown sums to its own target on a ${label} school (${clamped.toFixed(4)} vs ${target.toFixed(4)})`,
      );
      assert(
        Math.abs(made.target - target) < 1e-9,
        `${name} breakdown's own target matches the target function on a ${label} school`,
      );
      const rowsHonest = made.inputs.every(
        (input) => Math.abs(input.contribution - (input.penalty ? -1 : 1) * input.weight * input.score * (input.multiplier?.value ?? 1)) < 1e-9,
      );
      assert(rowsHonest, `${name} breakdown's rows each contribute weight x score x multiplier (negated for a penalty) on a ${label} school`);
      const clampedScores = made.inputs.every((input) => input.score >= 0 && input.score <= 1);
      assert(clampedScores, `${name} breakdown's inputs are all normalised to 0..1 on a ${label} school`);
      // READINGS COUNT FOR NOTHING (Plan 15's PR A): the sum above is over
      // `inputs` alone, and a reading's key is never also an input's, so a
      // term cannot be counted under one name and shown under another.
      const inputKeys = new Set(made.inputs.map((input) => input.key));
      assert(
        made.readings.every((item) => !inputKeys.has(item.key)),
        `${name} breakdown's readings are not also inputs on a ${label} school`,
      );
      assert(
        made.readings.every((item) => item.score >= 0 && item.score <= 1 && Math.abs(item.reach - (item.weight ?? 0) * item.score) < 1e-9),
        `${name} breakdown's readings are normalised to 0..1 and reach weight x score on a ${label} school`,
      );
    }
  }
}

console.log('spec-conformance invariant sweep (PR H)');
if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
