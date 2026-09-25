// ---------------------------------------------------------------------
// What must hold of any game state, however it was played (Plan 57). The
// fuzz layer (test/fuzz.test.ts) reads these after every week of random
// but legal play; the guided player and the archetypes (Plans 58–59) will
// read them too. Each returns the broken rule in words, or nothing.
//
// These are rules, not balance: a college may be broke, empty or dying and
// still pass every one. A number the owner could tune never belongs here.
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import type { GameState } from '../../src/state/types';
import { WEEKS_PER_YEAR } from '../../src/state/types';
import { programById } from '../../src/data/techData';
import { isGraduateHost } from '../../src/data/projectData';
import { PROGRAM_OFFER_COUNT, isHoused } from '../../src/systems/techtree/programOffers';
import { isInBounds, placementTiles } from '../../src/state/campusMap';

// The first non-finite number anywhere in the state, by path.
function nonFinite(value: unknown, path: string, seen: Set<object>): string | null {
  if (typeof value === 'number') return Number.isFinite(value) ? null : `${path} is ${value}`;
  if (value === null || typeof value !== 'object' || seen.has(value)) return null;
  seen.add(value);
  for (const [k, v] of Object.entries(value)) {
    const found = nonFinite(v, `${path}.${k}`, seen);
    if (found) return found;
  }
  return null;
}

export function brokenRules(s: GameState): string[] {
  const out: string[] = [];
  const byId = new Map(s.tech.map((t) => [t.id, t]));

  const bad = nonFinite(s, 's', new Set());
  if (bad) out.push(`a number is not finite: ${bad}`);

  if (!(s.clock.year >= 1 && s.clock.week >= 1 && s.clock.week <= WEEKS_PER_YEAR)) {
    out.push(`the clock reads year ${s.clock.year}, week ${s.clock.week}`);
  }

  // Halls: real, the right size, each program housed once.
  const housed = new Map<string, string>();
  for (const [hallId, slots] of Object.entries(s.halls)) {
    const hall = byId.get(hallId);
    if (!hall || hall.slots === undefined) { out.push(`${hallId} has slots but is no hall`); continue; }
    if (slots.length !== hall.slots) out.push(`${hallId} has ${slots.length} slots, not ${hall.slots}`);
    for (const slot of slots) {
      if (slot.programId === null) continue;
      const program = programById(slot.programId);
      if (!program) out.push(`${hallId} houses ${slot.programId}, which is no program`);
      else if (program.kind === 'graduate' && !isGraduateHost(hallId)) out.push(`${slot.programId} is graduate but housed in ${hallId}`);
      else if (program.kind !== 'graduate' && isGraduateHost(hallId)) out.push(`${slot.programId} is a major but housed in ${hallId}`);
      if (housed.has(slot.programId)) out.push(`${slot.programId} is housed in ${housed.get(slot.programId)} and ${hallId}`);
      housed.set(slot.programId, hallId);
      if (slot.transitWeeks !== undefined && !(Number.isInteger(slot.transitWeeks) && slot.transitWeeks > 0)) {
        out.push(`${slot.programId} is in transit for ${slot.transitWeeks} weeks`);
      }
    }
  }

  // The offer: at most three, distinct, real, unhoused majors.
  if (s.programOffers.length > PROGRAM_OFFER_COUNT) out.push(`${s.programOffers.length} programs are on offer`);
  if (new Set(s.programOffers).size !== s.programOffers.length) out.push(`an offer is repeated: ${s.programOffers.join(', ')}`);
  for (const id of s.programOffers) {
    const program = programById(id);
    if (!program || program.kind === 'graduate') out.push(`${id} is on offer but is no major`);
    else if (isHoused(s, id)) out.push(`${id} is on offer and housed`);
  }

  // The map: every placement a real Buildable, on the grid, none overlapping.
  const taken = new Map<string, string>();
  for (const [id, p] of Object.entries(s.placements)) {
    if (!byId.has(id)) { out.push(`${id} is placed but is no Buildable`); continue; }
    for (const tile of placementTiles(p)) {
      if (!isInBounds(tile.row, tile.col)) { out.push(`${id} runs off the grid at ${tile.row},${tile.col}`); break; }
      const key = `${tile.row},${tile.col}`;
      const other = taken.get(key);
      if (other && other !== id) { out.push(`${id} overlaps ${other} at ${key}`); break; }
      taken.set(key, id);
    }
  }

  // Development: what counts down is real and developing.
  for (const [id, weeks] of Object.entries(s.developing)) {
    const t = byId.get(id);
    if (!t) out.push(`${id} is developing but is no Buildable`);
    else if (t.status !== 'developing') out.push(`${id} counts down ${weeks} weeks but is ${t.status}`);
  }

  // Teaching: every assignment names a course and someone on the payroll.
  const staff = new Set(s.faculty.map((f) => f.id));
  if (staff.size !== s.faculty.length) out.push('a professor is on the payroll twice');
  for (const [courseId, facultyId] of Object.entries(s.courseFaculty)) {
    if (!byId.has(courseId)) out.push(`${courseId} has an instructor but is no course`);
    if (!staff.has(facultyId)) out.push(`${courseId} is taught by ${facultyId}, who is not on the payroll`);
  }

  // The students: no class below zero, every score on its scale.
  for (const [year, counts] of Object.entries(s.students.cohortsByClass)) {
    for (const [band, n] of Object.entries(counts as unknown as Record<string, number>)) {
      if (typeof n === 'number' && n < 0) out.push(`the ${year} class has ${n} ${band} students`);
    }
  }
  const scores = { satisfaction: s.students.satisfaction, ...s.students.satisfactionBreakdown };
  for (const [key, v] of Object.entries(scores)) {
    if (v < 0 || v > 100) out.push(`${key} reads ${v}, off the 0–100 scale`);
  }

  return out;
}
