// The objectives' words (Plan 106). Each chapter is one season's lesson in
// the first five years: a title, and the objectives the player is set, each
// a goal rather than an instruction, met however the player gets there.
// The order, the dates and what counts as met are state/chapters.ts's.
//
// A briefing is the chapter's expanded page in the NEXT bar (Plan 106 §2a,
// PR B): what the system is, how to work it, why it matters to the others.
// The rules for writing one are Plan 106 §5: no more than three sentences
// of what, four levers of how and four links of why; say what a number
// adds to; name the actor first, and never end on a passive and a pronoun.

import type { ObjectivesMode } from '../settings';
import type { NextStep } from '../systems/guidance/nextStep';

export type ChapterId = 'founding' | 'seats' | 'somewhere-to-sleep';

// Where a Show me goes: the NEXT line's own doors.
export type Door = NonNullable<NextStep['go']>;

export interface Briefing {
  what: string;
  // Each lever, with the view its Show me opens.
  how: { text: string; door?: Door }[];
  // Each system it feeds or is fed by: "→ {system}: {why}".
  why: { system: string; text: string }[];
}

export interface ChapterCopy {
  title: string;
  objectives: Record<string, string>;
  briefing?: Briefing;
}

export const CHAPTER_COPY: Record<ChapterId, ChapterCopy> = {
  founding: {
    title: 'Founding',
    objectives: {
      'site-founders-hall': 'Raise Founders Hall',
      'appoint-first-professor': 'Appoint the first professor',
      'found-first-program': 'Found the first program',
    },
  },
  seats: {
    title: 'Seats for everyone',
    objectives: {
      'develop-second-course': "Develop a program's second course",
      'seat-every-student': 'Places for every student',
      'run-at-double': 'Run the clock at double speed',
    },
  },
  'somewhere-to-sleep': {
    title: 'Somewhere to sleep',
    objectives: {
      'site-residence-hall': 'Site a residence hall',
      'site-dining-hall': 'Site a dining hall',
    },
  },
};

// The drawer's own words (components/ObjectivesPanel.tsx).
export const OBJECTIVES_WORDS: Record<ObjectivesMode, string> = { guided: 'Guided', brief: 'Brief', off: 'Off' };
export const OBJECTIVES_MODES: readonly ObjectivesMode[] = ['guided', 'brief', 'off'];
export const OBJECTIVES_NOTES: Record<ObjectivesMode, string> = {
  guided: "Each new chapter's briefing opens by itself, once. J opens the objectives at any time.",
  brief: 'The objectives stay one line in the ticker; J or a click opens them.',
  off: 'No chapters: the ticker shows the next step and the next milestone, as it did before.',
};

export const DRAWER_WORDS = {
  title: 'Objectives',
  chapter: (n: number) => `Chapter ${n}`,
  of: (met: number, all: number) => `${met} of ${all}`,
  what: 'What it is',
  how: 'How',
  why: 'Why it matters',
  showMe: 'Show me',
  waiting: 'Also waiting',
  go: 'Go',
  unlocked: 'Unlocked',
  milestones: 'Milestones',
  nextMilestone: 'Next milestone',
  allMilestones: 'All milestones',
  done: 'Done',
  todo: 'To do',
  optional: 'optional',
  between: (title: string, when: string) => `${title} opens ${when}.`,
  waitingOn: (title: string) => `${title} opens when the chapter before it is done.`,
  allDone: 'Every chapter so far is done.',
};
