# UniSchool — Backlog

*The work that has been named but not yet planned. Nothing here is sequenced
into PRs; turning one of these into a sequence is what writing the next plan
does (see `docs/plans/README.md` for how that is done and named).*

**This is the one forward-looking document in the repository.** The docs in
`docs/design/` and `docs/architecture/` describe the game as it is; the plans
in `docs/plans/` are closed records of work that has landed. If something is
going to happen but has not, it belongs here.

*Re-read against the code after Plan 70J (September 2026): what later plans
delivered came off, and what plans left open "for the owner" came on. The
last section lists what came off and where it went.*

---

## Awaiting the owner's triage: the October 2026 review (Plan 73)

*The review's findings are in
[`docs/reviews/2026-10-game-review/`](docs/reviews/2026-10-game-review/README.md).
The owner triages them, and what is accepted becomes Plan 74. This entry
comes off when Plan 74 is written.*

- **Fix first:**
  - two tabs on one save lose progress (G7-1);
  - the winter model is half a year off (G7-3);
  - the tag attrition point is previewed but never applied (G7-4);
  - the athletics axis is scaled twice (G7-5);
  - the stale hall price in the second-year letter (G7-14);
  - the committed `node_modules` symlink (G7-17a), already removed on the review branch.
- **The ten ranked improvements**, in the README's order:
  1. the first year explains itself;
  2. the move to school halls is unstuck;
  3. decisions stop happening unseen;
  4. the text is made true;
  5. the late game gets a worklist and a lever;
  6. a usable Curriculum;
  7. strategies that end in different colleges (a plan of its own);
  8. a fair Final Report;
  9. one way to write a number;
  10. a campus worth a screenshot.

---

## On hold from Plan 70: analytics (K) and launch (L)

*Held by the owner's decision (September 2026), after Plan 70's PRs A–J
landed. Both specs stay in [Plan 70](docs/plans/70-launch.md); they wait
here until they are picked up again.*

- **70K — analytics.** Not started. PostHog through `posthog-js`, in
  production builds only, memory persistence and no cookies, autocapture
  off; page views and six run events with no free text (`run_started`,
  `year_reached`, `run_finished`, `report_shared`, `save_exported` /
  `save_imported`, `crashed`); *Share anonymous play statistics* in
  Settings; two sentences in the Credits. **Needs the owner** to set
  `VITE_POSTHOG_KEY` in Vercel's production environment before it reports
  anything.
- **70L — launch.** Not started. The owner plays a full run on a fresh
  browser and a second session on a tablet, against a short checklist in
  `docs/reviews/` (the first hour, the first school, the first summer, a
  save exported and re-imported, a rank change, the Final Report, play
  again); small findings are fixed in the PR, larger ones come here. Then
  1.0.0: `package.json`, `LAUNCH_SAVE_VERSION` confirmed as the public
  build's, the README re-shot, and this file updated with what launch left
  for later. Depends on K only if analytics should ship with 1.0.

## Taken into Plan 72

*The owner answered the backlog's questions in September 2026;
[Plan 72](docs/plans/72-owners-answers.md) sequences what they said yes to:
the high-price line's targets reset, a first place that can be taken late,
a poached professor who actually leaves, the graduate course descriptions,
v2's residence types, the charter as a log line, the two unused building
effects removed, sort and filter on the Faculty tab, a full residence on
the map, and clubs with diminishing returns. The entries below keep only
what Plan 72 leaves.*

## Named, not sequenced

*Each is a real piece of work with a known shape; none has been turned into
a sequence of PRs.*

- **Faculty lifecycle: rival poaching and paid retention.** A departure the
  player did not choose, and money spent to prevent it. **This has gone
  backwards and is the most visible gap:** Plan 29 left poaching to the
  old `faculty-outside-offer` event and built only retirement; Plan 32
  retired that event, and its catalogue successor `star-poached` says a
  professor has an offer but, answered *Wish them well*, costs two points
  of mood and nobody leaves (the catalogue's effects cannot remove a
  person). Plan 72B makes that departure real; a retention offer and the
  rest of the lifecycle stay here. Their shape stands: the paid faculty
  search is what a retention offer would reuse, salaries scale with
  standing so a poach has a price, and the closing elite band gives a
  poacher a motive. The athletics side already works (`coach-poached`).
- **The admit rate's early slope.** `admitRate(prestige)` still seeds a
  founding college at about 36% (`admissionsSystem.ts`: ceiling 0.38,
  midpoint 100) where about 86% would suit a small school; the slider
  then opens at last year's rate. Plan 05's fit reproduced the old
  funnel's class sizes rather than the rate a player should want. A
  re-fit wants its own probe (the old `ADMIT_PROBES` went with Plan 63)
  and a pass of the scorecard after it. Deferred by Plan 70.
- **The split-school trap** ([Plan 65](docs/plans/65-natural-play.md)'s
  note for the owner). A school whose programs end up in two halls stays
  split: only the harness players merge one, and nothing in
  `techtree/schools.ts` or on screen offers the player a way to. Put to
  the owner with a proposed fix (suggest consolidating the split school
  when another has no hall and none is empty); waiting on the answer.
