import type { GameState, Buildable, BuildableEffects, Faculty, HallSlot } from '../../state/types';
import { totalEnrolled } from '../../state/types';
import {
  graduateCourseIds, graduateGateMet, graduatePrograms, milestoneSchools, programById, programOfCourse,
} from '../../data/techData';
import { isCelebratedMilestone } from '../../data/eventData';
import { hallOf, isHoused, isInTransit, refillOffers, slotOf } from './programOffers';
import { dedicatedHalls, schoolFoundedKey } from './schools';
import { tierOf, type CourseTier } from '../../data/courseQuality';

// Milestone bonuses reward aggregate conditions (docs/design/curriculum.md).
// They grant no reputation directly (prestigeSystem.ts reads s.milestones);
// the applicant bonuses are one-time flow effects on the pool.
const PROGRAM_ESTABLISHED_APPLICANT_BONUS = 30;
// Larger than a program's: a professional school is a new draw on the pool.
const GRAD_PROGRAM_COMPLETE_APPLICANT_BONUS = 60;
// A named school is the first thing a prospective student can point at.
const SCHOOL_FOUNDED_APPLICANT_BONUS = 60;

// Does this course hold a faculty slot? From the week development starts,
// forever: courses are never retired, so offering more courses is an ongoing
// faculty-capacity cost.
function isOffered(t: Buildable): boolean {
  return t.status === 'developing' || t.status === 'done';
}

// The live instructor of a course, or undefined if none is assigned or the
// assigned person has left. The one place courseFaculty ids are resolved.
export function assignedInstructor(s: GameState, t: Buildable): Faculty | undefined {
  const facultyId = s.courseFaculty[t.id];
  if (!facultyId) return undefined;
  return s.faculty.find((f) => f.id === facultyId);
}

// An offered course with a faculty field and no live instructor, as a
// dismissal leaves it. It still counts toward the catalogue.
export function isUnstaffed(s: GameState, t: Buildable): boolean {
  return isOffered(t) && !!t.requiresFaculty && assignedInstructor(s, t) === undefined;
}

export function unstaffedCourses(s: GameState): Buildable[] {
  return s.tech.filter((t) => isUnstaffed(s, t));
}

// Is this person on a running research initiative? Committed scholars teach a
// reduced load (RESEARCH_COMMITMENT_SLOTS fewer courses), so an initiative
// costs teaching as well as money.
export function isCommitted(s: GameState, facultyId: string): boolean {
  for (const initiative of Object.values(s.research.initiatives)) {
    if (initiative.participantIds.includes(facultyId)) return true;
  }
  return false;
}

// A commitment costs two course slots, not the whole load. Anyone with two
// slots or fewer teaches nothing while committed, so senior faculty (whose
// slots grow with tenure, facultyData.ts's grownSlots) are cheaper to commit.
export const RESEARCH_COMMITMENT_SLOTS = 2;

// Slots this person offers now, net of any commitment. Every capacity read
// goes through this so the commitment is never forgotten in one place.
export function effectiveCourseSlots(s: GameState, f: Faculty): number {
  return isCommitted(s, f.id) ? Math.max(0, f.courseSlots - RESEARCH_COMMITMENT_SLOTS) : f.courseSlots;
}

// Courses a team would give up by committing: the one answer shared by
// ResearchTab's warning and START_INITIATIVE (reducer.ts). Each member keeps
// as many as the reduced load allows and sheds the lowest tier first; ties
// break on course id for determinism.
const TIER_RANK: Record<string, number> = { '1': 1, '2': 2, '3': 3, graduate: 4 };
function tierRank(tier: CourseTier): number {
  return TIER_RANK[String(tier)] ?? 0;
}

export function coursesShedByCommitment(s: GameState, facultyIds: readonly string[]): Buildable[] {
  const shed: Buildable[] = [];
  for (const id of facultyIds) {
    const f = s.faculty.find((person) => person.id === id);
    if (!f) continue;
    // Computed from courseSlots: effectiveCourseSlots reads the current state,
    // where they are not committed yet.
    const keeps = Math.max(0, f.courseSlots - RESEARCH_COMMITMENT_SLOTS);
    const theirs = s.tech
      .filter((t) => isOffered(t) && s.courseFaculty[t.id] === id)
      .sort((a, b) => tierRank(tierOf(b.id)) - tierRank(tierOf(a.id)) || a.id.localeCompare(b.id));
    shed.push(...theirs.slice(keeps));
  }
  return shed;
}

