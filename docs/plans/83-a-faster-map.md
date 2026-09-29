# Plan 83 — A faster map

*Planning document only. Its job is to turn the backlog's "a faster map"
into PRs, starting with a prototype that decides whether the rest are
worth doing.*

**Status: In progress: A and B merged (#260, #261).**

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

**As implemented (#261): go, by the owner's decision.** The 30 ms bar
was missed: a turn frame measured 98 ms at 1×, against 200 ms on main. By
the rule above, that is a stop. The owner tried the prototype on a small
campus and asked which renderer slows down more as the campus grows. The
answer:

- **A turn.** Leaving aside the art's own JS, which both renderers pay,
  SVG's cost per element is about three times the canvas's. SVG pays
  React, the DOM, style, layout and paint, about 150 ms of a frame. The
  canvas pays the walk and the drawing, about 50 ms.
- **At Play.** SVG restyles the whole scene under the walkers every
  frame. The canvas repaints only when the map changes, and the walkers'
  cost does not grow with the campus.

The owner's words: "Let's go ahead with the canvas then." So B lands with
the painter and the flag, off by default, and C goes ahead. The lesson on
the art's JS floor stands (below): the canvas makes a turn about twice as
fast, not smooth.

- **The profile** (production build, the year-30 Completionist campus,
  main-thread CPU from Chrome traces, 1×). A turn commits three or four
  frames of about 200 ms each (195 ms in Plan 82):
  - **Script, 125–170 ms:**
    - the art's own JS, about 70 ms: formatting projected points into
      strings about 18, the depth sort about 10, then the paths, windows
      and masses;
    - React's render and commit, about 32 ms;
    - DOM calls, about 35 ms, mostly `setAttribute`;
    - garbage collection, about 14 ms.
  - **Rendering, 65–105 ms:** style recalculation 30–57, layout 11–15,
    paint 22–25, pre-paint and layerize about 10.
- **The prototype.**
  - `canvasPaint.ts` walked the element tree the art returns and drew it
    with `Path2D`.
  - A stand-in hooks dispatcher called the components directly. It kept
    each component instance, memo output and memoised value from paint to
    paint, so the desire lines and the paths were not recomputed on every
    paint.
  - Contexts came from the providers in the tree.
  - Class rules were resolved once per season from probe elements.
  - It also drew the scaffold pattern, the ring's gradients, ageMarks'
    masks (as clips), group opacity (as layers) and the few words of text.
  - `?map=canvas` painted the ground, paths, grounds, buildings, trees,
    dressing and the ring on a canvas at device pixels. Walkers, labels,
    marks and the ghost stayed SVG.
  - Nothing in the scene was undrawable: 0 unsupported elements at all
    16 views compared. It drew about 12,600–13,000 elements, of which about
    10,100–10,500 were shapes.
- **The numbers.** Main-thread CPU, medians of three alternating rounds of
  six turns, with frames pooled:

  | | SVG (main) | canvas |
  |---|---|---|
  | A frame of a turn, 1× | 200 ms | **98 ms** |
  | A frame of a turn, 2× | 205 ms | 103 ms |
  | The whole turn, 1× | 794 ms | 392 ms |
  | The whole turn, 2× | 833 ms | 373 ms |
  | The settling frame, 1× | 195 ms | 94 ms |
  | The settling frame, 2× | 224 ms | 97 ms |
  | A frame at Play, 1× | 23–26 ms at 14 fps | 9–10 ms at 57 fps |
  | A frame at Play, 2× | 23–27 ms at 14 fps | 12–14 ms at 55 fps |
  | A step of a pan | a transform | a full repaint, 60–170 ms |

  At Play the canvas repainted once in five seconds (the week's change);
  the SVG's low frame rate is the scene restyled under the walkers.
- **Where the canvas's 98 ms went** (a sampled profile, scaled to the
  trace):
  - the art's own JS, 40–50 ms: the depth sort, the paths, the masses and
    windows, the projection, and the path strings the art still builds;
  - the painter's walk and style lookups, about 25 ms;
  - the canvas calls (`Path2D`, `lineTo`, `fill`), about 20 ms;
  - walkers, React and garbage collection, the rest.

  A repaint in which only the view changed, with every memo kept, still
  cost 60–80 ms: the walk and the drawing of about 10,000 shapes.
- **The unflagged map.**
  - Without the flag, the map renders as before. `test/canvas-flag.test.ts`
    checks the flag, the points and the SVG scene.
  - A one-off comparison of the whole map's server-rendered markup
    against main found it byte-identical, 684 kB.
- **The differences.**
  - **In the stills, none the eye finds.** There were 16 pairs: four views
    at the default and the lowest pitch, in Georgian in winter and in
    Mission.
    - The mean pixel difference was 0.6–1.2 of 255, the level of JPEG
      noise.
    - At most 0.004% of pixels differed by more than 40, all on
      antialiased edges and the corner menu buttons.
    - Crops of windows and roofs, arches, glazing, trees, field margins
      and the haze show the same drawing.
  - **By construction, which stills do not show:**
    - doors do not open for walkers, because walkers set a class on the
      SVG door;
    - the completion ring does not play;
    - no hover or click on buildings, since there is no picking (as
      planned);
    - every step of a pan or zoom repaints the whole scene, so panning is
      visibly slower than the SVG's;
    - walkers run at about 57 fps at Play instead of about 14.
- **Why the bar could not be met.** Even a painter that cost nothing would
  leave the art's own JS at 40–50 ms a frame. The art recomputes every
  projected point in JS for each camera, so any renderer that reuses it
  pays that cost on every frame of a turn.
- **What was learned** (also in the backlog, and carried into C and D
  below):
  - Drawing the existing art on a canvas is faithful and needs no change
    to the art. The React-element walk works.
  - The floor is the art's per-camera JS. A fast turn needs one of two
    things:
    - the projection taken out of per-frame JS: geometry kept per building
      in world or per-face coordinates and projected by a transform
      (WebGL, or canvas with an affine transform per face). That changes
      the art's output, which this plan ruled out;
    - or a turn's in-between frames drawn from the last image (turned or
      crossfaded), with only the settled view redrawn.
- **Screenshots:** `docs/reviews/2026-10-canvas/`:
  - `83b-{svg,canvas}-{georgian-winter,mission}-v{0..3}-{default,low}.jpg`;
  - close-ups, `83b-{svg,canvas}-{georgian-winter,mission}-close.jpg` and
    `83b-{svg,canvas}-mission-fields.jpg`;
  - side-by-side crops, `83b-detail-*.jpg`.

## PR 83C — The scene on canvas, with picking

- **The canvas becomes the map** for the ground, paths, grounds,
  buildings, trees, dressing, the ring and the weather. The SVG scene
  stays behind `?map=svg` for comparison until E.
- **No React internals (from B).** B's painter answered the art's hooks
  with a stand-in dispatcher set on React's internals. C replaces it with
  explicit arguments:
  - the art's context reads become parameters, or one plain object passed
    down: colors, snow, banner, college name, developing weeks, venue and
    crowd;
  - the painter calls plain functions and uses nothing internal to React;
  - the SVG path renders identically, and the unflagged markup test still
    passes.
- **Sharp at every zoom, smooth to pan (from B).** B repainted the whole
  scene on every step of a pan, at 60–170 ms a step. In C:
  - the canvas is sized to device pixels;
  - panning shifts the last drawn image, and redraws only when a pan
    uncovers an edge or settles;
  - zooming scales the image during the gesture, and redraws when it
    settles;
  - a pan feels at least as smooth as the SVG's;
  - a turn or a tilt redraws each frame.
- **The completion ring stays an SVG overlay (from B).** It keeps its CSS
  animation, rather than the canvas repainting the scene for the 1.5
  seconds it plays.
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
- **Walkers open doors (from B).** Today a walker opens a door by setting
  a class on the SVG door, which a canvas does not have. The painter reads
  the open-door state instead: the doors held open, by building and wall.
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

- **A faster map:** now this plan (in progress after B).
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
