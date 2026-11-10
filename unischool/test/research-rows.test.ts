// ---------------------------------------------------------------------
// The Research tab's roster (src/tabs/ResearchTab.tsx; Plan 125 I).
//
// A running lab is one line until opened: its length said once, beside
// the one bar, and the team, the depth, the breakthroughs and Wind up
// behind the Curriculum's disclosure. A link that lands on a lab opens its
// row. The vacant labs come first.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { initiativeOffers } from '../src/data/researchData';
import { researchSchools } from '../src/data/techData';
import ResearchTab from '../src/tabs/ResearchTab';
import { equipLab } from './fixtures/lab';
import type { GameState } from '../src/state/types';
import { bindScriptStream } from '../src/engine/random';

bindScriptStream(125);
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

console.log('research roster tests');

// Three labs standing: the first two at work, the third vacant, so the
// vacant one is last in the catalog's order.
const LAB_IDS = researchSchools().flatMap((school) => school.labIds).slice(0, 3);
function campus(): GameState {
  let s = createInitialState('Ashcombe');
  for (const id of LAB_IDS) {
    s.tech.find((t) => t.id === id)!.status = 'done';
    equipLab(s, id);
  }
  for (const id of LAB_IDS.slice(0, 2)) {
    const offer = initiativeOffers(s, id).find((o) => !o.blockedReason)!;
    s = reducer(s, {
      type: 'START_INITIATIVE', labId: id, topicId: offer.topic.id, depth: offer.depth.key,
      facultyIds: offer.suggested.slice(0, offer.depth.participants).map((f) => f.id),
    });
  }
  return s;
}

const s = campus();
const [first, second, idle] = LAB_IDS;
const draw = (target?: string) => renderToStaticMarkup(createElement(ResearchTab, { s, act: () => {}, target }));
const rowOf = (html: string, labId: string) => {
  const at = html.indexOf(`data-lab="${labId}"`);
  const end = html.indexOf('</section>', at);
  return html.slice(at, end);
};
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

{
  assert(Object.keys(s.research.initiatives).length === 2, 'the fixture has two labs at work');
  const html = draw();
  assert(html.indexOf(`data-lab="${idle}"`) < html.indexOf(`data-lab="${first}"`), 'the vacant lab comes first');
  assert(rowOf(html, idle).includes('Start research'), 'with its button on its row');

  const row = rowOf(html, first);
  const initiative = s.research.initiatives[first];
  assert(row.includes('class="collapse-toggle"') && row.includes('aria-expanded="false"'), 'a running lab has the disclosure, shut');
  assert(!row.includes('Wind up') && !row.includes('banked') && !row.includes('facility-depth'), 'shut, it keeps Wind up, the breakthroughs and the depth back');
  assert((row.match(/facility-track/g) ?? []).length === 1 && !row.includes('scholar-bar'), 'one bar, the project\'s');
  const weeks = String(initiative.weeksTotal);
  assert(text(row).includes(`0/${weeks}w`), `its length is beside the bar (${text(row)})`);
  assert(text(row).split(weeks).length === 2, 'and nowhere else on the row');
  assert(/\d\.\d\/wk/.test(text(row)), 'with what it puts out a week');
  const lead = s.faculty.filter((f) => initiative.participantIds.includes(f.id)).sort((a, b) => b.research - a.research)[0];
  assert(row.includes(lead.name) && row.includes('--stat-grade:var(--grade-'), 'and its lead scholar, the score in its grade\'s ink');
}

// A link that lands on a lab opens its row, and only that one.
{
  const html = draw(`lab:${second}`);
  const row = rowOf(html, second);
  assert(row.includes('aria-expanded="true"') && row.includes('Wind up') && row.includes('banked') && row.includes('facility-depth'), 'lab:<id> opens the row to the rest');
  assert(rowOf(html, first).includes('aria-expanded="false"'), 'the other stays shut');
  assert(draw(`start:${idle}`).includes('offer-set'), 'start:<id> still opens a vacant lab\'s choices');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
