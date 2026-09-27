# Plan 73 — A full review of the game

*Planning document only. Its job is to turn the owner's brief into a review
that can be done, checked and acted on.*

**Status: In progress.** A has landed; B onward are on `claude/plan-73-rqmosd`, one commit per PR, as each area is written.

---

## 0. The brief

The owner asked for a thorough review in seven areas:

1. **Campus and asset aesthetics.** Realistic campus buildings,
   recognizable vernaculars, missing detail, form following function,
   repeated assets, pathways in every arrangement, obstructed doors,
   clipping, and decorative assets worth adding.
2. **UI and text.** Enough to teach a new player; too much, and where;
   consistent fonts, styles and buttons; one voice; course descriptions
   true to their courses; flavor text that promises a mechanic that does
   not exist; which screens earn their place and which do not.
3. **Intuitive gameplay.** Does the game teach itself; can a player work
   out how to solve a problem (raise prestige, why a course cannot be
   developed, why basic needs is low); what does not make sense; and is
   the College-then-University charter sensible or odd?
4. **Strategy.** Playthroughs apart from the existing harness, with
   different and adaptable goals: revenue, prestige, satisfaction, every
   campus asset, championships, good-then-big against big-then-good. For
   each, where control runs out, and where it is too easy, tedious or
   repetitive.
5. **The critical improvements,** drawn from 2, 3 and 4.
6. **Marketability,** as a studio would judge it: the niche, the
   competitors, what would stop it earning, how to market it, a release
   timeline, a price, and the growing anti-AI sentiment among indie
   players and how to navigate it.
7. **Bugs.**

## 1. Ground rules

- **What is reviewed.** `main` once Plan 72 has landed (its G–K are in
  flight). The review records the commit it read, as every review here
  does, and reads the game a player would get: the production build, at
  desktop (1440×900) and phone (390×844) sizes.
- **A review, not a fix.** Nothing in the game changes in this plan. Each
  finding is written down with its evidence and a proposed fix. The
  owner triages the findings, and the fixes become Plan 74 onward. A bug
  that corrupts saves or crashes the game is the one exception: it is
  reported to the owner the day it is found.
- **Every finding the same shape:** what, where (a screenshot, a save
  or scenario, a file and line), why it matters, a proposed fix, and two
  labels:
  - **Severity:** *blocker* (breaks a run or a save), *major* (a player
    will notice and be hurt by it), *minor* (noticeable, harmless),
    *polish*.
  - **Effort:** *S* (an hour), *M* (a PR), *L* (a plan).
- **Evidence before opinion.** An aesthetic or feel judgment names what it
  was judged against: a real campus building or a published style
  reference for the art, a named screen and step for the UI, a logged run
  for strategy. A market claim cites its source.
- **The limits, stated.** The reviewer is not a human player: "tedious"
  and "compelling" are judged from what a run asks of the player
  (decisions per year, idle weeks, repeated actions, words per screen)
  and from hands-on sessions in the browser, and are reported as such.
  The owner's own playtest (70L, on hold) remains the test these
  findings cannot replace.
- **Where it lands.** `docs/reviews/2026-10-game-review/`: a `README.md`
  with the executive summary and the ranked list (area 5), one file per
  area, the screenshots beside them, and the bug list with a repro each.
  Findings the owner accepts go to `BACKLOG.md` or straight into Plan 74.

## 2. The tools

Most of what the review needs exists; four small tools are added, all
under `tools/`, none imported by the game.

