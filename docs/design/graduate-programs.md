# Graduate programs

Read [curriculum.md](curriculum.md) first: a graduate program is more
curriculum, on the same machinery.

The layer that grows on top of a finished undergraduate school, and the
deliberately **low-risk "one loop" version** of it. A graduate program is **more
curriculum**: a small cluster of higher-tier `course` Buildables gated on an
undergraduate parent, feeding the same prestige stock, pulling the same faculty
through the existing `field` demand, and sized in the same weeks-of-opex
language as everything else. There is **no second admissions funnel and no
second student population**.

Two boundaries hold absolutely, and are the reason the feature is this shape:

1. **No second population.** No graduate-student count, no separate
   housing/dining/satisfaction ratio, no parallel funnel. The students in a
   graduate course are the same `s.students` the summer funnel already commits,
   and graduate courses are curriculum breadth like every other course. If
   differentiating medicine from law ever seems to need a distinct population,
   that is the signal to stop and re-open the design rather than build one.

   **This boundary has been tested once and held.** Graduate programs now pull
   applicants — the *grad-school bound* cohort in
   [admissions.md](admissions.md), undergraduates who chose the university
   intending to continue here. The first attempt at it was called "graduate
   students", which would have breached this boundary quietly: a cohort is
   admitted into a freshman class and graduates four years later, so it would
   have put a two-year MBA and a five-year doctorate on the undergraduate
   conveyor and called the result a graduate student body. What the mechanic
   actually models is who applies to the *undergraduate* funnel, so that is
   what it is now named. Nothing about a graduate student's residency, cost or
   satisfaction is modelled, because there is still no graduate student in the
   simulation to have any.

   Modelling one remains the re-open-the-design case above, and the shape it
   would take is known: a body outside `students.classes` with per-program
   residencies, which is a plan rather than a field.

2. **No bespoke per-school system.** Medicine, law and the MBA are
   **mechanically identical**. Everything that distinguishes them is authored
   data in `techData.ts`'s `GRADUATE_PROGRAMS`: the gate, the prestige-input
   weight, the cost/upkeep rung, which faculty field each course demands, and
   the names.

**The graduate "course" is a plain `course` Buildable.** It adds no
`BuildableKind`, no tier-above-tier-3, and no `graduate` flag — only one
optional field, `graduateProgram`, naming which program a course belongs to.
That was the shape that touched least: as a `course` it is academic upkeep, it
counts toward the instruction cost of the catalogue, it occupies a faculty
course-slot, and it is unplaceable, all without a single `kind === 'course'`
read in the codebase having to learn about it. A new kind would have meant
editing every one of those just to put graduate courses back where they already
were.

