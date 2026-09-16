import type { GameState } from '../../state/types';
import { FACULTY_FIELDS } from '../../data/facultyData';
import { effectiveCourseSlots, isCommitted } from '../techtree/techSystem';

// ---------------------------------------------------------------------
// WHAT A DEPARTMENT COSTS, AND WHAT IT WILL COST — the four numbers the
// Faculty tab draws its capacity meter from.
//
// The tab used to print one pair, `used / total slots`: the courses a field
// currently offers against the slots its faculty supply. That is the
// question "am I over my ceiling right now", and it is the only one of the
// three a player actually asks that it answered. The other two —
//
//   what would the curriculum I have ALREADY REVEALED cost me?
//   what will the WHOLE CATALOGUE cost me, once it is all developed?
//
// — decide whether a hire is worth making, and neither was anywhere on
// screen. A department sitting at 11/11 with one more course revealed and
// a department sitting at 11/11 with nine more looked identical.
//
// Every figure here is derived — nothing new is stored, and nothing is
// defined twice. `supply` and `offered` are the same arithmetic
// techSystem.ts's totalFacultySlots/usedFacultySlots do (and the state
// machine below agrees with neededFacultyFields by construction); what
// this module adds is the forward view and ONE PASS to get it. The tab
// renders all 29 departments, and filtering 421 tech entries 29 times over
// for a header is 12,000 iterations per render for four small integers.
// ---------------------------------------------------------------------

// Where a department stands, as the one word the row is coloured by.
//
//   'over'  — more courses offered than slots to teach them. Somebody's
//             course is unstaffed, or a research commitment took the slots
//             out from under it. The alarmed state: it is a promise the
//             school is already failing to keep.
//   'short' — exactly at the ceiling with a revealed course waiting. This
//             is techSystem.ts's neededFacultyFields, per field: hiring
//             lifts it today.
//   'empty' — nobody hired, nothing offered. Not a problem, but a fact
//             worth rendering: it is what "there is no Neuroscience
//             department" looks like.
//   'ok'    — room to start what is revealed.
export type FieldCapacityState = 'over' | 'short' | 'empty' | 'ok';

export interface FieldCapacity {
  field: string;
  /** Course slots the roster supplies, after research commitments. */
  supply: number;
  /** The same before commitments — the gap is what projects have taken. */
  grossSupply: number;
  /** Slots spoken for: every offered course, staffed or not. */
  offered: number;
  /** Revealed courses not yet developed — what the next clicks would cost. */
  available: number;
  /** Every course in the catalogue that asks for this field, at any status. */
  catalogue: number;
  hired: number;
  listed: number;
  /** On a research project right now, and so supplying two slots fewer. */
  committed: number;
  state: FieldCapacityState;
}

export interface FacultyCapacity {
  byField: Map<string, FieldCapacity>;
  /** Every department, in FACULTY_FIELDS (division) order. */
  fields: FieldCapacity[];
  /**
   * School-wide sums of the same four figures, plus the one that cannot be
   * summed naively: `shortfall` is the PER-FIELD gap added up, not
   * `catalogue - supply`. Slots do not transfer between departments, so a
   * school with 450 slots all in Mathematics has not "already covered the
   * catalogue" — it has covered Mathematics and nothing else, and the
   * aggregate subtraction is the one arithmetic on this screen that can
   * state a comfortable falsehood.
   */
  total: {
    supply: number; grossSupply: number; offered: number; available: number;
    catalogue: number; shortfall: number;
  };
  /**
   * The length of the longest CATALOGUE on the board, which is what every
   * meter's track is drawn to, so the same length means the same number of
   * courses in every department and the eye can rank them.
   *
   * Deliberately not `max(catalogue, supply)`. Supply is unbounded — a
   * department can be hired far past anything it will ever teach — and
   * letting it set the scale squeezes all twenty-nine curricula into the
   * left third of their tracks to make room for one over-staffed
   * department's rule. A rule past the end of the track is a department
   * that can already teach its whole catalogue, which is a state worth
   * drawing as such (see CapacityMeter's `beyond`) rather than a reason to
   * rescale everybody.
   */
  scale: number;
}

function blank(field: string): FieldCapacity {
  return {
    field, supply: 0, grossSupply: 0, offered: 0, available: 0, catalogue: 0,
    hired: 0, listed: 0, committed: 0, state: 'empty',
  };
}

// The state machine, in the order the cases exclude each other. 'over'
// outranks 'short' because a department that is already failing to teach
// what it offers does not get to describe itself by what it cannot start.
function stateOf(c: FieldCapacity): FieldCapacityState {
  if (c.offered > c.supply) return 'over';
  if (c.available > 0 && c.supply - c.offered <= 0) return 'short';
  if (c.hired === 0 && c.offered === 0) return 'empty';
  return 'ok';
}

// Every department's capacity, in one pass over the catalogue and one over
// the roster. Call it once per render and read fields off the result — see
// FacultyTab.tsx, which memoises it.
export function facultyCapacity(s: GameState): FacultyCapacity {
  const byField = new Map<string, FieldCapacity>();
  for (const field of FACULTY_FIELDS) byField.set(field, blank(field));

  // A field a save carries that the taxonomy no longer has would otherwise
  // drop its people silently. It cannot happen today (persistence.ts's
  // migrations run every saved hire through LEGACY_FIELD_RENAMES), but a
  // roster that adds up to less than s.faculty.length is a bug that should
  // be visible rather than one that quietly subtracts a professor.
  const entry = (field: string): FieldCapacity => {
    let c = byField.get(field);
    if (!c) { c = blank(field); byField.set(field, c); }
    return c;
  };

  for (const t of s.tech) {
    if (!t.requiresFaculty) continue;
    const c = entry(t.requiresFaculty);
    c.catalogue += 1;
    if (t.status === 'developing' || t.status === 'done') c.offered += 1;
    else if (t.status === 'available') c.available += 1;
  }

  for (const f of s.faculty) {
    const c = entry(f.field);
    c.hired += 1;
    c.grossSupply += f.courseSlots;
    c.supply += effectiveCourseSlots(s, f);
    if (isCommitted(s, f.id)) c.committed += 1;
  }

  for (const cand of s.candidates) entry(cand.field).listed += 1;

  const total = { supply: 0, grossSupply: 0, offered: 0, available: 0, catalogue: 0, shortfall: 0 };
  let scale = 1;
  // FACULTY_FIELDS order first, then anything an old save dragged in, so
  // the tab's row order is the taxonomy's and never the roster's.
  const fields: FieldCapacity[] = [];
  for (const c of byField.values()) {
    c.state = stateOf(c);
    total.supply += c.supply;
    total.grossSupply += c.grossSupply;
    total.offered += c.offered;
    total.available += c.available;
    total.catalogue += c.catalogue;
    total.shortfall += Math.max(0, c.catalogue - c.supply);
    scale = Math.max(scale, c.catalogue);
  }
  for (const field of FACULTY_FIELDS) fields.push(byField.get(field)!);
  for (const [field, c] of byField) if (!FACULTY_FIELDS.includes(field)) fields.push(c);

  return { byField, fields, total, scale };
}

// How many hires a slot shortfall is, in people rather than slots. A new
// appointment rolls 4-6 course slots and grows to 10 over a long tenure
// (facultyData.ts's rollBaseCourseSlots/grownSlots), so this is the
// pessimistic reading — what it costs to cover the gap with people hired
// today rather than with people you have kept for twenty years.
export const SLOTS_PER_NEW_HIRE = 5;

export function hiresFor(slots: number): number {
  return Math.max(0, Math.ceil(slots / SLOTS_PER_NEW_HIRE));
}