| Tool | Exists | Used for |
|---|---|---|
| `npm run sheet` / `sheet:shot` | yes | every placeable asset alone, per vernacular and camera (area 1) |
| `npm run scenario`, `tools/layout.ts` | yes | saves at any year, laid out like a real campus (1, 2, 3) |
| `npm run shot` | yes | map and tab screenshots, any size, zoom, tab or modal step (1, 2) |
| `npm run phone`, `tools/touchCheck.mjs` | yes | phone and touch sweeps (2, 7) |
| `npm run newplayer` | yes | a scripted first year through the UI, with stalls logged (3) |
| `npm run sim`, `npm run natural` | yes | the existing players, for comparison only (4) |
| **`tools/review/arrangements.ts`** | new | test campuses: paths in straight, T, cross, diagonal, curved, dead-end, looped and crowded arrangements, and buildings packed against each other and against trees, in every vernacular and all four views (1) |
| **`tools/review/doorsAndDepth.ts`** | new | a checker, not a picture: every door is tested against neighbouring footprints, trees, props and paths (reachable and unobscured), and every pair of overlapping sprites against `depthSort`'s order, over the arrangement campuses and three year-50 scenario campuses, so clipping and blocked doors are found by rule and then looked at (1, 7) |
| **`tools/review/strings.ts`** | new | every player-facing string, pulled from `src/data/` and the components into one table with where it appears, its word count and a screen tag, so voice, jargon, repetition and per-screen load can be read and counted (2) |
| **`tools/review/goalPlayers.ts`** | new | the strategy players of area 4 (below), each with a goal, a logged reason for every decision, and a record of every moment it wanted something the game would not let it do (4) |

**As implemented** (PR B):
- The four tools are in `tools/review/`, run through `npm run review:*`
  (`tools/README.md`, "Reviewing the whole game"). Four more were needed on
  the way:
  - `shootViews.mjs` photographs a save from all four corners.
  - `drive.mjs` plays the running game a few steps at a time from a kept
    browser profile. The hands-on sessions of areas 2, 3 and 7 were played
    with it.
  - `probes.ts` prints the small tables area 1 quotes: how much of a
    campus the vernacular restyles, weathering bands, the catalogue by
    motif, and the estate's backlog over fifty years.
  - `sheet.tsx` gained `--every`, which draws every placeable, each
    school's signature hall, each venue at each expansion, and one site per
    motif. The file names carry the camera, so several sheets can share a
    folder.
- The door checker ran over 63 saves, not the arrangements plus three
  year-50 campuses: 60 arrangement saves, the laid-out `all` and `guided50`
  campuses, and `natural50` as played. `tools/layout.ts` cannot lay out
  `natural50`, whose extended buildings have outgrown their footprints.
- The goal players ran 70 games: seven goals, five seeds and two names,
  fifty years each. That took 15 minutes on the container's cores.
- `npm run newplayer` no longer works. It waits for the founding form, but
  the title screen now comes first (`tools/newPlayer.mjs:48`). The
  new-player session was played by hand with `drive.mjs` instead, and the
  tool is listed in area 7.

## 3. The areas

### Area 1 — Campus and asset aesthetics

**Method.**
- **Every asset, alone.** Contact sheets of every placeable Buildable in
  the five vernaculars, at four views and two pitches. Each asset is
  judged against real campus precedent: is this what a residence hall, a
  lab, a natatorium or a chapel looks like, and does its form say its
  function (an arena reads as an arena, a lab as a lab)?
- **Each vernacular as a style.** Each is read against the style it
  claims, using published references (Georgian, Collegiate Gothic,
  Classical/Beaux-Arts, Mission Revival, Modern). The checks:
  proportions, roof forms, openings, materials, and the tell-tale
  details a player would recognize (quoins and fanlights, pointed arches
  and crenellation, porticoes and domes, arcades and clay tile, ribbon
  windows and flat roofs). The review lists what each is missing.
- **Repetition.** Every motif, entrance part, roof part, window treatment
  and prop is counted by where it recurs across the catalogue, as the
  garden and the Grand Quad did (Plan 72K), and the Fountain and
  Founder's Statue are known to. The review then flags what reads as a
  copy on one screen.
- **Pathways** on the arrangement campuses, in all four views: joints,
  crossings, curves, dead ends, paths meeting doors, and paths under and
  around props.
- **Doors and clipping.** Run by the checker first; every hit is then
  looked at on the map. Walkers are included (Plans 42, 48, 62), and so
  are construction sites and cranes.
