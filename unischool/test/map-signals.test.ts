// What the tabs say, said on the map (Plan 124 L, M1; mapSignals.ts): the
// pure readings behind the dark pips, the queues at the doors, the full
// stands and the title pennants.

import { createInitialState } from '../src/state/actions';
import type { GameState, HallSlot, Placement } from '../src/state/types';
import { CAMPUS_GRID_WIDTH } from '../src/state/types';
import { FULL_SHARE, QUEUE_MAX, QUEUE_MIN, aroundVenue, darkPips, fullVenues, gatheredCount, pennantCount, pennantVenues, queueLength, queueSpots, queuesOf, venueFull, venueTitles } from '../src/components/mapSignals';
import { walkGrid } from '../src/components/walkRoutes';
import { stadiumTitle } from '../src/components/stadiumFacade';
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

// ---- M1: which weeks a venue is full ----
{
  let full = 0;
  const N = 52 * 40;
  for (let y = 1; y <= 40; y++) for (let w = 1; w <= 52; w++) if (venueFull('Halifax', 'ATH-STADIUM', y, w)) full += 1;
  const share = full / N;
  assert(Math.abs(share - FULL_SHARE) < 0.04, `full about one week in three (${share.toFixed(3)})`);
  assert(venueFull('Halifax', 'ATH-STADIUM', 7, 12) === venueFull('Halifax', 'ATH-STADIUM', 7, 12), 'the same all week');
  let same = 0;
  for (let w = 1; w <= 52; w++) if (venueFull('Halifax', 'ATH-STADIUM', 3, w) === venueFull('Halifax', 'ATH-FIELD', 3, w)) same += 1;
  assert(same < 45, 'each venue has its own weeks');

  const s: GameState = createInitialState('Venues');
  const field = s.tech.find((t) => t.facilityType === 'athleticsField')!;
  const lab = s.tech.find((t) => t.facilityType === 'library')!;
  field.status = 'done';
  lab.status = 'done';
  s.placements[field.id] = { col: 10, row: 10, w: 22, h: 13 } as Placement;
  s.placements[lab.id] = { col: 50, row: 10, w: 5, h: 5 } as Placement;
  // No team, no fixtures: the field still fills on its weeks.
  assert(s.orgs.teams.length === 0, 'a college with no team');
  let weeks = 0;
  for (let w = 1; w <= 52; w++) {
    s.clock.week = w;
    const f = fullVenues(s);
    if (f.includes(lab.id)) assert(false, 'a building with no stands never fills');
    if (f.includes(field.id) !== venueFull(s.self.name, field.id, s.clock.year, w)) assert(false, 'fullVenues follows venueFull');
    if (f.includes(field.id)) weeks += 1;
  }
  assert(weeks > 6 && weeks < 30, `the field fills without fixtures (${weeks} weeks)`);

  // People stand about outside it, never on it.
  const grid = walkGrid({ placements: s.placements, tech: s.tech, pathways: s.pathways });
  const p = s.placements[field.id]!;
  const n = gatheredCount(p);
  const spots = aroundVenue(p, grid, n, 7);
  assert(spots.length === n && n >= 16 && n <= 140, `a crowd outside (${spots.length})`);
  assert(spots.every((x) => !(x.col >= p.col && x.col < p.col + p.w && x.row >= p.row && x.row < p.row + p.h)), 'nobody on the field or its track');
  assert(spots.every((x) => x.col >= p.col - 3 && x.col < p.col + p.w + 3 && x.row >= p.row - 3 && x.row < p.row + p.h + 3), 'all within three tiles of it');
  assert(JSON.stringify(aroundVenue(p, grid, n, 7)) === JSON.stringify(spots), 'in the same places all week');
}

// ---- M1: title pennants ----
{
  const s: GameState = createInitialState('Pennants');
  const field = s.tech.find((t) => t.facilityType === 'athleticsField')!;
  const stadium = s.tech.find((t) => t.facilityType === 'footballStadium')!;
  for (const t of [field, stadium]) t.status = 'done';
  s.placements[field.id] = { col: 10, row: 10, w: 22, h: 13 } as Placement;
  s.placements[stadium.id] = { col: 40, row: 10, w: 15, h: 12 } as Placement;
  s.clock.year = 10;
  assert(pennantVenues(s).length === 0, 'no titles, no pennants');
  s.orgs.titles.push({ sport: 'soccer-m', year: 10 });
  assert(venueTitles(s, field.id) === 0 && pennantVenues(s).length === 0, 'not in the year of the title');
  s.clock.year = 11;
  assert(venueTitles(s, field.id) === 1 && JSON.stringify(pennantVenues(s)) === JSON.stringify([field.id]), 'up the year after, at the venue its sport plays in');
  s.orgs.titles.push({ sport: 'lacrosse-w', year: 10 }, { sport: 'football', year: 9 });
  assert(venueTitles(s, field.id) === 2 && venueTitles(s, stadium.id) === 1, 'each venue counts its own sports\' titles');
  s.clock.year = 30;
  assert(pennantVenues(s).length === 2, 'and they stay');
  assert(pennantCount(0) === 0, 'no edge, no pennants');
  assert(pennantCount(1) === 2, 'a short edge has one at each end');
  assert(pennantCount(22) === 11 && pennantCount(44) > pennantCount(22), 'about one every 2.2 tiles, all the way along');
}

// ---- M2: the name on the stadium's cornice ----
{
  assert(stadiumTitle('Football Stadium', 'Halifax University') === 'HALIFAX UNIVERSITY STADIUM', 'a plain stadium carries the college\'s name');
  assert(stadiumTitle('Hollis Field', 'Halifax University') === 'HOLLIS FIELD', 'a named one its own');
  assert(stadiumTitle('Football Stadium', '') === 'FOOTBALL STADIUM', 'and with no college to hand, what it is');
}

console.log(`${checks} checks, ${failures} failures`);
if (failures > 0) process.exit(1);
