// ---------------------------------------------------------------------
// What the offices do (Plan 89E). For each of the twelve: nothing without
// the office, its effect with it, and half again with its seat filled; and
// the two offices that add an action, their gates.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { bindScriptStream } from '../src/engine/random';
import { OFFICE_MILESTONES } from '../src/data/ladderData';
import {
  CHARTER_INTERVAL_WEEKS, OFFICES, OFFICE_SEAT_BONUS, RECRUITMENT_LISTING_EXTRA_WEEKS, RECRUITMENT_POOL_EXTRA,
} from '../src/data/officeData';
import { CANDIDATE_LISTING_WEEKS, CANDIDATE_POOL_TARGET } from '../src/data/facultyData';
import { DEMAND_COOLDOWN_WEEKS, DEMAND_DEADLINE_WEEKS } from '../src/data/demandData';
import { SPORTS } from '../src/data/studentLifeData';
import {
  admissionsRange, campaignFactor, candidateListingWeeks, candidatePoolTarget, charterIntervalWeeks, demandCooldownWeeks,
  demandDeadlineWeeks, eventDamageFactor, givingFactor, paydownFactor,
} from '../src/systems/administration/effects';
import { charterRefusal, foundTeamCost, foundTeamRefusal } from '../src/systems/administration/officeActions';
import { rankForecast } from '../src/systems/administration/forecast';
import { cohortDemandFactor, deriveCohortSignals } from '../src/systems/admissions/cohorts';
import { priceTolerance } from '../src/systems/admissions/admissionsSystem';
import { committeeSeats } from '../src/systems/techtree/techSystem';
import { annualGiving } from '../src/systems/alumni/giving';
import { WEEKS_PER_YEAR, type GameState } from '../src/state/types';

bindScriptStream(12345);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('office effects tests');

function college(name = 'Effects'): GameState {
  const s = createInitialState(name);
  s.finance.cash = 500_000_000;
  s.finance.weeklyOpEx = 400_000;
  for (const m of OFFICE_MILESTONES) s.ladder.reached[m.id] = 1;
  return s;
}
function withOffice(s: GameState, officeId: string): GameState {
  const slot = s.halls['BLDG-GENSTUDIES'].findIndex((x) => x.programId === null && !x.office);
  const t = reducer(s, { type: 'OPEN_OFFICE', officeId, slot });
  assert(t !== s, `${officeId} opens`);
  return t;
}
function seated(s: GameState, officeId: string): GameState {
  const seatId = OFFICES.find((o) => o.id === officeId)!.seatId;
  return { ...s, seats: [{ seatId, school: null, holder: 'x', internal: false, policy: 'p', salary: 1, appointedYear: 1 }] };
}
// The three readings of a lever: closed, open, open with its seat.
function three<T>(officeId: string, read: (s: GameState) => T, name = officeId): [T, T, T] {
  const base = college(name);
  const open = withOffice(base, officeId);
  return [read(base), read(open), read(seated(open, officeId))];
}

// ---- Enrolment ----
{
  const [none, open, seat] = three('career-services', (s) => {
    const signals = { ...deriveCohortSignals(s), professionalPrograms: 6 };
    const tol = priceTolerance(50);
    return cohortDemandFactor(signals, tol, tol);
  });
  assert(open > none && seat > open, `Career Services pulls more applicants (${none.toFixed(4)} → ${open.toFixed(4)} → ${seat.toFixed(4)})`);
}
{
  const [none, open, seat] = three('financial-aid', (s) => {
    const tol = priceTolerance(50);
    return cohortDemandFactor(deriveCohortSignals(s), tol, tol * 1.2);
  });
  assert(open > none && seat > open, `the Financial Aid Office pulls the price-sensitive at the same sticker (${none.toFixed(4)} → ${open.toFixed(4)} → ${seat.toFixed(4)})`);
}
{
  const [none, open, seat] = three('admissions', (s) => admissionsRange(s, 10_000));
  assert(none === null, 'no Admissions Office, no range');
  assert(open !== null && open.low < 10_000 && open.high > 10_000, `a range around the projection (${open?.low}–${open?.high})`);
  assert(seat !== null && open !== null && seat.high - seat.low < open.high - open.low, `narrower with the Provost (${seat?.low}–${seat?.high})`);
}

// ---- Academic ----
{
  const [none, open, seat] = three('curriculum', committeeSeats);
  assert(open === none + 1 && seat === open, `one more committee seat, a whole one (${none} → ${open} → ${seat})`);
}
{
  const [none, open, seat] = three('faculty-recruitment', (s) => [candidatePoolTarget(s), candidateListingWeeks(s)]);
  assert(none[0] === CANDIDATE_POOL_TARGET && none[1] === CANDIDATE_LISTING_WEEKS, 'the market as it was without the office');
  assert(open[0] === CANDIDATE_POOL_TARGET + RECRUITMENT_POOL_EXTRA && open[1] === CANDIDATE_LISTING_WEEKS + RECRUITMENT_LISTING_EXTRA_WEEKS,
    `a deeper market, listed longer (${open.join(', ')})`);
  assert(seat[0] > open[0] && seat[1] > open[1], `deeper still with the Provost (${seat.join(', ')})`);
}

