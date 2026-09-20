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
//   SINGLE-FIELD topics — six per field (eight for the two fields that
//   are split across two facilities), so a department always has
//   something to offer and a facility does not show the same project name
//   twice a year.
//
//   CROSS-DISCIPLINARY topics — two or three fields, and STAFFABLE ONLY BY
//   DRAWING SOMEBODY FROM EACH. These are the mechanic that makes a large
//   university feel like one thing rather than a pile of departments, and
//   they are why breadth pays off twice: the Landmark depth tier requires
//   one, so the most prestigious outcome in the game is structurally out
//   of reach for a single strong department however well funded.
//
// SIZE, AND WHY IT DOUBLED. The first pass was ~70 topics (two per field,
// 18 interdisciplinary), sized to ship. Then offers stopped being drawn
// from a whole school's fields and started being drawn from the one
// facility's own (see researchData.ts's initiativeOffers) — which is
// correct, and which cut a typical pool from dozens to two. Six per field
// and ~70 interdisciplinary is the other half of that change rather than
// optional polish: it is what keeps a mature campus from seeing the same
// four project names for a decade. Nothing about the engine changes —
// a topic is a row in a table.
//
// WHERE A TOPIC HAPPENS. A project has to happen somewhere, and only
// eleven of the twenty-nine faculty fields have a research facility of
// their own. The other eighteen lead work in the building their SCHOOL
// built (Plan 20's PR B — techData.ts's hostableFields): a facility hosts
// its own field and every field its school teaches that has no facility
// anywhere, so the Computing Research Center runs the AI department's
// projects and the Humanities Research Institute the English
// department's. Every topic below, of either kind, is therefore offerable
// at at least one facility — pinned by test/research-topics.test.ts,
// because an unreachable topic is authored content no player can ever
// see. (Before that rule, 108 of the departmental topics were "reserve
// content" waiting for a building; the reserve is empty now.)
// =====================================================================

export interface ResearchTopic {
  id: string;
  name: string;
  // The fields the work needs. One for a departmental topic; two or three
  // for a cross-disciplinary one, every one of which must be represented
  // on the team.
  fields: readonly string[];
  // Which facilities may host it, by Buildable id — set ONLY to keep a
  // topic out of a facility that would otherwise host it, and EXHAUSTIVE
  // when it is set. It exists for the two pairs of facilities that share a
  // field: Chemistry has both the Chemistry Labs (pure) and the Chemical
  // Engineering Labs (applied); Physics has both the Physics Labs and the
  // Aerospace Engineering Lab. Without this, "Acoustics of Performance
  // Spaces" is a Physics topic and so is offerable in an aerospace lab,
  // which is the complaint that started this pass. Because the list is
  // exhaustive, a topic that names a second field must list that field's
  // hosts too if it wants them — the aerospace pass below does, so that a
  // flight-test topic is aerospace AND management without being physics.
  // Unset — the common case — means any facility hosting a field the
  // topic names (techData.ts's hostableFields).
  labs?: readonly string[];
}

const PHYSICS_LABS = 'LAB-PHYS';     // the Physics Labs: pure physics
const AEROSPACE_LAB = 'LAB-AERO';    // the Aerospace Engineering Lab: applied, and also fielded as Physics
const CHEMISTRY_LABS = 'LAB-CHMY';   // the Chemistry Labs: pure chemistry
const CHEM_ENG_LABS = 'LAB-CHEM';    // the Chemical Engineering Labs: applied
const HISTORY_INSTITUTE = 'LAB-HIST';
const ECONOMICS_LAB = 'LAB-ECON';    // hosts Business's four unequipped departments too (hostableFields)
const COMPUTING_CENTER = 'LAB-COMP'; // hosts AI, Information Systems and Mathematics too
const MEDIA_STUDIO = 'LAB-FILM';     // hosts Art & Design, English and Music too

