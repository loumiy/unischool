import type { Buildable, GameState } from '../state/types';
import { standsOnCampus } from '../state/types';
import { ART_GALLERY_ID, HEALTH_CENTER_TIER2_ID, HEALTH_CENTER_TIER3_ID } from './facilitiesData';
import { ANY_SCHOOL, GRADUATE_HOSTS, hostName } from './projectData';
import { COURSE_DESCRIPTIONS } from './courseDescriptions';

/*
  The curriculum as seed data, expanded into Buildable[]: 42 majors across
  7 schools (9 courses each), plus Founders Hall, the academic hall chain
  and the graduate programs. See docs/design/curriculum.md.

  A program is founded by taking a hall slot (types.ts's HallSlot,
  systems/techtree/programOffers.ts); six programs of one school in one hall
  found the school. Per major: tier 1 (101) has no prereqs, tier 2
  (110-140) requires tier 1, tier 3 (210-240) requires all four tier-2
  courses, and every course also waits on the program being housed
  (techSystem.ts's meetsUnlockGates). CROSS_MAJOR_BRIDGES adds a curated
  set of cross-discipline prereqs on top.

  Every course of a major requires the major's `field` (facultyData.ts's
  FACULTY_FIELDS). Majors share a field only when one real department
  covers both, often across schools, so one hire can serve two curricula.

  "Tier" is a seed-time concept only (duration and cost); it is not part of
  Buildable. Courses grant no reputation on completion (prestigeSystem.ts).
*/

const NUMS = [101, 110, 120, 130, 140, 210, 220, 230, 240];
const TIERS = [1, 2, 2, 2, 2, 3, 3, 3, 3] as const;

// Weeks to develop a course, by tier: an entry course takes a few weeks, a
// tier-3 capstone is a multi-month commitment.
const TIER_DURATION_WEEKS: Record<number, number> = { 1: 4, 2: 12, 3: 24 };

// Development cost by tier (docs/design/economy.md). Tier 1 is priced so the
// tier-1 build-out visibly tightens the surplus.
const TIER_COURSE_COST: Record<number, number> = { 1: 80_000, 2: 180_000, 3: 400_000 };

// Weekly running cost of a finished course. Opening a tier raises opex at
// once while the prestige it earns drifts in over years (the cost-leads-
// revenue lag). financeSystem.ts sums effects.upkeepPerWeek live off every
// 'done' Buildable.
const COURSE_UPKEEP_PER_WEEK: Record<number, number> = { 1: 130, 2: 380, 3: 800 };

// Founders Hall is an ordinary six-slot academic hall, seeded 'done' and
// pre-placed, so its cost is only shown in the build tray, never paid.
const FOUNDERS_HALL_COST = 400_000;
const FOUNDERS_HALL_WEEKS = 20;
// Charged from week one (upkeep is live-read, so nothing is double-counted);
// cheaper than a built hall because it is the older, smaller building.
const FOUNDERS_HALL_UPKEEP_PER_WEEK = 900;
// Founding academic standing, folded into the starting reputation by
// createInitialState (there is no apply-once reputation effect). Academic
// buildings never grant capacity; only dorms do (campusData.ts).
export const FOUNDERS_HALL_REPUTATION_BONUS = 1.5;

// ---------------------------------------------------------------------
// The academic hall: a repeatable 'building' with six program slots (types.ts's
// HallSlot). Every school has exactly six majors, so one hall is one school.
// No tiers or upgrade chain; they would break that rule.
//
// Like the dorms (campusData.ts) the chain is sequential, each rung unlocked
// by the one before, so there is always exactly one next hall and its cost is
// visible. The first is cheap but waits on FIRST_HALL_COURSE_GATE developed
// courses; each rung after costs ACADEMIC_HALL_COST_RATIO times more.
//
// Thirteen rungs plus Founders Hall makes fourteen, the completionist
// ceiling: seven schools of six majors, plus a second hall per school for its
// graduate programs. The numbers are provisional, fitted by feel.
export const ACADEMIC_HALL_SLOTS = 6;
// The first purchased hall waits on this many developed courses: the six the
// college opens with plus two the player chose (the ladder's 'curriculum' milestone).
export const FIRST_HALL_COURSE_GATE = 8;
const ACADEMIC_HALL_FIRST_COST = 750_000;
const ACADEMIC_HALL_COST_RATIO = 1.3;
const ACADEMIC_HALL_FIRST_WEEKS = 16;
const ACADEMIC_HALL_WEEKS = 24;
const ACADEMIC_HALL_UPKEEP_PER_WEEK = 3_000;
// Named for the founding woodland (treeData.ts), not for a school or a
// direction: a hall takes its school's name only once dedicated, and the map
// layout is the player's.
const ACADEMIC_HALL_NAMES = [
  'Elm Hall', 'Oak Hall', 'Linden Hall', 'Maple Hall',
  'Chestnut Hall', 'Sycamore Hall', 'Cedar Hall', 'Birch Hall',
  'Hawthorn Hall', 'Beech Hall', 'Willow Hall',
  'Alder Hall', 'Hazel Hall',
];
export const ACADEMIC_HALL_COUNT = ACADEMIC_HALL_NAMES.length;
export const ACADEMIC_HALL_ID_PREFIX = 'HALL-';
function academicHallId(index: number): string {
  return `${ACADEMIC_HALL_ID_PREFIX}${String(index + 1).padStart(2, '0')}`;
}

// A hall with program slots: Founders Hall and the chain. Code that must
// single out Founders Hall compares against FOUNDERS_HALL_ID.
export function isAcademicHall(t: Buildable): boolean {
  return t.kind === 'building' && t.slots !== undefined;
}

interface MajorSeed {
  prefix: string;   // course code prefix, e.g. "FINA"
  name: string;     // major name
  field: string;    // Faculty.field every course in this major requires (see requiresFaculty note above)
  courses: string[]; // exactly 9 titles, in tier order (101,110,120,130,140,210,220,230,240)
}
interface SchoolSeed {
  name: string;
  majors: MajorSeed[];
}

// Pre-placed at founding by actions.ts's createInitialState. The id is a
// legacy string kept because buildingSpec.ts's clock tower and the layout
// tool key on it.
export const FOUNDERS_HALL_ID = 'BLDG-GENSTUDIES';
const FOUNDERS_HALL_NAME = 'Founders Hall';

