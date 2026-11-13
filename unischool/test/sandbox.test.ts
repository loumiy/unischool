// Sandbox mode (the title screen's Sandbox, src/systems/sandbox): a run
// founded as a sandbox never runs short of funds, and a building placed or
// a course started is finished by the same action, and every building is
// open from the start. A normal run is not
// touched, and a sandbox run is never hung in the hall of fame.

import { teachingCollege } from './fixtures/teaching';
import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { firstFreeSpot, footprintOf, isPlaceableKind } from '../src/state/campusMap';
import { bindScriptStream } from '../src/engine/random';
import { canStartDevelopment, committeeLamps, committeeSeats, committeeSetAside, courseSlotsFree } from '../src/systems/techtree/techSystem';
import { SANDBOX_CASH } from '../src/systems/sandbox/sandbox';
import { createPreStartState } from '../src/state/actions';
import { FOUNDING_VERNACULAR } from '../src/data/foundingData';
import { FOUNDING_COLORS, schoolColorsOf } from '../src/data/schoolColors';
import { WEEKS_PER_YEAR, type GameState } from '../src/state/types';
import { inboxItems } from '../src/systems/inbox/inbox';

bindScriptStream(5150);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('sandbox tests');

const found = (sandbox: boolean) => reducer(createPreStartState(), {
  type: 'START_GAME', name: 'Sandbox', vernacular: FOUNDING_VERNACULAR, colors: schoolColorsOf(FOUNDING_COLORS), seed: 77, sandbox,
});

// ---- Founding ----
{
  const s = found(true);
  assert(s.sandbox === true && s.started, 'a sandbox founding is a sandbox run');
  assert(s.finance.cash === SANDBOX_CASH, `and opens with the sandbox's funds (${s.finance.cash})`);
  assert(Object.keys(s.developing).length === 0, 'with nothing left under way');
  const placeable = s.tech.filter((t) => isPlaceableKind(t));
  const shut = placeable.filter((t) => t.status === 'locked');
  assert(shut.length === 0, `every building is open from the start (${shut.map((t) => t.id).join(', ')})`);
  const n = found(false);
  assert(n.tech.some((t) => isPlaceableKind(t) && t.status === 'locked'), 'while a normal run opens them over time');
  assert(n.sandbox === undefined, 'a normal founding is not a sandbox');
  assert(n.finance.cash < SANDBOX_CASH, 'and has its usual funds');
}

// ---- Buildings and courses finish at once; the funds stay full ----
{
  let s: GameState = teachingCollege('Sandbox');
  s.pendingInterrupt = null;
  s.sandbox = true;
  s.finance.cash = 0;
  const t = s.tech.find((x) => x.kind === 'facility' && x.cost >= 5_000_000 && !x.requiresFaculty && !x.project)!;
  t.status = 'available';
  const spot = firstFreeSpot(s, t, footprintOf(t))!;
  // A no-op action settles the run: its funds are filled.
  s = reducer(s, { type: 'SAVE_GAME' });
  assert(s.finance.cash === SANDBOX_CASH, 'any action fills the funds');
  s = reducer(s, { type: 'PLACE_BUILDABLE', buildableId: t.id, row: spot.row, col: spot.col, facing: 0 });
  const built = s.tech.find((x) => x.id === t.id)!;
  assert(built.status === 'done' && s.developing[t.id] === undefined, `a building placed is finished at once (${built.status})`);
  assert(built.builtYear === s.clock.year, 'and dated this year');
  assert(s.finance.cash === SANDBOX_CASH, 'and the funds are full again');

  const course = s.tech.find((x) => x.kind === 'course' && !isPlaceableKind(x) && canStartDevelopment(s, x));
  assert(course !== undefined, 'a course can be started');
  if (course) {
    s = reducer(s, { type: 'START_DEVELOPMENT', nodeId: course.id });
    assert(s.tech.find((x) => x.id === course.id)!.status === 'done', 'a course started is taught at once');
  }

  s = reducer(s, { type: 'TICK' });
  assert(s.finance.cash >= SANDBOX_CASH && s.finance.weeksInTheRed === 0, `a week never draws the funds down (${s.finance.cash})`);
}

