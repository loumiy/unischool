// ---------------------------------------------------------------------
// Per-sport standings (see systems/rivals/rivalsSystem.ts's sportRankedList
// and data/rivalData.ts's sportStrengthFor). Behavioral checks against the
// real code — not a reimplementation — covering what the feature actually
// promises:
//
//   - a school's strength in one sport is DERIVED and stable: the same
//     school reads the same way at every call, across reloads, forever;
//   - the eighteen per-sport tables are not eighteen copies of the
//     department-wide one, which is the only reason to have them;
//   - a school that does not field a sport is not ON that sport's table,
//     rather than ranked last on it;
//   - the player's side and the rivals' side are the same scale, so the
//     comparison means something;
//   - athletic strength now drifts, which it did not before, and stays
//     inside the band teamQuality can reach.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { initialRivals, sportStrengthFor } from '../src/data/rivalData';
import { SPORTS, promoteToVarsityTeam, teamQuality } from '../src/data/studentLifeData';
import { tickRivals, sportRankedList, sportRank, athleticRank, playerTeamIn } from '../src/systems/rivals/rivalsSystem';
import { WEEKS_PER_YEAR } from '../src/state/types';
import type { GameState, StudentClub } from '../src/state/types';

// Deterministic PRNG, same construction as the other suites.
let seed = 424242;
Math.random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

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
  return createInitialState('Standings Test');
}

// A varsity team in a sport, promoted through the real path rather than
// pushed onto s.orgs.teams by hand.
function fieldTeam(s: GameState, sportId: string): void {
  const sport = SPORTS.find((sp) => sp.id === sportId)!;
  const club: StudentClub = {
    id: `club-${sportId}`, name: sport.clubName, foundedYear: 1,
    foundingMembers: 12, foundingEnrolled: 350, upkeepPerWeek: 50,
    sport: sportId, varsityLastAskedYear: null,
  };
  s.orgs.clubs.push(club);
  promoteToVarsityTeam(s, club, {
    sport: sport.id, name: sport.teamName, venueCategory: sport.venueCategory,
    upkeepPerWeek: 400, status: 'active',
  });
}

// ---- Derived, and stable ----
function testDerivedAndStable(): void {
  const rivals = initialRivals();
  const r = rivals[0];

  const once = sportStrengthFor(r, 'soccer-m');
  const twice = sportStrengthFor(r, 'soccer-m');
  assert(once === twice, `the same school reads the same in the same sport (${once} vs ${twice})`);

  // A second, independently constructed field agrees — which is what
  // "survives a reload without being stored" actually means.
  const reloaded = initialRivals()[0];
  assert(
    sportStrengthFor(reloaded, 'soccer-m') === once,
    'and reads the same on a freshly built field, so nothing needs storing',
  );

  // Every school, every sport, inside the band teamQuality can produce.
  const all = rivals.flatMap((rival) => SPORTS.map((sp) => sportStrengthFor(rival, sp.id)));
  assert(Math.min(...all) >= 5, `no per-sport strength below the floor (min ${Math.min(...all)})`);
  assert(Math.max(...all) <= 100, `none above the ceiling teamQuality shares (max ${Math.max(...all)})`);
}

// ---- Eighteen tables, not eighteen copies ----
function testSportsDisagree(): void {
  const rivals = initialRivals();
  const byDepartment = [...rivals].sort((a, b) => b.athleticStrength - a.athleticStrength).map((r) => r.id);

  let sportsThatAgree = 0;
  for (const sp of SPORTS) {
    const bySport = [...rivals]
      .sort((a, b) => sportStrengthFor(b, sp.id) - sportStrengthFor(a, sp.id))
      .map((r) => r.id);
    const samePlace = bySport.filter((id, i) => byDepartment[i] === id).length;
    if (samePlace > rivals.length / 2) sportsThatAgree += 1;
  }
  assert(sportsThatAgree === 0,
    `no sport's table is a copy of the department-wide one (${sportsThatAgree} of ${SPORTS.length} agreed on over half the field)`);

  // NOBODY IS TIED AT THE TOP. This is the check that caught the real defect
  // behind this PR: athleticStrengthFor used to saturate its own clamp, so
  // twelve schools sat at exactly 100 and every sport's table opened with a
  // thirteen-way tie broken by position in an array. A tournament seeded off
  // that is seeded by nothing.
  for (const sp of SPORTS) {
    const vals = rivals.map((rival) => sportStrengthFor(rival, sp.id)).sort((a, b) => b - a);
    const tied = vals.filter((v) => v === vals[0]).length;
    assert(tied <= 2, `${sp.teamName}'s table does not open with a pile-up at the ceiling (${tied} schools tied at ${vals[0]})`);
  }

  // And each sport has its own FIELD, not the same one reordered — the
  // property that actually matters once a bracket takes the strongest eight
  // (see the plan's PR 2F). Measured as how much two sports' top eights
  // overlap: near-identical fields would mean the per-sport split bought
  // nothing.
  const topEights = SPORTS.map((sp) => [...rivals]
    .sort((a, b) => sportStrengthFor(b, sp.id) - sportStrengthFor(a, sp.id))
    .slice(0, 8).map((rival) => rival.id));
  let shared = 0;
  let pairs = 0;
  for (let a = 0; a < topEights.length; a += 1) {
    for (let b = a + 1; b < topEights.length; b += 1) {
      shared += topEights[a].filter((id) => topEights[b].includes(id)).length;
      pairs += 1;
    }
  }
  const meanShared = shared / pairs;
  assert(meanShared < 4, `two sports' strongest eight are mostly different schools (mean ${meanShared.toFixed(1)} of 8 shared)`);
}

