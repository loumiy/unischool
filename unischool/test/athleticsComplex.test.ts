// ---------------------------------------------------------------------
// The athletic performance complex (Plan 85G, data/athleticsComplexData.ts).
// What is worth pinning:
//
//   - the gate: the Athletic Performance Complex opens only to a college
//     specialized in athletics, through 85E's CapitalProject.specialization,
//     and the build menu lists it closed to any other; it lifts no standing
//     of its own;
//   - the extra flagship slots: two above the subsidy level's, only while
//     the complex stands at a college specialized in athletics;
//   - the recruiting boost and the better odds deep in the postseason, only
//     with both the complex and the specialization; the specialization alone
//     keeps 85D's lift (no slowdown; the established powers' edge shrunk to
//     a quarter, the owner's decision in 85G's review);
//   - the athletics pillar's specialization term reads the complex's deep
//     runs over the last ten years, full at COMPLEX_POINTS_FOR_FULL; nothing
//     without the complex, and the row says why; only a deep run while the
//     complex works goes on the record;
//   - the choice's card has the complex and its mechanics under Now;
//   - the migration adds the complex to an old save's catalog, locked, with
//     an empty record; a round trip keeps the record, and a malformed one is
//     dropped;
//   - the harness's athletics specialist builds the complex, runs the high
//     subsidy and fills every flagship slot on full scholarships.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GameState, Pillar } from '../src/state/types';
import { exportSave, readSave, SAVE_VERSION } from '../src/state/persistence';
import {
  ATHLETICS_COMPLEX_ID, COMPLEX_FLAGSHIPS, COMPLEX_HOME_EDGE, COMPLEX_POINTS, COMPLEX_POINTS_FOR_FULL, COMPLEX_RECRUITING_BOOST,
  COMPLEX_WINDOW_YEARS, complexPoints, complexReading, recordComplexRun,
} from '../src/data/athleticsComplexData';
import {
  ATHLETICS_BUDGET_TIERS, RECRUITING_FULL_LIFT, TRAINER_FIELD, departmentPot, recruitingTarget,
} from '../src/data/studentLifeData';
import { PROJECTS, projectOpens } from '../src/data/projectData';
import { SPECIALIZATION_CARDS, opensLine } from '../src/data/specializationData';
import { closedBySpecialization, projectLift, projectOpen } from '../src/systems/estate/projects';
import { unlockAvailable } from '../src/systems/techtree/techSystem';
import { pillarBreakdown } from '../src/systems/prestige/prestigeSystem';
import { SPECIALIZED_STAGE_SHARE, STAGE_EDGE, stageEdge } from '../src/systems/athletics/playoffs';
import { tickRecruiting } from '../src/systems/athletics/athleticsSystem';
import { brokenRules } from '../sim/harness/invariants';
import { foundGame } from '../sim/harness/game';
import { runAthletics } from '../sim/harness/athletics';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('athletic performance complex tests');

const FIXTURES = join(process.cwd(), 'test/fixtures');
// The launch fixture: a year-25 Guided run, fifteen teams waiting on their
// venues, no specialization. Every team is made active here: the pot and
// the postseason read only the status.
function launch(): GameState {
  const read = readSave(readFileSync(join(FIXTURES, 'save-launch.json'), 'utf8'));
  if ('refused' in read) throw new Error(`the launch fixture is refused: ${read.refused}`);
  return read.state;
}
const complex = (s: GameState) => s.tech.find((t) => t.id === ATHLETICS_COMPLEX_ID)!;
const term = (s: GameState) => pillarBreakdown(s, 'athletics').inputs.find((i) => i.key === 'specialization')!;
function college(specialization: GameState['specialization'], status: 'locked' | 'developing' | 'done' = 'done'): GameState {
  const s = launch();
  s.specialization = specialization;
  s.specializationYear = specialization === 'none' ? undefined : s.clock.year;
  for (const t of s.orgs.teams) t.status = 'active';
  s.orgs.athleticsBudget = 'high';
  complex(s).status = status;
  return s;
}

