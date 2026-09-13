// =====================================================================
// WHAT A UNIVERSITY ACTUALLY WORKS ON.
//
// Authored content, not a procedural roll. A research initiative is a
// NAMED piece of advanced work run out of a specific facility by specific
// people for years at a time (see researchData.ts's initiative block), and
// the name is most of what makes it feel like a university doing
// something rather than a counter going up.
//
// Two kinds, and the second is the one worth the authoring care:
//
//   SINGLE-FIELD topics — two per field, so every department always has
//   something to offer and the offers do not repeat immediately.
//
//   CROSS-DISCIPLINARY topics — two or three fields, and STAFFABLE ONLY BY
//   DRAWING SOMEBODY FROM EACH. These are the mechanic that makes a large
//   university feel like one thing rather than a pile of departments, and
//   they are why breadth pays off twice: the Landmark depth tier requires
//   one, so the most prestigious outcome in the game is structurally out
//   of reach for a single strong department however well funded.
//
// A first pass of ~70 (decision 9), sized to ship rather than to be
// complete. Offers repeat more often than they eventually will, and
// nothing about the engine changes when more are added — a topic is a row
// in a table.
// =====================================================================

export interface ResearchTopic {
  id: string;
  name: string;
  // The fields the work needs. One for a departmental topic; two or three
  // for a cross-disciplinary one, every one of which must be represented
  // on the team.
  fields: readonly string[];
}

// One entry per field, two topics each. Ordered by the FACULTY_FIELDS
// grouping so a reader can find a department quickly.
const SINGLE_FIELD: ReadonlyArray<readonly [string, string, string]> = [
  // --- Humanities & arts ---
  ['ENG1', 'The Archive and the Novel', 'English'],
  ['ENG2', 'Translation and the Limits of Meaning', 'English'],
  ['HIS1', 'Trade Routes of the Early Modern World', 'History'],
  ['HIS2', 'Memory, Monuments and Public History', 'History'],
  ['PHI1', 'Moral Status and the Non-Human', 'Philosophy'],
  ['PHI2', 'Formal Semantics of Vagueness', 'Philosophy'],
  ['COM1', 'Misinformation and Trust in Networked Media', 'Communication'],
  ['COM2', 'Rhetoric of Crisis Communication', 'Communication'],
  ['ART1', 'Material Degradation in Contemporary Art', 'Art & Design'],
  ['ART2', 'Typography and Legibility at the Margins', 'Art & Design'],
  ['MUS1', 'Tuning Systems Before Equal Temperament', 'Music'],
  ['MUS2', 'Improvisation and Collective Timing', 'Music'],

  // --- Social sciences ---
  ['ECO1', 'Market Design for Scarce Public Goods', 'Economics'],
  ['ECO2', 'Wage Dynamics in Thin Labour Markets', 'Economics'],
  ['POL1', 'Coalition Formation Under Fragmentation', 'Political Science'],
  ['POL2', 'Constitutional Durability', 'Political Science'],
  ['PSY1', 'Memory Reconsolidation After Stress', 'Psychology'],
  ['PSY2', 'Attention in Fragmented Environments', 'Psychology'],
  ['SOC1', 'Neighbourhood Effects on Mobility', 'Sociology'],
  ['SOC2', 'Kinship Networks in Migration', 'Sociology'],

  // --- Natural sciences & mathematics ---
  ['MAT1', 'Rigidity in High-Dimensional Geometry', 'Mathematics'],
  ['MAT2', 'Prime Gaps and Sieve Methods', 'Mathematics'],
  ['PHY1', 'Room-Temperature Superconductivity', 'Physics'],
  ['PHY2', 'Precision Tests of the Weak Interaction', 'Physics'],
  ['CHE1', 'Catalysis Without Rare Earths', 'Chemistry'],
  ['CHE2', 'Self-Assembling Molecular Machines', 'Chemistry'],
  ['BIO1', 'Horizontal Gene Transfer in Soil Communities', 'Biology'],
  ['BIO2', 'Resilience of Pollinator Networks', 'Biology'],

  // --- Health ---
  ['PUB1', 'Transmission Modelling in Dense Cities', 'Public Health'],
  ['PUB2', 'Nutrition Policy and Chronic Disease', 'Public Health'],
  ['CLI1', 'Antimicrobial Stewardship at the Bedside', 'Clinical Health'],
  ['CLI2', 'Deprescribing in Complex Patients', 'Clinical Health'],
  ['NEU1', 'Synaptic Pruning in the Adolescent Brain', 'Neuroscience'],
  ['NEU2', 'Neural Correlates of Decision Reversal', 'Neuroscience'],
  ['KIN1', 'Load Management and Soft-Tissue Injury', 'Kinesiology'],
  ['KIN2', 'Motor Learning After Stroke', 'Kinesiology'],

  // --- Computing ---
  ['CMP1', 'Verified Compilation', 'Computer Science'],
  ['CMP2', 'Consistency in Geo-Distributed Systems', 'Computer Science'],
  ['AIX1', 'Interpretability of Learned Representations', 'Artificial Intelligence'],
  ['AIX2', 'Sample-Efficient Reinforcement Learning', 'Artificial Intelligence'],
  ['INF1', 'Provenance in Federated Data Systems', 'Information Systems'],
  ['INF2', 'Adversarial Resilience of Critical Infrastructure', 'Information Systems'],

  // --- Engineering ---
  ['MEC1', 'Fatigue in Additively Manufactured Parts', 'Mechanical Engineering'],
  ['MEC2', 'Compliant Mechanisms for Soft Robotics', 'Mechanical Engineering'],
  ['ELE1', 'Wide-Bandgap Power Electronics', 'Electrical Engineering'],
  ['ELE2', 'Sub-Threshold Circuits for Implantables', 'Electrical Engineering'],
  ['CIV1', 'Low-Carbon Structural Concrete', 'Civil Engineering'],
  ['CIV2', 'Seismic Retrofit of Historic Masonry', 'Civil Engineering'],
  ['OPS1', 'Resilient Supply Networks Under Shock', 'Operations Research'],
  ['OPS2', 'Stochastic Scheduling at Scale', 'Operations Research'],

  // --- Business ---
  ['ACC1', 'Detecting Earnings Management', 'Accounting & Finance'],
  ['ACC2', 'Liquidity in Fragmented Markets', 'Accounting & Finance'],
  ['MRK1', 'Preference Formation in Choice Overload', 'Marketing'],
  ['MRK2', 'Trust and Recommendation Systems', 'Marketing'],
  ['MGT1', 'Coordination Costs in Distributed Teams', 'Management'],
  ['MGT2', 'Founding Teams and Firm Survival', 'Management'],

  // --- Law ---
  ['LAW1', 'Liability for Autonomous Systems', 'Law'],
  ['LAW2', 'Procedural Fairness in Administrative Courts', 'Law'],
];

