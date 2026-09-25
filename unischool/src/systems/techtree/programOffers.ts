import type { GameState } from '../../state/types';
import { graduateGateMet, programs, type ProgramInfo } from '../../data/techData';
import { makeRivalRng } from '../../data/rivalData';
import { hostedPrograms } from '../../data/projectData';
import { WEEKS_PER_YEAR } from '../../state/types';

// ---------------------------------------------------------------------
// The offer queue: the player sees three programs (s.programOffers) drawn
// from what remains, and founding one draws a replacement, so the catalog
// is discovered rather than enumerated (docs/design/curriculum.md). No
// reroll, no decline. Two rules pull against each other on purpose:
//
//   - Programs from started schools are STARTED_SCHOOL_WEIGHT times likelier,
//     so a school the player has begun converges on being founded.
//   - At least one offer comes from an unstarted school whenever one exists,
//     so discovery never dries up.
//
// Offerable: revealed and not yet housed. The dice are a local PRNG seeded
// from the state (name, week, housed count), with no draw on the game's
// random stream, so the offer never shifts the rest of a seeded run; a
// reloaded save draws exactly what it would have drawn.
// ---------------------------------------------------------------------

export const PROGRAM_OFFER_COUNT = 3;
export const STARTED_SCHOOL_WEIGHT = 3;

// FNV-1a with a finalizer, as rivalData.ts hashes a rival's id: a
// one-character difference in the key is an unrelated seed.
function offerSeed(key: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

// Where a program is housed, if anywhere: the hall id, or undefined.
export function hallOf(s: GameState, programId: string): string | undefined {
  for (const [hallId, slots] of Object.entries(s.halls)) {
    if (slots.some((slot) => slot.programId === programId)) return hallId;
  }
  return undefined;
}

export function isHoused(s: GameState, programId: string): boolean {
  return hallOf(s, programId) !== undefined;
}

// The slot a program occupies, wherever it is.
export function slotOf(s: GameState, programId: string): { hallId: string; slot: number } | undefined {
  for (const [hallId, slots] of Object.entries(s.halls)) {
    const slot = slots.findIndex((x) => x.programId === programId);
    if (slot >= 0) return { hallId, slot };
  }
  return undefined;
}

// Weeks a program has left in transit (types.ts's HallSlot); 0 when settled
// or unhoused.
export function transitWeeks(s: GameState, programId: string): number {
  const where = slotOf(s, programId);
  return where ? (s.halls[where.hallId][where.slot].transitWeeks ?? 0) : 0;
}

export function isInTransit(s: GameState, programId: string): boolean {
  return transitWeeks(s, programId) > 0;
}

// The schools with at least one program housed.
export function startedSchools(s: GameState): Set<string> {
  const started = new Set<string>();
  for (const program of programs()) {
    if (isHoused(s, program.id)) started.add(program.school);
  }
  return started;
}

function isRevealed(s: GameState, program: ProgramInfo): boolean {
  const entry = s.tech.find((t) => t.id === program.entryCourseId);
  if (!entry) return false;
  // A graduate program is never drawn: its host offers it once earned
  // (hostOffers below, Plan 51).
  if (program.kind === 'graduate') return false;
  // Entry courses have no prereqs, so every major is revealed from founding.
  // Reads prereqs, not status: the course stays 'locked' until housed.
  return entry.prereqs.every((id) => s.tech.find((t) => t.id === id)?.status === 'done');
}

// What a graduate program's host offers (Plan 51): the programs it houses
// that are earned (graduateGateMet) and not yet founded. Not drawn, and not
// counted against PROGRAM_OFFER_COUNT: each has one place to go.
export function hostOffers(s: GameState, hostId: string): ProgramInfo[] {
  return hostedPrograms(hostId)
    .filter((id) => graduateGateMet(s, id) && !isHoused(s, id))
    .map((id) => programs().find((program) => program.id === id))
    .filter((program): program is ProgramInfo => program !== undefined);
}

// Everything that could be offered now: revealed and unhoused, in seed order.
export function offerablePrograms(s: GameState): ProgramInfo[] {
  return programs().filter((program) => isRevealed(s, program) && !isHoused(s, program.id));
}

// Tops the offer back up to PROGRAM_OFFER_COUNT: at founding, after each
// FOUND_PROGRAM, and after weeks that finish something (when a graduate gate
// may open). Idempotent. Offers that became unofferable are dropped first.
//
// `guarantee` (founding only) names majors of which at least one must be on
// the table; the first draw is confined to them, the rest are ordinary.
export function refillOffers(s: GameState, guarantee: readonly string[] = []): void {
  const offerable = offerablePrograms(s);
  const byId = new Map(offerable.map((program) => [program.id, program]));
  s.programOffers = s.programOffers.filter((id) => byId.has(id));

  let pool = offerable.filter((program) => !s.programOffers.includes(program.id));
  if (s.programOffers.length >= PROGRAM_OFFER_COUNT || pool.length === 0) return;

  const started = startedSchools(s);
  const isUnstarted = (program: ProgramInfo) => !started.has(program.school);
  const housedCount = Object.values(s.halls).reduce((n, slots) => n + slots.filter((slot) => slot.programId !== null).length, 0);
  const roll = makeRivalRng(offerSeed(`${s.self.name}|${(s.clock.year - 1) * WEEKS_PER_YEAR + s.clock.week}|${housedCount}`));

  const guaranteed = pool.filter((program) => guarantee.includes(program.id));
  if (guaranteed.length > 0 && !s.programOffers.some((id) => guarantee.includes(id))) {
    const chosen = guaranteed[Math.min(guaranteed.length - 1, Math.floor(roll() * guaranteed.length))];
    s.programOffers.push(chosen.id);
    pool = pool.filter((program) => program.id !== chosen.id);
  }

  while (s.programOffers.length < PROGRAM_OFFER_COUNT && pool.length > 0) {
    // The discovery rule: if nothing offered is from an unstarted school and
    // something could be, this draw is confined to those.
    const offeredUnstarted = s.programOffers.some((id) => {
      const program = byId.get(id);
      return program !== undefined && isUnstarted(program);
    });
    const candidates = !offeredUnstarted && pool.some(isUnstarted) ? pool.filter(isUnstarted) : pool;

    const weights = candidates.map((program) => (started.has(program.school) ? STARTED_SCHOOL_WEIGHT : 1));
    const total = weights.reduce((sum, w) => sum + w, 0);
    let pick = roll() * total;
    let chosen = candidates[candidates.length - 1];
    for (let i = 0; i < candidates.length; i += 1) {
      pick -= weights[i];
      if (pick < 0) { chosen = candidates[i]; break; }
    }

    s.programOffers.push(chosen.id);
    pool = pool.filter((program) => program.id !== chosen.id);
  }
}
