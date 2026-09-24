# Plan 24 — The campus

*Planning document only. Its job is to turn Phase C of the v2 merge (the
campus map, `loumiy/unischool-v2`'s `docs/MIGRATION_PLAN.md`) into a
sequence of PRs.*

**Status: In progress.**

---

## 0. The finding

This game's campus map has the right bones:

- the same isometric projection as v2;
- four rotations and a tilt;
- autotiled paths, a founding woodland, and every building drawn from one
  motif library.

What it lacks is life and structure:

- nobody walks it;
- open ground has no meaning;
- paths are straight lines of tiles;
- nothing on the map says a building is old, being built, or cheered for.

UniSchool v2 had all of that. The owner's decisions (v2's
`docs/V1_ADOPTION_LIST.md`, #34–#48) keep most of it and change some:

| # | Decision |
| --- | --- |
| 34 | Quads are detected, with paths as part of a quad, never splitting it. A player can also designate one. New: curved and diagonal paths. |
| 35 | Painted paths, walkers preferring them, desire lines, and every building reachable from the road. No stream, no footbridge. |
| 37 | This game's large parcel, with a road edge and the founding woodland. |
| 38 | Walkers on real routes, cut by walls, scaled for 40,000 students. Fix the rotation glitch. |
| 39 | Desire lines and bike racks kept. Lamps and benches placed by the player along paths. No bins, aprons, car park or bus stop. |
| 40 | Crowds in the stands on game weeks only. No queues, no cars. |
| 44 | Visible age: streaks, lost slates, boarded windows, weeds and a fence when derelict. Ivy on historic buildings. |
| 45 | Ten tilt pitches. Tab shortcuts never take a camera key. |
| 46 | The college's flag over Founders Hall; banners on lamp posts at commencement. |
| 47 | Construction drawn as a crane and scaffolding, the building rising, and a progress bar. |

**The risk the migration plan names first is performance.** v2's map
dropped to 47 fps on a large campus, and this parcel is four times v2's.

## Rules for this plan

- **The profiler gates every map PR.** `npm run profile` on a Year-40
  Completionist campus runs before and after, and the numbers go in the
  PR's notes. A PR that costs more than 3 fps at 4× says why, or does not
  land.
- **Static layers are drawn once per layout.** Ground, paths, trees and
  buildings are keyed on what stands where, never on the whole state; only
  the walkers and the crowds animate. This is v2's Phase 52 lesson,
  applied from the start.
- **Everything the sim needs is pure and tested.** Quads and reachability
  live in `src/systems/campus/` beside the other systems, with tests. The
  map only draws them.

## PR 24A — The plan

This document.

## PR 24B — The static layer

- **The campus scene is split in two.** A memoised static layer holds
  ground, paths, trees, buildings and labels, keyed on a layout key (ids,
  footprints, statuses, paths and trees). A live layer above it redraws
  every week.
- **The baseline is recorded** before and after: fps, 95th-percentile frame
  and long tasks at each speed, on Year-20 and Year-40 campuses.

**As implemented:**

- **The cost was the reducer's clone, not the drawing.** The reducer
  hands back a new copy of the state every week, so every record the scene
  was memoised on (placements, tech, trees, paths) had a new identity every
  week, and every building motif redrew. Freezing the scene outright
  recovered 14 fps at 4×, which set the target.
- **`components/campusLayout.ts`** builds the layout the scene draws (each
  placed building with its label, glyphs and whether it is a site; the
  trees; the paths; the vernacular) and a string key of everything in it
  that can change. The layout object is kept while the key holds, so the
  scene's memo holds through a week in which nothing was built, finished,
  renamed or paved.
- **What changes weekly is drawn outside it.** A site's progress bar and its
  countdown tooltip read the weeks left through a React context, so a week
  off the countdown redraws the bars alone. The hall pips are drawn after
  the scene, from the live state.
- **The picture is unchanged.** Screenshots of a build-all campus and of a
  campus with four sites going up are byte-identical before and after.
- **`npm run scenario`** now marks the milestone notes read. The harness
  never reads them, so a Year-20 save opened on Year 1's note.

Measured on Earnest completionist saves (`npm run profile`, 6 s per speed,
1440×900):

| Save | Speed | Before | After |
| --- | --- | --- | --- |
| Year 20 (29,040 students, 49 buildings) | Play | 53.0 fps | 59.2 fps |
| | 2× | 50.9 | 58.7 |
| | 4× | 46.3 | 58.4 |
| Year 40 (33,520 students, 60 buildings) | Play | 55.9 | 59.0 |
| | 2× | 53.7 | 58.4 |
| | 4× | 43.3 | 56.5 |

This is the baseline every later PR in this plan is measured against.

## PR 24C — The camera

- **V2's ten-step tilt ladder**, stepped in the sine of the pitch: from 1/5
  (nearly level) to 1 (a plan view). It replaces this game's three.
- **Z and X step the ladder, Home resets.** Every tab shortcut is checked
  against the camera's keys in the hotkey test.

**As implemented:**

- **`isoProjection.ts`** carries v2's `PITCH_SINES` and a
  `DEFAULT_PITCH_INDEX` (the 2:1 dimetric, fourth of ten). The clamp opens
  from 20–55° to 10–90°. The motifs needed nothing: every height already
  runs through the projection's height scale, which is 0 straight down, so
  the plan view shows roofs and ground.
- **The depth test sorts a campus at every pitch and view,** with no
  occlusion violations, and checks that no pitch on the ladder is clamped.
- **This game has no tab shortcuts,** so there was nothing to check against
  the camera's keys. The map's help text claimed C, F and L opened tabs; it
  no longer does.
- **Profile, Year 40:** 57.2 fps at 4× (56.5 at 24B), unchanged within
  noise.

## PR 24D — The parcel and the road

- **A road runs along the parcel's south edge** as terrain: not buildable,
  drawn as a road, and the way in.
- **Reachability** (`systems/campus/reach.ts`, ported from v2):
  - Every building needs a way on foot from the road, through open ground or
    paths.
  - A placement that would cut off itself or another building is refused,
    and the ghost says why.
- **The founding woodland stays** as it is.

**As implemented:**

- **The road is the parcel's last two rows** (`campusMap.ts`'s
  `ROAD_FIRST_ROW`), fixed terrain rather than state, so no save field and
  no version bump. `footprintFits` and the path and tree actions keep off it.
  It is drawn in the static layer as asphalt with a kerb and a centre line.
