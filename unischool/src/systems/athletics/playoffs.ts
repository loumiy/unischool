import type { GameState, SeasonResult } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';
import { makeRivalRng, sportStrengthFor } from '../../data/rivalData';
import { sportRankedList } from '../../systems/rivals/rivalsSystem';
import { random } from '../../engine/random';
import { athleticsLifted } from '../prestige/specialization';
import { complexEdge, recordComplexRun } from '../../data/athleticsComplexData';

// The postseason: once a year the top eight schools in each fielded sport,
// seeded on the standings' strength number, play a three-round bracket.
// This is not a season simulation (still deferred, see
// docs/design/student-life.md); season.ts handles the dated regular-season
// occasions.

// Late in the year, clear of admissions, the U.S. News week and the varsity
// petition. The bracket resolves silently; only a title queues an interrupt.
export const PLAYOFF_WEEK = Math.floor((WEEKS_PER_YEAR * 11) / 12);

export const PLAYOFF_FIELD = 8;

// At SPREAD points of difference the stronger school wins about three times
// in four: seeding matters, upsets happen.
export const SPREAD = 25;

export function wins(a: number, b: number, roll: () => number): boolean {
  return roll() < 1 / (1 + 10 ** ((b - a) / SPREAD));
}

// Named so a finish can be reported by round.
const ROUND_NAMES = ['quarterfinal', 'semifinal', 'final'] as const;
type Round = (typeof ROUND_NAMES)[number];

// The big stage (Plan 85C): in the postseason an established power plays
// above its number, the more so the deeper the round. In each round the
// college's opponent plays this many points stronger. The athletics
// specialization shrinks it (Plan 85D, specialization.ts's athleticsLifted,
// the hook the complex of Plan 85G extends). Only the college's own games:
// a bracket between rivals is as it was, and the draws are the same.
//
// Plan 121B (the owner, 28 October 2026): an unspecialized college with
// its department at the top won a title every ten to sixty years, at 8, 20
// and 35 points. The owner asked for one every two or three years from
// Year 30. At 1, 4 and 10 the harness's maxed unspecialized department
// (twenty programs, the high subsidy, full scholarships, every venue
// expanded) wins one about every 2.6 years from Year 30 (ten seeds).
export const STAGE_EDGE: Readonly<Record<Round, number>> = { quarterfinal: 1, semifinal: 4, final: 10 };

// What is left of the big stage against a college specialized in athletics
// (the owner's decision, 2026-10-01, in Plan 85G's review, amending 85D,
// which took it all away): 2, 5 and 9 points, a quarter of the old edge.
// Plan 121B lowered the unspecialized edge below it in the first two
// rounds, so the specialist's is never more than the unspecialized one's:
// 1, 4 and 9. The Athletic Performance Complex's own edge (+3 in a
// semifinal, +4 in a final) is taken off what is left.
const SPECIALIZED_EDGE_BEFORE_121: Readonly<Record<Round, number>> = { quarterfinal: 2, semifinal: 5, final: 9 };
export const SPECIALIZED_STAGE_EDGE: Readonly<Record<Round, number>> = {
  quarterfinal: Math.min(SPECIALIZED_EDGE_BEFORE_121.quarterfinal, STAGE_EDGE.quarterfinal),
  semifinal: Math.min(SPECIALIZED_EDGE_BEFORE_121.semifinal, STAGE_EDGE.semifinal),
  final: Math.min(SPECIALIZED_EDGE_BEFORE_121.final, STAGE_EDGE.final),
};

export function stageEdge(s: GameState, round: Round): number {
  return athleticsLifted(s) ? SPECIALIZED_STAGE_EDGE[round] - complexEdge(s, round) : STAGE_EDGE[round];
}

// Resolve one sport's postseason from the player's side. Only fielded sports
// run a bracket.
export function resolveSport(s: GameState, sportId: string, roll: () => number): SeasonResult {
  const table = sportRankedList(s, sportId);
  const field = table.slice(0, PLAYOFF_FIELD);
  const seed = field.findIndex((e) => e.isPlayer);

  const championOf = (entry: { name: string; mascot: string }) => ({
    champion: entry.name,
    championMascot: entry.mascot,
  });

  // Missing the top eight is a result in its own right.
  if (seed === -1) {
    return {
      year: s.clock.year, sport: sportId, seed: null, finish: 'missed',
      beaten: [], lostTo: null, ...championOf(field[0]),
    };
  }

  // Standard seeding: 1 plays 8, 2 plays 7, and so on.
  let alive = field.map((e, i) => ({ ...e, seedNo: i + 1 }));
  let me = alive[seed];
  const beaten: string[] = [];

  for (const round of ROUND_NAMES) {
    const next: typeof alive = [];
    for (let i = 0; i < alive.length / 2; i += 1) {
      const a = alive[i];
      const b = alive[alive.length - 1 - i];
      // The edge goes to whoever plays the college.
      const edge = a.isPlayer || b.isPlayer ? stageEdge(s, round) : 0;
      const aWins = wins(a.value + (b.isPlayer ? edge : 0), b.value + (a.isPlayer ? edge : 0), roll);
      const winner = aWins ? a : b;
      const loser = aWins ? b : a;
      if (winner.isPlayer) beaten.push(`${loser.name} ${loser.mascot}`);
      if (loser.isPlayer) {
        return {
          year: s.clock.year, sport: sportId, seed: seed + 1, finish: round,
          beaten, lostTo: `${winner.name} ${winner.mascot}`,
          ...championOf(winner),
        };
      }
      next.push(winner);
    }
    alive = next;
    me = alive.find((e) => e.isPlayer) ?? me;
  }

  return {
    year: s.clock.year, sport: sportId, seed: seed + 1, finish: 'champion',
    beaten, lostTo: null, ...championOf(me),
  };
}

// The whole postseason. Writes results and queues titles; eventSystem.ts
// shows the report later on a quiet week.
export function runPlayoffs(s: GameState): void {
  // One draw on the global stream for the whole postseason, so how many
  // sports are fielded never changes how many times the game rolls.
  const roll = makeRivalRng(Math.floor(random() * 4294967296));

  for (const team of s.orgs.teams) {
    if (team.status !== 'active') continue;
    // A banned program does not enter; the result records the ban.
    if (team.postseasonBanThroughYear !== undefined && s.clock.year <= team.postseasonBanThroughYear) {
      const field = sportRankedList(s, team.sport).slice(0, PLAYOFF_FIELD);
      s.orgs.lastSeason[team.sport] = {
        year: s.clock.year, sport: team.sport, seed: null, finish: 'missed', banned: true,
        beaten: [], lostTo: null, champion: field[0].name, championMascot: field[0].mascot,
      };
      continue;
    }
    const result = resolveSport(s, team.sport, roll);
    s.orgs.lastSeason[team.sport] = result;
    // A deep run at the Athletic Performance Complex (Plan 85G), which the
    // athletics pillar's specialization term reads.
    recordComplexRun(s, team.sport, result.finish);
    if (result.finish === 'champion') {
      s.orgs.titles.push({ sport: team.sport, year: s.clock.year });
      s.orgs.pendingTitles.push(team.sport);
    }
  }
}

// Re-exported so the tab need not reach into the rival data.
export { sportStrengthFor };
