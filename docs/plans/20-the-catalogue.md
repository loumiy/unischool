# Plan 20 — The catalogue

*Planning document only — no gameplay code is changed by this file. Its job is
to take a review of the authored curriculum, research and faculty data — the
half of it that is not about the general-education core — and turn it into an
ordered sequence of PRs, each small enough to land on its own.*

**Status: Landed.** PRs A–I are in, as the map below sequences them, in
one branch after Plan 19. Where the implementation departed is recorded in
the **As implemented** notes on the PRs it belongs to; the three that matter
most are that the hall chain went to thirteen rungs rather than fourteen
(Plan 19 had already taken it from twelve to eleven), that the MFA takes the
doctoral rung outright rather than being a professional-tier program with a
lab gate, and that 20B's hosting rule changed which facilities were thin
before 20C measured them — so 20C authored eleven topics rather than eight
and pinned a floor of eight interdisciplinary topics per facility rather
than six.

---

## 0. The finding

The review asked one question of the seed data: does this read as a real
university, simplified? Mostly yes. Seven schools of six majors, twenty-nine
departments in eight divisions, six graduate programs and 238 research topics
is the right scale, and the titles are credible throughout. What it found
instead was four smaller things, none of which is a bug and all of which are
the catalogue failing to mean what it says.

| Finding | Where | Shape |
|---|---|---|
| Two prereq bridges hide a whole school behind a capstone | `CROSS_MAJOR_BRIDGES` | a retarget, plus the guard that stops the next one |
| Most departmental research topics can never be offered | `researchTopics.ts` | a hosting rule, or a trim |
| 336 course descriptions are eight sentences with the title swapped in | `TIER2_TEMPLATES` / `TIER3_TEMPLATES` | the largest authored-content job in the game |
| Four schools have no graduate program | `GRADUATE_PROGRAMS` | content, plus two hall rungs |

**This plan is deliberately all content and one test.** Nothing here changes a
system. Every item is a row in a table, a sentence, or an assertion about rows
in a table — which is why it can land in any order after 20A and why it is
safe to interleave with whatever plan follows Plan 19.

**It depends on Plan 19 only for the course descriptions**, and only because
Plan 19 deletes six of them. Everything else is independent and could land
first.

### The map

| PR | Delivers | Depends on |
|---|---|---|
| 20A | The two bridges that hide a school, the guard that stops the next one, and one duplicate name | — |
| 20B | Research topics a facility can actually host | — |
| 20C | The thin facilities' interdisciplinary pools | B |
| 20D | The description table, the fallback, and the count | Plan 19A |
| 20E | Descriptions: the humanities half of the catalogue | D |
| 20F | Descriptions: the science half | D |
| 20G | The templates are deleted; every course has its own sentence | E, F |
| 20H | The graduate programs four schools do not have | — |
| 20I | Docs | all |

---

## Open questions, settled before the first PR

**1. Does a bridge to a lab-gated capstone stay legal? — No, and a test says
so.** `curriculum-graph.test.ts` already forbids a bridge pointing *up* the
tier climb. It does not look at what sits *behind* the target, which is how
`CHEM220` came to require a founded School of Science. The rule becomes: a
bridge may not name a course whose own prereq closure contains a lab or a
`schoolGate`. *Alternative:* leave it to review, which is what produced the
two cases in 20A.

**2. How does a department without a facility lead research? — By its
school's facility hosting it.** A topic may be offered at a facility when the
topic names the facility's own field **or** names a field taught by that
facility's school that has no facility of its own. *Alternative:* delete the
108 unreachable topics, which is less work and loses authored content that is
good.

This does not reopen the bug the `labs` list was written for. That bug was two
facilities *sharing* a field across schools — the aerospace lab being offered
acoustics because both are fielded Physics — and the per-topic facility list
still settles those two pairs exactly as it does now. What changes is only
whether a school's own unequipped departments can work in the building their
school built.

**3. Are the 336 descriptions authored or generated? — Authored, one table,
filled incrementally behind the existing templates.** The templates stay as a
fallback while the table fills, so no PR in the middle of the sequence ships a
course with no description; 20G deletes them once the table is complete and a
test can assert it. *Alternative:* a richer generator with more templates and
more axes, which is cheaper and produces the same complaint one layer further
along.

