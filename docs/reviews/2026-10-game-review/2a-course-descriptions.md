# Appendix to area 2: the course description audit

Plan 73, area 2. Commit read: `58fa3fd`. All 431 course sentences in `src/data/courseDescriptions.ts` (378 undergraduate, 53 graduate) were read by school, each against what a real course of its title covers. Each was checked for accuracy, level, whether it says something its title does not, the house rules (one sentence, present tense, no course codes) and repetition. Four readers took two or three schools each. Their reports follow unchanged except for heading levels. `2-ui-and-text.md` summarizes them.

## Social Sciences & Humanities

### Summary

- **Read:** 66 courses. That is 54 undergraduate (six majors of 9) and 12 graduate (the JD's 8 and the humanities PhD's 4).
- **Flagged:** 22 courses, 18 undergraduate and 4 graduate.
  - By major: English 3, Sociology 2, Anthropology 1, Political Science 4, History 5, Philosophy 3, JD 3, PhD 1.
- **Flagged by check** (a course can fail more than one):
  - 1 Accuracy: 6
  - 2 Level: 3
  - 3 Says nothing the title does not: 4
  - 4 Voice and rules: 16. This covers six British spellings, one lowercase "constitution", nine repeated constructions and one broken reference. HIST101 fails on two counts.
- **Mechanical rules:** all 66 pass. Every one is a single present-tense sentence, none names a code or says "this course", and none is much longer than its neighbors (all run 80 to 140 characters).

**Judgment.** Most of the catalog is good: specific, dry, and true to the real subjects. Over half the failures are mechanical (spelling, capitalization) or survey courses written from one template, and each takes minutes to fix. The substantive errors are few but real:

- a false claim about where private obligations come from (LAWS510)
- international law described as the law of cross-border disputes (LAWS570)
- Beowulf counted as a writer (ENGL110)
- a historiography course with no historiography in it (HIST110)
- two graduate courses that restate their undergraduate counterparts (LAWS530, PHDL710)

**Is each sequence a plausible major?**

- **English: plausible.** It has a gateway course, both national surveys, theory, Shakespeare, a pre-1800 period course and postcolonial literature. Two of its nine slots go to writing courses, "Advanced Composition" sits in the lower tier (ENGL140), and there is no senior seminar.
- **Sociology: plausible, with one gap.** Theory (SOCY120) and qualitative methods (SOCY140) are there, but there is no statistics or quantitative-methods course, which nearly every US sociology major requires. SOCY210 even "tests them against crime statistics".
- **Anthropology: plausible.** The 1xx tier is the American four fields, with field methods above it. The usual missing piece is a course on the history of anthropological theory.
- **Political Science: plausible subfield coverage.** It has American (130, 210, 220), comparative (110), IR (120, 240), theory (230) and policy (140). It lacks a research-methods or political-analysis course, which most US programs require.
- **History: plausible core, weaker top tier.** The core has the world survey, methods, US, Europe and ancient. But two of the four 2xx courses are anthropology crossovers (HIST220, HIST230). After the 101, nothing covers Asia, Africa, Latin America or the Middle East, which most US history majors require.
- **Philosophy: plausible, with one gap.** It has ethics, metaphysics, epistemology, ancient philosophy and logic at both tiers. It lacks a history of modern philosophy (Descartes to Kant), which nearly every US major requires alongside ancient.
- **JD (8 courses): covers the 1L canon.** That is contracts, torts, civil procedure, property, criminal law, constitutional law, and legal writing in LAW 501. It has three problems:
  - No Professional Responsibility course, the one course the ABA requires of every JD (Standard 303(a)(1)).
  - Constitutional law is a required lecture course at US law schools, not a seminar.
  - The ordering is inverted. The seed lets the clinic (540) follow LAW 501 alone, while the capstone slot (570, which requires all seven) holds an elective. Student-practice rules put clinics after the first year, so swapping 540 and 570 fixes it.
- **PhD (4 courses): plausible.** It runs from methods through two seminars to the dissertation. The literary-theory seminar repeats ENGL130 (flagged).

### Findings

Checks: 1 accuracy, 2 level, 3 says nothing the title does not, 4 voice and rules.

| Course id | Title | Check(s) failed | What is wrong (one line) | Proposed sentence |
|---|---|---|---|---|
| ENGL110 | British Literature Survey | 1, 4 | "major British writers from Beowulf and Chaucer" counts Beowulf, an anonymous poem, as a writer; also the same "Reads … from … through … to …" template as ENGL120. | Reads Beowulf, Chaucer, Milton, the Romantics, and Woolf in order, and how English itself changed as a literary language. |
| ENGL120 | American Literature Survey | 3, 4 | Gives only the span any American survey covers ("from the colonial period through the nineteenth century to modernism and after") and ends on the opaque "in its historical argument"; same template as ENGL110. | Asks what makes a literature American rather than English, through Bradstreet, Douglass, Dickinson, Twain, Faulkner, and Morrison. |
| ENGL140 | Advanced Composition | 2 (title) | "Advanced" on a 1xx course below the 2xx tier, with no composition course before it in the major; the sentence itself reads right for a second-tier writing course. | Sentence can stand; fix the title. Retitle it (e.g. "Rhetoric & Composition"), or swap tiers with Technical Writing so the advanced course is the 2xx. |
| SOCY110 | Social Stratification | 4 | British "Analyses". | Analyzes class, status, and power: how inequality is measured, reproduced across generations, and justified. |
| SOCY240 | Sex & Gender | 4 | British "Analyses". | Analyzes how gender is socially constructed and enforced, in work, family, and the body, and how sexuality intersects with it. |
| ANTH230 | Anthropology of Religion | 1 | "the theories from Durkheim to Geertz that explain them" ends on Geertz, whose interpretive anthropology explicitly set explanation aside for meaning; also one of two "from Durkheim to …" spans (with PHDL720). | Studies myth, ritual, magic, and belief, and whether to explain them, as Durkheim did, or interpret them, as Geertz did. |
| POLS101 | Introduction to Political Science | 3, 4 | Defines the discipline, not the course: "power, institutions, and political behavior" plus "the questions and methods of the discipline", which fits any introduction; the triad echoes SOCY101's "social structures, institutions, and group behavior". | Asks who gets what, when, and how, and introduces the states, parties, and elections that decide it. |
| POLS130 | American Government | 4 | "the constitution" in lowercase; American usage (AP and Chicago alike) capitalizes the US Constitution. | Examines the Constitution, the separation of powers, federalism, and the parties and interest groups that work them. |
| POLS220 | Political Campaigns | 4 | British "strategised". | Studies how campaigns are strategized, funded, and run, from polling and messaging to turnout, using a live election where there is one. |
| POLS240 | Security Studies | 4 | British "Analyses". | Analyzes war, deterrence, terrorism, and cyber conflict, and the intelligence and defense institutions built to meet them. |
| HIST101 | World History | 3, 4 | The house rule's own example: "major civilisations and turning points from antiquity to the modern era" restates the title; British "civilisations"; first of three History surveys built on a "from X to Y" span. | Compares farming, empire, and trade across Afro-Eurasia and the Americas, and how contact bound them into one world. |
| HIST110 | Research & Historiography | 1 | Describes only research method ("finding and reading primary sources, weighing conflicting accounts"); nothing on historiography, the study of how historians' interpretations have changed, which is half the title. | Builds an argument from primary sources, and reads how Marxist, Annales, and cultural historians have told the same past differently. |
| HIST120 | US History | 3, 4 | "the American past from colonization through the Civil War, industrialization, and the twentieth century" is the default arc of any US survey; same "Surveys … from … through" template as HIST101. | Follows the Revolution, the Civil War and Reconstruction, the New Deal, and civil rights as one long argument over who counts as a citizen. |
| HIST130 | European History | 4 | Third History survey on the same template ("Traces Europe from the Renaissance and Reformation through …"); History has a "from X to Y" span in 5 of its 9 sentences. | Asks how the Reformation, the French Revolution, and nationalism built Europe's nation-states, and how their rivalries led to 1914 and 1939. |
| HIST230 | Historical Anthropology | 4 | "kinship, ritual, and exchange" repeats ANTH110's "kinship, ritual, exchange, and belief" almost word for word. | Reads village feuds, witch trials, and carnival as an anthropologist would, working from court and parish records instead of fieldwork. |
| PHIL120 | Metaphysics | 1 | "persist", "be the same thing over time", and "personal identity" are one problem (identity over time) named three ways, so the sentence covers less of the field than it appears to. | Asks what exists — numbers, universals, possible worlds — and what makes something the same thing over time or an action free. |
| PHIL130 | Epistemology | 4 | British "scepticism". | Studies knowledge, justification, and skepticism, and what testimony, perception, and reason can each be trusted to deliver. |
| PHIL220 | Philosophy of Mind | 4 | "whether a machine could have any of them" takes in "the mind-body problem", which is not something a machine could have. | Examines consciousness, intentionality, and the mind-body problem, and whether a machine could be conscious or think about anything. |
| LAWS510 | Contracts & Torts | 1 | "the two ways private obligations arise without a statute" is false: restitution (unjust enrichment) is a third, and 1L Contracts teaches UCC Article 2, a statute; "a careless act" also leaves out intentional torts and strict liability. | Covers when a promise binds and what breaking it costs, and when an act, whether intentional, careless, or merely dangerous, becomes a wrong. |
| LAWS530 | Constitutional Law Seminar | 2, 4 | Near-copy of undergraduate POLS210 ("Reads the leading cases on federal power" vs "Reads the landmark cases on … federal power"), so it reads at undergraduate level; "individual rights, and equal protection" lists a right beside its own category. | Turns the Commerce Clause, due process, and equal protection into tests a brief applies, and argues the cases as counsel did before the Court. |
| LAWS570 | Comparative & International Law | 1 | International law governs relations among states; "disputes crossing national borders" describes conflict of laws, a separate course; the term of art is "custom", and "customs" reads as the border kind. | Compares the common law with civil-law codes, then turns to the treaties, custom, and courts that govern relations among states. |
| PHDL710 | Advanced Seminar in Literary Theory | 2, 4 | Restates ENGL130's undergraduate survey ("schools of criticism", formalism to postcolonial, each tested on texts), so the doctoral seminar reads as a 1xx course. | Reads Derrida, Foucault, and Spivak whole rather than in excerpt, and the affective and ecological turns that have since argued with them. |

