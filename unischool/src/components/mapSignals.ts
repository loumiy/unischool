import type { GameState, HallSlot, Placement } from '../state/types';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from '../state/types';
import { ROAD_FIRST_ROW } from '../state/campusMap';
import { sidesOf } from './facing';
import { entrancesOf, type Waypoint } from './walkRoutes';

// What the tabs say, said on the map (Plan 124 L): the pure readings the
// map's marks are drawn from. Drawing only; nothing here is read back.

// ---- Dark dots (L1) ----
// A program's pip over its hall goes dark, ringed in dashed red, while one
// of its courses has no teacher (darkness.ts's unstaffedPrograms), and comes
// back when one is appointed. A program in transit is not dark here: that
// is chosen, and short.
export function darkPips(slots: ReadonlyArray<HallSlot>, unstaffed: ReadonlySet<string>): boolean[] {
  return slots.map((slot) => slot.programId !== null && unstaffed.has(slot.programId));
}

// ---- Queues (L2) ----
// A short line of walkers at the door of a dining hall or a clinic while
// that need is under 100: longer with the shortfall, gone when it is
// served. The need's score is the Students tab's (satisfactionBreakdown).
export const QUEUE_MIN = 3;
export const QUEUE_MAX = 14;
// Points of shortfall a figure.
const QUEUE_POINTS = 5;
export function queueLength(score: number): number {
  // Half a point short is served: the score is a float off a ratio.
  if (!(score < 99.5)) return 0;
  return Math.min(QUEUE_MAX, QUEUE_MIN + Math.floor((100 - score) / QUEUE_POINTS));
}

// The buildings that queue, with the need each answers.
export const QUEUE_NEEDS = { diningHall: 'basicNeeds', healthCenter: 'health' } as const;
export interface QueueAt { id: string; length: number }
export function queuesOf(s: GameState): QueueAt[] {
  const b = s.students.satisfactionBreakdown;
  const out: QueueAt[] = [];
  for (const t of s.tech) {
    if (t.status !== 'done' || !s.placements[t.id]) continue;
    const need = t.facilityType === 'diningHall' || t.facilityType === 'healthCenter' ? QUEUE_NEEDS[t.facilityType] : null;
    if (!need) continue;
    const length = queueLength(b[need]);
    if (length > 0) out.push({ id: t.id, length });
  }
  return out;
}

// Where a queue of `n` stands: out of the front door a step or two, then
// along the front wall, a little off it, one way or (where that is built
// over) the other. Points on the grid; tiles nothing walks are skipped, and
// a line that finds no room stops short.
const QUEUE_GAP = 0.42;    // tiles between two in line
const QUEUE_OUT = [0.55, 0.97] as const;  // the first two, straight out
const QUEUE_OFF = 1.3;     // the line's distance off the wall
export function queueSpots(p: Placement, grid: Float32Array, n: number): Waypoint[] {
  if (n <= 0) return [];
  const W = CAMPUS_GRID_WIDTH;
  const open = (c: number, r: number) => {
    const ci = Math.floor(c); const ri = Math.floor(r);
    return ci >= 0 && ri >= 0 && ci < W && ri < CAMPUS_GRID_HEIGHT && ri < ROAD_FIRST_ROW && grid[ri * W + ci]! > 0;
  };
  const doors = entrancesOf(p, grid).filter((e) => e.side !== null);
  if (doors.length === 0) return [];
  const front = sidesOf(p.facing).front;
  const door = doors.find((e) => e.side === front) ?? doors[0]!;
  const out = door.side === 'posRow' ? [0, 1] : door.side === 'negRow' ? [0, -1] : door.side === 'posCol' ? [1, 0] : [-1, 0];
  const along = [out[1]!, out[0]!];
  const face = door.face;
  const at = (o: number, a: number): Waypoint => ({ col: face.col + out[0]! * o + along[0]! * a, row: face.row + out[1]! * o + along[1]! * a });
  const spots: Waypoint[] = [];
  for (const o of QUEUE_OUT) {
    if (spots.length >= n) break;
    const q = at(o, 0);
    if (!open(q.col, q.row)) return spots;
    spots.push(q);
  }
  // Along the wall: the side with more room.
  const room = (sign: number) => {
    let k = 0;
    while (k < n && open(at(QUEUE_OFF, sign * QUEUE_GAP * (k + 1)).col, at(QUEUE_OFF, sign * QUEUE_GAP * (k + 1)).row)) k++;
    return k;
  };
  const sign = room(-1) > room(1) ? -1 : 1;
  for (let k = 1; spots.length < n; k++) {
    const q = at(QUEUE_OFF, sign * QUEUE_GAP * k);
    if (!open(q.col, q.row)) break;
    spots.push(q);
  }
  return spots;
}

