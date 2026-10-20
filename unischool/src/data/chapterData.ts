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
import { SEATS_PER_COURSE } from '../systems/techtree/instructionCapacity';
import { COURSE_DEVELOPMENT_SLOTS } from '../systems/techtree/techSystem';
import { CROWDING_PENALTY } from '../systems/prestige/prestigeSystem';
import { FOUNDERS_HALL_ID } from './techData';
import { count, countWord } from '../format';

export type ChapterId = 'founding' | 'next-course' | 'somewhere-to-sleep' | 'seats' | 'paying-for-it' | 'first-summer';

// Where a Show me goes: the NEXT line's own doors.
export type Door = NonNullable<NextStep['go']>;

export interface Lever {
  text: string;
  // The view its Show me opens; `ringed` opens it on what the chapter
  // rings (state/chapters.ts's ringedProgram), `hallId` on that hall.
  door?: Door;
  ringed?: true;
  hallId?: string;
}

export interface Briefing {
  what: string;
  how: Lever[];
  // Each system it feeds or is fed by: "→ {system}: {why}".
  why: { system: string; text: string }[];
}

export interface ChapterCopy {
  title: string;
  objectives: Record<string, string>;
  briefing?: Briefing;
}

const SEATS = count(SEATS_PER_COURSE);
const COMMITTEE = countWord(COURSE_DEVELOPMENT_SLOTS);

export const CHAPTER_COPY: Record<ChapterId, ChapterCopy> = {
  // Taught by the walkthrough's card; never shown in the drawer.
  founding: {
    title: 'Founding',
    objectives: {
      'site-founders-hall': 'Raise Founders Hall',
      'appoint-first-professor': 'Appoint the first professor',
      'found-first-program': 'Found the first program',
    },
  },
  'next-course': {
    title: 'The next course',
    objectives: {
      'develop-second-course': "Develop a program's second course",
      'run-at-double': 'Run the clock at double speed',
    },
    briefing: {
      what: `A program is ten courses, and the curriculum committee writes each one before it is taught. The committee writes ${COMMITTEE} courses at once, each over ten to fifteen weeks. A program's later courses open once its first is taught.`,
      how: [
        { text: "In the Curriculum, a program's row lists its courses: Develop starts one, with a professor to teach it.", door: 'curriculum', ringed: true },
        { text: "The lamps under the Curriculum button are the committee's seats, one lit for each course being written." },
        { text: 'The clock runs at double speed from its second button, or press 2. Space pauses it.' },
      ],
      why: [
        { system: 'Seats', text: `every course taught gives the catalog ${SEATS} places, and every student needs one` },
        { system: 'Faculty', text: 'a professor teaches every course, so a growing catalog needs a growing faculty' },
      ],
    },
  },
  'somewhere-to-sleep': {
    title: 'Somewhere to sleep',
    objectives: {
      'site-residence-hall': 'Site a residence hall',
      'site-dining-hall': 'Site a dining hall',
    },
    briefing: {
      what: 'Students need somewhere to sleep and somewhere to eat, and the campus has neither yet. A residence hall gives beds and a dining hall gives meals, each for a set number of students. Most students commute, but they still judge a campus by its beds and its meals.',
      how: [
        { text: 'The build menu rings the next residence hall: pick it up and set it down on clear ground.', door: 'build' },
        { text: 'Then the same for a dining hall.', door: 'build' },
        { text: 'The cost is paid when a building is placed; it opens when its weeks of building are done.' },
      ],
      why: [
        { system: 'Satisfaction', text: 'beds and meals are two of the needs that make the students content' },
        { system: 'Admissions', text: "content students speak well of the college, and next summer's applicants hear them" },
        { system: 'Prestige', text: 'a class that overruns its beds or its meals counts as crowding at the summer' },
      ],
    },
  },
  seats: {
    title: 'Seats for everyone',
    objectives: {
      'seat-every-student': 'Places for every student',
    },
    briefing: {
      what: `Every student needs a place in the catalog, and each course taught adds ${SEATS}. Until the catalog has a place for everyone, the classrooms are crowded.`,
      how: [
        { text: 'Develop more courses in the programs the college teaches, as many at once as the committee has seats.', door: 'curriculum' },
        { text: 'Found another program in a free slot of Founders Hall, with a professor to teach it.', door: 'hall', hallId: FOUNDERS_HALL_ID },
        { text: "Appoint a professor from the Faculty tab's market when a course has nobody to teach it.", door: 'faculty' },
      ],
      why: [
        { system: 'Prestige', text: `crowding, averaged over the year, takes up to ${CROWDING_PENALTY} points off prestige's target at the summer` },
        { system: 'Admissions', text: 'the summer admits no more students than the catalog has places for' },
      ],
    },
  },
  'paying-for-it': {
    title: 'Paying for it',
    objectives: {
      'open-treasury': 'Open the Treasury',
      'weekly-surplus': 'Take in more each week than the college spends',
    },
    briefing: {
      what: 'Tuition comes in every week, and salaries, upkeep and teaching go out every week. A building or a course is paid for in full when it starts. Cash under a term of expenses worries the board, and term after term of deficit walks the college down its scale, as far as a construction freeze.',
      how: [
        { text: "The funds figure on the dock opens the Treasury: the week's income and costs, line by line.", door: 'treasury' },
        { text: "When cash falls short of a building, the build menu offers a loan for the difference, repaid weekly." },
        { text: "The Treasury's board scale says where the books stand, from sound down to an interim CFO." },
      ],
      why: [
        { system: 'Building', text: 'every building and course is paid from cash, and a freeze stops them all' },
        { system: 'Faculty', text: 'salaries are paid every week, and every appointment adds one' },
        { system: 'Admissions', text: "tuition is most of the income, and each summer sets the next class's price" },
      ],
    },
  },
  'first-summer': {
    title: 'The first summer',
    objectives: {
      'set-first-class': "Set the first class's price and admit rate",
    },
    briefing: {
      what: "Week 52 is the summer, and the year stops there for three pages: the year in review with its report card, admissions, and the students' petitions. In admissions the price comes first, and it holds for that class's four years. The applicants it drew come next, then the share the college admits.",
      how: [
        { text: "Tuition: the slider says whether a price is in line with the college's standing. The applicants show only once it is set." },
        { text: 'Admit rate: every consequence shows before the choice, the places left in the catalog among them.' },
        { text: 'The report card grades each part of prestige, and shows the step prestige takes next.' },
      ],
      why: [
        { system: 'Treasury', text: "a class's tuition is income for four years, so a class admitted too small leaves four years short" },
        { system: 'Enrollment', text: 'the admit rate sets how many come, and a thin class thins the income and the classrooms both' },
        { system: 'Prestige', text: "the report card is prestige's verdict on the year, and next year starts from it" },
      ],
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
