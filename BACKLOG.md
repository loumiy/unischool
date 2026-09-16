# UniSchool — Backlog

*The work that has been named but not yet planned. Nothing here is sequenced
into PRs; turning one of these into a sequence is what writing the next plan
does (see `docs/plans/README.md` for how that is done and named).*

**This is the one forward-looking document in the repository.** `README.md`
describes the game as it is; the plans in `docs/plans/` are closed records of
work that has landed. If something is going to happen but has not, it belongs
here.

---

## Sequenced enough to start

*Each of these is a plan's worth of work on its own, and none of them blocks any
other. Lifted from Plan 04, which is where they were first named. Turning one
into an ordered sequence of PRs is what writing the next plan does — Summer
admissions has been through that and shipped (Plan 05), which is why it is no
longer here: what it changed is in `README.md` now.*

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

### Admissions and History
Admissions has no gameplay in it; folding it into History is plausible. The
content that would justify either tab is the same: the student body has
**classes** (freshman → senior) *and* **cohorts** (research-minded, athletes,
…), and only the first is displayed, as a single line of four counts. An
infographic view of who actually attends this university is the feature; which
tab it lives in is a consequence of building it.

The summer reveal now shows cohort head counts for the *incoming* pool (see
README's "Admissions cohorts"), which is one year's applicants — not the same
thing as the standing body, where four admitted classes are layered on top of
each other. Showing the enrolled mix means either storing each class's cohort
split at admission or reconstructing it, and that is the real decision this
feature has to make. Plan 05 established the pattern for the first option:
`finance.tuitionByClass` already carries a per-class fact alongside the classes
and advances with them.

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

## Direction, not plan

*Not sequenced, not estimated, and listed only so the work above is not designed
in a way that forecloses them.*

- Camera rotation and tilt — worth noting that `isoProjection.ts` derives
  everything from one projection, so this is less far-fetched than it sounds.
- Moving pedestrians.
- Tutorial dialogue.
- Sound and music.
- Menu styling as physical objects — treasury as a ledger, athletics on a
  clipboard, curriculum on a chalkboard. (Plan 04's 1C made every tab a full
  screen, which is the canvas this needs — so the canvas exists.)
- School deans, a board of directors, a CFO, other executive positions.
