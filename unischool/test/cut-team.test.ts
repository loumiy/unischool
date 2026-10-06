// ---------------------------------------------------------------------
// Cutting a varsity program (Plan 95V, the second review's B4-8;
// systems/athletics/cut.ts). What is worth pinning:
//
//   - the cut: the team leaves the athletics state outright (the list, its
//     season, its rivalry), the year is kept, and the alumni's letter is
//     queued, naming the sport and the rival;
//   - its costs: the alumni give CUT_GIVING_DIP less that year, easing back
//     over CUT_GIVING_YEARS; a program cut in season pays its staff to the
//     season's end, and out of season nothing;
//   - a flagship is never cut in season; moved below the line first, or
//     once the postseason is played, it is;
//   - the venue stays and returns to recreation: still standing, its social
//     places unchanged, and the sport's club may form again;
//   - the save: the cut is kept across a round trip, and a malformed record
//     is dropped.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GameState } from '../src/state/types';
import { WEEKS_PER_YEAR } from '../src/state/types';
import { reducer } from '../src/engine/reducer';
import { exportSave, readSave } from '../src/state/persistence';
import { departmentPot, rollClubPetition, venueForCategory } from '../src/data/studentLifeData';
import { CUT_GIVING_DIP, CUT_GIVING_YEARS, annualGiving, cutGivingDip } from '../src/systems/alumni/giving';
import { CUT_LETTER_PREFIX, cutRefusal, cutSettlement, inSeason } from '../src/systems/athletics/cut';
import { rivalFor } from '../src/systems/athletics/season';
import { PLAYOFF_WEEK } from '../src/systems/athletics/playoffs';
import { needCapacity } from '../src/systems/estate/beyondNeed';
import { boardLetterFor, inboxItems } from '../src/systems/inbox/inbox';
import { overrideDraws } from '../src/engine/random';
import { brokenRules } from '../sim/harness/invariants';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) { failures += 1; console.error(`  ✗ ${msg}`); }
}

console.log('cutting a varsity program tests');

// The version-96 fixture: a year-29 college fielding all twenty programs,
// every one active, with alumni giving.
function college(week: number): GameState {
  const read = readSave(readFileSync(join(process.cwd(), 'test/fixtures/save-v96.json'), 'utf8'));
  if ('refused' in read) throw new Error(`the fixture is refused: ${read.refused}`);
  read.state.clock.week = week;
  if (read.state.finance.distress) { read.state.finance.distress.letters = []; read.state.finance.distress.letterWeeks = []; }
  return read.state;
}
const IN_SEASON = 20;
const OFF_SEASON = PLAYOFF_WEEK + 2;
const flagships = (s: GameState) => departmentPot(s).programs.filter((p) => p.band === 'flagship').map((p) => p.team);
const others = (s: GameState) => departmentPot(s).programs.filter((p) => p.band !== 'flagship').map((p) => p.team);