- **Reachability lives in `src/state/reach.ts`, not `src/systems/`.** The
  invariant suite forbids a tick system from reading placements, since the
  map is cosmetic, and siting rules already live beside `campusMap.ts`.
- **A quad is walked across.** It blocks no walk and needs no door, so a
  quad closed in by halls is the classic quad, not an unreachable
  building.
- **`canPlace` asks `siteRefusal`,** so the reducer and the map share one
  rule. The ghost shows the reason beside the pointer: not enough clear
  ground, no way to walk to it from the road, or it would wall off a named
  building. A building an older save left walled off stays standing.
- **`firstFreeSpot` takes the state and the Buildable,** and prefers a site
  with a clear tile all round. A clear ring can cut nothing off, so it needs
  no second flood fill. Harness campuses now have a walk between buildings.
  The harness only moves where things stand, and no system reads that:
  a 40-year Earnest completionist ends on the same cash and enrolment, in
  the same time.
- **Old saves:** a building standing on the road is moved to the first open
  site on load rather than dropped, and paths and trees on the road go.
- **The founding woodland is unchanged:** trees drawn onto the road are
  cleared after planting, so the founding draws from the random stream are
  the same.

## PR 24E — Quads

- **`systems/campus/quads.ts`**, ported from v2's `detectQuads`. A quad is
  open ground (paths included, so a walk never splits a green) that does not
  reach the parcel edge, is neither courtyard-small nor the whole campus,
  and is mostly walled. Each gets a name, and the player can rename it.
- **Designating a quad by hand.** The quad tool marks the open region under
  a click as a quad even where detection would not, as long as it does not
  reach the parcel edge.
- **Quad names are drawn on the ground,** as v2 did.
- What quads are *worth* is Phase E's (beauty and layout effects).

**As implemented:**

