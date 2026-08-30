import type { Buildable } from '../state/types';

/*
  Your real curriculum, expressed as seed data and expanded into Buildable[].
  36 majors across 7 schools (9 courses each) + a 6-course general-ed core =
  330 course Buildables, plus one 'building' Buildable per school (7) that
  gates each school's tier-2 courses — see README's "The milestone chain".

  Prerequisite rule (a clean four-stage climb per major, gen-ed included),
  now AUTHORED as plain ids rather than derived purely from tier:
    - the gen-ed core (six GE courses): no prereqs — the true root of the
      whole tree, available from day one
    - tier 1 (the 101 course): requires the entire gen-ed core — every
      major's entry course waits on the same shared foundation, not just
      its own school
    - tier 2 (110/120/130/140): requires the major's tier-1 course AND that
      school's building (a genuine cross-kind prereq — see the milestone
      chain: "completing all tier-1 in a school unlocks building that
      school; the school building unlocks the school's tier-2 courses")
    - tier 3 (210/220/230/240): requires ALL FOUR of the major's tier-2
      courses

  On top of that backbone, a curated dozen cross-major/cross-school prereq
  bridges (CROSS_MAJOR_BRIDGES below) are patched in — deliberately NOT a
  systematic web (see the PR notes on why a curated set was chosen over
  building out cross-major prereqs for all 330 courses).

  requiresFaculty, unlike the prereq bridges, IS systematic: every major
  seed carries one `field` (a Faculty.field from facultyData.ts's
  FACULTY_FIELDS), and every course in that major — all nine tiers —
  requires it, via GENED_FIELDS for the six gen-ed core courses. A major's
  field is the closest existing FACULTY_FIELDS entry to its actual
  discipline; several adjacent majors deliberately share one field (e.g.
  all of Business's majors bar Economics share 'Business') to keep the
  faculty-recruitment dropdown short rather than one field per major.

  "Tier" itself is a course-authoring concept only — it drives development
  time and course cost here, at seed-generation time, and is not part of
  the shared Buildable model (buildings don't have a tier). The generated
  `duration` and `prereqs` are plain data the engine reads with no
  knowledge of tier. Individual courses no longer grant reputation on
  their own completion — see prestigeSystem.ts: prestige is a stock driven
  by curriculum breadth (majors/schools completed, a stock the milestone
  chain below still tracks), not by course-development flow.
*/

const NUMS = [101, 110, 120, 130, 140, 210, 220, 230, 240];
const TIERS = [1, 2, 2, 2, 2, 3, 3, 3, 3] as const;

// Weeks needed to develop a course, scaled by tier — deliberately
// non-linear against a 52-week WEEKS_PER_YEAR (see state/types.ts) so a
// tier-1 entry course is still a real multi-week undertaking while a
// tier-3 capstone is a genuine multi-month commitment, not a blip.
const TIER_DURATION_WEEKS: Record<number, number> = { 1: 4, 2: 12, 3: 24 };

// Course development cost, scaled by tier so a tier-3 capstone is a
// markedly bigger financial commitment than a tier-1 entry course — see
// README's "Pacing model: money is the throttle". Buildings below are
// bigger investments still.
const TIER_COURSE_COST: Record<number, number> = { 1: 10_000, 2: 30_000, 3: 75_000 };

// A school building is a real construction project: a meaningful cost and
// a longer duration than any single course, reflecting "unlocks an entire
// school's tier-2 curriculum" being a much bigger milestone than any one
// course. General Studies has no majors (just the gen-ed core), so its
// "building" is smaller and cheaper — more of a starter hall than a full
// academic building.
const GENED_BUILDING_COST = 150_000;
const GENED_BUILDING_WEEKS = 20;
// General Studies Hall starts already built (see initialTech below), so
// this never flows through the normal completion-effects path — it's
// exported for createInitialState to fold directly into the founding
// reputation baseline instead. Academic buildings no longer grant capacity
// — capacity is tied exclusively to dormitories now (see campusData.ts);
// building out the curriculum unlocks courses/majors, not beds.
export const GENED_BUILDING_REPUTATION_BONUS = 1.5;

const SCHOOL_BUILDING_COST = 450_000;
const SCHOOL_BUILDING_WEEKS = 28;

