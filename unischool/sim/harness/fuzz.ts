// ---------------------------------------------------------------------
// The fuzz player (Plan 57): random but legal play. Each week it makes a
// few moves drawn at random from the shared vocabulary (moves.ts, with a
// random pick and no reserve) and from the rest of what a player can do —
// relocate anywhere, fire, demolish, cancel, renovate, fund research, move
// money, hire coaches, lay paths — and answers the summer with a random
// price and intake. Some of what it sends the game refuses; that is part
// of what is under test.
//
// Its dice are the game's `roll` (game.ts), never the college's stream.
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import type { Action } from '../../src/state/actions';
import type { AthleticsBudgetTier } from '../../src/state/types';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH, standsOnCampus } from '../../src/state/types';
import { isPlaceableKind, firstFreeSpot, footprintOf } from '../../src/state/campusMap';
import { initiativeOffers } from '../../src/data/researchData';
import { transferOffers } from '../../src/systems/finance/treasury';
import { FACULTY_FIELDS } from '../../src/data/facultyData';
import { TUITION_SLIDER_MAX } from '../../src/data/foundingData';
import { defaultAnswer } from '../../src/engine/defaultAnswers';
import type { Game, Player } from './game';
import {
  buildDorm, buildForShortfall, buildable, developCourse, foundOffer, hireForBlocked, moveHome, randomPick, site, siteNextHall,
} from './moves';

const BUDGET_TIERS: AthleticsBudgetTier[] = ['low', 'medium', 'high'];
const ROLES = ['head', 'assistant', 'trainer'] as const;

// A raw action built from the state at random, or null when there is
// nothing of its kind to send.
type Generator = (g: Game) => Action | null;

function rawGenerators(g: Game): Array<[number, Generator]> {
  const any = randomPick(g.roll);
  const n = (max: number) => Math.floor(g.roll() * max);
  return [
    // Move any program to any free slot anywhere, legal or not.
    [3, (g) => {
      const housed = Object.values(g.s.halls).flatMap((slots) => slots.filter((x) => x.programId !== null).map((x) => x.programId!));
      const free = Object.entries(g.s.halls).flatMap(([hallId, slots]) => slots.map((x, slot) => (x.programId === null ? { hallId, slot } : null)).filter((x) => x !== null));
      const programId = any(housed);
      const to = any(free);
      return programId && to ? { type: 'RELOCATE_PROGRAM', programId, ...to } : null;
    }],
    [1, (g) => { const f = any(g.s.faculty); return f ? { type: 'FIRE_FACULTY', facultyId: f.id } : null; }],
    [1, (g) => { const id = any(Object.keys(g.s.placements)); return id ? { type: 'DEMOLISH_BUILDING', id } : null; }],
    [1, (g) => { const t = any(g.s.tech.filter((x) => x.status === 'developing' && x.id in g.s.placements)); return t ? { type: 'CANCEL_CONSTRUCTION', id: t.id } : null; }],
    [1, (g) => { const t = any(g.s.tech.filter((x) => standsOnCampus(x))); return t ? { type: g.roll() < 0.5 ? 'RENOVATE_BUILDING' : 'EXTEND_BUILDING', id: t.id } : null; }],
    [1, () => ({ type: 'SET_MAINTENANCE_FUNDING', level: g.roll() * 1.5 })],
    [1, () => ({ type: 'SET_DRAW_RATE', rate: 0.02 + g.roll() * 0.06 })],
    [1, (g) => { const amount = any(transferOffers(g.s)); return amount !== undefined ? { type: 'MOVE_TO_ENDOWMENT', amount } : null; }],
    [1, () => ({ type: 'SET_ATHLETICS_BUDGET', tier: BUDGET_TIERS[n(3)] })],
    [2, (g) => {
      const idle = g.s.tech.filter((t) => t.facilityType === 'lab' && standsOnCampus(t) && !g.s.research.initiatives[t.id]);
      const lab = any(idle);
      const offer = lab ? any(initiativeOffers(g.s, lab.id).filter((o) => !o.blockedReason)) : undefined;
      return lab && offer
        ? { type: 'START_INITIATIVE', labId: lab.id, topicId: offer.topic.id, depth: offer.depth.key, facultyIds: offer.suggested.map((f) => f.id) }
        : null;
    }],
    [1, (g) => { const labId = any(Object.keys(g.s.research.initiatives)); return labId ? { type: 'CANCEL_INITIATIVE', labId } : null; }],
    [1, (g) => {
      const team = any(g.s.orgs.teams);
      const coach = any(g.s.orgs.coachCandidates);
      return team && coach ? { type: 'HIRE_COACH', candidateId: coach.id, teamId: team.id, role: ROLES[n(3)] } : null;
    }],
    [1, () => { const field = any(FACULTY_FIELDS); return field ? { type: 'POST_SEARCH', field } : null; }],
    [1, (g) => {
      const courses = Object.keys(g.s.courseFaculty);
      const a = any(courses); const b = any(courses);
      return a && b ? { type: 'SWAP_COURSE_FACULTY', courseA: a, courseB: b } : null;
    }],
    // The map: paths and trees anywhere, accepted or refused.
    [1, () => ({ type: g.roll() < 0.7 ? 'ADD_PATH_TILE' : 'REMOVE_PATH_TILE', tile: { row: n(CAMPUS_GRID_HEIGHT), col: n(CAMPUS_GRID_WIDTH) } })],
    [1, () => ({ type: g.roll() < 0.5 ? 'PLANT_TREE' : 'FELL_TREE', tile: { row: n(CAMPUS_GRID_HEIGHT), col: n(CAMPUS_GRID_WIDTH) } })],
    // Anything placeable the game offers, sited or refused by cash.
    [2, (g) => {
      const t = any(g.s.tech.filter((x) => x.status === 'available' && isPlaceableKind(x) && !(x.id in g.s.placements)));
      const spot = t ? firstFreeSpot(g.s, t, footprintOf(t)) : null;
      return t && spot ? { type: 'PLACE_BUILDABLE', buildableId: t.id, row: spot.row, col: spot.col, rotated: false } : null;
    }],
  ];
}

