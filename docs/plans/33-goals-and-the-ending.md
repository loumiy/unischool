# Plan 33 — Goals and the ending

*Planning document only. Its job is to turn Phase L of the v2 merge (goals
and the ending, `loumiy/unischool-v2`'s `docs/MIGRATION_PLAN.md`) into a
sequence of PRs.*

**Status: In progress.**

---

## 0. The finding

This game's goals are nineteen achievements that gate and grant nothing,
and its ending is the legacy: seven graded axes sealed at the fiftieth
summer, with four charts and the founder's figures. v2 has promises the
president makes and is held to, capital projects that lift a standing, a
chronicle that names the run's eras, a Final Report graded over the whole
arc, an Epilogue, and a hall of fame. The owner's decisions (v2's
`docs/V1_ADOPTION_LIST.md`):

| # | Decision |
| --- | --- |
| V2 #25, V1-27 | Ambitions: public promises with a deadline, a reward and a penalty. They replace this game's achievements. |
| V2 #26 | Decade ambitions: once a decade, choose one or two promises from a short list. |
| V2 #27, V1-24 | Capital projects: big, slow builds that lift a league standing, payable half from the endowment, with athletic facilities, a real stadium and a later tier. The late tier is paired with the defend era. |
| V1-1 | The summer: one stop, as now. The Standing beat goes; Admissions and the Students digest stay; Review is rebuilt from v2's material. |
| V2 #53 | The chronicle: the run written as eras named from what happened. |
| V2 #54, V1-28 | The Final Report replaces the legacy. |
| V2 #55 | The Epilogue: play on, with a chronicle addendum every ten years. |
| V2 #56, V1-35 | The hall of fame on the title screen, with no unlockable palettes. |

Two things this game lacks shape every PR:

- **v2 reads everything off a permanent journal. This game has none.**
  Its log is capped at 200 lines. What it keeps for good is the history
  row per year and a few per-system records (`builtYear`, titles,
  campaigns closed, the alumni ledger, the ladder).
- **v2's promises are dealt at Convocation and at a Board Meeting.** This
  game's one annual stop is the summer.

## Rules for this plan

- **The history row is the journal.** Each year's row gains what the
  chronicle and the report need and cannot rebuild:
  - the six standings' values (today it keeps their ranks);
  - the letters answered;
  - the tags earned and shed;
  - the promises settled.

  Additive optional fields: an old save's early years simply lack them,
  and every reader copes.
- **Promises live in the summer.** The Review beat looks back and ahead:
  the promises that came due are settled there, and the year's offer is
  made there. The decade's list comes at the summers of Years 10, 20, 30
  and 40, which close each decade as v2's Board Meetings open the next.
- **Neutral by default.** Declining a promise is free, and the harness
  declines. The harness never builds a capital project. The ending
  changes what the fiftieth summer shows, not what the run does.
- **The words are data** (`data/`), as the catalogue's are.

## PR 33A — The plan

This document.

## PR 33B — The journal

- **`YearSnapshot` gains** `standingValues` (the six, on this game's
  150-point scale), `letters` (catalogue ids answered), `tagsEarned`,
  `tagsShed` and `promises` (settled: id and kept). All optional.
- **`identity` records the year each tag was earned,** and the rival
  record the year it was named.

**As implemented:** only the six standings' values and the endowment go on
the history row. The rest are kept by the systems that make them, each an
optional, append-only record:
- the identity's `log` (every tag earned or shed, with its year);
- the rival's `since`;
- the catalogue's `letters` (every letter answered, with the answer) and
  `answered` (each year's inline events, counted by who answered them:
  the player, a seat or the clock);
- the promises' own settled and declined lists (PR C).

## PR 33C — Promises

- **v2's 26 ambitions, as data** (`data/promiseData.ts`). Each has an
  offer condition, a goal, a deadline in years, a reward, a penalty and
  its words. It reads v2's conditions through the catalogue's interpreter
  (Plan 32), which gains the few ceiling readings it lacks (`debtUnder`,
  `rungAtMost`, `backlogUnder`, `projectsOver`). Money is scaled as the
  catalogue's is.
