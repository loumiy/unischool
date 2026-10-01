// ---------------------------------------------------------------------
// Specialization terms, harder athletics and rivals that specialize (Plans
// 85C, and 85D's review, which replaced 85C's ceilings). What is worth
// pinning:
//
//   - no pillar is capped: each holds a term only its own specialization
//     fills, the rest share what is left in their old proportions, so a
//     perfect college without the specialization stands no higher than its
//     natural maximum, and one with it, its term full, can reach 150;
//   - every rival is dealt one pillar off its id, the same deal every time,
//     all four pillars dealt and all four among the strongest schools;
//   - a specialized axis runs higher: after fifty years each pillar is led
//     by a school specialized in it, and no school's other axes drift past
//     their targets; nothing clamps them (one above settles back over the
//     years); the year's drift still takes one draw;
//   - on a tie in the standings the college ranks ahead; a sport's own
//     table (its playoff seeds) still leaves a tie to the rival;
//   - a save from before (the version-87 fixture) loads with each rival
//     dealt its pillar as a new game deals it, and a bad one is dealt again;
//   - a title is hard to come by without the athletics specialization: a
//     program's quality slows above the knee and never reaches 100, and the
//     big stage goes against the college in a semifinal and a final.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInitialState } from '../src/state/actions';
import { readSave } from '../src/state/persistence';
import { dealtSpecialization, ELITE_RIVAL_IDS, hashUnit, initialRivals, makeRivalRng, sportStrengthFor } from '../src/data/rivalData';
import {
  PILLARS, PILLAR_FLOOR, PILLAR_SPAN, SPECIALIZATION_TERM_WEIGHTS, UNSPECIALIZED_MAXIMA, pillarBreakdown, prestigeBreakdown, specializationOf,
} from '../src/systems/prestige/prestigeSystem';
import { PILLAR_AXES, RIVAL_UNSPECIALIZED_TARGETS, playerRank, rankBy, rankedListBy, rivalOverall, rivalPillars, specializations, sportRankedList, tickRivals, SPECIALIZED_CEILING } from '../src/systems/rivals/rivalsSystem';
import { STAGE_EDGE, resolveSport, stageEdge } from '../src/systems/athletics/playoffs';
import { SPORTS, TEAM_QUALITY_KNEE, TEAM_QUALITY_SOFT_SPAN, promoteToVarsityTeam, teamQuality, teamQualityCurve, teamQualityEarned } from '../src/data/studentLifeData';
import { FESTIVAL_POINTS_FOR_FULL } from '../src/data/downtownData';
import { TRAINING_INSTITUTE_ID } from '../src/data/trainingData';
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

