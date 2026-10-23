import type { Buildable, GameState, OpeningStage } from '../state/types';
import { servingPopulation, totalEnrolled } from '../state/types';
import { programById } from './techData';
import { count, countWord } from '../format';

// ---------------------------------------------------------------------
// The opening walkthrough's copy, one card per stage (state/opening.ts,
// components/OpeningCoach.tsx). `next` labels the button where a step ends
// on a click; a step that ends on a reading has none. `door` names what the
// coach offers to reopen (the build menu or Founders Hall's panel) if the
// player wanders off the step. The walk ends on the first program founded;
// the chapters after it are state/chapters.ts's (Plan 106 PR C).
// ---------------------------------------------------------------------
export interface OpeningStep {
  eyebrow: string;
  title: string;
  body: (s: GameState) => string;
  next?: string;
  door?: 'build' | 'hall';
}

function capitalized(word: string): string {
  return `${word[0].toUpperCase()}${word.slice(1)}`;
}

function list(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// The programs on offer somebody on the payroll can teach: at the founding,
// the three the founding faculty came for (Plan 107A).
function teachableOffers(s: GameState): string[] {
  const fields = new Set(s.faculty.map((f) => f.field));
  return s.programOffers.filter((id) => fields.has(programById(id)?.field ?? ''));
}

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

// What the students lack, and the figures behind it (Plan 78B), read as the
// words are shown: the "Somewhere to sleep" letter's, and the needs step's.
export function campusLack(s: GameState): string {
  const has = (test: (t: Buildable) => boolean) => s.tech.some((t) => test(t) && t.status === 'done');
  const wants = [
    has(isDorm) ? '' : 'most of them go home at night',
    has(isDiningHall) ? '' : 'there is nowhere on campus to eat',
    has((t) => t.facilityType === 'library') ? '' : 'there is no library',
  ].filter((w) => w !== '');
  return wants.length > 0 ? ` Right now, ${list(wants)}.` : '';
}
export function campusFigures(s: GameState): string {
  const seats = s.tech.filter(isDiningHall).reduce((n, t) => n + servingPopulation(t), 0);
  return ` You have ${count(totalEnrolled(s.students))} students, ${count(s.students.capacity)} beds and ${count(seats)} dining seats.`;
}

// The walkthrough's skip (Plan 104C): one click arms it and it asks, since
// a walk skipped by a stray click doesn't come back. From the welcome it
// declines the letters too; from a later card it keeps them. A run the
// chapters guide is sent no letters (Plan 112A), so its welcome offers to
// skip the walkthrough alone.
export const SKIP_WORDS = {
  welcome: 'Skip the walkthrough and the letters',
  welcomeGuided: 'Skip the walkthrough',
  rest: 'Skip the rest of the walkthrough',
  question: 'Skip the walkthrough? You can’t bring it back in this game.',
  confirm: 'Skip',
  keep: 'Keep the walkthrough',
};
// The welcome's line on what the skip would cost.
export const WALKTHROUGH_LENGTH = 'The walkthrough takes about five minutes.';

export type CoachStage = Exclude<OpeningStage, 'play'>;
export function isCoachStage(stage: OpeningStage): stage is CoachStage {
  return stage !== 'play';
}

export const OPENING_STEPS: Record<CoachStage, OpeningStep> = {
  welcome: {
    eyebrow: 'From the chair of the board',
    title: 'The doors open',
    // It introduces the college and the one building it begins with (Plan
    // 104L): S1 read the old list of three tasks, in an order the walk then
    // didn't play, twice. Each step introduces its own thing when it comes.
    body: (s) => `Welcome to ${s.self.name}. 350 students have enrolled, and the college is yours to build. You start with one building, Founders Hall. The first classes will meet there.`,
    next: 'Next',
  },
  'site-hall': {
    eyebrow: 'Step one',
    title: 'Raise Founders Hall',
    // "Anywhere on the map" (Plan 107A): "a clear stretch of ground" read as
    // a warning about the trees, which a building clears.
    body: () => 'Buildings come from the build menu at the bottom of the screen. Click Founders Hall to pick it up. Then click anywhere on the map to place it.',
    door: 'build',
  },
  // Choosing the first program (Plan 107A): any of the three on offer, each
  // with its professor already appointed. No names and no favourite; the
  // tile and the button carry the cost.
  found: {
    eyebrow: 'Step two',
    title: 'Choose the first program',
    body: (s) => {
      const n = teachableOffers(s).length;
      // A 0.1.2 save on the old appointing step resumes here with nobody on
      // the payroll (Plan 113B, the third review's I7-4): count what is on
      // offer, and ask for the professor the market shows under it.
      if (n === 0 && s.programOffers.length > 0) {
        const m = s.programOffers.length;
        const offered = m > 1 ? `${capitalized(countWord(m))} are on offer in Founders Hall.` : 'One is on offer in Founders Hall.';
        return `Programs are the subjects your college teaches. ${offered} Click the ringed slot and pick one. Then appoint its professor and click Found.`;
      }
      const offered = n > 1 ? `${capitalized(countWord(n))} are on offer in Founders Hall, and each already has a professor.` : 'One is on offer in Founders Hall, and it already has a professor.';
      return `Programs are the subjects your college teaches. ${offered} Click the ringed slot, pick one, and click Found.`;
    },
    door: 'hall',
  },
};
