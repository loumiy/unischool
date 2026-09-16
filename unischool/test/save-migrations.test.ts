// ---------------------------------------------------------------------
// Save-migration test harness (see docs/architecture/game-state.md and the
// alignment roadmap). A migration's claim is that a run started under an old
// build survives forward untouched in meaning, so the thing worth testing is
// exactly that: seed a payload at an OLD SAVE_VERSION in the old shape, run
// the REAL loadGame path (parse -> looksLikeGameState -> MIGRATIONS ->
// sanitizers), and assert the result is the current shape with its meaning
// intact.
//
// This file covers the EXISTING chain (v3 -> v40) and does not grow with
// every SAVE_VERSION bump: migrations are now written only for a specific
// run worth carrying, and a version with no migration has nothing here to
// test. When one is written, it is tested here; when the chain is deleted,
// this file goes with it. See the policy note above SAVE_VERSION in
// src/state/persistence.ts.
//
// What is worth keeping either way is the LAST case in this file: a save
// at an unmigrated version must load as null rather than half-loading.
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
import { athleticStrengthFor, initialRivals } from '../src/data/rivalData';
import { researchSchools } from '../src/data/techData';
import { WEEKS_PER_YEAR } from '../src/state/types';
import { isUnstaffed, usedFacultySlots, facultyLoad } from '../src/systems/techtree/techSystem';
import { annualTuitionBilled } from '../src/systems/finance/financeSystem';

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
  // Old student body: a single enrolled scalar, no classes, no satisfaction
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
  const total = students.classes.freshman + students.classes.sophomore + students.classes.junior + students.classes.senior;
  assert(total === 800, `enrolled 800 -> four classes summing to 800 (got ${total})`);
  // MIGRATIONS[19] writes the field under its v20 name and MIGRATIONS[34]
  // renames it; a save coming all the way up from v19 must arrive with only
  // the new name, never both.
  assert((students as unknown as Loose).cohorts === undefined,
    'students.cohorts renamed to students.classes on the way up');
  assert((students as unknown as Loose).enrolled === undefined, 'old students.enrolled scalar removed');
  assert(students.satisfactionYearWeeks === 0, 'satisfaction accumulator seeded (weeks 0)');
  assert(students.satisfactionYearSum === 0, 'satisfaction accumulator seeded (sum 0)');
  assert(students.priorYearAvgSatisfaction === 66, 'priorYearAvgSatisfaction seeded from current satisfaction');

  // MIGRATIONS[20] renames financialAidRate -> scholarshipRate, and
  // MIGRATIONS[36] then deletes the whole admissions slice with
  // scholarships themselves. A v18 save coming all the way up must arrive
  // with neither field and no slice — and, critically, must not have
  // thrown on the way through the rename it still passes over.
  assert((loaded as unknown as Loose).admissions === undefined,
    'the admissions slice is gone by the current version');

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
  // Plus COMP101, which Web Design (GRDS210) carries an authored
  // cross-discipline bridge to (techData.ts's CROSS_MAJOR_BRIDGES: a web
  // design course needs introductory programming). This fixture is about
  // the ARTS FACILITY gate re-split and nothing else, so the one non-arts
  // prereq GRDS210 has is satisfied here rather than left to make the
  // assertion below fail for an unrelated reason.
  node('COMP101').status = 'done';

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
  assert(grds210.status === 'available', 'Graphic Design capstone opens with no arts-facility gate of its own, on its tier-2 quartet and its authored bridge');

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
    assert(football.headCoach?.name === 'Coach Old', `pre-v29 coachName becomes headCoach.name (got '${football.headCoach?.name}')`);
    assert(football.assistantCoach === null, 'a pre-v29 team never had an assistant coach — arrives vacant');
    assert(football.trainer === null, 'a pre-v29 team never had a trainer — arrives vacant');
    assert(
      football.headCoach !== null && football.headCoach.tenureWeeks >= 0,
      `migrated headCoach.tenureWeeks is a non-negative estimate from foundedYear (got ${football.headCoach?.tenureWeeks})`,
    );
  }

  const basketball = loaded.orgs.teams.find((t) => t.id === 'team-basketball');
  assert(!!basketball, 'the two-gender basketball team survives under its own id');
  if (basketball) {
    assert(basketball.sport === 'basketball-m', `bare 'basketball' team defaults to the men's lineage (got '${basketball.sport}')`);
    assert(basketball.name === "Men's Basketball Team", `team is renamed to match the new naming scheme (got '${basketball.name}')`);
    assert(basketball.venueCategory === 'athleticsArena', 'venueCategory is left untouched by the gender migration');
    assert(basketball.headCoach?.name === 'Coach Hoops', `pre-v29 coachName becomes headCoach.name (got '${basketball.headCoach?.name}')`);
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

// ---- Test: v28 -> v29 Athletics V2 (coachName -> headCoach, the budget
// rename, and rivals gaining athleticStrength) ----
function testAthleticsV2Migration(): void {
  const base = createInitialState('AthleticsMigrator', 'private');
  const state = JSON.parse(JSON.stringify(base)) as Loose;
  state.clock = { year: 5, week: 10 };
  state.orgs = {
    ...(state.orgs as Loose),
    teams: [{
      id: 'team-lacrosse', name: "Men's Lacrosse Team", foundedYear: 1, foundingMembers: 12, foundingEnrolled: 350,
      upkeepPerWeek: 400, sport: 'lacrosse-m', venueCategory: 'athleticsField',
      coachName: 'Coach Legacy', coachBaseSalary: 5000, status: 'active',
    }],
    athleticsInvestment: 'high', // the pre-v29 key — no athleticsBudget yet
  };
  delete (state.orgs as Loose).athleticsBudget;
  delete (state.orgs as Loose).coachCandidates;
  // Strip athleticStrength off one rival, as if it were saved before this
  // migration existed.
  const rivals = state.rivals as Loose[];
  delete rivals[0].athleticStrength;
  writeSave(28, state);

  const loaded = loadGame();
  assert(loaded !== null, 'v28 athletics save loads (does not fall back to null)');
  if (!loaded) return;

  assert(loaded.orgs.athleticsBudget === 'high', `athleticsInvestment renames to athleticsBudget, value preserved (got '${loaded.orgs.athleticsBudget}')`);
  assert(Array.isArray(loaded.orgs.coachCandidates) && loaded.orgs.coachCandidates.length > 0,
    'a real, full coach candidate pool is seeded, not an empty array');

  const team = loaded.orgs.teams.find((t) => t.id === 'team-lacrosse');
  assert(!!team, 'the migrated team survives under its own id');
  if (team) {
    assert(team.headCoach?.name === 'Coach Legacy', `pre-v29 coachName becomes headCoach.name (got '${team.headCoach?.name}')`);
    assert(team.headCoach?.field === 'lacrosse-m', `migrated headCoach.field matches the team's own sport (got '${team.headCoach?.field}')`);
    assert(team.assistantCoach === null && team.trainer === null, 'assistant coach and trainer both arrive vacant');
    const expectedTenureWeeks = Math.round((5 - 1) * WEEKS_PER_YEAR);
    assert(team.headCoach?.tenureWeeks === expectedTenureWeeks,
      `migrated headCoach.tenureWeeks is estimated from foundedYear (got ${team.headCoach?.tenureWeeks}, expected ${expectedTenureWeeks})`);
  }

  const firstRival = loaded.rivals.find((r) => r.id === (rivals[0].id as string));
  assert(!!firstRival, 'the rival missing athleticStrength survives under its own id');
  if (firstRival) {
    assert(
      firstRival.athleticStrength === athleticStrengthFor(firstRival.reputation, firstRival.id),
      `backfilled athleticStrength matches what a fresh game would derive (got ${firstRival.athleticStrength})`,
    );
  }
  const otherRival = loaded.rivals.find((r) => r.id !== firstRival?.id);
  assert(!!otherRival && typeof otherRival.athleticStrength === 'number', 'a rival that already had athleticStrength keeps a real number');
}

// ---- v35 -> v36: one tuition scalar becomes a listed price + four class prices ----
// The claim this migration makes is that it is EXACT — every class really
// was paying the one scalar, so a resumed school bills what it billed the
// week before. That is a checkable claim, so check it: build a v35 save
// with a known scalar and an uneven body, migrate, and compare the weekly
// tuition line against the old model's own arithmetic.
function testPerClassTuitionMigration(): void {
  clearSave();
  const base = createInitialState('Pricer', 'private');
  const state = JSON.parse(JSON.stringify(base)) as Loose;

  const finance = state.finance as Loose;
  delete finance.listedTuition;
  delete finance.tuitionByClass;
  finance.tuitionPerStudent = 19_000;

  // Deliberately uneven, so a migration that quietly dropped a class or
  // reused one class's count for another would show up in the total.
  const students = state.students as Loose;
  students.classes = { freshman: 300, sophomore: 250, junior: 200, senior: 150 };
  // v35 predates the retirement of scholarships, so this save still HAS
  // the slice — the current shape does not, so it is put back by hand
  // here. It is what MIGRATIONS[36] removes on the way up.
  (state as Loose).admissions = { scholarshipRate: 0.2 };

  writeSave(35, state);
  const loaded = loadGame();
  assert(loaded !== null, 'v35 save loads');
  if (!loaded) return;

  assert((loaded.finance as unknown as Loose).tuitionPerStudent === undefined,
    'the old tuitionPerStudent scalar is removed');
  assert(loaded.finance.listedTuition === 19_000,
    `the scalar becomes the listed price (got ${loaded.finance.listedTuition})`);
  const byClass = loaded.finance.tuitionByClass;
  assert(
    byClass.freshman === 19_000 && byClass.sophomore === 19_000
      && byClass.junior === 19_000 && byClass.senior === 19_000,
    'every class carries forward at the price it was actually paying',
  );

  // The exactness claim, in money. NOTE the 0.8 that used to be here is
  // gone: the v35 save's 20% scholarship rate is retired by MIGRATIONS[36]
  // on the way up (Plan 05's PR B), so the resumed school charges its
  // listed price in full. What this still pins is that the SPLIT across
  // four classes is exact — every class at the one price it was paying.
  const expected = (300 + 250 + 200 + 150) * 19_000;
  const actual = annualTuitionBilled(loaded);
  assert(Math.abs(actual - expected) < 1e-6,
    `migrated tuition revenue is unchanged to the dollar (got ${actual}, expected ${expected})`);
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
    JSON.stringify(loaded.students.classes) === JSON.stringify(cur.students.classes),
    'founding class mix survives round trip',
  );
  assert((loaded as unknown as Loose).admissions === undefined, 'no admissions slice on a current-version save');
  assert(loaded.finance.listedTuition === cur.finance.listedTuition, 'listed tuition survives round trip');
}

