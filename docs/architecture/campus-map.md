# The campus map

The map is the central interface and, but for one surface, a **visual-only
layer**: placement grants nothing, gates nothing, and no system reads
`placements`, `pathways` or `trees`. The invariant sweep enforces it.
Adjacency effects and any economic or prestige feedback from the layout are
deliberately deferred. The one surface is the **hall panel** (Plan 14): an
academic hall's info panel is where a program is founded into one of its
slots, and its slots (`halls`, not `placements`) are simulation state — see
[curriculum.md](../design/curriculum.md). *Where* the hall stands still means
nothing; *what is in it* is the whole curriculum. A lab's panel reads its
research project (Plan 80B) and opens the Research tab at it, but writes
nothing.

The map also *shows* that one reading, so "where is there room" is a
question it answers without anything being opened: over every standing hall
sits a row of six pips, one per slot, each in the hue of the school whose
program holds it (`schoolPalette.ts`) — a pure hall reads as one colour, a
mixed one as several, a free slot as an empty ring — and a gold `+` beside
them when a slot is free and a program is on offer for it: the draw, or a
claimed hall's own school's programs (Plan 78D; `HallMarks` in
`CampusMap.tsx`). Unlike the labels, the marks are always on. The Curriculum
tab's "Found in <hall>" door comes back the other way: `App.tsx` closes the
tab and hands the hall's id to the map (`inspectTarget`), which pans to the
building and opens its panel — the same one-way, consumed-on-arrival channel
the tab's own target uses. The next-step line uses it too, and for a move it
also names the program (`inspectProgram`), whose tile opens with the panel,
its move showing (Plan 78D).

Buildings are modeled as data first and placed on a tile grid second. The grid
is drawn at an angle (`src/components/isoProjection.ts` — a 2:1 dimetric at
the opening camera), and each kind carries an architectural form
(`src/components/buildingMotifs.tsx`) — still only rendering.

## The camera

The view stands at one of **four corners of the campus** (a quarter turn
apart) and one of **ten pitches**, from nearly level to straight down (Plan
24), and steps between them instantly: Q/E
turn, Z/X tilt, Home returns to the opening view — keys only; the corner pill
beside the zoom buttons carries no camera controls. `isoProjection.ts`
owns one `Camera` (azimuth and pitch) and derives every projection
coefficient from it, so the two hundred call sites that draw a wall or a
roof never know a camera exists; it accepts any camera, but the map only
rests on `VIEWS` and `PITCHES`, every one of which keeps a tile edge on a
clean pixel slope (sin pitch a simple ratio, from 1/5 to 1). A continuous camera was
tried first and looked worse than it sounded: the motifs were drawn for
that pixel grid, and at an in-between angle they shimmer and foreshorten
into shapes nobody drew. The camera is `CampusMap.tsx` state — unlike pan
and zoom, which are a transform on a `<g>`, a turn changes every polygon —
and it is never saved: it is where the player is looking from, not a fact
about the school.

A quarter turn is eased over `TURN_MS` (Plan 37; reduced motion snaps), and
each of its frames redraws the scene at a new angle. So a turn draws the
scene light (Plan 80H): the buildings, the ground, the plates and the paths,
without the trees, the props standing on the grounds, the lamps and the
benches, which come back on the frame the turn settles. The walkers are
hidden through a turn and walk on unseen; they are drawn again once their
outlines are built for the view the projection is at, which also keeps a
tilt from showing them for a frame against the old one.

Three consequences, each in its own place:

- **What is in front of what** is the camera's to say. `depthSort.ts`'s
  occlusion relation takes the camera's axes, and the test sweeps 48
  azimuths. The same sort orders what stands on a flat roof
  (`buildingMotifs.tsx`'s `flatRoofItems`: a lab's dome, glasshouse or
  flues, the exhaust stack, the roof plant), and a small roof's one plant
  unit is the first clear of everything else on it, the same at every view
  (Plan 80H). `boxFaces` labels a box's corners by SCREEN position (back,
  right, front, left) so a motif that hangs windows on `left` is right at
  any azimuth, and carries grid-fixed corners (`NW`…`SW`) and each face's
  grid direction for the things — roof slopes, wings — that are facts about
  the building rather than about the view.