interface MajorSeed {
  prefix: string;   // course code prefix, e.g. "FINA"
  name: string;     // major name
  field: string;    // Faculty.field every course in this major requires (see requiresFaculty note above)
  courses: string[]; // exactly 9 titles, in tier order (101,110,120,130,140,210,220,230,240)
}
interface SchoolSeed {
  name: string;
  buildingId: string;
  buildingName: string;
  core?: Array<[string, string]>; // [code, title] for gen-ed only
  majors: MajorSeed[];
}

const SCHOOLS: SchoolSeed[] = [
  {
    name: 'General Studies',
    buildingId: 'BLDG-GENSTUDIES',
    buildingName: 'General Studies Hall',
    core: [
      ['GE 110', 'College Writing'],
      ['GE 120', 'Calculus'],
      ['GE 130', 'Ethics I'],
      ['GE 140', 'Principles of Science'],
      ['GE 150', 'World Cultures'],
      ['GE 160', 'Communications & Public Speaking'],
    ],
    majors: [],
  },
  {
    name: 'Business',
    buildingId: 'BLDG-BUSINESS',
    buildingName: 'Business Hall',
    majors: [
      { prefix: 'FINA', name: 'Finance', field: 'Business', courses: ['Principles of Finance', 'Corporate Finance', 'Investment Analysis', 'Financial Modeling', 'International Finance', 'Real Estate Finance', 'Fintech & Blockchain', 'Risk Management', 'Behavioral Finance'] },
      { prefix: 'ACCT', name: 'Accounting', field: 'Business', courses: ['Introduction to Accounting', 'Financial Accounting', 'Managerial Accounting', 'Tax Fundamentals', 'Auditing Principles', 'Forensic Accounting', 'Governmental & Non-Profit Accounting', 'Advanced Cost Accounting', 'Accounting Information Systems'] },
      { prefix: 'MRKT', name: 'Marketing', field: 'Business', courses: ['Fundamentals of Marketing', 'Consumer Behavior', 'Market Research', 'Digital Marketing Strategy', 'Brand Management', 'Sports Marketing', 'Advertising & Promotion', 'Sales Management', 'Global Marketing'] },
      { prefix: 'ECON', name: 'Economics', field: 'Economics', courses: ['Microeconomics', 'Macroeconomics', 'Econometrics', 'Advanced Microeconomics', 'Economic History', 'Behavioral Economics', 'Public Finance', 'Game Theory', 'Environmental Economics'] },
      { prefix: 'MGMT', name: 'Management', field: 'Business', courses: ['Organizational Leadership', 'Human Resources Management', 'Operations Management', 'Business Ethics', 'Strategic Management', 'Project Management', 'Entrepreneurship', 'Conflict Resolution', 'Negotiations'] },
      { prefix: 'SPCO', name: 'Supply Chain & Operations', field: 'Business', courses: ['Introduction to Supply Chain', 'Logistics & Distribution', 'Procurement & Sourcing', 'Quality Management', 'Demand Planning', 'Global Supply Chains', 'Inventory Control Systems', 'Data Analytics for Operations', 'Transportation Management'] },
    ],
  },
  {
    name: 'Engineering',
    buildingId: 'BLDG-ENGINEERING',
    buildingName: 'Engineering Hall',
    majors: [
      { prefix: 'MECH', name: 'Mechanical Engineering', field: 'Physics', courses: ['Introduction to Mechanical Design', 'Statics & Dynamics', 'Thermodynamics', 'Fluid Mechanics', 'Materials Science', 'Robotics', 'HVAC Systems', 'Internal Combustion Engines', 'Finite Element Analysis'] },
      { prefix: 'ELEC', name: 'Electrical Engineering', field: 'Physics', courses: ['Circuits', 'Digital Logic Design', 'Signals & Systems', 'Electromagnetics', 'Microelectronics', 'Power Systems Analysis', 'Wireless Communications', 'Control Systems', 'VLSI Design'] },
      { prefix: 'CHEM', name: 'Chemical Engineering', field: 'Chemistry', courses: ['Chemistry I', 'Chemical Thermodynamics', 'Fluid Transport', 'Chemistry II', 'Chemical Reaction Engineering', 'Process Safety', 'Biochemical Engineering', 'Polymer Science', 'Sustainable Energy Technology'] },
      { prefix: 'CIVE', name: 'Civil Engineering', field: 'Physics', courses: ['Physics I', 'Structural Analysis', 'Soil Mechanics', 'Physics II', 'Transportation Engineering', 'Bridge Design', 'Environmental Impact Assessment', 'Construction Management', 'Urban Planning'] },
      { prefix: 'INDE', name: 'Industrial Engineering', field: 'Business', courses: ['Systems', 'Production Planning', 'Ergonomics & Safety', 'Quality Control', 'Facilities Design', 'Simulation Modeling', 'Supply Chain Analytics', 'Lean Manufacturing', 'Reliability Engineering'] },
      { prefix: 'AERO', name: 'Aerospace Engineering', field: 'Physics', courses: ['Introduction to Flight Dynamics', 'Aerodynamics', 'Aircraft Performance', 'Spacecraft Propulsion', 'Aerospace Structures', 'Astrodynamics', 'Rocketry', 'Helicopter Dynamics', 'Unmanned Aerial Systems'] },
    ],
  },
  {
    name: 'Arts & Media',
    buildingId: 'BLDG-ARTSMEDIA',
    buildingName: 'Arts & Media Center',
    majors: [
      { prefix: 'MDIA', name: 'Media Studies', field: 'Arts', courses: ['Mass Communication', 'Media Theory', 'Global Media Systems', 'Digital Culture', 'Media Ethics', 'Film Industry', 'Social Media Analytics', 'Photojournalism', 'Public Relations'] },
      { prefix: 'GRDS', name: 'Graphic Design', field: 'Arts', courses: ['Visual Communication', 'Typography', 'Digital Imaging', 'Layout Design', 'Branding & Identity', 'Web Design', 'Motion Graphics', 'Illustration', 'Publication Design'] },
      { prefix: 'CRWR', name: 'Creative Writing', field: 'English', courses: ['Introduction to Creative Writing', 'Fiction Workshop', 'Poetry Workshop', 'Nonfiction Workshop', 'Literary Editing', 'Screenwriting', 'Playwriting', 'Writing for Young Adults', 'Creative Writing Seminar'] },
      { prefix: 'MUSC', name: 'Music', field: 'Arts', courses: ['Music Theory I', 'Music Theory II', 'Music History Survey', 'Composition I', 'Applied Instrument/Voice', 'Jazz Improvisation', 'World Music', 'Music Technology', 'Composition II'] },
      { prefix: 'FILM', name: 'Film', field: 'Arts', courses: ['Introduction to Film Analysis', 'Cinematography', 'Screenwriting Workshop', 'Film Production', 'Directing Fundamentals', 'Documentary Filmmaking', 'History of World Cinema', 'Sound Design', 'Post-Production'] },
      { prefix: 'SART', name: 'Studio Art', field: 'Arts', courses: ['Fundamentals of 2D Design', 'Drawing', 'Painting', 'Sculpture', 'Art History Survey', 'Printmaking', 'Ceramics', 'Photography', 'Digital Art'] },
    ],
  },
  {
    name: 'Social Sciences & Humanities',
    buildingId: 'BLDG-SOCSCI',
    buildingName: 'Social Sciences & Humanities Hall',
    majors: [
      { prefix: 'ENGL', name: 'English', field: 'English', courses: ['Introduction to Literary Studies', 'British Literature Survey', 'American Literature Survey', 'Critical Theory', 'Advanced Composition', 'Shakespeare', 'Restoration & 18th Century Literature', 'Postcolonial Literature', 'Technical Writing'] },
      { prefix: 'PSYC', name: 'Psychology', field: 'Psychology', courses: ['General Psychology', 'Developmental Psychology', 'Cognitive Psychology', 'Abnormal Psychology', 'Research Methods in Psychology', 'Social Psychology', 'Biopsychology', 'Organizational Psychology', 'Health Psychology'] },
      { prefix: 'SOCY', name: 'Sociology', field: 'Sociology', courses: ['Introduction to Sociology', 'Social Stratification', 'Sociological Theory', 'Race & Ethnicity', 'Qualitative Research Methods', 'Criminology', 'Sociology of the Family', 'Urban Sociology', 'Sex & Gender'] },
      { prefix: 'POLS', name: 'Political Science', field: 'Sociology', courses: ['Civics', 'Comparative Politics', 'International Relations', 'American Government', 'Public Policy Analysis', 'Constitutional Law', 'Political Campaigns', 'Theories of Justice', 'Security Studies'] },
      { prefix: 'HIST', name: 'History', field: 'History', courses: ['World History', 'Research & Historiography', 'US History', 'European History', 'Ancient Civilizations', 'World War I & II', 'Archaeology', 'Anthropology', 'History of Science & Technology'] },
      { prefix: 'PHIL', name: 'Philosophy', field: 'Philosophy', courses: ['Introduction to Logic & Reasoning', 'Ethics II', 'Metaphysics', 'Epistemology', 'Ancient Greek Philosophy', 'Existentialism', 'Philosophy of Mind', 'Aesthetics', 'Symbolic Logic'] },
    ],
  },
  {
    name: 'Health Science',
    buildingId: 'BLDG-HEALTHSCI',
    buildingName: 'Health Sciences Building',
    majors: [
      { prefix: 'BIOL', name: 'Biology', field: 'Biology', courses: ['Biology I', 'Cell Biology', 'Genetics', 'Ecology', 'Evolution', 'Microbiology', 'Marine Biology', 'Plant Physiology', 'Immunology'] },
      { prefix: 'PHLT', name: 'Public Health', field: 'Biology', courses: ['Introduction to Public Health', 'Epidemiology', 'Biostatistics', 'Health Policy & Management', 'Environmental Health', 'Global Health', 'Health Promotion', 'Community Health Assessment', 'Maternal & Child Health'] },
      { prefix: 'NURS', name: 'Nursing', field: 'Biology', courses: ['Introduction to Professional Nursing', 'Anatomy & Physiology', 'Pharmacology', 'Health Assessment', 'Clinical Practicum I', 'Critical Care Nursing', 'Pediatric Nursing', 'Gerontology', 'Clinical Practicum II'] },
      { prefix: 'NUTR', name: 'Nutrition', field: 'Biology', courses: ['Fundamentals of Nutrition', 'Macronutrients & Metabolism', 'Lifecycle Nutrition', 'Applied Dietetics', 'Food Science', 'Sports Nutrition', 'Public Health Nutrition', 'Advanced Medical Nutrition Therapy', 'Culinary Nutrition'] },
      { prefix: 'PMED', name: 'Pre-Med', field: 'Chemistry', courses: ['Foundations of Medical Professions', 'Organic Chemistry', 'Biochemistry', 'Advanced Human Anatomy', 'Advanced Physiology', 'Medical Ethics', 'Healthcare Communications', 'Pathophysiology', 'Clinical Observation'] },
      { prefix: 'DENT', name: 'Dentistry', field: 'Biology', courses: ['Introduction to Oral Health', 'Oral Anatomy', 'Dental Materials Science', 'Preventative Dentistry', 'Clinical Dental Practicum I', 'Head & Neck Anatomy', 'Dental Radiography', 'Periodontology', 'Clinical Dental Practicum II'] },
    ],
  },
  {
    name: 'Computer Science',
    buildingId: 'BLDG-COMPSCI',
    buildingName: 'Computer Science Building',
    majors: [
      { prefix: 'COMP', name: 'Computer Science', field: 'CompSci', courses: ['Introduction to Programming', 'Data Structures', 'Algorithms', 'Operating Systems', 'Computer Architecture', 'Compiler Design', 'Game Development', 'Parallel Computing', 'Web Development'] },
      { prefix: 'DATA', name: 'Data Science', field: 'Mathematics', courses: ['Fundamentals of Data Science', 'Statistical Modeling', 'Machine Learning', 'Data Visualization', 'Data Mining', 'Big Data Systems', 'Time Series Analysis', 'Natural Language Processing', 'Bayesian Statistics'] },
      { prefix: 'CYBR', name: 'Cybersecurity', field: 'CompSci', courses: ['Introduction to Cybersecurity', 'Network Security', 'Cryptography', 'Ethical Hacking', 'Security Operations', 'Cloud Security', 'Digital Forensics', 'Risk Management', 'Software Security Testing'] },
      { prefix: 'SOFT', name: 'Software Engineering', field: 'CompSci', courses: ['Introduction to Software Development', 'Software Requirements', 'Software Testing & QA', 'Database Systems', 'Object-Oriented Design', 'Agile Methodologies', 'Mobile Application Development', 'UI/UX', 'DevOps'] },
      { prefix: 'ARTF', name: 'Artificial Intelligence', field: 'CompSci', courses: ['Introduction to Artificial Intelligence', 'AI Programming', 'Knowledge Representation', 'Neural Networks', 'Advanced Machine Learning', 'Deep Learning', 'Robotics & Perception', 'Computer Vision', 'AI Ethics & Society'] },
      { prefix: 'INFO', name: 'Information Systems', field: 'CompSci', courses: ['Introduction to Information Systems', 'Systems Analysis & Design', 'Database Management', 'Enterprise Resource Planning', 'IT Infrastructure', 'Business Process Modeling', 'E-commerce Strategy', 'Information Security Management', 'Data Warehousing'] },
    ],
  },
];