// ---- Test: v29's campus content pass (MIGRATIONS[29]) ----
// The dorm/dining/health chains were re-authored under ids the save already
// holds, so the migration's whole job is the built/unbuilt split: a hall
// the player has already paid for keeps every number it was bought with, a
// hall they have not is replaced by the seed. Plus the founding woodland,
// which a resumed campus gets a real one of.
function makeV29Save(): void {
  const base = createInitialState('CampusMigrator', 'private');
  const state = JSON.parse(JSON.stringify(base)) as Loose;
  const tech = state.tech as Array<Loose>;
  const node = (id: string): Loose => tech.find((n) => n.id === id) as Loose;

  // Put the save into the OLD dorm shape: DORM-02 at the old geometric
  // chain's 350 beds / $2.8M, already BUILT, and DORM-03 at the old 413
  // beds still locked. Plus DORM-16, a rung the new chain doesn't have,
  // also unbuilt.
  node('DORM-02').status = 'done';
  node('DORM-02').name = 'Lakeside Hall';
  node('DORM-02').cost = 2_800_000;
  (node('DORM-02').effects as Loose).capacityBonus = 350;

  node('DORM-03').status = 'locked';
  node('DORM-03').cost = 3_836_000;
  (node('DORM-03').effects as Loose).capacityBonus = 413;

  tech.push({
    id: 'DORM-16', kind: 'dorm', name: 'Crestline Hall',
    description: 'Adds 3,552 beds of student housing.',
    cost: 229_700_000, duration: 28, prereqs: ['DORM-15'], status: 'locked',
    effects: { capacityBonus: 3552 },
  });

  // An old tier-3 health centre, unbuilt: under the new chain this id is
  // the University Hospital and gates on the medical school.
  node('HLTH-T3').name = 'University Health Center';
  node('HLTH-T3').status = 'available';
  (node('HLTH-T3').effects as Loose).servesPopulation = 42_000;

  // A pre-trees save has no `trees` key at all.
  delete state.trees;

  writeSave(29, state);
}

