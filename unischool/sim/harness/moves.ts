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
import { courseQuality, projectedQuality } from '../../src/systems/faculty/facultyAssignment';
import { GRADE_A, qualityOf, tierOf } from '../../src/data/courseQuality';
import { CROWDING_GRACE, crowdingCoverages } from '../../src/systems/prestige/prestigeSystem';
import { claimedHalls, claimedSchool, homeSchool, programsAwayFromHome, schoolHall, suggestedMove } from '../../src/systems/techtree/schools';
import { declineRefusal, drawsGlobalOffers, schoolOffers } from '../../src/systems/techtree/programOffers';
import { firstFreeSpot, footprintOf, isPlaceableKind } from '../../src/state/campusMap';
import { bedsWithDowntown } from '../../src/systems/satisfaction/satisfactionSystem';
import type { Game } from './game';
import { heldOffices, officeAllowance, officeHeld, officePrice, openOfficeRefusal, slotFree } from '../../src/systems/administration/offices';
import { charterRefusal, foundTeamCost, foundTeamRefusal } from '../../src/systems/administration/officeActions';
import { canAppoint, staffingCovers } from '../../src/systems/delegation/seats';
import { seatDef } from '../../src/data/seatData';
import { weeklyNet } from '../../src/systems/finance/financeSystem';

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
  return s.halls[hallId]?.findIndex(slotFree) ?? -1;
}

// Where a new major belongs (Plan 55's line of play, Plan 100's claim):
// its school's hall if that has room; else a purchased hall its school
// leads (the most programs there, no school at three); else a hall that is
// no school's: Founders Hall first, then a mixed one, then an empty one.
// Never a hall another school claims, which founds only its own.
export function homeFor(s: GameState, program: ProgramInfo): { hallId: string; slot: number } | null {
  const own = schoolHall(s, program.school);
  if (own !== undefined) {
    const slot = freeSlotIn(s, own);
    if (slot >= 0) return { hallId: own, slot };
  }
  const academic = (hallId: string) => {
    const hall = s.tech.find((t) => t.id === hallId);
    return !!hall && isAcademicHall(hall) && freeSlotIn(s, hallId) >= 0;
  };
  const led = Object.keys(s.halls).find((hallId) => academic(hallId) && hallId !== FOUNDERS_HALL_ID
    && claimedSchool(s, hallId) === null && leadOf(s, hallId) === program.school);
  if (led !== undefined) return { hallId: led, slot: freeSlotIn(s, led) };
  const open = Object.keys(s.halls)
    .filter((hallId) => academic(hallId) && homeSchool(s, hallId) === null && claimedSchool(s, hallId) === null)
    .sort((a, b) => (a === FOUNDERS_HALL_ID ? -1 : b === FOUNDERS_HALL_ID ? 1 : 0));
  if (open.length > 0) return { hallId: open[0], slot: freeSlotIn(s, open[0]) };
  // Last, a claimed hall whose school has nothing left to found: it takes
  // the global offers too (drawsGlobalOffers).
  const spent = Object.keys(s.halls).find((hallId) => academic(hallId) && hallId !== FOUNDERS_HALL_ID
    && claimedSchool(s, hallId) !== null && drawsGlobalOffers(s, hallId));
  return spent !== undefined ? { hallId: spent, slot: freeSlotIn(s, spent) } : null;
}

// The school with the most programs in a hall, alone; undefined on a tie or
// an empty hall.
function leadOf(s: GameState, hallId: string): string | undefined {
  const counts = new Map<string, number>();
  for (const slot of s.halls[hallId] ?? []) {
    const program = slot.programId ? programById(slot.programId) : undefined;
    if (program) counts.set(program.school, (counts.get(program.school) ?? 0) + 1);
  }
  const ranked = [...counts].sort((a, b) => b[1] - a[1]);
  return ranked.length > 0 && (ranked.length === 1 || ranked[0][1] > ranked[1][1]) ? ranked[0][0] : undefined;
}

// What can be founded now, and where it belongs (Plan 78D): each claimed
// hall's own school's programs into that hall first, then the global offers
// where homeFor puts them. One entry a program.
export function foundable(s: GameState): Array<{ program: ProgramInfo; hallId: string; slot: number }> {
  const out: Array<{ program: ProgramInfo; hallId: string; slot: number }> = [];
  for (const claim of claimedHalls(s)) {
    const slot = freeSlotIn(s, claim.hallId);
    if (slot < 0) continue;
    for (const program of schoolOffers(s, claim.hallId)) {
      if (!out.some((x) => x.program.id === program.id)) out.push({ program, hallId: claim.hallId, slot });
    }
  }
  for (const id of s.programOffers) {
    const program = programById(id);
    const where = program ? homeFor(s, program) : null;
    if (program && where && !out.some((x) => x.program.id === id)) out.push({ program, ...where });
  }
  return out;
}

