import type { Faculty, GameState } from '../state/types';
import { WEEKS_PER_YEAR, standsOnCampus } from '../state/types';
import { GRADE_A, GRADE_B, GRADE_C } from './courseQuality';

// ---------------------------------------------------------------------
// The faculty training program (Plan 85E): the academics specialization's
// mechanic. The numbers, the reading of the academics pillar's
// specialization term, and the words. The rules are in
// systems/faculty/training.ts; the building is data/projectData.ts's
// PROJ-TRAINING, which only a college specialized in academics may build.
// Imports nothing but the state's types module and the course-grade bands,
// so specializationData.ts (which prestige reads) can read the program
// without joining an import cycle.
// ---------------------------------------------------------------------

export const TRAINING_INSTITUTE_ID = 'PROJ-TRAINING';
export const TRAINING_INSTITUTE_NAME = 'the Faculty Training Institute';

// The year's training picks scale with the faculty: one for every
// FACULTY_PER_TRAINING_PICK professors on the roster, and never fewer than
// MIN_TRAINING_PICKS. A college of 80 has 5 a year; of 100, 6.
export const FACULTY_PER_TRAINING_PICK = 15;
export const MIN_TRAINING_PICKS = 2;

// The cost to the classroom (a proposal, for the owner's review): a trainee
// teaches one course fewer for a term, TRAINING_SLOTS course slots for
// TRAINING_WEEKS from the week they are picked.
export const TRAINING_SLOTS = 1;
export const TRAINING_WEEKS = WEEKS_PER_YEAR / 2;

// The academics pillar's specialization term reads the program: the share
// of the faculty on the roster who have been trained at the institute,
// full at TRAINED_SHARE_FOR_FULL. Nothing while no institute stands.
export const TRAINED_SHARE_FOR_FULL = 0.4;

export function picksFor(facultyCount: number): number {
  return Math.max(MIN_TRAINING_PICKS, Math.floor(facultyCount / FACULTY_PER_TRAINING_PICK));
}

export function instituteStands(s: GameState): boolean {
  const t = s.tech.find((x) => x.id === TRAINING_INSTITUTE_ID);
  return t !== undefined && standsOnCampus(t);
}

export function isTrained(f: Faculty): boolean {
  return f.training !== undefined;
}

// The clock as one number (eventData.ts's absoluteWeek, not imported).
export function trainingWeek(s: GameState): number {
  return (s.clock.year - 1) * WEEKS_PER_YEAR + s.clock.week;
}

// The course slots training takes from a professor this week: one while
// their term at the institute runs.
export function trainingSlotsOff(s: GameState, f: Faculty): number {
  return f.training !== undefined && trainingWeek(s) < f.training.untilWeek ? TRAINING_SLOTS : 0;
}

export function trainedCount(s: GameState): number {
  return s.faculty.filter(isTrained).length;
}

// The term's reading (specializationData.ts's SPECIALIZATION_READINGS), 0 to 1.
export function trainingReading(s: GameState): number {
  if (!instituteStands(s) || s.faculty.length === 0) return 0;
  return Math.min(1, trainedCount(s) / s.faculty.length / TRAINED_SHARE_FOR_FULL);
}

// ---------------------------------------------------------------------
// The words (Plan 47's glossary: a professor's capacity is "course slots";
// the college is "the college").
// ---------------------------------------------------------------------

const pct = (x: number) => `${Math.round(x * 100)}%`;

// What a training adds, in words: a full grade, the width of the trainee's
// band on the course scale (courseQuality.ts's gradeWidth).
export const GRADE_GAIN_WORDS = `a full grade, the width of their grade on the course scale (${GRADE_A - GRADE_B} points from a B, ${GRADE_B - GRADE_C} from a C)`;

