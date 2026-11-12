// ---------------------------------------------------------------------
// Figures kept per state (src/state/perState.ts): a settled state's
// figures are worked out once and shared; a state still being built is
// always worked out afresh; what is shared is frozen in development, so a
// screen that changes a shared figure in place fails here. Every tab and
// the toolbar render the same from a settled state (the cache, frozen) as
// from an unsettled copy of it (worked out afresh).
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { isSettled, markSettled, perState, perStateKeyed } from '../src/state/perState';
import { foundGame, playUntil } from '../sim/harness/game';
import { playerNamed } from '../sim/harness/archetypes';
import { prestigeBreakdown } from '../src/systems/prestige/prestigeSystem';
import { computeSatisfactionBreakdown } from '../src/systems/satisfaction/satisfactionSystem';
import { departmentPot } from '../src/data/studentLifeData';
import Toolbar from '../src/components/Toolbar';
import FacultyTab, { FACULTY_VIEW_START } from '../src/tabs/FacultyTab';
import CurriculumTab from '../src/tabs/CurriculumTab';
import ResearchTab from '../src/tabs/ResearchTab';
import TreasuryTab from '../src/tabs/TreasuryTab';
import StudentsTab from '../src/tabs/StudentsTab';
import HistoryTab, { HISTORY_VIEW_START } from '../src/tabs/HistoryTab';
import AthleticsTab from '../src/tabs/AthleticsTab';
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

// A college some years in, with teams, a stadium and a full roster.
const player = playerNamed('Completionist')!;
const game = foundGame({ seed: 7 });
playUntil(game, player, 12, () => false);
const s = game.s;

// The cache itself.
{
  let runs = 0;
  const count = perState((st: GameState) => { runs += 1; return { year: st.clock.year, list: [1, 2] }; });
  const fresh = structuredClone(s);
  count(fresh); count(fresh);
  assert(runs === 2 && !isSettled(fresh), 'an unsettled state is worked out every time');
  const settled = markSettled(structuredClone(s));
  const a = count(settled);
  const b = count(settled);
  assert(runs === 3 && a === b, 'a settled state is worked out once, and every caller shares the answer');
  let threw = false;
  try { (a.list as number[]).push(3); } catch { threw = true; }
  assert(threw && Object.isFrozen(a) && Object.isFrozen(a.list), 'what is shared is frozen, all the way down');
  assert(count(markSettled(structuredClone(s))) !== a, 'the next state is worked out again');

  let keyed = 0;
  const byKey = perStateKeyed((st: GameState, k: string) => { keyed += 1; return `${k}${st.clock.year}`; });
  byKey(settled, 'a'); byKey(settled, 'a'); byKey(settled, 'b');
  assert(keyed === 2, 'a keyed figure is worked out once per state and key');
}

// The real figures: the same answers either way.
{
  const settled = markSettled(structuredClone(s));
  const fresh = structuredClone(s);
  for (const [name, fn] of [['prestige', prestigeBreakdown], ['satisfaction', computeSatisfactionBreakdown], ['athletics budget', departmentPot]] as const) {
    const kept = (fn as (st: GameState) => unknown)(settled);
    assert((fn as (st: GameState) => unknown)(settled) === kept, `the ${name} breakdown is kept for a settled state`);
    assert(JSON.stringify(kept) === JSON.stringify((fn as (st: GameState) => unknown)(fresh)), `and kept, it is the ${name} breakdown worked out afresh`);
  }
}

// Every screen renders the same from the cache as afresh, and none of them
// changes a figure it was handed (frozen here, so a change would throw).
{
  const noop = () => {};
  const screens: [string, (st: GameState) => unknown][] = [
    ['the toolbar', (st) => createElement(Toolbar, {
      s: st, act: noop, active: null, onChangeTab: noop, buildOpen: false, onSetBuildOpen: noop, speed: 'paused', setSpeed: noop, speedKeysLive: true,
      weekProgress: () => 0, placingId: null, onArmPlacement: noop, pathTool: null, onSetPathTool: noop,
      inbox: { count: 0, urgent: false, unreadLetters: 0 }, held: false,
    })],
    ['Faculty', (st) => createElement(FacultyTab, { s: st, act: noop, onTargetConsumed: noop, onOpenCurriculum: noop, memory: FACULTY_VIEW_START, onRemember: noop })],
    ['Curriculum', (st) => createElement(CurriculumTab, { s: st, act: noop, onTargetConsumed: noop, onOpenFaculty: noop, onGo: noop })],
    ['Research', (st) => createElement(ResearchTab, { s: st, act: noop, onTargetConsumed: noop })],
    ['Treasury', (st) => createElement(TreasuryTab, { s: st, act: noop, onTargetConsumed: noop })],
    ['Students', (st) => createElement(StudentsTab, { s: st, act: noop, onTargetConsumed: noop })],
    ['Athletics', (st) => createElement(AthleticsTab, { s: st, act: noop, onOpenBuild: noop })],
    ['History', (st) => createElement(HistoryTab, { s: st, act: noop, onTargetConsumed: noop, view: HISTORY_VIEW_START, onView: noop, onOpenCurriculum: noop })],
  ];
  const settled = markSettled(structuredClone(s));
  for (const [name, el] of screens) {
    let kept = '';
    let error = '';
    try {
      kept = renderToStaticMarkup(el(settled) as never);
      kept = renderToStaticMarkup(el(settled) as never);
    } catch (err) {
      error = String(err);
    }
    assert(error === '', `${name} renders from the cache without changing a shared figure${error ? ` (${error})` : ''}`);
    const fresh = renderToStaticMarkup(el(structuredClone(s)) as never);
    assert(kept === fresh, `${name} shows the same from the cache as worked out afresh`);
    assert(kept.length > 2000, `${name} drew the screen (${kept.length} characters)`);
  }
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
