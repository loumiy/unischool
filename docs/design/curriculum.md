# Curriculum

The 427-course catalogue: how it unlocks, how it is presented, and the
facilities that gate its capstones. Graduate work sits on top of it and has
[its own document](graduate-programs.md).

## Halls, slots and the offer (how the curriculum gets its shape)

The 427-course curriculum is not a flat list, and it is not unlocked school
by school either. It is **founded**, one program at a time, into buildings on
the campus map, and the college opens already teaching (Plan 19). Three moves
(Plan 14) give it its shape:

1. **A hall holds six programs.** An academic hall is a repeatable, placeable
   `building` Buildable with **six program slots** (`Buildable.slots`; the
   slots themselves are `s.halls`, keyed by hall id and positional — slot 3
   is slot 3 forever). Six is not arbitrary: every school in the game has
   exactly six majors, so **one hall is exactly one school**, and that is a
   rule a player learns in one sentence and plans a decade around. Eight
   halls in all: **Founders Hall**, which stands at founding, and a strictly
   sequential chain of seven like housing (Elm, Oak, Linden, Maple,
   Chestnut, Sycamore and Cedar), one for each of the seven schools. (Until
   Plan 55 the chain ran to thirteen, a second hall for each school's
   graduate programs; since Plan 51 those are housed in capital projects, so
   the second halls were room to spare, and the owner shortened the chain.)
   Founders Hall is an ordinary hall
   in every mechanical respect (Plan 19): six slots, three of them holding the
   founding programs — English, Mathematics and Economics since Plan 52, the
   pillars of three schools, with their first two courses developed and
   taught by the founding roster (Calculus, Microeconomics, Introduction to
   Literary Studies and their sequels) — and three rooms free. Three schools
   begun under one roof make it no school's hall: a school is a hall of the
   player's own. **Founders Hall is where programs begin** (Plan 55): the
   intended line of play founds them there, then moves them out school by
   school, until every school has a hall of its own and Founders Hall stands
   empty — seven schools in seven halls. (Until Plan 52 the founding programs were English, History
   and Philosophy, and three more Social Sciences & Humanities programs
   dedicated Founders Hall.) The
   first purchased hall opens once the college teaches **eight developed
   courses** (the ladder's "A curriculum" milestone: the six it opens with and
   two the player chose) and is deliberately cheap; each rung after it costs a
   fixed ratio more.
2. **Programs arrive three at a time.** From week one, the player is never
   shown forty-two doors. They are shown **three** (`s.programOffers`), drawn
   from what remains; founding one draws a replacement. The draw is weighted
   toward schools the player has already started, so a school converges once
   begun, and **at least one of the three is always from a school not yet
   started**, so discovery never dries up. The founding draw is rigged once:
   at least one of the first three is a program the founding roster can
   staff — Sociology or Psychology, whose professors the college opens with
   beside the three who teach its founding programs — so the first founding
   decision never needs a hire. There is no reroll and no decline; the three
   stand until one is taken, and the offer is for the academic halls. A
   graduate program is never drawn: its capital project offers it (see
   [graduate-programs.md](graduate-programs.md)).
3. **A school is founded, not unlocked.** Nothing is called "the School of
   Engineering" until six Engineering programs sit in one hall. A hall whose
   six slots hold one school's programs is **dedicated**; the first
   dedication founds the school — the `school-founded:<School>` milestone,
   celebrated, written once and never revoked. Six of one school scattered
   across four halls founds nothing. A graduate program belongs to its home
   school, and since that school's six majors already fill a hall, an MD or a
   doctorate needs a **second** hall of its school, dedicated on its own
   terms. Until a school is founded the Curriculum tab shows its programs in
   the school's **colour and mark with no name**; the celebration is the
   naming, and a donor can then put a family name on the hall.

