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
import type { TabId } from '../components/TabNav';
import type { NextStep } from '../systems/guidance/nextStep';
import { SEATS_PER_COURSE } from '../systems/techtree/instructionCapacity';
import { COURSE_DEVELOPMENT_SLOTS } from '../systems/techtree/techSystem';
import { CROWDING_PENALTY } from '../systems/prestige/prestigeSystem';
import { FOUNDERS_HALL_ID } from './techData';
import { count, countWord } from '../format';
import { SEAT_SENIOR_YEARS } from './seatData';

export type ChapterId = 'founding' | 'next-course' | 'somewhere-to-sleep' | 'seats' | 'paying-for-it' | 'first-summer'
  | 'standing' | 'a-faculty' | 'hall-of-its-own' | 'campus-life' | 'promises'
  | 'the-teams' | 'running-the-college' | 'the-long-game'
  | 'research' | 'alumni' | 'capital-projects' | 'specialization';

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
  standing: {
    title: 'Standing',
    objectives: {
      'open-students': 'Open the Students tab',
      'open-history': "Open History, where prestige's make-up is",
      'satisfaction-60': 'Satisfaction at 60 or more',
      'prestige-rising': "Prestige's target above prestige",
    },
    briefing: {
      what: "Prestige is the college's name in the world, and satisfaction is how content its students are. Each drifts week by week toward a target. Prestige's target blends four pillars, academics, research, student life and athletics, with the endowment, less crowding and run-down buildings; both figures move slowly.",
      how: [
        { text: "History shows prestige's target and what makes up each pillar; the readout above gives each pillar's points now.", door: 'history' },
        { text: 'The Students tab shows the five needs and the one pulling satisfaction down most.', door: 'students' },
        { text: "Nobody sets either figure: the college raises a target, and the figure follows." },
      ],
      why: [
        { system: 'Admissions', text: 'prestige draws applicants, and content students tell the next class to come' },
        { system: 'Curriculum', text: 'the committee gains a seat at prestige 70, 80, 90 and 100' },
        { system: 'Prestige', text: "the year's average satisfaction is the heart of the student-life pillar" },
        { system: 'Students', text: 'under 50 satisfaction a share of each class leaves at the summer, and from year 3 under 60 brings demands' },
      ],
    },
  },
  'a-faculty': {
    title: 'A faculty',
    objectives: {
      'post-a-search': 'Post a search for a professor',
      'every-program-staffed': 'Every program staffed',
      'appoint-a-b': 'Appoint a professor who teaches at B or better',
    },
    briefing: {
      what: "Each professor teaches out of 100 and does research out of 100, and both grow with the years toward a potential set when they arrive. The rank beside a name, from Adjunct to Distinguished, only reads the average of the two. The market lists few people in a thin field, and an unstaffed course darkens its whole program.",
      how: [
        { text: "The Faculty tab's market lists who can be appointed; a course's grade follows its professor's teaching.", door: 'faculty' },
        { text: 'A search spends two weeks of running costs to turn somebody up in one field within half a year.', door: 'faculty' },
        { text: 'Salaries grow with skill and seniority, and every course needs a professor in its field.' },
      ],
      why: [
        { system: 'Prestige', text: 'teaching quality is one of the parts of the academics pillar' },
        { system: 'Seats', text: 'a dark program loses its places until somebody teaches it again' },
        { system: 'Research', text: 'later, the labs run on the research half of the same professors' },
      ],
    },
  },
  'hall-of-its-own': {
    title: 'A hall of its own',
    objectives: {
      'site-academic-hall': 'Site an academic hall',
      'move-a-program': 'Move a program into it',
      'claim-a-hall': 'Give a hall three programs of one school',
    },
    briefing: {
      what: "Founders Hall has six program slots, and each academic hall adds six more. When three programs of one school share a hall, that school claims the hall and gives it its name. Six programs together found the school.",
      how: [
        { text: 'The build menu lists the first academic hall once eight courses are taught.', door: 'build' },
        { text: "A program moves from its hall's panel: four weeks out of Founders Hall, twelve from anywhere else.", door: 'hall', hallId: FOUNDERS_HALL_ID },
        { text: 'The Curriculum groups the programs by school.', door: 'curriculum' },
      ],
      why: [
        { system: 'Research', text: 'a founded school opens the first laboratory, and with it research' },
        { system: 'Administration', text: 'a founded school brings a Dean, and a free slot in Founders Hall can become an office' },
        { system: 'Prestige', text: 'the breadth of the curriculum and the depth of its schools lead the academics pillar' },
      ],
    },
  },
  'campus-life': {
    title: 'Campus life',
    objectives: {
      'site-student-center': 'Site the Student Center',
      'approve-a-club': 'Approve a club at the summer',
      'answer-a-matter': 'Answer a matter in the Inbox',
    },
    briefing: {
      what: "Students start clubs and petition for them through the year, and the summer's last page answers every petition together. From now on the Inbox also gathers matters to decide, and the students make demands when their satisfaction falls under 60. A matter left unanswered decides itself after four weeks.",
      how: [
        { text: 'The Student Center opens once the college teaches four programs: site it from the build menu.', door: 'build' },
        { text: 'The Inbox lists each matter with its choices and its weeks left.', door: 'inbox' },
        { text: "A demand names what the students want built and by when; meeting it lifts satisfaction." },
      ],
      why: [
        { system: 'Satisfaction', text: 'clubs and the Student Center feed the social need' },
        { system: 'Athletics', text: 'the first sport club approved opens the Athletics tab' },
        { system: 'Identity', text: 'what the students do for years becomes what the guidebooks say about the college' },
      ],
    },
  },
  promises: {
    title: 'Promises',
    objectives: {
      'third-summer': 'Reach the third summer',
      'make-a-promise': 'Make the board a promise',
    },
    briefing: {
      what: "From the third summer the board may offer a promise at the year's review: a goal, a date, a reward if kept and a cost if missed. Up to three can be open at once, and a declined promise rests for a few years.",
      how: [
        { text: "The summer's Review page shows the offer with its terms; accept it or let it pass." },
        { text: 'History lists open promises with their dates and how far each has come.', door: 'history' },
      ],
      why: [
        { system: 'Rewards', text: 'a kept promise pays its reward, and a missed one costs, the summer it falls due' },
        { system: 'Final Report', text: 'the fiftieth summer counts every promise kept' },
      ],
    },
  },
  'the-teams': {
    title: 'The teams',
    objectives: {
      'appoint-athletic-director': 'Appoint an athletic director',
      'field-a-varsity-team': 'Field a varsity team',
    },
    briefing: {
      what: "A sport club the students run can petition to become a varsity team, with a budget and a venue. Varsity teams play their seasons through the year, and the strongest reach the playoffs in week 47. An athletic director runs the department: the coaches, and the order the fund pays the programs in.",
      how: [
        { text: 'The Athletics tab lists the clubs, the teams and their venues.', door: 'athletics' },
        { text: 'Drag the programs in the priority list: the first are the flagships, and the fund pays their whole cost.', door: 'athletics' },
        { text: "Coaches come from the Athletics tab's own market, apart from the faculty's." },
      ],
      why: [
        { system: 'Prestige', text: "athletics is one of prestige's four pillars, and a title lifts it for good" },
        { system: 'Admissions', text: "a title swells the next few summers' applicant pools" },
        { system: 'Rivals', text: 'the old athletic powers keep an edge in the postseason, so titles come slowly at first' },
      ],
    },
  },
  'running-the-college': {
    title: 'Running the college',
    objectives: {
      'appoint-a-provost': 'Appoint a Provost',
      'open-an-office': 'Open an office in Founders Hall',
    },
    briefing: {
      what: "A seat takes a domain's routine off the President's desk: the Provost, the Deans and the rest each answer the matters in their domain by a policy the President sets. A seat is for good, and so is its salary. A free program slot in Founders Hall can hold an office instead, each with its own lasting help.",
      how: [
        { text: `The foot of the Faculty tab lists the seats: hire from outside, or promote a professor of ${SEAT_SENIOR_YEARS} years for less.`, door: 'faculty' },
        { text: "A free slot in Founders Hall's panel can open an office.", door: 'hall', hallId: FOUNDERS_HALL_ID },
        { text: 'With a Provost the clock runs at four times speed; with a Provost and three Deans, at eight.' },
      ],
      why: [
        { system: 'Inbox', text: 'a seat answers the matters in its domain, so fewer reach the President' },
        { system: 'The clock', text: 'four and eight times speed wait for the seats' },
        { system: 'Treasury', text: 'every seat and every open office costs something each week' },
      ],
    },
  },
  'the-long-game': {
    title: 'The long game',
    objectives: {
      'set-a-sweep': 'Set a standing sweep into the endowment',
      'full-upkeep': "Pay the buildings' full upkeep",
      'found-a-school': 'Found a school',
    },
    briefing: {
      what: "Cash earns nothing, and the guide judges a college's money by its endowment per student. The endowment pays a draw into income every week, and a standing sweep moves cash above a reserve into it at each quarter's close. Ahead lie the first school, research and the rankings.",
      how: [
        { text: "The Treasury's endowment panel sets the sweep and the draw.", door: 'treasury' },
        { text: "The Treasury's estate panel sets how much of the buildings' upkeep is paid; what goes unpaid becomes a backlog.", door: 'treasury' },
        { text: 'Six programs of one school in one hall found the school.', door: 'curriculum' },
      ],
      why: [
        { system: 'Prestige', text: "the endowment counts toward prestige's target, and run-down buildings are taken off it" },
        { system: 'Research', text: 'a founded school opens the first laboratory' },
        { system: 'Rankings', text: 'a college in the top 30 is offered a specialization, for good' },
      ],
    },
  },
  research: {
    title: 'Research',
    objectives: {
      'site-a-lab': 'Site a laboratory',
      'commission-research': 'Commission a research project',
      'answer-the-charter': 'Answer the board on the university charter',
    },
    briefing: {
      what: "A founded school can build a laboratory, and each laboratory works on one research project at a time: a topic, a team drawn from the faculty, and its funding. A project runs from half a year to three, and ends in papers, grants and, now and then, a breakthrough. Once a laboratory is at work, the board offers the college a university's name.",
      how: [
        { text: 'The build menu lists a laboratory once a school is founded.', door: 'build' },
        { text: 'The Research tab commissions a project in an idle laboratory: choose the topic, the team and the funding.', door: 'research' },
        { text: 'A team draws on the research half of its professors, the figure beside their teaching.' },
      ],
      why: [
        { system: 'Prestige', text: "research is one of prestige's four pillars, and the empty one until now" },
        { system: 'Treasury', text: 'grants pay back part of what a project costs' },
        { system: 'Faculty', text: "a project's team is one to three professors, and their research decides what it finds" },
      ],
    },
  },
  alumni: {
    title: 'The alumni',
    objectives: {
      'appoint-advancement': 'Appoint a VP of Advancement',
      'run-a-campaign': 'Run a campaign',
    },
    briefing: {
      what: "Every graduating class leaves warm or cool toward the college, by how its four years went, and gives to the annual fund by that warmth. A campaign asks the alumni for one thing over several years, and only a VP of Advancement can run one. What a campaign raises goes to its purpose and nothing else.",
      how: [
        { text: 'The foot of the Faculty tab lists the seats: the VP of Advancement is one.', door: 'faculty' },
        { text: "History's record shows each class's warmth and what the alumni gave.", door: 'history' },
        { text: 'Campaigns run one at a time, and each cools the alumni a little.' },
      ],
      why: [
        { system: 'Treasury', text: 'the annual fund and the campaigns are income no tuition brings' },
        { system: 'Endowment', text: 'an endowment campaign grows the fund the guide judges the college by' },
        { system: 'Students', text: "today's contentment is tomorrow's giving" },
      ],
    },
  },
  'capital-projects': {
    title: 'Capital projects',
    objectives: {
      'begin-a-project': 'Begin a capital project',
    },
    briefing: {
      what: "From year 10 the build menu offers capital projects: an arts center, a law school, a graduate college and more, each years in the building and costing millions. Half of one can be paid from the endowment. Several house a graduate program of their own.",
      how: [
        { text: "The build menu's capital projects category lists each, with its cost, its weeks and what it needs.", door: 'build' },
        { text: "The Treasury's endowment panel shows how much of the fund a project can draw on.", door: 'treasury' },
      ],
      why: [
        { system: 'Prestige', text: 'each pillar has a share that only its capital projects fill' },
        { system: 'Curriculum', text: 'a graduate program opens with the project that houses it' },
      ],
    },
  },
  specialization: {
    title: 'A specialization',
    objectives: {
      'offered-specialization': 'Be offered a specialization',
      'choose-specialization': 'Choose one',
    },
    briefing: {
      what: "When the college first stands in the guide's top 30, or from year 20 in the top 10 of any one pillar, the board offers it a specialization: academics, research, student life or athletics, chosen once and for good. The chosen pillar's own share of prestige opens, with a building and a program only that choice brings. The choice can be put off a year at a time.",
      how: [
        { text: "History's guide shows the college's rank overall and in each pillar.", door: 'history' },
        { text: 'The offer comes as a page of its own, each pillar with what it would open; "Not this year" puts it off.' },
      ],
      why: [
        { system: 'Prestige', text: "each pillar's specialization share fills only for the pillar chosen" },
        { system: 'Rivals', text: 'the offer page says how many rivals have specialized in each pillar' },
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
  off: 'No chapters: the ticker as it was before, and nothing waits for a chapter (for this college, even if they are turned back on).',
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
  guide: 'Guide',
  guideList: 'Read again',
  back: 'Back to the objectives',
  guideTab: (tab: string) => `The Guide on ${tab}`,
  live: 'Now',
  prestigeNow: (now: string, target: string) => `Prestige ${now}, its target ${target}`,
  pillars: 'Its pillars',
  pillar: (label: string, has: string, of: string) => `${label} ${has} of ${of}`,
  takenOff: 'Taken off',
  satisfactionNow: (now: string) => `Satisfaction ${now}.`,
  drag: (need: string) => `${need} is pulling it down most.`,
};

// THE GUIDE (Plan 106 PR G): each tab's "Guide" button opens the briefing
// of the chapter that introduced its system, once that chapter has opened.
// A tab with no chapter yet (Research, until PR H) has no button.
export const TAB_GUIDE: Partial<Record<TabId, ChapterId>> = {
  curriculum: 'next-course',
  faculty: 'a-faculty',
  students: 'standing',
  history: 'standing',
  treasury: 'paying-for-it',
  inbox: 'campus-life',
  athletics: 'the-teams',
  research: 'research',
};
