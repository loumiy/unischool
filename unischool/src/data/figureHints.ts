// What each headline number is, in one sentence (Plan 34, components/
// Figure.tsx). A hint is a Sentence: it ends in a full stop, so an empty
// one does not typecheck. Keyed by where the figure sits.

import type { GameState, SatisfactionAttributes } from '../state/types';
import { satisfactionFigure } from '../format';

export type Sentence = `${string}.`;

// The five needs satisfaction is made of, as the Students tab names them.
export const NEED_LABELS: Record<keyof SatisfactionAttributes, string> = {
  academic: 'Academic',
  social: 'Social',
  basicNeeds: 'Basic needs',
  health: 'Health',
  housing: 'Housing',
};

export const FIGURE_HINTS = {
  // The status bar.
  funds: 'Operating funds, and what the week adds or takes at today\'s rates; a deficit, or a matter left unanswered, can push them below zero, and the board reviews them every term.',
  rank: (field: number): Sentence => `Place among ${field} colleges in the guide's academic ranking, ordered by prestige; #1 is the top.`,
  enrolled: 'Students on the books across all four classes, set each summer by the class you admit and who does not return.',
  prestige: 'Prestige, graded each summer and stepped toward the grade; it reads curriculum, teaching, students, research, satisfaction, campus life, the buildings and grounds, and the endowment, less crowding.',
  // The lowest need and its figure (Plan 78B), so the chip says where to look.
  satisfaction: (need: string, figure: string): Sentence => `How content the students are, out of 100; the lowest of the five needs is ${need}, at ${figure}, and the Students tab shows what serves each.`,

  // The Treasury.
  cash: 'Cash on hand now; building is paid from it up front, and a building it cannot cover waits for it, a loan or a gift.',
  board: 'Where the college stands on the board\'s scale, and its confidence out of 100, which surplus terms earn back and deficits spend.',
  endowment: 'Money the college keeps invested; it earns a return each year and pays its draw into income every week.',
  grants: 'Research grants won so far and what they brought in, banked as each one lands.',
  listedTuition: 'The price quoted to next summer\'s applicants; it moves only at the summer\'s admissions decision.',
  chargedByClass: 'What each class on the books pays: its price was locked the summer it enrolled, for four years.',

  // Students.
  clubs: 'Points the clubs add to the satisfaction target right now, as of this week\'s figures.',
  greek: 'Points the Greek chapters add to the satisfaction target right now, as of this week\'s figures.',
  varsity: 'Points varsity teams add to the satisfaction target right now, as of this week\'s figures.',
  satisfactionTarget: 'Where satisfaction is heading: the target without student life, then with it.',
  satisfactionToday: 'Satisfaction this week; it moves toward the target over the coming weeks.',
  orgCost: 'What student organizations cost each week, and over a year, in upkeep and athletic staff.',

  // The summer.
  applicants: 'Everyone who applied at this price: prestige, the price against what prestige supports, word of mouth, beds, crowding and the campus set it.',
  room: 'Places the catalog can teach next year, less the students who stay on; the class cannot outgrow it.',
  freshmen: 'The class that enrolls: the admit rate times the applicant pool, held to the room.',
  incomingQuality: 'The average preparation of the class that enrolls, out of 100; a lower admit rate takes the stronger applicants.',
  projectedNet: 'The week\'s net once this class and the three above it pay their locked prices, against today\'s.',
  projectedSatisfaction: 'The satisfaction target with this many students on the campus, against today\'s.',
  tightestNeed: 'Beds or dining, whichever will be more stretched, as a share of what the students will need, now and with this class.',
  notReturning: 'Students who leave before graduating: the share rises as the year\'s average satisfaction falls, and the reasons are the needs the campus covers worst.',
  nextThousand: 'What a thousand more students would pay each at this price, against what teaching, serving and administering them would cost at this size; past the break, growing loses money.',
  tuitionLocked: 'The price this class pays every year until it graduates; a later rise or cut in the listed price does not reach it.',
  admitRate: 'Admitting more takes weaker applicants; the class is still held to the room.',
} as const satisfies Record<string, Sentence | ((...args: never[]) => Sentence)>;

// The satisfaction chip's hint (Plan 78B): the lowest of the five needs and
// its figure, from the week's breakdown, which the NEXT line reads too.
export function satisfactionHint(s: GameState): Sentence {
  const scores = s.students.satisfactionBreakdown;
  const needs = Object.keys(NEED_LABELS) as Array<keyof SatisfactionAttributes>;
  const lowest = needs.reduce((low, k) => (scores[k] < scores[low] ? k : low), needs[0]);
  return FIGURE_HINTS.satisfaction(NEED_LABELS[lowest].toLowerCase(), satisfactionFigure(scores[lowest]));
}
