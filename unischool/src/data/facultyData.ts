import type { Faculty } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { initialTech } from './techData';

// ---------------------------------------------------------------------
// Name generation. Each pool is tagged with a shared cultural origin so
// first/last pairing can be weighted toward same-origin pairs (SAME_ORIGIN
// NAME_WEIGHT below) — mismatched pairs (e.g. a first name from one pool
// with a last name from an unrelated one) still happen, deliberately, just
// as the minority case rather than the systematic result of two uniform,
// unrelated picks. WHICH pool supplies the first name is itself weighted,
// not uniform (see pickPool()/ANGLO_POOL_WEIGHT below), so this reads as a
// typical American university's faculty roster rather than as one-in-seven
// name origins. Seven pools x fourteen names each gives ~9,600 first+last
// combinations across all origins before either weighting applies; even
// restricted to the dominant Anglo/Western European pool alone (the worst
// case for collisions, since it's drawn ~50% of the time and then paired
// same-origin 85% of the time) that's still 14x14 = 196 combinations —
// comfortably larger than the handful of faculty any single playthrough
// ever rolls, so rollFullName's dedupe below essentially never has to
// fall back. This same pool is also where donor/alumni surnames come from
// (see eventData.ts's rollSurname()), so it needs to stay generic enough
// for a name to plausibly belong to a professor OR a decades-graduated
// alumnus — nothing here ties a name to an age, a rank, or a gender (see
// the biography note below on why no gender is ever rolled).
// ---------------------------------------------------------------------
interface NamePool {
  origin: string;
  first: string[];
  last: string[];
  weight: number;
}

// Relative weight for pool SELECTION (see pickPool() below) — not pool
// size; every pool still has 14 first/14 last names regardless of weight.
// Anglo/Western European carries ANGLO_POOL_WEIGHT against the other six
// origins' shared OTHER_POOL_WEIGHT, which (with equal weight per non-Anglo
// pool) works out to a 6-in-12 = 50% share for Anglo/Western European and a
// 1-in-12 = ~8.3% share for each of the other six — a majority-to-large-
// plurality English/American name pool, matched to a real American
// university's demographics, while every other origin still surfaces
// regularly rather than as a rare/token draw.
const ANGLO_POOL_WEIGHT = 6;
const OTHER_POOL_WEIGHT = 1;