// The full re-homing plan for a commitment, shared by the Research tab and
// the reducer. Shed courses go highest tier first to the strongest teacher in
// the field with room (committing members included, at their reduced load).
// Capacity is computed for the hypothetical committed world.
export interface CommitmentCoverage {
  /** Courses the team can no longer hold. */
  shed: Buildable[];
  /** Of those, the ones a colleague picks up, with who takes each. */
  covered: Array<{ course: Buildable; instructor: Faculty }>;
  /** And the ones nobody has room for. */
  orphaned: Buildable[];
}

export function planCommitmentCoverage(s: GameState, facultyIds: readonly string[]): CommitmentCoverage {
  const shed = coursesShedByCommitment(s, facultyIds);

  const capacity = new Map<string, number>();
  const load = new Map<string, number>();
  for (const f of s.faculty) {
    capacity.set(f.id, facultyIds.includes(f.id)
      ? Math.max(0, f.courseSlots - RESEARCH_COMMITMENT_SLOTS)
      : effectiveCourseSlots(s, f));
    load.set(f.id, facultyLoad(s, f.id));
  }
  // Shed courses leave their old instructor's load before anyone takes one.
  for (const course of shed) {
    const previous = s.courseFaculty[course.id];
    if (previous) load.set(previous, (load.get(previous) ?? 1) - 1);
  }

  const covered: CommitmentCoverage['covered'] = [];
  const orphaned: Buildable[] = [];
  const byTierThenId = [...shed].sort(
    (a, b) => tierRank(tierOf(b.id)) - tierRank(tierOf(a.id)) || a.id.localeCompare(b.id),
  );
  for (const course of byTierThenId) {
    const taker = s.faculty
      .filter((f) => f.field === course.requiresFaculty)
      .filter((f) => (load.get(f.id) ?? 0) < (capacity.get(f.id) ?? 0))
      .sort((a, b) => b.teaching - a.teaching || a.id.localeCompare(b.id))[0];
    if (taker) {
      load.set(taker.id, (load.get(taker.id) ?? 0) + 1);
      covered.push({ course, instructor: taker });
    } else {
      orphaned.push(course);
    }
  }
  return { shed, covered, orphaned };
}

// How many courses this person teaches now, against their own courseSlots.
export function facultyLoad(s: GameState, facultyId: string): number {
  return s.tech.filter((t) => isOffered(t) && s.courseFaculty[t.id] === facultyId).length;
}

export function hasFreeSlot(s: GameState, f: Faculty): boolean {
  return facultyLoad(s, f.id) < effectiveCourseSlots(s, f);
}

// Who could be assigned to this course: in its field and under their slot
// ceiling, strongest teacher first (startDevelopment's auto-pick takes the
// first). `except` is a course being reassigned away from: its current
// instructor keeps that course's slot and stays eligible.
export function eligibleInstructors(s: GameState, node: Buildable, except?: string): Faculty[] {
  if (!node.requiresFaculty) return [];
  // Ties keep roster (hire) order. Never break ties on id: ids are random, and
  // the sim's first-eligible auto-pick would stop being reproducible.
  return s.faculty
    .filter((f) => f.field === node.requiresFaculty)
    .filter((f) => hasFreeSlot(s, f) || (except !== undefined && s.courseFaculty[except] === f.id))
    .sort((a, b) => b.teaching - a.teaching);
}

// Faculty slots in `field` spoken for: every offered course, staffed or not.
// Unstaffed courses must count, or dismissing a professor would free capacity
// to open courses nobody can teach. Re-staffing an orphan is a per-person
// check (hasFreeSlot), so a replacement can always take it over.
export function usedFacultySlots(s: GameState, field: string): number {
  return s.tech.filter((t) => t.requiresFaculty === field && isOffered(t)).length;
}

// Total slot capacity in `field` across the roster (slots grow with tenure,
// see facultyData.ts's grownSlots).
export function totalFacultySlots(s: GameState, field: string): number {
  return s.faculty
    .filter((f) => f.field === field)
    .reduce((sum, f) => sum + effectiveCourseSlots(s, f), 0);
}

