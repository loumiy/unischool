import type { Faculty } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';

// ---------------------------------------------------------------------
// Name generation. Each pool is tagged with a shared cultural origin so
// first/last pairing can be weighted toward same-origin pairs (SAME_ORIGIN
// NAME_WEIGHT below) — mismatched pairs (e.g. a first name from one pool
// with a last name from an unrelated one) still happen, deliberately, just
// as the minority case rather than the systematic result of two uniform,
// unrelated picks. Seven pools x seven names each gives ~2,400 first+last
// combinations before that weighting even applies — comfortably larger
// than the handful of faculty any single playthrough ever rolls, so
// rollFullName's dedupe below essentially never has to fall back.
// ---------------------------------------------------------------------
interface NamePool {
  origin: string;
  first: string[];
  last: string[];
}

const NAME_POOLS: NamePool[] = [
  {
    origin: 'East Asian',
    first: ['Wei', 'Mei', 'Jun', 'Hana', 'Yuki', 'Minjun', 'Xin'],
    last: ['Zhang', 'Kim', 'Tanaka', 'Chen', 'Park', 'Nakamura', 'Liu'],
  },
  {
    origin: 'South Asian',
    first: ['Priya', 'Arjun', 'Ananya', 'Rohan', 'Divya', 'Vikram', 'Meera'],
    last: ['Patel', 'Sharma', 'Gupta', 'Nair', 'Rao', 'Iyer', 'Chowdhury'],
  },
  {
    origin: 'Anglo/Western European',
    first: ['John', 'Emily', 'Daniel', 'William', 'Grace', 'Thomas', 'Alice'],
    last: ['Reid', 'Byrne', 'Coleman', 'Whitfield', 'Bennett', 'Hayes', 'Sinclair'],
  },
  {
    origin: 'Hispanic/Latin American',
    first: ['Sofia', 'Mateo', 'Camila', 'Diego', 'Valentina', 'Javier', 'Lucia'],
    last: ['Costa', 'Moreno', 'Reyes', 'Herrera', 'Silva', 'Torres', 'Vega'],
  },
  {
    origin: 'Arabic/Middle Eastern',
    first: ['Omar', 'Fatima', 'Layla', 'Hassan', 'Amir', 'Yasmin', 'Karim'],
    last: ['Nasser', 'Farouk', 'Haddad', 'Khalil', 'Aziz', 'Saleh', 'Mansour'],
  },
  {
    origin: 'Slavic/Eastern European',
    first: ['Elena', 'Ivan', 'Katarina', 'Dmitri', 'Nadia', 'Viktor', 'Anya'],
    last: ['Novak', 'Petrov', 'Kowalski', 'Horvat', 'Ivanov', 'Dvorak', 'Sokolov'],
  },
  {
    origin: 'West/East African',
    first: ['Kwame', 'Amara', 'Chidi', 'Adaeze', 'Kofi', 'Zainab', 'Femi'],
    last: ['Okafor', 'Mensah', 'Adeyemi', 'Nwosu', 'Diallo', 'Osei', 'Mwangi'],
  },
];

// Chance a rolled last name is drawn from the same origin pool as the
// first name. Kept high, not 1, so cross-origin/multi-heritage names still
// occur — just as the minority case, not the systematic default.
const SAME_ORIGIN_NAME_WEIGHT = 0.85;

// Bounded retries to avoid re-rolling the exact same first+last pair as an
// existing faculty member or candidate. The pool is large enough that this
// should essentially never exhaust; the loop is just a safety net.
const MAX_NAME_ROLL_ATTEMPTS = 30;

export const FACULTY_FIELDS = ['Physics', 'History', 'CompSci', 'Economics', 'Biology', 'Mathematics', 'Sociology', 'Chemistry', 'Psychology', 'English'];

function pick<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

function rollFullName(existingNames: Set<string>): string {
  for (let attempt = 0; attempt < MAX_NAME_ROLL_ATTEMPTS; attempt++) {
    const firstPool = pick(NAME_POOLS);
    const lastPool = Math.random() < SAME_ORIGIN_NAME_WEIGHT ? firstPool : pick(NAME_POOLS);
    const full = `Dr. ${pick(firstPool.first)} ${pick(lastPool.last)}`;
    if (!existingNames.has(full)) return full;
  }
  // Effectively unreachable given the pool size above; accept a repeat
  // rather than looping forever if it somehow happens.
  const firstPool = pick(NAME_POOLS);
  return `Dr. ${pick(firstPool.first)} ${pick(firstPool.last)}`;
}

