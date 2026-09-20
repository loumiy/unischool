# UniSchool — Backlog

*The work that has been named but not yet planned. Nothing here is sequenced
into PRs; turning one of these into a sequence is what writing the next plan
does (see `docs/plans/README.md` for how that is done and named).*

**This is the one forward-looking document in the repository.** The docs in
`docs/design/` and `docs/architecture/` describe the game as it is; the plans
in `docs/plans/` are closed records of work that has landed. If something is
going to happen but has not, it belongs here.

---

## Sequenced enough to start

*The [September 2026 design review](docs/reviews/2026-09-design-review.md) set the
order for what comes next. Plan 09 (the playtest harness) has **landed** — the
scenarios, the debug flag and panel, the prestige breakdown and the sim
scorecard the rest of them are measured with, all in
[`docs/architecture/playtesting.md`](docs/architecture/playtesting.md).

The four plans it was built to measure have since been rewritten around a
playtest finding the review did not reach: that developing every course is
tedious *and* that the `Develop N` button relieving the tedium is worse than the
tedium. Plans 10–13 are `Superseded`; the sequence was **14 (the curriculum
on the map), 15 (growth has a cost), 16 (the year) and 17 (the endpoint)**, in
that order of dependency — and all four have now **landed**. What they changed
is in `docs/design/` (the fifty-year run, the legacy and the ambitions are in
`progression.md`'s "The fifty years").*

*The order is deliberate, and it is the one thing to preserve if the sequence
gets re-cut: **halls before the economy**. Plan 14 moves the trajectory more than
anything else in the sequence, so fitting the constants first would mean fitting
them twice. Plan 15's PR G is the single re-fit, and it is against the game as it
will actually be played. The cost is that the game is badly balanced between the
two plans, knowingly.*

*What comes after them is below, and the **faculty lifecycle is the next plan to
write**.*

*Each of these is a plan's worth of work on its own, and none of them blocks any
other. Lifted from Plan 04, which is where they were first named. Turning one
into an ordered sequence of PRs is what writing the next plan does, and four
have now been through it: Summer admissions (Plan 05), Admissions and History
(Plan 06, which declined the tab merge it proposed and built the infographic in
a renamed Enrollment tab instead), the startup screen (Plan 07), and **Athletics
V3 together with Rival schools** (Plan 08, which found they were one feature —
athletics wanted consequences it had nowhere to put, and the rivals entry was
where the standing to put them lived). None of them is here any more: what they
changed is in `docs/design/` now.*

### Startup screen
**Done — [Plan 07](docs/plans/07-startup-and-vernacular.md) landed.** The
private/public fork is gone (ceiling, appropriation and school type), the
campus has a **vernacular** chosen at founding — Georgian, Collegiate Gothic,
Classical, Mission or Modern (Brutalist was replaced by Modern, and Classical
added, in the 2026-09 map-assets pass) — and the founding facade is Founders
Hall, drawn in the set the player is choosing. What that changed is in
`docs/design/progression.md` now.

One piece of this entry did NOT go into Plan 07 and is still open: the
**admit-rate curve's early slope**, its own item below. Plan 07's PR C took the
private applicant pool unchanged rather than re-fitting it, so the two want
doing together.

The **mascot at founding** is settled and closed. It was deferred to Athletics
V3, and [Plan 08](docs/plans/08-athletics-rivals.md) took it the other way: the
school names its teams when it hires its first athletic director, which is the
first moment the question has an answer. The founding screen would have asked
before a building stood and a decade before a varsity team existed.

---

### The admit-rate curve's early slope
Re-fit `admitRate(prestige)` so the slider opens wide for a small school and
narrows as standing builds. It currently opens at **36%** for a founding school
where ~86% is better, which makes the default a mild handicap rather than a
sensible opening: a small class is a small tuition line, a small tuition line
builds the curriculum slowly, and curriculum breadth is the 90-weight prestige
term that decides the run.

The mis-shape has a known cause rather than being a tuning accident. Plan 05's
PR C fitted those four constants to reproduce the enrolled-class sizes the OLD
two-step funnel produced, which is a different target from "the rate a player
should actually want" — see that PR's note. `sim/balanceSim.ts`'s `ADMIT_PROBES`
measure the gap and are the check on any re-fit.

## Named, not sequenced

*Carried over from the roadmap the README used to hold. Each is a real piece of
work with a known shape; none has been turned into a sequence of PRs.*

- **Faculty lifecycle: rival poaching and paid retention.** A departure the
  player did not choose, and money spent to prevent it. The downstream chain (a
  department left understaffed, its courses without an instructor) already
  exists, reached through the player's own dismissals and research commitments.
  Aging and retirement remain optional. **This is the next plan to write.**
  Everything it needs is either built or sequenced: Plan 14 makes a professor a
  named person in a room in a building, so losing one is a visible hole rather
  than a row in a table; Plan 14's paid faculty search is the shape a retention
  negotiation would reuse; Plan 15 makes salaries scale with standing, so a poach
  has a price; Plan 17's closing elite band gives a poacher a motive. It was
  deferred out of Plans 14–17 by decision, not by accident.
- **A richer demand-curve finance model**, where prestige shifts the frontier
  between tuition and enrollment volume, with prestige/scale archetypes. The
  finances are structured so this can replace the simple version without
  touching the rest of the system.
- **A school-wide budget, and a CFO to run it.** Today every expense line is
  *derived* from what the school owns and enrolls — instruction from students
  times sections, services from enrollment times crowding, salaries from the
  roster, upkeep from buildings — and `financeSystem.ts` says plainly that none
  of the three income lines is an appropriation. A budget inverts that: costs
  stop being consequences of what you own and become choices about how well
  what you own works, which is the only way underfunding can have a
  consequence. The shape discussed and deliberately **not** taken into
  [Plan 21](docs/plans/21-the-department.md): five or six levers rather than a
  line-item sheet (instruction, student services, research, athletics,
  facilities and maintenance, financial aid), each low/adequate/generous with
  one visible consequence — deferred maintenance is where the roof-failure and
  heating-plant events should come from instead of pure bad luck — and the pot
  sized as a share of income the player chooses to spend, so "spend now or
  compound the endowment" becomes the top-level dial.

  **A CFO is what stops it being tedious**, and is hired the way the athletic
  director is: their quality decides how good the auto-allocation is, so
  hiring a good one *is* the "leave it be" purchase. The budget arrives
  pre-filled as the default inside the summer admissions interrupt — a stop the
  player was already making, one click to accept — and the CFO flags exceptions
  rather than asking every year, the same discipline the demand system uses.

  **Two conditions before this is worth sequencing.** It is gated on money
  actually being scarce: a budget screen on a school with $2B in cash is
  decoration. And Plan 21's per-sport pot and priority list are the pilot for
  it — build the specific case, see how it reads, then generalise.
- **Campus map feedback.** Adjacency weighting between neighbouring buildings,
  and any economic or prestige consequence of the layout. The map is a
  visual-only layer today and nothing mechanical reads it.
- **More authored decision events**, including events that reach systems the
  first pass deliberately left alone, and campus-life depth behind them.
- **Athletics deferrals**, as [Plan 08](docs/plans/08-athletics-rivals.md)
  leaves them. **Match simulation and schedules** are still deferred, and the
  line is worth keeping sharp: Plan 08 added a year-end *bracket*, which is not
  a season — no week contains a game and no team has a schedule. A real season
  (fixtures, opponents, a record accumulating week to week) is still unbuilt.
  **Rowing** joins this list: it wants a lake, a lake is *terrain*, and the
  campus map has no terrain concept at all — the only water in the game is
  drawn ornamentally inside two ground markings. That is a campus-map problem
  before it is an athletics one. And **what happens to a shared venue once its
  last team disbands** is still unanswered, because disbanding a team is still
  unbuilt — Plan 08 made it likelier to be asked (eighteen sports instead of
  fourteen) and no easier to answer.

  Two things have left this list. **Per-sport standings** are built. **Prestige
  coupling** is settled rather than deferred: athletics moves *campus-life
  standing* and nothing else, which is the narrow shape
  `docs/design/student-life.md` flagged it in — the academic number the whole
  economy reads is still untouched by athletics.

  **What to do with the department as a whole is now sequenced**, in
  [Plan 21](docs/plans/21-the-department.md): its outputs are connected before
  anything is deepened, the season question above is answered at four dated
  occasions rather than a fixture list, and **rowing and golf stay declined**
  for the reasons already recorded. Plan 21 adds one sport — water polo, onto
  the natatorium, which carries two programs for $950k and is the department's
  worst-value building — and holds wrestling, gymnastics and cross country
  because the arena and the field are already carrying six and seven.
- **The tutorial** — **done**, in two layers. The forced first minute is the
  opening walkthrough (`src/state/opening.ts`): a new school opens
  with the clock held and no building standing, and the shell walks the
  player through siting Founders Hall from the build menu and developing a
  course from the Curriculum — which is where a professor is picked or
  appointed — before the clock runs. The rest is
  [Plan 16](docs/plans/16-the-year.md)'s PR F: three more letters from the
  board's chair across the first year (site the first hall, site a residence
  and a dining hall, what the summer will ask), each with one thing to do and
  none forced, with a next-step line on the toolbar that carries the ask until
  it is done. Nothing beyond the first year: a player who reaches summer two
  has the loop.