- **The sun is fixed to the world** (`light.ts`): one direction across the
  grid, from which every wall tone, roof tone and cast shadow is derived. A
  building's south wall is the lit one from every side, and its shadow lies
  on the same lawn however the view turns. Every cast shadow — buildings
  and woodland — is drawn in one pass under every mass, because a shadow
  can now fall *away* from the camera, across a building already painted.
- **Attachments go on the walls the camera can see.** A pavilion, portico,
  arcade, canopy or flight of steps takes its wall by grid direction, and a
  mass draws them on `visibleWalls()`, as its doors always did — so a
  building presents its entrances from every side, and nothing is drawn
  against a wall that has turned away. Composite masses (a hospital's slab
  and wing, a corner tower) order their parts by the camera.

## Touch (Plan 70F)

The map reads **pointer events of type `touch` only**; the mouse keeps its own
handlers, unchanged. Right after a touch the browser's emulated mouse events
are ignored (`TOUCH_MOUSE_GRACE_MS`), and a tap's click never places.

- **One finger** pans. While a building is picked up it moves the ghost
  instead, and under a path tool it paints, as a left-button stroke does
  (the lamp and bench tools act on a tap).
- **Two fingers** pinch and pan together: the ground under their midpoint
  stays under it, and the zoom follows their spread, clamped
  (`mapGestures.ts`'s `pinchView`, checked in `test/map-gestures.test.ts`).
  When one lifts, the other carries on as a pan.
- **A tap** opens a building, as a click does, and lights the names near the
  finger as the cursor would.
- **Placing:** a tap or a drag sets the ghost down, and a bar at the top of
  the screen offers *Rotate*, *Place* and *Cancel*, with the ghost's reason
  when the site is refused. Nothing is built without *Place*.
- **The camera's keys** (Q/E, Z/X) get buttons in the zoom pill once the map
  has been touched.

`node tools/touchCheck.mjs` drives all of it in Chromium with touch emulated
against a running dev server.

## The static layer, and what moves

The reducer clones the state every week, so every record arrives with a
new identity whether or not anything moved (Plan 24). The scene is drawn
from a **layout** (`campusLayout.ts`) kept while its string key holds. The
key covers each building's site, status, name and age band, plus the
trees, paths, lamps and colours, so the memoised scene skips every
week in which nothing was built, finished, renamed, paved or aged. What
does change weekly reaches the scene through React contexts, which redraw
only their consumers:

- `DevelopingContext`: a site's countdown, progress bar and rising shell;
- `CrowdContext`: the stands of a venue with a game this week;
- `BannerContext`: the lamps in commencement week.

The hall pips and the walkers are drawn after the scene from the live
state. `npm run profile` gates every change to the
map.

## The land around the campus (Plans 81B–81E)

The parcel no longer hangs in space. A **ring of country** runs `RING` (200)
tiles past its edge on every side: the road on off both ends, a patchwork
of farm fields along the road and round the town, parted by margins of
grass, open grass (meadow and rough grass) with trees scattered over it, a low town edge
along the road, a farm or two, and gentle hills rising away from a flat
valley floor, all fading into haze. It is drawing only and not state: `ringLand.ts`
generates it from the college's name (a seeded hash, as the rivals' colors
are), so it is the same on every load and nothing of it is saved, and
`Surroundings.tsx` draws it. Nothing in
it can be built on, clicked (`.ring { pointer-events: none }`) or walked;
siting, reach, the walkers and the tile hit-test (`tileAt`) still end at the
parcel's edge.

