# Appendix to area 2: the course description audit

Plan 86, area 2. Commit read: `4062bfb`. All 431 course sentences in `src/data/courseDescriptions.ts` (378 undergraduate, 53 graduate) were read again by school, each against what a real course of its title covers, with the October checks: 1 accuracy, 2 level, 3 says nothing the title does not, 4 voice and the house rules (one present-tense sentence, no course code, American spelling). The titles were read from `src/data/techData.ts`. One reader (a model) did all seven schools this time; the October review used four.

Two questions came first: did Plan 76G's rewrites land, and what is left of the catalog-shape items it sent to the backlog?

## What became of the October flags

**Plan 76G landed as written.** The October appendix's finding tables hold 122 rows (some rows cover two courses). On `HEAD`:

| What happened | Rows |
|---|---:|
| The proposed sentence is in the file word for word | 118 |
| Handled as Plan 76G says instead: ENGL140 kept its sentence and took the new title (Rhetoric & Composition); AERO101 took the new title (Introduction to Aerospace Engineering) and the sentence; MGMT140 and COMP130 kept their numbers and were rewritten to read at their level | 4 |
| Left as October found them | 0 |

The seven retitles are in `techData.ts` (Rhetoric & Composition, Introduction to Aerospace Engineering, Intermediate Financial Reporting, Cost Accounting, Intermediate Microeconomics, Statistical Learning, Gerontological Nursing). The three wrong closing phrases are gone: MATH220 now "shows why no formula in radicals solves every quintic", MATH230 "uses the fundamental group to tell a sphere from a torus", and CHEM220 reads crystallography as one method among the spectra. The six doctorates no longer share a dissertation sentence. MUSC120 now names Bach. Every "Analyses" is "Analyzes", and `npm run review:strings` finds no British spelling in the file (its two idiom hits, "queues" in INDE210 and MBAX530, are the operations-research term and stand).

**The house test now guards it** (`test/course-descriptions.test.ts`): the spelling regex, a sentence keeps at least four words of its own beyond the title, and "from X to Y" is held to three per program and twelve per school.

## The catalog's shape: still open

Plan 76's default 5 sent these to `BACKLOG.md` ("The course catalog's shape"), because each moves course ids in every save. None has moved. They are carried as **B2-6** in `2-ui-and-text.md`.

| Item | Where | State on `HEAD` |
|---|---|---|
| No course above 200; no senior seminar or capstone in any major | every major | open |
| The JD has no Professional Responsibility, the one course the ABA requires | LAWS | open |
| The clinic (540) can follow LAW 501 alone, while 570 (which needs all seven) is an elective | LAWS540/570 | open (sentences rewritten only) |
| "Constitutional Law Seminar": a required lecture course titled as a seminar | LAWS530 | open (title kept) |
| Clerkship & Residency Preparation at 550, ahead of Immunology (560) and Genetics (570) | MED550/600 | open: the sentence still prepares students "for internship with the residency application and the Match" halfway through the preclinical courses |
| Core clerkships | MED610 | **partly fixed:** MED610's sentence now rotates students through internal medicine, pediatrics, obstetrics and gynecology and family medicine, so the MD names them; they are one course |
| Auditing (140) before Intermediate Financial Reporting (220) | ACCT140/240 | open |
| Financial Modeling (130) below Real Estate Finance (210) | FINA130/210 | open |
| Strategic Management, a capstone's title, at 140 | MGMT140 | open (sentence reads at its level) |
| A bridge before Financial Accounting, and before Discrete Mathematics | ACCT110, MATH130 | open |
| Missing core courses: statistics (Sociology), research methods (Political Science), the history of anthropological theory, modern philosophy (Descartes to Kant), non-Western history after HIST101 | five SSH majors | open |
| Nursing without medical-surgical, maternity or mental-health nursing | NURS | open (not in the backlog's list; October's "does not read as a BSN") |

## Social Sciences & Humanities

### Summary

- **Read:** 66 courses: 54 undergraduate (six majors of 9) and 12 graduate (the JD's 8 and the humanities PhD's 4).
- **Flagged:** 7 (October: 22). By check (a course can fail more than one): accuracy 0, level 1 (a title), says nothing the title does not 5, voice 2.
- **Mechanical rules:** all 66 pass.

**Judgment.** The school is now the catalog's strongest prose. Every October accuracy flag is fixed (Beowulf is no longer a writer, LAWS510 names the third source of obligation, LAWS570 governs relations among states), and the History surveys each argue something. What is left is the entry tier and one doctoral seminar.

### Findings