// ---- Who is on the table ----
function testTableMembership(): void {
  const s = fresh();

  assert(sportRank(s, 'soccer-m') === null, 'a school fielding no soccer team has no soccer rank');
  assert(
    sportRankedList(s, 'soccer-m').every((e) => !e.isPlayer),
    'and does not appear on the soccer table at all',
  );
  assert(
    sportRankedList(s, 'soccer-m').length === s.rivals.length,
    `the table is then just the rivals (got ${sportRankedList(s, 'soccer-m').length} of ${s.rivals.length})`,
  );

  fieldTeam(s, 'soccer-m');
  const rank = sportRank(s, 'soccer-m');
  assert(rank !== null, 'once a team is fielded the school is ranked in that sport');
  assert(sportRankedList(s, 'soccer-m').length === s.rivals.length + 1, 'and joins the table');
  assert(sportRank(s, 'soccer-w') === null, "but only in the sport it actually fields — the women's team is a separate program");

  // The player's number IS their teamQuality, so hiring a coach moves their
  // place on the table rather than some parallel figure.
  const team = playerTeamIn(s, 'soccer-m')!;
  const me = sportRankedList(s, 'soccer-m').find((e) => e.isPlayer)!;
  assert(me.value === teamQuality(team, s),
    `the player's per-sport number is their team's own quality (${me.value} vs ${teamQuality(team, s)})`);

  // A team waiting on its venue cannot compete, so it is not on the table —
  // the same rule that keeps it out of athleticProgramStrength.
  const s2 = fresh();
  fieldTeam(s2, 'soccer-m');
  s2.orgs.teams[0].status = 'awaitingVenue';
  assert(sportRank(s2, 'soccer-m') === null, 'a team still awaiting its venue is not ranked — it cannot compete yet');
}

// ---- The table is sorted, and the player sits where their number puts them ----
function testOrdering(): void {
  const s = fresh();
  fieldTeam(s, 'basketball-m');
  const list = sportRankedList(s, 'basketball-m');

  let sorted = true;
  for (let i = 1; i < list.length; i += 1) if (list[i - 1].value < list[i].value) sorted = false;
  assert(sorted, 'the table is sorted strongest first');

  const rank = sportRank(s, 'basketball-m')!;
  const mine = list[rank - 1];
  assert(mine.isPlayer, `sportRank points at the player's own row (row ${rank})`);
  const ahead = list.slice(0, rank - 1);
  assert(ahead.every((e) => e.value >= mine.value), 'and everybody ahead of them really is ahead');

  // Every row carries the mascot the standings table exists to show.
  assert(list.every((e) => typeof e.mascot === 'string'), 'every row carries a mascot');
  assert(list.filter((e) => !e.isPlayer).every((e) => e.mascot.length > 0), 'and every rival has one');
}

// ---- Athletic strength moves now ----
function testAthleticDrift(): void {
  const s = fresh();
  const before = s.rivals.map((r) => r.athleticStrength);

  // Ten annual boundaries.
  for (let year = 0; year < 10; year += 1) {
    s.clock.week = WEEKS_PER_YEAR;
    tickRivals(s);
    s.pendingInterrupt = null;
  }
  const after = s.rivals.map((r) => r.athleticStrength);

  const moved = after.filter((v, i) => v !== before[i]).length;
  assert(moved > s.rivals.length / 2,
    `athletic strength drifts over a decade — it used to be static (${moved} of ${s.rivals.length} schools moved)`);
  assert(after.every((v) => v >= 5 && v <= 100),
    `and stays inside the band teamQuality shares (min ${Math.min(...after)}, max ${Math.max(...after)})`);

  // The drift reaches the per-sport tables, since they are derived from it.
  const s2 = fresh();
  fieldTeam(s2, 'football');
  const rankBefore = sportRank(s2, 'football');
  for (let year = 0; year < 10; year += 1) {
    s2.clock.week = WEEKS_PER_YEAR;
    tickRivals(s2);
    s2.pendingInterrupt = null;
  }
  assert(typeof rankBefore === 'number' && typeof sportRank(s2, 'football') === 'number',
    'a fielded sport stays ranked across the drift');
  assert(athleticRank(s2) >= 1, 'and the department-wide rank still resolves');
}

console.log('sport-standings tests');
testDerivedAndStable();
testSportsDisagree();
testTableMembership();
testOrdering();
testAthleticDrift();

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
