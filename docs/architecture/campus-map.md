# The campus map

The map is the central interface and, but for one surface, a **visual-only
layer**: placement grants nothing, gates nothing, and no system reads
`placements`, `pathways` or `trees`. The invariant sweep enforces it.
Adjacency effects and any economic or prestige feedback from the layout are
deliberately deferred. The one surface is the **hall panel** (Plan 14): an
academic hall's info panel is where a program is founded into one of its
slots, and its slots (`halls`, not `placements`) are simulation state — see
[curriculum.md](../design/curriculum.md). *Where* the hall stands still means
nothing; *what is in it* is the whole curriculum.

The map also *shows* that one reading, so "where is there room" is a
question it answers without anything being opened: over every standing hall
sits a row of six pips, one per slot, each in the hue of the school whose
program holds it (`schoolPalette.ts`) — a pure hall reads as one colour, a
mixed one as several, a free slot as an empty ring — and a gold `+` beside
them when a slot is free and a program is on offer for it (`HallMarks` in
`CampusMap.tsx`). Unlike the labels, the marks are always on. The Curriculum
tab's "Found in <hall>" door comes back the other way: `App.tsx` closes the
tab and hands the hall's id to the map (`inspectTarget`), which pans to the
building and opens its panel — the same one-way, consumed-on-arrival channel
the tab's own target uses.

Buildings are modeled as data first and placed on a tile grid second. The grid
is drawn at an angle (`src/components/isoProjection.ts` — a 2:1 dimetric at
the opening camera), and each kind carries an architectural form
(`src/components/buildingMotifs.tsx`) — still only rendering.

## The camera

The view stands at one of **four corners of the campus** (a quarter turn
apart) and one of **three pitches**, and steps between them instantly: Q/E
turn, Z/X tilt, or the buttons beside the zoom controls. `isoProjection.ts`
owns one `Camera` (azimuth and pitch) and derives every projection
coefficient from it, so the two hundred call sites that draw a wall or a
roof never know a camera exists; it accepts any camera, but the map only
rests on `VIEWS` and `PITCHES`, every one of which keeps a tile edge on a
clean pixel slope (sin pitch of 1/2, 2/3 or 3/4). A continuous camera was
tried first and looked worse than it sounded: the motifs were drawn for
that pixel grid, and at an in-between angle they shimmer and foreshorten
into shapes nobody drew. The camera is `CampusMap.tsx` state — unlike pan
and zoom, which are a transform on a `<g>`, a turn changes every polygon —
and it is never saved: it is where the player is looking from, not a fact
about the school.

Three consequences, each in its own place:

- **What is in front of what** is the camera's to say. `depthSort.ts`'s
  occlusion relation takes the camera's axes, and the test sweeps 48
  azimuths. `boxFaces` labels a box's corners by SCREEN position (back,
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

## Trees, and what draws over what

A new university does not open on a bare plate. `data/treeData.ts` seeds a
**founding woodland** at `createInitialState` — groves rather than an even
scatter, with a deliberate clearing around the middle where Founders Hall
already stands, so the map has *places* on it and siting a building is a
choice about ground. `GameState.trees` is one entry per wooded tile,
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