// The interdisciplinary set. Each names the fields it genuinely needs, and
// the team must cover every one of them — which is the whole point: these
// are unreachable for a university that built one excellent school.
const CROSS_DISCIPLINARY: ReadonlyArray<readonly [string, string, readonly string[]]> = [
  ['X01', 'Computational Neuroscience of Learning', ['Neuroscience', 'Computer Science']],
  ['X02', 'Climate Economics and Ecosystem Valuation', ['Biology', 'Economics']],
  ['X03', 'Medical Imaging Physics', ['Physics', 'Clinical Health']],
  ['X04', 'Digital Humanities at Scale', ['History', 'Computer Science']],
  ['X05', 'The Ethics of Machine Decision-Making', ['Philosophy', 'Artificial Intelligence']],
  ['X06', 'Urban Mobility and Public Health', ['Civil Engineering', 'Public Health']],
  ['X07', 'Behavioural Foundations of Market Design', ['Psychology', 'Economics']],
  ['X08', 'Materials for Implantable Devices', ['Chemistry', 'Electrical Engineering', 'Clinical Health']],
  ['X09', 'Algorithmic Fairness in Public Policy', ['Artificial Intelligence', 'Political Science']],
  ['X10', 'Acoustics of Performance Spaces', ['Physics', 'Music']],
  ['X11', 'Epidemic Forecasting and Logistics', ['Public Health', 'Operations Research', 'Mathematics']],
  ['X12', 'Narrative, Memory and the Clinical Interview', ['English', 'Psychology']],
  ['X13', 'Provenance and Authentication of Artworks', ['Chemistry', 'Art & Design']],
  ['X14', 'Social Networks and Disease Transmission', ['Sociology', 'Public Health']],
  ['X15', 'Autonomous Systems, Law and Liability', ['Law', 'Artificial Intelligence']],
  ['X16', 'Biomechanics of Human Performance', ['Kinesiology', 'Mechanical Engineering']],
  ['X17', 'Archaeological Dating and Isotope Chemistry', ['Sociology', 'Chemistry', 'History']],
  ['X18', 'Media, Attention and Democratic Participation', ['Communication', 'Political Science']],
];

export const RESEARCH_TOPICS: readonly ResearchTopic[] = [
  ...SINGLE_FIELD.map(([id, name, field]) => ({ id, name, fields: [field] as readonly string[] })),
  ...CROSS_DISCIPLINARY.map(([id, name, fields]) => ({ id, name, fields })),
];

const BY_ID = new Map(RESEARCH_TOPICS.map((t) => [t.id, t]));
export function researchTopic(id: string): ResearchTopic | undefined {
  return BY_ID.get(id);
}

export function isCrossDisciplinary(topic: ResearchTopic): boolean {
  return topic.fields.length > 1;
}
