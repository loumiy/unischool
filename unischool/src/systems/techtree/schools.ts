import type { Buildable, GameState } from '../../state/types';
import { programById } from '../../data/techData';

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
