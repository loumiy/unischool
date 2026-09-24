import type { Buildable, GameState } from '../../state/types';
import type { ProgramInfo } from '../../data/techData';
import { SEATS_PER_COURSE } from './instructionCapacity';
import { isInTransit } from './programOffers';

// Where a program stands and what it is one course away from, shared by the
// map's hall panel and the Curriculum tab so the two can never disagree.
// A major is Established when its tier-2 quartet is done and Distinguished
// when its four capstones are (docs/design/curriculum.md); the core and
// graduate programs are simply complete. Counts come from course status, not
// s.milestones, because the question is "how many more".

export type ProgramMilestone = 'established' | 'distinguished' | 'complete';

export interface ProgramProgress {
  done: number;
  total: number;
  developing: number;
  // The first 'available' course in tier order, if any.
  next: Buildable | undefined;
  // When nothing is startable, the first course still locked.
  waiting: Buildable | undefined;
  // The next milestone and how many not-done courses (developing included)
  // stand before it; 0 once the last milestone is reached.
  milestone: ProgramMilestone;
  toMilestone: number;
  // Seats the developed courses teach today; 0 while in transit.
  seats: number;
  inTransit: boolean;
}

// A major's nine course ids by position: entry, tier-2 quartet, tier-3
// quartet (techData.ts's ProgramInfo.courseIds order).
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

// A locked course's unmet prerequisites by name: a course's short code or a
// building's name, so the player knows what to act on.
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