function testCampusContentMigration(): void {
  makeV29Save();
  const loaded = loadGame();
  assert(loaded !== null, 'v29 campus save loads (does not fall back to null)');
  if (!loaded) return;

  const node = (id: string) => loaded.tech.find((n) => n.id === id);

  // BUILT: untouched, down to the bed count s.students.capacity was
  // computed from. This is the assertion the whole built/unbuilt split
  // exists for — see MIGRATIONS[29].
  const built = node('DORM-02')!;
  assert(built.status === 'done', 'a dorm already built stays done');
  assert(built.effects?.capacityBonus === 350, 'a built dorm keeps the bed count its capacity was granted from');
  assert(built.cost === 2_800_000, 'a built dorm keeps the price it was actually bought at');

  // UNBUILT: re-pointed to the seed.
  const unbuilt = node('DORM-03')!;
  assert(unbuilt.status === 'locked', 'an unbuilt dorm keeps its own status');
  assert(unbuilt.effects?.capacityBonus === 500, 'an unbuilt dorm takes the new chain\'s bed count');
  assert(unbuilt.name === 'Riverside Commons', 'an unbuilt dorm takes the new chain\'s name');

  // A rung the new chain does not have, never started: dropped.
  assert(node('DORM-16') === undefined, 'an unbuilt dorm the new chain no longer has is dropped');

  // The health chain's top rung, unbuilt: re-pointed to the hospital, and
  // re-locked behind the medical school it now needs.
  const hospital = node('HLTH-T3')!;
  assert(hospital.name === 'University Hospital', 'the unbuilt top health rung becomes the University Hospital');
  assert(hospital.prereqs.includes('BLDG-MED'), 'the hospital gains its medical-school building prereq');

  // The two genuinely new dining halls arrive by id-splice, locked.
  assert(node('DININGHALL-07')?.status === 'locked', 'a brand-new dining hall is spliced in locked');
  assert(node('DININGHALL-08') !== undefined, 'every new dining rung is spliced in');

  // The founding woodland: a real one, and none of it under a building.
  const treeKeys = Object.keys(loaded.trees);
  assert(treeKeys.length > 100, `a resumed campus is seeded with a real woodland (got ${treeKeys.length} trees)`);
  assert(treeKeys.every((k) => typeof loaded.trees[k] === 'number'), 'every tree carries a numeric render seed');
  const underABuilding = treeKeys.filter((key) => {
    const [row, col] = key.split(',').map(Number);
    return Object.values(loaded.placements).some(
      (p) => row >= p.row && row < p.row + p.h && col >= p.col && col < p.col + p.w,
    );
  });
  assert(underABuilding.length === 0, `no seeded tree stands under a placed building (found ${underABuilding.length})`);
}

