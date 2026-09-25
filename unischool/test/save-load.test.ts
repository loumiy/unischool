// ---------------------------------------------------------------------
// Save/load test harness (see docs/architecture/game-state.md). Runs the
// REAL loadGame path — parse -> version check -> looksLikeGameState ->
// sanitizers — against an in-memory localStorage, so the code under test
// is the code that ships, not a reimplementation.
//
// This file was test/save-migrations.test.ts and covered a v3 -> v51
// migration chain, twenty fixtures deep. Plan 14's first PR deleted the
// chain (see the policy note above SAVE_VERSION in src/state/persistence.ts),
// and the fixtures went with it. What is worth keeping either way is here:
// a current-version save round-trips, each sanitizer does its one job, and
// — the LAST case, the one that makes discarding safe — a save at any other
// version loads as null rather than half-loading.
//
// Like sim/balanceSim.ts, this is NOT part of the game: nothing imports it,
// it ships nothing into the bundle.
//
//   npm test
// ---------------------------------------------------------------------

import { discardSetAsideSave, readSetAsideSave } from '../src/state/persistence';
import { createInitialState } from '../src/state/actions';
import { loadGame, saveGame, clearSave, SAVE_KEY, SAVE_VERSION } from '../src/state/persistence';
import { FOUNDERS_HALL_ID } from '../src/data/techData';
import { FOUNDING_PROGRAMS } from '../src/data/foundingData';
import type { GameState } from '../src/state/types';

// In-memory localStorage so the persistence module works under Node. Assigned
// before any loadGame/saveGame call (module imports run first, but nothing in
// persistence touches localStorage at import time).
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
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

// A GameState with arbitrary extra/removed keys — how a hand-edited or
// corrupt save looks. Used only to build fixtures; the real code never sees
// this type.
type Loose = Record<string, unknown>;

function writeSave(version: number, state: unknown): void {
  store.set(SAVE_KEY, JSON.stringify({ version, savedAt: Date.now(), state }));
}

// ---- Test: the one-off carry from version 74 (Plan 51's graduate schools) ----
function testGraduateCarry(): void {
  clearSave();
  const cur = createInitialState('Carry');
  // The same run as version 74 wrote it: the Performing Arts Center in the
  // catalog and in Music's capstone prereqs, no Law School, the Arts Center
  // standing without slots, and the MFA housed in Founders Hall.
  const old = JSON.parse(JSON.stringify(cur)) as GameState;
  const gallery = old.tech.find((t) => t.id === 'ART-GALLERY')!;
  old.tech.push({ ...gallery, id: 'ARTS-PAC', name: 'Performing Arts Center' });
  const capstone = old.tech.find((t) => t.id === 'MUSC210')!;
  capstone.prereqs = [...capstone.prereqs, 'ARTS-PAC'];
  old.tech = old.tech.filter((t) => t.id !== 'PROJ-LAW');
  const arts = old.tech.find((t) => t.id === 'PROJ-ARTS')!;
  arts.status = 'done';
  delete arts.slots;
  old.placements['PROJ-ARTS'] = { row: 5, col: 5, w: 11, h: 9 };
  const founders = old.halls[FOUNDERS_HALL_ID];
  const free = founders.findIndex((slot) => slot.programId === null);
  founders[free] = { programId: 'MFAX' };
  store.set(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION - 1, savedAt: Date.now(), state: old }));
  const back = loadGame();
  assert(back !== null, 'a version-74 save loads');
  if (!back) return;
  assert(!back.tech.some((t) => t.id === 'ARTS-PAC') && !back.tech.find((t) => t.id === 'MUSC210')!.prereqs.includes('ARTS-PAC'), 'without the Performing Arts Center, even in a prerequisite');
  assert(back.tech.some((t) => t.id === 'PROJ-LAW'), 'with the Law School in the catalog');
  assert(back.halls['PROJ-ARTS']?.[0]?.programId === 'MFAX' && !back.halls[FOUNDERS_HALL_ID].some((slot) => slot.programId === 'MFAX'), 'and the MFA moved into the Arts Center');
}

