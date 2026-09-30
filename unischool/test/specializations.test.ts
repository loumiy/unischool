// ---------------------------------------------------------------------
// Ceilings, harder athletics and rivals that specialize (Plan 85C). What is
// worth pinning:
//
//   - without a specialization every pillar stops at its unspecialized
//     ceiling, the breakdown says it is held there, and prestige's row for
//     it says so and that a specialization would lift it;
//   - every rival is dealt one pillar off its id, the same deal every time,
//     all four pillars dealt and all four among the strongest schools;
//   - a specialized axis runs higher: after fifty years each pillar is led
//     by a school specialized in it, and no school's other axes drift past
//     the unspecialized ceilings; the year's drift still takes one draw;
//   - a save from before (the version-87 fixture) loads with each rival
//     dealt its pillar as a new game deals it, and a bad one is dealt again;
//   - a title is hard to come by without the athletics specialization: no
//     program plays above the team ceiling, and the big stage goes against
//     the college in a semifinal and a final.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInitialState } from '../src/state/actions';
import { readSave } from '../src/state/persistence';
import { dealtSpecialization, ELITE_RIVAL_IDS, initialRivals, makeRivalRng, sportStrengthFor } from '../src/data/rivalData';
import {
  PILLARS, PILLAR_FLOOR, UNSPECIALIZED_CEILINGS, pillarBreakdown, pillarCeiling, prestigeBreakdown, specializationOf,
} from '../src/systems/prestige/prestigeSystem';
import { PILLAR_AXES, rankedListBy, rivalPillars, specializations, tickRivals, SPECIALIZED_CEILING } from '../src/systems/rivals/rivalsSystem';
import { STAGE_EDGE, resolveSport, stageEdge } from '../src/systems/athletics/playoffs';
import { SPORTS, UNSPECIALIZED_TEAM_CEILING, promoteToVarsityTeam, teamQuality, teamQualityEarned } from '../src/data/studentLifeData';
import { graduatePrograms, milestoneSchools } from '../src/data/techData';
import { schoolFoundedKey } from '../src/systems/techtree/schools';
import { bindScriptStream, drawsSoFar } from '../src/engine/random';
import type { Coach, GameState, Pillar, StudentClub } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('specialization tests');
bindScriptStream(12345);

// ---- The ceilings ----
{
  const s = createInitialState('Ceilings');
  assert(specializationOf(s) === null, 'no college is specialized before Plan 85D');
  for (const p of PILLARS) {
    assert(pillarCeiling(s, p) === UNSPECIALIZED_CEILINGS[p], `${p} keeps to its unspecialized ceiling (${UNSPECIALIZED_CEILINGS[p]})`);
    assert(UNSPECIALIZED_CEILINGS[p] > PILLAR_FLOOR && UNSPECIALIZED_CEILINGS[p] < 150, `${p}'s ceiling sits short of the top`);
  }

  // A college that has finished the whole catalog: every program
  // established and distinguished, every school founded and distinguished,
  // every graduate program, a full class of the best students at scale.
  // Its academics earns more than the ceiling allows.
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'test/fixtures/save-launch.json'), 'utf8')) as { state: GameState };
  const read = readSave(JSON.stringify(raw));
  if ('refused' in read) throw new Error(`the launch fixture is refused: ${read.refused}`);
  const late = read.state;
  for (const school of milestoneSchools()) {
    late.milestones[schoolFoundedKey(school.schoolName)] = true;
    late.milestones[`school-distinguished:${school.schoolName}`] = true;
    for (const major of school.majors) {
      late.milestones[`program-established:${major.prefix}`] = true;
      late.milestones[`program-distinguished:${major.prefix}`] = true;
    }
  }
  for (const program of graduatePrograms()) late.milestones[`grad-program-complete:${program.id}`] = true;
  late.students.incomingQuality = 100;
  const academics = pillarBreakdown(late, 'academics');
  const earned = academics.inputs.reduce((sum, i) => sum + i.contribution, academics.baseline);
  assert(earned > UNSPECIALIZED_CEILINGS.academics, `the finished catalog earns more than the ceiling (${earned.toFixed(1)})`);
  assert(academics.target === UNSPECIALIZED_CEILINGS.academics, `and academics is held at ${UNSPECIALIZED_CEILINGS.academics} (${academics.target.toFixed(1)})`);
  assert(academics.held && academics.ceiling?.held !== undefined, 'the breakdown says the ceiling holds it');
  assert(/specialization/.test(academics.ceiling?.detail ?? '') && !/archetype/i.test(academics.ceiling?.detail ?? ''), 'in the glossary\'s word, specialization');
  const row = prestigeBreakdown(late).inputs.find((i) => i.key === 'academics')!;
  assert(row.pillar?.held === true && /limit/.test(row.detail) && /specialization in academics would lift it/.test(row.detail), `prestige's academics row says it is held, and what would lift it ("${row.detail}")`);
  assert(Math.abs(row.contribution - 0.35 * (UNSPECIALIZED_CEILINGS.academics - PILLAR_FLOOR)) < 1e-9, 'and prestige counts it at the ceiling');

  // A pillar under its ceiling says nothing of being held.
  const fresh = pillarBreakdown(s, 'academics');
  assert(!fresh.held && fresh.ceiling !== undefined, 'a founding college\'s academics is under its ceiling, and not held');
  assert(!/limit/.test(prestigeBreakdown(s).inputs.find((i) => i.key === 'academics')!.detail), 'and its row does not mention one');
}

