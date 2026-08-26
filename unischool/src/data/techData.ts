import type { TechNode, GameEffects } from '../state/types';

/*
  Your real curriculum, expressed as seed data and expanded into TechNode[].
  36 majors across 7 schools (9 courses each) + a 6-course general-ed core = 330 nodes.

  Prerequisite rule (a clean three-stage climb per major):
    - tier 1 (the 101 course): no prereqs — the entry point to a major
    - tier 2 (110/120/130/140): requires the major's tier-1 course
    - tier 3 (210/220/230/240): requires ALL FOUR of the major's tier-2 courses

  Tier also drives development time (see developmentWeeks() in techSystem.ts).
  Effects are modest per-course; the milestone bonuses (major/school complete)
  live in the tech system later, not here.
*/

const NUMS = [101, 110, 120, 130, 140, 210, 220, 230, 240];
const TIERS = [1, 2, 2, 2, 2, 3, 3, 3, 3] as const;

// Reputation reward per tier. Tune freely — this is where pacing gets balanced.
const TIER_REP: Record<number, number> = { 1: 2, 2: 3, 3: 5 };

interface MajorSeed {
  prefix: string;   // course code prefix, e.g. "FINA"
  name: string;     // major name
  courses: string[]; // exactly 9 titles, in tier order (101,110,120,130,140,210,220,230,240)
}
interface SchoolSeed {
  name: string;
  core?: Array<[string, string]>; // [code, title] for gen-ed only
  majors: MajorSeed[];
}