// Shared by CurriculumTab.tsx, CampusTab.tsx and canStartDevelopment.
export function hasFreeFacultySlot(s: GameState, field: string): boolean {
  return totalFacultySlots(s, field) > usedFacultySlots(s, field);
}

// The three states a field-gated course can be in:
//   'open'     free slot.
//   'hireable' no free slot, but a candidate in the field is on the market.
//   'blocked'  no free slot and nobody listed: grow the department and wait.
export type FacultyGate = 'open' | 'hireable' | 'blocked';

export function facultyGate(s: GameState, field: string): FacultyGate {
  if (hasFreeFacultySlot(s, field)) return 'open';
  return s.candidates.some((c) => c.field === field) ? 'hireable' : 'blocked';
}

// Fields the school is short on: a course is 'available' (or is the entry
// course of a program on offer) and needs a field with no free slot. Shared
// by the Faculty tab and the faculty alert badge (types.ts's SeenState).
export function neededFacultyFields(s: GameState): Set<string> {
  const offeredEntryIds = new Set(s.programOffers.map((id) => programById(id)?.entryCourseId));
  return new Set(
    s.tech
      .filter((t) => (t.status === 'available' || offeredEntryIds.has(t.id)) && t.requiresFaculty)
      .map((t) => t.requiresFaculty!)
      .filter((field) => usedFacultySlots(s, field) >= totalFacultySlots(s, field)),
  );
}

// What it takes to start a Buildable, shared by START_DEVELOPMENT and the UI.
// Cash is the only throttle (docs/design/economy.md): the cost is charged up
// front, so nothing with a cost starts on negative cash. `facultyId` narrows
// the faculty gate to that person; omitted, any free slot in the field will do.
export function canStartDevelopment(s: GameState, node: Buildable, facultyId?: string): boolean {
  // A course of a program in transit cannot be started.
  if (node.kind === 'course') {
    const programId = programOfCourse(node.id);
    if (programId !== undefined && isInTransit(s, programId)) return false;
  }
  const facultyOk = !node.requiresFaculty
    || (facultyId === undefined
      ? hasFreeFacultySlot(s, node.requiresFaculty)
      : eligibleInstructors(s, node).some((f) => f.id === facultyId));
  const canAfford = s.finance.cash >= node.cost;
  return node.status === 'available' && facultyOk && canAfford;
}

export function startDevelopment(s: GameState, node: Buildable, facultyId?: string): void {
  node.status = 'developing';
  s.developing[node.id] = node.duration;
  // Never takes cash below zero: canStartDevelopment requires the cash.
  s.finance.cash -= node.cost;

  // The instructor is recorded in the same transaction as the start, so a
  // developing course always has one. An omitted facultyId auto-picks the
  // strongest eligible teacher; only the headless sim relies on that, since
  // the UI always passes an explicit choice.
  if (node.requiresFaculty) {
    const chosen = facultyId ?? eligibleInstructors(s, node)[0]?.id;
    if (chosen) s.courseFaculty[node.id] = chosen;
  }
}

// Applies the apply-once completion effects (see BuildableEffects in
// types.ts). Live effects (servesPopulation, satisfaction, prestige,
// research rate, upkeep) are read every tick off s.tech's 'done' entries by
// their systems, so they can never drift from what is built.
function applyEffects(s: GameState, e?: Partial<BuildableEffects>): void {
  if (!e) return;
  if (e.capacityBonus) s.students.capacity += e.capacityBonus;
  // Raises only the listed price for future classes, never enrolled ones
  // (see types.ts's tuitionByClass).
  if (e.tuitionBonus) s.finance.listedTuition += e.tuitionBonus;
  if (e.applicantPoolBonus) s.students.applicantPool += e.applicantPoolBonus;
  if (e.unlockIds) {
    for (const id of e.unlockIds) {
      const target = s.tech.find((t) => t.id === id);
      if (target && target.status === 'locked') target.status = 'available';
    }
  }
}

// A finished hall gets its slots, all empty (types.ts's HallSlot). A hall
// that already has an entry (Founders Hall, seeded at founding) keeps it.
function openHall(s: GameState, node: Buildable): void {
  if (node.slots === undefined || s.halls[node.id] !== undefined) return;
  s.halls[node.id] = Array.from({ length: node.slots }, (): HallSlot => ({ programId: null }));
}