// ---- The cut and its costs ----
function testCut(): void {
  const s = college(IN_SEASON);
  assert(inSeason(s) && s.orgs.teams.length === 20 && s.orgs.teams.every((t) => t.status === 'active'), 'the fixture fields twenty active programs, in season');
  // A program below the line, with a head coach seated from the market.
  const team = others(s)[0];
  team.headCoach = { ...s.orgs.coachCandidates[0], field: team.sport };
  s.orgs.rivalries[team.sport] = { wins: 3, losses: 2, streak: 1 };
  const giving = annualGiving(s);
  const cash = s.finance.cash;
  const settlement = cutSettlement(s, team);
  const staff = (team.headCoach?.salary ?? 0) + (team.assistantCoach?.salary ?? 0) + (team.trainer?.salary ?? 0);
  const weeks = PLAYOFF_WEEK - IN_SEASON + 1;
  assert(Math.abs(settlement - staff * weeks / WEEKS_PER_YEAR) < 1, `in season its staff are paid to the season's end (${Math.round(settlement)} for ${weeks} weeks)`);
  assert(cutRefusal(s, team.id) === null, 'a program below the line may be cut in season');

  const after = reducer(s, { type: 'CUT_TEAM', teamId: team.id });
  assert(!after.orgs.teams.some((t) => t.id === team.id) && !after.orgs.teamOrder.includes(team.id), 'the team leaves the list and the priority order');
  assert(after.orgs.rivalries[team.sport] === undefined && after.orgs.season[team.sport] === undefined, 'the rivalry ends, and the season with it');
  assert(after.orgs.cutPrograms.length === 1 && after.orgs.cutPrograms[0].sport === team.sport && after.orgs.cutPrograms[0].year === s.clock.year, 'the sport and the year are kept');
  assert(Math.abs(cash - after.finance.cash - settlement) < 1, 'the settlement is paid at once');
  assert(Math.abs(cutGivingDip(after) - CUT_GIVING_DIP) < 1e-9, `the alumni give ${CUT_GIVING_DIP * 100}% less this year`);
  const ratio = annualGiving(after) / giving;
  assert(Math.abs(ratio - (1 - CUT_GIVING_DIP)) < 0.001, `and the year's giving dips by as much (${ratio.toFixed(4)})`);
  assert(brokenRules(after).length === 0, `and the college holds every rule (${brokenRules(after).join('; ')})`);

  // The dip eases back over CUT_GIVING_YEARS.
  const dips = Array.from({ length: CUT_GIVING_YEARS + 1 }, (_, i) => cutGivingDip(after, s.clock.year + i));
  assert(dips.every((d, i) => i === 0 || d < dips[i - 1]) && dips[CUT_GIVING_YEARS] === 0, `the dip eases to nothing in ${CUT_GIVING_YEARS} years (${dips.map((d) => d.toFixed(3)).join(', ')})`);

  // The alumni's letter: queued, from the alumni, naming the sport and the rival.
  const id = `${CUT_LETTER_PREFIX}${team.sport}`;
  assert(after.finance.distress?.letters.includes(id) === true, 'the alumni\'s letter is queued');
  const letter = boardLetterFor(after, id);
  const name = team.name.replace(/ Team$/, '');
  const rival = rivalFor(after, team.sport);
  assert(letter?.from === 'From the alumni' && letter.title.includes(name) && letter.text.includes(name), `the letter is from the alumni and names ${name}`);
  assert(rival === undefined || letter!.text.includes(rival.name), 'and the rivalry it ends');
  const item = inboxItems(after).find((i) => i.ref === id);
  assert(item?.from === 'From the alumni' && item.tier === 'letter', 'the inbox files it as a letter from the alumni');

  // No cut, no change: a college that never cuts gives exactly as before.
  const none = college(IN_SEASON);
  assert(cutGivingDip(none) === 0 && annualGiving(none) === giving, 'a college that cuts nothing gives exactly as before');

  // Out of season, nothing is owed.
  const off = college(OFF_SEASON);
  const offTeam = others(off)[0];
  assert(!inSeason(off) && cutSettlement(off, offTeam) === 0, 'out of season a cut owes nothing');
}

// ---- A flagship is never cut in season ----
function testFlagship(): void {
  const s = college(IN_SEASON);
  const flagship = flagships(s)[0];
  assert(flagship !== undefined, 'the fixture has a flagship');
  assert(cutRefusal(s, flagship.id) !== null, `a flagship is refused in season ("${cutRefusal(s, flagship.id)}")`);
  const after = reducer(s, { type: 'CUT_TEAM', teamId: flagship.id });
  assert(after.orgs.teams.some((t) => t.id === flagship.id) && after.orgs.cutPrograms.length === 0, 'and the reducer keeps it, whatever the UI sent');

  // Moved below the line first, it may go.
  const order = [...s.orgs.teamOrder.filter((id) => id !== flagship.id), flagship.id];
  const moved = reducer(s, { type: 'SET_TEAM_ORDER', order });
  assert(!flagships(moved).some((t) => t.id === flagship.id), 'moved to the foot of the list, it is no longer a flagship');
  assert(cutRefusal(moved, flagship.id) === null, 'and may be cut in season');

  // After the postseason, a flagship may be cut, and the next in line moves up.
  const off = college(OFF_SEASON);
  const was = flagships(off).map((t) => t.id);
  const cut = reducer(off, { type: 'CUT_TEAM', teamId: was[0] });
  assert(!cut.orgs.teams.some((t) => t.id === was[0]), 'out of season a flagship is cut');
  assert(flagships(cut).length === was.length, 'and another program takes its place above the line');
}

