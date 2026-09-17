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
order for what comes next. Plans 09 (the playtest harness), 10 (growth has
a cost), 11 (academic halls), 12 (the year) and 13 (the endpoint) are written
and `Proposed`, in that order of dependency. What comes after them — the
faculty lifecycle, research that reaches the world, student-life asks,
athletics' reach, pedestrians — is in the review's roadmap and not yet
planned.*

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
Mission or Brutalist — and the founding facade is Founders Hall, drawn in the
set the player is choosing. What that changed is in
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

- **Research doctorates for the four newest research schools.** Every school
  with majors now has a facility, so the `researchSchools()` gate would admit
  more doctorates than the three that were authored — the programs themselves
  are content that does not exist yet. See
  `docs/design/graduate-programs.md`.
- **Faculty lifecycle: rival poaching and paid retention.** A departure the
  player did not choose, and money spent to prevent it. The downstream chain (a
  department left understaffed, its courses without an instructor) already
  exists, reached through the player's own dismissals and research commitments.
  Aging and retirement remain optional.
- **A richer demand-curve finance model**, where prestige shifts the frontier
  between tuition and enrollment volume, with prestige/scale archetypes. The
  finances are structured so this can replace the simple version without
  touching the rest of the system.
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
- **The tutorial**: a scripted interrupt sequence walking the Year-0 opening —
  develop the gen-ed core, hire faculty — and handing off to Summer Year 1.

## Direction, not plan

*Not sequenced, not estimated, and listed only so the work above is not designed
in a way that forecloses them.*

- Camera rotation and tilt — worth noting that `isoProjection.ts` derives
  everything from one projection, so this is less far-fetched than it sounds.
- Moving pedestrians.
- More README screenshots as the presentation work lands: the curriculum
  map, the faculty roster, a research run, and a late-game campus. The two
  in `docs/images/` are a founding campus and the summer decision.
- Sound and music.
- Menu styling as physical objects — treasury as a ledger, athletics on a
  clipboard, curriculum on a chalkboard. (Plan 04's 1C made every tab a full
  screen, which is the canvas this needs — so the canvas exists.)
- School deans, a board of directors, a CFO, other executive positions. **Not
  delivered, but no longer hypothetical**: [Plan 08](docs/plans/08-athletics-rivals.md)
  hired an *athletic director*, and the shape it used is the one the rest would
  follow — a one-off interrupt offering three candidates who differ on a single
  axis, a person stored as a `Coach` rather than a new type, a department-wide
  effect, and a voice the department's own events speak in. An AD runs one
  department; a dean or a CFO would reach across several, which is the part that
  is still unanswered.
