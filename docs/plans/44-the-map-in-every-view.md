# Plan 44 — The map in every view

*Planning document only. Its job is to turn the review into a PR.*

**Status: In progress.**

---

## 0. The report, and what was found

A review of the campus map at all four azimuths and across the tilt
ladder (Plan 37's camera) found drawing that is right only at the opening
view. The camera turns, but a good deal of the motif code still assumed
+row and +col face the camera, the screen-left wall is the +row wall, and
heights are always seen at 30°. Grouped:

- **Paint order fixed to the grid.** Pitched roofs and pyramids (the
  spire, campanile cap, corner-tower caps, hipped roofs, gables, village
  houses, the Gothic canopy hood) painted their slopes in grid order, so
  in three views of four a back slope painted over a front one; the steep
  spire showed it worst. The stadium drew its stands, field and masts in
  one fixed order and hard-coded which stands showed their back walls;
  the arena always closed its +col / +row end and drew it last.
- **Screen sides standing in for grid sides.** The corner tower's "in
  front" test put it over the mass at a side corner; the scoreboard,
  press-box glazing, hospital cross, village doors and several tones
  (the bowl's tint, merlon tops, the recess slab, flues, the portico
  pediment, the dome's lit side) took the screen-left or screen-right
  wall where they meant a grid wall. The hood's halves were a bow-tie
  on the -row and -col walls. The site hoarding set its posts out by the
  wrong axis on its back boards. The progress bar lay on the +row edge,
  behind the building (and through it) from -row; the rotate control sat
  on the NE corner.
- **Shadows drawn with their object.** A quad's, a garden's and a
  village's trees, and a canopy, drew their shadows with themselves, so a
  shadow could land on a building painted before it.
- **Things that ignore the tilt or the turn.** The dome's lantern, flags,
  floodlight heads stood at fixed pixel heights; ground ellipses (walker
  shadows, lamp and flag feet) stayed 2:1 straight down; flags and
  banners always flew to the right of the screen.

And three drawing-data bugs in buildingSpec.ts:

- **Stories counted twice.** A library renovation or a dining extension
  raises servesPopulation and floorsAdded together; stories were read off
  the live figure and then had floorsAdded added, so the tier-1 library's
  first new floor took it from 3 stories to 5.
- **Chapter houses** (made at runtime, no facilityType) fell through to
  default footprint, motif and stories.
- **Capital projects** stood at a default two stories in the default
  render wall.

## 1. The PR

Visuals only: no sim or state changes, no save change.

- **Back slopes first** (`backSlopesFirst`, `pyramid`, `gableSlopes`):
  every sloped face is named by the way it points and drawn behind the
  faces toward the camera. The hood is rebuilt wall to eave from the
  wall; the glasshouse roof from grid corners.
- **The stadium by camera:** far stands, field, near stands; masts back,
  sides, front; board and press glazing on the walls facing the field,
  shown when those face the camera; posts lifted. `RakedStand` picks its
  back or front wall from the camera by default.
- **Grid walls, not screen sides:** the corner tower is in front only at
  the front corner, with its proud face repainted at a side corner; the
  arena closes its visible end; village doors on +row / +col when seen;
  the cross on the wing's visible wall that is neither its entrance nor
  against the slab; tones from the world (`pal.wall.posRow`,
  `WALL_LIGHT`, the sun's screen side for the dome); the hoarding's
  posts by `spanLeft` / `spanRight`, its boards by `faceTone`.
- **The progress bar** lies inside the edge under the visible left wall;
  **the rotate control** sits at the screen-right corner.
- **Shadows in the shadow pass:** a prop carries its shadows
  (`GroundProp.shadows`), and the pass moves over the flat plates so a
  shadow falls across a quad; the village lays its trees' shadows on its
  lawn first; a canopy's shadow only when thrown away from its wall.
- **Tilt and wind:** `groundSquash` for ground ellipses; lantern, finial
  and lamp heads foreshortened; flags and banners fly one world-fixed
  wind (`wind.ts`), projected like the crane's jib.
- **Stories from the building as built** (the catalog entry, cached),
  plus floors added; chapter houses a one-storey pavilion in the
  residence halls' wall on an explicit 3x3; `PROJECT_SPECS` for the
  projects. Covered in `building-spec.test.ts`.

## As implemented

Seven commits on `plan-44-the-map-in-every-view`, each checked before and
after in all four views on the Year-35 and Year-50 saves (and with the
vernacular switched for the Gothic, Classical, Mission and Modern parts).

Decisions where the review left a choice:

- **The wind** blows toward +col and more toward -row, so no quarter view
  sees a flag edge-on; at the opening view it is screen-right and a touch
  up rather than exactly level.
- **The hospital's cross** has no wall to go on with the camera on the
  -row side (the wing's other visible wall stands against the slab), so
  two views of four show none.
- **The corner tower at a side corner** is drawn before the mass with its
  proud face repainted after; the part of its inner face above the roof
  but behind the roof's near slope is still covered by the roof.
- **The canopy's shadow** stays with the canopy when the sun throws it
  outward (it lies on open ground in front of its own wall).
- **The capital projects:** arts as the performing arts center (3,
  limestone), research park as a lab (2, render), medical as the
  teaching hospital (8, clinical), graduate college as a 600-bed hall
  (4, brick), institute as the tier-1 library (3, limestone), museum as
  the gallery (2, limestone), commons as the largest dining hall (3, buff
  brick).
