import type { Faculty, GameState } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';
import { oneGradeUp, gradeFor } from '../../data/courseQuality';
import {
  TRAINING_WEEKS, TRAINING_WORDS, instituteStands, picksFor, trainingWeek,
} from '../../data/trainingData';
import { classBought } from '../../data/speedUpData';
import { planTrainingCoverage } from '../techtree/techSystem';
import { recordTraining } from './career';
import { gameDateOfWeek } from '../../format';

// ---------------------------------------------------------------------
// The faculty training program (Plan 85E): the academics specialization's
// mechanic. While the Faculty Training Institute stands (data/projectData.ts's
// PROJ-TRAINING, open only to a college specialized in academics), each year
// brings training picks, one for every FACULTY_PER_TRAINING_PICK professors
// and at least MIN_TRAINING_PICKS (data/trainingData.ts). A pick raises a
// professor's teaching by a grade's width on the course-grade bands (16
// points from a B, 18 from a C, at most 100; courseQuality.ts's oneGradeUp) and their teaching potential by as much, so
// the gain lasts (facultySystem.ts's growFaculty grows teaching on the
// potential they came with and adds the points on top). For a term the
// trainee teaches one course fewer: a course that no longer fits moves to the
// strongest colleague in the field with a course slot free, or waits for an
// instructor (techSystem.ts's planTrainingCoverage). Picks not used in a
// year lapse: the year's list (GameState.training) starts again with the
// year. The academics pillar's specialization term reads the share of the
// faculty trained (trainingData.ts's trainingReading). Draws nothing from
// the random stream.
// ---------------------------------------------------------------------

// The year's list, as it stands this year: a list from an earlier year is
// spent.
export function trainedThisYear(s: GameState): readonly string[] {
  return s.training.year === s.clock.year ? s.training.trained : [];
}

// The year's picks; twice over in a year the college bought a second class
// (Plan 95X, speedUpData.ts).
export function trainingPicks(s: GameState): number {
  return picksFor(s.faculty.length) * (classBought(s) ? 2 : 1);
}

export function picksLeft(s: GameState): number {
  if (!instituteStands(s)) return 0;
  return Math.max(0, trainingPicks(s) - trainedThisYear(s).length);
}

// Why this professor cannot be trained now, or null if they can.
export type TrainingRefusal = 'no-institute' | 'no-picks' | 'top-grade' | 'this-year' | 'not-faculty';
export function whyNotTrain(s: GameState, f: Faculty): TrainingRefusal | null {
  if (!s.faculty.includes(f)) return 'not-faculty';
  if (!instituteStands(s)) return 'no-institute';
  if (oneGradeUp(f.teaching) === null) return 'top-grade';
  if (trainedThisYear(s).includes(f.id)) return 'this-year';
  if (picksLeft(s) <= 0) return 'no-picks';
  return null;
}

// What training would do: the teaching after, and the week the lighter
// load ends.
export interface TrainingOutcome {
  from: number;
  to: number;
  untilWeek: number;
}

export function trainingOutcome(s: GameState, f: Faculty): TrainingOutcome | null {
  const to = oneGradeUp(f.teaching);
  if (to === null) return null;
  return { from: f.teaching, to, untilWeek: trainingWeek(s) + TRAINING_WEEKS };
}

// The week the term's lighter load ends, as a date ("Year 35 · Spring term ·
// Week 30").
export function trainingUntil(untilWeek: number): string {
  return gameDateOfWeek(untilWeek);
}

// One pick (the reducer's TRAIN_FACULTY). Refused, it changes nothing.
export function trainFaculty(s: GameState, facultyId: string): boolean {
  const f = s.faculty.find((x) => x.id === facultyId);
  if (!f || whyNotTrain(s, f) !== null) return false;
  const outcome = trainingOutcome(s, f)!;
  // The course that no longer fits, planned before the load is lightened.
  const coverage = planTrainingCoverage(s, f.id);
  const gain = outcome.to - outcome.from;
  const before = f.training;
  f.training = {
    points: (before?.points ?? 0) + gain,
    potential: before?.potential ?? f.teachingPotential,
    untilWeek: outcome.untilWeek,
  };
  f.teachingPotential = Math.min(100, f.teachingPotential + gain);
  f.teaching = outcome.to;
  for (const course of coverage.shed) delete s.courseFaculty[course.id];
  for (const { course, instructor } of coverage.covered) s.courseFaculty[course.id] = instructor.id;
  if (s.training.year !== s.clock.year) s.training = { year: s.clock.year, trained: [] };
  s.training.trained.push(f.id);
  recordTraining(s, f, outcome.from, outcome.to);

  const code = (name: string) => name.split(' · ')[0];
  const moved = coverage.covered.map(({ course, instructor }) => TRAINING_WORDS.movedTo(code(course.name), instructor.name)).join('')
    + coverage.orphaned.map((course) => TRAINING_WORDS.orphaned(code(course.name))).join('');
  s.log.unshift({
    year: s.clock.year,
    week: s.clock.week,
    message: TRAINING_WORDS.trained(f.name, gradeFor(outcome.from), gradeFor(outcome.to), moved),
    kind: coverage.orphaned.length > 0 ? 'info' : 'good',
    topic: 'training',
    subject: f.id,
  });
  return true;
}

// At the year's last week (facultySystem.ts's tickFaculty): picks left
// unused lapse, and the log says so.
export function lapseTrainingPicks(s: GameState): void {
  if (s.clock.week !== WEEKS_PER_YEAR || !instituteStands(s)) return;
  const left = picksLeft(s);
  if (left <= 0) return;
  // A held week run again says it once.
  const message = TRAINING_WORDS.lapsed(left, s.clock.year);
  if (s.log.some((e) => e.year === s.clock.year && e.message === message)) return;
  s.log.unshift({ year: s.clock.year, week: s.clock.week, message, kind: 'info', topic: 'training' });
}