const SCHOOLS: SchoolSeed[] = [
  {
    name: 'General Studies',
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
    majors: [
      { prefix: 'FINA', name: 'Finance', courses: ['Principles of Finance', 'Corporate Finance', 'Investment Analysis', 'Financial Modeling', 'International Finance', 'Real Estate Finance', 'Fintech & Blockchain', 'Risk Management', 'Behavioral Finance'] },
      { prefix: 'ACCT', name: 'Accounting', courses: ['Introduction to Accounting', 'Financial Accounting', 'Managerial Accounting', 'Tax Fundamentals', 'Auditing Principles', 'Forensic Accounting', 'Governmental & Non-Profit Accounting', 'Advanced Cost Accounting', 'Accounting Information Systems'] },
      { prefix: 'MRKT', name: 'Marketing', courses: ['Fundamentals of Marketing', 'Consumer Behavior', 'Market Research', 'Digital Marketing Strategy', 'Brand Management', 'Sports Marketing', 'Advertising & Promotion', 'Sales Management', 'Global Marketing'] },
      { prefix: 'ECON', name: 'Economics', courses: ['Microeconomics', 'Macroeconomics', 'Econometrics', 'Advanced Microeconomics', 'Economic History', 'Behavioral Economics', 'Public Finance', 'Game Theory', 'Environmental Economics'] },
      { prefix: 'MGMT', name: 'Management', courses: ['Organizational Leadership', 'Human Resources Management', 'Operations Management', 'Business Ethics', 'Strategic Management', 'Project Management', 'Entrepreneurship', 'Conflict Resolution', 'Negotiations'] },
      { prefix: 'SPCO', name: 'Supply Chain & Operations', courses: ['Introduction to Supply Chain', 'Logistics & Distribution', 'Procurement & Sourcing', 'Quality Management', 'Demand Planning', 'Global Supply Chains', 'Inventory Control Systems', 'Data Analytics for Operations', 'Transportation Management'] },
    ],
  },
  {
    name: 'Engineering',
    majors: [
      { prefix: 'MECH', name: 'Mechanical Engineering', courses: ['Introduction to Mechanical Design', 'Statics & Dynamics', 'Thermodynamics', 'Fluid Mechanics', 'Materials Science', 'Robotics', 'HVAC Systems', 'Internal Combustion Engines', 'Finite Element Analysis'] },
      { prefix: 'ELEC', name: 'Electrical Engineering', courses: ['Circuits', 'Digital Logic Design', 'Signals & Systems', 'Electromagnetics', 'Microelectronics', 'Power Systems Analysis', 'Wireless Communications', 'Control Systems', 'VLSI Design'] },
      { prefix: 'CHEM', name: 'Chemical Engineering', courses: ['Chemistry I', 'Chemical Thermodynamics', 'Fluid Transport', 'Chemistry II', 'Chemical Reaction Engineering', 'Process Safety', 'Biochemical Engineering', 'Polymer Science', 'Sustainable Energy Technology'] },
      { prefix: 'CIVE', name: 'Civil Engineering', courses: ['Physics I', 'Structural Analysis', 'Soil Mechanics', 'Physics II', 'Transportation Engineering', 'Bridge Design', 'Environmental Impact Assessment', 'Construction Management', 'Urban Planning'] },
      { prefix: 'INDE', name: 'Industrial Engineering', courses: ['Systems', 'Production Planning', 'Ergonomics & Safety', 'Quality Control', 'Facilities Design', 'Simulation Modeling', 'Supply Chain Analytics', 'Lean Manufacturing', 'Reliability Engineering'] },
      { prefix: 'AERO', name: 'Aerospace Engineering', courses: ['Introduction to Flight Dynamics', 'Aerodynamics', 'Aircraft Performance', 'Spacecraft Propulsion', 'Aerospace Structures', 'Astrodynamics', 'Rocketry', 'Helicopter Dynamics', 'Unmanned Aerial Systems'] },
    ],
  },
  {
    name: 'Arts & Media',
    majors: [
      { prefix: 'MDIA', name: 'Media Studies', courses: ['Mass Communication', 'Media Theory', 'Global Media Systems', 'Digital Culture', 'Media Ethics', 'Film Industry', 'Social Media Analytics', 'Photojournalism', 'Public Relations'] },
      { prefix: 'GRDS', name: 'Graphic Design', courses: ['Visual Communication', 'Typography', 'Digital Imaging', 'Layout Design', 'Branding & Identity', 'Web Design', 'Motion Graphics', 'Illustration', 'Publication Design'] },
      { prefix: 'CRWR', name: 'Creative Writing', courses: ['Introduction to Creative Writing', 'Fiction Workshop', 'Poetry Workshop', 'Nonfiction Workshop', 'Literary Editing', 'Screenwriting', 'Playwriting', 'Writing for Young Adults', 'Creative Writing Seminar'] },
      { prefix: 'MUSC', name: 'Music', courses: ['Music Theory I', 'Music Theory II', 'Music History Survey', 'Composition I', 'Applied Instrument/Voice', 'Jazz Improvisation', 'World Music', 'Music Technology', 'Composition II'] },
      { prefix: 'FILM', name: 'Film', courses: ['Introduction to Film Analysis', 'Cinematography', 'Screenwriting Workshop', 'Film Production', 'Directing Fundamentals', 'Documentary Filmmaking', 'History of World Cinema', 'Sound Design', 'Post-Production'] },
      { prefix: 'SART', name: 'Studio Art', courses: ['Fundamentals of 2D Design', 'Drawing', 'Painting', 'Sculpture', 'Art History Survey', 'Printmaking', 'Ceramics', 'Photography', 'Digital Art'] },
    ],
  },
  {
    name: 'Social Sciences & Humanities',
    majors: [
      { prefix: 'ENGL', name: 'English', courses: ['Introduction to Literary Studies', 'British Literature Survey', 'American Literature Survey', 'Critical Theory', 'Advanced Composition', 'Shakespeare', 'Restoration & 18th Century Literature', 'Postcolonial Literature', 'Technical Writing'] },
      { prefix: 'PSYC', name: 'Psychology', courses: ['General Psychology', 'Developmental Psychology', 'Cognitive Psychology', 'Abnormal Psychology', 'Research Methods in Psychology', 'Social Psychology', 'Biopsychology', 'Organizational Psychology', 'Health Psychology'] },
      { prefix: 'SOCY', name: 'Sociology', courses: ['Introduction to Sociology', 'Social Stratification', 'Sociological Theory', 'Race & Ethnicity', 'Qualitative Research Methods', 'Criminology', 'Sociology of the Family', 'Urban Sociology', 'Sex & Gender'] },
      { prefix: 'POLS', name: 'Political Science', courses: ['Civics', 'Comparative Politics', 'International Relations', 'American Government', 'Public Policy Analysis', 'Constitutional Law', 'Political Campaigns', 'Theories of Justice', 'Security Studies'] },
      { prefix: 'HIST', name: 'History', courses: ['World History', 'Research & Historiography', 'US History', 'European History', 'Ancient Civilizations', 'World War I & II', 'Archaeology', 'Anthropology', 'History of Science & Technology'] },
      { prefix: 'PHIL', name: 'Philosophy', courses: ['Introduction to Logic & Reasoning', 'Ethics II', 'Metaphysics', 'Epistemology', 'Ancient Greek Philosophy', 'Existentialism', 'Philosophy of Mind', 'Aesthetics', 'Symbolic Logic'] },
    ],
  },
  {
    name: 'Health Science',
    majors: [
      { prefix: 'BIOL', name: 'Biology', courses: ['Biology I', 'Cell Biology', 'Genetics', 'Ecology', 'Evolution', 'Microbiology', 'Marine Biology', 'Plant Physiology', 'Immunology'] },
      { prefix: 'PHLT', name: 'Public Health', courses: ['Introduction to Public Health', 'Epidemiology', 'Biostatistics', 'Health Policy & Management', 'Environmental Health', 'Global Health', 'Health Promotion', 'Community Health Assessment', 'Maternal & Child Health'] },
      { prefix: 'NURS', name: 'Nursing', courses: ['Introduction to Professional Nursing', 'Anatomy & Physiology', 'Pharmacology', 'Health Assessment', 'Clinical Practicum I', 'Critical Care Nursing', 'Pediatric Nursing', 'Gerontology', 'Clinical Practicum II'] },
      { prefix: 'NUTR', name: 'Nutrition', courses: ['Fundamentals of Nutrition', 'Macronutrients & Metabolism', 'Lifecycle Nutrition', 'Applied Dietetics', 'Food Science', 'Sports Nutrition', 'Public Health Nutrition', 'Advanced Medical Nutrition Therapy', 'Culinary Nutrition'] },
      { prefix: 'PMED', name: 'Pre-Med', courses: ['Foundations of Medical Professions', 'Organic Chemistry', 'Biochemistry', 'Advanced Human Anatomy', 'Advanced Physiology', 'Medical Ethics', 'Healthcare Communications', 'Pathophysiology', 'Clinical Observation'] },
      { prefix: 'DENT', name: 'Dentistry', courses: ['Introduction to Oral Health', 'Oral Anatomy', 'Dental Materials Science', 'Preventative Dentistry', 'Clinical Dental Practicum I', 'Head & Neck Anatomy', 'Dental Radiography', 'Periodontology', 'Clinical Dental Practicum II'] },
    ],
  },
  {
    name: 'Computer Science',
    majors: [
      { prefix: 'COMP', name: 'Computer Science', courses: ['Introduction to Programming', 'Data Structures', 'Algorithms', 'Operating Systems', 'Computer Architecture', 'Compiler Design', 'Game Development', 'Parallel Computing', 'Web Development'] },
      { prefix: 'DATA', name: 'Data Science', courses: ['Fundamentals of Data Science', 'Statistical Modeling', 'Machine Learning', 'Data Visualization', 'Data Mining', 'Big Data Systems', 'Time Series Analysis', 'Natural Language Processing', 'Bayesian Statistics'] },
      { prefix: 'CYBR', name: 'Cybersecurity', courses: ['Introduction to Cybersecurity', 'Network Security', 'Cryptography', 'Ethical Hacking', 'Security Operations', 'Cloud Security', 'Digital Forensics', 'Risk Management', 'Software Security Testing'] },
      { prefix: 'SOFT', name: 'Software Engineering', courses: ['Introduction to Software Development', 'Software Requirements', 'Software Testing & QA', 'Database Systems', 'Object-Oriented Design', 'Agile Methodologies', 'Mobile Application Development', 'UI/UX', 'DevOps'] },
      { prefix: 'ARTF', name: 'Artificial Intelligence', courses: ['Introduction to Artificial Intelligence', 'AI Programming', 'Knowledge Representation', 'Neural Networks', 'Advanced Machine Learning', 'Deep Learning', 'Robotics & Perception', 'Computer Vision', 'AI Ethics & Society'] },
      { prefix: 'INFO', name: 'Information Systems', courses: ['Introduction to Information Systems', 'Systems Analysis & Design', 'Database Management', 'Enterprise Resource Planning', 'IT Infrastructure', 'Business Process Modeling', 'E-commerce Strategy', 'Information Security Management', 'Data Warehousing'] },
    ],
  },
];