// The gen-ed core is the true foundation of the curriculum: every major's
// tier-1 entry course requires the whole 6-course core, not just its own
// school's building. Derived from SCHOOLS rather than re-listed so it can
// never drift from the General Studies core defined above.
const GENED_CORE_IDS: string[] = SCHOOLS.find((school) => school.core)!.core!.map(([code]) => code.replace(/\s/g, ''));

// requiresFaculty gates for the six gen-ed core courses — same idea as each
// major's own `field` above, just per-course instead of per-major since the
// core isn't a single discipline. Every field used here already appears in
// facultyData.ts's FACULTY_FIELDS.
const GENED_FIELDS: Record<string, string> = {
  GE110: 'English',      // College Writing
  GE120: 'Mathematics',  // Calculus
  GE130: 'Philosophy',   // Ethics I
  GE140: 'Physics',      // Principles of Science
  GE150: 'History',      // World Cultures
  GE160: 'English',      // Communications & Public Speaking
};

// ---------------------------------------------------------------------
// Curated content — deliberately small and hand-picked rather than a
// systematic web/rule. See the PR notes for why: a rule like "every
// course also requires one course from an adjacent major" would touch
// all 330 nodes and turn the curriculum into a much harder puzzle than
// README's climb describes; a dozen hand-placed bridges add texture
// without changing the core one-major-at-a-time pacing.
// ---------------------------------------------------------------------

