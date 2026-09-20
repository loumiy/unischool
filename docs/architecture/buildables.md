# Buildables

The single most important structural idea in this codebase is that **courses,
academic buildings, dormitories, campus-life facilities, and varsity athletics
venues are all the same kind of thing** — a *Buildable*. A Buildable is
anything the player pays for and then waits weeks for. They differ only in
their data, not their machinery.

Every Buildable has:

- a **`kind`** — `course`, `building`, `dorm`, `facility`. Athletics venues are
  `facility`-kind, reveal-gated, like everything else in that list — there is
  no separate `sports` kind. The `building` kind is the **academic halls**:
  Founders Hall and the eleven-hall chain, each carrying `slots` — the six
  program slots a hall holds (Founders Hall's first three hold the founding
  programs from day one — see `data/foundingData.ts`). There is no
  school building: a school is founded by filling a hall (see
  [curriculum.md](../design/curriculum.md)).
- a **`cost`** — money spent up front, at the moment development starts.
- a **`duration`** — weeks of development.
- **`prereqs`** — other Buildable ids that must be `done` first. Prereqs may
  **cross majors and cross kinds**: a course can require a building; a course can
  require a course from another school; a facility can require a dorm. Prereqs
  are authored data, not derived from tier.
- optional **`requiresFaculty`** — a faculty field that must be present on the
  roster before development can start (e.g. Microeconomics needs an Economics
  faculty member). This gates *starting*, not completion.
- a **`status`** — `locked` → `available` → `developing` → `done`.
- **`effects`** — applied once, on completion. Effects can grant capacity,
  tuition headroom, satisfaction, applicant-pool bumps, and can **unlock
  other Buildables**. Effects do **not** grant reputation directly — prestige is a slow-moving stock
  computed and drifted toward separately (see
  [progression.md](../design/progression.md)), not a sum of completion
  bonuses.

Beside `prereqs`, a Buildable may carry **dynamic gates** re-checked every
tick (`techSystem.ts`'s `meetsUnlockGates`): a population or prestige floor,
a graduate program's academic gate, an athletics venue's reveal, a lab's
`schoolGate` (the school founded), and — on every course of a major or
graduate program — **the housed gate**: the program must hold a hall slot.
That last one is what makes founding a program from a hall the only way its
entry course ever starts.

This means one develop/build flow, one prereq resolver, one completion-effects
applier, serve all content types. **Do not build parallel subsystems for
buildings, dorms, or campus-life/athletics facilities.** Add content and, where
a genuinely new rule is needed, extend the shared Buildable model — never fork
it.

### Courses and buildings share one flow

Every Buildable goes through the same develop/build gate — cost, duration,
prereqs, `canStartDevelopment` — regardless of `kind`. Where that affordance is
*drawn*, and exactly how it's initiated, differs by whether the Buildable is
placeable:

- `course` Buildables live in the Curriculum overlay and start through the
  `START_DEVELOPMENT` action: pick one, pay the cost, choose who teaches it,
  watch the countdown. No location, ever — a course is not a place. The one
  exception is a program's **entry course**, which starts only through
  `FOUND_PROGRAM` — a slot in a hall, the course, and its instructor in one
  transaction — from the hall's own panel on the map.
- Placeable kinds (`building`/`dorm`/`facility` — athletics venues included)
  live in the build menu beside the map, because the map is where they stand.
  **Placement IS how a placeable Buildable starts**, through the
  `PLACE_BUILDABLE` action: pick one from the build menu, then click (or drag)
  an empty footprint on the map — that single action passes the same
  `canStartDevelopment` gate a course uses, charges the cost, starts the
  countdown, AND writes the chosen location into `placements`, all at once.
  There is no second, later placement step, and no "awaiting siting" tray of
  finished-but-unplaced buildings: a placeable Buildable is never `developing`
  without also being in `placements`, so it renders under construction right
  where it was put down, and its tiles are reserved from week one — nothing
  else can be sited on top of it until it finishes.

  One narrow exception: a Buildable that starts already `'done'` at founding
  (the starting dorm, the founding dining hall, Founders Hall — see
  `actions.ts`'s `placeFoundingBuildables`) is auto-sited the moment a new
  game is created, via a plain top-left `firstFreeSpot` scan — there is no
  player choice to preserve at that instant, so there's nothing to ask about.
  If that scan ever finds no room (or an old save predates it), the
  Buildable stays `'done'` with no location. Since nothing else in the build
  menu can ever revive a `'done'`-but-unplaced row, `campusMap.ts`'s
  `needsSiting`/`canSiteRetroactively` offer exactly that one as a "site →"
  row for a small flat `RETROACTIVE_SITING_COST` instead of the Buildable's
  own (already-paid) cost — a location to mark, not a build to start.

Placement lives in a separate `placements` record on `GameState` (id ->
`{ row, col, w, h }`: the top-left tile plus the footprint covered from it),
never as a field on `Buildable`, so the single Buildable model stays unforked
and `course` Buildables — which are never placeable, at any status — never
carry a `placements` entry. A hall's **slots** are the same shape of fact and
live the same way, in `halls` (id -> its slots, positional), written the week
the hall finishes; unlike `placements`, `halls` *is* read by systems — see
[game-state.md](game-state.md). How big a footprint a Buildable gets is a
**placement rule, not data on the Buildable** — it lives in `campusMap.ts`'s
`footprintOf`, and is documented in [campus-map.md](campus-map.md).

Placement itself grants nothing beyond what `START_DEVELOPMENT` always granted
a course: a placed-but-`developing` building contributes nothing until it's
`done`, exactly like an undeveloped course. Keep both screens dumb.

There is **one exception**, and it is about a building being EXTENDED rather
than built. The tier-1 library is renovated by adding a floor to the building
already standing — the same node goes back to `'developing'` at its existing
spot (see `RENOVATE_LIBRARY`) — and the floors that already exist keep
working: the node records what it was serving before the work started
(`Buildable.renovatingFrom`) and the satisfaction sums read that, through
`types.ts`'s `servingPopulation`. Otherwise adding a fourth floor first took
three away for six months, and a school could watch its academic score fall
for a year and read the renovation as the cause. The map agrees: such a
building is drawn at the height of the floors it has, with the scaffold
rising off its finished roof rather than off the grass.
