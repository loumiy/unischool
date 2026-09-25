import type { Buildable, GameState } from '../../state/types';
import { FOUNDERS_HALL_ID, isAcademicHall, programById } from '../../data/techData';

// Schools are founded, not unlocked. A hall is dedicated when every slot is
// housed and every program in it belongs to one school (a graduate program
// counts as its homeSchool). Dedication is a live reading over s.halls,
// computed only here; the `school-founded:<School>` milestone it earns
// (techSystem.ts's checkMilestones) is never revoked, while live bonuses
// read this function, so moving a program out costs the bonus, not the
// school.

// The school a hall is dedicated to, or null if it is partly filled, empty,
// or mixed. Founders Hall is an ordinary hall here.
export function dedicatedSchool(s: GameState, hallId: string): string | null {
  const slots = s.halls[hallId];
  if (!slots || slots.length === 0) return null;
  let school: string | null = null;
  for (const slot of slots) {
    if (slot.programId === null) return null;
    // A program in transit has not arrived yet (types.ts's
    // HallSlot.transitWeeks).
    if ((slot.transitWeeks ?? 0) > 0) return null;
    const program = programById(slot.programId);
    if (!program) return null;
    if (school === null) school = program.school;
    else if (school !== program.school) return null;
  }
  return school;
}

// Every dedicated hall, with its school.
export function dedicatedHalls(s: GameState): Array<{ hallId: string; school: string }> {
  const out: Array<{ hallId: string; school: string }> = [];
  for (const hallId of Object.keys(s.halls)) {
    const school = dedicatedSchool(s, hallId);
    if (school !== null) out.push({ hallId, school });
  }
  return out;
}

export function schoolFoundedKey(school: string): string {
  return `school-founded:${school}`;
}

// Whether the school has ever been founded — the durable milestone, not
// the live reading. A school keeps its name once it has one.
export function isSchoolFounded(s: GameState, school: string): boolean {
  return !!s.milestones[schoolFoundedKey(school)];
}

// A hall's display name: its donor's name if naming rights were sold (a
// stored overwrite of `name`, see eventData.ts's 'naming-rights'),
// "<School> Hall" while dedicated, its seeded name otherwise. Live, so the
// label follows the hall's purity while the milestone stays.
export function hallDisplayName(s: GameState, t: Buildable): string {
  if (t.donorSurname) return t.name;
  const school = t.slots !== undefined ? dedicatedSchool(s, t.id) : null;
  return school ? `${school} Hall` : t.name;
}

// ---------------------------------------------------------------------
// Sorting (Plan 55). Programs begin in Founders Hall and move out, school
// by school, into halls of their own, until every school has one and
// Founders Hall stands empty. These readings tell the player how far along
// that is: the letters (eventData.ts), the next-step line (nextStep.ts),
// the hall's label and panel, and the program tile's suggested move.
// ---------------------------------------------------------------------

export interface Claim {
  school: string;
  // Programs housed, settled or arriving, of `slots`.
  housed: number;
  slots: number;
}

// The school a purchased hall is being sorted into: every program in it,
// settled or arriving, belongs to that school. Null when it is empty or
// mixed, and always for Founders Hall, which is where programs start and
// is no school's hall. A full claim with nothing in transit is a
// dedication (dedicatedSchool above).
export function claimedSchool(s: GameState, hallId: string): Claim | null {
  if (hallId === FOUNDERS_HALL_ID) return null;
  const hall = s.tech.find((t) => t.id === hallId);
  const slots = s.halls[hallId];
  if (!hall || !isAcademicHall(hall) || !slots) return null;
  let school: string | null = null;
  let housed = 0;
  for (const slot of slots) {
    if (slot.programId === null) continue;
    const program = programById(slot.programId);
    if (!program) return null;
    if (school === null) school = program.school;
    else if (school !== program.school) return null;
    housed += 1;
  }
  return school === null ? null : { school, housed, slots: slots.length };
}

// Every claimed hall, with its claim.
export function claimedHalls(s: GameState): Array<{ hallId: string } & Claim> {
  const out: Array<{ hallId: string } & Claim> = [];
  for (const hallId of Object.keys(s.halls)) {
    const claim = claimedSchool(s, hallId);
    if (claim) out.push({ hallId, ...claim });
  }
  return out;
}

// A school's own hall: the hall it claims with the most programs in it.
export function schoolHall(s: GameState, school: string): string | undefined {
  const halls = claimedHalls(s).filter((c) => c.school === school);
  halls.sort((a, b) => b.housed - a.housed);
  return halls[0]?.hallId;
}

// The majors not yet at home: housed, settled, and in a hall their school
// does not claim (Founders Hall, or a mixed hall), in Founders Hall's slot
// order first.
export function programsAwayFromHome(s: GameState): Array<{ programId: string; school: string; hallId: string }> {
  const out: Array<{ programId: string; school: string; hallId: string }> = [];
  const hallIds = Object.keys(s.halls).sort((a, b) => (a === FOUNDERS_HALL_ID ? -1 : b === FOUNDERS_HALL_ID ? 1 : 0));
  for (const hallId of hallIds) {
    const hall = s.tech.find((t) => t.id === hallId);
    if (!hall || !isAcademicHall(hall)) continue;
    const claim = claimedSchool(s, hallId);
    for (const slot of s.halls[hallId]) {
      if (slot.programId === null || (slot.transitWeeks ?? 0) > 0) continue;
      const program = programById(slot.programId);
      if (!program || program.kind === 'graduate' || claim?.school === program.school) continue;
      out.push({ programId: program.id, school: program.school, hallId });
    }
  }
  return out;
}

// The school to move out next: of the schools with no hall of their own,
// the one with the most programs away from home (ties to the one met first
// in Founders Hall). Null when every housed school has a hall.
export function nextSchoolToMove(s: GameState): string | null {
  const counts = new Map<string, number>();
  for (const p of programsAwayFromHome(s)) {
    if (schoolHall(s, p.school) !== undefined) continue;
    counts.set(p.school, (counts.get(p.school) ?? 0) + 1);
  }
  let best: string | null = null;
  for (const [school, n] of counts) if (best === null || n > counts.get(best)!) best = school;
  return best;
}

// A standing purchased hall with nothing in it.
export function emptyHall(s: GameState): string | undefined {
  return Object.keys(s.halls).find((hallId) => {
    if (hallId === FOUNDERS_HALL_ID) return false;
    const hall = s.tech.find((t) => t.id === hallId);
    return !!hall && isAcademicHall(hall) && hall.status === 'done'
      && s.halls[hallId].every((slot) => slot.programId === null);
  });
}

// Where a program away from home should go, if anywhere now: a free slot in
// its school's own hall, or, for the next school to move, an empty hall.
// Null for a program at home, in transit, graduate, or with nowhere to go.
export function suggestedMove(s: GameState, programId: string): { hallId: string; slot: number } | null {
  const away = programsAwayFromHome(s).find((p) => p.programId === programId);
  if (!away) return null;
  const home = schoolHall(s, away.school);
  const target = home ?? (nextSchoolToMove(s) === away.school ? emptyHall(s) : undefined);
  if (target === undefined) return null;
  const hall = s.tech.find((t) => t.id === target);
  if (hall?.status !== 'done') return null;
  const slot = s.halls[target].findIndex((x) => x.programId === null);
  return slot >= 0 ? { hallId: target, slot } : null;
}
