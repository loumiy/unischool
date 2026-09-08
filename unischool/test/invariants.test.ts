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
import { initialTech } from '../src/data/techData';
import { weeklyResearchPoints } from '../src/data/researchData';
import { findDecisionEvent, type DecisionEventContext } from '../src/data/eventData';
import { totalEnrolled } from '../src/state/types';
import type { GameState, OrgPetition } from '../src/state/types';

let seed = 12345;
Math.random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
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
  return createInitialState('Invariants', 'private');
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
    nationality: 'United States', flag: '🇺🇸', bio: 'A test fixture, not a character.', gender: 'male',
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
      if (type === 'admissions') {
        s = reducer(s, {
          type: 'RESOLVE_ADMISSIONS',
          tuition: s.finance.tuitionPerStudent,
          scholarshipRate: s.admissions.scholarshipRate,
          approvedPetitionIds: [],
        });
      } else if (type === 'milestone') {
        s = reducer(s, { type: 'RESOLVE_MILESTONE' });
      } else if (type === 'research-prize') {
        s = reducer(s, { type: 'RESOLVE_PRIZE' });
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
// 2. INSTITUTION, NOT STUDENTS — exactly four aggregate cohorts, no list
// =====================================================================
{
  const s = fresh();
  const cohortKeys = Object.keys(s.students.cohorts).sort();
  assert(
    JSON.stringify(cohortKeys) === JSON.stringify(['freshman', 'junior', 'senior', 'sophomore']),
    'students.cohorts has exactly the four class-year keys',
  );
  for (const v of Object.values(s.students.cohorts)) {
    assert(typeof v === 'number', 'every cohort is a plain count, not a list of individuals');
  }
  // A founded college opens with all four class years present and BALANCED
  // (each cohort within one student of the others), sized to FOUNDING_BODY —
  // the steady state that de-lumps the early admissions cycles. See
  // actions.ts's createInitialState / FOUNDING_COHORTS in schoolTypeData.ts.
  const fc = s.students.cohorts;
  assert(fc.freshman > 0 && fc.sophomore > 0 && fc.junior > 0 && fc.senior > 0,
    'founding body has all four cohorts populated, not freshmen only');
  const counts = [fc.freshman, fc.sophomore, fc.junior, fc.senior];
  assert(Math.max(...counts) - Math.min(...counts) <= 1,
    'founding cohorts are balanced (within one student of each other)');
  assert(totalEnrolled(s.students) === fc.freshman + fc.sophomore + fc.junior + fc.senior,
    'founding total equals the sum of the four cohorts');
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
  for (const c of availableCourses.slice(0, 3)) {
    s = reducer(s, { type: 'START_DEVELOPMENT', nodeId: c.id });
  }
  const developingCount = availableCourses.slice(0, 3)
    .filter((c) => s.tech.find((t) => t.id === c.id)?.status === 'developing').length;
  assert(developingCount === 3, 'three simultaneous developments all start — no development-slot cap exists');
}

// =====================================================================
// 4. PLACEMENT IS COSMETIC — no system reads placements/pathways
// =====================================================================
{
  const systemFiles = ALL_SRC_FILES.filter((f) => relPath(f).startsWith(`systems${'/'}`));
  const offenders: string[] = [];
  for (const f of systemFiles) {
    const text = SOURCE.get(f)!;
    if (/\.placements\b|\.pathways\b/.test(text)) offenders.push(relPath(f));
  }
  assert(offenders.length === 0, `no tick system reads placements/pathways (found in: ${offenders.join(', ')})`);
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

  // Rank is a measurement OF prestige, never an input TO it: the prestige
  // module must never read the rivals module's rank function.
  const prestigeText = SOURCE.get(join(SRC_ROOT, 'systems', 'prestige', 'prestigeSystem.ts'))!;
  assert(!/playerRank/.test(prestigeText), 'prestigeSystem.ts never reads playerRank (rankings cannot feed prestige)');
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
// 7. RIGID CURRICULUM GATING — gen-ed -> T1 -> building -> T2 -> T3
// =====================================================================
{
  const tech = initialTech();
  const byId = new Map(tech.map((t) => [t.id, t]));

  const t1 = byId.get('FINA101')!;
  assert(t1.prereqs.length === 6 && t1.prereqs.every((p) => p.startsWith('GE1')),
    'a T1 course requires the entire gen-ed core, nothing else');

  const building = byId.get('BLDG-BUSINESS')!;
  assert(
    building.prereqs.length > 0 && building.prereqs.every((p) => p.endsWith('101')),
    'a school building requires every one of that school\'s T1 courses',
  );

  const t2 = byId.get('FINA110')!;
  assert(
    t2.prereqs.includes('FINA101') && t2.prereqs.includes('BLDG-BUSINESS'),
    'a T2 course requires its own T1 course AND the school building',
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

  assert(isLocked('FINA101'), 'FINA101 starts locked (gen-ed not yet done)');
  assert(isLocked('BLDG-BUSINESS'), 'BLDG-BUSINESS starts locked');
  assert(isLocked('FINA110'), 'FINA110 starts locked');

  // Finish the gen-ed core.
  for (const id of ['GE110', 'GE120', 'GE130', 'GE140', 'GE150', 'GE160']) {
    s = reducer(s, { type: 'START_DEVELOPMENT', nodeId: id });
  }
  s = advanceUntil(s, (st) => isAvailIn(st, 'FINA101'), 60);
  assert(isAvail('FINA101'), 'FINA101 opens once the entire gen-ed core is done');
  assert(isLocked('BLDG-BUSINESS'), 'BLDG-BUSINESS stays locked — T1 courses not done yet');

  // Staff every field the Business school's T1 courses require — none of
  // them overlap the five founding hires' fields (Physics/History/English/
  // Mathematics/Philosophy) — then finish every T1 course the building needs.
  for (const id of building.prereqs) {
    const field = s.tech.find((t) => t.id === id)?.requiresFaculty;
    if (field) staffField(s, field);
  }
  for (const id of building.prereqs) {
    if (s.tech.find((t) => t.id === id)?.status === 'available') {
      s = reducer(s, { type: 'START_DEVELOPMENT', nodeId: id });
    }
  }
  s = advanceUntil(s, (st) => isAvailIn(st, 'BLDG-BUSINESS'), 80);
  assert(isAvail('BLDG-BUSINESS'), 'BLDG-BUSINESS opens once every Business T1 course is done');
  assert(isLocked('FINA110'), 'FINA110 stays locked — the building is not built yet');

  // Build it.
  s = reducer(s, {
    type: 'PLACE_BUILDABLE', buildableId: 'BLDG-BUSINESS', row: 40, col: 90, rotated: false,
  });
  s = advanceUntil(s, (st) => isAvailIn(st, 'FINA110'), 260);
  assert(isAvail('FINA110'), 'FINA110 opens once the school building is done');
  assert(isLocked('FINA210'), 'FINA210 (T3) stays locked — the T2 quartet is not done yet');

  // Finish the T2 quartet and confirm T3 + the program-established milestone.
  // FINA140 carries an authored cross-major bridge prereq onto ECON110 —
  // DONE, not just started (see README's "prereqs may cross majors and cross
  // kinds" and techData.ts's cross-major bridge table: real curriculum
  // texture, not a test wrinkle to route around) — so it needs its own
  // completed-first stage before FINA140 is even available to start.
  for (const id of ['FINA110', 'FINA120', 'FINA130', 'ECON110']) {
    s = reducer(s, { type: 'START_DEVELOPMENT', nodeId: id });
  }
  s = advanceUntil(s, (st) => isAvailIn(st, 'FINA140'), 40);
  assert(isAvail('FINA140'), 'FINA140 opens once its cross-major bridge prereq (ECON110) is done, on top of its own chain');
  s = reducer(s, { type: 'START_DEVELOPMENT', nodeId: 'FINA140' });
  s = advanceUntil(s, (st) => isAvailIn(st, 'FINA210'), 40);
  assert(isAvail('FINA210'), 'FINA210 opens once the whole T2 quartet is done');
  assert(s.milestones['program-established:FINA'] === true, 'program-established fires exactly when the T2 quartet completes');
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
  s.pendingInterrupt = { type: 'admissions', payload: { tuition: s.finance.tuitionPerStudent, scholarshipRate: 0 } };

  // Decline it explicitly (approvedPetitionIds does not include it).
  const s1 = reducer(s, {
    type: 'RESOLVE_ADMISSIONS', tuition: s.finance.tuitionPerStudent, scholarshipRate: 0, approvedPetitionIds: [],
  });
  assert(s1.orgs.pendingPetitions.length === 0, 'the petition queue is empty after resolving — nothing carries over');
  assert(!s1.orgs.clubs.some((c) => c.id === 'test-petition'), 'a declined petition never becomes a live club');
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

console.log('spec-conformance invariant sweep (PR H)');
if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