**Six programs, thirty-seven courses**, each a handful rather than a second
nine-course major (Medicine and Law are the two exceptions — see "Two of six
get their own building" below):

| Program | Degree | Home school | Gate | Own building? |
| --- | --- | --- | --- | --- |
| School of Medicine | MD | Health Science | **Science AND Health Science** near-complete | **Yes — BLDG-MED** |
| School of Law | JD | Social Sciences & Humanities | Social Sciences & Humanities near-complete | **Yes — BLDG-LAW** |
| Graduate School of Business | MBA | Business | Business near-complete | No |
| Doctoral Program in Engineering | PhD | Engineering | a finished lab in Engineering | No |
| Doctoral Program in the Natural Sciences | PhD | Science | a finished lab in Science | No |
| Doctoral Program in Health Science | PhD | Health Science | a finished lab in Health Science | No |

**One predicate, two readings** (`techData.ts`'s `graduateGateMet`), both taken
off the seed helpers that already exist, so graduate gating can never drift from
the school structure the rest of the game reads:

- a **professional school** gates on `milestoneSchools()` — enough of its parent
  school's programs **established** (the milestone prestige's curriculum breadth
  reads). **The threshold is defined explicitly, per program, and may differ by
  school** — it is authored data, not inferred by the implementation. It is
  deliberately *not* "every program distinguished," which lands so late that the
  professional schools would arrive with nothing left to spend the rest of the
  run on. (Today the code derives the count from one shared dial,
  `PROFESSIONAL_GATE_MAJOR_SHARE` at 0.75 — five of a six-program school; the
  move to authored per-program thresholds is
  [Plan 01](../plans/01-design-alignment.md)'s PR C.)
- a **research doctorate** gates on `researchSchools()` — a finished facility
  in its parent school, the same gate research itself and the university charter
  hang off. Three doctorates were authored back when three schools bore labs.
  Every school with majors now has a facility, so the gate would admit more —
  but the doctorates themselves are authored content that does not yet exist
  (see `BACKLOG.md`).
- **medicine's gate is two of those readings and-ed together** — the School of
  Science *and* Health Science, because medicine draws on the basic sciences and
  the applied health majors both. A two-school gate is a conjunction, not a new
  kind of gate.

**Reveal, not scarcity.** A program is invisible until its gate opens, the way
tier-3 courses are invisible until their major completes. There is no wall of
greyed-out professional schools from year one, and the Curriculum tab's headline
completion ring counts revealed graduate work only, so a `0 / 421` never
announces courses the player has no way to see.

**Prestige: capped inputs only, and no new weight.** Founding a program never
writes `s.self.reputation` and carries no completion bonus. Graduate breadth is
the **fourth share inside the existing curriculum-breadth input** — 0.34 program
established / 0.26 program distinguished / 0.25 school distinguished / **0.15
graduate**, still summing to 1 — so the ceiling did not move: finishing everything
scores exactly 1 and no more. Inside that share, programs are weighted against each other by an
authored `prestigeWeight` (medicine 2.0, law 1.6, the MBA 1.4, each doctorate
1.0) and normalized by the total. **That is how a top law school is allowed to
move standing more than its five courses suggest** — a share of an
already-capped input, never a weight of its own — which is the same discipline
the research cap follows. A research doctorate additionally credits the
**research** input (two credits each, into the same clamped 0..1 the
breakthroughs feed), because a PhD program genuinely *is* research standing;
professional schools get nothing there.

**Future directions (undecided — do not invent).** Beyond the shipped
medicine / law / MBA trio, several school-specific advanced payoffs are named in
the design as *possible* directions but are **not yet specified**, and must not
be implemented speculatively: an MBA-style intro → middle-courses-in-any-order →
capstone structure; Masters → PhD sequencing for science and health sciences; a
Medical School drawing on Science + Health Sciences; a Law School from Social
Sciences & Humanities with a middle-course structure; and an advanced joint
Engineering + Computer Science institution (possibly robotics/research-
oriented). (Arts & Media's own payoff — a Performing Arts Center and an Art
Gallery — is shipped; see [curriculum.md](curriculum.md)'s "Arts payoffs".)
Every school should ultimately have a meaningful tier-3 payoff, but where the
rules are undecided the spec leaves them open on purpose. Graduate-
program thresholds, by contrast, are meant to be **explicitly defined** rather
than inferred (see the professional-school gate above).

The deliberate consequence: a fully built **undergraduate** catalogue now scores
0.85 on curriculum breadth rather than 1.0. Finishing the catalogue is no longer
the top of the curriculum curve — it is the point at which the graduate curve
opens.

**Cost is the most expensive rung in the game**, with its own constants rather
than an extension of the tier table, and aimed squarely at the late-game "nothing
to buy when cash-rich" gap: a professional course is $6M / 40 weeks / $12k a week
forever, a doctoral course $4M / 32 weeks / $7k. Two rungs because cost is one of
the authored axes professional schools are differentiated on. All six programs,
plus the two professional-school buildings below, are about **$203M of capital
and $394k a week of upkeep** — real, and about 4% of a mature school's opex, but
see the balance notes: the endowment campaign remains the *unbounded* sink and
graduate programs are a finite one.

**Faculty come from the existing `field` demand**, authored **per course** the way
the gen-ed core is rather than per program, which is what lets medicine lean on
Clinical Health, Biology, Neuroscience and Public Health at once and the MBA on
all four business departments. One new field was needed and only one: **`Law`**.
Every other graduate course is taught by a department that already exists, but
hanging the law school off Political Science would have meant a hire made to
teach Comparative Politics could staff Constitutional Law, and the law school
would have cost no new recruiting at all. Law is also the only field whose demand
is entirely graduate, so it carries the taxonomy's only above-1 market-supply
multiplier — an oversupplied market with nowhere to teach until a school founds
one.

**The Curriculum UI** fits most programs into the view that already exists: a
revealed program is one more labeled sub-group inside its parent school's
section, marked as the higher tier it is, with its credential beside the name
and one line naming the gate it cleared. That's still exactly how the MBA and
all three PhD doctorates work — they build on the same subject matter as their
parent school and correctly live there. Medicine and Law are the two
exceptions (see below). That view has since become the three-level curriculum
map (see [curriculum.md](curriculum.md)'s "The Curriculum map"); graduate
programs kept their place inside
it unchanged.

**Two of six get their own building.** Medicine and Law are the only
programs that award an external professional degree rather than extending
their parent school's own subject matter, and each stands as its OWN
top-level Curriculum section — own heading, own completion ring, its own
`BLDG-MED`/`BLDG-LAW` building as the section key — never a sub-group inside
Health Science or Social Sciences & Humanities. The MBA and the three PhD
doctorates are unchanged.

The gate chain reuses every existing mechanism, adding none:

1. The building is a plain `building`-kind Buildable, seeded 'locked', shaped
   exactly like an undergraduate school building — except its prereqs are
   empty and its availability instead carries the SAME `graduateProgram`
   field a graduate course does. `meetsUnlockGates` (techSystem.ts) already
   routes that field through `graduateGateMet`, so the building reveals the
   moment the program's ordinary academic gate reads true — no second gate.
2. The program's first course adds the building as an extra prereq — a
   cross-kind course-requires-building prereq, exactly like an undergraduate
   tier-2 course requiring its school building.
3. So the full chain is: academic gate met -> building revealed -> building
   BUILT -> first course available -> the rest of the program follows its
   ordinary internal prereqs, unchanged.

The Curriculum tab reveals each section on the same boolean an undergraduate
school section reveals on — `building.status === 'done'` — not merely on the
academic gate, so there is no greyed-out School of Medicine sitting on screen
years before the building exists (reveal, not scarcity, same as everywhere
else in this feature).

Two judgment calls from this pass, flagged rather than resolved quietly:

- **Naming rights** (the naming-rights decision event, see
  [interrupts.md](../architecture/interrupts.md))
  deliberately does NOT offer BLDG-MED/BLDG-LAW — a "Johnson School of Law"
  is thematically obvious, but the event's donor pool is looked up through
  `discoverySchools()`, which only ever covers the seven undergraduate
  schools; wiring a professional building in for real needs a school-shaped
  lookup for it too, plus a heading path in the Curriculum tab that reads a
  professional section's `donorSurname`. Flagged as follow-up scope rather
  than attempted alongside the buildings themselves.
- **A save that had already founded Medicine or Law** under the old
  buildingless rule keeps every one of those courses done — nothing is
  un-finished, no milestone is revoked — but the new building still arrives
  locked and, since the academic gate it waits on is a read of milestones
  that save already earned, flips to buildable on the very first tick after
  load. The honest read: a school that had already staffed and founded a
  professional school is handed a brand-new, real construction bill for a
  hall it apparently never had. That is new content applying retroactively,
  accepted as the cost of the feature rather than smoothed over — see
  persistence.ts's v11 -> v12 migration comment.