const SCHOOLS: SchoolSeed[] = [
  {
    name: 'Business',
    majors: [
      { prefix: 'FINA', name: 'Finance', field: 'Accounting & Finance', courses: ['Principles of Finance', 'Corporate Finance', 'Investment Analysis', 'Financial Modeling', 'International Finance', 'Real Estate Finance', 'Fintech & Blockchain', 'Risk Management', 'Behavioral Finance'] },
      { prefix: 'ACCT', name: 'Accounting', field: 'Accounting & Finance', courses: ['Introduction to Accounting', 'Financial Accounting', 'Managerial Accounting', 'Tax Fundamentals', 'Auditing Principles', 'Forensic Accounting', 'Advanced Financial Reporting', 'Advanced Cost Accounting', 'Accounting Information Systems'] },
      { prefix: 'MRKT', name: 'Marketing', field: 'Marketing', courses: ['Fundamentals of Marketing', 'Consumer Behavior', 'Market Research', 'Digital Marketing Strategy', 'Brand Management', 'Sports Marketing', 'Advertising & Promotion', 'Sales Management', 'Global Marketing'] },
      { prefix: 'ECON', name: 'Economics', field: 'Economics', courses: ['Microeconomics', 'Macroeconomics', 'Econometrics', 'Advanced Microeconomics', 'Economic History', 'Behavioral Economics', 'Public Finance', 'Game Theory', 'Environmental Economics'] },
      { prefix: 'MGMT', name: 'Management', field: 'Management', courses: ['Organizational Leadership', 'Human Resources Management', 'Operations Management', 'Business Ethics', 'Strategic Management', 'Project Management', 'Entrepreneurship', 'Conflict Resolution', 'Negotiations'] },
      { prefix: 'SPCO', name: 'Supply Chain & Operations', field: 'Operations Research', courses: ['Introduction to Supply Chain', 'Logistics & Distribution', 'Procurement & Sourcing', 'Quality Management', 'Demand Planning', 'Global Supply Chains', 'Inventory Control Systems', 'Data Analytics for Operations', 'Transportation Management'] },
    ],
  },
  {
    name: 'Engineering',
    majors: [
      { prefix: 'MECH', name: 'Mechanical Engineering', field: 'Mechanical Engineering', courses: ['Introduction to Mechanical Design', 'Statics & Dynamics', 'Thermodynamics', 'Fluid Mechanics', 'Materials Science', 'Robotics', 'HVAC Systems', 'Internal Combustion Engines', 'Finite Element Analysis'] },
      { prefix: 'ELEC', name: 'Electrical Engineering', field: 'Electrical Engineering', courses: ['Circuits', 'Digital Logic Design', 'Signals & Systems', 'Electromagnetics', 'Microelectronics', 'Power Systems Analysis', 'Wireless Communications', 'Control Systems', 'VLSI Design'] },
      { prefix: 'CHEN', name: 'Chemical Engineering', field: 'Chemistry', courses: ['Principles of Chemical Engineering', 'Chemical Thermodynamics', 'Fluid Transport', 'Material & Energy Balances', 'Chemical Reaction Engineering', 'Process Safety', 'Biochemical Engineering', 'Polymer Science', 'Sustainable Energy Technology'] },
      { prefix: 'CIVE', name: 'Civil Engineering', field: 'Civil Engineering', courses: ['Statics', 'Structural Analysis', 'Soil Mechanics', 'Mechanics of Materials', 'Transportation Engineering', 'Bridge Design', 'Environmental Impact Assessment', 'Construction Management', 'Urban Planning'] },
      { prefix: 'INDE', name: 'Industrial Engineering', field: 'Operations Research', courses: ['Introduction to Industrial Systems', 'Production Planning', 'Ergonomics & Safety', 'Quality Control', 'Facilities Design', 'Simulation Modeling', 'Supply Chain Analytics', 'Lean Manufacturing', 'Reliability Engineering'] },
      { prefix: 'AERO', name: 'Aerospace Engineering', field: 'Physics', courses: ['Introduction to Flight Dynamics', 'Aerodynamics', 'Aircraft Performance', 'Spacecraft Propulsion', 'Aerospace Structures', 'Astrodynamics', 'Rocketry', 'Aircraft Design', 'Unmanned Aerial Systems'] },
    ],
  },
  {
    name: 'Arts & Media',
    majors: [
      { prefix: 'MDIA', name: 'Media Studies', field: 'Communication', courses: ['Mass Communication', 'Media Theory', 'Global Media Systems', 'Digital Culture', 'Media Ethics', 'Film Industry', 'Social Media Analytics', 'Photojournalism', 'Public Relations'] },
      { prefix: 'GRDS', name: 'Graphic Design', field: 'Art & Design', courses: ['Visual Communication', 'Typography', 'Digital Imaging', 'Layout Design', 'Branding & Identity', 'Web Design', 'Motion Graphics', 'Illustration', 'Publication Design'] },
      { prefix: 'CRWR', name: 'Creative Writing', field: 'English', courses: ['Introduction to Creative Writing', 'Fiction Workshop', 'Poetry Workshop', 'Nonfiction Workshop', 'Literary Editing', 'Screenwriting', 'Playwriting', 'Novel Writing', 'Creative Writing Seminar'] },
      { prefix: 'MUSC', name: 'Music', field: 'Music', courses: ['Music Theory I', 'Music Theory II', 'Music History Survey', 'Composition I', 'Applied Instrument/Voice', 'Jazz Improvisation', 'World Music', 'Music Technology', 'Composition II'] },
      { prefix: 'FILM', name: 'Film', field: 'Communication', courses: ['Introduction to Film Analysis', 'Cinematography', 'Screenwriting Workshop', 'Film Production', 'Directing Fundamentals', 'Documentary Filmmaking', 'History of World Cinema', 'Sound Design', 'Post-Production'] },
      { prefix: 'SART', name: 'Studio Art', field: 'Art & Design', courses: ['Fundamentals of 2D Design', 'Drawing', 'Painting', 'Sculpture', 'Art History Survey', 'Printmaking', 'Ceramics', 'Photography', 'Digital Art'] },
    ],
  },
  {
    // English is housed in Founders Hall at founding, beside Mathematics and
    // Economics (foundingData.ts's FOUNDING_PROGRAMS, Plan 52).
    name: 'Social Sciences & Humanities',
    majors: [
      { prefix: 'ENGL', name: 'English', field: 'English', courses: ['Introduction to Literary Studies', 'British Literature Survey', 'American Literature Survey', 'Critical Theory', 'Advanced Composition', 'Shakespeare', 'Restoration & 18th Century Literature', 'Postcolonial Literature', 'Technical Writing'] },
      { prefix: 'SOCY', name: 'Sociology', field: 'Sociology', courses: ['Introduction to Sociology', 'Social Stratification', 'Sociological Theory', 'Race & Ethnicity', 'Qualitative Research Methods', 'Criminology', 'Sociology of the Family', 'Urban Sociology', 'Sex & Gender'] },
      { prefix: 'ANTH', name: 'Anthropology', field: 'Sociology', courses: ['Introduction to Anthropology', 'Cultural Anthropology', 'Biological Anthropology', 'Archaeological Methods', 'Linguistic Anthropology', 'Ethnographic Field Methods', 'Medical Anthropology', 'Anthropology of Religion', 'Museum & Heritage Studies'] },
      { prefix: 'POLS', name: 'Political Science', field: 'Political Science', courses: ['Introduction to Political Science', 'Comparative Politics', 'International Relations', 'American Government', 'Public Policy Analysis', 'Constitutional Law', 'Political Campaigns', 'Theories of Justice', 'Security Studies'] },
      { prefix: 'HIST', name: 'History', field: 'History', courses: ['World History', 'Research & Historiography', 'US History', 'European History', 'Ancient Civilizations', 'World War I & II', 'Historical Archaeology', 'Historical Anthropology', 'History of Science & Technology'] },
      { prefix: 'PHIL', name: 'Philosophy', field: 'Philosophy', courses: ['Introduction to Logic & Reasoning', 'Ethics', 'Metaphysics', 'Epistemology', 'Ancient Greek Philosophy', 'Existentialism', 'Philosophy of Mind', 'Aesthetics', 'Symbolic Logic'] },
    ],
  },
  {
    // Biology and Psychology keep the course ids they had in their former
    // schools, so older saves stay valid.
    name: 'Science',
    majors: [
      // Mathematics is one of the majors the founding offer is rigged toward
      // (programOffers.ts).
      { prefix: 'MATH', name: 'Mathematics', field: 'Mathematics', courses: ['Calculus', 'Linear Algebra', 'Probability & Statistics', 'Discrete Mathematics', 'Differential Equations', 'Real Analysis', 'Abstract Algebra', 'Topology', 'Numerical Methods'] },
      { prefix: 'BIOL', name: 'Biology', field: 'Biology', courses: ['Principles of Biology', 'Cell Biology', 'Genetics', 'Ecology', 'Evolution', 'Microbiology', 'Marine Biology', 'Plant Physiology', 'Immunology'] },
      { prefix: 'CHEM', name: 'Chemistry', field: 'Chemistry', courses: ['General Chemistry', 'Inorganic Chemistry', 'Organic Chemistry', 'Analytical Chemistry', 'Physical Chemistry', 'Biochemistry', 'Spectroscopy & Structure Determination', 'Medicinal Chemistry', 'Computational Chemistry'] },
      { prefix: 'PHYS', name: 'Physics', field: 'Physics', courses: ['Classical Mechanics', 'Electricity & Magnetism', 'Waves & Optics', 'Modern Physics', 'Thermal & Statistical Physics', 'Quantum Mechanics', 'Solid State Physics', 'Astrophysics & Cosmology', 'Particle Physics'] },
      { prefix: 'ENVS', name: 'Environmental Science', field: 'Biology', courses: ['Introduction to Environmental Science', 'Earth Systems & Climate', 'Ecosystem Ecology', 'Environmental Chemistry', 'Geographic Information Systems', 'Conservation Biology', 'Hydrology & Water Resources', 'Atmospheric Science', 'Environmental Policy & Restoration'] },
      { prefix: 'PSYC', name: 'Psychology', field: 'Psychology', courses: ['General Psychology', 'Developmental Psychology', 'Cognitive Psychology', 'Abnormal Psychology', 'Research Methods in Psychology', 'Social Psychology', 'Biopsychology', 'Organizational Psychology', 'Health Psychology'] },
    ],
  },
  {
    // Clinical and applied health. Neuroscience's lab keeps Health Science
    // a research school (see LAB_GATED_MAJOR_PREFIXES).
    name: 'Health Science',
    majors: [
      { prefix: 'PHLT', name: 'Public Health', field: 'Public Health', courses: ['Introduction to Public Health', 'Epidemiology', 'Biostatistics', 'Health Policy & Management', 'Environmental Health', 'Global Health', 'Health Promotion', 'Community Health Assessment', 'Maternal & Child Health'] },
      { prefix: 'NURS', name: 'Nursing', field: 'Clinical Health', courses: ['Introduction to Professional Nursing', 'Anatomy & Physiology', 'Pharmacology', 'Health Assessment', 'Clinical Practicum I', 'Critical Care Nursing', 'Pediatric Nursing', 'Gerontology', 'Clinical Practicum II'] },
      { prefix: 'NUTR', name: 'Nutrition', field: 'Public Health', courses: ['Fundamentals of Nutrition', 'Macronutrients & Metabolism', 'Lifecycle Nutrition', 'Applied Dietetics', 'Food Science', 'Sports Nutrition', 'Public Health Nutrition', 'Advanced Medical Nutrition Therapy', 'Nutrition Assessment & Counseling'] },
      { prefix: 'PHRM', name: 'Pharmacy', field: 'Clinical Health', courses: ['Introduction to Pharmaceutical Sciences', 'Human Physiology for Pharmacy', 'Pharmaceutical Chemistry', 'Pharmacology I', 'Pharmaceutics & Drug Delivery', 'Pharmacology II', 'Pharmacotherapeutics', 'Clinical Pharmacy Practicum', 'Pharmacoepidemiology & Drug Safety'] },
      { prefix: 'KINE', name: 'Kinesiology', field: 'Kinesiology', courses: ['Foundations of Kinesiology', 'Functional Anatomy', 'Exercise Physiology', 'Biomechanics', 'Motor Learning & Control', 'Strength & Conditioning', 'Athletic Injury & Rehabilitation', 'Exercise Testing & Prescription', 'Adapted Physical Activity'] },
      { prefix: 'NEUR', name: 'Neuroscience', field: 'Neuroscience', courses: ['Foundations of Neuroscience', 'Neuroanatomy', 'Cellular & Molecular Neuroscience', 'Cognitive Neuroscience', 'Neurophysiology', 'Neuropharmacology', 'Developmental Neurobiology', 'Computational Neuroscience', 'Clinical Neuroscience & Disorders'] },
    ],
  },
  {
    name: 'Computer Science',
    majors: [
      { prefix: 'COMP', name: 'Computer Science', field: 'Computer Science', courses: ['Introduction to Programming', 'Data Structures', 'Algorithms', 'Operating Systems', 'Computer Architecture', 'Compiler Design', 'Game Development', 'Parallel Computing', 'Web Development'] },
      { prefix: 'DATA', name: 'Data Science', field: 'Mathematics', courses: ['Fundamentals of Data Science', 'Statistical Modeling', 'Machine Learning', 'Data Visualization', 'Data Mining', 'Big Data Systems', 'Time Series Analysis', 'Natural Language Processing', 'Bayesian Statistics'] },
      { prefix: 'CYBR', name: 'Cybersecurity', field: 'Information Systems', courses: ['Introduction to Cybersecurity', 'Network Security', 'Cryptography', 'Ethical Hacking', 'Security Operations', 'Cloud Security', 'Digital Forensics', 'Security Risk Management', 'Software Security Testing'] },
      { prefix: 'SOFT', name: 'Software Engineering', field: 'Computer Science', courses: ['Introduction to Software Development', 'Software Requirements', 'Software Testing & QA', 'Database Systems', 'Object-Oriented Design', 'Agile Methodologies', 'Mobile Application Development', 'UI/UX', 'DevOps'] },
      { prefix: 'ARTF', name: 'Artificial Intelligence', field: 'Artificial Intelligence', courses: ['Introduction to Artificial Intelligence', 'AI Programming', 'Knowledge Representation', 'Neural Networks', 'Advanced Machine Learning', 'Deep Learning', 'Robotics & Perception', 'Computer Vision', 'AI Ethics & Society'] },
      { prefix: 'INFO', name: 'Information Systems', field: 'Information Systems', courses: ['Introduction to Information Systems', 'Systems Analysis & Design', 'Database Management', 'Enterprise Resource Planning', 'IT Infrastructure', 'Business Process Modeling', 'E-commerce Strategy', 'Information Security Management', 'Data Warehousing'] },
    ],
  },
];