- **Decorative assets worth adding:** a list, each with what it would
  add, a sketch of how it fits the drawing system, and what it would
  cost. Candidates to test include benches, lamps, bike racks, a
  bandstand, sculpture, walls and gates, a clock, signage, parking, a
  boathouse and water.

**Deliverable:** `1-aesthetics.md`, with contact sheets and annotated
crops, a finding per defect, and the decorative list ranked.

**As implemented** (PR C): `docs/reviews/2026-10-game-review/1-aesthetics.md`,
with nine images in `img/`.
- Ten findings: six major, four minor. None is a blocker.
- The contact sheets were drawn from two cameras (45° and 225°) at the
  opening pitch, not four views at two pitches. The four views came from
  the arrangement photographs, which show every asset in context anyway.
- Two findings reach beyond looks:
  - A1-6: most of a grown campus ends derelict at full maintenance
    funding, because event backlog compounds and nothing but a renovation
    pays it down.
  - A1-1: the vernacular restyles only about half of a year-50 campus.

  Both go to areas 3 and 7 as well.
- A September review of the map's assets
  (`2026-09-map-assets-visual-review.md`) had already rebuilt the venues,
  sheds and roofs, so this one covers what that review did not:
  - how a grown campus looks;
  - the school signature halls;
  - the grand landmarks;
  - the venue stages;
  - doors.

### Area 2 — UI and text

**Method.**
- **Every screen, captured.** Every tab, drawer, panel, modal, summer
  beat, letter, event, toast, the title screen and the Final Report, at
  desktop and phone size. Each capture is tagged with its word count and
  the number of controls on it.
- **Consistency.** Fonts, sizes, weights, colors, button styles, icon
  use, capitalization, number and date formats and spacing, checked
  against the register (`ui-shell.md`) and Plan 47's conventions. Every
  departure is listed.
- **Voice.** The string table read end to end for one voice: a senior
  administrator's dry, specific prose, American spelling, no in-jokes
  that break the frame. Outliers are quoted.
- **Course descriptions.** All 378 undergraduate and 53 graduate
  sentences, read by field against what a real course of that title
  covers. The checks: accuracy, the level (a 100-level course should not
  read like a seminar), and each sentence saying something its title
  does not. Split by school so each field gets a careful reader.
- **Flavor that implies mechanics.** Every line of flavor text (events,
  letters, blurbs, descriptions, notes, hints) is checked against the
  code for what it promises: a building that "draws students", an event
  that says someone leaves, a quirk that "matters". Each line gets one of
  three verdicts: *true*, *false* (the text promises what the game does
  not do), or *vague* (a player could fairly read a mechanic into it).
- **What earns its place.** Every screen is rated compelling, useful or
  superfluous, with a reason, from the captures and the hands-on
  sessions.
- **Load.** Where the words pile up: per screen and per moment (the first
  hour, the first summer, a year-30 summer). The busiest moments are
  named.

**Deliverable:** `2-ui-and-text.md`, with the screen gallery, the string
table's findings and the description audit by school.

### Area 3 — Intuitive gameplay

**Method.**
- **A new player's first two hours, by hand.** Playwright drives the
  game from a clean browser with nothing but what is on screen,
  following `npm run newplayer`'s script for the opening and then
  deciding freely. Every moment of doubt is logged with a screenshot: not
  knowing what to do next, not knowing why something is disabled, or an
  action that did something unexpected.
- **The owner's three problems, traced.**
  - How to raise prestige.
  - Why a course cannot be developed.
  - Why basic needs is low and what fixes it.

  For each, the route a player would take is followed from the moment
  the problem shows. The review records whether each step is explained
  on screen, and where the answer lives.
- **Six more problems, traced the same way:**
  - cash going into the red;
  - an unstaffed course;
  - a program that cannot be founded;
  - a school that cannot be founded (the split-school trap);
  - satisfaction falling;
  - the rank stalling.
