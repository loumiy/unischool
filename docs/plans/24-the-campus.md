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

## PR 24C — The camera

- **V2's ten-step tilt ladder**, stepped in the sine of the pitch: from 1/5
  (nearly level) to 1 (a plan view). It replaces this game's three.
- **Z and X step the ladder, Home resets.** Every tab shortcut is checked
  against the camera's keys in the hotkey test.

## PR 24D — The parcel and the road

- **A road runs along the parcel's south edge** as terrain: not buildable,
  drawn as a road, and the way in.
- **Reachability** (`systems/campus/reach.ts`, ported from v2):
  - Every building needs a way on foot from the road, through open ground or
    paths.
  - A placement that would cut off itself or another building is refused,
    and the ghost says why.
- **The founding woodland stays** as it is.

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

## PR 24F — Diagonal and curved paths

- **Diagonal runs.** Dragging the path tool along a diagonal paints a
  diagonal run, where today it can only paint an L of two straight legs.
- **Curves.** Where paving turns a corner or runs on a diagonal, the kerb and
  the fill are drawn as smooth curves through the tile centres rather than
  stepped squares. The tiles underneath are unchanged, so everything that
  reads paths (quads, walkers, reachability) is unaffected.

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