// ---- Test: the catalog's text reaches a saved run (Plan 46) ----
function testAuthoredText(): void {
  clearSave();
  const cur = createInitialState('Text');
  const course = cur.tech.find((t) => t.kind === 'course')!;
  const hall = cur.tech.find((t) => t.kind === 'building')!;
  const courseName = course.name;
  const hallDescription = hall.description;
  course.name = 'An old title';
  course.description = 'An old description';
  hall.name = 'The Donor Hall';
  hall.description = 'An old description';
  saveGame(cur);
  const back = loadGame()!;
  assert(back.tech.find((t) => t.id === course.id)!.name === courseName, "a course's corrected title reaches the saved run");
  assert(back.tech.find((t) => t.id === hall.id)!.description === hallDescription, 'and every corrected description');
  assert(back.tech.find((t) => t.id === hall.id)!.name === 'The Donor Hall', "but a building's name, which naming rights can change, is kept");
}

// ---- Test: a current-version save round-trips ----
function testRoundTrip(): void {
  clearSave();
  const cur = createInitialState('RoundTrip');
  assert(saveGame(cur), 'saveGame reports success');
  const loaded = loadGame();
  assert(loaded !== null, 'current-version save loads');
  if (!loaded) return;
  assert(loaded.self.name === 'RoundTrip', 'name survives round trip');
  assert(loaded.self.reputation === cur.self.reputation, 'founding prestige survives round trip');
  assert(
    loaded.self.colors.primary === cur.self.colors.primary && loaded.self.colors.secondary === cur.self.colors.secondary,
    'the school colors survive round trip',
  );
  assert(
    JSON.stringify(loaded.students.classes) === JSON.stringify(cur.students.classes),
    'founding class mix survives round trip',
  );
  assert(loaded.finance.listedTuition === cur.finance.listedTuition, 'listed tuition survives round trip');
  assert(
    JSON.stringify(loaded.halls) === JSON.stringify(cur.halls),
    'the halls record survives round trip — Founders Hall, six slots, the founding programs in three of them',
  );
}

// ---- Test: a freshly-founded school starts with no alert badges ----
// createInitialState (state/actions.ts) pre-seeds `seen` from the school's
// own founding content — the founding college's courses and the founding
// buildables (starting dorm, dining hall, Founders Hall, the seeded-
// 'available' facility chains) are unlocked from turn one, so they must
// never read as "new" the instant the player opens Curriculum or Build.
function testFoundingSeenExcludesStartingContent(): void {
  const fresh = createInitialState('Fresh Start');

  const visibleCourses = fresh.tech.filter((t) => t.kind === 'course' && t.status !== 'locked');
  assert(visibleCourses.length > 0, 'a founding school has at least one visible course (the founding programs\')');
  for (const t of visibleCourses) {
    assert(fresh.seen.courseIds[t.id] === true, `founding course ${t.id} is pre-seeded seen (no badge on day one)`);
  }

  const visibleBuildables = fresh.tech.filter((t) => t.kind !== 'course' && t.status !== 'locked');
  assert(visibleBuildables.length > 0, 'a founding school has at least one visible buildable');
  for (const t of visibleBuildables) {
    if (t.kind === 'dorm' || t.kind === 'building' || t.kind === 'facility') {
      assert(fresh.seen.buildableIds[t.id] === true, `founding buildable ${t.id} is pre-seeded seen (no badge on day one)`);
    }
  }
}

// ---- Test: stale course -> instructor entries are dropped on load ----
function testCourseFacultySanitizer(): void {
  const base = createInitialState('Sanitizer');
  const state = JSON.parse(JSON.stringify(base)) as Loose;
  const tech = state.tech as Array<Record<string, unknown>>;
  tech.find((n) => n.id === 'ENGL120')!.status = 'done';

  state.courseFaculty = {
    'ENGL120': 'f3',            // real course, real professor: kept
    'HIST120': 'nobody-at-all', // real course, departed professor: dropped
    'NO-SUCH-COURSE': 'f3',     // course that does not exist: dropped
  };
  writeSave(SAVE_VERSION, state);

  const loaded = loadGame();
  assert(loaded !== null, 'a save with stale assignments still loads');
  if (!loaded) return;
  assert(loaded.courseFaculty['ENGL120'] === 'f3', 'a valid assignment survives sanitizing');
  assert(loaded.courseFaculty['HIST120'] === undefined, 'an assignment to someone off the roster is dropped');
  assert(loaded.courseFaculty['NO-SUCH-COURSE'] === undefined, 'an assignment to a course that does not exist is dropped');
}