**4. Do the missing disciplines get added? — At graduate level only.** The
undergraduate catalogue stays at 42 majors, because `ACADEMIC_HALL_SLOTS = 6`
and "one hall is exactly one school" is the rule Plan 14 is built on: a new
undergraduate major is a *swap*, not an addition, and no school has an obvious
major to drop. Graduate programs have no such constraint. *Alternative for
later, not taken here:* Theatre into Arts & Media, which is the one swap with
an argument — the Performing Arts Center already exists as a facility with
exactly one major pointed at it.

**A fifth, deliberately not settled.** The review also found the *niche*
end of the catalogue — Culinary Nutrition, Helicopter Dynamics, Writing for
Young Adults, Governmental & Non-Profit Accounting — reading like electives
lifted from a much larger course list rather than like four capstones chosen
for a nine-course major. Retitling those is real work with no mechanical
consequence, and it is best done *by the person writing that major's
descriptions in 20E or 20F*, who will have the whole major in front of them.
It is named here so it is not re-derived, and left to those PRs rather than
given one of its own.

---

## PR 20A — The bridges that hide a school, and one duplicate name

Forty-six courses carry an authored cross-major prereq and thirty-two of those
edges cross schools. Almost all of them are real prerequisites honestly
stated. Two are not, because the rule they were checked against looks at the
target's tier and not at what stands behind it.

**`CHEM220` Biochemical Engineering → `CHMY210` Biochemistry.** True as
chemistry, and the heaviest hidden dependency in the game. `CHMY210` is a
tier-3 capstone in a lab-gated major, so its own closure contains `LAB-CHMY`,
which carries `schoolGate: 'Science'`. Distinguishing **Engineering**
therefore requires the player to house Chemistry, found the **School of
Science** outright, and build a $700,000 lab in it. None of that appears
anywhere in the tooltip, which says only that this course needs Biochemistry.
It retargets to **`CHMY120` Organic Chemistry**, which is the chemistry the
course actually rests on, is tier 2, and is behind no gate.

**`CIVE230` Construction Management → `MGMT210` Project Management.** Legal —
both are tier 3, and the plan's own rules permit a same-tier bridge — but
`MGMT210` requires Management's whole tier-2 quartet, so a civil engineering
capstone pulls in most of a Business major. It retargets to **`MGMT120`
Operations Management**, the lighter and equally honest link.

**The guard** (open question 1), in `curriculum-graph.test.ts`: no authored
bridge may name a course whose prereq closure contains a `facilityType: 'lab'`
Buildable or a `schoolGate`. This is the test that would have caught both, and
it is the reason this PR is worth landing even though the two edits are one
line each.

**And one duplicate name.** `FINA230` and `CYBR230` are both titled "Risk
Management". They are genuinely different subjects in different schools, and
the Curriculum tab shows a title without its course code in several places.
The Cybersecurity one becomes **"Security Risk Management"**.

**Verify.** `npm run test:curriculum`. The new assertion fails on `main`
before the two retargets and passes after, which is the check that it is
testing something.

**As implemented:** as written, with one honest narrowing and one addition.
The guard catches `CHEM220 -> CHMY210` and only that: `CIVE230 -> MGMT210`
is legal under it, exactly as the text above says, and was retargeted on
weight alone. The same test also refuses two courses sharing a title, so the
duplicate-name fix is pinned rather than left to the next review; both new
checks were run against the pre-PR data and both failed there.

## PR 20B — Research topics a facility can actually host

**238 authored topics, and a player can be offered 130 of them.** Only the
eleven faculty fields that have a research facility can lead work, so of 176
departmental topics, **108 can never appear**:

| School | Its facilities | Departments it teaches and cannot host |
|---|---|---|
| Social Sciences & Humanities | History | English, Philosophy, Sociology, Political Science, Law |
| Business | Economics | Accounting & Finance, Management, Marketing, Operations Research |
| Arts & Media | Communication | Art & Design, English, Music |
| Computer Science | Computer Science | Artificial Intelligence, Information Systems, Mathematics |
| Health Science | Neuroscience | Clinical Health, Kinesiology, Public Health |
| Science | Biology, Chemistry, Physics | Mathematics, Psychology |
| Engineering | five | Operations Research |

