# Plan 099 — A gazebo, door signs, and a later garden

*Planning document only — no gameplay code is changed by this file. Three
changes to the campus the owner picked for 0.1.1 (12 October 2026): a
gazebo, a plate by each building's door naming it, and the Japanese Garden
moved to a later milestone. The rest of the October review's decorative
list stays in the backlog.*

**Status: Approved (12 October 2026): every decision as proposed. In progress.**

---

## 0. What stands today

Read against `main` at `9cec56b` plus PR #341.

- **Amenities** are the `AMENITIES` rows in `data/facilitiesData.ts:528–537`:

  | Id | Cost | Weeks | Upkeep/wk | Beauty | Footprint | Opens at |
  |---|---|---|---|---|---|---|
  | `AMENITY-STATUE` | 150k | 10 | 300 | 0.6 | 2×2 | campus-life (a fourth program) |
  | `AMENITY-FOUNTAIN` | 400k | 13 | 800 | 1 | 3×3 | commencement (first summer) |
  | `AMENITY-GARDEN` | 300k | 16 | 1,500 | 1.5 | 6×6 | town (1,500 students) |
  | `AMENITY-CHAPEL` | 1.5M | 39 | — | 1.5 | 5×3 | regional (prestige 55) |
  | `AMENITY-BELLTOWER` | 1.8M | 47 | — | 2 | 3×3 | research (prestige 70) |

  Each becomes a `Buildable` with `facilityType: 'amenity'`
  (`facilitiesData.ts:929–939`). Footprints are `LANDMARK_FOOTPRINTS`
  (`state/campusMap.ts:135–139`). Open-ground amenities are drawn twice in
  `components/groundMarkings.tsx`: the ground paint (`GroundMarking`, case
  `'amenity'`, :2037–2040) and the raised props (`amenityProps`,
  :1652–1660). **Both switches fall through to the fountain**, so a new id
  with no branch would draw as one.
- **Milestones** are `MILESTONES` in `data/ladderData.ts`, each with the
  buildables it opens and an `opens` line. The garden opens at `town`
  (:177–185). `city` (6,000 students), `market` (8,000) and `distinguished`
  open no amenity today. `ladderAllows` (`systems/ladder/ladderSystem.ts:23`)
  gates the build menu, and `test/beauty.test.ts:81` asserts that every
  amenity has a milestone.
- **Build-menu thumbnails** (Plan 94) draw themselves from the same art
  (`BuildThumb.tsx`), and `test/build-thumb.test.ts` draws every placeable
  in every vernacular. The asset gallery is `npm run gallery:assets`.
- **A save keeps the catalogue it was founded with.** A new buildable is
  pushed into `state.tech` by a migration (the `trainingProgram` pattern,
  `persistence.ts:222–226`), with `SAVE_VERSION` bumped from 100.