**Founding is the only door.** A program's entry course starts from a hall
panel and nowhere else (`FOUND_PROGRAM`: the slot, the course and its
instructor in one transaction), because the decision is "what goes in this
building" and it needs the building on screen. Every course of a program —
tier 1 included — waits on the program being **housed** (`techSystem.ts`'s
`meetsUnlockGates` reads `s.halls`), so there is no way around it. Every
course after the entry course is started from the Curriculum tab, and only
there: **the map is where a program is founded; the tab is where it is
filled in and tuned.** The two surfaces answer two different questions at two
different grains. The hall panel answers the *building* question — what is in
this hall, what could go in it, how full and how pure it is — at the grain of
a program: a housed slot is a tile with its name, progress and grade, and an
open tile is a summary (its standing, the seats it teaches, what its next
course is or what it is waiting on) with one door, "Open in Curriculum", that
lands on the program's own row. Relocation sits behind a disclosure. The tab
answers the *program* question at the grain of a course. (For a while the
panel drew the tab's course cells, picker and market inside every open tile;
the two became the same screen, one of them squeezed into a floating card,
and neither read as the place. The division is deliberate.) **Every one of
the 427 courses keeps its instructor choice.** There is no auto-assignment
anywhere, and the `Develop N` button that used to make the choice for you is
gone with the forty-two-card wall it existed to sweep.

**Relocation** (`RELOCATE_PROGRAM`) moves a housed program to any empty slot in
any standing hall. Free in money, expensive in time: the program goes dark for
`RELOCATION_WEEKS` (twelve) — no grade, nothing to any average, its courses
cannot be started or advanced, and it counts toward no dedication until it
arrives. You can only move into a free slot, so reorganising six programs into
one hall needs the spare capacity to shuffle through, and the dark term is
what stops a free, instant, end-of-run tidy-up from defusing every slot
decision made along the way. **A move out of Founders Hall is
`FOUNDERS_MOVE_WEEKS` (four)** (Plan 55): moving programs out of the hall
where they began is the line of play, not a reshuffle, and the game should
not tax it at the reshuffle's rate.

**Sorting** (Plan 55) is read, never stored (`systems/techtree/schools.ts`). A
purchased hall is **claimed** by a school while every program in it, settled
or arriving, is that school's (`claimedSchool`); a full claim with nothing in
transit is a dedication. The **next school to move** is the one with no hall of
its own and the most programs away from home (`nextSchoolToMove`). A program
away from home has a **suggested move** (`suggestedMove`): a free slot in its
school's hall, or, for the next school to move, an empty hall. The readings
reach the player four ways: the program tile's one-click move, with an arrow
on the tile; a claimed hall's label and panel ("Elm Hall · Science · 3 of
6"); the hall panel's note when a picked offer's school has a hall of its own
elsewhere; and the next-step line, which names a possible move before a free
slot, and sends an offer to its school's hall before Founders Hall. The
opening letters teach it (docs/architecture/interrupts.md).

### The milestones

The climb inside a program is what it was:

- **Tier 1** (the entry course) is founded from a hall slot. It has no
  prerequisite of its own: the general-education core that every entry
  course used to wait on was retired by Plan 19 — six tier-1 courses in a
  costume, the same price and the same four weeks — and the housed gate is
  what keeps an entry course locked until its program has a home.
- **Tier 2** (four courses) requires the entry course. Completing all four
  **establishes the program** — an applicant-pool bonus, and the tier-3
  catalogue opens.
- **Tier 3** (four capstones) requires the tier-2 quartet, and for the
  lab-gated majors the major's lab, which in turn waits on the **school
  being founded** (`Buildable.schoolGate`). Completing them **distinguishes
  the program**.
- **A school is founded** by dedicating a hall to it (above), and
  **distinguished** once every one of its programs is distinguished.
- **A graduate program** is offered once its gate opens, founded into a slot
  like any program, and completed when every course in it is done.

**A note on terminology.** The game models an *institution*, so the language
is institutional: a university **founds** a program and a school,
**establishes** and then **distinguishes** a program — it does not "complete"
or "master" a major. Students are the ones who complete degrees; the player
builds the programs they graduate from. The tier labels stay **T1 / T2 / T3**.

Milestones are dedicated logic in `techSystem.ts` — a first-class part of the
model, not an afterthought — and none of them grants reputation directly:
they are the durable "curriculum breadth" stock that feeds the prestige
target (see [progression.md](progression.md)), raising the grade prestige
steps toward each summer rather than bumping it. Every developed course in a
housed program also adds `SEATS_PER_COURSE` to what the school can teach,
which is the ceiling on its freshman class (see
[admissions.md](admissions.md)).

## The Curriculum tab: forty-two rows over one revealed set

