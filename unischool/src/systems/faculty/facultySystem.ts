import { quirkById } from '../../data/quirkData';
import { tickSearches } from './facultySearch';
import type { Faculty, GameState } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';
import { neededFacultyFields } from '../techtree/techSystem';

// The one way somebody joins the roster, shared by HIRE_FACULTY and the
// visiting-chair event so an appointment always means the same thing.
// weeksListed is the pool's clock and tenureWeeks the roster's; clearing the
// first is what moves a person from one to the other.
export function appointFaculty(s: GameState, person: Faculty): void {
  person.weeksListed = 0;
  s.faculty.push(person);
  // Lifetime count for the final report (University.facultyServed).
  s.self.facultyServed += 1;
}
import {
  generateCandidate, grownStat, facultySalary, rollCandidateField, candidateArrivalsThisWeek,
  SLOT_GROWTH_INTERVAL_WEEKS, MAX_FACULTY_SLOTS, CANDIDATE_LISTING_WEEKS,
} from '../../data/facultyData';

// One week of tenure for a rostered faculty member: teaching and research
// grow toward their potentials and salary is recomputed (facultyData.ts's
// grownStat/facultySalary). Candidates in the pool do not grow.
function growFaculty(f: Faculty): void {
  f.tenureWeeks += 1;
  f.teaching = grownStat(f.teachingPotential, f.tenureWeeks);
  f.research = grownStat(f.researchPotential, f.tenureWeeks);
  // A prize's raise is passed in as acclaim because this line overwrites
  // last week's salary.
  // A quirk's pay factor rides on top (data/quirkData.ts).
  f.salary = Math.round(facultySalary(f.teaching, f.research, f.tenureWeeks, f.acclaim) * (quirkById(f.quirk)?.effects.salary ?? 1));
  // Course slots grow in flat +1 steps on tenure milestones, another reason
  // to retain a hire.
  if (f.tenureWeeks % SLOT_GROWTH_INTERVAL_WEEKS === 0 && f.courseSlots < MAX_FACULTY_SLOTS) {
    f.courseSlots += 1;
  }
}

// One week of the academic job market (docs/design/faculty.md): listings
// age, anyone up for CANDIDATE_LISTING_WEEKS withdraws, and new listings
// refill the pool in weighted-random fields (rollCandidateField).
// Only arrivals in a field the school is short in are logged (a course
// waiting with no free slot to teach it: techSystem.ts's
// neededFacultyFields); logging all ~2.5 a week would drown the ticker.
function tickCandidatePool(s: GameState): void {
  for (const c of s.candidates) c.weeksListed += 1;
  s.candidates = s.candidates.filter((c) => c.weeksListed < CANDIDATE_LISTING_WEEKS);

  const arrivals = candidateArrivalsThisWeek(s.candidates.length);
  // Read once for the week, before any arrival: the fields short THIS week.
  const short = arrivals > 0 ? neededFacultyFields(s) : null;
  for (let i = 0; i < arrivals; i += 1) {
    const existingNames = [...s.faculty, ...s.candidates].map((f) => f.name);
    const candidate = generateCandidate(rollCandidateField(), existingNames);
    s.candidates.push(candidate);
    if (short?.has(candidate.field)) {
      s.log.unshift({
        year: s.clock.year,
        week: s.clock.week,
        message: `${candidate.name} (${candidate.field}) is on the market — a field with courses waiting on a hire.`,
        kind: 'info',
        topic: 'candidate',
        subject: candidate.id,
      });
    }
  }
  // A posted search's listing lands on top of the churn (facultySearch.ts).
  tickSearches(s);
}

export function tickFaculty(s: GameState): void {
  tickCandidatePool(s);
  for (const f of s.faculty) growFaculty(f);
  tickRetirements(s);
}

// ---- Retirement (Plan 29, v2's faculty churn) ----
// A professor's career at the college runs 25 to 40 years, read from their
// id rather than the shared stream. The log gives a year's notice; at the
// end they retire, and their courses wait for a new instructor, as when
// anyone leaves. There is no random quitting.
export const CAREER_MIN_YEARS = 25;
export const CAREER_SPAN_YEARS = 15;

export function careerWeeks(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // A different slice of the hash from the quirk's (quirkData.ts).
  const years = CAREER_MIN_YEARS + ((h >>> 12) % (CAREER_SPAN_YEARS + 1));
  return years * WEEKS_PER_YEAR;
}

function tickRetirements(s: GameState): void {
  const leaving: Faculty[] = [];
  for (const f of s.faculty) {
    const career = careerWeeks(f.id);
    if (f.tenureWeeks === career - WEEKS_PER_YEAR) {
      s.log.unshift({
        year: s.clock.year, week: s.clock.week, kind: 'info', topic: 'departure', subject: f.id,
        message: `${f.name} (${f.field}) will retire a year from now, after ${career / WEEKS_PER_YEAR - 1} years at the college.`,
      });
    }
    if (f.tenureWeeks >= career) leaving.push(f);
  }
  for (const f of leaving) {
    const orphaned = s.tech.filter((t) => s.courseFaculty[t.id] === f.id && (t.status === 'developing' || t.status === 'done'));
    for (const course of orphaned) delete s.courseFaculty[course.id];
    s.faculty = s.faculty.filter((x) => x.id !== f.id);
    s.log.unshift({
      year: s.clock.year, week: s.clock.week, kind: orphaned.length > 0 ? 'bad' : 'info', topic: 'departure', subject: f.id,
      message: `${f.name} retires after ${Math.round(f.tenureWeeks / WEEKS_PER_YEAR)} years.${orphaned.length > 0 ? ` ${orphaned.length} ${orphaned.length === 1 ? 'course waits' : 'courses wait'} for a new instructor in ${f.field}.` : ''}`,
    });
  }
}