function nodeId(prefix: string, num: number): string {
  return `${prefix}${num}`;
}

// Expand the seed data into the flat TechNode[] the engine consumes.
export function initialTech(): TechNode[] {
  const nodes: TechNode[] = [];

  for (const school of SCHOOLS) {
    // General-ed core: six tier-1 nodes, no prereqs, available immediately.
    if (school.core) {
      for (const [code, title] of school.core) {
        nodes.push({
          id: code.replace(/\s/g, ''),
          name: `${code} · ${title}`,
          description: `${school.name} core requirement.`,
          tier: 1,
          prereqs: [],
          status: 'available',
          unlocks: { reputationBonus: TIER_REP[1], capacityBonus: 20 },
        });
      }
    }

    for (const major of school.majors) {
      const t1Id = nodeId(major.prefix, NUMS[0]);
      const t2Ids = [1, 2, 3, 4].map((i) => nodeId(major.prefix, NUMS[i]));

      major.courses.forEach((title, i) => {
        const num = NUMS[i];
        const tier = TIERS[i];
        const id = nodeId(major.prefix, num);

        let prereqs: string[] = [];
        if (tier === 2) prereqs = [t1Id];
        else if (tier === 3) prereqs = [...t2Ids];

        const unlocks: Partial<GameEffects> = {
          reputationBonus: TIER_REP[tier],
          capacityBonus: tier === 1 ? 20 : 10,
        };

        nodes.push({
          id,
          name: `${major.prefix} ${num} · ${title}`,
          description: `${major.name} (${school.name}), tier ${tier}.`,
          tier,
          // tier-1 courses start available; deeper courses unlock via prereqs
          prereqs,
          status: tier === 1 ? 'available' : 'locked',
          unlocks,
        });
      });
    }
  }

  return nodes;
}