// Cross-major/cross-school prereq bridges: each entry adds ONE extra
// prereq id on top of that course's normal within-major chain (its own
// tier-1 + school building, or its own tier-2 quartet). All are plausible
// real-world prerequisites, deliberately spanning different schools where
// it makes sense (e.g. Philosophy -> AI Ethics).
const CROSS_MAJOR_BRIDGES: Record<string, string[]> = {
  DATA120: ['COMP101'],  // Machine Learning needs programming fundamentals
  ARTF130: ['DATA120'],  // Neural Networks builds on Machine Learning
  CYBR130: ['COMP110'],  // Ethical Hacking needs real programming chops
  PMED120: ['CHEM101'],  // Biochemistry needs general chemistry
  NUTR130: ['BIOL101'],  // Applied Dietetics needs biology fundamentals
  MRKT130: ['INFO101'],  // Digital Marketing Strategy needs basic IT literacy
  FINA140: ['ECON110'],  // International Finance needs macroeconomics
  SPCO130: ['INDE120'],  // Quality Management draws on industrial safety/ergonomics
  PHLT130: ['POLS130'],  // Health Policy & Management needs government fundamentals
  ARTF240: ['PHIL110'],  // AI Ethics & Society draws on philosophical ethics
  GRDS130: ['MDIA101'],  // Layout Design draws on mass-communication fundamentals
  AERO130: ['CHEM110'],  // Spacecraft Propulsion needs chemical thermodynamics
};

