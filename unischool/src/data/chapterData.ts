// The objectives' words (Plan 106). Each chapter is one season's lesson in
// the first five years: a title, and the objectives the player is set, each
// a goal rather than an instruction, met however the player gets there.
// The order, the dates and what counts as met are state/chapters.ts's.
//
// The drawer shows a chapter as its title, a short paragraph about the
// system (`about`), and the objectives, each with a (?) that opens its
// help: how to meet it, and a Show me that takes the player there (Plan
// 112A, in place of Plan 106's briefing of what, how and why). The rules
// for writing one are Plan 106 §5's: no more than three sentences of
// about; say what a number adds to; name the actor first, and never end on
// a passive and a pronoun. Every objective has help.

import type { ObjectivesMode } from '../settings';
import type { TabId } from '../components/TabNav';
import type { NextStep } from '../systems/guidance/nextStep';
import { SEATS_PER_COURSE } from '../systems/techtree/instructionCapacity';
import { COURSE_DEVELOPMENT_SLOTS, FOUNDERS_MOVE_WEEKS, RELOCATION_WEEKS } from '../systems/techtree/techSystem';
import { FIRST_HALL_COURSE_GATE, FOUNDERS_HALL_ID, MAJOR_COURSE_COUNT, TIER_DURATION_WEEKS } from './techData';
import { count, countWord, durationWords, weeksProse } from '../format';
import { WEEKS_PER_YEAR } from '../state/types';
import { DEMAND_FIRST_YEAR, DEMAND_SATISFACTION_THRESHOLD } from './demandData';
import { ATTRITION_SATISFACTION_LINE } from '../systems/admissions/admissionsSystem';
import { SEARCH_COST_WEEKS, SEARCH_WEEKS } from '../systems/faculty/facultySearch';
import { PLAYOFF_WEEK } from '../systems/athletics/playoffs';
import { SPECIALIZATION_MILESTONE_RANK, SPECIALIZATION_PILLAR_YEAR } from '../systems/prestige/prestigeSystem';
import { pillarRouteWords, satisfactionRouteWords } from './prestigeWords';
import { INITIATIVE_DEPTHS } from './researchData';
import { PROJECTS } from './projectData';
import { SEAT_SENIOR_YEARS } from './seatData';
import { GRADE_B } from './courseQuality';
import { PARK_RESEARCH_BOOST } from './researchParkData';
import { AD_OFFER_COOLDOWN_YEARS } from './studentLifeData';
import { milestoneForTab } from './ladderData';

export type ChapterId = 'founding' | 'next-course' | 'looking-around' | 'somewhere-to-sleep' | 'seats' | 'paying-for-it' | 'first-summer'
  | 'standing' | 'a-faculty' | 'hall-of-its-own' | 'campus-life'
  | 'the-teams' | 'running-the-college'
  | 'research' | 'alumni' | 'capital-projects' | 'specialization' | 'research-park';

// The capital projects any college may build, as the build menu offers
// them: the first year one opens, and the year the rest have (Plan 114A).
const OPEN_PROJECTS = PROJECTS.filter((p) => !p.project.specialization && !p.project.late);
const PROJECTS_FIRST_YEAR = Math.min(...OPEN_PROJECTS.map((p) => p.project.fromYear));
const PROJECTS_LATER_YEAR = Math.max(...OPEN_PROJECTS.map((p) => p.project.fromYear));

// Where a Show me goes: the NEXT line's own doors.
export type Door = NonNullable<NextStep['go']>;

export interface Lever {
  text: string;
  // The view its Show me opens; `ringed` opens it on what the chapter
  // rings (state/chapters.ts's ringedProgram), `hallId` on that hall, and
  // `view` on that view of the Treasury (Plan 114F).
  door?: Door;
  ringed?: true;
  hallId?: string;
  view?: TreasuryView;
}

// The Treasury's views (TreasuryTab.tsx), which a door can open it on.
export type TreasuryView = 'budget' | 'endowment' | 'estate';

export interface ChapterCopy {
  title: string;
  // The drawer's paragraph under the title (was the briefing's `what`).
  about?: string;
  objectives: Record<string, string>;
  // Each objective's help, behind its (?) button: how to meet it, and
  // where its Show me goes.
  help?: Record<string, Lever>;
}

const SEATS = count(SEATS_PER_COURSE);
const COMMITTEE = countWord(COURSE_DEVELOPMENT_SLOTS);

