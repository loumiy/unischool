import type { GameState, VarsityTeam } from '../../state/types';
import { WEEKS_PER_YEAR, standsOnCampus, totalEnrolled } from '../../state/types';
import { venueSeatsOf } from '../../data/facilitiesData';
import { coachingQuality, registerGateReader, sportEconomics } from '../../data/studentLifeData';

// ---------------------------------------------------------------------
// Gate revenue: every active program plays HOME_DATES_PER_SEASON home dates,
// each draws a crowd, and the crowd pays. The venue's seats are a hard
// ceiling, so gate revenue saturates and raising it takes a bigger building:
// the brake on a pot fed by winning. Sized so a good program roughly pays
// for its staff around year fifteen and is a rounding error by year forty.
// Billed weekly as an annual figure over WEEKS_PER_YEAR, like every other
// Treasury line.
// ---------------------------------------------------------------------

// Home dates a season: a few more than the occasions that get a result.
export const HOME_DATES_PER_SEASON = 6;

// The drawable crowd per enrolled student (students, local alumni, the
// town): the second ceiling beside the venue's seats.
const CROWD_PER_ENROLLED = 1.6;

// Share of the drawable crowd that turns up: a floor for the faithful plus
// the rest by team quality (a fifth for last place, two thirds for a
// champion).
const FILL_FLOOR = 0.15;
const FILL_PER_QUALITY = 0.55;


// The largest done venue of the team's category, so a bigger venue raises
// the ceiling.
export function venueSeats(s: GameState, team: VarsityTeam): number {
  let seats = 0;
  for (const t of s.tech) {
    if (!standsOnCampus(t) || t.facilityType !== team.venueCategory) continue;
    seats = Math.max(seats, venueSeatsOf(t));
  }
  return seats;
}

// The crowd at one home date. Zero for a team that cannot play.
export function attendanceFor(s: GameState, team: VarsityTeam): number {
  if (team.status !== 'active') return 0;
  const seats = venueSeats(s, team);
  if (seats === 0) return 0;
  const crowd = Math.min(seats, totalEnrolled(s.students) * CROWD_PER_ENROLLED);
  const fill = FILL_FLOOR + FILL_PER_QUALITY * (coachingQuality(team, s) / 100);
  return Math.round(Math.min(seats, crowd * fill));
}

// One ticket, in dollars, at the sport's own price.
export function ticketPriceFor(team: VarsityTeam): number {
  return sportEconomics(team.sport).ticketPrice;
}

// The department's gate for the year — the earned half of the pot.
export function annualGateRevenue(s: GameState): number {
  return s.orgs.teams.reduce((sum, team) => sum + annualGateFor(s, team), 0);
}

// The pot reads the gate through studentLifeData.ts's registerGateReader
// (see there for why it is an indirection), wired at module load.
registerGateReader(annualGateRevenue);

// A program's gate for the year.
export function annualGateFor(s: GameState, team: VarsityTeam): number {
  return attendanceFor(s, team) * ticketPriceFor(team) * HOME_DATES_PER_SEASON;
}

// The department's gate, per week — the gross figure the Treasury shows
// beside the routing (financeSystem.ts's financeBreakdown).
export function weeklyGateRevenue(s: GameState): number {
  return annualGateRevenue(s) / WEEKS_PER_YEAR;
}
