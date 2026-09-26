# Faculty and course quality

Faculty are the game's other roster. Who you hire decides what the curriculum
can open; who you assign decides what grade it earns.

## Faculty

Faculty are **named individuals** with **lightweight** attributes (teaching,
research, salary) — enough to make a hire a real, appreciating asset, but
deliberately *not* a detailed life/personality simulation. Students, by contrast,
are **aggregate classes**, not individuals (see
[admissions.md](admissions.md)). Faculty are needed to unlock course
development via `requiresFaculty`, so a **real hiring pool** is required — hiring is a genuine subsystem, not a stub
(`HIRE_FACULTY`/`FIRE_FACULTY` are wired up in the reducer; see
`facultySystem.ts`).

(A `Faculty.morale` field once existed but was written and never read — dead
state — so it was removed in the faculty-semantics pass. A resumed save that
still carries it is harmless: no code reads it. If the future faculty-lifecycle
system needs morale, it returns as an additive field then. The lightweight
attributes above, plus `acclaim` for a won research prize, are the whole of a
faculty member's model; there is no life/personality simulation. This is
conformance-tested in `test/faculty.test.ts`.)

**Recruiting is a standing, churning market, not a post-and-wait errand.**
`s.candidates` holds a long list of people currently available; the player
appoints straight off it, immediately, with no posting to open, no fee and no
countdown. What turns over is the list itself: every week
`facultySystem.ts`'s `tickCandidatePool` ages every listing, withdraws the ones
that have been up longer than `CANDIDATE_LISTING_WEEKS`, and adds new ones to
bring the pool back toward `CANDIDATE_POOL_TARGET`. A new listing's field is a
weighted draw — how many courses in the whole curriculum need that field
(read off `techData.ts`, so it can never drift from it), times an authored
per-field *market supply* multiplier for how thin that discipline's academic
job market is. All of it lives in one labelled tuning block in
`facultyData.ts`.

**A search is the one thing the market sells** (Plan 14). Every course needs
a deliberate instructor, and a thin field — Clinical Health, AI, Neuroscience
— lists somebody every few months, which makes hiring, not cash, the thing a
run stalls on. `POST_SEARCH { field }` spends money to raise the weekly chance
the market lists a candidate in that field, for a fixed window
(`facultySearch.ts`: twenty-six weeks, a one-in-four roll a week, on top of the
ordinary churn, priced at two weeks of operating expense). It rides
`tickCandidatePool` rather than being a second market — the listing is an
ordinary candidate who withdraws on the ordinary clock — and it is offered
where the shortage is felt: the instructor picker when nobody is eligible, the
hall panel's course strip, and the Faculty board per short department. It is
also the recurring money sink the mid-game needs: a cost that scales with the
size of the school and produces people rather than a bigger number.

That weighting is the point, and both halves are load-bearing. Demand alone
cannot produce a common/rare split — after the field re-specialisation every
field carries between 9 and 20 courses, so weighting by course count alone
would make all 28 equally intermittent. The supply multiplier is what makes an
English or Computer Science hire something you pull whenever you want one
(~80-83% of weeks someone is listed) while a Clinical Health, Neuroscience or
Artificial Intelligence specialist turns up every few months (~43%, ~28% and
~25%) and is worth taking the moment they do. **Specialisation is meant to create interesting scarcity while
churn removes boring scarcity** — if the pool ever covers every field at once
the specialisation stops mattering, and if it is too short or too slow
recruiting is just tedium again. Those are the two failure modes the constants
are tuned between.

**Who teaches what is real state, and the player chooses it.**
`s.courseFaculty` maps course id -> faculty id: a side record keyed by id, the
same idiom `placements` uses, so the single `Buildable` model stays unforked.
Starting a course names its instructor; `REASSIGN_COURSE_FACULTY` moves it
later, free and immediate, since the real cost is the opportunity cost — whoever
takes it on has one slot less for everything else.