- **The charter.** The case for and against opening as "College" and
  being chartered a "University" is judged against real practice: US
  colleges do rename on charter or status change. The review weighs
  whether a player finds it meaningful or arbitrary. Plan 72E made it a
  log line with a rename on the pennant; the review asks whether that is
  enough, or whether the suffix should be the player's choice from the
  founding screen, and recommends one.

**Deliverable:** `3-intuitive-gameplay.md`: the new-player log, one
trace per problem (a "can a player find it?" verdict each), and the
charter recommendation.

**As implemented** (PR E): `docs/reviews/2026-10-game-review/3-intuitive-gameplay.md`,
with four images.
- The session was played by hand with `drive.mjs` from a clean browser to
  year four: 80 screenshots and a logged doubt at each. `npm run newplayer`
  was not used because it no longer starts (area 7).
- Four of the nine problems came up in the session itself: the program
  that can't be founded, the split-school trap, the course that can't be
  developed, and basic needs. The rest were traced from scenario saves,
  loaded with the new `load=` step.
- The `crisis` scenario turned out to be synthetic: cash is set to −$2M
  against a +$5.2M week, so no rung of the board's ladder had begun. The
  cash trace is read from the Treasury's own text and the ladder's code.
- Seven findings, four of them major:
  - the second hall can deadlock a new player;
  - the NEXT line points at the wrong panel;
  - events pass while the clock runs;
  - year one is quiet while satisfaction falls unexplained.
- The charter recommendation: keep the milestone, caption the founding
  form, and let the player choose at the charter whether to take
  "University".

### Area 4 — Strategy

**Method.** New goal-directed players (`tools/review/goalPlayers.ts`),
separate from the harness's. Each plays the real reducer to year 50
across five seeds and two college names, adapting to what the college is
doing rather than following a script. Every choice is logged with its
reason, and so is every time the player wanted a lever the game did not
have.

| Goal | Adapts by |
|---|---|
| **Revenue** | tuition, admit rate, draw rate and the sweep tuned for net income each summer; builds only what pays |
| **Prestige** | teaching quality, hand-picked faculty and research depth first; grows only as prestige allows |
| **Satisfaction** | whatever need is lowest, each term; never lets crowding in |
| **Every campus asset** | the cheapest path to the whole catalogue; borrows when it must |
| **Championships** | athletics first: venues, coaches, the AD, recruitment, the main sport |
| **Good then big** | a small, excellent college for twenty years, then grows |
| **Big then good** | grows as fast as money allows, then fixes quality |

Each is read for:
- where it gets to, and how fast;
- **where control runs out:** the goal wants something the game has no
  lever for;
- **where it is too easy:** the goal is met early and nothing pushes
  back;
- **what is tedious:** the same action repeated, for instance more than
  ten times a year, or many weeks with nothing to decide;
- whether the goals lead to different-looking colleges or the same one.

Two of the runs are then replayed by hand in the browser at key stretches
(a first decade, a crisis, a late game), to check that the logged pain
points are real on screen.

**Deliverable:** `4-strategy.md`: a section per goal (outcome, curve,
pain points, easy points, tedium), a table comparing the seven, and
whether the goals diverge.

### Area 5 — The critical improvements

**Method.** Every finding from areas 2, 3 and 4 is gathered and grouped
by the player problem underneath it. For example, "the game does not
say why" may explain a dozen findings. Each group is ranked by:
- how many players it would hit;
- how early in a run;
- how badly it hurts the experience;
- the effort to fix.

**Deliverable:** the top of `README.md`: the ten most critical
improvements, each with the findings behind it, a proposed fix and its
size. These feed Plan 74.

### Area 6 — Marketability

**Method.** Desk research with cited sources: store pages, sales
estimates, reviews, press, and platform policies. The reviewer takes the
view of a small studio's greenlight meeting.
- **The niche.** Management and tycoon games; campus and school games;
  games played in one sitting; strategy that is light to learn but deep.
  The review places UniSchool in it: what it is, and who plays it.
