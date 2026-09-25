// ---------------------------------------------------------------------
// The harness's vocabulary of moves (Plan 57): every player the rebuilt
// harness has — fuzz, guided, the archetypes — is a policy over these, so
// a rule change updates one move rather than every strategy.
//
// A move reads the game's own gates and readings (canFoundProgram,
// suggestedMove, firstFreeSpot, …), never a copy of a rule, so it offers
// only what the game would accept. It returns true when it sent an action.
//
// Two knobs, shared:
//   pick     which of the admissible choices: `first` (in the game's own
//            order), `cheapest`, or `randomPick(roll)` for the fuzz layer
//   reserve  cash a move leaves behind; 0 spends to the wire
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import type { Buildable, GameState, SatisfactionAttributes } from '../../src/state/types';
import { totalEnrolled } from '../../src/state/types';
import { FOUNDERS_HALL_ID, isAcademicHall, programById, type ProgramInfo } from '../../src/data/techData';
import {
  canFoundProgram, canRelocateProgram, canStartDevelopment, eligibleInstructors, hasFreeFacultySlot,
} from '../../src/systems/techtree/techSystem';
import { claimedSchool, programsAwayFromHome, schoolHall, suggestedMove } from '../../src/systems/techtree/schools';
import { firstFreeSpot, footprintOf, isPlaceableKind } from '../../src/state/campusMap';
import type { Game } from './game';

export type Pick = <T>(items: readonly T[]) => T | undefined;
export const first: Pick = (items) => items[0];
export function randomPick(roll: () => number): Pick {
  return (items) => (items.length === 0 ? undefined : items[Math.floor(roll() * items.length) % items.length]);
}

export interface MoveOptions {
  pick?: Pick;
  reserve?: number;
}

function affords(s: GameState, cost: number, reserve = 0): boolean {
  return s.finance.cash - cost >= reserve;
}

function freeSlotIn(s: GameState, hallId: string): number {
  return s.halls[hallId]?.findIndex((slot) => slot.programId === null) ?? -1;
}

// Where a new major belongs (Plan 55's line of play): its school's hall if
// that has room; else a hall no school claims — Founders Hall first, then
// a mixed one, then an empty one.
export function homeFor(s: GameState, program: ProgramInfo): { hallId: string; slot: number } | null {
  const own = schoolHall(s, program.school);
  if (own !== undefined) {
    const slot = freeSlotIn(s, own);
    if (slot >= 0) return { hallId: own, slot };
  }
  const open = Object.keys(s.halls)
    .filter((hallId) => {
      const hall = s.tech.find((t) => t.id === hallId);
      return !!hall && isAcademicHall(hall) && claimedSchool(s, hallId) === null && freeSlotIn(s, hallId) >= 0;
    })
    .sort((a, b) => (a === FOUNDERS_HALL_ID ? -1 : b === FOUNDERS_HALL_ID ? 1 : 0));
  return open.length > 0 ? { hallId: open[0], slot: freeSlotIn(s, open[0]) } : null;
}

// Found a program on offer where it belongs, with an instructor who can
// teach its entry course.
export function foundOffer(g: Game, { pick = first, reserve = 0 }: MoveOptions = {}): boolean {
  const s = g.s;
  const choices = s.programOffers
    .map((id) => programById(id))
    .filter((p): p is ProgramInfo => p !== undefined)
    .map((program) => {
      const entry = s.tech.find((t) => t.id === program.entryCourseId);
      const where = homeFor(s, program);
      const teacher = entry ? eligibleInstructors(s, entry)[0] : undefined;
      if (!entry || !where || !teacher || !affords(s, entry.cost, reserve)) return null;
      const founding = { programId: program.id, ...where, facultyId: teacher.id };
      return canFoundProgram(s, founding) ? founding : null;
    })
    .filter((f) => f !== null);
  const choice = pick(choices);
  if (!choice) return false;
  g.act({ type: 'FOUND_PROGRAM', ...choice });
  return true;
}

