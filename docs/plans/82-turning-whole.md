# Plan 82 — Turning whole

*Planning document only. Its job is to turn the owner's ask, that a turn of
the view draw the whole campus on every frame, into a PR.*

**Status: Landed.** A merged (#259).

---

## 0. The owner's ask

"Rotation is broken … walkers, trees and outskirts disappear on in-between
frames … We previously had a build that rotated 90 degrees with everything
intact -- can we just go back to that?"

## 1. What changed, and why

A quarter turn is eased over `TURN_MS` (Plan 37), and each of its frames
redraws the scene at a new angle.

- **Plan 80H (#248)** drew those frames light: the buildings, the ground
  and the paths, without the trees, the props on the grounds, the lamps
  and the benches, and with the walkers hidden (`visibility`), all back on
  the frame the turn settled. Its own measurement: a frame of the turn
  went from 58–73 ms to 48–64 ms, about a fifth lighter, and the whole
  turn cost about the same (about 0.6 s wall time either way), because the
  settling frame then rebuilt everything that had been left out.
- **Plan 81B (#255)** did the same for the land around the campus: through
  a turn the ring was its flat plate, road and haze, the rest held at the
  view it last rested on and hidden.

The trade was not worth it: the turn is no quicker, and what the owner sees
is a campus losing its trees, its people and its surroundings for a quarter
of a second. This plan undoes it.

## 2. The PR

| PR | Subject | Sim baseline | Save version |
|---|---|---|---|
| A | The whole scene through a turn | no | no |

## PR 82A — The whole scene through a turn

- **The campus whole on every frame of a turn:** trees, props on the
  grounds, dressing. `CampusScene` loses its `turning` short-cuts; 80H's
  other changes (the quads, the lab roofs, the pips and marks memoised per
  state) stay.
- **The land around the campus whole on every frame**, at the angle the
  turn has reached, built afresh; the per-name, per-view cache stays for
  the views the camera rests on.
- **Walkers seen through a turn, where they belong.** Before 80H they were
  drawn displaced; find why and fix it, so each is drawn at the angle the
  scene is drawn at on every frame. Clipping behind buildings may be left
  out during the turn if building the outlines every frame costs too much.
- Tilt and reduced motion snap, as now.
- **Checks:** a check that the scene mid-turn holds its trees and the
  ring; `npm run check`, `npm run phone`, the sim unchanged; the door and
  walker checks green; a turn timed against main on the year-30 campus;
  frames from the middle of a turn, before and after.

**As implemented (#259):**

- **Why the walkers were displaced:** their loop runs on its own
  `requestAnimationFrame` and projected with the projection's current
  camera (`project`, a module-wide frame). A turn's frame callback sets
  that camera for its next frame (`setCamera`) and only then asks React to
  draw it, so the walkers' loop, running before the scene's commit, drew
  the crowd at an angle the scene had not reached. 80H's own note says as
  much ("its loop read the new angle a frame or more before the scene had
  turned").
- **The fix:** `projectorFor(camera)` (isoProjection.ts), a projection held
  to one camera. `Walkers` takes the camera with each commit, in a layout
  effect, and places the whole crowd for it there, before the frame is
  painted; its loop draws with that projection only. Through a turn the
  loop walks the crowd on and the commits draw it, so walker and scene
  always share an angle.
- **Clipping, decided:** skipped through the turn. Building every
  building's outline at every angle is what 80H found costly; for the
  quarter second a walker may show through a building, and the settling
  frame builds the outlines for the view it rests on (as a tilt does). The
  canvas's size, which the loop reads to leave off-screen walkers alone, is
  not read mid-turn (it would lay out the scene the turn has just drawn).
- **The scene:** `sceneEntries(layout)` (exported from CampusMap.tsx) is
  the sorted scene, whole at every angle; `CampusScene` has no `turning`.
- **The ring:** `RingBack` and `RingFront` draw `ringView(name, keep)` at
  every angle; a turn's in-between views are built each frame and not
  kept (`keep` false), so they never push the rested views out of the
  cache, and the two layers share one build a frame. The flat-plate
  stand-in and the hidden layers are gone.
- **Tilt and reduced motion** snap as before.
- **The turn, timed** on the year-30 Completionist campus as 80H and 81B
  timed it (production build, headless Chromium, main-thread CPU from a
  trace, medians of 12 turns, runs alternating with main, loaded 4-core
  machine):

  | | Main (light turn) | Plan 82 |
  |---|---|---|
  | The whole turn | 760–801 ms | 873–960 ms |
  | Wall time to a settled view | 819–856 ms | 907–1077 ms |
  | A frame of the turn | 107–127 ms | 195–198 ms |
  | The frame that settles it | 67–88 ms | 53–71 ms |
  | SVG nodes mid-turn | 13,035 | 17,611 |

  A frame of the turn costs most of twice what the light one did (80H's
  saving was measured at a fifth on a lighter campus; with the ring and
  the walkers now drawn every frame too, and the depth order moving every
  tree each frame, it is more), so a turn draws fewer in-between frames
  in its quarter second. The whole turn costs about 15% more CPU and 10–25%
  more wall time than main; the settling frame is lighter, having nothing
  to bring back. Drawing the ring every frame is about 2–3% of the turn.
  On this machine main's turn settles in about 0.8 s, not 80H's 0.6 s
  (that was measured on another, differently loaded run); Plan 82's in
  about 0.9–1.1 s, somewhat slower than main here.
- **Checks:** `test/turning-whole.test.ts`: at three angles between two
  views the sorted scene holds every tree and the buildings, and the ring
  renders its fields, road and trees with nothing hidden. `npm run check`,
  `npm run phone`; the sim unchanged; the door checker unchanged.
  `docs/reviews/2026-10-campus-fixes/82-turn-mid-*.jpg`: four frames from
  the middle of a turn (30%, 50%, 70%, and 50% closer in), trees, walkers
  and the ring present; `82-before-turn-mid-*.jpg` the same frames from
  main, without them.
