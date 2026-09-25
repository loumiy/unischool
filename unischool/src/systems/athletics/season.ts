import type { GameState, OccasionResult, Rival, VarsityTeam } from '../../state/types';
import { WEEKS_PER_YEAR, institutionName } from '../../state/types';
import { baseRivals, hashUnit, makeRivalRng, sportStrengthFor } from '../../data/rivalData';
import { sportById, teamQuality } from '../../data/studentLifeData';
import { playerRank, sportRankedList } from '../rivals/rivalsSystem';
import { PLAYOFF_WEEK, SPREAD, wins } from './playoffs';
import { ordinal } from '../../format';
import { random } from '../../engine/random';

// ---------------------------------------------------------------------
// The season: three dated occasions (OCCASIONS) before the postseason, a
// record, and a log line for each. Deliberately not a schedule: no fixture
// list or table, and the resolver is playoffs.ts's own comparison. Adding a
// date should be argued for. Each occasion resolves on one draw on the
// global stream for every team fielded, and upsets are called out. The
// rivalry result is a log line, never a modal.
// ---------------------------------------------------------------------

export type Occasion = OccasionResult['occasion'];

// The dated occasions, in year order; the postseason is PLAYOFF_WEEK.
export const OCCASIONS: ReadonlyArray<{ occasion: Occasion; week: number }> = [
  { occasion: 'opener', week: Math.floor(WEEKS_PER_YEAR * 2 / 13) },       // week 8
  { occasion: 'rivalry', week: Math.floor(WEEKS_PER_YEAR * 5 / 13) },      // week 20
  { occasion: 'homecoming', week: Math.floor(WEEKS_PER_YEAR * 8 / 13) },   // week 32
];

// At SPREAD the stronger side wins three times in four, so a result against
// the grain across that gap is an upset.
const UPSET_GAP = SPREAD;

// Each fielded sport's named rival: derived (never stored) from a hash of
// the school's name and the sport, drawn from the authored table's middle
// band, so it is stable for the whole run.
const RIVAL_BAND_LOW = 55;
const RIVAL_BAND_HIGH = 92;

export function rivalIdFor(s: GameState, sportId: string): string {
  const band = baseRivals().filter((r) => r.reputation >= RIVAL_BAND_LOW && r.reputation <= RIVAL_BAND_HIGH);
  const pool = band.length > 0 ? band : baseRivals();
  return pool[Math.floor(hashUnit(`rival:${institutionName(s.self)}:${sportId}`) * pool.length) % pool.length].id;
}

export function rivalFor(s: GameState, sportId: string): Rival | undefined {
  const id = rivalIdFor(s, sportId);
  return s.rivals.find((r) => r.id === id);
}

const TROPHY_NAMES: readonly string[] = [
  'the Old Oak Trophy', 'the Iron Skillet', "the Founders' Cup", 'the River Bell', "the Governor's Cup",
  'the Copper Kettle', 'the Little Brown Jug', 'the Paddle', 'the Lantern', 'the Bronze Boot',
  'the Keg of Nails', 'the Wagon Wheel', 'the Victory Bell', 'the Axe', 'the Blue Line Trophy',
];

// Derived like the rival, so the trophy is the same every year.
export function trophyFor(s: GameState, sportId: string): string {
  return TROPHY_NAMES[Math.floor(hashUnit(`trophy:${institutionName(s.self)}:${sportId}`) * TROPHY_NAMES.length) % TROPHY_NAMES.length];
}

// An opponent within a few places on the sport's own table, drawn on the
// local generator. The schedule climbs with the college's name (Plan 31,
// V1-19): when it stands higher in the rankings than its team does on the
// field, the neighborhood is pulled a third of the way up toward that
// place, so a rising college is scheduled against better-known schools
// before its team has earned them.
const NEIGHBOURHOOD = 4;
const SCHEDULE_PULL = 1 / 3;
function comparableOpponent(s: GameState, sportId: string, roll: () => number): { name: string; mascot: string; value: number } | null {
  const table = sportRankedList(s, sportId);
  const place = table.findIndex((e) => e.isPlayer);
  if (place === -1) return null;
  const standing = playerRank(s) - 1;
  const me = standing < place ? Math.round(place - (place - standing) * SCHEDULE_PULL) : place;
  const near = table.filter((e, i) => !e.isPlayer && Math.abs(i - me) <= NEIGHBOURHOOD);
  const pool = near.length > 0 ? near : table.filter((e) => !e.isPlayer);
  if (pool.length === 0) return null;
  return pool[Math.floor(roll() * pool.length) % pool.length];
}

