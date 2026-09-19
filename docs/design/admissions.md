# Admissions and the student body

The once-a-year decision that sets the school's price and its selectivity, and
the four aggregate classes it commits.

## The summer: one stop a year, four beats

The year has **one fixed stop**, at week 52, and it stops once. The `summer`
interrupt (`types.ts`'s `SummerPayload`) is one modal with a four-step header —
**Review · Standing · Admissions · Students** — and a `beat` index in its
payload, so a save written between beats resumes on the right beat with the
clock still halted, and nothing can slip in between them. One action per beat
moves on (`RESOLVE_SUMMER_BEAT`); only the last beat's `RESOLVE_ADMISSIONS`
turns the calendar page. Review and Standing are read-and-continue (Enter
continues them); the decision and the digest are not.

1. **Review** — the year the school just lived through, generated from the
   year's log and the state against last summer's row
   (`state/yearInReview.ts`): what was built, who came and went, what research
   did, the students (the year's average satisfaction against last year's,
   demands raised and met, who is petitioning, and **attrition on its own
   line**), the money, and the report card — each input's grade and the step
   prestige is about to take, and, in the defend era, who passed the school
   this year. Nothing is authored or stored; the two
   forward-looking lines are the same pure functions the last beat commits.
   **On the fiftieth summer this beat is the final report** instead (see
   [progression.md](progression.md)'s "The fifty years"): the legacy, the
   ambitions, the founder's numbers and the fifty-year curves, sealed by the
   last beat and never written again.
2. **Standing** — the U.S. News report, at the boundary rather than at week 26
   (see [progression.md](progression.md)): the school's rank against last
   summer's, who it passed and was passed by, the big movers, the other two
   standings, and — once the school is on the published list — the top 50 as a
   table with a column for last year's place.
3. **Admissions** — the two levers, below.
4. **Students** — the student-life digest (see
   [student-life.md](student-life.md)): a whole year's club and chapter
   petitions answered together, and the summer's last word — what is about to
   be committed — before the year turns over.

Plan 16 is the record of how the summer came to be one stop rather than an
admissions modal and a mid-year report:
[`../plans/16-the-year.md`](../plans/16-the-year.md).

## Admissions: the summer's third beat

Admissions is **a once-a-year decision, in the summer**. The player sets
exactly **two** levers for the coming year: **tuition** and the **admit rate**.
There is no scholarship rate and no discount — what a family is quoted is what
they pay. **Both are set once a year here — there is no live, continuously
adjustable tuition control**, and they are taken as **three steps** inside the
beat, which disagree on purpose about how much the player is allowed to know:

1. **Tuition, set blind.** The slider's only feedback is whether the price is in
   line with what the school's standing supports (`priceTier`). No applicant
   count, no sticker-shock reading, and **no stated cap** — there is no cap
   left to state, only where the slider ends (`TUITION_SLIDER_MAX`, the same
   for every school since Plan 07's PR A). **Setting it locks it**: the pool
   is revealed next,
   and a price you could revise after seeing what it bought would be a lookup
   table rather than a gamble.
2. **The reveal.** The applicant pool that price actually drew, broken down by
   cohort as head counts. It **ticks up from zero, slower than any other number
   in the game** (`REVEAL_MS`): every other animated figure is a consequence of
   a slider the player is still holding and wants to keep up with them, while
   this one is the payoff for a price already committed and not retractable.
   The pool and the eight cohort rows share the duration, so the panel fills as
   one reveal rather than seven races. A reader who has asked for reduced motion
   gets the settled figures immediately — the same numbers either way.

   **Year over year, under the pool.** From the second summer, one line says
   what moved the pool and by how much — *"1,760 applicants (+22%) — beds +12%,
   prestige +5%, word of mouth +3%, price +1%"*. The funnel is a product of six
   factors (`types.ts`'s `FunnelFactors`: the prestige pool, price, beds, word
   of mouth, the cohort pulls, sticker shock), last summer's six are recorded
   at the boundary (`students.lastFunnel`), and the line is this year's divided
   by last year's, biggest move first, a factor that did not move left off
   (`systems/admissions/yearOverYear.ts`). The decomposition is exact: the six
   ratios compose to the pool's own ratio before rounding. Each cohort card
   shows last summer's count small beneath this year's.
3. **Admit rate, fully projected.** The opposite posture: every consequence
   visible before it is taken (see "Tuition follows the class that paid it") —
   including the **room**: the seats the housed catalogue has left after the
   seniors graduate, shown beside the pool, with what next summer will hold.
   The slider ends where the class fills the room, and a class held to it is
   said so. It also says who will **not return**: below 50 satisfaction a
   share of each class leaves at the summer, and the two worst-covered needs
   are named beside the number.

What the tuition slider sets is the **listed** price
(`finance.listedTuition`), which reaches a student only as the price their class
is admitted under — see "Tuition follows the class that paid it" below.

Everything else is **emergent** — the player sets no target enrollment, and the
pool, the mix and the class that arrives all follow from the two decisions
above. Admissions is a distribution funnel resolved by `admissionsSystem.ts`,
modeled as aggregate applicant *statistics*, never individual applicants:

- **Applications** are driven by **price**, **current prestige**, and the
  **average student satisfaction over the preceding year** (word of mouth).
  Higher prestige and a lower price grow the pool; a happy student body grows
  it further (±60% at the extremes of satisfaction, wide enough to notice
  across two summers). Word of mouth reads the **average satisfaction over the preceding year** —
  accumulated weekly and averaged at the summer boundary
  (`admissionsSystem.ts`'s `trailingYearSatisfaction`), not the current week's
  reading. Dorm capacity scales the pool toward its full size as housing
  investment grows, but is a floor rather than a wall — even a pure commuter
  school with zero beds draws a real, meaningful pool.

  **Word of mouth is shown, as a named part of the year-over-year line.** It
  used to be deliberately hidden, on the theory that a player told "+12%
  applicants" reads a number instead of learning the rule, and would learn it
  instead by noticing the pool grow the year after the students got happier.
  The September 2026 review found the rule was never learned; a player who
  reads "word of mouth +21%" the year after building a dining hall has learned
  it. Sticker shock is named the same way when it moves.
- **Sticker shock** is the *band-specific* half of the price response, and it
  is what ties price to **who** applies rather than only how many. A price that
  overreaches what the school's prestige has earned (`priceTolerance`) scares
  off applicants hardest in the lower/mid quality bands and barely at all in
  the top band (the real-world "undermatching" effect), so an overreaching
  school gets a smaller pool that is also relatively richer in the applicants
  least sensitive to price. It has **no reading of its own at the price step**
  — that step is blind — and appears afterwards only as its share of the
  year-over-year move. See `admissionsSystem.ts`'s `STICKER_SHOCK_RATE`,
  whose rates were sized to close an exploit that no longer exists — with one
  price, the "inflate the sticker and match it with aid" construction cannot be
  written — and which are kept for the effect itself.
- **Selectivity** (the admit rate) is the player's **second decision**. It is
  still not capacity-derived — admissions skims from the top of the quality
  distribution, taking that share of the pool, best band first — but the share
  is chosen. `admitRate(prestige)` is what the slider *opens* at: what a school
  of this standing would normally take, more selective the more standing it has.
  The chosen rate is sticky, so an unchanged strategy is a one-click continue.
- **There is no yield step.** What the skim takes is what enrolls. The price of
  a bigger class is **quality**: admitting a larger share reaches further down
  the distribution, dragging average incoming quality, which feeds prestige.
  Class size is bought with quality rather than conceded to yield.

The panel projects **what committing would do** before it is committed
(`systems/admissions/consequences.ts`): the weekly net, the satisfaction target,
and whichever capacity need the incoming class would stretch furthest — all read
at the body this decision produces, which is the three classes still enrolled
(each still paying the price it was admitted under) plus the incoming one.

Nothing there is a second model. It advances a **shallow copy** of the state
with `advanceClasses` — the very function `RESOLVE_ADMISSIONS` commits with —
and reads it with `financeBreakdown` and `satisfactionTarget`, the same
functions the Treasury and Student Life show. The copy replaces only the two
slices the advance touches, and both readings are pure, so projecting cannot
write back into the live game. `test/class-pricing.test.ts` pins the projection
against what the tick actually charges on the far side of the interrupt.

  Two things followed from deleting yield, both deliberate. `admitRate`'s
  constants were **refitted** against the enrolled share the old two-step funnel
  produced, so a school accepting the default commits about the class it always
  did — the number now means "share of applicants who enroll", not "share who
  get a letter". And a school nobody has heard of is no longer hurt twice: it
  used to have to admit nearly everyone *and* watch most of them go elsewhere,
  so its enrolled share peaked mid-range. A single monotone curve cannot express
  that, and a player setting the slider is not subject to it at all.

Students **attend for four years**, so each summer admits a **new freshman
class** while the existing classes advance a year and the seniors graduate (see
"Students: four aggregate classes" below). Shape the tuition input with the
future demand-curve model in mind.

### Tuition follows the class that paid it

A price belongs to the class that was quoted it. The summer decision sets the
**listed** price (`finance.listedTuition`); at the next admissions boundary that
becomes the incoming class's price and is carried, unchanged, until that class
graduates. `finance.tuitionByClass` holds the four, advanced in lockstep with
`students.classes` by the same lines of `reducer.ts`'s `RESOLVE_ADMISSIONS` that
move the head counts — the graduating seniors take their price with them.

So **tuition revenue is the sum of four products, never `enrolled × price`**
(`financeSystem.ts`'s `annualTuitionBilled`), and a school that has raised its
price is collecting up to four different prices at once. The Treasury's
Balance & Policy panel lists all four, which is the only screen that says so.

**Why the model is worth the extra three numbers.** Under a single scalar, a
raise repriced every student already enrolled, and the strongest line of play
was to stay cheap while the school grew and then bill four captive classes at
the new price. Per-class pricing closes that: a raise is worth exactly the
incoming class and nothing more, which is also what makes the decision legible —
the player is pricing one class, not the school. A `tuitionBonus` Buildable
effect raises the listed price only, for the same reason (`techSystem.ts`).

Two readings follow the four prices rather than the listed one, because they are
about the students actually on the books: the Treasury's tuition line, and
satisfaction's **affordability** bonus to basic needs, which scores the
enrollment-weighted average price the body pays against `priceTolerance` (see
`satisfactionSystem.ts`). A school that has just raised its price hard still has
three classes cushioned at the old one, and both readings say so.

### Admissions cohorts: who the school pulls in

The applicant pool is not undifferentiated. **Eight cohorts** — high achievers,
pre-professional, research-oriented, social, arts-focused, price-sensitive,
athletes, grad-school bound (`systems/admissions/cohorts.ts`) — each respond to
something the player has actually built: labs and research output pull the
research-oriented, established career-track majors pull the pre-professional,
clubs and chapters pull the social, a real varsity program pulls athletes, an
honest net price pulls the price-sensitive, and the graduate and professional
schools pull the grad-school bound. This is what gives several different
strategies each their own reason for enrollment to grow, instead of only
prestige and price.

**Every cohort here is a kind of undergraduate applicant.** That is what a
cohort IS in this model: someone the one summer funnel admits into a freshman
class, who graduates four years later. The grad-school bound are undergraduates
who chose this university intending to continue into its graduate and
professional schools — the pre-meds and the pre-laws — **not graduate students
themselves**. The distinction is not pedantry: an MBA is two years and a
doctorate five or more, so an actual graduate student modelled as a cohort
would be a two-year degree riding a four-year conveyor. A real graduate
population is a separate body with its own residencies, and
[graduate-programs.md](graduate-programs.md)'s first boundary says to re-open
the design rather than bolt one on.

**This cohort is modelled differently from the other seven, and the difference
is the point.** The seven have a `baseShare` — a slice of a "typical" pool,
present in some proportion at any school. Nobody picks a college for a graduate
school it does not have, so this cohort is absent outright rather than merely
small, and no base share can say that. Its share is **computed and starts at
exactly zero**, growing as graduate and professional courses are developed
(`gradBoundShare`): the business school alone is worth roughly 4% of the pool,
Medicine about 8%, Medicine and Law together about 11%, and the full graduate
build-out about 15%. It reads *developed courses* rather than completed
programs, so it ramps while the player builds instead of stepping from nothing
to a whole audience the week a final course lands.

Their weight is **added** to the other seven rather than carved out of them,
which is why founding a law school grows the applicant pool rather than
persuading prospective athletes to become lawyers. This is the one thing that
makes `cohortDemandFactor` rise above 1 with every other cohort sitting at
neutral. Their own *pull* is therefore a flat 1.0 — all of their
responsiveness lives in the share, and a pull that read the same courses again
would count them twice.

The summer reveal shows the breakdown as **head counts, not multipliers**: how
many of this year's applicants each cohort is worth, as eight small cards — the
audience's name small at the top, the count big in the middle. Seven squares
read at a glance where seven labelled rows read as a paragraph. The counts sum
exactly to the applicant pool above them (apportioned by largest remainder, so
they are whole students that actually add up), which makes "the new labs brought
in 400 more research-minded applicants" something the player reads off the board
rather than computes.

What each cohort *responds to* — labs, established majors, clubs, a fielded
team — is on the card's **hover tooltip**, not under it. It explains the number
rather than being the number, so it costs nothing until it is asked for.

**Two cohort displays, showing different things.** The reveal above is one
year's *applicants* — who was interested, before any of them were admitted.
The Enrollment tab's standing body (below) is four years of *enrolled
students*. They are drawn from the same eight cohorts and are not the same
picture: one is demand, the other is the school. Keeping the distinction
visible is the reason the tab shows classes stacked rather than a single
total.

## Students: four aggregate classes

The player manages an **institution**, not individual students. The student body
is modeled as **four aggregate classes** — **freshmen, sophomores, juniors,
seniors** — each a plain count, never a list of simulated people. **Do not
introduce individual-student simulation.**

- Students attend for **four years**. Each summer, at the admissions boundary
  (`RESOLVE_ADMISSIONS`), classes **advance**: seniors graduate and leave, each
  younger class moves up a year, and the admissions funnel commits a **new
  freshman class**. Total enrolled = the sum of the four classes.
- **Satisfaction** represents both current student happiness *and* an input to
  future attractiveness: the causal chain is **current student experience →
  satisfaction → next year's applications**. Satisfaction stays an aggregate
  institutional reading, not a per-student one.
- Capacity and instruction cost both scale with the **total body** across the
  four classes (`totalEnrolled()` in `types.ts` is the one place the sum
  lives; nothing stores a separate total that could drift). A per-student
  state appropriation used to scale with it too; Plan 07's PR B retired it.
  Tuition does **not** — it is charged per class, at four possibly different
  prices (see "Tuition follows the class that paid it").

The settled v1 rules:

- **Attrition, at the year boundary.** Every student who enrolls advances each
  year and graduates after four — less the share a bad year cost. Below
  `ATTRITION_SATISFACTION_LINE` (50) each of the three staying classes loses
  up to 8% a year at satisfaction 30, scaling linearly, read off the year's
  average satisfaction (the same figure word of mouth reads); a class's price
  does not change and its cohort mix shrinks with it. It is a parameter of
  `advanceClasses`, so the reducer and the summer panel's projection apply the
  same share, and it gets its own line — in the projections before the
  decision, in the log after — because a silently smaller number is the
  likeliest source of "I don't understand what happened to my school".
- **Seats are the one ceiling; beds are a demand floor.** The freshman class
  cannot exceed the seats the housed catalogue has left after graduation
  (`instructionCapacity.ts`'s `intakeCeiling`: `SEATS_PER_COURSE` for every
  developed course in a housed program, the core seated from founding, less
  the three classes that stay on). The funnel clips the class to it from the
  bottom band up — a school that must turn people away turns away its weakest
  admits — and caps *enrollment*, never the pool. Housing is decoupled (see
  "Commuters" below): bed capacity scales the applicant *pool* toward its
  full size (`admissionsSystem.ts`'s `capacityFactor`), so a school with no
  dorms at all still draws a real pool, while one that invests in housing
  draws a bigger one. Beds, dining and health stay soft — crowding, which
  costs standing and services, never a cap — so "I over-admitted and paid for
  it" is still a story the game can tell. An older design capped the class at
  open *beds*; that was removed once a build-nothing school was found growing
  to five figures with no throttle, and Plan 15 put the ceiling where the
  teaching is.
- **Founding mix.** A new college opens **fully commuter** — capacity 0, no
  dorm built yet (see "Commuters" below) — with **all four class years
  present** and **balanced**: each class ≈ FOUNDING_BODY / 4
  (`FOUNDING_CLASSES`, `88 / 88 / 87 / 87`, summing to 350). This puts a
  graduating class on the books from year one, without needing a founding dorm
  to justify it.
- **Commuters.** Enrollment is never bed-gated: `students.capacity` is bed
  count, tracked separately from `totalEnrolled()`, and a large commuter
  school with few dorms is still a large school for every other purpose
  (sections, services, satisfaction's non-housing attributes, prestige).
  Housing is one input to the admissions applicant-pool factor and its own
  satisfaction attribute — never a ceiling.

Implemented in the four-class model (`students.classes`), with a save
migration that splits an existing `students.enrolled` scalar evenly across the
four classes.

### The standing body: what each class is made of

Beside the four head counts sits each class's **cohort composition as
admitted** (`students.cohortsByClass`). It is written once, at the admissions
boundary that enrolled the class, advances with that class every year, and
leaves with it at graduation — the same lifecycle as the class's tuition (see
"Tuition follows the class that paid it").

**It is recorded rather than derived, and that is the whole design.** A
cohort's pull is a reading of the campus as it stands *now*, so recomputing a
standing class's mix would describe the school the player has today rather
than the one that admitted those students: open an arts centre and last
year's seniors would retroactively fill with arts students. Recording it makes
the four classes four different schools stacked on each other, which is what
the Enrollment tab draws — bar length for the size of each class, segments for
its mix, so a class that was admitted by a different university from the one
below it visibly is one.

A class can carry **no cohort signal**: it reads the model's base shares
exactly, because nothing the school had built was pulling any audience in
particular. The founding body is four of them — it arrives before the player
has built anything. The tab marks those classes rather than presenting a
prior as a record, and they clear themselves within four years, as each
unsignalled class graduates out and is replaced by one the player actually
admitted.

### Class, cohort, course

Three words that all sound like "a group of students", kept strictly apart:

- A **class** is a year group — freshman, sophomore, junior, senior. It is
  admitted in one summer and graduates four years later, and it is what
  `students.classes` counts.
- A **cohort** is a *kind* of applicant — research-oriented, price-sensitive,
  athletes, and four more (see "Admissions cohorts" above and
  `systems/admissions/cohorts.ts`). It cuts across all four classes: how
  strongly the school pulls one is recomputed from what has been built
  whenever it is needed, and is never stored. What the **crossing** is worth
  in people — this cohort, in that class — is recorded at admission and
  carried to graduation (`students.cohortsByClass`). The two words still do
  different jobs; the intersection of them is now a fact the game keeps.
- A **course** is a Buildable a student enrolls in (`techData.ts`), and is
  never called a class anywhere in this codebase or its UI.

Every class is made of students from every cohort, which is why one word could
not go on doing both jobs.