## From the September review, not taken into Plans 14–17

*Each of these was named in the review's roadmap and each was consciously left
out of the current sequence. They are listed here so the next plan does not have
to re-derive them from a 658-line document.*

- **Per-major mechanical effects.** A cohort pull, a grant rate, a major that
  recruits differently — the half of "curriculum texture" that is a system
  rather than content, and the half [Plan 20](docs/plans/20-the-catalogue.md)
  deliberately left alone. The content half — the eight templated sentences
  behind 336 courses — **landed** there: every undergraduate course has its
  own sentence now, and what a description is lives in
  `docs/design/curriculum.md`. The 49 graduate courses still carry a
  generated line, and are the obvious next increment of that work.
- **Athletics' reach into the economy, and student life with teeth.** The review
  found athletics the best-built system in the game and the least connected: a
  venue that sells no tickets, a title that moves a standing nothing reads, a
  social bonus capped low enough that clubs stop counting by mid-game. Plan 15
  cuts campus life's prestige weight from 12 to 8 **with a named condition** — it
  returns to 12 when these systems reach something — and Plan 17 leaves campus
  life out of the legacy's six axes for the same reason. That condition is this
  item, and it is the largest single thing the sequence walks past.

  **[Plan 21](docs/plans/21-the-department.md) is the plan that discharges it**
  — its PR B widens `campusLifeScore` past the two rec-centre rungs, restores
  the weight, and adds the seventh legacy axis. The student-life half of this
  entry (clubs that stop counting once the social cap is reached) is NOT in
  Plan 21 and stays here.