// Labs/specialized academic buildings: a curated set of lab-heavy majors
// (hard sciences and clinical health majors) get a dedicated Lab Buildable
// that gates ALL FOUR of that major's tier-3 (capstone) courses — an extra
// prereq on top of the normal tier-2 quartet, same curated-bridge mechanism
// as CROSS_MAJOR_BRIDGES above rather than a systematic rule touching every
// course. Each lab is buildable once its major's tier-1 course is done (so
// well before tier-3 is reachable), carries no satisfaction effect of its
// own — its whole job is course-gating — and a flat recurring upkeep for
// specialized equipment (see facilitiesData.ts's servedUpkeep for the
// population-scaled version; labs are a flat cost instead, since one lab
// serves a major's cohort, not the whole campus).
const LAB_GATED_MAJOR_PREFIXES = ['CHEM', 'BIOL', 'MECH', 'ELEC', 'CIVE', 'AERO', 'NURS', 'DENT', 'PMED'];
const LAB_COST = 260_000;
const LAB_WEEKS = 16;
const LAB_UPKEEP_PER_WEEK = 350; // ~$18k/yr — in line with facilitiesData.ts's other single-instance facilities, not disproportionate to the $260k build cost
function labId(prefix: string): string {
  return `LAB-${prefix}`;
}