// ---- The deal ----
{
  const a = initialRivals();
  const b = initialRivals();
  assert(a.every((r, i) => r.specialization === b[i].specialization && r.specialization === dealtSpecialization(r.id)), 'every rival is dealt the same pillar off its id, every time');
  const dealt = new Map<Pillar, number>(PILLARS.map((p) => [p, a.filter((r) => r.specialization === p).length]));
  assert(PILLARS.every((p) => (dealt.get(p) ?? 0) >= 10), `all four pillars are dealt, each to at least ten schools (${[...dealt].map(([p, n]) => `${p} ${n}`).join(', ')})`);
  const strongest = [...a].sort((x, y) => y.reputation - x.reputation).slice(0, 6);
  assert(PILLARS.every((p) => strongest.some((r) => r.specialization === p)), `the six strongest schools cover all four pillars (${strongest.map((r) => `${r.id} ${r.specialization}`).join(', ')})`);
  assert(PILLARS.every((p) => a.some((r) => ELITE_RIVAL_IDS.has(r.id) && r.specialization === p)), 'and the elite band holds a specialist in each');
  const s = createInitialState('Deal');
  const tags = specializations(s);
  assert(s.rivals.every((r) => tags.get(r.id) === r.specialization) && !tags.has('self'), 'the guide tags every rival with its pillar, and not the college');
}

// ---- The field: a specialized axis runs higher, the rest stop at the ceilings ----
{
  bindScriptStream(4242);
  const s = createInitialState('Field');
  s.hasEnteredRankings = true;
  s.self.reputation = 50; // below the elite band's gate: the field's own drift
  let draws = 0;
  for (let year = 1; year <= 50; year += 1) {
    s.clock.year = year;
    s.clock.week = 52;
    const before = drawsSoFar();
    tickRivals(s);
    draws = Math.max(draws, drawsSoFar() - before);
  }
  assert(draws === 1, `the year's drift takes one draw, whatever the specializations (${draws})`);
  const axisPillar: Record<string, Pillar> = { academics: 'academics', researchStanding: 'research', socialStanding: 'studentLife', athleticStrength: 'athletics' };
  for (const axis of PILLAR_AXES) {
    const pillar = axisPillar[axis];
    const leader = rankedListBy(s, axis).find((e) => !e.isPlayer)!;
    const rival = s.rivals.find((r) => r.id === leader.key)!;
    assert(rival.specialization === pillar, `after fifty years ${pillar} is led by a school specialized in it (${rival.id}, ${rival.specialization})`);
  }
  const over = s.rivals.filter((r) => {
    const p = rivalPillars(r);
    return PILLARS.some((pillar) => pillar !== r.specialization && p[pillar] > UNSPECIALIZED_CEILINGS[pillar] + 1e-9);
  });
  assert(over.length === 0, `no school's other axes drift past the unspecialized ceilings (${over.map((r) => r.id).join(', ')})`);
  const specialistTop = Math.max(...s.rivals.map((r) => Math.max(...PILLARS.filter((p) => p === r.specialization && p !== 'athletics').map((p) => rivalPillars(r)[p]))));
  assert(specialistTop > Math.max(UNSPECIALIZED_CEILINGS.academics, UNSPECIALIZED_CEILINGS.research, UNSPECIALIZED_CEILINGS.studentLife) && specialistTop <= SPECIALIZED_CEILING + 1e-9,
    `a specialized axis runs above the ceilings, to at most ${SPECIALIZED_CEILING} (${specialistTop.toFixed(1)})`);
}

