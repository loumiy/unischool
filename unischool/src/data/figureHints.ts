// What each headline number is, in one sentence (Plan 34, components/
// Figure.tsx). A hint is a Sentence: it ends in a full stop, so an empty
// one does not typecheck. Keyed by where the figure sits.

import type { GameState, SatisfactionAttributes } from '../state/types';
import { count, satisfactionFigure } from '../format';
import { pillarWeightsWords } from './prestigeWords';

export type Sentence = `${string}.`;

// The five needs satisfaction is made of, as the Students tab names them.
export const NEED_LABELS: Record<keyof SatisfactionAttributes, string> = {
  academic: 'Academic',
  social: 'Social',
  basicNeeds: 'Dining', // the need is fed: dining halls, the grocery, the towers' food halls (Plan 96E)
  health: 'Health',
  housing: 'Housing',
};

export const FIGURE_HINTS = {
  // The status bar.
  funds: 'Your operating funds and this week\'s change at today\'s rates, which the board reviews every term (a deficit or an unanswered decision can push them below zero).',
  rank: (field: number): Sentence => `Of ${field} colleges, by prestige.`,
  enrolled: 'Students across all four classes, which change each summer with the class you admit and the students who don\'t return.',
  prestige: `Prestige, graded each summer from ${pillarWeightsWords()}, plus your endowment and minus run-down buildings.`,
  // The lowest need and its figure (Plan 78B), so the chip says where to look.
  satisfaction: (need: string, figure: string): Sentence => `How happy your students are, out of 100 (lowest need: ${need}, at ${figure}).`,
  // The committee (Plan 80E): what it is writing, and whether there is room
  // and a course ready for it (techSystem.ts's committeeStatus).
  committee: (writing: number, seats: number, ready: boolean): Sentence => `Courses the curriculum committee is writing, of the ${seats} it can write at once — ${
    writing >= seats ? 'the next starts when one of them is done'
      : ready ? 'it has room, and a course is ready to start'
        : 'it has room, but no course can start yet'}.`,

  // The Treasury.
  cash: 'Cash on hand.',
  board: 'How worried the board is, from sound down to an interim CFO, moving down with each deficit term and back up with each surplus term.',
  endowment: 'Money you keep invested, which earns a return each year and pays a share into your income every week.',
  grants: 'Research grants you\'ve won so far, and the money they brought in as each one landed.',
  listedTuition: 'The price next summer\'s applicants see, which changes only when you decide admissions in the summer.',
  chargedByClass: 'What each class pays, locked for four years at the price set the summer it enrolled.',

  // Students.
  clubs: 'Points your clubs add to where satisfaction is heading, at this week\'s figures.',
  greek: 'Points your Greek chapters add to where satisfaction is heading, at this week\'s figures.',
  varsity: 'Points your varsity teams add to where satisfaction is heading, at this week\'s figures.',
  satisfactionToday: 'Satisfaction this week, which moves a little each week toward the total of the five needs below (the arrow shows which way).',
  orgCost: 'What student organizations cost in upkeep and athletic staff, each week and over a year.',

  // The summer.
  applicants: 'Everyone who applied at this price.',
  room: 'Class places for next year, minus the places the students who stay on will take.',
  freshmen: 'The class that enrolls.',
  incomingQuality: 'The average preparation of the class that enrolls, out of 100.',
  projectedNet: 'Your weekly net once this class and the three above it pay their locked prices, compared with today\'s.',
  projectedSatisfaction: 'How many points this class moves satisfaction, up or down, once it arrives on campus.',
  tightestNeed: 'Beds or dining, whichever will be more stretched, as a share of what your students need, now and with this class.',
  priceTolerance: 'What families will pay at your college\'s prestige.',
  notReturning: 'Students who leave before graduating.',
  nextThousand: 'What a thousand more students would each pay at this price, compared with the cost of teaching, serving and administering them at this size.',
  tuitionLocked: 'The price this class pays every year until it graduates.',
  admitRate: 'Admitting more takes weaker applicants.',
  // The Faculty tab's plot, the picked person's card.
  plotTeaching: 'Their teaching score minus your faculty\'s median, so above zero means they would teach better than most.',
  plotResearch: 'Their research score minus your faculty\'s median.',
  plotRank: 'Where they rank by teaching among their department\'s professors (for a candidate, as if hired).',
  plotPay: 'What you pay them a year, or would pay at the market rate.',
  plotLoad: 'The courses they teach, out of the course slots they bring.',
  plotListing: 'How long until this candidate leaves the market.',
} as const satisfies Record<string, Sentence | ((...args: never[]) => Sentence)>;

// The satisfaction chip's hint (Plan 78B): the lowest of the five needs and
// its figure, from the week's breakdown, which the NEXT line reads too.
// While it is falling, the need that pulls it down most and why instead
// (Plan 104I; satisfactionSystem.ts's satisfactionDrag, passed in).
export function satisfactionHint(s: GameState, drag: DragFacts | null = null): Sentence {
  if (drag) return `How happy your students are, out of 100, and falling. ${dragLine(drag)}` as Sentence;
  const scores = s.students.satisfactionBreakdown;
  const needs = Object.keys(NEED_LABELS) as Array<keyof SatisfactionAttributes>;
  const lowest = needs.reduce((low, k) => (scores[k] < scores[low] ? k : low), needs[0]);
  return FIGURE_HINTS.satisfaction(NEED_LABELS[lowest].toLowerCase(), satisfactionFigure(scores[lowest]));
}

// The need that pulls satisfaction down, in words (Plan 104I): "Housing is
// the drag: 320 beds, 480 wanted." The facts are satisfactionSystem.ts's
// SatisfactionDrag; the words are the needs' cards' own.
export interface DragFacts {
  need: keyof SatisfactionAttributes;
  has: number;
  wants: number;
  library?: { has: number; wants: number };
  seats?: { has: number; wants: number };
}
export function dragLine(d: DragFacts): Sentence {
  const why = d.need === 'housing'
    ? `${count(d.has)} beds, ${count(d.wants)} wanted`
    : d.need === 'academic'
      ? `teaching earns ${count(d.has)} of its ${count(d.wants)} points${d.library ? `, the library ${count(d.library.has)} of its ${count(d.library.wants)}` : ''}${d.seats ? `, and the catalog seats ${count(d.seats.has)} of ${count(d.seats.wants)} students` : ''}`
      : `${count(d.has)} served of the ${count(d.wants)} it takes`;
  return `${NEED_LABELS[d.need]} is the drag: ${why}.` as Sentence;
}
