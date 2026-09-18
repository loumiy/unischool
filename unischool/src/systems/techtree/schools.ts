import type { Buildable, GameState } from '../../state/types';
import { programById } from '../../data/techData';

// ---------------------------------------------------------------------
// SCHOOLS ARE FOUNDED, NOT UNLOCKED (Plan 14's PR E). Nothing is called
// "the School of Engineering" until six Engineering programs sit in one
// hall. A hall is DEDICATED when every one of its slots is housed and
// every program in it belongs to one school; a graduate program belongs
// to its homeSchool (techData.ts), so an MD in a second Health Science
// hall counts as Health Science for dedication and that hall is dedicated
// on its own terms.
//
// Dedication is a READING over s.halls, computed here and nowhere else —
// not a flag written beside it. The milestone it earns
// (`school-founded:<School>`, awarded by techSystem.ts's checkMilestones)
// is written once and never revoked, because a school that existed
// existed and the History tab should not have to un-write itself. Any
// LIVE bonus that reads purity reads this function, so moving a program
// out costs the bonus and not the school.
// ---------------------------------------------------------------------

// The school a hall is dedicated to, or null: partly filled, empty, or
// mixed. Founders Hall (one slot, the core) is never dedicated: General
// Studies has no majors, and it is not a school in this sense.
export function dedicatedSchool(s: GameState, hallId: string): string | null {
  const slots = s.halls[hallId];
  if (!slots || slots.length < 2) return null;
  let school: string | null = null;
  for (const slot of slots) {
    if (slot.programId === null) return null;
    // A program still in transit has not arrived: six programs of one
    // school found it the week the sixth is teaching there, not the week
    // the move was ordered (see types.ts's HallSlot.transitWeeks).
    if ((slot.transitWeeks ?? 0) > 0) return null;
    const program = programById(slot.programId);
    if (!program || program.kind === 'core') return null;
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

// What a hall is called on the map and in its panel: its donor's name if
// its naming rights were sold (a permanent, stored overwrite of `name` —
// see eventData.ts's 'naming-rights'), "<School> Hall" while it is
// dedicated, and its seeded name otherwise. A live reading, so a hall
// that loses its purity goes back to being North Academic Hall until it
// is pure again — the milestone stays, the label follows the building.
export function hallDisplayName(s: GameState, t: Buildable): string {
  if (t.donorSurname) return t.name;
  const school = t.slots !== undefined ? dedicatedSchool(s, t.id) : null;
  return school ? `${school} Hall` : t.name;
}
