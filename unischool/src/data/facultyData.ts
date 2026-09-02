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

// ---------------------------------------------------------------------
// Faculty fields = the university's DEPARTMENTS. This is the taxonomy the
// whole recruiting side hangs off: a hire belongs to exactly one field, a
// job posting is opened for exactly one field, and a course's
// requiresFaculty names exactly one field (techData.ts gives every major
// one `field`, shared by all nine of its courses, plus GENED_FIELDS for
// the six gen-ed courses).
//
// The set below is deliberately shaped like a real course catalog's
// department list rather than like a list of broad subject areas, and it
// is chosen so demand lands EVENLY across it: with 36 majors, one field
// per major would be a 36-entry dropdown, and the old 13 broad fields put
// 54 courses behind 'Business' and 45 each behind 'CompSci'/'Arts'/
// 'Biology' while 'Economics' and 'Psychology' had 9 apiece. 26 fields at
// one-to-three majors each keeps every field between 9 and 20 courses —
// no field is dead, none dominates, and each is still a department a real
// university would actually have (several are real combined-department
// names: Accounting & Finance, Operations Research, Art & Design).
//
// Ordered by division, the way a catalog lists departments, because this
// array IS the recruiting dropdown's order (see FacultyTab.tsx).
//
// Adding/renaming an entry here is a save-compatibility event: a saved
// faculty member stores their field as a plain string, so a field that
// stops existing strands that hire. See LEGACY_FIELD_RENAMES below and
// persistence.ts's v4 -> v5 migration.
// ---------------------------------------------------------------------
export const FACULTY_FIELDS = [
  // Humanities & arts
  'English', 'History', 'Philosophy', 'Communication', 'Art & Design', 'Music',
  // Social sciences
  'Economics', 'Political Science', 'Psychology', 'Sociology',
  // Natural sciences & mathematics
  'Mathematics', 'Physics', 'Chemistry', 'Biology',
  // Health
  'Public Health', 'Clinical Health',
  // Computing
  'Computer Science', 'Artificial Intelligence', 'Information Systems',
  // Engineering
  'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering', 'Operations Research',
  // Business
  'Accounting & Finance', 'Marketing', 'Management',
];

// Old field names -> the field that inherits them, for saves written
// before the taxonomy was re-specialised (see persistence.ts's v4 -> v5
// migration). Only the three fields that stopped existing need an entry;
// the other ten old names are still live fields and carry forward as-is.
// A merged-away field maps to the closest surviving department, so a
// player never loses a hire they paid for — 'Business' split four ways, so
// its faculty land in 'Management', the most general of the four.
export const LEGACY_FIELD_RENAMES: Record<string, string> = {
  CompSci: 'Computer Science',
  Business: 'Management',
  Arts: 'Art & Design',
};

function pick<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

interface RolledName {
  name: string;
  origin: string; // the first-name pool's origin — what nationality is tied to (see rollNationality)
}

function rollFullName(existingNames: Set<string>): RolledName {
  for (let attempt = 0; attempt < MAX_NAME_ROLL_ATTEMPTS; attempt++) {
    const firstPool = pick(NAME_POOLS);
    const lastPool = Math.random() < SAME_ORIGIN_NAME_WEIGHT ? firstPool : pick(NAME_POOLS);
    const full = `Dr. ${pick(firstPool.first)} ${pick(lastPool.last)}`;
    if (!existingNames.has(full)) return { name: full, origin: firstPool.origin };
  }
  // Effectively unreachable given the pool size above; accept a repeat
  // rather than looping forever if it somehow happens.
  const firstPool = pick(NAME_POOLS);
  return { name: `Dr. ${pick(firstPool.first)} ${pick(firstPool.last)}`, origin: firstPool.origin };
}

// ---------------------------------------------------------------------
// Nationality: shown as an expanded country name in each faculty member's
// expanded detail (see FacultyTab.tsx). The paired `flag` emoji is kept as
// authored data but is no longer rendered anywhere — the glyphs failed to
// display in some browsers, so the inline flag was dropped. Deliberately
// disproportionately American — most of any real American university's
// faculty, whatever their heritage, hold US citizenship — with the
// remainder tied to the SAME origin pool the name itself was drawn from
// (rollFullName's `origin` above), never rolled independently of the name.
// ---------------------------------------------------------------------
const AMERICAN_NATIONALITY_CHANCE = 0.72;
const AMERICAN_NATIONALITY = { nationality: 'United States', flag: '🇺🇸' };

