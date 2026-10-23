// ---------------------------------------------------------------------
// The tab the build menu opens on (Plan 92, BuildPopup.tsx's
// initialBuildTab): Grounds, its first tab, except while Founders Hall waits
// for its ground in a guided founding; then the tab that holds the hall,
// where the walkthrough points, and Grounds again once it stands. The
// walkthrough's site steps (Plan 103C) open it on Housing, then on the
// dining hall's tab. Plan 114F (the third review's C3-9): Campus life's
// Student Center, Research's first lab and the Research Park are ringed and
// opened on while their objectives wait; Capital projects opens on its tab;
// and a NEXT build line opens on the building its intent names.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import type { GameState } from '../src/state/types';
import { createInitialState, createPreStartState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { FOUNDERS_HALL_ID } from '../src/data/techData';
import { FOUNDING_COLORS, schoolColorsOf } from '../src/data/schoolColors';
import { FOUNDING_VERNACULAR } from '../src/data/foundingData';
import { centredPlacement, footprintOf } from '../src/state/campusMap';
import { buildTabOf, initialBuildTab, ringedTile } from '../src/components/BuildPopup';
import { ringedBuilding } from '../src/state/chapters';
import { RESEARCH_PARK_ID } from '../src/data/researchParkData';
import { stepBuilding, stepTarget } from '../src/systems/guidance/nextStep';
import { bindScriptStream } from '../src/engine/random';

bindScriptStream(92);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
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

console.log('build tab tests');

{
  const plain = createInitialState('Grounds');
  assert(initialBuildTab(plain) === 'campus-tools', `a running college opens the menu on Grounds (${initialBuildTab(plain)})`);

  let s = reducer(createPreStartState(), {
    type: 'START_GAME', name: 'Walk', vernacular: FOUNDING_VERNACULAR, colors: schoolColorsOf(FOUNDING_COLORS), guided: true,
  });
  const hallTab = buildTabOf(s, FOUNDERS_HALL_ID);
  assert(hallTab !== undefined && hallTab !== 'campus-tools', `Founders Hall is listed off Grounds (${hallTab})`);
  assert(initialBuildTab(s) === hallTab, `while the hall waits for its ground, the menu opens on its tab (${initialBuildTab(s)})`);

  const hall = s.tech.find((t) => t.id === FOUNDERS_HALL_ID)!;
  const spot = centredPlacement(footprintOf(hall));
  s = reducer(s, { type: 'PLACE_BUILDABLE', buildableId: FOUNDERS_HALL_ID, row: spot.row, col: spot.col, facing: 0 });
  assert(FOUNDERS_HALL_ID in s.placements, 'the hall is set down');
  assert(initialBuildTab(s) === 'campus-tools', `and the menu opens on Grounds again (${initialBuildTab(s)})`);

  // The chapter "Somewhere to sleep" (Plan 106 PR C, once the walkthrough's
  // site steps): Housing, then the dining hall's tab.
  s.events.opening.stage = 'play';
  s.guidance = { opened: { founding: 1, 'next-course': 1, 'somewhere-to-sleep': 10 }, done: { founding: 1, 'next-course': 5 }, met: [], marked: [] };
  const dorm = s.tech.find((t) => t.kind === 'dorm' && t.status === 'available')!;
  assert(buildTabOf(s, dorm.id) === 'housing' && initialBuildTab(s) === 'housing', `the chapter opens the menu on Housing (${initialBuildTab(s)})`);
  s.placements[dorm.id] = { row: 0, col: 0, w: 1, h: 1 } as unknown as GameState['placements'][string];
  const dining = s.tech.find((t) => t.facilityType === 'diningHall' && t.status === 'available')!;
  const diningTab = buildTabOf(s, dining.id);
  assert(diningTab !== undefined && diningTab !== 'housing' && initialBuildTab(s) === diningTab, `a residence hall sited, it opens on the dining hall's tab (${initialBuildTab(s)})`);
  s.guidance.done['somewhere-to-sleep'] = 12;
  assert(initialBuildTab(s) === 'campus-tools', 'and Grounds once the chapter is done');
}

// ---- Plan 114F: the chapters' rings after year 1, and NEXT's build door ----
{
  const base = createInitialState('Rings');
  const open = (s: GameState, opened: Record<string, number>, met: string[] = []) => {
    s.guidance = { opened: { founding: 1, ...opened }, done: { founding: 1 }, met, marked: [] };
  };
  const available = (s: GameState, id: string) => { s.tech.find((t) => t.id === id)!.status = 'available'; };

  // Campus life, the main chapter: the Student Center, on the Social tab.
  let s = structuredClone(base);
  available(s, 'SCTR-T1');
  open(s, { 'campus-life': 100 });
  assert(ringedBuilding(s)?.id === 'SCTR-T1', `Campus life rings the Student Center (${ringedBuilding(s)?.id})`);
  assert(initialBuildTab(s) === 'social' && buildTabOf(s, 'SCTR-T1') === 'social', `and opens the menu on its tab (${initialBuildTab(s)})`);
  open(s, { 'campus-life': 100 }, ['site-student-center']);
  assert(ringedBuilding(s) === null && initialBuildTab(s) === 'campus-tools', 'met, it rings nothing and the menu opens on Grounds');
  s = structuredClone(base);
  open(s, { 'campus-life': 100 });
  assert(ringedBuilding(s) === null, 'nor while the Student Center is locked');

  // Research, a side chapter, open under a main one: the first lab.
  s = structuredClone(base);
  available(s, 'LAB-PHYS');
  open(s, { 'running-the-college': 200, research: 210 });
  assert(ringedBuilding(s)?.id === 'LAB-PHYS', `Research rings its first lab (${ringedBuilding(s)?.id})`);
  assert(initialBuildTab(s) === buildTabOf(s, 'LAB-PHYS') && initialBuildTab(s) === 'academic', `on the Academic tab (${initialBuildTab(s)})`);
  s.placements['LAB-PHYS'] = { row: 0, col: 0, w: 1, h: 1 } as unknown as GameState['placements'][string];
  assert(ringedBuilding(s) === null, 'and nothing once it is sited');

  // The Research Park, on the Capital projects tab.
  s = structuredClone(base);
  available(s, RESEARCH_PARK_ID);
  open(s, { 'research-park': 600 });
  assert(ringedBuilding(s)?.id === RESEARCH_PARK_ID && initialBuildTab(s) === 'project', `the park's chapter rings the park, on its tab (${initialBuildTab(s)})`);

  // Capital projects: its tab, with no one building rung.
  s = structuredClone(base);
  available(s, 'PROJ-ARTS');
  open(s, { 'capital-projects': 500 });
  assert(ringedBuilding(s) === null && initialBuildTab(s) === 'project', `Capital projects opens the menu on its tab (${initialBuildTab(s)})`);
  open(s, { 'capital-projects': 500 }, ['begin-a-project']);
  assert(initialBuildTab(s) === 'campus-tools', 'and Grounds once a project is begun');

  // NEXT's build door: a site line opens on its building, ringed; a need's
  // line on the building it names.
  s = structuredClone(base);
  available(s, 'SCTR-T1');
  const site = { text: 'Place the Student Center', go: 'build' as const, intent: { kind: 'site' as const, buildableIds: ['SCTR-T1'] } };
  assert(stepTarget(s, site) === 'SCTR-T1', 'a site line names its building');
  assert(initialBuildTab(s, 'SCTR-T1') === 'social' && ringedTile(s, 'SCTR-T1') === 'SCTR-T1', `the menu opens on its tab and rings it (${initialBuildTab(s, 'SCTR-T1')})`);
  assert(stepBuilding(s, { kind: 'build-for', attribute: 'academic' })?.id === 'LIB-T1', 'a need for academic names the library');
  assert(initialBuildTab(s, 'LIB-T1') === 'academic', 'and opens on the Academic tab');
  assert(stepBuilding(s, { kind: 'build-for', attribute: 'social' })?.id === 'SCTR-T1', 'a need for social names the Student Center once it can be built');
  assert(stepTarget(s, { text: 'Hire someone', go: 'faculty' }) === undefined && initialBuildTab(s, null) === 'campus-tools', 'a line that is not a build door names nothing');
}

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
