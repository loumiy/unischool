# UniSchool — Campus Assets: Scale, Detail, and Depth

*Planning document only — no gameplay code is changed by this file, and nothing
it proposes changes a cost, a gate, a grant, a footprint, or a save. Its job is
to work out why the campus map's art reads as inconsistent, and to sequence the
work that makes every asset on the map share one scale, one detail vocabulary,
and one correct notion of what stands in front of what.*

**Status: A, B and C shipped; D-G proposed.** The depth sort (PR A), the unit system
(PR B) and the bay grid (PR C) are on the branch, each with a test that pins
its invariant. The
sections below are kept as written, with the two shipped PRs marked in the
sequencing table — the audit in §1 is the state of the code BEFORE this work
and is left intact as the record of what was measured.

---

## 0. The finding that reorders everything

The brief names four complaints — doors that look like one shape stretched
different ways, windows of different shapes and sizes, heights that don't match
floor counts, and buildings that clip through each other. The first three are
not three problems. They are one problem, seen three times.

**There is no unit system.** `buildingMotifs.tsx` carries three independent
tables — `HEIGHT`, `WALL_GRID`, and `DOOR` — and each one invents its own
scale from scratch:

- `HEIGHT` is an absolute screen number per motif (`hall: 84`, `pavilion: 42`).
- `WALL_GRID` is a *count* per motif (`hall: [8, 3]`) — eight windows along a
  wall regardless of how long the wall is, three up it regardless of how tall
  the building is.
- `DOOR` is half a real measure and half a ratio (`hall: [1.0, 0.46]`) — one
  tile wide, and forty-six percent of whatever the wall's height happens to be.

None of the three can be converted into either of the other two. A motif's
height knows nothing about how many ranks of windows will be drawn on it; the
window grid knows nothing about how long the wall is; the door knows nothing
about either. So the moment two buildings differ in footprint or in height —
which is the entire point of the footprint ladders in `campusMap.ts` — every
detail on them silently changes size, and changes size *by a different factor
on each of the two visible walls of the same building*.

That is exactly what the brief describes, and it is measurable. Everything in
§1 below is computed from the tables as they stand today.

**So the order of work is not the order the brief lists.** The depth-sorting
bug is genuinely independent and should ship first because it is a pure bug
fix. But the three art complaints all dissolve into one change — *define a
scale, and derive every dimension from it* — and until that change lands, any
new detail added to any motif is one more thing authored in units that agree
with nothing.

---

## 1. The audit

Screen units converted to metres using the map's own declared scale, and the
convention that one tile of height projects to `TILE_W / 2` = 32 screen units
(the ratio at which a one-tile cube reads as a cube in 2:1 dimetric).

### 1a. A storey is between 6 m and 26 m tall, depending on the building

`HEIGHT[m] / rows` — how tall one rank of windows is — across the catalogue:

| motif | height | window ranks | metres per storey |
|---|---:|---:|---:|
| tower (shaft) | 156 | 12 | **6.1** |
| block (hospital) | 104 | 5 | 9.8 |
| residential | 54 | 2 | 12.7 |
| hall | 84 | 3 | 13.1 |
| works (lab) | 30 | 1 | 14.1 |
| portico (library) | 68 | 2 | 15.9 |
| pavilion | 42 | 1 | 19.7 |
| hangar (gym) | 56 | 1 | 26.3 |

A residential tower's floors are a quarter the height of a dining hall's. This
is the brief's "the height of buildings and the number of floors it has don't
seem to be proportional", stated as a table: **there is no relationship between
the two at all**, because the two numbers are authored in different tables and
neither is derived from the other.

There is one number in the file that *is* a real storey height —
`STOREY_HEIGHT = 17`, used when a renovated library gains a floor. It agrees
with nothing. A library's existing storeys are 34 units apiece; each floor the
player pays to add is 17. **A renovation visibly adds half a storey.** That is
a live bug, not just an inconsistency.

### 1b. Windows are a different size on every wall, including the two walls of one building

Because `WALL_GRID` is a count, a window's width is `wall length / count`. The
two visible walls of one building have different lengths, so they get different
windows:

| motif | window on the long wall | on the short wall | window height |
|---|---:|---:|---:|
| hall (8×6) | 6.60 m | 4.95 m | 5.78 m |
| residential (9×4) | 5.94 m | **2.64 m** | 5.57 m |
| portico (7×5) | 6.60 m | 4.71 m | 7.01 m |
| block (11×11) | 7.26 m | 7.26 m | 4.29 m |
| pavilion (5×4) | 5.50 m | 4.40 m | **8.66 m** |
| works (4×3) | 6.60 m | 4.95 m | 6.19 m |
| hangar (6×5) | 5.66 m | 4.71 m | **11.55 m** |
| tower (shaft) | 5.08 m | 5.08 m | **2.68 m** |

A residence hall's windows are **2.25× wider on one wall than the other**.
Window heights run from 2.7 m to 11.6 m across the campus. A single-storey
supermarket carries a window two and a half storeys tall.

And this is *before* rotation: rotating a building swaps `w` and `h`, so
rotating a residence hall changes the size of every window on it.

### 1c. Doors are one shape stretched to eight different proportions

`Door` is a single parametric component. It is handed a width and a height and
draws the same surround, mull, leaves, transom and fanlight into whatever box
it is given. The boxes:

| motif | door width | door height | aspect (w : h) |
|---|---:|---:|---:|
| hall | 15.00 m | 18.11 m | 0.83 |
| residential | 9.30 m | 10.13 m | 0.92 |
| portico | 15.00 m | 14.03 m | 1.07 |
| pavilion | 12.75 m | 10.24 m | 1.25 |
| works | 9.00 m | 7.03 m | 1.28 |
| hangar | 18.75 m | 12.08 m | 1.55 |
| block | 27.00 m | 10.72 m | 2.52 |
| tower | 24.00 m | **0.88 m** | **27.38** |

This is the brief's "a lot of doors that look like the same shape stretched
different ways" — and it is literally true: it *is* the same shape, stretched.

The tower's entry is a second live bug. `DOOR.tower`'s comment says its height
fraction is small because it is measured "as a fraction of a 190-unit mass" —
but the tower motif draws its door against `PODIUM_H` (34), not against the
190-unit mass. `0.055 × 34` is 1.87 units. The retail podium that
`campusData.ts` spends four paragraphs justifying has a shopfront **0.88 m
tall**, on a 24 m opening.

### 1d. The depth sort mis-orders about one in seven overlapping pairs

`CampusMap.tsx` sorts everything on one scalar, the footprint's far corner:

```ts
depth: m.p.row + m.p.h + m.p.col + m.p.w
```

For two *point-like* things this is correct. For rectangles of different shapes
it is not, and no scalar can be: whether A occludes B depends on how A and B
are *separated*, not on where their far corners fall.

The truth, for two disjoint axis-aligned footprints, is the separating-axis
test. Two disjoint rectangles are always separated along at least one axis, and
on this projection greater `col` is nearer the camera (down-right) and greater
`row` is nearer (down-left). So:

```
if (a.col0 >= b.col1) a is in front        // separated on col, a further along
if (b.col0 >= a.col1) b is in front
if (a.row0 >= b.row1) a is in front        // separated on row
if (b.row0 >= a.row1) b is in front
```

…evaluated only for pairs whose screen boxes actually overlap (a pair separated
on *both* axes gets two contradictory verdicts and needs no ordering, because
it does not overlap on screen at all).

Measured against that truth over 400 random layouts of 70 buildings drawn from
the real footprint catalogue: of ~25,000 pairs that overlap on screen and
occlude each other, **the current scalar mis-orders 3,717 — about 15%.**

The failure has a shape. It happens when one building is much longer along one
grid axis than the other is: a 12-wide dining hall on rows 0–1 scores
`1 + 12 = 13`, a 2×2 lab directly in front of its left end on rows 1–3 scores
`3 + 2 = 5`, so the lab is drawn first and the dining hall paints over it —
even though the lab is nearer the camera. That is precisely the reported
symptom: *objects in the background overlapping objects in the foreground*.