- **Doors.** `doorOf` (`components/buildingSpec.ts:565–604`) gives each
  form's door. It is null for grounds, stadium, village and landmark forms.
  `entrancesOf` (`components/walkRoutes.ts:96`) gives the tile in front of
  each door. Names are `Buildable.name` (which may be a donor's).
  - **Text on the map:** building labels are an SVG layer (`BuildingLabel`, `CampusMap.tsx:420`, Plan 47). Wall lettering exists, slanted to the wall (chapter houses, `buildingMotifs.tsx:6015`; the gate's `Inscription`, `landmarks.tsx:960`), and canvas text goes through `drawText` (`canvasPaint.ts:1339`).
  - **Zoom** is `view.zoom` from 0.22 to 2.5. Nothing changes what is drawn by zoom today. "Zoom 3" in the old note meant three presses of + in the review tool, not a game value.

- **Walks** (`components/pathways.tsx`, `buildPathGeometry`) are drawn
  tile by tile. An exposed outer corner is rounded, and two tiles that meet
  only at a corner are bridged across it (Plan 24F), so a corner-joined
  diagonal already draws straight. A run drawn as **edge-joined steps**
  (east, south, east, south…) still draws as a staircase: the October
  reviews' A1-7 and B1-4. The owner discarded it on 12 October as
  *Walks that draw straight* and brought it back on 13 October as this
  plan's PR E.

## 1. Decisions for the owner

| # | Question | Proposed |
|---|---|---|
| 1 | The garden's new milestone | **`city`** (6,000 students, Established), the first free slot after `town`. A garden becomes a sign of a big campus. |
| 2 | A save that has already passed `town` | **Keep what it has.** A garden built or already open stays. Only colleges that haven't reached `town` wait for `city`. |
| 3 | The gazebo's place in the ladder | **`town`**, where the garden was, so `town` still opens a monument. |
| 4 | The gazebo's numbers | 250k, 12 weeks, upkeep 400/wk, beauty 0.8, a 3×3 footprint. Between the statue and the fountain. |
| 5 | How close the camera is before door signs show | **From `view.zoom` ≥ 1.4**, about three presses of + from the default, matching the old note. |
| 6 | What a sign says | The building's display name, shortened to fit the plate. A donor's name shows as the building's name does today. |
| 7 | How a stepped walk is smoothed (added 13 October, PR E) | **Chamfer the steps:** fill the inner corner of each step and trim its outer corner, so the edge runs straight at 45°. It keeps the walk a tile wide and keeps the tiles as the data. The other option, a polyline drawn over the tiles, would change every walk's look, not just the stepped ones. |

## Rules for every PR in this plan

- **The gazebo is a balance change**, though a small one. C runs `npm run
  sim` before and after. The harness players don't build amenities by
  name, so the baseline should not move; if it does, the PR says why.
- **New art follows Plan 03's rules:** one scale, one detail vocabulary,
  and the depth sort. A screenshot in every vernacular goes in the PR.
- **Each PR runs `npm run check` and `npm run test:slow`**, and re-runs
  `npm run gallery:assets`.

## The map

| PR | Subject | Depends on |
|---|---|---|
| A | This plan | — |
| B | The garden at a later milestone | — |
| C | The gazebo | B (the ladder lines) |
| D | Door signs | — |
| E | Walks that draw straight (the staircase bug, added 13 October) | — |

### PR 99B — The garden at a later milestone

- `AMENITY-GARDEN` moves from `town`'s buildables to `city`'s (decision 1).
  Both milestones' `opens` lines are rewritten, and so is the ladder's
  description of the garden (about :185).
- **Saves** (decision 2): no migration. A college past `town` has the
  garden in the state it's in; `ladderAllows` is checked against the
  milestone only for buildables still locked. The PR confirms this by
  loading a year-20 scenario save with the garden open, and adds a test
  for it.
- **The words:** grep `src/` and `docs/design/` for the garden's milestone
  ("1,500 students", "A town's worth") and rewrite each.

**As implemented.**

- `AMENITY-GARDEN` moves from `town`'s buildables and `opens` line to
  `city`'s. City's letter now mentions the garden's acres, and
  `docs/design/progression.md`'s table lists it. No other text named the
  garden's milestone.
- **Saves:** no migration, as decision 2 asks. The ladder gates a buildable
  only on its way from locked to available (`meetsUnlockGates`;
  `holdBackUnreached` runs only at founding), so a garden a save opened
  stays open. `save-migrations.test.ts` loads the v97 save with A small
  city taken off its ladder, a college between the two milestones, and
  its garden stays available. `beauty.test.ts` checks the new gate both
  ways.
- **Balance:** `npm run sim` moves only the Completionist, which builds
  the cheapest amenity on the menu and no longer finds the garden at
  1,500 students. Year 50: 3rd where it was 2nd, prestige 111.8 (−2.3).
  The baseline is re-recorded.

### PR 99C — The gazebo

- **Data:** an `AMENITY-GAZEBO` row (decision 4), a 3×3 footprint in
  `LANDMARK_FOOTPRINTS`, `town`'s buildables and `opens` line (decision 3),
  and a sentence for the build menu.
- **Art:**
  - **Ground paint:** a ring of paving the size of the footprint, with a step on the side facing the nearest walk.
  - **Raised props:** an octagonal open pavilion on six or eight posts, a railing, and a pitched roof with a finial, in the vernacular's trim colour.
  - Both switches get their own `'AMENITY-GAZEBO'` branch, and the fountain fall-through gets a test, so the next amenity can't silently draw as one.
- **Migration:** `SAVE_VERSION` 101 pushes the gazebo into `state.tech`
  for older saves, locked or available by the save's milestones, the
  `trainingProgram` way. Covered by a fixture test.
- **The gallery and thumbnails** regenerate. The build-thumb test covers it
  without a change.
- **Optional, if it fits:** the gazebo as an event's promise target in
  Plan 101's statue PR (a donor's gazebo). Noted there, not built here.

**As implemented.**

- **Data:** `AMENITY-GAZEBO` as decision 4 sets it, a 3×3 footprint, and
  `town`'s buildables and `opens` line. Its build-menu sentence: "An open
  eight-sided pavilion with a railing and a pointed roof: where the band
  plays on summer evenings, and where half the campus has been proposed to."
- **Art:**
  - The ground is a lawn, a paved ring the footprint's size, and a paved
    step to the front edge. The step faces the front edge, not the
    nearest walk: the ground paint has no path context.
  - The raised part is a stone floor, eight posts and a railing in the
    style's trim (white where a style has none, as Modern), and an
    octagonal roof to a finial. The roof is the style's pitched roof
    where it sets one (Gothic slate, Mission tile), else its brick halls'
    roof. Far posts and rails are drawn before near ones.
  - `groundProps` takes the vernacular, and the map, the build-menu
    thumbnails and the contact sheet pass it.
  - **No fall-through:** both switches name each amenity, and an unknown
    one draws nothing raised. `amenity-art.test.ts` checks that every
    open-ground amenity has a branch and isn't drawn as the fountain.
  - The contact sheet's headroom for open ground goes from 40 to 90, so
    the gazebo isn't clipped. The asset gallery is regenerated (the
    gazebo is in `docs/assets/grounds-2.jpg`, every vernacular).
