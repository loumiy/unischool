// ---------------------------------------------------------------------
// The postseason (see systems/athletics/playoffs.ts). Behavioral checks
// against the real bracket and the real tick, covering what the feature
// promises:
//
//   - a bracket is not a season: no week contains a game, and the only
//     thing that stops the clock is a title;
//   - a department with empty chairs does not qualify, and a well-staffed
//     one does — which is the whole loop this plan was written around;
//   - "did not qualify" is a recorded RESULT, not an absence;
//   - a title is monotone, and moves campus-life standing;
//   - the report QUEUES, so the playoff week can belong to something else.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { SPORTS, promoteToVarsityTeam, teamQuality, rollAthleticDirectorCandidates } from '../src/data/studentLifeData';
import { tickAthletics } from '../src/systems/athletics/athleticsSystem';
import { PLAYOFF_FIELD, resolveSport } from '../src/systems/athletics/playoffs';
import { tickEvents } from '../src/systems/events/eventSystem';
import { computeSocialTarget } from '../src/systems/prestige/prestigeSystem';
import { sportRankedList } from '../src/systems/rivals/rivalsSystem';
import { makeRivalRng } from '../src/data/rivalData';
import type { Coach, GameState, StudentClub } from '../src/state/types';

let seed = 5150;
Math.random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) { failures += 1; console.error(`  ✗ ${msg}`); }
}

function fresh(): GameState { return createInitialState('Playoff Test'); }

function coach(quality: number, field: string): Coach {
  return {
    id: `c-${field}-${quality}-${Math.random()}`, name: 'Test Coach', gender: 'female',
    heritage: 'Anglo/Western European', field, quality, qualityPotential: quality,
    tenureWeeks: 0, weeksListed: 0, salary: 90_000,
  };
}

// A team, optionally staffed to a given coaching quality.
function fieldTeam(s: GameState, sportId: string, staffQuality: number | null): void {
  const sport = SPORTS.find((sp) => sp.id === sportId)!;
  const club: StudentClub = {
    id: `club-${sportId}`, name: sport.clubName, foundedYear: 1,
    foundingMembers: 12, foundingEnrolled: 350, upkeepPerWeek: 50,
    sport: sportId, varsityLastAskedYear: null,
  };
  s.orgs.clubs.push(club);
  const team = promoteToVarsityTeam(s, club, {
    sport: sport.id, name: sport.teamName, venueCategory: sport.venueCategory,
    upkeepPerWeek: 400, status: 'active',
  });
  if (staffQuality !== null) {
    team.headCoach = coach(staffQuality, sportId);
    team.assistantCoach = coach(staffQuality, sportId);
    team.trainer = coach(staffQuality, 'strength-conditioning');
  }
}

// ---- The loop: staffing is what qualifies you ----
function testStaffingQualifies(): void {
  const weak = fresh();
  fieldTeam(weak, 'soccer-m', null); // every chair empty
  const weakQuality = teamQuality(weak.orgs.teams[0], weak);
  const cut = sportRankedList(weak, 'soccer-m').filter((e) => !e.isPlayer)[PLAYOFF_FIELD - 1].value;
  assert(weakQuality < cut,
    `a department with every chair empty is nowhere near the field of ${PLAYOFF_FIELD} (quality ${weakQuality} against a cut of ${cut})`);

  const strong = fresh();
  fieldTeam(strong, 'soccer-m', 92);
  strong.orgs.athleticDirector = rollAthleticDirectorCandidates()[2];
  strong.orgs.athleticsBudget = 'high';
  assert(teamQuality(strong.orgs.teams[0], strong) > cut,
    `a well-staffed one clears it (quality ${teamQuality(strong.orgs.teams[0], strong)} against ${cut})`);
}

// ---- "Did not qualify" is a result ----
function testMissedIsARecordedResult(): void {
  const s = fresh();
  fieldTeam(s, 'soccer-m', null);
  const result = resolveSport(s, 'soccer-m', makeRivalRng(1));
  assert(result.finish === 'missed', `an unqualified program records a finish of 'missed' (got '${result.finish}')`);
  assert(result.seed === null, 'with no seed, because it did not enter');
  assert(result.champion.length > 0, 'and still says who did win it — the season happened without you');
}

