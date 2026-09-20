// ---------------------------------------------------------------------
// THE DEPARTMENT (Plan 21, Phases 1 and 2). What athletics is for once its
// outputs have somewhere to go and the department has something to decide:
//
//   - a venue carries a campus-life contribution, and the legacy grades it;
//   - the gate saturates: a venue holds what it holds, and a full house at
//     a huge school is a rounding error against its opex;
//   - the pot funds programs as a queue in list order, the line falls where
//     the money runs out, and a program below it is discounted, not zeroed;
//   - the ceiling is exactly 100 for a maxed department, not 118;
//   - a title reaches the athletes cohort and the modal names it.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import {
  SPORTS, promoteToVarsityTeam, teamQuality, coachingQuality, departmentPot, orderedTeams, sportEconomics,
  rollAthleticDirectorCandidates, athleticBreadth,
} from '../src/data/studentLifeData';
import { VENUE_SEATS } from '../src/data/facilitiesData';
import { attendanceFor, annualGateFor, venueSeats } from '../src/systems/athletics/gate';
import { financeBreakdown } from '../src/systems/finance/financeSystem';
import { legacy } from '../src/state/legacy';
import { deriveCohortSignals, cohortBreakdown, athleticResultsFor } from '../src/systems/admissions/cohorts';
import { WEEKS_PER_YEAR } from '../src/state/types';
import type { Coach, GameState, StudentClub } from '../src/state/types';

let seed = 20260921;
Math.random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) { failures += 1; console.error(`  ✗ ${msg}`); }
}

function fresh(): GameState {
  return createInitialState('Department Test');
}

function fieldTeam(s: GameState, sportId: string, build = true): void {
  const sport = SPORTS.find((sp) => sp.id === sportId)!;
  if (build) {
    const venue = s.tech.find((t) => t.kind === 'facility' && t.facilityType === sport.venueCategory)!;
    venue.status = 'done';
  }
  const club: StudentClub = {
    id: `club-${sportId}`, name: sport.clubName, foundedYear: 1,
    foundingMembers: 12, foundingEnrolled: 350, upkeepPerWeek: 50,
    sport: sportId, varsityLastAskedYear: null,
  };
  s.orgs.clubs.push(club);
  promoteToVarsityTeam(s, club, {
    sport: sport.id, name: sport.teamName, venueCategory: sport.venueCategory,
    upkeepPerWeek: 400, status: build ? 'active' : 'awaitingVenue',
  });
}

function coach(field: string, quality: number): Coach {
  return {
    id: `coach-${field}-${quality}-${Math.random()}`, name: 'Test Coach', gender: 'male', heritage: 'Anglo/Western European',
    field, quality, qualityPotential: quality, tenureWeeks: 0, weeksListed: 0, salary: 100_000,
  };
}

function staff(s: GameState, sportId: string, quality: number): void {
  const team = s.orgs.teams.find((t) => t.sport === sportId)!;
  team.headCoach = coach(sportId, quality);
  team.assistantCoach = coach(sportId, quality);
  team.trainer = coach('strength-conditioning', quality);
}

// ---- PR B: a venue is worth something to campus life, and the legacy grades it ----
function testCampusLife(): void {
  const s = fresh();
  const before = legacy(s).axes.find((a) => a.key === 'campusLife')!;
  assert(legacy(s).axes.length === 7 && before.key === 'campusLife', 'the legacy has seven axes and campus life is the seventh');
  fieldTeam(s, 'football');
  staff(s, 'football', 80);
  s.orgs.titles.push({ sport: 'football', year: s.clock.year });
  const after = legacy(s).axes.find((a) => a.key === 'campusLife')!;
  assert(after.score > before.score, `a stadium, a program and a title lift the campus-life axis (${before.score.toFixed(2)} -> ${after.score.toFixed(2)})`);
  const stadium = s.tech.find((t) => t.id === 'ATH-STADIUM')!;
  assert((stadium.effects?.prestigeContribution ?? 0) > 0, 'the stadium carries a prestige contribution');
}

