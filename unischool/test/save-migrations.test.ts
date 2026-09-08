// ---------------------------------------------------------------------
// Save-migration test harness (see README's "Save / load" and the alignment
// roadmap). The whole point of the migration chain is that a run started
// under an old build survives forward untouched in meaning, so the thing
// worth testing is exactly that: seed a payload at an OLD SAVE_VERSION in the
// old shape, run the REAL loadGame path (parse -> looksLikeGameState ->
// MIGRATIONS -> sanitizers), and assert the result is the current shape with
// its meaning intact.
//
// Like sim/balanceSim.ts, this is NOT part of the game: nothing imports it,
// it ships nothing into the bundle. It runs the actual persistence module
// against an in-memory localStorage so the code under test is the code that
// ships, not a reimplementation.
//
//   npm test
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { loadGame, saveGame, clearSave, SAVE_KEY, SAVE_VERSION } from '../src/state/persistence';
import { sportById } from '../src/data/studentLifeData';

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

// A GameState with arbitrary extra/removed keys — how an OLD-shape save looks
// before migration. Used only to build fixtures; the real code never sees this
// type.
type Loose = Record<string, unknown>;

function writeSave(version: number, state: unknown): void {
  store.set(SAVE_KEY, JSON.stringify({ version, savedAt: Date.now(), state }));
}

// Build a v18-shaped save by taking a real current-shape state (so every
// slice a sanitizer touches is valid) and DOWNGRADING the few fields the
// v18->v21 migrations touch back to their old shape.
function makeV18Save(): void {
  const base = createInitialState('Migrator', 'private');
  const state = JSON.parse(JSON.stringify(base)) as Loose;

  // Old milestone keys (pre-PR-C curriculum terminology).
  state.milestones = {
    'major-complete:BIOL': true,
    'major-mastered:BIOL': true,
    'school-complete:Science': true,
    'grad-program-complete:MBAX': true,
  };
  // Old student body: a single enrolled scalar, no cohorts, no satisfaction
  // accumulator (pre-PR-D).
  state.students = {
    enrolled: 800,
    capacity: 1000,
    satisfaction: 66,
    satisfactionBreakdown: (base.students as unknown as Loose).satisfactionBreakdown,
    applicantPool: 1000,
    admitRate: 0.5,
    incomingQuality: 55,
  };
  // Old admissions policy field name (pre-scholarships rename).
  state.admissions = { financialAidRate: 0.3 };
  // Old history row field name.
  state.history = [
    { year: 1, prestige: 40, rank: 5, enrolled: 800, cash: 1000, coursesDone: 3, majorsComplete: 2, satisfaction: 66 },
  ];

  writeSave(18, state);
}

// ---- Test: a v18 save migrates forward with meaning intact ----
function testForwardMigration(): void {
  makeV18Save();
  const loaded = loadGame();
  assert(loaded !== null, 'v18 save loads (does not fall back to null)');
  if (!loaded) return;

  const m = loaded.milestones;
  assert(m['program-established:BIOL'] === true, 'major-complete: -> program-established:');
  assert(m['major-complete:BIOL'] === undefined, 'old major-complete: key removed');
  assert(m['program-distinguished:BIOL'] === true, 'major-mastered: -> program-distinguished:');
  assert(m['major-mastered:BIOL'] === undefined, 'old major-mastered: key removed');
  assert(m['school-distinguished:Science'] === true, 'school-complete: -> school-distinguished:');
  assert(m['school-complete:Science'] === undefined, 'old school-complete: key removed');
  assert(m['grad-program-complete:MBAX'] === true, 'grad-program-complete: kept as-is');

  const students = loaded.students;
  const total = students.cohorts.freshman + students.cohorts.sophomore + students.cohorts.junior + students.cohorts.senior;
  assert(total === 800, `enrolled 800 -> four cohorts summing to 800 (got ${total})`);
  assert((students as unknown as Loose).enrolled === undefined, 'old students.enrolled scalar removed');
  assert(students.satisfactionYearWeeks === 0, 'satisfaction accumulator seeded (weeks 0)');
  assert(students.satisfactionYearSum === 0, 'satisfaction accumulator seeded (sum 0)');
  assert(students.priorYearAvgSatisfaction === 66, 'priorYearAvgSatisfaction seeded from current satisfaction');

  const admissions = loaded.admissions as unknown as Loose;
  assert(admissions.scholarshipRate === 0.3, 'financialAidRate 0.3 -> scholarshipRate 0.3');
  assert(admissions.financialAidRate === undefined, 'old financialAidRate field removed');

  const row = loaded.history[0] as unknown as Loose;
  assert(row.programsEstablished === 2, 'history majorsComplete 2 -> programsEstablished 2');
  assert(row.majorsComplete === undefined, 'old history majorsComplete field removed');
}