### Patterns

- **British spellings: 6 courses, all undergraduate.**
  - The forms are "Analyses" (SOCY110, SOCY240, POLS240), "strategised" (POLS220), "civilisations" (HIST101) and "scepticism" (PHIL130).
  - Cause: `test/course-descriptions.test.ts` checks sentence count, course codes and "this course" but not spelling. `test/event-catalogue.test.ts` does check spelling, and its regex would catch all six.
  - Outside this review, a quick scan shows the verb "Analyses" opening at least 13 descriptions in other schools' files (e.g. FINA210, MECH110, MATH240). The same scan also found "securitised", "signalling" and three "-isation" forms.
- **"From X (through Y) to Z" spans: 15 of 66 sentences.**
  - History uses one in 5 of 9 (HIST101, HIST120, HIST130, HIST210, HIST240).
  - All five survey courses (ENGL110, ENGL120, HIST101, HIST120, HIST130) are built on it, so they read as one template.
  - The rewrites remove it from those five. HIST210 and HIST240 can keep theirs, which leaves History with two.
  - The rest: ANTH120, ANTH210, ANTH230, POLS220, PHIL120, LAWS520, PHDL710, PHDL720.
- **Graduate courses that restate undergraduate ones: 2 flagged.**
  - PHDL710 restates ENGL130, and LAWS530 restates POLS210.
  - Milder cases: PHDL701 lists "close reading", which is ENGL101's first skill, and PHDL720's "from Durkheim to the present" covers SOCY120's span.
  - A graduate sentence should name what the level adds: primary texts read whole, doctrine as working tests, the student's own argument.
- **Lists and phrases reused between courses: 6 pairs or triples.** The unflagged ones are worth varying when those sentences are next touched.
  - "kinship, ritual, (and) exchange": ANTH110, HIST230 (flagged)
  - "…, institutions, and … behavior": SOCY101, POLS101 (flagged)
  - "from Durkheim to …": ANTH230, PHDL720. Durkheim is named in three, with SOCY120.
  - "with the ethics …": SOCY140, ANTH210
  - "made, enforced, and contested" / "socially constructed and enforced" / "made, contested, and adopted": SOCY130, SOCY240, HIST240
  - "how X shape(s) Y": SOCY101, SOCY230, ANTH140
- **"Name the schools, then test them": 6 sentences.** Each is accurate, but together they are a formula across the school. Only PHDL710 is flagged.
  - ENGL130 "puts each to work on a text"
  - POLS120 "applies them to"
  - PHIL110 "tests them on"
  - SOCY210 "tests them against"
  - SOCY120 "asks what each framework explains"
  - PHDL710 "tests each against"
- **Openers: "Reads" starts 13 of 66 sentences (5 of 9 in English), and "Examines" starts 10.** Both verbs fit and are not a failure on their own. Together with the spans, they are why English and History read as templated.
- **Entry courses are the thinnest.**
  - The six 101 sentences run 80 to 101 characters, against 97 to 140 for the rest.
  - HIST101 and POLS101 fail check 3. SOCY101 ("how social structures, institutions, and group behavior shape everyday life") is a borderline definition of the discipline.
  - ENGL101 and ANTH101 show the fix: one concrete item ("close reading", "the four fields").
- **Capitalization of American legal terms.** POLS130's "the constitution" is flagged. POLS210's "how doctrine changes with the court" disagrees with LAWS530's "as the Court heard them". Pick "the Court" for the Supreme Court and use it in both.
- **Sequence-level gaps (a description cannot fix these).** Details are in the Summary.
  - Five of six majors lack a standard core course: statistics (Sociology), research methods (Political Science), anthropological theory (Anthropology), modern philosophy (Philosophy) and non-Western history (History).
  - None of the six has a senior seminar or capstone.
  - The JD lacks Professional Responsibility, and its clinic can follow the first course alone.

## Engineering and Science

### Summary

- **Read:** 116 descriptions. Engineering has 54 undergraduate and 4 doctoral (PHDE); Science has 54 undergraduate and 4 doctoral (PHDS). All 116 match `unischool/src/data/courseDescriptions.ts` word for word.
- **Flagged:** 46 courses (40%) in 44 table rows, because two rows each cover a pair of courses whose numbers should be swapped. By school: Engineering 24 of 58, Science 22 of 58.
- **By check** (a course can fail more than one):

| Check | Courses | Breakdown |
|---|---|---|
| 1 Accuracy | 6 | 3 wrong closing phrases (MATH220, MATH230, CHEM220); 2 where the sentence doesn't match the title (CHEN120, AERO101); 1 vague and misleading (CHEM101) |
| 2 Level / numbering | 5 | 2 prerequisite inversions (CHEN110 and CHEN130; CIVE110 and CIVE130); 1 advanced title numbered 101 (AERO101) |
| 3 Restates the title | 10 | 7 of the 12 entry courses, plus ENVS240 and both dissertation courses |
| 4 Voice and rules | 30 | 16 British or non-American forms; 16 extra uses of "from X to Y"; 3 verbatim repeats; 1 faulty parallelism |

- **Clean on:** none of the 116 uses "this course", names a course code, runs to more than one sentence, or has a main verb outside the present tense. None is much longer than its neighbors: the longest is 23 words, and school averages are 15 to 18. The 101s run *shorter* than their neighbors (see Patterns).

**Engineering.** The engineering itself is sound: both accuracy flags (CHEN120, AERO101) are sentences that don't match their titles, not wrong technical content. The school still has eight British "Analyses", a "from X to Y" habit in three majors, two 101s that restate their titles, and three numbering problems (the CHEN and CIVE prerequisite inversions and AERO101's title).

**Science.** The topic lists are accurate throughout. However, three closing phrases are technically wrong (MATH220, MATH230, CHEM220), CHEM101 is vague and misleading, four of six 101s restate their titles, and Biology uses "from X to Y" in five of nine sentences.

**Doctoral programs.** These read at doctoral level, except the two dissertation courses. Those two are near-copies of each other and say nothing their titles don't.

**Is each nine-course sequence a plausible major?**

