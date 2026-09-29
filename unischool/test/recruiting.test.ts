// ---------------------------------------------------------------------
// ATHLETICS, DEEPENED (Plan 80G). The owner's decisions 6 and 7:
//
//   - flagships are chosen and capped: 2 at the low subsidy, 4 at medium,
//     6 at high, the first on the list; the rest take at most a share;
//   - only a flagship's scholarships are spent, and only a flagship
//     recruits: a class a year, to +15 over four years on full, lost the
//     same way when the money stops or the program is no longer a flagship;
//   - the college's pull (venue stage, campus life standing) is at most +5;
//   - the coach market always lists someone solid for each fielded sport;
//   - a version-81 save loads with no recruiting yet.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import {
  COLLEGE_PULL_MAX, RECRUITING_CLASSES, RECRUITING_FULL_LIFT, SOLID_COACH_POTENTIAL, SPORTS, annualScholarships, collegePull,
  departmentPot, isFlagship, orderedTeams, promoteToVarsityTeam, scholarshipCostFor, teamQuality,
} from '../src/data/studentLifeData';
import { venueExpansionsMax } from '../src/data/facilitiesData';
import { tickAthletics, tickRecruiting } from '../src/systems/athletics/athleticsSystem';
import { financeBreakdown } from '../src/systems/finance/financeSystem';
import { readSave, SAVE_VERSION } from '../src/state/persistence';
import { WEEKS_PER_YEAR } from '../src/state/types';
import type { GameState, StudentClub } from '../src/state/types';
import { bindScriptStream } from '../src/engine/random';

bindScriptStream(20260928);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) { failures += 1; console.error(`  ✗ ${msg}`); }
}

function fresh(): GameState {
  const s = createInitialState('Recruiting Test');
  s.pendingInterrupt = null;
  return s;
}

function fieldTeam(s: GameState, sportId: string): void {
  const sport = SPORTS.find((sp) => sp.id === sportId)!;
  const venue = s.tech.find((t) => t.kind === 'facility' && t.facilityType === sport.venueCategory)!;
  venue.status = 'done';
  const club: StudentClub = {
    id: `club-${sportId}`, name: sport.clubName, foundedYear: 1,
    foundingMembers: 12, foundingEnrolled: 350, upkeepPerWeek: 50,
    sport: sportId, varsityLastAskedYear: null,
  };
  s.orgs.clubs.push(club);
  promoteToVarsityTeam(s, club, { sport: sport.id, name: sport.teamName, venueCategory: sport.venueCategory, upkeepPerWeek: 400, status: 'active' });
}

const SEVEN = ['soccer-m', 'soccer-w', 'lacrosse-m', 'lacrosse-w', 'fieldHockey', 'track-m', 'track-w'];

function years(s: GameState, n: number): void {
  for (let i = 0; i < n * WEEKS_PER_YEAR; i += 1) tickRecruiting(s);
}

// ---- The cap, by subsidy level ----
{
  const s = fresh();
  for (const id of SEVEN) fieldTeam(s, id);
  const first = (n: number) => orderedTeams(s).slice(0, n).map((t) => t.id).join();
  for (const [tier, cap] of [['low', 2], ['medium', 4], ['high', 6]] as const) {
    s.orgs.athleticsBudget = tier;
    const pot = departmentPot(s);
    const flagships = pot.programs.filter((p) => p.band === 'flagship');
    assert(pot.cap === cap && flagships.length === cap, `the ${tier} subsidy allows ${cap} flagships (${flagships.length})`);
    assert(flagships.map((p) => p.team.id).join() === first(cap), `and they are the first ${cap} on the list`);
    assert(pot.programs.filter((p) => p.band !== 'flagship').every((p) => p.funded <= 0.6 + 1e-9), 'and no other program is funded past its share');
  }
  // Reordering chooses them.
  s.orgs.athleticsBudget = 'low';
  const last = orderedTeams(s).at(-1)!;
  const after = reducer(s, { type: 'SET_TEAM_ORDER', order: [last.id, ...orderedTeams(s).filter((t) => t.id !== last.id).map((t) => t.id)] });
  assert(isFlagship(after, after.orgs.teams.find((t) => t.id === last.id)!), 'dragged to the top, the last program becomes a flagship');
  assert(departmentPot(after).programs.filter((p) => p.band === 'flagship').length === 2, 'and the cap still holds');
}