- **Migration:** `SAVE_VERSION` 101 (`gazeboJoins`) adds the gazebo to an
  older save, open if it's past A town's worth, else locked.
  `save-v100.json` is a Guided run in year 7, past the town and short of
  the city, written before the bump. `save-migrations.test.ts` checks
  that the gazebo arrives open, once, and arrives locked short of the
  town.
- **Balance:** the plan expected no move, but the Completionist builds the
  cheapest amenity on the menu, so it builds the gazebo at the town. Year
  50: 2nd (3rd after 99B), prestige 116.1 (+4.3 on 99B's baseline). No other
  player moves. The baseline is re-recorded.

### PR 99D — Door signs

- **What:** a small plate on the wall beside each building's front door,
  with its name. Buildings with no door get none (grounds, stadium,
  village and landmarks, by `doorOf`). It is drawn on the wall, not on the
  ground tile, so it can't collide with walks, racks or trees.
- **How:**
  - The plate is drawn in the building's motif pass, beside `doorBay` / `doorOnFace`, with the wall's slant (the chapter-house lettering's `matrix(1 slope 0 1 x y)`).
  - Its text goes through `drawText` at a fixed screen size, so it stays legible at the zoom where it appears.
  - It's drawn only on the door's face and only when that face is toward the camera.
- **Zoom** (decision 5): the plates are part of the recorded drawing, so
  showing them by zoom needs the recording to know the threshold. Either:
  - record two layers (with and without plates) and pick by zoom; or
  - draw the plates as their own small canvas pass after the settled redraw (`mapCanvas.ts:446–460`).

  The PR measures both on a year-50 campus and keeps the one that adds
  less to a redraw. The budget is a redraw no more than 5% slower.
- **Text** (decision 6): `hallDisplayName` / `Buildable.name`, cut to the
  plate's width with an ellipsis. A test runs every catalogue name and the
  longest donor name the name generator makes.
- **The building labels** (Plan 47) are unchanged. Hovering a building
  still shows its full label.
- **Checks:**
  - a review-tool view at zoom 1.5 in each vernacular, in the PR;
  - the canvas and SVG maps agree (the SVG fallback draws the same plates);
  - `tools/keyboardCheck.mjs` still passes.

**As implemented.**

- **Where it's drawn:** `components/doorSign.tsx`'s `DoorSign`, beside the
  motif in `CampusMap`'s `PlacedBuilding`. The plate is part of the
  building's own drawing, so it depth-sorts with it and a building in
  front hides it. Both maps draw it: the canvas map walks the same element
  tree. It's not in the build-menu thumbnails.
- **Where on the wall:** the front wall (`sidesOf(facing).front`, by
  `wallOf`), only while the camera sees it. It sits half a tile clear of
  the door's edge, so it clears most porches and portico sides, else just
  beside the door. It goes on the side toward the screen's right, at the
  door's mid-height, sheared to the wall's slope like the chapter
  houses' letters. A wall with no room for it gets none, and a building
  with no front door (`doorOf`'s null) never does.
- **Zoom** (decision 5): the plates are always in the drawing, and CSS
  hides them below `SIGNS_FROM_ZOOM` (1.4).
  - `CampusMap` puts the `signs` class on the map once the view crosses
    1.4, which re-renders only at the crossing.
  - The canvas map reads its buildings' rules under that class (the
    building recorder now gets a root class, as the ground's already did).
  - A building's canvas signature includes the class, so its drawing is
    redone once when the class changes.
  - So the plan's two options came down to one: there's only one drawing.
- **Cost:** recording the 48 buildings of the launch save with plates
  against without, best of seven, three runs: 88 more ops on 7,532
  (+1.2%), and the time is within noise (−6% to +1%). Well inside the 5%
  budget.
- **Text** (decision 6): the label the map already uses (`hallDisplayName`,
  a donor's name as it stands), cut to 22 characters with an ellipsis.
  The letters are a third of the door's height. `door-sign.test.ts` runs
  every catalogue name and the longest donor name (the longest surname
  with the longest school), and checks which buildings are signed.
- **The building labels** (Plan 47) are unchanged.
- **Checks:** `tools/keyboardCheck.mjs` passes, and a year-14 campus in
  each vernacular at zoom 1.75 is in the PR.

### PR 99E — Walks that draw straight

The staircase bug (A1-7, B1-4): a diagonal walk drawn as edge-joined steps
reads as a zigzag.

- **What:** in `buildPathGeometry`, find each step, an L of three tiles
  where the walk turns one way and then back. Fill the triangle in the
  step's inner corner and trim the triangle off its outer corner, so a run
  of steps has two straight 45° edges (decision 7). A single turn, where
  the walk turns and goes on, keeps its rounded corner. Corner-joined runs
  keep their bridges.
- **The tiles stay the data.** Quads, reachability, walkers and the path
  tools read the same squares. It's drawing only, so no save change.
- **Both maps:** the canvas map draws the same geometry
  (`canvasArt.ts` via `buildPathGeometry`), so one change covers both.
- **Checks:**
  - a geometry test: an edge-joined 45° run draws edges that are straight
    lines (each step's chamfer points collinear), a single turn is
    unchanged, and a corner-joined run is unchanged;
  - before/after shots of the review tool's `diagonal` and `curve`
    arrangements, in the PR;
  - the walkers still keep to the paving (`walk-routes.test.ts`).
- The backlog archive's *Walks that draw straight* says it landed.
