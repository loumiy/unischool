// Faculty quirks (Plan 29, ported from v2's faculty.json). A candidate may
// arrive with one: a line for the roster, and small effects applied at
// generation (data/facultyData.ts's generateCandidate) and on the payroll.
//
//   teaching, research   points on the professor's potential, clamped;
//   salary               a multiplier on what they are paid;
//   morale               how the students take them: summed across the
//                        roster into academic satisfaction, capped
//                        (satisfactionSystem.ts).

export interface QuirkEffects {
  teaching?: number;
  research?: number;
  salary?: number;
  morale?: number;
}

export interface Quirk {
  id: string;
  name: string;
  line: string;
  effects: QuirkEffects;
}

export const QUIRKS: readonly Quirk[] = [
  { id: 'beloved-lecturer', name: 'Beloved lecturer', line: 'Students would follow them into a fire. Publishes nothing.', effects: { teaching: 10, research: -10, morale: 2 } },
  { id: 'grant-magnet', name: 'Grant magnet', line: 'Writes proposals in their sleep, and occasionally in lectures.', effects: { research: 12, salary: 1.1 } },
  { id: 'never-on-fridays', name: 'Never on campus Fridays', line: 'Or, it is beginning to appear, Thursdays.', effects: { teaching: -6, salary: 0.95 } },
  { id: 'harsh-grader', name: 'Harsh grader', line: 'The median is a C, and the median is proud of it.', effects: { teaching: 4, morale: -2 } },
  { id: 'came-for-the-view', name: 'Came for the view', line: 'Will work for the view. Asks very little else.', effects: { salary: 0.85 } },
  { id: 'a-name', name: 'A name', line: 'People have heard of them. The name costs extra.', effects: { teaching: 5, research: 8, salary: 1.25 } },
  { id: 'office-hours', name: 'Office hours that happen', line: 'Holds office hours at the posted time, in the posted room. Legendary.', effects: { teaching: 6, morale: 1 } },
  { id: 'committee-creature', name: 'Committee creature', line: 'Sits on every committee, chairs three, and calls this service.', effects: { teaching: -4, research: -4, salary: 0.95 } },
  { id: 'bench-hermit', name: 'Bench hermit', line: 'Lives in the lab. Students report a lamp under the door.', effects: { research: 10, teaching: -8 } },
  { id: 'teaches-to-the-back-row', name: 'Teaches to the back row', line: 'Loudly, with props. The props have a budget line.', effects: { teaching: 8, research: -6, salary: 1.05 } },
  { id: 'one-book', name: 'One book', line: 'Twenty years, one book. A terrific book, by every account but the dean\'s.', effects: { research: -5, salary: 0.9 } },
  { id: 'the-easy-a', name: 'The easy A', line: 'The course is always full, everyone leaves happy, and nobody knows anything.', effects: { teaching: -5, morale: 3 } },
  { id: 'remembers-every-advisee', name: 'Remembers every advisee', line: 'Their name, their thesis, and which of the two they should have chosen.', effects: { teaching: 5, morale: 2 } },
  { id: 'serial-sabbatical', name: 'Serial sabbatical', line: 'Applied for a sabbatical the week they arrived. Will apply again.', effects: { teaching: -3, research: 5 } },
  { id: 'the-feud', name: 'The feud', line: 'Has a feud with a rival department that predates the rival department.', effects: { research: 3, morale: -1 } },
  { id: 'office-hours-myth', name: 'Office hours are a myth', line: 'The hours are posted every term. The office, on the evidence, is not.', effects: { teaching: -6, morale: -1, salary: 0.95 } },
  { id: 'brings-the-dog', name: 'Brings the dog', line: 'A spaniel attends every lecture and has the better attendance of the two.', effects: { teaching: -4, morale: 3 } },
  { id: 'answers-by-post', name: 'Answers email by post', line: 'Replies to every email in full, on paper, three weeks later. Thinks beautifully in the meantime.', effects: { teaching: -4, research: 6 } },
  { id: 'publishes-untranslated', name: 'Publishes untranslated', line: 'Publishes widely in a language the tenure committee does not read, and has declined to help.', effects: { research: 6, salary: 0.9 } },
  { id: 'former-rock-star', name: 'Former rock star', line: 'Played bass on a record some of the parents own. The lectures start late and sell out.', effects: { teaching: 8, research: -6, morale: 2, salary: 1.15 } },
  { id: 'grades-a-b-plus', name: 'Grades everyone a B+', line: 'Every paper, every year, a B+. Nobody complains, and nobody can say why.', effects: { teaching: -4, morale: 2 } },
  { id: 'shy-of-students', name: 'Shy of students', line: 'Brilliant on paper, lectures to the far wall. The far wall has learned a great deal.', effects: { teaching: -8, research: 8, salary: 0.95 } },
  { id: 'writes-the-textbook', name: 'Writes the textbook', line: 'Writes the textbook, assigns the textbook, and revises it every autumn so last year\'s will not do.', effects: { teaching: 5, research: 4, morale: -2 } },
  { id: 'sabbatical-in-spirit', name: 'On sabbatical in spirit', line: 'Attends every meeting in body and, at every meeting, is visibly somewhere with a beach.', effects: { teaching: -5, research: -5, salary: 0.9 } },
  { id: 'marks-overnight', name: 'Marks overnight', line: 'Essays go in on Monday and come back on Tuesday, annotated in three colors.', effects: { teaching: 10, research: -4, salary: 1.05 } },
  { id: 'the-yellowed-notes', name: 'The yellowed notes', line: 'Teaches from the same notes for thirty years. They remain, annoyingly, correct.', effects: { teaching: 4, morale: -1, salary: 0.9 } },
  { id: 'always-being-courted', name: 'Always being courted', line: 'Has an offer from somewhere else every spring, and mentions it to the dean in March.', effects: { research: 8, morale: -1, salary: 1.2 } },
  { id: 'undergraduates-in-the-lab', name: 'Undergraduates in the lab', line: 'Any undergraduate who asks gets a bench, a project, and their name fourth on a paper.', effects: { teaching: 6, research: 6, morale: 2, salary: 1.15 } },
  { id: 'ten-minutes-late', name: 'Ten minutes late', line: 'Starts every lecture ten minutes late and finishes it twenty minutes over, on principle.', effects: { teaching: -5, morale: -1, salary: 0.95 } },
  { id: 'conference-circuit', name: 'Conference circuit', line: 'Gives the same paper at eleven conferences a year, to warm applause at each.', effects: { research: 5, teaching: -6, salary: 1.05 } },
  { id: 'knits-in-meetings', name: 'Knits in meetings', line: 'Knits through every faculty meeting, and has produced over a decade a blanket the length of the agenda.', effects: { morale: 1, salary: 0.95 } },
  { id: 'taught-someone-famous', name: 'Taught someone famous', line: 'Taught somebody famous once, and teaches every class as though it might happen again.', effects: { teaching: 6, salary: 1.05 } },
  { id: 'field-season', name: 'Field season', line: 'Gone from May to September to a dig nobody has seen photographs of. Returns with boxes.', effects: { research: 7, teaching: -4 } },
  { id: 'between-retirements', name: 'Between retirements', line: 'Has announced a retirement four times, and is currently between announcements.', effects: { teaching: 4, research: -6, salary: 1.1 } },
  { id: 'the-open-door', name: 'The open door', line: 'The door is always open, which is also how the department\'s biscuits keep leaving.', effects: { teaching: 4, research: -4, morale: 2 } },
  { id: 'espresso-diplomat', name: 'Espresso diplomat', line: 'Owns the only working espresso machine in the building, and with it, most of the department\'s decisions.', effects: { research: 4, morale: 1, salary: 1.05 } },
  { id: 'reviewer-two', name: 'Reviewer Two', line: 'Is, somewhere, every author\'s Reviewer Two, and marks undergraduate essays in the same spirit.', effects: { research: 6, morale: -2 } },
  { id: 'chalk-only', name: 'Chalk only', line: 'Refuses every screen and writes on the blackboard with both hands. Is right to.', effects: { teaching: 6, research: -4 } },
  { id: 'back-from-industry', name: 'Back from industry', line: 'Spent ten years in industry and came back with the contacts, the consultancy, and the car.', effects: { research: 8, teaching: -4, salary: 1.2 } },
  { id: 'evening-seminar', name: 'The evening seminar', line: 'Holds seminars at nine at night. The students who come are few, and devoted for life.', effects: { teaching: 4, research: 4, morale: -1 } },
];

// The share of candidates who arrive with a quirk.
export const QUIRK_SHARE = 0.6;
// The most the roster's morale moves academic satisfaction, either way.
export const QUIRK_MORALE_CAP = 3;
// Morale points are summed across the roster and scaled by this, so a
// dozen cheerful professors in a college of hundreds read as a little.
export const QUIRK_MORALE_PER_POINT = 0.1;

export function quirkById(id: string | undefined): Quirk | undefined {
  return id === undefined ? undefined : QUIRKS.find((q) => q.id === id);
}

// A quirk from the professor's id, not the shared random stream: adding
// quirks moves a run only through what they do (Plan 29's rules).
export function quirkForId(id: string): Quirk | undefined {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const roll = (h % 10_000) / 10_000;
  if (roll >= QUIRK_SHARE) return undefined;
  return QUIRKS[Math.floor((roll / QUIRK_SHARE) * QUIRKS.length)];
}
