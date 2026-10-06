# The course catalog's shape: the table

*Plan 95, PR L ([the plan](../../plans/95-second-review-worked-through.md)).
Finding B2-6, from [`2a`](../2026-10-game-review-ii/2a-course-descriptions.md)'s
"The catalog's shape: still open". Read on `main` after Plan 95A.*

This is the whole change, written so that PR M can implement it without
asking anything. It changes no code. M follows it.

**The owner's answer, recorded:** a fourth tier. Every undergraduate major
gains a 300-level capstone that requires all of tier 3. A major is ten
courses. Balance moves, and M re-baselines.

Four principles run through the table:

- **Counts hold.** Each program keeps its course count, apart from the new
  capstone. Every added core course is a swap for an elective, which goes.
- **Ids are slots.** A course id is a major's prefix and a number
  (`techData.ts`'s `NUMS`). When a course moves, its *content* moves to
  another id. A course that goes frees its id, and a new course may take it.
- **Durations stay with the id.** `courseWeeks` hashes the id
  (`techData.ts:42`), and cost and upkeep come from the slot's tier. A swap
  therefore changes no course's weeks or price in a new run. Only the
  capstones and the two new bridges change a new run's catalogue.
- **State follows the course.** In a save, what the player built
  (status, weeks left, teacher, career lines) moves with the content to its
  new id (section 5 has the rules).

---

## 1. The structure: a fourth tier

### The capstone tier

| | Tier 1 | Tier 2 | Tier 3 | **Tier 4 (new)** | Professional | Doctoral |
|---|---:|---:|---:|---:|---:|---:|
| Numbers | 101 | 110–140 | 210–240 | **310** | 5xx | 7xx |
| Courses a major | 1 | 4 | 4 | **1** | — | — |
| Weeks (`TIER_DURATION_WEEKS`) | 4 | 12 | 24 | **28** | 40 | 32 |
| Cost (`TIER_COURSE_COST`) | $300k | $900k | $2.2M | **$3.0M** | $9M | $6M |
| Upkeep a week (`COURSE_UPKEEP_PER_WEEK`) | $300 | $800 | $1,800 | **$2,400** | $12,000 | $7,000 |
| Tier penalty (`courseQuality.ts`'s `TIER_PENALTY`) | 0 | 2 | 5 | **6** | — | 8 |
| Prereqs | none (the housed gate) | the 101 | the four tier-2 courses, the lab, the arts gate | **the four tier-3 courses** | — | — |

- **The number is 310.** It opens the 300 band the way 110 opens tier 2
  and 210 opens tier 3. A lone 340 would suggest that 310–330 exist. The
  id sorts after the 240s and before the graduate 5xx. `curriculum-graph
  .test.ts`'s `tierOf` reads the band off the number (>= 300).
- **28 weeks.** Longer than a tier-3 course (24), because a capstone is a
  year's project. Shorter than a doctoral course (32), so the graduate
  rung stays above it. `courseWeeks` spreads it 21–35 weeks by id, as it
  does every course.
- **$3.0M and $2,400 a week.** A third above tier 3, and half a doctoral
  course. The catalogue's growth (`CATALOGUE_PRICE_GROWTH`) applies to it
  like any undergraduate course: it is in `baseCourseCost`, and it raises
  the price of every course not yet started.
- **Tier penalty 6.** Between tier 3 (5) and graduate (8). The capstone
  wants the department's strongest teacher.
- **Prereqs: the four tier-3 ids, and nothing else.** The tier-3 courses
  already carry the lab, the Art Gallery and the clinic gates
  (`ARTS_CAPSTONE_GATE`, `CLINICAL_PRACTICUM_GATE`), so the capstone
  inherits them. It is the same rule as the bridges' rule 2: never repeat
  the backbone. No capstone carries a cross-major bridge.
- **Faculty.** It requires the major's `field`, like every course of the
  major. It takes one course slot.

### What the capstone counts toward

- **Established** is unchanged: the entry course and the tier-2 quartet
  (`techSystem.ts:665`). The first program arrives as soon as it does now.
- **Distinguished** becomes "every course complete": the tier-3 quartet
  **and** the capstone (`techSystem.ts:675`). Since the capstone requires
  the quartet, this is the capstone being done. The milestone's words
  already say "every course complete".
- **School distinguished** follows, since it reads every major's
  distinguished.
- **The graduate gate.** `schoolCurriculumIds` (`techData.ts:656`) maps
  `NUMS`, so it takes the capstones in with no change. A graduate program,
  and the Graduate College's capital project (`projectData.ts`'s
  `curriculum`, read by `estate/projects.ts:46`), wait on all six
  capstones of the home school. That is the gate's own words ("every
  course is taught"), and it is meant.
- **Curriculum breadth** in prestige counts milestones, not courses
  (`prestigeSystem.ts:174`). No change to the formula.
- **Seats.** Each taught course adds `SEATS_PER_COURSE` (80) places
  (`instructionCapacity.ts:18`). Forty-two capstones add 3,360.

### Words: tier 3 is no longer "the capstones"

The code and some player text call the tier-3 courses "capstones". From M
on, "capstone" means the 310 alone, and tier 3 is "advanced". Player text
to change:

| Where | Now | After |
|---|---|---|
| `components/BuildPopup.tsx:307` | "required for capstone courses" | "required for advanced courses" |
| `components/BuildingInfoPanel.tsx:186` | "this program's capstone courses require it" | "this program's advanced courses require it" |
| `data/eventData.ts:161` | "its capstone courses are open" | "its advanced courses are open" |
| `data/eventData.ts:169` | "All nine courses in …" | "All ten courses in …, the capstone among them" |
| `data/facilitiesData.ts:702` | "the venue Studio Art's capstone courses exhibit in" | "the venue Studio Art's advanced courses and its senior exhibition show in" |
| `data/techData.ts:753` | "required for the {major} program's capstone courses" | "required for the {major} program's advanced courses" |
| `data/courseQuality.ts:154` | tier 3 "Capstone course" | tier 3 "Advanced course"; tier 4 "Capstone course" |

Comments that say "capstone" for tier 3 (`techData.ts:295–297, 326, 328,
368–373, 409–429`; `courseQuality.ts:80`; `programProgress.ts:12`) are
reworded the same way.

### The code that assumes nine courses or three tiers

Grepped on `main` (`NUMS`, `TIERS`, `tier3Ids`, `tierBands`, `slice(5`,
`[5, 6, 7, 8]`, `courseIds.length`, `378`, `431`, "nine"):

| File:line | What it assumes | Change |
|---|---|---|
| `src/data/techData.ts:8–19` | "9 courses each"; three tiers in the header | Ten courses; the capstone tier |
| `src/data/techData.ts:29` | `NUMS` has nine | Append `310` |
| `src/data/techData.ts:30` | `TIERS` has nine | Append `4` |
| `src/data/techData.ts:34` | `TIER_DURATION_WEEKS` 1–3 | Add `4: 28` |
| `src/data/techData.ts:49` | `TIER_COURSE_COST` 1–3 | Add `4: 3_000_000` |
| `src/data/techData.ts:55` | `COURSE_UPKEEP_PER_WEEK` 1–3 | Add `4: 2_400` |
| `src/data/techData.ts:120` | "exactly 9 titles" | Exactly 10, the last the 310 |
| `src/data/techData.ts:137–217` | Nine titles a major | Section 2 and 3's titles |
| `src/data/techData.ts:293–303` | Bridge rule 1 names the tier-3 capstone | Rule 1: a bridge never names a 310, and a tier-2 course never names a tier-3 course |
| `src/data/techData.ts:306–366` | The bridges | Section 3's changes |
| `src/data/techData.ts:417–429` | `CLINICAL_PRACTICUM_GATE` comments name the old Nursing courses | Same four keys, new comments (section 3) |
| `src/data/techData.ts:491` | "a second nine-course major" | "a second ten-course major" |
| `src/data/techData.ts:498–528` | The MD's and JD's course lists | Section 3 |
| `src/data/techData.ts:718` | "378 course Buildables" | 420 |
| `src/data/techData.ts:743–744` | `t1Id`, `t2Ids` only | Add `t3Ids` (`NUMS[5..8]`) |
| `src/data/techData.ts:776–783` | Prereqs for tiers 2 and 3 | `else if (tier === 4) prereqs = t3Ids` |
| `src/data/techData.ts:899–918` | `MilestoneMajor` has `tier2Ids`, `tier3Ids` | Add `capstoneId` (`NUMS[9]`) |
| `src/data/techData.ts:993–1026` | `DiscoveryMajor` has `tier1Id`, `tier2Ids`, `tier3Ids` | Add `capstoneId` |
| `src/data/courseQuality.ts:81` | `CourseTier = 1 \| 2 \| 3 \| 'graduate'` | Add `4` |
| `src/data/courseQuality.ts:82–87` | `TIER_PENALTY` | Add `4: 6` |
| `src/data/courseQuality.ts:98–113` | `courseTiers` maps tiers 1–3 | Map `capstoneId` to 4 |
| `src/systems/techtree/techSystem.ts:91` | `TIER_RANK` 1, 2, 3, graduate 4 | 1, 2, 3, 4, graduate 5 |
| `src/systems/techtree/techSystem.ts:675–685` | Distinguished reads `tier3Ids` | Tier 3 and `capstoneId` |
| `src/systems/techtree/programProgress.ts:35–43` | `tierBands` returns null unless nine | Ten; add a `capstone` band |
| `src/systems/techtree/programProgress.ts:60–67` | Distinguished counts tier 3 | Tier 3 and the capstone |
| `src/tabs/CurriculumTab.tsx:107, 110, 145, 248` | `[tier1Id, ...tier2Ids, ...tier3Ids]` | Append `capstoneId` |
| `src/tabs/CurriculumTab.tsx:171–173` | "The fixed 1/4/4 tier shape … three bands per row" | 1/4/4/1, four bands |
| `src/tabs/CurriculumTab.tsx:846` | The batch's bands: tier 2, tier 3 | Unchanged; the capstone is a band of one, never batched |
| `src/tabs/CurriculumTab.tsx:933–935` | A rule before cells 1 and 5; "all nine cells" | A rule before cells 1, 5 and 9; ten cells |
| `src/styles.css:1659–1660` | `.program-row-cells`: 1 + 4 + 4 tracks and two rules | Add `1px minmax(0, 1fr)` for the third rule and the capstone |
| `src/tabs/FacultyTab.tsx:92` | `[tier1Id, ...tier2Ids, ...tier3Ids]` | Append `capstoneId` |
| `src/data/eventData.ts:162` | `unlocks: major.tier3Ids` at established | Unchanged (tier 3 opens at established) |
| `test/curriculum-graph.test.ts:51–60` | `tierOf`: >= 200 is 3, >= 500 is 4 | >= 300 is 4, >= 500 is 5 |
| `test/research-commitment.test.ts:51` | `TIER_RANK` as in `techSystem.ts` | The same change |
| `test/invariants.test.ts:428–462` | Walks tier 2 and tier 3 | Add the capstone: locked until the quartet, then open |
| `tools/review/goalPlayers.ts:1501` | 431 courses | 473 |
| `src/state/persistence.ts:67, 389` | `SAVE_VERSION`, `MIGRATIONS` | The bump and the migration (section 5) |
| `src/state/persistence.ts:1186–1187` | "nothing renames a course" | Plan 95M renames some; the comment says so |
| `docs/design/curriculum.md:221–230, 292–293, 350, 419–424` | Nine cells, three tiers, tier-3 "capstones" | The fourth tier |
| `docs/design/graduate-programs.md:47, 57` | "no tier-above-tier-3"; "nine-course major" | The capstone tier sits between |

`programs()` (`techData.ts:244`), `programOfCourse`, `schoolCurriculumIds`
and `baseCourseCost` map `NUMS`, so they need no change.

---

## 2. A capstone for every undergraduate major

**Forty-two majors** (seven schools of six), forty-two capstones. Forty are
new courses. Two are existing courses moved up: Management's Strategic
Management (section 3) and Nursing's last practicum (section 3).

Each sentence follows `courseDescriptions.ts`'s rules: one present-tense
sentence, no course code, no "this course", American spelling, something the
title does not say, and no "from X to Y".

### Business

| Major | Id | Title | Sentence |
|---|---|---|---|
| FINA | FINA310 | Senior Seminar in Finance | Takes one live deal to an investment committee's vote, defending the valuation, the financing, and the risks before a panel of practitioners. |
| ACCT | ACCT310 | Senior Seminar in Accounting | Works a full engagement for a mid-sized company, closing its books, preparing its tax return, and testing its statements, and writes up each judgment call. |
| MRKT | MRKT310 | Capstone: Marketing Strategy | Writes a year's marketing plan for a real client, with the research, segments, budget, and measures behind it, and presents it to the client's managers. |
| ECON | ECON310 | Senior Seminar in Economics | Writes an empirical paper on a question of the student's own, finds the data and the identification to answer it, and presents it to the seminar. |
| MGMT | MGMT310 | Strategic Management (moved from MGMT140) | Brings finance, marketing, and operations together in full company cases, sizing up an industry with the five forces and choosing a strategy that holds once rivals respond. |
| SPCO | SPCO310 | Capstone: Supply Chain Design | Redesigns a partner company's supply chain as a team, modeling its network, inventory, and costs, and presents the savings to its managers. |

### Engineering

| Major | Id | Title | Sentence |
|---|---|---|---|
| MECH | MECH310 | Mechanical Engineering Senior Design | Designs, builds, and tests a working machine for an outside sponsor in a year-long team project, to a budget and a written specification. |
| ELEC | ELEC310 | Electrical Engineering Senior Design | Takes a team's circuit board or embedded system through specification, prototype, and test, and demonstrates it working to a review panel. |
| CHEN | CHEN310 | Chemical Process Design | Designs and costs a complete plant as a team, sizing every unit operation and closing the economics that decide whether it would be built. |
| CIVE | CIVE310 | Civil Engineering Senior Design | Designs a real site's structures, drainage, and roads as a consulting team, to code, with the drawings and cost estimate a client would sign. |
| INDE | INDE310 | Industrial Engineering Senior Design | Studies a partner plant or hospital on site, models how its work flows, and proposes and costs the changes that would cut its waste and waiting. |
| AERO | AERO310 | Aerospace Senior Design | Designs an aircraft or a spacecraft mission as a team, closing its weight, power, and performance budgets, and defends it at a design review. |

### Arts & Media

| Major | Id | Title | Sentence |
|---|---|---|---|
| MDIA | MDIA310 | Senior Seminar in Media Studies | Researches one medium, company, or audience through archives, interviews, or data, and defends the resulting thesis before the seminar. |
| GRDS | GRDS310 | Senior Portfolio | Refines a professional portfolio around a self-directed identity project, reviewed by practicing designers at a public show. |
| CRWR | CRWR310 | Senior Thesis in Creative Writing | Completes a chapbook of poems or a collection of stories under one faculty reader, and reads from it in public at the year's end. |
| MUSC | MUSC310 | Senior Recital | Prepares and performs a public recital or a portfolio of premiered compositions, with program notes written by the performer. |
| FILM | FILM310 | Thesis Film | Writes, shoots, and edits a short film as its director, with classmates as the crew, and screens it at the department's festival. |
| SART | SART310 | Senior Exhibition | Makes a coherent body of work over the year, writes an artist's statement for it, and hangs it in the college gallery for public critique. |

### Social Sciences & Humanities

| Major | Id | Title | Sentence |
|---|---|---|---|
| ENGL | ENGL310 | Senior Seminar in English | Writes a twenty-five-page critical essay on an author or a problem of the student's choosing, drafted and defended among peers. |
| SOCY | SOCY310 | Senior Thesis in Sociology | Poses a question about social life, answers it with data the student gathers or finds, and writes it up to a journal's standards. |
| ANTH | ANTH310 | Senior Seminar in Anthropology | Turns a season of fieldwork, a museum collection, or a skeletal sample into an argued paper, presented to the department. |
| POLS | POLS310 | Senior Seminar in Political Science | Tests one argument about power, elections, or war against cases or data the student assembles, in a paper defended before the seminar. |
| HIST | HIST310 | Senior Thesis in History | Writes a thesis from primary sources in an archive, with footnotes a referee could check, and defends it before two faculty readers. |
| PHIL | PHIL310 | Senior Seminar in Philosophy | Writes and revises one long paper that defends a single thesis against the strongest objections the seminar can raise. |

### Science

| Major | Id | Title | Sentence |
|---|---|---|---|
| MATH | MATH310 | Senior Seminar in Mathematics | Masters a recent paper or a classic proof in depth, presents it to the seminar, and writes it up as an exposition another student could follow. |
| BIOL | BIOL310 | Senior Research in Biology | Runs an independent experiment in a faculty lab for a year, and presents the results as a poster and a written thesis. |
| CHEM | CHEM310 | Senior Research in Chemistry | Joins a faculty research group to make or measure something new, keeps a notebook to the group's standard, and writes a thesis on the result. |
| PHYS | PHYS310 | Senior Thesis in Physics | Repeats classic experiments such as Millikan's oil drop and the Franck-Hertz tube, then carries one question further in a written thesis. |
| ENVS | ENVS310 | Environmental Science Capstone | Studies a real watershed, wetland, or brownfield for a community partner as a team, and delivers the data and recommendations in a public report. |
| PSYC | PSYC310 | Senior Thesis in Psychology | Designs, preregisters, and runs an original study with human participants, and reports it in the format a psychology journal requires. |

### Health Science

| Major | Id | Title | Sentence |
|---|---|---|---|
| PHLT | PHLT310 | Public Health Practicum | Works a semester with a health department or clinic on a live problem, and delivers the analysis and the program plan its staff asked for. |
| NURS | NURS310 | Capstone Clinical Practicum (moved from NURS240) | Runs a full patient load on a specialty unit under one preceptor for a term, and reviews for the licensing examination every graduate sits next. |
| NUTR | NUTR310 | Supervised Practice in Dietetics | Plans and delivers nutrition care for patients and for a community program under registered dietitians, and presents one case in full. |
| PHRM | PHRM310 | Senior Research in Pharmaceutical Sciences | Runs a semester's project in a formulation or pharmacology lab, and presents the data as a drug company's project team would expect it. |
| KINE | KINE310 | Kinesiology Internship | Works a semester in a clinic, training room, or fitness program under a certified professional, and documents each client's progress. |
| NEUR | NEUR310 | Senior Thesis in Neuroscience | Carries an independent question through a faculty lab's recordings, imaging, or models, and defends the result as a thesis. |

### Computer Science

| Major | Id | Title | Sentence |
|---|---|---|---|
| COMP | COMP310 | Senior Thesis in Computer Science | Pursues one research question with a faculty adviser, reads its literature, runs the experiments it needs, and writes the result up as a thesis. |
| DATA | DATA310 | Data Science Capstone | Answers a partner organization's question with its own data, cleaned, modeled, and explained to managers who never asked for a p-value. |
| CYBR | CYBR310 | Cyber Defense Capstone | Defends a simulated company network against a live attacking team for a term, and writes the incident reports and the remediation plan. |
| SOFT | SOFT310 | Software Engineering Capstone | Delivers a working product for a real client as a team, through requirements, sprints, and testing, to a release the client runs. |
| ARTF | ARTF310 | Artificial Intelligence Capstone | Builds and evaluates an AI system for a real task, with the baseline it must beat and an audit of where it fails and whom that harms. |
| INFO | INFO310 | Information Systems Capstone | Scopes, budgets, and manages an information-systems project for a partner organization, and sees it through rollout and the training of its users. |

Two capstones also fill gaps the October review named: Chemical Process
Design is the design course Chemical Engineering lacked, and the Software
Engineering and Information Systems capstones are the team project and the
project-management course their majors lacked.

---

## 3. Each item from `2a`'s shape table

Ids are given before and after. "Moved" means the content changes id and
its state follows (section 5). "Removed" means the course leaves the
catalog. "New" means a new course, unresearched in every save.

### The JD (LAWS)

**Professional Responsibility is swapped in, not added.** The JD stays at
eight courses. Comparative & International Law goes: it is an elective in
every US JD, and Professional Responsibility is the one course the ABA
requires (Standard 303(a)(1)). The clinic moves to 570, the program's last
course, which requires all seven before it (`techData.ts:866–867`). So the
clinic can no longer follow LAW 501 alone.

| Id before | Title before | Id after | Title after | Prereqs after | Sentence |
|---|---|---|---|---|---|
| LAWS530 | Constitutional Law Seminar | LAWS530 | **Constitutional Law** (retitled) | LAWS501 | Unchanged. |
| LAWS540 | Legal Clinic & Advocacy | **LAWS570** (moved) | Legal Clinic & Advocacy | LAWS501–560, all seven | Unchanged: "Puts students in front of real clients under supervision, drafting, negotiating, and appearing in court on cases the college takes on." |
| — | — | **LAWS540** (new) | Professional Responsibility | LAWS501 | Works through the rules of professional conduct on conflicts, confidentiality, and candor to the court, and the cases where a lawyer's duty to a client meets the duty to the law. |
| LAWS570 | Comparative & International Law | — | **Removed** | — | — |

Professional Responsibility's field is `Law`. The other five JD courses
(501, 510, 520, 550, 560) are unchanged.

The retitle gives LAW 530 the same title as POLS 210 (Constitutional Law).
Real universities do this, and the course code tells them apart. No test
requires unique titles.

### The MD (MED)

**MED550 ↔ MED600.** Clerkship preparation moves to 600, after the
preclinical subjects and just before the clerkship year (610). Global &
Public Health Systems takes 550. Both are middle courses, which require
MED501 alone (`techData.ts:866–867`), so neither's prereqs change; the
order is what the number tells the player.

| Id before | Title before | Id after | Title after | Field | Sentence |
|---|---|---|---|---|---|
| MED550 | Clerkship & Residency Preparation | **MED600** (moved) | **Transition to Clerkships** (retitled) | Clinical Health | Readies students for the wards with note-writing, case presentations, and handoffs, the skills every clerkship after it assumes. |
| MED600 | Global & Public Health Systems | **MED550** (moved) | Global & Public Health Systems | Public Health | Unchanged. |

The retitle is beyond the plan's text. At 600 the course still comes before
the clerkship year, and the residency application comes during that year,
so "Residency Preparation" stays wrong. `2a` proposed the sentence above,
which stops at the wards, and the title follows it. The field moves with
each course, so each teacher keeps a course in their field.

### Business

**ACCT140 ↔ ACCT240.** Auditing goes to tier 3, after the reporting it
tests. Accounting Information Systems, which teaches the controls an
auditor tests, comes to tier 2. Its bridge to INFO101 moves with it.

| Id before | Title | Id after | Prereqs after | Sentence |
|---|---|---|---|---|
| ACCT140 | Auditing Principles | **ACCT240** (moved) | ACCT110–140 | Unchanged. |
| ACCT240 | Accounting Information Systems | **ACCT140** (moved) | ACCT101, INFO101 (bridge, moved with it) | Unchanged. |

**FINA130 ↔ FINA210, and the bridge before ACCT110.** Financial Modeling
goes to tier 3, after the Corporate Finance and Investment Analysis whose
valuation it applies. Its three-statement models assume Financial
Accounting, so it gains a bridge to ACCT110. Real Estate Finance comes to
tier 2.

| Id before | Title | Id after | Prereqs after | Sentence |
|---|---|---|---|---|
| FINA130 | Financial Modeling | **FINA210** (moved) | FINA110–140, **ACCT110** (new bridge) | Unchanged. |
| FINA210 | Real Estate Finance | **FINA130** (moved) | FINA101 | Unchanged. |

The bridge passes the three rules (`techData.ts:293–303`): ACCT110 is tier
2, its closure is ACCT101 alone, and no lab or school gate sits behind it.
Its comment: "Financial Modeling's three-statement models need financial
accounting".

**MGMT140's level: Strategic Management becomes Management's capstone.**
It is the usual capstone of a US business degree, so it goes to MGMT310
rather than to 230 (October's suggestion, made before a fourth tier
existed). Organizational Behavior, a standard requirement the major lacked,
takes 140. Conflict Resolution stays at 230.

| Id before | Title | Id after | Prereqs after | Sentence |
|---|---|---|---|---|
| MGMT140 | Strategic Management | **MGMT310** (moved) | MGMT210–240 | Brings finance, marketing, and operations together in full company cases, sizing up an industry with the five forces and choosing a strategy that holds once rivals respond. |
| — | — | **MGMT140** (new) | MGMT101 | Organizational Behavior: Applies research on motivation, perception, and group decisions to why people at work cooperate, quit, or go along with a bad call. |

### The bridge before MATH130

**COMP120 gains MATH130.** Algorithms' proofs of correctness and running
time rest on discrete mathematics, which the Computer Science major never
required.

| Id | Title | Prereqs before | Prereqs after |
|---|---|---|---|
| COMP120 | Algorithms | COMP101 | COMP101, **MATH130** (new bridge) |

The bridge passes the rules: tier 2 to tier 2, and MATH130's closure is
MATH101 alone, with no lab or school gate. Its comment: "Algorithms'
proofs need discrete mathematics". Computer Science's establishment now
waits on Mathematics being housed and two of its courses taught. Mathematics
is one of the founding offers, so this is usually met.

### The five missing core courses in Social Sciences & Humanities

Each is a swap for the weakest elective, which is removed. Where the core
course belongs in tier 2, a tier-2 course moves up to the freed tier-3 slot.
Course counts hold.

**Sociology: statistics.** Social Statistics takes 130, beside Qualitative
Research Methods. Race & Ethnicity moves to 230. Urban Sociology goes: its
ground (segregation, neighborhood effects) is covered by Social
Stratification and Race & Ethnicity.

| Id before | Title | Id after | Prereqs after | Sentence |
|---|---|---|---|---|
| — | — | **SOCY130** (new) | SOCY101 | Social Statistics: Summarizes survey data with distributions, cross-tabulations, and regression, and tests whether a gap between groups is larger than chance would leave. |
| SOCY130 | Race & Ethnicity | **SOCY230** (moved) | SOCY110–140 | Unchanged. |
| SOCY230 | Urban Sociology | — | **Removed** | — |

**Political Science: research methods.** Research Methods in Political
Science takes 140. Public Policy Analysis moves to 220, and its bridge to
ECON110 moves with it. Political Campaigns goes: it is the major's one
practitioner elective, and its sentence leans on "a live election where
there is one".

| Id before | Title | Id after | Prereqs after | Sentence |
|---|---|---|---|---|
| — | — | **POLS140** (new) | POLS101 | Research Methods in Political Science: Designs a study of a political question with surveys, experiments, or paired cases, and reads the regression tables the field publishes. |
| POLS140 | Public Policy Analysis | **POLS220** (moved) | POLS110–140, ECON110 (bridge, moved with it) | Unchanged. |
| POLS220 | Political Campaigns | — | **Removed** | — |

**Anthropology: the history of anthropological theory.** It takes 240, in
place of Museum & Heritage Studies, the most peripheral of the major's
electives. Theory is upper-level work in a real department, so it stays in
tier 3 and nothing else moves.

| Id before | Title | Id after | Prereqs after | Sentence |
|---|---|---|---|---|
| ANTH240 | Museum & Heritage Studies | — | **Removed** | — |
| — | — | **ANTH240** (new) | ANTH110–140 | History of Anthropological Theory: Reads Boas, Malinowski, Evans-Pritchard, and Lévi-Strauss in turn, and how each changed what an ethnographer goes into the field to find. |

**Philosophy: modern philosophy.** Early Modern Philosophy takes 230, in
place of Aesthetics. It follows Ancient Greek Philosophy (140) a tier
later, which is the history sequence's order.

| Id before | Title | Id after | Prereqs after | Sentence |
|---|---|---|---|---|
| PHIL230 | Aesthetics | — | **Removed** | — |
| — | — | **PHIL230** (new) | PHIL110–140 | Early Modern Philosophy: Reads Descartes, Spinoza, Locke, Hume, and Kant on what the mind can know of the world, and why reason and experience each claimed to settle it. |

**History: non-Western history after HIST101.** Modern East Asia takes 220,
in place of Historical Archaeology, which repeats Anthropology's
Archaeological Methods (ANTH130). The tier-3 lab gate (the Humanities
Research Institute) applies to it as to every HIST tier-3 course.

| Id before | Title | Id after | Prereqs after | Sentence |
|---|---|---|---|---|
| HIST220 | Historical Archaeology | — | **Removed** | — |
| — | — | **HIST220** (new) | HIST110–140, LAB-HIST | Modern East Asia: Follows China, Japan, and Korea through the Opium Wars, the Meiji reforms, colonial rule, and revolution, in their own sources in translation. |

### Nursing

**Medical-surgical, maternity and mental-health nursing take the three
tier-3 slots 210, 230 and 240.** Critical Care Nursing (210) goes: it is a
senior specialty built on the medical-surgical nursing the major lacked.
Gerontological Nursing (230) goes: its older adults are the medical-surgical
ward's usual patients. Clinical Practicum II (240) is not removed. It moves
to 310 as the capstone, which is what a final precepted practicum is in a
BSN. Pediatric Nursing stays at 220.

| Id before | Title before | Id after | Title after | Prereqs after | Sentence |
|---|---|---|---|---|---|
| NURS210 | Critical Care Nursing | — | **Removed** | — | — |
| — | — | **NURS210** (new) | Medical-Surgical Nursing | NURS110–140, HC-2 | Manages adults on hospital wards with heart failure, diabetes, pneumonia, or a fresh surgical wound, the core of nursing practice and of its licensing examination. |
| NURS230 | Gerontological Nursing | — | **Removed** | — | — |
| — | — | **NURS230** (new) | Maternal & Newborn Nursing | NURS110–140, HC-2 | Follows a pregnancy through prenatal visits, labor and delivery, and the first days at home, caring for mother and newborn as two patients at once. |
| NURS240 | Clinical Practicum II | **NURS310** (moved) | **Capstone Clinical Practicum** (retitled) | NURS210–240 | Runs a full patient load on a specialty unit under one preceptor for a term, and reviews for the licensing examination every graduate sits next. |
| — | — | **NURS240** (new) | Psychiatric & Mental Health Nursing | NURS110–140, HC-2 | Builds a working relationship with patients in crisis, psychosis, or withdrawal, with the risk assessments and de-escalation an inpatient unit runs on. |

HC-2 is `HEALTH_CENTER_TIER2_ID`. `CLINICAL_PRACTICUM_GATE` keeps the same
four keys (NURS210–240); only its comments change. NURS310 carries no gate
of its own: it inherits the clinic through its prereqs.

### What `2a`'s table lists that this does not change

- **MED610 (core clerkships)**: `2a` marks it partly fixed. The sentence
  names the four core rotations. No change.
- **The 101s**: PR J's, not this table's. M must keep J's sentences.

---

## 4. The id map

Every change, by old id. The migration reads this table (section 5). An
undergraduate or graduate id not listed keeps its id and its state.

"→ id" moves the course's content and state there. "removed" drops the
course. "new" is a course that did not exist; it has no old id, so it is
listed by its new id.

| Old id | Old title | New id | New title |
|---|---|---|---|
| FINA130 | Financial Modeling | FINA210 | Financial Modeling |
| FINA210 | Real Estate Finance | FINA130 | Real Estate Finance |
| ACCT140 | Auditing Principles | ACCT240 | Auditing Principles |
| ACCT240 | Accounting Information Systems | ACCT140 | Accounting Information Systems |
| MGMT140 | Strategic Management | MGMT310 | Strategic Management |
| — (new) | — | MGMT140 | Organizational Behavior |
| SOCY130 | Race & Ethnicity | SOCY230 | Race & Ethnicity |
| SOCY230 | Urban Sociology | removed | — |
| — (new) | — | SOCY130 | Social Statistics |
| POLS140 | Public Policy Analysis | POLS220 | Public Policy Analysis |
| POLS220 | Political Campaigns | removed | — |
| — (new) | — | POLS140 | Research Methods in Political Science |
| ANTH240 | Museum & Heritage Studies | removed | — |
| — (new) | — | ANTH240 | History of Anthropological Theory |
| PHIL230 | Aesthetics | removed | — |
| — (new) | — | PHIL230 | Early Modern Philosophy |
| HIST220 | Historical Archaeology | removed | — |
| — (new) | — | HIST220 | Modern East Asia |
| NURS210 | Critical Care Nursing | removed | — |
| NURS230 | Gerontological Nursing | removed | — |
| NURS240 | Clinical Practicum II | NURS310 | Capstone Clinical Practicum |
| — (new) | — | NURS210 | Medical-Surgical Nursing |
| — (new) | — | NURS230 | Maternal & Newborn Nursing |
| — (new) | — | NURS240 | Psychiatric & Mental Health Nursing |
| MED550 | Clerkship & Residency Preparation | MED600 | Transition to Clerkships |
| MED600 | Global & Public Health Systems | MED550 | Global & Public Health Systems |
| LAWS540 | Legal Clinic & Advocacy | LAWS570 | Legal Clinic & Advocacy |
| LAWS570 | Comparative & International Law | removed | — |
| — (new) | — | LAWS540 | Professional Responsibility |
| LAWS530 | Constitutional Law Seminar | LAWS530 (same id) | Constitutional Law |
| — (new) | — | 40 capstones: FINA310, ACCT310, MRKT310, ECON310, SPCO310, MECH310, ELEC310, CHEN310, CIVE310, INDE310, AERO310, MDIA310, GRDS310, CRWR310, MUSC310, FILM310, SART310, ENGL310, SOCY310, ANTH310, POLS310, HIST310, PHIL310, MATH310, BIOL310, CHEM310, PHYS310, ENVS310, PSYC310, PHLT310, NUTR310, PHRM310, KINE310, NEUR310, COMP310, DATA310, CYBR310, SOFT310, ARTF310, INFO310 | Section 2 |

Prereq-only changes (no id moves): COMP120 gains MATH130; FINA210 (Financial
Modeling, after the move) gains ACCT110.

**The counts.** Undergraduate: 378 − 7 removed + 49 new = **420** (42 × 10).
Graduate: 53 − 1 + 1 = **53**. Catalog: **473** courses. Moved: 11 ids
(three swap pairs, FINA, ACCT and MED; SOCY130, POLS140 and LAWS540 into
ids that removed courses freed; MGMT140 and NURS240 to their capstones).
Removed: 8.
New: 50.

As a map in code (M's form, `null` for removed):

```ts
const COURSE_ID_MAP_95M: Record<string, string | null> = {
  FINA130: 'FINA210', FINA210: 'FINA130',
  ACCT140: 'ACCT240', ACCT240: 'ACCT140',
  MGMT140: 'MGMT310',
  SOCY130: 'SOCY230', SOCY230: null,
  POLS140: 'POLS220', POLS220: null,
  ANTH240: null, PHIL230: null, HIST220: null,
  NURS210: null, NURS230: null, NURS240: 'NURS310',
  MED550: 'MED600', MED600: 'MED550',
  LAWS540: 'LAWS570', LAWS570: null,
};
```

Ids missing from the map map to themselves. The new courses come from
`initialTech()`: every catalog course with no Buildable in the save after
the remap is added from it.

---

## 5. Where course ids live in a save

Grepped in `src/state` and `src/systems` for every field that holds a course
id, and every writer of one.

### Fields that hold course ids

| Field | Declared | Written by | What the migration does |
|---|---|---|---|
| `state.tech[].id` (the course Buildable, with its `status`) | `types.ts:1230`, `Buildable` at `:323` | `actions.ts`'s `createInitialState`; status by `techSystem.ts` | Remap each course's id. Rebuild its static fields from the new catalog (below). Drop removed courses. Add the new ones. |
| `state.tech[].prereqs` (course ids, held in the save) | `types.ts:332` | the catalog, at creation | Replaced from the new catalog. `refreshAuthoredText` (`persistence.ts:1189`) does **not** refresh prereqs, so the migration must. |
| `state.developing` (course id → weeks left) | `types.ts:1231` | `techSystem.ts:353, 725` | Rekey by the map. Drop removed. |
| `state.courseFaculty` (course id → faculty id) | `types.ts:1215–1222, 1232` | `techSystem.ts:372, 619`; `reducer.ts:309`; `restaffing.ts:77`; `startInitiative.ts:60` | Rekey by the map, so each teacher follows their course. Drop removed: the teacher is freed. `sanitizeCourseFaculty` (`persistence.ts:1058`) then drops any entry left without a course. |
| `faculty[].career.courses[].courseId` (`CourseSpan`) | `types.ts:251, 269–273` | `career.ts:59–63` | Remap by the map. **Drop** the spans of removed courses: their ids are reused by new courses, so a kept span would credit the professor with the wrong course. |
| `state.seen.courseIds` (course id → true) | `types.ts:1342` | `reducer.ts:527`; `actions.ts:466` | Rekey by the map. Drop removed, so a new course at a reused id badges as new. |
| `state.log[].subject` (a course id on a course's completion line) | `types.ts:1386` | `techSystem.ts:774, 782` | Remap by the map. For a removed course, delete `subject` and keep the line's text. |

Candidates carry no career (`sanitizeCareers`, `persistence.ts:1055`), so the
market needs nothing.

### Places the plan named that hold no course id

Checked, and none needs the migration:

- **Programs and halls**: `state.halls`, `state.programOffers`,
  `declinedOffer` hold program ids (major prefixes and graduate ids), not
  course ids (`types.ts:1233–1238`).
- **Milestones**: `state.milestones`, `milestoneYears`, `ladder`,
  `events.pendingMilestones` key by prefix (`program-established:MGMT`), by
  school or by graduate program (`techSystem.ts:669, 679, 705`).
- **The curriculum's history**: `state.history`'s `YearSnapshot` holds
  counts (`coursesDone`, `coursesFinished`, `programsEstablished`,
  `types.ts:1120–1130`), no ids.
- **The Final Report**: `state.ending.report` (`finalReport.ts:58`) holds
  grades, text and counts. No ids.
- **The inbox**: derived each render (`systems/inbox/inbox.ts`). Its only
  course ids come from `log[].subject`, covered above.
- **Research**: initiatives and the record key by lab
  (`LAB-<prefix>`) and topic (`types.ts:751–800`). No course ids.
- **Events**: `catalogue.pending[].vars`, `pendingInterrupt`'s payloads and
  `DecisionEventContext.subjectId` (`eventData.ts:200`) name faculty,
  buildings, teams, clubs and rivals. The deans' recommendations store only
  school names (`eventSystem.ts:275`), and compute their steps when shown.
- **Promises, demands, identity, advancement**: no course ids.
- **Guidance** (`systems/guidance/intent.ts`): derived, not saved.

### The rules for each course in the migration

Apply the map **all at once**, from a copy of the old records. Swaps
exchange ids, so renaming in place would overwrite one with the other.

1. **Rebuild every course Buildable from the new catalog** (`initialTech()`),
   by its new id: `name`, `description`, `prereqs`, `requiresFaculty`,
   `graduateProgram`, `effects`. Keep from the save only what the player
   made: `status`, and `cost` and `duration` when it is `developing` or
   `done` (they were paid and started at those). A locked or available
   course takes the catalog's `duration`, and `repriceCatalogue` sets its
   `cost` on the next tick.
2. **A moved course keeps its status, weeks left, teacher, career lines
   and seen flag** at its new id.
3. **A moved course that is `available` but whose new prereqs are not all
   done goes back to `locked`.** Nothing was spent on it. Seven moves go up
   a tier (FINA130, ACCT140, SOCY130, POLS140 to tier 3; MGMT140 and
   NURS240 to the capstone; LAWS540 to the JD's last course) and can meet
   this.
4. **A moved course that is `developing` or `done` keeps its status**, even
   when its new prereqs are not all done. The work was paid for and stays.
   The game never re-checks a finished course's prereqs (`techSystem.ts`'s
   `unlockAvailable` reads only `locked`). So a save can hold, for example, a
   done Strategic Management (MGMT310) before Management's tier 3.
5. **A removed course is dropped**: from `tech`, `developing`,
   `courseFaculty`, `seen.courseIds` and the career spans. Its teacher is
   freed, as when a professor's course is orphaned. A removed course that
   was developing is dropped without a refund (at most eight ids).
6. **A new course arrives `locked`** and unresearched. The next tick's
   `unlockAvailable` opens it if its prereqs are met.
7. **Milestones are never revoked.** A program established or
   distinguished before the migration stays so, even where a new course
   now stands in its tier 2 (MGMT140, SOCY130, POLS140) or its capstone is
   not done. `programProgress` reads the bands, not the milestone, so it
   will show "1 to established" on such a program. M should make
   `programProgress` read an awarded milestone as reached.
8. **A graduate program already housed stays housed.** Its courses already
   available or done keep their status. Its locked courses wait on the new
   gate (`graduateGateMet`), which now includes the home school's
   capstones. A graduate program not yet founded waits on them too.

---

## 6. Expected balance effect

The owner chose the fourth tier knowing it moves balance. What M's
re-baseline should show, and why:

- **The first program arrives as it does now.** Established still reads
  the entry course and tier 2, and no swap changes a course's weeks or
  price (both follow the id). One exception: Computer Science's tier 2 now
  needs MATH130, so a college that founds Computer Science before
  Mathematics establishes it later.
- **Every distinguished program arrives later**, by one capstone: about 28
  weeks of development and a free course slot in the field, after the
  quartet.
- **Graduate programs and the Graduate College arrive later.** Their gate
  waits on six more courses in the home school. This is the largest delay,
  and the goal players that chase graduate programs (the research and
  prestige goals) will show it most.
- **More money.** Forty-two capstones list at $126M before the
  catalogue's growth. Each course on offer raises the rest by 0.3%
  (`CATALOGUE_PRICE_GROWTH`), so the last courses of a full catalogue cost
  about 13% more than they do with 378 (1.003^42). A full catalogue's
  upkeep rises by about $100,800 a week ($5.2M a year).
- **More faculty.** Ten courses a major need about 11% more course slots,
  so more hires and salaries.
- **A little more room.** Each taught capstone adds 80 seats of
  instruction capacity, 3,360 at a full catalogue.
- **Slightly lower teaching grades** while capstones are taught by
  teachers who are not the department's best (tier penalty 6).
- **The random stream shifts.** `initialTech()` adds 42 Buildables in the
  middle of `tech`, so any random pick over `tech` draws in a new order.
  Some of the sim's movement is that, not design.

So the re-baseline should read: years to the first program about unchanged;
years to the first distinguished program, the first school distinguished,
the first graduate program and the endpoint later; spending and payroll up.
A goal player that collapses (fails a goal it met before) is the signal to
stop and bring the numbers to the owner, as the plan's rule says.
