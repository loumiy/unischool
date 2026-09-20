import type { GameState, VarsityTeam } from '../../state/types';
import { WEEKS_PER_YEAR, totalEnrolled } from '../../state/types';
import { VENUE_SEATS } from '../../data/facilitiesData';
import { coachingQuality, registerGateReader, sportEconomics } from '../../data/studentLifeData';

// ---------------------------------------------------------------------
// THE GATE (Plan 21's PR D): the game's first non-tuition, non-endowment
// revenue line. Every active program plays a fixed number of home dates a
// year, each draws a crowd, and the crowd pays. Three things decide the
// crowd — the venue (what it holds), the program (how good it is) and the
// body that would turn up (students, alumni, the town, read off enrolment)
// — and the first of them is a hard ceiling: GATE REVENUE SATURATES. A
// stadium holds what it holds, and the only way to raise the ceiling is a
// bigger building, which is a capital decision and never a free ramp. That
// is the brake this economy's history says to write in from the first
// commit, because the gate feeds the department's own pot (PR G) and a pot
// fed by winning is a positive feedback loop on money.
//
// SIZED AGAINST OPEX AT YEAR FIFTEEN, NOT FORTY. A good program roughly
// pays for its own staff and a bad one does not — the knife-edge the
// budget tier never actually posed — so at year fifteen a department of
// four decent teams earns a few percent of opex, and at year forty a full
// stadium is a rounding error against a school spending hundreds of
// millions. The opposite shape to instruction cost, deliberately.
//
// Billed weekly as an annual figure over WEEKS_PER_YEAR rather than on the
// dates themselves: a home occasion is a thing that happens on a Saturday
// (PR N), and the money is a line on the Treasury statement, which reads
// per week like every other line there.
// ---------------------------------------------------------------------

// Home dates a season. PR N's four occasions are the ones with a result;
// a season has a few more home dates than it has occasions worth a line.
export const HOME_DATES_PER_SEASON = 6;

// The crowd a school could draw, in people, per enrolled student: the
// students themselves, the alumni in town, and the town. Against the
// venue's seats this is the second ceiling — a 40,000-seat stadium at a
// 4,000-student college is mostly empty however good the team.
const CROWD_PER_ENROLLED = 1.6;

// How full the drawable crowd actually turns up: a floor for the faithful,
// and the rest for the team's quality. A last-place program fills a fifth
// of what it could; a national champion two thirds.
const FILL_FLOOR = 0.15;
const FILL_PER_QUALITY = 0.55;


// What the team's venue holds: the largest done venue of its category, so a
// rung (PR Q) raises the ceiling by standing beside the building it grows.
export function venueSeats(s: GameState, team: VarsityTeam): number {
  let seats = 0;
  for (const t of s.tech) {
    if (t.status !== 'done' || t.facilityType !== team.venueCategory) continue;
    seats = Math.max(seats, VENUE_SEATS[t.id] ?? 0);
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

// One ticket, in dollars: the sport's own price (PR F's scale) — a football
// ticket is worth more than a swim meet's.
export function ticketPriceFor(team: VarsityTeam): number {
  return sportEconomics(team.sport).ticketPrice;
}

// The department's gate for the year — the earned half of the pot.
export function annualGateRevenue(s: GameState): number {
  return s.orgs.teams.reduce((sum, team) => sum + annualGateFor(s, team), 0);
}

// The pot reads the gate through studentLifeData.ts's registered reader
// (see registerGateReader there for why it is an indirection); wiring it
// at module load means any state read after this module is imported sees
// the earned half.
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
