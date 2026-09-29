# Plan 83 — A faster map

*Planning document only. Its job is to turn the backlog's "a faster map"
into PRs, starting with a prototype that decides whether the rest are
worth doing.*

**Status: Proposed.**

---

## 0. The owner's ask

After Plan 82 put the whole scene back into every frame of a turn, the
owner asked what a faster map would take and whether it is advisable.
They agreed to the staged plan below: a canvas renderer that reuses the
existing art, with a measured prototype first.

## 1. Why the map is slow

- **The scene is SVG.** On a year-30 campus it is about 17,600 nodes:
  buildings, trees, props, dressing, walkers, paths, the ring of land
  (Plan 82's count mid-turn).
- **Panning and zooming are cheap.** They move one transform on the
  world group.
- **A turn or a tilt is expensive.** It changes every projected point, so
  React rebuilds and the browser restyles, lays out and paints the whole
  scene each frame. That costs 195–198 ms a frame on the year-30 campus
  (Plan 82's timings), so a 260 ms turn shows two or three in-between
  frames and takes about a second to settle.
- **Walkers pay twice.** A walker behind a building is cut by a clipPath
  built from the building's outline. Rebuilding those outlines for every
  angle is too costly, so during a turn walkers are not clipped (Plan
  82).
- **Tuning the SVG has hit its ceiling.** Plan 80H found about a fifth.

## 2. The approach: canvas 2D, reusing the art

- **The art is already close to renderer-neutral.** The motifs
  (`buildingMotifs.tsx`, `landmarks.tsx`, `trees.tsx`, `dressing.tsx`,
  `groundMarkings.tsx`, `pathways.tsx`) are functions of the projection
  that return polygons, paths and circles:
  - most colors are literal `fill` props;
  - about 150 elements take their color from a CSS class instead;
  - their only hooks read context: colors, snow, banners, the college
    name, developing weeks, venue crowding.
- **A painter, not a rewrite.** The painter walks the element tree those
  functions return and draws it on a `<canvas>` with `Path2D`. Class
  colors come from a table resolved once per season and theme from the
  stylesheet's tokens. Context comes in as arguments.
- **What stays the same:**
  - the projection (`isoProjection.ts`);
  - the depth sort (`depthSort.ts`, `sceneEntries`);
  - the seasons, the vernaculars and the art itself.
- **What stays as DOM or SVG, over the canvas:**
  - labels;
  - the hall, lab and full-residence marks;
  - the placement ghost and its rotate control;
  - tooltips, the toolbar, dust puffs and the crane.

  These are few and interactive, and the DOM serves them well.
- **No third-party dependency.** Canvas 2D is in every browser. WebGL
  (PixiJS or raw) stays a later option if canvas is not enough.
- **The sim is untouched:** no sim baseline or save change in any PR.

## 3. The PRs

| PR | Subject | Sim baseline | Save version |
|---|---|---|---|
| A | This plan; the backlog | no | no |
| B | Measure, and a canvas prototype: go or stop | no | no |
| C | The scene on canvas, with picking | no | no |
| D | Walkers in the depth order | no | no |
| E | The SVG scene retired; tools and access | no | no |

C to E happen only if B says go.

## PR 83B — Measure, and a canvas prototype

- **Profile first.** Take a turn on the year-30 Completionist campus and
  split a frame into React render and commit, style and layout, and
  paint. Record where the 195 ms goes.
- **The painter:** `src/components/canvasPaint.ts`.
  - It walks the element tree of the sorted scene and draws `polygon`,
    `polyline`, `path`, `rect`, `circle`, `ellipse`, `line` and `g`
    (transform, opacity).
  - It handles fill, stroke, stroke width and opacity, the class-color
    table, and the scaffold pattern.
  - Anything it cannot draw it counts and names, so the gaps are known.
- **Behind a flag** (`?map=canvas`): a canvas under the SVG draws the
  ground, paths, grounds, buildings, trees, dressing and the ring, and
  the SVG scene is hidden. Walkers, labels and marks stay SVG. Picking
  is not wired yet.
- **Measured on the same campus and machine, alternating with main:**
  - a frame of a turn, the whole turn, the settling frame;
  - a frame at Play;
  - at 1× and 2× device pixel ratio.
- **Compared:** screenshots of the flagged and unflagged map at the four
  views and two pitches, in two vernaculars, one of them in winter. The
  differences are listed.
- **The decision:**
  - **Go:** a frame of a turn at a median of 30 ms or less at 1×, and no
    difference the owner would notice.
  - **Stop:** otherwise. Record the numbers and the reasons here, and
    remove the flag and the painter. The backlog entry says what was
    learned.
  - The owner sees the numbers and the screenshots either way.

## PR 83C — The scene on canvas, with picking

- **The canvas becomes the map** for the ground, paths, grounds,
  buildings, trees, dressing, the ring and the weather. The SVG scene
  stays behind `?map=svg` for comparison until E.
- **Sharp at every zoom.**
  - The canvas is sized to device pixels.
  - Panning shifts the drawn image and redraws only when needed.
  - Zooming redraws at the settled scale, and scales the last image
    during a pinch.
  - A turn or a tilt redraws each frame.
- **Picking.** Hover and click find the building under the pointer from
  the depth-sorted outlines, front to back, instead of from DOM events.
  Hover highlight, inspect, the ghost's tile under the pointer and the
  path tool's drag all work as now.
- **Redraws only when something changes:** the camera, the layout, the
  season or snow, the inspected building, or a building finishing.
  Nothing redraws on a week where nothing on the map changed.
- **Checks:**
  - screenshots against `?map=svg` at every view and pitch;
  - a turn timed against main;
  - the door checker, `npm run phone` and the touch check;
  - `npm run check`, with the sim unchanged.

## PR 83D — Walkers in the depth order

- **Walkers are drawn on the canvas** inside the depth order, so a
  building nearer the camera covers them by being drawn later. The
  clipPath and outline machinery in `Walkers.tsx` goes, and walkers are
  correct at every frame of a turn.
- **Movement stays the same:** routes, gait and doors are unchanged.
  Only the drawing moves.
- **Cost at Play:** the walkers redraw every frame, so either redraw the
  scene each frame at Play (if B's numbers allow it), or cache the scene
  per camera and draw the walkers into it in order. PR D chooses and
  records why.
- **Checks:** the walker and door checks; a frame at Play timed against
  main with 340 walkers; frames of a turn showing walkers behind
  buildings.

## PR 83E — The SVG scene retired; tools and access

- **Remove** the SVG scene and the `?map=svg` flag.
- **Review tools** that read the map's DOM move to the canvas or to the
  scene list:
  - `tools/touchCheck.mjs` reads the world group's transform;
  - the gallery and `shootViews`;
  - anything else found.
- **Access.** The map's buildings are reachable without a pointer: a
  visually hidden list of buttons, one per building, named and ordered
  as the map is read. Focusing one highlights it on the canvas, and
  Enter inspects it.
- **Docs:** `docs/architecture/campus-map.md` describes the painter,
  picking and the layers that stay SVG.

## 4. The backlog

- **A faster map:** now this plan.
- **Real slopes on campus:** corrected. Slopes are a geometry change
  (siting, paths, doors, walkers, the depth sort, the projection), and a
  faster renderer removes only their cost, not that work. It no longer
  waits for this plan.
- **Half-step camera views (45°):** unchanged. They still need one-wall
  art for the straight-on views. After this plan the in-between frames
  of such a turn would draw at full speed.

## What this plan does not do

- No 45° views, no slopes and no WebGL.
- No change to the art, the depth sort's rules, the projection, the sim
  or saves.
