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
    blurb: 'Student demands arrive less often, and give longer to meet.',
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
    blurb: 'A forecast of where the summer’s grade will rank the college, from the spring.',
  },
];

export function officeDef(id: string): OfficeDef | undefined {
  return OFFICES.find((o) => o.id === id);
}

export function officeDomain(id: OfficeDomain): { id: OfficeDomain; label: string; motif: string } {
  return OFFICE_DOMAINS.find((d) => d.id === id)!;
}

// ---- What each office does (PR 89E), before the seat bonus ----
// Every lever below is scaled by the office's strength k (offices.ts's
// officeStrength: 1 open, OFFICE_SEAT_BONUS with its seat filled). The
// sizes are first guesses, measured by PR 89G.

// Admissions Office: the summer's pool range before the price is set, a
// band this far either side of the projection (narrower by k).
export const ADMISSIONS_RANGE_HALF_WIDTH = 0.15;
// Career Services: the pre-professional cohort's pull, this much more.
export const CAREER_SERVICES_PULL = 0.15;
// Financial Aid Office: the price-sensitive cohort reads the price as this
// much lower; the sticker, and everyone else's reading of it, is unchanged.
export const FINANCIAL_AID_DISCOUNT = 0.2;
// Office of Curriculum Development: committee seats added (whole seats; the
// seat bonus does not make a second).
export const CURRICULUM_OFFICE_SEATS = 1;
// Office of Sponsored Research: a paper's grant chance and size.
export const SPONSORED_GRANT_CHANCE_LIFT = 0.5;
export const SPONSORED_GRANT_SIZE_LIFT = 0.25;
// Office of Faculty Recruitment: candidates the market holds, and weeks a
// listing stays.
export const RECRUITMENT_POOL_EXTRA = 10;
export const RECRUITMENT_LISTING_EXTRA_WEEKS = 6;
// Student Activities Office: weeks between charters (shorter by k).
export const CHARTER_INTERVAL_WEEKS = 26;
// Athletics Development Office: a team founded directly costs what the
// petition's establishing does, less by k.
// Counseling & Wellness: the gap between demands, and the weeks a demand
// gives, both longer. (Plan 89 asked that a demand ask for less; what it
// asks for is a building or a program, which does not come in parts, so it
// gives longer instead: 89E, as implemented.)
export const COUNSELING_COOLDOWN_LIFT = 0.5;
export const COUNSELING_DEADLINE_LIFT = 0.5;
// Facilities Management: the paydown at full funding, faster; an event's
// damage, smaller.
export const FACILITIES_PAYDOWN_LIFT = 1;
export const FACILITIES_DAMAGE_CUT = 0.3;
// Alumni Relations: the annual fund, and a campaign's yearly response.
export const ALUMNI_GIVING_LIFT = 0.15;
export const ALUMNI_CAMPAIGN_LIFT = 0.2;

// An office's name in a sentence: "the Admissions Office", but "Career
// Services" and the other plain names, which take no article.
const NO_ARTICLE = new Set(['career-services', 'counseling', 'facilities-management', 'alumni-relations']);
export function officeName(id: string): string {
  const def = officeDef(id);
  if (!def) return id;
  return NO_ARTICLE.has(id) ? def.title : `the ${def.title}`;
}