There are three smaller instances of the same class of bug:

- **Rooftop plant is drawn in authored order, not depth order.** The `works`
  roof boxes are listed at depths 0.30, 0.92, 0.78 — the nearest box is drawn
  before the farthest, so plant behind paints over plant in front.
- **`GroundProp` carries a point, not an extent.** A hedge on the Grand Quad
  spans a real rectangle but sorts on its near corner alone, so anything
  standing beside its far end can order wrongly against it.
- **The village's houses sort on `row + h + col + w`** too — harmless today
  only because every house in a village happens to be the same size.

---

## 2. The proposal

Four foundations. Each one is a small module or table, and each one replaces a
place where a dimension is currently invented.

### A. One scale — `src/components/campusScale.ts`

Two conversions and four constants, and every other number on the map derives
from them.

```ts
// One tile is 9 m on a side, for DRAWING purposes.
export const METRES_PER_TILE = 9;

// How far one tile of HEIGHT rises on screen. DERIVED from the projection, not
// chosen: project() is an axonometric at azimuth 45 degrees, and its two
// constants pin the camera's pitch (sin p = TILE_H / TILE_W, i.e. 30 degrees)
// and its uniform world scale (k = TILE_W / sqrt2). A vertical edge is
// foreshortened by cos(pitch), so:
const PITCH = Math.asin(TILE_H / TILE_W);                      // 30 degrees
export const UNITS_PER_TILE_UP = (TILE_W / Math.SQRT2) * Math.cos(PITCH);  // 39.19

const UNITS_PER_METRE = UNITS_PER_TILE_UP / METRES_PER_TILE;   // 4.355

export const STOREY_METRES = 3.9;

export const across = (m: number) => m / METRES_PER_TILE;   // -> tiles
export const up = (m: number) => m * UNITS_PER_METRE;       // -> screen units

export const STOREY = up(STOREY_METRES);   // 16.98
```

**`STOREY` comes out at 16.98 — which is `STOREY_HEIGHT`, the constant already
in the file.** The one number in `buildingMotifs.tsx` that was authored as a
real storey height is correct; it simply was never used to derive anything.
This proposal promotes it rather than replacing it, which is the strongest
evidence available that the scale being chosen here is the one the art was
always reaching for.

There is **no vertical exaggeration constant**, and that is worth dwelling on
because the first draft of this plan had one. It took the convenient shortcut
of calling a tile of height `TILE_W / 2` = 32 units, which is the number a
sprite artist would use, and then needed a 1.2x stretch on top to make the
buildings look right. The true foreshortening is 39.19, and **39.19 / 32 =
1.22** — the "stylistic" exaggeration was the shortcut's own error, wearing a
justification. Deriving the vertical scale from the projection instead makes
the fudge factor disappear and the storey height land on a textbook 3.9 m
floor-to-floor. A campus drawn to a scale it can state exactly needs no
apology.

On `METRES_PER_TILE = 9` versus the 15 m that `campusMap.ts`'s footprint
comment cites: 15 m is what the football stadium's footprint was sized from,
and **footprints do not change** under this plan, so nothing about placement is
being restated. What changes is that *above-ground* dimensions get an honest
scale of their own, and 9 m is the one the buildings are actually drawn at (an
8-tile academic hall is a 72 m facade, which is a real academic hall; at 15 m
it would be 120 m, which is longer than the building in the reference photo by
half). The stadium reads slightly small in absolute metres as a result. It is
still the largest thing on campus, nothing mechanical reads the number, and one
honest drawing scale is worth more than a footprint rationale the art never
obeyed.

### B. Storeys, not heights

Replace the `HEIGHT` table with `storeysOf(t)` — a *drawing* rule keyed on data
the Buildable already carries, exactly as `footprintOf` is a *placement* rule
keyed on the same data. No new field on `Buildable`, no forked model; the
existing ladder pattern, applied to the one dimension the angled map added.

```ts
height       = storeysOf(t) * STOREY
windowRanks  = storeysOf(t)
```

