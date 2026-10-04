import type { Buildable, GameState } from '../../state/types';
import { FOUNDERS_HALL_ID, isAcademicHall, programById } from '../../data/techData';
import { slotFree } from '../administration/offices';

// Schools are founded, not unlocked. A hall is dedicated when every slot is
// housed and every program in it belongs to one school (a graduate program
// counts as its homeSchool). Dedication is a live reading over s.halls,
// computed only here; the `school-founded:<School>` milestone it earns
// (techSystem.ts's checkMilestones) is never revoked, while live bonuses
// read this function, so moving a program out costs the bonus, not the
// school.

// The school a hall is dedicated to, or null if it is partly filled, empty,
// or mixed. Founders Hall is an ordinary hall here. Only an academic hall is
// ever dedicated (Plan 59): a graduate program's host (the Law School, the
// Medical Center) has slots too, but housing its program founds no school
// and renames nothing.
export function dedicatedSchool(s: GameState, hallId: string): string | null {
  const slots = s.halls[hallId];
  if (!slots || slots.length === 0) return null;
  const hall = s.tech.find((t) => t.id === hallId);
  if (!hall || !isAcademicHall(hall)) return null;
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
// label follows the hall's purity while the milestone stays. Founders Hall
// keeps its name whichever school fills it (Plan 59).
export function hallDisplayName(s: GameState, t: Buildable): string {
  if (t.donorSurname || t.id === FOUNDERS_HALL_ID) return t.name;
  const school = t.slots !== undefined ? dedicatedSchool(s, t.id) : null;
  return school ? `${school} Hall` : t.name;
}

// ---------------------------------------------------------------------
// Sorting (Plan 55). Programs begin in Founders Hall and move out, school
// by school, into halls of their own, until every school has one; since
// Plan 89C there is a purchased hall for each of the seven, and Founders
// Hall is left to the administration. These readings tell the player how far along
// that is: the letters (eventData.ts), the next-step line (nextStep.ts),
// the hall's label and panel, and the program tile's suggested move.
// ---------------------------------------------------------------------

export interface Claim {
  school: string;
  // Programs housed, settled or arriving, of `slots`.
  housed: number;
  slots: number;
}

// The school a hall is being sorted into: every program in it, settled or
// arriving, belongs to that school. Null when it is empty or mixed, and
// always for Founders Hall: since Plan 89C there is a purchased hall for
// every school, so Founders Hall is nobody's home and every program in it
// is away from home. A full claim with nothing in transit is a dedication
// (dedicatedSchool above), and a school dedicated in Founders Hall is
// still founded; it is simply never the line of play.
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

// The claim a founding would cut into (Plan 78D): another school's program
// founded into a hall one school claims takes a program slot that school
// needs to be founded. The hall panel asks before it (ConfirmButton). Null
// when nothing is lost: the hall's own school, or a hall no school claims.
export function claimCutBy(s: GameState, hallId: string, programId: string): Claim | null {
  const claim = claimedSchool(s, hallId);
  const program = programById(programId);
  return claim && program && program.school !== claim.school ? claim : null;
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

// A school split over two halls while another school has no hall to go to
// (Plan 72L, the split-school trap Plan 65 found): a school with a program
// on offer claims no hall, no purchased hall stands empty, and some school
// claims two halls whose smaller would fit in the larger's free slots.
// Merging the smaller into the larger frees a hall. Without this the
// sorting suggestions only bring strays home and never free a hall, and a
// homeless school's offers could stand forever. The first such school, in
// hall order; null when there is nothing to merge.
export interface Merge { school: string; from: string; into: string }
export function schoolToMerge(s: GameState): Merge | null {
  const homeless = s.programOffers.some((id) => {
    const program = programById(id);
    return !!program && program.kind !== 'graduate' && schoolHall(s, program.school) === undefined;
  });
  if (!homeless || emptyHall(s) !== undefined) return null;
  const bySchool = new Map<string, Array<{ hallId: string } & Claim>>();
  for (const claim of claimedHalls(s)) bySchool.set(claim.school, [...(bySchool.get(claim.school) ?? []), claim]);
  for (const [school, halls] of bySchool) {
    if (halls.length < 2) continue;
    const sorted = [...halls].sort((a, b) => b.housed - a.housed);
    const into = sorted[0];
    const from = sorted[sorted.length - 1];
    if (into.slots - into.housed >= from.housed) return { school, from: from.hallId, into: into.hallId };
  }
  return null;
}

// The majors not yet at home: housed, settled, and in a hall their school
// does not claim (Founders Hall, or a mixed hall), in Founders Hall's slot
// order first; and, while a school is to be merged (schoolToMerge), the
// programs in its smaller hall.
export function programsAwayFromHome(s: GameState): Array<{ programId: string; school: string; hallId: string }> {
  const out: Array<{ programId: string; school: string; hallId: string }> = [];
  const merge = schoolToMerge(s);
  const hallIds = Object.keys(s.halls).sort((a, b) => (a === FOUNDERS_HALL_ID ? -1 : b === FOUNDERS_HALL_ID ? 1 : 0));
  for (const hallId of hallIds) {
    const hall = s.tech.find((t) => t.id === hallId);
    if (!hall || !isAcademicHall(hall)) continue;
    const claim = claimedSchool(s, hallId);
    for (const slot of s.halls[hallId]) {
      if (slot.programId === null || (slot.transitWeeks ?? 0) > 0) continue;
      const program = programById(slot.programId);
      if (!program || program.kind === 'graduate') continue;
      const merging = merge !== null && merge.from === hallId && merge.school === program.school;
      if (claim?.school === program.school && !merging) continue;
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
      && s.halls[hallId].every(slotFree);
  });
}

// Where a program away from home should go, if anywhere now: a free slot in
// its school's own hall (the larger, for a school being merged), or, for
// the next school to move, an empty hall. Null for a program at home, in
// transit, graduate, or with nowhere to go.
export function suggestedMove(s: GameState, programId: string): { hallId: string; slot: number } | null {
  const away = programsAwayFromHome(s).find((p) => p.programId === programId);
  if (!away) return null;
  const merge = schoolToMerge(s);
  const home = merge?.from === away.hallId ? merge.into : schoolHall(s, away.school);
  const target = home ?? (nextSchoolToMove(s) === away.school ? emptyHall(s) : undefined);
  if (target === undefined) return null;
  const hall = s.tech.find((t) => t.id === target);
  if (hall?.status !== 'done') return null;
  const slot = s.halls[target].findIndex(slotFree);
  return slot >= 0 ? { hallId: target, slot } : null;
}

// ---------------------------------------------------------------------
// Establishing a school (Plan 80D): a school is six programs of one school
// in one hall, any academic hall, Founders Hall included. Nothing asks for
// a particular move; the letters and the next-step line name the school
// closest to six (establish.ts in systems/guidance).
// ---------------------------------------------------------------------

export interface SchoolProgress {
  school: string;
  hallId: string;
  // Majors of the school housed in the hall, settled or arriving, of six.
  housed: number;
}

// The school not yet founded that is closest to six in one standing
// academic hall: the most of its majors in one hall, ties to the hall with
// more free program slots, then Founders Hall first. Null when no major of
// an unfounded school is housed.
export function closestSchool(s: GameState): SchoolProgress | null {
  let best: (SchoolProgress & { free: number }) | null = null;
  const hallIds = Object.keys(s.halls).sort((a, b) => (a === FOUNDERS_HALL_ID ? -1 : b === FOUNDERS_HALL_ID ? 1 : 0));
  for (const hallId of hallIds) {
    const hall = s.tech.find((t) => t.id === hallId);
    if (!hall || !isAcademicHall(hall) || hall.status !== 'done') continue;
    const slots = s.halls[hallId];
    // A hall with an office in it (Founders Hall, Plan 89) can never hold
    // six programs, so no school is established there: its programs count
    // toward their schools' other halls, and move out to them.
    if (slots.some((slot) => slot.office !== undefined)) continue;
    const free = slots.filter(slotFree).length;
    const counts = new Map<string, number>();
    for (const slot of slots) {
      const program = slot.programId ? programById(slot.programId) : undefined;
      if (!program || program.kind === 'graduate' || isSchoolFounded(s, program.school)) continue;
      counts.set(program.school, (counts.get(program.school) ?? 0) + 1);
    }
    for (const [school, housed] of counts) {
      if (best === null || housed > best.housed || (housed === best.housed && free > best.free)) best = { school, hallId, housed, free };
    }
  }
  return best ? { school: best.school, hallId: best.hallId, housed: best.housed } : null;
}
