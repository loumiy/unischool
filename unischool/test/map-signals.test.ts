// What the tabs say, said on the map (Plan 124 L, M1; mapSignals.ts): the
// pure readings behind the dark pips, the queues at the doors, the full
// stands and the title pennants.

import { createInitialState } from '../src/state/actions';
import type { GameState, HallSlot, Placement } from '../src/state/types';
import { CAMPUS_GRID_WIDTH } from '../src/state/types';
import { QUEUE_MAX, QUEUE_MIN, darkPips, queueLength, queueSpots, queuesOf } from '../src/components/mapSignals';
import { walkGrid } from '../src/components/walkRoutes';
import { unstaffedPrograms } from '../src/systems/techtree/darkness';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('map signals tests');

// ---- L1: a program's pip goes dark while a course has no teacher ----
{
  const slots: HallSlot[] = [{ programId: 'ENGL' }, { programId: 'HIST' }, { programId: null }, { programId: null, office: {} as unknown as HallSlot['office'] }];
  const dark = darkPips(slots, new Set(['ENGL']));
  assert(dark[0] === true, 'a program with an unstaffed course is dark');
  assert(dark[1] === false, 'a staffed program is not');
  assert(dark[2] === false && dark[3] === false, 'nor is a free slot or an office');
  assert(darkPips(slots, new Set()).every((d) => !d), 'nothing dark when every course is taught');

  // Through the game's own reading: dismiss a course's teacher, and its
  // program goes dark; appoint one again, and it comes back.
  const s: GameState = createInitialState('Signals');
  const taught = Object.entries(s.courseFaculty).find(([course]) => s.tech.some((t) => t.id === course && (t.status === 'done' || t.status === 'developing') && t.requiresFaculty));
  if (taught) {
    const [course, prof] = taught;
    const hall = Object.entries(s.halls).find(([, sl]) => sl.some((x) => x.programId !== null));
    if (hall) {
      delete s.courseFaculty[course];
      const unstaffed = unstaffedPrograms(s);
      const lit = darkPips(hall[1], unstaffed);
      assert(lit.some(Boolean), 'a course without its teacher darkens its program\'s pip');
      s.courseFaculty[course] = prof;
      assert(darkPips(hall[1], unstaffedPrograms(s)).every((d) => !d), 'and it returns when one is appointed');
    }
  }
}

// ---- L2: the queue's length ----
{
  assert(queueLength(100) === 0, 'no queue when the need is met');
  assert(queueLength(99.7) === 0, 'half a point short is met');
  assert(queueLength(99) === QUEUE_MIN, 'a short queue just under 100');
  assert(queueLength(80) > queueLength(95), 'longer with the shortfall');
  assert(queueLength(12) === QUEUE_MAX && queueLength(0) === QUEUE_MAX, 'capped');
  let last = 0;
  let mono = true;
  for (let v = 100; v >= 0; v -= 0.5) { const n = queueLength(v); if (n < last) mono = false; last = n; }
  assert(mono, 'never shorter as the score falls');
}

// ---- L2: which buildings queue, and where ----
{
  const s: GameState = createInitialState('Queues');
  const dining = s.tech.find((t) => t.facilityType === 'diningHall')!;
  dining.status = 'done';
  s.placements[dining.id] = { col: 40, row: 40, w: 3, h: 3, facing: 0 } as Placement;
  s.students.satisfactionBreakdown = { ...s.students.satisfactionBreakdown, basicNeeds: 100, health: 100 };
  assert(queuesOf(s).length === 0, 'no queue while dining is served');
  s.students.satisfactionBreakdown.basicNeeds = 70;
  const q = queuesOf(s);
  assert(q.length === 1 && q[0]!.id === dining.id && q[0]!.length === queueLength(70), 'a queue at the dining hall while dining is short');
  s.students.satisfactionBreakdown.health = 60;
  assert(queuesOf(s).length === 1, 'a short health need queues nowhere without a clinic');

  const grid = walkGrid({ placements: s.placements, tech: s.tech, pathways: s.pathways });
  const p = s.placements[dining.id]!;
  const spots = queueSpots(p, grid, 10);
  assert(spots.length === 10, `ten in line (${spots.length})`);
  const inside = (c: number, r: number) => c >= p.col && c < p.col + p.w && r >= p.row && r < p.row + p.h;
  assert(spots.every((x) => !inside(x.col, x.row)), 'nobody stands inside the hall');
  assert(spots.every((x) => grid[Math.floor(x.row) * CAMPUS_GRID_WIDTH + Math.floor(x.col)]! > 0), 'everyone stands where people walk');
  // Facing 0 fronts on +row: the line starts out of that door.
  assert(spots[0]!.row > p.row + p.h && Math.abs(spots[0]!.col - (p.col + p.w / 2)) < 0.01, 'the first stands just out of the front door');
  for (let i = 1; i < spots.length; i++) {
    const d = Math.hypot(spots[i]!.col - spots[i - 1]!.col, spots[i]!.row - spots[i - 1]!.row);
    if (d < 0.3 || d > 1) { assert(false, `evenly spaced (${i}: ${d.toFixed(2)})`); break; }
  }
  assert(queueSpots(p, grid, 0).length === 0, 'no one when there is no queue');
}

console.log(`${checks} checks, ${failures} failures`);
if (failures > 0) process.exit(1);
