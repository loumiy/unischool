# Admissions and the student body

The once-a-year decision that sets the school's price and its selectivity, and
the four aggregate classes it commits.

## Admissions: an annual summer decision

Admissions is **a once-a-year task, in the summer**, delivered as an interrupt.
When it fires, the clock stops and the player sets exactly **two** levers for
the coming year: **tuition** and the **admit rate**. There is no scholarship
rate and no discount — what a family is quoted is what they pay.
**Both are set once a year here — there is no live, continuously adjustable
tuition control**, and they are taken as **three beats**, which disagree on
purpose about how much the player is allowed to know:

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
3. **Admit rate, fully projected.** The opposite posture: every consequence
   visible before it is taken (see "Tuition follows the class that paid it").

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
  it further. Word of mouth reads the **average satisfaction over the preceding year** —
  accumulated weekly and averaged at the summer boundary
  (`admissionsSystem.ts`'s `trailingYearSatisfaction`), not the current week's
  reading. Dorm capacity scales the pool toward its full size as housing
  investment grows, but is a floor rather than a wall — even a pure commuter
  school with zero beds draws a real, meaningful pool.

  **Word of mouth is deliberately not shown.** It is one of the strongest
  forces on the pool, and a player who is told "+12% applicants" reads a number
  instead of learning the rule. Left unlabelled it is something to notice
  across a few years — the pool grew and the only thing that changed was that
  the students got happier — which is the understanding worth having. It is
  the same reasoning sticker shock gets: real, and not its own readout.
- **Sticker shock** is the *band-specific* half of the price response, and it
  is what ties price to **who** applies rather than only how many. A price that
  overreaches what the school's prestige has earned (`priceTolerance`) scares
  off applicants hardest in the lower/mid quality bands and barely at all in
  the top band (the real-world "undermatching" effect), so an overreaching
  school gets a smaller pool that is also relatively richer in the applicants
  least sensitive to price. It is **not shown as its own reading** — beat 1 is
  blind, and by beat 2 it is already priced into the pool the player is
  looking at. See `admissionsSystem.ts`'s `STICKER_SHOCK_RATE`,
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
- Capacity, instruction cost and appropriations all scale with the **total
  body** across the four classes (`totalEnrolled()` in `types.ts` is the one
  place the sum lives; nothing stores a separate total that could drift).
  Tuition does **not** — it is charged per class, at four possibly different
  prices (see "Tuition follows the class that paid it").

The settled v1 rules:

- **Full progression, no attrition.** Every student who enrolls advances each
  year and graduates after four; there is no inter-year dropout. (Retention as a
  satisfaction consequence is a plausible future hook, deliberately not built.)
- **Capacity is a demand floor, never an enrollment ceiling.** Housing and
  enrollment are decoupled (see "Commuters" below): the funnel sizes the
  incoming freshman class purely from the admissions model above, with no
  reference to open seats. Bed capacity still matters, just earlier in the
  pipeline — it scales the applicant *pool* toward its full size
  (`admissionsSystem.ts`'s `capacityFactor`), so a school with no dorms at all
  still draws a real pool (the floor), while one that invests in housing draws
  a bigger one, up to a reference scale beyond which more beds buy nothing
  further. An older design capped the incoming class at open seats and damped
  growth with an `INTAKE_SURGE_MULTIPLIER`; both were deliberately removed
  (commit "Introduce commuters: decouple enrollment from dorm capacity") once
  a build-nothing school was found growing to five figures of enrollment with
  no throttle at all — `docs/plans/01-design-alignment.md`'s class-smoothing follow-up note
  predates that removal and is superseded on this point.
- **Founding mix.** A new college opens **fully commuter** — capacity 0, no
  dorm built yet (see "Commuters" below) — with **all four class years
  present** and **balanced**: each class ≈ FOUNDING_BODY / 4
  (`FOUNDING_CLASSES`, `88 / 88 / 87 / 87`, summing to 350). This puts a
  graduating class on the books from year one, without needing a founding dorm
  to justify it.
- **Commuters.** Enrollment is never capacity-gated: `students.capacity` is
  bed count, tracked separately from `totalEnrolled()`, and a large commuter
  school with few dorms is still a large school for every other purpose
  (instruction cost, satisfaction's non-housing attributes, prestige). Housing
  is one input to the admissions applicant-pool factor and its own
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

Two kinds of class carry **no cohort signal**: they read the model's base
shares exactly, because nothing the school had built was pulling any audience
in particular. The founding body is four of them — it arrives before the
player has built anything — and a save written before this record existed is
filled in the same way (`persistence.ts`'s `MIGRATIONS[39]`), since a mix that
was never recorded cannot be recovered without inventing it. The tab marks
those classes rather than presenting a prior as a record. Both cases clear
themselves within four years, as each unsignalled class graduates out and is
replaced by one the player actually admitted.

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