const ORIGIN_NATIONALITIES: Record<string, Array<{ nationality: string; flag: string }>> = {
  'East Asian': [
    { nationality: 'China', flag: '🇨🇳' },
    { nationality: 'South Korea', flag: '🇰🇷' },
    { nationality: 'Japan', flag: '🇯🇵' },
  ],
  'South Asian': [
    { nationality: 'India', flag: '🇮🇳' },
    { nationality: 'Bangladesh', flag: '🇧🇩' },
  ],
  'Anglo/Western European': [
    { nationality: 'United Kingdom', flag: '🇬🇧' },
    { nationality: 'Ireland', flag: '🇮🇪' },
    { nationality: 'Germany', flag: '🇩🇪' },
    { nationality: 'Canada', flag: '🇨🇦' },
  ],
  'Hispanic/Latin American': [
    { nationality: 'Mexico', flag: '🇲🇽' },
    { nationality: 'Spain', flag: '🇪🇸' },
    { nationality: 'Colombia', flag: '🇨🇴' },
    { nationality: 'Argentina', flag: '🇦🇷' },
  ],
  'Arabic/Middle Eastern': [
    { nationality: 'Egypt', flag: '🇪🇬' },
    { nationality: 'Lebanon', flag: '🇱🇧' },
    { nationality: 'Jordan', flag: '🇯🇴' },
  ],
  'Slavic/Eastern European': [
    { nationality: 'Poland', flag: '🇵🇱' },
    { nationality: 'Russia', flag: '🇷🇺' },
    { nationality: 'Serbia', flag: '🇷🇸' },
    { nationality: 'Czechia', flag: '🇨🇿' },
  ],
  'West/East African': [
    { nationality: 'Nigeria', flag: '🇳🇬' },
    { nationality: 'Ghana', flag: '🇬🇭' },
    { nationality: 'Kenya', flag: '🇰🇪' },
    { nationality: 'Senegal', flag: '🇸🇳' },
  ],
};

function rollNationality(origin: string): { nationality: string; flag: string } {
  if (Math.random() < AMERICAN_NATIONALITY_CHANCE) return AMERICAN_NATIONALITY;
  return pick(ORIGIN_NATIONALITIES[origin] ?? [AMERICAN_NATIONALITY]);
}

// ---------------------------------------------------------------------
// Biography: a one-line flavor sentence shown only when a roster row is
// expanded (see FacultyTab.tsx) — not a mechanic, just depth. Composed from
// a small set of fictional-sounding institutions and per-field research
// interests rather than 300+ hand-written bios; deliberately avoids
// gendered pronouns since nothing here rolls a gender.
// ---------------------------------------------------------------------
const BIO_INSTITUTIONS = [
  'Ashcombe University', 'Kestrel Bay Institute of Technology', 'University of Calderwood',
  'Marchmont University', 'Ravensmoor Institute', 'Ironwood University', 'Sable Ridge College',
  'Amberfield University', 'a small liberal-arts college', 'a large state university',
];