// Move a program away from home to where the game suggests (schools.ts).
export function moveHome(g: Game, { pick = first }: MoveOptions = {}): boolean {
  const s = g.s;
  const moves = programsAwayFromHome(s)
    .map((p) => ({ programId: p.programId, move: suggestedMove(s, p.programId) }))
    .filter((m) => m.move !== null && canRelocateProgram(s, { programId: m.programId, ...m.move }));
  const choice = pick(moves);
  if (!choice?.move) return false;
  g.act({ type: 'RELOCATE_PROGRAM', programId: choice.programId, ...choice.move });
  return true;
}

// Site a placeable Buildable at the first free spot.
export function site(g: Game, t: Buildable): boolean {
  const spot = firstFreeSpot(g.s, t, footprintOf(t));
  if (!spot) return false;
  g.act({ type: 'PLACE_BUILDABLE', buildableId: t.id, row: spot.row, col: spot.col, rotated: false });
  return true;
}

// Every placeable the game offers to build now.
export function buildable(s: GameState, reserve = 0): Buildable[] {
  return s.tech.filter((t) => t.status === 'available' && isPlaceableKind(t) && !(t.id in s.placements) && affords(s, t.cost, reserve));
}

// Site the next academic hall in the chain.
export function siteNextHall(g: Game, { reserve = 0 }: MoveOptions = {}): boolean {
  const hall = buildable(g.s, reserve).find((t) => isAcademicHall(t));
  return hall ? site(g, hall) : false;
}

// Develop a course the game offers, with its default instructor.
export function developCourse(g: Game, { pick = first, reserve = 0 }: MoveOptions = {}): boolean {
  const s = g.s;
  const courses = s.tech
    .filter((t) => t.kind === 'course' && t.status === 'available' && affords(s, t.cost, reserve) && canStartDevelopment(s, t));
  const choice = pick(courses);
  if (!choice) return false;
  g.act({ type: 'START_DEVELOPMENT', nodeId: choice.id });
  return true;
}

// Hire off the market into a field that blocks a course or an offered
// program: something waits on it and no one there has a free slot.
export function hireForBlocked(g: Game, { pick = first, reserve = 0 }: MoveOptions = {}): boolean {
  const s = g.s;
  const offered = new Set(s.programOffers.map((id) => programById(id)?.entryCourseId));
  const blocked = new Set(
    s.tech
      .filter((t) => t.requiresFaculty && (t.status === 'available' || offered.has(t.id)))
      .map((t) => t.requiresFaculty!)
      .filter((field) => !hasFreeFacultySlot(s, field)),
  );
  const choice = pick(s.candidates.filter((c) => blocked.has(c.field) && affords(s, c.salary, reserve)));
  if (!choice) return false;
  g.act({ type: 'HIRE_FACULTY', facultyId: choice.id });
  return true;
}

// Build for the students' worst satisfaction attribute under `below`.
export function buildForShortfall(g: Game, below: number, { reserve = 0 }: MoveOptions = {}): boolean {
  const s = g.s;
  const score = (attr: keyof SatisfactionAttributes) => s.students.satisfactionBreakdown[attr];
  const options = buildable(s, reserve)
    .filter((t) => t.kind === 'facility' && t.facilityType !== 'lab' && !t.athleticsVenueReveal)
    .filter((t) => t.effects?.satisfactionAttribute !== undefined && score(t.effects.satisfactionAttribute) < below)
    .sort((a, b) => score(a.effects!.satisfactionAttribute!) - score(b.effects!.satisfactionAttribute!) || a.cost - b.cost);
  return options.length > 0 ? site(g, options[0]) : false;
}

// The next residence hall, once the beds are `fill` full (or there are none
// and there are students).
export function buildDorm(g: Game, fill: number, { reserve = 0 }: MoveOptions = {}): boolean {
  const s = g.s;
  const enrolled = totalEnrolled(s.students);
  const wanted = s.students.capacity === 0 ? enrolled > 0 : enrolled / s.students.capacity >= fill;
  const next = buildable(s, reserve).find((t) => t.kind === 'dorm');
  return wanted && next ? site(g, next) : false;
}