**Those two lines are the whole fix for the brief's third complaint**, and they
make it structurally impossible to reintroduce: a building cannot be taller
than its floor count, because its height *is* its floor count.

Proposed ladders, keyed the same way `campusMap.ts` keys its footprints:

| building | storeys | height | (today) |
|---|---:|---:|---:|
| academic hall | 4 | 68 | 84 |
| professional school (`graduateProgram`) | 5 | 85 | 84 |
| founding dorm (350 beds) | 3 | 51 | 54 |
| early hall (500 beds) | 4 | 68 | 54 |
| mid-game hall (1,000 beds) | 6 | 102 | 54 |
| village house | 2 | 34 | 34 |
| residential tower (5,000 beds) | 2 podium + 12 shaft | 238 | 190 |
| university hospital | 8 | 136 | 104 |
| university clinic | 3 | 51 | 42 |
| library (t1, + `floorsAdded`) | 3 | 51 | 68 |
| research library | 4 | 68 | 68 |
| performing arts centre | 3 | 51 | 68 |
| art gallery | 2 | 34 | 68 |
| dining hall (by `servesPopulation`) | 1 / 2 / 3 | 17–51 | 42 |
| grocery | 1 | 17 | 42 |
| lab | 2 | 34 | 30 |
| gym / rec / arena / natatorium | clear span, 2.5 | 43 | 56 |

The 500-bed rung finally matches its own description. `campusData.ts` calls it
"A four-storey residence hall"; it is currently drawn with two ranks of windows
on a mass 12.7 m per storey tall. Under this table the blurb is *true*, which
is the kind of agreement between data and art that makes a campus read as one
place.

The stratification that falls out is the one a real campus has and this one
currently doesn't: sheds are low, teaching halls are mid-rise, residence halls
stand *taller* than the halls they serve, and exactly two things dominate the
skyline — the hospital and the residential towers.

A clear-span motif (`hangar`) is the one exception and is marked as such: it
has a height but no storeys, so it draws a continuous clerestory band instead
of ranks. A gym does not have floors, and pretending it has one rank of
26-metre windows is how it ended up with the tallest windows on campus.

### C. A bay grid — windows at a fixed real size

Replace `WALL_GRID`'s counts with a module:

```ts
export const BAY_METRES = 4.5;        // one structural bay -> 2 bays per tile
export const WINDOW_W_METRES = 1.8;   // 3.2 for the glazed families
export const WINDOW_H_METRES = 2.2;
export const SILL_METRES = 0.9;
```

Bays per wall = `round(spanTiles * METRES_PER_TILE / BAY_METRES)`, and the pane
inside each bay is placed at a fixed real width, a fixed real height, and a
fixed real sill above its own floor. Every window on campus is then the same
window, on both walls of the same building, on every building, at every
footprint, and unchanged by rotation.

Only *one* dimension varies by family, and it varies for a reason: a
curtain-walled tower or a hospital gets `WINDOW_W_METRES = 3.2` in the same
4.5 m bay, so it reads as glassier without reading as a different scale.

Detail this unlocks, cheaply:

- **Sills and lintels** — a light band under and over each pane. This is what
  makes the reference photo's windows read as windows rather than as holes.
- ~~**Glazing bars** via one `<pattern>` in `<defs>`~~ — **tried and removed.**
  The arithmetic is right and the drawing is wrong: a pattern is laid out in
  world coordinates and a pane is a skewed rectangle in a wall's, so every pane
  samples a different part of it. Some came out with a bright bar across one
  corner and some with none, and the rank read as irregular — the exact
  complaint this PR exists to fix. Drawing each bar in the wall's own (u, v)
  space would align correctly and triples the polygon count for a detail that
  is under a pixel at the zoom the map is played at. The panes are flat.
- **A spandrel course** between ranks, which is the horizontal banding that
  makes a multi-storey brick facade legible at low zoom.

### D. One door catalogue

Doors stop being a stretched box and become six named families, each with fixed
real dimensions. A `hall`'s door and a `portico`'s door are then *the same
door*, because they are the same family, not because they happen to be handed
similar numbers.