- **The land** (`landOf`, cached per name): the ring is cut into blocks
  round the parcel and the road, and each block into fields by repeated
  halving, the fields growing with distance. Near the road and the town
  (`farmness`, on the low ground) a field is farmed: crop, hay or plough.
  Each farm field has a margin of the ground's own grass round it (Plan
  81E): a stroke of `--grass`, 14 world units wide (about a third of a
  tile; some five pixels at the opening zoom, three at the widest), so
  neighbours are parted by a headland that follows the year, snow and all.
  The farm fields are drawn after the open ground, so their margins lie
  over it too. No two that touch share a cover (`unlikeNeighbours`
  repaints a clashing field with the cover fewest of its neighbours have,
  pass after pass, and one still clashing lies fallow as rough grass), and
  under snow each keeps a little of its own color. Everywhere else a field is open meadow or rough grass.
  Farmland is about a fifth of the land (tested under 40%).
- **Trees**, scattered (Plan 81D; 81C's woods are gone): a tree here and
  there, now and then two or three together, thinning with distance
  (falling by e every 55 tiles) and none on the road, in the town or in a
  farmyard. On the valley floor they are the campus's own tree art (at
  most 40, `TREES_MAX`); past it, out to 125 tiles, a simple crown on a
  short stem or a pine's spire the size of a campus tree (at most 200,
  `CROWNS_MAX`), so they read as single trees, never as a wood. The town stands on one side of the parcel
  (the name picks which) along both sides of the road and across it from
  the campus's end, with a lane or two; its houses take the college's
  vernacular (`materialsFor`: the brick, buff and stone walls, the two
  pitched-roof colors), and snow lies on their roofs as on the campus's.
