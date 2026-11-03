import type { GameState, HallSlot, Placement } from '../state/types';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from '../state/types';
import { ROAD_FIRST_ROW } from '../state/campusMap';
import { sidesOf } from './facing';
import { entrancesOf, type Waypoint } from './walkRoutes';
import { sportById } from '../data/studentLifeData';

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

// ---- Full stands (M1) ----
// The walkers' shirts (Walkers.tsx), which the spectators wear too.
export const WALKER_SHIRTS = ['#c94b4b', '#3d6a9c', '#e0b64a', '#5b8a5b', '#8c5a9c', '#e88a4a', '#f2ede2'] as const;

// The venues with stands: the football stadium's bowl and the open grounds
// a team plays on (the field's grandstand, the diamond's). The arena and the
// natatorium seat their crowds indoors, out of sight.
export const STAND_VENUES: ReadonlySet<string> = new Set(['footballStadium', 'athleticsField', 'athleticsDiamond']);

// The map's own random numbers (mulberry32, as the walkers' are), seeded by
// a string: never the simulation's stream.
export function hashOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}
export function mapRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A venue is full about one week in three, picked off the map's random
// numbers for that venue and that week, so it holds all week and does not
// follow the fixtures: the point is that a player sees full stands often.
export const FULL_SHARE = 1 / 3;
export function venueFull(college: string, venueId: string, year: number, week: number): boolean {
  return mapRandom(hashOf(`${college}|${venueId}|${year}|${week}`))() < FULL_SHARE;
}

// The finished venues with stands that are full this week, by Buildable id.
export function fullVenues(s: GameState): string[] {
  const out: string[] = [];
  for (const t of s.tech) {
    if (t.status !== 'done' || t.facilityType === undefined || !STAND_VENUES.has(t.facilityType) || !s.placements[t.id]) continue;
    if (venueFull(s.self.name, t.id, s.clock.year, s.clock.week)) out.push(t.id);
  }
  return out;
}

// On a full week, people stand about outside the venue: on open tiles a
// tile or three out from its footprint (round a track, never on it), at
// spots off the map's random numbers, so they keep their places all week.
export function aroundVenue(p: Placement, grid: Float32Array, n: number, seed: number): Waypoint[] {
  const W = CAMPUS_GRID_WIDTH;
  const open = (c: number, r: number) => c >= 0 && r >= 0 && c < W && r < CAMPUS_GRID_HEIGHT && r < ROAD_FIRST_ROW && grid[r * W + c]! > 0;
  const tiles: [number, number][] = [];
  for (let k = 1; k <= 3; k++) {
    for (let c = p.col - k; c < p.col + p.w + k; c++) {
      for (const r of [p.row - k, p.row + p.h + k - 1]) if (open(c, r)) tiles.push([c, r]);
    }
    for (let r = p.row - k + 1; r < p.row + p.h + k - 1; r++) {
      for (const c of [p.col - k, p.col + p.w + k - 1]) if (open(c, r)) tiles.push([c, r]);
    }
  }
  if (tiles.length === 0) return [];
  const random = mapRandom(seed);
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j]!, tiles[i]!];
  }
  // Two to a tile at most.
  const out: Waypoint[] = [];
  for (let k = 0; out.length < n && k < tiles.length * 2; k++) {
    const [c, r] = tiles[k % tiles.length]!;
    out.push({ col: c + 0.15 + random() * 0.7, row: r + 0.15 + random() * 0.7 });
  }
  return out;
}
// How many stand about a full venue: about three for every two tiles of its
// edge.
export function gatheredCount(p: Placement): number {
  return Math.min(140, Math.max(16, Math.round((p.w + p.h) * 2 * 1.4)));
}

// ---- Title pennants (M1) ----
// A venue's national titles that count on the map: won by a team that plays
// there (its sport's venue category) in a year already over. The year after
// a title, pennants in the college's colours go up round the venue's rim,
// and stay.
export function venueTitles(s: GameState, venueId: string): number {
  const t = s.tech.find((x) => x.id === venueId);
  if (!t || t.facilityType === undefined) return 0;
  return s.orgs.titles.filter((title) => title.year < s.clock.year && sportById(title.sport)?.venueCategory === t.facilityType).length;
}
// The venues with stands that fly the pennants.
export function pennantVenues(s: GameState): string[] {
  if (s.orgs.titles.length === 0) return [];
  return s.tech
    .filter((t) => t.status === 'done' && t.facilityType !== undefined && STAND_VENUES.has(t.facilityType) && s.placements[t.id])
    .filter((t) => venueTitles(s, t.id) > 0)
    .map((t) => t.id);
}
// Pennants along an edge of `len` tiles: about one every PENNANT_GAP tiles,
// the first and the last at its ends, so they run all the way round.
export const PENNANT_GAP = 2.2;
export function pennantCount(len: number): number {
  if (!(len > 0)) return 0;
  return Math.max(2, Math.round(len / PENNANT_GAP) + 1);
}
