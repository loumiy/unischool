// ---------------------------------------------------------------------
// Capital projects you can find (Plan 118D, I5: "I can't find the way to
// build a capital project. No tab has shown up even though I am on year
// 12"). From the first project's year, the build menu's Capital projects
// tab shows even with none open, each project greyed out with what opens
// it. Before that year it stays hidden. The Medical Center, a capital
// project in all but its menu, counts toward Begin a capital project.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BuildPopup from '../src/components/BuildPopup';
import { teachingCollege } from './fixtures/teaching';
import { MEDICAL_CENTER_ID, PROJECTS, projectOpens } from '../src/data/projectData';
import { CHAPTERS } from '../src/state/chapters';
import type { GameState } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('capital projects tests');

const noop = () => {};
const menu = (s: GameState) => renderToStaticMarkup(createElement(BuildPopup, {
  s, act: noop, placingId: null, onArmPlacement: noop, pathTool: null, onSetPathTool: noop, onClose: noop,
}));
const arts = PROJECTS.find((p) => p.id === 'PROJ-ARTS')!;

{
  const s = teachingCollege('Projects');
  s.started = true;
  s.events.opening.stage = 'play';
  for (const t of s.tech) if (t.facilityType === 'project') t.status = 'locked';
  s.clock.year = arts.project.fromYear - 1;
  assert(!menu(s).includes('Capital projects'), 'before the first project\'s year, no Capital projects tab');
  s.clock.year = 12;
  const html = menu(s);
  assert(html.includes('Capital projects'), 'at year 12 with none open, the tab shows');
  assert(projectOpens(arts.project).includes('Arts &') && html.length > 0, `and the Arts Center says what opens it (${projectOpens(arts.project)})`);
}

{
  const s = teachingCollege('Medicine');
  const objective = CHAPTERS.find((c) => c.id === 'capital-projects')!.objectives.find((o) => o.id === 'begin-a-project')!;
  assert(!objective.progress(s), 'no project begun');
  const med = s.tech.find((t) => t.id === MEDICAL_CENTER_ID)!;
  med.status = 'developing';
  assert(Boolean(objective.progress(s)), 'the Medical Center under way counts as a capital project begun');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