- **The hills**: a height field, zero on the parcel and for `FLAT` (26)
  tiles round it, then a slow rise of the whole valley and some twenty
  rounded hills, bigger further out. Every point of the ring is lifted by
  it (`lift`), so field edges bend over the hills. The hills'
  light is traced on a grid four tiles apart by marching squares: the
  slope's light against flat ground's (`lightOf`, from a lower sun than
  `light.ts`'s so a gentle hill reads), outlined at two steps each way and
  laid over the fields and grass alike as translucent light and shade. At a low
  pitch, two layers of far hills stand as silhouettes on the far side of
  the valley (`ridgeline`), hazed as the ground at their feet, their
  outline falling into saddles so they never stand as a wall; they sink
  away by the opening pitch. No slope is steeper than
  `MAX_SLOPE`, under the lowest pitch's sight line, so no hill hides ground
  behind it and the ground can be drawn as merged shapes in any order. The
  parcel stays flat (real slopes on campus wait in the backlog).
- **Drawn cheaply** (`ringView`, cached per name and camera): one flat
  plate under everything; one path per cover; the road, its kerbs and centre line; the four paths of the hills' light; then
  sprites, back to front: the near trees (`TreeAt`), the far trees'
  crowns merged sixteen to a run (four paths a run: crowns and their lit
  caps, in the season's leaf colors, and pines), and some fifty houses.
  About 520 SVG nodes in all.
- **In front of the parcel.** The ring lies under the campus, in an `<svg>`
  of its own (`.campus-map-ring`) that carries the same pan/zoom transform
  (`applyView` writes it), so a frame in which only the campus changes
  repaints none of it. A sprite the parcel's outline would cut, standing in
  front of a near edge, is drawn instead by `CampusScene`, after the sorted
  scene and before the labels (`RingFront`): a point in front of the parcel
  is nearer the camera than anything on the parcel above it on the screen.
- **The haze** (`hazeOf`): two plates over the ring in the haze color
  (`--haze`, which is also the map's background). One is a radial gradient
  laid out in tiles about the parcel's center (the projection is its
  `gradientTransform`), clear to about 70 tiles and solid by about 240; the
  other a wash up the screen past the parcel's back corner, stronger the
  lower the pitch, which also pulls the radial haze in. The land never ends
  in an edge; it thins into the sky.
- **Seasons**: the ground takes the map's CSS variables (`seasons.ts`'s
  `--field-*`, `--wood` (the far hills) and `--haze`, beside `--grass`
  and the leaf colors): crops ripen and come up green, the trees turn and
  go bare as the campus's do, the pines take a dusting,
  and all of it lies under the snow in winter.
- **Turning**: while the camera turns, the ring is its flat plate, the road
  and the haze. The rest stays mounted at the view it last rested on,
  hidden (`visibility`, so the browser keeps its layout), and the frame
  that settles the turn updates it rather than building it again (Plan
  80H's rule for the trees, kept cheap).
- **The camera's leash** (`clampView`, `ringZoomFloor`): pan and zoom are
  held so every corner of the canvas stays over the ring at any zoom,
  pitch and view, and the canvas's center within `CENTRE_REACH` (70) tiles
  of the parcel. The ring is a square on the grid, so each grid axis is
  clamped on its own; where a big screen at a low pitch would see past it,
  the widest zoom closes in. A turn is not held mid-way (it keeps the ground
  under the center); the view it settles on is. `test/surroundings.test.ts`
  checks the leash at every view and pitch on four screen sizes, and that
  the land is stable per name, off the parcel and the road, and gentle.

## The road, the walk and the quads

A **road** runs along the parcel's last two rows (`campusMap.ts`'s
`ROAD_FIRST_ROW`): fixed terrain, never built, paved or planted on.
**Reachability** (`state/reach.ts`) rules on siting only. Every building
needs a way on foot from the road, and nothing is sited that walls off a
building that had one. `canPlace` asks it, and the ghost says why a site is
refused. **Quads** (`state/quads.ts`) are found, not declared: open ground
the buildings enclose, and nothing else. Campus beauty counts them and one
event needs one; the map does not show them (Plan 80H took away their
tint, their names, the quad card and "Mark a quad", and save version 83
drops the names and marks older saves kept in `GameState.quads`). A placed
Campus Quad is lawn to both the walk and the quad finder. Both modules sit
in `src/state/`, not `src/systems/`, because no tick system may read
placements.

## Life on the map

Walkers (`Walkers.tsx`) walk routes between doors (`walkRoutes.ts`),
preferring paths. They are drawn imperatively on the frame clock, clipped
by the buildings and trees in front of them (found through a screen-cell
index, `ShapeIndex`), and more numerous as the college grows. A Campus
Quad's walks are paths to them, its lawn is lawn at a lawn's cost (Plan
80H: at half of it they cut across the grass), and its centerpiece is not
walkable (`quadGeometry.ts`): on the Grand Quad they go round the fountain
on its ring walk. A path drawn tile by tile replans their routes once it has
stood still for a moment, not at every tile.
Desire lines wear the lawn where the busiest routes cross it. The player's
lamps and benches (`GameState.dressing`), bike racks by the doors of a big
college, and the flag at Founders Hall are props in the depth-sorted scene.
Weathering (`ageMarks.tsx`) reads `Buildable.builtYear`. All of it is
drawing only.

**Benches** (Plan 80I) are the one prop with a direction. A bench is set
against one edge of its tile and faces out across it, its back to the lawn,
so the save stores each bench's facing with it (`'bench-n'`…`'bench-w'`,
north being -row; `state/dressing.ts`). A new bench faces the path beside
its tile (`defaultBenchFacing`: south, then east, west, north where there
are several); R, while the bench tool is armed, turns it a quarter
clockwise, and the tool's ghost draws the bench itself, half-transparent, so
the facing shows before it is set. Setting a bench again on its own tile
takes the new facing. It is drawn at the walkers' scale: slatted seat and
back, iron ends carrying the arms, its four parts painted in `depthOrder`
so the back hides the seat when it faces away. A save from before it kept
each bench's old facing (east where paving ran beside it east or west, else
south; `legacyBenchFacing`). There is no touch control for the turn: a tap
sets a bench at its default facing.

## Footprints

