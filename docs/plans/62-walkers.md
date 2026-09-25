# Plan 62 — Walkers

*Planning document only. Its job is to turn the owner's answers into a PR.*

**Status: Landed.**

---

## 0. The answers

The owner's playthrough notes, the walkers' three. No questions.

## 1. The PR

| Note | Change |
|---|---|
| Walkers still clip in front of trees | **Trees cut walkers too.** The woodland's trees and the quads' planted ones join the buildings as silhouettes (`trees.tsx`'s `treeOutline`, the same geometry the tree is drawn from); a tree stands at a point, so which of it and a walker is nearer is the points' own depth. A **screen-cell index** (`ShapeIndex`) keeps the per-frame test to the few shapes near each walker. |
| Walkers stop moving while paths are being drawn | Every tile of a stroke gave a new layout, and every walker replanned and waited for its route. **The routes now follow a path-only change once the paths have stood still for 0.7 s** (`CampusLayout.massKey`, the key without the paths); a building or a tree still replans them at once. |
| Walkers go through the fountain on Grand Quad & Gardens | **A ring walk round the fountain**, joining the four walks, and **the fountain not walkable**; a quad's walks cost a path's to the walkers (`quadGeometry.ts`, shared by the drawing and the walk grid). The first quad's monument is likewise walked round. |

**Tests:** `walk-routes.test.ts` (a walk across the Grand Quad goes round
the fountain, by the ring); `walker-occlusion.test.ts` (a walker behind a
tree is cut by it, one in front is not; the index agrees with the full
scan).

**As implemented:**

- With 160 walkers and some 800 trees on a thirty-year campus, the frame
  time was unchanged (16.6 ms, both before and after).
- No save change.