// Every undergraduate major's course-code prefix, which is also its program
// id in `s.halls` (types.ts's HallSlot). Read by the loader's hall sanitizer
// and the invariant sweep.
export function majorPrefixes(): string[] {
  return SCHOOLS.flatMap((school) => school.majors.map((major) => major.prefix));
}

// A program as the halls model sees it: the unit that takes a slot. The 42
// majors and the graduate programs, keyed by the id `s.halls` and
// `s.programOffers` carry. Derived here because the engine has no notion of
// "program".
export type ProgramKind = 'major' | 'graduate';
export interface ProgramInfo {
  id: string;            // the slot id: a major prefix or a GRADUATE_PROGRAMS id
  kind: ProgramKind;
  name: string;
  school: string;        // the SchoolSeed name; a graduate program's homeSchool
  field: string | null;  // the Faculty field a major's every course requires; null for graduate programs, which author it per course
  entryCourseId: string; // the tier-1 (or first) course — founding a program starts this one
  courseIds: string[];   // every course, in tier order
}

export function programs(): ProgramInfo[] {
  const out: ProgramInfo[] = [];
  for (const school of SCHOOLS) {
    for (const major of school.majors) {
      const courseIds = NUMS.map((num) => nodeId(major.prefix, num));
      out.push({
        id: major.prefix, kind: 'major', name: major.name, school: school.name, field: major.field,
        entryCourseId: courseIds[0], courseIds,
      });
    }
  }
  for (const program of GRADUATE_PROGRAMS) {
    const courseIds = graduateCourseIds(program);
    out.push({
      id: program.id, kind: 'graduate', name: program.name, school: program.homeSchool, field: null,
      entryCourseId: courseIds[0], courseIds,
    });
  }
  return out;
}

