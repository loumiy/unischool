import type { GameState, Rival } from '../../state/types';
import { rivalFor } from '../athletics/season';
import { rankedListBy } from './rivalsSystem';
import { sportById } from '../../data/studentLifeData';

// THE COLLEGE'S RIVAL (Plan 31, V2 #31, V1-20): one school, and it is the
// rival in the college's main sport, so the rivalry on the field and the
// rivalry in the rankings are one story. The main sport is the team at the
// head of the athletics department's priority list. Other sports keep
// their own rivals (athletics/season.ts).

export function mainSport(s: GameState): string | undefined {
  const active = new Set(s.orgs.teams.filter((t) => t.status === 'active').map((t) => t.id));
  const head = s.orgs.teamOrder.find((id) => active.has(id));
  return head === undefined ? undefined : s.orgs.teams.find((t) => t.id === head)?.sport;
}

export function collegeRival(s: GameState): Rival | undefined {
  const sport = mainSport(s);
  return sport === undefined ? undefined : rivalFor(s, sport);
}

// Where the two stand on the academic table.
export function rivalRanks(s: GameState): { mine: number; theirs: number; rival: Rival; sport: string } | null {
  const rival = collegeRival(s);
  const sport = mainSport(s);
  if (!rival || !sport) return null;
  const list = rankedListBy(s, 'reputation');
  return {
    mine: list.findIndex((e) => e.isPlayer) + 1,
    theirs: list.findIndex((e) => e.key === rival.id) + 1,
    rival,
    sport,
  };
}

// At the summer: passing the rival, or being passed by it, is news.
export function checkRivalStanding(s: GameState): void {
  const r = rivalRanks(s);
  if (!r) return;
  const above = r.mine < r.theirs;
  const before = s.rivalStanding;
  const since = before && before.rivalId === r.rival.id ? (before.since ?? s.clock.year) : s.clock.year;
  s.rivalStanding = { rivalId: r.rival.id, above, since };
  if (!before || before.rivalId !== r.rival.id || before.above === above) return;
  const sport = (sportById(r.sport)?.teamName ?? r.sport).replace(/ Team$/, '');
  s.log.unshift({
    year: s.clock.year, week: s.clock.week, kind: above ? 'good' : 'bad',
    message: above
      ? `The college has passed ${r.rival.name}, its rival in ${sport}, in the rankings: #${r.mine} to their #${r.theirs}.`
      : `${r.rival.name}, the rival in ${sport}, has passed the college in the rankings: #${r.theirs} to its #${r.mine}.`,
  });
}