// What a player founds into this hall when told to (Plan 78D): a purchased
// hall one school claims takes that school's own programs while it has
// any (another school's would take a program slot the school needs), then
// the global offers; Founders Hall and a hall no school claims take the
// global offers (drawsGlobalOffers).
export function offersFor(s: GameState, hallId: string): string[] {
  if (!drawsGlobalOffers(s, hallId)) return schoolOffers(s, hallId).map((p) => p.id);
  return [...s.programOffers];
}

// Found a program where it belongs (foundable), with an instructor who can
// teach its entry course.
export function foundOffer(g: Game, { pick = first, reserve = 0 }: MoveOptions = {}): boolean {
  const s = g.s;
  const choices = foundable(s)
    .map(({ program, hallId, slot }) => {
      const entry = s.tech.find((t) => t.id === program.entryCourseId);
      const teacher = entry ? eligibleInstructors(s, entry)[0] : undefined;
      if (!entry || !teacher || !affords(s, entry.cost, reserve)) return null;
      const founding = { programId: program.id, hallId, slot, facultyId: teacher.id };
      return canFoundProgram(s, founding) ? founding : null;
    })
    .filter((f) => f !== null);
  const choice = pick(choices);
  if (!choice) return false;
  g.act({ type: 'FOUND_PROGRAM', ...choice });
  return true;
}

// Decline an offer nobody can teach (Plan 78D): its entry course's field has
// no one on the payroll with a free course slot and no one on the market.
// One a year, as the game allows; the replacement is the ordinary draw.
export function declineUnteachable(g: Game): boolean {
  const s = g.s;
  for (const id of s.programOffers) {
    if (declineRefusal(s, id) !== null) continue;
    const entry = s.tech.find((t) => t.id === programById(id)?.entryCourseId);
    const field = entry?.requiresFaculty;
    if (!entry || !field || eligibleInstructors(s, entry).length > 0 || s.candidates.some((c) => c.field === field)) continue;
    g.act({ type: 'DECLINE_OFFER', programId: id });
    return true;
  }
  return false;
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
  g.act({ type: 'PLACE_BUILDABLE', buildableId: t.id, row: spot.row, col: spot.col, facing: 0 });
  return true;
}

// Every placeable the game offers to build now.
export function buildable(s: GameState, reserve = 0): Buildable[] {
  return s.tech.filter((t) => t.status === 'available' && isPlaceableKind(t) && !(t.id in s.placements) && affords(s, t.cost, reserve));
}