// ---------------------------------------------------------------------
// Faculty are an appreciating asset, not a one-time purchase: a hire's
// teaching/research stats start below their rolled "potential" ceiling and
// rise toward it with tenure, then plateau. Salary rises on its own,
// slower-to-plateau curve on top of the skill-linked base, so a
// long-retained star costs substantially more than the day they were
// hired — the reward for keeping (and the cost of keeping) a great cheap
// early hire. Both curves are the same shape — exponential approach to a
// ceiling, parameterized by an explicit "years to reach near-plateau"
// constant — so tuning either pace never means hunting for magic numbers.
// Applied by facultySystem.ts's weekly tick (which owns the mutation);
// the formulas live here so generateCandidate below can also use them,
// at tenureWeeks 0, to show a freshly rolled candidate's real starting
// numbers rather than a separately hand-tuned one-off.
// ---------------------------------------------------------------------
const FACULTY_POTENTIAL_MIN = 45;
const FACULTY_POTENTIAL_RANGE = 55; // potential (the ceiling) rolls in [45, 100]

const FACULTY_STARTING_POTENTIAL_FRACTION = 0.55; // a fresh hire arrives at this fraction of their eventual ceiling
const FACULTY_GROWTH_PLATEAU_YEARS = 6;            // tenure (years) to close FACULTY_GROWTH_PLATEAU_FRACTION of the start->potential gap
const FACULTY_GROWTH_PLATEAU_FRACTION = 0.95;
const FACULTY_GROWTH_RATE_PER_WEEK =
  1 - (1 - FACULTY_GROWTH_PLATEAU_FRACTION) ** (1 / (FACULTY_GROWTH_PLATEAU_YEARS * WEEKS_PER_YEAR));

// Current teaching/research value for a faculty member with the given
// ceiling ("potential") and tenure. Exponential approach to the ceiling:
// starts at FACULTY_STARTING_POTENTIAL_FRACTION of potential and closes
// the remaining gap a fixed fraction at a time each week, so growth is
// fast early and flattens into a real plateau by FACULTY_GROWTH_PLATEAU_
// YEARS rather than a hard cliff.
export function grownStat(potential: number, tenureWeeks: number): number {
  const start = potential * FACULTY_STARTING_POTENTIAL_FRACTION;
  const grownFraction = 1 - (1 - FACULTY_GROWTH_RATE_PER_WEEK) ** tenureWeeks;
  return Math.round(start + (potential - start) * grownFraction);
}

const SALARY_BASE = 60_000;
const SALARY_PER_SKILL_POINT = 400;      // same rate as the original flat formula, now applied to *current* (grown) stats
const SALARY_TENURE_PREMIUM_MAX = 0.8;   // seniority premium on top of the skill-linked base, at full maturity: up to +80%
const SALARY_GROWTH_PLATEAU_YEARS = 10;  // salary keeps climbing after skill plateaus — raises continue for seniority alone
const SALARY_GROWTH_PLATEAU_FRACTION = 0.95;
const SALARY_GROWTH_RATE_PER_WEEK =
  1 - (1 - SALARY_GROWTH_PLATEAU_FRACTION) ** (1 / (SALARY_GROWTH_PLATEAU_YEARS * WEEKS_PER_YEAR));

// Current annual salary for a faculty member with the given current stats
// and tenure. The skill-linked base tracks current teaching/research (so
// it rises as they grow); a seniority premium — its own, slower curve —
// compounds on top, so two faculty with identical current stats still
// cost differently if one has been retained far longer. This is the
// "expensive to keep a star forever" half of the appreciating-asset
// design, and the money-side half of the scarcity that forces a player to
// choose where to concentrate excellence rather than staffing every
// school at the top of the market.
export function facultySalary(teaching: number, research: number, tenureWeeks: number): number {
  const skillBase = SALARY_BASE + (teaching + research) * SALARY_PER_SKILL_POINT;
  const tenurePremium = 1 - (1 - SALARY_GROWTH_RATE_PER_WEEK) ** tenureWeeks;
  return Math.round(skillBase * (1 + SALARY_TENURE_PREMIUM_MAX * tenurePremium));
}

// ---------------------------------------------------------------------
// Course slots: how many `requiresFaculty`-gated courses in `field` this
// hire can keep staffed at once (see techSystem.ts's canStartDevelopment/
// usedFacultySlots/totalFacultySlots). Rolled once at hire, like teaching/
// research potential — but unlike those, slots have no per-hire ceiling to
// roll toward; every retained hire grows at the same flat rate, a further
// reason (on top of growing stats and rising salary) to retain rather than
// churn faculty. facultySystem.ts's growFaculty mutates courseSlots
// directly on tenure milestones rather than recomputing it from a stored
// base each week, since there's no ceiling variance to reconstruct.
// ---------------------------------------------------------------------
const FACULTY_BASE_SLOTS_MIN = 2;
const FACULTY_BASE_SLOTS_RANGE = 2; // rolls 2..4 course slots at hire
export const SLOT_GROWTH_INTERVAL_WEEKS = 104; // +1 slot every 2 years of tenure retained
export const MAX_FACULTY_SLOTS = 6;