| Major | Plausible? | Why |
|---|---|---|
| Mechanical | Partly | Statics and dynamics, thermodynamics, fluids, materials and an intro design course are right. Missing: Mechanics of Materials (FEA at 240 needs it), heat transfer (HVAC at 220 needs it), machine design and a capstone. All four 2xx courses are specialty electives. |
| Electrical | Yes | Circuits first, then digital logic, signals, EM and microelectronics, then power, communications, controls and VLSI. Lab and hardware work appear in 101, 110 and 240. It lacks only a senior capstone. |
| Chemical | No, as numbered | Material & Energy Balances comes after the thermodynamics and transport courses that need it. There is no separations, process control, unit-operations lab or plant-design course, so the major has no lab or design course at all. Three of four 2xx courses are electives. |
| Civil | Partly | Mechanics of Materials is numbered after the two courses that depend on it. Missing: hydraulics and water resources, environmental engineering, and steel or concrete design (Bridge Design at 210 assumes both). Environmental Impact Assessment (EIA, CIVE220) and Urban Planning (CIVE240) are planning courses more than engineering ones. |
| Industrial | Partly | Production, quality, ergonomics, facilities, simulation, lean and reliability are right. Missing: operations research (linear programming, stochastic models), which is the core of a US IE degree and which INDE220's "mathematical programming" assumes. Also missing: engineering economy and a capstone. |
| Aerospace | Partly | Aerodynamics, performance, structures, astrodynamics, a build-and-fly project (220) and a design capstone (230) are right. Missing: a stability-and-control course (only AERO101's misplaced title points at one), air-breathing propulsion (AERO130 covers spacecraft only), and any fluids or thermodynamics before Aerodynamics at 110. |
| Mathematics | Partly | The upper courses (analysis, algebra, topology, numerics) are right. However, a single "Calculus" course with no Calculus II or multivariable calculus is not a US math major, and E&M (PHYS110, ELEC130) and fluids (MECH130) need vector calculus. |
| Biology | Yes | A core of cell biology, genetics, ecology and evolution, with microbiology, marine, plant physiology and immunology electives. Biochemistry sits in Chemistry. |
| Chemistry | Yes | Covers all five foundation areas of the American Chemical Society (ACS) guidelines: analytical, biochemistry, inorganic, organic and physical. Inorganic at 110, ahead of Organic and Physical, is unusual. It is defensible because ACS allows an early foundation-level inorganic course, so it is not flagged. |
| Physics | Partly | The intro sequence, thermal physics and quantum mechanics are right. Missing: the junior-level mechanics (Lagrangian and Hamiltonian) and electromagnetism courses and the advanced lab that US physics majors require. |
| Environmental Science | Yes | Climate, ecosystems, environmental chemistry, GIS, hydrology, atmosphere, conservation and policy, with field and lab work. |
| Psychology | Yes | The standard core (general, developmental, cognitive, abnormal, research methods, social, biological) plus organizational and health psychology. Statistics can come from MATH120. |
| Doctoral (PHDE, PHDS) | Yes, as outlines | Each is a methods course, two advanced courses and a dissertation course. The advanced pairs cover only mechanics and electromagnetics (PHDE) and only physics and chemistry (PHDS). |

### Findings

Check key: 1 Accuracy, 2 Level, 3 Restates title, 4 Voice.

| Course id | Title | Check(s) failed | What is wrong (one line) | Proposed sentence |
|---|---|---|---|---|
| MECH101 | Introduction to Mechanical Design | 3 | "Introduces the design process ... and basic mechanical systems" paraphrases the title; "sketching" is the only new content, in 9 words. | Teaches freehand sketching, CAD, and engineering drawing, and has each team build a prototype that must meet a written specification. |
| MECH110 | Statics & Dynamics | 4 (spelling, repetition) | British "Analyses"; also one of three "from X to Y" in the major ("from trusses and frames to particles and rigid bodies"). | Analyzes forces and moments on trusses, frames, and machines at rest, then on particles and rigid bodies under acceleration. |
| MECH220 | HVAC Systems | 4 (repetition) | Third "from X to Y" in the major, and a list rather than a real range ("from load calculations, psychrometrics, and equipment selection to the energy codes"). "real buildings" adds to the "real" habit. | Sizes heating, cooling, and ventilation equipment from load calculations and psychrometric charts, and checks the building against the energy code. |
| MECH230 | Internal Combustion Engines | 4 (spelling) | British "Analyses". The rewrite also changes "a real engine" to "a running engine". | Analyzes spark- and compression-ignition cycles, combustion, and emissions, and tunes a running engine on a dynamometer. |
| ELEC101 | Circuits | 3 | "voltage, current, and resistance" and "circuit analysis" say no more than "Circuits"; "hands-on circuit analysis and lab work" mentions the lab twice and names no method. | Solves resistive, RC, and RL circuits with Kirchhoff's laws, nodal analysis, and Thévenin equivalents, and checks each answer on a breadboard. |
| ELEC120 | Signals & Systems | 4 (spelling) | British "Analyses". | Analyzes continuous and discrete signals with Fourier, Laplace, and z-transforms, and the linear systems that filter them. |
| ELEC140 | Microelectronics | 4 (spelling, repetition) | British "Analyses"; also one of three "from X to Y" in the major ("from device physics to biasing and small-signal models"). | Analyzes and designs diode and transistor circuits with small-signal models, and biases amplifiers to tolerate temperature drift and part-to-part variation. |
| ELEC220 | Wireless Communications | 4 (repetition) | Second "from X to Y" in the major ("from cellular networks to the link budget of a single radio"). | Covers modulation, coding, fading channels, and multiple access, and works out the link budget that decides whether a call connects. |
| CHEN110, CHEN130 | Chemical Thermodynamics; Material & Energy Balances | 2 | Prerequisite order is inverted. Material and energy balances is the first chemical-engineering course and a prerequisite for thermodynamics (110), transport (120) and reactors (140), yet it is numbered 130. Its own sentence calls it "the bookkeeping every plant design starts with". | No sentence change; renumber Material & Energy Balances to 110 and Chemical Thermodynamics to 130. |
| CHEN120 | Fluid Transport | 1 | Describes transport phenomena, not fluid transport: "heat, and mass transfer" and "heat exchangers and diffusion" belong to heat- and mass-transfer courses. Alternative fix: retitle it Transport Phenomena and keep the sentence. | Calculates friction losses, pump heads, and pressure drops for process piping, with the Reynolds number deciding which correlation applies. |
| CHEN210 | Process Safety | 4 (spelling) | British "Analyses". | Analyzes hazards, relief systems, and layers of protection with HAZOP studies and the case histories of plant disasters, so a design fails safely. |
| CHEN230 | Polymer Science | 4 (spelling) | British "polymerisation" (the house form is "polymerization"), in a sentence that spells "behavior" the American way. | Covers polymerization, molecular weight, and the viscoelastic behavior of plastics, with the processing that shapes them. |
| CIVE110, CIVE130 | Structural Analysis; Mechanics of Materials | 2 | Prerequisite order is inverted: Structural Analysis (110) and Soil Mechanics (120) both need Mechanics of Materials (stress, strain, deflection), but it is numbered after both. | No sentence change; renumber Mechanics of Materials to 110 and Structural Analysis to 130. |
| CIVE240 | Urban Planning | 4 (usage) | "transport" is the British word for the sector; the American word, used in this major's own CIVE140 title, is "transportation". Minor. | Covers zoning, land use, transportation, and housing, and drafts a comprehensive plan that has to survive a public hearing. |
| INDE101 | Introduction to Industrial Systems | 3 | "Introduces systems thinking for analyzing and improving industrial processes" paraphrases the title and names no method or activity (9 words). | Maps a process, times its jobs with a stopwatch, and puts a dollar figure on each proposed improvement. |
| AERO101 | Introduction to Flight Dynamics | 1, 2 | "Flight Dynamics" is the upper-level stability-and-control course (equations of motion, trim, phugoid and Dutch-roll modes), which needs dynamics and aerodynamics first. The sentence ("the forces of flight — lift, drag, thrust, and weight") describes an intro-to-flight survey instead. | Retitle it Introduction to Aerospace Engineering, then: Surveys the standard atmosphere, airfoils, aircraft performance, and orbits, with a first look at stability and propulsion. |
| AERO110 | Aerodynamics | 4 (spelling, repetition) | British "Analyses"; also one of three "from X to Y" in the major ("from potential flow to compressibility"). | Predicts lift and drag on airfoils and wings with potential-flow theory and compressibility corrections, and tests the predictions in a wind tunnel. |
| AERO120 | Aircraft Performance | 4 (spelling) | "take-off" is the British form; the American form (FAA, Merriam-Webster) is "takeoff". Minor. | Computes range, endurance, climb, and takeoff and landing distances from an aircraft's thrust, drag, and weight. |
| AERO140 | Aerospace Structures | 4 (spelling) | British "Analyses". | Analyzes thin-walled beams, stressed skins, and composites under flight loads, with fatigue and the margins certification demands. |
| AERO220 | Rocketry | 4 (repetition) | Second "from X to Y" in the major ("from motor selection and stability to recovery and flight data"). | Designs, builds, and flies a sounding rocket as a team, and answers for its motor choice, stability margin, and recovery. |
| AERO240 | Unmanned Aerial Systems | 4 (grammar) | Faulty parallelism: in "Designs and operates drones ... and the regulations", the class designs and operates the regulations. | Builds and operates drones — airframes, autopilots, and sensors — under the FAA rules on where and how high they may fly. |
| PHDE730 | Dissertation Research in Engineering | 3, 4 (repetition) | Says only what a dissertation is ("original engineering research carried out with an advisor and defended before a committee"), and nearly copies PHDS730 ("Supports the dissertation itself: ... defended before a committee"). | Registers the candidate each term until the experiments are done, the chapters are written, and the committee signs off. |
| MATH101 | Calculus | 3 | "limits, derivatives, and integrals" is the definition of calculus, and "the mathematical toolkit for science and engineering coursework" is filler. | Applies limits, derivatives, and integrals to related rates, optimization, and area, and proves the fundamental theorem that connects differentiation and integration. |
| MATH220 | Abstract Algebra | 1 | "the impossibility of solving the quintic" is wrong as stated. Quintics can be solved, numerically and some by radicals; the theorem (Abel–Ruffini, explained by Galois theory) says there is no general formula in radicals. | Studies groups, rings, and fields through symmetry and permutations, and shows why no formula in radicals solves every quintic. |
| MATH230 | Topology | 1 | "the surfaces and knots they classify" is wrong. Open sets, compactness and connectedness cannot tell knots apart (every knot is a circle as a space), and surfaces are classified by orientability and Euler characteristic, not point-set properties. | Defines open sets, continuity, compactness, and connectedness in the abstract, and uses the fundamental group to tell a sphere from a torus. |
| MATH240 | Numerical Methods | 4 (spelling) | British "Analyses". | Analyzes algorithms for root finding, integration, linear systems, and differential equations, with the error and stability of each. |
| BIOL101 | Principles of Biology | 3 | "the fundamentals of living systems" restates "Principles of Biology"; "cell structure, genetics" is the only content (10 words). | Surveys cells, genes, evolution, and ecosystems, with a weekly lab of microscopes, pipettes, and fruit flies. |
| BIOL110 | Cell Biology | 4 (spelling) | British "signalling" (the house form is "signaling"). | Examines membranes, organelles, signaling, and the cell cycle, and the experimental methods that revealed them. |
| BIOL140 | Evolution | 4 (repetition) | One of five "from X to Y" in Biology ("the evidence from fossils to DNA"). "Develops natural selection" also says the course produces natural selection rather than explains it. | Explains natural selection, genetic drift, speciation, and phylogenetics, and tests them against the fossil record and DNA sequences. |
| BIOL210 | Microbiology | 4 (repetition) | Another Biology "from X to Y" ("from culture and identification to pathogenesis and antibiotics"). | Grows, stains, and identifies bacteria in the lab, and covers archaea, viruses, fungi, pathogenesis, and how antibiotics work and fail. |
| BIOL220 | Marine Biology | 4 (repetition) | Another Biology "from X to Y" ("ocean life from plankton to whales"); "the changing sea" is vague. | Examines plankton, invertebrates, fish, and marine mammals, with coastal sampling in estuaries, salt marshes, and tide pools. |
| BIOL240 | Immunology | 4 (repetition) | Another Biology "from X to Y", and a list rather than a real range ("from antigen recognition to vaccines, allergy, and autoimmune disease"). | Traces innate and adaptive immunity through antigen recognition, antibodies, and T cells, and applies it to vaccines, allergy, and autoimmune disease. |
| CHEM101 | General Chemistry | 1 | "reaction theory" is not a general-chemistry topic. "from first principles" is chemistry's term for ab initio calculation (CHEM240's territory), not how an intro course teaches stoichiometry. | Balances equations, counts moles, and works through atomic structure, bonding, gases, and equilibrium, in a lab where yields rarely match the arithmetic. |
| CHEM220 | Spectroscopy & Structure Determination | 1 | "the crystallography behind them" is wrong: X-ray crystallography is a separate, diffraction-based method, not what lies behind NMR, infrared or mass spectra. | Solves molecular structures from NMR, infrared, and mass spectra, and from X-ray diffraction when a crystal can be grown. |
| PHYS110 | Electricity & Magnetism | 4 (repetition) | Ends with the same words as PHYS101 ("with lab work throughout"); also one of three "from X to Y" in the major ("from Coulomb's law to Maxwell's equations"). | Develops electric and magnetic fields, potentials, circuits, and induction, and ends with Maxwell's equations and the light waves they predict. |
| PHYS230 | Astrophysics & Cosmology | 4 (repetition) | Third "from X to Y" in Physics ("from stellar structure to the cosmic microwave background"). | Applies gravity, nuclear physics, and radiation to stars and galaxies, and dates the universe by its microwave background. |
| ENVS101 | Introduction to Environmental Science | 3 | "how physical, chemical, and biological systems interact" is the definition of environmental science, and "a changing planet" is filler; no topic or activity is named. | Surveys the carbon and water cycles, soils, biodiversity, and pollution, with a semester of sampling a local stream. |
| ENVS140 | Geographic Information Systems | 4 (spelling, repetition) | British "analyses"; also one of three "from X to Y" in the major ("from remote-sensing imagery to maps"). | Builds and analyzes spatial data layers, classifies satellite imagery, and produces a map that answers an environmental question. |
| ENVS240 | Environmental Policy & Restoration | 3, 4 (spelling, repetition) | British "Analyses". "environmental law and regulation" and "plans the restoration" restate the two halves of the title. Also one of three "from X to Y" in the major ("from assessment to monitoring"). | Analyzes the Clean Water Act, the Endangered Species Act, and NEPA, and plans the cleanup and replanting of a degraded site. |
| PSYC101 | General Psychology | 3, 4 (repetition) | "the major subfields of psychology" restates "General Psychology"; also one of three "from X to Y" in the major ("from cognition to clinical practice"). | Surveys perception, memory, learning, development, personality, and mental illness, and the experiments each finding rests on. |
| PSYC130 | Abnormal Psychology | 4 (repetition) | Second "from X to Y" in Psychology ("from anxiety and depression to psychosis"). | Classifies mental disorders by the DSM and weighs the evidence on the causes and treatment of anxiety, depression, and psychosis. |
| PSYC140 | Research Methods in Psychology | 4 (spelling) | British "analyses". | Designs experiments and surveys, analyzes their data, and confronts the replication problems of the field. |
| PSYC210 | Social Psychology | 4 (spelling) | "re-tests" is the British hyphenation (American: "retests"), and the comma before "through" is stray. Minor. | Studies conformity, persuasion, prejudice, and group behavior through the classic experiments and their modern retests. |
| PHDS730 | Dissertation Research in the Natural Sciences | 3, 4 (repetition) | Nearly copies PHDE730 ("Supports the dissertation itself: ... defended before a committee") and says only what a dissertation is. | Ends in a public defense and the graduate school's acceptance of the final copy, after however many years the research takes. |