// Site the next academic hall in the chain.
// The next academic hall, when no open purchased hall (one no school
// claims or is home to) has a free slot (Plan 100): a hall still open takes
// the global offers, so a new one would only stand empty.
export function siteNextHall(g: Game, { reserve = 0 }: MoveOptions = {}): boolean {
  const s = g.s;
  const openRoom = Object.keys(s.halls).some((hallId) => {
    if (hallId === FOUNDERS_HALL_ID) return false;
    const hall = s.tech.find((t) => t.id === hallId);
    return !!hall && isAcademicHall(hall) && hall.status === 'done' && homeSchool(s, hallId) === null && freeSlotIn(s, hallId) >= 0;
  });
  if (openRoom) return false;
  const hall = buildable(s, reserve).find((t) => isAcademicHall(t));
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
  const choice = pick(hiringOrder(s.candidates.filter((c) => blocked.has(c.field) && affords(s, c.salary, reserve))));
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
// and there are students). The downtown's beds (Plan 85H) count with the
// campus's.
export function buildDorm(g: Game, fill: number, { reserve = 0 }: MoveOptions = {}): boolean {
  const s = g.s;
  const enrolled = totalEnrolled(s.students);
  const beds = bedsWithDowntown(s);
  const wanted = beds === 0 ? enrolled > 0 : enrolled / beds >= fill;
  const next = buildable(s, reserve).find((t) => t.kind === 'dorm');
  return wanted && next ? site(g, next) : false;
}

// Tend the teaching (Plan 71): prestige is held under a ceiling set by how
// many courses earn an A, and academic satisfaction reads every course's
// grade, so a player aiming for the top manages who teaches what. Three
// steps, weakest courses first:
//   1. a course below an A moves to someone on the roster who would teach
//      it at least TEND_MARGIN points better now, unless a seat staffs it;
//   2. if its teacher will never reach an A on it (their potential is too
//      low), hire a candidate who will, at most `hires` a call — step 1
//      moves the course to them once they have grown past its teacher;
//   3. anyone left teaching nothing, and not on a research team, is let go.
// Whether the players hand-pick faculty (Plan 71). Off, a player hires the
// cheapest candidate and never tends the teaching: the teaching-blind line
// the scorecard reads against the owner's rule that building everything
// alone reaches the top 25, and only chosen faculty go further.
export const TEACHING = { care: true };

// Candidates in the order a player would take them: the best teacher first
// when it cares, the cheapest when it does not.
export function hiringOrder<T extends { teachingPotential: number; salary: number }>(candidates: readonly T[]): T[] {
  return [...candidates].sort((a, b) => (TEACHING.care ? b.teachingPotential - a.teachingPotential : a.salary - b.salary));
}

export const TEND_EVERY_WEEKS = 4;
const TEND_MARGIN = 4;
const TEND_IDLE_YEARS = 8;

// What `f` will score on `t` at their potential.
function eventualScore(t: Buildable, f: { teachingPotential: number; acclaim: number }): number {
  return qualityOf({ teaching: f.teachingPotential, acclaim: f.acclaim, tier: tierOf(t.id) }).score;
}

export function tendTeaching(g: Game, { reserve = 0, hires = 2 }: MoveOptions & { hires?: number } = {}): boolean {
  if (!TEACHING.care) return false;
  // Every action returns a new state, so each read below is of g.s, never a
  // copy taken before an action.
  let acted = false;
  let hired = 0;
  const weak = g.s.tech
    .map((t) => ({ t, q: courseQuality(g.s, t) }))
    .filter((x): x is { t: Buildable; q: NonNullable<typeof x.q> } => x.q !== null && x.q.score < GRADE_A)
    .sort((a, b) => a.q.score - b.q.score);
  for (const { t, q } of weak) {
    const current = g.s.courseFaculty[t.id];
    // A Provost or Dean on Staff for the A (Plan 95S) makes this course's
    // swaps: the player leaves step 1 to the seat, and still hires.
    const better = staffingCovers(g.s, t) ? undefined : eligibleInstructors(g.s, t, t.id)
      .filter((f) => f.id !== current)
      .map((f) => ({ f, score: projectedQuality(t, f).score }))
      .sort((a, b) => b.score - a.score)[0];
    if (better && better.score >= q.score + TEND_MARGIN) {
      g.act({ type: 'REASSIGN_COURSE_FACULTY', courseId: t.id, facultyId: better.f.id });
      acted = true;
      continue;
    }
    if (hired >= hires) continue;
    const teacher = g.s.faculty.find((f) => f.id === current);
    if (teacher && eventualScore(t, teacher) >= GRADE_A) continue;
    // Someone in the field already on the way up counts as the hire.
    const coming = g.s.faculty.some((f) => f.field === t.requiresFaculty && f.id !== current
      && hasFreeSlot(g.s, f) && eventualScore(t, f) >= GRADE_A);
    if (coming) continue;
    const candidate = g.s.candidates
      .filter((c) => c.field === t.requiresFaculty && eventualScore(t, c) >= GRADE_A)
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

// ---------------------------------------------------------------------
// The administration's offices (Plan 89G): each player opens the first
// office of its own preference the game lets it, into a free slot of
// Founders Hall, while the college may hold another and can pay for it
// above its reserve. Once held, the two offices that act are used: a club
// chartered whenever it may be, and a sport club whose venue stands taken
// varsity at once.
// ---------------------------------------------------------------------
export function openOffices(g: Game, preference: readonly string[], { reserve = 0 }: MoveOptions = {}): boolean {
  const s = g.s;
  if (officeAllowance(s) <= heldOffices(s).length) return false;
  const slot = (s.halls[FOUNDERS_HALL_ID] ?? []).findIndex(slotFree);
  if (slot < 0) return false;
  const choice = preference.find((id) => openOfficeRefusal(s, id, slot) === null && affords(s, officePrice(s, id), reserve));
  if (!choice) return false;
  g.act({ type: 'OPEN_OFFICE', officeId: choice, slot });
  return true;
}

export function useOffices(g: Game, { reserve = 0 }: MoveOptions = {}): void {
  if (charterRefusal(g.s) === null) g.act({ type: 'CHARTER_CLUB' });
  if (!officeHeld(g.s, 'athletics-development')) return;
  const club = g.s.orgs.clubs.find((c) => c.sport !== null && foundTeamRefusal(g.s, c.id) === null);
  if (club && affords(g.s, foundTeamCost(g.s), reserve)) g.act({ type: 'FOUND_TEAM', clubId: club.id });
}

// ---------------------------------------------------------------------
// A Provost (Plan 113E, the third review's I7-5c): no harness player
// filled a seat, so no scenario save had one, 4× stayed locked and
// Running the college was never done. From PROVOST_FROM_YEAR, the year
// after the chapter that asks for one opens (Y4W27), a Provost from
// outside once the week's net pays the salary and the cash stands above
// the player's reserve. The seat keeps its default policy.
// ---------------------------------------------------------------------
export const PROVOST_FROM_YEAR = 5;

export function appointProvost(g: Game, { reserve = 0 }: MoveOptions = {}): boolean {
  const s = g.s;
  if (s.clock.year < PROVOST_FROM_YEAR || !canAppoint(s, 'provost', null)) return false;
  const salary = seatDef('provost')?.outsideSalary ?? 0;
  if (weeklyNet(s) * WEEKS_PER_YEAR < salary || s.finance.cash < reserve) return false;
  g.act({ type: 'APPOINT_SEAT', seatId: 'provost', school: null });
  return true;
}
