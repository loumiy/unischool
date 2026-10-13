import type { Buildable, GameState, OpeningStage } from '../state/types';
import { servingPopulation, totalEnrolled } from '../state/types';
import { programById } from './techData';
import { FOUNDING_MARKET, WALKTHROUGH_PROGRAM, WALKTHROUGH_PROFESSOR } from './foundingData';
import { NEED_LABELS } from './figureHints';
import { count, countWord, money, satisfactionFigure } from '../format';

// ---------------------------------------------------------------------
// The opening walkthrough's copy, one card per stage (state/opening.ts,
// components/OpeningCoach.tsx). `next` labels the button where a step ends
// on a click; a step that ends on a reading has none. `door` names what the
// coach offers to reopen (the build menu, Founders Hall's panel or the
// Curriculum) if the player wanders off the step. The wait for the first
// course ('await-course') has no card: the clock runs under it.
// ---------------------------------------------------------------------
export interface OpeningStep {
  eyebrow: string;
  title: string;
  body: (s: GameState) => string;
  next?: string;
  door?: 'build' | 'hall' | 'curriculum' | 'students';
}

function list(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const programName = (id: string) => programById(id)?.name ?? id;

// The founding market's professors still listed, as "Dr. X in Field".
function foundingListings(s: GameState): string[] {
  return FOUNDING_MARKET.filter((p) => s.candidates.some((c) => c.id === p.id)).map((p) => `${p.name} in ${p.field}`);
}

// The program the found step names: the walkthrough's, if its professor was
// appointed; else an offer someone on the payroll can teach.
function programToFound(s: GameState): string {
  if (s.faculty.some((f) => f.id === WALKTHROUGH_PROFESSOR) || s.faculty.length === 0) return WALKTHROUGH_PROGRAM;
  const fields = new Set(s.faculty.map((f) => f.field));
  return s.programOffers.find((id) => fields.has(programById(id)?.field ?? '')) ?? WALKTHROUGH_PROGRAM;
}

// A few weeks, in words.
const WEEK_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
function weeksAway(n: number): string {
  return `${WEEK_WORDS[n] ?? n} ${n === 1 ? 'week' : 'weeks'}`;
}

const professor = FOUNDING_MARKET.find((p) => p.id === WALKTHROUGH_PROFESSOR)!;

export function housedPrograms(s: GameState): string[] {
  return Object.values(s.halls).flatMap((slots) => slots.map((slot) => slot.programId)).filter((id): id is string => id !== null);
}

// The program the next-course step points at: the first housed program
// whose entry course is taught. Null before then, or once none is housed.
export function walkProgram(s: GameState): string | null {
  for (const id of housedPrograms(s)) {
    const entry = programById(id)?.entryCourseId;
    if (entry && s.tech.find((t) => t.id === entry)?.status === 'done') return id;
  }
  return null;
}

// The needs steps (Plan 103C): the letter they stand in for, a residence
// hall and a dining hall, and the next of each the college can site.
export const NEEDS_LETTER_ID = 'somewhere-to-sleep';
export const isDorm = (t: Buildable) => t.kind === 'dorm';
export const isDiningHall = (t: Buildable) => t.facilityType === 'diningHall';
export function sitedAny(s: GameState, test: (t: Buildable) => boolean): boolean {
  return s.tech.some((t) => test(t) && t.id in s.placements);
}
// The building a site step rings: the next of its kind on offer.
export function walkBuilding(s: GameState): Buildable | null {
  const stage = s.events.opening.stage;
  const test = stage === 'site-housing' ? isDorm : stage === 'site-dining' ? isDiningHall : null;
  return test ? s.tech.find((t) => test(t) && t.status === 'available') ?? null : null;
}

// What the students lack, and the figures behind it (Plan 78B), read as the
// words are shown: the "Somewhere to sleep" letter's, and the needs step's.
export function campusLack(s: GameState): string {
  const has = (test: (t: Buildable) => boolean) => s.tech.some((t) => test(t) && t.status === 'done');
  const wants = [
    has(isDorm) ? '' : 'most of them go home at night',
    has(isDiningHall) ? '' : 'there is nowhere on campus to eat',
    has((t) => t.facilityType === 'library') ? '' : 'there is no library',
  ].filter((w) => w !== '');
  return wants.length > 0 ? ` As it stands, ${list(wants)}.` : '';
}
export function campusFigures(s: GameState): string {
  const seats = s.tech.filter(isDiningHall).reduce((n, t) => n + servingPopulation(t), 0);
  return ` The college has ${count(totalEnrolled(s.students))} students, ${count(s.students.capacity)} beds and ${count(seats)} dining seats.`;
}

// A site step's card: the building, what it gives, and where it is.
function siteBody(s: GameState, gives: (t: Buildable) => string, kind: string): string {
  const t = walkBuilding(s);
  if (!t) return `Every ${kind} on offer is sited.`;
  return `${t.name} ${gives(t)} for ${money(t.cost)}, and takes ${weeksAway(t.duration)} to build. It is ringed in the build menu: pick it up and set it down, as Founders Hall was.`;
}

// A course's title without its code ("ENGL101 · Foundations of …").
function titleOf(name: string): string {
  return name.split(' · ')[1] ?? name;
}

export type CoachStage = Exclude<OpeningStage, 'play' | 'await-course'>;
export function isCoachStage(stage: OpeningStage): stage is CoachStage {
  return stage !== 'play' && stage !== 'await-course';
}

export const OPENING_STEPS: Record<CoachStage, OpeningStep> = {
  welcome: {
    eyebrow: 'From the chair of the board',
    title: 'The doors open',
    body: (s) => `The ${s.self.name} board wishes you well. Three hundred and fifty students are on the books, and nobody is on the payroll to teach them: the college has not one professor and not one course, and the one building it owns, Founders Hall, has not been set down on its ground. All three are yours to fix, in that order, and nothing else can start until the first is done: the hall, then its first professor, then its first program.`,
    next: 'Next',
  },
  'site-hall': {
    eyebrow: 'Step one',
    title: 'Raise Founders Hall',
    body: () => 'Every building comes from the build menu at the foot of the screen. Click Founders Hall to pick it up, then click a clear stretch of ground to set it down — its footprint follows the pointer.',
    door: 'build',
  },
  appoint: {
    eyebrow: 'Step two',
    title: 'Appoint the first professor',
    body: (s) => {
      const listed = foundingListings(s);
      const market = listed.length > 0 ? ` The market lists one for each program on offer: ${list(listed)}.` : '';
      return `A program is founded with the professor who teaches its first course, so the professor comes first.${market} Click the ringed program slot, choose ${programName(WALKTHROUGH_PROGRAM)}, and appoint ${professor.name}. An appointment costs nothing up front; the salary is paid weekly.`;
    },
    door: 'hall',
  },
  found: {
    eyebrow: 'Step three',
    title: 'Found the first program',
    body: (s) => {
      const id = programToFound(s);
      const entry = s.tech.find((t) => t.id === programById(id)?.entryCourseId);
      const course = entry ? `${entry.name.split(' · ')[1] ?? entry.name}, for ${money(entry.cost)}` : 'its first course';
      return `Found ${programName(id)} into the program slot: its first course, ${course}, goes to the curriculum committee and is taught ${weeksAway(entry?.duration ?? 4)} from now. Each course taught gives the catalog eighty places. Until there are places for all ${totalEnrolled(s.students)} students the college is crowded: the next courses, and the professors to teach them, come first.`;
    },
    door: 'hall',
  },
  'second-course': {
    eyebrow: 'Step four',
    title: 'Develop the next course',
    body: (s) => {
      const program = programById(walkProgram(s) ?? WALKTHROUGH_PROGRAM);
      const courses = (program?.courseIds ?? []).map((id) => s.tech.find((t) => t.id === id)).filter((t) => t !== undefined);
      const entry = courses[0];
      const open = courses.filter((t) => t.status === 'available');
      const weeks = open.map((t) => t.duration);
      const span = weeks.length === 0 ? '' : Math.min(...weeks) === Math.max(...weeks)
        ? ` Each takes ${weeksAway(weeks[0])} to write.`
        : ` Each takes ${Math.min(...weeks)} to ${Math.max(...weeks)} weeks to write.`;
      const name = program?.name ?? 'The program';
      return `${entry ? titleOf(entry.name) : 'The first course'} is taught. ${name} is ${countWord(courses.length)} courses, and ${open.length === 1 ? 'the next is' : `the next ${countWord(open.length)} are`} open now: each is developed the way the first was, by the curriculum committee, with a professor to teach it.${span} Develop one: the ringed button starts the course it names.`;
    },
    door: 'curriculum',
  },
  needs: {
    eyebrow: 'Step five',
    title: 'Somewhere to sleep, somewhere to eat',
    body: (s) => {
      const b = s.students.satisfactionBreakdown;
      const going = sitedAny(s, isDorm) && sitedAny(s, isDiningHall);
      return `Satisfaction is ${satisfactionFigure(s.students.satisfaction)}, and the Students tab shows the needs it is made of: ${NEED_LABELS.housing} is at ${satisfactionFigure(b.housing)} and ${NEED_LABELS.basicNeeds} at ${satisfactionFigure(b.basicNeeds)}.${campusFigures(s)}${campusLack(s)} A college with nowhere to sleep and nowhere to eat talks itself down, and next summer's applicants hear it. ${going
        ? 'A residence hall and a dining hall are going up: the ratings rise when they open.'
        : 'A need is met by building for it, from the build menu: a residence hall for housing, a dining hall for dining.'}`;
    },
    next: 'Next',
    door: 'students',
  },
  'site-housing': {
    eyebrow: 'Step six',
    title: 'Build a residence hall',
    body: (s) => siteBody(s, (t) => `sleeps ${count(t.effects?.capacityBonus ?? 0)} students`, 'residence hall'),
    door: 'build',
  },
  'site-dining': {
    eyebrow: 'Step seven',
    title: 'Build a dining hall',
    body: (s) => siteBody(s, (t) => `feeds ${count(t.effects?.servesPopulation ?? 0)} students`, 'dining hall'),
    door: 'build',
  },
};
