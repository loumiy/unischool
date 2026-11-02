// ---------------------------------------------------------------------
// A quieter screen for the walkthrough's first three steps (Plan 104F,
// from R10–R11 on r/WebGames): while the stage is site-hall, appoint or
// found, every toolbar tab is shut and the figures are dimmed, readable
// and no longer doors; Build stays open only to site the hall, and Campus,
// the map the three steps are done on, stays live. Once the program is
// founded the walk is over (Plan 106 PR C), and at once after a skip,
// everything is live again.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState } from '../src/state/types';
import { createPreStartState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import Toolbar from '../src/components/Toolbar';
import { openingQuietDoor } from '../src/state/opening';
import { FOUNDING_VERNACULAR, WALKTHROUGH_PROFESSOR, WALKTHROUGH_PROGRAM } from '../src/data/foundingData';
import { FOUNDING_COLORS, schoolColorsOf } from '../src/data/schoolColors';
import { FOUNDERS_HALL_ID } from '../src/data/techData';
import { centredPlacement, footprintOf } from '../src/state/campusMap';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('quiet opening tests');

const found = () => reducer(createPreStartState(), {
  type: 'START_GAME', name: 'Quiet', vernacular: FOUNDING_VERNACULAR, colors: schoolColorsOf(FOUNDING_COLORS), guided: true,
});
const siteHall = (s: GameState) => {
  const spot = centredPlacement(footprintOf(s.tech.find((t) => t.id === FOUNDERS_HALL_ID)!));
  return reducer(s, { type: 'PLACE_BUILDABLE', buildableId: FOUNDERS_HALL_ID, row: spot.row, col: spot.col, facing: 0 });
};
const noop = () => {};
const bar = (s: GameState) => renderToStaticMarkup(createElement(Toolbar, {
  s, act: noop, active: null, onChangeTab: noop, buildOpen: false, onSetBuildOpen: noop, speed: 'paused', setSpeed: noop, speedKeysLive: true,
  weekProgress: () => 0, placingId: null, onArmPlacement: noop, pathTool: null, onSetPathTool: noop,
  inbox: { count: 0, urgent: false, unreadLetters: 0 }, held: false,
}));
// Each toolbar button's name and whether it is shut.
function buttons(html: string): Map<string, boolean> {
  const out = new Map<string, boolean>();
  for (const m of html.matchAll(/<button([^>]*)>/g)) {
    const name = /aria-label="([^"]*)"/.exec(m[1])?.[1];
    if (name) out.set(name, /\sdisabled=""/.test(m[1]));
  }
  return out;
}
const TABS = ['Curriculum', 'Faculty', 'Students', 'History', 'Inbox'];
// The buttons the quiet steps shut; the speeds have gates of their own.
const shutOf = (b: Map<string, boolean>) => [...b.entries()].filter(([k, off]) => off && !k.endsWith('×')).map(([k]) => k);

const siteStep = reducer(found(), { type: 'ADVANCE_OPENING' });
const foundStep = siteHall(siteStep);
const played = reducer(foundStep, { type: 'FOUND_PROGRAM', programId: WALKTHROUGH_PROGRAM, hallId: FOUNDERS_HALL_ID, slot: 0, facultyId: WALKTHROUGH_PROFESSOR });
assert([siteStep, foundStep, played].map((x) => x.events.opening.stage).join(',') === 'site-hall,found,play', 'the walk reaches each step');

for (const [s, door] of [[siteStep, 'build'], [foundStep, 'campus']] as const) {
  const stage = s.events.opening.stage;
  assert(openingQuietDoor(s) === door, `${stage}: the step's door is ${door}`);
  const html = bar(s);
  const b = buttons(html);
  const shut = TABS.filter((t) => [...b.keys()].some((k) => k.startsWith(t) && b.get(k)));
  assert(shut.length === TABS.filter((t) => [...b.keys()].some((k) => k.startsWith(t))).length && shut.length >= 4, `${stage}: every tab is shut (${shut.join(', ')})`);
  assert(b.get('Campus map') === false, `${stage}: Campus stays live`);
  assert(b.get('Open build menu') === (door !== 'build'), `${stage}: Build is ${door === 'build' ? 'live, to site the hall' : 'shut'}`);
  assert(b.get('Treasury') === true, `${stage}: the funds figure is not a door to the Treasury`);
  assert(html.includes('toolbar-stats quiet') && !/aria-label="(Rank|Enrolled|Prestige|Satisfaction) [^"]*— open/.test(html), `${stage}: the figures are dimmed and not doors`);
  assert(/\$[\d,]+/.test(html), `${stage}: and still readable`);
}

// The program founded: the walk is over, and everything is live.
{
  let s = played;
  assert(openingQuietDoor(s) === null, 'play: nothing is quiet');
  const shut = shutOf(buttons(bar(s)));
  assert(shut.length === 0, `play: no button is shut (${shut.join(', ')})`);
  for (let i = 0; i < 10; i += 1) s = s.pendingInterrupt ? reducer(s, defaultAnswer(s)!) : reducer(s, { type: 'TICK' });
  assert(openingQuietDoor(s) === null && !bar(s).includes('toolbar-stats quiet'), 'and it stays live as the weeks pass');
}

// A skip lifts it at once, from any of the three.
for (const s of [siteStep, foundStep]) {
  const skipped = reducer(s, { type: 'SKIP_OPENING', keepLetters: true });
  const shut = shutOf(buttons(bar(skipped)));
  assert(openingQuietDoor(skipped) === null && shut.length === 0, `skipped from ${s.events.opening.stage}: nothing is shut (${shut.join(', ')})`);
}

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
process.exit(failures === 0 ? 0 : 1);