// Build a v21-shaped save: a real current-shape state with the Arts &
// Media facilities/capstones manually downgraded to the OLD v21 shape (both
// facilities gated on BLDG-ARTSMEDIA, the Performing Arts Center alone
// gating all three majors' tier-3 capstones) — exactly the shape
// MIGRATIONS[21] (v21 -> v22) exists to re-point. See the long comment
// above SAVE_VERSION and above MIGRATIONS[21] in persistence.ts.
function makeV21ArtsSave(): void {
  const base = createInitialState('ArtsMigrator', 'private');
  const state = JSON.parse(JSON.stringify(base)) as Loose;
  const tech = state.tech as Array<Loose>;
  const node = (id: string): Loose => tech.find((n) => n.id === id) as Loose;
  const t2Ids = (prefix: string) => [110, 120, 130, 140].map((n) => `${prefix}${n}`);

  node('ARTS-PAC').prereqs = ['BLDG-ARTSMEDIA'];
  node('ARTS-PAC').status = 'locked';
  node('ART-GALLERY').prereqs = ['BLDG-ARTSMEDIA'];
  node('ART-GALLERY').status = 'done';

  // Graphic Design's and Studio Art's tier-2 quartets are done; Music's are
  // not — chosen so the migration's status recompute has something to prove
  // in both directions.
  for (const id of [...t2Ids('GRDS'), ...t2Ids('SART')]) node(id).status = 'done';

  for (const prefix of ['GRDS', 'MUSC', 'SART']) {
    for (const num of [210, 220, 230, 240]) {
      const n = node(`${prefix}${num}`);
      n.prereqs = [...t2Ids(prefix), 'ARTS-PAC'];
      n.status = 'locked';
    }
  }

  writeSave(21, state);
}

// ---- Test: v21's shared Arts & Media gate re-splits into per-major gates ----
function testArtsCapstoneRepoint(): void {
  makeV21ArtsSave();
  const loaded = loadGame();
  assert(loaded !== null, 'v21 Arts save loads (does not fall back to null)');
  if (!loaded) return;

  const node = (id: string) => loaded.tech.find((n) => n.id === id)!;
  const asStrings = (arr: string[]) => [...arr].sort().join(',');

  const pac = node('ARTS-PAC');
  assert(asStrings(pac.prereqs) === 'MUSC110,MUSC120,MUSC130,MUSC140', 'PAC re-pointed to Music\'s tier-2 quartet');
  assert(pac.status === 'locked', 'PAC stays locked: Music tier-2 is not done');

  const gallery = node('ART-GALLERY');
  assert(asStrings(gallery.prereqs) === 'SART110,SART120,SART130,SART140', 'Gallery re-pointed to Studio Art\'s tier-2 quartet');
  assert(gallery.status === 'done', 'a Gallery already done stays done (never touched, whatever gate produced it)');

  const grds210 = node('GRDS210');
  assert(!grds210.prereqs.includes('ARTS-PAC'), 'Graphic Design capstone drops the Performing Arts Center prereq');
  assert(!grds210.prereqs.includes('ART-GALLERY'), 'Graphic Design capstone gains no Gallery prereq either');
  assert(grds210.status === 'available', 'Graphic Design capstone opens once its tier-2 quartet alone is done');

  const musc210 = node('MUSC210');
  assert(musc210.prereqs.includes('ARTS-PAC'), 'Music capstone keeps the Performing Arts Center prereq');
  assert(musc210.status === 'locked', 'Music capstone stays locked: Music tier-2 is not done');

  const sart210 = node('SART210');
  assert(sart210.prereqs.includes('ART-GALLERY'), 'Studio Art capstone gains the Art Gallery prereq');
  assert(!sart210.prereqs.includes('ARTS-PAC'), 'Studio Art capstone drops the Performing Arts Center prereq');
  assert(sart210.status === 'available', 'Studio Art capstone opens: its tier-2 quartet and the Gallery are both done');
}