The Curriculum tab, like every tab, is **full-bleed**: it owns the viewport and
the dock is laid over it (see [ui-shell.md](../architecture/ui-shell.md)).

**It leads with what to do.** A strip at the head of the tab, "next up",
answers the one question forty-two rows of state cannot: the three programs
**on offer** and every hall with a free slot for them ("Found in Linden Hall ·
5 free" closes the tab and opens that hall's panel on the map, the offer's
one home); the programs **near a milestone**, a course or two from
Established or Distinguished, nearest first; how many courses are **ready
now** — a free slot and the cash both in hand — and what starting them all
would cost; and **the wall**, the departments holding revealed courses up for
want of a slot, each a filter to the courses waiting on it. Every item is a
reading off the same functions the rows use (`programProgress`,
`neededFacultyFields`, `canStartDevelopment`), and an empty reading is left
out, so in year one the strip is silent.

**Each row leads with its own next action.** The row's header names its next
startable course, the strongest free teacher in its department and the grade
they would earn, the cost and the weeks — and a Develop button that starts
exactly that. "choose…" opens the course drawer for the case where the
default is wrong; when nobody in the department is free the row says so and
whether a candidate is listed. At the right, what the start is worth: "3 to
Established · +80 seats". When the next course's tier band has several
courses ready and the same teacher has the slots for them, one more button
starts the lot with them, its grades previewed as their load climbs — where
"one person on all four" stops being obviously right and the interesting
choice surfaces on its own. Each start is its own `START_DEVELOPMENT`
through the reducer's gate, in sequence. A course start with an obvious
default is one click; the form appears only when there is something to
decide. (Every course used to cost the same three clicks through the same
form whether or not there was anything to decide, and in play the strongest
free teacher took the whole quartet four times over. Tedium comes from
undifferentiated interactions, not from many.)

It is **one row per program**, which is the view the progression actually has.
A row is nine cells in tier order — the entry course, the tier-2 quartet, the
tier-3 quartet — with a rule between the bands standing in for sixteen prereq
lines; a course the tab has not revealed is drawn as an **empty cell** rather
than omitted, so every row is the same width and position carries tier. Rows
compress to fit rather than scrolling; horizontal scroll is a narrow-viewport
fallback only.

A cell still ahead of the player carries its cost and the strongest free
teacher with their grade ("$180k · Iyer B"), or "no free slot"; a developed
cell is drawn quietly, so what the eye lands on across a row is what can
still happen in it.

**Colour, not label.** Rows group under their school, so clusters form on
their own: each group carries its school's hue and mark
(`data/schoolPalette.ts` — the one place the game deliberately breaks the
parchment / navy / brass register: seven mid-saturation, mid-luminance hues
with a motif each, so the grouping survives for a colour-blind player) and the
school's **name only once it is founded**. "Three of this colour already, and
I have a hall with three slots free" is a conclusion the player reaches by
looking.

**Faculty chips.** A compact instructor sits with each developed course —
portrait, surname, grade — and chips **drag between courses to swap
instructors**, with a live grade delta on both courses while dragging, which is
the entire reason the mechanic is worth building. A drop that is not a legal
swap (another department, a program in transit, an unstaffed course) is a
no-op and both professors stay where they were: nothing is ever displaced to
unassigned behind the player's back (`SWAP_COURSE_FACULTY`).

**The course drawer** survives unchanged: a course opens into who teaches it,
what grade that earns, who else is eligible and what it leads to. **What a
description is** (Plan 20): every one of the 378 undergraduate courses has
one authored sentence (`data/courseDescriptions.ts`), in one register — what
the course covers, in a clause, naming the material rather than the tier —
and a test holds two rules: one sentence, present tense, no course code, no
"this course"; and it must say something the title does not. For 336 of them
the drawer used to show one of eight rotating templates with the title
swapped in, so every major's first tier-2 course read the same as every
other major's; the templates are gone. Graduate courses keep a generated
line, deliberately: 49 courses in a far more uniform register, and the
obvious next increment. Every
prerequisite in it is a link that scrolls to the course. When nobody in a
department can take a course, the drawer offers a **search** rather than a
dead end (see [faculty.md](faculty.md)).

