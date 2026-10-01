// Capital projects (Plan 33, data/projectData.ts, systems/estate/projects.ts):
// one of each, opening from its year, the graduate college with a graduate
// program and the late tier with the defend era; payable half from the
// endowment; lifting a standing in proportion to its condition.

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { PROJECTS, PROJECT_IDS } from '../src/data/projectData';
import { schoolCurriculumIds } from '../src/data/techData';
import { canStartDevelopment, startDevelopment, unlockAvailable } from '../src/systems/techtree/techSystem';
import { canPayFromEndowment, endowmentHalf, lateTierOpen, projectLift, projectLiftMax, projectOpen } from '../src/systems/estate/projects';
import { financingFor } from '../src/systems/finance/treasury';
import { computeResearchTarget, pillarBreakdown } from '../src/systems/prestige/prestigeSystem';
import { eligible, whenMet } from '../src/systems/events/catalogue';
import { EVENT_CATALOGUE } from '../src/data/eventCatalogue';
import { depthOpen, initiativeOffers } from '../src/data/researchData';
import type { GameState } from '../src/state/types';

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
// A lab that has seen an initiative through, which is what the Research
// Park waits on (Plan 53).
function labFinished(s: GameState): string {
  const lab = s.tech.find((t) => t.facilityType === 'lab')!;
  lab.status = 'done';
  s.research.finishedLabs = [lab.id];
  return lab.id;
}
function stand(s: GameState, id: string): void {
  const t = node(s, id);
  t.status = 'done';
  s.placements[id] = { row: 10, col: 10, w: 3, h: 3 };
}

// ---- The set ----
{
  const s = fresh();
  assert(PROJECTS.length === 7 && new Set(PROJECT_IDS).size === 7, 'seven projects, each its own (Plan 85E: the Faculty Training Institute)');
  assert(PROJECT_IDS.every((id) => node(s, id)?.facilityType === 'project' && node(s, id).project !== undefined), 'each is a buildable the college can place');
  assert(PROJECTS.filter((p) => p.project.late).length === 1, 'one in the late tier');
  const medical = node(s, 'HLTH-T3');
  assert(medical.name === 'Medical Center' && medical.project !== undefined && medical.facilityType === 'healthCenter', 'and the health chain\'s Medical Center is one too');
  assert(PROJECTS.every((p) => !('beds' in p)), 'no project adds beds: the game houses no graduate students');
  // The Faculty Training Institute (Plan 85E) lifts none of its own: the
  // academics pillar's specialization term reads what it does.
  assert(PROJECTS.every((p) => p.project.specialization !== undefined || Object.values(p.project.boosts).some((b) => (b ?? 0) > 0)), 'every one lifts a standing, but a specialization\'s own building');
}

// ---- When they open ----
{
  const s = fresh(1);
  unlockAvailable(s);
  assert(PROJECT_IDS.every((id) => node(s, id).status === 'locked'), 'none is open to a founding college');
  s.clock.year = 12;
  // The research park is the research specialization's own building (Plan
  // 85F); for that college it still waits on the labs (Plan 53).
  s.specialization = 'research';
  unlockAvailable(s);
  assert(node(s, 'PROJ-RESEARCH-PARK').status === 'locked', 'the research park waits on the labs (Plan 53)');
  const labId = labFinished(s);
  const second = s.tech.find((t) => t.facilityType === 'lab' && t.id !== labId)!;
  second.status = 'done';
  unlockAvailable(s);
  assert(node(s, 'PROJ-RESEARCH-PARK').status === 'locked', 'every standing lab, not just one');
  s.research.finishedLabs = [labId, second.id];
  unlockAvailable(s);
  assert(node(s, 'PROJ-RESEARCH-PARK').status === 'available', 'and opens once each has seen an initiative through');
  s.specialization = 'none';
  assert(node(s, 'PROJ-ARTS').status === 'locked', 'a graduate host waits on its school\'s curriculum too');
  for (const id of schoolCurriculumIds('Arts & Media')) node(s, id).status = 'done';
  unlockAvailable(s);
  assert(node(s, 'PROJ-ARTS').status === 'available', 'and opens once every Arts & Media course is taught');
  assert(!projectOpen(s, node(s, 'HLTH-T3')), 'the Medical Center not before Year 15');
  assert(projectOpen(fresh(15), node(fresh(15), 'HLTH-T3')), 'and from it');
  s.clock.year = 25;
  unlockAvailable(s);
  assert(node(s, 'PROJ-GRADUATE').status === 'available', 'the graduate college opens from Year 15 once any school is taught');
  assert(node(s, 'PROJ-LAW').status === 'locked' && node(s, 'PROJ-BUSINESS').status === 'locked', 'the law and business schools wait on their own schools');
  assert(!lateTierOpen(s) && node(s, 'PROJ-MUSEUM').status === 'locked', 'the late tier waits');
  s.clock.year = 35;
  s.self.reputation = 110;
  assert(lateTierOpen(s), 'it opens with the defend era');
  const later = fresh(40);
  assert(lateTierOpen(later), 'or at Year 40 for any college');
  unlockAvailable(later);
  assert(node(later, 'PROJ-MUSEUM').status === 'available', 'and the museum can be built');
}

