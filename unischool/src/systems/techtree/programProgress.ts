import type { Buildable, GameState } from '../../state/types';
import type { ProgramInfo } from '../../data/techData';
import { SEATS_PER_COURSE } from './instructionCapacity';
import { isInTransit } from './programOffers';

// ---------------------------------------------------------------------
// WHERE A PROGRAM STANDS, and what it is one course away from.
//
// Both surfaces that show a program — the hall panel on the map and the
// Curriculum tab's row — need the same four answers: how much of it
// exists, which course comes next, which milestone that course moves
// toward and how far off it is, and how many seats it is teaching. One
// reading here, so a "3 to Established" on a hall tile and a "3 to
// Established" on a row can never disagree.
//
// The milestone ladder is the one docs/design/curriculum.md describes: a
// major is ESTABLISHED when its tier-2 quartet is done (the tier-3
// catalogue opens) and DISTINGUISHED when its four capstones are. The core
// and a graduate program have no tiers to climb and are simply complete.
// The counts here are read off course status directly rather than off
// s.milestones, because the question is "how many more", which the
// milestone record cannot answer once it is written.
// ---------------------------------------------------------------------

export type ProgramMilestone = 'established' | 'distinguished' | 'complete';

export interface ProgramProgress {
  done: number;
  total: number;
  developing: number;
  // The next course a player could start: the first in tier order that is
  // 'available' (revealed and not yet started). Undefined when nothing is
  // startable — everything is done, developing, or still locked.
  next: Buildable | undefined;
  // When nothing is startable, the first course still locked — the thing
  // the program is waiting on.
  waiting: Buildable | undefined;
  // The milestone the next course moves toward, and how many courses
  // (not yet done, developing ones included) stand between here and it.
  // `toMilestone` is 0 once the last milestone is reached.
  milestone: ProgramMilestone;
  toMilestone: number;
  // Seats the program's developed courses teach today (Plan 15's ceiling):
  // nothing while it is in transit.
  seats: number;
  inTransit: boolean;
}

// The tier bands of a major's nine course ids, by position: the entry
// course, the tier-2 quartet, the tier-3 quartet (techData.ts lays them out
// in exactly this order — see ProgramInfo.courseIds).
export function tierBands(program: ProgramInfo): { entry: string[]; tier2: string[]; tier3: string[] } | null {
  if (program.kind !== 'major' || program.courseIds.length !== 9) return null;
  return {
    entry: program.courseIds.slice(0, 1),
    tier2: program.courseIds.slice(1, 5),
    tier3: program.courseIds.slice(5, 9),
  };
}

export function programProgress(s: GameState, program: ProgramInfo, lookup?: Map<string, Buildable>): ProgramProgress {
  const find = lookup ? (id: string) => lookup.get(id) : (id: string) => s.tech.find((t) => t.id === id);
  const courses = program.courseIds.map(find).filter((t): t is Buildable => t !== undefined);
  const done = courses.filter((t) => t.status === 'done').length;
  const developing = courses.filter((t) => t.status === 'developing').length;
  const next = courses.find((t) => t.status === 'available');
  const waiting = next ? undefined : courses.find((t) => t.status === 'locked');
  const inTransit = isInTransit(s, program.id);

  let milestone: ProgramMilestone = 'complete';
  let toMilestone = courses.length - done;
  const bands = tierBands(program);
  if (bands) {
    const notDone = (ids: string[]) => ids.filter((id) => find(id)?.status !== 'done').length;
    const toEstablished = notDone(bands.entry) + notDone(bands.tier2);
    if (toEstablished > 0) {
      milestone = 'established';
      toMilestone = toEstablished;
    } else {
      milestone = 'distinguished';
      toMilestone = notDone(bands.tier3);
    }
  }

  return {
    done,
    total: courses.length,
    developing,
    next,
    waiting,
    milestone,
    toMilestone,
    seats: inTransit ? 0 : done * SEATS_PER_COURSE,
    inTransit,
  };
}

// What a locked course is waiting on, by name: its unmet prerequisites,
// a course's short code or a building's name — "needs the Biology
// Laboratory" is what a player can act on; "locked until its
// prerequisites are done" is not.
export function unmetPrereqNames(s: GameState, t: Buildable, lookup?: Map<string, Buildable>): string[] {
  const find = lookup ? (id: string) => lookup.get(id) : (id: string) => s.tech.find((x) => x.id === id);
  return t.prereqs
    .map((id) => find(id))
    .filter((p): p is Buildable => !!p && p.status !== 'done')
    .map((p) => (p.kind === 'course' ? p.name.split(' · ')[0] : p.name));
}

// The sentence beside a program: what the next course is worth. "3 to
// Established", "1 to Distinguished", "Distinguished", "Complete".
export function milestoneLine(p: ProgramProgress): string {
  const name = p.milestone === 'established' ? 'Established' : p.milestone === 'distinguished' ? 'Distinguished' : 'Complete';
  if (p.toMilestone === 0) return name;
  return `${p.toMilestone} to ${name}`;
}
