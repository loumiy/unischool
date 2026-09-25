import type { GameState } from '../state/types';
import { coursesDone, totalEnrolled } from '../state/types';
import type { TabId } from '../components/TabNav';
import { FIRST_HALL_COURSE_GATE } from './techData';
import { FOUNDING_PROGRAMS } from './foundingData';
import {
  GROCERY_POPULATION_GATE,
  HEALTH_CENTER_TIER1_POPULATION_GATE,
  HEALTH_CENTER_TIER2_POPULATION_GATE,
  HEALTH_CENTER_TIER3_POPULATION_GATE,
  LIBRARY_TIER2_PRESTIGE_GATE,
  REC_CENTER_TIER2_PRESTIGE_GATE,
  GRAND_LANDMARK_IDS,
} from './facilitiesData';

// The grand landmarks' milestone: a national name.
const GRAND_LANDMARK_PRESTIGE_GATE = 90;

// The ladder: named milestones, each opening buildings and tabs on one
// condition. Milestones are independent (a strategy that never founds a
// school still reaches 20,000 students) and permanent (reached is never
// undone). The ladder is the order they are shown in, grouped by tier.
// Buildings a milestone opens still answer to their own structural gates
// (prereqs, a lab's school, a venue's team); a milestone only adds itself.

export type LadderTier = 'Founding' | 'Growing' | 'Established' | 'National';

export interface Progress {
  value: number;
  target: number;
  unit: string; // "students", "prestige", "courses"
}

export interface Milestone {
  id: string;
  tier: LadderTier;
  name: string;
  condition: string; // the condition as the ladder states it
  reached(s: GameState): boolean;
  progress?(s: GameState): Progress;
  // A side milestone drives a structural gate rather than a list of its own:
  // shown on the ladder so the player sees it coming, never required by one.
  side?: true;
  // Celebrated by its own modal (eventData.ts's milestone celebrations),
  // which says what opened: reached without a note of its own, so the moment
  // is announced once (Plan 47).
  quiet?: true;
  buildables: readonly string[];
  tabs: readonly TabId[];
  // What the arriving letter says, and one line per thing opened.
  letter: string;
  opens: readonly string[];
}

const enrolled = (s: GameState) => totalEnrolled(s.students);
const housedPrograms = (s: GameState) => Object.values(s.halls).flat().filter((slot) => slot.programId !== null).length;
const hasMilestone = (s: GameState, prefix: string) => Object.keys(s.milestones).some((k) => k.startsWith(prefix));

function students(target: number) {
  return {
    reached: (s: GameState) => enrolled(s) >= target,
    progress: (s: GameState): Progress => ({ value: enrolled(s), target, unit: 'students' }),
  };
}
function prestige(target: number) {
  return {
    reached: (s: GameState) => s.self.reputation >= target,
    progress: (s: GameState): Progress => ({ value: s.self.reputation, target, unit: 'prestige' }),
  };
}

export const CHARTER_ID = 'charter';

