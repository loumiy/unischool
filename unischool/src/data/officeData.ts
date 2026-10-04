// The administration's offices (Plan 89). An office is one program slot of
// Founders Hall given to an administrative function: held once, counting
// toward no school, teaching nothing. Where a seat (seatData.ts) is someone
// who answers a domain's routine for the president, an office is something
// the college can do. Each names one seat, and does half again as much
// while that seat is filled (Plan 89 §2.4).
//
// What each one does is wired at its hook by PR 89E; this file is the
// catalogue, the price and the running cost.

export type OfficeDomain = 'enrolment' | 'academic' | 'students' | 'money';

export const OFFICE_DOMAINS: readonly { id: OfficeDomain; label: string; motif: string }[] = [
  { id: 'enrolment', label: 'Enrolment', motif: '✉' },
  { id: 'academic', label: 'Academic', motif: '✎' },
  { id: 'students', label: 'Students', motif: '⚑' },
  { id: 'money', label: 'Money and standing', motif: '⚖' },
];

export interface OfficeDef {
  id: string;
  title: string;
  domain: OfficeDomain;
  // The seat (seatData.ts) whose holder makes the office half again as
  // effective.
  seatId: string;
  // What it does, in one sentence for the hall panel's card.
  blurb: string;
  // The price to open, in weeks of operating cost (moneyScale.ts), so an
  // office costs the same share of the budget in year 5 as in year 35.
  priceWeeks: number;
}

// The share of last week's operating cost each office's staff draws, a
// week. A share rather than a salary (Plan 89B, as implemented): a seat's
// salary is a fixed sum the late budget stops noticing, and the plan asked
// for six offices to stay a real commitment. Tuned by PR 89G.
export const OFFICE_BUDGET_SHARE = 0.006;

// How long a closing office's slot stays dark (Plan 89 §2.6): as a
// relocation's.
export const OFFICE_CLOSING_WEEKS = 12;

// The seat bonus (Plan 89 §2.4): an office's effect is this many times as
// large while its seat is filled.
export const OFFICE_SEAT_BONUS = 1.5;

// The most offices a college may hold, one for each of the six milestones
// that open them (Plan 89 §3).
export const MAX_OFFICES = 6;

export const OFFICES: readonly OfficeDef[] = [
  {
    id: 'admissions', title: 'Admissions Office', domain: 'enrolment', seatId: 'provost', priceWeeks: 4,
    blurb: 'Shows a range for the applicant pool before you set the summer price.',
  },
  {
    id: 'career-services', title: 'Career Services', domain: 'enrolment', seatId: 'provost', priceWeeks: 3,
    blurb: 'Pulls the pre-professional cohort.',
  },
  {
    id: 'financial-aid', title: 'Financial Aid Office', domain: 'enrolment', seatId: 'provost', priceWeeks: 3,
    blurb: 'Pulls the price-sensitive cohort without a lower sticker.',
  },
  {
    id: 'curriculum', title: 'Office of Curriculum Development', domain: 'academic', seatId: 'provost', priceWeeks: 5,
    blurb: 'One more seat on the curriculum committee.',
  },
  {
    id: 'sponsored-research', title: 'Office of Sponsored Research', domain: 'academic', seatId: 'provost', priceWeeks: 4,
    blurb: 'Papers win grants more often, and larger ones.',
  },
  {
    id: 'faculty-recruitment', title: 'Office of Faculty Recruitment', domain: 'academic', seatId: 'provost', priceWeeks: 3,
    blurb: 'More candidates on the faculty market, listed longer.',
  },
  {
    id: 'student-activities', title: 'Student Activities Office', domain: 'students', seatId: 'dean-of-students', priceWeeks: 3,
    blurb: 'Charter a club directly, once a term.',
  },
  {
    id: 'athletics-development', title: 'Athletics Development Office', domain: 'students', seatId: 'dean-of-students', priceWeeks: 5,
    blurb: 'Found a varsity team without a petition, given its venue.',
  },
  {
    id: 'counseling', title: 'Counseling & Wellness', domain: 'students', seatId: 'dean-of-students', priceWeeks: 3,
    blurb: 'Student demands arrive less often and ask for less.',
  },
  {
    id: 'facilities-management', title: 'Facilities Management', domain: 'money', seatId: 'facilities', priceWeeks: 3,
    blurb: 'Full maintenance funding pays the backlog down twice as fast; storms do less.',
  },
  {
    id: 'alumni-relations', title: 'Alumni Relations', domain: 'money', seatId: 'advancement', priceWeeks: 4,
    blurb: 'More alumni giving; campaigns go further.',
  },
  {
    id: 'institutional-research', title: 'Office of Institutional Research', domain: 'money', seatId: 'provost', priceWeeks: 2,
    blurb: 'A forecast of the summer’s prestige grade, from the spring.',
  },
];

export function officeDef(id: string): OfficeDef | undefined {
  return OFFICES.find((o) => o.id === id);
}

export function officeDomain(id: OfficeDomain): { id: OfficeDomain; label: string; motif: string } {
  return OFFICE_DOMAINS.find((d) => d.id === id)!;
}
