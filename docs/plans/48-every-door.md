# Plan 48 — Every door

*Planning document only. Its job is to turn the owner's answer into a PR.*

**Status: Landed.**

---

## 0. The answer, and what was found

[The consistency review](../reviews/2026-09-consistency-review.md)'s Q15
found that doors follow the camera while walkers do not:
- Doors, porticos, steps and porches are drawn on the two walls the camera
  sees.
- Walker routes and desire lines all ended at the +row wall.
- In two views of four, the crowd streamed to a blank back wall and the
  drawn doors went unused.

The owner's answer: fix the walkers, not the doors.
- Every side of a building has a door in principle. The drawing shows the
  two sides in view.
- Walkers may use any door, except one whose side is built against by an
  adjacent building.
- Better walking, and doors that open as walkers go in and out.

## 1. The PR

- **A door on every wall** (`walkRoutes.ts`, `entrancesOf`).
  - Each wall's door is at its middle, where `Door` draws it.
  - It opens onto the tile outside that middle: one tile for an odd wall,
    the two either side of the middle for an even wall.
  - If any of those tiles is off the map or built over, that door is shut.
  - A building whose four doors are all shut is reached at the nearest
    open tile round its edge, as before.
- **The nearest doors.**
  - A route tree grows from every open door of the building a walker
    leaves, not from one door.
  - The walker goes in by the cheapest door at the other end, and leaves
    by whichever door that tree leads back to.
  - The walk runs from the wall, over the tiles, to the wall.
  - Desire lines read the same walks.
- **Through the door.**
  - A walker fades into the wall over the last third of a tile of its walk,
    and out of it over the first.
  - It is hidden while it rests inside.
  - A sports ground or a village green has no wall, so walkers stop at its
    edge in the open.
- **Doors that open.**
  - Each drawn door is tagged with its grid wall, and each building with
    its id.
  - While a walker is within 0.9 tiles of a door, going in or coming out,
    that door opens: its leaves swing in to slivers at their hinges and the
    lit hall shows through.
  - After a turn the scene redraws its doors for the new walls, so the open
    ones are set again.
- **Better walking.**
  - Legs that step along the way the walker is heading.
  - A small rise on each step.
  - Each walker has its own pace, within 15% of the rest.
  - Trousers in a few colors.
- **Tests** (`walk-routes.test.ts`):
  - four doors on a free-standing building, each at its wall's middle;
  - no door onto a neighbor, including half a doorway on an even wall;
  - a walled-in building is still reached;
  - a walk leaves by the door toward where it is going and ends at the door
    on the far wall;
  - the fade, and which doors a walker holds open.

**As implemented:** as above.
- **Frame rate.** The first version cost frames on the Year-50 save with
  360 walkers: 40 fps in the headless browser against `main`'s 57. Three
  changes brought it to 56–58, the same as `main`:
  - both legs are one path;
  - the doors have no transition, and each door is looked up once, not
    searched for across the scene on every opening;
  - a walker off the screen is not redrawn.
- **Kept as they are.** The bike racks and the Founders flag still use the
  +row wall. They are fixtures, not destinations, and the owner's answer
  was about the walkers.
