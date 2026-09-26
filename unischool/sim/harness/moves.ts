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
import { totalEnrolled, WEEKS_PER_YEAR } from '../../src/state/types';
import { FOUNDERS_HALL_ID, isAcademicHall, programById, type ProgramInfo } from '../../src/data/techData';
import {
  canFoundProgram, canRelocateProgram, canStartDevelopment, eligibleInstructors, hasFreeFacultySlot, hasFreeSlot,
} from '../../src/systems/techtree/techSystem';
import { courseQuality, facultyLoads, projectedQuality } from '../../src/systems/faculty/facultyAssignment';
import { GRADE_A, qualityOf, tierOf } from '../../src/data/courseQuality';
import { CROWDING_GRACE, crowdingCoverages } from '../../src/systems/prestige/prestigeSystem';
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
  // Best teacher first (Plan 71: prestige waits on A grades).
  const choice = pick(s.candidates
    .filter((c) => blocked.has(c.field) && affords(s, c.salary, reserve))
    .sort((a, b) => b.teachingPotential - a.teachingPotential));
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

// Tend the teaching (Plan 71): prestige is held under a ceiling set by how
// many courses earn an A, and academic satisfaction reads every course's
// grade, so a player aiming for the top manages who teaches what. Three
// steps, weakest courses first:
//   1. a course below an A moves to someone on the roster who would teach
//      it at least TEND_MARGIN points better now;
//   2. if its teacher will never reach an A on it (their potential is too
//      low), hire a candidate who will, at most `hires` a call — step 1
//      moves the course to them once they have grown past its teacher;
//   3. anyone left teaching nothing, and not on a research team, is let go.
export const TEND_EVERY_WEEKS = 4;
const TEND_MARGIN = 4;
const TEND_IDLE_YEARS = 8;

// What `f` will score on `t` at their potential, under `load` of `slots`.
function eventualScore(t: Buildable, f: { teachingPotential: number; acclaim: number; courseSlots: number }, load: number): number {
  return qualityOf({ teaching: f.teachingPotential, acclaim: f.acclaim, load, slots: f.courseSlots, tier: tierOf(t.id) }).score;
}

export function tendTeaching(g: Game, { reserve = 0, hires = 2 }: MoveOptions & { hires?: number } = {}): boolean {
  // Every action returns a new state, so each read below is of g.s, never a
  // copy taken before an action.
  let acted = false;
  let hired = 0;
  const weak = g.s.tech
    .map((t) => ({ t, q: courseQuality(g.s, t) }))
    .filter((x): x is { t: Buildable; q: NonNullable<typeof x.q> } => x.q !== null && x.q.score < GRADE_A)
    .sort((a, b) => a.q.score - b.q.score);
  for (const { t, q } of weak) {
    const loads = facultyLoads(g.s);
    const current = g.s.courseFaculty[t.id];
    const better = eligibleInstructors(g.s, t, t.id)
      .filter((f) => f.id !== current)
      .map((f) => ({ f, score: projectedQuality(g.s, t, f, loads).score }))
      .sort((a, b) => b.score - a.score)[0];
    if (better && better.score >= q.score + TEND_MARGIN) {
      g.act({ type: 'REASSIGN_COURSE_FACULTY', courseId: t.id, facultyId: better.f.id });
      acted = true;
      continue;
    }
    if (hired >= hires) continue;
    const teacher = g.s.faculty.find((f) => f.id === current);
    if (teacher && eventualScore(t, teacher, loads.get(teacher.id) ?? 1) >= GRADE_A) continue;
    // Someone in the field already on the way up counts as the hire.
    const coming = g.s.faculty.some((f) => f.field === t.requiresFaculty && f.id !== current
      && hasFreeSlot(g.s, f) && eventualScore(t, f, (loads.get(f.id) ?? 0) + 1) >= GRADE_A);
    if (coming) continue;
    const candidate = g.s.candidates
      .filter((c) => c.field === t.requiresFaculty && eventualScore(t, c, 2) >= GRADE_A)
      // A salary is a weekly cost: the week's pay against the reserve.
      .filter((c) => affords(g.s, c.salary / WEEKS_PER_YEAR, reserve))
      .sort((a, b) => b.teachingPotential - a.teachingPotential)[0];
    if (!candidate) continue;
    g.act({ type: 'HIRE_FACULTY', facultyId: candidate.id });
    hired += 1;
    acted = true;
  }
  const researching = new Set(Object.values(g.s.research.initiatives).flatMap((i) => i?.participantIds ?? []));
  const teaching = new Set(Object.values(g.s.courseFaculty));
  const idle = g.s.faculty.filter((f) => !teaching.has(f.id) && !researching.has(f.id)
    // A recent hire is waiting to take a course over (step 2).
    && f.tenureWeeks >= WEEKS_PER_YEAR * TEND_IDLE_YEARS);
  for (const f of idle) {
    g.act({ type: 'FIRE_FACULTY', facultyId: f.id });
    acted = true;
  }
  return acted;
}

// Relieve crowding (Plan 71): a campus short of beds, dining or health
// shrinks next year's pool steeply, so the worst such need is built for
// before anything else. Returns 'built', 'short' (crowded, and the fix is not
// affordable: save for it) or 'fine'.
export function relieveCrowding(
  g: Game,
  buildFor: (g: Game, attribute: keyof SatisfactionAttributes, reserve: number) => boolean,
  reserve = 0,
): 'built' | 'short' | 'fine' {
  const worst = crowdingCoverages(g.s).find((c) => c.attribute !== undefined && c.coverage < CROWDING_GRACE);
  if (!worst?.attribute) return 'fine';
  // Something for it is already going up.
  const underway = g.s.tech.some((t) => t.status === 'developing' && (t.kind === 'dorm' ? worst.attribute === 'housing' : t.effects?.satisfactionAttribute === worst.attribute));
  if (underway) return 'fine';
  return buildFor(g, worst.attribute, reserve) ? 'built' : 'short';
}
