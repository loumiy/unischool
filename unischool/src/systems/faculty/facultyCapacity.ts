import type { GameState } from '../../state/types';
import { FACULTY_FIELDS } from '../../data/facultyData';
import { effectiveCourseSlots, isCommitted } from '../techtree/techSystem';

// ---------------------------------------------------------------------
// The figures the Faculty tab's capacity meter draws: what a department
// supplies and teaches now, and what its revealed curriculum and whole
// catalog would cost, so a player can judge whether a hire is worth it.
// All derived: `supply` and `offered` match techSystem.ts's
// totalFacultySlots/usedFacultySlots. Computed in one pass because the tab
// renders every department.
// ---------------------------------------------------------------------

// Where a department stands:
//   'over'  — more courses offered than slots (unstaffed, or a research
//             commitment took the slots).
//   'short' — at the ceiling with a revealed course waiting
//             (techSystem.ts's neededFacultyFields, per field).
//   'empty' — nobody hired, nothing offered.
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
  /** Every course in the catalog that asks for this field, at any status. */
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
   * School-wide sums. `shortfall` is the per-field gap added up, not
   * `catalogue - supply`: slots do not transfer between departments.
   */
  total: {
    supply: number; grossSupply: number; offered: number; available: number;
    catalogue: number; shortfall: number;
  };
  /**
   * The longest catalog on the board, which every meter's track is drawn
   * to so lengths compare across departments. Not max(catalog, supply):
   * supply is unbounded, and a rule past the track end is drawn as such
   * (CapacityMeter's `beyond`).
   */
  scale: number;
}

function blank(field: string): FieldCapacity {
  return {
    field, supply: 0, grossSupply: 0, offered: 0, available: 0, catalogue: 0,
    hired: 0, listed: 0, committed: 0, state: 'empty',
  };
}

// Cases in exclusion order: 'over' outranks 'short'.
function stateOf(c: FieldCapacity): FieldCapacityState {
  if (c.offered > c.supply) return 'over';
  if (c.available > 0 && c.supply - c.offered <= 0) return 'short';
  if (c.hired === 0 && c.offered === 0) return 'empty';
  return 'ok';
}

// One pass over the catalog and one over the roster; FacultyTab.tsx
// memoises it.
export function facultyCapacity(s: GameState): FacultyCapacity {
  const byField = new Map<string, FieldCapacity>();
  for (const field of FACULTY_FIELDS) byField.set(field, blank(field));

  // A field the taxonomy lacks gets its own entry rather than silently
  // dropping people from the totals.
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
  // FACULTY_FIELDS order first, then any unknown fields.
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

// Hires needed for a slot shortfall. New appointments roll 4-6 slots and
// grow to 10 over a long tenure, so this is the pessimistic reading.
export const SLOTS_PER_NEW_HIRE = 5;

export function hiresFor(slots: number): number {
  return Math.max(0, Math.ceil(slots / SLOTS_PER_NEW_HIRE));
}
