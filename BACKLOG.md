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

*[Plan 70](docs/plans/70-launch.md) sequences the launch (PRs A–L). By the
owner's decision it takes none of the expansions below: faculty poaching,
the event table, the map reading the college, the budget and the admit
rate's early slope all wait until after launch.*

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

*The [second design review](docs/reviews/2026-09-design-review-ii.md) (September
2026, against Plan 21) confirms that order and sharpens why: the run is over at
about year 27 of fifty — rank #1 in year 13, every hall by 26, the catalogue by
28, prestige at its ceiling by 30 — and the cause is **system saturation, not
content exhaustion**: prestige caps, the athletics pot exceeds every cost,
satisfaction stabilises above every threshold (demands never fire on a competent
school), faculty never leave, the elite band cannot pass a standing leader, and
research becomes an income line (grants at 23% of lifetime opex against funding
at 9%). Its order: solve saturation in the defend era (faculty succession, a
band that can pass, needs that recur); measure the admissions curve before
retuning the economy (the probes say the seat ceiling gates years 1–5 and the
36% default costs years 8–15); make the athletics funded line bite; make grants
track funding before research is expanded as late content; show the three
standings as one profile; then demands as a late-game mechanism, per-major
identity, the notification policy, collapsible schools and the Faculty and
Athletics boards, and a map that reads population and time. It closes with the ten issues
ranked and the options for each laid side by side, with the choice among them
deferred to the next plan by decision.*

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
V3, [Plan 08](docs/plans/08-athletics-rivals.md) took it the other way — the
school named its teams when it hired its first athletic director — and
[Plan 21](docs/plans/21-the-department.md)'s PR O moved it earlier still, to the
first sport club: the first moment there is something that will wear the name,
two decades before the department. The founding screen would have asked before
a building stood.

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
should actually want" — see that PR's note. The old harness's `ADMIT_PROBES`
measured the gap (retired with it in Plan 63); a re-fit needs its own probe.

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
- **Research grants after the hosting rule.** [Plan 20](docs/plans/20-the-catalogue.md)'s
  PR B let every department lead work in its school's building, and a
  research-heavy school now runs deep projects where it used to fall back to
  pilots: on the Selective college, grants went from 3% of lifetime opex to
  6% by year twenty, 14% by year thirty and 22% at the fifty-year horizon
  (18% for the earnest completionist), against funding at 5–7%, so research
  at scale is net cash positive and the largest income line after tuition
  for a mature research school. `docs/design/research.md` draws the
  line at "a grant is a welcome cheque, not a funding round; it must never
  become a second economy". The re-fit is small and known —
  `GRANT_PER_PUBLICATION_CHANCE` and `GRANT_MIN_WEEKS`/`GRANT_MAX_WEEKS` in
  `researchData.ts`, or a cap on grants per facility per year — and wants
  the report's baseline re-recorded with it (`npm run sim -- --save`). Not done in Plan
  20 because that plan deliberately moved no research constant.
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
- **Athletics deferrals**, as [Plan 21](docs/plans/21-the-department.md)
  leaves them. **Match simulation and a schedule** are still deferred, and
  the line moved once, deliberately: Plan 08 added a year-end *bracket*, and
  Plan 21's PR N added **four dated occasions a year** with a record that
  accumulates — argued at the head of `systems/athletics/season.ts` as the
  minimum that produces a record and a rivalry. A fixture list, an opponent
  pool, a table and a simulated match are the maximum that produces nothing
  more, and stay unbuilt.
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

  **The department as a whole landed** in
  [Plan 21](docs/plans/21-the-department.md): its outputs are connected, it
  decides between its own programs against a pot that grows with its own gate,
  the market is scarce in good coaches rather than in coaches, and **rowing and
  golf stay declined** for the reasons already recorded. Water polo joined the
  natatorium; wrestling, gymnastics and cross country are held because the
  arena and the field already carry six and seven. **Disbanding a team**, and
  therefore what happens to a venue whose last team folds, is still unbuilt —
  the priority list's demotion makes it likelier to be asked and no easier to
  answer. A **school-wide budget and a CFO** were discussed there and kept
  out: a whole-game economy change found through athletics, gated on money
  actually being scarce.
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
- **Student life with teeth.** The review found athletics the best-built system
  in the game and the least connected — a venue that sells no tickets, a title
  that moves a standing nothing reads — and Plan 15 cut campus life's prestige
  weight from 12 to 8 **with a named condition**: it returns when these systems
  reach something. **[Plan 21](docs/plans/21-the-department.md) discharged the
  athletics half**: venues sell tickets and carry a campus-life contribution,
  a title reaches the applicant pool, the donors and the legacy's seventh axis,
  and the weight is back at 12. What stays here is the student-life half: a
  social bonus capped low enough that clubs stop counting once the cap is
  reached by mid-game.
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
- ~~More README screenshots as the presentation work lands~~ — **delivered**:
  the README carries the year-51 campus, the summer admissions card and one
  screen per tab, all re-shot from the same save through `npm run shot`'s
  `--tab`, `--click` and `--element` flags (see `unischool/tools/README.md`).
  What is left is re-shooting them as the presentation moves.
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
