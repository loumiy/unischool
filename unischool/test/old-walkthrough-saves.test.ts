// ---------------------------------------------------------------------
// Old saves on a walkthrough step the game no longer has (Plan 113 PR A,
// the third review's I7-1): a 0.1.1 or 0.1.2 run saved on one of Plan
// 103's steps crashed 0.1.3 on Continue, because the card looked up a step
// it no longer had. The fixtures are saves made by 0.1.2's own code
// (4f5b83e), on `needs` and on the old appointing step (PR B, I7-4).
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readSave } from '../src/state/persistence';
import { reducer } from '../src/engine/reducer';
import OpeningCoach from '../src/components/OpeningCoach';
import { createPreStartState } from '../src/state/actions';
import { FOUNDERS_HALL_ID } from '../src/data/techData';
import { FOUNDING_VERNACULAR } from '../src/data/foundingData';
import { FOUNDING_COLORS, schoolColorsOf } from '../src/data/schoolColors';
import { centredPlacement, footprintOf } from '../src/state/campusMap';
import type { GameState } from '../src/state/types';

console.log('old walkthrough saves tests');
let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const raw = readFileSync(join(process.cwd(), 'test/fixtures/save-v103-walkthrough.json'), 'utf8');
const made = JSON.parse(raw) as { game: { version: string }; state: { events: { opening: { stage: string } } } };
assert(made.game.version === '0.1.2' && made.state.events.opening.stage === 'needs', 'the fixture is a 0.1.2 save on the needs step');

// The save with its stage replaced, as text, so it goes through readSave
// exactly as a slot, a file or the autosave does.
function onStage(stage: string): string {
  const payload = JSON.parse(raw) as typeof made;
  payload.state.events.opening.stage = stage;
  return JSON.stringify(payload);
}

function load(stage: string): GameState | null {
  const read = readSave(onStage(stage));
  if ('refused' in read) {
    assert(false, `a save on '${stage}' loads (refused: ${read.refused})`);
    return null;
  }
  return read.state;
}

function card(s: GameState): string {
  return renderToStaticMarkup(createElement(OpeningCoach, {
    s,
    act: () => {},
    buildOpen: false,
    hallOpen: false,
    placing: false,
    onOpenBuild: () => {},
    onOpenHall: () => {},
  }));
}

// --- the retired steps load as play, and the card draws nothing ---------------
for (const stage of ['await-course', 'second-course', 'needs', 'site-housing', 'site-dining', 'a-step-never-made']) {
  let s = load(stage);
  if (!s) continue;
  assert(s.events.opening.stage === 'play', `a save on '${stage}' loads on play (${s.events.opening.stage})`);
  let html = '';
  let threw = '';
  try { html = card(s); } catch (e) { threw = String(e); }
  assert(threw === '', `and the card draws without throwing (${threw})`);
  assert(html === '', `and draws nothing (${html.slice(0, 60)})`);
  const week = s.clock.week;
  for (let i = 0; i < 4; i += 1) s = reducer(s, { type: 'TICK' });
  assert(s.clock.week === week + 4, `and plays on (week ${week} → ${s.clock.week})`);
}

// --- the live steps are left alone -------------------------------------------
for (const stage of ['welcome', 'site-hall', 'found']) {
  const s = load(stage);
  if (!s) continue;
  assert(s.events.opening.stage === stage, `a save on '${stage}' stays there (${s.events.opening.stage})`);
  let html = '';
  try { html = card(s); } catch (e) { assert(false, `the '${stage}' card draws (${String(e)})`); }
  assert(html.length > 0, `and its card draws`);
}

// --- the appointing step still resumes on the founding step (Plan 107A) -------
{
  const s = load('appoint');
  if (s) assert(s.events.opening.stage === 'found', `a save on 'appoint' resumes on found (${s.events.opening.stage})`);
}

// --- a save made on that step: nobody on the payroll (Plan 113 PR B, I7-4) ---
{
  const read = readSave(readFileSync(join(process.cwd(), 'test/fixtures/save-v103-appoint.json'), 'utf8'));
  if ('refused' in read) assert(false, `the 0.1.2 appointing save loads (${read.refused})`);
  else {
    const s = read.state;
    assert(s.faculty.length === 0 && s.programOffers.length === 3, `the fixture has nobody on the payroll and three offers (${s.faculty.length}, ${s.programOffers.length})`);
    assert(s.events.opening.stage === 'found', `it resumes on found (${s.events.opening.stage})`);
    const html = card(s);
    assert(html.includes('Three are on offer in Founders Hall.'), 'the card counts the three offers');
    assert(html.includes('Then appoint its professor and click Found.'), 'and asks for the professor');
    assert(!html.includes('already has a professor'), 'and promises nobody already appointed');
  }
}

// --- a founding made today still says each has its professor -----------------
{
  let s = reducer(createPreStartState(), { type: 'START_GAME', name: 'Today', vernacular: FOUNDING_VERNACULAR, colors: schoolColorsOf(FOUNDING_COLORS), guided: true });
  s = reducer(s, { type: 'ADVANCE_OPENING' });
  const hall = s.tech.find((t) => t.id === FOUNDERS_HALL_ID)!;
  const spot = centredPlacement(footprintOf(hall));
  s = reducer(s, { type: 'PLACE_BUILDABLE', buildableId: FOUNDERS_HALL_ID, row: spot.row, col: spot.col, facing: 0 });
  const html = card(s);
  assert(s.events.opening.stage === 'found', `a new founding reaches the program's step (${s.events.opening.stage})`);
  assert(html.includes('each already has a professor') && !html.includes('Then appoint its professor'), "and keeps today's words");
}

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
