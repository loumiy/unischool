# Plan 40 — The crane, from v2

*Planning document only. Its job is to turn the owner's request into a PR.*

**Status: Landed.**

---

## 0. The request

The owner asked for v2's better crane on buildings under construction.

This game's crane (`buildingMotifs.tsx`) was five stroked lines and a
weight: a mast, a jib, two ties and a hook line. A stroke stays a hairline
at every zoom, so it read as a diagram among buildings that have mass. Its
jib always pointed screen-right, whichever way the camera faced.

v2's crane (`src/ui/map/works.tsx`, its Phase 21A) is built from filled,
tapering beams:
- a latticed mast on a ballast pad;
- an A-frame with ties out to both arms;
- a cab;
- a jib with its trolley, hoist line and hook block;
- a counter-jib with its weights.

It foreshortens with the tilt, and its jib points along a fixed grid
direction, so it stays put on the ground as the camera turns. Whichever arm
points away from the viewer is drawn behind the mast head.

v2's scaffold is drawn the same way: standards, two lifts of ledgers and a
brace, all as beams. This game's scaffold was four stroked poles and one
rail.

## 1. The PR

- **`components/siteWorks.tsx`** holds v2's `beam`, `web`, `Crane` and
  `Scaffolding`, ported unchanged except for two things kept from this
  game:
  - the scaffold keeps its `base` footing, so an added storey's scaffold
    still stands on the roof;
  - the scaffold keeps its pole height, 2.6 times the site's height.

  The crane still goes up on a site at least five tiles long.
- **`buildingMotifs.tsx`** drops its own crane and scaffold and imports
  these.
- **Styles:**
  - v2's `crane-*` classes replace `site-crane line`;
  - the scaffold's poles and rails are fills, not strokes.