// ---- v30 -> v31: who teaches what becomes real state ----
//
// The migration materializes the pairing the old build computed on read
// (see persistence.ts's MIGRATIONS[30]). What is worth testing is exactly
// that promise: the resumed save says what the closed save was DRAWING,
// down to which specific professor holds which specific course — plus the
// two consequences the header note calls out, an emptied department
// resuming unstaffed and its slots coming back.
function makeV30Save(): void {
  const base = createInitialState('Assigner', 'private');
  const state = JSON.parse(JSON.stringify(base)) as Loose;

  const tech = state.tech as Array<Record<string, unknown>>;
  const node = (id: string) => tech.find((n) => n.id === id)!;
  const faculty = state.faculty as Array<Record<string, unknown>>;

  // Three English courses offered, against a two-person English department
  // (the founding Dr. Bennett plus one more). The old round-robin sorts
  // both sides by id and deals: GE110 -> the first, GE160 -> the second,
  // ENGL101 -> back to the first.
  faculty.push({
    ...JSON.parse(JSON.stringify(faculty.find((f) => f.field === 'English'))),
    id: 'f9', name: 'Dr. Rosa Lindqvist',
  });
  node('GE110').status = 'done';
  node('GE160').status = 'done';
  node('ENGL101').status = 'developing';
  (state.developing as Record<string, number>)['ENGL101'] = 4;

  // A Physics course offered by a department that has since been emptied:
  // the founding physicist is dismissed here, so nobody in the field
  // remains. The old build drew no instructor for it and had no way to say
  // why; the new one calls it unstaffed.
  node('GE140').status = 'done';
  state.faculty = faculty.filter((f) => f.field !== 'Physics');

  // A pre-assignment save has no courseFaculty key at all.
  delete state.courseFaculty;

  writeSave(30, state);
}