// ---- Half from the endowment ----
{
  const s = fresh(12);
  s.specialization = 'research';
  labFinished(s);
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
  // A term of the pillar like the others since Plan 85D's review: shown
  // empty until one stands, scaled with the rest.
  const empty = pillarBreakdown(s, 'academics').inputs.find((i) => i.key === 'projects');
  assert(empty !== undefined && empty.contribution === 0, 'an empty line for projects until one stands');
  // The research park lifts no standing of its own since Plan 85F (it
  // lifted research 18 points for any college): the research pillar's
  // specialization term reads its Landmark work (test/researchPark.test.ts).
  stand(s, 'PROJ-RESEARCH-PARK');
  assert(projectLift(s, 'research') === 0 && computeResearchTarget(s) === before, 'the research park lifts no standing of its own (Plan 85F)');
  stand(s, 'HLTH-T3');
  const researchShare = pillarBreakdown(s, 'research').inputs.find((i) => i.key === 'projects')!.weight / projectLiftMax('research');
  assert(Math.abs(projectLift(s, 'research') - 8) < 1e-9 && projectLiftMax('research') === 8, 'the medical center is the one project that lifts research, 8 points');
  assert(Math.abs(computeResearchTarget(s) - before - 8 * researchShare) < 0.01, `and the research standing's target with it, scaled with the pillar's other terms (${(8 * researchShare).toFixed(1)})`);
  node(s, 'HLTH-T3').backlog = node(s, 'HLTH-T3').cost / 4;
  assert(Math.abs(projectLift(s, 'research') - 4) < 0.01, 'half as much at half condition');
  node(s, 'HLTH-T3').backlog = 0;
  const input = pillarBreakdown(s, 'academics').inputs.find((i) => i.key === 'projects');
  const share = input ? input.weight / projectLiftMax('academics') : 0;
  assert(input !== undefined && Math.abs(input.contribution - 6 * share) < 0.01, `the medical center lifts the academics pillar its 6 points, scaled (${input?.contribution})`);
  assert(projectLiftMax('academics') === PROJECTS.reduce((t, p) => t + (p.project.boosts.academics ?? 0), 0) + 6, 'the most is every project standing, the Medical Center among them');
  assert(projectLiftMax('athletics') === 0, 'and nothing lifts athletics since the championship stadium went');
}

// ---- The catalog and the promises read them ----
{
  const s = fresh(20);
  assert(!whenMet(s, { projectsOver: 1 }), 'no project, no "a great project"');
  stand(s, 'PROJ-ARTS');
  assert(whenMet(s, { projectsOver: 1 }), 'one standing counts');
  stand(s, 'QUAD-T1');
  const needsLawn = EVENT_CATALOGUE.find((e) => (e.needs ?? []).includes('great-lawn') && Object.keys(e.when).length === 0);
  assert(needsLawn === undefined || eligible(s, needsLawn), 'an event that needs the great lawn has the quad');
}

// ---- Research is staged on the park (Plan 53) ----
{
  const s = fresh(20);
  const labId = labFinished(s);
  assert(!initiativeOffers(s, labId).some((o) => o.depth.key === 'landmark'), 'no Landmark Program is offered before the park');
  assert(!depthOpen(s, 'landmark') && depthOpen(s, 'program'), 'the first three depths are open, the fourth is not');
  stand(s, 'PROJ-RESEARCH-PARK');
  assert(initiativeOffers(s, labId).some((o) => o.depth.key === 'landmark'), 'and it is offered once the park stands');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