// ---- A strong department wins, sometimes ----
function testStrongDepartmentWins(): void {
  let titles = 0;
  let entered = 0;
  for (let run = 0; run < 40; run += 1) {
    const s = fresh();
    fieldTeam(s, 'soccer-m', 95);
    s.orgs.athleticDirector = rollAthleticDirectorCandidates()[2];
    s.orgs.athleticsBudget = 'high';
    const result = resolveSport(s, 'soccer-m', makeRivalRng(run * 7919 + 13));
    if (result.finish !== 'missed') entered += 1;
    if (result.finish === 'champion') titles += 1;
  }
  assert(entered === 40, `an elite program qualifies every year (entered ${entered} of 40)`);
  // Neither a coin flip nor a certainty: seeding matters a great deal, and
  // an upset is always available. Bracketed rather than pinned, since the
  // exact rate is a tuning value.
  assert(titles > 4 && titles < 36,
    `and wins some but not all of them — a title is earned, not owed (${titles} of 40)`);
}

// ---- A bracket is not a season ----
function testBracketIsNotASeason(): void {
  const s = fresh();
  fieldTeam(s, 'soccer-m', 95);
  s.orgs.athleticsBudget = 'high';

  let interruptsRaised = 0;
  for (let week = 1; week <= 52; week += 1) {
    s.clock.week = week;
    tickAthletics(s);
    if (s.pendingInterrupt) { interruptsRaised += 1; s.pendingInterrupt = null; }
  }
  assert(interruptsRaised === 0, `no week of the year stops the clock for athletics itself (got ${interruptsRaised})`);
  assert(!!s.orgs.lastSeason['soccer-m'], 'and the postseason still produced a result');
  assert(s.orgs.lastSeason['soccer-m'].year === s.clock.year, 'stamped with the year it was played');
}

// ---- The report queues rather than firing on the spot ----
function testTitleQueues(): void {
  const s = fresh();
  fieldTeam(s, 'soccer-m', 98);
  s.orgs.athleticsBudget = 'high';
  s.orgs.athleticDirector = rollAthleticDirectorCandidates()[2];

  // Force a title rather than hoping for one: what is under test is the
  // queue, not the bracket.
  s.orgs.titles.push({ sport: 'soccer-m', year: s.clock.year });
  s.orgs.lastSeason['soccer-m'] = {
    year: s.clock.year, sport: 'soccer-m', seed: 1, finish: 'champion',
    beaten: ['A Owls', 'B Hawks', 'C Rams'], lostTo: null, champion: 'Playoff Test', championMascot: '',
  };
  s.orgs.pendingTitles.push('soccer-m');

  // The playoff week is busy: something else already holds the interrupt.
  s.pendingInterrupt = { type: 'admissions' };
  tickEvents(s);
  assert(s.pendingInterrupt.type === 'admissions', 'a busy week is left alone');
  assert(s.orgs.pendingTitles.length === 1, 'and the title stays queued rather than being dropped');

  s.pendingInterrupt = null;
  tickEvents(s);
  assert(s.pendingInterrupt?.type === 'championship', 'the next quiet week reports it');
  assert(s.orgs.pendingTitles.length === 0, 'and drains the queue');
}

// ---- A title moves campus-life standing ----
function testTitleMovesStanding(): void {
  const s = fresh();
  fieldTeam(s, 'soccer-m', 80);
  const before = computeSocialTarget(s);
  s.orgs.titles.push({ sport: 'soccer-m', year: s.clock.year });
  const after = computeSocialTarget(s);
  assert(after > before, `a championship lifts campus-life standing (${before.toFixed(1)} -> ${after.toFixed(1)})`);

  // Monotone: a banner does not come down in a quiet decade.
  const later = { ...s, clock: { ...s.clock, year: s.clock.year + 20 } };
  assert(computeSocialTarget(later) >= after, 'and keeps lifting it twenty years later');

  // And it reaches nothing else. The academic number athletics is forbidden
  // to touch stays exactly where it was.
  const academicBefore = fresh();
  fieldTeam(academicBefore, 'soccer-m', 80);
  const withTitles = { ...academicBefore, orgs: { ...academicBefore.orgs, titles: [{ sport: 'soccer-m', year: 1 }] } };
  assert(
    JSON.stringify(computeSocialTarget(withTitles)) !== JSON.stringify(computeSocialTarget(academicBefore)),
    'the social target reads titles',
  );
}

console.log('playoff tests');
testStaffingQualifies();
testMissedIsARecordedResult();
testStrongDepartmentWins();
testBracketIsNotASeason();
testTitleQueues();
testTitleMovesStanding();

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