**How big a footprint a Buildable gets is a placement rule, not data on the
Buildable** — it lives in `campusMap.ts`'s `footprintOf`, keyed on what the
Buildable already carries: its `kind` and `facilityType`, plus, for anything whose instances differ in SCALE rather than
in kind, a SIZE LADDER read off `effects.servesPopulation` (facilities) or
`effects.capacityBonus` (dorms). A 350-seat campus restaurant is 3x3 and the
16,000-seat market hall at the end of the same dining chain is 11x9; a 500-bed
residence hall is 9x4 and a 5,000-bed residential tower is 7x7 carried very
high. **Every footprint with a door on it is an ODD number of tiles across.**
A door is drawn at the centre of its front span, and on an even width that
centre is a tile SEAM — so the one square a student would walk through does
not exist, and a path can only ever reach the corner of two tiles. Open
ground keeps its even spans, because nothing enters a tennis court or a
running track through a drawn door. A `Placement` stores the footprint it was
built with, so this applies to new campuses only; an existing one keeps the
halls it has.

Everything is sized against a rough **15m to a tile**, which the football
stadium (a real one is about 220m by 180m — 15x12) pins down, so a library, a
pool, a hospital and a stadium stand in something like their real proportions
to each other. Size is purely geometric: a bigger building grants nothing and
costs nothing extra.

**The residence halls take v2's residence types** (Plan 72D): each of the
eight 500- and 1,000-bed rungs is a Residence Hall, a House, Suites, an
Apartment Block or a Residential College (`buildingSpec.ts`'s
`RESIDENCE_FORMS`, keyed by id), which picks its roof (gabled or, for the
apartments, flat), its wall, its balconies and its front door, so no two
neighbouring rungs read the same. Beds, costs and footprints stay the
rungs' own; the villages and towers keep their forms.

## Trees, and what draws over what

A new university does not open on a bare plate. `data/treeData.ts` seeds a
**founding woodland** at `createInitialState` — groves rather than an even
scatter, with a deliberate clearing around the middle where Founders Hall
stands in a headless founding (a guided one leaves the hall for the player to
site, as the opening walkthrough's first step, and the clearing is where they
will most likely put it), so the map has *places* on it and siting a building
is a choice about ground. `GameState.trees` is one entry per wooded tile,
keyed by the same `pathTileKey()` `pathways` uses, and its value is a single
integer SEED: `components/trees.tsx` derives species, size and the tree's
offset within its own tile from it, so a wood is varied without storing
anything per tree and a given tree looks the same forever.

**Two rules, and the difference between them is the whole feature:**

- **Building FELLS.** The reducer's `PLACE_BUILDABLE` deletes every tree
  under the footprint it commits, in the same transaction, permanently. You
  cleared the ground to build there.
- **Paving only HIDES.** A path tile on a tree's tile stops it being drawn,
  and lifting the path brings it straight back. Nothing is deleted, so this
  is a pure *render-time* read of `pathways` in `CampusMap.tsx` — not a
  second piece of state to keep in step.

Trees draw in the **same depth-sorted pass as buildings**, not a layer of
their own: a tree in front of a hall paints over it and one behind it is
hidden by it, which a separate layer could never do. And, like `placements`
and `pathways`, `trees` is **read by no system** — the invariant sweep
enforces it.

**Flat ground is the exception to that pass, and has to be.** Painter's
order is the occlusion here, and one depth key per placement (the far corner
of its footprint) expresses a mass well enough — but it cannot express a
large FLAT plate. A 9x9 quad sorted on its far corner draws *after*, and so
over, a tree standing in front of its near corner but off to one side, whose
own depth is smaller. That is not a tuning problem; it is what a single sort
key cannot say about a big footprint.

So an open-ground facility (quad, pitch, ball field, courts, pool deck) is
split in two. Its **paint** has no height, can never legitimately occlude
anything, and is drawn in a pass of its own *under* every mass, needing no
depth at all. What genuinely **stands** on it — planting, hedges, a
fountain, a monument, a stand, an outfield fence — comes back from
`groundMarkings.ts`'s `groundProps` and joins the ordinary sorted pass, each
prop on the point it actually stands on, so a quad's own trees interleave
correctly with the woodland around them.