// ---- The migration ----
{
  const raw = readFileSync(join(process.cwd(), 'test/fixtures/save-v87.json'), 'utf8');
  const before = JSON.parse(raw) as { version: number; state: GameState };
  assert(before.version === 87 && before.state.rivals.every((r) => !('specialization' in r)), 'the version-87 fixture has no specializations');
  const read = readSave(raw);
  if ('refused' in read) throw new Error(`the version-87 fixture is refused: ${read.refused}`);
  const loaded = read.state;
  assert(loaded.rivals.length === 99 && loaded.rivals.every((r) => r.specialization === dealtSpecialization(r.id)), 'every rival loads dealt its pillar off its id');
  const fresh = initialRivals();
  assert(loaded.rivals.every((r) => r.specialization === fresh.find((f) => f.id === r.id)!.specialization), 'the same pillar a new game deals it');
  assert(loaded.rivals.every((r, i) => r.reputation === before.state.rivals[i].reputation && r.researchStanding === before.state.rivals[i].researchStanding),
    'and its standings are left where they were');
  // A save with a pillar that is not one is dealt again.
  const bad = JSON.parse(raw) as { version: number; state: GameState };
  const payload = { ...bad, version: 88, state: { ...bad.state, rivals: bad.state.rivals.map((r) => ({ ...r, specialization: 'archery' as unknown as Pillar })) } };
  const reread = readSave(JSON.stringify(payload));
  assert(!('refused' in reread) && reread.state.rivals.every((r) => r.specialization === dealtSpecialization(r.id)), 'a bad specialization is dealt again on load');
}

// ---- Harder titles ----
function coach(quality: number, field: string): Coach {
  return {
    id: `c-${field}-${quality}`, name: 'Test Coach', gender: 'female', heritage: 'Anglo/Western European',
    field, quality, qualityPotential: quality, tenureWeeks: 0, weeksListed: 0, salary: 90_000,
  };
}
{
  const s = createInitialState('Titles');
  const sport = SPORTS.find((sp) => sp.id === 'soccer-m')!;
  const club: StudentClub = {
    id: 'club-soccer', name: sport.clubName, foundedYear: 1, foundingMembers: 12, foundingEnrolled: 350,
    upkeepPerWeek: 50, sport: sport.id, varsityLastAskedYear: null,
  };
  s.orgs.clubs.push(club);
  const team = promoteToVarsityTeam(s, club, { sport: sport.id, name: sport.teamName, venueCategory: sport.venueCategory, upkeepPerWeek: 400, status: 'active' });
  team.headCoach = coach(100, sport.id);
  team.assistantCoach = coach(100, sport.id);
  team.trainer = coach(100, 'strength-conditioning');
  team.recruiting = 15;
  assert(teamQualityEarned(team, s) > UNSPECIALIZED_TEAM_CEILING, `a program with the best staff and recruiting earns more than the team ceiling (${teamQualityEarned(team, s)})`);
  assert(teamQuality(team, s) === UNSPECIALIZED_TEAM_CEILING, `and plays at ${UNSPECIALIZED_TEAM_CEILING} without the athletics specialization`);
  assert(STAGE_EDGE.quarterfinal <= STAGE_EDGE.semifinal && STAGE_EDGE.semifinal < STAGE_EDGE.final && stageEdge(s, 'final') === STAGE_EDGE.final, 'the big stage grows round by round, and stands against an unspecialized college');

  // The strongest school in the sport, seeded first: a title in a season
  // is rare.
  const best = Math.max(...s.rivals.map((r) => sportStrengthFor(r, sport.id)));
  assert(teamQuality(team, s) >= best, `the team is the sport's strongest (${teamQuality(team, s)} against ${best})`);
  const roll = makeRivalRng(777);
  const seasons = 4000;
  let titles = 0;
  let finals = 0;
  for (let i = 0; i < seasons; i += 1) {
    const result = resolveSport(s, sport.id, roll);
    if (result.finish === 'champion') titles += 1;
    if (result.finish === 'champion' || result.finish === 'final') finals += 1;
  }
  assert(titles / seasons < 0.1, `the sport's strongest program wins fewer than one title in ten seasons (${(titles / seasons * 100).toFixed(1)}%)`);
  assert(titles / finals < 0.35, `and loses most of its finals (${titles} of ${finals} won)`);
}

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