| Course id | Title | Check | What is wrong (one line) | Proposed sentence |
|---|---|---|---|---|
| ENGL101 | Introduction to Literary Studies | 3 | "close reading and literary analysis across poetry, fiction, and drama" restates the title. | Reads a sonnet, a short story and a play line by line, and builds an argument about each from the words on the page. |
| SOCY101 | Introduction to Sociology | 3 | "how social structures, institutions, and group behavior shape everyday life" fits any introduction (October's POLS101 echo, now SOCY101's alone). | Shows how class, family, school and work shape choices people believe are their own, with the surveys that measure it. |
| ANTH101 | Introduction to Anthropology | 3 | "the four fields of anthropology and what each asks" names the fields without one of them. | Introduces cultural, biological, linguistic and archaeological anthropology, each through the one case it explains best. |
| PHIL101 | Introduction to Logic & Reasoning | 3 | "Builds skills in argument analysis, deduction, and identifying logical fallacies" is the title in other words. | Puts arguments into standard form, tests their validity, and names the fallacies that make bad ones persuasive. |
| PHIL240 | Symbolic Logic | 4 | "up to the completeness and the limits of the systems" has lost a noun. | Develops propositional and first-order logic with proofs and models, up to the completeness theorem and Gödel's limits on what such systems can prove. |
| LAWS530 | Constitutional Law Seminar | 2 (title) | The sentence now reads as the required course; the title still calls it a seminar. | Sentence stands; retitle it "Constitutional Law". |
| PHDL720 | Doctoral Seminar in Social Theory | 3, 4 | "the classic and current theories of how societies hold together, change, and divide, from Durkheim to the present" is generic and is the program's one remaining span. | Reads Durkheim, Weber, Bourdieu and Habermas against one another on how societies hold together, change and divide. |

### Patterns

- **The sequences** are unchanged (see the shape table above): Sociology without statistics, Political Science without methods, History without the non-Western world after its first course, Philosophy without Descartes to Kant.
- **The 101s** are the school's only weak tier: four of six restate their titles.

## Engineering and Science

### Summary

- **Read:** 116: Engineering 54 and PHDE 4; Science 54 and PHDS 4.
- **Flagged:** 2 (October: 46). Accuracy 0, level 0, says nothing 1, voice 1.
- **Clean on:** all the rules. The CHEN and CIVE inversions now read in order: CHEN110 "starts with energy balances on flowing streams" before CHEN130 closes them on a whole flowsheet, and CIVE110 finds member forces "by statics alone" before CIVE130 brings in stress and strain.

**Judgment.** Both schools are accurate and specific throughout. The prerequisite rewrites are workable stand-ins for the renumbering the backlog holds.

### Findings

| Course id | Title | Check | What is wrong (one line) | Proposed sentence |
|---|---|---|---|---|
| CHEN101 | Principles of Chemical Engineering | 3 | "the chemical process industries and the unit operations, flows, and conversions that run them" is a definition of the field. | Follows a barrel of crude and a vat of corn mash through a plant, and names the unit operation each step takes. |
| PHYS230 | Astrophysics & Cosmology | 4 | "dates the universe by its microwave background" is loose: the age comes from fitting a model to the background, with other data. | Applies gravity, nuclear physics and radiation to stars and galaxies, and reads the universe's age and makeup from its microwave background. |

### Patterns

- **The majors' shape** is as October described it: Mechanical without Mechanics of Materials or heat transfer, Chemical without separations, process control or a design course, a Mathematics major with one Calculus course, Physics without junior mechanics and electromagnetism. These are B2-6's.
- **"From X to Y"** is down to the test's limits in both schools.

## Health Science and Arts & Media

### Summary

- **Read:** 128: Health Science 54 undergraduate, the MD's 12 and PHDH's 4; Arts & Media 54 and the MFA's 4.
- **Flagged:** 9 (October: 23). Accuracy 1, level 2, says nothing 6, voice 1.

**Judgment.** The MD is no longer the weakest program: MED550's clerkship misplacement survives only as a sentence that mentions the Match too early, and MED610 now names the core rotations. Nursing reads better at its edges (NURS101 is specific, NURS230 is now Gerontological Nursing) but is still not a BSN's sequence. Arts & Media stays the cleanest school.

### Findings

| Course id | Title | Check | What is wrong (one line) | Proposed sentence |
|---|---|---|---|---|
| PHLT101 | Introduction to Public Health | 3 | "how populations, policy, and environment shape community health outcomes" fits the field, not a course. | Compares two neighboring counties' death rates and asks how income, housing and policy explain the gap. |
| NUTR101 | Fundamentals of Nutrition | 3 | "macronutrients, micronutrients, and how diet supports human health" is the title expanded. | Reads a food label line by line, from calories and protein to the vitamins whose shortfall still causes disease. |
| NEUR101 | Foundations of Neuroscience | 3 | "from single neurons up to behavior and cognition" is the field's span. | Follows a reflex, a memory and a decision from the neurons that carry them to the behavior they produce. |
| KINE230 | Exercise Testing & Prescription | 4 | "to ACSM guidelines": the only unexplained acronym in the catalog. | ...writes a program's frequency, intensity, time and type to the American College of Sports Medicine's guidelines. |
| MED550 | Clerkship & Residency Preparation | 2 | At 550, ahead of Immunology and Genetics, it prepares students "for internship with the residency application and the Match". Until the backlog's swap, the sentence should stop at the wards. | Readies students for the wards with note-writing, case presentations and handoffs, the skills every clerkship after it assumes. |
| PHRM230 | Clinical Pharmacy Practicum | 1, 2 | Undergraduates "advise prescribers": in the US that is a PharmD student's or a pharmacist's work, so the bachelor's major overreaches. | Shadows pharmacists in a hospital and a community pharmacy, reconciling medication lists and watching counseling done well. |
| MDIA101 | Mass Communication | 3 | "how mass media shapes public opinion, culture, and information flow" restates the title. | Measures what newspapers, broadcasters and platforms each reach, and what the research says they do to opinion. |
| CRWR101 | Introduction to Creative Writing | 3 | "Workshops short fiction and poetry to build a foundational creative practice" is generic. | Writes a poem and a short story a week, read aloud and critiqued, to learn what revision is for. |
| SART101 | Fundamentals of 2D Design | 3 | "line, shape, and composition through studio exercises in two-dimensional art" is the title twice. | Works through line, shape, balance and figure-ground in cut paper and ink, critiqued on the wall each week. |