function rollBaseCourseSlots(): number {
  return FACULTY_BASE_SLOTS_MIN + Math.floor(Math.random() * (FACULTY_BASE_SLOTS_RANGE + 1));
}

// A display-only bucketing of a hire's current (teaching+research)/2 into a
// familiar academic-rank ladder — so "hire more" (headcount, gating course
// slots) and "hire better" (this tier, which the continuous teaching/
// research stats already drive) read as visibly separate levers rather
// than the same number twice. Not a new independent stat: it's derived
// from the same current stats that already feed prestige's faculty-quality
// input (see prestigeSystem.ts) and the roster's average field strength.
export type FacultyQualityTier = 'Adjunct' | 'Assistant' | 'Associate' | 'Full' | 'Distinguished';
const QUALITY_TIER_THRESHOLDS: Array<[number, FacultyQualityTier]> = [
  [85, 'Distinguished'],
  [70, 'Full'],
  [55, 'Associate'],
  [35, 'Assistant'],
  [0, 'Adjunct'],
];
export function facultyQualityTier(f: Faculty): FacultyQualityTier {
  const avg = (f.teaching + f.research) / 2;
  for (const [min, tier] of QUALITY_TIER_THRESHOLDS) {
    if (avg >= min) return tier;
  }
  return 'Adjunct';
}

// ---------------------------------------------------------------------
// Hiring is a job-posting model, not a passive draw-and-discard pool: the
// player posts an opening for a SPECIFIC field (POST_JOB in actions.ts),
// pays a fee up front, and waits out a countdown (facultySystem.ts ticks
// s.openPostings the same way tickTech ticks s.developing) before exactly
// one candidate in that field arrives in s.candidates, ready to hire. This
// replaces the old hire-then-fire reroll hack (dismiss an unwanted
// candidate to force a fresh random draw) with a deliberate, cost-and-time
// -bearing decision — you can't get a candidate in a field you haven't
// posted for, and re-posting the same field again costs another fee and
// another wait.
// ---------------------------------------------------------------------
export const JOB_POSTING_COST = 8_000;
const JOB_POSTING_MIN_WEEKS = 4;
const JOB_POSTING_MAX_WEEKS = 10;

// Rolled once, when a posting opens — a real hiring timeline is never
// perfectly predictable, but the countdown itself (like a course's
// duration) ticks down deterministically once rolled, so the player always
// knows exactly how long is left.
export function rollPostingWeeks(): number {
  return JOB_POSTING_MIN_WEEKS + Math.floor(Math.random() * (JOB_POSTING_MAX_WEEKS - JOB_POSTING_MIN_WEEKS + 1));
}

// One freshly-rolled hireable candidate IN THE GIVEN FIELD, fresh
// (tenureWeeks 0). Pass the full+last names already in play (roster +
// candidate pool) so the new name can't collide with one of them.
export function generateCandidate(field: string, existingNames: Iterable<string> = []): Faculty {
  const used = new Set(existingNames);
  const teachingPotential = FACULTY_POTENTIAL_MIN + Math.round(Math.random() * FACULTY_POTENTIAL_RANGE);
  const researchPotential = FACULTY_POTENTIAL_MIN + Math.round(Math.random() * FACULTY_POTENTIAL_RANGE);
  const teaching = grownStat(teachingPotential, 0);
  const research = grownStat(researchPotential, 0);
  return {
    id: crypto.randomUUID(),
    name: rollFullName(used),
    field,
    teaching,
    research,
    teachingPotential,
    researchPotential,
    tenureWeeks: 0,
    salary: facultySalary(teaching, research, 0),
    morale: 70 + Math.round(Math.random() * 20),
    courseSlots: rollBaseCourseSlots(),
  };
}

// Founding faculty candidates: word-of-mouth hires already in the pipeline
// before the player has posted a single opening, in whatever fields happen
// to turn up — the one place a candidate's field is still randomly rolled
// rather than chosen by the player via POST_JOB.
export function initialCandidates(): Faculty[] {
  const first = generateCandidate(pick(FACULTY_FIELDS));
  const second = generateCandidate(pick(FACULTY_FIELDS), [first.name]);
  return [first, second];
}
