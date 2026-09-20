// ---------------------------------------------------------------------
// WHAT EACH COURSE IS. One authored sentence per undergraduate course,
// keyed by course id, read by techData.ts's initialTech() when it expands
// the seed into Buildables. The course drawer is where a player goes to
// decide what a course IS, and for 336 of the 378 courses the answer used
// to be eight rotating templates with the title swapped in — every
// major's first tier-2 course got the same sentence as every other
// major's first tier-2 course (Plan 20's PR D). This table replaces them,
// filled school by school (PRs E and F) behind the templates as a
// fallback, so no commit in between ships a blank drawer;
// test/course-descriptions.test.ts prints how many courses are still on
// the fallback and holds the count to going down.
//
// TWO RULES, so the table stays a catalogue and does not become 336
// essays:
//
//   - ONE SENTENCE, present tense, no course code, no "this course". The
//     entry courses are the reference register: "Covers the accounting
//     cycle, financial statements, and the language of business
//     record-keeping."
//   - IT MUST SAY SOMETHING THE TITLE DOES NOT. If the sentence is the
//     title with "a study of" in front, the course has not been described
//     — that is the whole failure being fixed, and the one thing to check
//     in review.
//
// Grouped by school, then by major in seed order, then by course number,
// so a reader with one major open in techData.ts's SCHOOLS finds its nine
// sentences together. Graduate courses are NOT here: they keep their
// generated line in techData.ts (a much more uniform register, 37 courses)
// and are the obvious next increment.
// ---------------------------------------------------------------------

export const COURSE_DESCRIPTIONS: Record<string, string> = {
  // ===================================================================
  // Business
  // ===================================================================

  // --- Finance ---
  FINA101: 'Introduces time value of money, risk, and the core tools of personal and corporate finance.',

  // --- Accounting ---
  ACCT101: 'Covers the accounting cycle, financial statements, and the language of business record-keeping.',

  // --- Marketing ---
  MRKT101: 'Surveys the marketing mix — product, price, place, and promotion — through real brand cases.',

  // --- Economics ---
  ECON101: 'Examines how individuals and firms make decisions under scarcity, from supply and demand to market structure.',

  // --- Management ---
  MGMT101: 'Introduces leadership styles, team dynamics, and the fundamentals of managing people.',

  // --- Supply Chain & Operations ---
  SPCO101: 'Traces how goods move from raw material to customer, and where supply chains break down.',

  // ===================================================================
  // Engineering
  // ===================================================================

  // --- Mechanical Engineering ---
  MECH101: 'Introduces the design process, sketching, and basic mechanical systems.',

  // --- Electrical Engineering ---
  ELEC101: 'Covers voltage, current, and resistance through hands-on circuit analysis and lab work.',

  // --- Chemical Engineering ---
  CHEM101: 'Introduces the chemical process industries and the unit operations, flows, and conversions that run them.',

  // --- Civil Engineering ---
  CIVE101: 'Covers forces in equilibrium, free-body diagrams, and load paths, the physical foundation for structural and civil design.',

  // --- Industrial Engineering ---
  INDE101: 'Introduces systems thinking for analyzing and improving industrial processes.',

  // --- Aerospace Engineering ---
  AERO101: 'Covers the forces of flight — lift, drag, thrust, and weight — and how aircraft respond to them.',

  // ===================================================================
  // Arts & Media
  // ===================================================================

  // --- Media Studies ---
  MDIA101: 'Surveys how mass media shapes public opinion, culture, and information flow.',

  // --- Graphic Design ---
  GRDS101: 'Introduces composition, color, and layout as tools for communicating visually.',

  // --- Creative Writing ---
  CRWR101: 'Workshops short fiction and poetry to build a foundational creative practice.',

  // --- Music ---
  MUSC101: 'Covers notation, scales, and harmony, the building blocks of Western music.',

  // --- Film ---
  FILM101: 'Teaches close reading of cinema through shot composition, editing, and narrative structure.',

  // --- Studio Art ---
  SART101: 'Introduces line, shape, and composition through studio exercises in two-dimensional art.',

  // ===================================================================
  // Social Sciences & Humanities
  // ===================================================================

  // --- English ---
  ENGL101: 'Introduces close reading and literary analysis across poetry, fiction, and drama.',

  // --- Sociology ---
  SOCY101: 'Examines how social structures, institutions, and group behavior shape everyday life.',

  // --- Anthropology ---
  ANTH101: 'Introduces the four fields of anthropology and what each asks about being human.',

  // --- Political Science ---
  POLS101: 'Surveys power, institutions, and political behavior, and the questions and methods of the discipline.',

  // --- History ---
  HIST101: 'Surveys major civilizations and turning points from antiquity to the modern era.',

  // --- Philosophy ---
  PHIL101: 'Builds skills in argument analysis, deduction, and identifying logical fallacies.',

  // ===================================================================
  // Science
  // ===================================================================

  // --- Mathematics ---
  MATH101: 'Covers limits, derivatives, and integrals, the mathematical toolkit for science and engineering coursework.',

  // --- Biology ---
  BIOL101: 'Covers cell structure, genetics, and the fundamentals of living systems.',

  // --- Chemistry ---
  CHMY101: 'Builds stoichiometry, periodicity, and reaction theory from first principles.',

  // --- Physics ---
  PHYS101: 'Derives motion, force, energy, and momentum from Newton\'s laws, with lab work throughout.',

  // --- Environmental Science ---
  ENVS101: 'Surveys how physical, chemical, and biological systems interact across a changing planet.',

  // --- Psychology ---
  PSYC101: 'Surveys the major subfields of psychology, from cognition to clinical practice.',

  // ===================================================================
  // Health Science
  // ===================================================================

  // --- Public Health ---
  PHLT101: 'Surveys how populations, policy, and environment shape community health outcomes.',

  // --- Nursing ---
  NURS101: 'Introduces the nursing profession, scope of practice, and foundations of patient care.',

  // --- Nutrition ---
  NUTR101: 'Covers macronutrients, micronutrients, and how diet supports human health.',

  // --- Pharmacy ---
  PHRM101: 'Introduces drug discovery, formulation, and the pharmacist\'s role in patient care.',

  // --- Kinesiology ---
  KINE101: 'Surveys human movement — anatomy, physiology, and mechanics — as one connected system.',

  // --- Neuroscience ---
  NEUR101: 'Introduces the nervous system from single neurons up to behavior and cognition.',

  // ===================================================================
  // Computer Science
  // ===================================================================

  // --- Computer Science ---
  COMP101: 'Teaches programming fundamentals — variables, control flow, and functions — through hands-on projects.',

  // --- Data Science ---
  DATA101: 'Introduces data collection, cleaning, and exploratory analysis techniques.',

  // --- Cybersecurity ---
  CYBR101: 'Surveys threats, defenses, and the core principles of securing systems.',

  // --- Software Engineering ---
  SOFT101: 'Covers the software development lifecycle from requirements to deployment.',

  // --- Artificial Intelligence ---
  ARTF101: 'Surveys the history, goals, and core techniques of artificial intelligence.',

  // --- Information Systems ---
  INFO101: 'Introduces how organizations use information systems to run and improve operations.',
};