// Memoised: the catalog is static, and the map's hall pips call this for
// every filled slot on every render.
let programIndex: Map<string, ProgramInfo> | null = null;
export function programById(id: string): ProgramInfo | undefined {
  if (!programIndex) programIndex = new Map(programs().map((p) => [p.id, p]));
  return programIndex.get(id);
}

// Which program a course belongs to — the id `s.halls` would house it
// under — or undefined for a Buildable that is not a course of any program.
// Memoised: the catalog is static, and meetsUnlockGates asks this for
// every locked course on every tick.
let courseProgramMap: Map<string, string> | null = null;
export function programOfCourse(courseId: string): string | undefined {
  if (!courseProgramMap) {
    courseProgramMap = new Map();
    for (const program of programs()) {
      for (const id of program.courseIds) courseProgramMap.set(id, program.id);
    }
  }
  return courseProgramMap.get(courseId);
}

// ---------------------------------------------------------------------
// Cross-major/cross-school prereq bridges: a small hand-picked set rather
// than a systematic rule, so the one-major-at-a-time pacing holds. Each entry
// adds prereqs on top of the course's own within-major chain.
//
// Rules, checked by test/curriculum-graph.test.ts:
//   1. Never point up the tier climb. A tier-2 course may not require a
//      tier-3 capstone, or a major's establishment (its tier-2 quartet, which
//      `program-established:` and the professional-school gates read) would
//      wait on another school's endgame. Capstone-to-capstone is fine.
//   2. Never repeat the backbone: a tier-3 course already requires its
//      major's tier-2 quartet and, through it, the tier-1 course.
//   3. Never name a course whose prereq closure contains a `facilityType:
//      'lab'` Buildable or a `schoolGate`. A bridge may cost a course or a
//      hall slot in another school, never that school's lab and founding.
//
// Grouped by the school of the bridged course.
// ---------------------------------------------------------------------
export const CROSS_MAJOR_BRIDGES: Record<string, string[]> = {
  // --- Business ---
  FINA140: ['ECON110'],           // International Finance needs macroeconomics
  FINA220: ['COMP110'],           // Fintech & Blockchain needs data structures — a distributed ledger is a data structure before it is a financial product
  ACCT240: ['INFO101'],           // Accounting Information Systems needs the information-systems fundamentals it is an application of
  ECON120: ['MATH120'],           // Econometrics needs probability & statistics
  ECON140: ['HIST101'],           // Economic History needs world history
  ECON240: ['ENVS101'],           // Environmental Economics needs the environmental science it prices
  MRKT130: ['INFO101'],           // Digital Marketing Strategy needs basic IT literacy
  SPCO130: ['INDE120'],           // Quality Management draws on industrial safety/ergonomics
  SPCO220: ['MGMT120'],           // Inventory Control Systems needs operations management
  SPCO230: ['DATA101'],           // Data Analytics for Operations needs the data-science fundamentals
  SPCO240: ['MGMT120'],           // Transportation Management needs operations management

  // --- Engineering ---
  MECH210: ['ELEC101'],           // Robotics needs circuits — the half of a robot that is not mechanism
  AERO130: ['CHEN110'],           // Spacecraft Propulsion needs chemical thermodynamics
  AERO210: ['MATH101'],           // Astrodynamics needs calculus
  AERO220: ['MECH120'],           // Rocketry needs thermodynamics
  ELEC130: ['PHYS110'],           // Electromagnetics needs undergraduate electricity & magnetism
  CHEN220: ['CHEM120'],           // Biochemical Engineering needs organic chemistry. Not CHEM210: a capstone in a lab-gated major would make Engineering require the School of Science and its lab (rule 3 above)
  CHEN230: ['CHEM120'],           // Polymer Science needs organic chemistry: the tier-3 climb already requires the tier-2 chemistry (rule 2 above), so the bridge goes one step deeper, into the Chemistry major
  CIVE140: ['SPCO101'],           // Transportation Engineering needs the supply-chain fundamentals it moves goods for. NOT SPCO240 ("Transportation Management"), which is a tier-3 capstone: this is a tier-2 course, and rule 1 above is why — bridging a tier-2 course to a capstone would hold Civil Engineering's ESTABLISHMENT behind most of a Business major. SPCO101 is also the lightest honest stand-in available, an entry course gating on nothing, so Civil Engineering doesn't quietly acquire a Business Hall dependency either
  CIVE220: ['ENVS101'],           // Environmental Impact Assessment needs environmental science
  CIVE230: ['MGMT120'],           // Construction Management needs operations management. Not MGMT210, which requires Management's whole tier-2 quartet and would pull in most of a Business major
  CIVE240: ['SOCY101'],           // Urban Planning needs the sociology of the people being planned for
  INDE210: ['COMP101'],           // Simulation Modeling needs introductory programming

  // --- Arts & Media ---
  GRDS130: ['MDIA101'],           // Layout Design draws on mass-communication fundamentals
  GRDS210: ['COMP101'],           // Web Design needs introductory programming
  MDIA220: ['DATA101'],           // Social Media Analytics needs data-science fundamentals (the catalogue's nearest thing to "data analytics" — there is no course by that name)
  CRWR210: ['ENGL101'],           // Screenwriting needs introduction to literary studies
  FILM210: ['ANTH101'],           // Documentary Filmmaking needs anthropology — a documentary is fieldwork with a camera
  ARTF240: ['PHIL110'],           // AI Ethics & Society draws on philosophical ethics

  // --- Social Sciences & Humanities ---
  ANTH110: ['SOCY101'],           // Cultural Anthropology and Sociology share a department and a starting point
  HIST230: ['ANTH101'],           // Historical Anthropology needs introduction to anthropology
  POLS140: ['ECON110'],           // Public Policy Analysis needs macroeconomics

  // --- Science ---
  CHEM210: ['BIOL101'],           // Biochemistry needs biology I
  PSYC220: ['BIOL101', 'NEUR101'], // Biopsychology needs biology fundamentals AND foundations of neuroscience — the two halves it actually sits between

  // --- Health Science ---
  PHLT110: ['MATH120'],           // Epidemiology needs probability & statistics
  PHLT130: ['POLS130'],           // Health Policy & Management needs government fundamentals
  NUTR130: ['BIOL101'],           // Applied Dietetics needs biology fundamentals
  KINE120: ['BIOL101'],           // Exercise Physiology needs biology fundamentals
  NEUR110: ['BIOL101'],           // Neuroanatomy needs biology fundamentals
  NEUR130: ['PSYC101'],           // Cognitive Neuroscience needs general psychology — the Science/Health bridge, in prereq form
  NEUR210: ['PHRM101'],           // Neuropharmacology needs introduction to pharmaceutical sciences
  PHRM120: ['CHEM101'],           // Pharmaceutical Chemistry needs general chemistry

  // --- Computer Science ---
  DATA120: ['COMP101'],           // Machine Learning needs programming fundamentals
  DATA240: ['MATH120'],           // Bayesian Statistics needs probability & statistics
  ARTF130: ['DATA120'],           // Neural Networks builds on Machine Learning
  CYBR130: ['COMP110'],           // Ethical Hacking needs real programming chops
};

