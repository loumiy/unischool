import type { Buildable, GameState } from '../state/types';
import {
  ART_GALLERY_ID, HEALTH_CENTER_TIER2_ID, HEALTH_CENTER_TIER3_ID, PERFORMING_ARTS_CENTER_ID,
} from './facilitiesData';

/*
  Your real curriculum, expressed as seed data and expanded into Buildable[].
  42 majors across 7 schools (9 courses each) + a 6-course general-ed core =
  384 course Buildables, plus one 'building' Buildable per school (7) that
  gates each school's tier-2 courses — see docs/design/curriculum.md's
  "The milestone chain".
  (Eight SchoolSeeds in all: the seven degree-granting schools plus General
  Studies, which has the gen-ed core and no majors.)

  On top of that undergraduate catalogue, GRADUATE PROGRAMS (further below)
  add 37 more course Buildables across six programs, two of which — the
  School of Medicine and the School of Law, the only two that award an
  EXTERNAL professional degree rather than building on a parent school's
  own subject matter — carry their own 'building' Buildable too (BLDG-MED,
  BLDG-LAW), the same kind an undergraduate school gets. That makes nine
  school-shaped buildings in total, not seven; see the GRADUATE PROGRAMS
  block's `buildingId` note for why only these two, and not the MBA or the
  three PhD doctorates, get one.

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

  On top of that backbone, a curated set of cross-major/cross-school prereq
  bridges (CROSS_MAJOR_BRIDGES below) are patched in — deliberately NOT a
  systematic web (see the PR notes on why a curated set was chosen over
  building out cross-major prereqs for all 384 courses). The set is larger
  than it was (about forty edges, up from twenty), and four of them now
  make a major's ESTABLISHMENT depend on another school standing:
  Econometrics and Epidemiology both need Probability & Statistics, so
  Economics and Public Health wait on the Science Center; Public Policy
  Analysis needs Macroeconomics, so Political Science waits on Business
  Hall. That is the intended weight of a cross-discipline prereq rather
  than an oversight — but it is why no bridge may point UP a tier (see
  CROSS_MAJOR_BRIDGES's own rules), which is what keeps the coupling to one
  extra school rather than to another school's endgame.

  requiresFaculty, unlike the prereq bridges, IS systematic: every major
  seed carries one `field` (a Faculty.field from facultyData.ts's
  FACULTY_FIELDS), and every course in that major — all nine tiers —
  requires it, via GENED_FIELDS for the six gen-ed core courses.

  A major's field is the DEPARTMENT that would actually staff it, and the
  42 majors are spread across the 28 fields so that recruiting demand is
  spread too: one to three majors per field, i.e. 9-20 courses behind every
  field, versus the old 13 broad fields' 9-to-54 spread (54 courses behind
  'Business', 45 each behind 'CompSci'/'Arts'/'Biology', 9 behind
  'Economics'). Where two majors do share a field they share it because a
  real department covers both — Finance + Accounting, Media Studies + Film,
  Graphic Design + Studio Art, Cybersecurity + Information Systems, Nursing
  + Pharmacy, Public Health + Nutrition, Computer Science + Software
  Engineering, Chemical Engineering + Chemistry, Biology + Environmental
  Science, Sociology + Anthropology, Data Science + Mathematics, Aerospace
  Engineering + Physics, Supply Chain + Industrial Engineering — and
  several of those pairs deliberately CROSS schools, so one hire can serve
  two schools' curricula.

  The School of Science is where most of that cross-school sharing now
  lands, and that is the point of it: Mathematics staffs Science AND
  Computer Science's Data Science, Physics staffs Science AND Engineering's
  Aerospace AND the gen-ed science course, Chemistry staffs Science AND
  Engineering's Chemical Engineering, and Biology staffs Science while
  bridging into Health Science's Nutrition and Kinesiology by prereq. The
  two pairings that the Science reorg broke — Chemical Engineering +
  Pre-Med and Nursing + Dentistry — are re-made as Chemical Engineering +
  Chemistry and Nursing + Pharmacy, so neither field is left with half a
  department.

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
// docs/design/economy.md. Buildings below are bigger investments still.
// Tier 1 (which the gen-ed core shares) is priced a bit above its old
// rate so the tier-1 build-out is still a real squeeze on opex now that
// founding tuition starts higher — the pinch moves from a week-1 cash
// scare to the T1 build-out visibly tightening the surplus, rather than
// disappearing.
const TIER_COURSE_COST: Record<number, number> = { 1: 55_000, 2: 110_000, 3: 240_000 };

// What a finished course costs to RUN, every week, forever — the recurring
// half of a curriculum decision and one of the growth loop's main teeth
// (see financeSystem.ts's cost-driver block). A course is not a one-time
// purchase: developing it commits the school to staffing and running it,
// and a tier-3 capstone with a handful of students in it costs several
// times what a gen-ed lecture does.
//
// This is what makes opening a tier RAISE weeklyOpEx immediately, while
// the prestige that tier eventually earns only drifts in over years — the
// cost-leads-revenue lag, expressed as authored data rather than as a
// special case in any system. financeSystem.ts sums it live off every
// 'done' Buildable's effects.upkeepPerWeek, exactly as it does for
// campus-life facilities.
const COURSE_UPKEEP_PER_WEEK: Record<number, number> = { 1: 130, 2: 380, 3: 800 };

// A school building is a real construction project: a meaningful cost and
// a longer duration than any single course, reflecting "unlocks an entire
// school's tier-2 curriculum" being a much bigger milestone than any one
// course. General Studies has no majors (just the gen-ed core), so its
// "building" is smaller and cheaper — more of a starter hall than a full
// academic building.
const GENED_BUILDING_COST = 400_000;
const GENED_BUILDING_WEEKS = 20;
// Academic buildings carry a real recurring cost too — a school building
// is the single biggest running bill in the curriculum half of the
// budget, and (unlike a course) it arrives all at once. Founders Hall's is
// charged from week one: it is seeded 'done' at founding, and upkeepPerWeek
// is live-read rather than applied once, so it is part of the founding
// operating picture with no double-counting.
const GENED_BUILDING_UPKEEP_PER_WEEK = 900;
const SCHOOL_BUILDING_UPKEEP_PER_WEEK = 3_000;
// A small gen-ed reputation baseline the founding institution opens with —
// folded into the starting reputation by createInitialState rather than
// granted as a Buildable effect. There is no apply-once reputation effect in
// the model (see techSystem.ts's applyEffects), and reputation is a stock
// that drifts toward a target anyway, so this is the institution's founding
// academic standing, not a bonus tied to whether Founders Hall has been
// built yet (it always is, at founding) — the hall's own payoff is
// unlocking the tier-2 curriculum.
// Academic buildings never grant capacity — capacity is tied exclusively to
// dormitories now (see campusData.ts); building out the curriculum unlocks
// courses/majors, not beds.
export const GENED_BUILDING_REPUTATION_BONUS = 1.5;

const SCHOOL_BUILDING_COST = 1_400_000;
const SCHOOL_BUILDING_WEEKS = 28;

// ---------------------------------------------------------------------
// THE ACADEMIC HALL (Plan 14). A repeatable, placeable 'building' Buildable
// with SIX program slots — see types.ts's HallSlot. Six is not arbitrary:
// every school in the game has exactly six majors, so one hall is exactly
// one school, and that is a rule a player learns in one sentence and plans
// a decade around. No tiers, no floors, no upgrade chain: a 4/8/16-room
// ladder would destroy the one rule this is built on.
//
// "Repeatable" here means what it means for dorms (campusData.ts): a
// strictly sequential chain of distinctly-named Buildables, each unlocked
// by the one before it, so there is always exactly one next hall to build
// and its cost is visible. The first opens the tick the gen-ed core is
// done — the new year-one beat: three programs waiting and nowhere to put
// them — and is DELIBERATELY CHEAP, a fraction of the old school building,
// so a founding school builds it without thinking. Each rung after it
// costs a fixed ratio more, so the fifth is a multi-year commitment.
//
// Twelve rungs because twelve is the completionist ceiling: seven schools
// of six majors, plus a second Business, Engineering, Science, Social
// Sciences and Health Science hall for the six graduate programs, which
// belong to those schools but do not fit in a hall their six majors
// already fill. A hall the player never needs is never offered — the
// chain stops here.
//
// EVERY NUMBER HERE IS PROVISIONAL, and loudly so. They are fitted by feel
// against an economy the September review found broken and Plan 15 is
// about to replace; Plan 15's PR G is where they are fitted once, properly,
// against the scorecard. The opening shape: first hall cheap, then ×1.35
// a rung, so a balanced run affords roughly eight by year 35 and a
// completionist ten or eleven. Cumulative: ~$14M for eight, ~$37M for
// eleven — a fraction of the dorm chain over the same span.
export const ACADEMIC_HALL_SLOTS = 6;
const ACADEMIC_HALL_FIRST_COST = 500_000;
const ACADEMIC_HALL_COST_RATIO = 1.35;
const ACADEMIC_HALL_FIRST_WEEKS = 16;
const ACADEMIC_HALL_WEEKS = 24;
// Upkeep matches the school building it replaces: a hall is the same
// lecture rooms and offices whatever is housed in it.
const ACADEMIC_HALL_UPKEEP_PER_WEEK = SCHOOL_BUILDING_UPKEEP_PER_WEEK;
// Named for the campus rather than for a school — a hall is not "the
// School of Engineering" until six Engineering programs sit in it (Plan
// 14's PR E gives a dedicated hall its school's name on the map). The
// cardinal four first, then the founding woodland (see treeData.ts) the
// campus was cut out of.
const ACADEMIC_HALL_NAMES = [
  'North Academic Hall', 'South Academic Hall', 'East Academic Hall', 'West Academic Hall',
  'Elm Hall', 'Oak Hall', 'Linden Hall', 'Maple Hall',
  'Chestnut Hall', 'Sycamore Hall', 'Cedar Hall', 'Birch Hall',
];
export const ACADEMIC_HALL_COUNT = ACADEMIC_HALL_NAMES.length;
export const ACADEMIC_HALL_ID_PREFIX = 'HALL-';
function academicHallId(index: number): string {
  return `${ACADEMIC_HALL_ID_PREFIX}${String(index + 1).padStart(2, '0')}`;
}

// One of the repeatable chain above — six slots, built by the player — as
// opposed to Founders Hall, which carries a slot (the core's) but is the
// founding condition rather than a decision. The build menu groups the
// chain as one repeatable type on this read.
export function isAcademicHall(t: Buildable): boolean {
  return t.kind === 'building' && t.slots !== undefined && t.id !== GENED_BUILDING_ID;
}

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

// Exported so actions.ts's createInitialState can find and pre-place this
// one Buildable at founding, without re-deriving its id from the SCHOOLS
// seed below (which isn't exported).
export const GENED_BUILDING_ID = 'BLDG-GENSTUDIES';

const SCHOOLS: SchoolSeed[] = [
  {
    name: 'General Studies',
    buildingId: GENED_BUILDING_ID,
    buildingName: 'Founders Hall',
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
      { prefix: 'FINA', name: 'Finance', field: 'Accounting & Finance', courses: ['Principles of Finance', 'Corporate Finance', 'Investment Analysis', 'Financial Modeling', 'International Finance', 'Real Estate Finance', 'Fintech & Blockchain', 'Risk Management', 'Behavioral Finance'] },
      { prefix: 'ACCT', name: 'Accounting', field: 'Accounting & Finance', courses: ['Introduction to Accounting', 'Financial Accounting', 'Managerial Accounting', 'Tax Fundamentals', 'Auditing Principles', 'Forensic Accounting', 'Governmental & Non-Profit Accounting', 'Advanced Cost Accounting', 'Accounting Information Systems'] },
      { prefix: 'MRKT', name: 'Marketing', field: 'Marketing', courses: ['Fundamentals of Marketing', 'Consumer Behavior', 'Market Research', 'Digital Marketing Strategy', 'Brand Management', 'Sports Marketing', 'Advertising & Promotion', 'Sales Management', 'Global Marketing'] },
      { prefix: 'ECON', name: 'Economics', field: 'Economics', courses: ['Microeconomics', 'Macroeconomics', 'Econometrics', 'Advanced Microeconomics', 'Economic History', 'Behavioral Economics', 'Public Finance', 'Game Theory', 'Environmental Economics'] },
      { prefix: 'MGMT', name: 'Management', field: 'Management', courses: ['Organizational Leadership', 'Human Resources Management', 'Operations Management', 'Business Ethics', 'Strategic Management', 'Project Management', 'Entrepreneurship', 'Conflict Resolution', 'Negotiations'] },
      { prefix: 'SPCO', name: 'Supply Chain & Operations', field: 'Operations Research', courses: ['Introduction to Supply Chain', 'Logistics & Distribution', 'Procurement & Sourcing', 'Quality Management', 'Demand Planning', 'Global Supply Chains', 'Inventory Control Systems', 'Data Analytics for Operations', 'Transportation Management'] },
    ],
  },
  {
    name: 'Engineering',
    buildingId: 'BLDG-ENGINEERING',
    buildingName: 'Engineering Hall',
    majors: [
      { prefix: 'MECH', name: 'Mechanical Engineering', field: 'Mechanical Engineering', courses: ['Introduction to Mechanical Design', 'Statics & Dynamics', 'Thermodynamics', 'Fluid Mechanics', 'Materials Science', 'Robotics', 'HVAC Systems', 'Internal Combustion Engines', 'Finite Element Analysis'] },
      { prefix: 'ELEC', name: 'Electrical Engineering', field: 'Electrical Engineering', courses: ['Circuits', 'Digital Logic Design', 'Signals & Systems', 'Electromagnetics', 'Microelectronics', 'Power Systems Analysis', 'Wireless Communications', 'Control Systems', 'VLSI Design'] },
      { prefix: 'CHEM', name: 'Chemical Engineering', field: 'Chemistry', courses: ['Chemistry I', 'Chemical Thermodynamics', 'Fluid Transport', 'Chemistry II', 'Chemical Reaction Engineering', 'Process Safety', 'Biochemical Engineering', 'Polymer Science', 'Sustainable Energy Technology'] },
      { prefix: 'CIVE', name: 'Civil Engineering', field: 'Civil Engineering', courses: ['Physics I', 'Structural Analysis', 'Soil Mechanics', 'Physics II', 'Transportation Engineering', 'Bridge Design', 'Environmental Impact Assessment', 'Construction Management', 'Urban Planning'] },
      { prefix: 'INDE', name: 'Industrial Engineering', field: 'Operations Research', courses: ['Systems', 'Production Planning', 'Ergonomics & Safety', 'Quality Control', 'Facilities Design', 'Simulation Modeling', 'Supply Chain Analytics', 'Lean Manufacturing', 'Reliability Engineering'] },
      { prefix: 'AERO', name: 'Aerospace Engineering', field: 'Physics', courses: ['Introduction to Flight Dynamics', 'Aerodynamics', 'Aircraft Performance', 'Spacecraft Propulsion', 'Aerospace Structures', 'Astrodynamics', 'Rocketry', 'Helicopter Dynamics', 'Unmanned Aerial Systems'] },
    ],
  },
  {
    name: 'Arts & Media',
    buildingId: 'BLDG-ARTSMEDIA',
    buildingName: 'Arts & Media Center',
    majors: [
      { prefix: 'MDIA', name: 'Media Studies', field: 'Communication', courses: ['Mass Communication', 'Media Theory', 'Global Media Systems', 'Digital Culture', 'Media Ethics', 'Film Industry', 'Social Media Analytics', 'Photojournalism', 'Public Relations'] },
      { prefix: 'GRDS', name: 'Graphic Design', field: 'Art & Design', courses: ['Visual Communication', 'Typography', 'Digital Imaging', 'Layout Design', 'Branding & Identity', 'Web Design', 'Motion Graphics', 'Illustration', 'Publication Design'] },
      { prefix: 'CRWR', name: 'Creative Writing', field: 'English', courses: ['Introduction to Creative Writing', 'Fiction Workshop', 'Poetry Workshop', 'Nonfiction Workshop', 'Literary Editing', 'Screenwriting', 'Playwriting', 'Writing for Young Adults', 'Creative Writing Seminar'] },
      { prefix: 'MUSC', name: 'Music', field: 'Music', courses: ['Music Theory I', 'Music Theory II', 'Music History Survey', 'Composition I', 'Applied Instrument/Voice', 'Jazz Improvisation', 'World Music', 'Music Technology', 'Composition II'] },
      { prefix: 'FILM', name: 'Film', field: 'Communication', courses: ['Introduction to Film Analysis', 'Cinematography', 'Screenwriting Workshop', 'Film Production', 'Directing Fundamentals', 'Documentary Filmmaking', 'History of World Cinema', 'Sound Design', 'Post-Production'] },
      { prefix: 'SART', name: 'Studio Art', field: 'Art & Design', courses: ['Fundamentals of 2D Design', 'Drawing', 'Painting', 'Sculpture', 'Art History Survey', 'Printmaking', 'Ceramics', 'Photography', 'Digital Art'] },
    ],
  },
  {
    name: 'Social Sciences & Humanities',
    buildingId: 'BLDG-SOCSCI',
    buildingName: 'Social Sciences & Humanities Hall',
    majors: [
      { prefix: 'ENGL', name: 'English', field: 'English', courses: ['Introduction to Literary Studies', 'British Literature Survey', 'American Literature Survey', 'Critical Theory', 'Advanced Composition', 'Shakespeare', 'Restoration & 18th Century Literature', 'Postcolonial Literature', 'Technical Writing'] },
      { prefix: 'SOCY', name: 'Sociology', field: 'Sociology', courses: ['Introduction to Sociology', 'Social Stratification', 'Sociological Theory', 'Race & Ethnicity', 'Qualitative Research Methods', 'Criminology', 'Sociology of the Family', 'Urban Sociology', 'Sex & Gender'] },
      { prefix: 'ANTH', name: 'Anthropology', field: 'Sociology', courses: ['Introduction to Anthropology', 'Cultural Anthropology', 'Biological Anthropology', 'Archaeological Methods', 'Linguistic Anthropology', 'Ethnographic Field Methods', 'Medical Anthropology', 'Anthropology of Religion', 'Museum & Heritage Studies'] },
      { prefix: 'POLS', name: 'Political Science', field: 'Political Science', courses: ['Civics', 'Comparative Politics', 'International Relations', 'American Government', 'Public Policy Analysis', 'Constitutional Law', 'Political Campaigns', 'Theories of Justice', 'Security Studies'] },
      { prefix: 'HIST', name: 'History', field: 'History', courses: ['World History', 'Research & Historiography', 'US History', 'European History', 'Ancient Civilizations', 'World War I & II', 'Historical Archaeology', 'Historical Anthropology', 'History of Science & Technology'] },
      { prefix: 'PHIL', name: 'Philosophy', field: 'Philosophy', courses: ['Introduction to Logic & Reasoning', 'Ethics II', 'Metaphysics', 'Epistemology', 'Ancient Greek Philosophy', 'Existentialism', 'Philosophy of Mind', 'Aesthetics', 'Symbolic Logic'] },
    ],
  },
  {
    // The School of Science. The natural sciences and Psychology used to be
    // scattered — Biology and a chemistry-shaped Pre-Med under Health
    // Science, Physics live only as Aerospace Engineering's field and the
    // gen-ed science course, Mathematics only as Data Science's field,
    // Psychology under Social Sciences — so there was no science school at
    // all, which is also why only two schools could ever hold a lab (see
    // LAB_GATED_MAJOR_PREFIXES and docs/design/research.md). Biology and
    // Psychology MOVE here keeping their course ids, so a save that already
    // finished either keeps it finished.
    name: 'Science',
    buildingId: 'BLDG-SCIENCE',
    buildingName: 'Science Center',
    majors: [
      { prefix: 'MATH', name: 'Mathematics', field: 'Mathematics', courses: ['Calculus II', 'Linear Algebra', 'Probability & Statistics', 'Discrete Mathematics', 'Differential Equations', 'Real Analysis', 'Abstract Algebra', 'Topology', 'Numerical Methods'] },
      { prefix: 'BIOL', name: 'Biology', field: 'Biology', courses: ['Biology I', 'Cell Biology', 'Genetics', 'Ecology', 'Evolution', 'Microbiology', 'Marine Biology', 'Plant Physiology', 'Immunology'] },
      { prefix: 'CHMY', name: 'Chemistry', field: 'Chemistry', courses: ['General Chemistry', 'Inorganic Chemistry', 'Organic Chemistry', 'Analytical Chemistry', 'Physical Chemistry', 'Biochemistry', 'Spectroscopy & Structure Determination', 'Medicinal Chemistry', 'Computational Chemistry'] },
      { prefix: 'PHYS', name: 'Physics', field: 'Physics', courses: ['Classical Mechanics', 'Electricity & Magnetism', 'Waves & Optics', 'Modern Physics', 'Thermal & Statistical Physics', 'Quantum Mechanics', 'Solid State Physics', 'Astrophysics & Cosmology', 'Particle Physics'] },
      { prefix: 'ENVS', name: 'Environmental Science', field: 'Biology', courses: ['Introduction to Environmental Science', 'Earth Systems & Climate', 'Ecosystem Ecology', 'Environmental Chemistry', 'Geographic Information Systems', 'Conservation Biology', 'Hydrology & Water Resources', 'Atmospheric Science', 'Environmental Policy & Restoration'] },
      { prefix: 'PSYC', name: 'Psychology', field: 'Psychology', courses: ['General Psychology', 'Developmental Psychology', 'Cognitive Psychology', 'Abnormal Psychology', 'Research Methods in Psychology', 'Social Psychology', 'Biopsychology', 'Organizational Psychology', 'Health Psychology'] },
    ],
  },
  {
    // Health Science, re-cut. Pre-Med and Dentistry are gone: both were
    // professional-school TRACKS rather than undergraduate majors, and
    // neither had a field of its own (Pre-Med borrowed Chemistry, Dentistry
    // borrowed Nursing's Clinical Health). Biology went to Science. What
    // replaces all three is a clinical/applied-health set that sits
    // coherently alongside Nursing, Public Health and Nutrition — and,
    // deliberately, gives the school back a research identity it would
    // otherwise have lost with Biology (see LAB_GATED_MAJOR_PREFIXES).
    name: 'Health Science',
    buildingId: 'BLDG-HEALTHSCI',
    buildingName: 'Health Sciences Building',
    majors: [
      { prefix: 'PHLT', name: 'Public Health', field: 'Public Health', courses: ['Introduction to Public Health', 'Epidemiology', 'Biostatistics', 'Health Policy & Management', 'Environmental Health', 'Global Health', 'Health Promotion', 'Community Health Assessment', 'Maternal & Child Health'] },
      { prefix: 'NURS', name: 'Nursing', field: 'Clinical Health', courses: ['Introduction to Professional Nursing', 'Anatomy & Physiology', 'Pharmacology', 'Health Assessment', 'Clinical Practicum I', 'Critical Care Nursing', 'Pediatric Nursing', 'Gerontology', 'Clinical Practicum II'] },
      { prefix: 'NUTR', name: 'Nutrition', field: 'Public Health', courses: ['Fundamentals of Nutrition', 'Macronutrients & Metabolism', 'Lifecycle Nutrition', 'Applied Dietetics', 'Food Science', 'Sports Nutrition', 'Public Health Nutrition', 'Advanced Medical Nutrition Therapy', 'Culinary Nutrition'] },
      { prefix: 'PHRM', name: 'Pharmacy', field: 'Clinical Health', courses: ['Introduction to Pharmaceutical Sciences', 'Human Physiology for Pharmacy', 'Pharmaceutical Chemistry', 'Pharmacology I', 'Pharmaceutics & Drug Delivery', 'Pharmacology II', 'Pharmacotherapeutics', 'Clinical Pharmacy Practicum', 'Pharmacoepidemiology & Drug Safety'] },
      { prefix: 'KINE', name: 'Kinesiology', field: 'Kinesiology', courses: ['Foundations of Kinesiology', 'Functional Anatomy', 'Exercise Physiology', 'Biomechanics', 'Motor Learning & Control', 'Strength & Conditioning', 'Athletic Injury & Rehabilitation', 'Exercise Testing & Prescription', 'Adapted Physical Activity'] },
      { prefix: 'NEUR', name: 'Neuroscience', field: 'Neuroscience', courses: ['Foundations of Neuroscience', 'Neuroanatomy', 'Cellular & Molecular Neuroscience', 'Cognitive Neuroscience', 'Neurophysiology', 'Neuropharmacology', 'Developmental Neurobiology', 'Computational Neuroscience', 'Clinical Neuroscience & Disorders'] },
    ],
  },
  {
    name: 'Computer Science',
    buildingId: 'BLDG-COMPSCI',
    buildingName: 'Computer Science Building',
    majors: [
      { prefix: 'COMP', name: 'Computer Science', field: 'Computer Science', courses: ['Introduction to Programming', 'Data Structures', 'Algorithms', 'Operating Systems', 'Computer Architecture', 'Compiler Design', 'Game Development', 'Parallel Computing', 'Web Development'] },
      { prefix: 'DATA', name: 'Data Science', field: 'Mathematics', courses: ['Fundamentals of Data Science', 'Statistical Modeling', 'Machine Learning', 'Data Visualization', 'Data Mining', 'Big Data Systems', 'Time Series Analysis', 'Natural Language Processing', 'Bayesian Statistics'] },
      { prefix: 'CYBR', name: 'Cybersecurity', field: 'Information Systems', courses: ['Introduction to Cybersecurity', 'Network Security', 'Cryptography', 'Ethical Hacking', 'Security Operations', 'Cloud Security', 'Digital Forensics', 'Risk Management', 'Software Security Testing'] },
      { prefix: 'SOFT', name: 'Software Engineering', field: 'Computer Science', courses: ['Introduction to Software Development', 'Software Requirements', 'Software Testing & QA', 'Database Systems', 'Object-Oriented Design', 'Agile Methodologies', 'Mobile Application Development', 'UI/UX', 'DevOps'] },
      { prefix: 'ARTF', name: 'Artificial Intelligence', field: 'Artificial Intelligence', courses: ['Introduction to Artificial Intelligence', 'AI Programming', 'Knowledge Representation', 'Neural Networks', 'Advanced Machine Learning', 'Deep Learning', 'Robotics & Perception', 'Computer Vision', 'AI Ethics & Society'] },
      { prefix: 'INFO', name: 'Information Systems', field: 'Information Systems', courses: ['Introduction to Information Systems', 'Systems Analysis & Design', 'Database Management', 'Enterprise Resource Planning', 'IT Infrastructure', 'Business Process Modeling', 'E-commerce Strategy', 'Information Security Management', 'Data Warehousing'] },
    ],
  },
];

// The gen-ed core is the true foundation of the curriculum: every major's
// tier-1 entry course requires the whole 6-course core, not just its own
// school's building. Derived from SCHOOLS rather than re-listed so it can
// never drift from the General Studies core defined above.
export const GENED_CORE_IDS: string[] = SCHOOLS.find((school) => school.core)!.core!.map(([code]) => code.replace(/\s/g, ''));

// Every undergraduate major's course-code prefix — which is also its
// PROGRAM ID in `s.halls` (see types.ts's HallSlot). Read by the loader's
// hall sanitizer and the invariant sweep, so "is this a real program" is
// answered off the seed rather than a list kept in step with it.
export function majorPrefixes(): string[] {
  return SCHOOLS.flatMap((school) => school.majors.map((major) => major.prefix));
}

// requiresFaculty gates for the six gen-ed core courses — same idea as each
// major's own `field` above, just per-course instead of per-major since the
// core isn't a single discipline. Every field used here already appears in
// facultyData.ts's FACULTY_FIELDS.
//
// These six are load-bearing beyond the courses themselves: the founding
// roster in actions.ts is sized to cover exactly these fields and nothing
// else (English x2, Mathematics, Philosophy, Physics, History), so changing
// one here means changing a founding hire there. All six survived the
// department re-specialisation unchanged for precisely that reason — the
// gen-ed core is the one place the taxonomy is pinned to the founding
// payroll.
//
// The School of Science did not disturb that either, and it was checked
// rather than assumed. Mathematics and Physics MOVED in the sense that they
// are now majors in Science, but neither is a new FIELD: GE120 asked for
// 'Mathematics' (which already staffed Data Science) and GE140 asked for
// 'Physics' (which already staffed Aerospace Engineering) before the reorg
// and still do after it. A school does not own a field — a field staffs
// whichever majors name it — so the five founding hires still cover all six
// gen-ed courses and founding payroll is unchanged.
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
// all 384 nodes and turn the curriculum into a much harder puzzle than
// docs/design/curriculum.mdclimb describes; a dozen hand-placed
// bridges add texture without changing the core one-major-at-a-time
// pacing.
// ---------------------------------------------------------------------

// Cross-major/cross-school prereq bridges: each entry adds ONE OR MORE
// extra prereq ids on top of that course's normal within-major chain (its
// own tier-1 + school building, or its own tier-2 quartet). All are
// plausible real-world prerequisites, deliberately spanning different
// schools where it makes sense (e.g. Philosophy -> AI Ethics).
//
// TWO RULES EVERY BRIDGE HOLDS TO, both checked by
// test/curriculum-graph.test.ts rather than left to review:
//
//   1. A BRIDGE NEVER POINTS UP THE TIER CLIMB. A tier-2 course may lean
//      on tier-1 or tier-2 work; it may never require a tier-3 capstone.
//      An inverted bridge would hold a whole major's ESTABLISHMENT (its
//      tier-2 quartet, which is what `program-established:` and every
//      professional-school gate read) behind another school's endgame —
//      and, for a run that never touches that other school, behind content
//      the player has no reason to have bought. Same-tier bridges between
//      two tier-3 capstones are fine: a capstone gates nothing but itself
//      and its own `program-distinguished:` milestone.
//   2. A BRIDGE NEVER REPEATS THE BACKBONE. A tier-3 course already
//      requires its own major's whole tier-2 quartet, each of which
//      requires the major's tier-1 course — so "Finite Element Analysis
//      requires Materials Science" or "VLSI Design requires
//      Microelectronics", true as they are, are already what the climb
//      says. Authoring them here would put a line in the tooltip that
//      changes nothing about when the course opens.
//
// Grouped by the school the BRIDGED course belongs to, since that is how
// the Curriculum tab reads and how a retune of one school's pacing would
// arrive.
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
  AERO130: ['CHEM110'],           // Spacecraft Propulsion needs chemical thermodynamics
  AERO210: ['MATH101'],           // Astrodynamics needs calculus II
  AERO220: ['MECH120'],           // Rocketry needs thermodynamics
  ELEC130: ['PHYS110'],           // Electromagnetics needs undergraduate electricity & magnetism
  CHEM220: ['CHMY210'],           // Biochemical Engineering needs biochemistry itself, not just the organic chemistry under it
  CHEM230: ['CHMY120'],           // Polymer Science needs organic chemistry — "polymer science requires Chemistry II" is already what the tier-3 climb says (rule 2 above), so the bridge goes one step deeper, into the Chemistry major
  CIVE140: ['SPCO101'],           // Transportation Engineering needs the supply-chain fundamentals it moves goods for. NOT SPCO240 ("Transportation Management"), which is a tier-3 capstone: this is a tier-2 course, and rule 1 above is why — bridging a tier-2 course to a capstone would hold Civil Engineering's ESTABLISHMENT behind most of a Business major. SPCO101 is also the lightest honest stand-in available, gating on nothing but the gen-ed core, so Civil Engineering doesn't quietly acquire a Business Hall dependency either
  CIVE220: ['ENVS101'],           // Environmental Impact Assessment needs environmental science
  CIVE230: ['MGMT210'],           // Construction Management needs project management
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
  CHMY210: ['BIOL101'],           // Biochemistry needs biology I
  PSYC220: ['BIOL101', 'NEUR101'], // Biopsychology needs biology fundamentals AND foundations of neuroscience — the two halves it actually sits between

  // --- Health Science ---
  PHLT110: ['MATH120'],           // Epidemiology needs probability & statistics
  PHLT130: ['POLS130'],           // Health Policy & Management needs government fundamentals
  NUTR130: ['BIOL101'],           // Applied Dietetics needs biology fundamentals
  KINE120: ['BIOL101'],           // Exercise Physiology needs biology fundamentals
  NEUR110: ['BIOL101'],           // Neuroanatomy needs biology fundamentals
  NEUR130: ['PSYC101'],           // Cognitive Neuroscience needs general psychology — the Science/Health bridge, in prereq form
  NEUR210: ['PHRM101'],           // Neuropharmacology needs introduction to pharmaceutical sciences
  PHRM120: ['CHMY101'],           // Pharmaceutical Chemistry needs general chemistry

  // --- Computer Science ---
  DATA120: ['COMP101'],           // Machine Learning needs programming fundamentals
  DATA240: ['MATH120'],           // Bayesian Statistics needs probability & statistics
  ARTF130: ['DATA120'],           // Neural Networks builds on Machine Learning
  CYBR130: ['COMP110'],           // Ethical Hacking needs real programming chops
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
// serves a major's students, not the whole campus).
//
// This list is also, in effect, WHICH SCHOOLS CAN DO RESEARCH: a lab is the
// research gate (see below and docs/design/research.md), and a school with
// no lab-gated major can never build one. It used to name majors in exactly
// two schools — Engineering and Health Science — which is why a run
// concentrated anywhere else produced no research, ever. The School of
// Science is the fix: Chemistry, Biology and Physics are lab sciences and
// carry labs here, so Science becomes the third research-bearing school
// and, through field-sharing, a Mathematics, Physics, Chemistry, Biology or
// Psychology hire now has somewhere to work. Biology's lab travels WITH the
// major — labIds are derived per-major inside each school below, so
// LAB-BIOL simply re-points from the Health Sciences Building to the
// Science Center — and Neuroscience carries a new lab that keeps Health
// Science a research school after Biology, Pre-Med and Dentistry leave it.
// Mathematics, Environmental Science and Psychology deliberately get no
// lab: a maths department is not a bench science, and holding the line at
// the genuinely lab-based majors keeps a lab a decision rather than a
// formality.
//
// NURSING LEFT THIS LIST, and the Nursing Lab with it. A lab here means a
// BENCH science — a room of instruments a research question is answered in
// — and nursing is not one: its capstones are clinical practica, which
// happen where patients are. So Nursing's capstone gate moved to the
// University Clinic (see CLINICAL_PRACTICUM_GATE below), which is a real
// building the campus has to site and pay for, rather than a lab that
// existed only because the gate mechanism happened to be spelled "lab".
// Health Science stays a research school on Neuroscience's lab, which is a
// bench science and keeps its own. Which majors carry a RESEARCH FACILITY:
// the building that gates their capstone coursework and, campus-wide, is
// what lets a school do research at all (see docs/design/research.md and
// labEquippedFields).
//
// FOUR SCHOOLS USED TO HAVE NONE, and under the initiative model that is
// coming this stops being a gap and becomes an exclusion: a school with no
// facility has not merely no output but no PLACE to run anything, so
// Business, Computer Science, Social Sciences & Humanities and Arts &
// Media could not participate in research in any form. Each now has
// one, and one is enough — labEquippedFields equips EVERY field a school
// teaches the moment any one of its facilities stands, so a single
// building brings a whole faculty into production.
//
// What a "lab" IS is the only thing that varies, and only in name. The
// mechanism is identical throughout, which is the same rule the graduate
// programs follow: no bespoke per-school system, only authored data over
// shared machinery. A humanities institute and a chemistry lab cost the
// same, take the same weeks and multiply output by the same amount —
// because what the building represents is a school being equipped to do
// its own kind of serious work, and that is worth the same anywhere.
const LAB_GATED_MAJOR_PREFIXES = [
  // The lab sciences and engineering, unchanged.
  'CHEM', 'CHMY', 'BIOL', 'PHYS', 'MECH', 'ELEC', 'CIVE', 'AERO', 'NEUR',
  // One per school that had nothing. Chosen so the facility sits in the
  // major where that kind of work most plausibly happens — and, since one
  // facility equips the whole school, so that every field the school
  // teaches comes into production behind it.
  'ECON', 'COMP', 'HIST', 'FILM',
];

// Where "{Major} Labs" would be wrong. A history department does not have
// labs; it has an institute with archives in it, and calling the building
// what it actually is does more for the school reading as a real place
// than any mechanical difference would.
const RESEARCH_FACILITY_NAMES: Partial<Record<string, string>> = {
  ECON: 'Experimental Economics Lab',
  COMP: 'Computing Research Center',
  HIST: 'Humanities Research Institute',
  FILM: 'Media Production Studio',
};
const RESEARCH_FACILITY_BLURBS: Partial<Record<string, string>> = {
  ECON: 'Behavioural labs and market-simulation suites',
  COMP: 'A compute cluster and research offices',
  HIST: 'Archives, reading rooms and a documents collection',
  FILM: 'Sound stages, edit bays and a screening theatre',
};
const LAB_COST = 700_000;
const LAB_WEEKS = 16;
const LAB_UPKEEP_PER_WEEK = 1_400; // ~$73k/yr — specialized equipment is expensive to keep running, and a lab serves one major's students rather than the whole campus
// A lab is now the gate on RESEARCH as well as on tier-3 coursework (see
// docs/design/research.md): a school with no finished lab produces no
// research at all, and the first lab anywhere on campus is also what
// offers the College -> University charter. On top of that gate, each lab
// adds this much to the campus-wide multiplier on weekly research output —
// read live off effects.researchRateBonus, the same contract upkeep
// follows, so the contribution tracks what is actually standing rather
// than what was once completed. Small per lab on purpose: the gate is the
// decision, the multiplier is the reward for building several.
const LAB_RESEARCH_RATE_BONUS = 0.12;
function labId(prefix: string): string {
  return `LAB-${prefix}`;
}

// Two of Arts & Media's three majors (Music, Studio Art — see SCHOOLS
// below) get the same curated cross-kind "facility gates capstone
// coursework" treatment LAB_GATED_MAJOR_PREFIXES gives the lab sciences,
// each pointed at its OWN facility instead of one shared building: Music's
// capstones perform in the Performing Arts Center, Studio Art's exhibit in
// the Art Gallery (both facilitiesData.ts). This is the "lightest real
// coupling" chosen over a bespoke prestige/satisfaction input: it reuses a
// mechanism the curriculum tree already has (see the tier === 3 branch
// below), rather than inventing a new one, and it reads exactly like a lab
// requirement in the tooltip/build panel. Graphic Design, the school's
// third major, is NOT part of either gate — the two-building, two-major
// split already covers the school's performing and exhibited halves, and
// there's no third facility for it to specialize into, so it takes the
// plain t2Ids prereq every non-gated major gets. Each facility's OWN
// unlock, in turn, gates on its major's tier-2 quartet rather than the
// school building (see the long comment above PERFORMING_ARTS_CENTER_ID in
// facilitiesData.ts) — one tier before the tier-3 courses it gates here, so
// this can never be circular.
const ARTS_CAPSTONE_GATE: Partial<Record<string, string>> = {
  MUSC: PERFORMING_ARTS_CENTER_ID,
  SART: ART_GALLERY_ID,
};

// CLINICAL COURSEWORK gates on a real clinical facility, the same
// cross-kind mechanism ARTS_CAPSTONE_GATE and the labs use — a facility
// Buildable named as an extra prereq on specific courses. Two differences
// from both of those, and they are why this is its own table rather than
// another entry in either:
//
//   - It is keyed by COURSE id, not by major prefix. A lab or an arts
//     facility gates a major's whole tier-3 quartet; a clinic gates the
//     courses that are actually clinical. All four of Nursing's capstones
//     are (critical care, paediatrics, gerontology, and Clinical Practicum
//     II by name), so Nursing reads like a lab-gated major — but Pharmacy
//     has exactly ONE clinical course, its Clinical Pharmacy Practicum,
//     and gating its computational and regulatory capstones on a clinic
//     too would be gating them on somewhere they never go.
//   - The MD's capstone clerkship points at the HOSPITAL rather than the
//     clinic. A medical clerkship is inpatient work; the hospital is the
//     rung of the health chain that gates on the medical school's own
//     building, so the chain reads: found the school -> build its hospital
//     -> finish the degree.
//
// None of these can be circular. Every gate points at a health-chain
// facility, and the health chain's own prereqs are earlier rungs of itself
// plus the medical school BUILDING — never a course.
const CLINICAL_PRACTICUM_GATE: Partial<Record<string, string>> = {
  NURS210: HEALTH_CENTER_TIER2_ID, // Critical Care Nursing
  NURS220: HEALTH_CENTER_TIER2_ID, // Pediatric Nursing
  NURS230: HEALTH_CENTER_TIER2_ID, // Gerontology
  NURS240: HEALTH_CENTER_TIER2_ID, // Clinical Practicum II
  PHRM230: HEALTH_CENTER_TIER2_ID, // Clinical Pharmacy Practicum
  MED610: HEALTH_CENTER_TIER3_ID,  // Advanced Clinical Practicum — the MD's clerkship year
};

// ---------------------------------------------------------------------
// GRADUATE PROGRAMS (see docs/design/graduate-programs.md). More
// curriculum, and deliberately nothing else: a graduate program is a small
// cluster of high-tier `course` Buildables gated on an undergraduate
// parent, feeding the same prestige stock through the same capped inputs,
// pulling the same faculty through the existing `field` demand, and sized
// in the same weeks-of-opex language as everything else the player buys.
//
// TWO BOUNDARIES THAT HOLD ABSOLUTELY, and are the reason this is the
// low-risk "one loop" version of the feature:
//
//   1. NO SECOND POPULATION. There is no graduate-student count, no
//      separate housing/dining/satisfaction ratio, and no parallel
//      admissions funnel. Graduate courses are curriculum breadth like
//      every other course, and the students in them are the same
//      s.students the summer funnel already commits.
//   2. NO BESPOKE PER-SCHOOL SYSTEM. Medicine, law and the MBA are
//      MECHANICALLY IDENTICAL. Everything that distinguishes them is
//      authored in the table below — the gate, the prestige weight, the
//      cost/upkeep rung, which faculty fields each course demands, and the
//      names. If differentiating two of them ever seems to need a
//      distinct population or a rule of its own, that is the signal to
//      stop and re-open the design, not to add one.
//
// ONE PREDICATE, TWO READINGS (graduateGateMet below). Both readings are
// taken off the seed helpers that already exist, so there is no second
// source of truth for what a school is:
//   - a PROFESSIONAL school (med, law, MBA) gates on its parent
//     undergraduate school(s) being complete or near-complete, read off
//     milestoneSchools() and the same `program-established:` milestones
//     prestige's curriculum breadth reads;
//   - a RESEARCH DOCTORATE gates on a finished lab in its parent school,
//     read off researchSchools() — the same lab gate research itself and
//     the university charter hang off.
// Medicine's gate is the CONJUNCTION of two of those readings (Science AND
// Health Science), which is two existing readings and-ed together, not a
// new kind of gate.
// ---------------------------------------------------------------------

// The most expensive rung in the game, and its own constants rather than
// an extension of TIER_COURSE_COST — a graduate course sits a tier above
// tier-3 in every dimension. These are aimed squarely at the late-game
// gap the endowment campaign alone was covering: a mature school whose
// dorm and facility chains are exhausted and whose catalogue is finished
// has, for the first time, an academic thing left to buy.
//
// Two rungs, because cost is one of the authored axes professional
// schools are differentiated on: a medical or law school is a heavier
// institutional commitment than a doctoral program bolted onto a
// department that already has the labs and the faculty.
const PROFESSIONAL_COURSE_COST = 6_000_000;
const PROFESSIONAL_COURSE_WEEKS = 40;
const PROFESSIONAL_COURSE_UPKEEP_PER_WEEK = 12_000;
const DOCTORAL_COURSE_COST = 4_000_000;
const DOCTORAL_COURSE_WEEKS = 32;
const DOCTORAL_COURSE_UPKEEP_PER_WEEK = 7_000;

// The two PROFESSIONAL schools that award an external degree — Medicine and
// Law, see GraduateProgramSeed's `buildingId` below — get their own campus
// building rather than living inside their parent school's. It is the same
// 'building'-kind Buildable an undergraduate school gets, sized a rung above
// SCHOOL_BUILDING_COST/WEEKS/UPKEEP: these are the two most prestigious
// halls on campus, a bigger institutional commitment than any single
// undergraduate school and in the same weeks-of-opex language as the
// professional course rung above sits over TIER_COURSE_COST.
const PROFESSIONAL_SCHOOL_BUILDING_COST = 2_600_000;
const PROFESSIONAL_SCHOOL_BUILDING_WEEKS = 36;
const PROFESSIONAL_SCHOOL_BUILDING_UPKEEP_PER_WEEK = 5_000;

export type GraduateProgramType = 'professional' | 'doctoral';

interface GraduateCourseSeed {
  num: number;    // course number within the program (5xx professional, 7xx doctoral)
  title: string;
  field: string;  // the Faculty field this ONE course requires — authored per course, like the gen-ed core's GENED_FIELDS rather than per-major, which is what lets medicine lean on the health AND science departments at once
}

export interface GraduateProgramSeed {
  id: string;              // also the course-code prefix and the `grad-program-complete:` milestone subject
  name: string;
  degree: string;          // the credential, for display only
  type: GraduateProgramType;
  // The school section this program is DISPLAYED under when it has no
  // building of its own (see discoverySchools) — its academic home. Always
  // one of gateSchools. Still read for MED/LAWS too (researchSchools()
  // folds their course fields into this school's staffing reads), even
  // though they no longer display inside it — see `buildingId` below.
  homeSchool: string;
  // The school(s) whose state the gate reads. One entry for every program
  // but medicine, which reads two.
  gateSchools: string[];
  // How many of EACH gate school's majors must be ESTABLISHED (all tier-2
  // done) before this professional school may be founded. Authored per
  // program and applied to every one of its gateSchools, so the threshold is
  // an explicit number rather than a ratio the implementation rounds — and it
  // may differ program to program. Set only for professional programs;
  // doctorates gate on a finished lab (see graduateGateMet), not on a major
  // count, so they leave it unset.
  gateMajorsRequired?: number;
  // Relative weight inside prestige's graduate-breadth term (see
  // prestigeSystem.ts's GRADUATE_PROGRAM_SHARE). This is the ONLY way a
  // professional school is allowed to move standing more than its raw
  // course count would: a share of an already-capped input, never a bonus
  // and never a weight of its own. A top law school outranking its five
  // courses is authored HERE, where the cap still holds it.
  prestigeWeight: number;
  blurb: string;           // one line, used to build every course description
  courses: GraduateCourseSeed[];
  // Set only for the two PROFESSIONAL schools that award an external
  // degree and stand as their own campus building rather than living
  // inside their parent school's — Medicine and Law. Unset (the MBA and
  // all three PhD doctorates) means this program stays exactly what it
  // always was: a graduate sub-group inside homeSchool's Curriculum
  // section, gated purely on graduateGateMet, no building of its own —
  // they build on the same subject matter as their parent school and
  // correctly live there.
  //
  // The gate itself does not change for a program that HAS a buildingId —
  // graduateGateMet is still the one predicate, reused rather than
  // duplicated (see initialTech() below). What changes is what the gate
  // being met now reveals FIRST: the building, via the exact same
  // `graduateProgram` field/meetsUnlockGates mechanism a graduate course
  // uses, rather than the program's courses directly. The program's entry
  // course then adds the building as an extra prereq — a cross-kind
  // course-requires-building prereq, exactly like an undergraduate tier-2
  // course requiring its school building — so the full chain reads:
  // academic gate met -> building revealed -> building built -> entry
  // course available -> rest of the program follows its ordinary prereqs.
  buildingId?: string;
}

// Six programs, 37 courses (up from 28: Medicine 6 -> 12, Law 5 -> 8, both
// now founding a top-level school rather than a sub-group — see
// `buildingId` above). Deliberately small sets per program — each is
// "a handful of high-tier courses that complete into a milestone", not a
// second nine-course major.
const GRADUATE_PROGRAMS: GraduateProgramSeed[] = [
  {
    // The two-school gate, and the reason the gate predicate takes a LIST
    // of schools rather than one: medicine draws on the basic sciences and
    // the applied health majors both, so it extends from the School of
    // Science AND Health Science. Its home — the section it is displayed
    // in, and the school whose fields staff most of it — is Health
    // Science.
    id: 'MED', name: 'School of Medicine', degree: 'MD', type: 'professional',
    homeSchool: 'Health Science', gateSchools: ['Science', 'Health Science'],
    prestigeWeight: 2.0,
    gateMajorsRequired: 5,
    blurb: 'the medical school',
    buildingId: 'BLDG-MED',
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
    id: 'LAWS', name: 'School of Law', degree: 'JD', type: 'professional',
    homeSchool: 'Social Sciences & Humanities', gateSchools: ['Social Sciences & Humanities'],
    prestigeWeight: 1.6,
    gateMajorsRequired: 5,
    blurb: 'the law school',
    buildingId: 'BLDG-LAW',
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
    id: 'MBAX', name: 'Graduate School of Business', degree: 'MBA', type: 'professional',
    homeSchool: 'Business', gateSchools: ['Business'],
    prestigeWeight: 1.4,
    gateMajorsRequired: 5,
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
    homeSchool: 'Engineering', gateSchools: ['Engineering'],
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
    homeSchool: 'Science', gateSchools: ['Science'],
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
    homeSchool: 'Health Science', gateSchools: ['Health Science'],
    prestigeWeight: 1.0,
    blurb: 'the health-science doctorate',
    courses: [
      { num: 701, title: 'Doctoral Research Methods in Health Science', field: 'Public Health' },
      { num: 710, title: 'Systems & Cognitive Neuroscience Seminar', field: 'Neuroscience' },
      { num: 720, title: 'Translational Clinical Research', field: 'Clinical Health' },
      { num: 730, title: 'Dissertation Research in Health Science', field: 'Kinesiology' },
    ],
  },
];

// How much of a parent school has to stand before a professional school may
// be founded — "established or NEAR-established". This is an explicit
// authored count per program (GraduateProgramSeed.gateMajorsRequired), not a
// ratio the implementation rounds: today every professional school requires
// 5 of its gate school's 6 majors established (all tier-2 done). Deliberately
// not "school distinguished" (which additionally requires every program
// distinguished): that milestone lands so late in a run that the professional
// schools would arrive with nothing left to spend the rest of the game on.

export function graduatePrograms(): GraduateProgramSeed[] {
  return GRADUATE_PROGRAMS;
}

export function graduateProgram(id: string): GraduateProgramSeed | undefined {
  return GRADUATE_PROGRAMS.find((program) => program.id === id);
}

export function graduateCourseIds(program: GraduateProgramSeed): string[] {
  return program.courses.map((course) => `${program.id}${course.num}`);
}

// How many of each gate school's majors must be established for a
// professional school to be founded there — the explicit authored number,
// not a rounded ratio. Exported so the UI can say "5 of 6".
export function professionalGateThreshold(program: GraduateProgramSeed): number {
  return program.gateMajorsRequired ?? 0;
}

// THE ONE PREDICATE. Both branches are readings of seed helpers that
// already exist — milestoneSchools() for what the curriculum has finished,
// researchSchools() for which labs stand — so graduate gating can never
// drift from the school structure the rest of the game reads. A two-school
// gate is the conjunction of two such readings, nothing more.
export function graduateGateMet(s: GameState, programId: string): boolean {
  const program = graduateProgram(programId);
  if (!program) return false;

  if (program.type === 'professional') {
    const schools = milestoneSchools();
    return program.gateSchools.every((name) => {
      const school = schools.find((x) => x.schoolName === name);
      if (!school || school.majors.length === 0) return false;
      const established = school.majors.filter((major) => s.milestones[`program-established:${major.prefix}`]).length;
      return established >= professionalGateThreshold(program);
    });
  }

  const schools = researchSchools();
  return program.gateSchools.every((name) => {
    const school = schools.find((x) => x.schoolName === name);
    return !!school && school.labIds.some((id) => s.tech.find((t) => t.id === id)?.status === 'done');
  });
}

// The gate in words, for the course description and the Curriculum tab's
// section head. Derived from the same seed the predicate reads, so the
// sentence and the rule cannot disagree.
export function graduateGateDescription(program: GraduateProgramSeed): string {
  if (program.type === 'professional') {
    const schools = milestoneSchools();
    const parts = program.gateSchools.map((name) => {
      const school = schools.find((x) => x.schoolName === name);
      const needed = professionalGateThreshold(program);
      const total = school ? school.majors.length : 0;
      return `${needed} of ${total} ${name} programs established`;
    });
    return parts.join(' and ');
  }
  return `a finished lab in ${program.gateSchools.join(' and ')}`;
}

// ---------------------------------------------------------------------
// Descriptions. Every tier-1/core course (the 48 entry points players see
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
  SOCY101: 'Examines how social structures, institutions, and group behavior shape everyday life.',
  ANTH101: 'Introduces the four fields of anthropology and what each asks about being human.',
  POLS101: 'Covers the structures and processes of government and the rights and duties of citizenship.',
  HIST101: 'Surveys major civilizations and turning points from antiquity to the modern era.',
  PHIL101: 'Builds skills in argument analysis, deduction, and identifying logical fallacies.',

  MATH101: 'Extends single-variable calculus into sequences, series, and techniques of integration.',
  BIOL101: 'Covers cell structure, genetics, and the fundamentals of living systems.',
  CHMY101: 'Builds stoichiometry, periodicity, and reaction theory from first principles.',
  PHYS101: 'Derives motion, force, energy, and momentum from Newton\'s laws, with lab work throughout.',
  ENVS101: 'Surveys how physical, chemical, and biological systems interact across a changing planet.',
  PSYC101: 'Surveys the major subfields of psychology, from cognition to clinical practice.',

  PHLT101: 'Surveys how populations, policy, and environment shape community health outcomes.',
  NURS101: 'Introduces the nursing profession, scope of practice, and foundations of patient care.',
  NUTR101: 'Covers macronutrients, micronutrients, and how diet supports human health.',
  PHRM101: 'Introduces drug discovery, formulation, and the pharmacist\'s role in patient care.',
  KINE101: 'Surveys human movement — anatomy, physiology, and mechanics — as one connected system.',
  NEUR101: 'Introduces the nervous system from single neurons up to behavior and cognition.',

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
  'BLDG-SCIENCE': 'Lecture theatres, teaching benches, and prep rooms for the Science school’s six majors.',
  'BLDG-HEALTHSCI': 'Clinical labs and classrooms for the Health Science school’s six majors.',
  'BLDG-COMPSCI': 'Labs and classrooms for the Computer Science school’s six majors.',
};

// Names and descriptions for the two professional-school buildings, keyed
// by GRADUATE_PROGRAMS id rather than by buildingId — the seed already has
// the program handy at the point these are read (see initialTech below),
// and it's the program's identity, not the building's, that these are
// really about.
const PROFESSIONAL_BUILDING_NAMES: Record<string, string> = {
  MED: 'Medical School Hall',
  LAWS: 'Law School Hall',
};
const PROFESSIONAL_BUILDING_DESCRIPTIONS: Record<string, string> = {
  MED: 'Teaching clinics, anatomy labs, and lecture halls for the School of Medicine.',
  LAWS: 'Moot courtrooms, a law library, and seminar rooms for the School of Law.',
};

function nodeId(prefix: string, num: number): string {
  return `${prefix}${num}`;
}

// Expand the seed data into the flat Buildable[] the engine consumes:
// 384 course Buildables plus one school-building Buildable per school.
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
          effects: { upkeepPerWeek: COURSE_UPKEEP_PER_WEEK[1] },
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
          name: RESEARCH_FACILITY_NAMES[major.prefix] ?? `${major.name} Labs`,
          description: `${RESEARCH_FACILITY_BLURBS[major.prefix] ?? 'Specialized lab space'} — gates ${major.name}'s capstone (tier-3) coursework, and lets the school produce research.`,
          cost: LAB_COST,
          duration: LAB_WEEKS,
          // Buildable once the major's entry course AND its school building
          // are done — a thematic prereq (a teaching lab belongs to a
          // school), not a new gate: the school building is already on the
          // path to tier-2, and tier-3 is what the lab actually gates, so
          // this only stops a lab from being an expensive, useless purchase
          // a decade before anything needs it — which is exactly the trap
          // an early-game player with cash burning a hole falls into.
          prereqs: [t1Id, school.buildingId],
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
        if (tier === 1) prereqs = [...GENED_CORE_IDS];
        else if (tier === 2) prereqs = [t1Id, school.buildingId];
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
          effects: { upkeepPerWeek: COURSE_UPKEEP_PER_WEEK[tier] },
        });
      });
    }

    // The school building: unlocked once every tier-1 course in the school
    // is done (core courses for General Studies, one per major otherwise).
    // Its own completion unlocks the school's tier-2 courses — authored as
    // a plain prereq on each of those courses above, resolved by the same
    // generic engine that resolves every other prereq.
    //
    // Founders Hall (General Studies' own building) is the one exception:
    // per the docs/design/curriculum.mdmilestone chain, a new university
    // starts with "one academic building and the gen-ed courses available" —
    // the building isn't an early reward, it's the founding condition the
    // gen-ed courses are paired with. It's the one Buildable in the whole
    // game seeded 'done' AND pre-placed at founding (see actions.ts's
    // createInitialState) — the university's literal founding hall, in the
    // sense the name implies, standing in for the pre-built dorm a founding
    // campus used to open with before commuters (see campusData.ts). It
    // carries no APPLY-ONCE reputation effect: a gen-ed reputation baseline
    // is folded into the founding institution's standing instead (see
    // GENED_BUILDING_REPUTATION_BONUS and actions.ts), the same way every
    // other academic building grants prestige through curriculum breadth
    // rather than a direct bonus of its own. Its upkeepPerWeek is LIVE-READ
    // every tick off whatever is 'done', so it is part of the founding
    // operating picture with no double-counting — the same contract the
    // founding dining hall follows in facilitiesData.ts, just already 'done'
    // rather than merely 'available' on day one. Academic buildings carry no
    // capacity effect at all — see the capacity comment above
    // GENED_BUILDING_REPUTATION_BONUS.
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
      // Founders Hall holds the gen-ed core and NOTHING ELSE: one slot,
      // filled at founding (see actions.ts's createInitialState), so the
      // core occupies the building rather than one slot of six. The
      // alternative — core plus five free slots — strands the player's
      // first five programs in a building that can never found a school,
      // a trap laid in the first ten minutes. See types.ts's HallSlot.
      ...(isGenEd ? { slots: 1 } : {}),
      effects: {
        upkeepPerWeek: isGenEd ? GENED_BUILDING_UPKEEP_PER_WEEK : SCHOOL_BUILDING_UPKEEP_PER_WEEK,
      },
    });
  }

  // The academic hall chain (see ACADEMIC_HALL_SLOTS above). The first
  // waits on the gen-ed core, exactly as every tier-1 course does; each
  // rung after it waits on the rung before, the dorm chain's shape.
  ACADEMIC_HALL_NAMES.forEach((name, i) => {
    const cost = Math.round(ACADEMIC_HALL_FIRST_COST * ACADEMIC_HALL_COST_RATIO ** i / 1_000) * 1_000;
    nodes.push({
      id: academicHallId(i),
      kind: 'building',
      name,
      description: `An academic hall with ${ACADEMIC_HALL_SLOTS} program slots. Six programs of one school, housed together, found that school.`,
      cost,
      duration: i === 0 ? ACADEMIC_HALL_FIRST_WEEKS : ACADEMIC_HALL_WEEKS,
      prereqs: i === 0 ? [...GENED_CORE_IDS] : [academicHallId(i - 1)],
      status: 'locked',
      slots: ACADEMIC_HALL_SLOTS,
      effects: { upkeepPerWeek: ACADEMIC_HALL_UPKEEP_PER_WEEK },
    });
  });

  // Graduate programs, appended after the undergraduate catalogue (see the
  // GRADUATE PROGRAMS block above). Every one of these is a plain `course`
  // Buildable — same kind, same develop/build flow, same faculty
  // course-slot gate, same live-read upkeep — carrying `graduateProgram`
  // so techSystem.ts knows which parent-school gate it waits on and the
  // Curriculum tab knows where to draw it.
  //
  // Inside a program the climb is ordinary authored prereqs: the entry
  // course has none at all beyond its program's own building where one
  // exists (see `buildingId` above — a cross-kind course-requires-building
  // prereq, exactly like an undergraduate tier-2 course requiring its
  // school building), the middle courses require the entry course, and the
  // final course requires every course before it — a capstone in the same
  // sense a tier-3 course is.
  for (const program of GRADUATE_PROGRAMS) {
    const professional = program.type === 'professional';
    const ids = graduateCourseIds(program);
    const entryId = ids[0];

    program.courses.forEach((course, i) => {
      const id = ids[i];
      const last = i === program.courses.length - 1;
      // Same CLINICAL_PRACTICUM_GATE the undergraduate loop applies, for
      // the one graduate course that has an entry (the MD's clerkship year,
      // which needs the University Hospital) — read from the same table
      // rather than special-cased here, so "which coursework needs a
      // clinical facility" stays authored in exactly one place.
      const prereqs = [
        ...(i === 0
          ? (program.buildingId ? [program.buildingId] : [])
          : last ? ids.slice(0, i) : [entryId]),
        ...(CLINICAL_PRACTICUM_GATE[id] ? [CLINICAL_PRACTICUM_GATE[id]!] : []),
      ];

      nodes.push({
        id,
        kind: 'course',
        graduateProgram: program.id,
        name: `${program.id} ${course.num} · ${course.title}`,
        description: i === 0
          ? program.buildingId
            ? `Founds ${program.blurb} (${program.degree}). Opens once ${PROFESSIONAL_BUILDING_NAMES[program.id] ?? program.name} is built.`
            : `Founds ${program.blurb} (${program.degree}). Opens once ${graduateGateDescription(program)}.`
          : `${program.degree} coursework in ${course.title}, taught inside ${program.name}.`,
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

  // The two professional-school buildings (Medicine, Law — see
  // GraduateProgramSeed's `buildingId`). Gated the exact same dynamic way a
  // graduate course is: `graduateProgram` routes it through
  // techSystem.ts's meetsUnlockGates -> graduateGateMet, so it reveals
  // (locked -> available) the moment the program's own academic gate reads
  // true — the SAME predicate the courses always used, reused rather than
  // duplicated. It carries no prereqs of its own (nothing must be 'done'
  // first, only the dynamic gate has to clear); the program's entry course
  // above is what carries the building as ITS prereq, which is what makes
  // the building a genuine construction step rather than a formality: the
  // gate reveals it, but the player still has to build it before the
  // program's first course opens.
  for (const program of GRADUATE_PROGRAMS) {
    if (!program.buildingId) continue;
    nodes.push({
      id: program.buildingId,
      kind: 'building',
      graduateProgram: program.id,
      name: PROFESSIONAL_BUILDING_NAMES[program.id] ?? `${program.name} Hall`,
      description: `${PROFESSIONAL_BUILDING_DESCRIPTIONS[program.id] ?? `${program.name}'s own campus building.`} Buildable once ${graduateGateDescription(program)}.`,
      cost: PROFESSIONAL_SCHOOL_BUILDING_COST,
      duration: PROFESSIONAL_SCHOOL_BUILDING_WEEKS,
      prereqs: [],
      status: 'locked',
      effects: { upkeepPerWeek: PROFESSIONAL_SCHOOL_BUILDING_UPKEEP_PER_WEEK },
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

// Research metadata (school -> its lab Buildables -> the faculty fields
// that teach in it), consumed by researchData.ts's weeklyResearchPoints.
// A third independent read of the same seed data, for the same reason
// milestoneSchools() is: the engine has no notion of "school", so the one
// feature that needs it derives it here rather than growing a field on
// Buildable.
//
// WHY FIELDS AND NOT COURSES. Research is produced by PEOPLE, and a
// faculty member's only structural tie to a school is the field they were
// hired into — so "who researches at a school with a lab" is answered by
// walking each school's majors back to the field that staffs them. A
// field that staffs majors in two schools (Chemistry teaches Chemical
// Engineering AND Science's Chemistry; Physics teaches Aerospace AND
// Science's Physics; Mathematics teaches Data Science AND Science's
// Mathematics; Operations Research teaches Supply Chain AND Industrial
// Engineering) therefore appears under both, and a hire in it researches as
// soon as EITHER of those schools has a lab. That is the intended reading
// of "faculty in a college that has a lab": the person has a lab to work
// in.
//
// The School of Science widens this considerably. Because Science's fields
// are the ones that turn up everywhere else in the catalogue, a Mathematics
// hire made for Data Science and a Physics hire made for Aerospace both
// start researching the moment the Science Center has a lab. Psychology,
// which could previously never research at all, moved into Science with its
// major.
//
// EVERY SCHOOL WITH MAJORS NOW BEARS A FACILITY. Business, Arts & Media,
// Social Sciences & Humanities and Computer Science each got one — see
// LAB_GATED_MAJOR_PREFIXES and RESEARCH_FACILITY_NAMES above — so `labIds`
// is empty only for General Studies, which has no majors of its own. What
// differs between schools is vocabulary, not mechanics (researchData.ts's
// DISCIPLINE_VOCAB); see docs/design/research.md.
export interface ResearchSchool {
  schoolName: string;
  labIds: string[];  // lab Buildable ids belonging to this school's majors; empty means this school can never produce research
  fields: string[];  // every Faculty field that teaches in this school (deduplicated)
}

// WHICH FIELD'S WORK HAPPENS IN THIS FACILITY. A research facility is
// authored per lab-gated major (LAB_GATED_MAJOR_PREFIXES above, through
// labId), so the mapping already exists — this only surfaces it.
//
// It is NOT researchSchools().fields, and the difference is the whole point
// of the function. A school's fields are everyone who could staff a project
// there; a facility's fields are what the facility is FOR. Conflating them
// is what produced "Acoustics of Performance Spaces in the Aerospace
// Engineering Lab": every lab in a school was offered the same school-wide
// topic pool, so a school with a dozen labs offered each of them the same
// dozen unrelated projects.
//
// Plural because the shape should not have to change if a facility ever
// serves more than one major — today every one of them serves exactly one,
// so this returns a single field, or nothing at all for an id that names no
// research facility.
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

export function researchSchools(): ResearchSchool[] {
  return SCHOOLS.map((school) => {
    const fields = new Set<string>(school.majors.map((major) => major.field));
    // General Studies is staffed per-COURSE rather than per-major (see
    // GENED_FIELDS), so its fields come from the core it actually offers.
    if (school.core) {
      for (const [code] of school.core) {
        const field = GENED_FIELDS[code.replace(/\s/g, '')];
        if (field) fields.add(field);
      }
    }
    // Graduate programs teach in their home school too, and are staffed
    // per-course like the gen-ed core. Folded in here rather than left out
    // so "every field that teaches in this school" stays literally true as
    // the catalogue grows. It changes nothing today — every graduate field
    // except Law already teaches undergraduate courses in its program's
    // home school, and Law's home (Social Sciences & Humanities) bears no
    // lab — but a law professor at a school that later gets one should not
    // be invisible to research because nobody remembered to add them.
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

// Progressive-discovery metadata for the Curriculum tab's course-cell view
// (see CurriculumTab.tsx). A second independent UI-only view alongside
// milestoneSchools() above — same reasoning: the engine never needs this
// shape, only the tab that derives what's revealed from existing
// unlock/milestone state (school building done, program-established) does.
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
// A graduate program as the Curriculum tab needs it: which section it
// belongs in, what to call it, what its gate reads, and its course ids.
// Same reasoning as DiscoveryMajor — the engine never needs this shape,
// only the tab that reveals a program when its gate opens does.
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
  buildingId: string;
  coreIds: string[]; // gen-ed core course ids; non-empty only for General Studies
  majors: DiscoveryMajor[];
  // The graduate programs whose HOME school this is AND that display
  // inside it — i.e. every program without a `buildingId` (the MBA, and
  // all three PhD doctorates). Empty for most schools. Medicine and Law no
  // longer appear here even though Health Science/Social Sciences &
  // Humanities is still their `homeSchool` for every other read (faculty
  // staffing, research) — see professionalSchools() below for how they
  // display instead.
  graduate: DiscoveryGraduateProgram[];
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
    graduate: GRADUATE_PROGRAMS
      .filter((program) => program.homeSchool === school.name && !program.buildingId)
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

// A professional school with its own campus building (Medicine, Law) as
// the Curriculum tab needs it: structurally parallel to DiscoverySchool
// above (a heading, a buildingId keying its own section and completion
// ring, its course ids), but never a sub-group of any other school.
export interface DiscoveryProfessionalSchool {
  id: string;         // the GraduateProgramSeed id (MED, LAWS)
  name: string;        // "School of Medicine" / "School of Law" — the section heading
  degree: string;
  buildingId: string;
  courseIds: string[];
}

export function professionalSchools(): DiscoveryProfessionalSchool[] {
  return GRADUATE_PROGRAMS
    .filter((program): program is GraduateProgramSeed & { buildingId: string } => !!program.buildingId)
    .map((program) => ({
      id: program.id,
      name: program.name,
      degree: program.degree,
      buildingId: program.buildingId,
      courseIds: graduateCourseIds(program),
    }));
}
