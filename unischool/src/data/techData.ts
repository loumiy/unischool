import type { Buildable, GameState } from '../state/types';
import {
  ART_GALLERY_ID, HEALTH_CENTER_TIER2_ID, HEALTH_CENTER_TIER3_ID, PERFORMING_ARTS_CENTER_ID,
} from './facilitiesData';
import { COURSE_DESCRIPTIONS } from './courseDescriptions';

/*
  Your real curriculum, expressed as seed data and expanded into Buildable[].
  42 majors across 7 schools (9 courses each) = 378 course Buildables, plus
  Founders Hall and the academic hall chain (ACADEMIC_HALL_SLOTS below) —
  see docs/design/curriculum.md. Seven SchoolSeeds, one per degree-granting
  school.

  THERE IS NO GENERAL-EDUCATION CORE ANY MORE (Plan 19's PR A). The
  catalogue used to open with six GE courses in a school of their own
  ("General Studies", no majors) that every tier-1 course required and
  that filled Founders Hall's one slot. They were six tier-1 courses in a
  costume — the same price, the same four weeks — and finishing them left
  a year with nothing in it. The college now OPENS TEACHING: three Social
  Sciences & Humanities programs are housed in Founders Hall at founding
  with their first two courses developed (see actions.ts's
  createInitialState), and the offer queue draws from week one.

  THERE IS NO SCHOOL BUILDING ANY MORE (Plan 14's PR C). A school used to be
  one 'building' Buildable per SchoolSeed, unlocked by its six tier-1
  courses and gating its tier-2 courses. A school is now something the
  player FOUNDS by housing six of its programs in one academic hall, and a
  program is founded by taking a slot (see types.ts's HallSlot and
  systems/techtree/programOffers.ts). Medicine and Law lost their own
  buildings (BLDG-MED, BLDG-LAW) in PR E and take ordinary slots like
  everything else — a graduate program belongs to its homeSchool, and
  since that school's six majors already fill a hall, an MD or a
  doctorate needs a second hall of its school, dedicated on its own terms.
  Every school has a graduate program now (Plan 20's PR H), so every
  school can justify a second hall.

  On top of that undergraduate catalogue, GRADUATE PROGRAMS (further below)
  add 49 more course Buildables across nine programs. Two of them — the
  School of Medicine and the School of Law, the only two that award an
  EXTERNAL professional degree — used to carry their own 'building'
  Buildable; see the module note above for where they live now.

  Prerequisite rule (a clean three-stage climb per major), now AUTHORED as
  plain ids rather than derived purely from tier:
    - tier 1 (the 101 course): no prereqs at all. What keeps it locked is
      the dynamic housed gate below — founding the program from a hall
      slot is the one way in (Plan 14's offer queue is the real gate on
      the catalogue: three programs at a time, whatever the prereqs say)
    - tier 2 (110/120/130/140): requires the major's tier-1 course — and,
      like every course of a major, the dynamic gate "this program is
      housed" (techSystem.ts's meetsUnlockGates reads s.halls), which is
      what founding a program from a hall slot satisfies
    - tier 3 (210/220/230/240): requires ALL FOUR of the major's tier-2
      courses

  On top of that backbone, a curated set of cross-major/cross-school prereq
  bridges (CROSS_MAJOR_BRIDGES below) are patched in — deliberately NOT a
  systematic web (see the PR notes on why a curated set was chosen over
  building out cross-major prereqs for all 384 courses). The set is larger
  than it was (about forty edges, up from twenty), and four of them now
  make a major's ESTABLISHMENT depend on another school having been
  started: Econometrics and Epidemiology both need Probability & Statistics,
  so Economics and Public Health wait on Mathematics being founded; Public
  Policy Analysis needs Macroeconomics, so Political Science waits on
  Economics. That is the intended weight of a cross-discipline prereq rather
  than an oversight — but it is why no bridge may point UP a tier (see
  CROSS_MAJOR_BRIDGES's own rules), which is what keeps the coupling to one
  extra school rather than to another school's endgame.

  requiresFaculty, unlike the prereq bridges, IS systematic: every major
  seed carries one `field` (a Faculty.field from facultyData.ts's
  FACULTY_FIELDS), and every course in that major — all nine tiers —
  requires it.

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
  Aerospace, Chemistry staffs Science AND
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
// Tier 1 is priced a bit above its old
// rate so the tier-1 build-out is still a real squeeze on opex now that
// founding tuition starts higher — the pinch moves from a week-1 cash
// scare to the T1 build-out visibly tightening the surplus, rather than
// disappearing.
const TIER_COURSE_COST: Record<number, number> = { 1: 80_000, 2: 180_000, 3: 400_000 };

// What a finished course costs to RUN, every week, forever — the recurring
// half of a curriculum decision and one of the growth loop's main teeth
// (see financeSystem.ts's cost-driver block). A course is not a one-time
// purchase: developing it commits the school to staffing and running it,
// and a tier-3 capstone with a handful of students in it costs several
// times what an entry lecture does.
//
// This is what makes opening a tier RAISE weeklyOpEx immediately, while
// the prestige that tier eventually earns only drifts in over years — the
// cost-leads-revenue lag, expressed as authored data rather than as a
// special case in any system. financeSystem.ts sums it live off every
// 'done' Buildable's effects.upkeepPerWeek, exactly as it does for
// campus-life facilities.
const COURSE_UPKEEP_PER_WEEK: Record<number, number> = { 1: 130, 2: 380, 3: 800 };

// Founders Hall: the college's founding hall, an ordinary six-slot
// academic hall in every mechanical respect (Plan 19's PR A) — it is
// seeded 'done' and pre-placed, so its cost is a figure for the build tray
// to show rather than one anybody pays.
const FOUNDERS_HALL_COST = 400_000;
const FOUNDERS_HALL_WEEKS = 20;
// Academic buildings carry a real recurring cost too — a hall is the
// single biggest running bill in the curriculum half of the budget, and
// (unlike a course) it arrives all at once. Founders Hall's is charged
// from week one: it is seeded 'done' at founding, and upkeepPerWeek is
// live-read rather than applied once, so it is part of the founding
// operating picture with no double-counting. Cheaper to run than a hall
// the player builds: it is the older, smaller building.
const FOUNDERS_HALL_UPKEEP_PER_WEEK = 900;
// A small reputation baseline the founding institution opens with — the
// standing of a college that is already teaching — folded into the
// starting reputation by createInitialState rather than granted as a
// Buildable effect. There is no apply-once reputation effect in the model
// (see techSystem.ts's applyEffects), and reputation is a stock that
// drifts toward a target anyway, so this is the institution's founding
// academic standing, not a bonus tied to whether Founders Hall has been
// built yet (it always is, at founding).
// Academic buildings never grant capacity — capacity is tied exclusively to
// dormitories now (see campusData.ts); building out the curriculum unlocks
// courses/majors, not beds.
export const FOUNDERS_HALL_REPUTATION_BONUS = 1.5;

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
// and its cost is visible. The first is DELIBERATELY CHEAP, a fraction of
// the old school building, so a founding school builds it without
// thinking — but not in week one: Founders Hall opens with three rooms
// free (Plan 19), so the first purchased hall is the breadth road against
// the depth road of filling the rooms the college already has, and its
// gate (Plan 19's PR B) is the college teaching enough to justify a second
// building. Each rung after it costs a fixed ratio more, so the fifth is a
// multi-year commitment.
//
// Thirteen rungs because fourteen halls is the completionist ceiling —
// seven schools of six majors, plus a second hall for each of the seven
// schools for the nine graduate programs, which belong to those schools
// but do not fit in a hall their six majors already fill — and Founders
// Hall is the first of the fourteen (Plan 19: six slots, an ordinary
// hall). It was twelve until Plan 20's PR H: Computer Science and Arts &
// Media held no graduate program, so neither justified a second hall;
// the computing doctorate and the MFA are two rungs, and the humanities
// doctorate is none, because it sits beside the law school in the second
// hall Social Sciences & Humanities already had. A hall the player never
// needs is never offered — the chain stops here.
//
// EVERY NUMBER HERE IS PROVISIONAL, and loudly so. They are fitted by feel
// against an economy the September review found broken and Plan 15 is
// about to replace; Plan 15's PR G is where they are fitted once, properly,
// against the scorecard. The opening shape: first hall cheap, then ×1.35
// a rung, so a balanced run affords roughly eight by year 35 and a
// completionist ten or eleven. Cumulative: ~$14M for eight, ~$37M for
// eleven, ~$68M for all thirteen — a fraction of the dorm chain over the
// same span.
export const ACADEMIC_HALL_SLOTS = 6;
// What the first purchased hall waits on (Plan 19's PR B): the six courses
// the college opens with, plus two the player chose. See
// Buildable.minCoursesToUnlock.
export const FIRST_HALL_COURSE_GATE = 8;
const ACADEMIC_HALL_FIRST_COST = 750_000;
const ACADEMIC_HALL_COST_RATIO = 1.3;
const ACADEMIC_HALL_FIRST_WEEKS = 16;
const ACADEMIC_HALL_WEEKS = 24;
// Upkeep matches the school building it replaced ($3,000 a week): a hall
// is the same lecture rooms and offices whatever is housed in it.
const ACADEMIC_HALL_UPKEEP_PER_WEEK = 3_000;
// Named for the campus rather than for a school — a hall is not "the
// School of Engineering" until six Engineering programs sit in it (Plan
// 14's PR E gives a dedicated hall its school's name on the map). Named
// for the founding woodland (see treeData.ts) the campus was cut out of,
// and for nothing else: the first four used to be the cardinal points,
// and a name that says where a building goes contradicts a map that is
// the player's own to lay out.
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

// A hall with program slots: Founders Hall and the thirteen of the chain
// above. Founders Hall used to be excluded here (one slot, the core's,
// never a decision); since Plan 19's PR A it is an ordinary six-slot hall
// that happens to stand at founding, and every reader of this predicate
// — the build menu's grouping, the map's slot pips, the info panel, the
// next-step line — treats it as one. Where something has to single it
// out (the ambition "a hall of your own", the harness's "first hall
// built"), it compares against FOUNDERS_HALL_ID.
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

// Exported so actions.ts's createInitialState can find and pre-place this
// one Buildable at founding. The string is the id General Studies' building
// carried before Plan 19 retired that school; it is kept so nothing keyed
// on it (the clock tower in buildingSpec.ts, the layout tool) had to move
// with a rename that was taking a save break anyway.
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
      // "Chemistry I / II" and "Physics I / II" until Plan 19: with the
      // gen-ed core gone from under the catalogue those read as the same
      // subject as the Science school's General Chemistry and Classical
      // Mechanics under a second name, so both pairs are now the real
      // first courses of their majors.
      { prefix: 'CHEM', name: 'Chemical Engineering', field: 'Chemistry', courses: ['Principles of Chemical Engineering', 'Chemical Thermodynamics', 'Fluid Transport', 'Material & Energy Balances', 'Chemical Reaction Engineering', 'Process Safety', 'Biochemical Engineering', 'Polymer Science', 'Sustainable Energy Technology'] },
      { prefix: 'CIVE', name: 'Civil Engineering', field: 'Civil Engineering', courses: ['Statics', 'Structural Analysis', 'Soil Mechanics', 'Mechanics of Materials', 'Transportation Engineering', 'Bridge Design', 'Environmental Impact Assessment', 'Construction Management', 'Urban Planning'] },
      { prefix: 'INDE', name: 'Industrial Engineering', field: 'Operations Research', courses: ['Systems', 'Production Planning', 'Ergonomics & Safety', 'Quality Control', 'Facilities Design', 'Simulation Modeling', 'Supply Chain Analytics', 'Lean Manufacturing', 'Reliability Engineering'] },
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
    // THE OPENING SCHOOL (Plan 19). English, History and Philosophy are
    // founded in Founders Hall before the player sees the game, taught by
    // the founding roster (see actions.ts's createInitialState), so a
    // college opens as a small liberal-arts college teaching what its five
    // professors can teach — and three of the six programs that would
    // dedicate this school are already there.
    name: 'Social Sciences & Humanities',
    majors: [
      { prefix: 'ENGL', name: 'English', field: 'English', courses: ['Introduction to Literary Studies', 'British Literature Survey', 'American Literature Survey', 'Critical Theory', 'Advanced Composition', 'Shakespeare', 'Restoration & 18th Century Literature', 'Postcolonial Literature', 'Technical Writing'] },
      { prefix: 'SOCY', name: 'Sociology', field: 'Sociology', courses: ['Introduction to Sociology', 'Social Stratification', 'Sociological Theory', 'Race & Ethnicity', 'Qualitative Research Methods', 'Criminology', 'Sociology of the Family', 'Urban Sociology', 'Sex & Gender'] },
      { prefix: 'ANTH', name: 'Anthropology', field: 'Sociology', courses: ['Introduction to Anthropology', 'Cultural Anthropology', 'Biological Anthropology', 'Archaeological Methods', 'Linguistic Anthropology', 'Ethnographic Field Methods', 'Medical Anthropology', 'Anthropology of Religion', 'Museum & Heritage Studies'] },
      // "Civics" until Plan 19: a secondary-school name for the entry
      // survey of one of the three programs that dedicate the opening
      // school, so it is an early, named goal rather than an obscure row.
      { prefix: 'POLS', name: 'Political Science', field: 'Political Science', courses: ['Introduction to Political Science', 'Comparative Politics', 'International Relations', 'American Government', 'Public Policy Analysis', 'Constitutional Law', 'Political Campaigns', 'Theories of Justice', 'Security Studies'] },
      { prefix: 'HIST', name: 'History', field: 'History', courses: ['World History', 'Research & Historiography', 'US History', 'European History', 'Ancient Civilizations', 'World War I & II', 'Historical Archaeology', 'Historical Anthropology', 'History of Science & Technology'] },
      // "Ethics II" until Plan 19, when the gen-ed Ethics I it followed
      // was retired with the core.
      { prefix: 'PHIL', name: 'Philosophy', field: 'Philosophy', courses: ['Introduction to Logic & Reasoning', 'Ethics', 'Metaphysics', 'Epistemology', 'Ancient Greek Philosophy', 'Existentialism', 'Philosophy of Mind', 'Aesthetics', 'Symbolic Logic'] },
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
    majors: [
      // "Calculus II" until Plan 19, when the gen-ed Calculus it followed
      // was retired with the core. Mathematics is one of the two majors
      // the founding offer is rigged toward (programOffers.ts), so this is
      // plausibly among the first three programs a player is ever shown.
      { prefix: 'MATH', name: 'Mathematics', field: 'Mathematics', courses: ['Calculus', 'Linear Algebra', 'Probability & Statistics', 'Discrete Mathematics', 'Differential Equations', 'Real Analysis', 'Abstract Algebra', 'Topology', 'Numerical Methods'] },
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

// Every undergraduate major's course-code prefix — which is also its
// PROGRAM ID in `s.halls` (see types.ts's HallSlot). Read by the loader's
// hall sanitizer and the invariant sweep, so "is this a real program" is
// answered off the seed rather than a list kept in step with it.
export function majorPrefixes(): string[] {
  return SCHOOLS.flatMap((school) => school.majors.map((major) => major.prefix));
}

// A PROGRAM, as the halls model sees it (Plan 14): the unit that takes a
// slot. Forty-two majors and the nine graduate programs, each read off the
// seed by the id `s.halls` and `s.programOffers` carry. Deliberately a
// fourth independent read of SCHOOLS, for the reason milestoneSchools()
// and researchSchools() each are: the engine has no notion of "program",
// so the feature that needs one derives it here rather than growing a
// field on Buildable.
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

// Indexed once, like programOfCourse below: the catalogue is static, and
// the map's hall pips ask this for every filled slot on every render, so
// rebuilding the whole table per call was measurable on every mouse move.
let programIndex: Map<string, ProgramInfo> | null = null;
export function programById(id: string): ProgramInfo | undefined {
  if (!programIndex) programIndex = new Map(programs().map((p) => [p.id, p]));
  return programIndex.get(id);
}

// Which program a course belongs to — the id `s.halls` would house it
// under — or undefined for a Buildable that is not a course of any program.
// Memoised: the catalogue is static, and meetsUnlockGates asks this for
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
//   3. A BRIDGE NEVER HIDES A SCHOOL BEHIND A CAPSTONE (Plan 20's PR A).
//      Rule 1 looks at the target's tier and not at what stands behind
//      it, which is how Biochemical Engineering came to require
//      Biochemistry — a capstone whose own closure holds the Chemistry
//      Labs and, through the lab's schoolGate, a founded School of
//      Science. So no bridge may name a course whose prereq closure
//      contains a `facilityType: 'lab'` Buildable or a `schoolGate`: a
//      cross-discipline prerequisite may cost the player a course or a
//      hall slot in another school, never that school's lab and its
//      founding, none of which the tooltip could say.
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
  AERO210: ['MATH101'],           // Astrodynamics needs calculus
  AERO220: ['MECH120'],           // Rocketry needs thermodynamics
  ELEC130: ['PHYS110'],           // Electromagnetics needs undergraduate electricity & magnetism
  CHEM220: ['CHMY120'],           // Biochemical Engineering needs organic chemistry — the chemistry the course actually rests on. NOT CHMY210 (Biochemistry), which it used to name: that is a capstone in a lab-gated major, so its closure holds LAB-CHMY and the School of Science's founding, and distinguishing Engineering quietly required founding Science and building a $700,000 lab in it (rule 3 above, Plan 20's PR A)
  CHEM230: ['CHMY120'],           // Polymer Science needs organic chemistry — "polymer science requires Chemistry II" is already what the tier-3 climb says (rule 2 above), so the bridge goes one step deeper, into the Chemistry major
  CIVE140: ['SPCO101'],           // Transportation Engineering needs the supply-chain fundamentals it moves goods for. NOT SPCO240 ("Transportation Management"), which is a tier-3 capstone: this is a tier-2 course, and rule 1 above is why — bridging a tier-2 course to a capstone would hold Civil Engineering's ESTABLISHMENT behind most of a Business major. SPCO101 is also the lightest honest stand-in available, an entry course gating on nothing, so Civil Engineering doesn't quietly acquire a Business Hall dependency either
  CIVE220: ['ENVS101'],           // Environmental Impact Assessment needs environmental science
  CIVE230: ['MGMT120'],           // Construction Management needs operations management. Legal as a same-tier bridge to MGMT210 (Project Management), which it used to name — but MGMT210 requires Management's whole tier-2 quartet, so a civil engineering capstone pulled in most of a Business major; Operations Management is the lighter and equally honest link (Plan 20's PR A)
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

export type GraduateProgramType = 'professional' | 'doctoral';

interface GraduateCourseSeed {
  num: number;    // course number within the program (5xx professional, 7xx doctoral)
  title: string;
  field: string;  // the Faculty field this ONE course requires — authored per course rather than per-major, which is what lets medicine lean on the health AND science departments at once
}

export interface GraduateProgramSeed {
  id: string;              // also the course-code prefix and the `grad-program-complete:` milestone subject
  name: string;
  degree: string;          // the credential, for display only
  type: GraduateProgramType;
  // The school this program BELONGS to — its academic home, always one of
  // gateSchools. It is the section the program is displayed under, the
  // school whose staffing reads fold its course fields in
  // (researchSchools()), and the school it counts as when housed in a
  // hall (systems/techtree/schools.ts's dedicatedSchool).
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
}

// Nine programs, 49 courses (six and 37 until Plan 20's PR H; 28 before
// Medicine went 6 -> 12 and Law 5 -> 8).
// Deliberately small sets per program — each is "a handful of high-tier
// courses that complete into a milestone", not a second nine-course major.
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
  // The three that four schools did not have (Plan 20's PR H). The three
  // doctorates above were authored when three schools bore labs; every
  // school with majors has a research facility now, and the doctoral gate
  // is a finished facility in the parent school, so Computer Science, the
  // humanities and Arts & Media get the terminal degree their facility
  // already justifies. Authored exactly like the three above, on the same
  // rung, with no mechanism anywhere.
  {
    id: 'PHDC', name: 'Doctoral Program in Computing', degree: 'PhD', type: 'doctoral',
    homeSchool: 'Computer Science', gateSchools: ['Computer Science'],
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
    homeSchool: 'Social Sciences & Humanities', gateSchools: ['Social Sciences & Humanities'],
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
    // The MFA is the terminal degree of the studio arts, and it takes the
    // DOCTORAL rung rather than the professional one, deliberately: the
    // type is what selects the gate (a finished facility in the parent
    // school — the Media Production Studio — rather than a count of
    // established majors), the cost (a program bolted onto a school that
    // already has the studio and the faculty, not a medical school), and
    // the research credit, which reads right because the studio already
    // counts exhibited work as research (researchData.ts's
    // DISCIPLINE_VOCAB). A professional-tier program with a lab gate
    // would have been a third gate reading, and the whole graduate model
    // is built on there being two.
    id: 'MFAX', name: 'Master of Fine Arts', degree: 'MFA', type: 'doctoral',
    homeSchool: 'Arts & Media', gateSchools: ['Arts & Media'],
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
  // A school with one research facility gets it by name — "the Media
  // Production Studio finished" rather than "a finished lab in Arts &
  // Media", which names a building the school does not have (Plan 20's
  // PR H). The lab sciences and engineering, with several, keep the
  // general form.
  const schools = researchSchools();
  const parts = program.gateSchools.map((name) => {
    const school = schools.find((x) => x.schoolName === name);
    if (school && school.labIds.length === 1) {
      const facility = researchFacilityName(school.labIds[0]);
      if (facility) return `the ${facility} finished`;
    }
    return `a finished lab in ${name}`;
  });
  return parts.join(' and ');
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
// Descriptions. Every undergraduate course takes its sentence from
// courseDescriptions.ts's COURSE_DESCRIPTIONS, keyed by id — one authored
// sentence per course, and no generator behind it (Plan 20's PRs D–G).
// For 336 of the 378 courses the sentence used to come from eight
// rotating templates with the title swapped in; test/course-descriptions
// .test.ts now asserts that every course in the catalogue has its own.
// Graduate courses keep a generated line (below), deliberately: 37
// courses in a far more uniform register.
// ---------------------------------------------------------------------
const FOUNDERS_HALL_DESCRIPTION = `The founding hall, standing since the college opened: ${ACADEMIC_HALL_SLOTS} program slots, three of them teaching from the first day.`;

function nodeId(prefix: string, num: number): string {
  return `${prefix}${num}`;
}

// Expand the seed data into the flat Buildable[] the engine consumes:
// 378 course Buildables, Founders Hall, the hall chain and the graduate
// catalogue.
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
          description: `${RESEARCH_FACILITY_BLURBS[major.prefix] ?? 'Specialized lab space'} — gates ${major.name}'s capstone (tier-3) coursework, and lets the school produce research.`,
          cost: LAB_COST,
          duration: LAB_WEEKS,
          // Buildable once the major's entry course is done AND its
          // school has been founded (schoolGate — see types.ts). A
          // thematic gate, not a new one: the school building used to
          // stand here, and the school-founded milestone is the reading
          // it stood for. What it still does is stop a lab from being an
          // expensive, useless purchase a decade before anything needs it,
          // which is exactly the trap an early-game player with cash
          // burning a hole falls into.
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
        // Tier 1 used to require the whole gen-ed core, and tier 2 the
        // school building. The gate both stood for — "this program has a
        // home" — is dynamic now: every course of a major waits on the
        // program being housed in a hall slot (techSystem.ts's
        // meetsUnlockGates), tier 1 included, which is what makes founding
        // the only way in. So an entry course has no prereqs at all.
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
          // Every major course starts locked — tier 1 behind the housed
          // gate alone — and unlocks via the generic resolver as its
          // prereqs complete. The founding programs' first courses are
          // then seeded 'done' by createInitialState.
          prereqs,
          status: 'locked',
          requiresFaculty: major.field,
          effects: { upkeepPerWeek: COURSE_UPKEEP_PER_WEEK[tier] },
        });
      });
    }

  }

  // Founders Hall — the college's founding hall. Per
  // docs/design/curriculum.md, a new university starts with one academic
  // building already teaching: the building isn't an early reward, it's
  // the founding condition. It's the one Buildable in the whole game seeded
  // 'done' AND pre-placed at founding (see actions.ts's createInitialState)
  // — the university's literal founding hall, standing in for the
  // pre-built dorm a founding campus used to open with before commuters
  // (see campusData.ts). It carries no APPLY-ONCE reputation effect: a
  // founding reputation baseline is folded into the institution's standing
  // instead (see FOUNDERS_HALL_REPUTATION_BONUS and actions.ts). Its
  // upkeepPerWeek is LIVE-READ every tick off whatever is 'done', so it is
  // part of the founding operating picture with no double-counting — the
  // same contract the founding dining hall follows in facilitiesData.ts,
  // just already 'done' rather than merely 'available' on day one. Academic
  // buildings carry no capacity effect at all — see the capacity comment
  // above FOUNDERS_HALL_REPUTATION_BONUS.
  //
  // SIX SLOTS, like every other hall (Plan 19's PR A). It used to hold the
  // gen-ed core and nothing else — one slot, so that the player's first
  // programs were never stranded in a building that could not found a
  // school. With the core gone the opposite is true: three Social Sciences
  // & Humanities programs are housed here at founding (actions.ts), and
  // the three free rooms are exactly the three programs that would
  // dedicate the school. See types.ts's HallSlot.
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
      ...(i === 0 ? { minCoursesToUnlock: FIRST_HALL_COURSE_GATE } : {}),
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
  // course has none at all (the program's gate — graduateGateMet — and its
  // home — a hall slot, see the housed gate in techSystem.ts — are both
  // dynamic), the middle courses require the entry course, and the final
  // course requires every course before it — a capstone in the same sense
  // a tier-3 course is.
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
        ...(i === 0 ? [] : last ? ids.slice(0, i) : [entryId]),
        ...(CLINICAL_PRACTICUM_GATE[id] ? [CLINICAL_PRACTICUM_GATE[id]!] : []),
      ];

      nodes.push({
        id,
        kind: 'course',
        graduateProgram: program.id,
        name: `${program.id} ${course.num} · ${course.title}`,
        description: i === 0
          ? `Founds ${program.blurb} (${program.degree}). Offered once ${graduateGateDescription(program)}; takes a hall slot like any program.`
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

  return nodes;
}

// Milestone-checking metadata (school -> each major's tier-2 and tier-3
// ids), consumed by techSystem.ts's checkMilestones(). Deliberately
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
// EVERY SCHOOL NOW BEARS A FACILITY. Business, Arts & Media, Social
// Sciences & Humanities and Computer Science each got one — see
// LAB_GATED_MAJOR_PREFIXES and RESEARCH_FACILITY_NAMES above — so `labIds`
// is never empty. What differs between schools is vocabulary, not
// mechanics (researchData.ts's DISCIPLINE_VOCAB); see
// docs/design/research.md.
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

// WHICH FIELDS' WORK A FACILITY MAY HOST (Plan 20's PR B): its own, from
// labFields above, plus every field its school teaches that has no
// facility of its own ANYWHERE on campus. This is how a department
// without a building leads research — in the building its school built.
// A Computing Research Center that could not run an AI project, and a
// humanities institute that could not run one in English, were the two
// that read worst, because both name a department the school obviously
// has; 108 of the 176 departmental topics were unreachable for that
// reason, and every one of them is in a field taught by a school that
// has a facility, so this closes the gap completely.
//
// "No facility of its own" is read campus-wide, not per school, and the
// difference matters twice over. A field with a facility somewhere is
// hosted THERE and nowhere else, so the Neuroscience labs are not offered
// Biology's departmental work merely because the MD's anatomy course
// makes Biology a Health Science field — a Biology project belongs in the
// Biology labs. And a field with no facility anywhere is hosted by every
// school that teaches it: English by both the Humanities Research
// Institute and the Media Production Studio, Mathematics by both the
// Science labs and the Computing Research Center, Operations Research by
// both Business and Engineering. That is correct rather than a collision
// — those departments genuinely teach in two schools, and a topic offered
// in either building is a topic happening where the department works.
//
// This does not reopen the bug labFields exists for. That bug was two
// facilities SHARING a field across schools — the aerospace lab offered
// acoustics because both are fielded Physics — and a shared field has a
// facility, so it is never widened here; the per-topic facility list
// (ResearchTopic.labs) still settles those two pairs exactly as before.
// What changes is only whether a school's own unequipped departments can
// work in the building their school built.
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
    // Graduate programs teach in their home school too, and are staffed
    // per-course rather than per-major. Folded in here rather than left out
    // so "every field that teaches in this school" stays literally true as
    // the catalogue grows. It is what puts Law — the one field whose
    // demand is entirely graduate — among the Humanities Research
    // Institute's hosted fields (hostableFields below), so a law professor
    // is not invisible to research because nobody remembered to add them.
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
// halls/milestone state (a program housed, program-established) does.
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
  // No building: a school is a set of programs housed in academic halls
  // — the Curriculum tab keys its sections by `name`.
  majors: DiscoveryMajor[];
  // The graduate programs whose HOME school this is — Medicine and Law
  // included, since PR E: a program is housed in a hall of its school,
  // and displays inside it.
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