`researchTopics.ts` already calls these "reserve content, ready the day the
catalogue gives one of those fields a building", and a test pins every field
to at least six of them. **`research-topics.test.ts` already prints the gap
as a diagnostic** — "130 topics are reachable today; 108 are departmental work
in fields with no facility yet", "11 fields can lead work; the other 18 join
it" — so this is a number the suite has been reporting on every run, passing,
with nothing reading it. But every school with majors now has a facility, so
the day it was waiting for has arrived in every school and not in any field.
A Computing Research Center that cannot run an AI project, and a humanities
institute that cannot run a project in English, are the two that read worst,
because both name a department the school obviously has.

**The rule** (open question 2): `initiativeOffers` widens the pool for a
facility from "topics naming this facility's field" to "topics naming this
facility's field, or naming a field taught by this facility's school that has
no facility of its own". `researchSchools()` already supplies the second half;
the set of fielded facilities is already derivable from
`LAB_GATED_MAJOR_PREFIXES`. No new data, no new state.

**It closes the gap completely**, which was checked rather than hoped for:
every one of the eighteen unequipped departments is taught by a school that
has a facility, so all 176 departmental topics become reachable and the 108
stop being reserve content. Three fields are covered twice over — English by
both Arts & Media and Social Sciences and Humanities, Mathematics by both
Science and Computer Science, Operations Research by both Business and
Engineering — which is correct rather than a collision: those departments
genuinely teach in two schools, and a topic offered in either building is a
topic happening where the department works.

**Verify.** `research-topics.test.ts` gains an assertion that every
departmental topic is offerable at at least one facility, which is the
invariant the module comment has always claimed and never checked. The two
facility pairs that share a field keep their `labs` restrictions and their
existing test.

**As implemented: as written, and it touched the research economy after
all.** `hostableFields(facilityId)` in `techData.ts`, beside `labFields`,
and `initiativeOffers` reads it. The plan's "it does not touch the research
economy — reachability is what changes, not what a topic produces" is true
per topic and false per campus: a facility that can now staff a deep project
out of its own school runs deep projects instead of the pilot it fell back
to when the landmark tier read "no scholar free". Measured on the Selective
college at twenty years, with the same sixty-odd initiatives started: three
concluded with a report became twelve, three breakthroughs became fifteen,
and **grants went from 3% of lifetime opex to 6%** (14% by year thirty, and
at the fifty-year horizon the reference was re-recorded from, 18% for the
earnest completionist and 22% for the Selective college), against funding
at 5–7% — research at scale is net cash positive now where it was net
negative. That is what the rule was for, at the scale it was
asked for, and it is also the line `research.md` draws at "a grant is a
welcome cheque, not a funding round; it must never become a second
economy", so it is named in `BACKLOG.md` for a re-fit of grant odds and
size rather than tuned here. Two harness consequences are recorded on 20I.
One more thing this found: research offers are a hash of facility, depth
and epoch, seed-independent, so a change to the topic table moves every
seed the same way and the sim's "fails at every seed tried" does not
diversify research at all. One
reading the plan left implicit is now stated in the code and the test: "no
facility of its own" is campus-wide, not per school. It has to be, because
the MD's anatomy course makes Biology a Health Science field, and a
per-school reading would have offered the Neuroscience labs Biology's
departmental work — which is the shared-field bug in a new coat. The offers
sweep and the cross-contamination test both still pass under the rule.

## PR 20C — The thin facilities' interdisciplinary pools

A Landmark Program needs a cross-disciplinary topic, so a facility's
interdisciplinary pool is the ceiling on the most prestigious work it can do.
The pools are uneven enough that four facilities repeat inside a decade:

| Facility | Cross-disciplinary topics |
|---|---|
| Computing Research Center | 12 |
| Neuroscience, Economics | 8 |
| Biology, Electrical | 7 |
| Civil, History | 6 |
| Chemistry, Physics | 5 |
| **Mechanical, Chemical Eng, Aerospace, Media Studio** | **4** |