- **A school-wide budget, and a CFO to run it.** Most expense lines are
  still derived from what the college owns and enrolls, so underfunding
  can only have a consequence where there is a lever. The levers that
  exist: maintenance funding (backlog, condition, and the heating and roof
  events that read them, Plan 26), the endowment draw and borrowing (Plan
  27), the sweep (Plan 70D), research funding per initiative, and the
  athletics pot (Plan 21). Missing: instruction, student services and
  financial aid as low/adequate/generous levers with one visible
  consequence each, and a pot sized as a share of income, so that "spend
  now or compound the endowment" is the top-level dial. **A CFO is what
  stops it being tedious**, hired as the athletic director is, whose
  quality decides how good the auto-allocation is; the budget arrives
  pre-filled in the summer and the CFO flags exceptions. The only CFO
  today is the interim one at the bottom of the distress ladder. The
  precondition the old entry set, money that is actually scarce, now
  holds for the first half of a run (Plan 71).
- **The Faculty tab, and a person page.** The tab has roster and market
  views, *Show every field*, and per-department short and over flags; the
  order is fixed by teaching. Sort and filter are Plan 72F. Missing
  still: a page that narrates a career, which is half of what makes the
  faculty lifecycle worth having.
- **Per-major mechanical effects.** A cohort pull, a grant rate, a major
  that recruits differently. Today the pull is by category
  (`cohorts.ts`) and one tag (*artsy*) reads the arts. The content half
  landed in Plan 20, and the graduate courses' sentences are Plan 72C.
- **Events that reach further.** The catalogue has 154 events (134 inline,
  20 seismic), but their effects reach only cash, the endowment, debt, the
  maintenance backlog, mood, the board's confidence, alumni warmth, course
  quality, enrollment and trees. None reaches the faculty (see poaching),
  a prestige input through durable state (a scandal that costs a program
  its distinguished status for a year), or campus life. Nobody has
  audited the catalogue for dominant choices since it replaced the old
  table.
- **Athletics deferrals.** **Disbanding a team** is unbuilt, and so what
  happens to a venue whose last team folds is unanswered. **Match
  simulation and a fixture list** stay out by the argument at the head of
  `systems/athletics/season.ts`: three dated occasions and the postseason
  produce a record and a rivalry, and a schedule would produce nothing
  more. **Rowing** wants a lake, a lake is terrain, and the map has none;
  golf stays declined.
- **From Plan 70's "does not do":** unlocks that carry across runs, key
  rebinding, and more than one save slot.
- **From earlier plans' notes for the owner, partly answered:** a narrow
  college cannot choose which schools it founds (Plan 63; Plan 71's offers
  from started schools help); money piles up with nowhere to go late in a
  run (Plan 63; Plans 70D and 71 help); the guided line asks for a lab
  project when one can be started only about a third of the weeks (Plan
  58, not re-measured since).

## Direction, not plan

*Not sequenced, not estimated, and listed only so the work above is not
designed in a way that forecloses them.*

- **Physical-object tabs:** the treasury as a ledger, athletics on a
  clipboard. The register (`ui-shell.md`) neither rules them out nor needs
  them.
- **A board of directors as people**, and the executive seats beyond Plan
  28's (Provost, a Dean per school, Facilities, Dean of Students, VP of
  Advancement): a CFO above all (see the budget). The board acts today
  through its confidence and the distress ladder's letters.
- **The mix needs ears** (the merge review's §5, #4): the sound and the
  four state-switched music themes were built without a listening pass on
  real speakers.
- **Camera polish:** a look at the stands from behind.

## Taken off in September 2026

*Delivered or settled since the entries were written; each now lives in the
plan named and in `docs/design/` or `docs/architecture/`.*

- **Research grants after the hosting rule:** re-fitted per depth in Plan
  70D (`GRANT_DEPTH_SCALE`), now about 2× their cost and inside the
  scorecard's band.
- **A richer demand curve:** the frontier bites now, with price tolerance
  rising with prestige, an overreach penalty, a crowding factor and an
  applicant trickle (Plan 71). Prestige and scale archetypes were not
  built, and nothing asks for them.
- **Campus map feedback:** beauty feeding the pool and prestige, and capped
  pairing bumps (Plan 26).
- **More authored events:** the catalogue (Plan 32), three tellings each
  for the frequent ones (Plan 70I). What is left is reach, above.
- **The old event table (H4):** replaced by the catalogue (Plan 32).
- **The tutorial:** the opening walkthrough, the board's letters, the
  school letters and the next-step line (Plans 16, 55, 58).
- **The startup screen and the mascot:** Plans 07, 08 and 21.
- **The dead `prize` row:** deleted with its table (Plan 22C).
- **Research and campus life as inputs rather than ranked axes, and a
  simpler athletics:** declined in effect; Plan 31 made six standings and
  Plan 21 built the department out.
- **Camera rotation and tilt, moving pedestrians, the README screenshots,
  sound and music:** Plans 24, 34, 37, 38, 44, 48, 62, 64 and 70H.
- **The consistency review's questions:** all sixteen answered (Plans
  46–51, 59, 70C).
- **The quiet founding years, and night and seasons on the map:** declined
  by the owner (September 2026). The founding years are the tutorial by
  design, with the board's letters and Plan 70I's notes.
- **The rest of the map reading the college:** walkers by enrollment, the
  crane, labs at work, crowds, banners and weathering are built; a full
  residence's mark is Plan 72G.
