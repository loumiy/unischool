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

export type ChapterId = 'founding' | 'seats' | 'somewhere-to-sleep';

export interface Briefing {
  what: string;
  // Each lever, with the view its Show me opens (PR B).
  how: { text: string; door?: string }[];
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