- **The competitors.** The games a buyer would compare it to, with price,
  scope, reception and what each does that this does not, or the other
  way round. At least Two Point Campus, Academia: School Simulator,
  University Tycoon-style titles, and one-sitting strategy games.
- **What would stop it earning.** Discovery, genre saturation,
  production values against competitors, the web-only form, session
  length, replay value, and there being no multiplayer or sandbox.
- **Marketing.** Hooks, the audience, the channels (Steam, itch.io, web
  portals, streamers, communities), what the store page and trailer
  should show, and the one-line pitch.
- **Release timeline.** Staged from now: private playtest (70L); a
  public demo or web beta; a Steam page with wishlists; festivals (Next
  Fest); launch; post-launch updates. Each stage says what gets it
  ready.
- **Price.** Comparables, the likely range, and a recommendation (free
  web with a paid edition, premium, or pay-what-you-want), with reasons.
- **Anti-AI sentiment.** What indie players and storefronts are saying
  and doing now, as cited:
  - store policies, such as Steam's AI-content disclosure;
  - community reaction to disclosed AI use;
  - how others have fared.

  How that applies to a game whose code and writing were built with an
  AI assistant. How to navigate it honestly: disclosure, what a human
  authored and decided, where hand-made art or writing would change the
  reception, and what not to claim.

**Deliverable:** `6-marketability.md`: the studio memo, with every
claim sourced.

### Area 7 — Bugs

**Method.**
- **Automated sweeps:**
  - the invariants over many more seeds and names than CI runs, and the
    goal players' runs from area 4 (unusual play finds unusual bugs);
  - save, load, export and import round trips at every year;
  - every tab and modal opened at desktop and phone size, with page
    errors and console warnings caught;
  - the text scale at its extremes, reduced motion, and colour-vision
    modes;
  - camera turns and tilts over a full campus;
  - the door and depth checker from area 1.
- **Exploratory play** at the edges:
  - long and odd college names (the rename included);
  - zero and negative cash;
  - demolishing and cancelling mid-build;
  - moving programs mid-term;
  - every interrupt left open over a save and a reload;
  - fast speed with the tab hidden;
  - two browser tabs on one save.
- **Each bug:** repro steps, the save or scenario, the expected and
  actual result, severity, and the file where it lives if found.

**Deliverable:** `7-bugs.md`, ranked by severity. A blocker is raised
with the owner the day it is found.

## 4. The map

Each PR adds its area's file to the review folder and merges once `check`
and `slow` pass (they cover the tools). The game does not change.

| PR | Subject | Depends on |
|---|---|---|
| A | This plan | — |
| B | The review tools: arrangement campuses, the door and depth checker, the string table, the goal players | Plan 72 merged |
| C | Area 1: aesthetics | B |
| D | Area 2: UI and text | B |
| E | Area 3: intuitive gameplay | — |
| F | Area 4: strategy | B |
| G | Area 7: bugs (collects what C–F found, plus its own sweeps) | C–F |
| H | Area 5: the critical improvements, and the review's README | D, E, F, G |
| I | Area 6: marketability | — (can run alongside) |

C, D, E and I can run in parallel once B lands. H comes last, because it
ranks everything else.

## 5. Decisions taken by default (the owner may change them)

- **Findings only.** Fixes come in Plan 74 after the owner triages. The
  alternative is to fix the small, sure things (severity *minor* or
  *polish*, effort *S*) as they are found.
- **Web research for area 6** uses public sources, cited. Nothing is sent
  anywhere about the game beyond searching.
- **The reviewer plays; the owner's playtest (70L) stays on hold.** The
  review's feel judgments are labelled as a model's, not a human's, and
  the owner's playtest remains the last word on feel.

## 6. What this plan does not do

- Change the game, the balance or the targets.
- Stand in for human playtesting or real market testing.
- Decide Plan 74: the owner does, from area 5's ranked list.