// The curriculum's milestones (Plan 112A): a player busy elsewhere can let
// the committee sit idle for years, and every course left unwritten is
// seats, prestige and tuition not had. Three chapters across years 2 to 4
// each ask for a count of courses taught (state/chapters.ts). The first is
// the count that opens the first academic hall, which the chapter after it
// teaches; the others sit a little under what a player who keeps the
// committee writing has by then (npm run natural: 16 near the end of year
// 3, 22 to 24 by the end of year 4), and well over what one who doesn't
// has (the guided player, which develops only when the line asks: 12 to
// 15 at the middle of year 4).
export const COURSE_MILESTONES = { 'a-faculty': FIRST_HALL_COURSE_GATE, 'campus-life': 16, 'running-the-college': 24 } as const;
export const teachObjective = (n: number) => `teach-${n}-courses`;
const teachWords = (n: number) => `Teach ${count(n)} courses`;
const teachHelp = (more = ''): Lever => ({
  text: `Every course you teach gives ${SEATS} students a place in class. It widens the curriculum that prestige counts, and makes room for a bigger class paying tuition. The committee develops ${COMMITTEE} at a time, so keep it writing.${more}`,
  door: 'curriculum',
});

// Help that reads the college (state/chapters.ts's objectiveHelp): while
// the first academic hall is still locked, its objective's help says what
// opens it, and its Show me goes to the Curriculum.
export const HALL_LOCKED_HELP: Lever = {
  text: `The first academic hall appears in the build menu once ${count(FIRST_HALL_COURSE_GATE)} courses are taught. Develop more in the Curriculum.`,
  door: 'curriculum',
};

// While the program's first course is still being written, the second can't
// start (Plan 118E, I7): its help says to wait, and how long, before it
// says where to click.
export function secondCourseWaitHelp(code: string, weeksLeft: number): Lever {
  return {
    text: `${code} is still being written, with ${weeksProse(weeksLeft)} to go. Once it's taught, open the Curriculum and click Develop on the program's next course.`,
    door: 'curriculum',
  };
}