Every proposed sentence passes the rules in `test/course-descriptions.test.ts`: one capitalized sentence, no course code, no "this course", minimum length, and the title-strip check. None uses British spelling, "from X to Y" or "real". All are 15 to 22 words, except CHEN210, which is a spelling-only fix and keeps its original 23 words.

### Patterns

- **British spelling is systematic: 16 sentences.** 11 use the verb "analyses": 9 open with it (MECH110, MECH230, ELEC120, ELEC140, CHEN210, AERO110, AERO140, MATH240, ENVS240), and ENVS140 and PSYC140 use it mid-sentence. Only one sentence uses the American form ("analyzing", INDE101). "Analyses" is the second most common opening verb in the set, after "Covers". The other 5:
  - "polymerisation" (CHEN230)
  - "signalling" (BIOL110)
  - three minor British usages: "take-off" (AERO120), "re-tests" (PSYC210), "transport" for the sector (CIVE240)

  The test suite has no spelling check. Other schools' rows show the same forms (FINA210 "Analyses ... securitised", ECON230 "signalling"), so one pass over the whole catalog is cheaper than going school by school.
- **"from X to Y" in 27 of 108 undergraduate sentences** (11 Engineering, 16 Science). Biology uses it in 5 of 9 (BIOL120, 140, 210, 220, 240). Mechanical, Electrical, Aerospace, Physics, Environmental Science and Psychology use it in 3 of 9 each; every other major uses it once or not at all. I flagged every use except the most natural one per major; the kept ones are MECH130, ELEC240, AERO230, BIOL120, PHYS120, ENVS230 and PSYC110, leaving 16 flags. Several of the flagged ones are really lists, with no progression between the two ends (MECH220, BIOL210, BIOL240).
- **The entry courses are the weakest tier.** The twelve 101 sentences average 12.3 words, against 17.0 for the other 96. Nine of the twelve are flagged: seven restate their titles (MECH101, ELEC101, INDE101, MATH101, BIOL101, ENVS101, PSYC101), CHEM101 is inaccurate, and AERO101's title is misplaced. Telltale signs:
  - "Introduces" echoing "Introduction to" (MECH101, INDE101)
  - "basic" and "fundamentals" (MECH101, BIOL101)
  - closing phrases that add nothing ("the mathematical toolkit for science and engineering coursework", MATH101; "the physical foundation for structural and civil design", CIVE101)

  Every one of these passes the automated "says something the title does not" check, which removes only the exact title text, so a paraphrased title gets through.
- **The accuracy errors are in the closing phrases, not the topic lists.** MATH220 ("the impossibility of solving the quintic"), MATH230 ("the surfaces and knots they classify") and CHEM220 ("the crystallography behind them") each list the right topics and then end on a clever phrase that is wrong. Every closing phrase deserves a technical read.
- **Verbatim repeats: 3 sentences.** "with lab work throughout" ends both PHYS101 and PHYS110. "Supports the dissertation itself: ... defended before a committee" is shared by PHDE730 and PHDS730. The test's graduate "is not a copy of another" check compares whole strings, so near-copies pass.
- **Numbering and missing prerequisites: 2 inversions, plus prerequisites the catalog never teaches.** The inversions are CHEN130 after CHEN110 and 120, and CIVE130 after CIVE110 and 120. The missing prerequisites:
  - Mechanics of Materials exists only in Civil, but MECH240 (FEA) and AERO140 (Aerospace Structures) depend on it.
  - There is no multivariable calculus anywhere, but ELEC130, PHYS110 and MECH130 (Navier-Stokes) need it.
  - There is no heat transfer course, but MECH220 (HVAC) needs one.
  - There is no operations research course, but INDE220 needs one.
- **Recurring habits, not flagged but worth thinning.** None of these breaks a rule, but each could become the next "from X to Y":
  - "real" appears in six Engineering sentences (MECH220 "real buildings", MECH230 "a real engine", ELEC230 "real plants", CIVE210 "a real span", INDE210 "real life", INDE220 "a real supply chain"); the MECH rewrites above remove two.
  - "Covers" opens 22 of 116 sentences (19%), including 3 of the 10 that restate their titles (ELEC101, MATH101, BIOL101).
  - 15 sentences end on "them", "each" or "it" (e.g. MECH120, ELEC120, CHEN230, PHYS130, PSYC240).
  - "and learns ..." ends both MECH240 and CHEM240.

## Health Science and Arts & Media

### Summary

I read 128 courses. Health Science has 70: 54 undergraduate, the MD's 12 and the PhD's 4. Arts & Media has 58: 54 undergraduate and the MFA's 4. Of these, 23 fail at least one check: 18 in Health Science (12 undergraduate, 6 graduate) and 5 in Arts & Media (4 undergraduate, 1 MFA).

| Check | Flagged | Courses |
|---|---|---|
| 1. Accuracy | 7 | NUTR130, NUTR240, PHRM240, MED520, MED550, MED610, MUSC120 |
| 2. Level and placement | 3 | PHLT120, MED550, PHDH710 |
| 3. Restates the title | 6 | PHLT240, NUTR120, KINE230, PHDH730, SART140, MFAX710 |
| 4. Voice and rules | 14 | British spelling, 5: PHLT230, NURS210, KINE210, NEUR140, MED570. Wrong antecedent, 1: PHLT140. Repeated phrasing, 10: NUTR120, NUTR240, NEUR140, MED520, MED570, PHDH710, CRWR220, FILM220, SART140, MFAX710 |

A course can fail more than one check, so the column sums to more than 23.

No sentence breaks the mechanical rules. None says "this course", names a course code, runs to a second sentence, or leaves the present tense.

The tier column reads "tier ?" in all 128 rows, because tier is a seed-time value the Buildable does not carry. Level is therefore judged from the course number.

How repetition is flagged: a construction or opening verb fails check 4 when it appears in more than a third of one major's sentences (4 or more of 9, or 5 or more of the MD's 12). The table flags enough instances to bring each major down to three or fewer. Where possible it picks sentences that already fail another check.

