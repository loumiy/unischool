# Curriculum

The 421-course catalogue: how it unlocks, how it is presented, and the
facilities that gate its capstones. Graduate work sits on top of it and has
[its own document](graduate-programs.md).

## Halls, slots and the offer (how the curriculum gets its shape)

The 421-course curriculum is not a flat list, and it is not unlocked school
by school either. It is **founded**, one program at a time, into buildings on
the campus map. Three moves (Plan 14) give it its shape:

1. **A hall holds six programs.** An academic hall is a repeatable, placeable
   `building` Buildable with **six program slots** (`Buildable.slots`; the
   slots themselves are `s.halls`, keyed by hall id and positional — slot 3
   is slot 3 forever). Six is not arbitrary: every school in the game has
   exactly six majors, so **one hall is exactly one school**, and that is a
   rule a player learns in one sentence and plans a decade around. Twelve
   halls in the seed, a strictly sequential chain like housing: the first
   opens the week the gen-ed core completes and is deliberately cheap; each
   rung costs a fixed ratio more. Founders Hall holds the gen-ed core and
   **nothing else** — one slot, filled at founding — so the core occupies the
   building rather than one slot of six, and the player's first programs are
   never stranded in a building that can never found a school.
2. **Programs arrive three at a time.** After the core, the player is never
   shown forty-two doors. They are shown **three** (`s.programOffers`), drawn
   from what remains; founding one draws a replacement. The draw is weighted
   toward schools the player has already started, so a school converges once
   begun, and **at least one of the three is always from a school not yet
   started**, so discovery never dries up. There is no reroll and no decline;
   the three stand until one is taken, and the offer is global — the same
   three at any free slot on campus. A graduate program joins the pool the
   week its own gate opens (see [graduate-programs.md](graduate-programs.md)).
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
course after the entry course can be started from the hall panel's program
tile or from the Curriculum tab's row, with the same instructor picker either
way: the map is where a program is founded; the tab is where it is filled in
and tuned. **Every one of the 421 courses keeps its instructor choice.** There
is no auto-assignment anywhere, and the `Develop N` button that used to make
the choice for you is gone with the forty-two-card wall it existed to sweep.

**Relocation** (`RELOCATE_PROGRAM`) moves a housed program to any empty slot in
any standing hall. Free in money, expensive in time: the program goes dark for
`RELOCATION_WEEKS` — no grade, nothing to any average, its courses cannot be
started or advanced, and it counts toward no dedication until it arrives. You
can only move into a free slot, so reorganising six programs into one hall
needs the spare capacity to shuffle through, and the dark term is what stops
a free, instant, end-of-run tidy-up from defusing every slot decision made
along the way.

### The milestones

The climb inside a program is what it was:

- **Tier 1** (the entry course) is founded from a hall slot.
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
target (see [progression.md](progression.md)), raising the ceiling prestige
can drift toward rather than bumping it.

## The Curriculum tab: forty-two rows over one revealed set

The Curriculum tab, like every tab, is **full-bleed**: it owns the viewport and
the dock is laid over it (see [ui-shell.md](../architecture/ui-shell.md)).

It is **one row per program**, which is the view the progression actually has.
A row is nine cells in tier order — the entry course, the tier-2 quartet, the
tier-3 quartet — with a rule between the bands standing in for sixteen prereq
lines; a course the tab has not revealed is drawn as an **empty cell** rather
than omitted, so every row is the same width and position carries tier. Rows
compress to fit rather than scrolling; horizontal scroll is a narrow-viewport
fallback only.

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
what grade that earns, who else is eligible and what it leads to. Every
prerequisite in it is a link that scrolls to the course. When nobody in a
department can take a course, the drawer offers a **search** rather than a
dead end (see [faculty.md](faculty.md)).

**Almost no edges are drawn, and that is the argument.** 42 programs in a fixed
1/4/4 shape means the tier chain is ~336 edges all saying the same thing;
position carries that. What gets highlighted are the **~50 authored
cross-major bridges**, and only when they are relevant to what you are looking
at.

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
- **University Hospital** (11x11, the largest *building* on campus) — the
  late-game rung, and the one facility in the game gated on **a founded
  school**: the MD's entry course done, which is what "a School of Medicine
  that exists" means now that the school takes a hall slot rather than a
  building of its own. A university hospital is a teaching hospital, and a
  campus without a medical school does not have one.

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
sciences (a Buildable gates a major's capstone coursework), but with each of
two majors pointed at its **own** facility instead of a lab per major:

- **Performing Arts Center** (`facilitiesData.ts`'s `PERFORMING_ARTS_CENTER_ID`)
  unlocks once **Music's** full tier-2 quartet (`MUSC110`–`MUSC140`) is done,
  then gates Music's own tier-3 capstone courses — the concert hall and
  theater is where those capstones perform.
- **Art Gallery** (`ART_GALLERY_ID`) unlocks once **Studio Art's** tier-2
  quartet (`SART110`–`SART140`) is done, then gates Studio Art's tier-3
  capstones the same way — the rotating-exhibit gallery is where those
  capstones exhibit.

Each facility's unlock and its own gate sit two tiers apart (tier-2 to
unlock, tier-3 gated), so this can never be circular: building the facility
can never require the facility. The two are otherwise independent of each
other — nothing orders the gallery against the performing arts center, only
each against its own major's coursework.

**Graphic Design, the school's third major, sits outside both gates.** A
two-building, two-major split already covers the school's performing
(Music) and exhibited (Studio Art) halves; there's no third facility for a
third major to specialize into, so Graphic Design's capstones take the
plain tier-2 prereq every non-gated major's capstones get.

**Both facilities also feed student satisfaction** like any other
campus-life facility — `satisfactionAttribute: 'social'` plus a
`servesPopulation` (1,500 for the Performing Arts Center, 500 for the Art
Gallery), read by the same `social` ratio the rec center and student-center
tiles feed. There is no separate arts-specific satisfaction input; it is the
existing mechanism, not a new one.