// One entry per field, six topics each. Ordered by the FACULTY_FIELDS
// grouping so a reader can find a department quickly. A fourth element,
// where present, is the ResearchTopic.labs restriction above.
const SINGLE_FIELD: ReadonlyArray<readonly [string, string, string, (readonly string[])?]> = [
  // --- Humanities & arts ---
  ['ENG1', 'The Archive and the Novel', 'English'],
  ['ENG2', 'Translation and the Limits of Meaning', 'English'],
  ['ENG3', 'Serialization and the Victorian Reader', 'English'],
  ['ENG4', 'Poetics of the Unreliable Narrator', 'English'],
  ['ENG5', 'Vernacular Literatures of the Atlantic', 'English'],
  ['ENG6', 'Editing and the Authority of the Text', 'English'],
  ['HIS1', 'Trade Routes of the Early Modern World', 'History'],
  ['HIS2', 'Memory, Monuments and Public History', 'History'],
  ['HIS3', 'Household Economies Before Industry', 'History'],
  ['HIS4', 'Borderlands and the Making of Citizenship', 'History'],
  ['HIS5', 'Epidemics and the Municipal Record', 'History'],
  ['HIS6', 'Labour Movements in the Company Town', 'History'],
  ['PHI1', 'Moral Status and the Non-Human', 'Philosophy'],
  ['PHI2', 'Formal Semantics of Vagueness', 'Philosophy'],
  ['PHI3', 'Causation in the Special Sciences', 'Philosophy'],
  ['PHI4', 'Testimony, Trust and Knowledge', 'Philosophy'],
  ['PHI5', 'The Metaphysics of Social Kinds', 'Philosophy'],
  ['PHI6', 'Ethics of Risk and Rare Catastrophe', 'Philosophy'],
  ['COM1', 'Misinformation and Trust in Networked Media', 'Communication'],
  ['COM2', 'Rhetoric of Crisis Communication', 'Communication'],
  ['COM3', 'Documentary Form and the Ethics of Consent', 'Communication'],
  ['COM4', 'Attention Economies of Short-Form Video', 'Communication'],
  ['COM5', 'Sound Design and Perceived Authenticity', 'Communication'],
  ['COM6', 'News Deserts and Civic Knowledge', 'Communication'],
  ['ART1', 'Material Degradation in Contemporary Art', 'Art & Design'],
  ['ART2', 'Typography and Legibility at the Margins', 'Art & Design'],
  ['ART3', 'Colour Constancy Under Gallery Lighting', 'Art & Design'],
  ['ART4', 'Craft Practice and Industrial Reproduction', 'Art & Design'],
  ['ART5', 'Exhibition Design and Visitor Movement', 'Art & Design'],
  ['ART6', 'Ornament, Pattern and Cultural Transmission', 'Art & Design'],
  ['MUS1', 'Tuning Systems Before Equal Temperament', 'Music'],
  ['MUS2', 'Improvisation and Collective Timing', 'Music'],
  ['MUS3', 'Notation and the Limits of the Score', 'Music'],
  ['MUS4', 'Instrument Making and Regional Timbre', 'Music'],
  ['MUS5', 'Rhythm Perception Across Traditions', 'Music'],
  ['MUS6', 'The Concert Hall as Social Institution', 'Music'],

  // --- Social sciences ---
  ['ECO1', 'Market Design for Scarce Public Goods', 'Economics'],
  ['ECO2', 'Wage Dynamics in Thin Labour Markets', 'Economics'],
  ['ECO3', 'Bargaining Under Deadline', 'Economics'],
  ['ECO4', 'Informal Credit and Household Risk', 'Economics'],
  ['ECO5', 'Land Use, Zoning and Rent', 'Economics'],
  ['ECO6', 'Trust Games and Institutional Quality', 'Economics'],
  ['POL1', 'Coalition Formation Under Fragmentation', 'Political Science'],
  ['POL2', 'Constitutional Durability', 'Political Science'],
  ['POL3', 'Local Party Machines and Turnout', 'Political Science'],
  ['POL4', 'Bureaucratic Discretion at the Front Line', 'Political Science'],
  ['POL5', 'Referendums and the Framing of Choice', 'Political Science'],
  ['POL6', 'Legislative Oversight of Emergency Powers', 'Political Science'],
  ['PSY1', 'Memory Reconsolidation After Stress', 'Psychology'],
  ['PSY2', 'Attention in Fragmented Environments', 'Psychology'],
  ['PSY3', 'Habit Formation and Environmental Cues', 'Psychology'],
  ['PSY4', 'Judgement Under Ambiguous Evidence', 'Psychology'],
  ['PSY5', 'Sleep Debt and Emotional Regulation', 'Psychology'],
  ['PSY6', 'Cooperation in Small Groups', 'Psychology'],
  ['SOC1', 'Neighbourhood Effects on Mobility', 'Sociology'],
  ['SOC2', 'Kinship Networks in Migration', 'Sociology'],
  ['SOC3', 'Credentialing and Occupational Closure', 'Sociology'],
  ['SOC4', 'Rural Depopulation and Civic Life', 'Sociology'],
  ['SOC5', 'Housing Tenure and Social Trust', 'Sociology'],
  ['SOC6', 'Informal Care Work Across Generations', 'Sociology'],

  // --- Natural sciences & mathematics ---
  ['MAT1', 'Rigidity in High-Dimensional Geometry', 'Mathematics'],
  ['MAT2', 'Prime Gaps and Sieve Methods', 'Mathematics'],
  ['MAT3', 'Spectral Methods for Sparse Graphs', 'Mathematics'],
  ['MAT4', 'Optimal Transport and Curvature', 'Mathematics'],
  ['MAT5', 'Randomized Algorithms for Linear Systems', 'Mathematics'],
  ['MAT6', 'Dynamics of Coupled Oscillators', 'Mathematics'],
  // Physics is fielded by two facilities — the Physics Labs and the
  // Aerospace Engineering Lab — so each departmental topic says which of
  // them it belongs in, except the two that genuinely belong in both.
  ['PHY1', 'Room-Temperature Superconductivity', 'Physics', [PHYSICS_LABS]],
  ['PHY2', 'Precision Tests of the Weak Interaction', 'Physics', [PHYSICS_LABS]],
  ['PHY3', 'Hypersonic Boundary-Layer Transition', 'Physics', [AEROSPACE_LAB]],
  ['PHY4', 'Plasma Propulsion at Small Scale', 'Physics', [AEROSPACE_LAB]],
  ['PHY5', 'Turbulence at High Reynolds Number', 'Physics'],
  ['PHY6', 'Metamaterials for Acoustic Control', 'Physics'],
  ['PHY7', 'Quantum Noise in Precision Measurement', 'Physics', [PHYSICS_LABS]],
  ['PHY8', 'Re-Entry Heating and Ablative Shields', 'Physics', [AEROSPACE_LAB]],
  // Chemistry, the same: the Chemistry Labs and the Chemical Engineering
  // Labs both field it, and a plant-scale synthesis project does not
  // belong in the former any more than a mechanism study belongs in the
  // latter.
  ['CHE1', 'Catalysis Without Rare Earths', 'Chemistry'],
  ['CHE2', 'Self-Assembling Molecular Machines', 'Chemistry', [CHEMISTRY_LABS]],
  ['CHE3', 'Reaction Mechanisms in Confined Water', 'Chemistry', [CHEMISTRY_LABS]],
  ['CHE4', 'Continuous-Flow Synthesis at Plant Scale', 'Chemistry', [CHEM_ENG_LABS]],
  ['CHE5', 'Separation Membranes for Industrial Solvents', 'Chemistry', [CHEM_ENG_LABS]],
  ['CHE6', 'Photochemistry of Atmospheric Aerosols', 'Chemistry'],
  ['BIO1', 'Horizontal Gene Transfer in Soil Communities', 'Biology'],
  ['BIO2', 'Resilience of Pollinator Networks', 'Biology'],
  ['BIO3', 'Regeneration in Freshwater Invertebrates', 'Biology'],
  ['BIO4', 'Microbiome Assembly in Early Life', 'Biology'],
  ['BIO5', 'Thermal Tolerance and Range Shift', 'Biology'],
  ['BIO6', 'Seed Banks and Drought Recovery', 'Biology'],

  // --- Health ---
  ['PUB1', 'Transmission Modelling in Dense Cities', 'Public Health'],
  ['PUB2', 'Nutrition Policy and Chronic Disease', 'Public Health'],
  ['PUB3', 'Screening Uptake in Underserved Districts', 'Public Health'],
  ['PUB4', 'Heat, Housing and Excess Mortality', 'Public Health'],
  ['PUB5', 'Vaccine Logistics in Rural Networks', 'Public Health'],
  ['PUB6', 'Occupational Exposure in Light Industry', 'Public Health'],
  ['CLI1', 'Antimicrobial Stewardship at the Bedside', 'Clinical Health'],
  ['CLI2', 'Deprescribing in Complex Patients', 'Clinical Health'],
  ['CLI3', 'Handover Protocols and Avoidable Error', 'Clinical Health'],
  ['CLI4', 'Rehabilitation Adherence After Discharge', 'Clinical Health'],
  ['CLI5', 'Point-of-Care Diagnostics in Primary Clinics', 'Clinical Health'],
  ['CLI6', 'Pain Assessment in Non-Verbal Patients', 'Clinical Health'],
  ['NEU1', 'Synaptic Pruning in the Adolescent Brain', 'Neuroscience'],
  ['NEU2', 'Neural Correlates of Decision Reversal', 'Neuroscience'],
  ['NEU3', 'Sleep Spindles and Memory Consolidation', 'Neuroscience'],
  ['NEU4', 'Interneuron Diversity in Cortical Circuits', 'Neuroscience'],
  ['NEU5', 'Neuroimmune Signalling After Injury', 'Neuroscience'],
  ['NEU6', 'Plasticity Limits in the Adult Visual Cortex', 'Neuroscience'],
  ['KIN1', 'Load Management and Soft-Tissue Injury', 'Kinesiology'],
  ['KIN2', 'Motor Learning After Stroke', 'Kinesiology'],
  ['KIN3', 'Gait Asymmetry and Long-Term Joint Health', 'Kinesiology'],
  ['KIN4', 'Heat Acclimation in Endurance Athletes', 'Kinesiology'],
  ['KIN5', 'Return-to-Play Criteria After Concussion', 'Kinesiology'],
  ['KIN6', 'Strength Training in Later Life', 'Kinesiology'],

  // --- Computing ---
  ['CMP1', 'Verified Compilation', 'Computer Science'],
  ['CMP2', 'Consistency in Geo-Distributed Systems', 'Computer Science'],
  ['CMP3', 'Program Synthesis From Examples', 'Computer Science'],
  ['CMP4', 'Memory Safety Without Runtime Cost', 'Computer Science'],
  ['CMP5', 'Scheduling for Heterogeneous Accelerators', 'Computer Science'],
  ['CMP6', 'Formal Models of Concurrent Protocols', 'Computer Science'],
  ['AIX1', 'Interpretability of Learned Representations', 'Artificial Intelligence'],
  ['AIX2', 'Sample-Efficient Reinforcement Learning', 'Artificial Intelligence'],
  ['AIX3', 'Robustness Under Distribution Shift', 'Artificial Intelligence'],
  ['AIX4', 'Retrieval and Grounding in Language Models', 'Artificial Intelligence'],
  ['AIX5', 'Uncertainty Calibration for Decision Support', 'Artificial Intelligence'],
  ['AIX6', 'Curricula for Long-Horizon Agents', 'Artificial Intelligence'],
  ['INF1', 'Provenance in Federated Data Systems', 'Information Systems'],
  ['INF2', 'Adversarial Resilience of Critical Infrastructure', 'Information Systems'],
  ['INF3', 'Access Control in Multi-Tenant Platforms', 'Information Systems'],
  ['INF4', 'Data Quality in Longitudinal Registries', 'Information Systems'],
  ['INF5', 'Migration Risk in Legacy Systems', 'Information Systems'],
  ['INF6', 'Interoperability Standards for Public Records', 'Information Systems'],

  // --- Engineering ---
  ['MEC1', 'Fatigue in Additively Manufactured Parts', 'Mechanical Engineering'],
  ['MEC2', 'Compliant Mechanisms for Soft Robotics', 'Mechanical Engineering'],
  ['MEC3', 'Thermal Management in Dense Assemblies', 'Mechanical Engineering'],
  ['MEC4', 'Vibration Isolation for Precision Instruments', 'Mechanical Engineering'],
  ['MEC5', 'Wear in Lubricated Contacts', 'Mechanical Engineering'],
  ['MEC6', 'Lightweight Structures From Recycled Alloys', 'Mechanical Engineering'],
  ['ELE1', 'Wide-Bandgap Power Electronics', 'Electrical Engineering'],
  ['ELE2', 'Sub-Threshold Circuits for Implantables', 'Electrical Engineering'],
  ['ELE3', 'Grid-Forming Inverters at the Edge', 'Electrical Engineering'],
  ['ELE4', 'Low-Noise Front Ends for Weak Signals', 'Electrical Engineering'],
  ['ELE5', 'Wireless Power Transfer at Distance', 'Electrical Engineering'],
  ['ELE6', 'Fault Detection in Ageing Cable Networks', 'Electrical Engineering'],
  ['CIV1', 'Low-Carbon Structural Concrete', 'Civil Engineering'],
  ['CIV2', 'Seismic Retrofit of Historic Masonry', 'Civil Engineering'],
  ['CIV3', 'Scour and the Long Life of Bridges', 'Civil Engineering'],
  ['CIV4', 'Permeable Pavements and Urban Flooding', 'Civil Engineering'],
  ['CIV5', 'Timber Towers and Fire Performance', 'Civil Engineering'],
  ['CIV6', 'Settlement Prediction in Soft Ground', 'Civil Engineering'],
  ['OPS1', 'Resilient Supply Networks Under Shock', 'Operations Research'],
  ['OPS2', 'Stochastic Scheduling at Scale', 'Operations Research'],
  ['OPS3', 'Fleet Routing With Uncertain Demand', 'Operations Research'],
  ['OPS4', 'Inventory Policy for Perishable Goods', 'Operations Research'],
  ['OPS5', 'Queueing in Emergency Services', 'Operations Research'],
  ['OPS6', 'Network Design Under a Fixed Budget', 'Operations Research'],

  // --- Business ---
  ['ACC1', 'Detecting Earnings Management', 'Accounting & Finance'],
  ['ACC2', 'Liquidity in Fragmented Markets', 'Accounting & Finance'],
  ['ACC3', 'Auditor Independence and Rotation', 'Accounting & Finance'],
  ['ACC4', 'Disclosure Language and Investor Reaction', 'Accounting & Finance'],
  ['ACC5', 'Credit Risk in Small-Firm Lending', 'Accounting & Finance'],
  ['ACC6', 'Municipal Debt and the Cost of Infrastructure', 'Accounting & Finance'],
  ['MRK1', 'Preference Formation in Choice Overload', 'Marketing'],
  ['MRK2', 'Trust and Recommendation Systems', 'Marketing'],
  ['MRK3', 'Pricing Fairness and Perceived Value', 'Marketing'],
  ['MRK4', 'Brand Meaning Across Generations', 'Marketing'],
  ['MRK5', 'Word of Mouth in Sparse Networks', 'Marketing'],
  ['MRK6', 'The Ethics of Persuasive Design', 'Marketing'],
  ['MGT1', 'Coordination Costs in Distributed Teams', 'Management'],
  ['MGT2', 'Founding Teams and Firm Survival', 'Management'],
  ['MGT3', 'Middle Managers and Strategy Execution', 'Management'],
  ['MGT4', 'Succession in Family-Owned Firms', 'Management'],
  ['MGT5', 'Learning Curves in Complex Operations', 'Management'],
  ['MGT6', 'Incentives and Unintended Behaviour', 'Management'],

  // --- Law ---
  ['LAW1', 'Liability for Autonomous Systems', 'Law'],
  ['LAW2', 'Procedural Fairness in Administrative Courts', 'Law'],
  ['LAW3', 'Evidence Standards for Statistical Proof', 'Law'],
  ['LAW4', 'Contract Interpretation in Long Relationships', 'Law'],
  ['LAW5', 'Regulatory Capture in Technical Standards', 'Law'],
  ['LAW6', 'Privacy Doctrine After Ubiquitous Sensing', 'Law'],
];