// ---------------------------------------------------------------------
// Descriptions. Every tier-1/core course (the 42 entry points players see
// first) gets a hand-written one-liner. Tier-2/tier-3 descriptions are
// generated from the course's own title through a small set of rotating,
// tier-appropriate phrasings — real catalog-style text naming the actual
// course, not generic "tier N" boilerplate, but not 288 individually
// hand-composed sentences either (see the PR notes on this tradeoff).
// ---------------------------------------------------------------------
const TIER1_DESCRIPTIONS: Record<string, string> = {
  GE110: 'Develops clear, structured academic writing through drafting, revision, and peer critique.',
  GE120: 'Covers limits, derivatives, and integrals, the mathematical toolkit for science and engineering coursework.',
  GE130: 'Surveys major ethical frameworks and applies them to everyday moral reasoning.',
  GE140: 'Introduces the scientific method through hands-on experiments across physics, chemistry, and biology.',
  GE150: 'Explores the histories, beliefs, and social structures of societies across the globe.',
  GE160: 'Builds confident, persuasive speaking and presentation skills for academic and professional settings.',

  FINA101: 'Introduces time value of money, risk, and the core tools of personal and corporate finance.',
  ACCT101: 'Covers the accounting cycle, financial statements, and the language of business record-keeping.',
  MRKT101: 'Surveys the marketing mix — product, price, place, and promotion — through real brand cases.',
  ECON101: 'Examines how individuals and firms make decisions under scarcity, from supply and demand to market structure.',
  MGMT101: 'Introduces leadership styles, team dynamics, and the fundamentals of managing people.',
  SPCO101: 'Traces how goods move from raw material to customer, and where supply chains break down.',

  MECH101: 'Introduces the design process, sketching, and basic mechanical systems.',
  ELEC101: 'Covers voltage, current, and resistance through hands-on circuit analysis and lab work.',
  CHEM101: 'Establishes atomic structure, bonding, and reaction fundamentals for chemical engineers.',
  CIVE101: 'Covers mechanics and forces, the physical foundation for structural and civil design.',
  INDE101: 'Introduces systems thinking for analyzing and improving industrial processes.',
  AERO101: 'Covers the forces of flight — lift, drag, thrust, and weight — and how aircraft respond to them.',

  MDIA101: 'Surveys how mass media shapes public opinion, culture, and information flow.',
  GRDS101: 'Introduces composition, color, and layout as tools for communicating visually.',
  CRWR101: 'Workshops short fiction and poetry to build a foundational creative practice.',
  MUSC101: 'Covers notation, scales, and harmony, the building blocks of Western music.',
  FILM101: 'Teaches close reading of cinema through shot composition, editing, and narrative structure.',
  SART101: 'Introduces line, shape, and composition through studio exercises in two-dimensional art.',

  ENGL101: 'Introduces close reading and literary analysis across poetry, fiction, and drama.',
  PSYC101: 'Surveys the major subfields of psychology, from cognition to clinical practice.',
  SOCY101: 'Examines how social structures, institutions, and group behavior shape everyday life.',
  POLS101: 'Covers the structures and processes of government and the rights and duties of citizenship.',
  HIST101: 'Surveys major civilizations and turning points from antiquity to the modern era.',
  PHIL101: 'Builds skills in argument analysis, deduction, and identifying logical fallacies.',

  BIOL101: 'Covers cell structure, genetics, and the fundamentals of living systems.',
  PHLT101: 'Surveys how populations, policy, and environment shape community health outcomes.',
  NURS101: 'Introduces the nursing profession, scope of practice, and foundations of patient care.',
  NUTR101: 'Covers macronutrients, micronutrients, and how diet supports human health.',
  PMED101: 'Surveys medical career paths and the academic path toward them.',
  DENT101: 'Introduces oral anatomy and the fundamentals of dental care.',

  COMP101: 'Teaches programming fundamentals — variables, control flow, and functions — through hands-on projects.',
  DATA101: 'Introduces data collection, cleaning, and exploratory analysis techniques.',
  CYBR101: 'Surveys threats, defenses, and the core principles of securing systems.',
  SOFT101: 'Covers the software development lifecycle from requirements to deployment.',
  ARTF101: 'Surveys the history, goals, and core techniques of artificial intelligence.',
  INFO101: 'Introduces how organizations use information systems to run and improve operations.',
};

const TIER2_TEMPLATES: Array<(title: string, major: string) => string> = [
  (title, major) => `Builds on ${major}'s foundations with a focused study of ${title}.`,
  (title, major) => `A closer look at ${title}, deepening the core skills of ${major}.`,
  (title, major) => `Extends first-year ${major} coursework into ${title}.`,
  (title, major) => `Applies ${major} fundamentals to ${title}, with more hands-on depth.`,
];