// Gates beyond prereqs that read the school's current state. Checked every
// tick since they can cross either way, but nothing available ever re-locks.
// minCapacityToUnlock reads total enrolled, not beds.
function meetsUnlockGates(s: GameState, t: Buildable): boolean {
  // Every course of a major or graduate program waits on its program being
  // housed in a hall slot. Founding writes the slot and opens the entry course
  // in one step (foundProgram); the founding programs start housed in Founders
  // Hall.
  if (t.kind === 'course') {
    const programId = programOfCourse(t.id);
    if (programId !== undefined && !isHoused(s, programId)) return false;
  }
  // A lab waits on its school's founding milestone (never revoked).
  if (t.schoolGate !== undefined && !s.milestones[schoolFoundedKey(t.schoolGate)]) return false;
  if (t.minCapacityToUnlock !== undefined && totalEnrolled(s.students) < t.minCapacityToUnlock) return false;
  if (t.minPrestigeToUnlock !== undefined && s.self.reputation < t.minPrestigeToUnlock) return false;
  // The first purchased hall waits on enough developed courses.
  if (t.minCoursesToUnlock !== undefined && developedCourseCount(s) < t.minCoursesToUnlock) return false;
  if (t.graduateProgram !== undefined && !graduateGateMet(s, t.graduateProgram)) return false;
  // An athletics venue stays hidden until a team needing its category exists
  // (eventData.ts's 'varsity-petition'); s.orgs.teams is the reveal signal.
  if (t.athleticsVenueReveal && !s.orgs.teams.some((team) => team.venueCategory === t.facilityType)) return false;
  if (t.athleticsDepartmentReveal && s.orgs.teams.length === 0) return false;
  return true;
}

export function developedCourseCount(s: GameState): number {
  return s.tech.filter((t) => t.kind === 'course' && t.status === 'done').length;
}

export function unlockAvailable(s: GameState): void {
  for (const t of s.tech) {
    if (
      t.status === 'locked' &&
      t.prereqs.every((p) => s.tech.find((x) => x.id === p)?.status === 'done') &&
      meetsUnlockGates(s, t)
    ) {
      t.status = 'available';
    }
  }
}

function isDone(s: GameState, id: string): boolean {
  return s.tech.find((t) => t.id === id)?.status === 'done';
}

// Founding a program: the one way a major or graduate program enters the
// curriculum. It takes an empty hall slot and its entry course starts in the
// same transaction with the chosen instructor. The program must be on offer,
// the slot empty, the entry prereqs done, the cash there, and the instructor
// eligible (the same eligibleInstructors the picker reads).
export interface Founding {
  programId: string;
  hallId: string;
  slot: number;
  facultyId: string;
}

export function canFoundProgram(s: GameState, f: Founding): boolean {
  const program = programById(f.programId);
  if (!program) return false;
  if (!s.programOffers.includes(f.programId) || isHoused(s, f.programId)) return false;
  const slots = s.halls[f.hallId];
  if (!slots || f.slot < 0 || f.slot >= slots.length || slots[f.slot].programId !== null) return false;
  const entry = s.tech.find((t) => t.id === program.entryCourseId);
  if (!entry || entry.status !== 'locked') return false;
  if (!entry.prereqs.every((id) => isDone(s, id))) return false;
  if (s.finance.cash < entry.cost) return false;
  if (entry.requiresFaculty && !eligibleInstructors(s, entry).some((x) => x.id === f.facultyId)) return false;
  return true;
}

export function foundProgram(s: GameState, f: Founding): void {
  if (!canFoundProgram(s, f)) return;
  const program = programById(f.programId)!;
  s.halls[f.hallId][f.slot] = { programId: f.programId };
  // Housing the program unlocks its entry course, so the ordinary start can
  // run in this same step.
  unlockAvailable(s);
  const entry = s.tech.find((t) => t.id === program.entryCourseId)!;
  if (canStartDevelopment(s, entry, f.facultyId)) startDevelopment(s, entry, f.facultyId);
  s.programOffers = s.programOffers.filter((id) => id !== f.programId);
  refillOffers(s);
  // Founding can found a school and open its lab, so resolve both now.
  checkMilestones(s);
  unlockAvailable(s);
  const hall = s.tech.find((t) => t.id === f.hallId);
  s.log.unshift({
    year: s.clock.year, week: s.clock.week,
    message: `Founded ${program.name} in ${hall?.name ?? 'an academic hall'}.`,
    kind: 'good',
    topic: 'program',
    subject: f.programId,
  });
}