export const MILESTONES: readonly Milestone[] = [
  {
    id: CHARTER_ID,
    tier: 'Founding',
    name: 'The charter',
    condition: 'the college is founded',
    reached: () => true,
    buildables: [],
    tabs: [],
    letter: '',
    opens: ['Founders Hall, the first residence hall and dining hall, the Library and the Campus Quad', 'The Curriculum, Faculty and Treasury'],
  },
  {
    id: 'campus-life',
    tier: 'Founding',
    name: 'A fourth program',
    condition: 'a fourth program founded',
    reached: (s) => housedPrograms(s) > FOUNDING_PROGRAMS.length,
    buildables: ['SCTR-T1', 'REC-T1', 'QUAD-S2', 'AMENITY-STATUE'],
    tabs: [],
    letter: 'The college teaches four subjects now, and has chosen its first on its own. The board thinks the students have earned somewhere to be when they are not in class.',
    opens: [
      'Student Center: somewhere to be between classes, and a lift to social life',
      'Recreation Center: health and fitness, and the start of a sports chain',
      'Second Quad: another green, for when the campus spreads',
      "The Founder's Statue: a first landmark, and a little campus beauty",
    ],
  },
  {
    id: 'commencement',
    tier: 'Founding',
    name: 'First commencement',
    condition: 'the first summer closes',
    reached: (s) => s.history.length >= 1,
    buildables: ['AMENITY-FOUNTAIN'],
    tabs: ['students', 'history'],
    letter: 'The first class has walked, and the college has a year behind it: enough to see the year laid out, the admissions funnel that filled it, and the clubs the students have started.',
    opens: ['Students: what they think, their clubs, who enrolled and the funnel that drew them', 'History: the record of each year', 'The Fountain: somewhere to sit, and campus beauty'],
  },
  {
    id: 'curriculum',
    tier: 'Founding',
    name: 'A curriculum',
    condition: `${FIRST_HALL_COURSE_GATE} courses developed`,
    reached: (s) => coursesDone(s) >= FIRST_HALL_COURSE_GATE,
    progress: (s) => ({ value: coursesDone(s), target: FIRST_HALL_COURSE_GATE, unit: 'courses' }),
    buildables: ['HALL-01'],
    tabs: [],
    letter: `${FIRST_HALL_COURSE_GATE} courses is a curriculum, and a curriculum outgrows one building. The first academic hall is yours to site: six rooms, one program to a room, and when six programs of one school share a hall, that school is founded.`,
    opens: ['Academic halls: six program slots each, and the way a school is founded'],
  },
  {
    id: 'town',
    tier: 'Growing',
    name: "A town's worth",
    condition: `${HEALTH_CENTER_TIER1_POPULATION_GATE.toLocaleString()} students`,
    ...students(HEALTH_CENTER_TIER1_POPULATION_GATE),
    buildables: ['HLTH-T1', 'AMENITY-GARDEN'],
    tabs: [],
    letter: 'At this size the college is a small town, and a town gets sick. From here on students expect care on campus, and their satisfaction will count it. A town needs running, too: from here, every time the college doubles, each of its students costs a little more to administer (the Treasury\'s "Being large").',
    opens: ['Health & Counseling Center: care for students, which now counts toward satisfaction', 'The Formal Garden: hedges and beds, and campus beauty'],
  },
  {
    id: 'regional',
    tier: 'Growing',
    name: 'A regional name',
    condition: `prestige ${REC_CENTER_TIER2_PRESTIGE_GATE}`,
    ...prestige(REC_CENTER_TIER2_PRESTIGE_GATE),
    buildables: ['REC-T2', 'AMENITY-CHAPEL'],
    tabs: [],
    letter: 'People outside the county know the name now, and the recreation chain can be finished with something varsity-grade.',
    opens: ['Athletics Complex: the top of the recreation chain, varsity-grade', 'The Chapel: a small stone landmark'],
  },
  {
    id: 'school',
    tier: 'Growing',
    name: 'A school founded',
    condition: 'six programs of one school in one hall',
    reached: (s) => hasMilestone(s, 'school-founded:'),
    side: true,
    quiet: true,
    buildables: [],
    tabs: [],
    letter: "A school of its own, with a dean's worth of programs under one roof. Its laboratories can be built now: research starts there.",
    opens: ["The school's laboratories"],
  },
  {
    id: 'laboratory',
    tier: 'Growing',
    name: 'A laboratory',
    condition: 'a laboratory finished',
    reached: (s) => s.tech.some((t) => t.facilityType === 'lab' && t.status === 'done'),
    side: true,
    buildables: [],
    tabs: ['research'],
    letter: 'The first laboratory is open. Research is commissioned there: a team, a topic and a budget, and what comes back is publications, grants and, now and then, a breakthrough.',
    opens: ['Research: commission work in the labs'],
  },
  {
    id: 'sport',
    tier: 'Growing',
    name: 'A sport club',
    condition: 'a sport club forms',
    reached: (s) => s.orgs.teams.length > 0 || s.orgs.clubs.some((c) => c.sport !== null),
    side: true,
    buildables: [],
    tabs: ['athletics'],
    letter: 'Students have formed a sport club. It is theirs for now; if it petitions for varsity status the department starts here.',
    opens: ['Athletics: the clubs, the teams and their venues'],
  },
  {
    id: 'city',
    tier: 'Established',
    name: 'A small city',
    condition: `${HEALTH_CENTER_TIER2_POPULATION_GATE.toLocaleString()} students`,
    ...students(HEALTH_CENTER_TIER2_POPULATION_GATE),
    buildables: ['HLTH-T2'],
    tabs: [],
    letter: 'A campus this size needs a clinic, not a nurse.',
    opens: ['University Clinic: outpatient care for thousands more'],
  },
  {
    id: 'research',
    tier: 'Established',
    name: 'A research reputation',
    condition: `prestige ${LIBRARY_TIER2_PRESTIGE_GATE}`,
    ...prestige(LIBRARY_TIER2_PRESTIGE_GATE),
    buildables: ['LIB-T2', 'AMENITY-BELLTOWER'],
    tabs: [],
    letter: 'Scholars elsewhere cite the faculty now. A research library would say the college means it.',
    opens: ['Research Library: more seats and a real collection, lifting research', 'The Bell Tower: the hours across the campus'],
  },
  {
    id: 'market',
    tier: 'Established',
    name: 'A market of its own',
    condition: `${GROCERY_POPULATION_GATE.toLocaleString()} students`,
    ...students(GROCERY_POPULATION_GATE),
    buildables: ['GROCERY-01'],
    tabs: [],
    letter: 'Enough students live here now that a grocery store would pay its way, and spare the dining halls.',
    opens: ['Campus Grocery Store: a second way to feed students'],
  },
  {
    id: 'distinguished',
    tier: 'Established',
    name: 'A school distinguished',
    condition: 'every course of a school complete',
    reached: (s) => hasMilestone(s, 'school-distinguished:'),
    side: true,
    quiet: true,
    buildables: [],
    tabs: [],
    letter: 'A school with every course taught is a school that can train its successors. Graduate programs open where their schools stand.',
    opens: ['Graduate programs, school by school'],
  },
  {
    id: 'national',
    tier: 'National',
    name: 'A national name',
    condition: `prestige ${GRAND_LANDMARK_PRESTIGE_GATE}`,
    ...prestige(GRAND_LANDMARK_PRESTIGE_GATE),
    buildables: GRAND_LANDMARK_IDS,
    tabs: [],
    letter: 'The college is known across the country now, and the board would like the country to be able to picture it. One grand landmark: a campanile, a great dome or a triumphal gate. Three years to build, and only one of them.',
    opens: ['A grand landmark, one of three: a long build, and a lasting lift to prestige and applications'],
  },
  {
    id: 'university-town',
    tier: 'National',
    name: 'A university town',
    condition: `${HEALTH_CENTER_TIER3_POPULATION_GATE.toLocaleString()} students`,
    ...students(HEALTH_CENTER_TIER3_POPULATION_GATE),
    buildables: ['HLTH-T3'],
    tabs: [],
    letter: 'The town is the university now. With a medical school, it can have a hospital.',
    opens: ['University Hospital: with the medical school, a teaching hospital'],
  },
];

export const LADDER_TIERS: readonly LadderTier[] = ['Founding', 'Growing', 'Established', 'National'];

export function milestoneById(id: string): Milestone | undefined {
  return MILESTONES.find((m) => m.id === id);
}

const BUILDABLE_MILESTONE = new Map(MILESTONES.flatMap((m) => m.buildables.map((b) => [b, m.id] as const)));
const TAB_MILESTONE = new Map(MILESTONES.flatMap((m) => m.tabs.map((t) => [t, m.id] as const)));

// The milestone a buildable waits on, if any.
export function milestoneForBuildable(id: string): string | undefined {
  return BUILDABLE_MILESTONE.get(id);
}

// The milestone a tab waits on, if any; tabs no milestone names are open
// from the charter.
export function milestoneForTab(id: TabId): string | undefined {
  return TAB_MILESTONE.get(id);
}
