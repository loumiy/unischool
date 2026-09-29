import type { GameState } from '../../state/types';
import { FOUNDERS_HALL_ID, graduateGateMet, programs, type ProgramInfo } from '../../data/techData';
import { makeRivalRng } from '../../data/rivalData';
import { hostedPrograms } from '../../data/projectData';
import { WEEKS_PER_YEAR } from '../../state/types';
import { claimedSchool } from './schools';

// ---------------------------------------------------------------------
// The offer queue: the player sees three programs (s.programOffers) drawn
// from what remains, and founding one draws a replacement, so the catalog
// is discovered rather than enumerated (docs/design/curriculum.md). No
// reroll; one decline a year (Plan 78D, declineOffer below), which draws a
// replacement and keeps the declined program off the table until the year
// turns.
//
// A school's own hall is not served by the draw (Plan 78D): a purchased
// hall one school claims offers every revealed program of that school
// (schoolOffers below), so a school that has moved in can always grow. The
// draw serves Founders Hall and every hall no school claims.
//
// The mix (Plan 71, the owner's rule): two offers from schools the college
// has started and one from a school it has not, for as long as both kinds
// remain. A started school converges on being founded, and a new school is
// always in view, so a fourth hall has a reason before the first three are
// full. When one kind runs out, the other fills the table.
//
// Among started schools, the further along a school is, the likelier its
// next major (STARTED_PROGRESS_WEIGHT): drawn evenly, every school filled at
// the same pace and all seven were founded in the same year.
//
// Offerable: revealed and not yet housed. The dice are a local PRNG seeded
// from the state (name, week, housed count), with no draw on the game's
// random stream, so the offer never shifts the rest of a seeded run; a
// reloaded save draws exactly what it would have drawn.
// ---------------------------------------------------------------------

export const PROGRAM_OFFER_COUNT = 3;
// Of the three: offers from a school not yet started.
export const NEW_SCHOOL_OFFERS = 1;
// A started school's weight is its majors housed, to this power.
export const STARTED_PROGRESS_WEIGHT = 2;

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

// A claimed hall's own offers (Plan 78D): every revealed, unhoused major of
// the school a purchased hall is being sorted into (schools.ts's
// claimedSchool), in seed order, drawn from nothing. Empty for Founders
// Hall, which keeps the global offers whoever holds it, and for a hall no
// school claims.
export function schoolOffers(s: GameState, hallId: string): ProgramInfo[] {
  if (hallId === FOUNDERS_HALL_ID) return [];
  const claim = claimedSchool(s, hallId);
  if (!claim) return [];
  return offerablePrograms(s).filter((program) => program.school === claim.school);
}

// Whether a major may be founded into this hall from what it offers: the
// global offers, or the hall's own school's (schoolOffers).
export function offeredIn(s: GameState, hallId: string, programId: string): boolean {
  return s.programOffers.includes(programId) || schoolOffers(s, hallId).some((program) => program.id === programId);
}

// The decline (Plan 78D, A4-5's "decline an offer"): one global offer a
// year may be set aside. Returns why not, or null when it may.
export function declineRefusal(s: GameState, programId: string): string | null {
  if (!s.programOffers.includes(programId)) return 'That program is not on offer.';
  const last = s.declinedOffer;
  if (last && last.year === s.clock.year) {
    const name = programs().find((program) => program.id === last.programId)?.name ?? last.programId;
    return `One offer a year may be declined, and ${name} was declined this year. The next can be declined in Year ${s.clock.year + 1}.`;
  }
  const replacements = offerablePrograms(s).filter((program) => !s.programOffers.includes(program.id));
  if (replacements.length === 0) return 'Nothing else is left to offer in its place.';
  return null;
}

// Declines an offer: it leaves the table, the year's decline is spent, and
// the ordinary draw fills the place. The declined program is not drawn again
// this year (refillOffers).
export function declineOffer(s: GameState, programId: string): void {
  if (declineRefusal(s, programId) !== null) return;
  s.programOffers = s.programOffers.filter((id) => id !== programId);
  s.declinedOffer = { year: s.clock.year, programId };
  refillOffers(s);
}

// Tops the offer back up to PROGRAM_OFFER_COUNT: at founding (where the
// table is already the founding pillars, Plan 80D), after each
// FOUND_PROGRAM, and after weeks that finish something (when a graduate
// gate may open). Idempotent. Offers that became unofferable are dropped
// first.
export function refillOffers(s: GameState): void {
  const offerable = offerablePrograms(s);
  const byId = new Map(offerable.map((program) => [program.id, program]));
  s.programOffers = s.programOffers.filter((id) => byId.has(id));

  // A program declined this year stays off the table until the year turns.
  const declined = s.declinedOffer?.year === s.clock.year ? s.declinedOffer.programId : undefined;
  let pool = offerable.filter((program) => !s.programOffers.includes(program.id) && program.id !== declined);
  if (s.programOffers.length >= PROGRAM_OFFER_COUNT || pool.length === 0) return;

  const started = startedSchools(s);
  const isNew = (program: ProgramInfo) => !started.has(program.school);
  const housedCount = Object.values(s.halls).reduce((n, slots) => n + slots.filter((slot) => slot.programId !== null).length, 0);
  const roll = makeRivalRng(offerSeed(`${s.self.name}|${(s.clock.year - 1) * WEEKS_PER_YEAR + s.clock.week}|${housedCount}`));
  const pickFrom = (candidates: ProgramInfo[]) => candidates[Math.min(candidates.length - 1, Math.floor(roll() * candidates.length))];
  const housedIn = new Map<string, number>();
  for (const program of programs()) {
    if (program.kind !== 'graduate' && isHoused(s, program.id)) housedIn.set(program.school, (housedIn.get(program.school) ?? 0) + 1);
  }
  const pickWeighted = (candidates: ProgramInfo[]) => {
    const weights = candidates.map((program) => Math.max(1, housedIn.get(program.school) ?? 0) ** STARTED_PROGRESS_WEIGHT);
    let r = roll() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < candidates.length; i += 1) {
      r -= weights[i];
      if (r < 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  };
  const take = (chosen: ProgramInfo) => {
    s.programOffers.push(chosen.id);
    pool = pool.filter((program) => program.id !== chosen.id);
  };

  while (s.programOffers.length < PROGRAM_OFFER_COUNT && pool.length > 0) {
    // Two from started schools, one from a new one, while both kinds remain.
    const newOnTable = s.programOffers.filter((id) => { const program = byId.get(id); return program !== undefined && isNew(program); }).length;
    const wantNew = newOnTable < NEW_SCHOOL_OFFERS;
    const newPool = pool.filter(isNew);
    const startedPool = pool.filter((program) => !isNew(program));
    if (wantNew) take(newPool.length > 0 ? pickFrom(newPool) : pickWeighted(startedPool));
    else take(startedPool.length > 0 ? pickWeighted(startedPool) : pickFrom(newPool));
  }
}
