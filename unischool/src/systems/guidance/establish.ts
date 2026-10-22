import type { GameState } from '../../state/types';
import { FOUNDERS_HALL_ID, isAcademicHall, programById, programs } from '../../data/techData';
import { CLAIM_AT, claimedSchool, closestSchool, homeSchool, hallDisplayName, schoolFoundedKey, type SchoolProgress } from '../techtree/schools';
import { isHoused, isInTransit, offeredIn, slotOf, transitWeeks } from '../techtree/programOffers';
import type { StepIntent } from './intent';
import { slotFree } from '../administration/offices';
import { eligibleInstructors } from '../techtree/techSystem';
import { searchWeeksLeft } from '../faculty/facultySearch';
import { countWord, weeksProse } from '../../format';

// Establishing a school (Plan 80D), the line the letters and the next-step
// line give once a second academic hall stands: "Establish a school: six
// programs of {school} in one hall (n of 6)", for the school closest to six
// (schools.ts's closestSchool). It replaced the forced move into the first
// purchased hall: a school is six programs of one school in a hall the
// college built, and which one is the player's choice.
// The intent is the guided player's (sim/harness/guided.ts) way there:
// found the school's program on offer into the hall, or bring one of its
// programs in, or make room in a full hall by moving another school's
// program to a hall with a free program slot. Since Plan 95O (the second
// review's B3-4) the words keep the goal and add that step: "Establish
// Social Sciences & Humanities (3 of 6): move Anthropology into Elm Hall".
// A program in transit holds its new slot from the week it leaves
// (techSystem.ts's relocateProgram), so it counts toward the hall it is
// moving to (SchoolProgress.housed) and the count never falls mid-move.

export interface EstablishAsk {
  text: string;
  go: 'hall';
  hallId: string;
  // With a move: the program whose tile opens, in the hall it moves from.
  programId?: string;
  intent: StepIntent;
}

// Standing academic halls, Founders Hall included.
export function standingAcademicHalls(s: GameState): number {
  return s.tech.filter((t) => isAcademicHall(t) && t.status === 'done').length;
}

// Schools founded, by their milestone.
export function schoolsFounded(s: GameState): number {
  return Object.keys(s.milestones).filter((k) => k.startsWith(schoolFoundedKey(''))).length;
}

// The goal, and with a step the step after it.
export function establishText(p: SchoolProgress | null, second = false, step?: string): string {
  if (!p) return `Establish ${second ? 'another' : 'a'} school: put six programs from one school in one hall`;
  if (step) return `Establish ${second ? 'another school, ' : ''}${p.school} (${p.housed} of 6): ${step}`;
  return `Establish ${second ? 'another' : 'a'} school: put six ${p.school} programs in one hall (${p.housed} of 6)`;
}

// The step as the line says it, from the intent (Plan 95O). A founding
// nobody on the payroll or the market can begin is a search; a wait names
// what it waits on.
function stepText(s: GameState, p: SchoolProgress, intent: StepIntent): string | undefined {
  const hallName = (hallId: string) => {
    const hall = s.tech.find((t) => t.id === hallId);
    return hall ? hallDisplayName(s, hall) : hallId;
  };
  const programName = (id: string) => programById(id)?.name ?? id;
  switch (intent.kind) {
    case 'move':
      // Another school's program, moved out of a full hall to make room.
      return programById(intent.programId)?.school === p.school
        ? `move ${programName(intent.programId)} into ${hallName(intent.hallId)}`
        : `move ${programName(intent.programId)} out to ${hallName(intent.hallId)} to make room`;
    case 'found': {
      if (!intent.programId) return undefined;
      const program = programById(intent.programId);
      const entry = program ? s.tech.find((t) => t.id === program.entryCourseId) : undefined;
      const field = entry?.requiresFaculty;
      if (entry && field && eligibleInstructors(s, entry).length === 0 && !s.candidates.some((c) => c.field === field)) {
        const left = searchWeeksLeft(s, field);
        return left > 0 ? `the search in ${field} has ${weeksProse(left)} to run` : `post a search in ${field}`;
      }
      // A purchased hall short of three: how many more make it the
      // school's (Plan 100).
      const short = intent.hallId !== FOUNDERS_HALL_ID && !claimedSchool(s, intent.hallId) ? CLAIM_AT - p.housed : 0;
      const tail = short === 1 ? ` to make it ${p.school}'s hall`
        : short > 1 ? ` (${countWord(short)} more make it ${p.school}'s hall)` : '';
      return `found ${programName(intent.programId)} in ${hallName(intent.hallId)}${tail}`;
    }
    case 'wait': {
      // The first of the school's programs to arrive in the hall.
      const arriving = (s.halls[p.hallId] ?? [])
        .filter((slot) => slot.programId !== null && (slot.transitWeeks ?? 0) > 0 && programById(slot.programId)?.school === p.school)
        .map((slot) => slot.programId!)
        .sort((a, b) => transitWeeks(s, a) - transitWeeks(s, b))[0];
      if (arriving) return `${programName(arriving)} arrives in ${weeksProse(transitWeeks(s, arriving))}`;
      return freeSlot(s, p.hallId) >= 0
        ? `wait for a ${p.school} program to be offered`
        : `${hallName(p.hallId)} is full, and no other hall has room`;
    }
    default:
      return undefined;
  }
}