const TIER3_TEMPLATES: Array<(title: string, major: string) => string> = [
  (title, major) => `Advanced, capstone-level work in ${title}, synthesizing ${major}'s core methods.`,
  (title, major) => `A specialized deep dive into ${title} for students nearing mastery of ${major}.`,
  (title, major) => `Capstone coursework in ${title}, applying the full ${major} toolkit.`,
  (title, major) => `Senior-level study of ${title}, the kind of specialization ${major} builds toward.`,
];

const BUILDING_DESCRIPTIONS: Record<string, string> = {
  'BLDG-GENSTUDIES': 'The starter hall housing the general-education core — standing since the university\'s founding.',
  'BLDG-BUSINESS': "The Business school's home: lecture halls, case-study rooms, and faculty offices for every business major.",
  'BLDG-ENGINEERING': 'Labs, workshops, and studios for the Engineering school’s six majors.',
  'BLDG-ARTSMEDIA': 'Studios, editing bays, and performance space for the Arts & Media school.',
  'BLDG-SOCSCI': 'Seminar rooms and research space for the Social Sciences & Humanities school.',
  'BLDG-HEALTHSCI': 'Clinical labs and classrooms for the Health Science school’s six majors.',
  'BLDG-COMPSCI': 'Labs and classrooms for the Computer Science school’s six majors.',
};

function nodeId(prefix: string, num: number): string {
  return `${prefix}${num}`;
}

// Expand the seed data into the flat Buildable[] the engine consumes:
// 330 course Buildables plus one school-building Buildable per school.
export function initialTech(): Buildable[] {
  const nodes: Buildable[] = [];

  for (const school of SCHOOLS) {
    const tier1IdsInSchool: string[] = [];

    // General-ed core: six tier-1 nodes, no prereqs, available immediately.
    if (school.core) {
      for (const [code, title] of school.core) {
        const id = code.replace(/\s/g, '');
        tier1IdsInSchool.push(id);
        nodes.push({
          id,
          kind: 'course',
          name: `${code} · ${title}`,
          description: TIER1_DESCRIPTIONS[id] ?? `${school.name} core requirement.`,
          cost: TIER_COURSE_COST[1],
          duration: TIER_DURATION_WEEKS[1],
          prereqs: [],
          status: 'available',
          requiresFaculty: GENED_FIELDS[id],
        });
      }
    }

    for (const major of school.majors) {
      const t1Id = nodeId(major.prefix, NUMS[0]);
      tier1IdsInSchool.push(t1Id);
      const t2Ids = [1, 2, 3, 4].map((i) => nodeId(major.prefix, NUMS[i]));
      const needsLab = LAB_GATED_MAJOR_PREFIXES.includes(major.prefix);

      if (needsLab) {
        nodes.push({
          id: labId(major.prefix),
          kind: 'facility',
          facilityType: 'lab',
          name: `${major.name} Labs`,
          description: `Specialized lab space gating ${major.name}'s capstone (tier-3) coursework.`,
          cost: LAB_COST,
          duration: LAB_WEEKS,
          prereqs: [t1Id], // buildable as soon as the major's entry course is done — well before tier-3 is reachable
          status: 'locked',
          effects: { upkeepPerWeek: LAB_UPKEEP_PER_WEEK },
        });
      }

      major.courses.forEach((title, i) => {
        const num = NUMS[i];
        const tier = TIERS[i];
        const id = nodeId(major.prefix, num);

        let prereqs: string[] = [];
        if (tier === 1) prereqs = [...GENED_CORE_IDS];
        else if (tier === 2) prereqs = [t1Id, school.buildingId];
        else if (tier === 3) prereqs = [...t2Ids, ...(needsLab ? [labId(major.prefix)] : [])];
        prereqs = [...prereqs, ...(CROSS_MAJOR_BRIDGES[id] ?? [])];

        const description = tier === 1
          ? (TIER1_DESCRIPTIONS[id] ?? `${major.name} (${school.name}) entry course: ${title}.`)
          : tier === 2
            ? TIER2_TEMPLATES[(i - 1) % TIER2_TEMPLATES.length](title, major.name)
            : TIER3_TEMPLATES[(i - 5) % TIER3_TEMPLATES.length](title, major.name);

        nodes.push({
          id,
          kind: 'course',
          name: `${major.prefix} ${num} · ${title}`,
          description,
          cost: TIER_COURSE_COST[tier],
          duration: TIER_DURATION_WEEKS[tier],
          // Every major course starts locked now — even tier-1 has a real
          // prereq (the gen-ed core) — and unlocks via the generic prereq
          // resolver as those prereqs complete.
          prereqs,
          status: 'locked',
          requiresFaculty: major.field,
        });
      });
    }

    // The school building: unlocked once every tier-1 course in the school
    // is done (core courses for General Studies, one per major otherwise).
    // Its own completion unlocks the school's tier-2 courses — authored as
    // a plain prereq on each of those courses above, resolved by the same
    // generic engine that resolves every other prereq.
    //
    // General Studies Hall is the one exception: per the README's milestone
    // chain, a new university starts with "one academic building and the
    // gen-ed courses available" — the building isn't an early reward, it's
    // the founding condition the gen-ed courses are paired with. So it's
    // seeded already 'done' rather than locked behind the gen-ed courses it
    // sits alongside. A Buildable created 'done' never passes through
    // tickTech's completion path, so its reputation contribution is folded
    // into the starting baseline (Faculty/starting stats) instead of
    // granted via effects here — effects is omitted to avoid double-counting.
    // Academic buildings carry no capacity effect at all now — see the
    // capacity comment above GENED_BUILDING_REPUTATION_BONUS.
    const isGenEd = school.core !== undefined;
    nodes.push({
      id: school.buildingId,
      kind: 'building',
      name: school.buildingName,
      description: BUILDING_DESCRIPTIONS[school.buildingId] ?? `${school.name}'s academic building.`,
      cost: isGenEd ? GENED_BUILDING_COST : SCHOOL_BUILDING_COST,
      duration: isGenEd ? GENED_BUILDING_WEEKS : SCHOOL_BUILDING_WEEKS,
      prereqs: tier1IdsInSchool,
      status: isGenEd ? 'done' : 'locked',
    });
  }

  return nodes;
}