export const CHAPTER_COPY: Record<ChapterId, ChapterCopy> = {
  // Taught by the walkthrough's card; never shown in the drawer.
  founding: {
    title: 'Founding',
    objectives: {
      'site-founders-hall': 'Raise Founders Hall',
      'found-first-program': 'Found the first program',
    },
    help: {
      'site-founders-hall': { text: 'Open the build menu, click Founders Hall, then click anywhere on the map to place it.', door: 'build' },
      'found-first-program': { text: 'Click Founders Hall on the map and found a program in a free slot.', door: 'hall', hallId: FOUNDERS_HALL_ID },
    },
  },
  'next-course': {
    title: 'The next course',
    about: `Each program has ${countWord(MAJOR_COURSE_COUNT)} courses, and the curriculum committee writes them ${COMMITTEE} at a time. An entry course takes about ${TIER_DURATION_WEEKS[1]} weeks to write, and a capstone about ${TIER_DURATION_WEEKS[4]}. A program's later courses open once its first course is taught.`,
    objectives: {
      'develop-second-course': "Start a program's second course",
      'run-at-double': 'Run the clock at double speed',
    },
    help: {
      'develop-second-course': { text: 'In the Curriculum, find the program and click Develop on its next course. Then pick a professor to teach it. Each lit lamp under the Curriculum button is a course being written.', door: 'curriculum', ringed: true },
      'run-at-double': { text: 'Press 2, or click the double-arrow button, to run at double speed. Space pauses.' },
    },
  },
  'looking-around': {
    title: 'Looking around',
    about: "You see the campus from one corner at a time, so tall buildings can hide what's behind them. You can pan, turn, tilt and zoom the view. Moving the view doesn't change anything on campus.",
    objectives: {
      'look-pan': 'Pan across the campus',
      'look-turn': 'Turn the view',
      'look-tilt': 'Tilt the view',
      'look-zoom': 'Zoom in or out',
      'look-home': 'Go back to the starting view',
    },
    help: {
      'look-pan': { text: 'Pan with W, A, S and D, the arrow keys, or by dragging the map.' },
      'look-turn': { text: 'Turn the view with Q and E to see behind buildings.' },
      'look-tilt': { text: 'Tilt the view with Z and X.' },
      'look-zoom': { text: 'Zoom with the scroll wheel.' },
      'look-home': { text: 'Press Home to go back to the starting view.' },
    },
  },
  'somewhere-to-sleep': {
    title: 'Somewhere to sleep',
    about: 'A residence hall gives beds, and a dining hall serves meals, each for a set number of students. Most students commute, but they still judge the college by its beds and meals. Students walk on paths where they can, so lay one between your buildings.',
    objectives: {
      'site-residence-hall': 'Place a residence hall',
      'site-dining-hall': 'Place a dining hall',
      'path-to-founders': 'Lay a path from the residence hall to Founders Hall',
    },
    help: {
      'site-residence-hall': { text: 'Open the build menu and click the ringed residence hall. Then click the map to place it. You pay when you place a building, and it opens when construction is finished.', door: 'build' },
      'site-dining-hall': { text: 'Open the build menu, click a dining hall, then click the map to place it.', door: 'build' },
      // The two buildings, not the founding drive, which nothing a player
      // reads names (Plan 115D); a path that joins the drive still counts.
      'path-to-founders': { text: 'Open the build menu and click Paths. Drag a path from the residence hall to Founders Hall. Paths are free.', door: 'build' },
    },
  },
  seats: {
    title: 'Seats for everyone',
    about: `Every student needs a place in class, and each course you teach adds ${SEATS} places. Students without a place are less happy, and the summer admits no more students than you have places for.`,
    objectives: {
      'seat-every-student': 'A place in class for every student',
    },
    help: {
      'seat-every-student': { text: `Develop more courses in the Curriculum. The committee writes ${COMMITTEE} at a time. You can also found another program in a free slot in Founders Hall. If a course has nobody to teach it, hire a professor from the market in the Faculty tab.`, door: 'curriculum' },
    },
  },
  'paying-for-it': {
    title: 'Paying for it',
    about: 'Tuition comes in every week, and salaries, upkeep and teaching costs go out. You pay for a building or a course in full when you start it. If you keep losing money, the board steps in, and in the end it can stop all building.',
    objectives: {
      'open-treasury': 'Open the Treasury',
      'weekly-surplus': 'Earn more each week than you spend',
    },
    help: {
      'open-treasury': { text: "Click your funds at the bottom of the screen to open the Treasury. It lists each week's income and costs. It also shows how the board rates your finances.", door: 'treasury' },
      'weekly-surplus': { text: "Tuition is most of your income, and each summer you set the next class's price. If you can't afford a building, the build menu offers a loan for the difference, repaid weekly.", door: 'treasury' },
    },
  },
  'first-summer': {
    title: 'The first summer',
    about: `At week ${WEEKS_PER_YEAR} the clock stops for the summer, and waits until you open it from the note above the clock. It has three pages: the year in review, admissions, and the students' petitions. In admissions you set tuition first, and the new class pays that price for all four years.`,
    objectives: {
      'set-first-class': "Set the first class's tuition and admit rate",
    },
    help: {
      'set-first-class': { text: "Tuition: the slider shows whether a price fits your college's standing, and you see the applicants only after you set it. Admit rate: drag the line's handle up to be more selective, or down to admit more. You see every result before you choose, including how many class places are left. The report card grades each part of prestige." },
    },
  },
  standing: {
    title: 'Standing',
    about: "Prestige is your college's reputation, and satisfaction is how happy your students are. Neither one jumps. Each moves a little at a time.",
    objectives: {
      'open-students': 'Open the Students tab',
      'open-history': 'Open History to see what prestige is made of',
      'satisfaction-60': `Satisfaction at ${DEMAND_SATISFACTION_THRESHOLD} or more`,
      'prestige-rising': 'Prestige rising',
    },
    help: {
      'open-students': { text: 'The Students tab shows the five needs, and which one pulls satisfaction down most.', door: 'students' },
      'open-history': { text: 'History shows where prestige is heading, and what each of its four pillars adds: academics, research, student life and athletics.', door: 'history' },
      'satisfaction-60': { text: `You can't set satisfaction. Raise the need that pulls it down most, and the number follows. Below ${ATTRITION_SATISFACTION_LINE}, some students leave each summer, and from year ${DEMAND_FIRST_YEAR} below ${DEMAND_SATISFACTION_THRESHOLD} brings demands.`, door: 'students' },
      'prestige-rising': { text: 'Your endowment and the four pillars lift prestige, and run-down buildings pull it down. History › Prestige shows which way it is heading and what each pillar adds.', door: 'history' },
    },
  },
  'a-faculty': {
    title: 'A faculty',
    about: 'Each professor has a teaching score and a research score, both out of 100. Both grow over the years toward the potential the professor arrived with. A course with no professor goes dark, and so does its whole program.',
    objectives: {
      'open-faculty': 'Open the Faculty tab',
      'every-program-staffed': 'Staff every program',
      [teachObjective(COURSE_MILESTONES['a-faculty'])]: teachWords(COURSE_MILESTONES['a-faculty']),
      'post-a-search': 'Post a search if the market has nobody in a field',
      'appoint-a-b': `Hire a professor with teaching ${GRADE_B} or more`,
    },
    help: {
      'open-faculty': { text: 'The Faculty tab lists your professors and the market. The rank beside a name, from Adjunct to Distinguished, is the average of the two scores.', door: 'faculty' },
      'every-program-staffed': { text: 'Every course needs a professor in its field. Hire one from the market in the Faculty tab.', door: 'faculty' },
      [teachObjective(COURSE_MILESTONES['a-faculty'])]: teachHelp(' The eighth opens your first academic hall.'),
      'post-a-search': { text: `If nobody in a field is on the market, post a search in the Faculty tab. It costs as much as ${countWord(SEARCH_COST_WEEKS)} weeks of running the college. For ${durationWords(SEARCH_WEEKS)}, a candidate in that field is much more likely to turn up.`, door: 'faculty' },
      'appoint-a-b': { text: 'The grade of a course follows the teaching of its professor. Salaries rise with skill and seniority.', door: 'faculty' },
    },
  },
  'hall-of-its-own': {
    title: 'A hall of its own',
    // The letters "Moving in", "A school takes shape" and "A second school"
    // said this (Plan 112A).
    about: 'Founders Hall has six program slots, and each academic hall adds six more. When three programs from one school share a hall, the school claims it, and its free slots then offer only programs of that school. Six programs there found the school, and the hall takes its name.',
    objectives: {
      'site-academic-hall': 'Place an academic hall',
      'move-a-program': 'Move a program into it',
      'claim-a-hall': 'Put three programs from one school in one hall',
    },
    help: {
      'site-academic-hall': { text: 'The build menu rings your first academic hall in its Academic category. Click the hall, then click the map to place it.', door: 'build' },
      'move-a-program': { text: `Found a program in the new hall's free slot, or move one in. To move one, click the hall it is in, pick the program, and click the hall to move it to. A program leaving Founders Hall stops teaching for ${count(FOUNDERS_MOVE_WEEKS)} weeks, and one moving between other halls for ${count(RELOCATION_WEEKS)}.`, door: 'hall', hallId: FOUNDERS_HALL_ID },
      'claim-a-hall': { text: "Three programs from one school in one hall make it that school's hall. Six found the school, and each school after it grows the same way in a hall of its own. The Curriculum groups your programs by school.", door: 'curriculum' },
    },
  },
  'campus-life': {
    title: 'Campus life',
    about: `Students start clubs during the year, and you approve them all at once on the summer's last page. From now on the Inbox also collects matters for you to decide, and students make demands when satisfaction falls below ${DEMAND_SATISFACTION_THRESHOLD}. A matter you leave unanswered decides itself when its time runs out.`,
    objectives: {
      'site-student-center': 'Place the Student Center',
      [teachObjective(COURSE_MILESTONES['campus-life'])]: teachWords(COURSE_MILESTONES['campus-life']),
      'approve-a-club': 'Approve a club at the summer',
      'answer-a-matter': 'Answer a matter in the Inbox',
    },
    help: {
      'site-student-center': { text: 'Place the Student Center from the build menu. It opens once you teach four programs.', door: 'build' },
      [teachObjective(COURSE_MILESTONES['campus-life'])]: teachHelp(),
      'approve-a-club': { text: "The clubs your students started wait on the summer's last page. Approve them there, and they feed the social need." },
      'answer-a-matter': { text: 'The Inbox lists each matter, its choices and the weeks left to answer. A demand names a building the students want, and a deadline. Meet it and satisfaction rises.', door: 'inbox' },
    },
  },
  // Opens with the first varsity team (Plan 114E: it opened at the petition,
  // turned down or not) and walks the department in the order it comes
  // (Plan 112B). The posts and the venues count every team, so the words
  // say every team's (Plan 114E: "the team's three posts" read 0/6 with two).
  'the-teams': {
    title: 'The teams',
    about: `A sport club has gone varsity. A varsity team plays a season against the other colleges, and the best reach the playoffs in week ${PLAYOFF_WEEK}. It needs an Athletic Director over the department, a head coach, an assistant coach, a trainer, and a venue for its sport.`,
    objectives: {
      'appoint-athletic-director': 'Hire an Athletic Director',
      'staff-the-team': "Fill every team's staff posts",
      'build-the-venue': "Build every team's venue",
    },
    help: {
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
    about: 'Seats take routine decisions off your desk. The Provost, the Deans and the others each answer the matters in their area, following a policy you set. A seat and its salary are permanent, and a free slot in Founders Hall can hold an office that helps you for good.',
    objectives: {
      'appoint-a-provost': 'Appoint a Provost',
      [teachObjective(COURSE_MILESTONES['running-the-college'])]: teachWords(COURSE_MILESTONES['running-the-college']),
      'open-an-office': 'Open an office in Founders Hall',
    },
    help: {
      'appoint-a-provost': { text: `The seats are at the bottom of the Faculty tab. Hire from outside, or promote a professor with ${SEAT_SENIOR_YEARS} years' service for less. A Provost unlocks 4× speed, and a Provost and three Deans unlock 8×.`, door: 'faculty' },
      [teachObjective(COURSE_MILESTONES['running-the-college'])]: teachHelp(),
      'open-an-office': { text: 'Click Founders Hall and pick a free slot to open an office. Every open office costs something each week.', door: 'hall', hallId: FOUNDERS_HALL_ID },
    },
  },
  research: {
    title: 'Research',
    // With the letter "The laboratories" (Plan 112A).
    about: 'A founded school can build a laboratory. Each lab works on one research project at a time, with a topic, a team of professors and its funding. Once a lab is at work, the board offers to make your college a university.',
    objectives: {
      'site-a-lab': 'Place a laboratory',
      'commission-research': 'Commission a research project',
    },
    help: {
      'site-a-lab': { text: 'A laboratory appears in the build menu once you found a school. Click it, then click the map to place it.', door: 'build' },
      'commission-research': { text: `In the Research tab, pick an idle lab and commission a project. Choose the topic, a team of one to three professors, and the funding. A team's strength comes from its professors' research scores. A project takes from ${durationWords(INITIATIVE_DEPTHS[0].weeks)} to ${durationWords(INITIATIVE_DEPTHS[2].weeks)}, and produces papers, grants and now and then a breakthrough. The deepest work, Landmark research, needs the Research Park, which only a college that specializes in research can build.`, door: 'research' },
    },
  },
  alumni: {
    title: 'The alumni',
    about: 'Each graduating class leaves feeling warm or cool toward your college, depending on how its four years went. The warmer a class feels, the more it gives to the annual fund. A campaign asks the alumni for one goal over several years, and only a VP of Advancement can run one.',
    objectives: {
      'appoint-advancement': 'Appoint a VP of Advancement',
      'run-a-campaign': 'Run a campaign',
    },
    help: {
      'appoint-advancement': { text: 'Appoint a VP of Advancement from the seats at the bottom of the Faculty tab.', door: 'faculty' },
      'run-a-campaign': { text: 'Launch a campaign from the Advancement panel in the Treasury. You can run one at a time, and each one makes the alumni a little less warm toward the college. The money it raises can only be spent on what the campaign is for.', door: 'treasury', view: 'endowment' },
    },
  },
  'capital-projects': {
    title: 'Capital projects',
    about: `From year ${PROJECTS_FIRST_YEAR}, the build menu offers capital projects, the arts center first and more by year ${PROJECTS_LATER_YEAR}. Each one opens once its school's courses are all taught, so the Arts Center waits for every Arts & Media course. Each costs millions and takes years to build, and you can pay half from the endowment.`,
    objectives: {
      'begin-a-project': 'Begin a capital project',
    },
    help: {
      'begin-a-project': { text: 'Open the Capital projects category in the build menu. A project you can\'t build yet is greyed out, and says what opens it. The Curriculum shows which courses you still need to teach. The endowment panel in the Treasury shows how much of the fund a project can use.', door: 'build' },
    },
  },
  specialization: {
    title: 'A specialization',
    about: `The board offers you a specialization the first time you reach the guide's top ${SPECIALIZATION_MILESTONE_RANK}. You choose academics, research, student life or athletics, once and for good. The choice opens a share of prestige, a building and a program of its own.`,
    objectives: {
      'offered-specialization': 'Be offered a specialization',
      'choose-specialization': 'Choose one',
    },
    help: {
      // The later routes (Plan 95R; Plan 116C's satisfaction), in prestigeWords.ts's words.
      'offered-specialization': { text: `From year ${SPECIALIZATION_PILLAR_YEAR}, ${pillarRouteWords()} also counts. So does ${satisfactionRouteWords()}. The guide in History shows your rank overall and in each pillar.`, door: 'history' },
      'choose-specialization': { text: 'The offer has its own page, showing what each pillar would open. Click "Not this year" to put the choice off for a year.' },
    },
  },
  // The letter "The Research Park", as a side chapter (Plan 112A).
  'research-park': {
    title: 'The Research Park',
    about: 'You specialized in research, and the board has found the land for the Research Park, where faculty and industry work side by side. Once it stands, any lab can take on Landmark research, the deepest and most expensive work a university does, and the kind that wins prizes. Landmark work fills research\'s specialization share.',
    objectives: {
      'site-research-park': 'Place the Research Park',
    },
    help: {
      'site-research-park': { text: `Find the Research Park among the capital projects in the build menu, and place it. While it stands, every lab's output is ${Math.round(PARK_RESEARCH_BOOST * 100)}% higher.`, door: 'build' },
    },
  },
};

// The drawer's own words (components/ObjectivesPanel.tsx).
export const OBJECTIVES_WORDS: Record<ObjectivesMode, string> = { guided: 'Guided', brief: 'Brief', off: 'Off' };
export const OBJECTIVES_MODES: readonly ObjectivesMode[] = ['guided', 'brief', 'off'];
export const OBJECTIVES_NOTES: Record<ObjectivesMode, string> = {
  guided: 'Each new chapter opens the objectives on its own, once. Press J to open them at any time.',
  brief: 'The objectives stay as one line at the bottom of the screen. Press J or click it to open them.',
  off: "No chapters, and nothing waits for one. The board's chair writes to you instead. For this college, that stays true even if you turn chapters back on.",
};

export const DRAWER_WORDS = {
  title: 'Objectives',
  chapter: (n: number) => `Chapter ${n}`,
  of: (met: number, all: number) => `${met} of ${all}`,
  help: (objective: string) => `How to: ${objective}`,
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
  // A side chapter open beside the one shown (Plan 114E): the Guide names it
  // first.
  guideOpen: 'open now',
  // Seats for everyone's two counts while they differ (Plan 114E, C3-5).
  withComing: (taught: string, coming: string) => `${taught} now · ${coming} once new courses start`,
  back: 'Back to the objectives',
  guideTab: (tab: string) => `The Guide on ${tab}`,
  live: 'Now',
  // Which way it is heading, in the glance's arrow's word, and no target
  // figure (Plan 114B).
  prestigeNow: (now: string, heading: string) => `Prestige ${now}, ${heading}`,
  pillars: 'What lifts it',
  takenOff: 'Taken off',
  satisfactionNow: (now: string) => `Satisfaction ${now}.`,
  drag: (need: string) => `${need} is pulling it down most.`,
};

// In place of a Show me whose tab is shut (Plan 114F, the third review's
// C3-9: Research's did nothing before the first lab): when the tab opens,
// by the ladder's rung that opens it (ladderData.ts's milestoneForTab).
const SHUT_TAB_WORDS: Record<string, string> = {
  laboratory: 'The Research tab opens when your first lab is built.',
  commencement: 'The Students tab opens after your first summer.',
  sport: 'The Athletics tab opens when a sport club goes varsity.',
};
export function shutTabWords(tab: TabId, label: string): string {
  const rung = milestoneForTab(tab);
  return (rung && SHUT_TAB_WORDS[rung]) || `The ${label} tab isn't open yet.`;
}

// THE GUIDE (Plan 106 PR G): each tab's "Guide" button opens the page of
// the chapter that introduced its system, once that chapter has opened.
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