// Build a v22-shaped save (a real current-shape state with `seen` stripped
// back off, exactly as a save written before the alert-badge feature would
// look) with a mix of locked/available/done tech and a nonempty candidate
// pool, so MIGRATIONS[22]'s seeding has something real to prove.
function makeV22Save(): void {
  const base = createInitialState('Seeder', 'private');
  const state = JSON.parse(JSON.stringify(base)) as Loose;
  delete state.seen;
  writeSave(22, state);
}

// ---- Test: a v22 save seeds `seen` from its own current visibility ----
function testSeenSeeded(): void {
  makeV22Save();
  const loaded = loadGame();
  assert(loaded !== null, 'v22 save loads (does not fall back to null)');
  if (!loaded) return;

  assert(typeof loaded.seen === 'object' && loaded.seen !== null, 'seen slice is filled in');

  const lockedCourse = loaded.tech.find((t) => t.kind === 'course' && t.status === 'locked');
  assert(!!lockedCourse, 'fixture has at least one locked course to check against');
  if (lockedCourse) {
    assert(loaded.seen.courseIds[lockedCourse.id] === undefined, 'a still-locked course is not marked seen');
  }

  const visibleCourse = loaded.tech.find((t) => t.kind === 'course' && t.status !== 'locked');
  assert(!!visibleCourse, 'fixture has at least one visible (non-locked) course to check against');
  if (visibleCourse) {
    assert(loaded.seen.courseIds[visibleCourse.id] === true, 'an already-visible course is marked seen');
  }

  assert(loaded.candidates.length > 0, 'fixture has a nonempty candidate pool to check against');
  for (const c of loaded.candidates) {
    assert(loaded.seen.candidateIds[c.id] === true, `existing candidate ${c.id} is marked seen`);
  }
}