// ---- The specialization terms: no caps ----
{
  const s = createInitialState('Terms');
  assert(specializationOf(s) === null && s.specialization === 'none', 'a new college has no specialization (Plan 85D)');
  for (const p of PILLARS) {
    const b = pillarBreakdown(s, p);
    const term = b.inputs.find((i) => i.key === 'specialization');
    assert(term !== undefined && term.weight === SPECIALIZATION_TERM_WEIGHTS[p] && term.score === 0, `${p} holds a specialization term of ${SPECIALIZATION_TERM_WEIGHTS[p]}, empty`);
    assert(/Comes only with a specialization in/.test(term?.detail ?? ''), `which says only a specialization fills it ("${term?.detail}")`);
    const rest = b.inputs.filter((i) => i.key !== 'specialization').reduce((sum, i) => sum + i.weight, 0);
    assert(Math.abs(rest - (PILLAR_SPAN - SPECIALIZATION_TERM_WEIGHTS[p])) < 1e-9, `${p}'s other terms share the rest of the span (${rest.toFixed(1)})`);
    assert(b.ceiling === undefined && !b.held, `${p} has no cap`);
    assert(UNSPECIALIZED_MAXIMA[p] === PILLAR_FLOOR + PILLAR_SPAN - SPECIALIZATION_TERM_WEIGHTS[p], `${p}'s natural maximum is ${UNSPECIALIZED_MAXIMA[p]}`);
  }

  // A college that has finished the whole catalog: every program
  // established and distinguished, every school founded and distinguished,
  // every graduate program, a full class of the best students at scale, and
  // every other academic term in full. Its academics reaches its natural
  // maximum and no further without the specialization.
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
  assert(academics.target <= UNSPECIALIZED_MAXIMA.academics + 1e-9, `the finished catalog's academics stands no higher than ${UNSPECIALIZED_MAXIMA.academics} (${academics.target.toFixed(1)})`);
  const perfect = academics.inputs.filter((i) => i.key !== 'specialization').reduce((sum, i) => sum + i.weight, PILLAR_FLOOR);
  assert(Math.abs(perfect - UNSPECIALIZED_MAXIMA.academics) < 1e-9, 'even with every other term in full it would stand at the natural maximum');
  const row = prestigeBreakdown(late).inputs.find((i) => i.key === 'academics')!;
  assert(!/limit|Held/.test(row.detail), `prestige's academics row speaks of no limit ("${row.detail}")`);

  // Specialized, the term full: it passes the natural maximum, and every
  // term in full is the top of the scale. Academics' term reads the faculty
  // training program (Plan 85E): an institute standing, and the faculty
  // trained.
  late.specialization = 'academics';
  late.specializationYear = late.clock.year - 10;
  late.tech.find((t) => t.id === TRAINING_INSTITUTE_ID)!.status = 'done';
  for (const f of late.faculty) f.training = { points: 1, potential: f.teachingPotential - 1, untilWeek: 0 };
  const specialized = pillarBreakdown(late, 'academics');
  const term = specialized.inputs.find((i) => i.key === 'specialization')!;
  assert(term.score === 1 && specialized.target > UNSPECIALIZED_MAXIMA.academics, `specialized, its term full, academics passes ${UNSPECIALIZED_MAXIMA.academics} (${specialized.target.toFixed(1)})`);
  assert(Math.abs(perfect + term.weight - 150) < 1e-9, 'and every term in full is 150');
  // Student life's reads the downtown and the festival (Plan 85H): empty
  // without a festival, full with ten points of festivals in the window, the
  // district grown and the town's goodwill at its full mark.
  const timed = structuredClone(late);
  timed.specialization = 'studentLife';
  timed.downtown = { growth: 1, goodwill: 60, festivals: [] };
  const lifeTerm = () => pillarBreakdown(timed, 'studentLife').inputs.find((i) => i.key === 'specialization')!.score;
  assert(lifeTerm() === 0, `without a festival student life's term is empty (${lifeTerm()})`);
  for (let k = 1; k <= FESTIVAL_POINTS_FOR_FULL; k += 1) timed.downtown.festivals.push({ year: timed.clock.year - k, scale: 'concert' });
  assert(Math.abs(lifeTerm() - 1) < 1e-9, `with ten festivals and a headline act each, it is full (${lifeTerm()})`);
  // Another pillar's term stays empty, and says why.
  const research = pillarBreakdown(late, 'research').inputs.find((i) => i.key === 'specialization')!;
  assert(research.score === 0 && /specialized in academics/.test(research.detail), `research's term stays empty ("${research.detail}")`);
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
  // None that started below a target climbs past it.
  const start = new Map(initialRivals().map((r) => [r.id, rivalPillars(r)]));
  const over = s.rivals.filter((r) => {
    const p = rivalPillars(r);
    return PILLARS.some((pillar) => pillar !== r.specialization && start.get(r.id)![pillar] <= RIVAL_UNSPECIALIZED_TARGETS[pillar] && p[pillar] > RIVAL_UNSPECIALIZED_TARGETS[pillar] + 1e-9);
  });
  assert(over.length === 0, `no school's other axes drift past their targets (${over.map((r) => r.id).join(', ')})`);
  for (const pillar of PILLARS) {
    assert(RIVAL_UNSPECIALIZED_TARGETS[pillar] <= UNSPECIALIZED_MAXIMA[pillar], `the rivals' ${pillar} target sits at or below the college's natural maximum`);
  }
  const specialistTop = Math.max(...s.rivals.map((r) => Math.max(...PILLARS.filter((p) => p === r.specialization && p !== 'athletics').map((p) => rivalPillars(r)[p]))));
  assert(specialistTop > Math.max(UNSPECIALIZED_MAXIMA.academics, UNSPECIALIZED_MAXIMA.research, UNSPECIALIZED_MAXIMA.studentLife) && specialistTop <= SPECIALIZED_CEILING + 1e-9,
    `a specialized axis runs above the natural maxima, to at most ${SPECIALIZED_CEILING} (${specialistTop.toFixed(1)})`);

  // Unclamped: an unspecialized axis set well above its target is not
  // snapped back to it; it takes no move up, and falls only as it drifts.
  const r = s.rivals.find((x) => x.specialization !== 'research')!;
  r.researchStanding = RIVAL_UNSPECIALIZED_TARGETS.research + 20;
  s.clock.year = 51;
  tickRivals(s);
  assert(r.researchStanding > RIVAL_UNSPECIALIZED_TARGETS.research + 5 && r.researchStanding <= RIVAL_UNSPECIALIZED_TARGETS.research + 20, `an axis 20 above its target is left above it, and rises no further (${(r.researchStanding - RIVAL_UNSPECIALIZED_TARGETS.research).toFixed(1)} above)`);
}