| family | w × h (m) | aspect | used by |
|---|---:|---:|---|
| `formal` | 4.0 × 5.4 | 0.74 | academic halls, library, performing arts |
| `civic` | 3.2 × 3.6 | 0.89 | student centre, dining, clinic, arena |
| `residential` | 2.2 × 3.0 | 0.73 | dorms, village houses |
| `service` | 1.6 × 2.6 | 0.62 | labs, works |
| `shopfront` | 6.0 × 3.4 | 1.76 | tower podium, grocery |
| `canopy` | 8.0 × 4.2 | 1.90 | hospital ambulance entrance |

Four of the six sit between 0.62 and 0.89 — one family of proportions, which is
what a door looks like. The two that are wide are wide because the things they
are (a shop window, an ambulance bay) are wide. Aspect ratios across the
catalogue go from a 33× spread to a 3× one.

`formal` at 5.4 m is taller than a 4.0 m storey on purpose: a portal that
reaches into the first floor is what an academic entrance *is*, and the
existing `doorBay` reservation already knows how to clear windows out of its
way — it simply needs to reserve in real units instead of in wall fractions.

The threshold gets the same treatment. The current `iso-door-step` is a 3-pixel
sliver; the reference photo's steps are a broad flight, and a real stair of
four or five treads under a `formal` door is one of the cheapest pieces of
detail available and one of the most legible at low zoom.

---

## 3. Founders Hall, and the academic halls behind it

The reference image is a Colonial Revival academic building: symmetrical red
brick, four storeys over a stone plinth, tall white multi-pane sash windows in
regular ranks, a projecting centre entrance bay with a stone surround and a
broad flight of steps, raised pavilions closing each end of the roofline, and a
white clock tower with a gilded dome over the centre.

Every one of those is a *motif element*, not a one-off drawing — which is what
makes "the other academic buildings have a similar style, without the spire" a
one-line change rather than a second motif:

| element | what it is geometrically | Founders only? |
|---|---|---|
| stone plinth | a 1.2 m base course in the trim colour, around the whole mass | no |
| string course | a band at each floor line, in trim | no |
| centre pavilion | a 0.3-tile-deep box, 2.5 bays wide, on the middle of each visible wall, carried ~6 units above the cornice | no |
| pediment | a triangle capping the centre pavilion | no |
| cornice + parapet | a trim band at the head of the wall, roof set back behind it | no |
| end pavilions | the outer 1.5 bays carried ~5 units higher | no |
| hipped roof | a shallow four-slope roof, ridge ~10 units — replaces today's 30-unit gable | no |
| entrance steps | a flight of 5 treads under the `formal` door | no |
| **clock tower** | square white base 1.4 tiles wide rising 2 storeys above the parapet, clock faces on both visible sides, an octagonal colonnade drum, a gilded dome, a finial | **yes** |

Today's `hall` motif is a gabled box with a 30-unit ridge — a ridge deeper than
a storey and a half, which is what makes the halls read as barns rather than as
the campus's landmarks. A shallow hip behind a parapet is both what the
reference building has and a far better silhouette at the zoom the game opens
at.

The clock tower keys off `GENED_BUILDING_ID`, which `techData.ts` already
exports for exactly this kind of "this one building is special" question — the
same pattern `RESEARCH_FACILITY_MOTIFS` uses to give four `lab`-gated buildings
four different roofs without widening the gate. No new field, no second motif,
no fork.

One consequence to handle explicitly: `labelHeightOf` must keep reporting the
*mass* height, not the tower's. A nameplate floating beside a cupola is worse
than no nameplate.

### Materials, not twenty-two tints

The last thing standing between the campus and cohesion is `FACILITY_TINTS`:
twenty-two pastels, each chosen against nothing. Of the 253 pairs the campus's
23 tints form, **40 sit within an RGB distance of 22** — the library and the
gym are 4.7 apart, which is a difference no player will ever see. None of them
is a material, and together they are why a campus of well-drawn buildings still
reads as a colour chart.

Replace them with five materials and two shared trims:

| material | colour | used by |
|---|---|---|
| `brickRed` | `#9e5240` | academic halls, dorms — the campus's default |
| `brickBuff` | `#c2a173` | dining, grocery, student centre |
| `limestone` | `#ded5c0` | library, performing arts, gallery, hospital |
| `render` | `#cfc7b4` | labs, works, sheds |
| `curtain` | `#9fb3bd` | tower shafts, the natatorium |
| *trim* | `#f0ece0` | plinths, string courses, cornices, window surrounds — every building |
| *roof* | `#5f6b5f` | slate and lead, everywhere |

`paletteFrom`'s five-shades-from-one-tint derivation is untouched and keeps
doing its job; it simply gets five inputs instead of twenty-two.

Note what happens to the current `BUILDING_TINT = '#c9a227'`, the "landmark
gold, never id-hashed". It is not deleted. It is **concentrated**: gold stops
being the colour of nine whole buildings and becomes the colour of the dome and
the finials on Founders Hall — the single gilded thing on the campus, which is
what the reference photo has and what makes a landmark read as one.

---

## 4. Clipping: the depth sort

### The algorithm

Replace the scalar key with a topological sort over the occlusion relation from
§1d. Two tiers, because the scene has two kinds of thing in it:

1. **Masses** (≤ ~70 placed buildings): pairwise edges, `O(n²)` = 2,415 tests.
2. **Point items** (trees, ground props — ~800): edges to masses whose screen
   box they overlap, plus edges to the at-most-six neighbouring tiles that can
   overlap them on screen. A 1×1 can only be occluded by another 1×1 in its
   immediate neighbourhood, so this stays `O(1)` per item rather than `O(n²)`.

Then Kahn's algorithm with a **priority on the existing scalar key**: where the
occlusion relation leaves the order free — which is most pairs — the scene
falls back to exactly today's ordering. The new sort is therefore strictly a
*repair* of the old one, not a different look.

A cycle-breaker on the same key is kept as a safety net, so a pathological
layout degrades to today's behaviour rather than dropping a building.

### Validation

Implemented and measured against a brute-force check of every occluding pair:

| | violations | cycle-breaks |
|---|---:|---:|
| current scalar key | 3,717 of ~25,000 occluding pairs (~15%) | — |
| two-tier topological sort | **0** | **0** |

Over 200 further scenes of 70 masses + ~700 trees, checking all ~55,000
occluding pairs per scene: **zero violations, zero cycle-breaks.**

Cost: **5.4 ms** for a full 70-mass + 790-tree scene. That is per *sort*, not
per frame — the result is `useMemo`'d on `s.placements`, `s.tech`, `s.trees`
and `s.pathways`, none of which change while the mouse moves, so it runs when
the campus changes and never during a pan, a hover or a zoom.

This is worth a test of its own — `test/depth-sort.test.ts`, following the
existing `rolldown`-and-run pattern, asserting zero occlusion violations over a
fixed set of seeded layouts. It is exactly the kind of property that regresses
silently and the kind a test pins permanently.

### The three smaller fixes, same PR

- Sort each motif's rooftop plant by `u + v` before drawing it.
- Give `GroundProp` a `w`/`h` so hedges, stands and fences enter the sort as
  rectangles rather than as points.
- Route the village's houses through the same comparator as everything else.

### What deliberately does *not* change

The flat ground plates (`groundPlaced`) keep their pre-pass ahead of every
mass. A zero-height plate cannot occlude anything, so sorting it against masses
at all was the original bug the pre-pass was introduced to fix. It stays.

---

## 5. Sequencing

Each PR ships on its own and leaves the map in a better state than it found it.