// Relocation: a housed program moves to any empty slot in a standing hall,
// free in money but dark for RELOCATION_WEEKS. In transit its courses give no
// teaching quality (facultyAssignment.ts), cannot start or advance, and do
// not count toward the new hall's dedication (schools.ts). The dark term stops
// a free end-of-run reshuffle from defusing earlier slot decisions.
export const RELOCATION_WEEKS = 12;

export interface Relocation {
  programId: string;
  hallId: string;
  slot: number;
}

export function canRelocateProgram(s: GameState, r: Relocation): boolean {
  // The founding programs move like any other.
  if (programById(r.programId) === undefined) return false;
  const from = slotOf(s, r.programId);
  if (!from || isInTransit(s, r.programId)) return false;
  const slots = s.halls[r.hallId];
  if (!slots || r.slot < 0 || r.slot >= slots.length) return false;
  if (from.hallId === r.hallId && from.slot === r.slot) return false;
  if (slots[r.slot].programId !== null) return false;
  if (s.tech.find((t) => t.id === r.hallId)?.status !== 'done') return false;
  return true;
}

export function relocateProgram(s: GameState, r: Relocation): void {
  if (!canRelocateProgram(s, r)) return;
  const from = slotOf(s, r.programId)!;
  s.halls[from.hallId][from.slot] = { programId: null };
  s.halls[r.hallId][r.slot] = { programId: r.programId, transitWeeks: RELOCATION_WEEKS };
  const program = programById(r.programId);
  const hall = s.tech.find((t) => t.id === r.hallId);
  s.log.unshift({
    year: s.clock.year, week: s.clock.week,
    message: `${program?.name ?? r.programId} is moving to ${hall?.name ?? 'another hall'} — dark for ${RELOCATION_WEEKS} weeks.`,
    kind: 'info',
  });
}

// One week of every transit. An arrival may complete a hall's dedication,
// which the milestone pass after this call picks up.
function tickTransit(s: GameState): void {
  for (const slots of Object.values(s.halls)) {
    for (const slot of slots) {
      if (slot.transitWeeks === undefined) continue;
      if (slot.transitWeeks <= 1) {
        delete slot.transitWeeks;
        const program = slot.programId ? programById(slot.programId) : undefined;
        s.log.unshift({
          year: s.clock.year, week: s.clock.week,
          message: `${program?.name ?? slot.programId} has settled in and is teaching again.`,
          kind: 'good',
        });
      } else {
        slot.transitWeeks -= 1;
      }
    }
  }
}

// Swapping instructors (the Curriculum tab's drag and drop). Legal when both
// courses are offered, staffed by different people in the same field, each
// eligible for the other's course, and neither program is in transit.
// Otherwise a no-op: nobody is ever silently displaced.
export function canSwapInstructors(s: GameState, courseA: string, courseB: string): boolean {
  if (courseA === courseB) return false;
  const a = s.tech.find((t) => t.id === courseA);
  const b = s.tech.find((t) => t.id === courseB);
  if (!a || !b || !isOffered(a) || !isOffered(b)) return false;
  if (!a.requiresFaculty || a.requiresFaculty !== b.requiresFaculty) return false;
  const fa = s.courseFaculty[courseA];
  const fb = s.courseFaculty[courseB];
  if (!fa || !fb || fa === fb) return false;
  for (const id of [courseA, courseB]) {
    const programId = programOfCourse(id);
    if (programId !== undefined && isInTransit(s, programId)) return false;
  }
  // A swap changes nobody's load, so each is judged with their own course
  // excepted.
  return eligibleInstructors(s, b, courseA).some((f) => f.id === fa)
    && eligibleInstructors(s, a, courseB).some((f) => f.id === fb);
}

export function swapInstructors(s: GameState, courseA: string, courseB: string): void {
  if (!canSwapInstructors(s, courseA, courseB)) return;
  const fa = s.courseFaculty[courseA];
  s.courseFaculty[courseA] = s.courseFaculty[courseB];
  s.courseFaculty[courseB] = fa;
}

export function hallOfCourse(s: GameState, courseId: string): string | undefined {
  const programId = programOfCourse(courseId);
  return programId === undefined ? undefined : hallOf(s, programId);
}