// Milestone-checking metadata (school -> building id -> each major's tier-2
// and tier-3 ids), consumed by techSystem.ts's checkMilestones(). Deliberately
// NOT part of the Buildable model itself — the engine reads it for the one
// course-domain feature (the milestone chain) that genuinely needs to know
// school/major structure.
export interface MilestoneMajor {
  name: string;
  prefix: string;
  tier2Ids: string[]; // exactly 4
  tier3Ids: string[]; // exactly 4
}
export interface MilestoneSchool {
  schoolName: string;
  buildingId: string;
  majors: MilestoneMajor[];
}

export function milestoneSchools(): MilestoneSchool[] {
  return SCHOOLS.map((school) => ({
    schoolName: school.name,
    buildingId: school.buildingId,
    majors: school.majors.map((major) => ({
      name: major.name,
      prefix: major.prefix,
      tier2Ids: [1, 2, 3, 4].map((i) => nodeId(major.prefix, NUMS[i])),
      tier3Ids: [5, 6, 7, 8].map((i) => nodeId(major.prefix, NUMS[i])),
    })),
  }));
}

// Progressive-discovery metadata for the Curriculum tab's course-cell view
// (see CurriculumTab.tsx). A second independent UI-only view alongside
// milestoneSchools() above — same reasoning: the engine never needs this
// shape, only the tab that derives what's revealed from existing
// unlock/milestone state (school building done, major-complete) does.
// tier1Id is included (milestoneSchools() only has tier2/tier3)
// because the discovery view needs a major's full climb, not just the
// milestone-relevant tiers.
export interface DiscoveryMajor {
  name: string;
  prefix: string;
  tier1Id: string;
  tier2Ids: string[]; // exactly 4
  tier3Ids: string[]; // exactly 4
}
export interface DiscoverySchool {
  name: string;
  buildingId: string;
  coreIds: string[]; // gen-ed core course ids; non-empty only for General Studies
  majors: DiscoveryMajor[];
}

export function discoverySchools(): DiscoverySchool[] {
  return SCHOOLS.map((school) => ({
    name: school.name,
    buildingId: school.buildingId,
    coreIds: school.core ? school.core.map(([code]) => code.replace(/\s/g, '')) : [],
    majors: school.majors.map((major) => ({
      name: major.name,
      prefix: major.prefix,
      tier1Id: nodeId(major.prefix, NUMS[0]),
      tier2Ids: [1, 2, 3, 4].map((i) => nodeId(major.prefix, NUMS[i])),
      tier3Ids: [5, 6, 7, 8].map((i) => nodeId(major.prefix, NUMS[i])),
    })),
  }));
}
