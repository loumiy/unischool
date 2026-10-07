import type { GameState, VarsityTeam } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';
import type { BoardLetter } from '../../data/boardData';
import { isFlagship, scholarshipCostFor, sportById } from '../../data/studentLifeData';
import { postBoardLetter } from '../finance/distress';
import { PLAYOFF_WEEK } from './playoffs';
import { OCCASIONS, rivalFor, trophyFor } from './season';

// ---------------------------------------------------------------------
// Cutting a varsity program (Plan 95V, the second review's B4-8). The
// team leaves the athletics state outright: its place on the priority
// list, its season and its rivalry go with it. What stays:
//
//   - the venue, which serves its social capacity as it always did, team
//     or none; the sport's club may form again, through the usual petition
//     or the Athletics Development Office;
//   - the record: titles, last season, the complex's deep runs;
//   - the year it was cut (s.orgs.cutPrograms), for the alumni's dip in
//     giving (alumni/giving.ts's cutGivingDip), and their letter.
//
// A flagship is never cut mid-season: it is moved below the line first, or
// cut once the postseason is played. A program cut in season pays its
// coaches (and a flagship's scholarships) to the season's end, at once.
// ---------------------------------------------------------------------

// The season runs from the opener to the postseason.
const SEASON_OPENS = OCCASIONS[0].week;

export function inSeason(s: GameState): boolean {
  return s.clock.week >= SEASON_OPENS && s.clock.week <= PLAYOFF_WEEK;
}

// Weeks of the season still to pay, this week among them; 0 out of season.
export function seasonWeeksLeft(s: GameState): number {
  return inSeason(s) ? PLAYOFF_WEEK - s.clock.week + 1 : 0;
}

// The program's name as the cards say it: "Women's Soccer".
export function programName(team: VarsityTeam): string {
  return team.name.replace(/ Team$/, '');
}

// What a cut costs at once: the staff's pay and a flagship's scholarships
// for the weeks of the season left.
export function cutSettlement(s: GameState, team: VarsityTeam): number {
  const weeks = seasonWeeksLeft(s);
  if (weeks === 0) return 0;
  const staff = (team.headCoach?.salary ?? 0) + (team.assistantCoach?.salary ?? 0) + (team.trainer?.salary ?? 0);
  const scholarships = isFlagship(s, team) ? scholarshipCostFor(team.sport, team.scholarships ?? 'none') : 0;
  return (staff + scholarships) * weeks / WEEKS_PER_YEAR;
}

export function cutRefusal(s: GameState, teamId: string): string | null {
  const team = s.orgs.teams.find((t) => t.id === teamId);
  if (!team) return 'There is no such program.';
  if (inSeason(s) && isFlagship(s, team)) {
    return `A flagship plays out its season: move ${programName(team)} below the line first, or cut it after the postseason in week ${PLAYOFF_WEEK}.`;
  }
  return null;
}

// The alumni's letter is a board letter by id (finance/distress.ts's
// queue), the sport after the prefix.
export const CUT_LETTER_PREFIX = 'program-cut:';

export function isCutLetter(id: string): boolean {
  return id.startsWith(CUT_LETTER_PREFIX) && sportById(id.slice(CUT_LETTER_PREFIX.length)) !== undefined;
}

export function cutLetter(s: GameState, id: string): BoardLetter | undefined {
  if (!isCutLetter(id)) return undefined;
  const sportId = id.slice(CUT_LETTER_PREFIX.length);
  const name = sportById(sportId)!.teamName.replace(/ Team$/, '');
  const rival = rivalFor(s, sportId);
  const rivalry = rival
    ? ` The rivalry with ${rival.name} ends with it, and so does ${trophyFor(s, sportId)}.`
    : '';
  return {
    from: 'From the alumni',
    title: `${name}, cut`,
    text: `The alumni have heard that ${name} will not take the field again. Those who played for it write that they will give elsewhere for a while.${rivalry}`,
  };
}

export function cutTeam(s: GameState, teamId: string): boolean {
  if (cutRefusal(s, teamId) !== null) return false;
  const team = s.orgs.teams.find((t) => t.id === teamId)!;
  const settlement = cutSettlement(s, team);
  s.finance.cash -= settlement;
  s.orgs.teams = s.orgs.teams.filter((t) => t.id !== team.id);
  s.orgs.teamOrder = (s.orgs.teamOrder ?? []).filter((id) => id !== team.id);
  delete s.orgs.season[team.sport];
  delete s.orgs.rivalries[team.sport];
  (s.orgs.cutPrograms ??= []).push({ sport: team.sport, year: s.clock.year });
  postBoardLetter(s, `${CUT_LETTER_PREFIX}${team.sport}`);
  s.log.unshift({
    year: s.clock.year, week: s.clock.week, kind: 'bad',
    message: settlement > 0
      ? `${programName(team)} is cut. Its staff are paid to the season's end, and the venue goes back to recreation.`
      : `${programName(team)} is cut. The venue goes back to recreation.`,
  });
  return true;
}