// ---- No curriculum committee ----
{
  // A course that could start, then every seat taken, and more, by others
  // being written.
  const fill = (sandbox: boolean) => {
    const s: GameState = teachingCollege('Committee');
    s.pendingInterrupt = null;
    s.finance.cash = 1e9;
    if (sandbox) s.sandbox = true;
    const next = s.tech.find((t) => t.kind === 'course' && t.status === 'available' && canStartDevelopment(s, t))!;
    const writing = s.tech.filter((t) => t.kind === 'course' && t.status === 'available' && t !== next && t.requiresFaculty !== next.requiresFaculty).slice(0, committeeSeats(s) + 2);
    for (const t of writing) { t.status = 'developing'; s.developing[t.id] = t.duration; }
    return { s, next };
  };
  const normal = fill(false);
  assert(normal.next !== undefined && courseSlotsFree(normal.s) === 0, 'a normal run with every seat taken has no room');
  assert(!canStartDevelopment(normal.s, normal.next), 'and its next course waits on the committee');
  const sand = fill(true);
  assert(committeeSetAside(sand.s) && courseSlotsFree(sand.s) > 1000, 'a sandbox has no committee to wait on');
  assert(committeeLamps(sand.s).length === 0 && committeeLamps(normal.s).length > 0, 'and no seats to light');
  assert(canStartDevelopment(sand.s, sand.next), 'so a course can start however many are being written');
}

// ---- A normal run waits ----
{
  let s: GameState = teachingCollege('Normal');
  s.pendingInterrupt = null;
  const t = s.tech.find((x) => x.kind === 'facility' && x.cost >= 5_000_000 && !x.requiresFaculty && !x.project)!;
  t.status = 'available';
  s.finance.cash = t.cost + 1_000;
  const spot = firstFreeSpot(s, t, footprintOf(t))!;
  s = reducer(s, { type: 'PLACE_BUILDABLE', buildableId: t.id, row: spot.row, col: spot.col, facing: 0 });
  assert(s.tech.find((x) => x.id === t.id)!.status === 'developing', 'a normal run builds over weeks');
  assert(s.finance.cash === 1_000, 'and pays for it');
}

// ---- No objectives, letters or milestones to see ----
{
  // A sandbox run and a normal one, each played for three years, every stop
  // given its default answer.
  const run = (sandbox: boolean, from: GameState) => {
    let s: GameState = structuredClone(from);
    s.pendingInterrupt = null;
    if (sandbox) s.sandbox = true;
    const stops: string[] = [];
    let letterTier = 0;
    for (let i = 0; i < 3 * WEEKS_PER_YEAR; i++) {
      if (s.pendingInterrupt) stops.push(s.pendingInterrupt.type);
      const answer = defaultAnswer(s);
      s = reducer(s, answer ?? { type: 'TICK' });
      letterTier += inboxItems(s).filter((x) => x.tier === 'letter').length;
    }
    return { s, stops, letterTier };
  };
  const start = teachingCollege('Quiet');
  start.events.opening.read = [];
  start.events.opening.skipped = false;
  const sand = run(true, start);
  const norm = run(false, start);
  assert(!sand.stops.includes('letter'), `a sandbox is sent no opening letter (${sand.stops.join(', ')})`);
  assert(sand.letterTier === 0, 'its inbox never holds a letter');
  assert(sand.s.ladder.unread.length === 0, 'no milestone waits to be read');
  assert(!sand.s.log.some((l) => l.topic === 'milestone'), 'and no milestone reaches the log');
  assert(sand.s.events.pendingMilestones.length === 0 && !(sand.s.events.news ?? []).some((n) => n.type === 'milestone'), 'or is celebrated');
  const reached = (g: GameState) => Object.keys(g.ladder.reached).length;
  assert(reached(sand.s) > reached(start), `but milestones are still reached, so what they open opens (${reached(start)} → ${reached(sand.s)})`);
  assert(norm.letterTier > 0 && norm.stops.includes('letter'), `while a normal run is sent its letters (${norm.stops.join(', ')})`);
  assert(norm.s.log.some((l) => l.topic === 'milestone') || norm.s.ladder.unread.length > 0 || reached(norm.s) > reached(start), 'and hears of its milestones');
}

if (failures === 0) {
  console.log(`  all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