// Research facilities ("labs"): each listed major gets one, gating all four
// of its tier-3 courses, with a flat upkeep since it serves one major. A lab
// is also the research gate (docs/design/research.md): every school has at
// least one, and labEquippedFields equips every field a school teaches once
// any of its facilities stands. Nursing's clinical capstones gate on the
// clinic instead (CLINICAL_PRACTICUM_GATE). Facilities differ only in name.
const LAB_GATED_MAJOR_PREFIXES = [
  // Lab sciences and engineering.
  'CHEN', 'CHEM', 'BIOL', 'PHYS', 'MECH', 'ELEC', 'CIVE', 'AERO', 'NEUR',
  // One per remaining school, in the major where that kind of work most
  // plausibly happens.
  'ECON', 'COMP', 'HIST', 'FILM',
];

// Where "{Major} Labs" would be the wrong name for the building.
const RESEARCH_FACILITY_NAMES: Partial<Record<string, string>> = {
  ECON: 'Experimental Economics Lab',
  COMP: 'Computing Research Center',
  HIST: 'Humanities Research Institute',
  FILM: 'Media Production Studio',
};
const RESEARCH_FACILITY_BLURBS: Partial<Record<string, string>> = {
  ECON: 'Behavioral labs and market-simulation suites',
  COMP: 'A compute cluster and research offices',
  HIST: 'Archives, reading rooms and a documents collection',
  FILM: 'Sound stages, edit bays and a screening theater',
};
const LAB_COST = 700_000;
const LAB_WEEKS = 16;
const LAB_UPKEEP_PER_WEEK = 1_400; // ~$73k/yr — specialized equipment is expensive to keep running, and a lab serves one major's students rather than the whole campus
// Each standing lab adds this to the campus-wide research-output multiplier,
// read live off effects.researchRateBonus. Small on purpose: the gate is the
// decision, the multiplier the reward for building several. The first lab
// anywhere also offers the College -> University charter.
const LAB_RESEARCH_RATE_BONUS = 0.12;
function labId(prefix: string): string {
  return `LAB-${prefix}`;
}

// Studio Art's capstones gate on the Art Gallery (facilitiesData.ts), the
// same facility-gates-capstone mechanism as the labs. The gallery unlocks on
// Studio Art's tier-2 quartet, so this cannot be circular. Music's gated on
// the Performing Arts Center until Plan 51 retired it for the Arts Center,
// which is earned by the whole Arts & Media curriculum and so cannot gate
// part of it.
const ARTS_CAPSTONE_GATE: Partial<Record<string, string>> = {
  SART: ART_GALLERY_ID,
};

// Clinical coursework gates on a health-chain facility. Keyed by course, not
// major, because only the genuinely clinical courses need it: all four of
// Nursing's capstones but only one of Pharmacy's. The MD's clerkship needs
// the hospital. The health chain's prereqs never include a course, so this
// cannot be circular.
const CLINICAL_PRACTICUM_GATE: Partial<Record<string, string>> = {
  NURS210: HEALTH_CENTER_TIER2_ID, // Critical Care Nursing
  NURS220: HEALTH_CENTER_TIER2_ID, // Pediatric Nursing
  NURS230: HEALTH_CENTER_TIER2_ID, // Gerontology
  NURS240: HEALTH_CENTER_TIER2_ID, // Clinical Practicum II
  PHRM230: HEALTH_CENTER_TIER2_ID, // Clinical Pharmacy Practicum
  MED610: HEALTH_CENTER_TIER3_ID,  // Advanced Clinical Practicum — the MD's clerkship year
};

// ---------------------------------------------------------------------
// Graduate programs (docs/design/graduate-programs.md): small clusters of
// high-tier `course` Buildables gated on an undergraduate parent, feeding
// the same prestige stock and faculty demand as every other course.
//
// Two hard boundaries:
//   1. No second population: no graduate-student count, housing or
//      admissions funnel.
//   2. No bespoke per-school system: medicine, law and the MBA are
//      mechanically identical and differ only in the table below. Needing a
//      rule of its own for one is the signal to reopen the design.
//
// The gate (graduateGateMet, Plan 51): every undergraduate course in the
// program's home school taught, and its host standing (projectData.ts's
// GRADUATE_HOSTS), where it is then housed rather than in a hall.
// ---------------------------------------------------------------------

// The most expensive courses in the game, a rung above tier 3, so a mature
// school with a finished catalog still has something academic to buy.
// Professional schools cost more than doctorates.
const PROFESSIONAL_COURSE_COST = 6_000_000;
const PROFESSIONAL_COURSE_WEEKS = 40;
const PROFESSIONAL_COURSE_UPKEEP_PER_WEEK = 12_000;
const DOCTORAL_COURSE_COST = 4_000_000;
const DOCTORAL_COURSE_WEEKS = 32;
const DOCTORAL_COURSE_UPKEEP_PER_WEEK = 7_000;

export type GraduateProgramType = 'professional' | 'doctoral';

interface GraduateCourseSeed {
  num: number;    // course number within the program (5xx professional, 7xx doctoral)
  title: string;
  field: string;  // the Faculty field this ONE course requires — authored per course rather than per-major, which is what lets medicine lean on the health AND science departments at once
}

export interface GraduateProgramSeed {
  id: string;              // the course-id prefix and the `grad-program-complete:` milestone subject
  // The prefix players read, where the id is padded to four letters
  // (MBAX, MFAX, LAWS); defaults to the id.
  code?: string;
  name: string;
  degree: string;          // the credential, for display only
  type: GraduateProgramType;
  // The program's academic home: where it is displayed, whose research
  // fields it joins (researchSchools()), the school it counts as when housed
  // (systems/techtree/schools.ts), and the curriculum its gate reads.
  homeSchool: string;
  // Relative weight in prestige's graduate-breadth term (prestigeSystem.ts's
  // GRADUATE_PROGRAM_SHARE): a share of an already-capped input, never a
  // bonus. The only way a program may move standing beyond its course count.
  prestigeWeight: number;
  blurb: string;           // one line, used to build every course description
  courses: GraduateCourseSeed[];
}