| PR | what | why here |
|---|---|---|
| **A** ✅ | The topological depth sort, its test, and the three smaller ordering fixes | Independent of everything else, pure bug fix, highest value per line changed, and it is the complaint that is still live. Ships first. **Shipped:** 0 occlusion violations against the old key's 10,826 on the same layouts; ~3ms per sort, memoised. |
| **B** ✅ | `campusScale.ts` and `buildingSpec.ts` (no JSX in either); `storeysOf`; height and window ranks derived from it | The foundation. Nothing after this is authored in invented units. Fixes the library's half-height renovation on the way past, and keeps the specification separate from the renderer — see §6. **Shipped:** one storey height campus-wide (3.9 m everywhere, was 6.1–26.3 m), `height = storeys × STOREY` and `ranks = storeys` asserted over the whole catalogue. |
| **C** ✅ | The bay grid: windows at fixed real size, floor courses | Needs B's storey count to know how many ranks to draw. **Shipped:** three window sizes campus-wide (standard, wide-glazed, shopfront), all one height, measured off the rendered DOM. The glazing-bar pattern was built and then removed — see §2C. |
| **D** | The door catalogue: six families at fixed real sizes, real entrance steps | Needs B's storey height to sit a `formal` portal correctly. Fixes the tower's 0.88 m shopfront. |
| **E** | Founders Hall and the academic halls: plinth, string courses, centre pavilion, pediment, cornice, end pavilions, hipped roof, and the clock tower | Needs C and D — the vocabulary is built out of bays and doors. |
| **F** | Materials, not tints: five materials, two shared trims, gold concentrated on the dome | Last on purpose. Colour is the change most likely to want a second opinion, and it is the one PR that is trivially revertible on its own. |
| **G** *(optional)* | The rest of the catalogue brought to the same vocabulary — a real colonnade on `portico`, a clerestory on `hangar`, plinth and banding on `block`, an entrance canopy on `pavilion` | Cleanup that E's vocabulary makes cheap. |

A–D are mechanical and low-risk. E is the one with real drawing in it. F is a
judgement call and is sequenced so it can be taken or left.

## 6. Does a rotating or tilting camera overwrite all of this?

Asked before starting, and it deserves a direct answer, because the two things
the question could mean have different answers.

### If "rotate" means 90-degree steps and "tilt" means a few fixed pitches

Nothing here is overwritten. Most of it is a **prerequisite**.

`isoProjection.ts` is already parameterised on exactly the two numbers a
discrete camera needs. The pitch is `asin(TILE_H / TILE_W)` — **tilt *is*
`TILE_H`.** Drop it from 32 to 26 and the camera rises from a 30-degree pitch
to 24 degrees; the scale module above then recomputes `UNITS_PER_TILE_UP` and
every storey, sill, window head and door on the campus re-foreshortens
correctly with no table touched. That only works if the vertical scale is
derived rather than authored, which is the change made two sections up. A
hard-coded 32 with a 1.2x stretch bolted on would have had to be re-tuned by
hand at every pitch.

Rotation is a coordinate transform applied to `(col, row)` before `project()`.
The parts of the plan that touch walls survive it because of a decision the
codebase already made:

- **`facePoint(origin, along, height, u, v)` is face-agnostic.** It
  parameterises *any* wall in that wall's own coordinates. The bay grid (PR C)
  and the door catalogue (PR D) are authored in `(u, v)` and metres, so they
  apply to a north or east wall with zero changes — you hand them a different
  origin and a different `along`, and the skew comes out right for free.
- **`SLOPE()` already keys roof faces by GRID DIRECTION rather than by role.**
  Its own comment explains why: a palette that names faces "lit" and "shade"
  "can only be right for one of the two orientations". That is precisely the
  discipline a rotating camera needs, made two PRs before anyone asked for one.
- **`boxFaces` returns only `top`, `left`, `right`.** Rotation needs all four
  walls. But that is true of the code *today*, independent of this plan — and
  it is one generalisation in one function, shared by every motif at once.

And the depth sort is not merely compatible with rotation, it is required by
it. **The current scalar key `row + h + col + w` hard-codes the camera**: it
assumes increasing `col` runs down-right and increasing `row` down-left. Rotate
90 degrees and it is not 15% wrong, it is inverted. The separating-axis
comparator in PR A takes the camera's near-direction as a parameter — or,
equivalently, sorts in camera space — so it is correct at all four rotations by
construction. `CampusMap.tsx`'s own module comment already names camera
rotation as "the piece that is still missing, and the one the angle argues
for". PR A is the piece that has to land before that is even attemptable.

