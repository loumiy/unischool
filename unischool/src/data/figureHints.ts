// What each headline number is, in one sentence (Plan 34, components/
// Figure.tsx). A hint is a Sentence: it ends in a full stop, so an empty
// one does not typecheck. Keyed by where the figure sits.

export type Sentence = `${string}.`;

export const FIGURE_HINTS = {
  // The status bar.
  funds: 'Operating funds, and what the week adds or takes at today\'s rates; only a deficit can push them below zero, and the board reads every term.',
  rank: (field: number): Sentence => `Place among ${field} colleges on the academic table, sorted by prestige; one is the top.`,
  enrolled: 'Students on the books across all four classes, set each summer by the class you admit and who does not return.',
  prestige: 'The college\'s name: graded each summer and stepped toward the grade, drifting a little between; the grade reads curriculum, teaching, students, research, satisfaction, campus life and the estate.',
  satisfaction: 'How content the students are, out of 100, drifting toward what the campus, the price and student life can offer; below a line, fewer come back each summer.',

  // The Treasury.
  cash: 'Cash on hand now; building is paid from it up front, and a building it cannot cover waits for it, a loan or a gift.',
  board: 'Where the board stands on the ladder, and its confidence out of 100, which surplus terms earn back and deficits spend.',
  endowment: 'Money the college keeps invested; it earns a return each year and pays its draw into income every week.',
  grants: 'Research grants won so far and what they brought in, banked as each one lands.',
  listedTuition: 'The price quoted to next summer\'s applicants; it moves only at the summer\'s admissions decision.',
  chargedByClass: 'What each class on the books pays: its price was locked the summer it enrolled, for four years.',

  // Students.
  clubs: 'Points the clubs add to the satisfaction target right now, from the same sum the weekly tick runs.',
  greek: 'Points the Greek chapters add to the satisfaction target right now, from the same sum the weekly tick runs.',
  varsity: 'Points varsity teams add to the satisfaction target right now, from the same sum the weekly tick runs.',
  satisfactionTarget: 'Where satisfaction is heading: the target without student life, then with it.',
  satisfactionToday: 'Satisfaction this week; it moves toward the target over the coming weeks.',
  orgCost: 'What student organisations cost each week, and over a year, in upkeep and athletic staff.',

  // The summer.
  applicants: 'Everyone who applied at this price: prestige, the price against the college\'s name, and word of mouth set it.',
  room: 'Seats the catalogue can teach next year, less the students who stay on; the class cannot outgrow it.',
  freshmen: 'The class that enrols: the admit rate times the pool, held to the room.',
  incomingQuality: 'The average preparation of the class that enrols, out of 100; a lower admit rate takes the stronger applicants.',
  projectedNet: 'The week\'s net once this class and the three above it pay their locked prices, against today\'s.',
  projectedSatisfaction: 'The satisfaction target with this many students on the campus, against today\'s.',
  tightestNeed: 'The service that will be most stretched, as a share of what the students will need, now and with this class.',
  notReturning: 'Students who will not come back next year, and why.',
  nextThousand: 'What a thousand more students would pay each at this price, against what teaching, serving and administering them would cost at this size; past the break, growing loses money.',
  tuitionLocked: 'The price this class pays every year until it graduates.',
  admitRate: 'The share of the pool the college chose to admit.',
} as const satisfies Record<string, Sentence | ((...args: never[]) => Sentence)>;