- **`src/state/quads.ts`** ports v2's two-pass detection with its doorway
  sealing, beside `reach.ts` for the same reason. The thresholds and the
  names are in `src/data/quadData.ts`, rescaled for this game's grid: 16 to
  900 tiles, and a doorway up to 2 tiles wide through a wall up to 7 deep,
  the deepest hall. v2's walls were thinner.
- **A placed Campus Quad or Grand Quad is lawn a quad is made of,** not a
  wall, as it is to the walk.
- **`GameState.quads` is optional** (`{ names, designated }`), so it needs no
  version bump. It is sanitised on load, and `NAME_QUAD`, `MARK_QUAD` and
  `UNMARK_QUAD` write it.
- **Marking** is the build popup's Mark a quad tool, one click at a time.
  The open space under the click becomes a quad if it does not reach the
  parcel's edge and is bigger than a light well, whatever its size or
  enclosure. The quad's card, opened by clicking it, renames it or lifts the
  mark.
- **On the map:** a faint tint in the static layer. The quad under the
  pointer is outlined and named, and N names them all, as in v2. Detection
  runs once per layout change, about 15 ms on a Year-40 campus.
- **D and E share a commit:** the reducer, the save loader and the map
  changed for both.

## PR 24F — Diagonal and curved paths

- **Diagonal runs.** Dragging the path tool along a diagonal paints a
  diagonal run, where today it can only paint an L of two straight legs.
- **Curves.** Where paving turns a corner or runs on a diagonal, the kerb and
  the fill are drawn as smooth curves through the tile centres rather than
  stepped squares. The tiles underneath are unchanged, so everything that
  reads paths (quads, walkers, reachability) is unaffected.

**As implemented:**

- **A freehand stroke follows the pointer tile by tile,** so a slow drag
  along a diagonal still steps. Holding Shift turns the draw tool into a
  straight run from where the stroke began, at any angle, diagonals
  included. Moving the pointer moves the run, and one `PAINT_PATH_TILES` per
  move lays and lifts it. Freehand strokes are drawn as eight-connected
  lines between samples, so a fast drag leaves no gaps.
- **Drawing:** a tile's exposed outer corners are rounded (a turn reads as a
  curve), and two tiles that meet only at a corner have the notches either
  side filled, so a diagonal run is one band with straight edges. The kerb
  is the fill's outline stroked under it, which follows any shape the
  paving makes.
- **Profile, Year 40, after D–F:** 57.3 fps at 4×.

## PR 24G — Walkers

- **Routes** (`components/map/routes.ts`, ported): a walk grid that
  prefers paths, the doors of buildings, and weighted routes between them.
- **The walker layer** draws students on those routes.
  - The count is a square root of enrolment, capped for the frame budget:
    about 20 at 500 students and about 400 at 40,000, a crowd without a
    cost that grows with the student body.
  - Walkers are drawn in grid space and projected every frame, which fixes
    v2's rotation glitch.
- **Desire lines** form where routes cross grass often, and fade when a
  path is laid over them.

## PR 24H — Lamps, benches and bike racks

- **Lamps and benches are placed by the player,** with the path tool's new
  "dressing" mode, on or beside a path tile. They are cheap, count toward
  beauty in Phase E, and are drawn in the static layer.
- **Bike racks appear beside academic halls and dorms** as the college grows.

## PR 24I — Colour and crowds

- **The college's flag** flies over Founders Hall.
- **Banners hang from the player's lamps** in commencement week.
- **Crowds fill the stands** of a venue in the weeks its team plays at home
  (the athletics season's occasions), and only then.

## PR 24J — Construction and age

- **A building under construction** shows a crane and scaffolding as solid
  shapes, and rises over its build weeks, with a progress bar.
- **Age marks by years standing:** streaks after 15 years and lost slates
  after 30. Phase E ties them to condition, adds boarded windows, weeds and
  a fence for derelict buildings, and ivy for historic ones.

## What this plan does not do

- **Beauty, layout effects and condition** are Phase E, which reads what
  this plan draws.
- **New building types** are Phase D.
- **Seasons** are one subtle cue at most, decided with the owner. None is
  added here.
