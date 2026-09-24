# Plan 38 — The turn in full detail

*Planning document only. Its job is to turn the owner's report on the
quarter turn into a PR.*

**Status: Landed.**

---

## 0. The report, and what was found

The owner reported that the in-between frames of a turn take the detail
off the buildings, on a campus with only Founders Hall and a few paths,
where v2 turns a large map with no detail lost. They asked whether this
uses v2's method.

It does not:

- **v2 redraws the whole scene** at every in-between angle. Its turn is
  a React re-render of every polygon each frame, eased over 260 ms. v2's
  parcel is a quarter of this one's size.
- **Plan 37 swapped the scene for a massing view** for the whole turn
  (`TurningScene.tsx`): a plain box per building and one round crown per
  tree. It did this on every campus, whatever its size, because a full
  redraw of a Year-50 campus had measured 370–550 ms in the dev build.
  On a founding campus that cost is not there, but the massing was drawn
  anyway.

Profiling a full-detail turn showed where a frame's time goes:

- **Trees.** The founding woodland is about 700 trees, some 3,700 of a
  founding campus's 5,700 SVG nodes. Founders Hall is a few dozen. Every
  tree rebuilt all of its shapes each frame, although a turn changes only
  where a tree stands and where its lit cap sits.
- **Desire lines.** The worn-grass lines re-ran their whole route search
  (`walkGrid`, `desireLines`) on every camera change. The routes depend
  on the campus, not the camera.
- **A forced layout.** The turn's layout effect measured the canvas every
  frame, straight after React had rewritten the scene. That made the
  browser lay the whole scene out twice a frame.

## 1. The PR

- **The massing view is retired.** The full scene, hall marks and quad
  overlays are drawn at every in-between angle, as v2 draws them.
- **A tree is drawn about its foot** (`trees.tsx`):
  - an outer group translated to the foot;
  - a memoised body (trunk and crowns), keyed on species, size and tilt;
  - the lit cap drawn outside the memo, since it follows the sun.

  A turn therefore changes two attributes per tree.
- **Desire lines** find their routes once per layout and only re-project
  them per camera.
- **The canvas is measured once, when the turn starts,** and carried with
  the turn's pivot through its last frame.
- **Tests.** `trees.test.ts` checks that a part-turn moves a tree and
  leaves its body's markup unchanged.

**As implemented:**
- **Rest views are unchanged.** Screenshots of a founding and a Year-50
  campus against main differ in about 1,470 pixels each, all below a
  channel difference of 24 (anti-aliasing from rounding).
- **Frame times** were measured in headless Chromium with software
  rendering on a production build. They are slower than a desktop browser
  with a GPU, so they are useful for comparison only.
  - Founding campus, full detail: from 83–133 ms to about 50 ms a frame.
  - Year-50 campus, full detail: from 217–417 ms to 83–233 ms a frame.
  - The massing view it replaces ran at 17–33 ms mid-turn, then paid
    about 417 ms to swap the full scene back on the last frame.
- **A slow machine shows fewer in-between frames.** The turn is timed,
  not frame-counted, so it still takes 260 ms, but every frame drawn is
  a whole one.
- **Walkers still drop their occlusion clips mid-turn** (Plan 37). That
  is invisible at that speed, and cheaper.