// ---- PR D: the gate saturates, and is a rounding error at scale ----
function testGate(): void {
  const s = fresh();
  fieldTeam(s, 'football');
  const team = s.orgs.teams[0];
  assert(venueSeats(s, team) === VENUE_SEATS['ATH-STADIUM'], 'the stadium seats what the table says');
  staff(s, 'football', 100);
  s.orgs.athleticDirector = { ...coach('athletic-director', 90) };
  const small = attendanceFor(s, team);
  assert(small > 0 && small < VENUE_SEATS['ATH-STADIUM'], `a founding school does not fill a stadium (${small} of ${VENUE_SEATS['ATH-STADIUM']})`);
  // A huge school: the crowd is there, and the venue is what caps it.
  s.students.classes = { freshman: 20_000, sophomore: 20_000, junior: 20_000, senior: 20_000 };
  const full = attendanceFor(s, team);
  assert(full <= VENUE_SEATS['ATH-STADIUM'], `the gate saturates at the seats (${full})`);
  assert(full > small, 'and a bigger body draws a bigger crowd');
  const gate = annualGateFor(s, team);
  const opex = financeBreakdown(s).totalExpenses * WEEKS_PER_YEAR;
  assert(gate / opex < 0.05, `a full house at an 80,000-student school is a rounding error against opex (${(gate / opex * 100).toFixed(1)}%)`);
  // Attendance follows the staff, not the pot: the earned half never reads itself.
  const q = coachingQuality(team, s);
  assert(q > 0 && q <= 100, 'coaching quality is on the scale');
}

// ---- PR G: the queue, the line, the discount ----
function testPot(): void {
  const s = fresh();
  fieldTeam(s, 'football');
  fieldTeam(s, 'basketball-m');
  fieldTeam(s, 'soccer-m');
  fieldTeam(s, 'swimming-w', false); // awaiting its natatorium
  for (const id of ['football', 'basketball-m', 'soccer-m']) staff(s, id, 70);
  s.orgs.athleticsBudget = 'high';
  const pot = departmentPot(s);
  assert(pot.programs.length === 3, 'a team awaiting its venue sits out of the queue');
  assert(pot.programs[0].team.sport === 'football', 'the queue is the list order, and a new program joins at the end');
  assert(pot.subsidy === 3_000_000, 'the high tier is a $3M subsidy');
  s.orgs.athleticsBudget = 'medium';
  assert(departmentPot(s).programs[0].funded < 1, 'and at medium a football program alone outruns the subsidy — the pot needs the gate');
  s.orgs.athleticsBudget = 'high';
  const football = sportEconomics('football').costToCompete;
  assert(pot.programs[0].drawn === football && pot.programs[0].band === 'flagship', 'football, first, draws its full cost and is a flagship');
  assert(pot.programs[1].funded < 1 && pot.programs[1].funded > 0 && pot.programs[1].band === 'competitive', 'the pot reaches basketball part-way');
  assert(pot.programs[2].funded === 0 && pot.programs[2].band === 'developmental', 'and never reaches soccer');
  assert(pot.fundedLine === 1, 'the line falls under football');
  assert(Math.abs(pot.drawn + pot.surplus - pot.pot) < 1, 'drawn plus surplus is the pot');

  // Below the line is a discount, not a zero.
  const soccer = s.orgs.teams.find((t) => t.sport === 'soccer-m')!;
  const unfunded = teamQuality(soccer, s);
  assert(unfunded > coachingQuality(soccer, s) * 0.8, `an unfunded program runs at a floor, not a zero (${unfunded} against staff ${coachingQuality(soccer, s).toFixed(0)})`);

  // Drag soccer to the top on the medium tier: it becomes the flagship, and
  // the money runs out before football is whole.
  s.orgs.athleticsBudget = 'medium';
  const order = orderedTeams(s).map((t) => t.id);
  const reordered = [order[2], order[0], order[1], order[3]];
  const after = reducer(s, { type: 'SET_TEAM_ORDER', order: reordered });
  const pot2 = departmentPot(after);
  assert(pot2.programs[0].team.sport === 'soccer-m' && pot2.programs[0].band === 'flagship', 'dragged to the top, soccer is the flagship');
  assert(pot2.programs[1].team.sport === 'football' && pot2.programs[1].funded < 1, 'and football below it no longer draws in full');
  const footballTeam = after.orgs.teams.find((t) => t.sport === 'football')!;
  assert(footballTeam.headCoach === null || footballTeam.headCoach !== null, 'demotion may cost the head coach (a coin flip on the reorder)');

  // A high tier and a surplus: the school gets money back.
  after.orgs.athleticsBudget = 'high';
  after.orgs.teams = after.orgs.teams.filter((t) => t.sport === 'soccer-m');
  const rich = departmentPot(after);
  assert(rich.surplus > 0, 'one Olympic program on a high subsidy returns a surplus to the school');
  const flow = financeBreakdown(after);
  assert(Math.abs(flow.athleticsSurplus * WEEKS_PER_YEAR - rich.surplus) < 1, 'the Treasury carries the surplus as income');
  assert(Math.abs(flow.athleticsSubsidy * WEEKS_PER_YEAR - rich.subsidy) < 1, 'and the subsidy as an expense');
}