const FIELD_RESEARCH_INTERESTS: Record<string, string[]> = {
  English: ['postcolonial literature', 'rhetoric and composition', 'digital humanities'],
  History: ['20th-century political movements', 'maritime trade networks', 'oral history methods'],
  Philosophy: ['ethics and moral philosophy', 'philosophy of mind', 'political philosophy'],
  Communication: ['media effects research', 'documentary practice', 'political communication'],
  'Art & Design': ['visual culture', 'typographic history', 'studio practice'],
  Music: ['music cognition', 'ethnomusicology', 'composition for ensembles'],
  Economics: ['labor markets', 'behavioral economics', 'monetary policy'],
  'Political Science': ['comparative democratization', 'constitutional law', 'international security'],
  Psychology: ['cognitive development', 'clinical resilience', 'decision-making under uncertainty'],
  Sociology: ['urban inequality', 'social network analysis', 'the sociology of work'],
  Mathematics: ['combinatorics', 'applied topology', 'statistical learning theory'],
  Physics: ['condensed matter theory', 'orbital mechanics', 'astrophysical modeling'],
  Chemistry: ['catalysis', 'polymer synthesis', 'medicinal chemistry'],
  Biology: ['cell signaling pathways', 'conservation ecology', 'evolutionary genetics'],
  'Public Health': ['infectious disease epidemiology', 'nutrition policy', 'health disparities'],
  'Clinical Health': ['patient safety outcomes', 'geriatric care models', 'oral disease prevention'],
  'Computer Science': ['distributed systems', 'programming language design', 'human-computer interaction'],
  'Artificial Intelligence': ['deep learning architectures', 'computer vision', 'the ethics of automated decisions'],
  'Information Systems': ['applied cryptography', 'enterprise data governance', 'security operations'],
  'Mechanical Engineering': ['thermofluid systems', 'materials fatigue', 'robotic actuation'],
  'Electrical Engineering': ['power electronics', 'wireless signal processing', 'integrated circuit design'],
  'Civil Engineering': ['structural resilience', 'geotechnical modeling', 'transportation networks'],
  'Operations Research': ['stochastic optimization', 'supply chain modeling', 'queueing theory'],
  'Accounting & Finance': ['asset pricing', 'audit quality', 'corporate disclosure'],
  Marketing: ['consumer choice', 'brand equity', 'digital attribution'],
  Management: ['corporate strategy', 'entrepreneurship', 'organizational behavior'],
};

function rollBio(field: string): string {
  const institution = pick(BIO_INSTITUTIONS);
  const interests = FIELD_RESEARCH_INTERESTS[field] ?? ['the field'];
  const interest = pick(interests);
  return `Earned a doctorate in ${field} at ${institution}; research centers on ${interest}.`;
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

// --- Salary curve. Payroll is the largest single line on a young
// school's expense sheet and the one that compounds without anybody
// clicking anything: a hire made in year 3 to unlock a tier-1 course
// costs half again as much by the time that major is finished. That is
// deliberate — faculty are the growth loop's most front-loaded cost, paid
// years before the curriculum they unlock earns any prestige. See
// financeSystem.ts's cost-driver block.
const SALARY_BASE = 45_000;
const SALARY_PER_SKILL_POINT = 320;      // applied to *current* (grown) stats, so a maturing hire gets more expensive on both curves at once
const SALARY_TENURE_PREMIUM_MAX = 0.5;   // seniority premium on top of the skill-linked base, at full maturity: up to +50%
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
// How many courses one hire can carry. Raised as part of the growth-loop
// tuning pass: at 2-4 slots, opening a school's tier-1 courses meant
// hiring roughly one professor per course, and a 350-student founding
// school ended up carrying a 23-person payroll — around half its entire
// tuition income — which left no surplus at all to grow the campus with
// and turned the tier-1 loop into a permanent plateau instead of a pinch.
// At 4-6 slots the same build-out needs a third of the hires, so payroll
// is a heavy but survivable early cost and the school can still save
// toward its first dorm. The pressure comes back on its own terms: slots
// are occupied FOREVER (see techSystem.ts's usedFacultySlots), so a
// 330-course catalogue still ends up needing a roster in the dozens.
const FACULTY_BASE_SLOTS_MIN = 4;
const FACULTY_BASE_SLOTS_RANGE = 2; // rolls 4..6 course slots at hire
export const SLOT_GROWTH_INTERVAL_WEEKS = 104; // +1 slot every 2 years of tenure retained
export const MAX_FACULTY_SLOTS = 10;

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
export const JOB_POSTING_COST = 45_000;
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
  const { name, origin } = rollFullName(used);
  const { nationality, flag } = rollNationality(origin);
  return {
    id: crypto.randomUUID(),
    name,
    field,
    teaching,
    research,
    teachingPotential,
    researchPotential,
    tenureWeeks: 0,
    salary: facultySalary(teaching, research, 0),
    morale: 70 + Math.round(Math.random() * 20),
    courseSlots: rollBaseCourseSlots(),
    nationality,
    flag,
    bio: rollBio(field),
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