**Health Science.** The six majors are accurate and specific. The errors sit where clinical detail is hardest to get right:
- The MD's clinical-year courses (MED550, MED610) misdescribe how US schools run clerkships.
- Nutrition's two dietetics courses overlap.
- All five British spellings in the review are in this school.

**Arts & Media.** This is the cleaner school. Its sentences name real materials, methods and genres. Apart from a music-history survey that skips the Baroque, its failures are repetition and restated titles, not errors of fact.

**Is each nine-course sequence a plausible major?**

| Program | Plausible? | Why |
|---|---|---|
| Public Health | Yes | All five CEPH core areas are present: biostatistics (120), epidemiology (110), environmental health (140), policy and management (130), and behavioral science through Health Promotion (220). Only the internship most BSPH programs require is missing, and Community Health Assessment (230) partly stands in for it. |
| Nursing | No, not as a BSN | The two practicums bracket the major correctly. But it has no Fundamentals of Nursing and no Medical-Surgical nursing, which is the largest block of every BSN and of the NCLEX-RN. It also has no maternity, psychiatric or community health nursing, and no pathophysiology. Critical Care (210) is a senior course that builds on the med-surg the major lacks. "Gerontology" names the discipline; the nursing course is "Gerontological Nursing". |
| Nutrition | Yes, with gaps | "Advanced" Medical Nutrition Therapy (230) has no first MNT course to follow. There is no micronutrients course beside Macronutrients & Metabolism, and no food service management, which ACEND requires. As written, Applied Dietetics (130) duplicates Assessment & Counseling (240). |
| Pharmacy | Partly | The pharmaceutical-sciences spine is sound: chemistry, pharmaceutics, pharmacology I and II, and pharmacoepidemiology. But Pharmacotherapeutics (220) and the Clinical Pharmacy Practicum (230) are PharmD content: US pharmacists train in a professional doctorate, not a bachelor's major. There is no biochemistry, and pharmacokinetics is folded into 140. Acceptable as a game abstraction. |
| Kinesiology | Yes | Anatomy, exercise physiology, biomechanics and motor control come first, then applied work. It lacks only the sport psychology and sociocultural courses many programs require. |
| Neuroscience | Yes | It has the standard spine, from neuroanatomy through computation to clinical disorders. It lacks a research methods, statistics or lab course. |
| School of Medicine (MD) | No, as numbered | The clerkship course (550) is numbered among the preclinical subjects, ahead of Immunology (560) and Genetics (570), which US schools teach in year one. Of the core clerkships, only surgery (590), psychiatry (580) and neurology (530) have a course. Internal medicine (the longest), pediatrics, obstetrics and gynecology, and family medicine are named nowhere, while two of the twelve courses (540, 600) are population health. |
| Doctoral Program in Health Science | Yes | It has methods, a seminar, translational research and a dissertation. Its one content seminar is in neuroscience, which is narrow for a school-wide doctorate. |
| Media Studies | Partly | It has five critical-studies courses (101 to 140). Its professional courses, Photojournalism (230) and Public Relations (240), normally build on a news-writing course the major lacks. There is no research methods course. |
| Graphic Design | Yes | Typography comes before layout and publication, and identity before web and motion. It lacks History of Graphic Design and a senior portfolio course. |
| Creative Writing | Yes | Three genre workshops and editing come first, then screen, stage and novel, then a manuscript. Screenwriting (210) repeats the ground of the Film major's Screenwriting Workshop (FILM120). |
| Music | Partly | It has no aural skills (ear training and sight-singing accompany theory in every US music degree) and no ensemble. It has two semesters of theory where degrees usually require four, and one applied course where degrees require one each semester. |
| Film | Yes | Analysis comes first, then the crafts, then documentary, sound and post-production. It has no thesis film. History of World Cinema (220) sits in the capstone tier behind four production courses, though a history survey is usually an early requirement. |
| Studio Art | Weak | The capstone tier (Printmaking, Ceramics, Photography, Digital Art) is four more first courses in new media. So the major never reaches advanced studio, a senior seminar or a thesis show, even though the Art Gallery gates that tier. There is no 3D design foundation and only one art history course. |
| Master of Fine Arts | Acceptable abstraction | US MFAs are discipline-specific, so one MFA spanning studio art, fiction and poetry, and composition is not how they work; composition is usually an MM or DMA. Film has no graduate course. |

### Findings

| Course id | Title | Check(s) failed | What is wrong (one line) | Proposed sentence |
|---|---|---|---|---|
| PHLT120 | Biostatistics | 2 | This is the major's first statistics course, yet it leads with "regression, survival analysis", methods usually reached late or in a second course. It never mentions the descriptive statistics and confidence intervals it would start from, and puts "hypothesis testing" last. | Teaches descriptive statistics, confidence intervals, hypothesis tests, and simple regression on health data, enough to read a clinical trial's results. |
| PHLT140 | Environmental Health | 4 | The antecedent of "them" in "the regulation that protects a population from them" is "air and water quality … and food safety", so the regulation protects people from food safety. | Covers air and water pollution, toxic chemicals, and foodborne illness, and the risk assessment and regulation that limit a population's exposure. |
| PHLT230 | Community Health Assessment | 4 | British "analyses" as a verb; American is "analyzes". | Gathers and analyzes local health data with community partners, and turns it into ranked priorities and an improvement plan. |
| PHLT240 | Maternal & Child Health | 3 | "pregnancy, birth, infant, and child health outcomes" spells out the title, and "the services and policies that improve them" names none of them. | Tracks maternal and infant mortality, preterm birth, and childhood immunization, and the prenatal care, WIC, and Medicaid meant to improve them. |
| NURS210 | Critical Care Nursing | 4 | "post-operative" is the British form; American usage closes it up as "postoperative". | Manages ventilated, unstable, and postoperative patients in intensive care, with hemodynamic monitoring, vasoactive drips, and rapid response. |
| NUTR120 | Lifecycle Nutrition | 3, 4 | "from pregnancy and infancy through childhood, adulthood, and old age" lists the stages the title already names, and "where each stage goes wrong" names nothing. It is also one of four "from … through/to" ranges in the major (NUTR110, 120, 140, 240). | Matches nutrient needs to each life stage and its common shortfall: folate in pregnancy, iron in toddlers, protein in old age. |
| NUTR130 | Applied Dietetics | 1 | "Assesses nutritional status … and counsels clients" is the content, and nearly the title, of NUTR240 (Nutrition Assessment & Counseling). It also leaves the major without the first medical nutrition therapy course that NUTR230's "Advanced" presumes. | Plans menus and therapeutic diets, such as low-sodium, carbohydrate-controlled, and texture-modified, and documents each case in the nutrition care process. |
| NUTR240 | Nutrition Assessment & Counseling | 1, 4 | "the capstone of dietetic practice" overclaims: in US dietetics the capstone is the supervised-practice internship. "from dietary assessment through" is the major's fourth range. | Assesses clients by anthropometric, biochemical, clinical, and dietary data, then counsels them by motivational interviewing in supervised sessions. |
| PHRM240 | Pharmacoepidemiology & Drug Safety | 1 | "the regulation of recalls" is the wrong outcome: recalls are mostly manufacturing-quality actions. Post-approval safety data leads to label changes, boxed warnings, REMS programs and market withdrawal. | Studies drug effects after approval through adverse-event reports and claims data, and the boxed warnings and withdrawals they prompt. |
| KINE210 | Strength & Conditioning | 4 | British "periodisation"; American is "periodization". | Designs resistance and conditioning programs for athletes, with periodization, performance testing, and the coaching of lifting technique. |
| KINE230 | Exercise Testing & Prescription | 3 | "Runs fitness assessments and prescribes exercise" is the title reworded, and "healthy and clinical populations" and "professional guidelines" name nothing. | Screens clients for risk, runs graded exercise tests, and writes a program's frequency, intensity, time, and type to ACSM guidelines. |
| NEUR140 | Neurophysiology | 4 | British "analyses" as a verb. It also packs two "from" phrases into fifteen words, and the second, "from single cells to the EEG", echoes NEUR101's "from single neurons up to"; it is the major's fourth range. | Records and analyzes electrical activity at three scales: the patch-clamped single cell, the circuit, and the scalp EEG. |
| MED520 | Pathophysiology & Pharmacotherapy | 1, 4 | Dosing, interactions and side effects belong to treatment, not "part of the diagnosis". "from its mechanism to the drug" is one of five ranges in the MD's twelve sentences. | Pairs each disease's mechanism with the drugs that interrupt it, so dosing, interactions, and side effects are learned with the illness they treat. |
| MED550 | Clerkship & Residency Preparation | 1, 2 | It describes the clerkship rotations themselves ("Rotates students through the wards … taking call"), which its title calls preparation and which techData.ts assigns to MED610 as "the MD's clerkship year". Its number also puts it ahead of Immunology (560) and Genetics (570), year-one subjects in US schools. Swapping 550 and 600 fixes the order, at the cost of an id migration. | Readies students for the wards with note-writing, case presentations, and handoffs, and for internship with the residency application and the Match. |
| MED570 | Medical Genetics & Genomics | 4 | British "counselling" (American "counseling"), and "each one" has no clear referent. "from family pedigrees to sequencing results" is one of five ranges in the MD. | Reads inheritance and the genome clinically, through family pedigrees, carrier screening, and exome sequencing, and the counseling conversation each result requires. |
| MED610 | Advanced Clinical Practicum | 1 | It describes only the fourth-year sub-internship, though techData.ts gates it on the Medical Center as "the MD's clerkship year". Internal medicine, pediatrics, obstetrics and gynecology, and family medicine are core clerkships at US schools, and none of the twelve courses mentions them. | Rotates students through internal medicine, pediatrics, obstetrics and gynecology, and family medicine, then gives them patients of their own as sub-interns. |
| PHDH710 | Systems & Cognitive Neuroscience Seminar | 2, 4 | It repeats the undergraduate NEUR130 ("perception, memory, language, and decision-making … through imaging") nearly item for item, so only "current work" marks it as doctoral. | Presents and critiques current papers on the circuits behind cognition, weighing what imaging, optogenetics, and population recording can each show about cause. |
| PHDH730 | Dissertation Research in Health Science | 3 | "the dissertation itself: original research in health science" restates the title, and "carried to publication and defended before a committee" is true of every dissertation. | Takes a question of the student's own through a proposal, data collection, and three publishable papers to the final defense. |
| CRWR220 | Playwriting | 4 | It is the fourth of four Creative Writing sentences to open with "Writes" (CRWR120, 130, 210, 220), and "Writes for the stage" is the title in other words. | Develops a one-act play in which everything must be said or done onstage, and hears each draft read aloud by actors. |
| MUSC120 | Music History Survey | 1 | It names the "classical and romantic eras" but neither the Renaissance nor the Baroque, the core of the survey (Josquin, Monteverdi, Bach). | Traces Western art music from chant and Renaissance polyphony through Bach, Beethoven, and Stravinsky, by listening and score study. |
| FILM220 | History of World Cinema | 4 | It has two ranges in one sentence ("from silent film to the present, from Soviet montage to the new waves"), the second ending in the filler "and beyond". It also has the same "from [origin] to the present" shape as SART140 and MUSC120. | Surveys national cinemas since the silent era by their movements: Soviet montage, Italian neorealism, the French New Wave, and Brazil's Cinema Novo. |
| SART140 | Art History Survey | 3, 4 | "Surveys art and architecture from the ancient world to the present" is what the title means, and "how to read a work in its period and context" fits any art history course. It is the major's third range, in the same shape as FILM220 and MUSC120. | Covers painting, sculpture, and architecture period by period, with slide identifications and the formal analysis a studio critique borrows. |
| MFAX710 | Advanced Fiction & Poetry Workshop | 3, 4 | It opens by restating its title in nearly the words of the first-year course: "Workshops new fiction and poetry" against CRWR101's "Workshops short fiction and poetry". | Critiques a new manuscript from each writer every few weeks, alongside craft reading chosen for what that writer's work is attempting. |