- **At each summer's Review beat:**
  - promises that came due are settled, kept or missed, and paid;
  - if fewer than three are open, one may be offered (v2's 45%); the
    player accepts or declines, and declining is free.
- **In the decade's last summer** (Years 10, 20, 30, 40) the offer is
  instead a list of three, of which the player takes up to two.
- **The achievements are retired** (`ambitionsData.ts`,
  `systems/ambitions/`, and the History tab's panel), and History shows
  the promises: open, kept and missed.

**As implemented:**
- **v2's first promise** named its founding charter, which this game does
  not have. It is retargeted at four schools.
- **Offers are drawn from a hash** of the college and the year, never the
  run's random stream. A run that declines everything (the harness) is the
  run it would have been.
- **Offers wait until Year 3,** as the catalogue's events do.
- **A declined promise rests four years** before it is asked again. v2
  asked the same one summer after summer.
- **No promise is offered once the run has formally ended** at the
  fiftieth summer. Those already made still come due.
- **The promises open from the reducer,** after `tickAdmissions`. Hooking
  them into the admissions system closed an import cycle through the
  catalogue.
- **The endpoint suite's achievements claim is retired** with the
  achievements.

## PR 33D — Capital projects

- **A project is a Buildable** with a year it opens from, the standings
  it lifts, and one to a campus. Its lift is scaled by its condition.
- **It can be paid half from the endowment** (a fourth way to pay, after
  cash, a loan and a gift). This works while half the endowment covers
  the price.
- **The set:**
  - v2's five: the research park, the medical school, the great lawn, the
    championship stadium and the arts center. The stadium is the real
    one; this game's football stadium stays as the smaller venue.
  - The graduate halls: a graduate college, from Year 20, with a
    graduate program running. It houses graduate students and lifts
    academics.
  - **The late tier,** opening with the defend era (Year 35 and prestige
    100, the elite band's own gates) or at Year 40, whichever is first:
    an institute for advanced study, a university museum, and a great
    commons.
- **Each is drawn** from the existing motifs, larger than anything else
  on campus.
- **The catalogue's `needs`** read the real projects where one exists.

**As implemented:**
- **The lifts are v2's points on this game's standings:** a "Capital
  projects" line in the academic, research and campus-life breakdowns,
  shown once one stands; athletics adds to program strength.
- **The graduate college** is residential: its beds add to capacity.
- **The championship stadium** is now the largest footprint on campus,
  and the building-spec test says so.
- **Each is drawn in an existing motif** (a block, a portico, works, a
  bowl, open ground). Bespoke art is Phase M's.
- **The catalogue's `needs`** accept the project beside the nearest thing
  this game had, so the harness, which never builds one, draws as it did.

## PR 33E — The summer

- **The Standing beat goes.** The summer is Review, Admissions, Students.
  The annual report's figures stay in History's standings and the ranking
  reveal stays its own moment (V1-33).
- **Review is rebuilt:**
  - the year's events: the letters answered, and how many inline events
    the president, the seats and the clock each answered;
  - the class that graduated, its memory and its warmth;
  - the era the chronicle has the college in;
  - the promises: settled, open, and the year's offer.

  The built, people, research and money sections stay.
- **The save migrates** a summer paused on the old Standing beat.

**As implemented:** there is no migration: `SAVE_VERSION` goes to 72, which
by this game's policy discards older saves (docs/architecture/game-state.md).
Review also names the era the chronicle has the college in (PR F).

## PR 33F — The chronicle

- **v2's chronicle** (`systems/chronicle/`), read from the history rows
  and the per-system records. Each year gets a kind:
  - founding, receivership, troubles, campaign, rivalry, building, rise,
    decline, golden or quiet.

  Runs of years become eras, and each era is named from v2's templates
  and summarised: what was built, the rank, the money, the classes, the
  troubles, the titles, the tags, the rival, and the promises kept and
  missed.
- **The ladder gives each era its firsts.**
- **History gets The Chronicle.**

**As implemented:**
- **Each history row keeps the endowment,** for the money line.
- **v2's distinguished alumni and demolitions are left out;** this game
  has neither.
- **The rival's saga** is its name and year, the series record in the main
  sport, and where the two stand now.
- **Money now reads in billions** where it runs to them.

## PR 33G — The Final Report

- **In place of the legacy, at the fiftieth summer's Review:**
  - each of the six standings graded over the run: the first decade's
    average, the last's, the mean and the climb;
  - a mark over them all, with the final rank and the promises kept;
  - a title built from the tags, and naming the weakest standing where
    one lags;
  - the money verdict;
  - the eras;
  - the guide's last word;
  - a campus portrait;
  - the six standings charted over the fifty years.
- **`University.legacy` is retired** for an `ending` record: the report,
  whether the Epilogue has begun, and its addenda. The harness and the
  endpoint suite read the report's grades where they read the legacy's.

**As implemented:**
- **The legacy's reading moves to `sim/legacyReading.ts`** rather than
  being deleted. The endpoint suite's strategies were designed against its
  axes (a selective college's teaching, a regional engine's reach), and the
  report's six standings do not separate them. The harness takes the
  reading at the fiftieth summer, from the state the game's seal read. The
  suite now also requires every run to write its report. Phase N decides
  whether the endpoint claims move to the report's terms.
- **The campus portrait** is the college's own facade, drawn as the title
  screen draws it (PR I). A picture of the campus map is Phase M's.
- **The six standings are charted one to a panel,** with this game's
  single-series chart.

## PR 33H — The Epilogue

- **After the report, play on.** Every tenth year after the fiftieth, the
  chronicle writes an addendum for the decade, shown in History.
- **Nothing new unlocks.**

**As implemented:** the addendum is written at the summer that closes each
tenth year (60, 70, …), after the year's history row, for the ten years it
closes.

## PR 33I — The hall of fame

- **A finished run hangs on the title screen:** a framed portrait with a
  plaque (the name, the mark, the grades and the title), and its
  chronicle to read.
- **Kept in its own storage key** beside the save, a dozen runs at most.
- **No palettes are unlocked by it** (V1-35).

**As implemented:**
- **Leaving the Final Report hangs the run,** never twice.
- **The portrait** is the college's facade in its architecture, colors
  and name.
- **A frame opens** onto the title, the six grades and the chronicle.

## What this plan does not do

- **Named students** (v2's distinguished alumni) and **demolition** have
  no home in this game, and the chronicle does without them.
- **Balance.** The harness declines promises and builds no projects, so
  its bands should not move beyond the summer's changed beat count. What
  the projects and promises do to a real player's run is Phase N's to
  measure.
