import type { GameState, SeasonResult } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';
import { makeRivalRng, sportStrengthFor } from '../../data/rivalData';
import { sportRankedList } from '../../systems/rivals/rivalsSystem';

// ---------------------------------------------------------------------
// THE POSTSEASON.
//
// A BRACKET IS NOT A SEASON, and the distinction is the whole reason this
// file is forty lines rather than a simulator. Both docs/design/
// student-life.md and BACKLOG.md's "Athletics deferrals" hold match
// simulation and schedules deferred — and what they defer is a SEASON:
// weeks, fixtures, opponents, results accumulating into a record. Nothing
// here has any of that. No week contains a game. No team has a schedule.
// Once a year, the strongest eight schools in a sport are seeded off the
// same strength number the standings table already sorts on, and three
// rounds are resolved. The deferral is about simulating a season, not about
// ever resolving a game.
//
// It grew one, deliberately and somewhere else: season.ts (Plan 21's PR N)
// resolves four dated occasions a year with this file's own comparison and
// argues the line it crosses at its head. The bracket is still the bracket.
// ---------------------------------------------------------------------

// Late in the year, and deliberately not a week anything else owns:
// admissions takes WEEKS_PER_YEAR, the U.S. News report takes the halfway
// week, and the varsity petition opens three-quarters through. Nothing here
// stops the clock anyway — the bracket resolves silently and only a TITLE
// raises an interrupt, and that one queues (see eventSystem.ts) — so this is
// about where the postseason sits in the year rather than about collisions.
export const PLAYOFF_WEEK = Math.floor((WEEKS_PER_YEAR * 11) / 12);

// How many schools make the postseason in each sport.
export const PLAYOFF_FIELD = 8;

// How decisive a strength gap is. At SPREAD points of difference the
// stronger school wins about three times in four — so seeding matters a
// great deal and nothing is a foregone conclusion, which is what makes a
// championship worth stopping the clock for and an upset worth having.
export const SPREAD = 25;

export function wins(a: number, b: number, roll: () => number): boolean {
  return roll() < 1 / (1 + 10 ** ((b - a) / SPREAD));
}

// The rounds a bracket of PLAYOFF_FIELD has, furthest-out first, so a finish
// can be named rather than counted.
const ROUND_NAMES = ['quarterfinal', 'semifinal', 'final'] as const;

// Resolve one sport's postseason, from the player's point of view — which is
// the only point of view that exists here. Sports the school does not field
// run no bracket at all: nobody would read the result.
export function resolveSport(s: GameState, sportId: string, roll: () => number): SeasonResult {
  const table = sportRankedList(s, sportId);
  const field = table.slice(0, PLAYOFF_FIELD);
  const seed = field.findIndex((e) => e.isPlayer);

  const championOf = (entry: { name: string; mascot: string }) => ({
    champion: entry.name,
    championMascot: entry.mascot,
  });

  // DID NOT QUALIFY is a result, not an absence. A program outside its
  // sport's strongest eight does not enter, and saying so plainly is what
  // makes a coach's salary a decision: teamQuality is what seeds you.
  if (seed === -1) {
    return {
      year: s.clock.year, sport: sportId, seed: null, finish: 'missed',
      beaten: [], lostTo: null, ...championOf(field[0]),
    };
  }

  // Standard seeding: 1 plays 8, 2 plays 7, and so on, so a top seed meets
  // the weakest survivor each round.
  let alive = field.map((e, i) => ({ ...e, seedNo: i + 1 }));
  let me = alive[seed];
  const beaten: string[] = [];

  for (const round of ROUND_NAMES) {
    const next: typeof alive = [];
    for (let i = 0; i < alive.length / 2; i += 1) {
      const a = alive[i];
      const b = alive[alive.length - 1 - i];
      const aWins = wins(a.value, b.value, roll);
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

// The whole postseason, once a year. Silent: it writes results and queues
// any titles, and the report that stops the clock is drained later by
// eventSystem.ts on a quiet week, exactly as a milestone is.
export function runPlayoffs(s: GameState): void {
  // ONE DRAW ON THE GLOBAL STREAM for the entire postseason, however many
  // sports are fielded — the discipline PR 1A introduced for the rival field
  // and 1C extended. The number of brackets is a function of how much
  // athletics a player has chosen to build, and that must not decide how many
  // times the game rolls a die.
  const roll = makeRivalRng(Math.floor(Math.random() * 4294967296));

  for (const team of s.orgs.teams) {
    if (team.status !== 'active') continue;
    // A program serving a postseason ban (PR P) does not enter. The result
    // says so, so the tab and the record can read it as a ban rather than
    // a bad season.
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
    if (result.finish === 'champion') {
      s.orgs.titles.push({ sport: team.sport, year: s.clock.year });
      s.orgs.pendingTitles.push(team.sport);
    }
  }
}

// Re-exported so the tab can name a rival's strength without reaching past
// this module into the rival data.
export { sportStrengthFor };