- **The event table (the review's H4).** Five of fifteen events have a dominant
  choice; two more are decision-free at scale. Plan 15 re-scales the *capital*
  events to the building's own cost because it is moving the money scale under
  them, and does nothing else. Fixing the dominant choices, letting events touch
  prestige inputs through durable state (a scandal that costs a program its
  distinguished status for a year), and adding ten that read state the way
  `ad-shortage` does are all still open.
- **The campus map reading the simulation.** Pedestrians whose density is
  enrollment, a full-dorm glyph, a construction crane rather than a bar, night
  and season. Plan 14 gives the map its first mechanical *surface* — the hall
  panel — and no new visual reading at all, so a failing campus and a thriving
  one are still the same picture. Adjacency effects sit behind this deliberately:
  the review's argument was that the map should say something before it starts
  being read, and that argument still holds.
- **The review's cut list, minus what Plans 14–17 take.** *Taken*: the
  research-report-of-nothing (Plan 15's PR C demotes it to a toast), the seven
  school-hall Buildables and the save-migration chain (both gone — Plan 14
  landed). *Not taken*: the charter interrupt as a log line and a
  rename button; the duplicate dorm rungs; the dead `prize` row of
  `RESEARCH_OUTPUTS`; the three unauthored `BuildableEffects` fields
  (`tuitionBonus`, `applicantPoolBonus`, `unlockIds`) — author them or delete
  them; collapsing research and campus-life standing into inputs rather than
  separately-ranked axes; and simplifying athletics (one staff slot, one
  athletics event, the varsity petition as a tab action rather than a
  deterministic interrupt).
- **Faculty board usability (M5), and a person page.** Sort, filter, a "short"
  filter, and a page that narrates a career. The person page is half of what
  makes the faculty lifecycle worth having; it did not fit in Plan 14, whose
  faculty work is the drag-and-drop chips and the paid search.

## Direction, not plan

*Not sequenced, not estimated, and listed only so the work above is not designed
in a way that forecloses them.*

- ~~Camera rotation and tilt~~ — **delivered** as four quarter-turn views
  and three pitches (see [campus-map.md](docs/architecture/campus-map.md)'s
  "The camera"). A continuous camera was built and rejected: the motifs are
  drawn for the 2:1 pixel grid and shimmer off it. What is left is polish:
  a look at the stands from behind.
- Moving pedestrians.
- More README screenshots as the presentation work lands: the curriculum
  map, the faculty roster, a research run, and a late-game campus. The two
  in `docs/images/` are a founding campus and the summer decision.
- Sound and music.
- Art and presentation, after [Plan 18](docs/plans/18-the-look.md). The
  chrome is settled: one register (the school's own colours on cream, one
  outline ink, two faces, hard offsets — see `ui-shell.md`'s *The register*),
  applied to every tab, the dock, the interrupts and the startup screen.
  What is still open is not chrome: it is the campus map reading the
  simulation (the item above), and the physical-object idea for the tabs —
  treasury as a ledger, athletics on a clipboard — which the register neither
  rules out nor needs.
- School deans, a board of directors, a CFO, other executive positions. **Not
  delivered, but no longer hypothetical**: [Plan 08](docs/plans/08-athletics-rivals.md)
  hired an *athletic director*, and the shape it used is the one the rest would
  follow — a one-off interrupt offering three candidates who differ on a single
  axis, a person stored as a `Coach` rather than a new type, a department-wide
  effect, and a voice the department's own events speak in. An AD runs one
  department; a dean or a CFO would reach across several, which is the part that
  is still unanswered.