Four apiece is one per depth tier. Bring the bottom four to six, which is
eight new topics. The same pass evens out the other end: among fields without
a facility, Law appears in five cross-disciplinary topics while English,
Philosophy, Music, Art & Design, Mathematics, Marketing, Management, AI and
Accounting appear in two each — and Law is the last department the catalogue
acquired. 20B makes that less pressing, since those fields gain departmental
work through their own school's building, but the interdisciplinary tier is
where a violinist joins a physics project and it should not be this thin.

**One cosmetic fix while here.** `X17` Archaeological Dating and Isotope
Chemistry draws its archaeologist from **Sociology**, because Anthropology
shares Sociology's department. That is correct by the taxonomy and reads as a
mistake. The topic is renamed or refielded so it does not advertise the
sharing.

**As implemented: 20B moved the floor before this PR measured it.** The
table above was counted under the old rule. Under the hosting rule a
facility's interdisciplinary pool includes every cross-disciplinary topic
naming a field it hosts, so the Media Production Studio had eight before
this PR touched anything (English, Music and Art & Design topics), and the
thinnest were the mechanical, chemical-engineering and aerospace labs at
seven. The PR therefore authored **eleven** topics rather than eight, each
pairing one of the four named facilities with one of the nine fields that
appeared in only two topics, so both ends of the table deepened at once
(the four facilities are at ten to thirteen now; the nine fields at three
or four), and the test pins a floor of **eight** interdisciplinary topics
per facility rather than six. `X17` was refielded to Chemistry and History.
One consequence of the exhaustive `labs` list is recorded on the field's
comment: an aerospace-and-management topic must list the economics lab too,
or it is aerospace-only.

## PR 20D — The description table, the fallback, and the count

Every tier-2 and tier-3 course in the game — **336 of 378** — takes its
description from one of eight sentences with its own title and its major's
name interpolated in:

```
Builds on Mechanical Engineering's foundations with a focused study of Robotics.
A closer look at Thermodynamics, deepening the core skills of Chemistry.
```

The index arithmetic is `(i - 1) % 4` and `(i - 5) % 4`, so it is not even
eight sentences spread over 336 courses: **every major's first tier-2 course
gets the same sentence as every other major's first tier-2 course**, and so on
down. Forty-two rows of the Curriculum tab say the same four things in the
same order. The 42 entry courses already have hand-written descriptions, and
the contrast is exactly where the catalogue stops reading like a catalogue.

This is the largest authored-content job in the game and it is worth doing,
because the course drawer is where a player goes to decide what a course *is*,
and a generated sentence answers "what is this course" with "it is a tier-2
course".

**This PR is the mechanism and none of the content.**

- `TIER1_DESCRIPTIONS` widens into `COURSE_DESCRIPTIONS`, keyed by course id,
  covering every course rather than every entry course. The 42 existing
  entries move across unchanged.
- The templates stay, as the fallback for an id the table does not yet carry.
  That is what lets 20E and 20F land school by school without any intermediate
  commit shipping a blank drawer.
- A test prints **how many courses are still on the fallback** and asserts it
  only ever goes down. The count is the progress bar for the two PRs after
  this one.

**Depends on Plan 19A**, and only for six deletions: the gen-ed entries leave
the table with the core, and `PHIL110`, `MATH101`, `CIVE101`, `CIVE130`,
`CHEM101`, `CHEM130` and `POLS101` are renamed there, so writing their
descriptions first would mean writing them twice.

**As implemented:** the table lives in its own file,
`src/data/courseDescriptions.ts`, rather than widening in place — 378 rows
grouped by school and major is a content table in the way `researchTopics.ts`
is, and `techData.ts` was already 1,400 lines. The test
(`test/course-descriptions.test.ts`, `npm run test:descriptions`) also
checks the two authoring rules mechanically: one sentence, no code, no
"this course", and that the sentence with its title and a stock lead-in
stripped still has substance in it.

## PR 20E — Descriptions: the humanities half

Social Sciences and Humanities, Arts & Media, Business, Computer Science —
**24 majors, 192 courses**. One sentence each, in the register the entry
courses already use: what the course covers, in a clause, naming the actual
material rather than the tier.

Two rules, so the pass stays a catalogue and does not become 336 essays:

