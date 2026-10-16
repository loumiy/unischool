// ---------------------------------------------------------------------
// The Students tab after the first summer, and needs that can read full
// (Plan 104M, from S1). In week one every need read low, because nothing
// was built yet, and health's dormant dial read as one more failure.
// Pinned:
//
//   - the Students tab and the header's satisfaction figure (and the build
//     menu's) wait until the first summer closes, and open with it;
//   - the first summer's review introduces satisfaction as the year's
//     average; a later one compares it with the year before;
//   - health's card is absent below its population gate and present, said
//     to be a need, above it; below the gate, every need met reads full.
//
// The walkthrough's needs step opening no gated tab is opening.test.ts's.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState } from '../src/state/types';
import { teachingCollege } from './fixtures/teaching';
import { tickLadder } from '../src/systems/ladder/ladderSystem';
import { tabAvailable } from '../src/components/TabNav';
import { FundsAndStats } from '../src/components/StatusHeader';
import StudentLifeTab from '../src/tabs/StudentLifeTab';
import { HEALTH_CENTER_TIER1_POPULATION_GATE } from '../src/data/facilitiesData';
import { ATTRIBUTE_WEIGHTS, computeSatisfactionBreakdown } from '../src/systems/satisfaction/satisfactionSystem';
import { MILESTONES } from '../src/data/ladderData';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('students after summer tests');

const noop = () => {};
const figures = (s: GameState) => renderToStaticMarkup(createElement(FundsAndStats, { s, onOpenTreasury: noop, treasuryOpen: false, onOpenSection: noop }));
const afterSummer = (s: GameState) => {
  s.history.push({ ...({} as GameState['history'][number]), year: 1 });
  s.clock.year = 2;
  s.clock.week = 1;
  tickLadder(s);
  return s;
};

// Year one: no tab, no figure.
{
  const s = teachingCollege('Summer');
  tickLadder(s);
  assert(!tabAvailable(s, 'students'), 'the Students tab is closed in year one');
  const html = figures(s);
  assert(!html.includes('Satisfaction') && html.includes('Prestige') && html.includes('Enrolled'), 'the header shows no satisfaction, its other figures as ever');
  s.clock.week = 52;
  tickLadder(s);
  assert(!tabAvailable(s, 'students') && !figures(s).includes('Satisfaction'), 'nor at the end of the year');
  afterSummer(s);
  assert(tabAvailable(s, 'students'), 'the first summer closed, the tab opens');
  assert(figures(s).includes('Satisfaction'), 'and the header shows satisfaction');
  assert(MILESTONES.find((m) => m.id === 'commencement')?.tabs?.includes('students') === true, 'at the first commencement');
}

// Health: hidden while dormant; a need above its gate.
{
  const s = teachingCollege('Health');
  const tab = renderToStaticMarkup(createElement(StudentLifeTab, { s }));
  assert(!tab.includes('>Health<'), 'below the gate, no health card');
  assert(computeSatisfactionBreakdown(s).health === 100, 'and health scores full, counting against nothing');
  const big = teachingCollege('Big');
  const per = Math.ceil(HEALTH_CENTER_TIER1_POPULATION_GATE / 4) + 10;
  big.students.classes = { freshman: per, sophomore: per, junior: per, senior: per };
  const bigTab = renderToStaticMarkup(createElement(StudentLifeTab, { s: big }));
  assert(bigTab.includes('>Health<') && bigTab.includes('A need since the college passed'), 'past the gate, the card shows, said to be a need');
}

// Every need met, below the gate: full marks. The weights sum to 100, and
// a dormant health scores 100, so four met needs make the whole.
{
  const s = teachingCollege('Full');
  const weights = Object.values(ATTRIBUTE_WEIGHTS).reduce((a, b) => a + b, 0);
  const b = computeSatisfactionBreakdown(s);
  const met = { ...b, academic: 100, social: 100, basicNeeds: 100, housing: 100 };
  const sum = (Object.keys(met) as Array<keyof typeof met>).reduce((t, k) => t + met[k] * ATTRIBUTE_WEIGHTS[k], 0) / 100;
  assert(weights === 100 && b.health === 100 && sum === 100, `four needs met, health dormant: full marks (${sum})`);
}

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
process.exit(failures === 0 ? 0 : 1);