const freeSlot = (s: GameState, hallId: string) => s.halls[hallId]?.findIndex(slotFree) ?? -1;

// The way toward six in the hall, for the guided player; 'wait' when there
// is none this week.
function establishIntent(s: GameState, p: SchoolProgress): StepIntent {
  const slot = freeSlot(s, p.hallId);
  if (slot >= 0) {
    // A program of the school on offer here.
    const offered = programs().find((program) => program.school === p.school && program.kind !== 'graduate'
      && !isHoused(s, program.id) && offeredIn(s, p.hallId, program.id));
    if (offered) return { kind: 'found', hallId: p.hallId, programId: offered.id };
    // One of its programs housed in another hall, settled, that is not the
    // school's own dedicated hall.
    const stray = programs().find((program) => {
      if (program.school !== p.school || program.kind === 'graduate' || isInTransit(s, program.id)) return false;
      const where = slotOf(s, program.id);
      return where !== undefined && where.hallId !== p.hallId;
    });
    if (stray) return { kind: 'move', programId: stray.id, hallId: p.hallId, slot };
    return { kind: 'wait' };
  }
  // A full hall: another school's program moves to a standing academic hall
  // with room, the one with most of its own school first, Founders Hall
  // last.
  for (const other of s.halls[p.hallId]) {
    const program = other.programId ? programById(other.programId) : undefined;
    if (!program || program.school === p.school || program.kind === 'graduate' || isInTransit(s, program.id)) continue;
    const targets = Object.keys(s.halls)
      .filter((hallId) => {
        const hall = s.tech.find((t) => t.id === hallId);
        return hallId !== p.hallId && !!hall && isAcademicHall(hall) && hall.status === 'done' && freeSlot(s, hallId) >= 0;
      })
      .sort((a, b) => Number(homeSchool(s, b)?.school === program.school) - Number(homeSchool(s, a)?.school === program.school)
        || Number(a === FOUNDERS_HALL_ID) - Number(b === FOUNDERS_HALL_ID));
    if (targets.length > 0) return { kind: 'move', programId: program.id, hallId: targets[0], slot: freeSlot(s, targets[0]) };
  }
  return { kind: 'wait' };
}

// The ask, once a second academic hall stands and a school is still to be
// founded. `second`: the letters' second school.
export function establishAsk(s: GameState, second = false): EstablishAsk | null {
  if (standingAcademicHalls(s) < 2) return null;
  const p = closestSchool(s);
  if (!p) return null;
  const intent = establishIntent(s, p);
  const text = establishText(p, second, stepText(s, p, intent));
  // A move opens the program's tile in the hall it moves from (Plan 95O).
  const from = intent.kind === 'move' ? slotOf(s, intent.programId) : undefined;
  if (intent.kind === 'move' && from) return { text, go: 'hall', hallId: from.hallId, programId: intent.programId, intent };
  return { text, go: 'hall', hallId: p.hallId, intent };
}