function testCourseFacultyMigration(): void {
  makeV30Save();
  const loaded = loadGame();
  assert(loaded !== null, 'v30 save loads (does not fall back to null)');
  if (!loaded) return;

  const english = loaded.faculty.filter((f) => f.field === 'English').sort((a, b) => a.id.localeCompare(b.id));
  assert(english.length === 2, 'both English professors survive the migration');

  // The round-robin, reproduced exactly: sorted courses dealt against
  // sorted faculty. This is the whole promise of the migration — a
  // resumed save keeps the pairings it was already showing.
  assert(
    loaded.courseFaculty['ENGL101'] === english[0].id,
    'the first English course by id keeps the first English professor by id',
  );
  assert(
    loaded.courseFaculty['GE110'] === english[1].id,
    'the round-robin deals the second course to the second professor',
  );
  assert(
    loaded.courseFaculty['GE160'] === english[0].id,
    'the round-robin wraps back to the first professor for the third course',
  );

  // A developing course carries an instructor too, not just a done one.
  assert(
    typeof loaded.courseFaculty['ENGL101'] === 'string',
    'a course still developing resumes with an instructor',
  );

  // An emptied department: offered, but nobody to teach it.
  assert(loaded.courseFaculty['GE140'] === undefined, 'a course whose whole department is gone resumes unassigned');
  assert(isUnstaffed(loaded, loaded.tech.find((t) => t.id === 'GE140')!), 'that course reads as unstaffed');

  // ...and it STILL HOLDS its slot. An unstaffed course has not gone away:
  // it is still offered and still owed to students, so the department is
  // over-committed rather than freshly roomy (see usedFacultySlots).
  assert(usedFacultySlots(loaded, 'Physics') === 1, 'an unstaffed course still holds its field slot');

  // Nothing is assigned to someone who is not on the roster.
  const roster = new Set(loaded.faculty.map((f) => f.id));
  assert(
    Object.values(loaded.courseFaculty).every((id) => roster.has(id)),
    'no assignment names a faculty member who is not on the roster',
  );

  // Per-person load never exceeds what the record actually says.
  assert(
    facultyLoad(loaded, english[0].id) === 2 && facultyLoad(loaded, english[1].id) === 1,
    'per-person load matches the materialized assignments',
  );

  // An unoffered course is never assigned: only what is actually being
  // taught holds a slot.
  assert(
    Object.keys(loaded.courseFaculty).every((id) => {
      const t = loaded.tech.find((n) => n.id === id)!;
      return t.status === 'developing' || t.status === 'done';
    }),
    'only offered courses carry an assignment',
  );
}

// ---- The sanitizer drops assignments that no longer name a real pairing ----
function testCourseFacultySanitizer(): void {
  const base = createInitialState('Sanitizer', 'private');
  const state = JSON.parse(JSON.stringify(base)) as Loose;
  const tech = state.tech as Array<Record<string, unknown>>;
  tech.find((n) => n.id === 'GE110')!.status = 'done';

  state.courseFaculty = {
    'GE110': 'f3',              // real course, real professor: kept
    'GE120': 'nobody-at-all',   // real course, departed professor: dropped
    'NO-SUCH-COURSE': 'f3',     // course that does not exist: dropped
  };
  writeSave(SAVE_VERSION, state);

  const loaded = loadGame();
  assert(loaded !== null, 'a save with stale assignments still loads');
  if (!loaded) return;
  assert(loaded.courseFaculty['GE110'] === 'f3', 'a valid assignment survives sanitizing');
  assert(loaded.courseFaculty['GE120'] === undefined, 'an assignment to someone off the roster is dropped');
  assert(loaded.courseFaculty['NO-SUCH-COURSE'] === undefined, 'an assignment to a course that does not exist is dropped');
}

