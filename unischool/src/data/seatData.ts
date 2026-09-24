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
  thorough: 'Takes the choice that spends most, which is usually the one that fixes it.',
  popular: 'Takes the choice the people it serves feel best about.',
};

export interface PolicyDef {
  id: string;
  rule: PolicyRule;
  label: string;
}

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
      { id: 'collegial', rule: 'popular', label: 'Keep the faculty with you' },
    ],
    defaultPolicy: 'collegial',
    blurb: 'Runs the academic side: offers from elsewhere, visiting appointments, the faculty\'s routine. The first seat a college fills, and the one that lets the year run at four times.',
  },
  {
    id: 'dean', title: 'Dean', domain: 'academic', perSchool: true,
    outsideSalary: 190_000, internalSalary: 120_000,
    policies: [
      { id: 'economical', rule: 'thrifty', label: 'Run the school lean' },
      { id: 'invest', rule: 'thorough', label: 'Back the school\'s requests' },
      { id: 'collegial', rule: 'popular', label: 'Keep the department happy' },
    ],
    defaultPolicy: 'collegial',
    blurb: 'One for each school the college has founded. Takes the academic routine when there is no Provost; with a Provost, three of them let the year run at eight times.',
  },
  {
    id: 'facilities', title: 'Facilities Director', domain: 'estate', perSchool: false,
    outsideSalary: 240_000, internalSalary: 150_000,
    policies: [
      { id: 'cheapest', rule: 'thrifty', label: 'Cheapest fix first' },
      { id: 'worst-first', rule: 'thorough', label: 'Worst first, properly' },
      { id: 'visible', rule: 'popular', label: 'Whatever the students see' },
    ],
    defaultPolicy: 'worst-first',
    blurb: 'Roofs, boilers, kitchens and storms: the estate\'s emergencies, answered before they reach the president\'s desk.',
  },
  {
    id: 'dean-of-students', title: 'Dean of Students', domain: 'students', perSchool: false,
    outsideSalary: 200_000, internalSalary: 130_000,
    policies: [
      { id: 'firm', rule: 'thrifty', label: 'Hold the line' },
      { id: 'generous', rule: 'thorough', label: 'Fix what they are asking about' },
      { id: 'listen', rule: 'popular', label: 'Meet them halfway' },
    ],
    defaultPolicy: 'listen',
    blurb: 'Student life\'s routine: the Greek council, its houses and its scandals.',
  },
  {
    id: 'advancement', title: 'VP of Advancement', domain: 'advancement', perSchool: false,
    outsideSalary: 280_000, internalSalary: 175_000,
    policies: [
      { id: 'careful', rule: 'thrifty', label: 'Ask sparingly' },
      { id: 'ambitious', rule: 'thorough', label: 'Ask properly, and often' },
      { id: 'personal', rule: 'popular', label: 'Ask about them first' },
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