// ---- The venue returns to recreation ----
function testVenue(): void {
  const s = college(OFF_SEASON);
  const team = others(s).find((t) => !s.orgs.teams.some((u) => u.id !== t.id && u.venueCategory === t.venueCategory))
    ?? others(s)[0];
  const venue = venueForCategory(s, team.venueCategory)!;
  const social = needCapacity(s, 'social').capacity;
  const after = reducer(s, { type: 'CUT_TEAM', teamId: team.id });
  const kept = venueForCategory(after, team.venueCategory)!;
  assert(kept.status === venue.status && kept.status === 'done', `${venue.name} stands`);
  assert(needCapacity(after, 'social').capacity === social, `and serves the same ${Math.round(social)} social places, team or none`);

  // The sport's club may form again: every other sport is varsity, so the
  // only sport club the roll can raise is the one cut, and before the cut
  // there is none to raise.
  const roll = (g: GameState) => {
    const club = { ...g, orgs: { ...g.orgs, clubs: g.orgs.clubs.filter((c) => c.sport === null), pendingPetitions: [] } };
    overrideDraws(() => 0);
    try { return rollClubPetition(club); } finally { overrideDraws(null); }
  };
  assert(roll(s)?.sport == null, 'before the cut, no sport is free for a club');
  assert(roll(after)?.sport === team.sport, `after it, the ${team.sport} club may form again (${roll(after)?.sport})`);
}

// ---- The save ----
function testSave(): void {
  const s = reducer(college(OFF_SEASON), { type: 'CUT_TEAM', teamId: others(college(OFF_SEASON))[0].id });
  const back = readSave(exportSave(s).text);
  if ('refused' in back) return assert(false, 'a college with a cut program saves and loads');
  assert(JSON.stringify(back.state.orgs.cutPrograms) === JSON.stringify(s.orgs.cutPrograms), 'the cut is kept across a round trip');
  assert(back.state.finance.distress?.letters.some((id) => id.startsWith(CUT_LETTER_PREFIX)) === true, 'and so is the alumni\'s letter');
  const bad = JSON.parse(exportSave(s).text) as { state: GameState };
  (bad.state.orgs as unknown as { cutPrograms: unknown }).cutPrograms = [
    { sport: 'quidditch', year: 3 }, { sport: s.orgs.cutPrograms[0].sport, year: 999 }, 'x', { sport: s.orgs.cutPrograms[0].sport, year: 2 },
  ];
  bad.state.finance.distress!.letters.push(`${CUT_LETTER_PREFIX}quidditch`);
  bad.state.finance.distress!.letterWeeks.push(1);
  const read = readSave(JSON.stringify(bad));
  if ('refused' in read) return assert(false, 'a malformed cut record loads');
  assert(read.state.orgs.cutPrograms.length === 1 && read.state.orgs.cutPrograms[0].year === 2, 'a malformed cut record is dropped');
  assert(!read.state.finance.distress!.letters.includes(`${CUT_LETTER_PREFIX}quidditch`), 'and so is a letter about a sport the game does not know');
}

testCut();
testFlagship();
testVenue();
testSave();

console.log(`  ${checks - failures} of ${checks} checks passed`);
if (failures > 0) process.exit(1);