function weighted<T>(roll: () => number, items: Array<[number, T]>): T {
  const total = items.reduce((sum, [w]) => sum + w, 0);
  let at = roll() * total;
  for (const [w, item] of items) {
    at -= w;
    if (at < 0) return item;
  }
  return items[items.length - 1][1];
}

// How many moves a week, most weeks none: a real player acts on a few weeks
// in ten, and a run that acts every week never lets anything finish.
const MOVES_PER_WEEK = [0, 0, 0, 0, 1, 1, 1, 2, 3];

export const fuzzPlayer: Player = {
  name: 'Fuzz',
  act(g) {
    const any = randomPick(g.roll);
    const opts = { pick: any, reserve: 0 };
    const moves: Array<[number, (g: Game) => boolean]> = [
      [6, (g) => foundOffer(g, opts)],
      [3, (g) => moveHome(g, opts)],
      [2, (g) => siteNextHall(g, opts)],
      [8, (g) => developCourse(g, opts)],
      [3, (g) => hireForBlocked(g, opts)],
      [2, (g) => buildForShortfall(g, 101, opts)],
      [2, (g) => buildDorm(g, 0, opts)],
      [1, (g) => { const t = any(buildable(g.s)); return t ? site(g, t) : false; }],
      [6, (g) => { const a = weighted(g.roll, rawGenerators(g))(g); if (a) g.act(a); return a !== null; }],
    ];
    const count = MOVES_PER_WEEK[Math.floor(g.roll() * MOVES_PER_WEEK.length)];
    for (let i = 0; i < count; i += 1) weighted(g.roll, moves)(g);
  },
  // The summer at a random price and intake; everything else the default.
  answer(g) {
    if (g.s.pendingInterrupt?.type !== 'summer') return null;
    return defaultAnswer(g.s, { tuition: Math.round(g.roll() * TUITION_SLIDER_MAX), admitRate: 0.05 + g.roll() * 0.95 });
  },
};