// Ten programs, 53 courses: each a handful of high-tier courses that
// complete into a milestone, not a second nine-course major.
const GRADUATE_PROGRAMS: GraduateProgramSeed[] = [
  {
    id: 'MED', name: 'School of Medicine', degree: 'MD', type: 'professional',
    homeSchool: 'Health Science',
    prestigeWeight: 2.0,
    blurb: 'the medical school',
    courses: [
      { num: 501, title: 'Foundations of Human Medicine', field: 'Clinical Health' },
      { num: 510, title: 'Gross Anatomy & Histology', field: 'Biology' },
      { num: 520, title: 'Pathophysiology & Pharmacotherapy', field: 'Clinical Health' },
      { num: 530, title: 'Clinical Neurology', field: 'Neuroscience' },
      { num: 540, title: 'Evidence-Based Practice & Population Medicine', field: 'Public Health' },
      { num: 550, title: 'Clerkship & Residency Preparation', field: 'Clinical Health' },
      { num: 560, title: 'Immunology & Infectious Disease', field: 'Biology' },
      { num: 570, title: 'Medical Genetics & Genomics', field: 'Biology' },
      { num: 580, title: 'Psychiatry & Behavioral Medicine', field: 'Neuroscience' },
      { num: 590, title: 'Surgical Principles & Perioperative Care', field: 'Clinical Health' },
      { num: 600, title: 'Global & Public Health Systems', field: 'Public Health' },
      { num: 610, title: 'Advanced Clinical Practicum', field: 'Clinical Health' },
    ],
  },
  {
    id: 'LAWS', code: 'LAW', name: 'School of Law', degree: 'JD', type: 'professional',
    homeSchool: 'Social Sciences & Humanities',
    prestigeWeight: 1.6,
    blurb: 'the law school',
    courses: [
      { num: 501, title: 'Foundations of American Law', field: 'Law' },
      { num: 510, title: 'Contracts & Torts', field: 'Law' },
      { num: 520, title: 'Civil Procedure & Evidence', field: 'Law' },
      { num: 530, title: 'Constitutional Law Seminar', field: 'Law' },
      { num: 540, title: 'Legal Clinic & Advocacy', field: 'Law' },
      { num: 550, title: 'Property & Real Estate Law', field: 'Law' },
      { num: 560, title: 'Criminal Law & Procedure', field: 'Law' },
      { num: 570, title: 'Comparative & International Law', field: 'Law' },
    ],
  },
  {
    id: 'MBAX', code: 'MBA', name: 'Graduate School of Business', degree: 'MBA', type: 'professional',
    homeSchool: 'Business',
    prestigeWeight: 1.4,
    blurb: 'the MBA program',
    courses: [
      { num: 501, title: 'Managerial Foundations', field: 'Management' },
      { num: 510, title: 'Corporate Finance & Valuation', field: 'Accounting & Finance' },
      { num: 520, title: 'Marketing Strategy', field: 'Marketing' },
      { num: 530, title: 'Operations & Business Analytics', field: 'Operations Research' },
      { num: 540, title: 'Capstone Consulting Practicum', field: 'Management' },
    ],
  },
  {
    id: 'PHDE', name: 'Doctoral Program in Engineering', degree: 'PhD', type: 'doctoral',
    homeSchool: 'Engineering',
    prestigeWeight: 1.0,
    blurb: 'the engineering doctorate',
    courses: [
      { num: 701, title: 'Doctoral Research Methods in Engineering', field: 'Mechanical Engineering' },
      { num: 710, title: 'Advanced Continuum & Structural Theory', field: 'Civil Engineering' },
      { num: 720, title: 'Doctoral Seminar in Applied Electromagnetics', field: 'Electrical Engineering' },
      { num: 730, title: 'Dissertation Research in Engineering', field: 'Operations Research' },
    ],
  },
  {
    id: 'PHDS', name: 'Doctoral Program in the Natural Sciences', degree: 'PhD', type: 'doctoral',
    homeSchool: 'Science',
    prestigeWeight: 1.0,
    blurb: 'the natural-sciences doctorate',
    courses: [
      { num: 701, title: 'Doctoral Research Methods in the Sciences', field: 'Mathematics' },
      { num: 710, title: 'Advanced Quantum & Statistical Theory', field: 'Physics' },
      { num: 720, title: 'Advanced Synthesis & Structure Determination', field: 'Chemistry' },
      { num: 730, title: 'Dissertation Research in the Natural Sciences', field: 'Biology' },
    ],
  },
  {
    id: 'PHDH', name: 'Doctoral Program in Health Science', degree: 'PhD', type: 'doctoral',
    homeSchool: 'Health Science',
    prestigeWeight: 1.0,
    blurb: 'the health-science doctorate',
    courses: [
      { num: 701, title: 'Doctoral Research Methods in Health Science', field: 'Public Health' },
      { num: 710, title: 'Systems & Cognitive Neuroscience Seminar', field: 'Neuroscience' },
      { num: 720, title: 'Translational Clinical Research', field: 'Clinical Health' },
      { num: 730, title: 'Dissertation Research in Health Science', field: 'Kinesiology' },
    ],
  },
  {
    id: 'PHDC', name: 'Doctoral Program in Computing', degree: 'PhD', type: 'doctoral',
    homeSchool: 'Computer Science',
    prestigeWeight: 1.0,
    blurb: 'the computing doctorate',
    courses: [
      { num: 701, title: 'Doctoral Research Methods in Computing', field: 'Computer Science' },
      { num: 710, title: 'Advanced Seminar in Learning Theory', field: 'Artificial Intelligence' },
      { num: 720, title: 'Foundations of Computation', field: 'Mathematics' },
      { num: 730, title: 'Dissertation Research in Computing', field: 'Information Systems' },
    ],
  },
  {
    id: 'PHDL', name: 'Doctoral Program in the Humanities', degree: 'PhD', type: 'doctoral',
    homeSchool: 'Social Sciences & Humanities',
    prestigeWeight: 1.0,
    blurb: 'the humanities doctorate',
    courses: [
      { num: 701, title: 'Doctoral Research Methods in the Humanities', field: 'History' },
      { num: 710, title: 'Advanced Seminar in Literary Theory', field: 'English' },
      { num: 720, title: 'Doctoral Seminar in Social Theory', field: 'Sociology' },
      { num: 730, title: 'Dissertation Research in the Humanities', field: 'Philosophy' },
    ],
  },
  {
    // Business's doctorate (Plan 51), so the Graduate College houses six,
    // like a hall. Its research joins the economics lab's.
    id: 'PHDB', code: 'PhD', name: 'Doctoral Program in Economics', degree: 'PhD', type: 'doctoral',
    homeSchool: 'Business',
    prestigeWeight: 1.0,
    blurb: 'the economics doctorate',
    courses: [
      { num: 701, title: 'Doctoral Research Methods in Economics', field: 'Economics' },
      { num: 710, title: 'Advanced Microeconomic Theory', field: 'Economics' },
      { num: 720, title: 'Doctoral Seminar in Financial Economics', field: 'Accounting & Finance' },
      { num: 730, title: 'Dissertation Research in Economics', field: 'Economics' },
    ],
  },
  {
    // The MFA takes the doctoral rung deliberately: that selects the lower
    // cost, and a research credit that fits, since the studio already counts
    // exhibited work as research (researchData.ts's DISCIPLINE_VOCAB).
    id: 'MFAX', code: 'MFA', name: 'Master of Fine Arts', degree: 'MFA', type: 'doctoral',
    homeSchool: 'Arts & Media',
    prestigeWeight: 1.0,
    blurb: 'the MFA program',
    courses: [
      { num: 701, title: 'Graduate Studio Practice', field: 'Art & Design' },
      { num: 710, title: 'Advanced Fiction & Poetry Workshop', field: 'English' },
      { num: 720, title: 'Graduate Composition Seminar', field: 'Music' },
      { num: 730, title: 'Thesis Exhibition & Production', field: 'Communication' },
    ],
  },
];

export function graduatePrograms(): GraduateProgramSeed[] {
  return GRADUATE_PROGRAMS;
}

export function graduateProgram(id: string): GraduateProgramSeed | undefined {
  return GRADUATE_PROGRAMS.find((program) => program.id === id);
}

export function graduateCourseIds(program: GraduateProgramSeed): string[] {
  return program.courses.map((course) => `${program.id}${course.num}`);
}

// A school's undergraduate curriculum: every course of every one of its
// majors, graduate programs apart.
export function schoolCurriculumIds(school: string): string[] {
  const seed = SCHOOLS.find((x) => x.name === school);
  return seed ? seed.majors.flatMap((major) => NUMS.map((num) => nodeId(major.prefix, num))) : [];
}