const NAME_POOLS: NamePool[] = [
  {
    origin: 'East Asian',
    first: ['Wei', 'Mei', 'Jun', 'Hana', 'Yuki', 'Minjun', 'Xin', 'Li', 'Feng', 'Sooah', 'Haruto', 'Aiko', 'Seojin', 'Ren'],
    last: ['Zhang', 'Kim', 'Tanaka', 'Chen', 'Park', 'Nakamura', 'Liu', 'Wang', 'Lee', 'Sato', 'Watanabe', 'Choi', 'Huang', 'Kobayashi'],
    weight: OTHER_POOL_WEIGHT,
  },
  {
    origin: 'South Asian',
    first: ['Priya', 'Arjun', 'Ananya', 'Rohan', 'Divya', 'Vikram', 'Meera', 'Anika', 'Karan', 'Ishaan', 'Farhan', 'Nadia', 'Aarav', 'Riya'],
    last: ['Patel', 'Sharma', 'Gupta', 'Nair', 'Rao', 'Iyer', 'Chowdhury', 'Singh', 'Reddy', 'Bose', 'Ahmed', 'Khan', 'Menon', 'Desai'],
    weight: OTHER_POOL_WEIGHT,
  },
  {
    origin: 'Anglo/Western European',
    first: ['John', 'Emily', 'Daniel', 'William', 'Grace', 'Thomas', 'Alice', 'James', 'Charlotte', 'Henry', 'Olivia', 'Connor', 'Sarah', 'Michael'],
    last: ['Reid', 'Byrne', 'Coleman', 'Whitfield', 'Bennett', 'Hayes', 'Sinclair', 'Murphy', 'Fitzgerald', 'Walsh', 'Schmidt', 'Fraser', 'Douglas', 'Kennedy'],
    weight: ANGLO_POOL_WEIGHT,
  },
  {
    origin: 'Hispanic/Latin American',
    first: ['Sofia', 'Mateo', 'Camila', 'Diego', 'Valentina', 'Javier', 'Lucia', 'Isabella', 'Santiago', 'Gabriela', 'Alejandro', 'Renata', 'Emilio', 'Paula'],
    last: ['Costa', 'Moreno', 'Reyes', 'Herrera', 'Silva', 'Torres', 'Vega', 'Garcia', 'Rodriguez', 'Fernandez', 'Castillo', 'Ortiz', 'Aguilar', 'Navarro'],
    weight: OTHER_POOL_WEIGHT,
  },
  {
    origin: 'Arabic/Middle Eastern',
    first: ['Omar', 'Fatima', 'Layla', 'Hassan', 'Amir', 'Yasmin', 'Karim', 'Sara', 'Tarek', 'Nour', 'Rami', 'Dina', 'Youssef', 'Rana'],
    last: ['Nasser', 'Farouk', 'Haddad', 'Khalil', 'Aziz', 'Saleh', 'Mansour', 'Rahman', 'Zaidan', 'Qureshi', 'Sabbagh', 'Fawzy', 'Hakim', 'Barakat'],
    weight: OTHER_POOL_WEIGHT,
  },
  {
    origin: 'Slavic/Eastern European',
    first: ['Elena', 'Ivan', 'Katarina', 'Dmitri', 'Nadia', 'Viktor', 'Anya', 'Milan', 'Zofia', 'Pavel', 'Irina', 'Tomas', 'Olga', 'Stefan'],
    last: ['Novak', 'Petrov', 'Kowalski', 'Horvat', 'Ivanov', 'Dvorak', 'Sokolov', 'Marek', 'Zielinski', 'Vasiliev', 'Jovanovic', 'Nowak', 'Kucera', 'Baran'],
    weight: OTHER_POOL_WEIGHT,
  },
  {
    origin: 'West/East African',
    first: ['Kwame', 'Amara', 'Chidi', 'Adaeze', 'Kofi', 'Zainab', 'Femi', 'Ngozi', 'Tunde', 'Abena', 'Kwesi', 'Fatou', 'Ifeoma', 'Emeka'],
    last: ['Okafor', 'Mensah', 'Adeyemi', 'Nwosu', 'Diallo', 'Osei', 'Mwangi', 'Balogun', 'Owusu', 'Kamau', 'Sow', 'Achebe', 'Boateng', 'Njoroge'],
    weight: OTHER_POOL_WEIGHT,
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
// is chosen so demand lands EVENLY across it: with 42 majors, one field
// per major would be a 42-entry dropdown, and the old 13 broad fields put
// 54 courses behind 'Business' and 45 each behind 'CompSci'/'Arts'/
// 'Biology' while 'Economics' and 'Psychology' had 9 apiece. 28 fields at
// one-to-three majors each keeps every field between 9 and 20 courses —
// no field is dead, none dominates, and each is still a department a real
// university would actually have (several are real combined-department
// names: Accounting & Finance, Operations Research, Art & Design).
//
// The School of Science added exactly TWO of those 28 (Neuroscience and
// Kinesiology) and removed none. Its other four majors reuse departments
// that already existed and were already teaching in other schools —
// Mathematics, Physics, Chemistry, Biology and Psychology — which is what
// keeps the reorg from being a taxonomy rewrite: the fields did not move,
// the majors did. The two Health Science majors that DO need somewhere new
// to sit are the two whose real-world departments the 26-field set simply
// lacked; Pharmacy, by contrast, fits Clinical Health exactly, and taking
// it there is what re-partners Nursing after Dentistry's retirement.
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
  'Public Health', 'Clinical Health', 'Neuroscience', 'Kinesiology',
  // Computing
  'Computer Science', 'Artificial Intelligence', 'Information Systems',
  // Engineering
  'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering', 'Operations Research',
  // Business
  'Accounting & Finance', 'Marketing', 'Management',
  // Law. The one field the graduate-program pass added, and it was a
  // finding rather than a convenience: every other graduate course in the
  // catalogue is taught by a department that already exists (medicine by
  // Clinical Health, Biology, Neuroscience and Public Health; the MBA by
  // the four business departments; each doctorate by its own school's), so
  // Law is the only discipline the 28-field taxonomy genuinely did not
  // cover. The alternative was to hang the law school off Political
  // Science, which is wrong in the way that matters here: a hire made to
  // teach Comparative Politics would then have been able to staff
  // Constitutional Law, and the law school would have cost no new
  // recruiting at all. It is also the only field whose demand is entirely
  // graduate — five courses, all of them in the law school — which is
  // exactly why it needs its own market-supply entry below.
  'Law',
];

// Old field names -> the field that inherits them, for saves written
// before the taxonomy was re-specialised (see persistence.ts's v4 -> v5
// migration, and v9 -> v10, which runs every saved hire back through this
// table too). Only the three fields that stopped existing need an entry;
// the other ten old names are still live fields and carry forward as-is.
// A merged-away field maps to the closest surviving department, so a
// player never loses a hire they paid for — 'Business' split four ways, so
// its faculty land in 'Management', the most general of the four.
//
// The School of Science reorg added NO entry here, and that is a finding
// rather than an oversight: it added two departments and retired none. The
// two majors it removed, Pre-Med and Dentistry, never had fields of their
// own — Pre-Med was staffed by Chemistry (which now staffs the Chemistry
// major) and Dentistry by Clinical Health (which now staffs Pharmacy) —
// so every one of the 26 old field strings is still a live department and
// every saved hire lands on a field that still teaches at least nine
// courses. A Dentistry professor is not lost; they are a Clinical Health
// professor whose department now runs the pharmacy sequence. What DOES
// need the rename table is any save older than v5, which is why v9 -> v10
// runs it defensively rather than trusting that a v9 save already went
// through v4 -> v5.
export const LEGACY_FIELD_RENAMES: Record<string, string> = {
  CompSci: 'Computer Science',
  Business: 'Management',
  Arts: 'Art & Design',
};

function pick<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

const TOTAL_POOL_WEIGHT = NAME_POOLS.reduce((sum, pool) => sum + pool.weight, 0);

// Weighted draw over NAME_POOLS by `weight` (see ANGLO_POOL_WEIGHT/
// OTHER_POOL_WEIGHT above). Unlike pick(), which is a uniform draw over
// whatever array it's given, this is the one place a NAME POOL itself gets
// picked — every rollSurname/rollCoachName/rollFullName call site below
// routes through here rather than calling pick(NAME_POOLS) directly, so the
// origin weighting applies everywhere a name is rolled.
function pickPool(): NamePool {
  let roll = Math.random() * TOTAL_POOL_WEIGHT;
  for (const pool of NAME_POOLS) {
    roll -= pool.weight;
    if (roll < 0) return pool;
  }
  return NAME_POOLS[NAME_POOLS.length - 1];
}

// A bare surname drawn from the same pools faculty and candidates are
// named from — for decision events that need a plausible donor/alumni
// name without generating a full person (see eventData.ts's
// 'naming-rights' event).
export function rollSurname(): string {
  return pick(pickPool().last);
}

// A full "First Last" name, no "Dr." prefix and no dedupe/nationality/bio —
// for a varsity coach (see eventData.ts's 'varsity-petition' and
// data/studentLifeData.ts's VarsityTeam). Coaches are deliberately the
// LIGHT faculty-model this feature asks for: auto-generated the week a team
// goes varsity, not drawn from or checked against the standing candidate
// market — that full recruiting loop is a deferred deepening, not v1-shallow
// scope. A run mints at most fourteen of these (one per SPORTS entry, up
// from nine before gendering split five sports into independent men's/
// women's lineages), so the
// name-pool collision risk that justifies rollFullName's dedupe loop for
// faculty/candidates never meaningfully arises here.
export function rollCoachName(): string {
  const firstPool = pickPool();
  const lastPool = Math.random() < SAME_ORIGIN_NAME_WEIGHT ? firstPool : pickPool();
  return `${pick(firstPool.first)} ${pick(lastPool.last)}`;
}

interface RolledName {
  name: string;
  origin: string; // the first-name pool's origin — what nationality is tied to (see rollNationality)
}

function rollFullName(existingNames: Set<string>): RolledName {
  for (let attempt = 0; attempt < MAX_NAME_ROLL_ATTEMPTS; attempt++) {
    const firstPool = pickPool();
    const lastPool = Math.random() < SAME_ORIGIN_NAME_WEIGHT ? firstPool : pickPool();
    const full = `Dr. ${pick(firstPool.first)} ${pick(lastPool.last)}`;
    if (!existingNames.has(full)) return { name: full, origin: firstPool.origin };
  }
  // Effectively unreachable given the pool size above; accept a repeat
  // rather than looping forever if it somehow happens.
  const firstPool = pickPool();
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
  'Clinical Health': ['patient safety outcomes', 'geriatric care models', 'pharmacotherapy and adherence'],
  Neuroscience: ['synaptic plasticity', 'neural circuits of decision-making', 'neurodegenerative disease models'],
  Kinesiology: ['exercise metabolism', 'gait and movement biomechanics', 'rehabilitation science'],
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
// What one research prize (see researchData.ts) permanently adds to its
// winner's salary, on top of both curves above. A laureate becomes the
// most expensive person on the payroll the week they win and stays that
// way — the cost side of an award whose other effects are all upside.
// It lives HERE, with the rest of the salary curve, rather than with the
// research tuning, so there is exactly one file to read to understand
// what a hire costs.
export const ACCLAIM_SALARY_PREMIUM = 0.35;

// Current annual salary for a faculty member with the given current stats
// and tenure. The skill-linked base tracks current teaching/research (so
// it rises as they grow); a seniority premium — its own, slower curve —
// compounds on top, so two faculty with identical current stats still
// cost differently if one has been retained far longer. This is the
// "expensive to keep a star forever" half of the appreciating-asset
// design, and the money-side half of the scarcity that forces a player to
// choose where to concentrate excellence rather than staffing every
// school at the top of the market.
//
// `acclaim` — research prizes won (see types.ts's Faculty and
// researchData.ts) — adds a further flat premium per prize. It is a
// PARAMETER rather than something a prize writes into the stored salary
// precisely because this function is re-run on every hire every week: a
// figure written once would be overwritten the following tick, so the
// award has to be an input to the curve instead. Defaults to 0, which is
// what a candidate on the market and a newly generated hire both have.
export function facultySalary(teaching: number, research: number, tenureWeeks: number, acclaim = 0): number {
  const skillBase = SALARY_BASE + (teaching + research) * SALARY_PER_SKILL_POINT;
  const tenurePremium = 1 - (1 - SALARY_GROWTH_RATE_PER_WEEK) ** tenureWeeks;
  return Math.round(
    skillBase * (1 + SALARY_TENURE_PREMIUM_MAX * tenurePremium) * (1 + ACCLAIM_SALARY_PREMIUM * acclaim),
  );
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
// HIRING: a standing, churning candidate market.
//
// There are no job postings and no waiting. `s.candidates` is a long,
// always-refreshing list of people currently on the academic job market;
// the player appoints straight off it, immediately (HIRE_FACULTY in the
// reducer), and facultySystem.ts's tickCandidatePool keeps it turning
// over: every week the listings age, the ones that have been up too long
// withdraw, and new ones arrive to bring the pool back to target.
//
// The point of the churn is to keep the SCARCITY interesting and drop the
// boring part. Under the old post-and-wait model every hire cost a fee and
// 4-10 idle weeks, which with 28 specialised fields (see FACULTY_FIELDS
// above) meant 26 separate post-and-wait errands. Now a common field is
// almost always sitting there to be pulled, and what is genuinely scarce
// is the thin-market specialist: they show up intermittently, so filling
// that niche means either waiting for one or developing a different
// major's courses first. Availability is the constraint; the money
// constraint is payroll, which is unchanged.
// ---------------------------------------------------------------------

// --- Churn tuning. These five knobs ARE the recruiting feel; expect to
// hand-tune them after playtest, and read them together:
//
//   pool size  ~= CANDIDATE_POOL_TARGET (the top-up loop below holds it there)
//   turnover   ~= CANDIDATE_POOL_TARGET / CANDIDATE_LISTING_WEEKS per week
//   a field's share of the pool = its listing weight / the total (below)
//
// At the values below that is a 30-name pool turning over ~2.5 names a
// week, so a listing the player passes on is gone within three months and
// the list never looks the same twice.
//
// Coverage, which is the number that actually matters: with a 30-name pool
// the expected number of any one field on the list is 30 x its weight
// share, and the chance it is represented at all is ~1 - e^-that. The
// weights below put the biggest fields around 6-7% (≈2 listed, present
// ~85-88% of weeks — pull one whenever you want one), the mid fields
// around 3-4% (present ~60-70%), and the thin markets at 1-2% (present
// ~28-48%, arriving roughly every 18-36 weeks — the specialist you wait
// for). Shortening CANDIDATE_POOL_TARGET tightens every one of those at
// once, which is the fastest single dial if recruiting feels too easy.
export const CANDIDATE_POOL_TARGET = 30;   // how many listings the market holds
export const CANDIDATE_LISTING_WEEKS = 12; // weeks an unhired listing stays up before it withdraws
const CANDIDATE_ARRIVALS_PER_WEEK_MAX = 4; // ceiling on new listings per week, so a hiring spree refills over a few weeks rather than instantly

// How thin the academic market is in a field, as a multiplier on that
// field's curriculum demand (below). 1.0 = an ordinary market; below 1 =
// more courses want this field than there are people to teach them, which
// is what makes a niche genuinely niche rather than just small. Every
// field not listed here is 1.0.
//
// This is the second half of the weighting on purpose. Demand alone can't
// produce the common/rare split the churn is for: after the field
// re-specialisation every field carries between 9 and 20 courses, a
// spread of barely 2x, so weighting by course count alone would make all
// 28 fields equally intermittent. Real hiring markets are not flat — an
// English department picks from hundreds of applicants while nursing and
// pharmacy departments run chronically unfilled lines — and that is the
// axis that makes a clinical hire feel like a find.
//
// A field added to FACULTY_FIELDS gets an entry here even when the answer
// is "ordinary". An explicit 1.0 is an authored decision that this market
// is unremarkable; a field left OUT of the table is one nobody has thought
// about yet, and the two should not look the same in the source.
const DEFAULT_MARKET_SUPPLY = 1;
const FIELD_MARKET_SUPPLY: Record<string, number> = {
  'Clinical Health': 0.35,          // nursing and pharmacy faculty are the thinnest academic market there is: clinical practice pays far more than teaching it
  'Artificial Intelligence': 0.35,  // industry outbids universities for everyone qualified
  Neuroscience: 0.4,                // the doctorates exist, but medical centers and biotech take almost all of them before a teaching department gets a look
  'Accounting & Finance': 0.5,      // the perennial accounting-PhD shortage — the doctorate is long and the profession pays
  'Mechanical Engineering': 0.7,
  'Electrical Engineering': 0.7,
  'Civil Engineering': 0.7,
  'Operations Research': 0.7,       // small doctoral pipelines, and industry analytics competes for it
  Economics: 0.85,
  'Public Health': 0.9,
  'Information Systems': 0.9,
  Kinesiology: 1,                   // deliberately ordinary: exercise-science doctorates are plentiful relative to the number of lines, so this is the easy end of the Health Science roster and the counterweight to Clinical Health's 0.35
  // Law is the one field with a plentiful market and almost no demand: the
  // JD supply is enormous, but only five courses in the whole catalogue
  // ask for it and all five are in the law school. Demand x supply alone
  // would leave it the rarest listing on the board, which is the wrong
  // reading — a legal academic is EASY to find and simply has nowhere to
  // teach until the school gets far enough to found a law school. Above 1
  // on purpose, and the only entry that is; read it as "this market is
  // oversupplied", which is the honest description of legal academia.
  //
  // 1.5 rather than something larger is the whole tuning question here.
  // The pool is a fixed thirty listings, so a field's share is taken FROM
  // the others: at 3.0 Law was 4.1% of every pool — more than half the
  // departments — for the four decades before a law school is reachable,
  // which is thirty listings the player cannot use. At 1.5 it sits around
  // 2%, present roughly half of weeks, which is a hire you can get inside
  // a month or two when you finally want two of them.
  Law: 1.5,
};

// A field's listing weight = how many courses in the whole curriculum need
// it x how available its market is. The demand half is READ OFF the
// curriculum rather than restated here, so it can never drift from
// techData.ts: retiring a major or moving it to another field re-weights
// the hiring pool automatically.
//
// Memoized because rolling a field happens several times a week and the
// curriculum is a fixed seed — this is a derived constant, not state, and
// nothing mutates it after the first roll.
let listingWeights: Array<{ field: string; weight: number }> | null = null;
let listingWeightTotal = 0;

function candidateListingWeights(): Array<{ field: string; weight: number }> {
  if (!listingWeights) {
    const courseCounts = new Map<string, number>();
    for (const node of initialTech()) {
      if (!node.requiresFaculty) continue;
      courseCounts.set(node.requiresFaculty, (courseCounts.get(node.requiresFaculty) ?? 0) + 1);
    }
    listingWeights = FACULTY_FIELDS
      .map((field) => ({
        field,
        weight: (courseCounts.get(field) ?? 0) * (FIELD_MARKET_SUPPLY[field] ?? DEFAULT_MARKET_SUPPLY),
      }))
      // A field no course asks for has nothing to hire it FOR, so it is
      // never listed. Can't happen with the current curriculum (every
      // field carries at least nine courses) — this is the guard that
      // keeps that true if one is ever added ahead of its courses.
      .filter((entry) => entry.weight > 0);
    listingWeightTotal = listingWeights.reduce((sum, entry) => sum + entry.weight, 0);
  }
  return listingWeights;
}

// The field a new listing turns up in: a weighted draw, so the pool's mix
// roughly tracks what the curriculum actually needs, thinned by how hard
// each field is to hire into.
export function rollCandidateField(): string {
  const weights = candidateListingWeights();
  let roll = Math.random() * listingWeightTotal;
  for (const entry of weights) {
    roll -= entry.weight;
    if (roll <= 0) return entry.field;
  }
  return weights[weights.length - 1].field;
}

// One freshly-rolled hireable candidate IN THE GIVEN FIELD, fresh
// (tenureWeeks 0, weeksListed 0). Pass the full+last names already in play
// (roster + candidate pool) so the new name can't collide with one of them.
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
    weeksListed: 0,
    salary: facultySalary(teaching, research, 0),
    courseSlots: rollBaseCourseSlots(),
    // Nobody arrives decorated: a prize is won on this university's
    // payroll, in this university's labs, or not at all.
    acclaim: 0,
    nationality,
    flag,
    bio: rollBio(field),
  };
}

// The market as it stands the week the university is founded: a full pool,
// not an empty one filling up. Recruiting is meant to be immediate from
// the first week, and a founder looking at two names would read the
// mechanic backwards.
//
// weeksListed is STAGGERED across the listing window rather than starting
// everyone at 0, which matters more than it looks: a pool seeded flat
// would age out as one synchronized cohort every CANDIDATE_LISTING_WEEKS
// and the list would empty and refill in waves instead of churning.
export function initialCandidatePool(): Faculty[] {
  const pool: Faculty[] = [];
  const names: string[] = [];
  for (let i = 0; i < CANDIDATE_POOL_TARGET; i += 1) {
    const candidate = generateCandidate(rollCandidateField(), names);
    candidate.weeksListed = Math.floor(Math.random() * CANDIDATE_LISTING_WEEKS);
    pool.push(candidate);
    names.push(candidate.name);
  }
  return pool;
}

// How many new listings to add THIS week: enough to close the gap back to
// target, capped so a big hiring week refills over a few weeks instead of
// snapping back the same tick. Lives here with the constants it reads
// rather than in the system, so all the churn tuning is in one file.
export function candidateArrivalsThisWeek(poolSize: number): number {
  return Math.max(0, Math.min(CANDIDATE_POOL_TARGET - poolSize, CANDIDATE_ARRIVALS_PER_WEEK_MAX));
}
