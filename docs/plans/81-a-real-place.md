# Plan 81 — A real place

*Planning document only. Its job is to turn the owner's ask, that the
campus feel like a place and not a model hanging in space, into PRs.*

**Status: Landed.** A and B merged (#254, #255).

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

**As implemented (#255):**

- **The land** (`ringLand.ts`, drawn by `Surroundings.tsx`): 200 tiles of
  country on every side, from a seeded hash of the college's name, never
  saved. Blocks round the parcel and the road are halved into fields
  (meadow, pasture, crop, plough, wood, pine), bigger with distance, with
  hedgerows round them out to 130 tiles; crops on the valley floor, grazing
  and woods up the hills. The road runs on off both ends, with its kerbs
  (the parcel's road gains its south kerb). The town stands on the side
  the name picks: houses on both sides of the road and across it from the
  campus, a lane or two, in the vernacular's walls and roofs, snow on them
  in winter; two or three farms on the far side.
- **Hills**: a height field, flat for 26 tiles round the parcel, then a
  slow rise and twenty rounded hills. The whole ring is lifted by it, and
  each field is lit by its slope in five steps. Slopes stay under the
  lowest pitch's sight line (tested), so the ground never hides itself
  and can be drawn as merged shapes. The parcel stays flat. A drawn ridge
  of hills on the far rim was tried and dropped: at the opening pitch it
  read as a band laid across the fields.
- **Woods**: a canopy pattern (crowns in the season's leaf colors), forty
  trees from the campus's own art at the edges of the near woods, and
  clumps of crowns further out, a dozen to a path.
- **Haze**: `--haze` is the map's background now; a radial gradient in
  tiles about the parcel (clear to about 70, solid by about 240) and a wash
  up the screen past the parcel, both stronger the lower the pitch.
- **Cheap**: about 550 nodes, in an `<svg>` of its own under the map's, so
  the map's own frames repaint none of it. Built once per name and camera.
  Sprites standing in front of the parcel are drawn over it by
  `CampusScene`, under the labels. While turning only the plate, road and
  haze show; the rest stays mounted and hidden and is updated when the
  turn settles.
- **The camera**: the canvas's corners are kept over the ring and its
  center within 70 tiles of the parcel, at every view and pitch; on a big
  screen at a low pitch the widest zoom closes in to fit (tested on four
  screen sizes).
- **The turn, timed** as in 80H (year-30 Completionist campus, laid out,
  production build, headless Chromium, main-thread CPU from a trace,
  medians of 12 turns, five runs each, before and after alternating; 4
  cores, loaded):

  | | Before | After |
  |---|---|---|
  | The whole turn, opening zoom | 701–735 ms (713) | 691–753 ms (703) |
  | The whole turn, widest zoom | 701–707 ms | 705–712 ms |
  | A frame of the turn | 108–114 ms | 111–115 ms |
  | The frame that settles it | 71–78 ms | 72–81 ms |
  | Main thread at Play (walkers) | 359–374 ms/s | 290–305 ms/s |

  The turn is unchanged within the machine's noise. A steady frame at
  Play is about a fifth lighter, most likely because the map's `<svg>` no
  longer paints a background under the whole scene (not isolated).
- **Checks**: `test/surroundings.test.ts` (stable per name, off the
  parcel and the road, houses apart, flat floor, gentle slopes, the
  camera's leash); `npm run check`; `npm run phone` and the touch check;
  the sim report shows no deltas; the door checker's hits are the same
  before and after. `docs/reviews/2026-10-campus-fixes/81b-*.jpg`: a new
  college and a year-30 campus at the widest zoom, the lowest pitch, a
  turned view, winter, Saint Aldric in Mission, and a phone; the
  `81b-before-*` shots are the first three before.

## 2. The backlog

**Real slopes on campus** go under *Named, not sequenced*, beside the
faster map: gentle elevation inside the parcel, with buildings on leveled
pads and plinths on the downhill side. It waits for the new renderer.

## What this plan does not do

- No elevation inside the parcel; no shading on the campus's ground.
- Nothing in the ring is interactive, and it doesn't grow over the run.