// Every one of those courses taught (Plan 51): what a graduate program, and
// the project that houses it, wait on.
export function curriculumComplete(s: GameState, school: string): boolean {
  const ids = schoolCurriculumIds(school);
  if (ids.length === 0) return false;
  const done = new Set(s.tech.filter((t) => t.kind === 'course' && t.status === 'done').map((t) => t.id));
  return ids.every((id) => done.has(id));
}

// The school, or with ANY_SCHOOL any school, whose curriculum is complete.
export function curriculumGateMet(s: GameState, school: string): boolean {
  return school === ANY_SCHOOL ? SCHOOLS.some((x) => curriculumComplete(s, x.name)) : curriculumComplete(s, school);
}

// The graduate gate (Plan 51): the home school's undergraduate curriculum
// taught, and the program's host standing.
export function graduateGateMet(s: GameState, programId: string): boolean {
  const program = graduateProgram(programId);
  const host = GRADUATE_HOSTS[programId];
  if (!program || !host) return false;
  const building = s.tech.find((t) => t.id === host);
  return !!building && standsOnCampus(building) && curriculumComplete(s, program.homeSchool);
}

// The gate in words, for the course description and the Curriculum tab's
// section head. Derived from the same seed the predicate reads, so the
// sentence and the rule cannot disagree.
export function graduateGateDescription(program: GraduateProgramSeed): string {
  return `every ${program.homeSchool} course is taught and ${hostName(GRADUATE_HOSTS[program.id])} stands`;
}