// ---- Students ----
{
  const [none, open, seat] = three('counseling', (s) => [demandCooldownWeeks(s), demandDeadlineWeeks(s)]);
  assert(none[0] === DEMAND_COOLDOWN_WEEKS && none[1] === DEMAND_DEADLINE_WEEKS, 'demands as they were without the office');
  assert(open[0] > none[0] && open[1] > none[1] && seat[0] > open[0] && seat[1] > open[1],
    `demands come less often and give longer (${none.join('/')} → ${open.join('/')} → ${seat.join('/')})`);
}
{
  const [none, open, seat] = three('student-activities', charterIntervalWeeks);
  assert(none === Infinity && open === CHARTER_INTERVAL_WEEKS && seat < open, `a charter every ${open} weeks, ${seat} with the Dean of Students`);
}

// The charter.
{
  let s = withOffice(college('Charter'), 'student-activities');
  const center = s.tech.find((t) => t.id === 'SCTR-T1');
  if (center) center.status = 'done';
  assert(charterRefusal(s) === null, `a club may be chartered (${charterRefusal(s)})`);
  const before = s.orgs.clubs.length;
  s = reducer(s, { type: 'CHARTER_CLUB' });
  assert(s.orgs.clubs.length === before + 1, 'CHARTER_CLUB adds a recognized club at once');
  assert(s.orgs.pendingPetitions.length === 0, 'without a petition');
  assert(charterRefusal(s)?.startsWith('The office can charter another club in') === true, 'and not again until the interval is up');
  assert(reducer(s, { type: 'CHARTER_CLUB' }) === s, 'a second charter is refused');
  assert(charterRefusal(college('NoOffice')) === 'The college has no Student Activities Office.', 'no office, no charter');
}

// The team.
{
  let s = withOffice(college('Team'), 'athletics-development');
  const sport = SPORTS.find((x) => s.tech.some((t) => t.kind === 'facility' && t.facilityType === x.venueCategory))!;
  const club = { id: 'club-x', name: sport.clubName, foundedYear: s.clock.year, foundingMembers: 20, foundingEnrolled: 100, upkeepPerWeek: 10, sport: sport.id, varsityLastAskedYear: null };
  s.orgs.clubs.push(club);
  assert(foundTeamRefusal(s, club.id)?.includes('built first') === true, `no team before its venue stands (${foundTeamRefusal(s, club.id)})`);
  for (const t of s.tech) if (t.kind === 'facility' && t.facilityType === sport.venueCategory) t.status = 'done';
  assert(foundTeamRefusal(s, club.id) === null, 'with the venue standing, a club of this year founds a team');
  const cost = foundTeamCost(s);
  const cash = s.finance.cash;
  s = reducer(s, { type: 'FOUND_TEAM', clubId: club.id });
  assert(s.orgs.teams.some((t) => t.sport === sport.id && t.status === 'active'), 'FOUND_TEAM makes it an active varsity team');
  assert(!s.orgs.clubs.some((c) => c.id === club.id), 'and the club leaves the list');
  assert(Math.abs(s.finance.cash - (cash - cost)) < 1, `for its price (${cost})`);
  assert(foundTeamCost(seated(s, 'athletics-development')) < cost, 'cheaper with the Dean of Students');
}

// ---- Money and standing ----
{
  const [none, open, seat] = three('facilities-management', (s) => [paydownFactor(s), eventDamageFactor(s)]);
  assert(none[0] === 1 && none[1] === 1, 'the estate as it was without the office');
  assert(open[0] === 2 && open[1] < 1 && seat[0] > open[0] && seat[1] < open[1], `a backlog paid down twice as fast, damage smaller (${open.join('/')} → ${seat.join('/')})`);
}
{
  const [none, open, seat] = three('alumni-relations', (s) => [givingFactor(s), campaignFactor(s)]);
  assert(none[0] === 1 && none[1] === 1 && open[0] > 1 && open[1] > 1 && seat[0] > open[0] && seat[1] > open[1],
    `more giving and further campaigns (${open.join('/')} → ${seat.join('/')})`);
  const alumni = [{ classYear: 1, size: 1000, satisfaction: 80, quality: 60, memory: [], warmth: 80, nudged: 0 }];
  const closed = college('Giving');
  closed.alumni = alumni;
  closed.clock.year = 20;
  const opened = withOffice(closed, 'alumni-relations');
  assert(annualGiving(closed) > 0 && annualGiving(opened) > annualGiving(closed), `the annual fund reads it (${annualGiving(closed)} → ${annualGiving(opened)})`);
}
{
  const base = college('Forecast');
  const s = withOffice(base, 'institutional-research');
  s.clock.week = 10;
  assert(rankForecast(base) === null, 'no office, no forecast');
  assert(rankForecast(s) === null, 'not in the fall term');
  s.clock.week = WEEKS_PER_YEAR / 2 + 1;
  const f = rankForecast(s);
  assert(f !== null && f.rank >= 1 && f.now >= 1, `in the spring, the summer's rank (#${f?.rank}, now #${f?.now})`);
  const fall = seated(s, 'institutional-research');
  fall.clock = { ...fall.clock, week: 10 };
  assert(rankForecast(fall) !== null, 'with the Provost seated, all year');
}

// Every office's strength reads 0, 1 and the seat bonus.
assert(OFFICE_SEAT_BONUS === 1.5, 'the seat bonus is half again');

console.log(`  ${checks - failures}/${checks} checks passed`);
if (failures > 0) process.exit(1);
