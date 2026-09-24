# Plan 37 — The map, from v2

*Planning document only. Its job is to turn the owner's four map requests
into a sequence of PRs.*

**Status: Landed.**

---

## 0. The requests, and what was found

The owner asked for three things to come over from v2, and reported one
bug. A read of both maps found:

- **Smooth rotation instead of fixed jumps.**
  - v2 eases a quarter turn over 260 ms, with the pivot held on the ground
    a storey and a fifth below the middle of the screen.
  - This game snaps (`CampusMap.tsx`'s `turnBy`).
  - v2's turn re-renders the whole scene every frame, on a parcel a
    quarter of this one's size.
  - Here the scene, the depth sort and the walkers' routes are all keyed
    on the camera. A per-frame re-render of a late campus has to be
    measured before it is trusted.
- **A choice of tree when planting.**
  - v2's plant tool has a row of species chips: whatever grows, broadleaf,
    conifer, ornamental.
  - The sim finds a seed of that species from its one random draw, so the
    save still holds one integer per tree and the random stream does not
    move.
  - This game's plant tool plants whatever the dice say.
- **Trees and walkers changing shape with the tilt.**
  - The walkers already do, with v2's constants (`Walkers.tsx`).
  - The trees do not. Only their trunks shorten, and from overhead the
    crowns float off a trunk of no length.
- **The path's gridlines change when the camera turns (a bug).**
  - The joint lines between paving tiles were drawn from `boxFaces().top`.
    That list is ordered by screen position, and its first corner is
    whichever is at the back in this view. The north and east joints were
    right only in the opening view.
  - In the other three views they moved onto the kerbs, across the rounded
    corners, and interior joints went missing.
  - v2 has the same fault, in a worse form, so v2 is not the source of the
    fix.

## Rules for this plan

- **Pure geometry is tested at every view.** A test that sets one camera
  is how the path bug went unseen.
- **The save does not change.** A tree is still one integer.
- **The turn is measured before it ships on a late campus.** If it cannot
  hold a frame rate, it turns a lighter scene, not the full one.

## PR 37A — The plan

This document.

## PR 37B — The path joints, by grid corner

- The joints are read from the grid-named corners (`NW`/`NE`/`SE`). This
  is the rule `isoProjection.ts` already states: anything that cares about
  grid edges uses the grid names.
- **Test:** in all four views, a north–south run and an east–west run
  draw exactly their two shared edges. The test fails on the old code in
  three views of four.

**As implemented:** as planned. The test reads each joint's ends back to
grid corners with `unproject`, and it fails on the old code in views 1–3.

## PR 37C — Choosing the tree

- **Data:**
  - `Species`, the species mix and the seed-to-species hash move from the
    renderer (`components/trees.tsx`) into `data/treeData.ts`, unchanged
    byte for byte, so no existing wood changes species;
  - `seedForSpecies` walks forward from the drawn seed to the first of the
    asked-for species.
- **Action:** `PLANT_TREE` takes an optional `species`. The reducer still
  makes exactly one random draw.
- **UI:** a chip row under the plant tool, as v2's: whatever grows,
  broadleaf, conifer, ornamental.
- **Tests:**
  - a seed exists for every species;
  - no species leaves the seed alone;
  - the planted tree is the asked-for species;
  - the random stream and a replay are unchanged.

**As implemented:**
- **The choice is the session's,** in a small store
  (`components/plantingChoice.ts`) that the build menu writes and the map
  reads. It is not threaded through App, and not saved.
- **The chips stand as a column** beside the Plant trees tile, since the
  build tray is one scrolling row.

## PR 37D — Trees answer the tilt

- **v2's shapes.** A tree stands by `heightScale()`, clamped to at most 1:
  - its crown settles onto the trunk as the camera leans overhead;
  - a broadleaf crown spreads up to 28% wider, since a canopy covers more
    ground than its height suggests;
  - a conifer keeps a quarter of its rise and none of the spread, so it
    stays a tight dark mark among the broad ones.
- **Test:** overhead, a broadleaf crown sits on its trunk and is 1.28
  times as wide, and a conifer keeps at least a quarter of its rise.

**As implemented:** as planned. The shapes are tested by rendering
`TreeAt` to static markup at the ladder's ends.

## PR 37E — The smooth turn

- **v2's eased quarter turn:**
  - 260 ms, ease-in-out;
  - the pivot on the ground below the middle of the screen, held there
    after each frame's commit;
  - retargeting from where the view has actually got to, not from the
    last target, which is a v2 bug not to copy;
  - tilt and Home cancel it.
- **Reduced motion keeps the snap.**
- **The walkers stop re-planning on every camera change.** Routes key on
  the campus; only their silhouettes and clips key on the camera.
- **Measured on a late campus** (`tools/profile.mjs` presses Q). If a
  frame runs over about 33 ms, the turn draws a lighter scene and restores
  the full one on the last frame. That scene has massing boxes, round
  crowns, no shadows and no labels, with the depth order sorted for each
  end of the turn.
- **Test:** the easing and the retarget, as a pure `turnStep`.

**As implemented:**
- **Measured first.** A full redraw of a Year-50 campus took 370–550 ms
  in the dev build. The turn drew one in-between frame and jumped.
- **So the turn always draws the massing** (`TurningScene.tsx`):
  - the ground, the grid, the road and the paths;
  - a box per building at its drawn footprint and height;
  - a round crown per tree;
  - flat facilities as their plates;
  - everything painted back to front by the ground it stands on.
- **The full scene is held,** hidden at its last rest view, so it does
  not redraw mid-turn. It redraws once as the turn ends, the same cost the
  snap always paid.
- **Mid-turn frames measured at 33–67 ms,** on a machine that was running
  the harness at the same time.
- **The hall marks and quad overlays hide for the turn.**
- **The walkers are split in two:**
  - routes key on the campus;
  - figures, the nearer-than axes and the clips key on the camera;
  - the clips are dropped while turning.
- **The pivot is the canvas centre,** as this game's snap used, not v2's
  lift of a storey and a fifth.

## What this plan does not do

- **Free rotation.** The map still rests on the four views that keep tile
  edges on a clean slope. Only the turn between them is smooth.