// Awards a milestone once. s.milestones[key] is itself the curriculum-breadth
// signal prestigeSystem.ts reads.
function awardMilestone(s: GameState, key: string, applicantBonus: number, message: string): void {
  if (s.milestones[key]) return;
  s.milestones[key] = true;
  s.students.applicantPool += applicantBonus;
  s.log.unshift({ year: s.clock.year, week: s.clock.week, message, kind: 'good', topic: 'milestone', subject: key });
  // Celebrated milestones are queued, not raised as interrupts: the week may
  // already belong to another interrupt (see eventData.ts's
  // MILESTONE_INTERRUPT_KINDS and eventSystem.ts).
  if (isCelebratedMilestone(key)) s.events.pendingMilestones.push(key);
}

function checkMilestones(s: GameState): void {
  // A hall housing six programs of one school dedicates, and the first
  // dedication founds the school (schools.ts). Never revoked.
  for (const { school } of dedicatedHalls(s)) {
    awardMilestone(
      s,
      schoolFoundedKey(school),
      SCHOOL_FOUNDED_APPLICANT_BONUS,
      `Six programs, one building. This is the School of ${school}.`,
    );
  }

  for (const school of milestoneSchools()) {
    let allProgramsDistinguished = school.majors.length > 0;

    for (const major of school.majors) {
      const tier2Done = major.tier2Ids.every((id) => isDone(s, id));
      if (tier2Done) {
        awardMilestone(
          s,
          `program-established:${major.prefix}`,
          PROGRAM_ESTABLISHED_APPLICANT_BONUS,
          `Program established: ${major.name} (${school.schoolName}).`,
        );
      }

      const tier3Done = major.tier3Ids.every((id) => isDone(s, id));
      if (tier3Done) {
        awardMilestone(
          s,
          `program-distinguished:${major.prefix}`,
          0,
          `${major.name} is now a distinguished program — every course complete.`,
        );
      }

      if (!(tier2Done && tier3Done)) allProgramsDistinguished = false;
    }

    if (allProgramsDistinguished) {
      awardMilestone(
        s,
        `school-distinguished:${school.schoolName}`,
        0,
        `${school.schoolName} is now a fully distinguished school.`,
      );
    }
  }

  // A graduate program completes when every course is done. The milestone key
  // is what prestigeSystem.ts's graduate-breadth (and doctoral research)
  // terms read.
  for (const program of graduatePrograms()) {
    if (!graduateCourseIds(program).every((id) => isDone(s, id))) continue;
    awardMilestone(
      s,
      `grad-program-complete:${program.id}`,
      GRAD_PROGRAM_COMPLETE_APPLICANT_BONUS,
      `${program.name} is now founded — the first ${program.degree} class can be admitted.`,
    );
  }
}

export function tickTech(s: GameState): void {
  const finished: Buildable[] = [];
  // Arrivals first, so a twelve-week move costs twelve weeks, not thirteen.
  const arrived = Object.values(s.halls).some((slots) => slots.some((slot) => slot.transitWeeks !== undefined && slot.transitWeeks <= 1));
  tickTransit(s);

  for (const id of Object.keys(s.developing)) {
    // A course of a program in transit holds its countdown.
    const programId = programOfCourse(id);
    if (programId !== undefined && isInTransit(s, programId)) continue;
    const weeksLeft = s.developing[id] - 1;
    if (weeksLeft <= 0) {
      delete s.developing[id];
      const node = s.tech.find((t) => t.id === id);
      if (node) finished.push(node);
    } else {
      s.developing[id] = weeksLeft;
    }
  }

  for (const node of finished) {
    node.status = 'done';
    // A finished renovation serves its new figure (types.ts's servingPopulation).
    delete node.renovatingFrom;
    applyEffects(s, node.effects);
    openHall(s, node);
    s.log.unshift({
      year: s.clock.year,
      week: s.clock.week,
      message: `Developed: ${node.name}.`,
      kind: 'good',
      // Tagged so the year in review can file it (types.ts's LogTopic).
      topic: node.kind === 'course' ? 'course' : 'building',
      subject: node.id,
    });
  }

  // Every tick: the dynamic gates in meetsUnlockGates can cross any week.
  unlockAvailable(s);
  if (finished.length > 0 || arrived) {
    checkMilestones(s);
    // Draws only when a graduate gate has just opened with the offer short;
    // otherwise a no-op.
    refillOffers(s);
  }
}
