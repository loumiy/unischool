// Capital projects (Plan 33, data/projectData.ts, systems/estate/projects.ts):
// one of each, opening from its year, the graduate college with a graduate
// program and the late tier with the defend era; payable half from the
// endowment; lifting a standing in proportion to its condition.

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { PROJECTS, PROJECT_IDS } from '../src/data/projectData';
import { canStartDevelopment, startDevelopment, unlockAvailable } from '../src/systems/techtree/techSystem';
import { canPayFromEndowment, endowmentHalf, lateTierOpen, projectLift, projectLiftMax } from '../src/systems/estate/projects';
import { financingFor } from '../src/systems/finance/treasury';
import { computeResearchTarget, prestigeBreakdown } from '../src/systems/prestige/prestigeSystem';
import { athleticProgramStrength, SPORTS } from '../src/data/studentLifeData';
import { eligible, whenMet } from '../src/systems/events/catalogue';
import { EVENT_CATALOGUE } from '../src/data/eventCatalogue';
import type { GameState, VarsityTeam } from '../src/state/types';

bindScriptStream(3335);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('projects tests');

function fresh(year = 1): GameState {
  const s = createInitialState('Projects');
  s.pendingInterrupt = null;
  s.clock.year = year;
  return s;
}
const node = (s: GameState, id: string) => s.tech.find((t) => t.id === id)!;
function stand(s: GameState, id: string): void {
  const t = node(s, id);
  t.status = 'done';
  s.placements[id] = { row: 10, col: 10, w: 3, h: 3 };
}

// ---- The set ----
{
  const s = fresh();
  assert(PROJECTS.length === 9 && new Set(PROJECT_IDS).size === 9, 'nine projects, each its own');
  assert(PROJECT_IDS.every((id) => node(s, id)?.facilityType === 'project' && node(s, id).project !== undefined), 'each is a buildable the college can place');
  assert(PROJECTS.filter((p) => p.project.late).length === 3, 'three in the late tier');
  assert(PROJECTS.some((p) => p.project.graduate && (p.beds ?? 0) > 0), 'a graduate college that houses its students');
  assert(PROJECTS.every((p) => Object.values(p.project.boosts).some((b) => (b ?? 0) > 0)), 'every one lifts a standing');
}

// ---- When they open ----
{
  const s = fresh(1);
  unlockAvailable(s);
  assert(PROJECT_IDS.every((id) => node(s, id).status === 'locked'), 'none is open to a founding college');
  s.clock.year = 12;
  unlockAvailable(s);
  assert(node(s, 'PROJ-RESEARCH-PARK').status === 'available' && node(s, 'PROJ-LAWN').status === 'available', 'v2\'s open from their years');
  assert(node(s, 'PROJ-MEDICAL').status === 'locked', 'not before them');
  s.clock.year = 25;
  unlockAvailable(s);
  assert(node(s, 'PROJ-GRADUATE').status === 'locked', 'the graduate college waits on a graduate program');
  assert(!lateTierOpen(s) && node(s, 'PROJ-INSTITUTE').status === 'locked', 'the late tier waits');
  s.clock.year = 35;
  s.self.reputation = 110;
  assert(lateTierOpen(s), 'it opens with the defend era');
  const later = fresh(40);
  assert(lateTierOpen(later), 'or at Year 40 for any college');
  unlockAvailable(later);
  assert(node(later, 'PROJ-INSTITUTE').status === 'available', 'and the institute can be built');
}

// ---- Half from the endowment ----
{
  const s = fresh(12);
  unlockAvailable(s);
  const park = node(s, 'PROJ-RESEARCH-PARK');
  const half = endowmentHalf(park);
  s.finance.cash = half;
  s.finance.endowment = half * 2 - 1;
  assert(!canPayFromEndowment(s, park), 'only while half the endowment covers the half');
  s.finance.endowment = half * 2;
  assert(canPayFromEndowment(s, park), 'which it now does');
  assert(financingFor((f) => canStartDevelopment(s, park, undefined, f)) === 'endowment', 'the build offers it when cash alone will not do');
  startDevelopment(s, park, undefined, 'endowment');
  assert(s.finance.endowment === half && s.finance.cash === half - (park.cost - half), 'half from the endowment, the rest in cash');
  const dorm = s.tech.find((t) => t.kind === 'dorm' && t.status === 'available');
  assert(dorm === undefined || !canStartDevelopment(s, dorm, undefined, 'endowment'), 'and only a project may');
}

// ---- What they lift ----
{
  const s = fresh(20);
  const before = computeResearchTarget(s);
  assert(!prestigeBreakdown(s).inputs.some((i) => i.key === 'projects'), 'no line for projects until one stands');
  stand(s, 'PROJ-RESEARCH-PARK');
  assert(Math.abs(projectLift(s, 'research') - 18) < 1e-9, 'the research park lifts research 18 points');
  assert(Math.abs(computeResearchTarget(s) - before - 18) < 0.01 || computeResearchTarget(s) === 150, 'and the research standing\'s target with it');
  node(s, 'PROJ-RESEARCH-PARK').backlog = node(s, 'PROJ-RESEARCH-PARK').cost / 4;
  assert(Math.abs(projectLift(s, 'research') - 9) < 0.01, 'half as much at half condition');
  stand(s, 'PROJ-MEDICAL');
  const input = prestigeBreakdown(s).inputs.find((i) => i.key === 'projects');
  assert(input !== undefined && Math.abs(input.contribution - 6) < 0.01, `the medical center lifts academics (${input?.contribution})`);
  assert(projectLiftMax('academics') === PROJECTS.reduce((t, p) => t + (p.project.boosts.academics ?? 0), 0), 'the most is every project standing');

  const team = { id: 'team-1', sport: SPORTS[0].id, status: 'active', headCoach: null, assistantCoach: null, trainer: null } as unknown as VarsityTeam;
  s.orgs.teams = [team];
  s.orgs.teamOrder = [team.id];
  const strength = athleticProgramStrength(s);
  stand(s, 'PROJ-STADIUM');
  assert(athleticProgramStrength(s) === Math.min(100, strength + 18), 'the championship stadium lifts every program');
}

// ---- The catalogue and the promises read them ----
{
  const s = fresh(20);
  assert(!whenMet(s, { projectsOver: 1 }), 'no project, no "a great project"');
  stand(s, 'PROJ-LAWN');
  assert(whenMet(s, { projectsOver: 1 }), 'one standing counts');
  const needsLawn = EVENT_CATALOGUE.find((e) => (e.needs ?? []).includes('great-lawn') && Object.keys(e.when).length === 0);
  assert(needsLawn === undefined || eligible(s, needsLawn), 'an event that needs the great lawn can have it');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
