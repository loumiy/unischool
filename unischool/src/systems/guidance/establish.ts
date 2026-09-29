import type { GameState } from '../../state/types';
import { isAcademicHall, programById, programs } from '../../data/techData';
import { claimedSchool, closestSchool, schoolFoundedKey, type SchoolProgress } from '../techtree/schools';
import { isHoused, isInTransit, offeredIn, slotOf } from '../techtree/programOffers';
import type { StepIntent } from './intent';

// Establishing a school (Plan 80D), the line the letters and the next-step
// line give once a second academic hall stands: "Establish a school: six
// programs of {school} in one hall (n of 6)", for the school closest to six
// (schools.ts's closestSchool). It replaced the forced move into the first
// purchased hall: a school is six programs of one school in any hall,
// Founders Hall included, and where a school grows is the player's choice.
// The words name the school and the count, never a move. The intent is the
// guided player's (sim/harness/guided.ts) way there: found the school's
// program on offer into the hall, or bring one of its programs in, or make
// room in a full hall by moving another school's program to a hall with a
// free program slot.

export interface EstablishAsk {
  text: string;
  go: 'hall';
  hallId: string;
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

export function establishText(p: SchoolProgress | null, second = false): string {
  if (!p) return `Establish ${second ? 'another' : 'a'} school: six programs of one school in one hall`;
  return `Establish ${second ? 'another' : 'a'} school: six programs of ${p.school} in one hall (${p.housed} of 6)`;
}

const freeSlot = (s: GameState, hallId: string) => s.halls[hallId]?.findIndex((slot) => slot.programId === null) ?? -1;

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
  // with room, the one with most of its own school first.
  for (const other of s.halls[p.hallId]) {
    const program = other.programId ? programById(other.programId) : undefined;
    if (!program || program.school === p.school || program.kind === 'graduate' || isInTransit(s, program.id)) continue;
    const targets = Object.keys(s.halls)
      .filter((hallId) => {
        const hall = s.tech.find((t) => t.id === hallId);
        return hallId !== p.hallId && !!hall && isAcademicHall(hall) && hall.status === 'done' && freeSlot(s, hallId) >= 0;
      })
      .sort((a, b) => Number(claimedSchool(s, b)?.school === program.school) - Number(claimedSchool(s, a)?.school === program.school));
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
  return { text: establishText(p, second), go: 'hall', hallId: p.hallId, intent: establishIntent(s, p) };
}