This replaced a **display-only projection**, and the reason matters. The old
round-robin sorted a field's faculty by id, sorted its courses by id, and paired
them off. Fine for a caption; it cannot carry a grade. Hire one person into
Economics and every Economics course silently re-pairs, so the A− Microeconomics
wore last week is now attached to somebody else, for reasons the player never
chose and cannot see. **Player-selected faculty is not a feature next to course
quality — it is the mechanism that makes the pairing stable enough to grade.**

Two consequences fall straight out of the record existing:

- **Dismissal orphans courses.** `FIRE_FACULTY` clears the leaving person's
  assignments and logs how many courses are now without an instructor. What does
  NOT happen is the department getting its capacity back — `usedFacultySlots`
  counts an unstaffed course exactly as it counts a staffed one, because the
  course still exists and still needs teaching. (Counting only staffed courses
  made dismissal a way to *buy* capacity: the sim reached 421 offered courses on
  68 faculty, healthy-looking only because nothing read the silence.) A
  replacement hire can always take the orphans over — eligibility is per-person —
  but an over-committed department cannot open NEW courses until it has the
  people for the ones it already offers.
- **Committing somebody to research takes two of their course slots**, the same
  way and with the same bookkeeping (see [research.md](research.md)).

**The Faculty tab is a DEPARTMENT BOARD** (`FacultyTab.tsx`): one compact row
per department — **all twenty-nine of them, always**, grouped into the eight
divisions `FACULTY_FIELD_GROUPS` carries as data — over a card grid of the
people in whichever departments are open. Clicking a row expands it in place:
the courses that pull on the field (grouped by major — the answer to "why do I
need a physicist"), its faculty, and the candidates listed in it underneath
them. A view switch shows the roster alone, the market alone, or both.

**Every department is rendered whether or not anybody is in it.** The previous
version hid any field with nobody hired, nobody listed and no revealed course,
on the reasoning that it was a string in a table rather than a department the
university had. That has it backwards: knowing there is no Neuroscience
department, and that twelve courses sit behind founding one, is exactly what a
player cannot learn by looking at what *is* there.

**Each row is a capacity meter, and every meter on the board is drawn to one
scale** (the longest catalogue in the game), so departments compare against each
other and not only against themselves. `facultyCapacity.ts` derives what it
draws, in one pass, from state that already exists:

| On the meter | Is | From |
|---|---|---|
| solid | slots the current courseload takes | `usedFacultySlots` — offered courses, staffed or not |
| half-tone | courses revealed but not yet developed | `status === 'available'` |
| dotted tail | the rest of the catalogue, still locked | every `requiresFaculty` course in `s.tech` |
| the rule | what the roster supplies — the thing hiring moves | `totalFacultySlots`, commitment-adjusted |

Where the rule sits *is* the department's state, which is what colours the row:
past the ink there is room; inside the half-tone the department is at its
ceiling and something revealed cannot start (**short** — the per-field reading of
`neededFacultyFields`); inside the solid it is teaching more than it supplies and
a course is unstaffed (**over**); past the end of the track it can already teach
everything it will ever offer. A second, fainter rule marks where supply *would*
be when a research commitment has taken slots — the answer to "my department went
short and I did not hire or fire anybody".

The school-wide line above the board sums the same figures, with one
deliberate exception: the gap to a finished catalogue is added up **per
department**, never as `catalogue - supply` on the totals. Slots do not transfer
between departments, so the aggregate subtraction would tell a school with every
slot in Mathematics that it has already covered the catalogue.

**It leads with what to do.** A strip at the head of the board
(`FacultyTab.tsx`'s `FacultyNextUp`, read off `systems/faculty/hiringNext.ts`)
turns the market back into what the churn model was built to be, a stream of
events with a deadline and a price: **worth taking** — every listing in a
department that is short, soonest to withdraw first, with the grade they
would earn on the first course waiting, their salary at this school's market
rate, and an Appoint button whose title says which courses the appointment
opens; **nobody listed** — the short departments only a search or time can
help, each a Post-a-search button with its cost, or the weeks left on one
already running; **over** — the departments teaching more than they supply,
as a door to the Curriculum's unstaffed courses; and **payroll** — salaries a
week, their share of expenses, and what the appointments above would add.
An empty reading is left out, and a board with nothing to do shows no strip.

**Each department row carries its one action**, in the column the state word
used to occupy (`deptAction`): "Appoint Horvat B · $140k · 3w" for a short
department with a listing, "Post a search · $x" for one with nobody listed,
"searching · 12w" while one runs, "2 unstaffed →" for a department that is
over. A row with nothing to do says nothing. A listing's card shows the two
facts that decide it on its face — the grade on the waiting course and the
market-rate salary — and "withdraws in 2w" with the weight a deadline has.

**Doors both ways.** An opened department's demand sentence ends in "4
waiting on a slot →", which opens the Curriculum tab filtered to the courses
that department is holding up (target `field:<name>`; `unstaffed` for the
over case). The Curriculum tab's own strip sends the player here: its wall
item and a drawer's dead end carry "Appoint →" or "Department →", which opens
this board with that department expanded and scrolled into view (the tab's
`target`). On the campus map, a program whose next course has no free slot in
its department wears a red ring on its hall's pip, and the hall panel's
program summary names the department and whether a candidate is listed. No
hiring happens from the map: it is the glance, and this board and the drawer
are the work.

It is a place to LOOK AT your faculty and to decide whether a department is
worth growing — not a place to hire from. Hiring belongs where the shortage is
felt — the Curriculum tab, where a course will not start —
and the tab's old alert badge went with the loop it prompted for. The curriculum
says whether waiting will help: a course blocked on capacity draws an **amber**
dot when somebody in that field is on the market (one appointment away) and a
**red** one when nobody is (`techSystem.ts`'s `facultyGate`).

That is the first half of the "department left understaffed → its courses go on
hold" chain the roadmap had deferred: the consequence is built, and it arrives
through the player's own decisions rather than through attrition.

**In the current build, faculty are ageless: no aging, no retirement, and no
rival poaching** — a hire stays on the roster until the player dismisses them.
This is the *current* state, **not** a permanent design commitment: **occasional
rival poaching, and spending money to retain a poached hire, are an intended
future direction**, along with the chain a departure would set off — a department
left understaffed, its courses going **on hold** until a replacement is hired.
That system is deliberately **not** built in this cleanup (do not add it here);
this note only corrects the earlier "settled, never" framing so the spec and the
roadmap agree. What retention buys **today** is growth: a
faculty member's teaching/research stats start below a rolled ceiling
("potential") and rise toward it over years of tenure, then plateau; salary
rises with them, on its own slower-to-plateau curve, so a long-retained star
costs substantially more than the day they were hired (see `facultyData.ts`'s
`grownStat`/`facultySalary`). This makes faculty a genuine **prestige
investment**, though no longer a direct one: roster quality is not itself a
prestige input any more (see [progression.md](progression.md)). A matured hire
reaches standing
through the work they do — the grades their courses earn, and what their
initiatives produce — which keeps the "great cheap early hire, kept and matured"
payoff and stops paying for people who are doing neither. The scarcity that keeps a player from staffing
every school at top quality is money and hiring-pool availability, not
attrition: salaries compound as a roster matures, and a thin-market field
puts someone on the list only every few months, so specialization is a choice
forced by what you can afford and who happens to be available that week, not
by losing people you already have.

## Course quality: every course carries a grade

Every offered course has a letter grade, A–F, and it is **derived on read** —
there is no stored score to migrate, and a course quietly improves as its
instructor matures or is relieved of some of their load. `courseQuality.ts`
holds the whole model; `facultyAssignment.ts` holds the aggregates.

This is what makes academic satisfaction more than "develop everything". A
catalogue of 421 courses staffed by whoever was free is a school full of Ds, and
it now reads as one. Since [Plan 71](../plans/71-economy.md) the grades are most
of academic satisfaction (80 of its 100 points, the library the other 20) and
they cap prestige (see [progression.md](progression.md)), so hand-picking
faculty is how a college climbs past the top 25.

**The inputs are all things the player decided about a person:**

| Input | Effect |
| --- | --- |
| Instructor's teaching stat | the base, 0..100 |
| Teaching load | up to −7, scaling with how full their slots are |
| Course tier | 0 for tier-1, −2 tier-2, −5 tier-3, −8 graduate |
| Prize-winning instructor | +3 per prize, capped at +6 |

Bands at 78 / 62 / 44 / 30. The **tier penalty is the load-bearing one**: it
turns assignment from a RANKING problem ("who is best") into a MATCHING one
("who is right for this"), and it gives a senior hire a natural home. Put your
star on the tier-3 seminar, not the entry survey, because that is where their
strength shows up in the grade.

**Overload is a cost, not a cliff.** The load penalty was 12, against bands
16–18 points wide, which made a professor's second and third course read as a
punishment for expanding the catalogue rather than as a price paid for it. At 7
a matured instructor (teaching ~71) on a capstone still drops a visible grade at
a full load — B to C — so overloading somebody stays legible in the middle of
the range where most courses live; what changed is the depth of the drop. The
property to preserve through any further retune is stated in `courseQuality.ts`
and checked in `test/course-quality.test.ts`: **a D on a new department's course
is the system working, a D on a veteran's course means the player overloaded
them**, and those must stay distinguishable.

**Campus facilities are deliberately NOT an input.** The library already reaches
academic satisfaction through seats-per-student (20 of its 100 points since
Plan 71) and already reaches prestige as a multiplier on curriculum breadth. A third path would let one building move the
dominant input three ways at once.

**An unstaffed course darkens its program** (Plan 59, `techtree/darkness.ts`).
A program with any offered course and no live instructor is not taught: none of
its courses seat anyone (instruction capacity), its courses in development hold
their countdowns, and every one of its courses scores zero in the grade
averages — the whole program, not only the orphan. A college that lets its
faculty go therefore craters: seats fall to nothing, the intake ceiling with
them, and teaching quality to an F. Restaffing brings it back, and nothing
about darkness blocks a hire, an assignment or a move.

**Restaffing is one click** (`faculty/restaffing.ts`). A plan gives every
unstaffed course of a school an instructor: someone on the payroll with a free
course slot first, else the cheapest listed candidate in the field, each hire
taking as many of the field's courses as their slots hold. The Curriculum
tab's **"Staff from the market"** on a school's heading commits it
(`RESTAFF`), and so does a **Dean's year-end recommendation**: on the first
quiet week of each year (within its first quarter), every school with a Dean
and an unstaffed course gets its plan put to the President once, all accepted
in one click (`RESOLVE_DEAN_RECOMMENDATIONS`). The market keeps a candidate
listed in every field with an unstaffed course (`tickCandidatePool`), so a
plan always has someone to hire. While any program is dark and the plan can staff it,
the toolbar's next step says so before anything else (Plan 60), and the
guided player follows it: without that line its thirty-year run carried
thirteen dark programs.

**An unstaffed course scores zero, not nothing.** Aggregates count it, because a
school gutted to fifteen professors across four hundred courses is not a
comfortable B — excluding orphans was tried, and that is exactly what it
reported. A course that has not been developed at all is a different case and
scores `null`: an empty slot in the catalogue is not a failing course, it is a
course the university has not opened.

**A performance trap worth knowing about before you touch this.**
`techSystem.ts`'s `facultyLoad` answers "how many courses does this person
teach" by filtering all of `s.tech` — fine for the one call the reducer makes,
fatal in a loop. Grading every course that way is 421 × 421 filtered rows, twice
a week, which over a forty-year sim is billions of comparisons and a run that
never finishes. **Anything grading more than one course builds
`facultyLoads(s)` first** — one pass over `s.tech`, then every lookup is O(1) —
and threads it through.