// ---- Scholarships: set on any team, spent only on a flagship ----
{
  let s = fresh();
  for (const id of ['football', 'basketball-m', 'soccer-m']) fieldTeam(s, id);
  s.orgs.athleticsBudget = 'low';
  for (const t of s.orgs.teams) s = reducer(s, { type: 'SET_SCHOLARSHIPS', teamId: t.id, level: 'full' });
  assert(s.orgs.teams.every((t) => t.scholarships === 'full'), 'the budget is set on each team');
  const bad = reducer(structuredClone(s), { type: 'SET_SCHOLARSHIPS', teamId: s.orgs.teams[0].id, level: 'lavish' as never });
  assert(bad.orgs.teams[0].scholarships === 'full', 'a level that is not one is refused');
  const spent = scholarshipCostFor('football', 'full') + scholarshipCostFor('basketball-m', 'full');
  assert(annualScholarships(s) === spent, `only the two flagships spend (${annualScholarships(s)} of ${spent})`);
  assert(Math.abs(financeBreakdown(s).athleticScholarships * WEEKS_PER_YEAR - spent) < 1e-6, 'and the Treasury pays it as its own line');
  assert(scholarshipCostFor('football', 'some') === scholarshipCostFor('football', 'full') / 2, 'some costs half of full');
  s = reducer(s, { type: 'SET_SCHOLARSHIPS', teamId: s.orgs.teams[0].id, level: 'none' });
  assert(annualScholarships(s) === scholarshipCostFor('basketball-m', 'full'), 'cut to none, a flagship spends nothing');
}

// ---- Recruiting builds a class a year, and falls away the same way ----
{
  const s = fresh();
  for (const id of ['soccer-m', 'soccer-w', 'lacrosse-m']) fieldTeam(s, id);
  s.orgs.athleticsBudget = 'low';
  const [a, b, c] = orderedTeams(s);
  a.scholarships = 'full';
  b.scholarships = 'some';
  c.scholarships = 'full'; // no flagship: kept, not spent, and it recruits nothing
  const perClass = RECRUITING_FULL_LIFT / RECRUITING_CLASSES;
  years(s, 1);
  assert(Math.abs(a.recruiting - perClass) < 1e-6, `a year of full scholarships recruits one class (${a.recruiting.toFixed(2)} of ${perClass})`);
  assert(Math.abs(b.recruiting - perClass / 2) < 1e-6, `some recruits half a class (${b.recruiting.toFixed(2)})`);
  assert(c.recruiting === 0, 'a program that is no flagship recruits nothing');
  years(s, RECRUITING_CLASSES - 1);
  assert(Math.abs(a.recruiting - RECRUITING_FULL_LIFT) < 1e-6, `${RECRUITING_CLASSES} years of full build the whole +${RECRUITING_FULL_LIFT} (${a.recruiting.toFixed(2)})`);
  assert(Math.abs(b.recruiting - RECRUITING_FULL_LIFT / 2) < 1e-6, `some holds at half (${b.recruiting.toFixed(2)})`);
  years(s, 2);
  assert(Math.abs(a.recruiting - RECRUITING_FULL_LIFT) < 1e-6, 'and it holds there, no higher');

  // Recruiting is team strength.
  const withIt = teamQuality(a, s);
  const saved = a.recruiting;
  a.recruiting = 0;
  assert(withIt - teamQuality(a, s) >= RECRUITING_FULL_LIFT - 1, `full recruiting is worth about +${RECRUITING_FULL_LIFT} (${withIt - teamQuality(a, s)})`);
  a.recruiting = saved;

  // The money stops: a class graduates each year.
  a.scholarships = 'none';
  years(s, 1);
  assert(Math.abs(a.recruiting - (RECRUITING_FULL_LIFT - perClass)) < 1e-6, `cut, a year loses a class (${a.recruiting.toFixed(2)})`);
  years(s, RECRUITING_CLASSES);
  assert(a.recruiting === 0, 'and in four years it is gone');

  // No longer a flagship: the same.
  const before = b.recruiting;
  s.orgs.teamOrder = [c.id, a.id, b.id];
  assert(!isFlagship(s, b), 'moved down the list, the second program is no flagship');
  years(s, 1);
  assert(Math.abs(b.recruiting - (before - perClass)) < 1e-6, `and its recruiting falls away (${before.toFixed(2)} -> ${b.recruiting.toFixed(2)})`);
  assert(c.recruiting > 0, 'while the new flagship starts to build on its kept budget');
}