### Patterns

- **British spellings: 5, all in Health Science.** They are "analyses" as a verb (PHLT230, NEUR140), "periodisation" (KINE210), "counselling" (MED570) and "post-operative" (NURS210). Arts & Media has none. The same forms recur outside this review, elsewhere in `courseDescriptions.ts`:
  - 21 more uses of "analyses" as a verb (FINA210, MECH110, SOCY110 and COMP120 among them).
  - "securitised" (FINA210), "signalling" (ECON230, BIOL110), "polymerisation" (CHEN230), "strategised" (POLS220) and "virtualisation" (INFO140).
  
  A word list in `test/course-descriptions.test.ts` would catch the whole class.
- **"from X to Y" and "from X through Y" ranges: about one sentence in four in each school** (Health Science 18 of 70, Arts & Media 13 of 58). The densest programs are:
  - the MD: 5 of 12 (MED501, 520, 570, 580, 590)
  - Neuroscience: 4 of 9 (NEUR101, 140, 220, 230)
  - Nutrition: 4 of 9 (NUTR110, 120, 140, 240)
  - Studio Art: 3 of 9 (SART120, 140, 210)
  
  FILM220 uses two in one sentence. The rewrites in Findings bring every program to three or fewer.
- **The three history surveys share one sentence shape.** MUSC120 has "from chant … to the twentieth century", SART140 "from the ancient world to the present", and FILM220 "from silent film to the present". The SART140 and FILM220 rewrites break the pattern.
- **Repeated opening verbs.** No major has more than two of either of these:
  - "Covers" opens 9 of 70 Health Science sentences (PHLT140, PHLT240, NURS110, NUTR101, NUTR120, PHRM110, PHRM130, NEUR120, MED560).
  - "Examines" opens 6 (PHLT130, PHLT210, NUTR140, KINE140, NEUR210, NEUR240).
  
  "Writes" opens 4 of Creative Writing's 9 (CRWR120, 130, 210, 220) and is flagged at CRWR220. Two echoes fall below the threshold: "Cares for" in adjacent courses (NURS220, NURS230), and "Places students … under supervision" (NURS140, PHRM230).
- **Taglines and intensifiers.** Four clinical sentences end on a summarizing appositive, and two of the four overclaim (NUTR240, MED610):
  - "the clinical practice of a dietitian" (NUTR130)
  - "the transition from student to practicing nurse" (NURS240)
  - "the capstone of dietetic practice" (NUTR240)
  - "the last step between the classroom and the residency" (MED610)
  
  "real" and "actually" appear six times as intensifiers (NURS140, PHRM220, MDIA220, GRDS210, FILM240, GRDS140). The dry voice needs none of them, though none is wrong enough to flag on its own. Paired em-dash lists appear four times in Health Science (PHLT220, PHRM140, KINE101, KINE130) and never in Arts & Media.
- **Entry courses are the thinnest sentences.** Every 101 is its major's shortest sentence (KINE101 ties KINE210), at 9 to 13 words against major medians of 15 to 21. Five close on a stock phrase:
  - "foundations of patient care" (NURS101)
  - "how diet supports human health" (NUTR101)
  - "as tools for communicating visually" (GRDS101)
  - "a foundational creative practice" (CRWR101)
  - "the building blocks of Western music" (MUSC101)
  
  They pass the rules and read as introductions, so none is flagged, but they are the obvious next pass. Graduate entry courses go the other way: MED501 (26 words) and MFAX701 (25) are the longest in their programs, and the game appends the gate sentence to both. No other sentence is a length outlier. The largest ratio is NEUR110 (23 words against a median of 15), and it reads cleanly.
- **Cross-level and cross-major echoes.**
  - PHDH710 repeats NEUR130, and MFAX710 opens like CRWR101; both are flagged.
  - NEUR240 and MED530 name the same four conditions (stroke, epilepsy or seizure, Parkinson's or movement disorders, Alzheimer's or dementia). This is acceptable, because MED530 frames them as bedside localization.
  - CRWR210 (Screenwriting) and FILM120 (Screenwriting Workshop) cover the same ground in two majors.
- **Order within a tier is cosmetic.** Each major's four 1x0 courses require only its 101, and the four 2x0 courses require all four 1x0 courses. The MD's middle ten courses require only MED501. So the numbers imply dependencies that nothing enforces:
  - Clinical Practicum I (NURS140) can come before Health Assessment (NURS130) and Pharmacology (NURS120).
  - Pharmacology I (PHRM130) can come before physiology (PHRM110).
  - Layout (GRDS130) can come before Typography (GRDS110).
  - Film Production (FILM130) sits beside Cinematography and Directing rather than before them.
  - The MD's clerkship course (MED550) can be taken before anatomy (MED510).

## Business and Computer Science

### Summary

**Courses read: 121.** Business has 54 undergraduate courses and 9 graduate courses (MBA 5, PhD Economics 4). Computer Science has 54 undergraduate courses and 4 graduate courses (PhD Computing). The TSVs match `unischool/src/data/courseDescriptions.ts` word for word.

**Flagged: 35 courses (Business 16, Computer Science 19), with 42 check failures.**

| Check | Business | Computer Science | Total |
|---|---|---|---|
| 1 Accuracy | 4 | 1 | 5 |
| 2 Level and sequence | 7 | 4 | 11 |
| 3 Says nothing the title does not | 0 | 5 | 5 |
| 4 Voice and rules | 8 | 13 | 21 |

The 21 check-4 failures break down as follows:

- 11 British spellings or usages (Business 6, Computer Science 5)
- 6 frames duplicated from another course
- 2 cases of jargon without a hook
- 1 clause with no verb of its own
- 1 proper name written in lowercase

**Clean on the hard rules.** No sentence says "this course", runs to a second sentence, names a course code, or leaves the present tense. No sentence runs more than 25% past its major's median length (the longest, DATA120, is 23% over), so no course is flagged for length. The length problem runs the other way: see Patterns.

**Business.** Most of the 63 courses are accurate, specific, and in voice. The faults are:

- six British forms
- four accuracy problems, three of them a single phrase
- numbering: Economics and Management put an "Advanced" course or the strategy capstone at 1xx, and Accounting uses two "Advanced" titles at 2xx where it lacks the intermediate course.

**Computer Science.** The 110–240 sentences are the strongest writing in the set. The problems are at the edges:

- The entry sentences are thin, and three of them restate their titles.
- The Computer Science and AI majors put core courses in the wrong place.
- Five sentences copy another course's frame.
- Five use British spellings.

**Per major: is the nine-course sequence plausible?**

