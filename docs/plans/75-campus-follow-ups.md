# Plan 75 — Campus follow-ups

*Planning document. Its job is to turn the owner's notes on Plan 74 into
PRs.*

**Status: Landed.** A to C merged.

---

## 0. The owner's notes

After Plan 74 landed, the owner asked for three things. These changes are
drawing only and need no playtest.

1. **The arch's openings.** The Triumphal Gate's arches should be real
   openings: transparent, with walkers passing through them.
2. **Derelict marks on open-air buildings.** The derelict look did not work
   on buildings whose plots are partly open air: the hospital, the village
   and the stadium.
3. **A gallery of every asset.** The grids of buildings by vernacular
   used in Plan 74's screenshots are useful. Every buildable asset should
   have pages or images saved to the repository.

| PR | Subject | Note |
|---|---|---|
| A | Weathering on the walls a building has | 2 |
| B | The gate's passages | 1 |
| C | The asset gallery | 3 |

C lands last, so the gallery shows A's and B's drawings.

## Rules for every PR in this plan

- One branch per PR (`plan-75x-subject`), merged once `check` and `slow`
  pass.
- Drawing only: `npm run sim` reads the same as `sim/baseline.json`.
- Each visual PR carries screenshots in
  `docs/reviews/2026-10-campus-fixes/` and runs `npm run review:doors`.
- Each PR writes an **As implemented** note here.

## PR 75A — Weathering on the walls a building has

- Every age mark goes on the boxes a building actually stands in, not one
  box of its whole footprint to its wall height:
  - the streaks;
  - the lost slates;
  - the boarded windows;
  - the derelict's grime and tarpaulin;
  - a historic building's ivy.
- Each form's boxes:
  - **Hospital:** the ward slab and the lower wing.
  - **Village:** each house.
  - **Stadium:** nothing while its stands are open; its outer wall once
    the bowl closes.
  - **Tower:** the podium and the shaft.
  - **Landmarks:** the campanile's shaft, the dome's podium, the gate's
    body.
- A farther box's marks are masked by the nearer boxes.
- The hoarding and weeds stay round the whole plot.

**As implemented (#217).**

- `src/components/weatherVolumes.ts` says which boxes each form stands in:
  - most forms: one box of the footprint, as before;
  - the Medical Center: its ward slab and lower public wing;
  - a village: each of its twelve houses, with the tarpaulin on two;
  - the stadium: no box while its stands are open (as built and after
    one expansion); its outer wall once the bowl closes, to the
    second-deck height after the third expansion, with no windows to
    board;
  - a tower: its podium and its shaft;
  - the landmarks: the campanile's shaft and belfry, the dome's podium
    and the gate's body (from `landmarks.tsx`'s own `landmarkVolumes`);
  - open ground: none.
- `ageMarks.tsx` draws every mark per box, in depth order: streaks, lost
  slates, boarded windows, grime, tarpaulin and ivy. Each farther box's
  marks are masked by the nearer boxes, since all of them paint over the
  finished building. A small wall, such as a village house's, gets fewer
  marks than a hall's. The tarpaulin goes on the largest box that takes
  one.
- The derelict's hoarding and weeds still run round the whole plot.
- **Checks:** `test/weather-volumes.test.ts` checks that:
  - every weathered box lies inside its footprint;
  - a village weathers house by house;
  - a stadium weathers only once its bowl closes, with nothing to board;
  - the hospital weathers as its slab and a lower wing;
  - a tower weathers as its podium and a slimmer shaft;
  - each landmark weathers on its own masonry;
  - open ground weathers nowhere, and a hall is still one box.
- Drawing only. `npm run sim` reads the same as the baseline, and
  `npm run review:doors` reports the same 1,842 hits as `main`.
- Screenshot: `docs/reviews/2026-10-campus-fixes/derelict-open-air.png`
  shows the three landmarks, the Medical Center, a tower and a village,
  all derelict.

## PR 75B — The gate's passages

- The Triumphal Gate's great arch, and the lesser arch through its end, are
  cut through the masonry. The passage's walls and vault show inside, and
  the ground and anything beyond show through.
- The passage tiles are walkable. A walker in the main passage is hidden
  only by the pier nearer the camera, so it is seen walking through the
  arch.

**As implemented (#218).**

- The gate's proportions live in `buildingSpec.ts` (`GATE_*`,
  `gatePieces`, `gatePassageTiles`), so the drawing, the walkers' routes
  and the walkers' hiding all read one gate.
- **The drawing** (`landmarks.tsx`):
  - Both visible walls are drawn with their arch cut out: the great arch
    through the long face and the lesser one through the end.
  - Behind each, the arch's outline is swept from its near mouth to its
    far one (the same arch on the parallel hidden face). Only the strips
    facing the camera are drawn: the passage's side wall and the vault
    within, never the vault's back.
  - The passage floor is left open, so the lawn, a path, the gate's own
    shadow and anything beyond show through the arches.
  - The archivolt is a ring round the opening rather than a disc behind
    it.
- **The walkers:**
  - `walkRoutes.ts` paves the passage tiles of a finished gate, at a
    path's cost. These are the tile across the middle of its length and
    the row down its middle.
  - `Walkers.tsx` hides a walker behind the gate's four piers and the
    masonry over each passage, instead of one box. A walker in the
    passage shows through the arch and is hidden only by the pier nearer
    the camera.
- **Checks:** `test/walk-routes.test.ts` checks that:
  - both passages are walkable and the piers solid;
  - a turned gate has the same passages;
  - a gate still going up is walked round;
  - the gate is four piers and two spans, all inside the plot.
- Drawing only. `npm run sim` reads the same as the baseline, and
  `npm run review:doors` reports the same 1,842 hits as `main`.
- Screenshots in `docs/reviews/2026-10-campus-fixes/`:
  - `gate-passages-views.png`: the gate from all four cameras.
  - `gate-passage-path.png`: a path running through the passage beside
    Founders Hall.

## PR 75C — The asset gallery

- One tool, `npm run gallery:assets`, renders every buildable asset in all
  five vernaculars. It covers:
  - every placeable;
  - each school's signature hall;
  - a chapter house;
  - each venue at each expansion;
  - one of each form under construction.
- It writes one image per group of forms to `docs/assets/`, vernaculars in
  rows and assets in columns, and an index page that lists each image and
  what it shows.

**As implemented (#219).**

- `unischool/tools/assetGallery.mjs` (`npm run gallery:assets`) works in
  three steps:
  1. It renders the contact sheets for all five vernaculars through the
     game's own drawing (`npm run sheet -- --every`).
  2. It photographs each cell's drawing with playwright-core.
  3. It lays them out with vernaculars in rows and assets in columns.
- The output is 25 JPEG images in `docs/assets/`, 3.4 MB in all, one or
  more per form: halls and the school signature halls, civic porticos,
  pavilions, residence halls, villages, towers, blocks, works, sheds, the
  stadium's stages, open ground, the landmarks, and one of each form under
  construction. A group larger than six assets is split evenly across
  images.
- It also writes `docs/assets/README.md`, an index that lists each image
  and the assets in it, by name and id or state, with footprint.
- 108 assets in all:
  - every placeable;
  - a chapter house;
  - each school's signature hall;
  - each venue at each expansion;
  - one of each form under construction.
- `--azimuth 225` draws them from behind, and `--out` writes elsewhere.
- `docs/README.md` lists the gallery. Rerun the tool after any change to
  how a building is drawn.