// ---- Test: a chapter's letters, filled in on load ----
//
// GreekChapter.glyphs is filled in by persistence.ts's sanitizeChapters
// rather than by a version bump, because there is nothing to transform: a
// chapter has always been NAMED out of the Greek alphabet, so the letters
// are the same name written the way a building writes it. What is worth
// pinning is that a save without the field loads with the letters present
// — the campus map reads them straight off the chapter, and an undefined
// here is an empty pediment on every chapter house the player has built.
function testChapterGlyphs(): void {
  const base = createInitialState('Hellenic');
  const state = JSON.parse(JSON.stringify(base)) as Loose;
  const orgs = state.orgs as Record<string, unknown>;
  orgs.chapters = [
    // A chapter with no `glyphs` at all.
    {
      id: 'c1', name: 'Alpha Beta Gamma', kind: 'fraternity', foundedYear: 3,
      foundingMembers: 18, foundingEnrolled: 900, upkeepPerWeek: 1200,
      members: 40, housed: true, housingAsked: true,
    },
    {
      id: 'c2', name: 'Delta Sigma Phi', kind: 'sorority', foundedYear: 5,
      foundingMembers: 22, foundingEnrolled: 1400, upkeepPerWeek: 1400,
      members: 51, housed: false, housingAsked: false,
    },
    // A hand-edited name that is not three Greek words at all.
    {
      id: 'c3', name: 'The Tuesday Club', kind: 'fraternity', foundedYear: 6,
      foundingMembers: 9, foundingEnrolled: 1500, upkeepPerWeek: 900,
      members: 12, housed: false, housingAsked: true,
    },
  ];
  writeSave(SAVE_VERSION, state);

  const loaded = loadGame();
  assert(loaded !== null, 'a save whose chapters lack letters still loads');
  if (!loaded) return;
  const by = (id: string) => loaded.orgs.chapters.find((c) => c.id === id)!;
  assert(by('c1').glyphs === 'ΑΒΓ', `Alpha Beta Gamma comes back as ΑΒΓ (got ${by('c1').glyphs})`);
  assert(by('c2').glyphs === 'ΔΣΦ', `Delta Sigma Phi comes back as ΔΣΦ (got ${by('c2').glyphs})`);
  assert(
    by('c3').glyphs === '',
    'and a name that is not Greek letters comes back empty rather than wrong — an empty pediment beats a made-up one',
  );

  // A chapter that already carries its letters is left alone, which is what
  // makes this safe to run on every load rather than once.
  const again = JSON.parse(JSON.stringify(loaded)) as Loose;
  (again.orgs as { chapters: Array<{ glyphs: string }> }).chapters[0].glyphs = 'ΩΩΩ';
  writeSave(SAVE_VERSION, again);
  assert(loadGame()!.orgs.chapters[0].glyphs === 'ΩΩΩ', 'a chapter that already has letters keeps them');
}

