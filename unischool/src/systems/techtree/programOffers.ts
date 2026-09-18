import type { GameState } from '../../state/types';
import { graduateGateMet, programs, type ProgramInfo } from '../../data/techData';
import { makeRivalRng } from '../../data/rivalData';
import { WEEKS_PER_YEAR } from '../../state/types';

// ---------------------------------------------------------------------
// THE OFFER QUEUE (Plan 14). After the gen-ed core, the player is never
// shown forty-two doors. They are shown THREE — s.programOffers — drawn
// from what remains, and founding one draws a replacement, so the offer is
// always three and the catalogue is discovered rather than enumerated.
// See types.ts's HallSlot block and docs/design/curriculum.md.
//
// Two rules shape the draw, and they pull against each other on purpose:
//
//   - WEIGHTED TOWARD STARTED SCHOOLS. A school with a program already
//     housed somewhere is STARTED_SCHOOL_WEIGHT times likelier to offer
//     another, so a school the player has begun converges — six programs
//     in one hall is the whole game, and a school that dribbles out over
//     forty years can never be founded.
//   - AT LEAST ONE OFFER FROM A SCHOOL NOT YET STARTED, whenever such a
//     program exists. Without this the weighting eats itself: the last two
//     schools are never seen, and the player is locked into finishing what
//     they opened first. Discovery never dries up.
//
// There is no reroll and no decline. The three stand until one is taken.
//
// WHAT IS OFFERABLE: a program that is revealed and not yet housed. A
// major is revealed when its entry course is — which is the moment the
// gen-ed core completes, since every tier-1 course requires the whole core
// — and a graduate program when its own gate opens (graduateGateMet,
// unchanged). The core itself is never offered: it is housed at founding.
//
// THE DICE. A local PRNG (rivalData.ts's makeRivalRng) seeded from the
// STATE — the school's name, the week, and how many programs are housed —
// and NO draw on the global Math.random stream at all. This is the one
// place the game deliberately does not roll: the first attempt took one
// global draw per refill, the discipline rivalsSystem.ts's annual drift
// keeps, and that single extra draw at core completion shifted every
// faculty potential and candidate listing after it enough to send the
// balance sim's overbuilder into a distress it never climbed out of. The
// offer is not what the regression bands measure, so it must not move
// them. What the seed loses in surprise it keeps in variety: two schools
// with different names, or the same school founding a week apart, draw
// differently, and a save reloaded draws exactly what it would have drawn.
// ---------------------------------------------------------------------

export const PROGRAM_OFFER_COUNT = 3;
export const STARTED_SCHOOL_WEIGHT = 3;

// FNV-1a with a finalizer, the same shape rivalData.ts hashes a rival's id
// through: a one-character difference in the key is an unrelated seed.
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

// Weeks a program has left in transit (see types.ts's HallSlot), or 0 when
// it is settled — which is also what an unhoused program reads as.
export function transitWeeks(s: GameState, programId: string): number {
  const where = slotOf(s, programId);
  return where ? (s.halls[where.hallId][where.slot].transitWeeks ?? 0) : 0;
}

export function isInTransit(s: GameState, programId: string): boolean {
  return transitWeeks(s, programId) > 0;
}

// The schools with at least one program housed. The gen-ed core lives in
// Founders Hall from founding, so General Studies always counts as started
// — which is harmless, since it has no majors to offer.
export function startedSchools(s: GameState): Set<string> {
  const started = new Set<string>();
  for (const program of programs()) {
    if (isHoused(s, program.id)) started.add(program.school);
  }
  return started;
}

function isRevealed(s: GameState, program: ProgramInfo): boolean {
  if (program.kind === 'core') return false;
  const entry = s.tech.find((t) => t.id === program.entryCourseId);
  if (!entry) return false;
  if (program.kind === 'graduate') {
    // Its own gate, unchanged — plus, until Plan 14's PR E retires them,
    // Medicine's and Law's own buildings: the entry course names its
    // building as a prereq, so a program whose hall is not yet built
    // cannot be founded and must not be offered.
    return graduateGateMet(s, program.id) && entry.prereqs.every((id) => s.tech.find((t) => t.id === id)?.status === 'done');
  }
  // A major is revealed the moment the gen-ed core completes: its entry
  // course's every prereq is a core course. (The course's own status stays
  // 'locked' until the program is housed — see techSystem.ts's
  // meetsUnlockGates — which is exactly why this reads the prereqs and not
  // the status.)
  return entry.prereqs.every((id) => s.tech.find((t) => t.id === id)?.status === 'done');
}

// Everything that could be offered right now, offered or not: revealed
// and unhoused, in seed order.
export function offerablePrograms(s: GameState): ProgramInfo[] {
  return programs().filter((program) => isRevealed(s, program) && !isHoused(s, program.id));
}

// Tops the offer back up to PROGRAM_OFFER_COUNT. Called the week the
// gen-ed core completes (the first three) and whenever a program is
// founded (its replacement) — see techSystem.ts. Idempotent: an offer
// already full, or a pool already empty, is left exactly as it is, and
// draws nothing.
//
// An offered program that has since become unofferable (housed by some
// other path, or — defensively — no longer in the seed) is dropped first,
// so the record never offers what cannot be taken.
export function refillOffers(s: GameState): void {
  const offerable = offerablePrograms(s);
  const byId = new Map(offerable.map((program) => [program.id, program]));
  s.programOffers = s.programOffers.filter((id) => byId.has(id));

  let pool = offerable.filter((program) => !s.programOffers.includes(program.id));
  if (s.programOffers.length >= PROGRAM_OFFER_COUNT || pool.length === 0) return;

  const started = startedSchools(s);
  const isUnstarted = (program: ProgramInfo) => !started.has(program.school);
  const housedCount = Object.values(s.halls).reduce((n, slots) => n + slots.filter((slot) => slot.programId !== null).length, 0);
  const roll = makeRivalRng(offerSeed(`${s.self.name}|${(s.clock.year - 1) * WEEKS_PER_YEAR + s.clock.week}|${housedCount}`));

  while (s.programOffers.length < PROGRAM_OFFER_COUNT && pool.length > 0) {
    // The discovery rule first: if nothing on the table is from a school
    // the player has not started, and something could be, this draw is
    // confined to those. Every later draw in the same refill is free.
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