// ---- Test: a freshly-founded school starts with no alert badges ----
// createInitialState (state/actions.ts) pre-seeds `seen` from the school's
// own founding content — the gen-ed core courses and the founding
// buildables (starting dorm, dining hall, General Studies Hall, the seeded-
// 'available' facility chains) are unlocked from turn one, so they must
// never read as "new" the instant the player opens Curriculum or Build.
// candidateIds is the one deliberate exception: no candidate is ever
// "needed" at founding (every founding hire has a spare course slot beyond
// their own gen-ed course), so there is nothing to pre-seed there.
function testFoundingSeenExcludesStartingContent(): void {
  const fresh = createInitialState('Fresh Start', 'private');

  const visibleCourses = fresh.tech.filter((t) => t.kind === 'course' && t.status !== 'locked');
  assert(visibleCourses.length > 0, 'a founding school has at least one visible course (the gen-ed core)');
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

// Build a v24-shaped save: a real current-shape state carrying pre-gendering
// (bare) sport ids on a club, two teams (one one-gender, one two-gender —
// PLUS one deliberately CORRUPTED entry sanitizeTeams should prune) and a
// pending petition, exactly the shapes MIGRATIONS[24] (v24 -> v25) exists to
// re-point. See the long comment above SAVE_VERSION and above
// MIGRATIONS[24] in persistence.ts.
function makeV24GenderedSportsSave(): void {
  const base = createInitialState('GenderMigrator', 'private');
  const state = JSON.parse(JSON.stringify(base)) as Loose;

  state.orgs = {
    ...(state.orgs as Loose),
    clubs: [{
      id: 'club-soccer', name: 'Soccer Club', foundedYear: 3, foundingMembers: 12, foundingEnrolled: 400,
      upkeepPerWeek: 80, sport: 'soccer', varsityAsked: true, // pre-v28 shape — MIGRATIONS[27] converts this
    }],
    teams: [
      // One-gender: id doesn't move, but the name still gains "Team" —
      // captured, pre-this-PR, as the CLUB's own name at promotion.
      {
        id: 'team-football', name: 'Football Club', foundedYear: 2, foundingMembers: 15, foundingEnrolled: 350,
        upkeepPerWeek: 200, sport: 'football', venueCategory: 'footballStadium',
        coachName: 'Coach Old', coachBaseSalary: 3000, status: 'awaitingVenue',
      },
      // Two-gender: id moves to the men's default, name gains the prefix.
      {
        id: 'team-basketball', name: 'Basketball Club', foundedYear: 4, foundingMembers: 10, foundingEnrolled: 500,
        upkeepPerWeek: 150, sport: 'basketball', venueCategory: 'athleticsArena',
        coachName: 'Coach Hoops', coachBaseSalary: 2500, status: 'active',
      },
      // Corrupted: a sport+venue combination that can never exist under the
      // new catalogue (there is no gendered id this could resolve to) —
      // sanitizeTeams must drop it, not crash on it.
      {
        id: 'team-corrupt', name: 'Nothing', foundedYear: 1, foundingMembers: 1, foundingEnrolled: 1,
        upkeepPerWeek: 1, sport: 'football-w', venueCategory: 'footballStadium',
        coachName: 'Nobody', coachBaseSalary: 1, status: 'awaitingVenue',
      },
    ],
    pendingPetitions: [{
      id: 'pending-lacrosse', kind: 'club', name: 'Lacrosse Club', sport: 'lacrosse',
      foundedYear: 5, foundingMembers: 14, foundingEnrolled: 600, upkeepPerWeek: 90,
    }],
  };

  writeSave(24, state);
}

// ---- Test: v24's bare sport ids gender-migrate, and sanitizeTeams handles the new shape ----
function testGenderedSportsMigration(): void {
  makeV24GenderedSportsSave();
  const loaded = loadGame();
  assert(loaded !== null, 'v24 gendered-sports save loads (does not fall back to null)');
  if (!loaded) return;

  const club = loaded.orgs.clubs.find((c) => c.id === 'club-soccer');
  assert(!!club, 'the migrated soccer club survives under its own id');
  if (club) {
    assert(club.sport === 'soccer-m', `bare 'soccer' club defaults to the men's lineage (got '${club.sport}')`);
    assert(club.name === "Men's Soccer Club", `club is renamed to match the new naming scheme (got '${club.name}')`);
    assert(club.varsityLastAskedYear === loaded.clock.year,
      `pre-v28 varsityAsked=true converts to varsityLastAskedYear = the load-time clock year (got ${club.varsityLastAskedYear}, clock year ${loaded.clock.year})`);
  }

  const football = loaded.orgs.teams.find((t) => t.id === 'team-football');
  assert(!!football, 'the one-gender football team survives under its own id');
  if (football) {
    assert(football.sport === 'football', "a one-gender sport's id does not move");
    assert(football.name === 'Football Team', `team is renamed to the new "... Team" scheme (got '${football.name}')`);
  }

  const basketball = loaded.orgs.teams.find((t) => t.id === 'team-basketball');
  assert(!!basketball, 'the two-gender basketball team survives under its own id');
  if (basketball) {
    assert(basketball.sport === 'basketball-m', `bare 'basketball' team defaults to the men's lineage (got '${basketball.sport}')`);
    assert(basketball.name === "Men's Basketball Team", `team is renamed to match the new naming scheme (got '${basketball.name}')`);
    assert(basketball.venueCategory === 'athleticsArena', 'venueCategory is left untouched by the gender migration');
  }

  assert(
    loaded.orgs.teams.every((t) => t.id !== 'team-corrupt'),
    "sanitizeTeams prunes the corrupted 'football-w' team — no such sport+gender combination can exist",
  );

  const petition = loaded.orgs.pendingPetitions.find((p) => p.id === 'pending-lacrosse');
  assert(!!petition, 'the pending lacrosse petition survives');
  if (petition) {
    assert(petition.sport === 'lacrosse-m', `pending petition's bare sport id also defaults to men's (got '${petition.sport}')`);
    assert(petition.name === "Men's Lacrosse Club", `pending petition is renamed too (got '${petition.name}')`);
  }

  // The sibling gender was never fielded, so it must still read as
  // completely open — nothing about this migration should be able to block
  // a fresh 'soccer-w' or 'basketball-w' club from forming and petitioning.
  assert(sportById('soccer-w') !== undefined, "the women's soccer lineage still exists in the catalogue post-migration");
  assert(
    !loaded.orgs.clubs.some((c) => c.sport === 'soccer-w') && !loaded.orgs.teams.some((t) => t.sport === 'soccer-w'),
    'no soccer-w record was invented by the migration — it is genuinely unformed, exactly like a fresh game',
  );
}

// ---- Test: v27's boolean varsityAsked converts to varsityLastAskedYear ----
function testVarsityAskedMigration(): void {
  const base = createInitialState('VarsityMigrator', 'private');
  const state = JSON.parse(JSON.stringify(base)) as Loose;
  state.clock = { year: 9, week: 3 };
  state.orgs = {
    ...(state.orgs as Loose),
    clubs: [
      {
        id: 'club-declined', name: 'Declined Club', foundedYear: 1, foundingMembers: 12, foundingEnrolled: 400,
        upkeepPerWeek: 80, sport: 'soccer-m', varsityAsked: true,
      },
      {
        id: 'club-unasked', name: 'Unasked Club', foundedYear: 4, foundingMembers: 10, foundingEnrolled: 400,
        upkeepPerWeek: 70, sport: 'volleyball-m', varsityAsked: false,
      },
    ],
  };
  writeSave(27, state);

  const loaded = loadGame();
  assert(loaded !== null, 'v27 varsityAsked save loads (does not fall back to null)');
  if (!loaded) return;

  const declined = loaded.orgs.clubs.find((c) => c.id === 'club-declined');
  assert(!!declined, 'the previously-declined club survives under its own id');
  if (declined) {
    assert(declined.varsityLastAskedYear === 9, `varsityAsked=true backfills to the load-time clock year (got ${declined.varsityLastAskedYear})`);
    assert(!('varsityAsked' in declined), 'the old varsityAsked key is dropped, not left dangling');
  }

  const unasked = loaded.orgs.clubs.find((c) => c.id === 'club-unasked');
  assert(!!unasked, 'the never-asked club survives under its own id');
  if (unasked) {
    assert(unasked.varsityLastAskedYear === null, `varsityAsked=false backfills to null (got ${unasked.varsityLastAskedYear})`);
  }
}

// ---- Test: a current-version save round-trips unchanged ----
function testRoundTrip(): void {
  clearSave();
  const cur = createInitialState('RoundTrip', 'public');
  assert(saveGame(cur), 'saveGame reports success');
  const loaded = loadGame();
  assert(loaded !== null, 'current-version save loads');
  if (!loaded) return;
  assert(loaded.self.name === 'RoundTrip', 'name survives round trip');
  assert(loaded.self.schoolType === 'public', 'school type survives round trip');
  assert(
    JSON.stringify(loaded.students.cohorts) === JSON.stringify(cur.students.cohorts),
    'founding cohort mix survives round trip',
  );
  assert(loaded.admissions.scholarshipRate === cur.admissions.scholarshipRate, 'scholarshipRate survives round trip');
}

// ---- Test: unmigratable / malformed saves fall back to null, never throw ----
function testRejects(): void {
  // A version with no migration path (v1) cannot be carried forward.
  writeSave(1, { started: true });
  assert(loadGame() === null, 'un-migratable version -> null');

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

console.log(`save-migration tests (SAVE_VERSION ${SAVE_VERSION})`);
testForwardMigration();
testArtsCapstoneRepoint();
testSeenSeeded();
testFoundingSeenExcludesStartingContent();
testGenderedSportsMigration();
testVarsityAskedMigration();
testRoundTrip();
testRejects();

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