| Major | Plausible? | Why |
|---|---|---|
| Finance | Yes, with gaps | There is no accounting course or bridge, though Financial Modeling's "three-statement" models assume Financial Accounting (ACCT110). Financial Modeling (130) runs alongside the Corporate Finance and Investment Analysis courses whose valuation it applies, instead of after them (swap with FINA210). There is no financial markets and institutions course, which is a common requirement, and derivatives appear only as a hedging tool inside FINA230. |
| Accounting | Yes, with gaps | There is no Intermediate Accounting, the two-semester core of a US accounting major; ACCT220 does that job under an "Advanced" title. Auditing (140) comes before the reporting it audits, and Accounting Information Systems (240), which teaches the controls auditors test, comes after it (swap them). |
| Marketing | Yes | The core is coherent: consumer behavior, research, digital, and brand. The only thing missing is the marketing strategy capstone that most US majors end with. |
| Economics | Not as numbered | "Advanced Microeconomics" sits at 130 and nearly duplicates PhD 710. There is no intermediate macroeconomics, which is a standard requirement. Econometrics (120) runs alongside the theory it tests instead of after it (the MATH120 bridge does supply the statistics). Fix: retitle ECON130 Intermediate Microeconomics and swap ECON120 with ECON240. Intermediate macroeconomics would need a 1xx slot, for example Economic History's. |
| Management | Not as numbered | Strategic Management, the usual capstone of a US business degree, sits at 140. There is no Organizational Behavior, a standard requirement, and the entry course is Organizational Leadership instead of Principles of Management. Conflict Resolution (230) and Negotiations (240) overlap on interest-based bargaining. Fix: swap MGMT140 with MGMT230. |
| Supply Chain & Operations | Yes | The most coherent Business major. Operations management comes in through the SPCO220 and SPCO240 bridges to MGMT120. |
| Computer Science | Not as numbered | Operating Systems (130) is upper-division work sitting at 1xx, while Web Development sits at 2xx (swap them). Algorithms runs alongside Data Structures and depends on discrete mathematics, which the major never requires (bridge COMP120 to MATH130). The school has no theory-of-computation or networking course, and ABET's CS criteria list both. Computer Architecture at 140 is fine: its sentence describes the lower-division organization course. |
| Data Science | Yes, with gaps | Statistical Modeling (110) fits generalized linear models with no statistics prerequisite; the MATH120 bridge sits on DATA240 instead. There is no database or SQL course. Machine Learning and Data Mining both teach clustering. |
| Cybersecurity | Yes, with gaps | Network Security (110) and Cloud Security (210) assume a networking course, and no course in the school teaches networking (INFO140 comes closest). Programming comes in only through CYBR130's bridge to COMP110. |
| Software Engineering | Yes, with gaps | The eight courses above 101 make a sound software engineering core. But none of the nine teaches programming, and nothing bridges to COMP101, though Testing, Object-Oriented Design, and Mobile all need it (the SOFT101 rewrite fixes this). There is no team capstone project. |
| Artificial Intelligence | Not as titled | The major has no machine-learning course of its own. Neural Networks gets DATA120 through a bridge, and "Advanced Machine Learning" at 140 has no machine-learning prerequisite at all. Retitling ARTF140 Statistical Learning gives the major its own ML course. |
| Information Systems | Yes, with a gap | The sequence covers systems analysis, databases, ERP, infrastructure, process, security, and warehousing. It has no IS project management course; MGMT210 exists but is not bridged. |
| MBA | Yes | A compressed core: foundations, finance, marketing, operations, and a consulting capstone. There is no strategy course, which is standard in an MBA core, though the capstone may cover it. |
| PhD Economics | Yes, with a gap | There is no macroeconomic theory course. US economics PhDs require it in the first year, alongside microeconomics and econometrics. |
| PhD Computing | Yes | Both taught courses are theory (learning theory and computation). There is no systems course, and US programs commonly have a breadth requirement. |

### Findings

**Check key:**

- 1: accuracy
- 2: level and sequence
- 3: says nothing the title does not
- 4: voice and rules

**About the fixes.** Some faults are in the number or the title, not in the words. For those rows, the proposed sentence fits the corrected course, and the structural fix follows in brackets. Every bridge proposed there obeys the game's bridge rules: none points up the tier climb or into a closure that has a lab gate.

| Course id | Title | Check(s) failed | What is wrong (one line) | Proposed sentence |
|---|---|---|---|---|
| FINA130 | Financial Modeling | 2 | It applies the "discounted cash flow" valuation taught in Corporate Finance (110) and Investment Analysis (120) but runs alongside them, and its "three-statement" models assume Financial Accounting, which the major neither contains nor bridges to. | Builds three-statement, discounted cash flow, and scenario models in spreadsheets, with the sensitivity tests that show where a valuation breaks. [Unchanged; swap numbers with FINA210 and bridge to ACCT110.] |
| FINA210 | Real Estate Finance | 4 | British "Analyses" and "securitised". | Analyzes mortgages, property valuation, and development pro formas, from a single rental to a securitized pool of loans. |
| FINA230 | Risk Management | 1 | "hedges it with derivatives" includes operational risk, which firms handle with controls and insurance; derivatives hedge only the market and credit exposure. | Measures market, credit, and operational risk with value-at-risk and stress tests, and chooses what to hedge with derivatives and what to insure. |
| ACCT140 | Auditing Principles | 2, 4 | It sits alongside Financial Accounting, ahead of the reporting it tests, while Accounting Information Systems (240), which teaches the controls an auditor tests, comes a tier later. "a set of accounts" is British usage; US usage is "financial statements". | Teaches how an auditor gathers evidence, tests internal controls, and decides whether a company's financial statements can be relied on. [Swap numbers with ACCT240.] |
| ACCT220 | Advanced Financial Reporting | 1, 2 | "Advanced" at an intermediate number, in a major with no Intermediate Accounting. "leases, pensions … financial instruments" are Intermediate Accounting topics; only "consolidations" and "foreign currency" belong to Advanced Accounting. | Handles the hard cases in external reporting — revenue recognition, leases, pensions, income taxes — and ends with consolidations. [Retitle: Intermediate Financial Reporting.] |
| ACCT230 | Advanced Cost Accounting | 2 | "Advanced" at an intermediate number, on the major's first cost-accounting course after Managerial Accounting. Activity-based costing, transfer prices, and performance measures are the standard Cost Accounting syllabus. | Designs costing systems for complex operations, from activity-based costing to transfer prices and the performance measures they distort. [Unchanged; retitle: Cost Accounting.] |
| MRKT110 | Consumer Behavior | 1 | In "how habit and context override both", "both" has no clear referent. Read literally, habit and context override psychology, which is the discipline that studies them. | Draws on psychology and economics to explain how people notice, evaluate, and choose products, and how often habit and context make the choice instead. |
| ECON120 | Econometrics | 2 | Numbered 120, it runs alongside principles of macroeconomics and intermediate theory instead of after them. "endogeneity and identification problems" is the vocabulary of PhD 701 ("identification strategies"), not of a 1xx course. | Fits regression lines to economic data and tests whether a correlation, however strong, can be read as a cause. [Or swap numbers with ECON240 and keep the current sentence.] |
| ECON130 | Advanced Microeconomics | 2 | "Advanced" at 1xx, alongside principles of macroeconomics. Its title and its list ("consumer and producer theory, general equilibrium") nearly duplicate PhD 710 "Advanced Microeconomic Theory" ("consumer, producer, and general-equilibrium theory"). | Reworks consumer choice, the firm, and market failure with the calculus the principles course left out, and derives what that course could only assert. [Retitle: Intermediate Microeconomics.] |
| ECON140 | Economic History | 4 | "post-war" is the British form; American usage closes it up as "postwar". | Reads the Industrial Revolution, the Great Depression, and the postwar boom as tests of economic theory rather than as a chronicle. |
| ECON220 | Public Finance | 4 | British "Analyses". | Analyzes taxation, public spending, and debt: who bears a tax, what a public good is worth, and when redistribution costs efficiency. |
| ECON230 | Game Theory | 4 | British "signalling". | Solves strategic interaction with Nash equilibrium, backward induction, and signaling, from auctions to arms races. |
| ECON240 | Environmental Economics | 1 | "as ways of paying for them" misstates the comparison. Taxes, permits, and regulation are weighed as ways to cut pollution at least cost, not as ways to pay for it. | Prices pollution, climate damage, and natural resources, and compares taxes, tradable permits, and regulation by what each costs per ton of emissions cut. |
| MGMT140 | Strategic Management | 2, 4 | The business-school capstone is numbered 140, alongside HR and Operations and ahead of the functions it pulls together. British "Analyses". | Analyzes industries and competitive position, and builds a strategy a firm can sustain once its rivals respond to it. [Swap numbers with MGMT230.] |
| SPCO130 | Quality Management | 4 | "six sigma" is a proper name and should be written "Six Sigma". | Applies statistical process control, Six Sigma, and root-cause analysis to keep defects out of a product before inspection finds them. |
| PHDB730 | Dissertation Research in Economics | 4 | It opens "Supports the dissertation itself:" and ends "defended before a committee", the same frame used by all six doctoral dissertation courses. | Assembles three original papers into a dissertation, and sends the strongest out as the job-market paper a candidate presents at every interview. |
| COMP110 | Data Structures | 4 | British "analyses". | Implements lists, stacks, trees, hash tables, and graphs, and analyzes which one a problem needs and at what cost. |
| COMP120 | Algorithms | 2, 4 | "proofs of correctness and running time" depend on discrete mathematics, which the major never requires (MATH130 exists but is not bridged), and Data Structures runs alongside it instead of before it. British "analyses". | Designs and analyzes algorithms — sorting, graph search, dynamic programming, greedy methods — with proofs of correctness and running time. [Bridge to MATH130 Discrete Mathematics.] |
| COMP130 | Operating Systems | 2 | "Builds the pieces of an operating system" (scheduling, memory management, file systems) is upper-division work, yet it sits at 1xx while Web Development sits at 2xx. | Builds the pieces of an operating system: processes and threads, scheduling, memory management, file systems, and concurrency. [Unchanged; swap numbers with COMP240.] |
| DATA210 | Big Data Systems | 3, 4 | "Processes data at scale with distributed storage and computation frameworks" restates the title, and "and the trade-offs that shape a data pipeline" has no verb of its own. | Splits storage and computation across a cluster, and decides when a batch job, a stream, or one large server is the cheaper way to an answer. |
| DATA240 | Bayesian Statistics | 4 | Jargon with no hook: "priors, likelihoods, and posterior sampling", "hierarchical models", and a gloss ("problems frequentist methods handle badly") that is itself jargon. | Starts from a prior belief, updates it with data by the rules of probability, and lets small groups such as counties borrow strength from one another. |
| CYBR101 | Introduction to Cybersecurity | 3 | "threats, defenses, and the core principles of securing systems" is a definition of the title; it names no specific threat, defense, or principle. | Surveys who attacks computer systems and why, and the plain controls — patching, backups, least privilege — that stop most attacks. |
| CYBR120 | Cryptography | 4 | "why so many real systems get them wrong" repeats INFO130's "why so many implementations overrun", in the same school. | Covers symmetric and public-key ciphers, hashes, signatures, and protocols, and how sound mathematics still fails in careless code. |
| CYBR220 | Digital Forensics | 4 | British "analyses". | Acquires and analyzes evidence from disks, memory, and networks in a way that holds up in court. |
| SOFT101 | Introduction to Software Development | 2, 3 | "the software development lifecycle" restates the title. It is also the major's only entry course and contains no programming, though Testing (120), Object-Oriented Design (140), and Mobile (220) all need it and nothing bridges to COMP101. | Writes small programs in a team, with version control, code review, and tests, and ships one against a written requirement. |
| ARTF101 | Introduction to Artificial Intelligence | 3 | "the history, goals, and core techniques" would fit any field's introduction and names no technique. | Surveys search, logic, probabilistic reasoning, and learning from data, and the two funding winters that followed when the field overpromised. |
| ARTF140 | Advanced Machine Learning | 2, 4 | "Advanced" at 1xx, in a major with no machine-learning course and no bridge to DATA120 (Neural Networks at 130 has one). "kernel methods, ensembles, probabilistic graphical models, and the theory of generalization" is graduate-level jargon with no hook. | Fits and compares the workhorse methods of machine learning — decision trees, random forests, boosting — and judges each on data it has not seen. [Retitle: Statistical Learning.] |
| ARTF210 | Deep Learning | 4 | "with the engineering that makes large models work" repeats ARTF130's "with the optimization and regularization that make them learn", in the same major and on the same subject. | Trains convolutional, recurrent, and transformer networks at scale, where the hard part is feeding the GPUs and keeping a week-long run alive. |
| ARTF230 | Computer Vision | 4 | It uses the same frame as DATA230: "Builds systems that detect, segment, and recognize …, from filters and features to deep models" against "Builds systems that parse, classify, and generate text, from n-grams to transformer language models". | Finds, outlines, and names objects in images and video, first with hand-built features and then with the deep networks that replaced them. |
| INFO101 | Introduction to Information Systems | 3 | "how organizations use information systems to run and improve operations" restates the title. | Walks one order through the systems a firm runs on — web store, database, warehouse software, general ledger — and asks who owns each. |
| INFO120 | Database Management | 1 | "the move from relational to other stores" describes a migration that has not happened. Relational databases are still the default, and other kinds of store are used alongside them. | Administers databases in production — schema changes, query tuning, backup, security — and weighs when a non-relational store earns its place. |
| INFO140 | IT Infrastructure | 4 | British "virtualisation". | Covers servers, networks, virtualization, and cloud services, and how an organization provisions, secures, and pays for them. |
| INFO210 | Business Process Modeling | 4 | "and measures the improvement actually delivered" copies the shape of COMP230's "and measures the speedup actually obtained". | Maps and redesigns workflows with process notation and simulation, and counts the handoffs and waiting time a redesign removes. |
| INFO220 | E-commerce Strategy | 4 | British "Analyses". | Analyzes online business models, platforms, payments, and logistics, and what makes a digital marketplace defensible. |
| PHDC730 | Dissertation Research in Computing | 4 | It uses the same "Supports the dissertation itself: … defended before a committee" frame as PHDB730 and four other doctoral programs. | Turns a series of peer-reviewed conference papers into a dissertation, with the experiments rerun until a committee is satisfied. |

