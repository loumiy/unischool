# Plan 42 — Walkers behind walls

*Planning document only. Its job is to turn the owner's report into a PR.*

**Status: In progress.**

---

## 0. The report, and what was found

The owner reported that walkers still clip through buildings.

The walkers are drawn over the whole scene, and a building nearer the
camera hides a walker behind it by clipping the walker to its outline
(Walkers.tsx, Plan 37). Three things let walkers show through:

- **The wrong building was applied.** A walker took the *first* building
  that passed two tests: nearer the camera, and a bounding box within
  twenty units of the figure. On a dense campus that building often
  covered nothing, and the building that did cover the walker was never
  looked at, so the walker was drawn over it.
- **Only one building per walker.** A walker behind two overlapping
  buildings could only be hidden by one of them.
- **Nothing during a turn.** Plan 37 dropped the outlines for a turn's
  length.

A probe on the Year-50 save sampled 7,200 walker positions, 400 walkers
over three seconds of play. In **813** of them a walker's body lay inside
a building's outline and was not clipped by that building. In every one of
those cases the walker was clipped by some other building instead.

## 1. The PR

- **`coveringBuildings`** picks every building that hides part of the
  figure, up to three:
  - nearer the camera by the depth sort's own rule;
  - with its outline over the figure's foot, waist, head or shoulders, or
    with a corner of the outline inside the figure's box.

  The figure's height follows the tilt, like the figure itself.
- **Each walker has three nested clip groups**, so two or three buildings
  can hide it at once.
- **The outlines are rebuilt through a turn** as well as at rest. Turn frame
  times on the Year-50 save match main's within noise, so the map's
  `turning` flag, now with no reader, is removed.
- **Test:** `walker-occlusion.test.ts`:
  - a walker behind a building is cut by it, and one in front is not;
  - with a nearer decoy listed first whose box is close but whose outline
    misses, the building actually over the walker is the one applied (the
    old rule picked the decoy);
  - in all four views, no building behind a walker ever cuts it, and a
    block of tall buildings can cut one walker twice.

**As implemented:** the same probe, run on the fix, finds **0** of 7,200.