function resolveOccasion(s: GameState, team: VarsityTeam, occasion: Occasion, roll: () => number): void {
  const sport = sportById(team.sport);
  const mine = teamQuality(team, s);
  let opponent: { name: string; mascot: string; value: number } | null;
  if (occasion === 'rivalry') {
    const rival = rivalFor(s, team.sport);
    opponent = rival ? { name: rival.name, mascot: rival.mascot, value: sportStrengthFor(rival, team.sport) } : null;
  } else {
    opponent = comparableOpponent(s, team.sport, roll);
  }
  if (!opponent) return;

  const won = wins(mine, opponent.value, roll);
  const upset = Math.abs(mine - opponent.value) >= UPSET_GAP && (won ? mine < opponent.value : mine > opponent.value);
  const record = s.orgs.season[team.sport] ?? { year: s.clock.year, wins: 0, losses: 0, results: [] };
  if (record.year !== s.clock.year) { record.year = s.clock.year; record.wins = 0; record.losses = 0; record.results = []; }
  record.results.push({ occasion, week: s.clock.week, opponent: `${opponent.name} ${opponent.mascot}`, opponentStrength: opponent.value, won, upset });
  if (won) record.wins += 1; else record.losses += 1;
  s.orgs.season[team.sport] = record;

  const name = sport?.teamName ?? team.name;
  const them = `${opponent.name} ${opponent.mascot}`;
  let message: string;
  if (occasion === 'rivalry') {
    const rivalry = s.orgs.rivalries[team.sport] ?? { wins: 0, losses: 0, streak: 0 };
    if (won) { rivalry.wins += 1; rivalry.streak = rivalry.streak > 0 ? rivalry.streak + 1 : 1; }
    else { rivalry.losses += 1; rivalry.streak = rivalry.streak < 0 ? rivalry.streak - 1 : -1; }
    s.orgs.rivalries[team.sport] = rivalry;
    const trophy = trophyFor(s, team.sport);
    const run = Math.abs(rivalry.streak);
    message = won
      ? `${upset ? 'An upset: ' : ''}${name} beat ${them} for ${trophy}${run > 1 ? ` — the ${ordinal(run)} straight year` : ''}. The series stands ${rivalry.wins}–${rivalry.losses}.`
      : `${upset ? 'An upset: ' : ''}${name} lost ${trophy} to ${them}${run > 1 ? ` for the ${ordinal(run)} year running` : ''}. The series stands ${rivalry.wins}–${rivalry.losses}.`;
  } else if (occasion === 'opener') {
    message = won
      ? `${upset ? 'An upset to open the season: ' : ''}${name} opens the season with a win over ${them}.`
      : `${upset ? 'An upset to open the season: ' : ''}${name} opens the season with a loss to ${them}.`;
  } else {
    message = won
      ? `${upset ? 'An upset on homecoming weekend: ' : ''}${name} sent the homecoming crowd home happy, beating ${them}. ${record.wins}–${record.losses} on the year.`
      : `${upset ? 'An upset on homecoming weekend: ' : ''}${name} lost to ${them} in front of the homecoming crowd. ${record.wins}–${record.losses} on the year.`;
  }
  s.log.unshift({ year: s.clock.year, week: s.clock.week, message, kind: won ? 'good' : 'bad', topic: 'team', subject: team.id });
}

// The week's occasion, if this is one: every active team plays it. One
// draw on the global stream for all of them.
export function tickSeason(s: GameState): void {
  const today = OCCASIONS.find((o) => o.week === s.clock.week);
  if (!today) return;
  const active = s.orgs.teams.filter((t) => t.status === 'active');
  if (active.length === 0) return;
  const roll = makeRivalRng(Math.floor(random() * 4294967296));
  for (const team of active) resolveOccasion(s, team, today.occasion, roll);
}

// The season's record so far, for the tab: wins–losses, counting the
// postseason's bracket wins from lastSeason once it has run this year.
export function seasonRecordFor(s: GameState, sportId: string): { wins: number; losses: number } | null {
  const record = s.orgs.season[sportId];
  if (!record || record.year !== s.clock.year) return null;
  const post = s.orgs.lastSeason[sportId];
  const postWins = post && post.year === s.clock.year && s.clock.week >= PLAYOFF_WEEK ? post.beaten.length : 0;
  const postLosses = post && post.year === s.clock.year && s.clock.week >= PLAYOFF_WEEK && post.lostTo ? 1 : 0;
  return { wins: record.wins + postWins, losses: record.losses + postLosses };
}