// The interdisciplinary set. Each names the fields it genuinely needs, and
// the team must cover every one of them — which is the whole point: these
// are unreachable for a university that built one excellent school.
//
// Every entry names at least one field that HAS a facility, because the
// work has to happen somewhere (see the module comment). That constraint
// is also what makes this table the way an unequipped department does
// research at all: a philosopher, a marketer or a violinist joins a
// project hosted by a lab, which is a truer picture of how a university
// works than giving every department a building.
const CROSS_DISCIPLINARY: ReadonlyArray<readonly [string, string, readonly string[], (readonly string[])?]> = [
  ['X01', 'Computational Neuroscience of Learning', ['Neuroscience', 'Computer Science']],
  ['X02', 'Climate Economics and Ecosystem Valuation', ['Biology', 'Economics']],
  ['X03', 'Medical Imaging Physics', ['Physics', 'Clinical Health'], [PHYSICS_LABS]],
  ['X04', 'Digital Humanities at Scale', ['History', 'Computer Science']],
  ['X05', 'The Ethics of Machine Decision-Making', ['Philosophy', 'Computer Science']],
  ['X06', 'Urban Mobility and Public Health', ['Civil Engineering', 'Public Health']],
  ['X07', 'Behavioural Foundations of Market Design', ['Psychology', 'Economics']],
  ['X08', 'Materials for Implantable Devices', ['Chemistry', 'Electrical Engineering', 'Clinical Health']],
  ['X09', 'Algorithmic Fairness in Public Policy', ['Computer Science', 'Political Science']],
  ['X10', 'Acoustics of Performance Spaces', ['Physics', 'Music'], [PHYSICS_LABS]],
  ['X11', 'Epidemic Forecasting and Logistics', ['Biology', 'Public Health', 'Operations Research']],
  ['X12', 'Narrative, Memory and the Clinical Interview', ['English', 'Neuroscience']],
  ['X13', 'Provenance and Authentication of Artworks', ['Chemistry', 'Art & Design'], [CHEMISTRY_LABS]],
  ['X14', 'Social Networks and Disease Transmission', ['Sociology', 'Biology']],
  ['X15', 'Autonomous Systems, Law and Liability', ['Law', 'Computer Science']],
  ['X16', 'Biomechanics of Human Performance', ['Kinesiology', 'Mechanical Engineering']],
  // Chemistry and History, not Sociology as well: Anthropology shares
  // Sociology's department, so a topic that named it drew its archaeologist
  // from "Sociology", which was correct by the taxonomy and read as a
  // mistake (Plan 20's PR C).
  ['X17', 'Archaeological Dating and Isotope Chemistry', ['Chemistry', 'History'], [CHEMISTRY_LABS, HISTORY_INSTITUTE]],
  ['X18', 'Media, Attention and Democratic Participation', ['Communication', 'Political Science']],
  ['X19', 'Structural Health Monitoring of Bridges', ['Civil Engineering', 'Information Systems']],
  ['X20', 'Energy Storage Chemistry for the Grid', ['Chemistry', 'Electrical Engineering']],
  ['X21', 'Wind Loading on Tall Timber Buildings', ['Physics', 'Civil Engineering'], [AEROSPACE_LAB]],
  ['X22', 'Prosthetic Control From Nerve Signals', ['Neuroscience', 'Electrical Engineering']],
  ['X23', 'Forensic Chemistry and Standards of Proof', ['Chemistry', 'Law'], [CHEMISTRY_LABS]],
  ['X24', 'Auditing Algorithms for Financial Disclosure', ['Computer Science', 'Accounting & Finance']],
  ['X25', 'Public Memory and Documentary Practice', ['History', 'Communication']],
  ['X26', 'Noise, Housing and Urban Form', ['Civil Engineering', 'Public Health']],
  ['X27', 'Machine Translation and Literary Style', ['Computer Science', 'English']],
  ['X28', 'Data Journalism and Statistical Literacy', ['Communication', 'Mathematics']],
  ['X29', 'Supply Chains Under Climate Stress', ['Economics', 'Operations Research']],
  ['X30', 'Market Microstructure Simulation', ['Economics', 'Computer Science']],
  ['X31', 'Perception and Interface Legibility', ['Neuroscience', 'Art & Design']],
  ['X32', 'Rehabilitation Robotics', ['Mechanical Engineering', 'Kinesiology']],
  ['X33', 'Wearable Sensing and Athlete Monitoring', ['Electrical Engineering', 'Kinesiology']],
  ['X34', 'Soil Microbiology and Land Policy', ['Biology', 'Political Science']],
  ['X35', 'Conservation Genetics and Land Trusts', ['Biology', 'Law']],
  ['X36', 'The Epidemiology of Antimicrobial Resistance', ['Biology', 'Clinical Health']],
  ['X37', 'Behavioural Nudges in Public Programmes', ['Economics', 'Psychology']],
  ['X38', 'Historical Climate Reconstruction', ['History', 'Biology']],
  ['X39', 'The Ethics of Human-Subject Research', ['Philosophy', 'Neuroscience']],
  ['X40', 'Music Perception and the Auditory Cortex', ['Neuroscience', 'Music']],
  ['X41', 'Archival Digitization at Scale', ['History', 'Information Systems']],
  ['X42', 'Cyber-Resilience of Municipal Utilities', ['Computer Science', 'Information Systems', 'Civil Engineering']],
  ['X43', 'Emissions Accounting for Heavy Industry', ['Chemistry', 'Accounting & Finance'], [CHEM_ENG_LABS]],
  ['X44', 'The Operations of Disaster Response', ['Operations Research', 'Civil Engineering']],
  ['X45', 'The Political Economy of Infrastructure', ['Economics', 'Political Science', 'Civil Engineering']],
  ['X46', 'Consumer Trust in Automated Advice', ['Marketing', 'Computer Science']],
  ['X47', 'Organizational Learning in Engineering Firms', ['Management', 'Mechanical Engineering']],
  ['X48', 'Firm Boundaries and Market Structure', ['Economics', 'Management']],
  ['X49', 'Neuroergonomics of Control Rooms', ['Neuroscience', 'Electrical Engineering', 'Psychology']],
  ['X50', 'Speech Technology and Accent Bias', ['Computer Science', 'Communication']],
  ['X51', 'Water Treatment for Small Systems', ['Chemistry', 'Civil Engineering'], [CHEM_ENG_LABS]],
  ['X52', 'Scientific Collaboration as a Social Form', ['Sociology', 'History']],
  ['X53', 'Privacy Law and Networked Sensors', ['Law', 'Electrical Engineering']],
  ['X54', 'The Mathematics of Structural Optimization', ['Mathematics', 'Mechanical Engineering']],
  ['X55', 'Learning Algorithms and Cortical Models', ['Artificial Intelligence', 'Neuroscience']],
  ['X56', 'Autonomy, Liability and Machine Decisions', ['Artificial Intelligence', 'Law', 'Computer Science']],
  ['X57', 'Pricing, Platforms and Market Power', ['Marketing', 'Economics']],
  // Physics is split across two facilities, so its interdisciplinary work
  // is authored for both halves rather than leaving the aerospace lab with
  // a thin pool it would repeat inside a year.
  ['X58', 'Thermal Control of Small Satellites', ['Physics', 'Mechanical Engineering'], [AEROSPACE_LAB]],
  ['X59', 'Instrumentation for Flight Testing', ['Physics', 'Electrical Engineering'], [AEROSPACE_LAB]],
  ['X60', 'Quantum Sensing for Navigation', ['Physics', 'Electrical Engineering']],
  ['X61', 'Gravitational-Wave Data Analysis', ['Physics', 'Computer Science'], [PHYSICS_LABS]],
  ['X62', 'Cryogenics for Precision Measurement', ['Physics', 'Mechanical Engineering'], [PHYSICS_LABS]],
  // The thin end of the table (Plan 20's PR C). A Landmark Program needs a
  // cross-disciplinary topic, so a facility's interdisciplinary pool is the
  // ceiling on the most prestigious work it can do, and the mechanical,
  // chemical-engineering and aerospace labs and the media studio had the
  // shallowest. Each of these pairs one of those four with a field that
  // itself appeared in only two topics — English, Philosophy, Music, Art &
  // Design, Mathematics, Marketing, Management, AI, Accounting — so both
  // ends of the table deepen at once. The aerospace and chemical-
  // engineering entries list their hosts, because the list is exhaustive
  // once set and these belong in the applied lab and not its pure twin.
  ['X63', 'Additive Manufacture of Musical Instruments', ['Mechanical Engineering', 'Music']],
  ['X64', 'Generative Design and the Machine-Made Form', ['Mechanical Engineering', 'Art & Design']],
  ['X65', 'Safety Factors and the Ethics of Tolerable Risk', ['Mechanical Engineering', 'Philosophy']],
  ['X66', 'Process Optimisation With Learned Surrogates', ['Chemistry', 'Artificial Intelligence'], [CHEM_ENG_LABS, COMPUTING_CENTER]],
  ['X67', 'Costing the Circular Plant', ['Chemistry', 'Accounting & Finance'], [CHEM_ENG_LABS, ECONOMICS_LAB]],
  ['X68', 'Reactor Models With Rigorous Error Bounds', ['Chemistry', 'Mathematics'], [CHEM_ENG_LABS, COMPUTING_CENTER]],
  ['X69', 'Ephemerides and the Numerics of Orbit Prediction', ['Physics', 'Mathematics'], [AEROSPACE_LAB, COMPUTING_CENTER]],
  ['X70', 'Managing the Flight-Test Programme', ['Physics', 'Management'], [AEROSPACE_LAB, ECONOMICS_LAB]],
  ['X71', 'Aerial Cinematography and Camera Platforms', ['Physics', 'Communication'], [AEROSPACE_LAB, MEDIA_STUDIO]],
  ['X72', 'Sonic Branding and Listener Recall', ['Communication', 'Marketing']],
  ['X73', 'Adaptation From Page to Screen', ['English', 'Communication']],
];

export const RESEARCH_TOPICS: readonly ResearchTopic[] = [
  ...SINGLE_FIELD.map(([id, name, field, labs]) => ({
    id, name, fields: [field] as readonly string[], ...(labs ? { labs } : {}),
  })),
  ...CROSS_DISCIPLINARY.map(([id, name, fields, labs]) => ({
    id, name, fields, ...(labs ? { labs } : {}),
  })),
];

const BY_ID = new Map(RESEARCH_TOPICS.map((t) => [t.id, t]));
export function researchTopic(id: string): ResearchTopic | undefined {
  return BY_ID.get(id);
}

export function isCrossDisciplinary(topic: ResearchTopic): boolean {
  return topic.fields.length > 1;
}