export const TRAINING_WORDS = {
  // The academics pillar's specialization term, as its row reads.
  termNoInstitute: (year: string) =>
    `The college is specialized in academics${year}, but no Faculty Training Institute stands, so this stays empty. Build one from the capital projects, then train professors there each year: the share fills as more of the faculty is trained, full at ${pct(TRAINED_SHARE_FOR_FULL)}.`,
  termReading: (year: string, trained: number, faculty: number, full: boolean) =>
    `The college is specialized in academics${year}: ${trained} of ${faculty} professors (${faculty > 0 ? pct(trained / faculty) : '0%'}) have been trained at the Faculty Training Institute. ${full ? `The share is full from ${pct(TRAINED_SHARE_FOR_FULL)}.` : `It fills as that rises, full at ${pct(TRAINED_SHARE_FOR_FULL)}.`}`,

  // The choice's card (specializationData.ts's SPECIALIZATION_CARDS).
  fills: `filling as professors are trained at the institute, full once ${pct(TRAINED_SHARE_FOR_FULL)} of the faculty has been trained`,

  // The Faculty tab's program bar.
  barTitle: 'The Faculty Training Institute',
  picksLeft: (left: number, of: number) => `${left} of ${of} training ${of === 1 ? 'pick' : 'picks'} left this year`,
  picksNote: (year: number) =>
    `One pick for every ${FACULTY_PER_TRAINING_PICK} professors, at least ${MIN_TRAINING_PICKS}. A pick raises a professor's teaching by ${GRADE_GAIN_WORDS}, and their potential by as much, so the gain lasts; for a term they teach one course fewer. Picks not used by the end of Year ${year} lapse.`,
  trainedShare: (trained: number, faculty: number) =>
    `${trained} of ${faculty} professors trained so far (${faculty > 0 ? pct(trained / faculty) : '0%'}); the academics pillar's specialization share is full at ${pct(TRAINED_SHARE_FOR_FULL)}.`,
  building: 'The Faculty Training Institute is under construction. Training begins once it opens.',
  noInstitute: 'The college is specialized in academics. Build the Faculty Training Institute from the capital projects in the build menu to train professors: each year it takes some for a term, and they come back a full grade better in the classroom.',
  filterTrainable: 'Can be trained',

  // On a professor's tile.
  train: 'Train',
  trainArmed: (course: string) => `Confirm — ${course} loses its teacher for a term`,
  trainGain: (from: string, to: string) => `Teaching ${from} to ${to}`,
  trainTitle: (from: number, to: number, gradeFrom: string, gradeTo: string, until: string) =>
    `Train at the Faculty Training Institute: teaching ${from} (${gradeFrom}) to ${to} (${gradeTo}), and the potential by as much. One course fewer until ${until}.`,
  trainWarning: (name: string, course: string, to: string | null, until: string) => (to
    ? `${name} teaches one course fewer until ${until}: ${course} moves to ${to}.`
    : `${name} teaches one course fewer until ${until}: ${course} will be left without an instructor, since nobody in the field has a course slot free.`),
  whyNot: {
    noPicks: (year: number) => `No training picks are left in Year ${year}. The next year brings more.`,
    topGrade: 'Already teaches at an A: there is no grade above it.',
    thisYear: 'Already trained this year.',
  },
  trainedBadge: 'Trained',
  trainedBadgeTitle: (times: number, points: number) => `Trained at the institute ${times === 1 ? 'once' : `${times} times`}: +${points} teaching, and potential with it`,
  inTraining: (until: string) => `At the institute: one course fewer until ${until}`,

  // The log.
  trained: (name: string, from: string, to: string, moved: string) => `${name} has been trained at the Faculty Training Institute: teaching ${from} to ${to}.${moved}`,
  movedTo: (course: string, to: string) => ` ${course} moves to ${to} for the term.`,
  orphaned: (course: string) => ` ${course} is without an instructor while they train.`,
  lapsed: (n: number, year: number) => `${n} training ${n === 1 ? 'pick' : 'picks'} at the Faculty Training Institute went unused in Year ${year}, and ${n === 1 ? 'has' : 'have'} lapsed.`,
};