### Patterns

- **Nursing** lacks medical-surgical (adult health) nursing, the core of every US BSN and of the NCLEX, as well as maternity and mental-health nursing. Its 2xx tier is critical care, pediatrics, gerontology and a practicum.
- **Pharmacy** is written as a professional degree at the bachelor's level. A US pharmacist qualifies through the PharmD, so the undergraduate major reads best as pharmaceutical sciences.

## Business and Computer Science

### Summary

- **Read:** 121: Business 54, the MBA's 5 and PHDB's 4; Computer Science 54 and PHDC's 4.
- **Flagged:** 7 (October: 35). Accuracy 0, level 2 (both backlog renumbering), says nothing 5, voice 0.

**Judgment.** Both schools are accurate and concrete: the October level problems are rewritten so each sentence fits its number (COMP130 now explains what an operating system does for a program; MGMT140 is an intermediate strategy course). Two of the remaining flags are the backlog's renumbering.

### Findings

| Course id | Title | Check | What is wrong (one line) | Proposed sentence |
|---|---|---|---|---|
| FINA101 | Principles of Finance | 3 | "the time value of money, risk, and the core tools of personal and corporate finance" is generic. | Prices a bond, a loan and a retirement plan with the time value of money, and shows why risk raises what investors demand. |
| ACCT101 | Introduction to Accounting | 3 | "the language of business record-keeping" says nothing a student could do. | Records a small firm's first year in journal entries and closes it into a balance sheet and an income statement. |
| MGMT101 | Organizational Leadership | 3 | "leadership styles, team dynamics, and the fundamentals of managing people" is the title expanded. | Studies how teams form, stall and recover, and what a first-time manager can do about each, through cases and team projects. |
| ACCT140 | Auditing Principles | 2 | Auditing ahead of Intermediate Financial Reporting (220) is the backlog's ACCT140/240 swap. | Sentence stands; the swap waits on B2-6. |
| FINA130 | Financial Modeling | 2 | Three-statement and DCF models below Real Estate Finance: the backlog's FINA130/210 swap. | Sentence stands; the swap waits on B2-6. |
| COMP101 | Introduction to Programming | 3 | "programming fundamentals — variables, control flow, and functions — through hands-on projects" fits every first course. | Writes small programs that read, loop and decide, and learns to find its own bugs before a grader does. |
| DATA101 | Fundamentals of Data Science | 3 | "data collection, cleaning, and exploratory analysis techniques" is a list of nouns. | Takes a messy public dataset from download to a first chart, cleaning and questioning it at every step. |

### Patterns

- **The 101 tier is the catalog's blandest.** Across all seven schools, 26 of 42 entry courses open on "Introduces", "Surveys", "Covers" or "Examines", and 16 of them say nothing their titles do not (all flagged above). Plan 76G took the October appendix's two named stock 101s (GRDS101, NURS101) and left the rest; the house test's title check passes them because they keep four words of their own. Fix: the sentences above, and a test that an entry course names at least one concrete thing (a text, a tool, a case or an exercise).
- **Openers repeat.** "Covers" opens 39 sentences, "Examines" 27, "Designs" 23. That is a voice habit, not an error; the next pass on the 101s can vary them.

## Totals

| School | Courses | Flagged on `HEAD` | October |
|---|---:|---:|---:|
| Social Sciences & Humanities | 66 | 7 | 22 |
| Engineering | 58 | 1 | 24 |
| Science | 58 | 1 | 22 |
| Health Science | 70 | 6 | 18 |
| Arts & Media | 58 | 3 | 5 |
| Business | 63 | 5 | 16 |
| Computer Science | 58 | 2 | 19 |
| **Total** | **431** | **25 (6%)** | **126 (29%)** |

Of the 25 (a course can fail more than one check), one is an accuracy flag (PHRM230), five are level (two are backlog renumbering, one a title, one a sentence ahead of its place, one a bachelor's course doing a professional's work), seventeen restate their titles, and four are voice.