### If "rotate and tilt" means a real free camera

Then the *renderer* changes — SVG painter's algorithm to WebGL meshes with a
depth buffer — and it is worth being precise about what that costs, because it
is much less than it sounds.

| PR | survives 90-degree rotation + fixed tilts | survives a full 3D rewrite |
|---|---|---|
| **A** depth sort | required by it | replaced by the z-buffer |
| **B** scale, storeys | unchanged | **unchanged** — metres and floor counts are camera-independent facts |
| **C** bay grid, window sizes | unchanged | **unchanged** — becomes UVs or instanced quads, same numbers |
| **D** door catalogue | unchanged | **unchanged** — same six families, same dimensions |
| **E** Founders Hall vocabulary | massing unchanged; needs 4 faces not 2 | massing spec **unchanged**; the SVG emission is replaced |
| **F** materials | unchanged | **unchanged** — becomes material definitions |

The split is the point. This plan is mostly an **asset specification** and only
incidentally drawing code. A procedural building generator in three dimensions
needs, as its input: a footprint, a storey count, a storey height, a bay
spacing, a window size and sill height, a door family with real dimensions, and
a material. That list is not *similar* to what PRs B–F produce. It **is** what
they produce, item for item. Today none of it exists in any form — the
information is smeared across three tables that disagree — so a 3D rewrite
attempted now would have to invent all of it first, from a reference that
contradicts itself.

What genuinely gets thrown away in that scenario is the SVG emission: the
polygon-point arithmetic and the depth sort. That code is largely *already
written* — much of this plan deletes tables rather than adding them — and the
one substantial new piece of drawing is PR E's hall vocabulary, whose *spec*
(which elements, what size, which building gets the tower) is the durable half
and carries over intact.

### The short version

Doing this work first makes a discrete rotating camera **cheaper**, because it
removes the one hard-coded camera assumption on the map. It makes a full 3D
rewrite cheaper too, because it produces the building specification such a
rewrite would otherwise have to derive from scratch. The scenario in which this
work is wasted is the one where you rewrite in 3D *and* would have been happy
to re-invent every dimension by hand along the way.

The one concrete thing I would change on the strength of the question: keep the
**massing spec and the SVG emission in separate modules** from PR B onward —
`campusScale.ts` and a `buildingSpec.ts` (storeys, bays, doors, materials per
Buildable) that contain no JSX at all, with `buildingMotifs.tsx` reduced to
"turn a spec into polygons". That costs nothing now and makes the renderer the
only replaceable part later.

---

## 7. Risks, and what is not being touched

**Nothing mechanical changes.** No cost, duration, prereq, effect, gate or
grant. No `Buildable` field is added. No footprint changes, so no existing
`Placement` reshapes and no save migration is needed — the same guarantee
`campusMap.ts` already documents for footprint retunes.

**The campus's overall height profile shifts.** Academic halls get shorter
(114 → ~81 including the roof); residence halls, the hospital and the towers
get taller. This is the point, but it is a visible change and README
screenshots will want retaking.

**Polygon count rises roughly 2.5×** — an 8-tile wall goes from 8 window bays
to 16, and gains sills and string courses. Mitigations: the glazing bars cost
zero nodes (one `<pattern>`), and `BuildingMotif` should be wrapped in
`React.memo` — it is already a pure function of `(t, p, tint, developing)`, and
memoising it also removes the current full-motif re-render on every mouse move,
which is a win the map wants regardless of this plan.

**The academic halls stop being gold.** Brick red is what the reference
building is, and the shared trim is what makes the campus cohere — but it is
the single most opinionated change here, which is why it is isolated in PR F
and sequenced last.

**`METRES_PER_TILE = 9` for drawing contradicts the 15 m the footprint comments
cite.** Handled by stating it plainly in both files rather than by quietly
having two scales: footprints are laid out at 15 m per tile and buildings are
drawn at 9 m per tile, the map is stylised, and nothing in the sim reads either
number. The alternative — reshaping every footprint — would churn saves for a
rationale no player can see.