// ---- Ties: the college ranks ahead (the owner's rule) ----
{
  const s = createInitialState('Ties');
  // Research: the college level with the field's best.
  const best = Math.max(...s.rivals.map((r) => r.researchStanding));
  s.self.researchStanding = best;
  assert(rankBy(s, 'researchStanding') === 1, `level with the best research standing, the college is first (#${rankBy(s, 'researchStanding')})`);
  // Level with several rivals at one figure.
  for (const r of s.rivals.slice(0, 5)) r.socialStanding = 120;
  s.self.socialStanding = 120;
  const above = s.rivals.filter((r) => r.socialStanding > 120).length;
  assert(rankBy(s, 'socialStanding') === above + 1, `level at 120 in student life, ahead of every rival there (#${rankBy(s, 'socialStanding')}, ${above} above)`);
  // Prestige: level with the leader's overall.
  s.self.reputation = Math.max(...s.rivals.map(rivalOverall));
  assert(playerRank(s) === 1, `level with the field's best overall, the college is first (#${playerRank(s)})`);
  // And a school just above is still above.
  s.self.reputation -= 1e-6;
  assert(playerRank(s) === 2, 'a hair below it, second');
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
  const earned = teamQualityEarned(team, s);
  assert(earned > TEAM_QUALITY_KNEE + 10, `a program with the best staff and recruiting earns well above the knee (${earned})`);
  assert(teamQuality(team, s) < earned && teamQuality(team, s) <= TEAM_QUALITY_KNEE + TEAM_QUALITY_SOFT_SPAN, `and plays slower than it earns, no higher than ${TEAM_QUALITY_KNEE + TEAM_QUALITY_SOFT_SPAN}, without the athletics specialization (${teamQuality(team, s)})`);
  // The curve: whole below the knee, slower above, rising all the way, and
  // never 100; the specialization takes the slowdown away.
  assert(teamQualityCurve(70, false) === 70 && teamQualityCurve(TEAM_QUALITY_KNEE, false) === TEAM_QUALITY_KNEE, 'below the knee a point is a point');
  let last = 0;
  let rising = true;
  for (let raw = 60; raw <= 160; raw += 1) {
    const q = teamQualityCurve(raw, false);
    if (q < last) rising = false;
    last = q;
  }
  assert(rising && last < 100, `above it each point is worth less, and 100 is out of reach (at 160 earned: ${last})`);
  assert(teamQualityCurve(95, true) === 95 && teamQualityCurve(120, true) === 100, 'specialized in athletics, a point is a point up to 100');
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

  // A sport's table keeps the old tie rule: level, the rival seeds ahead.
  const r = s.rivals[0];
  r.athleticStrength = teamQuality(team, s) - (hashUnit(`${r.id}:${sport.id}`) * 2 - 1) * 28;
  assert(sportStrengthFor(r, sport.id) === teamQuality(team, s), `a rival level with the team in its sport (${sportStrengthFor(r, sport.id)})`);
  const table = sportRankedList(s, sport.id);
  assert(table.findIndex((e) => e.key === r.id) < table.findIndex((e) => e.isPlayer), 'is seeded ahead of it: a sport\'s table leaves ties to the rival');
}

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