- **One sentence, present tense, no course code, no "this course".** The entry
  courses are the reference: *"Covers the accounting cycle, financial
  statements, and the language of business record-keeping."*
- **It must say something the title does not.** If the sentence is the title
  with "a study of" in front, the course has not been described. That is the
  whole failure being fixed, and it is the one thing to check in review.

This is also where open question 5's niche titles get settled for these
schools, by whoever has the major open in front of them.

**As implemented:** as written. Writing for Young Adults became **Novel
Writing** (the one length a nine-course writing major had not asked for),
and Governmental & Non-Profit Accounting became **Advanced Financial
Reporting**. The fallback count went from 336 to 144.

## PR 20F — Descriptions: the science half

Science, Health Science, Engineering — **18 majors, 144 courses**. Same rules.

Split from 20E on school lines rather than by tier because a major is the unit
a person can hold in their head: writing Biology's eight upper courses in one
sitting produces eight sentences that differ from each other, and writing all
forty-two tier-2 courses numbered 110 produces forty-two sentences that do
not.

**As implemented:** as written. Culinary Nutrition became **Nutrition
Assessment & Counseling**, the capstone of dietetic practice, and Helicopter
Dynamics became **Aircraft Design**, the standard aerospace capstone. The
fallback count went to zero.

## PR 20G — The templates are deleted

`TIER2_TEMPLATES` and `TIER3_TEMPLATES` go, along with the fallback branch in
`initialTech()`. The test from 20D flips from "the count only goes down" to
**"every course in the catalogue has an authored description"**, which is the
invariant worth keeping afterwards.

Graduate courses keep their generated line (`"<degree> coursework in <title>,
taught inside <program>"`) for now, deliberately: 37 courses, a much more
uniform register, and the same argument applies with much less force. It is
named in 20I as the obvious next increment rather than done here.

**As implemented:** as written. The test additionally asserts that none of
the eight retired sentences survives on any course, so a template cannot
come back under another name. The graduate line now covers 49 courses.

## PR 20H — The graduate programs four schools do not have

Six graduate programs sit in five schools. **Computer Science and Arts &
Media have none at all**, and Social Sciences and Humanities has only the JD
— no doctorate — although every one of those schools now has a research
facility and the doctoral gate is *a finished lab in the parent school*.

Three programs, authored exactly like the three doctorates that exist, with no
mechanism anywhere:

| Program | Degree | Home school | Gate |
|---|---|---|---|
| Doctoral Program in Computing | PhD | Computer Science | a finished lab in Computer Science |
| Doctoral Program in the Humanities | PhD | Social Sciences & Humanities | a finished lab in Social Sciences & Humanities |
| Master of Fine Arts | MFA | Arts & Media | a finished lab in Arts & Media |

**The cost is two hall rungs, and it has to be said out loud.**
`ACADEMIC_HALL_NAMES` has twelve entries and Plan 14's note explains the
number exactly: seven schools, plus a second hall for each of the five schools
holding a graduate program their six majors leave no room for. The arithmetic
for three new programs is not three:

- **Computer Science** and **Arts & Media** hold no graduate program today, so
  each needs a second hall it does not currently justify. **Two rungs.**
- **Social Sciences and Humanities** already justifies a second hall for the
  JD, and a second hall has six slots. The humanities doctorate sits beside
  the law school in it. **No rung.**

So the chain goes to **fourteen**, and `ACADEMIC_HALL_COUNT` moves with it.
That is a real change to the completionist ceiling and to the cumulative cost
of the hall ladder, which is why this PR is last and why 20I re-reads Plan
14's comment rather than leaving it stating a number that is no longer true.

This retires the **"Research doctorates for the four newest research
schools"** entry from `BACKLOG.md`, which named this work and left it
unsequenced.

**Verify.** `npm run sim` for the hall-ladder cost, and the graduate gate
tests. The MFA is the one to look at: it is the first professional-tier
program whose gate is a lab rather than a count of established majors, so
check it reads correctly in `graduateGateDescription`.