// ---- a chapter's letters, filled in on load ----
//
// GreekChapter.glyphs was added after SAVE_VERSION 33 and deliberately did
// NOT get a version bump and a transform, because there is nothing to
// transform: a chapter has always been NAMED out of the Greek alphabet, so
// the letters are the same name written the way a building writes it (see
// persistence.ts's sanitizeChapters). What is worth pinning is that a save
// written before the field loads with the letters present — the campus map
// reads them straight off the chapter, and an undefined here is an empty
// pediment on every chapter house the player has built.
function testChapterGlyphs(): void {
  const base = createInitialState('Hellenic', 'private');
  const state = JSON.parse(JSON.stringify(base)) as Loose;
  const orgs = state.orgs as Record<string, unknown>;
  orgs.chapters = [
    // A chapter as an older save wrote it: no `glyphs` at all.
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
  assert(loaded !== null, 'a save written before chapters had letters still loads');
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

// ---- v31 -> v32: scholarship reaches every school ----
//
// Two promises worth pinning: the four new facilities arrive, and the
// capstones that now need one are re-pointed ONLY where the player has not
// already started them (see MIGRATIONS[31], and MIGRATIONS[29]'s identical
// built/unbuilt split).
function makeV31Save(): void {
  const base = createInitialState('Scholar', 'private');
  const state = JSON.parse(JSON.stringify(base)) as Loose;
  const tech = state.tech as Array<Record<string, unknown>>;
  const node = (id: string) => tech.find((n) => n.id === id);

  // Strip the four new facilities out, and put the four majors' capstones
  // back on their pre-v32 prereqs (no facility named).
  const NEW_FACILITIES = ['LAB-ECON', 'LAB-COMP', 'LAB-HIST', 'LAB-FILM'];
  for (const n of tech) {
    const prereqs = n.prereqs as string[] | undefined;
    if (prereqs) n.prereqs = prereqs.filter((id) => !NEW_FACILITIES.includes(id));
  }
  state.tech = tech.filter((n) => !NEW_FACILITIES.includes(n.id as string));

  // One capstone the player has already finished, and one still locked.
  node('HIST210')!.status = 'done';
  node('HIST220')!.status = 'locked';

  delete (state.research as Loose).publications;
  writeSave(31, state);
}

function testScholarshipMigration(): void {
  makeV31Save();
  const loaded = loadGame();
  assert(loaded !== null, 'v31 save loads (does not fall back to null)');
  if (!loaded) return;

  const node = (id: string) => loaded.tech.find((n) => n.id === id);

  assert(loaded.research.publications === 0, 'publications seeds at 0, not back-derived');

  for (const id of ['LAB-ECON', 'LAB-COMP', 'LAB-HIST', 'LAB-FILM']) {
    assert(node(id) !== undefined, `${id} is spliced into a resumed save`);
    assert(node(id)!.status === 'locked', `${id} arrives locked, like any new content`);
  }

  // Every school can now produce scholarship, which is the whole point.
  const schoolsWithFacilities = researchSchools().filter((school) => school.labIds.length > 0);
  assert(
    schoolsWithFacilities.length === researchSchools().filter((s2) => s2.fields.length > 0 && s2.schoolName !== 'General Studies').length,
    `every subject school has a research facility (got ${schoolsWithFacilities.map((s2) => s2.schoolName).join(', ')})`,
  );

  // UNBUILT: re-pointed, so a resumed run and a fresh one converge.
  assert(
    node('HIST220')!.prereqs.includes('LAB-HIST'),
    'a capstone the player has not started takes the new facility gate',
  );
  // BUILT: untouched, so nothing the player already earned is re-gated.
  assert(
    !node('HIST210')!.prereqs.includes('LAB-HIST'),
    'a capstone already finished keeps the prereqs it was actually bought under',
  );
  assert(node('HIST210')!.status === 'done', 'and stays done');
}

// ---- Test: v41 -> v42, the field grows to 100 and everybody gets a mascot ----
//
// Three distinct claims, and the middle one is the load-bearing one: a
// resumed run's own schools must come back carrying the numbers they had
// DRIFTED to, not the authored founding values, because reputation and
// momentum have been moving all run (see rivalsSystem.ts's annual drift)
// while the authored table is a founding condition.
function testHundredSchoolFieldMigration(): void {
  const base = createInitialState('FieldMigrator', 'private');
  const state = JSON.parse(JSON.stringify(base)) as Loose;
  state.clock = { year: 22, week: 30 };

  // A v41 save: 55 rivals, none with a mascot, and no mascot on the school.
  const rivals = (state.rivals as Loose[]).slice(0, 55);
  for (const r of rivals) delete r.mascot;
  // Two of them have drifted a long way from where they were authored —
  // one up, one down — which is what a 22-year run looks like.
  rivals[0].reputation = 128.5;
  rivals[0].momentum = -1.25;
  rivals[4].reputation = 19.75;
  state.rivals = rivals;
  delete (state.self as Loose).mascot;
  writeSave(41, state);

  const loaded = loadGame();
  assert(loaded !== null, 'v41 save loads (does not fall back to null)');
  if (!loaded) return;

  assert(loaded.rivals.length === 99, `the field grows to 99 rivals (got ${loaded.rivals.length})`);
  assert(
    new Set(loaded.rivals.map((r) => r.id)).size === 99,
    'and the 44 appended schools do not duplicate an id the save already had',
  );

  // The drifted schools keep every number they drifted to. Only the mascot
  // — a fact about the school that never moves — comes from the table.
  const drifted = loaded.rivals.find((r) => r.id === (rivals[0].id as string));
  assert(drifted?.reputation === 128.5, `a saved rival keeps its drifted reputation (got ${drifted?.reputation})`);
  assert(drifted?.momentum === -1.25, `and its drifted momentum (got ${drifted?.momentum})`);
  assert(
    typeof drifted?.mascot === 'string' && drifted.mascot.length > 0,
    `a saved rival is backfilled with its authored mascot (got '${drifted?.mascot}')`,
  );
  const sunk = loaded.rivals.find((r) => r.id === (rivals[4].id as string));
  assert(sunk?.reputation === 19.75, `a rival that has sunk keeps that too (got ${sunk?.reputation})`);

  // Every backfilled mascot is the one a fresh game would author, matched
  // by id rather than by position.
  const authored = new Map(initialRivals().map((r) => [r.id, r.mascot]));
  const wrong = loaded.rivals.filter((r) => r.mascot !== authored.get(r.id));
  assert(wrong.length === 0, `every mascot matches the authored table by id (mismatched: ${wrong.map((r) => r.id).join(', ')})`);

  // THE TAIL IS BELOW THE OLD FLOOR, which is what makes this migration
  // rank-neutral for a school that has climbed past it (see the SAVE_VERSION
  // header note). Asserted against the authored values, not the drifted
  // ones: the 44 arrive fresh.
  const appended = loaded.rivals.filter((r) => !rivals.some((old) => old.id === r.id));
  assert(appended.length === 44, `exactly 44 schools are appended (got ${appended.length})`);
  assert(
    appended.every((r) => r.reputation < 45),
    `every appended school is authored below the old ~45 floor (highest ${Math.max(...appended.map((r) => r.reputation))})`,
  );

  // The player is not handed a mascot they never chose.
  assert(loaded.self.mascot === '', `the school's own mascot stays empty until it is named (got '${loaded.self.mascot}')`);
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
testAthleticsV2Migration();
testCampusContentMigration();
testCourseFacultyMigration();
testCourseFacultySanitizer();
testChapterGlyphs();
testScholarshipMigration();
testPerClassTuitionMigration();
testHundredSchoolFieldMigration();
testRoundTrip();
testRejects();

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