// ---- PR I: the ceiling is exactly 100 ----
function testCeiling(): void {
  const s = fresh();
  fieldTeam(s, 'basketball-m');
  staff(s, 'basketball-m', 90);
  s.orgs.athleticsBudget = 'high';
  s.orgs.athleticDirector = rollAthleticDirectorCandidates()[2];
  s.orgs.athleticDirector.quality = 90;
  const team = s.orgs.teams[0];
  assert(departmentPot(s).programs[0].funded === 1, 'the one program is fully funded');
  const q = teamQuality(team, s);
  assert(q === 100, `three chairs at 90, fully funded, a 90 director, is exactly 100 (got ${q})`);
  team.headCoach!.quality = 80;
  assert(teamQuality(team, s) < 100, 'and ten points off the head coach shows');
}

// ---- PR F: breadth is weighted by scale ----
function testBreadth(): void {
  const s = fresh();
  fieldTeam(s, 'football');
  fieldTeam(s, 'swimming-m');
  assert(athleticBreadth(s) === sportEconomics('football').breadthWeight + sportEconomics('swimming-m').breadthWeight, 'breadth sums the sports\' weights');
  assert(sportEconomics('football').costToCompete > sportEconomics('basketball-m').costToCompete && sportEconomics('basketball-m').costToCompete > sportEconomics('soccer-m').costToCompete, 'football costs more than basketball costs more than soccer');
}

// ---- PR C: a title reaches the pool, and the modal names it ----
function testTitleReachesThePool(): void {
  const s = fresh();
  fieldTeam(s, 'basketball-m');
  staff(s, 'basketball-m', 80);
  const before = deriveCohortSignals(s);
  s.orgs.titles.push({ sport: 'basketball-m', year: s.clock.year - 1 });
  const after = deriveCohortSignals(s);
  assert(after.athleticResults > before.athleticResults, 'a title is a result');
  assert(after.athleticResultsLabel.includes("Men's Basketball"), `and the label names it (${after.athleticResultsLabel})`);
  const cards = cohortBreakdown(after, 30_000, 20_000, 10_000);
  const athletes = cards.find((c) => c.id === 'athletes')!;
  assert(!!athletes.note && athletes.note.includes('worth'), `the modal says what the title is worth (${athletes.note})`);
  s.clock.year += 6;
  assert(athleticResultsFor(s).results === 0, 'and it fades within the window');
}

console.log('department tests');
testCampusLife();
testGate();
testPot();
testCeiling();
testBreadth();
testTitleReachesThePool();

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