// ---- The pull: bounded, from the venue's stage and campus life ----
{
  const s = fresh();
  fieldTeam(s, 'football');
  const team = s.orgs.teams[0];
  const stadium = s.tech.find((t) => t.id === 'ATH-STADIUM')!;
  s.self.socialStanding = 0;
  stadium.expansions = 0;
  assert(collegePull(s, team).total === 0, 'an unexpanded venue at a college nobody knows for campus life pulls nothing');
  stadium.expansions = venueExpansionsMax(stadium.id);
  s.self.socialStanding = 150;
  const full = collegePull(s, team);
  assert(Math.abs(full.total - COLLEGE_PULL_MAX) < 1e-9 && COLLEGE_PULL_MAX <= 5, `at full seating and the top of campus life, the pull is +${COLLEGE_PULL_MAX} (${full.total})`);
  assert(full.venue > 0 && full.standing > 0, 'half from each');
  stadium.expansions = 99;
  s.self.socialStanding = 10_000;
  assert(collegePull(s, team).total <= COLLEGE_PULL_MAX + 1e-9, 'and never more');
  stadium.status = 'available';
  assert(collegePull(s, team).venue === 0, 'a venue that does not stand adds nothing');
}

// ---- The coach market always lists someone solid ----
{
  const s = fresh();
  for (const id of ['football', 'basketball-w', 'swimming-m']) fieldTeam(s, id);
  s.orgs.coachCandidates = [];
  let short = 0;
  let listed = 0;
  let elite = 0;
  const seen = new Set<string>();
  for (let week = 0; week < 150; week += 1) {
    tickAthletics(s);
    for (const t of s.orgs.teams) {
      if (!s.orgs.coachCandidates.some((c) => c.field === t.sport && c.qualityPotential >= SOLID_COACH_POTENTIAL)) short += 1;
    }
    for (const c of s.orgs.coachCandidates) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      listed += 1;
      if (c.qualityPotential > 78) elite += 1; // above the solid band's top: only an elite roll
    }
    // Hire the solid one away now and then: the floor lists another.
    if (week % 10 === 0) {
      const solid = s.orgs.coachCandidates.findIndex((c) => c.field === 'football' && c.qualityPotential >= SOLID_COACH_POTENTIAL);
      if (solid >= 0) s.orgs.coachCandidates.splice(solid, 1);
    }
  }
  assert(short === 0, `every fielded sport had a solid-or-better listing every week (${short} weeks short)`);
  assert(elite / listed < 0.12, `and elite coaches stay rare (${elite} of ${listed})`);
}

// ---- A version-81 save loads with no recruiting yet ----
{
  const raw = readFileSync(join(process.cwd(), 'test/fixtures/save-v81-recruiting.json'), 'utf8');
  const parsed = JSON.parse(raw) as { version: number; state: GameState };
  assert(parsed.version === 81 && parsed.state.orgs.teams.length > 0, 'the fixture was written at version 81, with teams');
  assert(parsed.state.orgs.teams.every((t) => !('recruiting' in t)), 'before recruiting');
  const read = readSave(raw);
  assert(!('refused' in read), 'it loads');
  if (!('refused' in read)) {
    assert(SAVE_VERSION >= 82, `at version 82 or later (${SAVE_VERSION})`);
    assert(read.state.orgs.teams.every((t) => t.scholarships === 'none' && t.recruiting === 0), 'every team with no scholarships and nothing built up');
    assert(departmentPot(read.state).programs.filter((p) => p.band === 'flagship').length <= departmentPot(read.state).cap, 'and its flagships within the cap');
  }
  // A hand-edited save's recruiting is on the scale and its level is a level.
  const edited = JSON.parse(raw) as { version: number; state: GameState };
  edited.version = SAVE_VERSION;
  edited.state.orgs.teams[0].recruiting = 400;
  edited.state.orgs.teams[0].scholarships = 'lavish' as never;
  const back = readSave(JSON.stringify(edited));
  assert(!('refused' in back) && back.state.orgs.teams[0].recruiting === RECRUITING_FULL_LIFT && back.state.orgs.teams[0].scholarships === 'none', 'an edited save is brought back on the scale');
}

console.log('recruiting tests');
if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
