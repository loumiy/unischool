import type { GameState } from '../../state/types';
import { FOUNDERS_HALL_ID } from '../../data/techData';
import {
  activatePetition, canFormClub, CLUB_APPROVAL_SATISFACTION_NUDGE, promoteToVarsityTeam, rollClubPetition, sportById,
  venueForCategory,
} from '../../data/studentLifeData';
import { VARSITY_ESTABLISH_COST_WEEKS, VARSITY_TEAM_UPKEEP_WEEKS_OF_OPEX, absoluteWeek } from '../../data/eventData';
import { weeksOfOpEx } from '../../data/moneyScale';
import { charterIntervalWeeks } from './effects';
import { officeStrength } from './offices';

// ---------------------------------------------------------------------
// The two offices that add an action (Plan 89E).
//
// The Student Activities Office charters a club at once, rather than
// waiting on the weekly roll and the summer's digest, once every
// CHARTER_INTERVAL_WEEKS (shorter with the Dean of Students seated). The
// club is rolled exactly as a petition is, and recognized as an approved
// one is: the same caps, the same upkeep, the same satisfaction nudge.
//
// The Athletics Development Office founds a varsity team from a sport club
// whose venue stands, without the club's tenure or its petition, at the
// petition's establishing price (less with the Dean of Students seated).
// ---------------------------------------------------------------------

function office(s: GameState, officeId: string) {
  return (s.halls[FOUNDERS_HALL_ID] ?? []).find((slot) => slot.office?.id === officeId)?.office;
}

// Weeks until the office may charter again; 0 when it may now.
export function charterWait(s: GameState): number {
  const last = office(s, 'student-activities')?.lastActionWeek;
  if (last === undefined) return 0;
  return Math.max(0, last + charterIntervalWeeks(s) - absoluteWeek(s));
}

export function charterRefusal(s: GameState): string | null {
  if (officeStrength(s, 'student-activities') <= 0) return 'The college has no Student Activities Office.';
  const wait = charterWait(s);
  if (wait > 0) return `The office can charter another club in ${wait} week${wait === 1 ? '' : 's'}.`;
  if (!canFormClub(s)) return 'There is no room for another club: a Student Center, and room under the cap, come first.';
  return null;
}

export function charterClub(s: GameState): boolean {
  if (charterRefusal(s) !== null) return false;
  const petition = rollClubPetition(s);
  if (!petition) return false;
  const firstSport = !!petition.sport && !s.orgs.clubs.some((c) => c.sport !== null) && s.orgs.teams.length === 0;
  activatePetition(s, petition);
  if (firstSport && !s.self.mascot) s.orgs.mascotBeatPending = true;
  s.students.satisfaction = Math.min(100, s.students.satisfaction + CLUB_APPROVAL_SATISFACTION_NUDGE);
  office(s, 'student-activities')!.lastActionWeek = absoluteWeek(s);
  s.log.unshift({
    year: s.clock.year, week: s.clock.week, kind: 'good',
    message: `The Student Activities Office has chartered ${petition.name}.`,
  });
  return true;
}

// What founding a team directly costs now.
export function foundTeamCost(s: GameState): number {
  const k = officeStrength(s, 'athletics-development');
  return k > 0 ? weeksOfOpEx(s, VARSITY_ESTABLISH_COST_WEEKS / k) : 0;
}

export function foundTeamRefusal(s: GameState, clubId: string): string | null {
  if (officeStrength(s, 'athletics-development') <= 0) return 'The college has no Athletics Development Office.';
  const club = s.orgs.clubs.find((c) => c.id === clubId);
  const sport = club ? sportById(club.sport) : undefined;
  if (!club || !sport) return 'Only a sport club can become a varsity team.';
  const venue = venueForCategory(s, sport.venueCategory);
  if (venue?.status !== 'done') return `${club.name} needs ${venue ? venue.name : 'its venue'} built first.`;
  if (s.finance.cash < foundTeamCost(s)) return 'Not enough cash.';
  return null;
}

export function foundTeam(s: GameState, clubId: string): boolean {
  if (foundTeamRefusal(s, clubId) !== null) return false;
  const club = s.orgs.clubs.find((c) => c.id === clubId)!;
  const sport = sportById(club.sport)!;
  s.finance.cash -= foundTeamCost(s);
  const team = promoteToVarsityTeam(s, club, {
    sport: sport.id,
    name: sport.teamName,
    venueCategory: sport.venueCategory,
    upkeepPerWeek: weeksOfOpEx(s, VARSITY_TEAM_UPKEEP_WEEKS_OF_OPEX),
    status: 'active',
  });
  s.log.unshift({
    year: s.clock.year, week: s.clock.week, kind: 'good',
    message: `${team.name} is now a varsity program, founded by the Athletics Development Office: head coach, assistant coach and trainer still to be hired from the Athletics tab.`,
  });
  return true;
}