// The display name of a research facility, by its Buildable id — the same
// rule initialTech() uses to name it, so the gate sentence and the build
// tray cannot disagree. Undefined for an id that names no facility.
function researchFacilityName(facilityId: string): string | undefined {
  for (const school of SCHOOLS) {
    for (const major of school.majors) {
      if (LAB_GATED_MAJOR_PREFIXES.includes(major.prefix) && labId(major.prefix) === facilityId) {
        return RESEARCH_FACILITY_NAMES[major.prefix] ?? `${major.name} Labs`;
      }
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------
// Descriptions: each undergraduate course's sentence is authored in
// courseDescriptions.ts (test/course-descriptions.test.ts checks coverage).
// Graduate courses use a generated line.
// ---------------------------------------------------------------------
const FOUNDERS_HALL_DESCRIPTION = `The founding hall, standing since the college opened: ${ACADEMIC_HALL_SLOTS} program slots, three of them teaching from the first day.`;

function nodeId(prefix: string, num: number): string {
  return `${prefix}${num}`;
}

// Expand the seed data into the flat Buildable[] the engine consumes:
// 378 course Buildables, Founders Hall, the hall chain and the graduate
// catalog.
export function initialTech(): Buildable[] {
  const nodes: Buildable[] = [];

  for (const school of SCHOOLS) {
    for (const major of school.majors) {
      const t1Id = nodeId(major.prefix, NUMS[0]);
      const t2Ids = [1, 2, 3, 4].map((i) => nodeId(major.prefix, NUMS[i]));
      const needsLab = LAB_GATED_MAJOR_PREFIXES.includes(major.prefix);

      if (needsLab) {
        nodes.push({
          id: labId(major.prefix),
          kind: 'facility',
          facilityType: 'lab',
          name: researchFacilityName(labId(major.prefix))!,
          description: `${RESEARCH_FACILITY_BLURBS[major.prefix] ?? 'Specialized lab space'} — gates the ${major.name} program's capstone (tier-3) coursework, and lets the college produce research.`,
          cost: LAB_COST,
          duration: LAB_WEEKS,
          // Buildable once the entry course is done and the school is
          // founded (schoolGate), so a lab cannot be an expensive,
          // useless purchase a decade before anything needs it.
          prereqs: [t1Id],
          schoolGate: school.name,
          status: 'locked',
          effects: {
            upkeepPerWeek: LAB_UPKEEP_PER_WEEK,
            researchRateBonus: LAB_RESEARCH_RATE_BONUS,
          },
        });
      }

      major.courses.forEach((title, i) => {
        const num = NUMS[i];
        const tier = TIERS[i];
        const id = nodeId(major.prefix, num);

        let prereqs: string[] = [];
        // Tier 1 has no prereqs: every course waits on the program being
        // housed instead (techSystem.ts's meetsUnlockGates).
        if (tier === 2) prereqs = [t1Id];
        else if (tier === 3) {
          const artsGate = ARTS_CAPSTONE_GATE[major.prefix];
          prereqs = [
            ...t2Ids,
            ...(needsLab ? [labId(major.prefix)] : []),
            ...(artsGate ? [artsGate] : []),
          ];
        }
        prereqs = [...prereqs, ...(CROSS_MAJOR_BRIDGES[id] ?? [])];
        const clinicalGate = CLINICAL_PRACTICUM_GATE[id];
        if (clinicalGate) prereqs = [...prereqs, clinicalGate];

        // Authored, one per course, and pinned complete by the
        // descriptions test — there is no fallback to generate one from.
        const description = COURSE_DESCRIPTIONS[id];

        nodes.push({
          id,
          kind: 'course',
          name: `${major.prefix} ${num} · ${title}`,
          description,
          cost: TIER_COURSE_COST[tier],
          duration: TIER_DURATION_WEEKS[tier],
          // Starts locked and unlocks as prereqs complete; the founding
          // programs' first courses are seeded 'done' by createInitialState.
          prereqs,
          status: 'locked',
          requiresFaculty: major.field,
          effects: { upkeepPerWeek: COURSE_UPKEEP_PER_WEEK[tier] },
        });
      });
    }

  }

  // Founders Hall: the one Buildable seeded 'done' and pre-placed at
  // founding (actions.ts's createInitialState). Its upkeep is live-read like
  // any other; its reputation is a baseline (FOUNDERS_HALL_REPUTATION_BONUS),
  // not an effect. Six slots: three hold the founding Social Sciences &
  // Humanities programs, and the three free rooms are the programs that
  // would dedicate that school.
  nodes.push({
    id: FOUNDERS_HALL_ID,
    kind: 'building',
    name: FOUNDERS_HALL_NAME,
    description: FOUNDERS_HALL_DESCRIPTION,
    cost: FOUNDERS_HALL_COST,
    duration: FOUNDERS_HALL_WEEKS,
    prereqs: [],
    status: 'done',
    slots: ACADEMIC_HALL_SLOTS,
    effects: { upkeepPerWeek: FOUNDERS_HALL_UPKEEP_PER_WEEK },
  });

  // The academic hall chain (see ACADEMIC_HALL_SLOTS above). Each rung
  // waits on the rung before, the dorm chain's shape; the first has no
  // Buildable prereq — its gate is FIRST_HALL_COURSE_GATE developed
  // courses (see techSystem.ts's meetsUnlockGates).
  ACADEMIC_HALL_NAMES.forEach((name, i) => {
    const cost = Math.round(ACADEMIC_HALL_FIRST_COST * ACADEMIC_HALL_COST_RATIO ** i / 1_000) * 1_000;
    nodes.push({
      id: academicHallId(i),
      kind: 'building',
      name,
      description: `An academic hall with ${ACADEMIC_HALL_SLOTS} program slots. Six programs of one school, housed together, found that school.`,
      cost,
      duration: i === 0 ? ACADEMIC_HALL_FIRST_WEEKS : ACADEMIC_HALL_WEEKS,
      prereqs: i === 0 ? [] : [academicHallId(i - 1)],
      status: 'locked',
      slots: ACADEMIC_HALL_SLOTS,
      effects: { upkeepPerWeek: ACADEMIC_HALL_UPKEEP_PER_WEEK },
    });
  });

  // Graduate programs: plain `course` Buildables carrying `graduateProgram`,
  // so techSystem.ts knows which gate they wait on. The entry course has no
  // prereqs (its gate and hall slot are dynamic), middle courses require the
  // entry course, and the last requires every course before it.
  for (const program of GRADUATE_PROGRAMS) {
    const professional = program.type === 'professional';
    const ids = graduateCourseIds(program);
    const entryId = ids[0];

    program.courses.forEach((course, i) => {
      const id = ids[i];
      const last = i === program.courses.length - 1;
      // The same clinical table as undergraduates (only the MD's clerkship
      // has an entry).
      const prereqs = [
        ...(i === 0 ? [] : last ? ids.slice(0, i) : [entryId]),
        ...(CLINICAL_PRACTICUM_GATE[id] ? [CLINICAL_PRACTICUM_GATE[id]!] : []),
      ];

      nodes.push({
        id,
        kind: 'course',
        graduateProgram: program.id,
        name: `${program.code ?? program.id} ${course.num} · ${course.title}`,
        description: i === 0
          ? `Founds ${program.blurb}${program.blurb.includes(program.degree) ? '' : ` (${program.degree})`}. Offered once ${graduateGateDescription(program)}, and housed there.`
          : `${program.degree} coursework in ${course.title}, part of the ${program.name}.`,
        cost: professional ? PROFESSIONAL_COURSE_COST : DOCTORAL_COURSE_COST,
        duration: professional ? PROFESSIONAL_COURSE_WEEKS : DOCTORAL_COURSE_WEEKS,
        prereqs,
        status: 'locked',
        requiresFaculty: course.field,
        effects: {
          upkeepPerWeek: professional
            ? PROFESSIONAL_COURSE_UPKEEP_PER_WEEK
            : DOCTORAL_COURSE_UPKEEP_PER_WEEK,
        },
      });
    });
  }

  return nodes;
}

// Milestone metadata (school -> each major's tier-2 and tier-3 ids) for
// techSystem.ts's checkMilestones(), kept out of the Buildable model.
export interface MilestoneMajor {
  name: string;
  prefix: string;
  tier2Ids: string[]; // exactly 4
  tier3Ids: string[]; // exactly 4
}
export interface MilestoneSchool {
  schoolName: string;
  majors: MilestoneMajor[];
}

export function milestoneSchools(): MilestoneSchool[] {
  return SCHOOLS.map((school) => ({
    schoolName: school.name,
    majors: school.majors.map((major) => ({
      name: major.name,
      prefix: major.prefix,
      tier2Ids: [1, 2, 3, 4].map((i) => nodeId(major.prefix, NUMS[i])),
      tier3Ids: [5, 6, 7, 8].map((i) => nodeId(major.prefix, NUMS[i])),
    })),
  }));
}

// Research metadata (school -> its lab Buildables -> the faculty fields that
// teach there) for researchData.ts's weeklyResearchPoints. Derived here
// because the engine has no notion of "school".
//
// Keyed by field because research is done by people, and a faculty member's
// only tie to a school is their field. A field that staffs majors in two
// schools appears under both, so a hire researches once either has a lab.
// Schools differ only in vocabulary (researchData.ts's DISCIPLINE_VOCAB).
export interface ResearchSchool {
  schoolName: string;
  labIds: string[];  // lab Buildable ids belonging to this school's majors; empty means this school can never produce research
  fields: string[];  // every Faculty field that teaches in this school (deduplicated)
}

// The field(s) a research facility is for: those of the lab-gated major it
// was authored for. Not researchSchools().fields (everyone who could staff a
// project in the school): conflating the two offered every lab in a school
// the same topic pool. Today one field, or none for a non-facility id.
export function labFields(facilityId: string): string[] {
  const fields: string[] = [];
  for (const school of SCHOOLS) {
    for (const major of school.majors) {
      if (LAB_GATED_MAJOR_PREFIXES.includes(major.prefix) && labId(major.prefix) === facilityId) {
        fields.push(major.field);
      }
    }
  }
  return fields;
}

// Fields whose work a facility may host: its own (labFields), plus every
// field its school teaches that has no facility anywhere on campus, so a
// department without a building can lead research in its school's.
//
// "No facility" is read campus-wide: a field with a facility is hosted only
// there (Biology work belongs in the Biology labs, not Neuroscience's), and a
// field with none is hosted by every school that teaches it. A field shared
// by two facilities is never widened here; ResearchTopic.labs settles those.
export function hostableFields(facilityId: string): string[] {
  const own = labFields(facilityId);
  if (own.length === 0) return own;
  const schools = researchSchools();
  const equipped = new Set(schools.flatMap((school) => school.labIds).flatMap((id) => labFields(id)));
  const home = schools.find((school) => school.labIds.includes(facilityId));
  const hosted = (home?.fields ?? []).filter((field) => !equipped.has(field));
  return [...own, ...hosted.filter((field) => !own.includes(field))];
}

export function researchSchools(): ResearchSchool[] {
  return SCHOOLS.map((school) => {
    const fields = new Set<string>(school.majors.map((major) => major.field));
    // Graduate programs' per-course fields count toward their home school,
    // so this stays "every field that teaches here". It is how Law, whose
    // demand is all graduate, becomes a hosted field (hostableFields).
    for (const program of GRADUATE_PROGRAMS) {
      if (program.homeSchool !== school.name) continue;
      for (const course of program.courses) fields.add(course.field);
    }
    return {
      schoolName: school.name,
      labIds: school.majors
        .filter((major) => LAB_GATED_MAJOR_PREFIXES.includes(major.prefix))
        .map((major) => labId(major.prefix)),
      fields: [...fields].sort(),
    };
  });
}

// Progressive-discovery metadata for the Curriculum tab (CurriculumTab.tsx).
// UI-only, and unlike milestoneSchools() it includes tier1Id, since the view
// shows a major's full climb.
export interface DiscoveryMajor {
  name: string;
  prefix: string;
  tier1Id: string;
  tier2Ids: string[]; // exactly 4
  tier3Ids: string[]; // exactly 4
}
// A graduate program as the Curriculum tab needs it.
export interface DiscoveryGraduateProgram {
  id: string;
  name: string;
  degree: string;
  type: GraduateProgramType;
  gate: string;       // the gate in words (see graduateGateDescription)
  courseIds: string[];
}
export interface DiscoverySchool {
  name: string;
  // The Curriculum tab keys its sections by `name`.
  majors: DiscoveryMajor[];
  // The graduate programs whose home school this is.
  graduate: DiscoveryGraduateProgram[];
}

export function discoverySchools(): DiscoverySchool[] {
  return SCHOOLS.map((school) => ({
    name: school.name,
    majors: school.majors.map((major) => ({
      name: major.name,
      prefix: major.prefix,
      tier1Id: nodeId(major.prefix, NUMS[0]),
      tier2Ids: [1, 2, 3, 4].map((i) => nodeId(major.prefix, NUMS[i])),
      tier3Ids: [5, 6, 7, 8].map((i) => nodeId(major.prefix, NUMS[i])),
    })),
    graduate: GRADUATE_PROGRAMS
      .filter((program) => program.homeSchool === school.name)
      .map((program) => ({
        id: program.id,
        name: program.name,
        degree: program.degree,
        type: program.type,
        gate: graduateGateDescription(program),
        courseIds: graduateCourseIds(program),
      })),
  }));
}

