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

*Each of these is a plan's worth of work on its own. None of them blocks any
other, and none has been sequenced into PRs yet — that is what writing the next
plan does. Lifted from Plan 04, which is where they were first named.*

### Startup screen
Drop public/private. Possible additions: a **motif set** chosen at founding
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

The summer interrupt now shows cohort head counts for the *incoming* pool (see
README's "Admissions cohorts"), which is one year's applicants — not the same
thing as the standing body, where four admitted classes are layered on top of
each other. Showing the enrolled mix means either storing each class's cohort
split at admission or reconstructing it, and that is the real decision this
feature has to make.

### Summer admissions
The largest single redesign in the notes, and a genuine rework of a decision the
game already has:
- Far less text on screen.
- **Tuition is a gamble.** The slider tells you only whether you are in line with
  your prestige. No applicant interest, no sticker shock, no stated cap (the cap
  is where the slider ends; raise it to $100k). Setting it locks it.
- **The reveal** is a slow tick up to the applicant count — slower than any other
  number animation in the game, because it is the payoff. It breaks the total
  down **by cohort, as head counts** — how many research-minded applicants, how
  many athletes — never as percentages or multipliers. The decision panel
  already does this (`cohorts.ts`'s `cohortBreakdown` returns whole applicants
  that sum to the pool); the reveal is where the same numbers get their
  moment.
- **Admit rate is the second decision**, and its consequences are visible before
  commitment: moving the slider moves the freshman class size (yield goes away),
  and the panel projects weekly profit/loss and satisfaction against current
  capacity — *including the three older classes who are still enrolled*.
- **Scholarships go away** — one rate.
- **The tuition exploit closes**: tuition is set per *class* and follows that
  class to graduation, rather than repricing everyone retroactively.

Note that the last item is a real model change — `finance.tuitionPerStudent` is a
single scalar today, read by finance, the demand system, the tech tree's
`tuitionBonus` and Treasury, and per-class pricing means it becomes four prices
carried on `students.classes` and advanced with it every summer (see
`reducer.ts`'s `RESOLVE_ADMISSIONS`, which already shifts those four counts a
year).

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
