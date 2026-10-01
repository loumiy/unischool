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
import { NON_FLAGSHIP_FUNDED_SHARE, RECRUITING_MAX_LIFT, departmentPot } from '../../src/data/studentLifeData';
import { programById } from '../../src/data/techData';
import { dealtSpecialization, isSpecialization } from '../../src/data/rivalData';
import { isGraduateHost } from '../../src/data/projectData';
import { picksFor } from '../../src/data/trainingData';
import { LANDMARKS_COUNTED, LANDMARK_WINDOW_YEARS, RESEARCH_PARK_ID } from '../../src/data/researchParkData';
import { ATHLETICS_COMPLEX_ID, COMPLEX_WINDOW_YEARS, isDeepRun } from '../../src/data/athleticsComplexData';
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

  // The career record (Plan 84C): every professor has one, no candidate
  // does, and a course's spans run forward without touching.
  for (const f of s.faculty) {
    if (!f.career) { out.push(`${f.name} is on the payroll with no career record`); continue; }
    const last = new Map<string, number>();
    for (const span of f.career.courses) {
      const before = last.get(span.courseId);
      if (span.from > span.to || (before !== undefined && span.from <= before + 1)) out.push(`${f.name}'s spans of ${span.courseId} overlap or run backward`);
      last.set(span.courseId, span.to);
    }
  }
  for (const c of s.candidates) if (c.career) out.push(`${c.name} is a candidate with a career record`);

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

  // Recruiting (Plan 80G): on its scale, and built only by a flagship.
  const pot = departmentPot(s);
  for (const team of s.orgs.teams) {
    if (!(team.recruiting >= 0 && team.recruiting <= RECRUITING_MAX_LIFT + 1e-9)) out.push(`${team.name} recruits at ${team.recruiting}, off the 0–${RECRUITING_MAX_LIFT} scale`);
  }
  const flagships = pot.programs.filter((p) => p.band === 'flagship').length;
  if (flagships > pot.cap) out.push(`${flagships} flagships at a cap of ${pot.cap}`);
  for (const p of pot.programs) {
    if (p.band !== 'flagship' && p.funded > NON_FLAGSHIP_FUNDED_SHARE + 1e-9) out.push(`${p.team.name} is no flagship but draws ${p.funded.toFixed(2)} of its cost`);
  }

  // Rivals (Plan 85C): each specialized in the pillar its id deals.
  for (const r of s.rivals) {
    if (r.specialization !== dealtSpecialization(r.id)) out.push(`${r.id} is specialized in ${String(r.specialization)}, not ${dealtSpecialization(r.id)}`);
  }

  // The college's specialization (Plan 85D): none, or one pillar with the
  // year it was chosen, never before the milestone offered it.
  if (s.specialization !== 'none' && !isSpecialization(s.specialization)) out.push(`the college is specialized in ${String(s.specialization)}`);
  if (s.specialization === 'none' && s.specializationYear !== undefined) out.push(`no specialization, but one chosen in Year ${s.specializationYear}`);
  if (s.specialization !== 'none') {
    if (s.specializationYear === undefined) out.push(`specialized in ${s.specialization} with no year`);
    else if (s.specializationOffered !== undefined && s.specializationYear < s.specializationOffered) out.push(`specialized in Year ${s.specializationYear}, before the offer in Year ${s.specializationOffered}`);
  }

  // The faculty training program (Plan 85E): the year's list is this year's
  // or an earlier one, holds nobody twice, and never more than the year's
  // picks; a trained professor holds their points inside a potential of at
  // most 100, and teaches no higher than it.
  if (s.training.year > s.clock.year) out.push(`the training list is for Year ${s.training.year}, ahead of the clock`);
  if (new Set(s.training.trained).size !== s.training.trained.length) out.push('somebody is on the year\'s training list twice');
  // (The faculty may have shrunk since a pick, so the bound counts those
  // trained this year among it.)
  if (s.training.year === s.clock.year && s.training.trained.length > picksFor(s.faculty.length + s.training.trained.length)) {
    out.push(`${s.training.trained.length} trained this year, more than the picks`);
  }
  for (const f of s.faculty) {
    if (f.teachingPotential > 100 || f.teaching > f.teachingPotential) out.push(`${f.name} teaches at ${f.teaching} against a potential of ${f.teachingPotential}`);
    if (f.training && (f.training.points <= 0 || f.teachingPotential !== Math.min(100, f.training.potential + f.training.points))) {
      out.push(`${f.name}'s training (+${f.training.points} on ${f.training.potential}) does not add up to a potential of ${f.teachingPotential}`);
    }
  }
  for (const c of s.candidates) if (c.training) out.push(`${c.name} is a candidate with training`);
  if (s.training.trained.length > 0 && s.specialization !== 'academics' && s.sandbox !== true) out.push('professors trained at a college not specialized in academics');

  // The research park (Plan 85F): open to build only at a college
  // specialized in research (one standing at another, built before Plan
  // 85F, stays); its Landmark work is a year at most once, oldest first,
  // inside the window, and no more than LANDMARKS_COUNTED a week.
  const park = s.tech.find((t) => t.id === RESEARCH_PARK_ID);
  if (park?.status === 'available' && s.specialization !== 'research' && s.sandbox !== true) out.push('the Research Park is open at a college not specialized in research');
  const work = s.research.landmarkWork;
  for (let i = 0; i < work.length; i += 1) {
    const w = work[i];
    if (i > 0 && w.year <= work[i - 1].year) out.push(`Landmark work for Year ${w.year} out of order`);
    if (w.year > s.clock.year || w.year <= s.clock.year - LANDMARK_WINDOW_YEARS - 1) out.push(`Landmark work for Year ${w.year}, outside the window`);
    if (!(w.weeks >= 0 && w.weeks <= LANDMARKS_COUNTED * WEEKS_PER_YEAR)) out.push(`${w.weeks} weeks of Landmark work in Year ${w.year}`);
  }

  // The athletic performance complex (Plan 85G): open to build only at a
  // college specialized in athletics; its deep runs are inside the window,
  // in the last four, one a sport a year, and only at such a college.
  const complex = s.tech.find((t) => t.id === ATHLETICS_COMPLEX_ID);
  if (complex?.status === 'available' && s.specialization !== 'athletics' && s.sandbox !== true) out.push('the Athletic Performance Complex is open at a college not specialized in athletics');
  const runs = s.orgs.complexRuns;
  const seen = new Set<string>();
  for (const r of runs) {
    if (r.year > s.clock.year || r.year <= s.clock.year - COMPLEX_WINDOW_YEARS) out.push(`a deep run in Year ${r.year}, outside the window`);
    if (!isDeepRun(r.finish)) out.push(`a deep run finishing "${r.finish}"`);
    if (seen.has(`${r.sport}:${r.year}`)) out.push(`two deep runs in ${r.sport} in Year ${r.year}`);
    seen.add(`${r.sport}:${r.year}`);
  }
  if (runs.length > 0 && s.specialization !== 'athletics' && s.sandbox !== true) out.push('deep runs recorded at a college not specialized in athletics');

  return out;
}
