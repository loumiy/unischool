# Plan 83 — A faster map

*Planning document only. Its job is to turn the backlog's "a faster map"
into PRs, starting with a prototype that decides whether the rest are
worth doing.*

**Status: In progress: A to D merged (#260–#262, #264, #265).**

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

**As implemented (#262):** the canvas is the map. `?map=svg` keeps the
SVG scene for comparison until E. Outside a browser (the tests, the
review tools) the map renders its SVG.

- **No React internals.**
  - The art's context reads became parameters. Five readers were each
    split into a thin component that reads the context and a plain art
    function that takes the value: the roof flag (colors), the building
    mass (snow), the landmark (developing weeks, college name), the lamp
    (banner) and the raked stand (venue, crowd).
  - The memoised pieces export their own functions. The hook-using
    layers (the scene, the desire lines, the shadows, the paths) were
    split into their values and their art.
  - `canvasArt.ts` registers each such component with the painter as a
    plain function of its props and a scope. The scope carries the
    occasions, set by the providers in the tree, and memoised values kept
    from paint to paint.
  - `canvasPaint.ts` reads elements only through `type`, `props` and
    `key`. `test/canvas-scene.test.ts` checks that neither file names
    React's internals, element markers or context internals.
  - The SVG path renders identically: the whole map's server-rendered
    markup is byte-identical to main's (684 kB), and the door checker's
    report on three year-30 saves is identical (368 hits).
- **Sharp at every zoom, smooth to pan.**
  - The canvas is sized to device pixels, with a margin past each edge of
    35% of the map (at least 200 px).
  - A pan moves the painted image by a CSS transform on device pixels,
    which the compositor applies without a repaint.
  - It repaints only when the pan would show past the margin, or when it
    settles (140 ms) with less than half the margin left on a side.
  - A zoom scales the image through the gesture and repaints when it
    settles.
  - A turn or a tilt repaints each frame.
- **Picking.** The painter records every shape it draws that takes
  pointer events (read from the stylesheet as for colors). Each shape
  carries its world transform and the building it is in (`data-building`).
  - Hover and click ask for the topmost shape under the point, which is
    the SVG's own hit test: a tree in front of a hall still takes the
    click, and in placing or path modes buildings take none.
  - What is drawn before the first building (the land, the ground, the
    paths) is not kept.
  - A grid index is built on the first question after a paint, so a turn
    pays nothing for it.
  - Click opens the panel as the building's own handler did. The cursor
    and the tooltip (`label · w×h`) come from one `<title>` on the map.
  - The ghost's tile and the path tool read the ground by the
    projection, as before.
  - Against the SVG's `elementFromPoint` on a 24 px grid (1,768 points)
    at the default and lowest pitch and after a turn, in Georgian and
    Mission, picking agreed at 99.83–100% of points. The misses were
    single points on a shape's edge.
  - A hover costs 0.1–0.4 ms, against about 1 ms on main.
- **Redraws only on change:** the camera, the layout, the season or
  snow, the inspected building, a building finishing, the occasions, and
  the map's own modes (placing, a path tool, inspecting). At Play, the
  canvas repainted once in five seconds.
- **The completion ring stays an SVG overlay** in the world group, so it
  plays its CSS animation. For its 1.5 seconds it draws over nearer
  buildings, where the SVG drew it in the depth order.
- **The weather.** The map has no weather effects of its own. What it
  has is the season's palette and snow and the buildings' weathering
  (ageMarks' masks). All of it is on the canvas.
- **The numbers.** Main-thread CPU on the year-30 Completionist campus:
  medians of three alternating rounds against main (SVG), with turn frames
  pooled over six turns a round.

  | | SVG (main) | canvas |
  |---|---|---|
  | A frame of a turn, 1× | 199 ms | 99 ms |
  | A frame of a turn, 2× | 214 ms | 117 ms |
  | The whole turn, 1× | 795 ms | 380 ms |
  | The whole turn, 2× | 837 ms | 305 ms |
  | The settling frame, 1× | 201 ms | 105 ms |
  | The settling frame, 2× | 192 ms | 111 ms |
  | A frame at Play, 1× | 24–25 ms at 13–16 fps | 10–13 ms at 56–57 fps |
  | A frame of a pan, 1× | 13.6 ms at 30 fps (p90 21) | 6.1 ms at 57 fps (p90 10) |

  - **Frame rate.** At Play and in a pan the canvas runs at nearly twice
    the frame rate, and so spends more CPU a second. The SVG's frame
    rate is capped by restyling the scene under the walkers and the pan.
  - **The long frames.** A repaint when the map changes costs 80–110 ms
    (a frame up to about 250 ms). That happens at Play when something is
    built or changes, and after a pan that has used up half its margin.
    Otherwise a frame of a pan stays under 10 ms at the 90th percentile.
- **Screenshots against `?map=svg`.** Every view at all ten pitches, in
  Georgian in winter and in Mission: 80 pairs.
  - At the lowest pitch, where the view is the same in both, the mean
    pixel difference is 0.7 of 255, with at most 0.004% of pixels off by
    more than 40.
  - After a tilt, the view lands a few pixels differently from run to run
    in either renderer, so the pairs were aligned first. Canvas against
    SVG then gives a mean of 4.5–4.9, against 4.1 for the SVG against a
    second run of itself. The worst pair has 1.5% of pixels off, all at
    subpixel edges.
  - Nothing differs to the eye in the contact sheets or the crops.
- **Differences left:**
  - walkers still do not open doors (D reads the open-door state);
  - the completion ring draws over nearer buildings for 1.5 seconds;
  - through a zoom gesture the image is scaled until it settles, and a
    wide zoom-out in one gesture can show its edge for that moment;
  - the long frame of a full repaint, above, where the SVG redrew only
    what changed.
- **Checks:**
  - `test/canvas-scene.test.ts` paints a year-25 campus in Node at every
    view and the lowest pitch: nothing undrawable, every building
    pickable, no React internals;
  - `test/canvas-flag.test.ts` checks the flag and the SVG map;
  - the touch check and `npm run phone` pass on the canvas map;
  - the door checker's report is unchanged;
  - `npm run check` passes and `npm run sim` shows 0 deltas.
- **Screenshots:** `docs/reviews/2026-10-canvas/`:
  - `83c-{svg,canvas}-{georgian-winter,mission}-v{0..3}-p{0,3}.jpg` (the
    lowest and the default pitch);
  - `83c-sheet-{georgian-winter,mission}.jpg`: every view at every
    pitch, SVG beside canvas;
  - `83c-detail-inspect.jpg`: a building inspected, the rest dimmed.

**Fixed after it landed (#264):** a campus with a building under
construction stopped the game on the canvas map. The site's progress
(`SiteProgress` in `CampusMap.tsx`) read its weeks through a hook and was
never registered as canvas art, so the painter threw. It is split into a
reader and `siteProgressArt`, registered with the developing weeks passed
in; `test/canvas-scene.test.ts` now paints six sites at different stages
(it fails without the fix). The 83C test had changed only
`s.developing`, never a building's status, so no site was drawn.

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
- **The long repaint frame (from C).** C repainted the whole scene when
  anything on the map changed (80–110 ms). D keeps each building's
  drawing ready per view, so a change redraws only that building: a
  change at Play under about 16 ms on the year-30 campus. A turn frame
  may stay at about 100 ms.
- **The completion ring** in the depth order, if it comes easily.
- **Checks:** the walker and door checks; a frame at Play timed against
  main with 340 walkers; a building finishing, a path drawn, a week's
  change at Play and a pan past the margin timed; frames of a turn
  showing walkers behind buildings, and a door opening.

**As implemented (#265):** walkers are drawn on the canvas in the depth
order, doors open again, and the scene is kept as a drawing per thing.
The canvas no longer repaints the whole scene when something changes.

- **The scene as drawings** (`mapCanvas.ts`).
  - Each entry of the sorted scene (a building, a tree, a prop) is
    recorded once into a list of drawing ops (`canvasPaint.ts`'s
    `Recorder`) and drawn into its own `ImageBitmap` at the view's
    scale.
  - It is kept while its signature holds. The map computes that
    signature from what the art reads: the camera, the building's layout
    entry, whether it is inspected, its works' weeks, its crowd, the
    colors, the name.
  - So a week in which one building changes records and draws that
    building alone.
  - The C canvas (the view and a margin, moved by a CSS transform) is
    gone: the map's canvas is the size of the view.
  - Each frame lays the drawings down in paint order: the land behind,
    the ground, each thing, then the land in front (a few dozen sprites,
    drawn straight on).
- **Why drawings per thing,** rather than a repaint each frame or depth
  bands:
  - A repaint of the scene costs about 100 ms, so it cannot run at every
    frame of Play.
  - A cached picture of the scene cannot put a walker between two
    buildings.
  - Depth bands would redraw a whole band for one building's change, and
    a walker needs a boundary at every building in front of it.
  - Drawings per thing give both at once: walkers go between any two
    things, and a change redraws one thing.
- **Walkers in the depth order** (`walkerDepth.ts`).
  - Each walker is drawn just before the first thing nearer the camera
    whose drawing reaches it: the Plan 42 axis rules on its footprint,
    with a small thing (a tree, a lamp) compared by its centre.
  - A nearer building covers a walker by being drawn after it, at every
    frame, turns included.
  - `Walkers.tsx` lost its outlines, clip paths and screen-cell index.
    Routes, gait and doors are unchanged, and it hands the map its crowd
    (where each walker stands, and a painter for it).
  - On `?map=svg` the walkers are now drawn unclipped over the scene
    until E removes it.
- **Doors.**
  - The map reads the doors the walkers hold (building and wall), and
    the recorder draws those doors with `door-open` (`extraClass`), the
    class the SVG door took.
  - A building keeps up to six door variants, so a walker going in and
    out costs nothing the second time.
  - Door changes past 5 ms of a frame wait for the next frame.
  - The door checker's report is byte-identical to main's (70 saves,
    1,842 hits).
- **Frames that change little draw little.** When the view, the camera,
  the season and the layers stand as the last frame left them (Play),
  the frame is clipped to 32 px cells round:
  - what moved: the walkers where they were and are;
  - what changed: a thing whose drawing changed or was drawn straight
    on, and ground tiles drawn again.

  At Play at 1× that is about 170–240k of 1.14M pixels. A clipped frame
  matched a full one to within one pixel in twelve samples at 1× and 2×.
- **The ground and the land behind** are each one drawing of the view
  and a margin, kept in 128 px tiles.
  - A pan past half the margin wraps the drawing round instead of moving
    its pixels. After four long pans it matched a fresh drawing at 0
    pixels (1×) and 5 of 4.6M (2×).
  - A change the map can place (a path tile) is drawn at once there, and
    every other tile again within 150,000 CSS px² a frame, in view first.
    Desire lines can move anywhere when a path is drawn.
  - `replay` given a region draws only the ops that reach it, and of a
    long path only the subpaths that do.
  - Subpath boxes are cached by their text, and the stylesheet's rules
    are kept per map class (placing, a path tool, inspecting).
- **Turns.** Every frame of a turn records the scene at its camera and
  draws it straight onto the map, walkers in order (vector, as C did).
  - The frame that ends the turn does the same.
  - The drawings for the new view are made over the next frames: 20 ms
    of drawings a frame, and the tiles in view at once, with the rest
    drawn straight on meanwhile.
- **The completion ring** is drawn in the depth order, after its
  building. Its CSS keyframes are played on the canvas (1.5 s, in and
  out, eased; still under reduced motion).
- **A safety net.** A canvas frame that throws stops the canvas, logs
  the error and falls back to the SVG map for the session, instead of
  stopping the game. Checked by making a frame throw at Play: the SVG map
  took over and the game played on.
- **The numbers.** Main-thread CPU on the year-30 campus with about 340
  walkers, headless Chromium (software raster), against main (#264):

  | | main (C) | D |
  |---|---|---|
  | A frame of a turn, 1× / 2× | 112 / 133 ms | 128 / 132 ms |
  | The whole turn, 1× / 2× | 396 / 332 ms | 502 / 575 ms |
  | The settling frame, 1× / 2× | 104 / 125 ms | 190 / 291 ms |
  | A frame at Play, 1× | 13.0 ms at 56 fps, max 207 | 9.3 ms at 59 fps, max 81 |
  | A frame at Play, 2× | 15.8 ms at 49 fps, max 216 | 16.4 ms at 56 fps, max 87 |
  | A frame of a pan, 1× | 7.7 ms (p90 12.3, max 268) | 0.9 ms (p90 10.7, max 25) |
  | A frame of a pan, 2× | 9.9 ms (p90 12.9, max 371) | 0.7 ms (p90 24.9, max 34) |

  The changes, as the longest main-thread tasks and, for D, the canvas's
  own share:

  | | main (C) | D |
  |---|---|---|
  | A building finishing at Play | 176 ms | 76 ms (canvas 8 ms) |
  | A week's change at Play (doors, crowds, works) | 139–250 ms | 24–29 ms (canvas 5–11 ms) |
  | A building sited | 114–135 ms | 25–42 ms (canvas 17–24 ms) |
  | A path tile drawn | 108–312 ms | 30–36 ms (canvas 23–26 ms); the tool's first 160 ms |
  | A pan past the margin | 162–247 ms | 21–24 ms (canvas under 14 ms) |

  - **Changes at Play.** A building's change stays under the 16 ms the
    canvas was promised. A path redraws the ground's ops (6–14 ms of
    recording) and its tiles, 23–26 ms.
  - **The path tool's first tile** costs 160 ms. Most of that is
    recomputing the desire lines and shadows for the new layout, as the
    SVG map's render does, plus reading the stylesheet's rules under the
    tool's class once.
  - **The turn costs more in all:**
    - its frames cost about what C's do;
    - the frame that ends it, with the next, makes the new view's
      drawings, about 300 bitmaps and the tiles in view;
    - in this software raster the canvas's resource upload (about 40 ms a
      frame) lands in separate tasks.
  - That is the price of the drawings that make Play, pans and changes
    cheap. On a GPU the raster share is smaller.
- **Checks:**
  - `test/walker-depth.test.ts` checks the depth slot rules (14 checks),
    and `test/walk-routes.test.ts` is unchanged;
  - `test/canvas-scene.test.ts` records the scene and replays it (45
    checks), including the door hook and six sites under works;
  - the door checker is identical to main's;
  - `npm run phone` and the touch check pass;
  - `npm run check` passes and `npm run sim` shows 0 deltas.
- **Screenshots:** `docs/reviews/2026-10-canvas/`:
  - `83d-turn-{1,2,3}.jpg`: frames from the middle of a turn, and
    `83d-turn-{1,2,3}-walkers-on-top.jpg`, the same frames with the
    walkers drawn over everything, to compare;
  - `83d-behind.jpg`: crops of walkers behind buildings, over everything
    and in the depth order;
  - `83d-door.jpg`: a door a walker holds, drawn open, beside the same
    frame with no door held.

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
