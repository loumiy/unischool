# Plan 81 — A real place

*Planning document only. Its job is to turn the owner's ask, that the
campus feel like a place and not a model hanging in space, into PRs.*

**Status: Proposed.**

---

## 0. The owner's ask

The campus is a flat 126 × 126 parcel drawn on a plain green fill
(`--grass-deep`, behind the whole map). Past its edge there is nothing, so
at most zooms it reads as a board on a table. The owner asked for subtle
terrain and for ground that runs on past what the camera can see.

Of the options put to the owner, they chose:
- **the land around the campus:** a landscape beyond the parcel, drawn
  but not built on;
- **rolling ground beyond the campus:** gentle hills in that landscape,
  with the campus on a flat valley floor.

Not chosen: shading on the campus's own ground, and real slopes inside the
campus. Real slopes would touch the projection, the depth sort, siting,
paths, walkers, doors, hit-testing and shadows; they wait in the backlog
beside the faster renderer, which would carry elevation natively.

## 1. The PRs

| PR | Subject | Sim baseline | Save version |
|---|---|---|---|
| A | This plan; the backlog | no | no |
| B | The land around the campus | no | no |

## PR 81B — The land around the campus

- **A ring of land around the parcel**, several screens deep on every
  side, drawn under nothing the player can build on:
  - the road runs on off both ends of the parcel;
  - meadows and fields divided by hedgerows;
  - woods, from the existing tree art, thinning with distance;
  - a low town edge along the road: small roofs, not buildings the
    player can inspect;
  - gentle hills rising away from the parcel on the far sides, so the
    campus sits on a flat valley floor. The hills are drawn on the ring
    only; the parcel stays flat.
- **Haze:** the ring fades toward the sky color with distance, more at
  low pitch, so there is never a hard edge.
- **Stable and not state:** the ring is generated from the college's name
  (a seeded hash, as the rivals' colors are), so it is the same on every
  load, and nothing is saved. The vernacular colors its roofs.
- **Cheap to draw:** a few large shapes and a sparse set of trees and
  roofs, built once per camera view and memoized, and left out during a
  turn as the trees already are (Plan 80H). A turn must not get slower.
- **The camera** stops before the ring's outer edge can be seen at any
  zoom, pitch or view; the far edge dissolves into haze.
- **Checks:**
  - screenshots at every view, the widest zoom and the lowest pitch, on a
    new college and a year-30 campus, in two vernaculars;
  - a turn timed on the year-30 campus before and after, the way Plan 80H
    measured it;
  - `npm run check`, `npm run phone`; the sim unchanged.

## 2. The backlog

**Real slopes on campus** go under *Named, not sequenced*, beside the
faster map: gentle elevation inside the parcel, with buildings on leveled
pads and plinths on the downhill side. It waits for the new renderer.

## What this plan does not do

- No elevation inside the parcel; no shading on the campus's ground.
- Nothing in the ring is interactive, and it doesn't grow over the run.