// ---- Test: the halls record is kept honest on load ----
//
// `halls` is the one side record systems read (see types.ts's HallSlot),
// so persistence.ts's sanitizeHalls holds it to the same three rules the
// invariant sweep asserts of a live state: every entry is a standing,
// placed hall; every entry has exactly its hall's `slots`; and every
// housed program is a real program, housed once.
function testHallsSanitizer(): void {
  const base = createInitialState('Halls');
  const state = JSON.parse(JSON.stringify(base)) as Loose;
  const tech = state.tech as Array<Record<string, unknown>>;
  const node = (id: string) => tech.find((n) => n.id === id)!;

  // HALL-01 stands and is placed; HALL-02 is placed but still going up;
  // HALL-03 is not even started.
  node('HALL-01').status = 'done';
  node('HALL-02').status = 'developing';
  (state.placements as Loose)['HALL-01'] = { row: 10, col: 10, w: 7, h: 5 };
  (state.placements as Loose)['HALL-02'] = { row: 20, col: 10, w: 7, h: 5 };
  (state.developing as Loose)['HALL-02'] = 10;

  state.halls = {
    // Founders Hall as seeded, with a non-string fourth slot and a
    // seventh entry to trim.
    [FOUNDERS_HALL_ID]: [...FOUNDING_PROGRAMS.map((programId) => ({ programId })), { programId: 42 }, { programId: null }, { programId: null }, { programId: 'ACCT' }],
    // A standing hall: four slots where six belong, one bad id, one
    // program housed a second time, one real program.
    'HALL-01': [{ programId: 'MECH' }, { programId: 'NOT-A-PROGRAM' }, { programId: 'MECH' }, { programId: 42 }],
    // Under construction: no slots yet, whatever the save says.
    'HALL-02': [{ programId: 'FINA' }],
    // Not started: dropped.
    'HALL-03': [{ programId: 'ACCT' }],
    // Not a hall at all.
    'DORM-01': [{ programId: 'ECON' }],
  };
  writeSave(SAVE_VERSION, state);

  const loaded = loadGame();
  assert(loaded !== null, 'a save with a bad halls record still loads');
  if (!loaded) return;
  assert(
    JSON.stringify(Object.keys(loaded.halls).sort()) === JSON.stringify([FOUNDERS_HALL_ID, 'HALL-01'].sort()),
    `only standing, placed halls keep an entry (got ${Object.keys(loaded.halls).join(', ')})`,
  );
  assert(loaded.halls[FOUNDERS_HALL_ID].length === 6, 'Founders Hall is trimmed to its six slots');
  assert(FOUNDING_PROGRAMS.every((id, i) => loaded.halls[FOUNDERS_HALL_ID][i].programId === id), 'and the founding programs are still in it');
  assert(loaded.halls[FOUNDERS_HALL_ID].slice(3).every((slot) => slot.programId === null), 'with its bad fourth slot emptied and the rest empty');
  const hall = loaded.halls['HALL-01'];
  assert(hall.length === 6, `a standing hall is padded to its six slots (got ${hall.length})`);
  assert(hall[0].programId === 'MECH', 'a real program in slot 1 is kept');
  assert(hall[1].programId === null, 'an unknown program id becomes an empty slot');
  assert(hall[2].programId === null, 'a program already housed elsewhere is not housed twice');
  assert(hall[3].programId === null, 'a non-string program id becomes an empty slot');
  assert(hall.slice(4).every((slot) => slot.programId === null), 'the padded slots are empty');

  // The offer beside it: an offer names a program that can be founded now,
  // so a housed one, an unknown one, a duplicate, and a fourth are all
  // dropped — and nothing is drawn to replace them at load.
  (state.halls as Loose)['HALL-01'] = [{ programId: 'MECH' }, { programId: null }, { programId: null }, { programId: null }, { programId: null }, { programId: null }];
  state.programOffers = ['MECH', 'FINA', 'NOT-A-PROGRAM', 'FINA', 'ACCT', 'MGMT', 'MRKT'];
  writeSave(SAVE_VERSION, state);
  const withOffers = loadGame();
  assert(withOffers !== null, 'a save with a bad offer still loads');
  if (withOffers) {
    assert(
      JSON.stringify(withOffers.programOffers) === JSON.stringify(['FINA', 'ACCT', 'MGMT']),
      `the offer keeps only founding-ready, distinct programs, at most three (got ${withOffers.programOffers.join(', ')})`,
    );
  }

  // A missing record altogether: the sanitizer rebuilds only what the save
  // can prove, and a payload with no halls at all is not a GameState.
  delete state.halls;
  writeSave(SAVE_VERSION, state);
  assert(loadGame() === null, 'a save with no halls record at all is not a GameState and loads as null');
}

// ---- Test: anything but the current version is a new game ----
function testRejects(): void {
  const cur = createInitialState('Reject');

  // The version before this one: real content, but a shape this build does
  // not carry forward. Null, never half-loaded.
  writeSave(SAVE_VERSION - 2, cur);
  assert(loadGame() === null, 'two versions back -> null (no migration chain)');
  // ...but set aside, not lost: the title screen names it (Plan 46).
  const aside = readSetAsideSave();
  assert(aside !== null && aside.version === SAVE_VERSION - 2, 'and the unreadable run is kept aside for the title screen to name');
  discardSetAsideSave();
  assert(readSetAsideSave() === null, 'until the player discards it');

  // A version from the future.
  writeSave(SAVE_VERSION + 1, cur);
  assert(loadGame() === null, 'a newer version -> null');

  // The oldest possible.
  writeSave(1, { started: true });
  assert(loadGame() === null, 'v1 -> null');

  // Not a GameState at all.
  writeSave(SAVE_VERSION, { started: true });
  assert(loadGame() === null, 'payload that is not a GameState -> null');

  // Not even JSON.
  store.set(SAVE_KEY, 'not json at all');
  assert(loadGame() === null, 'unparseable save -> null');

  // Nothing stored.
  clearSave();
  assert(loadGame() === null, 'absent save -> null');
}

console.log(`save/load tests (SAVE_VERSION ${SAVE_VERSION})`);
testRoundTrip();
testAuthoredText();
testGraduateCarry();
testFoundingSeenExcludesStartingContent();
testCourseFacultySanitizer();
testChapterGlyphs();
testHallsSanitizer();
testRejects();

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