**Almost no edges are drawn, and that is the argument.** 42 programs in a fixed
1/4/4 shape means the tier chain is ~336 edges all saying the same thing;
position carries that. What gets highlighted are the **~50 authored
cross-major bridges** (`techData.ts`'s `CROSS_MAJOR_BRIDGES`), and only when
they are relevant to what you are looking at.

**Three rules every bridge holds to**, each checked by
`test/curriculum-graph.test.ts` rather than left to review. A bridge never
points *up* the tier climb, so a major's establishment is never held behind
another school's endgame. A bridge never repeats the backbone under it. And
(Plan 20) a bridge never names a course with a **lab or a school gate in its
own prereq closure** — the tier rule looks at the target and not at what
stands behind it, which is how Biochemical Engineering came to require
Biochemistry, a capstone whose closure held the Chemistry Labs and a founded
School of Science, with nothing in the tooltip saying so. A cross-discipline
prerequisite may cost the player a course or a hall slot in another school,
never that school's lab and its founding. The same test refuses two courses
sharing a title, because the tab shows a title without its code in several
places.

*(A literal constellation layout was built and abandoned before this — see
`docs/plans/02-academic-core.md`'s "Why the constellation failed". The
three-level map that replaced it — school cards, then lanes, then the drawer —
lasted until Plan 14, whose rows are what the halls model needed: one screen
where a school's shape is something you can see forming.)*

## The health chain, and clinical coursework

Three buildings, each a different institution rather than the same one with
a bigger number on it (`facilitiesData.ts`), unlocked in order past rising
population thresholds:

- **Health & Counseling Center** (3x3) — the small campus clinic a school
  needs once it crosses 1,500 enrolled.
- **University Clinic** (5x5) — real outpatient care, and the **practicum
  site** two clinical majors train in (see below).
- **Medical Center** (11x11, the largest *building* on campus) — the
  late-game rung, and a capital project (Plan 50): it opens from Year 15,
  lifts academics and research while it stands, and can be paid half from
  the endowment. Until Plan 50 it was the University Hospital, gated on the
  School of Medicine's entry course; the MD's clerkship still trains
  there.

Capacity tracks footprint at a near-flat ~220-250 students served per tile
across all three, while cost per seat climbs (280 -> 400 -> 650) the way
every chain in that file does.

**Clinical coursework gates on a clinical facility**, the same cross-kind
mechanism the labs and the arts facilities use — but keyed by COURSE id
rather than by major prefix (`techData.ts`'s `CLINICAL_PRACTICUM_GATE`),
because a clinic gates the courses that are actually clinical:

- **Nursing's four capstones** need the University Clinic. This retired the
  **Nursing Lab**: a lab here means a *bench science*, and nursing is not
  one — its capstones are clinical practica, which happen where patients
  are. Health Science stays a research school on Neuroscience's lab, which
  is a bench science and keeps its own.
- **Pharmacy's Clinical Pharmacy Practicum** — and only that one of its
  capstones — needs the Clinic too.
- **The MD's Advanced Clinical Practicum** needs the **Hospital**. A
  clerkship is inpatient work, so the chain reads: found the school ->
  build its hospital -> finish the degree.

None of this can be circular: every gate points at a health-chain facility,
and the health chain's own prereqs are earlier rungs of itself plus the MD's
*entry* course, which requires nothing of the hospital — the clerkship year
the hospital gates is the last course of the program.

## Arts payoffs: two facilities, two majors

Arts & Media's version of "every school gets a meaningful tier-3 payoff" —
the same curated cross-kind gate `LAB_GATED_MAJOR_PREFIXES` gives the lab
sciences (a Buildable gates a major's capstone coursework):

- **Art Gallery** (`ART_GALLERY_ID`) unlocks once **Studio Art's** tier-2
  quartet (`SART110`–`SART140`) is done, then gates Studio Art's tier-3
  capstones — the rotating-exhibit gallery is where those capstones exhibit.
  Unlock and gate sit a tier apart, so it can never be circular. It also
  feeds `social` satisfaction (`servesPopulation` 500), the existing
  mechanism.
- **The Arts Center** (a capital project, Plan 51) is the school's whole
  payoff: it opens once **every** Arts & Media course is taught, lifts campus
  life, and houses the MFA (see [graduate-programs.md](graduate-programs.md)).
  It replaced the Performing Arts Center, which gated Music's capstones; Music
  and Graphic Design's capstones now take the plain tier-2 prereq.
