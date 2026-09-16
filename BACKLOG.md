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

*Each of these is a plan's worth of work on its own, and none of them blocks any
other. Lifted from Plan 04, which is where they were first named. Turning one
into an ordered sequence of PRs is what writing the next plan does — Summer
admissions has been through that and shipped (Plan 05), and Admissions and
History has too (Plan 06, which declined the tab merge it proposed and built
the infographic in a renamed Enrollment tab instead). Neither is here any
more: what they changed is in `docs/design/admissions.md` now.*

### Startup screen
Drop public/private. Note what that now costs: Plan 05's PR E left the **public
tuition ceiling** ($22k) in force while raising the private one out of reach
($100k), precisely so this plan would not decide the school-type question on the
startup screen's behalf. A public school's cap is most of what it is, so
dropping the distinction means deciding what replaces it — the subsidy alone, or
nothing. Possible additions: a **motif set** chosen at founding
(classical — stone and columns; brutalist — concrete; modern — glass), which is a
large art commission and the reason this is deferred rather than hard; and
picking the mascot here rather than burying it in Athletics (which pairs with
Athletics V3's own mascot step, so these should land together or not at all).
Open question worth settling first: should the building on the startup screen
*be* Founders Hall? If yes, that is a change to one of the two. Plan 04's 4A has
since narrowed Founders Hall to 7x5, so whichever is chosen, the two are
already out of step and one of them has to move.

### Athletics V3
Better layout; a bigger coach pool reusing faculty headshots and the old
one-pool-tagged-by-need hiring UI (which is the right home for that pattern now
that faculty no longer uses it). The tab appears on the first team, then an
interrupt: hire an athletic director (three generated cards, salary the only real
differentiator), name the mascot. Per-sport standings and playoff tournaments
(needs per-sport rival strength — see Rival schools below). A mechanic that gives
the player a *reason* to build venues and hire coaches, e.g. periodic AD
interrupts naming a team without a coach. Championship interrupts. More sports:
Track & Field (the multi-sport field already carries a track), Rowing (a lake and
a boathouse, or no venue), Hockey (arena), Golf (probably too much ground).

### Rival schools
Prestige becomes more than one number — ranked separately by school, by social
life, by research. Expand to 99 rivals (100 schools including the player's). Show
rank outside the top 50 on the toolbar while keeping the U.S. News *interrupt* for
top-50 entry only. Each school needs a mascot, which is what ties this to
Athletics V3 — per-sport standings need per-sport rival strength, and that lives
here.

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
- **Athletics deferrals.** Match simulation and schedules (standings are one
  comparable strength number per school, not a simulated season), any prestige
  coupling, and a considered answer for what happens to a shared venue once its
  last team disbands.
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
- School deans, a board of directors, a CFO, other executive positions.