**As implemented: thirteen rungs, not fourteen, and the MFA is a
doctorate.** The arithmetic above starts from twelve, which was true when it
was written; Plan 19 landed first and took the chain to eleven (Founders
Hall became an ordinary six-slot hall, so the completionist ceiling of twelve
halls is Founders plus eleven). Two rungs on eleven is **thirteen** — Alder
Hall and Hazel Hall, from the same woodland — and fourteen halls in all.
Cumulative cost of the whole chain is about $68M. The year-50 completionist
builds all of them, and the layout tool sites the two new ones in a row
below the South Quad.

The MFA is authored with `type: 'doctoral'`, not as a professional program
with a lab gate. The type is what selects the gate, the cost rung and the
research credit, and a professional program gated on a lab would have been a
third gate reading in a model built on there being two — the plan's own "no
mechanism anywhere". The doctoral rung is also the right one on the merits:
a program bolted onto a school that already has the studio and the faculty,
not a medical school; and the research credit reads right because the Media
Production Studio already counts exhibited work as research. The milestone
event's wording became "a research degree" so it does not call the MFA a
doctorate. What did change in `graduateGateDescription` is the sentence for
a school with exactly one facility: "the Media Production Studio finished"
rather than "a finished lab in Arts & Media", which names a building the
school does not have — and the same form now serves the computing and
humanities doctorates and, incidentally, Health Science's.

`BACKLOG.md` no longer carried the "Research doctorates" entry by the time
this landed; the graduate-programs doc's "authored content that does not
yet exist" line was its last trace, and it is gone.

## PR 20I — Docs

`docs/design/curriculum.md` (the bridges section, and what a description is),
`research.md` (the hosting rule, and the topic counts, which stop being "only
eleven of twenty-nine fields can lead"), `graduate-programs.md` (three more
programs, and the hall arithmetic), and `techData.ts`'s own comment above
`ACADEMIC_HALL_NAMES`, which explains why there are twelve halls and will be
wrong.

Both backlog entries this plan absorbs come out of `BACKLOG.md` when it lands:
**"Curriculum texture (the review's H2, content half)"** and **"Research
doctorates for the four newest research schools"**. Three tenses, three homes.

**As implemented: as written, plus two harness rules re-read.** The
scorecard's generated reference bands (`sim/reference.ts`) were re-recorded
with `npm run sim -- --write-reference`, which is what they are for: five
figures sat outside them at 20C and seven at 20B, in opposite directions
for the same strategy — the earnest completionist's year-20 cash read 161M
against a 36–85M band at 20B and 26M at 20C — because the offer hash
reshuffles every facility's offers whenever the topic table changes, and
that sensitivity is noise the envelope cannot tell from a regression. The
balance regression's two solvency checks (`solvent`, "no real ongoing
deficit") now read the week's net plus the trailing three years' research
grants per week: grants land as lumps outside `net`, were 3% of a research
school's opex when the checks were written, and are 6–14% after 20B, so
the Selective college — which also buys two more doctorates before its
first endowment campaign now (20H) — read as bleeding at year 20 on every
seed while its cash rose every year and it ran zero weeks in the red.
Both re-reads are the harness catching up with a deliberate content
change; neither moves a game constant. Plus the counts that changed under
the plan —
427 courses in the README, `gameplay.md`, `curriculum.md` and the Treasury
line in `economy.md`; the graduate doc's capital and upkeep totals; the
thirteen-hall chain in `buildables.md`. The backlog's "Per-major mechanical
effects" entry, which was where the content half was named, now says it
landed and names the graduate lines as the next increment.

---

## What this plan does not do

- **It does not add an undergraduate major.** Six per school is the rule one
  hall is built on (open question 4). Theatre into Arts & Media is the one
  swap with an argument and it is not taken here.
- **It does not author per-major mechanical effects** — a cohort pull, a grant
  rate, a major that recruits differently. The backlog entry this plan absorbs
  named those alongside the descriptions; the descriptions are content and
  land safely, the effects are a system and want their own plan.
- **It does not touch the research economy.** Topic reachability is what
  changes, not what a topic produces, how often, or for how much.
- **It does not revisit the field taxonomy.** Twenty-nine departments across
  eight divisions was checked and is right; Law carrying eight courses and
  Clinical Health twenty-four is a spread the market-supply multiplier already
  exists to handle.