Every proposed sentence was checked against the repository's own rules from `test/course-descriptions.test.ts`:

- one capitalized sentence
- no course code
- no "this course"
- it still has substance once the title and any stock lead-in are removed

Each one also uses American spelling and stays within 25% of its major's median length.

### Patterns

- **British forms: 11 courses, all in the table.**
  - "analyses" used as a verb, 7 times. It is the first word in FINA210, ECON220, MGMT140, and INFO220, and appears mid-sentence in COMP110, COMP120, and CYBR220.
  - "securitised" (FINA210), "virtualisation" (INFO140), and "signalling" (ECON230).
  - "post-war" (ECON140) and the idiom "a set of accounts" (ACCT140).

  These are slips, not a house style: the same files write "Formalizes", "standardize", "prioritize", "optimization", and "behavior". Every "analyses" in these rows is a verb, so replacing the whole word with "analyzes" is safe within these rows.
- **The entry courses were written thinner, apparently at an earlier stage.**
  - In every one of the 12 majors, the 101 is the shortest sentence. The 101s average 87 characters; the other undergraduate courses average 125.
  - Ten of the twelve open with a stock lead-in that the repository's own test strips as filler: "Introduces" 4 times, "Surveys" 3, "Covers" 2, and "Examines" 1. Only 13 of the other 109 courses do.
  - They lean on placeholders: "core principles" (CYBR101), "core techniques" (ARTF101), "the fundamentals of managing people" (MGMT101), "hands-on projects" (COMP101), and "analysis techniques" (DATA101).

  Three restate their titles and are flagged (CYBR101, ARTF101, INFO101), and SOFT101 is flagged on sequence. The other eight pass, but they read as if a different writer produced them.
- **"from X to Y" is not over-used here.** It appears in 15 of 121 sentences: FINA210, ACCT230, ECON101, ECON230, MGMT240, SPCO101, MBAX520, PHDB710, COMP210, DATA230, SOFT101, SOFT230, ARTF130, ARTF230, and INFO120. No major has more than two (Economics, Software Engineering, and AI have two each), and Marketing and Cybersecurity have none. So no course is flagged for it alone. The rewrites remove three (SOFT101, ARTF230, INFO120) and add none.
- **Duplicated frames: six flagged.** In each pair below, one sentence is rewritten.
  - DATA230 and ARTF230 share "Builds systems that [three verbs] …, from [older method] to [deep models]".
  - ARTF130 and ARTF210, in the same major and on the same subject, share "with the [optimization and regularization / engineering] that make[s] [them learn / large models work]".
  - COMP230 and INFO210 have the identical shape "[verb]s A, B, and C with D and E, and measures the [speedup / improvement] actually [obtained / delivered]".
  - CYBR120 and INFO130 share "why so many [real systems get them wrong / implementations overrun]".
  - PHDB730 and PHDC730 share "Supports the dissertation itself: … defended before a committee". All six doctoral dissertation courses in the game use this frame; PHDE730, PHDH730, PHDS730, and PHDL730 are outside this review. It is the rotating-template problem that Plan 20 removed from the undergraduate catalog, still alive at the doctoral level.
- **The skeptical ending is the house signature, and it is close to becoming a tic.** 19 of the 121 sentences end on what fails, what gets left out, or whether something is real. Examples:
  - "where a valuation breaks" (FINA130)
  - "and where it fails" (ACCT240)
  - "where supply chains break down" (SPCO101)
  - "what agile fixes and what it hides" (SOFT210)
  - "what the coefficients do and do not claim" (DATA110)
  - "the guarantees a database makes or does not" (SOFT130)

  Here the voice is doing its job, so none is flagged for this alone. But both exact-wording repeats above ("why so many", "actually") grew out of this ending, so it is worth using more sparingly.
- **"Advanced" in undergraduate titles.** There are four here: ECON130 and ARTF140 at 1xx, and ACCT220 and ACCT230 at 2xx. Two more exist elsewhere in the game (NUTR230 and ENGL140, outside this review). The numbering stops at 2xx, which the house treats as intermediate, so no undergraduate title in this game can honestly say "Advanced". ECON130's title also nearly duplicates PhD 710's "Advanced Microeconomic Theory".
- **Jargon.** Flagged only where no plain hook exists (DATA240, ARTF140). The unexpanded acronyms SOLID (SOFT140), ARIMA (DATA220), and ETL (INFO240) pass, because each of those sentences also gives a plain payoff: "survive being changed", "forecasts with honest uncertainty", and "keeps the numbers consistent".
- **Opening verbs repeat within majors.** These are single words and are not flagged.
  - "Builds" opens three sentences in Computer Science (COMP130, COMP220, COMP240).
  - "Designs" opens three in Software Engineering (SOFT120, SOFT130, SOFT230).
  - "Runs" opens both CYBR130 and CYBR140, which sit next to each other.
  - "Plans" and "Applies" each open two sentences in Supply Chain.

  Across both schools, "Builds" and "Covers" each open 11 sentences.
- **Content overlaps.** These reflect real curricula and are not flagged.
  - Within one major: MGMT230 and MGMT240 both teach interest-based bargaining, and DATA120 and DATA140 both teach clustering.
  - Across majors: SOFT130 and INFO120 both cover databases, and CYBR230 and INFO230 both cover security risk and compliance.
- **Copyedits outside the four checks.** Not in the table.
  - FINA101: "Introduces time value of money" needs "the time value of money".
  - MRKT140: "the valuation of what the name is worth" says "worth" twice; "what the name alone is worth" fixes it.
  - ARTF120: in "reasons over them with inference engines and their limits", "and their limits" attaches to nothing. Suggested: "…with inference engines, and finds where those give out".
  - CYBR210: "a misconfiguration is the usual breach" should say the usual cause of one.