// ---- The gate ----
{
  const def = PROJECTS.find((p) => p.id === ATHLETICS_COMPLEX_ID)!;
  assert(def.project.specialization === 'athletics', 'the complex is the athletics specialization\'s');
  assert(Object.values(def.project.boosts).every((b) => !b), 'it lifts no standing of its own');
  assert(/specialized in athletics; no other college may build it/.test(projectOpens(def.project)), `its gate in words ("${projectOpens(def.project)}")`);
  assert(def.description.includes(`${COMPLEX_FLAGSHIPS} more flagship programs`) && /deep runs fill athletics' specialization share/.test(def.description), 'the description says what it does');
  const s0 = launch();
  assert(complex(s0)?.status === 'locked', 'the launch fixture, walked up the chain, has the complex in its catalog, locked');
  for (const chosen of ['none', 'academics', 'research', 'studentLife'] as const) {
    const s = college(chosen, 'locked');
    unlockAvailable(s);
    assert(complex(s).status === 'locked' && !projectOpen(s, complex(s)), `closed to a college specialized in ${chosen}`);
    assert(closedBySpecialization(s, complex(s)), `and listed closed in the build menu (${chosen})`);
  }
  const s = college('athletics', 'locked');
  unlockAvailable(s);
  assert(complex(s).status === 'available' && !closedBySpecialization(s, complex(s)), 'open to a college specialized in athletics, and not listed closed');
  complex(s).status = 'done';
  assert(projectLift(s, 'athletics') === projectLift(college('athletics', 'locked'), 'athletics'), 'standing, it adds no project lift');
}

// ---- More flagships ----
{
  const tier = ATHLETICS_BUDGET_TIERS.high.flagships;
  const flagshipsOf = (s: GameState) => departmentPot(s).programs.filter((p) => p.band === 'flagship').length;
  const s = college('athletics');
  const pot = departmentPot(s);
  assert(s.orgs.teams.length > tier + COMPLEX_FLAGSHIPS, 'enough programs to fill every slot');
  assert(pot.cap === tier + COMPLEX_FLAGSHIPS && pot.baseCap === tier && flagshipsOf(s) === tier + COMPLEX_FLAGSHIPS, `the complex at an athletics college: ${tier} + ${COMPLEX_FLAGSHIPS} flagships (${pot.cap})`);
  assert(departmentPot(s).programs.slice(0, pot.cap).every((p) => p.band === 'flagship'), 'the first on the list are the flagships');
  for (const [label, t] of [
    ['specialized in athletics, no complex', college('athletics', 'locked')],
    ['specialized in athletics, the complex going up', college('athletics', 'developing')],
    ['the complex at a college specialized in research', college('research')],
    ['the complex at a college with no specialization', college('none')],
  ] as const) {
    assert(departmentPot(t).cap === tier && flagshipsOf(t) === tier, `${label}: the subsidy's ${tier}, no more`);
  }
  s.orgs.athleticsBudget = 'low';
  assert(departmentPot(s).cap === ATHLETICS_BUDGET_TIERS.low.flagships + COMPLEX_FLAGSHIPS, 'the complex adds to whatever the subsidy level allows');
  assert(brokenRules(college('athletics')).every((b) => !/flagships at a cap/.test(b)), 'the rules count the complex\'s slots');
}

// ---- Recruiting ----
{
  const s = college('athletics');
  const team = departmentPot(s).programs[0].team;
  team.scholarships = 'full';
  assert(recruitingTarget(team, true) === RECRUITING_FULL_LIFT, 'without a boost, full scholarships build to the full lift');
  const boosted = RECRUITING_FULL_LIFT * (1 + COMPLEX_RECRUITING_BOOST);
  assert(Math.abs(recruitingTarget(team, true, 1 + COMPLEX_RECRUITING_BOOST) - boosted) < 1e-9, `with the complex's, to +${boosted}`);
  // The week's step moves a full class's share toward the target: past
  // the full lift only with the complex and the specialization.
  const step = (t: GameState) => {
    const team0 = departmentPot(t).programs[0].team;
    team0.scholarships = 'full';
    team0.recruiting = RECRUITING_FULL_LIFT;
    tickRecruiting(t);
    return team0.recruiting;
  };
  assert(step(college('athletics')) > RECRUITING_FULL_LIFT, 'the complex at an athletics college recruits past the full lift');
  assert(step(college('athletics', 'locked')) === RECRUITING_FULL_LIFT, 'the specialization alone does not');
  assert(step(college('research')) === RECRUITING_FULL_LIFT, 'nor does the complex at a college specialized in research');
}

// ---- The postseason ----
{
  const rounds = ['quarterfinal', 'semifinal', 'final'] as const;
  const at = (s: GameState) => rounds.map((r) => stageEdge(s, r));
  assert(at(college('none')).join() === rounds.map((r) => STAGE_EDGE[r]).join(), 'unspecialized, the established powers keep their edge');
  assert(at(college('research')).join() === rounds.map((r) => STAGE_EDGE[r]).join(), 'and with the complex at a college specialized in research');
  // The specialization shrinks the big stage to a quarter (the owner's
  // decision in 85G's review): 2, 5 and 9.
  const quarter = rounds.map((r) => Math.round(STAGE_EDGE[r] * SPECIALIZED_STAGE_SHARE));
  assert(SPECIALIZED_STAGE_SHARE === 0.25 && quarter.join() === '2,5,9', `a quarter of the big stage (${quarter.join(', ')})`);
  assert(at(college('athletics', 'locked')).join() === quarter.join(), 'specialized in athletics without the complex, a quarter of the edge stands against it');
  assert(at(college('athletics', 'developing')).join() === quarter.join(), 'and while it goes up');
  const works = at(college('athletics'));
  assert(works.join() === rounds.map((r, i) => quarter[i] - COMPLEX_HOME_EDGE[r]).join(),
    `with the complex, the college plays ${COMPLEX_HOME_EDGE.semifinal} stronger in a semifinal and ${COMPLEX_HOME_EDGE.final} in a final than the quarter left (${works.join(', ')})`);
  assert(COMPLEX_HOME_EDGE.semifinal > 0 && COMPLEX_HOME_EDGE.final >= COMPLEX_HOME_EDGE.semifinal, 'deeper rounds, a bigger edge');
}

// ---- The term reads the complex ----
{
  const s = college('athletics');
  const y = s.clock.year;
  s.orgs.complexRuns = [];
  assert(term(s).score === 0 && /0 titles, 0 lost finals and 0 lost semifinals in the last 10 years, 0 points/.test(term(s).detail), `no deep runs, an empty term ("${term(s).detail}")`);
  s.orgs.complexRuns = [
    { year: y - 1, sport: 'soccer-m', finish: 'champion' },
    { year: y - 1, sport: 'soccer-w', finish: 'final' },
    { year: y, sport: 'soccer-m', finish: 'semifinal' },
  ];
  const pts = COMPLEX_POINTS.champion + COMPLEX_POINTS.final + COMPLEX_POINTS.semifinal;
  assert(Math.abs(complexPoints(s) - pts) < 1e-9 && Math.abs(term(s).score - pts / COMPLEX_POINTS_FOR_FULL) < 1e-9, `a title, a lost final and a lost semifinal: ${pts} of ${COMPLEX_POINTS_FOR_FULL} (${term(s).score})`);
  assert(/1 title, 1 lost final and 1 lost semifinal/.test(term(s).detail), `the row counts them ("${term(s).detail}")`);
  s.orgs.complexRuns = [{ year: y - COMPLEX_WINDOW_YEARS, sport: 'soccer-m', finish: 'champion' }, { year: y - COMPLEX_WINDOW_YEARS + 1, sport: 'soccer-m', finish: 'champion' }];
  assert(complexPoints(s) === 1, 'a title older than the window counts for nothing');
  s.orgs.complexRuns = Array.from({ length: COMPLEX_POINTS_FOR_FULL }, (_, i) => ({ year: y - (i % COMPLEX_WINDOW_YEARS), sport: `s${i}`, finish: 'champion' as const }));
  assert(term(s).score === 1 && /The term is full/.test(term(s).detail), `${COMPLEX_POINTS_FOR_FULL} titles in ten years fill it ("${term(s).detail}")`);
  // Nothing without the complex, and the row says why.
  complex(s).status = 'locked';
  assert(complexReading(s) === 0 && term(s).score === 0 && /no Athletic Performance Complex stands/.test(term(s).detail), `without the complex it is empty ("${term(s).detail}")`);
  complex(s).status = 'developing';
  assert(term(s).score === 0 && /still going up/.test(term(s).detail), `going up, still empty ("${term(s).detail}")`);
  complex(s).status = 'done';
  // Specialized elsewhere, the athletics term is empty whatever stands.
  for (const chosen of ['academics', 'research', 'studentLife'] as Pillar[]) {
    const t = structuredClone(s);
    t.specialization = chosen;
    assert(term(t).score === 0 && /so this stays empty/.test(term(t).detail), `specialized in ${chosen}, the athletics term stays empty`);
  }
  // The record: a deep run while the complex works; nothing else.
  s.orgs.complexRuns = [];
  recordComplexRun(s, 'soccer-m', 'champion');
  recordComplexRun(s, 'soccer-w', 'quarterfinal');
  recordComplexRun(s, 'baseball', 'missed');
  recordComplexRun(s, 'softball', 'final');
  assert(s.orgs.complexRuns.length === 2 && s.orgs.complexRuns.every((r) => r.year === y), 'a title and a lost final go on the record; a quarterfinal and a miss do not');
  s.orgs.complexRuns.unshift({ year: y - COMPLEX_WINDOW_YEARS, sport: 'old', finish: 'champion' });
  recordComplexRun(s, 'soccer-m', 'missed');
  assert(s.orgs.complexRuns.every((r) => r.year > y - COMPLEX_WINDOW_YEARS), 'a year that leaves the window is dropped');
  for (const t of [college('athletics', 'locked'), college('research'), college('none')]) {
    recordComplexRun(t, 'soccer-m', 'champion');
    assert(t.orgs.complexRuns.length === 0, `no record without the complex working (${t.specialization}, ${complex(t).status})`);
  }
  // The card.
  assert(/as its programs make deep runs once the Athletic Performance Complex stands/.test(opensLine('athletics', 30)), `the card says how it fills ("${opensLine('athletics', 30)}")`);
  assert(SPECIALIZATION_CARDS.athletics.mechanics.length === 2 && SPECIALIZATION_CARDS.athletics.mechanics.every((m) => m.ready), 'the complex and its mechanics are now, not still to come');
  assert(SPECIALIZATION_CARDS.studentLife.mechanics.every((m) => m.ready), 'student life\'s are now too (Plan 85H)');
}

// ---- The migration, and a round trip ----
{
  const raw = readFileSync(join(FIXTURES, 'save-v91.json'), 'utf8');
  const parsed = JSON.parse(raw) as { version: number; state: GameState };
  assert(parsed.version === 91 && !('complexRuns' in parsed.state.orgs) && !parsed.state.tech.some((t) => t.id === ATHLETICS_COMPLEX_ID), 'the version-91 fixture predates the complex');
  const read = readSave(raw);
  assert(!('refused' in read), 'it loads');
  if (!('refused' in read)) {
    assert(complex(read.state)?.status === 'locked', 'with the complex in its catalog, locked');
    assert(Array.isArray(read.state.orgs.complexRuns) && read.state.orgs.complexRuns.length === 0, 'and an empty record');
    assert(brokenRules(read.state).length === 0, `the rules hold (${brokenRules(read.state).join('; ')})`);
  }
  const s = college('athletics');
  s.orgs.complexRuns = [{ year: s.clock.year - 1, sport: 'soccer-m', finish: 'champion' }, { year: s.clock.year, sport: 'baseball', finish: 'semifinal' }];
  const back = readSave(exportSave(s).text);
  assert(!('refused' in back) && JSON.stringify(back.state.orgs.complexRuns) === JSON.stringify(s.orgs.complexRuns), 'a round trip keeps the record');
  const bad = JSON.parse(exportSave(s).text) as { state: GameState };
  (bad.state.orgs as unknown as { complexRuns: unknown }).complexRuns = [
    { year: 'soon', sport: 'soccer-m', finish: 'champion' }, { year: s.clock.year, sport: 'soccer-m', finish: 'quarterfinal' },
    { year: s.clock.year + 3, sport: 'soccer-m', finish: 'champion' }, { year: s.clock.year - 1, sport: 'baseball', finish: 'final' },
  ];
  const cleaned = readSave(JSON.stringify(bad));
  assert(!('refused' in cleaned) && JSON.stringify(cleaned.state.orgs.complexRuns) === JSON.stringify([{ year: s.clock.year - 1, sport: 'baseball', finish: 'final' }]), 'malformed runs are dropped on load');
  (bad.state.orgs as unknown as { complexRuns: unknown }).complexRuns = 'lots';
  const none = readSave(JSON.stringify(bad));
  assert(!('refused' in none) && none.state.orgs.complexRuns.length === 0, 'and a malformed record starts again');
  assert(SAVE_VERSION >= 92, `at version 92 or later (${SAVE_VERSION})`);
}

// ---- The harness's athletics specialist ----
{
  const s = college('athletics', 'locked');
  s.orgs.athleticsBudget = 'medium';
  s.finance.cash = 1e9;
  unlockAvailable(s);
  const g = foundGame({ from: s });
  runAthletics(g);
  assert(complex(g.s).status === 'developing', 'it builds the complex once it opens and can be paid for');
  assert(g.s.orgs.athleticsBudget === 'high', 'it runs the high subsidy level');
  // The complex up: every slot filled, on full scholarships.
  complex(g.s).status = 'done';
  runAthletics(g);
  const pot = departmentPot(g.s);
  const flags = pot.programs.filter((p) => p.band === 'flagship');
  assert(pot.cap === ATHLETICS_BUDGET_TIERS.high.flagships + COMPLEX_FLAGSHIPS && flags.length === pot.cap, `it fills every flagship slot (${flags.length} of ${pot.cap})`);
  assert(flags.every((p) => p.team.scholarships === 'full'), 'each on full scholarships');
  const open = g.s.orgs.teams.flatMap((t) => [
    t.headCoach === null ? t.sport : null, t.assistantCoach === null ? t.sport : null, t.trainer === null ? TRAINER_FIELD : null,
  ]).filter((f): f is string => f !== null);
  assert(open.length < 3 * g.s.orgs.teams.length && open.every((f) => !g.s.orgs.coachCandidates.some((c) => c.field === f)), `and fills every coaching post the market has a candidate for (${open.length} left open)`);
  const other = college('research');
  other.finance.cash = 1e9;
  const before = JSON.stringify(other.orgs);
  runAthletics(foundGame({ from: other }));
  assert(!runAthletics(foundGame({ from: other })) && JSON.stringify(other.orgs) === before, 'a college specialized in anything else is left to its own player');
}

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
