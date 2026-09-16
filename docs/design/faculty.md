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
it now reads as one.

**The inputs are all things the player decided about a person:**

| Input | Effect |
| --- | --- |
| Instructor's teaching stat | the base, 0..100 |
| Teaching load | up to −7, scaling with how full their slots are |
| Course tier | 0 for core and tier-1, −2 tier-2, −5 tier-3, −8 graduate |
| Prize-winning instructor | +3 per prize, capped at +6 |

Bands at 78 / 62 / 44 / 30. The **tier penalty is the load-bearing one**: it
turns assignment from a RANKING problem ("who is best") into a MATCHING one
("who is right for this"), and it gives a senior hire a natural home. Put your
star on the tier-3 seminar, not the gen-ed survey, because that is where their
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
academic satisfaction through seats-per-student and already reaches prestige as
a multiplier on curriculum breadth. A third path would let one building move the
dominant input three ways at once.

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
