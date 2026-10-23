import { GRADE_A, GRADE_B, GRADE_C, GRADE_D } from './courseQuality';

// The administration's seats (Plan 28, from v2's seats.json). Each covers a
// domain of routine events, is filled once and paid for for good, and
// answers by one of three policies. Salaries are annual, at a prestige-50
// market; the payroll scales them as it does the faculty's.

export type SeatDomain = 'academic' | 'estate' | 'students' | 'advancement';
// Board events are the president's own: no seat takes them.
export type EventDomain = SeatDomain | 'board';

// What a policy does, over the choices an event already carries.
export type PolicyRule = 'thrifty' | 'thorough' | 'popular';
export const POLICY_RULE_NOTES: Readonly<Record<PolicyRule, string>> = {
  thrifty: 'Takes the choice that spends least.',
  thorough: 'Takes the choice that spends most. That\'s usually the one that fixes it.',
  popular: 'Takes the choice the students feel best about.',
};

export interface PolicyDef {
  id: string;
  rule: PolicyRule;
  label: string;
  // The academic seats' teaching policy (Plan 95S, the second review's
  // B4-5): besides answering the routine by its rule, the seat staffs the
  // courses under 78 each week (systems/delegation/seats.ts's tickStaffing).
  staffs?: true;
  // Said in place of the rule's note when the policy does more than its rule.
  note?: string;
}

// The teaching policy's id, the same on the Provost's seat and a Dean's.
export const STAFFING_POLICY = 'staff-for-a';

export interface SeatDef {
  id: string;
  title: string;
  domain: SeatDomain;
  // A Dean is a seat per founded school; every other seat is one seat.
  perSchool: boolean;
  outsideSalary: number;
  internalSalary: number;
  policies: readonly PolicyDef[];
  defaultPolicy: string;
  blurb: string;
}

export const SEATS: readonly SeatDef[] = [
  {
    id: 'provost', title: 'Provost', domain: 'academic', perSchool: false,
    outsideSalary: 320_000, internalSalary: 210_000,
    policies: [
      { id: 'economical', rule: 'thrifty', label: 'Hold the line on spending' },
      { id: 'invest', rule: 'thorough', label: 'Spend on the academic side' },
      { id: 'collegial', rule: 'popular', label: 'Keep the students on side' },
      {
        id: STAFFING_POLICY, rule: 'popular', label: 'Staff the weakest courses first', staffs: true,
        note: `Each week, moves the best free instructor in the field onto each course below the top band, weakest course first. Only moves someone who'd lift the course a band (past ${GRADE_D}, ${GRADE_C}, ${GRADE_B} or ${GRADE_A}). Never hires or dismisses. Otherwise answers like Keep the students on side.`,
      },
    ],
    defaultPolicy: 'collegial',
    blurb: 'Runs the academic side: offers from elsewhere, visiting appointments and the faculty\'s routine. On Staff the weakest courses first, also picks who teaches the courses below the top band. Usually the first seat a college fills. Opens game speed 4×.',
  },
  {
    id: 'dean', title: 'Dean', domain: 'academic', perSchool: true,
    outsideSalary: 190_000, internalSalary: 120_000,
    policies: [
      { id: 'economical', rule: 'thrifty', label: 'Run the school lean' },
      { id: 'invest', rule: 'thorough', label: 'Back the school\'s requests' },
      { id: 'collegial', rule: 'popular', label: 'Keep the students happy' },
      {
        id: STAFFING_POLICY, rule: 'popular', label: 'Staff the weakest courses first', staffs: true,
        note: `With no Provost: each week, moves the best free instructor in the field onto each of the school's courses below the top band, weakest course first. Only moves someone who'd lift the course a band (past ${GRADE_D}, ${GRADE_C}, ${GRADE_B} or ${GRADE_A}). Never hires or dismisses. Otherwise answers like Keep the students happy.`,
      },
    ],
    defaultPolicy: 'collegial',
    blurb: 'One for each school you\'ve founded. Takes the academic routine when there\'s no Provost. With a Provost, three Deans open game speed 8×.',
  },
  {
    id: 'facilities', title: 'Facilities Director', domain: 'estate', perSchool: false,
    outsideSalary: 240_000, internalSalary: 150_000,
    policies: [
      { id: 'cheapest', rule: 'thrifty', label: 'Cheapest fix first' },
      { id: 'worst-first', rule: 'thorough', label: 'Fix it properly' },
      { id: 'visible', rule: 'popular', label: 'Whatever the students see' },
    ],
    defaultPolicy: 'worst-first',
    blurb: 'Roofs, boilers, pipes and snow: the campus\'s routine emergencies, answered before they reach your desk. Storms, fires, floods and a hard freeze still come to you.',
  },
  {
    id: 'dean-of-students', title: 'Dean of Students', domain: 'students', perSchool: false,
    outsideSalary: 200_000, internalSalary: 130_000,
    policies: [
      { id: 'firm', rule: 'thrifty', label: 'Hold the line' },
      { id: 'generous', rule: 'thorough', label: 'Fix what they are asking about' },
      { id: 'listen', rule: 'popular', label: 'Go with the students\' mood' },
    ],
    defaultPolicy: 'listen',
    blurb: 'Student life\'s routine: the Hellenic Council, its houses and its scandals.',
  },
  {
    id: 'advancement', title: 'VP of Advancement', domain: 'advancement', perSchool: false,
    outsideSalary: 280_000, internalSalary: 175_000,
    policies: [
      { id: 'careful', rule: 'thrifty', label: 'Ask sparingly' },
      { id: 'ambitious', rule: 'thorough', label: 'Spend to ask properly' },
      { id: 'personal', rule: 'popular', label: 'Whatever the students prefer' },
    ],
    defaultPolicy: 'personal',
    blurb: 'Gifts and bequests: the routine of being given money.',
  },
];

export function seatDef(id: string): SeatDef | undefined {
  return SEATS.find((s) => s.id === id);
}

// Years on the roster before a professor can be made an administrator.
export const SEAT_SENIOR_YEARS = 5;
// With a Provost, this many Deans open the fastest speed.
export const DEANS_FOR_FASTEST = 3;
// A routine event that would move more than this many weeks of operating
// cost reaches the president however well staffed the college.
export const ESCALATION_WEEKS_OF_OPEX = 4;
