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
import { FOUNDERS_HALL_ID } from './techData';
import { count, countWord } from '../format';
import { SEAT_SENIOR_YEARS } from './seatData';
import { GRADE_B } from './courseQuality';
import { AD_OFFER_COOLDOWN_YEARS, VARSITY_PETITION_MIN_TENURE_YEARS } from './studentLifeData';

export type ChapterId = 'founding' | 'next-course' | 'looking-around' | 'somewhere-to-sleep' | 'seats' | 'paying-for-it' | 'first-summer'
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
  // The drawer's paragraph under the title (Plan 112).
  about?: string;
  objectives: Record<string, string>;
  // Each objective's help and its Show me, by objective id (Plan 112).
  help?: Record<string, Lever>;
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
      'found-first-program': 'Found the first program',
    },
  },
  'next-course': {
    title: 'The next course',
    objectives: {
      'develop-second-course': "Start a program's second course",
      'run-at-double': 'Run the clock at double speed',
    },
    briefing: {
      what: `Each program has ten courses, and each one must be written before it can be taught. The curriculum committee writes ${COMMITTEE} at a time, and each takes ten to fifteen weeks. A program's later courses open once its first course is taught.`,
      how: [
        { text: 'In the Curriculum, find the program and click Develop on its next course. Then pick a professor to teach it.', door: 'curriculum', ringed: true },
        { text: 'Each lit lamp under the Curriculum button is a course being written.' },
        { text: 'Press 2, or click the second speed button, to run at double speed. Space pauses.' },
      ],
      why: [
        { system: 'Seats', text: `every course you teach gives ${SEATS} students a place in class, and every student needs one` },
        { system: 'Faculty', text: 'every course needs a professor, so more courses need more professors' },
      ],
    },
  },
  'looking-around': {
    title: 'Looking around',
    objectives: {
      'look-pan': 'Pan across the campus',
      'look-turn': 'Turn the view',
      'look-tilt': 'Tilt the view',
      'look-zoom': 'Zoom in or out',
      'look-home': 'Go back to the starting view',
    },
    briefing: {
      what: "You see the campus from one corner at a time, so tall buildings can hide what's behind them. You can pan, turn, tilt and zoom the view. Moving the view doesn't change anything on campus.",
      how: [
        { text: 'Pan with W, A, S and D, the arrow keys, or by dragging the map.' },
        { text: 'Turn the view with Q and E to see behind buildings.' },
        { text: 'Tilt with Z and X. Zoom with the scroll wheel.' },
        { text: 'Press Home to go back to the starting view.' },
      ],
      why: [
        { system: 'Building', text: 'turning the view shows the space behind tall buildings, and whether a path reaches it' },
        { system: 'Paths', text: 'a path hidden behind a building from one side is easy to see from another' },
      ],
    },
  },
  'somewhere-to-sleep': {
    title: 'Somewhere to sleep',
    objectives: {
      'site-residence-hall': 'Place a residence hall',
      'site-dining-hall': 'Place a dining hall',
    },
    briefing: {
      what: 'Your students need somewhere to sleep and somewhere to eat, and the campus has neither yet. A residence hall gives beds, and a dining hall serves meals, each for a set number of students. Most students commute, but they still judge the college by its beds and meals.',
      how: [
        { text: 'Open the build menu and click the ringed residence hall. Then click the map to place it.', door: 'build' },
        { text: 'Do the same with a dining hall.', door: 'build' },
        { text: 'You pay when you place a building. It opens when construction is finished.' },
      ],
      why: [
        { system: 'Satisfaction', text: 'beds and meals are two of the needs that keep students happy' },
        { system: 'Admissions', text: "happy students speak well of the college, and next summer's applicants listen" },
      ],
    },
  },
  seats: {
    title: 'Seats for everyone',
    objectives: {
      'seat-every-student': 'A place in class for every student',
    },
    briefing: {
      what: `Every student needs a place in class, and each course you teach adds ${SEATS} places. Students without a place are less happy.`,
      how: [
        { text: 'Develop more courses in your programs. The committee can write a few at once.', door: 'curriculum' },
        { text: 'Found another program in a free slot in Founders Hall. It needs a professor to teach it.', door: 'hall', hallId: FOUNDERS_HALL_ID },
        { text: 'If a course has nobody to teach it, hire a professor from the market in the Faculty tab.', door: 'faculty' },
      ],
      why: [
        { system: 'Satisfaction', text: 'class places are part of the academic need, so every student without one pulls it down' },
        { system: 'Admissions', text: 'the summer admits no more students than you have places for' },
      ],
    },
  },
  'paying-for-it': {
    title: 'Paying for it',
    objectives: {
      'open-treasury': 'Open the Treasury',
      'weekly-surplus': 'Earn more each week than you spend',
    },
    briefing: {
      what: 'Tuition comes in every week, and salaries, upkeep and teaching costs go out. You pay for a building or a course in full when you start it. If you keep losing money, the board steps in, and in the end it can stop all building.',
      how: [
        { text: 'Click your funds at the bottom of the screen to open the Treasury. It lists each week\'s income and costs.', door: 'treasury' },
        { text: "If you can't afford a building, the build menu offers a loan for the difference. You repay it weekly." },
        { text: 'The board scale in the Treasury shows how worried the board is, from sound down to an interim CFO.' },
      ],
      why: [
        { system: 'Building', text: 'buildings and courses are paid from cash, and a board freeze stops them all' },
        { system: 'Faculty', text: 'salaries are paid every week, and each new professor adds one' },
        { system: 'Admissions', text: "tuition is most of your income, and each summer you set the next class's price" },
      ],
    },
  },
  'first-summer': {
    title: 'The first summer',
    objectives: {
      'set-first-class': "Set the first class's tuition and admit rate",
    },
    briefing: {
      what: "Week 52 is the summer. The year pauses for three pages: the year in review, admissions, and the students' petitions. In admissions you set tuition first, and the new class pays that price for all four years.",
      how: [
        { text: "Tuition: the slider shows whether a price fits your college's standing. You see the applicants only after you set it." },
        { text: 'Admit rate: you see every result before you choose, including how many class places are left.' },
        { text: 'The report card grades each part of prestige, and shows where prestige goes next.' },
      ],
      why: [
        { system: 'Treasury', text: 'a class pays its tuition for four years, so a small class leaves you short for four years' },
        { system: 'Enrollment', text: 'the admit rate sets how many students come, and a small class means less income and emptier classrooms' },
        { system: 'Prestige', text: 'the report card judges the year, and prestige starts next year from it' },
      ],
    },
  },
  standing: {
    title: 'Standing',
    objectives: {
      'open-students': 'Open the Students tab',
      'open-history': 'Open History to see what prestige is made of',
      'satisfaction-60': 'Satisfaction at 60 or more',
      'prestige-rising': 'Prestige heading up',
    },
    briefing: {
      what: "Prestige is your college's reputation. Satisfaction is how happy your students are. Neither one jumps: each moves a little every week toward a target.",
      how: [
        { text: 'History shows where prestige is heading, and what each of its four pillars adds: academics, research, student life and athletics.', door: 'history' },
        { text: 'The Students tab shows the five needs, and which one pulls satisfaction down most.', door: 'students' },
        { text: 'Your endowment raises where prestige is heading, and run-down buildings lower it.' },
        { text: "You can't set either number. Raise the target, and the number follows." },
      ],
      why: [
        { system: 'Admissions', text: 'prestige draws applicants, and happy students tell others to come' },
        { system: 'Curriculum', text: 'the committee gets another seat at prestige 70, 80, 90 and 100' },
        { system: 'Prestige', text: "the year's average satisfaction is most of the student life pillar" },
        { system: 'Students', text: 'below 50 satisfaction some students leave each summer, and from year 3 below 60 brings demands' },
      ],
    },
  },
  'a-faculty': {
    title: 'A faculty',
    objectives: {
      'open-faculty': 'Open the Faculty tab',
      'every-program-staffed': 'Staff every program',
      'post-a-search': 'Post a search if the market has nobody in a field',
      'appoint-a-b': `Hire a professor with teaching ${GRADE_B} or more`,
    },
    briefing: {
      what: 'Each professor has a teaching score and a research score, both out of 100. Both grow over the years toward the potential the professor arrived with. A course with no professor goes dark, and so does its whole program.',
      how: [
        { text: "The market in the Faculty tab lists who you can hire. A course's grade follows its professor's teaching.", door: 'faculty' },
        { text: 'If nobody in a field is on the market, post a search. It costs two weeks of running costs and finds someone within half a year.', door: 'faculty' },
        { text: 'The rank beside a name, from Adjunct to Distinguished, is the average of the two scores.' },
        { text: 'Every course needs a professor in its field. Salaries rise with skill and seniority.' },
      ],
      why: [
        { system: 'Prestige', text: 'teaching quality is part of the academics pillar' },
        { system: 'Seats', text: 'a dark program loses its class places until someone teaches it again' },
        { system: 'Research', text: 'later, your labs use the research scores of these same professors' },
      ],
    },
  },
  'hall-of-its-own': {
    title: 'A hall of its own',
    objectives: {
      'site-academic-hall': 'Place an academic hall',
      'move-a-program': 'Move a program into it',
      'claim-a-hall': 'Put three programs from one school in one hall',
    },
    briefing: {
      what: "Founders Hall has six program slots, and each academic hall adds six more. When three programs from the same school share a hall, the hall becomes that school's. Six programs there found the school.",
      how: [
        { text: 'The first academic hall appears in the build menu once eight courses are taught.', door: 'build' },
        { text: 'To move a program, click the hall it is in, pick the program, and click Move to. It stops teaching for 4 weeks if it leaves Founders Hall, or 12 from any other hall.', door: 'hall', hallId: FOUNDERS_HALL_ID },
        { text: 'The Curriculum groups your programs by school.', door: 'curriculum' },
      ],
      why: [
        { system: 'Research', text: 'a founded school can build the first laboratory, which starts research' },
        { system: 'Administration', text: 'a founded school brings a Dean, and a free slot in Founders Hall can become an office' },
        { system: 'Prestige', text: 'more subjects, and fuller schools, raise the academics pillar' },
      ],
    },
  },
  'campus-life': {
    title: 'Campus life',
    objectives: {
      'site-student-center': 'Place the Student Center',
      'approve-a-club': 'Approve a club at the summer',
      'answer-a-matter': 'Answer a matter in the Inbox',
    },
    briefing: {
      what: "Students start clubs during the year, and you approve them all at once on the summer's last page. From now on the Inbox also collects matters for you to decide, and students make demands when satisfaction falls below 60. A matter you leave unanswered decides itself when its time runs out.",
      how: [
        { text: 'Place the Student Center from the build menu. It opens once you teach four programs.', door: 'build' },
        { text: 'The Inbox lists each matter, its choices and the weeks left to answer.', door: 'inbox' },
        { text: 'A demand names a building the students want, and a deadline. Meet it and satisfaction rises.' },
      ],
      why: [
        { system: 'Satisfaction', text: 'clubs and the Student Center feed the social need' },
        { system: 'Athletics', text: 'the first sport club you approve opens the Athletics tab' },
        { system: 'Identity', text: 'what your students do over the years becomes what the guidebooks say about you' },
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
      what: 'From the third summer, the board may offer you a promise in the year in review. Each one has a goal and a deadline, a reward if you keep it and a cost if you miss it. You can have up to three open at once, and a promise you decline stays away for a few years.',
      how: [
        { text: 'Accept the offer or let it pass in the year in review. The offer shows its terms.' },
        { text: 'History lists your open promises, their deadlines and how close each one is.', door: 'history' },
      ],
      why: [
        { system: 'Rewards', text: 'a kept promise pays its reward, and a missed one costs you, in the summer it falls due' },
        { system: 'Final Report', text: 'the fiftieth summer counts every promise you kept' },
      ],
    },
  },
  // Opens at the first varsity petition and walks the department in the
  // order it comes (Plan 112B): nothing asks for the Athletic Director
  // before a team exists to direct.
  'the-teams': {
    title: 'The teams',
    about: `A sport club has asked to go varsity. A varsity team plays a season against the other colleges, and the best reach the playoffs in week 47. It needs an Athletic Director over the department, a head coach, an assistant coach and a trainer, and a venue for its sport. Athletics is one of prestige's four pillars, and a title raises it for good.`,
    objectives: {
      'field-a-varsity-team': 'Field a varsity team',
      'appoint-athletic-director': 'Hire an Athletic Director',
      'staff-the-team': "Fill the team's three staff posts",
      'build-the-venue': "Build the team's venue",
    },
    help: {
      'field-a-varsity-team': {
        text: `When a sport club petitions to go varsity, choose Go varsity. If you turned it down, the club asks again in ${countWord(VARSITY_PETITION_MIN_TENURE_YEARS)} years, and nothing else in athletics can start until a team exists.`,
        door: 'athletics',
      },
      'appoint-athletic-director': {
        text: `You can't search for an Athletic Director yourself. The board sends you three candidates soon after your first team goes varsity, and not before, so this one may mean waiting. If you appoint nobody, the board tries again in ${countWord(AD_OFFER_COOLDOWN_YEARS)} years.`,
        door: 'athletics',
      },
      'staff-the-team': {
        text: "Every team needs a head coach, an assistant coach and a trainer. In the Athletics tab, open the team's card and click Hire on an empty post, then hire from the market below. An empty post weakens the team, and the tab's button shows ! until every post is filled.",
        door: 'athletics',
      },
      'build-the-venue': {
        text: "Going varsity adds the team's venue to the build menu. Open the build menu, click the ringed venue, and place it on the map. The team plays once it is built, and later teams of the same kind share it.",
        door: 'build',
        ringed: true,
      },
    },
  },
  'running-the-college': {
    title: 'Running the college',
    objectives: {
      'appoint-a-provost': 'Appoint a Provost',
      'open-an-office': 'Open an office in Founders Hall',
    },
    briefing: {
      what: 'Seats take routine decisions off your desk. The Provost, the Deans and the others each answer the matters in their area, following a policy you set. A seat and its salary are permanent, and a free slot in Founders Hall can hold an office that helps you for good.',
      how: [
        { text: `The seats are at the bottom of the Faculty tab. Hire from outside, or promote a professor with ${SEAT_SENIOR_YEARS} years' service for less.`, door: 'faculty' },
        { text: 'Click Founders Hall and pick a free slot to open an office.', door: 'hall', hallId: FOUNDERS_HALL_ID },
        { text: 'A Provost unlocks 4× speed. A Provost and three Deans unlock 8×.' },
      ],
      why: [
        { system: 'Inbox', text: 'each seat answers the matters in its area, so fewer reach you' },
        { system: 'The clock', text: 'you need the seats to run at 4× and 8× speed' },
        { system: 'Treasury', text: 'every seat and every open office costs something each week' },
      ],
    },
  },
  'the-long-game': {
    title: 'The long game',
    objectives: {
      'set-a-sweep': 'Set a standing sweep into the endowment',
      'full-upkeep': 'Pay full upkeep on your buildings',
      'found-a-school': 'Found a school',
    },
    briefing: {
      what: 'Cash earns nothing, and the guidebooks judge your finances by your endowment per student. The endowment pays a draw into your income every week. A standing sweep moves your cash above a reserve you choose into the endowment every quarter.',
      how: [
        { text: 'Set the sweep and the draw in the endowment panel of the Treasury.', door: 'treasury' },
        { text: 'Set how much upkeep you pay in the Buildings and grounds panel of the Treasury. Unpaid upkeep becomes a backlog.', door: 'treasury' },
        { text: 'Put six programs from one school in one hall to found the school.', door: 'curriculum' },
      ],
      why: [
        { system: 'Prestige', text: 'your endowment raises where prestige is heading, and run-down buildings lower it' },
        { system: 'Research', text: 'a founded school can build the first laboratory' },
        { system: 'Rankings', text: 'a college in the top 30 is offered a specialization, for good' },
      ],
    },
  },
  research: {
    title: 'Research',
    objectives: {
      'site-a-lab': 'Place a laboratory',
      'commission-research': 'Commission a research project',
      'answer-the-charter': 'Be offered a university charter',
    },
    briefing: {
      what: 'A founded school can build a laboratory. Each lab works on one research project at a time, with a topic, a team of professors and its funding. Once a lab is at work, the board offers to make your college a university.',
      how: [
        { text: 'A laboratory appears in the build menu once you found a school.', door: 'build' },
        { text: 'In the Research tab, pick an idle lab and commission a project. Choose the topic, the team and the funding.', door: 'research' },
        { text: 'A project takes from half a year to three years. It produces papers and grants, and now and then a breakthrough.' },
        { text: "A team's strength comes from its professors' research scores." },
      ],
      why: [
        { system: 'Prestige', text: "research is one of prestige's four pillars, and it has been empty until now" },
        { system: 'Treasury', text: 'grants pay back part of what a project costs' },
        { system: 'Faculty', text: 'a team has one to three professors, and their research decides what the project finds' },
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
      what: 'Each graduating class leaves feeling warm or cool toward your college, depending on how its four years went. The warmer a class feels, the more it gives to the annual fund. A campaign asks the alumni for one goal over several years, and only a VP of Advancement can run one.',
      how: [
        { text: 'Appoint a VP of Advancement from the seats at the bottom of the Faculty tab.', door: 'faculty' },
        { text: 'The alumni panel in History shows how warm each class feels and what it gave.', door: 'history' },
        { text: 'You can run one campaign at a time. Each one cools the alumni a little.' },
        { text: "Money a campaign raises can only go to the campaign's purpose." },
      ],
      why: [
        { system: 'Treasury', text: 'the annual fund and campaigns bring in money that tuition does not' },
        { system: 'Endowment', text: 'an endowment campaign grows the fund the guidebooks judge you by' },
        { system: 'Students', text: 'happy students now give more as alumni later' },
      ],
    },
  },
  'capital-projects': {
    title: 'Capital projects',
    objectives: {
      'begin-a-project': 'Begin a capital project',
    },
    briefing: {
      what: 'From year 10 the build menu offers capital projects, such as an arts center, a law school and a graduate college. Each costs millions and takes years to build. You can pay half the cost from the endowment, and several come with a graduate program of their own.',
      how: [
        { text: 'Open the Capital projects category in the build menu. It shows what each one costs, how long it takes and what it needs.', door: 'build' },
        { text: 'The endowment panel in the Treasury shows how much of the fund a project can use.', door: 'treasury' },
      ],
      why: [
        { system: 'Prestige', text: 'each pillar has a share that only its capital projects can fill' },
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
      what: "The board offers you a specialization the first time you reach the guide's top 30. From year 20, a top 10 place in any one pillar also counts. You choose one pillar (academics, research, student life or athletics), once and for good, and it opens a share of prestige, a building and a program that only that choice brings.",
      how: [
        { text: 'The guide in History shows your rank overall and in each pillar.', door: 'history' },
        { text: 'The offer has its own page, showing what each pillar would open.' },
        { text: 'Click "Not this year" to put the choice off for a year.' },
      ],
      why: [
        { system: 'Prestige', text: "each pillar's specialization share fills only if you choose that pillar" },
        { system: 'Rivals', text: 'the offer page says how many rivals have specialized in each pillar' },
      ],
    },
  },
};

// The drawer's own words (components/ObjectivesPanel.tsx).
export const OBJECTIVES_WORDS: Record<ObjectivesMode, string> = { guided: 'Guided', brief: 'Brief', off: 'Off' };
export const OBJECTIVES_MODES: readonly ObjectivesMode[] = ['guided', 'brief', 'off'];
export const OBJECTIVES_NOTES: Record<ObjectivesMode, string> = {
  guided: "Each new chapter's briefing opens on its own, once. Press J to open the objectives at any time.",
  brief: 'The objectives stay as one line at the bottom of the screen. Press J or click it to open them.',
  off: 'No chapters, and nothing waits for one. For this college, that stays true even if you turn chapters back on.',
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
  waitingOn: (title: string) => `${title} opens when you finish the chapter before it.`,
  allDone: 'Every chapter so far is done.',
  guide: 'Guide',
  guideList: 'Read again',
  back: 'Back to the objectives',
  guideTab: (tab: string) => `The Guide on ${tab}`,
  live: 'Now',
  prestigeNow: (now: string, target: string) => `Prestige ${now}, heading for ${target}`,
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
